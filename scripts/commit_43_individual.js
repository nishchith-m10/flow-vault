#!/usr/bin/env node
/*
 * commit_43_individual.js
 *
 * Purpose: Commit each file from commit_candidates.csv as a separate commit,
 * using the exact commit messages provided. Each commit will be attributed to
 * nishchith-m10 and pushed individually to create 43 separate contributions.
 *
 * Prerequisites:
 * - All changes must already be present in the working directory
 * - Repository must be on the main branch
 * - Working tree should have the changes ready to commit
 *
 * Usage:
 *   node scripts/commit_43_individual.js              # dry-run mode
 *   node scripts/commit_43_individual.js --confirm    # actually commit and push
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DRY_RUN = !process.argv.includes('--confirm');
const GIT_AUTHOR_NAME = 'nishchith-m10';
const GIT_AUTHOR_EMAIL = 'nishchith-m10@users.noreply.github.com';
const ROOT = path.resolve(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'scripts', 'commit_candidates.csv');

function run(cmd, options = {}) {
  try {
    return execSync(cmd, { 
      cwd: ROOT, 
      stdio: options.silent ? 'pipe' : 'inherit',
      encoding: 'utf8'
    }).toString().trim();
  } catch (err) {
    if (options.ignoreError) {
      return '';
    }
    throw err;
  }
}

function parseCsv(content) {
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    rows.push(row);
  }
  
  return rows;
}

function scanForSecrets(content) {
  const patterns = [
    { name: 'RSA PRIVATE KEY', re: /-----BEGIN[\s\S]*PRIVATE KEY-----/g },
    { name: 'API Key', re: /[aA][pP][iI][_-]?[kK][eE][yY][\s:=]["']?[A-Za-z0-9-_]{20,}/g },
    { name: 'Slack Token', re: /xox[baprs]-[A-Za-z0-9-]+/g },
    { name: 'AWS Key', re: /AKIA[0-9A-Z]{16}/g },
  ];
  
  const matches = [];
  for (const pattern of patterns) {
    const found = content.match(pattern.re);
    if (found) {
      matches.push(...found.map(m => ({ type: pattern.name, match: m.slice(0, 50) })));
    }
  }
  return matches;
}

function getFileStatus(filePath) {
  try {
    const status = run(`git status --porcelain "${filePath}"`, { silent: true, ignoreError: true });
    return status;
  } catch {
    return '';
  }
}

function hasChanges(filePath) {
  const status = getFileStatus(filePath);
  return status.length > 0;
}

function fileExists(filePath) {
  return fs.existsSync(path.join(ROOT, filePath));
}

async function main() {
  console.log('='.repeat(70));
  console.log('Individual Commit Script for 43 Changes');
  console.log('Author: nishchith-m10');
  console.log('Mode:', DRY_RUN ? 'DRY RUN' : 'LIVE');
  console.log('='.repeat(70));
  console.log();

  // Check CSV file exists
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ CSV file not found: ${CSV_PATH}`);
    process.exit(1);
  }

  // Check we're on main branch
  const currentBranch = run('git branch --show-current', { silent: true });
  if (currentBranch !== 'main') {
    console.error(`❌ Not on main branch. Current branch: ${currentBranch}`);
    console.error('Please switch to main branch first.');
    process.exit(1);
  }

  // Read and parse CSV
  const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parseCsv(csvContent);
  
  console.log(`📋 Found ${rows.length} entries in CSV\n`);

  let committed = 0;
  let skipped = 0;
  let failed = 0;
  const results = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const filePath = row.file_path || '';
    const commitMessage = row.commit_message || `chore: automated change ${i + 1}`;
    const description = row.description || '';
    const flags = row.flags || '';

    console.log(`\n[${ i + 1}/${rows.length}] Processing: ${filePath}`);
    console.log(`    Message: ${commitMessage}`);

    // Validation checks
    if (!filePath) {
      console.log('    ⚠️  SKIP: No file path specified');
      skipped++;
      results.push({ file: filePath, status: 'skipped', reason: 'No file path' });
      continue;
    }

    if (!fileExists(filePath)) {
      console.log('    ⚠️  SKIP: File does not exist');
      skipped++;
      results.push({ file: filePath, status: 'skipped', reason: 'File not found' });
      continue;
    }

    // Check if file has changes
    if (!hasChanges(filePath)) {
      console.log('    ⚠️  SKIP: No changes detected (file unchanged or already committed)');
      skipped++;
      results.push({ file: filePath, status: 'skipped', reason: 'No changes' });
      continue;
    }

    // Read file content for secret scanning
    try {
      const content = fs.readFileSync(path.join(ROOT, filePath), 'utf8');
      const secrets = scanForSecrets(content);
      
      if (secrets.length > 0) {
        console.log('    🔒 SKIP: Potential secrets detected');
        secrets.slice(0, 2).forEach(s => {
          console.log(`        - ${s.type}: ${s.match}...`);
        });
        skipped++;
        results.push({ file: filePath, status: 'skipped', reason: 'Secrets detected', secrets });
        continue;
      }
    } catch (err) {
      console.log(`    ⚠️  Warning: Could not scan file for secrets: ${err.message}`);
    }

    // Stage the file
    if (!DRY_RUN) {
      try {
        run(`git add "${filePath.replace(/"/g, '\\"')}"`, { silent: true });
        console.log('    ✓ Staged file');
      } catch (err) {
        console.log(`    ❌ FAIL: Could not stage file: ${err.message}`);
        failed++;
        results.push({ file: filePath, status: 'failed', reason: 'Staging failed' });
        continue;
      }

      // Commit with author attribution
      try {
        const escapedMessage = commitMessage.replace(/"/g, '\\"');
        run(`git -c user.name="${GIT_AUTHOR_NAME}" -c user.email="${GIT_AUTHOR_EMAIL}" commit -m "${escapedMessage}"`, { silent: true });
        console.log('    ✓ Committed');
      } catch (err) {
        console.log(`    ❌ FAIL: Could not commit: ${err.message}`);
        failed++;
        results.push({ file: filePath, status: 'failed', reason: 'Commit failed' });
        continue;
      }

      // Push immediately to create individual contribution
      try {
        run('git push origin main', { silent: true });
        console.log('    ✓ Pushed to origin/main');
        committed++;
        results.push({ file: filePath, status: 'success', message: commitMessage });
      } catch (err) {
        console.log(`    ❌ FAIL: Could not push: ${err.message}`);
        console.log('    Note: Commit was created locally but not pushed.');
        failed++;
        results.push({ file: filePath, status: 'failed', reason: 'Push failed' });
        continue;
      }
    } else {
      console.log('    [DRY RUN] Would stage, commit, and push');
      committed++;
      results.push({ file: filePath, status: 'would_commit', message: commitMessage });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total entries processed: ${rows.length}`);
  console.log(`✓ Successfully committed: ${committed}`);
  console.log(`⚠️  Skipped: ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
  console.log();

  if (DRY_RUN) {
    console.log('🔍 This was a DRY RUN - no changes were made');
    console.log('To actually commit and push, run with --confirm flag:');
    console.log('  node scripts/commit_43_individual.js --confirm');
  } else {
    console.log(`✅ Done! Created ${committed} individual commits on GitHub`);
    console.log(`These commits are now visible as contributions for ${GIT_AUTHOR_NAME}`);
  }

  console.log('\n' + '='.repeat(70));

  // Exit with error code if any failed
  if (failed > 0 && !DRY_RUN) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\n❌ Script failed with error:', err.message || err);
  console.error(err.stack);
  process.exit(1);
});
