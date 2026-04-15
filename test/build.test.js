#!/usr/bin/env node
'use strict';

/**
 * Build pipeline tests — verify that `node build.js` produces a valid
 * single-file release HTML with all assets inlined.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'Ultra_Pro_Space_Invaders_RELEASE.html');

describe('Build pipeline', () => {
  let releaseHtml;

  before(() => {
    // Clean previous output
    if (fs.existsSync(OUTPUT)) fs.unlinkSync(OUTPUT);
    // Run the build
    execSync('node build.js', { cwd: ROOT, stdio: 'pipe' });
    releaseHtml = fs.readFileSync(OUTPUT, 'utf8');
  });

  after(() => {
    // Clean up release file
    if (fs.existsSync(OUTPUT)) fs.unlinkSync(OUTPUT);
  });

  it('should produce a release HTML file', () => {
    assert.ok(fs.existsSync(OUTPUT) || releaseHtml, 'Release file was not created');
  });

  it('should produce a file larger than 1 MB (assets inlined)', () => {
    const sizeMB = Buffer.byteLength(releaseHtml) / (1024 * 1024);
    assert.ok(sizeMB > 1, `Release file is only ${sizeMB.toFixed(2)} MB — assets may not be inlined`);
  });

  it('should inline styles.css (no external CSS link)', () => {
    assert.ok(!releaseHtml.includes('href="./styles.css"'), 'External styles.css link still present');
    assert.ok(releaseHtml.includes('<style>'), 'No inline <style> block found');
  });

  it('should inline game.js (no external JS link)', () => {
    assert.ok(!releaseHtml.includes('src="./game.js"'), 'External game.js link still present');
  });

  it('should embed all audio files as base64 data URIs', () => {
    const audioFiles = ['shoot.mp3', 'explosion.mp3', 'powerup.mp3', 'quiz.mp3',
                        'gameover.mp3', 'background.mp3', 'correct.mp3', 'wrong.mp3'];
    for (const file of audioFiles) {
      assert.ok(!releaseHtml.includes(`src="${file}"`), `Audio file ${file} not inlined`);
    }
    // Check that data URIs are present
    const dataAudioCount = (releaseHtml.match(/data:audio\/mpeg;base64,/g) || []).length;
    assert.ok(dataAudioCount >= 8, `Only ${dataAudioCount} audio data URIs found, expected at least 8`);
  });

  it('should embed all image files as base64 data URIs', () => {
    const imageFiles = ['playerShip.png', 'enemyShip.png', 'specialEnemyShip.png',
                        'powerup.png', 'asteroid.png', 'explosion.png',
                        'shootingStar.png', 'miniBoss.png'];
    for (const file of imageFiles) {
      assert.ok(
        !releaseHtml.includes(`'${file}'`) || releaseHtml.includes('data:image/png;base64,'),
        `Image file ${file} may not be inlined`
      );
    }
    const dataImageCount = (releaseHtml.match(/data:image\/png;base64,/g) || []).length;
    assert.ok(dataImageCount >= 8, `Only ${dataImageCount} image data URIs found, expected at least 8`);
  });

  it('should embed all fonts as base64 data URIs', () => {
    const fontCount = (releaseHtml.match(/data:font\/woff2;base64,/g) || []).length;
    assert.ok(fontCount >= 4, `Only ${fontCount} font data URIs found, expected at least 4`);
  });

  it('should not reference Google Fonts CDN', () => {
    assert.ok(!releaseHtml.includes('fonts.googleapis.com'), 'Google Fonts CDN link still present');
  });

  it('should be valid HTML with doctype, head, and body', () => {
    assert.ok(releaseHtml.includes('<!DOCTYPE html>'), 'Missing DOCTYPE');
    assert.ok(releaseHtml.includes('<head>'), 'Missing <head>');
    assert.ok(releaseHtml.includes('</body>'), 'Missing </body>');
  });
});
