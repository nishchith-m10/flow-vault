#!/usr/bin/env node
/*
 * remove_comments.js
 *
 * Remove the added comments from files.
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

function run(cmd) {
  return execSync(cmd, { stdio: "pipe", cwd: ROOT }).toString().trim();
}

function removeLastComment(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  // Remove lines that start with "// " or "<!-- "
  const filtered = lines.filter(line => !line.startsWith("// ") && !line.startsWith("<!-- "));
  content = filtered.join("\n");
  // Remove trailing empty lines
  content = content.trimEnd() + "\n";
  fs.writeFileSync(filePath, content, "utf8");
  console.log(`Removed comments from ${filePath}`);
}

const modifiedFiles = run("git diff --name-only HEAD~67").split("\n").filter(f => f);

for (const file of modifiedFiles) {
  if (fs.existsSync(path.join(ROOT, file))) {
    removeLastComment(path.join(ROOT, file));
  }
}

console.log("Done removing comments.");
