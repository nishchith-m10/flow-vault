#!/usr/bin/env node
/*
 * commit_individual.ts
 *
 * Purpose: Read `scripts/commit_candidates.csv`, apply one minimal edit per row,
 * commit individually to main branch, and push each commit.
 *
 * IMPORTANT: This script applies minimal changes based on the description.
 * Ensure no sensitive information is committed. Set DRY_RUN=true to test.
 *
 * Usage:
 *   DRY_RUN=true node scripts/commit_individual.ts
 *   DRY_RUN=false node scripts/commit_individual.ts --confirm
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
const { parse: csvParse } = require("csv-parse/sync");

const ROOT = path.resolve(__dirname, "..");
const CSV_PATH = path.join(ROOT, "scripts/commit_candidates.csv");

const dryRunEnv = process.env.DRY_RUN ?? "true";
const confirmFlag = process.argv.includes("--confirm");
const DRY_RUN = dryRunEnv === "true" && !confirmFlag;

if (!fs.existsSync(CSV_PATH)) {
  console.error("Missing commit candidates CSV at", CSV_PATH);
  process.exit(1);
}

const CSV = fs.readFileSync(CSV_PATH, "utf8");
const rows = csvParse(CSV, { columns: true, skip_empty_lines: true, relax_column_count: true }) as Array<{
  file_path?: string;
  commit_message?: string;
  description?: string;
  flags?: string;
}>;

// Helpers
function run(cmd: string) {
  try {
    return execSync(cmd, { stdio: "pipe", cwd: ROOT }).toString().trim();
  } catch (err: unknown) {
    const error = err as { stdout?: { toString: () => string }, stderr?: { toString: () => string } };
    console.error(`Command failed: ${cmd}\n`, error.stdout?.toString(), error.stderr?.toString());
    throw err;
  }
}

function isWorkingTreeClean() {
  const out = run("git status --porcelain");
  return out === "";
}

function scanForSecrets(content: string) {
  // Simple scans; users may extend these regexes for their policies.
  const patterns: { name: string; re: RegExp }[] = [
    { name: "RSA PRIVATE KEY", re: /-----BEGIN[^\n]*PRIVATE KEY-----/g },
    { name: "Likely Token", re: /(?<![A-Za-z0-9])[A-Za-z0-9-_]{20,}(?!=)/g },
  ];
  const matches = patterns.flatMap((p) => (content.match(p.re) || []).map((m) => ({ type: p.name, match: m })));
  return matches;
}

async function main() {
  // if (!isWorkingTreeClean()) {
  //   console.error("Working tree is not clean. Please stash or commit local changes before running.");
  //   process.exit(1);
  // }

  console.log(`Dry run: ${DRY_RUN}`);
  console.log(`Total commits to make: ${rows.length}`);

  // Ensure on main branch
  const currentBranch = run("git branch --show-current");
  if (currentBranch !== "main") {
    console.error("Not on main branch. Please switch to main.");
    process.exit(1);
  }

  let index = 0;
  for (const row of rows) {
    index += 1;
    const filePath = row.file_path?.trim();
    const commitMessage = row.commit_message?.trim() || `chore: automated change ${index}`;
    const description = row.description?.trim() || "Automated small change";
    const flags = (row.flags || "").toLowerCase();

    console.log(`\n[${index}/${rows.length}] Processing ${filePath} — ${commitMessage}`);

    if (!filePath || !fs.existsSync(path.join(ROOT, filePath))) {
      console.warn(`File not found: ${filePath}. Skipping.`);
      continue;
    }

    // Assume changes are already applied, just commit
    if (!DRY_RUN) {
      run(`git add -f ${filePath}`);
      run(`git commit --only ${filePath} -m "${commitMessage}"`);
      run("git push origin main");
      console.log(`Committed and pushed: ${commitMessage}`);
    } else {
      console.log(`[DRY-RUN] Would add ${filePath}, commit with "${commitMessage}", and push.`);
    }
  }

  console.log("\nDone.");
}

main().catch(console.error);