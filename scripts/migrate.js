#!/usr/bin/env node
/**
 * StudyLoop — Supabase Database Migration Runner
 * 
 * Supports multiple execution strategies:
 * 1. Direct PostgreSQL connection via `pg` (using DATABASE_URL or auto-constructed from SUPABASE_URL + SUPABASE_DB_PASSWORD)
 * 2. Supabase Management API (`https://api.supabase.com/v1/projects/{ref}/database/query`) using SUPABASE_ACCESS_TOKEN or SERVICE_ROLE_KEY
 * 3. Supabase Service Role Key validation & schema verification via PostgREST
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// --- Simple built-in .env parser (avoids crashing if dotenv is not yet installed) ---
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

const migrationFile = path.join(rootDir, 'supabase', 'migrations', '001_initial_schema.sql');

function printBanner() {
  console.log('\n================================================================');
  console.log('       StudyLoop Supabase PostgreSQL Migration Runner           ');
  console.log('================================================================\n');
}

function extractProjectRef(url) {
  if (!url) return null;
  const match = url.match(/https:\/\/([a-z0-9_-]+)\.supabase\.co/i);
  return match ? match[1] : null;
}

/**
 * Strategy 1: Run SQL via Direct PostgreSQL connection (node-postgres / pg)
 */
async function runViaPostgres(connectionString) {
  console.log('🔄 Attempting direct PostgreSQL execution via node-postgres (pg)...');
  
  let pgModule;
  try {
    pgModule = await import('pg');
  } catch (err) {
    console.warn('⚠️  Package "pg" is not yet installed. Run "npm install pg" to enable direct database execution.');
    return false;
  }

  const { Client } = pgModule.default || pgModule;
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Successfully connected to Supabase PostgreSQL database.');

    const sql = fs.readFileSync(migrationFile, 'utf8');
    console.log(`📄 Executing migration script: ${path.basename(migrationFile)}...`);

    const startTime = Date.now();
    await client.query(sql);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`🎉 Migration applied successfully in ${duration}s!\n`);

    // Run quick schema verification
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('profiles', 'study_loops', 'practice_attempts', 'teach_back_turns')
      ORDER BY table_name;
    `);

    console.log('📊 Verified Tables in public schema:');
    for (const row of tablesRes.rows) {
      const countRes = await client.query(`SELECT COUNT(*) FROM public."${row.table_name}"`);
      console.log(`   - ${row.table_name}: ${countRes.rows[0].count} records`);
    }

    await client.end();
    return true;
  } catch (err) {
    console.error('❌ Direct PostgreSQL migration error:', err.message);
    try { await client.end(); } catch (_) {}
    return false;
  }
}

/**
 * Strategy 2: Run SQL via Supabase Management API
 */
async function runViaManagementApi(projectRef, token) {
  console.log(`🔄 Attempting execution via Supabase Management API for project [${projectRef}]...`);
  const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

  const sql = fs.readFileSync(migrationFile, 'utf8');

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sql })
    });

    if (res.ok) {
      console.log('✅ Successfully applied migration via Supabase Management API!\n');
      return true;
    } else {
      const errText = await res.text();
      console.warn(`⚠️  Management API returned status ${res.status}: ${errText}`);
      return false;
    }
  } catch (err) {
    console.warn(`⚠️  Could not reach Supabase Management API: ${err.message}`);
    return false;
  }
}

/**
 * Strategy 3: Verify existing tables and test Service Role Key over PostgREST
 */
async function verifyViaServiceRoleKey(supabaseUrl, serviceRoleKey) {
  console.log('🔄 Checking Supabase REST endpoint with Service Role Key...');

  const tables = ['profiles', 'study_loops', 'practice_attempts', 'teach_back_turns'];
  const results = {};
  let anyTableMissing = false;

  for (const table of tables) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/${table}?select=count`, {
        method: 'HEAD',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Range': '0-0',
          'Prefer': 'count=exact'
        }
      });

      if (res.ok) {
        const contentRange = res.headers.get('content-range');
        const count = contentRange ? contentRange.split('/')[1] : 'present';
        results[table] = { exists: true, count };
      } else if (res.status === 404 || res.status === 400) {
        results[table] = { exists: false, count: 0 };
        anyTableMissing = true;
      } else {
        results[table] = { exists: false, error: `HTTP ${res.status}` };
        anyTableMissing = true;
      }
    } catch (err) {
      results[table] = { exists: false, error: err.message };
      anyTableMissing = true;
    }
  }

  console.log('\n📊 Service Role Inspection Summary:');
  for (const [table, info] of Object.entries(results)) {
    if (info.exists) {
      console.log(`   ✅ public.${table}: ready (${info.count} rows)`);
    } else {
      console.log(`   ⚠️  public.${table}: not found or not initialized`);
    }
  }

  return !anyTableMissing;
}

/**
 * Main Orchestrator
 */
async function main() {
  printBanner();

  if (!fs.existsSync(migrationFile)) {
    console.error(`❌ Migration file not found: ${migrationFile}`);
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;
  const managementToken = process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_MANAGEMENT_TOKEN;

  const projectRef = extractProjectRef(supabaseUrl);

  // 1. Try Direct PostgreSQL URL if available
  if (databaseUrl) {
    console.log('📌 Detected DATABASE_URL in environment.');
    const ok = await runViaPostgres(databaseUrl);
    if (ok) process.exit(0);
  }

  // 2. Try building DATABASE_URL from SUPABASE_URL + SUPABASE_DB_PASSWORD
  if (!databaseUrl && projectRef && dbPassword) {
    const constructedUrl = `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`;
    console.log(`📌 Constructed database URI from SUPABASE_URL and SUPABASE_DB_PASSWORD.`);
    const ok = await runViaPostgres(constructedUrl);
    if (ok) process.exit(0);
  }

  // 3. Try Supabase Management API if access token is available
  if (projectRef && managementToken) {
    console.log('📌 Detected Supabase Access Token in environment.');
    const ok = await runViaManagementApi(projectRef, managementToken);
    if (ok) process.exit(0);
  }

  // 4. Try Supabase Management API with Service Role Key
  if (projectRef && serviceRoleKey) {
    const okMgmt = await runViaManagementApi(projectRef, serviceRoleKey);
    if (okMgmt) process.exit(0);
  }

  // 5. Test tables via Service Role Key
  if (supabaseUrl && serviceRoleKey) {
    const allReady = await verifyViaServiceRoleKey(supabaseUrl, serviceRoleKey);
    if (allReady) {
      console.log('\n🎉 All 4 StudyLoop tables already exist and are reachable with your Service Role Key!');
      console.log('👉 To refresh seed data, run: npm run seed');
      process.exit(0);
    }
  }

  // 6. Guidance when direct DDL access is needed
  console.log('\n================================================================');
  console.log('ℹ️  HOW TO APPLY THIS MIGRATION TO SUPABASE CLOUD POSTGRESQL     ');
  console.log('================================================================');
  console.log(`
Because Supabase's PostgREST layer isolates arbitrary DDL (CREATE TABLE / TRIGGERS / RLS)
for database security, PostgreSQL schema creation requires direct database execution.

Choose ONE of these quick methods:

METHOD A: Run via this script with your Supabase Database Password (Recommended)
-------------------------------------------------------------------------------
1. In your .env file, add your Supabase Database Connection String:
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.${projectRef || 'YOUR-PROJECT-REF'}.supabase.co:5432/postgres

   (Find this in Supabase Dashboard -> Project Settings -> Database -> Connection String URI)
2. Run:
   npm run migrate

METHOD B: Apply directly in the Supabase Dashboard SQL Editor (Takes 10 seconds)
-------------------------------------------------------------------------------
1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/${projectRef || '_'}/sql
2. Click "New Query"
3. Copy the entire contents of:
   supabase/migrations/001_initial_schema.sql
4. Click "Run" (Green button)
5. Done! Then run "npm run verify" in your terminal to verify with your Service Role Key.

METHOD C: Supabase CLI
-------------------------------------------------------------------------------
1. npx supabase link --project-ref ${projectRef || 'YOUR-PROJECT-REF'}
2. npx supabase db push
`);
}

main().catch((err) => {
  console.error('Fatal migration runner error:', err);
  process.exit(1);
});

