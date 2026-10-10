# English App Curriculum v1.2

> **v1.1 provenance.** **[Decided]** = ChatGPT review / parent decision (2026-10-10). **[Draft: Claude Code]** = detail proposed by Claude Code; needs ChatGPT confirmation.

## Purpose and constraints
For approximately age 4, build meaningful English use through sound, pictures, actions and play. The app levels are *internal*, not CEFR certifications or IELTS scores. IELTS is a distant four-skills motivation, not an assessment for preschoolers. No forced memorization, grammar drills, or English-to-Japanese word matching in the default child experience. Parent-only explanations may be Japanese. Reading/writing are optional and developmentally flexible.

## Existing architecture (2026-10-10)
`src/app.html` is the editable app; `index.html` is generated with embedded audio by `node tools/build.js`. Do not hand-edit generated `index.html` or audio assets. Existing modes: quiz, balloon, mole, memory, shopgame, speak, cards, abc, spell, pet, closet, stickers, parent. `state.level` is age/difficulty (1: 4-5, 2: school age), **not** curriculum level. Existing localStorage key `eigo-asobi-v1` contains stars, coins, learned, pet, cosmetics, captions and microphone preferences. Preserve them. Learning progress is stored separately in `learner-progress-v1` (on-device only).

## Four levels (not age gates)
| Level | Name | CEFR orientation | Observable outcome | Suggested targets, not CEFR standards |
|---|---|---|---|---|
| 1 | Sound Explorer | pre-Pre-A1 foundation | Respond to one-step spoken requests by acting; attend to sounds | 40-60 receptive items, 10-15 actions, 5-8 routines |
| 2 | Little Communicator | Pre-A1 | Request objects, respond to simple questions, follow 1-2 steps | 100-150 receptive items, 15-25 expressions, 2-3 turns |
| 3 | Story Adventurer | Pre-A1 extension | Describe simple ongoing actions and location; sequence stories | 200-300 receptive items, 30-45 expressions, 3-5 turns |
| 4 | World Creator | A1 bridge | Ask and answer about familiar situations; solve a simple task with 2-4 connected utterances | 400-600 receptive items, 50-80 expressions, 5-7 turns |

Numbers are planning hypotheses only. Do not display fixed time-to-completion or infer CEFR qualification. Progress is based on evidence and may differ across skills. Level changes happen only with parent approval (see CAN_DO.md "Level-up recommendation") **[Decided]**.

## Learning design
A mission is a story-world task with meaningful outcome, e.g. help the rabbit find a lost ball. Each mission has 2-5 tasks; each task includes a visual context, spoken prompt, action, feedback, and Can-do ID. Allow replay, skip, hint, nonverbal response and offline fallback. Target 5-10 minutes initially, with parent-configured limits. No punitive streaks, forced completion or unlimited AI chat.

## Existing-game mapping **[Decided: play and proof are recorded separately] [Draft: Claude Code: exact IDs]**
`sceneId` = `game:category` **[Decided]**; `quiz:animals` and `balloon:animals` are different scenes. Every attempt also records `itemId` and `promptType` so that repeating the same question cannot by itself look like transfer.

| Mode | Records | Can-do / skill | sceneId | Independent evidence only when |
|---|---|---|---|---|
| quiz | action evidence | L1_LI_01 | `quiz:<category>` | First selection is correct, answer word hidden in captions, no hint (support per LEARNING_ENGINE table) |
| balloon | action evidence | L1_LI_01 | `balloon:<category of target>` | Correct balloon popped first, no hint |
| pet (feeding) | action evidence | L1_LI_01 | `pet:food` | Correct food chosen first after `I want …` audio, no hint |
| shopgame | action evidence | L2_LI_02 | `shop:food` | Basket matches both quantity and item on the first hand-over, no hint (the spoken order is the only source of the answer) |
| mole (difficulty 2) | action evidence | L1_RE_01 | `mole:letters` | Correct lowercase letter hit first after hearing its name; at difficulty 1 the target letter is shown, so support = 3 (not evidence) |
| speak | participation | speaking | `speak:<category>` | Never a mastery success by itself; `asr` + `valid` may later map to a Stage D speaking task |
| cards | exposure | listening | `cards:<category>` | — |
| abc | exposure | reading | `abc:letters` | — |
| spell | participation | writing | `spell:words` | Tile arrangement ≠ independent writing |
| memory | participation | — | `memory:mixed` | Visual matching; no English input required |

Taps without listening do not prove understanding: random taps that succeed after mistakes are recorded with `firstTry=false` and support ≥1, so they never count as independent.

## New content backlog
1. Listen-and-do: one-step then two-step drag/drop, varied distractors, controlled audio replay.
2. Pretend-play: bakery/vet with 2-3 scripted, bounded exchanges; utterance meaning changes scene; fallback choices.
3. Describe a scene: animated action with prompt `What is happening?`; semantic intent scoring only when reliably supported.
4. Phonics garden: hear and manipulate phonemes; optional grapheme mapping, blending and decodable words. Letter names alone are insufficient.
5. Interactive storybook: narration, highlighting, 1-3 short sentences/page, action-based comprehension. Distinguish listened-to vs independently read.
6. Magic message: stamps -> letter tracing -> phrase tiles -> optional dictated/handwritten message; communicative intent, not handwriting perfection.
7. Greeting routine **[Draft: Claude Code]**: a character greets the child each session (`Hello!`, `Bye!`, `Thank you!`) to give L1_SP_01 a home.

Stage B initially offered evidence only for L1_LI_01 and L1_RE_01. Stage D adds the scripted missions described below; speaking and independent reading still require explicit parent observation. An available evidence source does not by itself establish mastery.

## UI language policy **[Decided by parent, 2026-10-10]**
- Existing caption settings (`caption`: off / English / English + reading + meaning, `capHide`) and the Japanese hint stay exactly as the family set them. Nothing is changed silently, for existing or new installs.
- A parent-controlled **English-only mode** (`learner-progress-v1.settings.immersion`) is added to the parent screen. It is an **overlay** **[Decided]**: it is stored only in `learner-progress-v1` and is applied when the screen is drawn; it never writes to the legacy settings in `eigo-asobi-v1`. Turning it OFF therefore shows exactly the family's previous caption and hint settings, with nothing to restore or lose. When ON **[Draft: Claude Code: exact behaviour]**: captions show English only (no katakana reading, no Japanese meaning), the Japanese meaning hint is replaced by a slow replay, and Japanese word labels on cards are hidden.
- Whichever mode is active, an answer visible in the captions at answer time is recorded with `support >= 2` and is never an independent success **[Decided]** (see LEARNING_ENGINE.md "Support levels").
- The Japanese meaning hint stays available when English-only mode is OFF. Using it records `support = 2`, so it never counts as independent evidence.
- Parent UI stays in Japanese.

## Safety and privacy
AI prompts limited to task domain; short replies; no solicitation of names, addresses or private information. No raw child voice retained by default. Browser speech recognition may involve provider servers: require informed parent opt-in for automatic recognition, keep record-only/off modes, and treat ASR failures as unknown. Offer audio-free interaction. Learning data stays on the device (`learner-progress-v1`); no account, no server.

## Acceptance criteria
All existing games, stars, coins, pet, outfits, captions and audio work; no changes to main during specification. Mission progression never requires speech recognition. Each task emits typed evidence with known skill/Can-do. Child can play without reading. Parent can see clearly labeled app-level progress and evidence quality.

## 段階B 完了範囲（2026-10-10）
既存5ゲームの未回答は参加・出題履歴に残し、正答率・自力度・習得判定・復習予定には影響させない。風船の時間切れ、出題途中の画面・ページ離脱を対象とする。詳細は LEARNING_ENGINE.md「段階B: 未回答」。段階Cと main へのマージは未実施。

## 段階C 完了範囲（2026-10-10）
ユーザーの段階Cへの移行承認により、保護者向けダッシュボード・入場確認・English-only表示を追加。段階Bの未回答ルールを維持する。仕様と実装範囲は PARENT_DASHBOARD.md「段階C 実装」を参照。mainへのマージと段階Dへの移行は未実施。

## 段階D：おはなしミッション（2026-10-10）
ホームに「おはなしミッション」を追加。1回は3つのおてつだい。いつでも休止・スキップでき、発話・自力読みは保護者確認なしでも参加して先へ進める。新規音声はビルド時に埋め込み、端末の音声認識・ネットワーク・APIキーを必要としない。

| 遊び | 内容 | 記録 |
|---|---|---|
| きいておてつだい | 絵を選び、届ける相手／箱の上・下・中をタッチ。レベル3は2つの動作の順序、レベル4は短い状況説明から援助する。ピクニック・庭の2場面 | L1_LI_02 / L2_LI_01 / L3_LI_01 / L4_LI_01 |
| おしゃべりごっこ | あいさつ・品物のお願い・質問への応答・動作／位置の説明・理由・質問。固定された安全な場面と相手の返事 | 子どもの「いえた」は参加。保護者が意味を確認した場合のみ各レベルのSP証拠 |
| おとのおにわ | L1は文字名を聞いて選ぶ。L2は単語を聞いて最初の音に対応するm/s/fを選ぶ。L3以降は絵なしのCVC語を読む | L1_RE_01 / L2_RE_01。L3_RE_01は保護者が自力の読み・音の結合を確認した場合のみ |
| おはなしのもり | 3つのお話を各3ページで聞き、絵の出来事を並べる。L4では短い課題場面と絵なしの自力読みを選べる | L1–2は参加。L3_RE_02は聞いた話の理解であり独立した読解ではない。L4_LI_01、自力読みは保護者確認時のみL4_RE_01 |
| まほうのおてがみ | L1は悲しい友だち／誕生日／別れの状況に合うスタンプを届ける。L2以降は語句を並べて目的に合うお願いを送り、相手が返事をする | L1_WR_01 / L2_WR_01 / L3_WR_01 / L4_WR_01。手書き能力ではなく、スタンプ・語句タイルの意味構成 |

ミッション内容は `src/missions-data.js`、表示・操作・記録は `src/missions.js`。学習レベルに合わせた内容を出し、既存の年齢・難易度設定は変更しない。読み書きは任意の遊びとして常に別入口に置く。レベル変更は引き続き保護者が承認する。

新しい遊びの報酬は完了した回答ごとに星1個、3つの問題を進み終えたときに回答が1つ以上あればコイン5枚。スキップだけの場合は報酬・完了ミッション数を増やさない。自己申告の発話・読みも参加の報酬は得られるが、習得の証拠にはしない。既存ゲームの報酬計算は変更しない。

発話の自由なAI対話・自動意味判定・音声収集は実装しない。単語先頭の音を扱う遊びは単語音声を使い、文字名と音素を同一視しない。自力読みの保護者確認では、未知・未練習の語の音を結合できたか、単語全体の暗記やお手本の復唱ではないかを確認する。段階Eとmainへのマージは未実施。


## 入門コース（2026-10-10）
「きいておてつだい」の通常入口を「おてほん → いっしょに → ひとりで」に変更。操作説明は日本語、英語は apple / banana / carrot の単語音声から始める。お手本では指と食べ物の動きで1回タッチの操作を示す（出題・評価・報酬なし）。いっしょに遊ぶ段階は2択で正しい絵を光らせ、1回タッチで完了する。1問で終了でき、ひとりの挑戦や従来の3問コースへ進むかは子どもが選ぶ。年齢・学習レベル・家族の字幕設定は変更しない。

誘導中の回答は `exposure`・Can-doなし・支援3の練習記録。ひとりの2択は L1_LI_01 の聞いて選ぶ課題であり、L1_LI_02の動作指示の証拠にはしない。字幕・ヒント・誤回答の支援記録と未回答の評価除外を維持する。入門でも正解の参加に星1個、1問終了時にコイン5枚を与えるが、重複操作では増やさない。スキップのみなら報酬なし。

入口は「きいておてつだい」「おしゃべりごっこ」の2つを大きく表示。他の3種類と従来のおてつだい・自力読みは「ほかのあそび」に置く。
