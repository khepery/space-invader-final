#!/usr/bin/env node
'use strict';

/**
 * Asset verification tests — ensure all referenced assets exist on disk,
 * all image and audio files are reasonable sizes, and no orphan references.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const EXPECTED_IMAGES = [
  'asteroid.png', 'enemyShip.png', 'explosion.png', 'miniBoss.png',
  'playerShip.png', 'powerup.png', 'shootingStar.png', 'specialEnemyShip.png'
];

const EXPECTED_AUDIO = [
  'background.mp3', 'correct.mp3', 'explosion.mp3', 'gameover.mp3',
  'powerup.mp3', 'quiz.mp3', 'shoot.mp3', 'wrong.mp3'
];

const EXPECTED_FONTS = [
  'fonts/press-start-2p-latin-400-normal.woff2',
  'fonts/orbitron-latin-400-normal.woff2',
  'fonts/orbitron-latin-700-normal.woff2',
  'fonts/orbitron-latin-900-normal.woff2'
];

describe('Asset existence', () => {
  for (const img of EXPECTED_IMAGES) {
    it(`image file exists: ${img}`, () => {
      assert.ok(fs.existsSync(path.join(ROOT, img)), `Missing image: ${img}`);
    });
  }

  for (const audio of EXPECTED_AUDIO) {
    it(`audio file exists: ${audio}`, () => {
      assert.ok(fs.existsSync(path.join(ROOT, audio)), `Missing audio: ${audio}`);
    });
  }

  for (const font of EXPECTED_FONTS) {
    it(`font file exists: ${font}`, () => {
      assert.ok(fs.existsSync(path.join(ROOT, font)), `Missing font: ${font}`);
    });
  }
});

describe('Asset sizes', () => {
  for (const img of EXPECTED_IMAGES) {
    it(`${img} is under 200 KB (optimized)`, () => {
      const size = fs.statSync(path.join(ROOT, img)).size;
      assert.ok(size < 200 * 1024, `${img} is ${(size / 1024).toFixed(1)} KB — expected under 200 KB`);
    });

    it(`${img} is not empty`, () => {
      const size = fs.statSync(path.join(ROOT, img)).size;
      assert.ok(size > 100, `${img} is suspiciously small (${size} bytes)`);
    });
  }

  for (const audio of EXPECTED_AUDIO) {
    it(`${audio} is not empty`, () => {
      const size = fs.statSync(path.join(ROOT, audio)).size;
      assert.ok(size > 100, `${audio} is suspiciously small (${size} bytes)`);
    });
  }
});

describe('Asset references in source code', () => {
  const gameJs = fs.readFileSync(path.join(ROOT, 'game.js'), 'utf8');
  const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

  it('all PNG images are referenced in game.js loadImage calls', () => {
    for (const img of EXPECTED_IMAGES) {
      assert.ok(gameJs.includes(`'${img}'`), `${img} not referenced in game.js`);
    }
  });

  it('all MP3 audio files are referenced in index.html', () => {
    for (const audio of EXPECTED_AUDIO) {
      assert.ok(indexHtml.includes(audio), `${audio} not referenced in index.html`);
    }
  });

  it('no references to non-existent PNG files in game.js', () => {
    const pngRefs = gameJs.match(/loadImage\(\w+,\s*'([^']+\.png)'/g) || [];
    for (const ref of pngRefs) {
      const filename = ref.match(/'([^']+\.png)'/)[1];
      assert.ok(fs.existsSync(path.join(ROOT, filename)), `game.js references non-existent image: ${filename}`);
    }
  });
});
