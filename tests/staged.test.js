const test = require('node:test');
const assert = require('node:assert/strict');
const { runInChrome, hasChrome } = require('./helpers/chrome.js');
const D = require('../src/missions-data.js');
const C = require('../src/catalog.js');
const skip = !hasChrome && 'Chrome not found';

test('Stage D: all scripted prompts, models and story audio are bundled', () => {
  const fs = require('fs');
  for (const line of D.phrases()) {
    const key = line[0] === '#' ? 'L_' + line[1] : line.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    assert.ok(fs.existsSync(require('path').join(__dirname, '../audio', key + '.m4a')), line);
  }
  assert.equal(C.ASSESSABLE.size, 22);
});

test('Stage D: action, story, message, speaking and read-alone evidence', { skip }, () => {
  const { result: r, errors } = runInChrome(String.raw`
    Speech.say = () => {}; Speech.sayAll = () => {}; state.capHide = true; state.caption = 'off';
    const out = {}, attempts = () => learn.snapshot().attempts;
    const reset = () => { go('home'); learn.resetLearningProgress({ confirm: true }); };
    const start = (mode, level, read = false) => { learn.setLevel(level, 'parent_manual'); startMission(mode, read); };
    const correct = () => {
      const t = missionTask();
      if (t.kind === 'action') t.sequence.forEach(x => ACTS.missionPick(x));
      if (t.kind === 'choice') ACTS.missionPick(t.answer);
      if (t.kind === 'stamp') ACTS.missionPick(t.accepts[0]);
      if (t.kind === 'tiles') { for (const w of t.answer.split(' ')) ACTS.missionPick(String(t.options.findIndex((x, i) => x === w && !view.inputs.includes(i)))); ACTS.missionSend(); }
      if (t.kind === 'story') { ACTS.missionPage(); ACTS.missionPage(); ACTS.missionPage(); [0,1,2].forEach(x => ACTS.missionPick(String(x))); }
      if (t.kind === 'observed') ACTS.missionSaid();
    };
    for (const mode of Object.keys(MissionContent.MODES)) for (const level of [1,2,3,4]) {
      reset(); start(mode, level); correct();
      out[mode + level] = attempts().at(-1); out[mode + level + 'Solved'] = view.solved;
    }
    reset(); start('listen', 1); ACTS.missionPick('friend:bear'); ACTS.missionPick('object:apple'); correct(); out.mistake = attempts().at(-1);
    reset(); start('listen', 1); ACTS.missionHint(); correct(); out.hint = attempts().at(-1);
    reset(); start('listen', 1); ACTS.missionSkip(); out.skip = attempts(); go('home'); out.leave = attempts();
    reset(); start('listen', 1); startShop(); out.directLeave = attempts();
    reset(); start('talk', 1); ACTS.missionModel(); correct(); out.modeled = attempts().at(-1);
    ACTS.missionObserve(); out.beforeGate = attempts().length; ACTS.observationYes(); out.blocked = attempts().length;
    ACTS.parentGate(String(view.gate.answer)); ACTS.observationSupport('0'); ACTS.observationFirst('1'); ACTS.observationYes();
    out.observedModel = attempts().at(-1); out.resume = view.name; ACTS.missionObserve(); out.noDuplicate = attempts().length;
    reset(); start('talk', 1); correct(); ACTS.missionObserve(); ACTS.parentGate(String(view.gate.answer));
    ACTS.observationSupport('0'); ACTS.observationFirst('1'); ACTS.observationYes(); out.observedIndependent = attempts().at(-1);
    reset(); start('story', 4, true); out.noReadingPicture = !document.querySelector('.read-alone').textContent.includes('🐱'); correct();
    out.readSelf = attempts().at(-1); ACTS.missionObserve(); ACTS.parentGate(String(view.gate.answer)); ACTS.observationSupport('0'); ACTS.observationFirst('1'); ACTS.observationYes(); out.readObserved = attempts().at(-1);
    reset(); state.caption = 'full'; start('story', 3); correct(); out.narratedText = attempts().at(-1);
    reset(); state.caption = 'off'; start('story', 3); ACTS.missionPage(); ACTS.missionPage(); ACTS.missionPage();
    [2,1,0].forEach(k => ACTS.missionPick(String(k))); correct(); out.storyMistake = attempts().at(-1);
    reset(); start('message', 2); ACTS.missionPick(String(missionTask().options.indexOf('No.'))); ACTS.missionSend(); ACTS.missionUndo(); correct(); out.messageMistake = attempts().at(-1);
    reset(); start('listen', 1); const coins = state.coins, stars = state.stars;
    for (let i = 0; i < 3; i++) { correct(); ACTS.missionNext(); }
    out.finished = view.finished; out.coins = state.coins - coins; out.stars = state.stars - stars; ACTS.missionNext(); out.coinsAfter = state.coins - coins;
    out.missionCount = learn.getDashboardSummary().weeklyMissionsCompleted;
    reset(); start('listen', 1); const before = state.coins; for (let i = 0; i < 3; i++) ACTS.missionSkip(); out.skipCoins = state.coins - before;
    // Generated content only offers known IDs and never auto-verifies observed tasks.
    out.ids = [];
    for (const mode of Object.keys(MissionContent.MODES)) for (const level of [1,2,3,4]) for (const t of missionRounds(mode, level)) if (t.canDo) out.ids.push(t.canDo);
    window.__done(out);
  `, { budgetMs: 4000 });
  assert.deepEqual(errors, []);
  for (const mode of Object.keys(D.MODES)) for (const level of [1,2,3,4]) {
    const a = r[mode + level]; assert.equal(r[mode + level + 'Solved'], true, mode + level);
    assert.ok(a && a.completed, mode + level);
    if (mode === 'talk' || mode === 'phonics' && level >= 3) { assert.equal(a.verified, false); assert.deepEqual(a.canDoIds, []); }
    else if (mode === 'story' && level <= 2) { assert.equal(a.verified, false); assert.deepEqual(a.canDoIds, []); }
    else assert.equal(a.verified, true, mode + level);
  }
  assert.equal(r.listen1.canDoIds[0], 'L1_LI_02'); assert.equal(r.listen2.canDoIds[0], 'L2_LI_01'); assert.equal(r.listen3.canDoIds[0], 'L3_LI_01'); assert.equal(r.listen4.canDoIds[0], 'L4_LI_01');
  assert.equal(r.phonics2.canDoIds[0], 'L2_RE_01'); assert.equal(r.story3.canDoIds[0], 'L3_RE_02');
  assert.equal(r.message4.canDoIds[0], 'L4_WR_01');
  assert.equal(r.mistake.firstTry, false); assert.ok(r.hint.support >= 2);
  assert.equal(r.skip.length, 1); assert.equal(r.skip[0].unanswered, true); assert.equal(r.leave.length, 2); assert.equal(r.directLeave[0].unanswered, true);
  assert.equal(r.beforeGate, r.blocked); assert.equal(r.observedModel.method, 'parent_observed'); assert.equal(r.observedModel.support, 3);
  assert.equal(r.resume, 'mission'); assert.equal(r.noDuplicate, 2);
  assert.equal(r.observedIndependent.canDoIds[0], 'L1_SP_01'); assert.equal(r.observedIndependent.support, 0);
  assert.equal(r.readSelf.verified, false); assert.equal(r.readObserved.canDoIds[0], 'L4_RE_01'); assert.equal(r.readObserved.method, 'parent_observed'); assert.equal(r.noReadingPicture, true);
  assert.equal(r.narratedText.support, 2); assert.equal(r.storyMistake.firstTry, false); assert.equal(r.messageMistake.firstTry, false);
  assert.equal(r.finished, true); assert.equal(r.coins, 5); assert.equal(r.coinsAfter, 5); assert.equal(r.stars, 3); assert.equal(r.missionCount, 1); assert.equal(r.skipCoins, 0);
  for (const id of r.ids) assert.ok(C.BY_ID[id], id);
});

test('Stage D: every mission level fits mobile and landscape viewports', { skip }, () => {
  for (const [width, height] of [[320, 760], [375, 812], [430, 900], [812, 375]]) {
    const { result, errors } = runInChrome(String.raw`
      Speech.say = () => {}; Speech.sayAll = () => {};
      const out = [];
      const check = name => out.push({ name, width: innerWidth, scroll: document.documentElement.scrollWidth,
        targets: [...document.querySelectorAll('main button:not(.link)')].filter(b => b.getClientRects().length).every(b => b.getBoundingClientRect().height >= 44),
        separateActions: name !== 'expandedHub' || [...document.querySelectorAll('.mission-continue button')].every((b, i, all) => !i || b.getBoundingClientRect().top - all[i - 1].getBoundingClientRect().bottom >= 16) });
      go('missions'); check('hub'); document.querySelector('details').open = true; check('expandedHub');
      showMissionIntro(); check('introDemo'); startMissionIntro(true); check('introGuided'); startMissionIntro(false); check('introSolo');
      showTalkIntro(); check('talkDemo'); startTalkIntro(true); check('talkGuided'); startTalkIntro(false); check('talkSolo');
      for (const level of [1,2,3,4]) {
        learn.setLevel(level, 'parent_manual');
        for (const mode of Object.keys(MissionContent.MODES)) { startMission(mode); check(mode + level); }
      }
      startMission('story', true); check('readAlone');
      window.__done(out);
    `, { width, height, frameViewport: true });
    assert.deepEqual(errors, []);
    for (const item of result) {
      assert.equal(item.width, width);
      assert.ok(item.scroll <= width, width + ' ' + item.name);
      assert.equal(item.targets, true, width + ' ' + item.name + ' touch targets');
      assert.equal(item.separateActions, true, width + ' ' + item.name + ' separated actions');
    }
  }
});


test('Beginner course: demo, one-tap practice, optional solo, leaving and rewards', { skip }, () => {
  const { result: r, errors } = runInChrome(String.raw`
    Speech.say = () => {}; Speech.sayAll = () => {}; state.caption = 'off';
    const out = {}, attempts = () => learn.snapshot().attempts;
    ACTS.missionStart('listen'); out.demo = view.name; go('home'); out.demoAttempts = attempts().length;
    showMissionIntro(); ACTS.introTogether();
    out.guidedChoices = document.querySelectorAll('[data-act="missionPick"]').length;
    out.cue = !!document.querySelector('button.intro-cue');
    const stars = state.stars, coins = state.coins;
    ACTS.missionPick(missionTask().answer); ACTS.missionPick(missionTask().answer);
    out.guided = attempts().at(-1); out.guidedStars = state.stars - stars;
    ACTS.missionNext(); ACTS.missionNext(); out.finished = view.finished; out.guidedCoins = state.coins - coins;
    out.optionalSolo = !!document.querySelector('[data-act="introSolo"]');
    ACTS.introSolo(); out.soloChoices = document.querySelectorAll('[data-act="missionPick"]').length;
    out.soloNoCue = !document.querySelector('button.intro-cue'); ACTS.missionPick(missionTask().answer); out.solo = attempts().at(-1);
    ACTS.missionNext(); ACTS.missionChallenge(); out.normal = { mode: view.mode, count: view.tasks.length, level: view.level };
    go('home'); startMissionIntro(true); go('home'); out.leave = attempts().at(-1);
    startMissionIntro(false); const t = missionTask(); ACTS.missionPick(t.options.find(o => o.id !== t.answer).id);
    out.retry = !view.solved && document.querySelector('main').textContent.includes('だいじょうぶ'); ACTS.missionPick(t.answer); out.wrong = attempts().at(-1);
    startMissionIntro(false); ACTS.missionHint(); ACTS.missionPick(missionTask().answer); out.hinted = attempts().at(-1);
    startMissionIntro(true); const before = state.coins; ACTS.missionSkip(); out.skipped = attempts().at(-1); out.skipCoins = state.coins - before;
    window.__done(out);
  `);
  assert.deepEqual(errors, []);
  assert.equal(r.demo, 'mission_intro'); assert.equal(r.demoAttempts, 0);
  assert.equal(r.guidedChoices, 2); assert.equal(r.cue, true);
  assert.equal(r.guided.method, 'exposure'); assert.equal(r.guided.verified, false); assert.deepEqual(r.guided.canDoIds, []); assert.equal(r.guided.support, 3);
  assert.equal(r.guidedStars, 1); assert.equal(r.finished, true); assert.equal(r.guidedCoins, 5); assert.equal(r.optionalSolo, true);
  assert.equal(r.soloChoices, 2); assert.equal(r.soloNoCue, true); assert.deepEqual(r.solo.canDoIds, ['L1_LI_01']); assert.equal(r.solo.verified, true); assert.equal(r.solo.support, 0);
  assert.deepEqual(r.normal, { mode: 'listen', count: 3, level: 1 });
  assert.equal(r.leave.unanswered, true); assert.deepEqual(r.leave.canDoIds, []); assert.equal(r.leave.support, 3);
  assert.equal(r.retry, true); assert.equal(r.wrong.firstTry, false); assert.ok(r.hinted.support >= 2);
  assert.equal(r.skipped.unanswered, true); assert.equal(r.skipCoins, 0);
});


test('Talking beginner: model, optional one-greeting practice, gesture and parent verification', { skip }, () => {
  const { result: r, errors } = runInChrome(String.raw`
    Speech.say = () => {}; Speech.sayAll = () => {};
    const out = {}, attempts = () => learn.snapshot().attempts;
    const confirm = () => { ACTS.missionObserve(); ACTS.parentGate(String(view.gate.answer)); ACTS.observationSupport('0'); ACTS.observationFirst('1'); ACTS.observationYes(); };
    ACTS.missionStart('talk'); out.demo = view.name; out.demoText = document.querySelector('main').textContent;
    ACTS.introReplay(); go('home'); out.noDemoEvidence = attempts().length === 0;
    showTalkIntro(); ACTS.introTogether(); out.guided = { mode: view.mode, count: view.tasks.length, model: view.showModel, support: missionSupport() };
    const stars = state.stars, coins = state.coins; ACTS.missionSaid(); ACTS.missionSaid(); out.self = attempts().at(-1); out.stars = state.stars - stars;
    confirm(); out.confirmedModel = attempts().at(-1); ACTS.missionNext(); ACTS.missionNext(); out.coins = state.coins - coins;
    out.finish = view.finished && !!document.querySelector('[data-act="introSolo"]') && !!document.querySelector('[data-act="home"]');
    ACTS.introSolo(); out.solo = { mode: view.mode, count: view.tasks.length, model: view.showModel, prompt: missionTask().prompt };
    ACTS.missionSaid(); out.soloSelf = attempts().at(-1); confirm(); out.soloConfirmed = attempts().at(-1);
    ACTS.missionNext(); ACTS.missionChallenge(); out.challenge = { mode: view.mode, count: view.tasks.length };
    go('home'); startTalkIntro(false); ACTS.missionTouchGreeting(); ACTS.missionTouchGreeting(); out.gesture = attempts().at(-1); const gestureCount = attempts().length; ACTS.missionObserve(); out.gestureNoObservation = view.name === 'mission' && attempts().length === gestureCount && !document.querySelector('[data-act="missionObserve"]');
    startTalkIntro(true); go('home'); out.leave = attempts().at(-1);
    startTalkIntro(true); const before = state.coins; ACTS.missionSkip(); out.skipCoins = state.coins - before; out.skip = attempts().at(-1);
    window.__done(out);
  `);
  assert.deepEqual(errors, []);
  assert.equal(r.demo, 'mission_intro'); assert.match(r.demoText, /Hello!/); assert.equal(r.noDemoEvidence, true);
  assert.deepEqual(r.guided, { mode: 'talk', count: 1, model: true, support: 3 });
  assert.equal(r.self.verified, false); assert.deepEqual(r.self.canDoIds, []); assert.equal(r.self.method, 'self_report'); assert.equal(r.self.support, 3);
  assert.equal(r.confirmedModel.support, 3); assert.equal(r.stars, 1); assert.equal(r.coins, 5); assert.equal(r.finish, true);
  assert.deepEqual(r.solo, { mode: 'talk', count: 1, model: false, prompt: 'Here you are!' });
  assert.equal(r.soloSelf.verified, false); assert.equal(r.soloConfirmed.method, 'parent_observed'); assert.equal(r.soloConfirmed.support, 0); assert.deepEqual(r.soloConfirmed.canDoIds, ['L1_SP_01']);
  assert.deepEqual(r.challenge, { mode: 'talk', count: 3 });
  assert.equal(r.gesture.verified, false); assert.deepEqual(r.gesture.canDoIds, []); assert.equal(r.gesture.support, 3); assert.equal(r.gestureNoObservation, true);
  assert.equal(r.leave.unanswered, true); assert.equal(r.leave.support, 3); assert.equal(r.skip.unanswered, true); assert.equal(r.skipCoins, 0);
});
