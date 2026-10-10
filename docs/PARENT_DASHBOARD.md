# Parent Dashboard Specification v1

## Entry and access
Extend existing `VIEWS.parent()` in `src/app.html`; do not remove existing settings. Parent entry protected by existing or new age-appropriate adult gate (e.g. simple arithmetic; no guarantee of robust identity verification). Parent content Japanese, child game English-first. Accessible mobile-first 320px+, clear touch targets, readable text and contrast.

## Navigation
Tabs or sections: `成長`, `できるようになったこと`, `学習履歴`, `設定`. Preserve current settings for difficulty (`state.level`), speech rate, mic, caption, hint, Japanese visibility, reset. Add parent-managed immersion mode without silently changing legacy choices.

## Summary screen
- Internal curriculum level `curriculumLevel` (1-4) and name; label `アプリ内学習レベル（CEFR認定ではありません）`.
- Required Can-do mastered / eligible required total; percentage only with denominator visible. Missing evidence marked `未評価`.
- Four skills: listening/speaking/reading/emergent-writing, each with assessed Can-do counts, mastery count and evidence quality; avoid comparing scores across skills as if standardized tests.
- `最近できるようになったこと` with date, plain-language Can-do, evidence type.
- `次のおすすめ`: 1-2 target missions based on due review, engagement and unmet Can-do.
- Week view: active days, approximate engaged minutes, mission counts. Never reward excessive screen time.
- Optional parent observation `家でできた` with provenance `parent_observed`, not automatic verification.

## Sample copy
`レベル2：Little Communicator / Pre-A1につながる学習`;
`聞いてできる：6/8項目（うち1項目は確認待ち）`;
`話して伝える：2/5項目（音声認識を使わない練習は「参加」として記録）`;
`今日の発見：「青い星を見つけて」と聞いて選べました`.

## Data and privacy
Phase 1: only same-browser, same-origin localStorage; no parent-phone cross-device view, no account. Add `learnerProgressV1` separate from legacy `eigo-asobi-v1`, versioned schema and guarded migration. Export/import JSON only as optional explicit parent action, with privacy warning and validation. Avoid recording raw audio or transcripts by default; if transcript is necessary, make retention opt-in and minimize. Clear-progress action must confirm precisely which records are erased and must not silently erase stars/coins/pet.

## Edge cases
Fresh install: show `まだ学習記録がありません`, not 0% proficiency. ASR uncertain: `発話を確認できませんでした`, not incorrect. Offline: dashboard remains available. Corrupt/old data: graceful fallback with backup; never destroy legacy progress. One browser with multiple children: initially single local profile with visible limitation; future profile support requires isolated storage.

## Acceptance tests
1. Existing parent settings still work.
2. Old `eigo-asobi-v1` data loads unchanged.
3. Unassessed skills show `未評価`.
4. A completed but assisted task does not show `習得済み`.
5. Speaking without reliable verification shows `参加・練習`.
6. Dashboard is usable at 320/375/430px widths, portrait and landscape.
7. Child cannot casually open or erase parent data; adult gate is documented as convenience, not security.
8. Data stays on the device; parent clearly sees this limitation.
