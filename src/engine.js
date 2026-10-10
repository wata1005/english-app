// Learning engine: evidence recording, scoring, status, compaction and review scheduling.
// Source: docs/LEARNING_ENGINE.md and docs/CAN_DO.md (spec v1.2, branch spec/curriculum-v1).
// Pure logic, no DOM. Loaded in the browser as the global `LearningEngine` and in Node with require().
// It only ever touches the `learner-progress-v1` key (and its backup); the legacy `eigo-asobi-v1` save is never read or written.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LearningEngine = factory();
})(this, function () {
  'use strict';

  const KEY = 'learner-progress-v1';
  const BACKUP_KEY = 'learner-progress-v1-backup';
  const DAY = 86400000;
  const DEFAULTS = {
    keepDays: 90,          // detailed attempts kept this long
    maxAttempts: 3000,     // and at most this many
    protectHours: 24,      // recent attempts kept even when over the limit, unless that alone exceeds maxAttempts
    emergencyMax: 1000,    // compaction target when storage is full
    compactedIdCap: 2000,  // IDs of folded attempts remembered to reject re-sends (extra safety; see foldedThrough)
    repeatMinutes: 10,     // same Can-do + item + scene + prompt within this window counts once
    setCap: 20,            // distinct scenes/items kept per Can-do aggregate (every threshold is <= 3)
    levelHistoryCap: 50,
    sessionDays: 90,
    months: 24
  };
  const METHODS = ['action', 'asr', 'parent_observed', 'self_report', 'exposure'];
  const SCORING_METHODS = ['action', 'asr', 'parent_observed'];
  const RECOGNITION = ['not_needed', 'valid', 'uncertain', 'failed'];
  const SUPPORT_WEIGHT = [1, 0.75, 0, 0];
  const REVIEW_DAYS = [1, 3, 7, 14];
  const WEIGHTS = { taskSuccess: 0.40, independence: 0.25, transfer: 0.20, retention: 0.15 };
  const MASTERY_SCORE = 85;

  // ---------- dates (local calendar days) ----------
  const pad = n => String(n).padStart(2, '0');
  function dayKey(ts) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  const monthKey = ts => dayKey(ts).slice(0, 7);
  function daysBetween(a, b) { // YYYY-MM-DD strings, b - a in whole days
    const [y1, m1, d1] = a.split('-').map(Number), [y2, m2, d2] = b.split('-').map(Number);
    return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / DAY);
  }
  function addDays(day, n) {
    const [y, m, d] = day.split('-').map(Number);
    const t = new Date(Date.UTC(y, m - 1, d + n));
    return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
  }
  const time = ts => new Date(ts).getTime();

  // ---------- empty records ----------
  function emptyProgress() {
    return {
      schemaVersion: 1, curriculumLevel: 1, attempts: [], aggregates: {}, canDoProgress: {},
      levelHistory: [], sessionSummaries: [], monthlySummaries: [],
      foldedThrough: null,   // latest timestamp folded into aggregates; earlier attempts can no longer be inserted
      boundaryKeys: {},      // repeat key -> time of its last counted success among folded attempts (only near foldedThrough)
      compactedIds: [],      // IDs of the most recently folded attempts (capped)
      settings: { immersion: false }
    };
  }
  function emptyAggregate() {
    return {
      attempts: 0, unanswered: 0, trials: 0, firstTrySuccesses: 0, validSuccesses: 0, independenceWeight: 0,
      independentSuccesses: 0, supportHistogram: [0, 0, 0, 0],
      firstIndependentDate: null, latestIndependentDate: null,
      independentScenes: [], independentItems: [],
      retentionProbes: 0, retentionSuccesses: 0, lastPracticedAt: null
    };
  }
  function emptyCanDoProgress(id) {
    return {
      canDoId: id, status: 'discovering', confirmPending: false, needsReview: false, reviewFails: 0,
      taskSuccess: null, independence: null, transfer: null, retention: null, masteryScore: null,
      masteredAt: null, lastPracticedAt: null, nextReviewAt: null, reviewStep: 0
    };
  }

  // ---------- validation ----------
  const isStr = v => typeof v === 'string' && v.length > 0;
  const isBool = v => typeof v === 'boolean';
  const isNumOrNull = v => v === null || (typeof v === 'number' && isFinite(v));

  function attemptError(a, catalog) {
    if (!a || typeof a !== 'object') return 'attempt must be an object';
    for (const k of ['id', 'taskId', 'timestamp', 'sceneId', 'itemId', 'promptType']) if (!isStr(a[k])) return `${k} is required`;
    if (!/^[a-z][a-z0-9_-]*(:[a-z0-9_.-]+)*$/i.test(a.taskId)) return 'taskId has an invalid format';
    if (isNaN(time(a.timestamp))) return 'timestamp is not a date';
    if (!Array.isArray(a.canDoIds)) return 'canDoIds must be an array';
    for (const id of a.canDoIds) if (!catalog.BY_ID[id]) return `unknown Can-do ${id}`;
    if (!METHODS.includes(a.method)) return 'unknown method';
    if (!RECOGNITION.includes(a.recognition)) return 'unknown recognition';
    if (![0, 1, 2, 3].includes(a.support)) return 'support must be 0-3';
    for (const k of ['completed', 'verified', 'firstTry']) if (!isBool(a[k])) return `${k} must be boolean`;
    if (a.unanswered !== undefined && !isBool(a.unanswered)) return 'unanswered must be boolean';
    if (a.unanswered && (a.completed || a.verified)) return 'an unanswered attempt cannot be completed or verified';
    if (SCORING_METHODS.includes(a.method) && a.canDoIds.length === 0) return 'scoring evidence needs a Can-do';
    if (a.skill != null && !catalog.SKILLS.includes(a.skill)) return 'unknown skill';
    for (const k of ['semanticMatch', 'recognitionConfidence', 'responseLatencyMs']) if (a[k] !== undefined && !isNumOrNull(a[k])) return `${k} must be a number or null`;
    return null;
  }

  // Repairs a stored record; returns null when it is not a usable v1 record.
  function sanitize(p, catalog) {
    if (!p || typeof p !== 'object' || p.schemaVersion !== 1) return null;
    const out = emptyProgress();
    if ([1, 2, 3, 4].includes(p.curriculumLevel)) out.curriculumLevel = p.curriculumLevel;
    if (Array.isArray(p.attempts)) out.attempts = p.attempts.filter(a => !attemptError(a, catalog) && isBool(a.counted));
    for (const key of ['aggregates', 'canDoProgress', 'boundaryKeys']) {
      if (p[key] && typeof p[key] === 'object' && !Array.isArray(p[key])) out[key] = p[key];
    }
    for (const id of Object.keys(out.aggregates)) if (!catalog.BY_ID[id]) delete out.aggregates[id];
    for (const id of Object.keys(out.canDoProgress)) if (!catalog.BY_ID[id]) delete out.canDoProgress[id];
    for (const key of ['levelHistory', 'sessionSummaries', 'monthlySummaries']) if (Array.isArray(p[key])) out[key] = p[key];
    if (Array.isArray(p.compactedIds)) out.compactedIds = p.compactedIds.filter(isStr);
    if (isStr(p.foldedThrough) && !isNaN(time(p.foldedThrough))) out.foldedThrough = p.foldedThrough;
    if (p.settings && typeof p.settings === 'object') out.settings.immersion = p.settings.immersion === true;
    out.attempts.sort((x, y) => time(x.timestamp) - time(y.timestamp));
    return out;
  }

  // ---------- evidence folding (shared by scoring and compaction, so they can never disagree) ----------
  // Unanswered (the child did not respond: a balloon floated away, the child left the screen) is recorded for
  // participation only. It is neither a mistake nor a trial, so it never lowers task success or mastery.
  const isEligible = a => SCORING_METHODS.includes(a.method) && a.recognition !== 'failed' && a.recognition !== 'uncertain' && !a.unanswered;
  const isSuccess = a => a.completed && a.verified;
  const isIndependent = a => isSuccess(a) && a.firstTry && a.support <= 1;
  const addCapped = (arr, v, cap) => { if (!arr.includes(v) && arr.length < cap) arr.push(v); };
  // Repeat key: Can-do(s) + item + scene + prompt. Only successes with the same key can be repeats.
  const keyCache = new WeakMap();
  function repeatKey(a) {
    let k = keyCache.get(a);
    if (k === undefined) { k = [[...a.canDoIds].sort().join(','), a.itemId, a.sceneId, a.promptType].join('|'); keyCache.set(a, k); }
    return k;
  }

  function fold(acc, a, cfg) {
    acc.attempts++;
    if (!acc.lastPracticedAt || time(a.timestamp) > time(acc.lastPracticedAt)) acc.lastPracticedAt = a.timestamp;
    if (a.unanswered) { acc.unanswered = (acc.unanswered || 0) + 1; return acc; }
    if (!isEligible(a)) return acc;
    acc.supportHistogram[a.support]++;
    if (!a.counted) return acc;
    acc.trials++;
    const day = dayKey(a.timestamp), independent = isIndependent(a);
    if (isSuccess(a)) {
      acc.validSuccesses++;
      acc.independenceWeight += SUPPORT_WEIGHT[a.support];
      if (a.firstTry) acc.firstTrySuccesses++;
    }
    // A retention probe is a trial at least 7 days after the first independent success.
    if (acc.firstIndependentDate && daysBetween(acc.firstIndependentDate, day) >= 7) {
      acc.retentionProbes++;
      if (independent) acc.retentionSuccesses++;
    }
    if (independent) {
      acc.independentSuccesses++;
      if (!acc.firstIndependentDate) acc.firstIndependentDate = day;
      if (!acc.latestIndependentDate || day > acc.latestIndependentDate) acc.latestIndependentDate = day;
      addCapped(acc.independentScenes, a.sceneId, cfg.setCap);
      addCapped(acc.independentItems, a.itemId, cfg.setCap);
    }
    return acc;
  }

  const clone = o => JSON.parse(JSON.stringify(o));

  // ---------- scoring ----------
  function metrics(acc, canDo) {
    const pct = (n, d) => (100 * n) / d;
    const taskSuccess = acc.trials >= 3 ? pct(acc.firstTrySuccesses, acc.trials) : null;
    const independence = acc.validSuccesses >= 3 ? pct(acc.independenceWeight, acc.validSuccesses) : null;
    const scenesOk = acc.independentScenes.length >= 2 ||
      (!!canDo.alt && acc.independentItems.length >= canDo.alt.distinctItems);
    const transfer = acc.independentSuccesses === 0 ? null
      : scenesOk ? 100 : acc.independentItems.length >= 2 ? 50 : 0;
    const retention = acc.retentionProbes >= 1 ? pct(acc.retentionSuccesses, acc.retentionProbes) : null;
    const parts = [taskSuccess, independence, transfer, retention];
    const masteryScore = parts.some(v => v === null) ? null : Math.round(
      WEIGHTS.taskSuccess * taskSuccess + WEIGHTS.independence * independence +
      WEIGHTS.transfer * transfer + WEIGHTS.retention * retention);
    const sevenDays = !!(acc.firstIndependentDate && acc.latestIndependentDate &&
      daysBetween(acc.firstIndependentDate, acc.latestIndependentDate) >= 7);
    const conditions = {
      score: masteryScore !== null && masteryScore >= MASTERY_SCORE,
      threeIndependent: acc.independentSuccesses >= 3,
      scenes: scenesOk,
      sevenDays
    };
    const round1 = v => (v === null ? null : Math.round(v * 10) / 10);
    return {
      taskSuccess: round1(taskSuccess), independence: round1(independence), transfer, retention: round1(retention),
      masteryScore, conditions, mastered: Object.values(conditions).every(Boolean)
    };
  }

  // ---------- engine ----------
  function createEngine(opts) {
    const catalog = opts.catalog;
    const storage = opts.storage;
    const now = opts.now || (() => new Date());
    const cfg = { ...DEFAULTS, ...(opts.config || {}) };
    let p = emptyProgress();
    let storageWarning = false;
    let deferred = 0, dirty = false; // batch(): write once at the end
    // In-memory running evidence per Can-do = aggregate + every detailed attempt, folded in time order.
    // Compaction only moves attempts from the list into the aggregate, so this never changes there.
    let live = {};

    function read(key) { try { return storage.getItem(key); } catch (e) { return null; } }
    function write(key, value) { storage.setItem(key, value); }

    function load() {
      const raw = read(KEY);
      storageWarning = false;
      live = {};
      if (raw === null || raw === undefined) { p = emptyProgress(); return api; }
      let parsed = null;
      try { parsed = sanitize(JSON.parse(raw), catalog); } catch (e) { parsed = null; }
      if (!parsed) {
        // Keep the unreadable record so it can be inspected, then start fresh. Legacy data is untouched.
        try { write(BACKUP_KEY, raw); } catch (e) { /* ignore */ }
        p = emptyProgress();
        persist();
        return api;
      }
      p = parsed;
      if (compact(cfg.maxAttempts)) persist();
      return api;
    }

    function persist() {
      if (deferred) { dirty = true; return true; }
      try { write(KEY, JSON.stringify(p)); storageWarning = false; return true; } catch (e) { /* fall through */ }
      // Storage full: shrink the detailed window and retry once; never throw into the game.
      compact(cfg.emergencyMax);
      try { write(KEY, JSON.stringify(p)); storageWarning = false; return true; } catch (e) { storageWarning = true; return false; }
    }

    // Folds attempts that leave the detailed window into the per-Can-do aggregates (lossless for scoring).
    // When over `limit`, trims down to `target` (default 95% of limit) so compaction does not run on every answer.
    function compact(limit, target = Math.floor(limit * 0.95)) {
      const t = time(now());
      const before = p.attempts.length;
      const oldCut = t - cfg.keepDays * DAY, protectCut = t - cfg.protectHours * 3600000;
      let keepFrom = 0;
      const n = p.attempts.length;
      while (keepFrom < n && time(p.attempts[keepFrom].timestamp) < oldCut) keepFrom++;
      if (n - keepFrom > limit) {
        while (n - keepFrom > target && time(p.attempts[keepFrom].timestamp) < protectCut) keepFrom++;
        // Still over the limit with only the protected 24 hours left: the hard limit wins. Repeat detection
        // near the boundary uses boundaryKeys, and folding keeps every scoring input.
        if (n - keepFrom > limit) keepFrom = n - target;
      }
      if (keepFrom === 0) return false;
      const removed = p.attempts.slice(0, keepFrom);
      p.attempts = p.attempts.slice(keepFrom);
      const touched = new Set();
      for (const a of removed) {
        for (const id of a.canDoIds) {
          p.aggregates[id] = fold(p.aggregates[id] || emptyAggregate(), a, cfg);
          touched.add(id);
        }
        addMonthly(a);
        if (isEligible(a) && isSuccess(a) && a.counted) p.boundaryKeys[repeatKey(a)] = time(a.timestamp);
        p.compactedIds.push(a.id);
      }
      p.foldedThrough = removed[removed.length - 1].timestamp;
      // Only keys within the repeat window of the boundary can still affect newer attempts.
      const edge = time(p.foldedThrough) - cfg.repeatMinutes * 60000;
      for (const k of Object.keys(p.boundaryKeys)) if (p.boundaryKeys[k] < edge) delete p.boundaryKeys[k];
      if (p.compactedIds.length > cfg.compactedIdCap) p.compactedIds = p.compactedIds.slice(-cfg.compactedIdCap);
      for (const id of touched) recompute(id);
      trimSummaries();
      return p.attempts.length < before;
    }

    function liveFor(id) {
      if (!live[id]) {
        const acc = clone(p.aggregates[id] || emptyAggregate());
        for (const a of p.attempts) if (a.canDoIds.includes(id)) fold(acc, a, cfg);
        live[id] = acc;
      }
      return live[id];
    }
    const evidenceFor = id => clone(liveFor(id));

    // Recomputes the derived fields. Incremental fields (masteredAt, review state) are kept.
    function recompute(id) {
      const canDo = catalog.BY_ID[id];
      const prev = p.canDoProgress[id] || emptyCanDoProgress(id);
      const acc = liveFor(id);
      const m = metrics(acc, canDo);
      const next = { ...prev, taskSuccess: m.taskSuccess, independence: m.independence, transfer: m.transfer,
        retention: m.retention, masteryScore: m.masteryScore, lastPracticedAt: acc.lastPracticedAt };
      if (prev.status === 'mastered' || m.mastered) {
        next.status = 'mastered';
        if (!next.masteredAt) next.masteredAt = now().toISOString();
      } else if (m.conditions.scenes && acc.independentSuccesses > 0) next.status = 'practicing';
      else if (acc.validSuccesses >= 2) next.status = 'developing';
      else next.status = 'discovering';
      next.confirmPending = next.status !== 'mastered' && m.conditions.score;
      p.canDoProgress[id] = next;
      return next;
    }

    function updateReview(id, a) {
      if (!isEligible(a) || !a.counted) return;
      const cp = p.canDoProgress[id];
      const day = dayKey(a.timestamp);
      if (isIndependent(a)) {
        cp.nextReviewAt = addDays(day, REVIEW_DAYS[cp.reviewStep]);
        cp.reviewStep = Math.min(cp.reviewStep + 1, REVIEW_DAYS.length - 1);
        cp.reviewFails = 0; cp.needsReview = false;
      } else if (!isSuccess(a) || !a.firstTry) {
        // A miss (wrong first answer or not completed). A correct first answer with a hint is neither a pass nor a miss.
        cp.reviewStep = Math.max(cp.reviewStep - 1, 0);
        cp.nextReviewAt = addDays(day, REVIEW_DAYS[0]);
        if (cp.status === 'mastered') {
          cp.reviewFails++;
          if (cp.reviewFails >= 2) cp.needsReview = true;
        }
      }
    }

    function addMonthly(a) {
      const month = monthKey(a.timestamp), day = dayKey(a.timestamp);
      let m = p.monthlySummaries.find(x => x.month === month);
      if (!m) { m = { month, attempts: 0, activeDays: 0, engagedSeconds: 0, lastDay: null }; p.monthlySummaries.push(m); }
      m.attempts++;
      if (m.lastDay !== day) { m.activeDays++; m.lastDay = day; }
    }

    function trimSummaries() {
      const today = dayKey(now());
      p.sessionSummaries = p.sessionSummaries.filter(s => daysBetween(s.date, today) < cfg.sessionDays);
      p.monthlySummaries.sort((a, b) => (a.month < b.month ? -1 : 1));
      if (p.monthlySummaries.length > cfg.months) p.monthlySummaries = p.monthlySummaries.slice(-cfg.months);
      if (p.levelHistory.length > cfg.levelHistoryCap) p.levelHistory = p.levelHistory.slice(-cfg.levelHistoryCap);
    }

    // Re-decides `counted` for every detailed attempt with this repeat key, in time order, starting from the
    // boundary state. This makes the result independent of the order in which attempts arrived.
    function recount(key, incoming) {
      const windowMs = cfg.repeatMinutes * 60000;
      let last = p.boundaryKeys[key] !== undefined ? p.boundaryKeys[key] : -Infinity;
      const changed = new Set();
      for (const x of p.attempts) {
        if (repeatKey(x) !== key) continue;
        let counted = true;
        if (isEligible(x) && isSuccess(x)) {
          const t = time(x.timestamp);
          counted = t - last >= windowMs;
          if (counted) last = t;
        }
        if (x.counted !== counted) {
          x.counted = counted;
          if (x !== incoming) for (const id of x.canDoIds) changed.add(id); // an earlier record's decision changed
        }
      }
      return changed;
    }

    function recordAttempt(input) {
      const err = attemptError(input, catalog);
      if (err) return { ok: false, error: err };
      if (p.attempts.some(x => x.id === input.id) || p.compactedIds.includes(input.id)) return { ok: false, duplicate: true };
      // Attempts at or before the folded boundary can no longer be placed in time order, so they are refused
      // explicitly (e.g. a parent observation dated more than 90 days ago). Re-sends of folded attempts land here too.
      if (p.foldedThrough && time(input.timestamp) <= time(p.foldedThrough)) {
        return { ok: false, error: 'too_old', foldedThrough: p.foldedThrough };
      }
      const a = { semanticMatch: null, recognitionConfidence: null, responseLatencyMs: null, ...input };
      a.canDoIds = [...new Set(a.canDoIds)];
      if (!a.firstTry && a.support < 1) a.support = 1; // a success after a mistake is at least support 1
      a.counted = true;
      // Keep the list sorted by time (attempts normally arrive in order).
      let i = p.attempts.length;
      while (i > 0 && time(p.attempts[i - 1].timestamp) > time(a.timestamp)) i--;
      const appended = i === p.attempts.length;
      p.attempts.splice(i, 0, a);
      // Repeat rule: only the same Can-do + item + scene + prompt within 10 minutes is a repeat.
      const changed = recount(repeatKey(a), a);
      for (const id of a.canDoIds) {
        if (appended && live[id] && !changed.has(id)) fold(live[id], a, cfg);
        else delete live[id]; // out of order or a recount changed: rebuild in time order on next use
      }
      for (const id of changed) delete live[id];
      const results = {};
      for (const id of new Set([...a.canDoIds, ...changed])) recompute(id);
      for (const id of a.canDoIds) {
        // Review scheduling moves forward only with the newest attempt; back-dated records still count as evidence.
        if (appended) updateReview(id, a);
        results[id] = { ...p.canDoProgress[id] };
      }
      if (p.attempts.length > cfg.maxAttempts || (p.attempts[0] && time(p.attempts[0].timestamp) < time(now()) - cfg.keepDays * DAY)) {
        compact(cfg.maxAttempts);
      }
      persist();
      return { ok: true, counted: a.counted, progress: results };
    }

    function recordSession(seconds, missionsCompleted = 0) {
      const ts = now(), date = dayKey(ts), month = monthKey(ts);
      let s = p.sessionSummaries.find(x => x.date === date);
      if (!s) { s = { date, engagedSeconds: 0, missionsCompleted: 0 }; p.sessionSummaries.push(s); }
      s.engagedSeconds += Math.max(0, Math.round(seconds)); s.missionsCompleted += missionsCompleted;
      let m = p.monthlySummaries.find(x => x.month === month);
      if (!m) { m = { month, attempts: 0, activeDays: 0, engagedSeconds: 0, lastDay: null }; p.monthlySummaries.push(m); }
      m.engagedSeconds += Math.max(0, Math.round(seconds));
      trimSummaries();
      persist();
    }

    const levelCanDos = level => catalog.CAN_DOS.filter(c => c.level === level);
    const progressOf = id => p.canDoProgress[id] || emptyCanDoProgress(id);

    function levelUpRecommended() {
      const req = levelCanDos(p.curriculumLevel).filter(c => c.required);
      return p.curriculumLevel < 4 && req.length > 0 && req.every(c => progressOf(c.id).status === 'mastered');
    }

    function setLevel(level, reason) {
      if (![1, 2, 3, 4].includes(level)) return { ok: false, error: 'level must be 1-4' };
      if (!['recommended_approved', 'parent_manual'].includes(reason)) return { ok: false, error: 'unknown reason' };
      if (level === p.curriculumLevel) return { ok: true, changed: false };
      p.levelHistory.push({ at: now().toISOString(), from: p.curriculumLevel, to: level, reason });
      p.curriculumLevel = level;
      trimSummaries();
      persist();
      return { ok: true, changed: true };
    }

    function approveLevelUp() {
      if (!levelUpRecommended()) return { ok: false, error: 'level-up is not recommended yet' };
      return setLevel(p.curriculumLevel + 1, 'recommended_approved');
    }

    function getDashboardSummary() {
      const level = p.curriculumLevel, items = levelCanDos(level), today = dayKey(now());
      const skills = {};
      for (const skill of catalog.SKILLS) {
        const list = items.filter(c => c.skill === skill);
        skills[skill] = {
          total: list.length,
          assessed: list.filter(c => evidenceFor(c.id).trials > 0).length,
          mastered: list.filter(c => progressOf(c.id).status === 'mastered').length,
          assessable: list.filter(c => catalog.ASSESSABLE.has(c.id)).length,
          // Practice that is recorded but never counts as mastery (exposure, self-report, record-and-compare).
          participation: p.attempts.filter(a => a.skill === skill && !SCORING_METHODS.includes(a.method)).length,
          unanswered: list.reduce((n, c) => n + (liveFor(c.id).unanswered || 0), 0)
        };
      }
      const required = items.filter(c => c.required);
      const all = catalog.CAN_DOS.map(c => progressOf(c.id));
      const weekAgo = addDays(today, -6);
      return {
        level, levelName: catalog.LEVELS[level].name,
        skills,
        requiredMastered: required.filter(c => progressOf(c.id).status === 'mastered').length,
        requiredTotal: required.length,
        confirmPending: all.filter(c => c.confirmPending).length,
        recentCanDos: all.filter(c => c.masteredAt).sort((a, b) => (a.masteredAt < b.masteredAt ? 1 : -1)).slice(0, 5)
          .map(c => ({ canDoId: c.canDoId, masteredAt: c.masteredAt })),
        dueReviews: all.filter(c => c.nextReviewAt && c.nextReviewAt <= today).map(c => c.canDoId),
        needsReview: all.filter(c => c.needsReview).map(c => c.canDoId),
        weeklyActiveDays: p.sessionSummaries.filter(s => s.date >= weekAgo && s.date <= today && (s.engagedSeconds > 0 || s.missionsCompleted > 0)).length,
        weeklyMissionsCompleted: p.sessionSummaries.filter(s => s.date >= weekAgo && s.date <= today).reduce((n, s) => n + s.missionsCompleted, 0),
        weeklyEngagedSeconds: p.sessionSummaries.filter(s => s.date >= weekAgo && s.date <= today).reduce((n, s) => n + s.engagedSeconds, 0),
        levelUpRecommended: levelUpRecommended(),
        hasRecords: p.attempts.length > 0 || Object.keys(p.aggregates).length > 0,
        storageWarning
      };
    }

    // Until Stage D adds missions: 1-2 existing games that collect evidence for unmet Can-dos.
    function recommendMissions() {
      const today = dayKey(now());
      const order = { discovering: 0, developing: 1, practicing: 2, mastered: 3 };
      const targets = catalog.CAN_DOS
        .filter(c => c.level <= p.curriculumLevel && catalog.ASSESSABLE.has(c.id))
        .map(c => ({ c, cp: progressOf(c.id) }))
        .filter(({ cp }) => cp.status !== 'mastered' || (cp.nextReviewAt && cp.nextReviewAt <= today))
        .sort((x, y) => {
          const due = v => (v.cp.nextReviewAt && v.cp.nextReviewAt <= today ? 0 : 1);
          return due(x) - due(y) || (y.c.critical - x.c.critical) || (order[x.cp.status] - order[y.cp.status]);
        });
      const out = [];
      for (const { c, cp } of targets) {
        const reason = cp.nextReviewAt && cp.nextReviewAt <= today ? 'review' : cp.status === 'discovering' ? 'new' : 'practice';
        for (const [game, g] of Object.entries(catalog.GAMES)) {
          if (['action', 'parent_observed'].includes(g.evidence) && g.canDoIds.includes(c.id) && !out.some(o => o.game === game)) {
            out.push({ game, level: c.level, category: game === 'quiz' ? 'animals' : game === 'mole' ? 'letters' : 'food', canDoId: c.id, reason });
            break;
          }
        }
        if (out.length >= 2) break;
      }
      return out;
    }

    function resetLearningProgress(options) {
      if (!options || options.confirm !== true) return { ok: false, error: 'parent confirmation required' };
      try { storage.removeItem(KEY); } catch (e) { /* ignore */ }
      p = emptyProgress();
      live = {};
      storageWarning = false;
      return { ok: true };
    }

    function setImmersion(on) { p.settings.immersion = on === true; persist(); }

    function batch(fn) {
      deferred++;
      try { return fn(); } finally {
        deferred--;
        if (!deferred && dirty) { dirty = false; persist(); }
      }
    }

    const api = {
      load, recordAttempt, recordSession, batch, getDashboardSummary, recommendMissions,
      approveLevelUp, setLevel, resetLearningProgress, setImmersion,
      levelUpRecommended,
      getCanDoProgress: id => ({ ...progressOf(id) }),
      getEvidence: id => evidenceFor(id),
      getLevel: () => p.curriculumLevel,
      isImmersion: () => p.settings.immersion,
      compact: (limit = cfg.maxAttempts) => { const r = compact(limit); persist(); return r; },
      snapshot: () => clone(p)
    };
    return api.load();
  }

  // English-only mode is an overlay: it reads the legacy settings and never writes them.
  function effectiveSettings(legacy, immersion) {
    if (!immersion) return { caption: legacy.caption, capHide: legacy.capHide, showJa: legacy.showJa, japaneseHint: true };
    return { caption: legacy.caption === 'off' ? 'off' : 'en', capHide: legacy.capHide, showJa: false, japaneseHint: false };
  }

  // Support level from what was on screen when the child answered (LEARNING_ENGINE "Support levels").
  function supportLevel({ replayed = false, mistakeBefore = false, japaneseHint = false, answerVisible = false, answerHighlighted = false }) {
    if (answerHighlighted) return 3;
    if (japaneseHint || answerVisible) return 2;
    if (replayed || mistakeBefore) return 1;
    return 0;
  }

  function newAttemptId() { return `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`; }

  return Object.freeze({
    KEY, BACKUP_KEY, DEFAULTS, createEngine, effectiveSettings, supportLevel, newAttemptId,
    _internal: { dayKey, daysBetween, addDays, fold, metrics, emptyAggregate, sanitize, attemptError }
  });
});
