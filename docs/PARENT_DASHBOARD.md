# Parent Dashboard Specification v1.2

> **v1.1 provenance.** **[Decided]** = ChatGPT review / parent decision (2026-10-10). **[Draft: Claude Code]** = detail proposed by Claude Code; needs ChatGPT confirmation.

## Entry and access
Extend existing `VIEWS.parent()` in `src/app.html`; do not remove existing settings. Parent entry protected by an age-appropriate adult gate **[Draft: Claude Code: a simple addition such as 7 + 5 with number buttons; a new question each time]**. It is a convenience, not robust identity verification. Parent content Japanese, child game English-first. Accessible mobile-first 320px+, clear touch targets, readable text and contrast.

## Navigation
Tabs or sections: `成長`, `できるようになったこと`, `学習履歴`, `設定`. Preserve current settings for difficulty (`state.level`), speech rate, mic, caption, caption hiding, Japanese visibility, reset. Add the parent-managed **English-only mode** (see CURRICULUM.md "UI language policy") without silently changing existing choices **[Decided]**.

## Summary screen (`成長`)
- Internal curriculum level `curriculumLevel` (1-4) and name; label `アプリ内学習レベル（CEFR認定ではありません）`.
- Required Can-dos mastered / required total for the current level; percentage only with the denominator visible. Missing evidence marked `未評価`. Can-dos whose evidence source does not exist yet are marked `これから追加される遊びで確認します` **[Draft: Claude Code]**.
- Four skills: listening / speaking / reading / emergent writing, each with assessed Can-do counts, mastery count and evidence quality; do not compare scores across skills as if standardized tests.
- `確認待ち` count (score ≥85 but mastery conditions not yet met), e.g. `聞いてできる：6/8項目（うち1項目は確認待ち）`.
- `最近できるようになったこと` with date, plain-language Can-do, evidence type.
- `次のおすすめ`: 1-2 targets based on due review, engagement and unmet Can-dos, critical Can-dos first. Until Stage D, these are existing game + category pairs (also shown as an `おすすめ` badge on the child's home screen; nothing is locked).
- `復習おすすめ` for mastered critical Can-dos with `needsReview`.
- Week view: active days, approximate engaged minutes, mission counts. Never reward excessive screen time.
- Optional parent observation `家でできた` with provenance `parent_observed`, shown as `保護者が確認`, never as machine verification.

## Level-up **[Decided]**
- When every required Can-do of the current level is mastered, show `次のレベルをおすすめします` with a short explanation and an `承認する` button. The level changes only after the parent approves.
- **[Draft: Claude Code]** A separate `レベルを変更` control lets the parent set the level manually (with a confirmation). Both actions are recorded in `levelHistory` and listed in `学習履歴`.

## Learning history (`学習履歴`) **[Draft: Claude Code]**
- Last 90 days, newest first, grouped by day: game/mission, Can-do in plain Japanese, result, support (`ヒントなし` / `もう一度聞いた` / `ヒントあり` / `答えを見た`), evidence method.
- Older periods appear as monthly totals from aggregates, with a note that detailed records are kept for 90 days.
- Level changes from `levelHistory`.

## Sample copy
`レベル2：Little Communicator / Pre-A1につながる学習`;
`聞いてできる：6/8項目（うち1項目は確認待ち）`;
`話して伝える：2/5項目（音声認識を使わない練習は「参加」として記録）`;
`今日の発見：「青い星を見つけて」と聞いて選べました`.

## Data and privacy
Phase 1: only same-browser, same-origin localStorage; no parent-phone cross-device view, no account. Key `learner-progress-v1` **[Decided]**, separate from legacy `eigo-asobi-v1`, versioned schema and guarded migration. Detailed records for 90 days / 3,000 entries, older records summarised (see LEARNING_ENGINE.md). Export/import JSON only as an optional explicit parent action, with privacy warning and validation. Avoid recording raw audio or transcripts by default; if a transcript is necessary, make retention opt-in and minimize. The clear-progress action must state exactly which records are erased (`学習記録` only) and must not erase stars/coins/pet/outfits; the existing `ほし・コイン・ペットを けす` stays a separate action.

## Edge cases
Fresh install: show `まだ学習記録がありません`, not 0% proficiency. ASR uncertain: `発話を確認できませんでした`, not incorrect. Offline: dashboard remains available. Corrupt/old data: graceful fallback with backup; never destroy legacy progress. Storage full: show `保存容量が足りないため、今日の記録の一部を保存できませんでした` on the dashboard only; the child's game continues. One browser with multiple children: initially single local profile with visible limitation; future profile support requires isolated storage.

## Acceptance tests
1. Existing parent settings still work.
2. Old `eigo-asobi-v1` data loads unchanged.
3. Unassessed skills show `未評価`.
4. A completed but assisted task does not show `習得済み`.
5. Speaking without reliable verification shows `参加・練習`.
6. Level-up appears only when all required Can-dos are mastered and changes only after `承認する`.
7. English-only mode ON/OFF never changes the stored caption/hint settings; after OFF the previous captions and Japanese hint appear exactly as before.
8. Dashboard is usable at 320/375/430px widths, portrait and landscape.
9. Child cannot casually open or erase parent data; adult gate is documented as convenience, not security.
10. Data stays on the device; parent clearly sees this limitation.
