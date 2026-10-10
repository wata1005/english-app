// Can-do catalog and the mapping from existing games to Can-dos.
// Source: docs/CAN_DO.md and docs/CURRICULUM.md (spec v1.2, branch spec/curriculum-v1).
// Loaded in the browser as the global `LearningCatalog` and in Node with require().
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LearningCatalog = factory();
})(this, function () {
  'use strict';

  const LEVELS = {
    1: { name: 'Sound Explorer', cefr: 'pre-Pre-A1' },
    2: { name: 'Little Communicator', cefr: 'Pre-A1' },
    3: { name: 'Story Adventurer', cefr: 'Pre-A1 extension' },
    4: { name: 'World Creator', cefr: 'A1 bridge' }
  };

  const SKILLS = ['listening', 'speaking', 'reading', 'writing'];
  const SKILL_CODE = { LI: 'listening', SP: 'speaking', RE: 'reading', WR: 'writing' };

  // alt: the explicit substitute for "independent success in >=2 scenes" (CAN_DO.md "Scene alternative").
  // ja: plain-language description for the parent screen.
  const CAN_DOS = [
    { id: 'L1_LI_01', required: true, critical: true, alt: null, ja: '英語を聞いて、身近なものを選べる' },
    { id: 'L1_LI_02', required: true, critical: true, alt: null, ja: '英語の指示を聞いて、1つの動作ができる' },
    { id: 'L1_SP_01', required: true, critical: true, alt: { distinctItems: 3 }, ja: '英語のあいさつに参加できる' },
    { id: 'L1_RE_01', required: false, critical: false, alt: { distinctItems: 3 }, ja: '聞いた音と文字を結びつけられる' },
    { id: 'L1_WR_01', required: false, critical: false, alt: { distinctItems: 3 }, ja: 'スタンプで気持ちを伝えられる' },
    { id: 'L2_LI_01', required: true, critical: true, alt: null, ja: '場所や動作の指示を聞いて、そのとおりに動かせる' },
    { id: 'L2_LI_02', required: true, critical: false, alt: null, ja: '色・大きさ・数のちがいを聞き分けられる' },
    { id: 'L2_SP_01', required: true, critical: true, alt: { distinctItems: 3 }, ja: 'かんたんなお願いを英語で言える' },
    { id: 'L2_SP_02', required: true, critical: false, alt: { distinctItems: 3 }, ja: 'よく知っている質問に英語で答えられる' },
    { id: 'L2_RE_01', required: false, critical: false, alt: { distinctItems: 3 }, ja: 'よく使う音と文字を結びつけられる' },
    { id: 'L2_WR_01', required: false, critical: false, alt: { distinctItems: 3 }, ja: '短いメッセージを組み立てて伝えられる' },
    { id: 'L3_LI_01', required: true, critical: true, alt: null, ja: '2つ続けた指示を聞いて、順番どおりにできる' },
    { id: 'L3_SP_01', required: true, critical: true, alt: { distinctItems: 3 }, ja: '場面の動きを英語で説明できる' },
    { id: 'L3_SP_02', required: true, critical: false, alt: { distinctItems: 3 }, ja: 'ものの場所を英語で説明できる' },
    { id: 'L3_RE_01', required: false, critical: false, alt: { distinctItems: 3 }, ja: '音をつなげて短い単語を読める' },
    { id: 'L3_RE_02', required: true, critical: false, alt: { distinctItems: 2 }, ja: '短いお話を聞いて、順番を理解できる' },
    { id: 'L3_WR_01', required: false, critical: false, alt: { distinctItems: 3 }, ja: '短いフレーズを組み立てて伝えられる' },
    { id: 'L4_LI_01', required: true, critical: true, alt: null, ja: '短いお話の流れを聞いて、何をするか判断できる' },
    { id: 'L4_SP_01', required: true, critical: false, alt: { distinctItems: 3 }, ja: 'かんたんな理由を英語で言える' },
    { id: 'L4_SP_02', required: true, critical: true, alt: { distinctItems: 3 }, ja: 'よく知っている質問を英語でたずねられる' },
    { id: 'L4_RE_01', required: true, critical: false, alt: { distinctItems: 3 }, ja: '短い文を自分で読める' },
    { id: 'L4_WR_01', required: false, critical: false, alt: { distinctItems: 3 }, ja: '目的に合った短いメッセージを作れる' }
  ].map(c => {
    const m = /^L([1-4])_(LI|SP|RE|WR)_\d{2}$/.exec(c.id);
    return Object.freeze({ ...c, level: Number(m[1]), skill: SKILL_CODE[m[2]] });
  });

  const BY_ID = Object.fromEntries(CAN_DOS.map(c => [c.id, c]));

  // Existing games (CURRICULUM.md "Existing-game mapping").
  // evidence: 'action' = can prove a Can-do; 'participation' / 'exposure' = never a mastery success.
  // Wiring into the games happens in Stage B; Stage A only defines the contract.
  const GAMES = {
    quiz: { evidence: 'action', canDoIds: ['L1_LI_01'], skill: 'listening', scene: c => `quiz:${c}`,
      promptType: c => (c === 'colors' ? 'which_one' : c === 'numbers' ? 'find' : 'where_is') },
    balloon: { evidence: 'action', canDoIds: ['L1_LI_01'], skill: 'listening', scene: c => `balloon:${c}`, promptType: () => 'pop_the' },
    pet: { evidence: 'action', canDoIds: ['L1_LI_01'], skill: 'listening', scene: () => 'pet:food', promptType: () => 'want' },
    shopgame: { evidence: 'action', canDoIds: ['L2_LI_02'], skill: 'listening', scene: () => 'shop:food', promptType: () => 'order' },
    // Only difficulty 2 is evidence; at difficulty 1 the target letter is shown (support 3).
    mole: { evidence: 'action', canDoIds: ['L1_RE_01'], skill: 'reading', scene: () => 'mole:letters', promptType: () => 'letter_name' },
    speak: { evidence: 'participation', canDoIds: [], skill: 'speaking', scene: c => `speak:${c}`, promptType: () => 'say_word' },
    cards: { evidence: 'exposure', canDoIds: [], skill: 'listening', scene: c => `cards:${c}`, promptType: () => 'listen' },
    abc: { evidence: 'exposure', canDoIds: [], skill: 'reading', scene: () => 'abc:letters', promptType: () => 'letter' },
    spell: { evidence: 'participation', canDoIds: [], skill: 'writing', scene: () => 'spell:words', promptType: () => 'arrange' },
    memory: { evidence: 'participation', canDoIds: [], skill: null, scene: () => 'memory:mixed', promptType: () => 'match' }
  };

  // Which Can-dos currently have a place to collect evidence (used to explain "not assessable yet").
  const ASSESSABLE = new Set(Object.values(GAMES).flatMap(g => (g.evidence === 'action' ? g.canDoIds : [])));

  return Object.freeze({ LEVELS, SKILLS, CAN_DOS, BY_ID, GAMES, ASSESSABLE });
});
