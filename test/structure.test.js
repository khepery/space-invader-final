#!/usr/bin/env node
'use strict';

/**
 * HTML and JavaScript structural tests — verify the source files have the
 * expected structure, required DOM elements, and valid JS syntax.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

describe('index.html structure', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

  it('has DOCTYPE declaration', () => {
    assert.ok(html.includes('<!DOCTYPE html>'), 'Missing DOCTYPE');
  });

  it('has charset meta tag', () => {
    assert.ok(html.includes('charset="UTF-8"') || html.includes("charset='UTF-8'"),
      'Missing UTF-8 charset declaration');
  });

  it('has viewport meta tag', () => {
    assert.ok(html.includes('viewport'), 'Missing viewport meta tag');
  });

  it('links to styles.css', () => {
    assert.ok(html.includes('styles.css'), 'Missing styles.css reference');
  });

  it('links to game.js', () => {
    assert.ok(html.includes('game.js'), 'Missing game.js reference');
  });

  // Verify critical DOM elements exist
  const requiredElements = [
    'gameCanvas', 'introScreen', 'settingsScreen', 'gameOverScreen',
    'quizContainer', 'pauseScreen', 'helpScreen', 'healthBar',
    'scoreDisplay', 'waveDisplay', 'hudTopLeft', 'hudTopRight',
    'controlButtons', 'hudBottomRight', 'warningIndicator',
    'missionConfigGrid', 'questionList', 'leaderboardModal',
    'leaderboardTable', 'powerupMessage'
  ];

  for (const id of requiredElements) {
    it(`has required element #${id}`, () => {
      assert.ok(html.includes(`id="${id}"`), `Missing element with id="${id}"`);
    });
  }

  // Audio elements
  const requiredAudio = ['shootSound', 'explosionSound', 'powerupSound', 'quizSound',
                          'gameOverSound', 'backgroundMusic', 'correctSound', 'wrongSound'];

  for (const id of requiredAudio) {
    it(`has audio element #${id}`, () => {
      assert.ok(html.includes(`id="${id}"`), `Missing audio element with id="${id}"`);
    });
  }

  it('warningIndicator has inline display:none to prevent flash', () => {
    const match = html.match(/id="warningIndicator"[^>]*/);
    assert.ok(match && match[0].includes('display:none'),
      'warningIndicator should have inline style="display:none" to prevent flash on load');
  });
});

describe('login.html structure', () => {
  const html = fs.readFileSync(path.join(ROOT, 'login.html'), 'utf8');

  it('has DOCTYPE declaration', () => {
    assert.ok(html.includes('<!DOCTYPE html>'), 'Missing DOCTYPE');
  });

  it('references config.js for access code', () => {
    assert.ok(html.includes('config.js'), 'Missing config.js reference');
  });
});

describe('config.js structure', () => {
  const configSrc = fs.readFileSync(path.join(ROOT, 'config.js'), 'utf8');

  it('has valid JavaScript syntax', () => {
    assert.doesNotThrow(() => new vm.Script(configSrc), 'config.js has syntax errors');
  });

  it('defines window.SITE_CONFIG with a code property', () => {
    assert.ok(configSrc.includes('SITE_CONFIG'), 'Missing SITE_CONFIG');
    assert.ok(configSrc.includes('code:') || configSrc.includes('code :'), 'Missing code property');
  });
});

describe('game.js syntax and structure', () => {
  const js = fs.readFileSync(path.join(ROOT, 'game.js'), 'utf8');

  it('has valid JavaScript syntax (parseable)', () => {
    assert.doesNotThrow(() => {
      new vm.Script(`(function(document,window,navigator,localStorage,requestAnimationFrame,cancelAnimationFrame,Image,Audio,confirm,alert,setTimeout,clearTimeout,setInterval,clearInterval){${js}})`, {
        filename: 'game.js'
      });
    }, 'game.js has syntax errors');
  });

  // Key functions that must exist
  const requiredFunctions = [
    'showPowerupMessage', 'showIntroScreen', 'resetGameState',
    'applyDifficultySettings', 'initEnemies', 'gameLoop',
    'handleQuizAnswer', 'getRandomQuestion', 'checkWaveCompletion',
    'activatePowerup', 'handleGameOver', 'toggleSound', 'togglePause',
    'safeLocalStorageGet', 'safeLocalStorageSet', 'loadGameImages',
    'displayQuestionList', 'updateQuestionStatusBadge',
    'getLeaderboard', 'saveLeaderboard', 'renderLeaderboard'
  ];

  for (const fn of requiredFunctions) {
    it(`defines function ${fn}()`, () => {
      assert.ok(js.includes(`function ${fn}(`), `Missing function ${fn}()`);
    });
  }

  it('showPowerupMessage has pauseGame parameter', () => {
    assert.ok(js.includes('showPowerupMessage(message, callback, pauseGame'),
      'showPowerupMessage should have a pauseGame parameter');
  });

  it('uses safeLocalStorageGet/Set wrappers (not raw localStorage)', () => {
    assert.ok(js.includes('function safeLocalStorageGet'), 'Missing safeLocalStorageGet');
    assert.ok(js.includes('function safeLocalStorageSet'), 'Missing safeLocalStorageSet');
  });

  it('pause condition uses !== "block" (not === "none")', () => {
    assert.ok(js.includes("quizContainer.style.display !== 'block'"),
      'Pause condition should check !== "block", not === "none"');
  });

  it('shield bar progress divides by 15000', () => {
    assert.ok(js.includes('/ 15000'), 'Shield bar progress should divide by 15000');
  });

  it('sound button uses emoji-only (no text labels)', () => {
    assert.ok(!js.includes("'🔊 Sound'"), 'Sound button should not include text label');
    assert.ok(!js.includes("'🔇 Muted'"), 'Muted button should not include text label');
  });

  it('import file picker accepts xlsx and csv formats', () => {
    assert.ok(js.includes('.xlsx') && js.includes('.csv'),
      'File import should accept .xlsx and .csv formats');
  });

  it('cancel question form clears all fields', () => {
    const cancelIdx = js.indexOf("cancelNewQuestionBtn.addEventListener");
    const cancelBlock = js.substring(cancelIdx, cancelIdx + 500);
    assert.ok(cancelBlock.includes("newQuestionText.value = ''"),
      'Cancel handler should clear the question text field');
    assert.ok(cancelBlock.includes("correctAnswer.value"),
      'Cancel handler should reset correctAnswer');
  });

  it('correct answer reveal exists for wrong answers', () => {
    assert.ok(js.includes('Correct answer:'), 'Should show correct answer text on wrong answers');
  });

  it('defines difficulty scaling variables', () => {
    assert.ok(js.includes('enemyHpMultiplier'), 'Missing enemyHpMultiplier');
    assert.ok(js.includes('playerBaseDamage'), 'Missing playerBaseDamage');
  });

  it('defines difficultyColors constant', () => {
    assert.ok(js.includes('difficultyColors'), 'Missing difficultyColors');
  });

  it('leaderboard functions exist', () => {
    assert.ok(js.includes('function getLeaderboard'), 'Missing getLeaderboard');
    assert.ok(js.includes('function renderLeaderboard'), 'Missing renderLeaderboard');
    assert.ok(js.includes('function addLeaderboardEntry'), 'Missing addLeaderboardEntry');
  });
});

describe('styles.css structure', () => {
  const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');

  it('is not empty', () => {
    assert.ok(css.length > 100, 'styles.css is suspiciously small');
  });

  it('has game canvas styles', () => {
    assert.ok(css.includes('#gameCanvas'), 'Missing #gameCanvas styles');
  });

  it('has HUD element styles', () => {
    assert.ok(css.includes('#hudTopLeft'), 'Missing #hudTopLeft styles');
    assert.ok(css.includes('#hudTopRight'), 'Missing #hudTopRight styles');
  });

  it('has control button styles', () => {
    assert.ok(css.includes('.control-button'), 'Missing .control-button styles');
  });

  it('has warningIndicator styles with display: none', () => {
    assert.ok(css.includes('#warningIndicator'), 'Missing #warningIndicator styles');
  });

  it('has responsive media queries', () => {
    assert.ok(css.includes('@media'), 'Missing @media queries for responsive design');
  });
});
