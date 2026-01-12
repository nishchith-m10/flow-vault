'use strict';
/**
 * scripts/check_env.js
 * Usage:
 *  node scripts/check_env.js           // print warnings for missing vars
 *  node scripts/check_env.js --fail    // exit with code 1 if required vars are missing
 *
 * This script loads .env.local (if present) and checks for required/recommended env vars.
 */

import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

// Load .env.local if present
const dotenvPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(dotenvPath)) {
  config({ path: dotenvPath });
}

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_PROJECT_REF',
  'CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'ENCRYPTION_KEY'
];

const recommended = [
  'GITHUB_TOKEN',
  'JULES_API_KEY',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'SENTRY_DSN'
];

const optional = [
  'S3_ENDPOINT',
  'S3_BUCKET',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY'
];

function isSet(name) {
  const v = process.env[name];
  return typeof v !== 'undefined' && v !== null && String(v).trim() !== '';
}

let missingRequired = [];
let missingRecommended = [];
let missingOptional = [];

required.forEach((k) => {
  if (!isSet(k)) missingRequired.push(k);
});
recommended.forEach((k) => {
  if (!isSet(k)) missingRecommended.push(k);
});
optional.forEach((k) => {
  if (!isSet(k)) missingOptional.push(k);
});

if (missingRequired.length === 0 && missingRecommended.length === 0 && missingOptional.length === 0) {
  console.log('\x1b[32m%s\x1b[0m', 'All required, recommended, and optional env vars appear to be set.');
  process.exit(0);
}

if (missingRequired.length > 0) {
  console.log('\n\x1b[31m%s\x1b[0m', 'Missing REQUIRED env vars:');
  missingRequired.forEach((k) => console.log('  - %s', k));
} else {
  console.log('\n\x1b[32m%s\x1b[0m', 'All required env vars are set.');
}

if (missingRecommended.length > 0) {
  console.log('\n\x1b[33m%s\x1b[0m', 'Missing RECOMMENDED env vars (not mandatory, but useful):');
  missingRecommended.forEach((k) => console.log('  - %s', k));
} else {
  console.log('\n\x1b[32m%s\x1b[0m', 'All recommended env vars are set.');
}

if (missingOptional.length > 0) {
  console.log('\n\x1b[36m%s\x1b[0m', 'Missing OPTIONAL env vars (only for extra features):');
  missingOptional.forEach((k) => console.log('  - %s', k));
}

const failOnMissing = process.argv.includes('--fail') || process.argv.includes('-f');
if (failOnMissing && missingRequired.length > 0) {
  console.log('\n\x1b[31m%s\x1b[0m', `Exiting with code 1 because --fail was passed and ${missingRequired.length} required env var(s) are missing.`);
  process.exit(1);
}

console.log('\n\x1b[2m%s\x1b[0m', "Tip: run 'node scripts/check_env.js --fail' in CI to fail builds if required env vars are missing.");
process.exit(0);
