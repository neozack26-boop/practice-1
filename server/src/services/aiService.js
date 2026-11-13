import { generateContentWithRetry } from '../config/gemini.js';
import {
  aiConceptResponseSchema,
  aiPracticeResponseSchema,
  aiAnswerEvalSchema,
  aiTeachBackSchema,
  aiSimplifyResponseSchema
} from '../validators/loopSchemas.js';

const SYSTEM_INSTRUCTION = `You are StudyLoop AI, an expert, empathetic cognitive tutor and learning architect. Your mission is to cure "reading headache" by transforming dense, intimidating study material (PDFs, textbook photos, or raw concepts) into crystal-clear, bite-sized mental models, diagnostic practice problems, and warm Feynman-style teach-back coaching.

Core Pedagogical Rules:
1. Grounding: Base every explanation, question, and evaluation strictly on the provided source material or topic. Never invent false formulas or facts.
2. Clarity Over Jargon: Introduce technical terms only after building intuition with an everyday analogy. Keep paragraphs short and scannable.
3. Friendly Teacher Bot Persona (in Teach-Back): Be warm, encouraging, curious, and conversational—never robotic or harsh. Celebrate what the learner explained accurately before gently nudging them on what they missed.
4. Strict Output Format: Always return valid JSON matching the exact schema requested. Do not wrap JSON in markdown code fences if responseMimeType is application/json.`;

/**
 * Safely parse JSON from Gemini text response
 */
function parseGeminiJson(rawText) {
  let cleaned = rawText.trim();
  // Strip markdown code fences if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return JSON.parse(cleaned);
}

/**
 * 1. Multimodal Concept Deconstructor (POST /api/loops)
 */
export async function deconstructConcept({
  domain,
  depth_level,
  explanation_style,
  concept_text,
  fileBuffer,
  mimeType,
  title
}) {
  const parts = [];

  // Add inline file data if provided (PDF or image)
  if (fileBuffer && mimeType) {
    parts.push({
      inlineData: {
        data: fileBuffer.toString('base64'),
        mimeType
      }
    });
  }

  const promptText = `Analyze the provided study material (PDF, image, or text).
Domain: ${domain}
Depth Level: ${depth_level}
Explanation Style: ${explanation_style}
${title ? `Suggested Title: "${title}"` : ''}
${concept_text ? `\nStudy Material Content:\n${concept_text}` : ''}

Break the material down into 4 to 7 logical, progressive steps so a tired student can understand it effortlessly.
Generate:
1. A concise, descriptive title (if not provided).
2. A 2-sentence source_summary for internal context.
3. A core_takeaway summary.
4. An array of progressive steps (each with step_number, heading, explanation, analogy, and key_point).

Return ONLY valid JSON matching this schema:
{
  "title": "string",
  "source_summary": "string",
  "core_takeaway": "string",
  "steps": [
    {
      "step_number": 1,
      "heading": "string",
      "explanation": "string",
      "analogy": "string",
      "key_point": "string"
    }
  ]
}`;

  parts.push({ text: promptText });

  const response = await generateContentWithRetry({
    contents: parts,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      temperature: 0.3
    }
  });

  const parsed = parseGeminiJson(response.text);
  return aiConceptResponseSchema.parse(parsed);
}

/**
 * 2. Simplify Step Further (POST /api/loops/:id/simplify-step)
 */
export async function simplifyStep({ stepNumber, currentStep, sourceSummary, depth_level, explanation_style }) {
  const prompt = `A student is stuck on Step #${stepNumber} and needs it explained even simpler.
Source Context: ${sourceSummary}
Current Step Heading: "${currentStep.heading}"
Current Explanation: "${currentStep.explanation}"
Current Analogy: "${currentStep.analogy}"

Re-explain this step using an even simpler, highly intuitive real-world analogy and zero unnecessary jargon.
Return ONLY valid JSON matching this schema:
{
  "step_number": ${stepNumber},
  "heading": "${currentStep.heading}",
  "explanation": "string (even clearer, friendly explanation)",
  "analogy": "string (fresh, intuitive everyday analogy)",
  "key_point": "string (one crystal-clear takeaway)"
}`;

  const response = await generateContentWithRetry({
    contents: [{ text: prompt }],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      temperature: 0.4
    }
  });

  const parsed = parseGeminiJson(response.text);
  return aiSimplifyResponseSchema.parse(parsed);
}

/**
 * 3. Practice Question Generator (POST /api/loops/:id/practice)
 */
export async function generatePracticeQuestion({
  sourceSummary,
  steps,
  depth_level,
  previousQuestions = []
}) {
  const prompt = `Based on this study loop's source summary (${sourceSummary}) and steps (${JSON.stringify(steps)}),
create ONE targeted practice question at the ${depth_level} level.
Question Type MUST be one of: 'conceptual', 'problem_solving', or 'case_based'.
Avoid repeating any previous questions: ${JSON.stringify(previousQuestions)}.
Include a helpful hint that nudges without giving away the answer.

Return ONLY valid JSON matching this schema:
{
  "question_text": "string",
  "question_type": "conceptual" | "problem_solving" | "case_based",
  "hint_text": "string"
}`;

  const response = await generateContentWithRetry({
    contents: [{ text: prompt }],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      temperature: 0.3
    }
  });

  const parsed = parseGeminiJson(response.text);
  return aiPracticeResponseSchema.parse(parsed);
}

/**
 * 4. Practice Answer Evaluator (POST /api/loops/:id/practice/:attemptId/answer)
 */
export async function evaluatePracticeAnswer({ questionText, sourceSummary, userAnswer }) {
  const prompt = `Evaluate the student's answer.
Question: "${questionText}"
Source Context: "${sourceSummary}"
Student Answer: "${userAnswer}"

Determine if it is fundamentally correct.
Give constructive feedback praising what worked and correcting any error, and provide a clear step-by-step worked_solution.

Return ONLY valid JSON matching this schema:
{
  "is_correct": boolean,
  "ai_feedback": "string",
  "worked_solution": "string"
}`;

  const response = await generateContentWithRetry({
    contents: [{ text: prompt }],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      temperature: 0.2
    }
  });

  const parsed = parseGeminiJson(response.text);
  return aiAnswerEvalSchema.parse(parsed);
}

/**
 * 5. Friendly Teacher Bot — Teach-Back Evaluator (POST /api/loops/:id/teach-back)
 */
export async function evaluateTeachBack({
  title,
  sourceSummary,
  turnNumber,
  priorTurns = [],
  userExplanation
}) {
  const prompt = `You are the Friendly Teacher Bot.
The student just finished studying "${title}" (${sourceSummary}) and is now teaching it back to you in their own words.
Turn number: ${turnNumber} (max 3 turns).
Prior conversation: ${JSON.stringify(priorTurns)}.
Current student explanation: "${userExplanation}".

Instructions:
- If turn_number < 3 AND major core concepts are still missing or inaccurate:
  - set is_complete = false
  - warmly praise what they got right
  - ask ONE friendly, specific follow-up question to help them fill the gap.
  - populate missing_concepts array with the names of missing points.
- If their explanation is solid OR turn_number === 3:
  - set is_complete = true
  - give an encouraging closing summary
  - score them (0-100 integers) on clarity_score, accuracy_score, completeness_score, and overall_score.
  - missing_concepts can be empty or list minor unaddressed nuances.

Return ONLY valid JSON matching this schema:
{
  "bot_reply": "string",
  "is_complete": boolean,
  "clarity_score": integer (0-100),
  "accuracy_score": integer (0-100),
  "completeness_score": integer (0-100),
  "overall_score": integer (0-100),
  "missing_concepts": ["string"]
}`;

  const response = await generateContentWithRetry({
    contents: [{ text: prompt }],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      temperature: 0.3
    }
  });

  const parsed = parseGeminiJson(response.text);
  return aiTeachBackSchema.parse(parsed);
}

