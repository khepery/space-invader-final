#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = __dirname;
const INPUT = path.join(ROOT, 'index.html');
const OUTPUT = path.join(ROOT, 'Ultra_Pro_Space_Invaders_RELEASE.html');
const XLSX_PATH = path.join(ROOT, 'xlsx.full.min.js');
const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';

// ── helpers ──────────────────────────────────────────────────────────────────

function toBase64(filePath) {
  return fs.readFileSync(filePath).toString('base64');
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// ── main ─────────────────────────────────────────────────────────────────────

async function build() {
  console.log('Reading index.html…');
  let html = fs.readFileSync(INPUT, 'utf8');

  // 1. Embed XLSX library ─────────────────────────────────────────────────────
  if (!fs.existsSync(XLSX_PATH)) {
    console.log('xlsx.full.min.js not found locally — downloading…');
    try {
      const src = await fetchText(XLSX_URL);
      fs.writeFileSync(XLSX_PATH, src, 'utf8');
      console.log('  Downloaded xlsx.full.min.js');
    } catch (err) {
      console.warn(`  ⚠ Could not download xlsx.full.min.js (${err.message}). CDN reference kept.`);
    }
  }
  if (fs.existsSync(XLSX_PATH)) {
    let xlsxSrc = fs.readFileSync(XLSX_PATH, 'utf8');
    xlsxSrc = xlsxSrc.replace(/<\/(script)/gi, '<\\/$1');
    html = html.replace(
      '<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>',
      `<script>${xlsxSrc}</script>`
    );
    console.log('  ✓ XLSX library embedded');
  }

  // 2. Embed Google Fonts (offline fallback with system fonts) ────────────────
  //    We replace the <link> tag with a <style> block that uses system-font
  //    stacks matching the visual intent of Press Start 2P and Orbitron.
  //    If you have the .woff2 files available locally, add them here as Base64.
  const fontStyle = `<style>
/* Offline font fallbacks replacing Google Fonts CDN */
@font-face {
  font-family: 'Press Start 2P';
  src: local('Press Start 2P'), local('PressStart2P-Regular');
  font-style: normal;
  font-weight: 400;
}
@font-face {
  font-family: 'Orbitron';
  src: local('Orbitron'), local('Orbitron-Regular');
  font-style: normal;
  font-weight: 400;
}
@font-face {
  font-family: 'Orbitron';
  src: local('Orbitron Bold'), local('Orbitron-Bold');
  font-style: normal;
  font-weight: 700;
}
@font-face {
  font-family: 'Orbitron';
  src: local('Orbitron Black'), local('Orbitron-Black');
  font-style: normal;
  font-weight: 900;
}
</style>`;

  html = html.replace(
    '<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Orbitron:wght@400;700;900&display=swap" rel="stylesheet">',
    fontStyle
  );
  console.log('  ✓ Google Fonts replaced with offline fallbacks');

  // 3. Embed audio files ──────────────────────────────────────────────────────
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

  // 4. Embed image files ──────────────────────────────────────────────────────
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

  // 5. Write output ───────────────────────────────────────────────────────────
  fs.writeFileSync(OUTPUT, html, 'utf8');
  const sizeMB = (fs.statSync(OUTPUT).size / 1024 / 1024).toFixed(2);
  console.log(`\nBuild complete! Your single-file game is ready.`);
  console.log(`Output: ${OUTPUT} (${sizeMB} MB)`);
}

build().catch((err) => {
  console.error('Build failed:', err.message);
  process.exit(1);
});
