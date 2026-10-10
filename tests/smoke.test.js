// Test plan 17: smoke-test the built index.html in headless Chrome.
// Every existing screen renders without errors, legacy data loads, and Stage A does not start the engine in the UI.
// Skipped when Chrome is not installed (set CHROME=/path/to/chrome to override).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const PROBE = String.raw`<script>
(function () {
  const errors = [];
  window.addEventListener('error', e => errors.push(String(e.message)));
  const out = {};
  try {
    out.engineLoaded = typeof LearningEngine === 'object' && typeof LearningCatalog === 'object';
    out.learnerKeyBefore = localStorage.getItem('learner-progress-v1');
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
    const mem = new Map();
    const storage = { getItem: k => mem.has(k) ? mem.get(k) : null, setItem: (k, v) => mem.set(k, v), removeItem: k => mem.delete(k) };
    const eng = LearningEngine.createEngine({ storage, catalog: LearningCatalog });
    const r = eng.recordAttempt({ id: 'smoke-1', taskId: 'quiz:animals', canDoIds: ['L1_LI_01'], timestamp: new Date().toISOString(),
      sceneId: 'quiz:animals', itemId: 'dog', promptType: 'where_is', completed: true, verified: true, firstTry: true,
      method: 'action', recognition: 'not_needed', support: 0 });
    out.engineInBrowser = r.ok && r.progress.L1_LI_01.status;
    out.learnerKeyAfter = localStorage.getItem('learner-progress-v1');
    out.legacyAfter = localStorage.getItem('eigo-asobi-v1');
  } catch (e) { errors.push('probe: ' + e.message); }
  out.errors = errors;
  const pre = document.createElement('pre'); pre.id = 'SMOKE'; pre.textContent = JSON.stringify(out);
  document.body.appendChild(pre);
})();
</script>`;

test('17. all existing screens render, legacy data loads, engine is available but not started', { skip: !fs.existsSync(CHROME) && 'Chrome not found' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eigo-smoke-'));
  try {
    const legacy = JSON.stringify({ stars: 33, coins: 21, level: 1, caption: 'full', capHide: true, wear: { head: 'crown', face: null, hand: null, bg: null } });
    const seed = `<script>localStorage.clear(); localStorage.setItem('eigo-asobi-v1', ${JSON.stringify(legacy)});</script>`;
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    // Seed legacy data before the app script runs, probe after it.
    const page = html.replace('<meta charset="utf-8">', '<meta charset="utf-8">' + seed) + PROBE;
    const file = path.join(dir, 'smoke.html');
    fs.writeFileSync(file, page);
    // The seed script clears localStorage first, so the default headless profile is fine (a fresh --user-data-dir makes Chrome linger).
    const dom = execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--virtual-time-budget=3000', '--dump-dom', 'file://' + file],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024, timeout: 60000 });
    const m = /<pre id="SMOKE">([^<]*)<\/pre>/.exec(dom);
    assert.ok(m, 'probe ran');
    const out = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
    assert.deepEqual(out.errors, []);
    assert.equal(out.engineLoaded, true);
    assert.equal(out.engineInBrowser, 'discovering');
    assert.equal(out.learnerKeyBefore, null, 'Stage A does not start the engine in the UI');
    assert.equal(out.learnerKeyAfter, null);
    assert.deepEqual(out.legacy, { stars: 33, coins: 21, level: 1, wear: 'crown', caption: 'full' });
    for (const [name, result] of Object.entries(out.screens)) assert.match(result, /:true$/, `${name}: ${result}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
