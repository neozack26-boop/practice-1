import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

if (!process.env.GEMINI_API_KEY) {
  throw new Error('Missing GEMINI_API_KEY environment variable');
}

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Primary model: gemini-3.5-flash (fast, reliable, structured output), with fallback options
export const PRIMARY_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
export const FALLBACK_GEMINI_MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash-lite'];

/**
 * Robust wrapper around ai.models.generateContent with automatic model fallback & retry
 */
export async function generateContentWithRetry(options, retries = 2) {
  const modelsToTry = [PRIMARY_GEMINI_MODEL, ...FALLBACK_GEMINI_MODELS];

  let lastError = null;

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          ...options,
          model
        });
        return response;
      } catch (err) {
        lastError = err;
        const isDemandError = err.message?.includes('503') || err.message?.includes('high demand') || err.status === 503;
        const isNotFound = err.message?.includes('404') || err.status === 404;

        if (isNotFound) {
          // Model deprecated or not found, try next model immediately
          break;
        }

        if (isDemandError && attempt < retries) {
          // Exponential backoff
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
          continue;
        }
        // If other error or retries exhausted for this model, try next model
        break;
      }
    }
  }

  throw lastError || new Error('Failed to generate content with Gemini');
}

