#!/usr/bin/env node
/**
 * StudyLoop — Seed Data Runner
 * 
 * Uses the Supabase Service Role Key to bypass RLS and populate initial seed data
 * into public.profiles, public.study_loops, public.practice_attempts, and public.teach_back_turns.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// --- Simple built-in .env parser ---
function loadEnv() {
  const envPath = path.join(rootDir, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('\n❌ Missing required environment variables in .env:');
  console.error('   - SUPABASE_URL: (e.g. https://your-project-id.supabase.co)');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY: (Secret service_role key from Project Settings -> API)\n');
  process.exit(1);
}

// Fixed UUIDs for predictable testing and idempotent runs
const DEMO_USER_ID = 'd0000000-0000-0000-0000-000000000001';
const LOOP_1_ID = 'e1111111-1111-1111-1111-111111111111';
const LOOP_2_ID = 'e2222222-2222-2222-2222-222222222222';
const LOOP_3_ID = 'e3333333-3333-3333-3333-333333333333';
const ATTEMPT_1_ID = 'f1111111-1111-1111-1111-111111111111';
const ATTEMPT_2_ID = 'f2222222-2222-2222-2222-222222222222';
const TURN_1_ID = 'b1111111-1111-1111-1111-111111111111';
const TURN_2_ID = 'b1111111-1111-1111-1111-111111111112';
const TURN_3_ID = 'b2222222-2222-2222-2222-222222222221';

async function postgrestRequest(endpoint, method, body = null) {
  const url = `${supabaseUrl}/rest/v1/${endpoint}`;
  const options = {
    method,
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal,resolution=merge-duplicates'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`PostgREST error on [${method} ${endpoint}]: ${res.status} ${res.statusText} - ${errorText}`);
  }
  return true;
}

async function seedData() {
  console.log('\n================================================================');
  console.log('       StudyLoop Supabase Seed Runner (Service Role Key)        ');
  console.log('================================================================\n');

  console.log(`Connecting to: ${supabaseUrl}`);

  // 1. Ensure user exists in auth (try auth admin API via Service Role Key)
  console.log('1️⃣  Checking/Creating Demo User in Supabase Auth...');
  try {
    const authUserRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: DEMO_USER_ID,
        email: 'demo.student@studyloop.dev',
        password: 'StudyLoop2026!',
        email_confirm: true,
        user_metadata: {
          full_name: 'Alex Rivera'
        }
      })
    });

    if (authUserRes.ok) {
      console.log('   ✅ Demo user created in Supabase Auth (demo.student@studyloop.dev)');
    } else {
      const err = await authUserRes.json();
      if (err.msg && err.msg.includes('already exists') || (err.message && err.message.includes('already exists'))) {
        console.log('   ℹ️  Demo user already exists in Supabase Auth.');
      } else {
        console.log(`   ℹ️  Auth note: ${err.message || JSON.stringify(err)}`);
      }
    }
  } catch (err) {
    console.warn(`   ⚠️  Auth admin endpoint note: ${err.message}`);
  }

  // 2. Upsert Profile
  console.log('2️⃣  Upserting Demo Profile...');
  await postgrestRequest('profiles?on_conflict=id', 'POST', {
    id: DEMO_USER_ID,
    full_name: 'Alex Rivera',
    default_depth: 'intermediate',
    default_style: 'visual_analogies',
    updated_at: new Date().toISOString()
  });
  console.log('   ✅ Profile ready: Alex Rivera (intermediate, visual_analogies)');

  // 3. Upsert Study Loops
  console.log('3️⃣  Upserting Study Loops...');
  const studyLoops = [
    {
      id: LOOP_1_ID,
      user_id: DEMO_USER_ID,
      title: 'React Reconciliation & The Virtual DOM',
      domain: 'computer_science',
      input_mode: 'text',
      source_summary: 'Explanation of how React uses an in-memory Virtual DOM to compute minimal UI diffs via the Reconciliation algorithm.',
      source_text_excerpt: 'When state changes, React creates a new Virtual DOM tree and diffs it using an O(n) heuristic.',
      depth_level: 'intermediate',
      explanation_style: 'visual_analogies',
      steps_json: [
        {
          step_number: 1,
          heading: 'The Problem with the Real DOM',
          explanation: 'Direct DOM manipulation is slow due to costly browser layout recalculations and repaints.',
          analogy: 'Hiring a full construction crew to rebuild a wall just to replace a wall picture.',
          key_point: 'Direct DOM changes trigger heavy browser reflow cycles.'
        },
        {
          step_number: 2,
          heading: 'The Virtual DOM Blueprint',
          explanation: 'React maintains a lightweight JavaScript object tree in memory representing the UI.',
          analogy: 'An architect sketching quick adjustments on cheap tracing paper.',
          key_point: 'In-memory JavaScript modifications take microseconds.'
        },
        {
          step_number: 3,
          heading: 'The Diffing Algorithm (Reconciliation)',
          explanation: 'React renders a new Virtual DOM tree and diffs it with the previous snapshot using element types and keys.',
          analogy: 'An editor circling changes with a red pen between two draft versions.',
          key_point: 'Keys allow React to track list item identity across re-renders.'
        },
        {
          step_number: 4,
          heading: 'The Batched Commit Phase',
          explanation: 'React packages all computed DOM mutations and flushes them to the browser in one single batch.',
          analogy: 'Buying all 10 hardware supplies in a single delivery instead of 10 individual store trips.',
          key_point: 'Batching minimizes reflows to keep 60 FPS animation smooth.'
        }
      ],
      core_takeaway: 'The Virtual DOM acts as a fast in-memory diffing layer that applies surgical updates in batches to keep UI rendering fast.',
      current_stage: 'completed',
      status: 'mastered',
      mastery_score: 92,
      updated_at: new Date().toISOString()
    },
    {
      id: LOOP_2_ID,
      user_id: DEMO_USER_ID,
      title: 'Kirchhoffs Current and Voltage Laws (KCL & KVL)',
      domain: 'engineering',
      input_mode: 'pdf',
      source_summary: 'Fundamental electrical circuit laws based on conservation of charge (KCL) and energy (KVL).',
      source_text_excerpt: 'KCL states sum of currents entering a node is zero; KVL states sum of voltages in a loop is zero.',
      depth_level: 'exam_ready',
      explanation_style: 'first_principles',
      steps_json: [
        {
          step_number: 1,
          heading: 'Conservation of Charge (KCL)',
          explanation: 'Charge cannot accumulate at an infinitesimal node: sum of entering currents equals exiting currents.',
          analogy: 'Water pipes joining at a junction: water in equals water out.',
          key_point: 'At any circuit node: Sigma I = 0.'
        },
        {
          step_number: 2,
          heading: 'Conservation of Energy (KVL)',
          explanation: 'In a conservative electrostatic field, net work done around any closed loop is zero.',
          analogy: 'A rollercoaster track: after all climbs and drops, you return to ground level.',
          key_point: 'Around any closed loop: Sigma V = 0.'
        },
        {
          step_number: 3,
          heading: 'Passive Sign Convention',
          explanation: 'Traversing in the direction of current drops potential (+ to - = -IR); climbing batteries adds potential (+V).',
          analogy: 'Walking down stairs loses potential energy; riding an elevator increases it.',
          key_point: 'Consistent sign convention prevents mesh equation polarity flips.'
        }
      ],
      core_takeaway: 'KCL governs node currents based on conservation of charge; KVL governs closed loops based on conservation of energy.',
      current_stage: 'teach_back',
      status: 'needs_review',
      mastery_score: 68,
      updated_at: new Date().toISOString()
    },
    {
      id: LOOP_3_ID,
      user_id: DEMO_USER_ID,
      title: 'Cardiac Action Potential: Ventricular Myocyte Phases',
      domain: 'medicine_health',
      input_mode: 'image',
      source_summary: 'Sequential ionic currents and electrophysiological phases (0-4) of human ventricular myocytes.',
      source_text_excerpt: 'Phase 0 rapid depolarization, Phase 1 notch, Phase 2 Ca2+ plateau, Phase 3 repolarization, Phase 4 resting -90mV.',
      depth_level: 'intermediate',
      explanation_style: 'practical_examples',
      steps_json: [
        {
          step_number: 1,
          heading: 'Phase 0: Rapid Upstroke (Depolarization)',
          explanation: 'Fast voltage-gated Na+ channels open, shooting membrane voltage from -90mV to +20mV.',
          analogy: 'Opening emergency floodgates.',
          key_point: 'Driven by inward Na+ current; blocked by Lidocaine.'
        },
        {
          step_number: 2,
          heading: 'Phase 1: Early Transient Repolarization',
          explanation: 'Na+ channels close and transient outward K+ (Ito) channels cause a brief notch.',
          analogy: 'A slight bounce off a trampoline.',
          key_point: 'Sets initial membrane voltage for the plateau.'
        },
        {
          step_number: 3,
          heading: 'Phase 2: The Plateau Phase',
          explanation: 'Slow inward L-type Ca2+ current balances outward K+ current, maintaining voltage near 0mV for 250ms.',
          analogy: 'A balanced tug-of-war holding the flag stationary.',
          key_point: 'Prolongs the refractory period to prevent cardiac tetany.'
        },
        {
          step_number: 4,
          heading: 'Phase 3: Rapid Repolarization',
          explanation: 'Ca2+ channels close and delayed rectifier K+ channels drive rapid repolarization to -90mV.',
          analogy: 'Draining reservoir valves to restore baseline.',
          key_point: 'Driven by K+ efflux; delayed Phase 3 causes Long QT.'
        },
        {
          step_number: 5,
          heading: 'Phase 4: Resting Membrane Potential',
          explanation: 'Inward rectifier K+ channels (IK1) maintain -90mV resting potential.',
          analogy: 'A battery charger keeping the device ready.',
          key_point: 'Ventricular cells have stable resting potentials with no spontaneous pacemaker activity.'
        }
      ],
      core_takeaway: 'The prolonged Phase 2 Ca2+ plateau enforces cardiac refractory time and prevents muscle spasms.',
      current_stage: 'explain',
      status: 'in_progress',
      mastery_score: null,
      updated_at: new Date().toISOString()
    }
  ];

  for (const loop of studyLoops) {
    await postgrestRequest('study_loops?on_conflict=id', 'POST', loop);
    console.log(`   ✅ Study loop seeded: "${loop.title}" (${loop.status})`);
  }

  // 4. Upsert Practice Attempts
  console.log('4️⃣  Upserting Practice Attempts...');
  const attempts = [
    {
      id: ATTEMPT_1_ID,
      loop_id: LOOP_1_ID,
      user_id: DEMO_USER_ID,
      question_text: 'Why does React require stable key attributes in dynamic lists, and what happens when you use array indices?',
      question_type: 'conceptual',
      hint_text: 'Think about how React identifies item order and node identity during diffing.',
      user_answer: 'React uses keys to track node identity. If index is used and an element is prepended, all indices shift and trigger unnecessary full re-renders.',
      is_correct: true,
      ai_feedback: 'Outstanding explanation! You correctly explained identity tracking and prepending degradation.',
      worked_solution: '1. Keys preserve node identity.\n2. Stable keys ensure only shifted nodes move.\n3. Index keys force full tree mutations when order changes.',
      answered_at: new Date().toISOString()
    },
    {
      id: ATTEMPT_2_ID,
      loop_id: LOOP_2_ID,
      user_id: DEMO_USER_ID,
      question_text: 'A 12V battery connects to R1=4 Ohms and R2=2 Ohms in series. Find loop current I and voltage drop on R1 using KVL.',
      question_type: 'problem_solving',
      hint_text: 'Set loop voltage sum to 0: 12 - I*4 - I*2 = 0.',
      user_answer: 'R_total = 6 Ohms, so I = 12 / 6 = 2A. V1 = 2A * 4 Ohms = 8V.',
      is_correct: true,
      ai_feedback: 'Correct calculations and clean Ohm Law application.',
      worked_solution: 'KVL: 12 - 4I - 2I = 0 => 6I = 12 => I = 2A. V1 = 2 * 4 = 8V. V2 = 2 * 2 = 4V. 8V + 4V = 12V.',
      answered_at: new Date().toISOString()
    }
  ];

  for (const attempt of attempts) {
    await postgrestRequest('practice_attempts?on_conflict=id', 'POST', attempt);
    console.log(`   ✅ Practice attempt seeded for loop: ${attempt.loop_id}`);
  }

  // 5. Upsert Teach-Back Turns
  console.log('5️⃣  Upserting Teach-Back Turns...');
  const turns = [
    {
      id: TURN_1_ID,
      loop_id: LOOP_1_ID,
      user_id: DEMO_USER_ID,
      turn_number: 1,
      user_explanation: 'The real DOM is slow, so React keeps an in-memory blueprint called Virtual DOM and diffs it before making surgical updates.',
      bot_reply: 'Awesome explanation! What is this comparison algorithm called, and how does React identify items in a list?',
      is_complete: false,
      clarity_score: 90,
      accuracy_score: 92,
      completeness_score: 82,
      overall_score: 88,
      missing_concepts: ['reconciliation', 'stable keys']
    },
    {
      id: TURN_2_ID,
      loop_id: LOOP_1_ID,
      user_id: DEMO_USER_ID,
      turn_number: 2,
      user_explanation: 'It is called Reconciliation, and it uses stable keys to match items across renders without guessing.',
      bot_reply: 'Bingo! You nailed the whole loop from Virtual DOM to Reconciliation and stable keys!',
      is_complete: true,
      clarity_score: 95,
      accuracy_score: 94,
      completeness_score: 90,
      overall_score: 92,
      missing_concepts: []
    },
    {
      id: TURN_3_ID,
      loop_id: LOOP_2_ID,
      user_id: DEMO_USER_ID,
      turn_number: 1,
      user_explanation: 'KCL is current in equals current out like water pipes. KVL is battery voltage equals resistor voltage drops.',
      bot_reply: 'Great start! What conservation laws are behind these, and how do you handle signs for opposing directions?',
      is_complete: false,
      clarity_score: 74,
      accuracy_score: 70,
      completeness_score: 60,
      overall_score: 68,
      missing_concepts: ['conservation of energy', 'passive sign convention']
    }
  ];

  for (const turn of turns) {
    await postgrestRequest('teach_back_turns?on_conflict=id', 'POST', turn);
    console.log(`   ✅ Teach-back turn #${turn.turn_number} seeded for loop: ${turn.loop_id}`);
  }

  console.log('\n🎉 Seed data populated successfully via Supabase Service Role Key!');
}

seedData().catch((err) => {
  console.error('\n❌ Seed runner failed:', err.message);
  process.exit(1);
});

