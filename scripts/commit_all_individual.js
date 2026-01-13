#!/usr/bin/env node
/*
 * commit_all_individual.js
 *
 * Purpose: Inspect all unstaged/uncommitted changes and create one minimal
 * commit per changed file. Runs as a dry-run by default. Use --confirm to
 * actually create commits and push to origin/main.
 *
 * Usage:
 *   node scripts/commit_all_individual.js         # dry-run (no commits)
 *   node scripts/commit_all_individual.js --confirm  # perform commits and push
 *
 * The script will set commit author to the provided GitHub username/email
 * environment or the defaults set in the script. It scans new staged content
 * for likely secrets and aborts if any are found for safety.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DRY_RUN = !(process.argv.includes('--confirm') || process.env.DRY_RUN === 'false');
const GIT_AUTHOR_NAME = process.env.GIT_AUTHOR_NAME || 'nishchith-m10';
const GIT_AUTHOR_EMAIL = process.env.GIT_AUTHOR_EMAIL || 'nishchith-m10@users.noreply.github.com';
const ROOT = path.resolve(__dirname, '..');

function run(cmd) {
  return execSync(cmd, { cwd: ROOT, stdio: 'pipe' }).toString().trim();
}

function getChangedFiles() {
  // status codes: https://git-scm.com/docs/git-status#_short_format
  const out = run('git status --porcelain');
  if (!out) return [];
  return out
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      const toks = trimmed.split(/\s+/);
      const code = toks[0];
      const path = toks.slice(1).join(' ');
      return { code, path, line };
    })
    .filter((r) => r.path && !r.path.startsWith('.git'))
    .filter((r) => !/node_modules|\.next|dist\//.test(r.path));
}

function scanForSecrets(content) {
  const patterns = [
    { name: 'RSA PRIVATE KEY', re: /-----BEGIN[\s\S]*PRIVATE KEY-----/g },
    { name: 'Likely Token', re: /(?<![A-Za-z0-9])[A-Za-z0-9-_]{20,}(?!=)/g },
    { name: 'Slack token', re: /xox[baprs]-[A-Za-z0-9-]+/g },
  ];
  const matches = patterns.flatMap((p) => (content.match(p.re) || []).map((m) => ({ type: p.name, match: m })));
  return matches;
}

function getStagedContent(filePath) {
  // If file is newly added or modified and staged, show :"filePath" else read FS
  try {
    return run(`git show :"${filePath.replace(/"/g, '\\"')}"`);
  } catch (err) {
    try {
      return fs.readFileSync(path.join(ROOT, filePath), 'utf8');
    } catch (e) {
      return '';
    }
  }
}

async function main() {
  console.log(`Dry run: ${DRY_RUN}\n`);

  const currentBranch = run('git branch --show-current');
  if (currentBranch !== 'main') {
    console.error('Please switch to the `main` branch before running this script. Current branch:', currentBranch);
    process.exit(1);
  }

  const files = getChangedFiles();
  if (files.length === 0) {
    console.log('No changes to commit.');
    return;
  }

  console.log(`Found ${files.length} changed files:`);
  files.forEach((f, idx) => console.log(`${idx + 1}. ${f.line}`));

  const planned = [];
  for (const f of files) {
    // Skip deleted files
    if (/^ D/.test(f.code)) {
      planned.push({ file: f.path, action: 'deleted', reason: 'deleted file, skipping commit' });
      continue;
    }

    // Stage file (this leaves other files untouched)
    run(`git add -- "${f.path.replace(/"/g, '\\"')}"`);

    const staged = getStagedContent(f.path);

    const secrets = scanForSecrets(staged);
    if (secrets.length > 0) {
      planned.push({ file: f.path, action: 'skipped', reason: 'secret-like content detected', secrets: secrets.slice(0, 3) });
      // Unstage to be safe
      run(`git reset -- "${f.path.replace(/"/g, '\\"')}"`);
      continue;
    }

    // Build a professional commit message
    const shortPath = f.path.replace(/^src\//, '');
    const commitMessage = `chore: apply automated fixes to ${shortPath}`;

    planned.push({ file: f.path, action: 'commit', commitMessage });

    // If not dry-run, perform the commit
    if (!DRY_RUN) {
      try {
        // Use explicit author metadata to attribute commits to your GitHub account
        run(`git -c user.name="${GIT_AUTHOR_NAME}" -c user.email="${GIT_AUTHOR_EMAIL}" commit --only "${f.path.replace(/"/g, '\\"')}" -m "${commitMessage}"`);
        console.log(`Committed ${f.path}`);
      } catch (err) {
        console.error(`Failed to commit ${f.path}:`, err.message || err);
        planned.push({ file: f.path, action: 'commit-failed', reason: err.message || String(err) });
      }
    }
  }

  console.log('\nSummary of planned actions:');
  planned.forEach((p, i) => {
    if (p.action === 'commit') {
      console.log(`${i + 1}. Commit: ${p.file} -> "${p.commitMessage}"`);
    } else {
      console.log(`${i + 1}. ${p.action.toUpperCase()}: ${p.file} ${p.reason ? `(${p.reason})` : ''}`);
      if (p.secrets) {
        console.log('   Detected potential secrets:');
        p.secrets.forEach((s) => console.log(`     - ${s.type}: ${s.match.slice(0, 120).replace(/\s+/g, ' ')}${s.match.length > 120 ? '...' : ''}`));
      }
    }
  });

  const commitCount = planned.filter((p) => p.action === 'commit').length;

  if (!DRY_RUN && commitCount > 0) {
    console.log('\nPushing commits to origin/main...');
    try {
      run('git push origin main');
      console.log('Push successful.');
    } catch (err) {
      console.error('Push failed:', err.message || err);
      process.exit(1);
    }
  } else if (DRY_RUN) {
    console.log('\nDry run complete. To apply commits, re-run with --confirm flag.');
  } else {
    console.log('\nNo commits performed.');
  }
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
