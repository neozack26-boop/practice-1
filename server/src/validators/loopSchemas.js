import { z } from 'zod';

export const DOMAINS = [
  'computer_science',
  'engineering',
  'mathematics',
  'natural_sciences',
  'medicine_health',
  'business_economics',
  'humanities_law',
  'general'
];

export const DEPTH_LEVELS = ['beginner', 'intermediate', 'exam_ready'];
export const EXPLANATION_STYLES = ['visual_analogies', 'first_principles', 'practical_examples'];
export const INPUT_MODES = ['pdf', 'image', 'text'];

// 1. Create Loop Request Validation
export const createLoopSchema = z.object({
  domain: z.enum(DOMAINS).default('general'),
  input_mode: z.enum(INPUT_MODES),
  depth_level: z.enum(DEPTH_LEVELS).default('intermediate'),
  explanation_style: z.enum(EXPLANATION_STYLES).default('visual_analogies'),
  title: z.string().max(120).optional().or(z.literal('')),
  concept_text: z.string().max(15000).optional()
}).refine((data) => {
  if (data.input_mode === 'text') {
    return typeof data.concept_text === 'string' && data.concept_text.trim().length >= 10;
  }
  return true;
}, {
  message: 'concept_text must be at least 10 characters when input_mode is "text"',
  path: ['concept_text']
});

// 2. Practice Answer Submission Schema
export const answerSchema = z.object({
  userAnswer: z.string().min(2, 'Answer must be at least 2 characters').max(5000, 'Answer is too long')
});

// 3. Teach-Back Submission Schema
export const teachBackSchema = z.object({
  userExplanation: z.string().min(10, 'Explanation must be at least 10 characters').max(5000, 'Explanation is too long')
});

// 4. Simplify Step Schema
export const simplifyStepSchema = z.object({
  stepNumber: z.coerce.number().int().positive('stepNumber must be a positive integer')
});

// 5. Profile Update Schema
export const updateProfileSchema = z.object({
  full_name: z.string().max(100).optional(),
  default_depth: z.enum(DEPTH_LEVELS).optional(),
  default_style: z.enum(EXPLANATION_STYLES).optional()
});

// -----------------------------------------------------------------------------
// AI Output Validation Schemas (Zod)
// -----------------------------------------------------------------------------

export const aiStepSchema = z.object({
  step_number: z.number().int(),
  heading: z.string(),
  explanation: z.string(),
  analogy: z.string(),
  key_point: z.string()
});

export const aiConceptResponseSchema = z.object({
  title: z.string(),
  source_summary: z.string(),
  core_takeaway: z.string(),
  steps: z.array(aiStepSchema).min(3).max(8)
});

export const aiPracticeResponseSchema = z.object({
  question_text: z.string(),
  question_type: z.enum(['conceptual', 'problem_solving', 'case_based']),
  hint_text: z.string()
});

export const aiAnswerEvalSchema = z.object({
  is_correct: z.boolean(),
  ai_feedback: z.string(),
  worked_solution: z.string()
});

export const aiTeachBackSchema = z.object({
  bot_reply: z.string(),
  is_complete: z.boolean(),
  clarity_score: z.number().int().min(0).max(100),
  accuracy_score: z.number().int().min(0).max(100),
  completeness_score: z.number().int().min(0).max(100),
  overall_score: z.number().int().min(0).max(100),
  missing_concepts: z.array(z.string()).default([])
});

export const aiSimplifyResponseSchema = z.object({
  step_number: z.number().int(),
  heading: z.string(),
  explanation: z.string(),
  analogy: z.string(),
  key_point: z.string()
});

