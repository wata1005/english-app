const test = require('node:test');
const assert = require('node:assert/strict');
const { runInChrome, hasChrome } = require('./helpers/chrome.js');
const LEGACY = JSON.stringify({ stars: 33, coins: 21, level: 1, caption: 'full', capHide: false, showJa: true,
  mic: 'off', wear: { head: 'crown', face: null, hand: null, bg: null } });
const skip = !hasChrome && 'Chrome not found';

test('Stage C: gate, dashboard, settings, approval, separate resets and English overlay', { skip }, () => {
  const { result: r, errors } = runInChrome(String.raw`
    Speech.say = () => {}; Speech.sayAll = () => {};
    const out = {}, text = () => document.querySelector('main').textContent;
    const unlock = () => { go('parent'); ACTS.parentGate(String(view.gate.answer)); };
    const pick = () => { const q = view.round[view.i], k = q.options.indexOf(q.answer); ACTS.pick(String(k), $$('.opt')[k]); };
    go('parent'); out.gate = text();
    const saved = localStorage.getItem(KEY);
    ACTS.immersion('1'); ACTS.learningResetYes(); ACTS.level('2');
    out.blocked = !learn.isImmersion() && localStorage.getItem(KEY) === saved;
    ACTS.parentGate(String(view.gate.answer + 100)); out.wrongGate = !view.parentUnlocked;
    ACTS.parentGate(String(view.gate.answer)); out.fresh = text();
    ACTS.parentTab('abilities'); out.abilities = text();
    ACTS.parentTab('settings'); ACTS.immersion('1');
    out.overlayLegacy = localStorage.getItem(KEY) === saved;
    go('cards', { cat: 'animals', i: 0 }); out.enCard = { kana: !!$('.kana-word'), ja: !!$('.ja-word') };
    startQuiz('animals'); out.enCaption = { kana: !!$('.cap-kana'), ja: !!$('.cap-ja'), en: !!$('.cap-en') };
    pick(); out.visibleSupport = learn.snapshot().attempts.at(-1).support;
    unlock(); ACTS.parentTab('settings'); ACTS.capHide('1'); ACTS.immersion('1');
    const legacyHidden = localStorage.getItem(KEY);
    startQuiz('animals'); ACTS.hint(); out.enHint = view.hintText; pick(); out.enHintSupport = learn.snapshot().attempts.at(-1).support;
    unlock(); ACTS.parentTab('settings'); const beforeOff = localStorage.getItem(KEY); ACTS.immersion('0'); out.restoredLegacy = localStorage.getItem(KEY) === beforeOff;
    go('cards', { cat: 'animals', i: 0 }); out.restoredCard = !!$('.kana-word') && !!$('.ja-word');
    startQuiz('animals'); ACTS.hint(); pick(); out.jaHintSupport = learn.snapshot().attempts.at(-1).support;
    // Unanswered is visible as history, never as a failed answer.
    startQuiz('food'); go('home');
    unlock(); logPractice('speak', 'animals', 'dog', 'self_report', 'uncertain');
    ACTS.parentTab('history'); out.history = text();
    ACTS.parentTab('growth'); out.growth = text();
    out.recommendations = learn.recommendMissions();
    ACTS.parentPlay('0'); out.recommendedView = { name: view.name, mode: view.mode, level: view.level };
    unlock();
    out.beforeApprove = learn.getLevel(); ACTS.approveCurriculum(); out.noPrematureApprove = learn.getLevel();
    ACTS.parentTab('settings'); ACTS.curriculumAsk('2'); out.beforeManualConfirm = learn.getLevel();
    ACTS.curriculumNo(); out.cancelledLevel = learn.getLevel();
    ACTS.curriculumAsk('2'); ACTS.curriculumYes(); out.manualLevel = learn.getLevel();
    ACTS.parentTab('history'); out.levelHistory = text();
    // Synthetic saved mastery represents a future set of evidence sources: test explicit approval only.
    const p = learn.snapshot(); p.curriculumLevel = 1;
    for (const c of LearningCatalog.CAN_DOS.filter(c => c.level === 1 && c.required)) p.canDoProgress[c.id] = { ...learn.getCanDoProgress(c.id), status: 'mastered' };
    localStorage.setItem(LearningEngine.KEY, JSON.stringify(p)); learn.load();
    ACTS.parentTab('growth'); out.approvalShown = !!$('[data-act="approveCurriculum"]'); out.beforeApproval = learn.getLevel();
    ACTS.approveCurriculum(); out.afterApproval = learn.getLevel(); out.approvalRecord = learn.snapshot().levelHistory.at(-1);
    ACTS.parentTab('settings');
    const beforeReset = localStorage.getItem(KEY); ACTS.learningResetYes(); out.resetNeedsConfirm = learn.snapshot().attempts.length > 0;
    ACTS.learningResetAsk(); ACTS.learningResetYes();
    out.learningReset = { attempts: learn.snapshot().attempts.length, level: learn.getLevel(), immersion: learn.isImmersion(), legacySame: localStorage.getItem(KEY) === beforeReset };
    ACTS.level('2'); ACTS.caption('en'); ACTS.capHide('0'); ACTS.ja('0'); ACTS.mic('off'); ACTS.rate('0.7');
    const learningBeforeLegacyReset = localStorage.getItem(LearningEngine.KEY);
    ACTS.resetYes(); out.legacyResetNeedsConfirm = state.stars > 0; ACTS.resetAsk(); ACTS.resetYes();
    out.legacyResetPreservesLearning = localStorage.getItem(LearningEngine.KEY) === learningBeforeLegacyReset;
    out.settings = { level: state.level, caption: state.caption, capHide: state.capHide, showJa: state.showJa, mic: state.mic, rate: state.rate };
    go('home'); go('parent'); out.regated = !view.parentUnlocked && text().includes('大人の方');
    window.__done(out);
  `, { legacy: LEGACY });
  assert.deepEqual(errors, []);
  assert.match(r.gate, /大人の方/); assert.equal(r.blocked, true); assert.equal(r.wrongGate, true);
  assert.match(r.fresh, /まだ学習記録がありません/); assert.match(r.fresh, /未評価/); assert.match(r.fresh, /CEFR認定ではありません/);
  assert.match(r.abilities, /評価対象 0回/);
  assert.equal(r.overlayLegacy, true); assert.deepEqual(r.enCard, { kana: false, ja: false });
  assert.deepEqual(r.enCaption, { kana: false, ja: false, en: true }); assert.equal(r.visibleSupport, 2);
  assert.equal(r.enHint, 'Listen slowly.'); assert.equal(r.enHintSupport, 1);
  assert.equal(r.restoredLegacy, true); assert.equal(r.restoredCard, true); assert.equal(r.jaHintSupport, 2);
  assert.match(r.history, /未回答（評価対象外）/); assert.match(r.history, /ヒントあり/); assert.match(r.history, /発話を確認できませんでした/);
  assert.match(r.growth, /必須項目の習得 0 \/ 3/); assert.match(r.growth, /参加・練習/);
  assert.equal(r.recommendations[0].game, 'mission_listen');
  assert.deepEqual(r.recommendedView, { name: 'mission', mode: 'listen', level: 1 });
  assert.equal(r.beforeApprove, 1); assert.equal(r.noPrematureApprove, 1);
  assert.equal(r.beforeManualConfirm, 1); assert.equal(r.cancelledLevel, 1); assert.equal(r.manualLevel, 2);
  assert.match(r.levelHistory, /保護者が手動で変更/);
  assert.equal(r.approvalShown, true); assert.equal(r.beforeApproval, 1); assert.equal(r.afterApproval, 2);
  assert.equal(r.approvalRecord.reason, 'recommended_approved');
  assert.equal(r.resetNeedsConfirm, true);
  assert.deepEqual(r.learningReset, { attempts: 0, level: 1, immersion: false, legacySame: true });
  assert.deepEqual(r.settings, { level: 2, caption: 'en', capHide: false, showJa: false, mic: 'off', rate: 0.7 });
  assert.equal(r.legacyResetNeedsConfirm, true); assert.equal(r.legacyResetPreservesLearning, true);
  assert.equal(r.regated, true);
});

test('Stage C: dashboard fits narrow portrait and landscape widths', { skip }, () => {
  for (const [width, height] of [[320, 760], [375, 812], [430, 900], [812, 375]]) {
    const { result: r, errors } = runInChrome(String.raw`
      go('parent'); ACTS.parentGate(String(view.gate.answer));
      const out = [];
      for (const name of ['growth', 'abilities', 'history', 'settings']) {
        ACTS.parentTab(name);
        out.push({ name, viewport: innerWidth, content: document.documentElement.scrollWidth,
          buttons: [...document.querySelectorAll('main button')].every(b => b.getBoundingClientRect().height >= 44) });
      }
      window.__done(out);
    `, { legacy: LEGACY, width, height, frameViewport: true });
    assert.deepEqual(errors, []);
    for (const tab of r) {
      assert.equal(tab.viewport, width, 'requested viewport width is used');
      assert.ok(tab.content <= tab.viewport, `${width} ${tab.name} horizontal overflow`);
      assert.equal(tab.buttons, true, `${width} ${tab.name} touch targets`);
    }
  }
});
