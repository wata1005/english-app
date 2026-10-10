# English App Curriculum v1.1

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

| Mode | Records | Can-do / skill | sceneId | Counts as a success only when |
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

Until this content exists, Level 1 cannot be fully assessed (only L1_LI_01 and L1_RE_01 have evidence sources). The parent dashboard must say so plainly.

## UI language policy **[Decided by parent, 2026-10-10]**
- Existing caption settings (`caption`: off / English / English + reading + meaning, `capHide`) and the Japanese hint stay exactly as the family set them. Nothing is changed silently, for existing or new installs.
- A parent-controlled **English-only mode** (`learner-progress-v1.settings.immersion`) is added to the parent screen. When ON **[Draft: Claude Code: exact behaviour]**: captions show English only (no katakana reading, no Japanese meaning), the Japanese meaning hint is replaced by a slow replay, and Japanese word labels on cards are hidden. Turning it OFF restores the family's previous caption and hint settings.
- The Japanese meaning hint stays available when English-only mode is OFF. Using it records `support = 2`, so it never counts as independent evidence.
- Parent UI stays in Japanese.

## Safety and privacy
AI prompts limited to task domain; short replies; no solicitation of names, addresses or private information. No raw child voice retained by default. Browser speech recognition may involve provider servers: require informed parent opt-in for automatic recognition, keep record-only/off modes, and treat ASR failures as unknown. Offer audio-free interaction. Learning data stays on the device (`learner-progress-v1`); no account, no server.

## Acceptance criteria
All existing games, stars, coins, pet, outfits, captions and audio work; no changes to main during specification. Mission progression never requires speech recognition. Each task emits typed evidence with known skill/Can-do. Child can play without reading. Parent can see clearly labeled app-level progress and evidence quality.
