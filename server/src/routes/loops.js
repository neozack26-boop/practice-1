import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { handleUpload } from '../middleware/upload.js';
import {
  createLoopSchema,
  answerSchema,
  teachBackSchema,
  simplifyStepSchema
} from '../validators/loopSchemas.js';
import {
  deconstructConcept,
  simplifyStep,
  generatePracticeQuestion,
  evaluatePracticeAnswer,
  evaluateTeachBack
} from '../services/aiService.js';

const router = Router();

// 1. GET /api/loops — List user's study loops with optional filters
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { domain, status, search } = req.query;

    let query = req.supabase
      .from('study_loops')
      .select('id, title, domain, input_mode, depth_level, explanation_style, current_stage, status, mastery_score, created_at, updated_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (domain && domain !== 'all') {
      query = query.eq('domain', domain);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search && typeof search === 'string' && search.trim()) {
      query = query.ilike('title', `%${search.trim()}%`);
    }

    const { data: loops, error } = await query;
    if (error) throw error;

    res.json({ loops: loops || [] });
  } catch (err) {
    next(err);
  }
});

// 2. GET /api/loops/:id — Fetch single loop with attempts and teach-back turns
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const loopId = req.params.id;

    // Fetch study loop
    const { data: loop, error: loopErr } = await req.supabase
      .from('study_loops')
      .select('*')
      .eq('id', loopId)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (loopErr) throw loopErr;
    if (!loop) {
      return res.status(404).json({ error: 'Study loop not found' });
    }

    // Fetch practice attempts
    const { data: practiceAttempts, error: practiceErr } = await req.supabase
      .from('practice_attempts')
      .select('*')
      .eq('loop_id', loopId)
      .order('created_at', { ascending: true });

    if (practiceErr) throw practiceErr;

    // Fetch teach-back turns
    const { data: teachBackTurns, error: turnsErr } = await req.supabase
      .from('teach_back_turns')
      .select('*')
      .eq('loop_id', loopId)
      .order('turn_number', { ascending: true });

    if (turnsErr) throw turnsErr;

    res.json({
      loop,
      practiceAttempts: practiceAttempts || [],
      teachBackTurns: teachBackTurns || []
    });
  } catch (err) {
    next(err);
  }
});

// 3. DELETE /api/loops/:id — Delete loop and cascaded child rows
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const loopId = req.params.id;

    const { error } = await req.supabase
      .from('study_loops')
      .delete()
      .eq('id', loopId)
      .eq('user_id', req.user.id);

    if (error) throw error;

    res.json({ success: true, message: 'Study loop deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// 4. POST /api/loops — Ingest concept and deconstruct into step cards
router.post('/', requireAuth, handleUpload, async (req, res, next) => {
  try {
    // Parse text and metadata from req.body
    const rawBody = {
      domain: req.body.domain,
      input_mode: req.body.input_mode,
      depth_level: req.body.depth_level,
      explanation_style: req.body.explanation_style,
      title: req.body.title,
      concept_text: req.body.concept_text
    };

    const validated = createLoopSchema.parse(rawBody);

    // If input_mode is pdf or image, file must be present
    if (['pdf', 'image'].includes(validated.input_mode) && !req.file) {
      return res.status(400).json({ error: `File upload required for input_mode "${validated.input_mode}"` });
    }

    // Call Gemini AI Deconstructor
    const aiResult = await deconstructConcept({
      domain: validated.domain,
      depth_level: validated.depth_level,
      explanation_style: validated.explanation_style,
      concept_text: validated.concept_text,
      fileBuffer: req.file?.buffer,
      mimeType: req.file?.mimetype,
      title: validated.title
    });

    const loopTitle = (validated.title && validated.title.trim()) || aiResult.title || 'Untitled Study Loop';

    // Insert new study_loops record
    const { data: newLoop, error: insertErr } = await req.supabase
      .from('study_loops')
      .insert({
        user_id: req.user.id,
        title: loopTitle,
        domain: validated.domain,
        input_mode: validated.input_mode,
        source_summary: aiResult.source_summary,
        source_text_excerpt: validated.concept_text ? validated.concept_text.slice(0, 1000) : null,
        depth_level: validated.depth_level,
        explanation_style: validated.explanation_style,
        steps_json: aiResult.steps,
        core_takeaway: aiResult.core_takeaway,
        current_stage: 'explain',
        status: 'in_progress',
        mastery_score: null
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    res.status(201).json({ loop: newLoop });
  } catch (err) {
    next(err);
  }
});

// 5. POST /api/loops/:id/simplify-step — Re-explain a specific step simpler
router.post('/:id/simplify-step', requireAuth, async (req, res, next) => {
  try {
    const loopId = req.params.id;
    const { stepNumber } = simplifyStepSchema.parse(req.body);

    const { data: loop, error: fetchErr } = await req.supabase
      .from('study_loops')
      .select('*')
      .eq('id', loopId)
      .eq('user_id', req.user.id)
      .single();

    if (fetchErr || !loop) {
      return res.status(404).json({ error: 'Study loop not found' });
    }

    const steps = loop.steps_json || [];
    const stepIndex = steps.findIndex((s) => s.step_number === stepNumber);

    if (stepIndex === -1) {
      return res.status(404).json({ error: `Step number ${stepNumber} not found in this loop` });
    }

    const currentStep = steps[stepIndex];

    const simplified = await simplifyStep({
      stepNumber,
      currentStep,
      sourceSummary: loop.source_summary,
      depth_level: loop.depth_level,
      explanation_style: loop.explanation_style
    });

    // Update in-memory array and persist to database
    steps[stepIndex] = simplified;

    const { error: updateErr } = await req.supabase
      .from('study_loops')
      .update({
        steps_json: steps,
        updated_at: new Date().toISOString()
      })
      .eq('id', loopId);

    if (updateErr) throw updateErr;

    res.json({ updatedStep: simplified });
  } catch (err) {
    next(err);
  }
});

// 6. POST /api/loops/:id/practice — Generate a new practice question
router.post('/:id/practice', requireAuth, async (req, res, next) => {
  try {
    const loopId = req.params.id;

    const { data: loop, error: loopErr } = await req.supabase
      .from('study_loops')
      .select('*')
      .eq('id', loopId)
      .eq('user_id', req.user.id)
      .single();

    if (loopErr || !loop) {
      return res.status(404).json({ error: 'Study loop not found' });
    }

    // Get previous questions to avoid repetition
    const { data: previousAttempts } = await req.supabase
      .from('practice_attempts')
      .select('question_text')
      .eq('loop_id', loopId);

    const previousQuestions = (previousAttempts || []).map((a) => a.question_text);

    // Call Gemini to generate practice question
    const qData = await generatePracticeQuestion({
      sourceSummary: loop.source_summary,
      steps: loop.steps_json,
      depth_level: loop.depth_level,
      previousQuestions
    });

    // Insert practice attempt
    const { data: newAttempt, error: attemptErr } = await req.supabase
      .from('practice_attempts')
      .insert({
        loop_id: loopId,
        user_id: req.user.id,
        question_text: qData.question_text,
        question_type: qData.question_type,
        hint_text: qData.hint_text
      })
      .select()
      .single();

    if (attemptErr) throw attemptErr;

    // Advance current_stage to practice
    await req.supabase
      .from('study_loops')
      .update({
        current_stage: 'practice',
        updated_at: new Date().toISOString()
      })
      .eq('id', loopId);

    res.json({ attempt: newAttempt });
  } catch (err) {
    next(err);
  }
});

// 7. POST /api/loops/:id/practice/:attemptId/answer — Grade user answer
router.post('/:id/practice/:attemptId/answer', requireAuth, async (req, res, next) => {
  try {
    const { id: loopId, attemptId } = req.params;
    const { userAnswer } = answerSchema.parse(req.body);

    const { data: loop, error: loopErr } = await req.supabase
      .from('study_loops')
      .select('*')
      .eq('id', loopId)
      .eq('user_id', req.user.id)
      .single();

    if (loopErr || !loop) {
      return res.status(404).json({ error: 'Study loop not found' });
    }

    const { data: attempt, error: attemptErr } = await req.supabase
      .from('practice_attempts')
      .select('*')
      .eq('id', attemptId)
      .eq('loop_id', loopId)
      .single();

    if (attemptErr || !attempt) {
      return res.status(404).json({ error: 'Practice attempt not found' });
    }

    // Call Gemini to evaluate answer
    const evalResult = await evaluatePracticeAnswer({
      questionText: attempt.question_text,
      sourceSummary: loop.source_summary,
      userAnswer
    });

    // Update practice attempt with evaluation
    const { data: updatedAttempt, error: updateErr } = await req.supabase
      .from('practice_attempts')
      .update({
        user_answer: userAnswer,
        is_correct: evalResult.is_correct,
        ai_feedback: evalResult.ai_feedback,
        worked_solution: evalResult.worked_solution,
        answered_at: new Date().toISOString()
      })
      .eq('id', attemptId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Advance current_stage to teach_back
    await req.supabase
      .from('study_loops')
      .update({
        current_stage: 'teach_back',
        updated_at: new Date().toISOString()
      })
      .eq('id', loopId);

    res.json({ attempt: updatedAttempt });
  } catch (err) {
    next(err);
  }
});

// 8. POST /api/loops/:id/teach-back — Conversational Feynman Teach-Back Loop
router.post('/:id/teach-back', requireAuth, async (req, res, next) => {
  try {
    const loopId = req.params.id;
    const { userExplanation } = teachBackSchema.parse(req.body);

    const { data: loop, error: loopErr } = await req.supabase
      .from('study_loops')
      .select('*')
      .eq('id', loopId)
      .eq('user_id', req.user.id)
      .single();

    if (loopErr || !loop) {
      return res.status(404).json({ error: 'Study loop not found' });
    }

    // Fetch prior teach-back turns
    const { data: priorTurns } = await req.supabase
      .from('teach_back_turns')
      .select('turn_number, user_explanation, bot_reply')
      .eq('loop_id', loopId)
      .order('turn_number', { ascending: true });

    const turnNumber = (priorTurns?.length || 0) + 1;

    // Call Gemini Friendly Teacher Bot
    const botEval = await evaluateTeachBack({
      title: loop.title,
      sourceSummary: loop.source_summary,
      turnNumber,
      priorTurns: priorTurns || [],
      userExplanation
    });

    // Insert new turn record
    const { data: newTurn, error: turnErr } = await req.supabase
      .from('teach_back_turns')
      .insert({
        loop_id: loopId,
        user_id: req.user.id,
        turn_number: turnNumber,
        user_explanation: userExplanation,
        bot_reply: botEval.bot_reply,
        is_complete: botEval.is_complete,
        clarity_score: botEval.clarity_score,
        accuracy_score: botEval.accuracy_score,
        completeness_score: botEval.completeness_score,
        overall_score: botEval.overall_score,
        missing_concepts: botEval.missing_concepts
      })
      .select()
      .single();

    if (turnErr) throw turnErr;

    // If session is complete, update study_loops status and mastery_score
    if (botEval.is_complete) {
      const finalStatus = botEval.overall_score >= 75 ? 'mastered' : 'needs_review';
      await req.supabase
        .from('study_loops')
        .update({
          current_stage: 'completed',
          status: finalStatus,
          mastery_score: botEval.overall_score,
          updated_at: new Date().toISOString()
        })
        .eq('id', loopId);
    }

    res.json({ turn: newTurn });
  } catch (err) {
    next(err);
  }
});

export default router;

