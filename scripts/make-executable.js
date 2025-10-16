#!/usr/bin/env node
/**
 * Cross-platform script to make a file executable
 * Usage: node scripts/make-executable.js <file-path>
 */

const fs = require('fs');
const path = require('path');

// Get file path from command line arguments
const filePath = process.argv[2];

if (!filePath) {
  console.error('❌ Error: No file path provided');
  console.error('Usage: node scripts/make-executable.js <file-path>');
  process.exit(1);
}

const absolutePath = path.resolve(filePath);

// Check if file exists
if (!fs.existsSync(absolutePath)) {
  console.error(`❌ Error: File not found: ${absolutePath}`);
  process.exit(1);
}

try {
  // Make file executable on Unix-like systems (chmod +x)
  // On Windows, this is a no-op as .js files are associated with Node.js
  if (process.platform !== 'win32') {
    const stats = fs.statSync(absolutePath);
    // Add execute permission for owner, group, and others (0o111)
    fs.chmodSync(absolutePath, stats.mode | 0o111);
    console.log(`✅ Made executable: ${filePath}`);
  } else {
    console.log(`ℹ️  Skipping chmod on Windows: ${filePath}`);
  }
} catch (error) {
  console.error(`❌ Error making file executable: ${error.message}`);
  process.exit(1);
}
