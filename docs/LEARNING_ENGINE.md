# Learning Engine and Data Contract v1

## Architecture
`src/app.html` is source of truth; `index.html` is generated using `node tools/build.js`. Implement modular logic in separate source files only if the build pipeline can include them reliably. Do not manually edit `index.html` or `audio/`. Add unit tests (Node built-in test runner acceptable if no package manager), then browser regression tests. No runtime AI API key in browser.

## Compatibility
Legacy localStorage `eigo-asobi-v1` remains untouched (stars, coins, pet, learned, level=age/difficulty, mic, captions, cosmetic items). New `learner-progress-v1` key is separate; schema version 1. `curriculumLevel` is distinct from legacy `state.level`. New data written atomically with guarded JSON parse, schema validation and error recovery. Never retroactively convert stars/coins/learned to verified mastery; they can seed interests/exposure only.

## TypeScript-oriented interfaces
```ts
type Skill = 'listening'|'speaking'|'reading'|'writing';
type EvidenceMethod = 'action'|'asr'|'parent_observed'|'self_report'|'exposure';
type Recognition = 'not_needed'|'valid'|'uncertain'|'failed';
type Support = 0|1|2|3; // 0 none, 1 replay, 2 visual hint, 3 demonstration
interface LearningTask {
 id:string; missionId:string; level:1|2|3|4; canDoIds:string[];
 skill:Skill; sceneId:string; inputMode:string[]; responseMode:string[];
 successCriteria:{type:string;params:Record<string,unknown>};
}
interface Attempt {
 id:string; taskId:string; canDoIds:string[]; timestamp:string;
 sceneId:string; completed:boolean; verified:boolean;
 method:EvidenceMethod; recognition:Recognition; support:Support;
 semanticMatch:number|null; recognitionConfidence:number|null;
 responseLatencyMs:number|null;
}
interface CanDoProgress {
 canDoId:string; status:'discovering'|'developing'|'practicing'|'mastery_candidate'|'mastered';
 taskSuccess:number|null; independence:number|null; transfer:number|null; retention:number|null;
 masteryScore:number|null; lastPracticedAt:string|null; nextReviewAt:string|null;
}
interface LearnerProgress {
 schemaVersion:1; curriculumLevel:1|2|3|4; attempts:Attempt[];
 canDoProgress:Record<string,CanDoProgress>;
 sessionSummaries:{date:string;engagedSeconds:number;missionsCompleted:number}[];
}
```

## Scoring
Weights (provisional, not validated psychometrics): Task Success 0.40, Independence 0.25, Transfer 0.20, Retention 0.15. Each component normalized 0..100 from *multiple eligible attempts*. If any component lacks evidence, `masteryScore=null` and status remains non-mastered. Avoid artificially making `unknown` equal to zero. Replays can be counted as practice; supported or self-reported attempts are not independent mastery evidence. Separate skill-specific assessment from generic game reward.

## Suggested evaluation signals
- Task success: verified correct actions / eligible independent trials, with varied distractors.
- Independence: proportion of successful trials with support=0; audio replay support=1 can be treated separately from explicit visual answer hint.
- Transfer: independent success in novel scenes/objects, not same stimulus repeated.
- Retention: independent probe on a later date, e.g. 1/3/7/14 days.
- Mastery candidate: score >=85 with complete component evidence.
- Mastered: >=3 independently verified successful trials across >=2 local calendar dates and >=2 scene IDs, latest probe with support <=1 and no answer-revealing hint. Parent observations can be separately displayed but must not silently satisfy machine-verified criterion.
- Promotion recommendation: >=80% of eligible required Can-dos mastered, critical listening/speaking Can-dos met; never block age-appropriate exploratory play.

## Selection policy
Initial mission mix: 60% comfortable, 25% stretch, 15% due review; adjust by engagement and evidence, not fixed requirements. Reviews initially 1/3/7/14 days, personalized by demonstrated recall. No negative feedback loops, compulsive streaks or punitive locks.

## Event API
`recordAttempt(attempt)` validates task/canDo IDs, deduplicates attempt IDs, appends event, recomputes Can-do evidence, schedules next review and persists. `getDashboardSummary()` returns `{level, skills, requiredMastered, requiredEligible, recentCanDos, dueReviews, weeklyEngagedSeconds}`. `recommendMissions()` filters age-appropriate accessible content. `resetLearningProgress()` must be parent-confirmed and never erase legacy rewards without separate confirmation.

## Speech limitations
Browser ASR may send audio to providers; parent opt-in required. ASR confidence and semanticMatch are different and must not be conflated. Recognition error/timeout -> `recognition='failed'` or `uncertain`, `verified=false`; do not count as a child mistake. Recording/repeating/self-report -> participation evidence only. No default raw voice persistence.

## Test plan
1. Legacy save survives initialization and migration; no changes to `state.level`.
2. Duplicate attempt ignored; invalid IDs rejected; malformed localStorage recovered.
3. Missing component yields `masteryScore=null`.
4. Supported correct attempt increases practice but not independent mastery count.
5. Three same-scene attempts do not satisfy cross-scene mastery.
6. Three attempts same day do not satisfy cross-day mastery.
7. ASR failure never becomes incorrect pronunciation or verified success.
8. Parent reset only clears selected new progress.
9. Build output generated with `node tools/build.js` and no hand edits.
10. Smoke-test all existing game modes, pet, coins, stars, settings and audio.

## Implementation stages
A: introduce schema, Can-do catalog, event recording and tests without UI change. B: wire reliable action evidence in quiz/shopgame/balloon; leave unsupported modes as exposure. C: add parent dashboard, preserve settings. D: new mission content, phonics, interactive books, emergent writing. E: bounded AI dialogue with consent and fallback. Review/approve each stage before merging to main.
