#!/usr/bin/env node
/**
 * StudyLoop — Supabase Schema & Data Verifier
 * 
 * Verifies that all 4 tables exist and queries record counts via Service Role Key.
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
  console.error('   - SUPABASE_SERVICE_ROLE_KEY: (Secret service_role key)\n');
  process.exit(1);
}

const tables = [
  { name: 'profiles', label: 'User Profiles (public.profiles)' },
  { name: 'study_loops', label: 'Study Loops (public.study_loops)' },
  { name: 'practice_attempts', label: 'Practice Attempts (public.practice_attempts)' },
  { name: 'teach_back_turns', label: 'Teach-Back Turns (public.teach_back_turns)' }
];

async function verify() {
  console.log('\n================================================================');
  console.log('       StudyLoop Supabase Schema Verification Report            ');
  console.log('================================================================\n');
  console.log(`Endpoint: ${supabaseUrl}`);
  console.log(`Auth Mode: Service Role Key (Admin / RLS Bypass)\n`);

  let allOk = true;

  for (const t of tables) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/${t.name}?select=*`, {
        method: 'GET',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Range': '0-9',
          'Prefer': 'count=exact'
        }
      });

      if (res.ok) {
        const contentRange = res.headers.get('content-range');
        const count = contentRange ? contentRange.split('/')[1] : 'unknown';
        const data = await res.json();
        console.log(`✅  ${t.label}`);
        console.log(`    Total Records: ${count}`);
        if (data.length > 0) {
          const sample = data[0];
          const sampleTitle = sample.title || sample.full_name || sample.question_text || `Turn #${sample.turn_number}`;
          console.log(`    Sample: "${sampleTitle}" (id: ${sample.id})`);
        }
      } else {
        allOk = false;
        console.log(`❌  ${t.label} — HTTP ${res.status}: ${res.statusText}`);
      }
    } catch (err) {
      allOk = false;
      console.log(`❌  ${t.label} — Error: ${err.message}`);
    }
    console.log('');
  }

  if (allOk) {
    console.log('🎉 Verification PASSED: All tables are properly initialized and queryable!\n');
  } else {
    console.log('⚠️  Verification INCOMPLETE: Some tables could not be verified.');
    console.log('👉 Ensure 001_initial_schema.sql has been applied to your Supabase PostgreSQL database.\n');
  }
}

verify().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});

