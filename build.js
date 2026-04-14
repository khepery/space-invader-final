#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const INPUT = path.join(ROOT, 'index.html');
const OUTPUT = path.join(ROOT, 'Ultra_Pro_Space_Invaders_RELEASE.html');

// ── helpers ──────────────────────────────────────────────────────────────────

function toBase64(filePath) {
  return fs.readFileSync(filePath).toString('base64');
}

// ── main ─────────────────────────────────────────────────────────────────────

async function build() {
  console.log('Reading index.html…');
  let html = fs.readFileSync(INPUT, 'utf8');

  // 1. Embed fonts for offline use ─────────────────────────────────────────────
  //    Replace self-hosted @font-face rules with Base64-embedded woff2 files
  //    and remove the CDN fallback <link> tag entirely.
  const fontFiles = {
    'press-start-2p-latin-400-normal': { family: 'Press Start 2P', weight: 400 },
    'orbitron-latin-400-normal':       { family: 'Orbitron',        weight: 400 },
    'orbitron-latin-700-normal':       { family: 'Orbitron',        weight: 700 },
    'orbitron-latin-900-normal':       { family: 'Orbitron',        weight: 900 }
  };

  let fontFaces = '/* Embedded fonts for offline single-file release */\n';
  for (const [filename, meta] of Object.entries(fontFiles)) {
    const fontPath = path.join(ROOT, 'fonts', filename + '.woff2');
    if (fs.existsSync(fontPath)) {
      const b64 = toBase64(fontPath);
      fontFaces += `@font-face {\n  font-family: '${meta.family}';\n  font-style: normal;\n  font-weight: ${meta.weight};\n  font-display: swap;\n  src: url('data:font/woff2;base64,${b64}') format('woff2');\n}\n`;
      console.log(`  ✓ Embedded font: ${filename}.woff2`);
    } else {
      // Fall back to local() if woff2 file not available
      fontFaces += `@font-face {\n  font-family: '${meta.family}';\n  src: local('${meta.family}');\n  font-style: normal;\n  font-weight: ${meta.weight};\n}\n`;
      console.warn(`  ⚠ Font file not found, using local() fallback: ${filename}.woff2`);
    }
  }

  // Remove the self-hosted font <style> block (everything between the comment and closing </style>)
  html = html.replace(
    /    <!-- Self-hosted fonts.*?<\/style>\n/s,
    `    <style>\n${fontFaces}</style>\n`
  );

  // Remove the CDN fallback <link> tag
  html = html.replace(
    /    <!-- CDN fallback:.*?\n.*?rel="stylesheet">\n/s,
    ''
  );
  console.log('  ✓ Fonts embedded and CDN link removed for offline use');

  // 2. Embed audio files ──────────────────────────────────────────────────────
  html = html.replace(/<audio([^>]*)\ssrc="([^"]+\.mp3)"([^>]*)>/g, (match, before, filename, after) => {
    const filePath = path.join(ROOT, filename);
    if (!fs.existsSync(filePath)) {
      console.warn(`  ⚠ Audio file not found, skipping: ${filename}`);
      return match;
    }
    const b64 = toBase64(filePath);
    console.log(`  ✓ Embedded audio: ${filename}`);
    return `<audio${before} src="data:audio/mpeg;base64,${b64}"${after}>`;
  });

  // 3. Embed image files ──────────────────────────────────────────────────────
  html = html.replace(/loadImage\((\w+),\s*'([^']+\.png)',\s*('[^']*')\)/g, (match, varName, filename, fallback) => {
    const filePath = path.join(ROOT, filename);
    if (!fs.existsSync(filePath)) {
      console.warn(`  ⚠ Image file not found, skipping: ${filename}`);
      return match;
    }
    const b64 = toBase64(filePath);
    console.log(`  ✓ Embedded image: ${filename}`);
    return `loadImage(${varName}, 'data:image/png;base64,${b64}', ${fallback})`;
  });

  // 4. Write output ───────────────────────────────────────────────────────────
  fs.writeFileSync(OUTPUT, html, 'utf8');
  const sizeMB = (fs.statSync(OUTPUT).size / 1024 / 1024).toFixed(2);
  console.log(`\nBuild complete! Your single-file game is ready.`);
  console.log(`Output: ${OUTPUT} (${sizeMB} MB)`);
}

build().catch((err) => {
  console.error('Build failed:', err.message);
  process.exit(1);
});
