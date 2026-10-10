# Can-do Catalog v1.1

These are **app-defined**, age-appropriate observable descriptors informed by CEFR's action-oriented approach. They are not official CEFR descriptors and cannot confer CEFR levels.

> **v1.1 provenance.** Decisions marked **[Decided]** come from ChatGPT's review (2026-10-10) or the parent's decisions. Details marked **[Draft: Claude Code]** were filled in by Claude Code to make the decisions implementable and need ChatGPT's confirmation before Stage A is merged.

## IDs and evidence rules
`L{level}_{skill}_{number}` where skill = `LI` listening, `SP` speaking, `RE` reading, `WR` writing. Evidence must include task, timestamp, scene, item, prompt type, support level, verification method, success/uncertainty. Separate exposure, participation, supported completion, independently demonstrated competence and unknown (ASR error). A single success never means mastered.

## Flags
- **required** **[Decided]**: counts toward the level-up recommendation. A level-up is recommended only when **every** required Can-do of the current level is `mastered`.
- **critical** **[Decided]**: a subset of required Can-dos that represent the core communicative ability of the level. **[Draft: Claude Code]** Critical Can-dos are (1) listed first in `次のおすすめ` and review scheduling, (2) highlighted on the parent dashboard, and (3) the only ones for which an overdue failed review is surfaced as `復習おすすめ` on the summary screen.
- Reading and writing Can-dos at Levels 1–2 are **not required** so that promotion never waits on reading/writing maturation **[Draft: Claude Code]**, following the v1 rule "Do not block exploration or story access based on reading/writing maturation".

## Catalog
`Scene alternative` is the explicit substitute for "independent success in ≥2 different scenes" when a Can-do can realistically be practised in only one scene **[Decided: alternatives must be explicit]**. `Evidence source` shows where evidence can come from today (existing games) or later (new missions, Stage D). **[Draft: Claude Code]** for the required/critical assignment of individual rows and the scene alternatives.

| ID | Lv | Can-do | required | critical | Verified when | Scene alternative | Evidence source |
|---|---|---|---|---|---|---|---|
| L1_LI_01 | 1 | Identify a familiar object from English speech | yes | yes | Correct first choice after audio, answer word hidden, distractors from the same category | — (2 scenes required) | quiz, balloon, pet feeding (Stage B) |
| L1_LI_02 | 1 | Follow one spoken action | yes | yes | Correct action with alternative targets | — | Listen-and-do mission (Stage D) |
| L1_SP_01 | 1 | Join an English greeting routine | yes | yes | ASR `valid`, or `parent_observed` (see Speaking evidence) | ≥3 different greeting items (`Hello`, `Bye`, `Thank you`…) in one scene | Greeting routine (Stage D) |
| L1_RE_01 | 1 | Notice spoken word/printed symbol association | no | no | Hears a letter name/sound and chooses the matching printed letter, no visible answer | ≥3 different letters in one scene | mole at difficulty 2 (Stage B); phonics garden (Stage D) |
| L1_WR_01 | 1 | Communicate with a purposeful stamp | no | no | Appropriate stamp chosen and delivered for the situation | ≥3 different situations in one scene | Magic message (Stage D) |
| L2_LI_01 | 2 | Follow location/action instruction | yes | yes | Correct drag/drop with distractors | — | Listen-and-do (Stage D) |
| L2_LI_02 | 2 | Distinguish attributes in spoken requests | yes | no | Correct among colour/size/quantity contrasts | — | shopgame (quantity + object, Stage B); attribute missions (Stage D) |
| L2_SP_01 | 2 | Make a simple request | yes | yes | ASR `valid` with intent match, or `parent_observed` | ≥3 different request items in one scene | Pretend-play (Stage D) |
| L2_SP_02 | 2 | Respond to a familiar question | yes | no | Relevant meaningful response (ASR `valid` or `parent_observed`) | ≥3 different questions in one scene | Pretend-play (Stage D) |
| L2_RE_01 | 2 | Associate common phonemes and graphemes | no | no | Audio-led phonics discrimination | ≥3 different phonemes in one scene | Phonics garden (Stage D) |
| L2_WR_01 | 2 | Make a meaningful short message | no | no | Recipient responds to the meaning of arranged tiles | ≥3 different messages in one scene | Magic message (Stage D) |
| L3_LI_01 | 3 | Follow two connected spoken actions | yes | yes | Correct order without visual answer cues | — | Listen-and-do two-step (Stage D) |
| L3_SP_01 | 3 | Describe an action in a scene | yes | yes | Semantic match to moving scene (ASR `valid` or `parent_observed`) | ≥3 different actions in one scene | Describe a scene (Stage D) |
| L3_SP_02 | 3 | Describe a location | yes | no | Distinguishes under/on/in in context | ≥3 different placements in one scene | Describe a scene (Stage D) |
| L3_RE_01 | 3 | Blend sounds to decode a short word | no | no | Unfamiliar item, no picture shortcut | ≥3 different words in one scene | Phonics garden (Stage D) |
| L3_RE_02 | 3 | Follow a short narrated story | yes | no | Sequences three pictured events (listening comprehension) | ≥2 different stories in one scene | Interactive storybook (Stage D) |
| L3_WR_01 | 3 | Compose a short meaningful phrase | no | no | Appropriate recipient response | ≥3 different phrases in one scene | Magic message (Stage D) |
| L4_LI_01 | 4 | Understand a short task narrative | yes | yes | Correct action in a novel scenario after 2–3 utterances | — | Story missions (Stage D) |
| L4_SP_01 | 4 | Give a simple reason | yes | no | Meaningful reason, not exact repetition | ≥3 different prompts in one scene | Pretend-play (Stage D) |
| L4_SP_02 | 4 | Ask a familiar question | yes | yes | Partner responds to the requested information | ≥3 different questions in one scene | Pretend-play (Stage D) |
| L4_RE_01 | 4 | Read a short decodable sentence | yes | no | Independently reads `The cat is on the mat` (separate from narrated mode) | ≥3 different sentences in one scene | Storybook read-alone mode (Stage D) |
| L4_WR_01 | 4 | Construct a short message with purpose | no | no | Meaning communicated; mode tagged | ≥3 different messages in one scene | Magic message (Stage D) |

## Speaking evidence **[Draft: Claude Code — needs ChatGPT decision]**
Automatic speech recognition is parent opt-in, and many families will keep it off. If required speaking Can-dos accepted only machine-verified speech, those children could never be recommended for level-up. Proposal:
- For `SP` Can-dos, a success counts toward mastery when it is either `method='asr', recognition='valid'` **or** `method='parent_observed'`.
- The dashboard always shows which method each success used (`音声認識で確認` / `保護者が確認`). Parent observations never appear as machine-verified.
- `self_report` (the child's own `いえた!` button) and record-and-compare are **participation** only and never count toward mastery.

## Learning status **[Decided]**
Definitions used below (all **[Draft: Claude Code]** precise wording):
- **Valid success**: `completed && verified` with `method` in {`action`, `asr`, `parent_observed`} (any support level). `exposure` and `self_report` are never valid successes.
- **Independent success**: a valid success with `firstTry === true` **and** `support <= 1` (only audio replay allowed). A success after a mistake has `support >= 1` **[Decided]** and `firstTry === false`, so it is not independent.
- **Counted**: after the de-duplication rule in LEARNING_ENGINE ("Counting rules").

| Status | Boundary condition |
|---|---|
| `discovering` | Fewer than 2 counted valid successes (includes "only exposure so far") |
| `developing` | ≥2 counted valid successes, and the `practicing` condition is not met |
| `practicing` | Counted independent successes in ≥2 distinct `sceneId`s (or the Can-do's scene alternative is met), and the `mastered` condition is not met |
| `mastered` | All mastery conditions below are met. **Sticky**: never revoked by a single failure |

Status is recomputed after every recorded attempt and after compaction. Status can move forward or backward between `discovering`, `developing` and `practicing` only; once `mastered`, it stays `mastered`.

## Mastery conditions **[Decided]**
A Can-do becomes `mastered` when **all** of the following hold:
1. `masteryScore >= 85` (formula in LEARNING_ENGINE).
2. ≥3 counted independent successes.
3. Counted independent successes in ≥2 distinct `sceneId`s — or the explicit scene alternative listed in the catalog.
4. At least one counted independent success whose date is **≥7 calendar days after** the first counted independent success.

When the score is ≥85 but conditions 2–4 are not yet met, the dashboard shows `確認待ち` (this replaces the v1 `mastery_candidate` status, which is now a derived flag `confirmPending`).

### After mastery **[Decided + Draft: Claude Code]**
- Reviews keep being scheduled (see LEARNING_ENGINE).
- If the two most recent review probes of a mastered Can-do both fail, set `needsReview = true`. The status stays `mastered`; the parent sees `復習おすすめ` (critical Can-dos only on the summary, all Can-dos in the detail list). `needsReview` clears on the next independent success.

## Level-up recommendation **[Decided]**
- Shown on the parent dashboard as `次のレベルをおすすめします` when every required Can-do of the current level is `mastered` (critical ⊆ required).
- The level changes **only** when the parent approves. Never automatic.
- **[Draft: Claude Code]** The parent may also change the level manually at any time (for example, a child who already speaks some English). Each change is stored in `levelHistory` with the reason (`recommended_approved` / `parent_manual`).
- Denominators count required Can-dos only; `not_assessed` is shown as `未評価`, never as zero ability. Do not represent internal progress as an IELTS band or CEFR certification.
