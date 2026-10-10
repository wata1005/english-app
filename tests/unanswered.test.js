const test = require('node:test');
const assert = require('node:assert/strict');
const { runInChrome, hasChrome } = require('./helpers/chrome.js');

test('Stage B browser: unanswered transitions, timeout, lifecycle and rewards', { skip: !hasChrome && 'Chrome not found' }, () => {
  const { result: r, errors } = runInChrome(String.raw`
    Speech.say = () => {}; Speech.sayAll = () => {};
    state.stars = 20; state.level = 1; state.caption = 'full'; state.capHide = true;
    const out = {};
    const attempts = () => learn.snapshot().attempts;
    const reset = () => { go('home'); learn.resetLearningProgress({ confirm: true }); };
    for (const [name, start] of [['quiz', () => startQuiz('animals')], ['balloon', startBalloon], ['mole', startMole], ['shop', startShop], ['pet', () => { state.pet = { day: '', meals: 0, hearts: 0 }; openPet(); }]]) {
      reset(); start(); render(); ACTS.hint();
      out[name + 'Before'] = attempts().length;
      go('home'); render(); window.dispatchEvent(new Event('pagehide'));
      out[name] = attempts();
    }
    reset(); startQuiz('food'); startShop();
    out.directShop = attempts();
    state.pet = { day: '', meals: 0, hearts: 0 }; openPet();
    out.directPet = attempts();
    reset(); startShop(); ACTS.tobasket('0'); ACTS.unbasket('0'); render();
    out.basket = attempts().length;
    reset(); startQuiz('animals');
    const q = view.round[0], k = q.options.indexOf(q.answer);
    ACTS.pick(String(k), $$('.opt')[k]); go('home');
    out.answered = attempts();
    reset(); startQuiz('animals');
    window.dispatchEvent(new Event('pagehide')); window.dispatchEvent(new Event('pagehide'));
    out.pagehide = attempts().length;
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })); go('home');
    out.restored = attempts().length;
    reset(); startBalloon();
    const v = view, target = v.words[0];
    const stars = state.stars;
    // Drive the real animation callback with an escaped target, retaining the real timeout branch.
    const realRAF = window.requestAnimationFrame;
    let step; window.requestAnimationFrame = fn => { step = fn; };
    balloonLoop(v);
    v.balloons.find(b => b.w === target).y = -10000;
    step(performance.now() + 100);
    out.timeout = attempts(); out.timeoutStars = state.stars - stars;
    window.requestAnimationFrame = realRAF;
    setTimeout(() => {
      out.retrySame = view.words[0] === target;
      out.retryFirstTryReward = view.firstTry;
      const j = view.balloons.findIndex(b => b.w === target);
      ACTS.popB(String(j), view.balloons[j].el);
      out.retry = attempts(); out.retryStars = state.stars - stars;
      go('home'); out.afterCorrectLeave = attempts().length;
      window.__done(out);
    }, 1650);
  `, { budgetMs: 4000 });
  assert.deepEqual(errors, []);
  for (const name of ['quiz', 'balloon', 'mole', 'shop', 'pet']) {
    assert.equal(r[name + 'Before'], 0, name);
    assert.equal(r[name].length, 1, name);
    assert.equal(r[name][0].unanswered, true, name);
    assert.equal(r[name][0].completed, false, name);
    assert.equal(r[name][0].verified, false, name);
  }
  assert.equal(r.directShop.length, 1); assert.equal(r.directShop[0].taskId, 'quiz:food');
  assert.equal(r.directPet.length, 2); assert.equal(r.directPet[1].taskId, 'shopgame:food');
  assert.equal(r.basket, 0);
  assert.equal(r.answered.length, 1); assert.equal(r.answered[0].verified, true);
  assert.equal(r.pagehide, 1); assert.equal(r.restored, 2);
  assert.equal(r.timeout.length, 1); assert.equal(r.timeout[0].unanswered, true);
  assert.equal(r.timeoutStars, 0); assert.equal(r.retryStars, 0);
  assert.equal(r.retrySame, true); assert.equal(r.retryFirstTryReward, false);
  assert.equal(r.retry.length, 2); assert.equal(r.retry[1].firstTry, true);
  assert.equal(r.retry[1].support, 0); assert.equal(r.afterCorrectLeave, 2);
});
