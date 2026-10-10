// Stage D mission controller. No network or microphone; spoken output is bundled by tools/build.js.
const missionMode = mode => MissionContent.MODES[mode];
const missionTask = () => view.tasks[view.i];
// The demonstration is not a question: watching or leaving it produces no assessment.
function missionIntroScreen() {
  if (view.mode === 'talk') return `<section class="panel chunky mission"><h2>🐰 まずは おてほん</h2>
    <p>うさぎさんと「こんにちは」を いってみよう。</p><p class="mission-scene">🐰👋 💬 🐻👋</p>
    <p class="mission-model">Hello! 👋</p><p class="note">うさぎさんが Hello! といったら、Hello! と おへんじするよ。こえを ださずに てを ふっても OK。</p>
    <div class="seg"><button data-act="introReplay">🔊 おてほんを もういちど</button><button data-act="introTogether">いっしょに いってみる ▶</button></div>
    <button class="link" data-act="missionHub">おやすみする</button></section>`;
  const o = view.object;
  return `<section class="panel chunky mission"><h2>🧺 まずは おてほん</h2><p>きこえた たべものを、1かい タッチするだけ。</p>
    <p class="mission-scene">🐰🧺</p><p class="note">うさぎさんが りんごを 1かい タッチするよ。</p>
    <div class="mission-options">${view.options.map(x => `<div class="mission-choice chunky intro-demo ${x.id === o.id ? 'intro-cue' : ''}">${x.icon}${x.id === o.id ? '<span class="intro-hand">👆</span>' : ''}</div>`).join('')}</div>
    <div class="mission-input intro-delivery"><span>${o.icon}</span><span>🐰「ありがとう！」</span></div><p class="note">おとなと いっしょに みても だいじょうぶ。</p>
    <div class="seg"><button data-act="introReplay">🔊 おてほんを もういちど</button><button data-act="introTogether">いっしょに やってみる ▶</button></div>
    <button class="link" data-act="missionHub">おやすみする</button></section>`;
}
function showMissionIntro() {
  const object = MissionContent.OBJECTS[0], options = [object, MissionContent.OBJECTS[1]];
  go('mission_intro', { object, options }); Speech.say(object.id);
}
function startMissionIntro(guided = true) {
  const object = guided ? MissionContent.OBJECTS[0] : sample(MissionContent.OBJECTS, 1)[0];
  const other = guided ? MissionContent.OBJECTS[1] : sample(MissionContent.OBJECTS.filter(x => x.id !== object.id), 1)[0];
  logUnanswered();
  view = { name: 'mission', mode: 'listen', level: 1, introCourse: true, guided, i: 0, earned: 0, answered: 0,
    tasks: [{ id: object.id, canDo: guided ? null : 'L1_LI_01', kind: 'intro', guided, prompt: object.id,
      answer: object.id, options: guided ? [object, other] : shuffle([object, other]), icon: '🐰🧺', scene: 'listen:intro', outcome: 'Great helping!' }] };
  setupMissionTask(); render(); window.scrollTo(0, 0); playMissionPrompt(false);
}
function showTalkIntro() {
  go('mission_intro', { mode: 'talk' }); Speech.say('Hello!');
}
function startTalkIntro(guided = true) {
  const t = guided ? MissionContent.TALK[1][0] : MissionContent.TALK[1][1];
  logUnanswered();
  view = { name: 'mission', mode: 'talk', level: 1, introCourse: true, guided, i: 0, earned: 0, answered: 0,
    tasks: [{ ...t, kind: 'observed', guided, canDo: 'L1_SP_01', scene: 'talk:intro',
      instruction: guided ? 'いっしょに：Hello! と おへんじしてみよう。' : 'くまさんが プレゼントを くれたよ。おれいを いってみよう。' }] };
  setupMissionTask();
  if (guided) { view.showModel = true; view.hintLv = 2; }
  render(); window.scrollTo(0, 0); playMissionPrompt(false);
}
function missionRounds(mode, level, readAlone = false) {
  const D = MissionContent;
  const scene = i => i % 2 ? 'garden' : 'picnic';
  const base = (id, canDo, prompt, icon, extra = {}) => ({ id, canDo, prompt, icon, scene: mode, ...extra });
  if (mode === 'listen' || (mode === 'story' && level === 4 && !readAlone)) return shuffle(D.OBJECTS).map((o, i) => {
    const friend = D.FRIENDS[i], place = ['on', 'under', 'in'][i];
    const canDo = level === 1 ? 'L1_LI_02' : level === 2 ? 'L2_LI_01' : level === 3 ? 'L3_LI_01' : 'L4_LI_01';
    const prompt = level === 1 ? `Give the ${o.id} to ${friend.id}.` : level === 2 ? `Put the ${o.id} ${place} the box.`
      : level === 3 ? `Touch the ${o.id}, then touch ${friend.id}.`
      : [`Rabbit is hungry. Bear has an apple. Give the apple to Rabbit.`, `Bear is hungry. Frog has a banana. Give the banana to Bear.`, `Frog is hungry. Rabbit has a carrot. Give the carrot to Frog.`][D.OBJECTS.indexOf(o)];
    const targetFriend = level === 4 ? D.FRIENDS[D.OBJECTS.indexOf(o)].id : friend.id;
    return base(`${o.id}-${level === 2 ? place : targetFriend}`, canDo, prompt, scene(i) === 'garden' ? '🌳🌼' : '🌳🧺', {
      kind: 'action', scene: `${mode}:${scene(i)}`, sequence: [`object:${o.id}`, level === 2 ? `place:${place}` : `friend:${targetFriend}`], spatial: level === 2
    });
  });
  if (mode === 'talk') return sample(D.TALK[level], 3).map(t => base(t.id, t.canDo || 'L1_SP_01', t.prompt, t.icon, { ...t, kind: 'observed', scene: 'talk:routine' }));
  if (mode === 'phonics') {
    if (level === 1) return sample(['m', 's', 'f', 'b', 't', 'p'], 3).map(ch => base(ch, 'L1_RE_01', '#' + ch, '🌱🌷🌱', {
      kind: 'choice', options: shuffle([...shuffle(['m', 's', 'f', 'b', 't', 'p'].filter(x => x !== ch)).slice(0, 2), ch]), answer: ch, scene: 'phonics:letters'
    }));
    if (level === 2) return sample(D.SOUND_WORDS, 3).map(t => base(t.word, 'L2_RE_01', t.word, '🌱🌷🌱', {
      kind: 'choice', options: shuffle(['m', 's', 'f']), answer: t.sound, scene: 'phonics:onsets', intro: 'Listen to the first sound.'
    }));
    return sample(D.WORDS, 3).map(word => base(word, 'L3_RE_01', 'Read it yourself.', '🌱', { kind: 'observed', print: word, model: word, scene: 'phonics:blend' }));
  }
  if (mode === 'story') {
    if (readAlone && level === 4) return D.SENTENCES.map(line => base(line, 'L4_RE_01', 'Read it yourself.', '📖', { kind: 'observed', print: line, model: line, scene: 'story:read_alone' }));
    return shuffle(D.STORIES).map(story => base(story.id, level >= 3 ? 'L3_RE_02' : null, 'Tell the story in order.', '📖', {
      kind: 'story', story, scene: 'story:narrated', page: 0, options: shuffle([0, 1, 2])
    }));
  }
  if (mode === 'message') {
    if (level === 1) return shuffle(D.STAMPS).map(t => base(t.id, 'L1_WR_01', t.prompt, t.icon, { ...t, kind: 'stamp', options: shuffle(['❤️', '🌻', '🎁', '🎂', '👋']), scene: 'message:stamps' }));
    return shuffle(D.OBJECTS).map(o => {
      const article = o.id === 'apple' ? 'an' : 'a';
      const line = level === 2 ? `I want ${article} ${o.id}.` : level === 3 ? `Please give me ${article} ${o.id}.` : `Could you bring ${article} ${o.id} to Rabbit?`;
      return base(o.id, `L${level}_WR_01`, `Rabbit is hungry. Ask for the ${o.id}.`, '🐰' + o.icon, {
        kind: 'tiles', answer: line, model: line, options: shuffle([...line.split(' '), 'Bye!', 'No.']), outcome: `Here is the ${o.id}. Rabbit is happy!`, scene: 'message:phrase_tiles'
      });
    });
  }
  return [];
}
function startMission(mode, readAlone = false, targetLevel = learn.getLevel()) {
  if (!missionMode(mode)) return;
  const level = [1, 2, 3, 4].includes(targetLevel) ? targetLevel : learn.getLevel(), tasks = missionRounds(mode, level, readAlone);
  const v = { name: 'mission', mode, level, tasks, i: 0, earned: 0, answered: 0 };
  // Flush an old question before replacing its evidence with the next mission's fields.
  logUnanswered(); view = v; setupMissionTask(); render(); window.scrollTo(0, 0); playMissionPrompt(false);
}
function missionEvidence(v = view) {
  const t = v.tasks[v.i], skill = t.canDo ? LearningCatalog.BY_ID[t.canDo].skill : 'listening';
  return { canDoIds: t.canDo ? [t.canDo] : [], sceneId: t.scene, promptType: t.kind === 'tiles' ? 'phrase_tiles' : t.kind === 'observed' ? 'meaningful_response' : t.kind,
    method: t.guided ? 'exposure' : t.kind === 'observed' || !t.canDo ? 'self_report' : 'action', skill };
}
function setupMissionTask() {
  const v = view, t = missionTask();
  Object.assign(v, { inputs: [], hintLv: 0, hintText: '', solved: false, firstTry: true, showModel: false, notice: '', storyPage: 0, storyTextVisible: false, fallback: false, gestureOnly: false, observationDone: false, storyReady: t.kind !== 'story' });
  newQuestion(v, 'mission_' + v.mode, 'level' + v.level, t.id, missionEvidence(v));
}
function playMissionPrompt(replay = true) {
  const v = view; if (v.name !== 'mission' || v.finished) return;
  const t = missionTask(); if (replay) markReplay();
  if (t.kind === 'story' && !v.storyReady) Speech.say(t.story.pages[v.storyPage].line);
  else Speech.sayAll([...(t.intro ? [t.intro] : []), t.prompt]);
}
function missionSupport(v = view) {
  const t = v.tasks[v.i];
  return LearningEngine.supportLevel({ replayed: v.ev.replayed, mistakeBefore: v.ev.mistake,
    japaneseHint: v.hintLv >= 1 && effective().japaneseHint,
    answerVisible: v.showModel || (t.kind === 'story' && v.storyTextVisible) || (t.kind !== 'observed' && t.kind !== 'story' && captionShowsAnswer()), answerHighlighted: t.guided || v.hintLv >= 2 || v.showModel });
}
function recordMission({ unanswered = false, firstTry, support } = {}) {
  const v = view, t = missionTask(), evidence = missionEvidence(v);
  const isObserved = t.kind === 'observed';
  const a = {
    id: LearningEngine.newAttemptId(), taskId: `mission_${v.mode}:level${v.level}`, timestamp: new Date().toISOString(), itemId: t.id,
    ...evidence, completed: !unanswered, verified: !unanswered && !isObserved && !!t.canDo,
    firstTry: firstTry === undefined ? !v.ev.mistake : firstTry, support: support === undefined ? missionSupport() : support,
    recognition: 'not_needed', responseLatencyMs: Date.now() - v.ev.start, unanswered
  };
  if (isObserved) { a.canDoIds = []; a.method = 'self_report'; a.verified = false; }
  if (openQuestion && openQuestion.v === v) openQuestion = null;
  learn.recordAttempt(a);
  return a;
}
function completeMissionTask() {
  const v = view, t = missionTask();
  if (v.solved || v.finished) return;
  recordMission(); v.solved = true; v.answered++; v.earned++; addStars(1); sfx.good();
  v.notice = t.outcome || 'Great helping!'; render(); Speech.say(v.notice);
}
function missionPick(arg) {
  const v = view; if (v.name !== 'mission' || v.solved || v.finished) return;
  const t = missionTask();
  if (t.kind === 'observed') return;
  if (t.kind === 'intro') {
    if (!t.options.some(o => o.id === arg)) return;
    if (arg === t.answer) { completeMissionTask(); return; }
    markMistake(v); v.notice = 'もういちど きいてみよう。だいじょうぶ！'; render(); playMissionPrompt(false); return;
  }
  if (t.kind === 'action') {
    const valid = [...MissionContent.OBJECTS.map(o => 'object:' + o.id), ...MissionContent.FRIENDS.map(f => 'friend:' + f.id), ...['on', 'under', 'in'].map(p => 'place:' + p)];
    if (!valid.includes(arg) || (t.spatial && arg.startsWith('friend:')) || (!t.spatial && arg.startsWith('place:'))) return;
    v.inputs.push(arg);
    if (v.inputs.length < t.sequence.length) { render(); return; }
    if (v.inputs.every((x, i) => x === t.sequence[i])) { completeMissionTask(); return; }
  } else if (t.kind === 'choice' || t.kind === 'stamp') {
    if (!t.options.includes(arg)) return;
    if (t.kind === 'stamp' ? t.accepts.includes(arg) : arg === t.answer) { v.inputs = [arg]; completeMissionTask(); return; }
  } else if (t.kind === 'story') {
    if (!v.storyReady || !t.options.includes(Number(arg)) || v.inputs.includes(Number(arg))) return;
    v.inputs.push(Number(arg));
    if (v.inputs.length < 3) { render(); return; }
    if (v.inputs.every((x, i) => x === i)) { completeMissionTask(); return; }
  } else if (t.kind === 'tiles') {
    const k = Number(arg); if (!Number.isInteger(k) || !t.options[k] || v.inputs.includes(k)) return;
    v.inputs.push(k); render(); return;
  }
  markMistake(v); v.firstTry = false; v.inputs = []; v.notice = 'Let us try again.'; sfx.bad(); render(); Speech.say(v.notice);
}
function spatialPicture(place, icon = '🔵') {
  return `<span class="spatial-picture" data-place="${place}"><span class="spatial-box">📦</span><span class="spatial-object">${icon}</span></span>`;
}
function missionHub() {
  const tile = key => { const m = missionMode(key); return `<button class="mode chunky" data-act="missionStart" data-arg="${key}" style="--c:var(--ocean)"><span class="ico">${m.icon}</span><span><span class="m-ja">${m.ja}</span><br><span class="m-en">${m.en}</span>${key === 'listen' ? '<br><small>おてほんつき・2つから えらぶ</small>' : key === 'talk' ? '<br><small>おてほんつき・あいさつ 1つ</small>' : ''}</span></button>`; };
  return `<h2 class="ask">まずは かんたんな あそびから</h2><p class="note">1つできたら おしまいでも OK。いつでも おやすみ できます。</p>
    <nav class="modes" aria-label="ミッションを えらぶ">${['listen', 'talk'].map(tile).join('')}</nav>
    <details class="intro-more"><summary>ほかの あそび</summary><nav class="modes" aria-label="ほかの ミッション">${['phonics', 'story', 'message'].map(tile).join('')}</nav>
      <button class="pill chunky" data-act="missionChallenge">🧺 いつもの おてつだい（3もん）</button><button class="pill chunky" data-act="missionTalkChallenge">🐰 いつもの おしゃべり（3つ）</button>
      ${learn.getLevel() === 4 ? '<button class="pill chunky" data-act="missionRead">📖 じぶんで よむ（おうちの かたと）</button>' : ''}</details>
    <p class="note">おしゃべりと じぶんで よむ あそびは、できた ボタンで さんかを きろくします。おうちの かたが きいて たしかめることも できます。</p>`;
}
function missionScreen() {
  const v = view, m = missionMode(v.mode);
  if (v.finished) return `<section class="panel chunky"><h2>おてつだい ありがとう！</h2><p class="mission-scene">${m.icon}✨🐰</p><p>さんかした おてつだい ${v.answered} / ${v.tasks.length}こ</p><p>⭐ ${v.earned}こ・🪙 ${v.finishCoins}まい</p><div class="seg"><button data-act="home">きょうは おしまい</button>${v.introCourse ? `<button data-act="${v.guided ? 'introSolo' : 'missionChallenge'}">${v.guided ? 'ひとりで やってみる' : v.mode === 'talk' ? 'いつもの おしゃべりへ' : 'いつもの おてつだいへ'}</button>` : ''}<button data-act="missionHub">あそびを えらぶ</button></div></section>`;
  const t = missionTask();
  const button = (value, content, label = value) => `<button class="mission-choice chunky" data-act="missionPick" data-arg="${escapeHtml(value)}" aria-label="${escapeHtml(label)}" ${v.solved ? 'disabled' : ''}>${content}</button>`;
  let body = '';
  if (t.kind === 'intro') body = `<p class="intro-instruction">${t.guided ? 'いっしょに：ひかっている えを タッチ！' : 'ひとりで：きこえた たべものを タッチ！'}</p><div class="mission-options">${t.options.map(o => `<button class="mission-choice chunky ${t.guided && o.id === t.answer ? 'intro-cue' : ''}" data-act="missionPick" data-arg="${o.id}" aria-label="${o.id}" ${v.solved ? 'disabled' : ''}>${o.icon}${t.guided && o.id === t.answer ? '<span class="intro-hand">👆</span>' : ''}</button>`).join('')}</div>`;
  else if (t.kind === 'action') body = `<div class="mission-options">${MissionContent.OBJECTS.map(o => button('object:' + o.id, o.icon, o.id)).join('')}</div>
    <div class="mission-options">${t.spatial ? ['on', 'under', 'in'].map(p => button('place:' + p, spatialPicture(p), p)).join('') : MissionContent.FRIENDS.map(f => button('friend:' + f.id, f.icon, f.id)).join('')}</div>
    <p class="note">ものを タッチ → とどける ばしょを タッチ</p><p class="mission-input">${v.inputs.map(x => x.startsWith('object:') ? MissionContent.OBJECTS.find(o => o.id === x.split(':')[1]).icon : '✓').join(' → ')}</p>`;
  else if (t.kind === 'choice' || t.kind === 'stamp') body = `<div class="mission-options">${t.options.map(o => button(o, escapeHtml(o))).join('')}</div>`;
  else if (t.kind === 'observed') body = `${t.instruction ? `<p class="intro-instruction">${t.instruction}</p>` : ''}${t.print ? `<p class="read-alone">${escapeHtml(t.print)}</p><p class="note">おとを きく まえに、じぶんで よんでみよう。</p>` : ''}
    ${v.introCourse && v.showModel ? `<p class="mission-model">${escapeHtml(t.model)}</p>` : ''}<div class="seg"><button data-act="missionModel" ${v.solved ? 'disabled' : ''}>🔊 おてほんを きく</button><button data-act="missionSaid" ${v.solved ? 'disabled' : ''}>${v.introCourse && v.mode === 'talk' ? 'いえた！' : 'いえた・よめた！'}</button>${v.introCourse && v.mode === 'talk' ? `<button data-act="missionTouchGreeting" ${v.solved ? 'disabled' : ''}>${t.guided ? '👋 てを ふって おへんじ' : '🐻💝 えで おれいを つたえる'}</button>` : `<button data-act="missionFallback" ${v.solved ? 'disabled' : ''}>えを タッチして つたえる</button>`}</div>
    ${v.fallback ? `<button class="mission-choice chunky" data-act="missionSaid">${t.icon || '📖'} 💬</button>` : ''}
    ${v.showModel && !v.introCourse ? `<p class="mission-model">${escapeHtml(t.model)}</p>` : ''}<p class="note">${v.introCourse && v.mode === 'talk' ? 'こえでも、てを ふっても さんかできるよ。' : 'いえた・よめた は さんかの きろく。じょうずさの てんすうは つけないよ。'}</p>`;
  else if (t.kind === 'story') {
    const page = t.story.pages[v.storyPage];
    if (!v.storyReady && effective().caption !== 'off') v.storyTextVisible = true;
    body = !v.storyReady ? `<h3>${escapeHtml(t.story.title)}</h3><p class="mission-scene">${page.icon}</p>${caption({ en: '{w}', kana: '{w}', ja: '{w}', w: { en: page.line, kana: '', ja: '' } }, false)}<button class="pill chunky" data-act="missionPage">${v.storyPage < 2 ? 'つぎの ページ ▶' : 'えを ならべてみよう'}</button>`
      : `<p>おはなしの じゅんばんに タッチ</p><div class="mission-options">${t.options.map(k => button(k, t.story.pages[k].icon, t.story.pages[k].line)).join('')}</div><p class="mission-input">${v.inputs.map(k => t.story.pages[k].icon).join(' → ')}</p>`;
  } else if (t.kind === 'tiles') body = `<p class="mission-input">${v.inputs.map(k => escapeHtml(t.options[k])).join(' ') || '💌 …'}</p>
    <div class="mission-options">${t.options.map((word, k) => `<button class="mission-word chunky" data-act="missionPick" data-arg="${k}" ${v.solved || v.inputs.includes(k) ? 'disabled' : ''}>${escapeHtml(word)}</button>`).join('')}</div>
    <div class="seg"><button data-act="missionUndo" ${v.solved ? 'disabled' : ''}>ひとつ もどす</button><button data-act="missionSend" ${v.solved || !v.inputs.length ? 'disabled' : ''}>💌 とどける</button></div>`;
  const answer = t.kind === 'choice' ? (t.prompt[0] === '#' ? t.prompt.slice(1).toUpperCase() : t.prompt) : t.prompt;
  const line = { en: '{w}', kana: '{w}', ja: '{w}', w: { en: answer, kana: '', ja: '' } };
  return `<section class="panel chunky mission"><h2>${m.icon} ${m.ja}</h2>${progress(v.tasks.length, v.i)}
    <p class="mission-scene" ${t.id === 'run' ? 'data-action="run"' : ''}>${t.place ? spatialPicture(t.place, '🐱') : t.icon}</p>
    <button class="listen chunky" data-act="missionReplay">🔊 もういちど きく</button>
    ${t.kind !== 'story' && t.kind !== 'observed' && (t.kind !== 'intro' || !effective().capHide || v.solved) ? caption(line, effective().capHide && !v.solved) : ''}${body}
    ${v.solved ? `<p class="mission-feedback" role="status">${escapeHtml(v.notice)}</p><div class="seg"><button data-act="missionNext">${v.introCourse ? 'できた！ おしまいへ ▶' : 'つぎへ ▶'}</button>${t.kind === 'observed' && !v.observationDone && !v.gestureOnly ? '<button data-act="missionObserve">おうちの かたが たしかめる</button>' : ''}</div>`
      : `<p role="status">${escapeHtml(v.notice)}</p><div class="seg"><button data-act="missionHint">💡 ヒント</button><button data-act="missionSkip">スキップ</button></div>${v.hintText ? `<p class="hint-box">${escapeHtml(v.hintText)}</p>` : ''}`}
    <button class="link" data-act="missionHub">おやすみする</button></section>`;
}
const missionActions = {
  missionHub: () => go('missions'), missionStart: mode => mode === 'listen' ? showMissionIntro() : mode === 'talk' ? showTalkIntro() : startMission(mode), missionRead: () => startMission('story', true),
  introReplay() { if (view.name === 'mission_intro') Speech.say(view.mode === 'talk' ? 'Hello!' : view.object.id); },
  introTogether() { if (view.name === 'mission_intro') { if (view.mode === 'talk') startTalkIntro(true); else startMissionIntro(true); } },
  introSolo() { if (view.name === 'mission' && view.finished && view.introCourse && view.guided) { if (view.mode === 'talk') startTalkIntro(false); else startMissionIntro(false); } },
  missionChallenge: () => startMission(view.name === 'mission' && view.introCourse ? view.mode : 'listen'),
  missionTalkChallenge: () => startMission('talk'),
  missionTouchGreeting() { if (view.name !== 'mission' || !view.introCourse || view.mode !== 'talk' || view.solved || view.finished) return; view.hintLv = 2; view.gestureOnly = true; completeMissionTask(); },
  missionReplay: () => playMissionPrompt(), missionPick,
  missionHint() {
    if (view.name !== 'mission' || view.solved || view.finished) return;
    const v = view, t = missionTask(); v.hintLv = Math.min(2, v.hintLv + 1); markReplay();
    if (!effective().japaneseHint && v.hintLv === 1) { v.hintText = 'Listen slowly.'; playMissionPrompt(); }
    else { v.hintText = t.kind === 'action' ? t.sequence.map(x => x.split(':')[1]).join(' → ') : t.kind === 'intro' || t.kind === 'choice' ? t.answer : t.kind === 'stamp' ? t.accepts.join(' / ') : t.kind === 'story' ? t.story.pages.map(p => p.icon).join(' → ') : t.model;
      v.hintLv = 2; if (t.model) { v.showModel = true; Speech.say(t.model, true); } }
    render();
  },
  missionModel() { if (view.name !== 'mission' || view.solved || missionTask().kind !== 'observed') return; view.showModel = true; view.hintLv = 2; markReplay(); Speech.say(missionTask().model, true); render(); },
  missionFallback() { if (view.name !== 'mission' || view.solved) return; view.fallback = true; view.hintLv = 2; render(); },
  missionSaid() { if (view.name === 'mission' && missionTask().kind === 'observed') completeMissionTask(); },
  missionUndo() { if (view.name === 'mission' && !view.solved && missionTask().kind === 'tiles') { view.inputs.pop(); render(); } },
  missionSend() {
    if (view.name !== 'mission' || view.solved || missionTask().kind !== 'tiles' || !view.inputs.length) return;
    const t = missionTask(); if (view.inputs.map(k => t.options[k]).join(' ') === t.answer) completeMissionTask();
    else { markMistake(view); view.notice = 'Let us try again.'; render(); Speech.say(view.notice); }
  },
  missionPage() {
    if (view.name !== 'mission' || missionTask().kind !== 'story' || view.storyReady) return;
    if (view.storyPage < 2) { view.storyPage++; render(); playMissionPrompt(false); }
    else { view.storyReady = true; render(); playMissionPrompt(false); }
  },
  missionSkip() { if (view.name !== 'mission' || view.solved || view.finished) return; logUnanswered(); advanceMission(); },
  missionNext() { if (view.name === 'mission' && view.solved && !view.finished) advanceMission(); },
  missionObserve() {
    if (view.name !== 'mission' || !view.solved || view.observationDone || view.gestureOnly || missionTask().kind !== 'observed') return;
    const t = missionTask(), resume = view;
    const observation = { id: LearningEngine.newAttemptId(), taskId: `mission_${view.mode}:level${view.level}`, ...missionEvidence(), itemId: t.id,
      support: missionSupport(), firstTry: !view.ev.mistake, prompt: t.prompt, model: t.model, resume };
    go('parent', { observation });
  }
};
function advanceMission() {
  const v = view; v.i++;
  if (v.i >= v.tasks.length) {
    v.finished = true; v.finishCoins = v.answered ? 5 : 0; state.coins += v.finishCoins; save();
    if (v.answered) learn.recordSession(0, 1);
    render(); return;
  }
  setupMissionTask(); render(); playMissionPrompt(false);
}
function missionObservationPanel() {
  const o = view.observation; if (!o) return '';
  return parentPanel('いっしょに聞いて確認', `<p>${escapeHtml(o.prompt)}</p><p class="note">目的：${escapeHtml(LearningCatalog.BY_ID[o.canDoIds[0]].ja)}。お手本の言い方：${escapeHtml(o.model)}（同じ言葉でなくても意味が合えば構いません）</p>
    <p class="note">実際に聞いた・見た回答だけを記録してください。お手本を聞いた・答えを見た場合は支援ありとして残り、自力の証拠にはなりません。</p>
    <h3>支援はありましたか？</h3>${parentButtons('observationSupport', view.observationSupport, [[0, 'なし'], [1, '問いをもう一度聞いた'], [2, '意味のヒント'], [3, 'お手本・答えを見た']])}
    <h3>最初の回答でできましたか？</h3>${parentButtons('observationFirst', view.observationFirst, [['1', '最初にできた'], ['0', 'やり直してできた']])}
    ${o.canDoIds.includes('L3_RE_01') ? '<p class="note">この語はまだ練習していない語で、お手本の復唱や丸暗記ではなく、音をつないで読めましたか？ 自力で読めた場合だけ下の確認を押してください。</p>' : ''}
    <div class="seg"><button data-act="observationYes" ${view.observationSupport === undefined || view.observationFirst === undefined ? 'disabled' : ''}>意味が伝わった・読めたと確認</button><button data-act="observationCancel">確認せず遊びに戻る</button></div>`);
}
function installMissionParentActions() {
  parentActions.observationSupport = value => { const n = Number(value); if ([0, 1, 2, 3].includes(n)) { view.observationSupport = n; render(); } };
  parentActions.observationFirst = value => { if (['0', '1'].includes(value)) { view.observationFirst = value; render(); } };
  parentActions.observationCancel = () => { if (!view.observation) return; view = view.observation.resume; render(); };
  parentActions.observationYes = () => {
    const o = view.observation; if (!o || view.observationSupport === undefined || view.observationFirst === undefined) return;
    learn.recordAttempt({ id: o.id, taskId: o.taskId, canDoIds: o.canDoIds, itemId: o.itemId, sceneId: o.sceneId, promptType: o.promptType, skill: o.skill,
      timestamp: new Date().toISOString(), completed: true, verified: true, firstTry: o.firstTry && view.observationFirst === '1', support: Math.max(o.support, view.observationSupport),
      method: 'parent_observed', recognition: 'not_needed' });
    const resume = o.resume; resume.observationDone = true; view = resume; render(); toast('保護者が確認した記録を保存しました');
  };
}
installMissionParentActions();
