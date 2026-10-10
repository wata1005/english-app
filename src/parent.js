// Stage C parent UI. Loaded before app.html; functions run after the app has initialized.
// Gate state is transient and scoped to one visit. This prevents casual child access, not developer-tool access.
const PARENT_TABS = { growth: '成長', abilities: 'できるようになったこと', history: '学習履歴', settings: '設定' };
const SKILL_NAMES = { listening: '聞いてわかる', speaking: '話して伝える', reading: '読んでわかる', writing: '書いて伝える' };
const STATUS_NAMES = { discovering: '未評価・記録を集めています', developing: '練習中', practicing: '場面を広げて練習中', mastered: '習得済み' };
const GAME_NAMES = { quiz: 'きいてタッチ', balloon: 'ふうせんわり', mole: 'もぐらたたき', shopgame: 'おみせやさん',
  pet: 'ペットのごはん', speak: 'おしゃべり', cards: 'ことばカード', abc: 'ABC', spell: 'もじならべ', memory: 'しんけいすいじゃく' };
const escapeHtml = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const parentDate = ts => Number.isNaN(new Date(ts).getTime()) ? '日時不明' : new Date(ts).toLocaleDateString('ja-JP');
const parentAllowed = () => view.name === 'parent' && view.parentUnlocked === true;
const parentPanel = (title, content) => `<section class="panel chunky"><h2>${title}</h2>${content}</section>`;
const parentButtons = (act, current, choices) => `<div class="seg">${choices.map(([v, text]) => `<button data-act="${act}" data-arg="${v}" aria-pressed="${String(v) === String(current)}">${text}</button>`).join('')}</div>`;

function newParentGate() {
  const a = 6 + Math.floor(Math.random() * 4), b = 3 + Math.floor(Math.random() * 5), answer = a + b;
  view.gate = { a, b, answer, choices: shuffle([answer - 2, answer - 1, answer, answer + 1, answer + 2, answer + 3]) };
}
function parentScreen() {
  if (!parentAllowed()) {
    if (!view.gate) newParentGate();
    const g = view.gate;
    return parentPanel('おうちの方に交代してください', `<p>大人の方が計算の答えを選んでください。</p><p class="gate-sum">${g.a} + ${g.b} = ?</p>
      <div class="seg gate-choices">${g.choices.map(n => `<button data-act="parentGate" data-arg="${n}">${n}</button>`).join('')}</div>
      <p class="note" role="status">${view.gateError || 'この確認は子どもの誤操作を減らすためのもので、本人認証ではありません。'}</p>`);
  }
  const tab = view.parentTab || 'growth';
  const content = tab === 'settings' ? parentSettingsScreen() : tab === 'abilities' ? parentAbilities() : tab === 'history' ? parentHistory() : parentGrowth();
  const summary = learn.getDashboardSummary();
  return `<nav class="seg parent-tabs" aria-label="保護者メニュー">${Object.entries(PARENT_TABS).map(([key, name]) => `<button data-act="parentTab" data-arg="${key}" aria-pressed="${tab === key}">${name}</button>`).join('')}</nav>
    <p class="note">記録はこの端末・このブラウザだけに保存されます。別端末との同期はなく、現在はお子さま1人分です。</p>
    ${summary.storageWarning || learningStorageUnavailable ? '<p class="parent-warning" role="alert">保存容量が足りないか保存機能を利用できないため、今日の記録の一部を保存できませんでした。</p>' : ''}${content}`;
}
function parentGrowth() {
  const s = learn.getDashboardSummary();
  const skills = Object.entries(s.skills).map(([key, v]) => `<article class="skill-card"><h3>${SKILL_NAMES[key]}</h3>
    <p>${v.assessed ? `評価記録あり ${v.assessed} / ${v.total}項目` : '未評価'}</p><p>習得済み ${v.mastered} / ${v.total}項目</p>
    <p class="note">${v.assessable ? `現在の遊びで確認できるのは ${v.assessable}項目です。` : 'これから追加される遊びで確認します。'}</p>
    <p class="note">詳細履歴内の参加・練習 ${v.participation}回${key === 'speaking' ? '（発話の習得を証明する記録ではありません）' : ''}／このレベルの未回答 ${v.unanswered}回</p></article>`).join('');
  const recent = s.recentCanDos.length ? `<ul>${s.recentCanDos.map(c => `<li>${escapeHtml(LearningCatalog.BY_ID[c.canDoId].ja)} <small>${parentDate(c.masteredAt)}・${parentEvidenceSource(c.canDoId)}</small></li>`).join('')}</ul>` : '<p class="note">習得を確認できた項目はまだありません。</p>';
  const needs = s.needsReview.filter(id => { const c = LearningCatalog.BY_ID[id]; return c.critical && learn.getCanDoProgress(id).status === 'mastered'; });
  return parentPanel(`レベル${s.level}：${escapeHtml(s.levelName)}`, `<p class="note">アプリ内学習レベル（CEFR認定ではありません）</p>
    ${s.hasRecords ? `<p>必須項目の習得 ${s.requiredMastered} / ${s.requiredTotal}項目</p>` : '<p>まだ学習記録がありません</p>'}
    <p class="note">記録のない項目は未評価です。現在の遊びだけでは、レベルの必須項目すべてを確認できません。</p>
    <p>確認待ち ${s.confirmPending}項目</p>${s.levelUpRecommended ? '<p>次のレベルをおすすめします。必須項目すべての習得が確認できました。</p><div class="seg"><button data-act="approveCurriculum">承認する</button></div>' : ''}`)
    + parentPanel('4つの力', `<div class="skill-grid">${skills}</div><p class="note">技能間の数値は共通のテストによる比較ではありません。</p>`)
    + parentPanel('最近できるようになったこと', recent)
    + parentPanel('次のおすすめ', parentRecommendations())
    + (needs.length ? parentPanel('復習おすすめ', `<ul>${needs.map(id => `<li>${escapeHtml(LearningCatalog.BY_ID[id].ja)}</li>`).join('')}</ul>`) : '')
    + parentPanel('この7日間', `<p>操作時間を記録できた日 ${s.weeklyActiveDays}日／操作の間から見積もった時間 約${Math.round(s.weeklyEngagedSeconds / 60)}分</p>
      <p class="note">2分以上操作がない間は数えません。正確な利用時間ではありません。ミッションは今後追加予定です。長く遊ぶことを目標にせず、無理なく楽しんでください。</p>`);
}
function parentEvidenceSource(id) {
  const attempts = learn.snapshot().attempts.filter(a => a.canDoIds.includes(id) && !a.unanswered && a.verified);
  if (attempts.some(a => a.method === 'parent_observed')) return '保護者が確認した記録を含みます';
  return '遊びの操作記録';
}
function parentRecommendations() {
  const recs = learn.recommendMissions();
  return recs.length ? `<ul>${recs.map((r, i) => `<li>${escapeHtml(LearningCatalog.BY_ID[r.canDoId].ja)}<br>
    <button class="parent-play" data-act="parentPlay" data-arg="${i}">${GAME_NAMES[r.game]}${CAT[r.category] ? '・' + CAT[r.category].ja : ''}であそぶ</button>
    <small>${r.reason === 'review' ? '復習の時期です' : '無理なく試してみましょう'}</small></li>`).join('')}</ul><p class="note">ホームにもおすすめを表示します。どの遊びも自由に選べます。</p>` : '<p>今のレベルのおすすめはありません。好きな遊びを楽しんでください。</p>';
}
function parentAbilities() {
  const level = view.abilityLevel || learn.getLevel();
  return parentPanel('できるようになったこと', parentButtons('abilityLevel', level, [1, 2, 3, 4].map(n => [n, `レベル${n}`]))
    + '<p class="note">ヒントありの正解や参加だけでは、習得済みにはなりません。読み書きは発達に合わせて取り組む任意の項目を含みます。</p>')
    + LearningCatalog.CAN_DOS.filter(c => c.level === level).map(c => {
      const cp = learn.getCanDoProgress(c.id), ev = learn.getEvidence(c.id);
      const status = cp.status === 'mastered' ? '習得済み' : cp.confirmPending ? '確認待ち' : ev.trials === 0 ? '未評価' : STATUS_NAMES[cp.status];
      const metric = n => n == null ? '未評価' : `${escapeHtml(n)}%`;
      return parentPanel(escapeHtml(c.ja), `<p>${SKILL_NAMES[c.skill]}・${c.required ? '必須項目' : '任意項目'} <strong class="status-pill">${status}</strong></p>
        ${!LearningCatalog.ASSESSABLE.has(c.id) ? '<p class="note">これから追加される遊びで確認します。</p>' : ''}
        <p class="note">評価対象 ${escapeHtml(ev.trials)}回／未回答 ${escapeHtml(ev.unanswered || 0)}回（評価から除外）</p>
        <dl class="metrics"><div><dt>正答率</dt><dd>${metric(cp.taskSuccess)}</dd></div><div><dt>自力度</dt><dd>${metric(cp.independence)}</dd></div><div><dt>場面の広がり</dt><dd>${metric(cp.transfer)}</dd></div><div><dt>覚えていたこと</dt><dd>${metric(cp.retention)}</dd></div></dl>
        <p class="note">記録が足りない指標は未評価です。${cp.masteredAt ? '習得確認 ' + parentDate(cp.masteredAt) + '・' + parentEvidenceSource(c.id) : ''}${cp.nextReviewAt ? '／復習予定 ' + escapeHtml(cp.nextReviewAt) : ''}</p>`);
    }).join('');
}
function parentAttemptResult(a) {
  if (a.unanswered) return '未回答（評価対象外）';
  if (a.recognition === 'failed' || a.recognition === 'uncertain') return '発話を確認できませんでした（評価対象外）';
  if (['exposure', 'self_report'].includes(a.method) || !a.canDoIds.length) return '参加・練習（習得の判定には使いません）';
  return `${a.completed && a.verified ? a.firstTry ? '最初の選択で正解' : 'やり直して正解' : '未達成'}${a.counted ? '' : '（同じ問題の繰り返し・評価対象外）'}`;
}
function parentHistory() {
  const snapshot = learn.snapshot();
  const entries = [
    ...snapshot.attempts.map(a => ({ timestamp: a.timestamp, a })),
    ...snapshot.levelHistory.map(change => ({ timestamp: change.at, change }))
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const limit = view.historyLimit || 30;
  let prev = '', html = '';
  for (const entry of entries.slice(0, limit)) {
    const day = parentDate(entry.timestamp);
    if (day !== prev) { html += `<h3>${day}</h3>`; prev = day; }
    if (entry.change) {
      const c = entry.change;
      html += `<article class="history-entry"><p>学習レベル ${escapeHtml(c.from)} → ${escapeHtml(c.to)}</p><p class="note">${c.reason === 'parent_manual' ? '保護者が手動で変更' : 'おすすめを保護者が承認'}</p></article>`;
      continue;
    }
    const a = entry.a;
    const game = a.taskId.split(':')[0];
    const support = ['ヒントなし', 'もう一度聞いた・やり直した', 'ヒントあり・字幕の答えを見た', '答えを見た'][a.support];
    html += `<article class="history-entry"><p><b>${GAME_NAMES[game] || escapeHtml(game)}</b>・${escapeHtml(a.itemId)}</p>
      <p>${parentAttemptResult(a)}</p><p class="note">${a.canDoIds.map(id => escapeHtml(LearningCatalog.BY_ID[id].ja)).join('／') || '参加・練習'}<br>
      ${a.unanswered ? '支援の評価なし' : support}・${a.method === 'parent_observed' ? '保護者が確認' : a.method === 'self_report' ? '本人の申告' : a.method === 'exposure' ? '英語に触れた記録' : a.method === 'asr' ? '音声認識' : '操作記録'}</p></article>`;
  }
  const months = snapshot.monthlySummaries;
  return parentPanel('学習履歴', `<p class="note">詳細は最大90日・3,000件。容量不足では期間内でも月別に集計します。未回答は成績に含みません。</p>
    ${html || '<p>まだ学習記録がありません</p>'}${entries.length > limit ? '<div class="seg"><button data-act="historyMore">さらに30件を見る</button></div>' : ''}`)
    + parentPanel('月別の集計', months.length ? `<ul>${[...months].reverse().map(m => `<li>${escapeHtml(m.month)}：詳細から集計済み ${escapeHtml(m.attempts)}件（参加・未回答を含む）／操作時間 約${Math.round((m.engagedSeconds || 0) / 60)}分</li>`).join('')}</ul><p class="note">件数は圧縮した履歴の合計です。上の詳細履歴の件数は含みません。時間はその月全体の概算です。</p>` : '<p class="note">月別に集計した記録はまだありません。</p>');
}
function parentSettingsScreen() {
  return parentPanel('学習の設定', `<h3>English-only（英語中心の表示）</h3>${parentButtons('immersion', learn.isImmersion() ? 1 : 0, [[0, 'OFF'], [1, 'ON']])}
    <p class="note">ONでは字幕を英語だけにし、カードの日本語を隠します。日本語の意味ヒントはゆっくりの音声に替わります。下の字幕・日本語設定は保存されたまま、OFFで元に戻ります。操作案内と保護者画面は日本語です。</p>
    <h3>アプリ内学習レベル</h3>${parentButtons('curriculumAsk', learn.getLevel(), [1, 2, 3, 4].map(n => [n, `レベル${n}`]))}
    <p class="note">ゲームの難しさ・年齢設定とは別です。手動変更は習得を意味しません。</p>
    ${view.pendingLevel ? `<p role="status">学習レベルを${view.pendingLevel}に変更しますか？ 変更を履歴に残します。</p><div class="seg"><button data-act="curriculumYes">変更する</button><button data-act="curriculumNo">やめる</button></div>` : ''}
    <h3>学習記録だけを消去</h3><p class="note">評価・参加・未回答の履歴、学習レベル、復習予定、English-only設定を消します。ほし・コイン・ペット・きせかえ・字幕設定は残ります。</p>
    <div class="seg">${view.confirmLearningReset ? '<button class="danger" data-act="learningResetYes">学習記録をすべて消す</button><button data-act="learningResetNo">やめる</button>' : '<button data-act="learningResetAsk">学習記録を消す…</button>'}</div>`)
    + VIEWS.parentSettings();
}
const parentActions = {
  parentGate(arg) {
    if (view.name !== 'parent' || !view.gate) return;
    if (Number(arg) === view.gate.answer) { view.parentUnlocked = true; view.parentTab = 'growth'; flushEngagement(); }
    else { newParentGate(); view.gateError = '答えが違います。新しい計算を試してください。'; }
    render();
  },
  parentTab(arg) { if (!(arg in PARENT_TABS)) return; view.parentTab = arg; view.confirmReset = false; view.confirmLearningReset = false; view.pendingLevel = null; render(); },
  abilityLevel(arg) { if (![1, 2, 3, 4].includes(Number(arg))) return; view.abilityLevel = Number(arg); render(); },
  historyMore() { view.historyLimit = (view.historyLimit || 30) + 30; render(); },
  immersion(arg) { if (!['0', '1'].includes(arg)) return; learn.setImmersion(arg === '1'); render(); },
  curriculumAsk(arg) { const level = Number(arg); if (![1, 2, 3, 4].includes(level) || level === learn.getLevel()) return; view.pendingLevel = level; render(); },
  curriculumNo() { view.pendingLevel = null; render(); },
  curriculumYes() { if (!view.pendingLevel) return; learn.setLevel(view.pendingLevel, 'parent_manual'); view.pendingLevel = null; render(); },
  approveCurriculum() { learn.approveLevelUp(); render(); },
  learningResetAsk() { view.confirmLearningReset = true; render(); },
  learningResetNo() { view.confirmLearningReset = false; render(); },
  learningResetYes() { if (!view.confirmLearningReset) return; learn.resetLearningProgress({ confirm: true }); view.confirmLearningReset = false; render(); toast('学習記録を消しました'); },
  parentPlay(arg) { const r = learn.recommendMissions()[Number(arg)]; if (!r) return; if (r.game === 'quiz') startQuiz(r.category); else ACTS.mode(r.game); }
};
function guardParentActions() {
  const actions = [...Object.keys(parentActions).filter(k => k !== 'parentGate'), 'level', 'rate', 'mic', 'caption', 'capHide', 'ja', 'resetAsk', 'resetNo', 'resetYes'];
  for (const key of actions) {
    const fn = ACTS[key];
    ACTS[key] = (...args) => { if (parentAllowed()) return fn(...args); };
  }
  const reset = ACTS.resetYes;
  ACTS.resetYes = (...args) => { if (view.confirmReset) return reset(...args); };
}
