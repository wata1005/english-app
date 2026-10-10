# English App Curriculum v1

## Purpose and constraints
For approximately age 4, build meaningful English use through sound, pictures, actions and play. The app levels are *internal*, not CEFR certifications or IELTS scores. IELTS is a distant four-skills motivation, not an assessment for preschoolers. No forced memorization, grammar drills, or English-to-Japanese word matching in the default child experience. Parent-only explanations may be Japanese. Reading/writing are optional and developmentally flexible.

## Existing architecture (2026-10-10)
`src/app.html` is the editable app; `index.html` is generated with embedded audio by `node tools/build.js`. Do not hand-edit generated `index.html` or audio assets. Existing modes: quiz, balloon, mole, memory, shopgame, speak, cards, abc, spell, pet, closet, stickers, parent. `state.level` is age/difficulty (1: 4-5, 2: school age), **not** curriculum level. Existing localStorage key `eigo-asobi-v1` contains stars, coins, learned, pet, cosmetics, captions and microphone preferences. Preserve them.

## Four levels (not age gates)
| Level | Name | CEFR orientation | Observable outcome | Suggested targets, not CEFR standards |
|---|---|---|---|---|
| 1 | Sound Explorer | pre-Pre-A1 foundation | Respond to one-step spoken requests by acting; attend to sounds | 40-60 receptive items, 10-15 actions, 5-8 routines |
| 2 | Little Communicator | Pre-A1 | Request objects, respond to simple questions, follow 1-2 steps | 100-150 receptive items, 15-25 expressions, 2-3 turns |
| 3 | Story Adventurer | Pre-A1 extension | Describe simple ongoing actions and location; sequence stories | 200-300 receptive items, 30-45 expressions, 3-5 turns |
| 4 | World Creator | A1 bridge | Ask and answer about familiar situations; solve a simple task with 2-4 connected utterances | 400-600 receptive items, 50-80 expressions, 5-7 turns |

Numbers are planning hypotheses only. Do not display fixed time-to-completion or infer CEFR qualification. Progress is based on evidence and may differ across skills.

## Learning design
A mission is a story-world task with meaningful outcome, e.g. help the rabbit find a lost ball. Each mission has 2-5 tasks; each task includes a visual context, spoken prompt, action, feedback, and Can-do ID. Allow replay, skip, hint, nonverbal response and offline fallback. Target 5-10 minutes initially, with parent-configured limits. No punitive streaks, forced completion or unlimited AI chat.

## Existing-game mapping
| Mode | Candidate evidence | Caveat |
|---|---|---|
| quiz | listening: distinguish referents | Avoid unique-target shortcuts; log distractors |
| balloon / mole | listening discrimination and response | Taps without listening do not prove understanding |
| shopgame | quantities, requests, directions | Existing mode mostly tests listening; do not claim independent speech |
| speak | speaking participation | Recorded self-comparison or manual `I said it` is **participation**, not verified speaking mastery; ASR uncertain |
| cards | exposure and listening practice | Card viewed does not prove receptive mastery |
| abc | print awareness | Alphabet-name recognition != phoneme decoding |
| spell | letter ordering | Tile arrangement != independent writing |
| pet | situated listening and requesting | Existing selection does not prove spontaneous speech |
| memory | visual matching | Do not award English skill evidence unless English input is required |

## New content backlog
1. Listen-and-do: one-step then two-step drag/drop, varied distractors, controlled audio replay.
2. Pretend-play: bakery/vet with 2-3 scripted, bounded AI exchanges; utterance meaning changes scene; fallback choices.
3. Describe a scene: animated action with prompt `What is happening?`; semantic intent scoring only when reliably supported.
4. Phonics garden: hear and manipulate phonemes; optional grapheme mapping, blending and decodable words. Letter names alone are insufficient.
5. Interactive storybook: narration, highlighting, 1-3 short sentences/page, action-based comprehension. Distinguish listened-to vs independently read.
6. Magic message: stamps -> letter tracing -> phrase tiles -> optional dictated/handwritten message; communicative intent, not handwriting perfection.

## UI language policy
Default child mode: English audio + imagery + age-appropriate icon controls, optional English captions; no Japanese word-for-word gloss or katakana pronunciations. Existing caption/full and Japanese hint features remain available as parent-controlled legacy assistance; migration must preserve settings, but new learning mode defaults to immersion for *new profiles*. Avoid overwriting current user choices. Parent UI in Japanese.

## Safety and privacy
AI prompts limited to task domain; short replies; no solicitation of names, addresses or private information. No raw child voice retained by default. Browser speech recognition may involve provider servers: require informed parent opt-in for automatic recognition, keep record-only/off modes, and treat ASR failures as unknown. Offer audio-free interaction.

## Acceptance criteria
All existing games, stars, coins, pet, outfits, captions and audio work; no changes to main during specification. Mission progression never requires speech recognition. Each task emits typed evidence with known skill/Can-do. Child can play without reading. Parent can see clearly labeled app-level progress and evidence quality.
