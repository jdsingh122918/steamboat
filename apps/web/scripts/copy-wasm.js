#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const CRATES_DIR = path.resolve(__dirname, '../../../crates');
const PUBLIC_WASM_DIR = path.resolve(__dirname, '../public/wasm');

const PACKAGES = ['expense-optimizer', 'finance-core', 'media-processor'];

// Ensure public/wasm directory exists
if (!fs.existsSync(PUBLIC_WASM_DIR)) {
  fs.mkdirSync(PUBLIC_WASM_DIR, { recursive: true });
}

let copied = 0;

for (const pkg of PACKAGES) {
  const pkgDir = path.join(CRATES_DIR, pkg, 'pkg');

  if (!fs.existsSync(pkgDir)) {
    console.warn(`Warning: ${pkg}/pkg not found. Run build-wasm.sh first.`);
    continue;
  }

  const files = fs.readdirSync(pkgDir);

  for (const file of files) {
    if (file.endsWith('.wasm')) {
      const src = path.join(pkgDir, file);
      const dest = path.join(PUBLIC_WASM_DIR, file);
      fs.copyFileSync(src, dest);
      console.log(`Copied: ${file}`);
      copied++;
    }
  }
}

if (copied > 0) {
  console.log(`\n${copied} WASM files copied to public/wasm/`);
} else {
  console.log('\nNo WASM files found. Run ./scripts/build-wasm.sh first.');
}
