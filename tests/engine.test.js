// Unit tests for src/engine.js and src/catalog.js (spec v1.2 test plan).
// Run with Node 22: tools/test.sh
process.env.TZ = 'Asia/Tokyo';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../src/catalog.js');
const E = require('../src/engine.js');

const LEGACY_KEY = 'eigo-asobi-v1';
const LEGACY = JSON.stringify({ stars: 42, coins: 17, level: 2, caption: 'full', capHide: true, showJa: true, mic: 'record',
  learned: { 'animals:dog': 1 }, pet: { day: '', meals: 1, hearts: 3 }, owned: { crown: 1 }, wear: { head: 'crown' } });

function memStorage(init = {}, { quota = Infinity } = {}) {
  const m = new Map(Object.entries(init));
  return {
    m,
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem(k, v) {
      if (k === E.KEY && String(v).length > quota) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; }
      m.set(k, String(v));
    },
    removeItem: k => m.delete(k)
  };
}
function clock(start = '2026-10-01T09:00:00+09:00') {
  let t = new Date(start).getTime();
  const c = () => new Date(t);
  c.set = s => { t = new Date(s).getTime(); };
  c.advance = ms => { t += ms; };
  return c;
}
const MIN = 60000, HOUR = 3600000, DAY = 86400000;
let seq = 0;
function att(o = {}) {
  return { id: `t${++seq}`, taskId: 'quiz:animals', canDoIds: ['L1_LI_01'], sceneId: 'quiz:animals', itemId: 'dog',
    promptType: 'where_is', completed: true, verified: true, firstTry: true, method: 'action', recognition: 'not_needed',
    support: 0, ...o };
}
function setup(opts = {}) {
  const storage = opts.storage || memStorage({ [LEGACY_KEY]: LEGACY, ...(opts.init || {}) });
  const now = opts.now || clock();
  const engine = E.createEngine({ storage, catalog: C, now, config: opts.config });
  const rec = (o = {}) => engine.recordAttempt(att({ timestamp: now().toISOString(), ...o }));
  return { storage, now, engine, rec };
}
// Independent successes that satisfy every mastery condition for L1_LI_01 (2 scenes, 3 successes, 7 days).
function masterL1LI01(env) {
  env.rec({ sceneId: 'quiz:animals', itemId: 'dog' });
  env.now.advance(11 * MIN); env.rec({ sceneId: 'balloon:animals', itemId: 'cat', promptType: 'pop_the', taskId: 'balloon:animals' });
  env.now.advance(DAY); env.rec({ sceneId: 'quiz:animals', itemId: 'bear' });
  env.now.advance(7 * DAY); env.rec({ sceneId: 'quiz:animals', itemId: 'lion' });
}

// ---------- catalog ----------
test('catalog: 22 Can-dos, flags and levels follow the spec', () => {
  assert.equal(C.CAN_DOS.length, 22);
  for (const c of C.CAN_DOS) {
    assert.ok(!c.critical || c.required, `${c.id}: critical must be required`);
    if (c.level <= 2 && (c.skill === 'reading' || c.skill === 'writing')) assert.equal(c.required, false, `${c.id} must not be required`);
  }
  assert.deepEqual(C.CAN_DOS.filter(c => c.level === 1 && c.required).map(c => c.id), ['L1_LI_01', 'L1_LI_02', 'L1_SP_01']);
  assert.deepEqual([...C.ASSESSABLE].sort(), ['L1_LI_01', 'L1_RE_01', 'L2_LI_02']);
  for (const g of Object.values(C.GAMES)) for (const id of g.canDoIds) assert.ok(C.BY_ID[id]);
});

// ---------- 1. legacy data ----------
test('1. legacy eigo-asobi-v1 is never read, rewritten or deleted', () => {
  const env = setup();
  masterL1LI01(env);
  env.engine.setImmersion(true); env.engine.setImmersion(false);
  env.engine.compact(1); env.engine.setLevel(2, 'parent_manual');
  env.engine.resetLearningProgress({ confirm: true });
  assert.equal(env.storage.getItem(LEGACY_KEY), LEGACY);
});

// ---------- 2. validation and recovery ----------
test('2. duplicate IDs are ignored and invalid attempts rejected', () => {
  const env = setup();
  const a = att({ timestamp: env.now().toISOString() });
  assert.equal(env.engine.recordAttempt(a).ok, true);
  assert.deepEqual(env.engine.recordAttempt(a), { ok: false, duplicate: true });
  assert.match(env.engine.recordAttempt(att({ timestamp: env.now().toISOString(), canDoIds: ['L9_XX_01'] })).error, /unknown Can-do/);
  assert.match(env.engine.recordAttempt(att({ timestamp: env.now().toISOString(), method: 'guess' })).error, /method/);
  assert.match(env.engine.recordAttempt(att({ timestamp: 'yesterday' })).error, /timestamp/);
  assert.match(env.engine.recordAttempt(att({ timestamp: env.now().toISOString(), canDoIds: [] })).error, /needs a Can-do/);
  assert.equal(env.engine.recordAttempt(att({ timestamp: env.now().toISOString(), canDoIds: [], method: 'exposure', skill: 'listening' })).ok, true);
  assert.equal(env.engine.snapshot().attempts.length, 2);
});

test('2. malformed or wrong-schema storage is backed up and recovered', () => {
  for (const bad of ['{not json', JSON.stringify({ schemaVersion: 7 }), '"string"']) {
    const env = setup({ init: { [E.KEY]: bad } });
    assert.equal(env.storage.getItem(E.BACKUP_KEY), bad);
    assert.equal(JSON.parse(env.storage.getItem(E.KEY)).schemaVersion, 1);
    assert.equal(env.storage.getItem(LEGACY_KEY), LEGACY);
    assert.equal(env.rec().ok, true);
  }
});

test('2. a valid saved record is loaded again', () => {
  const env = setup();
  masterL1LI01(env);
  const again = E.createEngine({ storage: env.storage, catalog: C, now: env.now });
  assert.equal(again.getCanDoProgress('L1_LI_01').status, 'mastered');
});

// ---------- 3. missing components ----------
test('3. a missing component keeps masteryScore null', () => {
  const env = setup();
  env.rec({ itemId: 'dog' }); env.rec({ itemId: 'cat' });
  env.rec({ itemId: 'bear', sceneId: 'balloon:animals' });
  const cp = env.engine.getCanDoProgress('L1_LI_01');
  assert.equal(cp.retention, null);
  assert.equal(cp.masteryScore, null);
  assert.notEqual(cp.status, 'mastered');
});

// ---------- 4 / 8a. hints: no double penalty ----------
test('4/8a. a correct first answer after a hint counts for task success but is not independent', () => {
  const env = setup();
  env.rec({ itemId: 'dog', support: 2 });
  env.rec({ itemId: 'cat', support: 2 });
  env.rec({ itemId: 'bear', support: 0 });
  const ev = env.engine.getEvidence('L1_LI_01');
  assert.equal(ev.trials, 3);
  assert.equal(ev.firstTrySuccesses, 3, 'all three first answers were correct');
  assert.equal(ev.independentSuccesses, 1, 'only the unaided answer is independent');
  const cp = env.engine.getCanDoProgress('L1_LI_01');
  assert.equal(cp.taskSuccess, 100, 'task success is not reduced by the hint');
  assert.equal(cp.independence, 33.3, 'independence alone measures the hint');
});

test('4/8a. hinted answers never satisfy the mastery conditions', () => {
  const env = setup();
  const day = (d, o) => { env.now.set(`2026-10-${String(d).padStart(2, '0')}T10:00:00+09:00`); env.rec(o); };
  day(1, { itemId: 'dog', sceneId: 'quiz:animals', support: 2 });
  day(2, { itemId: 'cat', sceneId: 'balloon:animals', support: 3 });
  day(3, { itemId: 'bear', sceneId: 'quiz:animals', support: 2 });
  day(12, { itemId: 'lion', sceneId: 'balloon:animals', support: 2 });
  const cp = env.engine.getCanDoProgress('L1_LI_01');
  assert.equal(env.engine.getEvidence('L1_LI_01').independentSuccesses, 0);
  assert.equal(cp.transfer, null);
  assert.equal(cp.status, 'developing');
});

// ---------- 5. success after a mistake ----------
test('5. a success after a mistake is not independent and not a first-try success', () => {
  const env = setup();
  const r = env.rec({ firstTry: false, support: 0 });
  assert.equal(env.engine.snapshot().attempts[0].support, 1, 'support is raised to at least 1');
  const ev = env.engine.getEvidence('L1_LI_01');
  assert.equal(ev.firstTrySuccesses, 0);
  assert.equal(ev.independentSuccesses, 0);
  assert.equal(ev.validSuccesses, 1);
  assert.equal(ev.independenceWeight, 0.75);
  assert.equal(r.ok, true);
});

// ---------- 6. scenes ----------
test('6. independent successes in one scene do not satisfy the 2-scene condition', () => {
  const env = setup();
  for (const item of ['dog', 'cat', 'bear', 'lion']) { env.rec({ itemId: item }); env.now.advance(DAY * 3); }
  const cp = env.engine.getCanDoProgress('L1_LI_01');
  assert.equal(cp.transfer, 50);
  assert.equal(cp.status, 'developing');
});

test('6. a Can-do with a scene alternative accepts 3 different items in one scene', () => {
  const env = setup();
  const mole = o => env.rec({ canDoIds: ['L1_RE_01'], taskId: 'mole:letters', sceneId: 'mole:letters', promptType: 'letter_name', ...o });
  mole({ itemId: 'b' }); mole({ itemId: 'd' });
  assert.equal(env.engine.getCanDoProgress('L1_RE_01').status, 'developing');
  mole({ itemId: 'p' });
  assert.equal(env.engine.getCanDoProgress('L1_RE_01').status, 'practicing');
  assert.equal(env.engine.getCanDoProgress('L1_RE_01').transfer, 100);
});

// ---------- 7. seven days ----------
test('7. successes on the same day (or within 6 days) do not satisfy the 7-day condition', () => {
  const env = setup();
  env.rec({ itemId: 'dog' });
  env.now.advance(11 * MIN); env.rec({ itemId: 'cat', sceneId: 'balloon:animals' });
  env.now.advance(11 * MIN); env.rec({ itemId: 'bear' });
  assert.equal(env.engine.getCanDoProgress('L1_LI_01').status, 'practicing');
  env.now.advance(6 * DAY); env.rec({ itemId: 'lion' });
  const cp = env.engine.getCanDoProgress('L1_LI_01');
  assert.equal(cp.retention, null, 'no probe 7+ days later yet');
  assert.equal(cp.status, 'practicing');
  env.now.advance(DAY); env.rec({ itemId: 'pig' });
  assert.equal(env.engine.getCanDoProgress('L1_LI_01').status, 'mastered');
});

// ---------- 8. repeats ----------
test('8. only the same Can-do + item + scene + prompt within 10 minutes is a repeat', () => {
  const env = setup();
  assert.equal(env.rec({ itemId: 'dog' }).counted, true);
  env.now.advance(2 * MIN);
  assert.equal(env.rec({ itemId: 'dog' }).counted, false, 'same question again');
  assert.equal(env.rec({ itemId: 'cat' }).counted, true, 'different item in the same minute');
  assert.equal(env.rec({ itemId: 'dog', sceneId: 'balloon:animals' }).counted, true, 'different scene');
  assert.equal(env.rec({ itemId: 'dog', promptType: 'which_one' }).counted, true, 'different prompt type');
  assert.equal(env.rec({ itemId: 'dog', support: 0, completed: false, verified: false }).counted, true, 'failures always count');
  env.now.advance(9 * MIN);
  assert.equal(env.rec({ itemId: 'dog' }).counted, true, '11 minutes after the first counted success');
  assert.equal(env.engine.getEvidence('L1_LI_01').trials, 6);
});

// ---------- 9. status boundaries ----------
test('9. status boundaries: discovering -> developing -> practicing -> mastered', () => {
  const env = setup();
  const status = () => env.engine.getCanDoProgress('L1_LI_01').status;
  env.rec({ canDoIds: ['L1_LI_01'], method: 'exposure' });
  assert.equal(status(), 'discovering', 'exposure only');
  env.rec({ itemId: 'dog', support: 2 });
  assert.equal(status(), 'discovering', '1 valid success');
  env.rec({ itemId: 'cat', support: 2 });
  assert.equal(status(), 'developing', '2 valid successes');
  env.rec({ itemId: 'bear' });
  env.rec({ itemId: 'lion', sceneId: 'balloon:animals' });
  assert.equal(status(), 'practicing', 'independent in 2 scenes');
  env.now.advance(8 * DAY); env.rec({ itemId: 'pig' });
  assert.equal(status(), 'mastered');
});

// ---------- 10. sticky mastery ----------
test('10. mastered is not revoked; two missed reviews set needsReview; an independent success clears it', () => {
  const env = setup();
  masterL1LI01(env);
  const miss = () => { env.now.advance(DAY); env.rec({ itemId: 'cow', firstTry: false, completed: true, verified: true }); };
  miss();
  assert.equal(env.engine.getCanDoProgress('L1_LI_01').needsReview, false);
  miss();
  let cp = env.engine.getCanDoProgress('L1_LI_01');
  assert.equal(cp.status, 'mastered');
  assert.equal(cp.needsReview, true);
  assert.deepEqual(env.engine.getDashboardSummary().needsReview, ['L1_LI_01']);
  env.now.advance(DAY); env.rec({ itemId: 'frog' });
  cp = env.engine.getCanDoProgress('L1_LI_01');
  assert.equal(cp.needsReview, false);
  for (let i = 0; i < 5; i++) { env.now.advance(DAY); env.rec({ itemId: `x${i}`, completed: false, verified: false }); }
  assert.equal(env.engine.getCanDoProgress('L1_LI_01').status, 'mastered');
});

test('10. review schedule follows 1/3/7/14 days', () => {
  const env = setup();
  env.now.set('2026-10-01T10:00:00+09:00');
  env.rec({ itemId: 'dog' });
  assert.equal(env.engine.getCanDoProgress('L1_LI_01').nextReviewAt, '2026-10-02');
  env.now.set('2026-10-02T10:00:00+09:00'); env.rec({ itemId: 'cat' });
  assert.equal(env.engine.getCanDoProgress('L1_LI_01').nextReviewAt, '2026-10-05');
  env.now.set('2026-10-05T10:00:00+09:00'); env.rec({ itemId: 'bear' });
  assert.equal(env.engine.getCanDoProgress('L1_LI_01').nextReviewAt, '2026-10-12');
  env.now.set('2026-10-12T10:00:00+09:00'); env.rec({ itemId: 'lion', completed: false, verified: false });
  assert.equal(env.engine.getCanDoProgress('L1_LI_01').nextReviewAt, '2026-10-13');
  env.now.set('2026-10-15T10:00:00+09:00');
  assert.deepEqual(env.engine.getDashboardSummary().dueReviews, ['L1_LI_01']);
});

// ---------- 11. ASR ----------
test('11. ASR failure or uncertainty is never a mistake or a success', () => {
  const env = setup();
  const sp = o => env.rec({ canDoIds: ['L1_SP_01'], taskId: 'greeting:hello', sceneId: 'greeting:home', itemId: 'hello', promptType: 'greet', method: 'asr', ...o });
  sp({ recognition: 'failed', completed: false, verified: false });
  sp({ recognition: 'uncertain', completed: true, verified: true });
  let ev = env.engine.getEvidence('L1_SP_01');
  assert.equal(ev.trials, 0);
  assert.equal(ev.validSuccesses, 0);
  sp({ recognition: 'valid', itemId: 'hello' });
  sp({ method: 'parent_observed', recognition: 'not_needed', itemId: 'bye' });
  sp({ method: 'self_report', recognition: 'not_needed', itemId: 'thank_you' });
  ev = env.engine.getEvidence('L1_SP_01');
  assert.equal(ev.validSuccesses, 2, 'ASR valid and parent observation count; self-report does not');
  assert.equal(ev.trials, 2);
});

// ---------- 12. compaction ----------
function lcg(seed) { let s = seed; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; }
function history(n, days, seed) {
  const r = lcg(seed), out = [];
  const pick = a => a[Math.floor(r() * a.length)];
  const t0 = new Date('2026-01-01T08:00:00+09:00').getTime();
  for (let i = 0; i < n; i++) {
    const t = t0 + Math.floor((i / n) * days * DAY) + Math.floor(r() * HOUR);
    const kind = r();
    const base = kind < 0.6
      ? { canDoIds: ['L1_LI_01'], sceneId: pick(['quiz:animals', 'quiz:food', 'balloon:animals', 'pet:food']), itemId: pick(['dog', 'cat', 'apple', 'egg', 'bear']), promptType: pick(['where_is', 'pop_the', 'want']) }
      : kind < 0.8
        ? { canDoIds: ['L1_RE_01'], sceneId: 'mole:letters', itemId: pick(['b', 'd', 'p', 'q']), promptType: 'letter_name' }
        : kind < 0.9
          ? { canDoIds: ['L2_LI_02'], sceneId: 'shop:food', itemId: pick(['one-apple', 'two-eggs', 'three-oranges']), promptType: 'order' }
          : { canDoIds: ['L1_SP_01'], sceneId: 'greeting:home', itemId: pick(['hello', 'bye', 'thanks']), promptType: 'greet', method: pick(['asr', 'parent_observed', 'self_report']), recognition: pick(['valid', 'failed', 'uncertain', 'not_needed']) };
    const success = r() < 0.75;
    out.push({ ts: t, a: { taskId: 'gen:task', completed: success, verified: success, firstTry: r() < 0.8, support: pick([0, 0, 0, 1, 2, 3]), method: 'action', recognition: 'not_needed', ...base } });
  }
  return out;
}
function feed(env, hist) {
  env.engine.batch(() => {
    for (const { ts, a } of hist) { env.now.set(new Date(ts).toISOString()); env.engine.recordAttempt(att({ ...a, timestamp: new Date(ts).toISOString() })); }
  });
}
const DERIVED = ['status', 'masteryScore', 'taskSuccess', 'independence', 'transfer', 'retention', 'confirmPending', 'masteredAt', 'needsReview', 'nextReviewAt', 'reviewStep'];
const pickDerived = cp => Object.fromEntries(DERIVED.map(k => [k, cp[k]]));
const SCORING = ['trials', 'firstTrySuccesses', 'validSuccesses', 'independenceWeight', 'independentSuccesses', 'firstIndependentDate', 'latestIndependentDate', 'independentScenes', 'independentItems', 'retentionProbes', 'retentionSuccesses'];
const pickScoring = ev => Object.fromEntries(SCORING.map(k => [k, ev[k]]));

test('12. compaction is lossless: scores and statuses equal an engine that never compacts', () => {
  const hist = history(5000, 200, 7);
  const unlimited = setup({ config: { keepDays: 100000, maxAttempts: 1e9 } });
  const normal = setup();
  feed(unlimited, hist); feed(normal, hist);
  assert.ok(normal.engine.snapshot().attempts.length <= 3000);
  assert.ok(Object.keys(normal.engine.snapshot().aggregates).length > 0, 'something was compacted');
  for (const id of ['L1_LI_01', 'L1_RE_01', 'L2_LI_02', 'L1_SP_01']) {
    assert.deepEqual(pickScoring(normal.engine.getEvidence(id)), pickScoring(unlimited.engine.getEvidence(id)), id);
    assert.deepEqual(pickDerived(normal.engine.getCanDoProgress(id)), pickDerived(unlimited.engine.getCanDoProgress(id)), id);
  }
});

test('12. attempts from the last 24 hours are kept when the limit is reached by older records', () => {
  const env = setup({ config: { maxAttempts: 50 } });
  env.engine.batch(() => {
    for (let i = 0; i < 40; i++) { env.now.advance(HOUR); env.rec({ itemId: `old${i}` }); }
    env.now.advance(3 * DAY);
    for (let i = 0; i < 30; i++) { env.now.advance(MIN); env.rec({ itemId: `new${i}` }); }
  });
  const items = env.engine.snapshot().attempts.map(a => a.itemId);
  assert.ok(items.length <= 50);
  for (let i = 0; i < 30; i++) assert.ok(items.includes(`new${i}`));
});

test('12. more than 3,000 attempts within 24 hours: hard limit applies, nothing is lost, repeats still detected', () => {
  const env = setup();
  const unlimited = setup({ config: { keepDays: 100000, maxAttempts: 1e9 } });
  env.rec({ itemId: 'dog', id: 'first-dog' });
  unlimited.rec({ itemId: 'dog', id: 'first-dog' });
  const flood = Array.from({ length: 3200 }, (_, i) => ({ itemId: `item${i}`, sceneId: i % 2 ? 'quiz:food' : 'balloon:food' }));
  for (const e of [env, unlimited]) e.engine.batch(() => { for (const o of flood) { e.now.advance(50); e.rec(o); } });
  const snap = env.engine.snapshot();
  assert.ok(snap.attempts.length <= 3000 && snap.attempts.length >= 2850);
  assert.ok(!snap.attempts.some(a => a.id === 'first-dog'), 'the first answer was folded into the aggregate');
  env.now.advance(30000); unlimited.now.advance(30000);
  assert.equal(env.rec({ itemId: 'dog' }).counted, false, 'repeat within 10 minutes is still detected');
  unlimited.rec({ itemId: 'dog' });
  assert.deepEqual(pickScoring(env.engine.getEvidence('L1_LI_01')), pickScoring(unlimited.engine.getEvidence('L1_LI_01')));
});

test('12. storage stays bounded after 10,000 attempts over 400 days', () => {
  const env = setup();
  feed(env, history(10000, 400, 11));
  const snap = env.engine.snapshot();
  const bytes = env.storage.getItem(E.KEY).length;
  assert.ok(snap.attempts.length <= 3000);
  assert.ok(bytes < 1.5 * 1024 * 1024, `stored ${bytes} bytes`);
  for (const agg of Object.values(snap.aggregates)) {
    assert.ok(agg.independentScenes.length <= 20 && agg.independentItems.length <= 20);
  }
  assert.ok(snap.monthlySummaries.length <= 24);
  assert.ok(snap.sessionSummaries.length <= 90);
});

test('12. mastered entries and level history survive compaction', () => {
  const env = setup();
  masterL1LI01(env);
  env.engine.setLevel(2, 'parent_manual');
  env.now.advance(200 * DAY);
  env.engine.compact();
  assert.equal(env.engine.snapshot().attempts.length, 0);
  assert.equal(env.engine.getCanDoProgress('L1_LI_01').status, 'mastered');
  assert.equal(env.engine.snapshot().levelHistory.length, 1);
});

// ---------- 12a. English-only overlay ----------
test('12a. English-only mode is an overlay and never changes the legacy settings', () => {
  const env = setup();
  const legacy = Object.freeze(JSON.parse(LEGACY));
  assert.deepEqual(E.effectiveSettings(legacy, false), { caption: 'full', capHide: true, showJa: true, japaneseHint: true });
  assert.deepEqual(E.effectiveSettings(legacy, true), { caption: 'en', capHide: true, showJa: false, japaneseHint: false });
  assert.equal(E.effectiveSettings({ ...legacy, caption: 'off' }, true).caption, 'off');
  env.engine.setImmersion(true);
  assert.equal(env.engine.isImmersion(), true);
  env.engine.setImmersion(false);
  assert.equal(env.storage.getItem(LEGACY_KEY), LEGACY);
});

test('12a. an answer visible in captions is support 2 in any mode', () => {
  assert.equal(E.supportLevel({ answerVisible: true }), 2);
  assert.equal(E.supportLevel({ answerVisible: true, replayed: true }), 2);
  assert.equal(E.supportLevel({ japaneseHint: true }), 2);
  assert.equal(E.supportLevel({ answerHighlighted: true }), 3);
  assert.equal(E.supportLevel({ replayed: true }), 1);
  assert.equal(E.supportLevel({ mistakeBefore: true }), 1);
  assert.equal(E.supportLevel({}), 0);
});

// ---------- 13. storage full ----------
test('13. a full storage never stops the game and is reported to the parent', () => {
  const env = setup({ storage: memStorage({ [LEGACY_KEY]: LEGACY }, { quota: 150000 }) });
  let lastOk = true;
  env.engine.batch(() => { for (let i = 0; i < 1500; i++) { env.now.advance(MIN); lastOk = env.rec({ itemId: `w${i}` }).ok && lastOk; } });
  assert.equal(lastOk, true);
  assert.ok(env.engine.snapshot().attempts.length <= 1000, 'emergency compaction ran');
  assert.equal(env.engine.getDashboardSummary().storageWarning, true);
  assert.equal(env.rec({ itemId: 'after' }).ok, true, 'still records in memory');
  assert.equal(env.storage.getItem(LEGACY_KEY), LEGACY);
});

// ---------- 14. level-up ----------
test('14. level-up is recommended only when all required Can-dos are mastered, and needs approval', () => {
  const env = setup();
  masterL1LI01(env);
  assert.equal(env.engine.levelUpRecommended(), false);
  assert.equal(env.engine.approveLevelUp().ok, false);
  const t0 = env.now().getTime();
  const at = (d, o) => { env.now.set(new Date(t0 + d * DAY).toISOString()); env.rec(o); };
  // L1_LI_02 (2 scenes) and L1_SP_01 (3 greetings in one scene, parent observed)
  const li2 = (d, scene, item) => at(d, { canDoIds: ['L1_LI_02'], taskId: 'listen-do:basic', sceneId: scene, itemId: item, promptType: 'action' });
  const sp = (d, item) => at(d, { canDoIds: ['L1_SP_01'], taskId: 'greeting:basic', sceneId: 'greeting:home', itemId: item, promptType: 'greet', method: 'parent_observed' });
  li2(1, 'listen:park', 'jump'); li2(1.01, 'listen:room', 'stop'); li2(2, 'listen:park', 'clap'); li2(9, 'listen:room', 'sit');
  sp(1, 'hello'); sp(2, 'bye'); sp(3, 'thanks'); sp(10, 'hello');
  assert.equal(env.engine.getCanDoProgress('L1_LI_02').status, 'mastered');
  assert.equal(env.engine.getCanDoProgress('L1_SP_01').status, 'mastered');
  assert.equal(env.engine.levelUpRecommended(), true);
  assert.equal(env.engine.getLevel(), 1, 'never automatic');
  assert.deepEqual(env.engine.getDashboardSummary().levelUpRecommended, true);
  assert.equal(env.engine.approveLevelUp().changed, true);
  assert.equal(env.engine.getLevel(), 2);
  assert.equal(env.engine.snapshot().levelHistory.at(-1).reason, 'recommended_approved');
});

test('14. manual level changes are recorded and history is capped at 50', () => {
  const env = setup();
  assert.equal(env.engine.setLevel(5, 'parent_manual').ok, false);
  for (let i = 0; i < 60; i++) env.engine.setLevel(i % 2 ? 1 : 3, 'parent_manual');
  const h = env.engine.snapshot().levelHistory;
  assert.equal(h.length, 50);
  assert.ok(h.every(x => x.reason === 'parent_manual'));
});

// ---------- 15. reset ----------
test('15. reset needs confirmation and clears only learner-progress-v1', () => {
  const env = setup();
  masterL1LI01(env);
  assert.equal(env.engine.resetLearningProgress().ok, false);
  assert.ok(env.storage.getItem(E.KEY));
  assert.equal(env.engine.resetLearningProgress({ confirm: true }).ok, true);
  assert.equal(env.storage.getItem(E.KEY), null);
  assert.equal(env.storage.getItem(LEGACY_KEY), LEGACY);
  assert.equal(env.engine.getCanDoProgress('L1_LI_01').status, 'discovering');
});

// ---------- dashboard / recommendations ----------
test('dashboard: fresh install shows no records, not 0% ability', () => {
  const s = setup().engine.getDashboardSummary();
  assert.equal(s.hasRecords, false);
  assert.equal(s.requiredTotal, 3);
  assert.equal(s.requiredMastered, 0);
  assert.equal(s.skills.listening.assessed, 0);
  assert.equal(s.skills.speaking.assessable, 0, 'no game can assess speaking yet');
});

test('dashboard: score >= 85 without the other conditions is "confirm pending"', () => {
  // Everything in one scene: score is high, but the 2-scene condition is not met.
  const env = setup();
  const day = (d, o) => { env.now.set(`2026-10-${String(d).padStart(2, '0')}T10:00:00+09:00`); env.rec(o); };
  day(1, { itemId: 'dog' }); day(1, { itemId: 'cat' }); day(2, { itemId: 'egg' }); day(9, { itemId: 'bear' });
  const cp = env.engine.getCanDoProgress('L1_LI_01');
  assert.equal(cp.masteryScore, 90, '0.4*100 + 0.25*100 + 0.2*50 + 0.15*100');
  assert.equal(cp.status, 'developing');
  assert.equal(cp.confirmPending, true);
  assert.equal(env.engine.getDashboardSummary().confirmPending, 1);
});

test('recommendMissions suggests existing games for unmet Can-dos, reviews first', () => {
  const env = setup();
  const recs = env.engine.recommendMissions();
  assert.ok(recs.length >= 1 && recs.length <= 2);
  assert.equal(recs[0].canDoId, 'L1_LI_01', 'critical first');
  assert.equal(recs[0].reason, 'new');
  masterL1LI01(env);
  env.now.advance(30 * DAY);
  assert.equal(env.engine.recommendMissions()[0].reason, 'review');
});

test('recordSession keeps weekly engaged time', () => {
  const env = setup();
  env.engine.recordSession(300); env.now.advance(DAY); env.engine.recordSession(120.4);
  env.now.advance(10 * DAY); env.engine.recordSession(60);
  assert.equal(env.engine.getDashboardSummary().weeklyEngagedSeconds, 60);
});

test('attempts arriving out of time order give the same result as in order', () => {
  const ts = ['2026-10-01T10:00:00+09:00', '2026-10-02T10:00:00+09:00', '2026-10-09T10:00:00+09:00', '2026-10-01T11:00:00+09:00'];
  const items = [['dog', 'quiz:animals'], ['cat', 'balloon:animals'], ['bear', 'quiz:animals'], ['egg', 'quiz:food']];
  const inOrder = setup({ now: clock('2026-10-10T10:00:00+09:00') });
  const shuffled = setup({ now: clock('2026-10-10T10:00:00+09:00') });
  const rec = (env, k) => env.engine.recordAttempt(att({ id: `o${k}`, timestamp: ts[k], itemId: items[k][0], sceneId: items[k][1] }));
  for (const k of [0, 3, 1, 2]) rec(inOrder, k);
  for (const k of [2, 0, 1, 3]) rec(shuffled, k);
  assert.deepEqual(pickScoring(shuffled.engine.getEvidence('L1_LI_01')), pickScoring(inOrder.engine.getEvidence('L1_LI_01')));
  assert.equal(shuffled.engine.getCanDoProgress('L1_LI_01').status, inOrder.engine.getCanDoProgress('L1_LI_01').status);
});

// ---------- review fix 1: re-sent IDs after compaction ----------
test('re-sending an attempt after it was folded into the aggregate never counts it twice', () => {
  const env = setup();
  const original = att({ id: 'resend-me', timestamp: env.now().toISOString(), itemId: 'dog' });
  env.engine.recordAttempt(original);
  env.now.advance(DAY); env.rec({ itemId: 'cat', sceneId: 'balloon:animals' });
  env.now.advance(120 * DAY);
  env.engine.compact();
  assert.equal(env.engine.snapshot().attempts.length, 0, 'both attempts were folded');
  const before = pickScoring(env.engine.getEvidence('L1_LI_01'));
  assert.deepEqual(env.engine.recordAttempt(original), { ok: false, duplicate: true }, 'same ID, same time');
  assert.deepEqual(env.engine.recordAttempt({ ...original, timestamp: env.now().toISOString() }), { ok: false, duplicate: true }, 'same ID, new time');
  const old = env.engine.recordAttempt(att({ timestamp: original.timestamp }));
  assert.equal(old.ok, false);
  assert.equal(old.error, 'too_old', 'a new ID dated inside the folded period is refused explicitly');
  assert.deepEqual(pickScoring(env.engine.getEvidence('L1_LI_01')), before);
  // The same checks survive a reload.
  const reloaded = E.createEngine({ storage: env.storage, catalog: C, now: env.now });
  assert.deepEqual(reloaded.recordAttempt(original), { ok: false, duplicate: true });
});

test('remembered IDs and boundary keys stay bounded', () => {
  const env = setup({ config: { maxAttempts: 100 } });
  env.engine.batch(() => { for (let i = 0; i < 6000; i++) { env.now.advance(5 * MIN); env.rec({ itemId: `i${i % 50}`, sceneId: `quiz:s${i % 7}` }); } });
  const snap = env.engine.snapshot();
  assert.ok(snap.compactedIds.length <= 2000);
  assert.ok(Object.keys(snap.boundaryKeys).length <= 3, 'only keys within 10 minutes of the boundary');
  assert.ok(snap.foldedThrough);
});

// ---------- review fix 2: attempts arriving out of time order ----------
const METRIC = ['taskSuccess', 'independence', 'transfer', 'retention', 'masteryScore'];
const pickMetric = cp => Object.fromEntries(METRIC.map(k => [k, cp[k]]));
function shuffle(arr, seed) { const r = lcg(seed), a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

test('random arrival order gives the same evidence, repeat decisions and scores as time order', () => {
  // 600 attempts over 80 days (inside the detailed window), with deliberate repeats a few minutes apart.
  const base = history(600, 80, 23).map((h, k) => ({ ...h, a: { ...h.a, id: `h${k}` } }));
  const repeats = base.filter((_, k) => k % 5 === 0).map((h, k) => ({ ts: h.ts + (3 + (k % 9)) * MIN, a: { ...h.a, id: `r${k}`, completed: true, verified: true } }));
  const all = [...base, ...repeats];
  const end = '2026-03-25T09:00:00+09:00';
  const sorted = setup({ now: clock(end) }), shuffled = setup({ now: clock(end) });
  const put = (env, list) => env.engine.batch(() => { for (const { ts, a } of list) env.engine.recordAttempt(att({ ...a, timestamp: new Date(ts).toISOString() })); });
  put(sorted, [...all].sort((x, y) => x.ts - y.ts));
  put(shuffled, shuffle(all, 99));
  const counted = env => Object.fromEntries(env.engine.snapshot().attempts.map(x => [x.id, x.counted]));
  assert.deepEqual(counted(shuffled), counted(sorted), 'repeat decisions do not depend on arrival order');
  assert.ok(Object.values(counted(sorted)).includes(false), 'the data really contains repeats');
  for (const id of ['L1_LI_01', 'L1_RE_01', 'L2_LI_02', 'L1_SP_01']) {
    assert.deepEqual(pickScoring(shuffled.engine.getEvidence(id)), pickScoring(sorted.engine.getEvidence(id)), id);
    assert.deepEqual(pickMetric(shuffled.engine.getCanDoProgress(id)), pickMetric(sorted.engine.getCanDoProgress(id)), id);
  }
});

test('a back-dated independent success moves the first success date and re-classifies retention probes', () => {
  const env = setup({ now: clock('2026-10-20T10:00:00+09:00') });
  const on = (d, o) => env.engine.recordAttempt(att({ timestamp: `2026-10-${String(d).padStart(2, '0')}T10:00:00+09:00`, ...o }));
  on(10, { itemId: 'dog', sceneId: 'quiz:animals' });
  on(12, { itemId: 'cat', sceneId: 'balloon:animals' });
  let ev = env.engine.getEvidence('L1_LI_01');
  assert.equal(ev.firstIndependentDate, '2026-10-10');
  assert.equal(ev.retentionProbes, 0);
  // A parent restores an earlier record (still inside the 90-day window).
  on(1, { itemId: 'bear', sceneId: 'quiz:animals' });
  ev = env.engine.getEvidence('L1_LI_01');
  assert.equal(ev.firstIndependentDate, '2026-10-01');
  assert.equal(ev.retentionProbes, 2, 'Oct 10 and Oct 12 are now 7+ days after the first success');
  assert.equal(ev.retentionSuccesses, 2);
  const cp = env.engine.getCanDoProgress('L1_LI_01');
  assert.equal(cp.retention, 100);
  assert.equal(cp.status, 'mastered', '3 independent, 2 scenes, 9 days apart, score 100');
});

test('a back-dated record changes the repeat decision of later records correctly', () => {
  const env = setup({ now: clock('2026-10-01T12:00:00+09:00') });
  const at = (min, id) => env.engine.recordAttempt(att({ id, itemId: 'dog', timestamp: new Date(new Date('2026-10-01T10:00:00+09:00').getTime() + min * MIN).toISOString() }));
  const flags = () => Object.fromEntries(env.engine.snapshot().attempts.map(x => [x.id, x.counted]));
  at(12, 'c');
  assert.deepEqual(flags(), { c: true });
  at(5, 'b');
  assert.deepEqual(flags(), { b: true, c: false }, 'c is 7 minutes after b, so c becomes the repeat');
  at(0, 'a');
  assert.deepEqual(flags(), { a: true, b: false, c: true }, 'b is 5 minutes after a; c is 12 minutes after a and counts again');
  assert.equal(env.engine.getEvidence('L1_LI_01').trials, 2);
});

test('parent observations can be back-dated inside the detailed window but not into the folded period', () => {
  const env = setup({ config: { maxAttempts: 20 } });
  env.engine.batch(() => { for (let i = 0; i < 30; i++) { env.now.advance(HOUR); env.rec({ itemId: `x${i}` }); } });
  const boundary = env.engine.snapshot().foldedThrough;
  const obs = ts => env.engine.recordAttempt(att({ canDoIds: ['L1_SP_01'], taskId: 'parent:observe', sceneId: 'home:observed', itemId: 'hello',
    promptType: 'greet', method: 'parent_observed', timestamp: ts }));
  assert.equal(obs(new Date(new Date(boundary).getTime() + MIN).toISOString()).ok, true, 'after the boundary: accepted');
  const now = env.engine.snapshot().foldedThrough; // recording may have compacted again
  const r = obs(new Date(new Date(now).getTime() - DAY).toISOString());
  assert.equal(r.error, 'too_old');
  assert.equal(r.foldedThrough, now, 'the UI can tell the parent which dates are still accepted');
});
