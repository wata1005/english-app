// Stage B: what each existing game records in learner-progress-v1 (CURRICULUM.md "Existing-game mapping").
// Drives the real built app in headless Chrome and inspects the recorded attempts.
const test = require('node:test');
const assert = require('node:assert/strict');
const { runInChrome, hasChrome } = require('./helpers/chrome.js');

const LEGACY = JSON.stringify({ stars: 20, coins: 5, level: 1, caption: 'full', capHide: true, showJa: true, mic: 'off',
  pet: { day: '', meals: 0, hearts: 0 }, owned: {}, wear: { head: null, face: null, hand: null, bg: null } });

const PROBE = String.raw`
  const out = {};
  const FIELDS = ['canDoIds', 'sceneId', 'itemId', 'promptType', 'firstTry', 'support', 'method', 'recognition', 'skill', 'verified'];
  const last = () => { const a = learn.snapshot().attempts.at(-1); return a ? Object.fromEntries(FIELDS.map(k => [k, a[k]])) : null; };
  const count = () => learn.snapshot().attempts.length;
  const run = (name, fn) => {
    try { learn.resetLearningProgress({ confirm: true }); state.caption = 'full'; state.capHide = true; state.level = 1; fn(); out[name] = last(); }
    catch (e) { out[name] = 'ERROR ' + e.message; }
  };
  const quizPick = correct => {
    const q = view.round[view.i], k = q.options.findIndex(w => (correct ? w === q.answer : w !== q.answer));
    ACTS.pick(String(k), $$('.opt')[k]);
  };
  const quizAnswer = () => view.round[view.i].answer.en;

  // ---- quiz (L1_LI_01) ----
  run('quizFirst', () => { startQuiz('animals'); out.quizFirstItem = quizAnswer(); quizPick(true); });
  run('quizReplay', () => { startQuiz('animals'); ACTS.qsay(); quizPick(true); });
  run('quizMistake', () => { startQuiz('animals'); quizPick(false); quizPick(true); });
  run('quizHint1', () => { startQuiz('animals'); ACTS.hint(); quizPick(true); });
  run('quizHint2', () => { startQuiz('animals'); ACTS.hint(); ACTS.hint(); quizPick(true); });
  run('quizCaptionVisible', () => { startQuiz('animals'); state.capHide = false; quizPick(true); });
  run('quizCaptionOff', () => { startQuiz('animals'); state.caption = 'off'; state.capHide = false; quizPick(true); });
  run('quizColors', () => { startQuiz('colors'); quizPick(true); });
  run('quizNumbers', () => { startQuiz('numbers'); quizPick(true); });

  // ---- balloon (L1_LI_01) ----
  const pop = correct => {
    const t = view.words[view.i], k = view.balloons.findIndex(b => b.alive && (correct ? b.w === t : b.w !== t));
    ACTS.popB(String(k), view.balloons[k].el);
  };
  run('balloonFirst', () => { startBalloon(); out.balloonCat = WORD_CAT.get(view.words[0]); out.balloonItem = view.words[0].en; pop(true); });
  run('balloonMistake', () => { startBalloon(); pop(false); pop(true); });
  run('balloonReplay', () => { startBalloon(); ACTS.bsay(); pop(true); });

  // ---- pet feeding (L1_LI_01) ----
  run('petFirst', () => {
    state.pet = { day: '', meals: 0, hearts: 0 }; openPet();
    out.petItem = view.want.en; out.coinsBefore = state.coins;
    ACTS.feed(String(view.options.indexOf(view.want)), $$('.opt')[view.options.indexOf(view.want)]);
    out.coinsAfter = state.coins;
  });
  run('petMistake', () => {
    state.pet = { day: '', meals: 0, hearts: 0 }; openPet();
    const wrong = view.options.findIndex(w => w !== view.want);
    ACTS.feed(String(wrong), $$('.opt')[wrong]);
    ACTS.feed(String(view.options.indexOf(view.want)), $$('.opt')[view.options.indexOf(view.want)]);
  });

  // ---- shop (L2_LI_02) ----
  const fill = o => { for (let i = 0; i < o.n; i++) ACTS.tobasket(String(view.shelf.indexOf(o.w))); };
  run('shopFirst', () => { startShop(); const o = view.words[0]; out.shopItem = o.n + '-' + o.w.en; fill(o); ACTS.handover(); });
  run('shopMistake', () => {
    startShop(); const o = view.words[0];
    ACTS.tobasket(String(view.shelf.findIndex(w => w !== o.w))); ACTS.handover();
    ACTS.unbasket('0'); fill(o); ACTS.handover();
  });
  run('shopHint2', () => { startShop(); const o = view.words[0]; ACTS.hint(); ACTS.hint(); fill(o); ACTS.handover(); });

  // ---- mole (L1_RE_01) ----
  const whackTarget = () => { const t = view.words[view.i]; view.holes[0] = { L: t }; ACTS.whack('0', $$('.mole')[0]); return t.l; };
  run('moleLevel2', () => { state.level = 2; startMole(); out.moleItem = whackTarget(); });
  run('moleLevel1', () => { state.level = 1; startMole(); whackTarget(); });

  // ---- practice / exposure only ----
  run('cards', () => { go('cards', { cat: 'food', i: 0 }); sayCard(); const n = count(); ACTS.say(); out.cardsReplayAdds = count() - n; });
  run('abc', () => { go('abc', { sel: 1 }); sayABC(); const n = count(); ACTS.abcsay(); out.abcReplayAdds = count() - n; });
  run('memory', () => {
    startMemory(); const a = 0, b = view.cards.findIndex((c, i) => i !== a && c.k === view.cards[a].k);
    ACTS.flip(String(a)); ACTS.flip(String(b));
  });
  run('spell', () => {
    startSpell(); const ans = view.words[0].en;
    for (const ch of ans) ACTS.tile(String(view.tiles.findIndex(t => !t.used && t.ch === ch)));
  });
  run('speak', () => { startSpeak(); view.mode = 'repeat'; ACTS.spMic(); ACTS.spOk(); });

  // ---- storage separation ----
  learn.resetLearningProgress({ confirm: true });
  startQuiz('food'); quizPick(true);
  out.legacy = JSON.parse(localStorage.getItem('eigo-asobi-v1'));
  out.learner = JSON.parse(localStorage.getItem('learner-progress-v1'));
  window.__done(out);`;

test('Stage B: each game records the right evidence', { skip: !hasChrome && 'Chrome not found' }, async t => {
  const { result: r, errors } = runInChrome(PROBE, { legacy: LEGACY });
  assert.deepEqual(errors, []);
  const ev = (canDo, scene, prompt) => ({ canDoIds: [canDo], sceneId: scene, promptType: prompt, method: 'action', recognition: 'not_needed', verified: true });

  await t.test('quiz: first correct answer is independent evidence for L1_LI_01', () => {
    assert.deepEqual(r.quizFirst, { ...ev('L1_LI_01', 'quiz:animals', 'where_is'), itemId: r.quizFirstItem, firstTry: true, support: 0, skill: 'listening' });
  });
  await t.test('quiz: replay = support 1, mistake = not first try, hints = 2 / 3', () => {
    assert.equal(r.quizReplay.support, 1); assert.equal(r.quizReplay.firstTry, true);
    assert.equal(r.quizMistake.firstTry, false); assert.ok(r.quizMistake.support >= 1);
    assert.equal(r.quizHint1.support, 2); assert.equal(r.quizHint1.firstTry, true, 'a hint is not a mistake');
    assert.equal(r.quizHint2.support, 3);
  });
  await t.test('quiz: answer visible in captions = support 2; captions off = 0', () => {
    assert.equal(r.quizCaptionVisible.support, 2);
    assert.equal(r.quizCaptionOff.support, 0);
  });
  await t.test('quiz: scene and prompt follow the category', () => {
    assert.equal(r.quizColors.sceneId, 'quiz:colors'); assert.equal(r.quizColors.promptType, 'which_one');
    assert.equal(r.quizNumbers.sceneId, 'quiz:numbers'); assert.equal(r.quizNumbers.promptType, 'find');
  });
  await t.test('balloon: scene is the target word category; mistakes and replays are tracked', () => {
    assert.deepEqual(r.balloonFirst, { ...ev('L1_LI_01', `balloon:${r.balloonCat}`, 'pop_the'), itemId: r.balloonItem, firstTry: true, support: 0, skill: 'listening' });
    assert.equal(r.balloonMistake.firstTry, false);
    assert.equal(r.balloonReplay.support, 1);
  });
  await t.test('pet feeding: L1_LI_01 in pet:food, and the game still gives its coins', () => {
    assert.deepEqual(r.petFirst, { ...ev('L1_LI_01', 'pet:food', 'want'), itemId: r.petItem, firstTry: true, support: 0, skill: 'listening' });
    assert.equal(r.coinsAfter - r.coinsBefore, 3);
    assert.equal(r.petMistake.firstTry, false);
  });
  await t.test('shop: quantity + item is L2_LI_02; a wrong hand-over and hint 2 are recorded', () => {
    assert.deepEqual(r.shopFirst, { ...ev('L2_LI_02', 'shop:food', 'order'), itemId: r.shopItem, firstTry: true, support: 0, skill: 'listening' });
    assert.equal(r.shopMistake.firstTry, false);
    assert.equal(r.shopHint2.support, 3);
  });
  await t.test('mole: difficulty 2 is evidence for L1_RE_01; difficulty 1 shows the letter (support 3)', () => {
    assert.deepEqual(r.moleLevel2, { ...ev('L1_RE_01', 'mole:letters', 'letter_name'), itemId: r.moleItem, firstTry: true, support: 0, skill: 'reading' });
    assert.equal(r.moleLevel1.support, 3);
  });
  await t.test('cards, ABC, memory, spelling and speaking are practice records, never Can-do evidence', () => {
    for (const [name, skill, method] of [['cards', 'listening', 'exposure'], ['abc', 'reading', 'exposure'], ['memory', null, 'exposure'],
      ['spell', 'writing', 'exposure'], ['speak', 'speaking', 'self_report']]) {
      assert.deepEqual(r[name].canDoIds, [], name);
      assert.equal(r[name].method, method, name);
      assert.equal(r[name].verified, false, name);
      assert.equal(r[name].skill, skill, name);
    }
    assert.equal(r.cardsReplayAdds, 0, 'pressing the speaker again on the same card is not logged again');
    assert.equal(r.abcReplayAdds, 0);
  });
  await t.test('learning data stays in learner-progress-v1; the legacy save keeps its own fields', () => {
    assert.equal(r.learner.schemaVersion, 1);
    assert.equal(r.learner.attempts.length, 1);
    assert.ok(!('attempts' in r.legacy) && !('canDoProgress' in r.legacy));
    assert.ok(r.legacy.stars > 20, 'stars are still awarded by the game');
  });
});
