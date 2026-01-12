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
  const lastLine = lines[lines.length - 1];
  if (lastLine.startsWith("// ") || lastLine.startsWith("<!-- ")) {
    lines.pop();
    // Also remove empty lines at end
    while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
      lines.pop();
    }
    content = lines.join("\n") + "\n";
  }
  // Also remove inline comments in markdown
  content = content.replace(/\n<!-- .* -->\n/g, "\n");
  fs.writeFileSync(filePath, content, "utf8");
  console.log(`Removed comment from ${filePath}`);
}

// Get list of modified files
const modifiedFiles = run("git diff --name-only HEAD~67").split("\n").filter(f => f);

for (const file of modifiedFiles) {
  if (fs.existsSync(path.join(ROOT, file))) {
    removeLastComment(path.join(ROOT, file));
  }
}

console.log("Done removing comments.");