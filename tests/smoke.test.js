// Test plan 17: smoke-test the built index.html in headless Chrome.
// Every existing screen renders without errors, legacy data loads unchanged, and the engine is available.
// Skipped when Chrome is not installed (set CHROME=/path/to/chrome to override).
const test = require('node:test');
const assert = require('node:assert/strict');
const { runInChrome, hasChrome } = require('./helpers/chrome.js');

const LEGACY = JSON.stringify({ stars: 33, coins: 21, level: 1, caption: 'full', capHide: true, wear: { head: 'crown', face: null, hand: null, bg: null } });

test('17. all existing screens render, legacy data loads, engine is available', { skip: !hasChrome && 'Chrome not found' }, () => {
  const { result, errors } = runInChrome(`
    const out = {};
    out.engineLoaded = typeof LearningEngine === 'object' && typeof LearningCatalog === 'object' && typeof learn === 'object';
    out.legacy = { stars: state.stars, coins: state.coins, level: state.level, wear: state.wear.head, caption: state.caption };
    const screens = {
      home: () => go('home'), quiz: () => startQuiz('animals'), balloon: () => startBalloon(), speak: () => startSpeak(),
      mole: () => startMole(), memory: () => startMemory(), shopgame: () => startShop(), spell: () => startSpell(),
      cards: () => go('cards', { cat: 'food', i: 0 }), abc: () => go('abc', { sel: 0 }), pet: () => openPet(),
      closet: () => go('closet', { slot: 'head', sel: null }), stickers: () => go('stickers'), parent: () => go('parent')
    };
    out.screens = {};
    for (const [name, open] of Object.entries(screens)) {
      try { open(); out.screens[name] = view.name + ':' + (document.querySelector('main').children.length > 0); }
      catch (e) { out.screens[name] = 'ERROR ' + e.message; }
    }
    go('home');
    out.legacyAfter = JSON.parse(localStorage.getItem('eigo-asobi-v1'));
    window.__done(out);`, { legacy: LEGACY });
  assert.deepEqual(errors, []);
  assert.equal(result.engineLoaded, true);
  assert.deepEqual(result.legacy, { stars: 33, coins: 21, level: 1, wear: 'crown', caption: 'full' });
  assert.equal(result.legacyAfter.stars, 33);
  for (const [name, r] of Object.entries(result.screens)) assert.match(r, /:true$/, `${name}: ${r}`);
});
