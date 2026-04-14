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

  // 0. Inline external CSS and JS files ────────────────────────────────────────
  //    The source code uses separate files for maintainability, but the release
  //    must be a single self-contained HTML file.
  const cssPath = path.join(ROOT, 'styles.css');
  if (fs.existsSync(cssPath)) {
    const css = fs.readFileSync(cssPath, 'utf8');
    html = html.replace(
      /    <link rel="stylesheet" href="\.\/styles\.css">/,
      `    <style>\n${css.replace(/^/gm, '        ')}\n    </style>`
    );
    console.log('  ✓ Inlined styles.css');
  }

  const jsPath = path.join(ROOT, 'game.js');
  if (fs.existsSync(jsPath)) {
    const js = fs.readFileSync(jsPath, 'utf8');
    html = html.replace(
      /    <script src="\.\/game\.js"><\/script>/,
      `    <script>\n${js}\n    </script>`
    );
    console.log('  ✓ Inlined game.js');
  }

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

  // Remove the self-hosted font <style> block and CDN fallback <link>
  // Note: the font block regex may also capture the CDN link depending on whitespace;
  // we handle both cases gracefully.
  const beforeFontReplace = html;
  html = html.replace(
    /    <!-- Self-hosted fonts.*?<\/style>\s*\n/s,
    `    <style>\n${fontFaces}</style>\n`
  );
  if (html === beforeFontReplace) {
    console.warn('  ⚠ Self-hosted font block not found — fonts may already be processed or HTML structure changed');
  }

  // Remove CDN fallback <link> tag if it wasn't already captured above
  if (html.includes('fonts.googleapis.com')) {
    html = html.replace(
      /    <!-- CDN fallback:.*?\n.*?rel="stylesheet">\n/s,
      ''
    );
  }
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
