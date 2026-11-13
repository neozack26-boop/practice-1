import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { updateProfileSchema } from '../validators/loopSchemas.js';

const router = Router();

// GET /api/profile — Current user's profile and aggregated dashboard stats
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Fetch or create profile
    let { data: profile, error: profileErr } = await req.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profileErr) throw profileErr;

    if (!profile) {
      // Auto-initialize profile if not found
      const initialProfile = {
        id: userId,
        full_name: req.user.user_metadata?.full_name || '',
        default_depth: 'intermediate',
        default_style: 'visual_analogies'
      };
      const { data: newProfile, error: insertErr } = await req.supabase
        .from('profiles')
        .insert(initialProfile)
        .select()
        .single();
      if (insertErr) throw insertErr;
      profile = newProfile;
    }

    // Fetch aggregate statistics from study_loops
    const { data: loops, error: loopsErr } = await req.supabase
      .from('study_loops')
      .select('id, status, mastery_score')
      .eq('user_id', userId);

    if (loopsErr) throw loopsErr;

    const totalLoops = loops.length;
    const masteredCount = loops.filter((l) => l.status === 'mastered').length;
    const completedWithScores = loops.filter((l) => typeof l.mastery_score === 'number');
    const avgMasteryScore = completedWithScores.length > 0
      ? Math.round(completedWithScores.reduce((sum, l) => sum + l.mastery_score, 0) / completedWithScores.length)
      : 0;

    res.json({
      profile,
      stats: {
        totalLoops,
        masteredCount,
        avgMasteryScore
      }
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/profile — Update user preferences
router.patch('/', requireAuth, async (req, res, next) => {
  try {
    const validated = updateProfileSchema.parse(req.body);

    const { data: updated, error } = await req.supabase
      .from('profiles')
      .update({
        ...validated,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ profile: updated });
  } catch (err) {
    next(err);
  }
});

export default router;

