#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require('child_process');
const net = require('net');
const path = require('path');

const startPort = 3000;
const endPort = 3010;
const cwd = path.join(__dirname, '..', 'dashboard');

function isPortFree(port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', () => resolve(false))
      .once('listening', () => tester.close(() => resolve(true)))
      .listen(port);
  });
}

(async () => {
  for (let p = startPort; p <= endPort; p++) {
    if (await isPortFree(p)) {
      console.log(`\n✨ Starting Next.js on http://localhost:${p}\n`);
      
      // Open browser on macOS
      spawn('open', [`http://localhost:${p}`], { 
        stdio: 'ignore',
        detached: true 
      }).unref();
      
      // Start Next dev in dashboard folder
      const child = spawn('npx', ['next', 'dev', '-p', `${p}`], { 
        stdio: 'inherit', 
        cwd 
      });
      
      child.on('exit', (code) => process.exit(code || 0));
      
      // Handle signals
      process.on('SIGINT', () => {
        child.kill('SIGINT');
        process.exit(0);
      });
      
      return;
    }
  }
  console.error(`❌ No free port between ${startPort} and ${endPort}`);
  process.exit(1);
})();
