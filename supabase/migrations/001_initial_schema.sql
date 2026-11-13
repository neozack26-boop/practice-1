-- =============================================================================
-- Migration: 001_initial_schema.sql
-- Description: StudyLoop Core Schema, Triggers, RLS Policies, and Seed Data
-- Database: Supabase PostgreSQL
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. EXTENSIONS
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. TABLE: public.profiles
-- Synced with auth.users to store user learning preferences and metadata
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  default_depth TEXT NOT NULL DEFAULT 'intermediate'
    CHECK (default_depth IN ('beginner', 'intermediate', 'exam_ready')),
  default_style TEXT NOT NULL DEFAULT 'visual_analogies'
    CHECK (default_style IN ('visual_analogies', 'first_principles', 'practical_examples')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. TABLE: public.study_loops
-- The core learning session: stores ingested material breakdown and current progress
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.study_loops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  domain TEXT NOT NULL DEFAULT 'general'
    CHECK (domain IN (
      'computer_science', 'engineering', 'mathematics', 'natural_sciences',
      'medicine_health', 'business_economics', 'humanities_law', 'general'
    )),
  input_mode TEXT NOT NULL CHECK (input_mode IN ('pdf', 'image', 'text')),
  source_summary TEXT NOT NULL,
  source_text_excerpt TEXT,
  depth_level TEXT NOT NULL DEFAULT 'intermediate'
    CHECK (depth_level IN ('beginner', 'intermediate', 'exam_ready')),
  explanation_style TEXT NOT NULL DEFAULT 'visual_analogies'
    CHECK (explanation_style IN ('visual_analogies', 'first_principles', 'practical_examples')),
  steps_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  core_takeaway TEXT NOT NULL DEFAULT '',
  current_stage TEXT NOT NULL DEFAULT 'explain'
    CHECK (current_stage IN ('explain', 'practice', 'teach_back', 'completed')),
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'needs_review', 'mastered')),
  mastery_score INTEGER CHECK (mastery_score >= 0 AND mastery_score <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. TABLE: public.practice_attempts
-- Stages 2 & 3: Diagnostic practice questions, hints, user submissions, and AI grades
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.practice_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id UUID NOT NULL REFERENCES public.study_loops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('conceptual', 'problem_solving', 'case_based')),
  hint_text TEXT NOT NULL DEFAULT '',
  user_answer TEXT,
  is_correct BOOLEAN,
  ai_feedback TEXT,
  worked_solution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  answered_at TIMESTAMPTZ
);

-- -----------------------------------------------------------------------------
-- 4. TABLE: public.teach_back_turns
-- Stage 4: Multi-turn Feynman teach-back conversations with the Friendly Teacher Bot
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teach_back_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id UUID NOT NULL REFERENCES public.study_loops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  turn_number INTEGER NOT NULL CHECK (turn_number >= 1),
  user_explanation TEXT NOT NULL,
  bot_reply TEXT NOT NULL,
  is_complete BOOLEAN NOT NULL DEFAULT FALSE,
  clarity_score INTEGER CHECK (clarity_score >= 0 AND clarity_score <= 100),
  accuracy_score INTEGER CHECK (accuracy_score >= 0 AND accuracy_score <= 100),
  completeness_score INTEGER CHECK (completeness_score >= 0 AND completeness_score <= 100),
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  missing_concepts JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 5. PERFORMANCE INDEXES
-- Optimize user dashboard filtering and stage progress lookups
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_study_loops_user_created ON public.study_loops(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_loops_user_status ON public.study_loops(user_id, status);
CREATE INDEX IF NOT EXISTS idx_study_loops_domain ON public.study_loops(domain);
CREATE INDEX IF NOT EXISTS idx_practice_attempts_loop ON public.practice_attempts(loop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_practice_attempts_user ON public.practice_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_teach_back_turns_loop ON public.teach_back_turns(loop_id, turn_number ASC);
CREATE INDEX IF NOT EXISTS idx_teach_back_turns_user ON public.teach_back_turns(user_id);

-- -----------------------------------------------------------------------------
-- 6. TRIGGERS & STORED PROCEDURES
-- -----------------------------------------------------------------------------

-- Trigger 6.1: Auto-update updated_at timestamp on record modification
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_study_loops_updated_at ON public.study_loops;
CREATE TRIGGER trg_study_loops_updated_at
  BEFORE UPDATE ON public.study_loops
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger 6.2: Auto-create profile record when a new user signs up in Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- Enforce strict tenant isolation: users can only view and modify their own records
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_loops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teach_back_turns ENABLE ROW LEVEL SECURITY;

-- 7.1 PROFILES POLICIES
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 7.2 STUDY LOOPS POLICIES
DROP POLICY IF EXISTS "study_loops_select_own" ON public.study_loops;
CREATE POLICY "study_loops_select_own" ON public.study_loops
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "study_loops_insert_own" ON public.study_loops;
CREATE POLICY "study_loops_insert_own" ON public.study_loops
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "study_loops_update_own" ON public.study_loops;
CREATE POLICY "study_loops_update_own" ON public.study_loops
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "study_loops_delete_own" ON public.study_loops;
CREATE POLICY "study_loops_delete_own" ON public.study_loops
  FOR DELETE USING (auth.uid() = user_id);

-- 7.3 PRACTICE ATTEMPTS POLICIES
DROP POLICY IF EXISTS "practice_attempts_select_own" ON public.practice_attempts;
CREATE POLICY "practice_attempts_select_own" ON public.practice_attempts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "practice_attempts_insert_own" ON public.practice_attempts;
CREATE POLICY "practice_attempts_insert_own" ON public.practice_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "practice_attempts_update_own" ON public.practice_attempts;
CREATE POLICY "practice_attempts_update_own" ON public.practice_attempts
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "practice_attempts_delete_own" ON public.practice_attempts;
CREATE POLICY "practice_attempts_delete_own" ON public.practice_attempts
  FOR DELETE USING (auth.uid() = user_id);

-- 7.4 TEACH-BACK TURNS POLICIES
DROP POLICY IF EXISTS "teach_back_turns_select_own" ON public.teach_back_turns;
CREATE POLICY "teach_back_turns_select_own" ON public.teach_back_turns
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "teach_back_turns_insert_own" ON public.teach_back_turns;
CREATE POLICY "teach_back_turns_insert_own" ON public.teach_back_turns
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "teach_back_turns_update_own" ON public.teach_back_turns;
CREATE POLICY "teach_back_turns_update_own" ON public.teach_back_turns
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "teach_back_turns_delete_own" ON public.teach_back_turns;
CREATE POLICY "teach_back_turns_delete_own" ON public.teach_back_turns
  FOR DELETE USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 8. COMPREHENSIVE SEED DATA
-- Provides realistic study loops across domains for testing and demo purposes
-- -----------------------------------------------------------------------------

-- 8.1 Demo User in auth.users
-- Note: Uses a stable UUID 'd0000000-0000-0000-0000-000000000001'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = 'd0000000-0000-0000-0000-000000000001') THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      email_change_token_current,
      phone,
      phone_change,
      phone_change_token,
      reauthentication_token,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      'd0000000-0000-0000-0000-000000000001',
      'authenticated',
      'authenticated',
      'demo.student@studyloop.dev',
      crypt('StudyLoop2026!', gen_salt('bf')),
      NOW(),
      '',
      '',
      '',
      '',
      '',
      NULL,
      '',
      '',
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Alex Rivera"}'::jsonb,
      NOW(),
      NOW()
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      'd0000000-0000-0000-0000-000000000001',
      'd0000000-0000-0000-0000-000000000001',
      '{"sub":"d0000000-0000-0000-0000-000000000001","email":"demo.student@studyloop.dev"}'::jsonb,
      'email',
      'd0000000-0000-0000-0000-000000000001',
      NOW(),
      NOW(),
      NOW()
    ) ON CONFLICT (provider, provider_id) DO NOTHING;
  END IF;
END $$;

-- 8.2 User Profile Seed
INSERT INTO public.profiles (id, full_name, default_depth, default_style)
VALUES (
  'd0000000-0000-0000-0000-000000000001',
  'Alex Rivera',
  'intermediate',
  'visual_analogies'
)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  default_depth = EXCLUDED.default_depth,
  default_style = EXCLUDED.default_style;

-- 8.3 Study Loop #1: Computer Science (Stage: Completed, Status: Mastered, Score: 92)
INSERT INTO public.study_loops (
  id,
  user_id,
  title,
  domain,
  input_mode,
  source_summary,
  source_text_excerpt,
  depth_level,
  explanation_style,
  steps_json,
  core_takeaway,
  current_stage,
  status,
  mastery_score,
  created_at
) VALUES (
  'e1111111-1111-1111-1111-111111111111',
  'd0000000-0000-0000-0000-000000000001',
  'React Reconciliation & The Virtual DOM',
  'computer_science',
  'text',
  'Explanation of how React uses a lightweight in-memory representation of the real DOM to compute minimum surgical DOM diffs via the Reconciliation algorithm.',
  'When state changes in a React component, React creates a new Virtual DOM tree, compares it against the previous snapshot using an O(n) heuristic diffing algorithm, and applies only the calculated mutations to the actual browser DOM in a single batched commit phase.',
  'intermediate',
  'visual_analogies',
  '[
    {
      "step_number": 1,
      "heading": "The Problem with the Real DOM",
      "explanation": "Manipulating the real browser DOM is computationally expensive because every change forces the browser to recalculate layout, recalculate styles, and trigger layout reflows and repaints.",
      "analogy": "Imagine hiring an entire construction crew to tear down and rebuild a brick wall every time you want to change a picture frame.",
      "key_point": "Direct DOM mutations cause cascading layout recalculations and browser jank."
    },
    {
      "step_number": 2,
      "heading": "The Virtual DOM Blueprint",
      "explanation": "React maintains a lightweight JavaScript object representation of the UI tree in memory called the Virtual DOM.",
      "analogy": "Instead of modifying the physical building directly, an architect drafts and erases sketches on a cheap tracing paper blueprint.",
      "key_point": "Modifying pure JavaScript objects in memory takes microseconds compared to real DOM nodes."
    },
    {
      "step_number": 3,
      "heading": "The Diffing Algorithm (Reconciliation)",
      "explanation": "When state changes, React renders a new Virtual DOM tree and compares it to the previous tree using an optimized O(n) diffing heuristic based on element types and unique keys.",
      "analogy": "A copy editor compares two drafts side-by-side with a red pen, circling only the exact words that changed.",
      "key_point": "React assumes elements of different types generate different trees, and uses `key` props to match list items across renders."
    },
    {
      "step_number": 4,
      "heading": "The Batched Commit Phase",
      "explanation": "After calculating the exact delta of differences, React packages all required changes together and applies them to the real DOM in a single batched operation.",
      "analogy": "Instead of making 10 individual trips to the hardware store for 10 screws, the builder buys them all in a single bulk delivery.",
      "key_point": "Batching updates minimizes browser reflows and guarantees 60 FPS smooth rendering."
    }
  ]'::jsonb,
  'The Virtual DOM is a fast in-memory blueprint that allows React to compute minimal UI diffs and apply surgical updates in batches to keep web apps blazing fast.',
  'completed',
  'mastered',
  92,
  NOW() - INTERVAL '2 days'
)
ON CONFLICT (id) DO NOTHING;

-- Practice Attempt for Loop #1
INSERT INTO public.practice_attempts (
  id,
  loop_id,
  user_id,
  question_text,
  question_type,
  hint_text,
  user_answer,
  is_correct,
  ai_feedback,
  worked_solution,
  created_at,
  answered_at
) VALUES (
  'f1111111-1111-1111-1111-111111111111',
  'e1111111-1111-1111-1111-111111111111',
  'd0000000-0000-0000-0000-000000000001',
  'Why does React strongly require unique, stable `key` attributes when rendering dynamic lists, and what happens if you naively use the array index as a key?',
  'conceptual',
  'Think about how React identifies which list element moved, was inserted, or was deleted during tree comparison.',
  'React uses keys to track which specific list item corresponds to which Virtual DOM node across renders. If you use array indices and insert an item at the beginning of the list, every item index shifts, causing React to unnecessarily re-render and mutate every single element instead of just inserting one.',
  TRUE,
  'Outstanding! You correctly identified identity persistence and explained how index keys degrade diffing performance when items are prepended or reordered.',
  '1. React compares children by key.\n2. With stable keys, React sees that items A, B, and C simply moved position or retained identity, inserting only new item D.\n3. With array index keys, prepending an item shifts index 0 from A to D, index 1 from B to A, causing destructive re-renders and uncontrolled input state bugs.',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days' + INTERVAL '3 minutes'
)
ON CONFLICT (id) DO NOTHING;

-- Teach-Back Turns for Loop #1
INSERT INTO public.teach_back_turns (
  id,
  loop_id,
  user_id,
  turn_number,
  user_explanation,
  bot_reply,
  is_complete,
  clarity_score,
  accuracy_score,
  completeness_score,
  overall_score,
  missing_concepts,
  created_at
) VALUES
(
  'b1111111-1111-1111-1111-111111111111',
  'e1111111-1111-1111-1111-111111111111',
  'd0000000-0000-0000-0000-000000000001',
  1,
  'So basically, the real browser DOM is super slow because touching it makes the screen redraw. Instead of changing it every time state updates, React keeps a lightweight Javascript clone called the Virtual DOM. It compares the old and new blueprints, finds what changed, and only changes that tiny part on the real screen.',
  'That is an awesome explanation! You nailed the contrast between the expensive browser reflow and the lightweight JS object blueprint. To make your explanation 100% complete: what do we call this comparison algorithm, and what special prop does React look for in lists to match items between drafts?',
  FALSE,
  90,
  92,
  82,
  88,
  '["reconciliation", "stable keys"]'::jsonb,
  NOW() - INTERVAL '2 days' + INTERVAL '10 minutes'
),
(
  'b1111111-1111-1111-1111-111111111112',
  'e1111111-1111-1111-1111-111111111111',
  'd0000000-0000-0000-0000-000000000001',
  2,
  'The comparison process is called Reconciliation, and React uses stable `key` props so it can tell exactly which item in a list moved or stayed the same, without guessing!',
  'Bingo! You hit every single core concept: the DOM reflow problem, the in-memory Virtual DOM blueprint, the Reconciliation heuristic, and stable key preservation. You truly own this topic!',
  TRUE,
  95,
  94,
  90,
  92,
  '[]'::jsonb,
  NOW() - INTERVAL '2 days' + INTERVAL '12 minutes'
)
ON CONFLICT (id) DO NOTHING;

-- 8.4 Study Loop #2: Engineering (Stage: Teach-Back, Status: Needs Review, Score: 68)
INSERT INTO public.study_loops (
  id,
  user_id,
  title,
  domain,
  input_mode,
  source_summary,
  source_text_excerpt,
  depth_level,
  explanation_style,
  steps_json,
  core_takeaway,
  current_stage,
  status,
  mastery_score,
  created_at
) VALUES (
  'e2222222-2222-2222-2222-222222222222',
  'd0000000-0000-0000-0000-000000000001',
  'Kirchhoffs Current and Voltage Laws (KCL & KVL)',
  'engineering',
  'pdf',
  'Fundamental circuit analysis laws derived from conservation of electrical charge and conservation of energy.',
  'Kirchhoffs Current Law (KCL) states that the algebraic sum of currents entering any circuit node must equal zero (conservation of charge). Kirchhoffs Voltage Law (KVL) states that the directed sum of electrical potential differences around any closed circuit loop is zero (conservation of energy).',
  'exam_ready',
  'first_principles',
  '[
    {
      "step_number": 1,
      "heading": "Conservation of Charge & KCL",
      "explanation": "Because electrical charge cannot accumulate at an infinitesimally small junction (node), the total current entering a node must equal the total current exiting: $\\sum I_{in} = \\sum I_{out}$.",
      "analogy": "Think of a water pipe junction: the gallons per minute flowing in through two incoming pipes must equal the water leaving through the third pipe.",
      "key_point": "At any circuit junction node: $\\sum_{k=1}^n I_k = 0$."
    },
    {
      "step_number": 2,
      "heading": "Conservation of Energy & KVL",
      "explanation": "Electrostatic fields are conservative. When moving a charge along any complete closed loop in a circuit, the net electrical work done is zero: $\\sum \\Delta V = 0$.",
      "analogy": "A rollercoaster track: after climbing up hills (voltage gain) and dropping down loops (voltage drops), you end up at the exact same ground elevation where you started.",
      "key_point": "The algebraic sum of voltage rises and voltage drops around any closed loop is zero."
    },
    {
      "step_number": 3,
      "heading": "Passive Sign Convention",
      "explanation": "When traversing a branch in the direction of reference current, passing from + to - represents a voltage drop (-IR), while passing from - to + represents a voltage rise (+V).",
      "analogy": "Walking down a staircase lowers your potential energy; riding an elevator up increases it.",
      "key_point": "Consistent sign notation across mesh equations is mandatory to avoid sign flip errors."
    }
  ]'::jsonb,
  'KCL governs node currents based on conservation of charge, while KVL governs closed-loop voltages based on conservation of energy.',
  'teach_back',
  'needs_review',
  68,
  NOW() - INTERVAL '1 day'
)
ON CONFLICT (id) DO NOTHING;

-- Practice Attempt for Loop #2
INSERT INTO public.practice_attempts (
  id,
  loop_id,
  user_id,
  question_text,
  question_type,
  hint_text,
  user_answer,
  is_correct,
  ai_feedback,
  worked_solution,
  created_at,
  answered_at
) VALUES (
  'f2222222-2222-2222-2222-222222222222',
  'e2222222-2222-2222-2222-222222222222',
  'd0000000-0000-0000-0000-000000000001',
  'A single loop circuit has a 12V battery and two resistors in series: R1 = 4 Ohms and R2 = 2 Ohms. Calculate the loop current I and the voltage drop across R1 using KVL.',
  'problem_solving',
  'Set the sum of voltages around the loop to zero: 12V - I*R1 - I*R2 = 0.',
  'The total resistance is 4 + 2 = 6 Ohms. By Ohm Law and KVL: I = 12 / 6 = 2 Amperes. The voltage drop across R1 is 2A * 4 Ohms = 8 Volts.',
  TRUE,
  'Correct calculation! You clearly showed the loop resistance summation and applied Ohm Law across R1.',
  'KVL Equation: 12 - I(4) - I(2) = 0 => 6I = 12 => I = 2A. Voltage drop V1 = I * R1 = 2A * 4 Ohms = 8V. Check: V2 = 2A * 2 Ohms = 4V. Total drop: 8V + 4V = 12V (KVL verified).',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day' + INTERVAL '5 minutes'
)
ON CONFLICT (id) DO NOTHING;

-- Teach-Back Turn for Loop #2
INSERT INTO public.teach_back_turns (
  id,
  loop_id,
  user_id,
  turn_number,
  user_explanation,
  bot_reply,
  is_complete,
  clarity_score,
  accuracy_score,
  completeness_score,
  overall_score,
  missing_concepts,
  created_at
) VALUES (
  'b2222222-2222-2222-2222-222222222221',
  'e2222222-2222-2222-2222-222222222222',
  'd0000000-0000-0000-0000-000000000001',
  1,
  'KCL means that current into a junction equals current out, like water in pipes. KVL means that if you go in a circle around any circuit, the battery voltage has to equal the voltage dropped on all resistors.',
  'Great start! The water pipe analogy for KCL is spot on, and you grasped the basic idea of loop voltage. However, why is KVL true fundamentally in physics (what physical quantity is conserved?), and how do you handle signs if a resistor opposes your loop direction?',
  FALSE,
  74,
  70,
  60,
  68,
  '["conservation of energy", "passive sign convention"]'::jsonb,
  NOW() - INTERVAL '1 day' + INTERVAL '15 minutes'
)
ON CONFLICT (id) DO NOTHING;

-- 8.5 Study Loop #3: Medicine & Health (Stage: Explain, Status: In Progress, Score: NULL)
INSERT INTO public.study_loops (
  id,
  user_id,
  title,
  domain,
  input_mode,
  source_summary,
  source_text_excerpt,
  depth_level,
  explanation_style,
  steps_json,
  core_takeaway,
  current_stage,
  status,
  mastery_score,
  created_at
) VALUES (
  'e3333333-3333-3333-3333-333333333333',
  'd0000000-0000-0000-0000-000000000001',
  'Cardiac Action Potential: Ventricular Myocyte Phases',
  'medicine_health',
  'image',
  'Sequential ionic currents and electrophysiological phases (0 through 4) of human ventricular cardiac myocytes.',
  'The ventricular action potential consists of Phase 0 (rapid depolarization via voltage-gated Na+ channels), Phase 1 (transient repolarization via Ito K+ channels), Phase 2 (plateau via L-type Ca2+ channels balancing delayed rectifier K+ channels), Phase 3 (rapid repolarization via IKr/IKs channels), and Phase 4 (true resting membrane potential at -90mV via IK1 channels).',
  'intermediate',
  'practical_examples',
  '[
    {
      "step_number": 1,
      "heading": "Phase 0: Rapid Upstroke (Depolarization)",
      "explanation": "When neighboring cells depolarize the membrane to threshold (-70mV), fast voltage-gated Na+ channels open in an all-or-nothing rush, shooting the intracellular voltage from -90mV to +20mV within 1-2 milliseconds.",
      "analogy": "Kicking open emergency floodgates: thousands of Na+ ions rush down their steep concentration gradient.",
      "key_point": "Inflow of Na+ drives the steep Phase 0 upstroke; blocked by Class I antiarrhythmics like Lidocaine."
    },
    {
      "step_number": 2,
      "heading": "Phase 1: Early Transient Repolarization",
      "explanation": "Fast Na+ channels abruptly inactivate, and transient outward K+ channels (Ito) open briefly, creating a small notch down to roughly 0mV.",
      "analogy": "Bouncing slightly off the top of a trampoline before catching your balance.",
      "key_point": "Brief K+ efflux sets the starting voltage for the plateau phase."
    },
    {
      "step_number": 3,
      "heading": "Phase 2: The Plateau Phase (Crucial for Pumping)",
      "explanation": "L-type Ca2+ channels open, allowing slow inward Ca2+ flux. This influx is evenly matched by outward delayed rectifier K+ currents, holding the membrane potential near 0mV for 200-300ms.",
      "analogy": "A tug-of-war where both teams pull with equal strength, keeping the rope suspended motionless in midair.",
      "key_point": "Prevents cardiac tetany (cramping) by enforcing a prolonged refractory period while stimulating cardiac contraction."
    },
    {
      "step_number": 4,
      "heading": "Phase 3: Rapid Repolarization",
      "explanation": "L-type Ca2+ channels close, but outward K+ channels (IKr and IKs) remain wide open, driving positive charge out of the cell and resetting the voltage back down toward -90mV.",
      "analogy": "Draining the water through multiple large release valves until the reservoir returns to base level.",
      "key_point": "Dominated by K+ efflux; delayed Phase 3 causes Long QT syndrome."
    },
    {
      "step_number": 5,
      "heading": "Phase 4: Stable Resting Membrane Potential",
      "explanation": "Inward rectifier K+ channels (IK1) and the Na+/K+ ATPase pump maintain a stable negative resting potential of approximately -90mV until the next electrical stimulus arrives.",
      "analogy": "A battery charger keeping the device ready for the next usage cycle.",
      "key_point": "Unlike pacemaker nodal cells, ventricular myocytes have a flat Phase 4 with no spontaneous automaticity."
    }
  ]'::jsonb,
  'The prolonged Phase 2 Ca2+ plateau is the hallmarks of ventricular cardiac action potentials, preventing heart spasms and providing time for mechanical ventricular ejection.',
  'explain',
  'in_progress',
  NULL,
  NOW() - INTERVAL '3 hours'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Migration 001_initial_schema.sql completed successfully.
-- =============================================================================

