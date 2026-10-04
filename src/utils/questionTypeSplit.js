// Question-type mix for a test (Step 4 of the Tests Manager wizard): how many MCQ / MSQ / NAT /
// Match questions the auto-selection should contain, the presets that fill it in, and the plan that
// fits that mix into the topic x mark allocations of Step 3.
//
// The allocations are "cells" ({ count, questions }: one per topic x mark). Whether a mix can be met
// is a max-flow question - cells -> types, each cell giving at most `count` questions and at most the
// number of questions of a type it actually has.

export const QUESTION_TYPES = [
  { key: 'MCQ', label: 'Single Choice (MCQ)' },
  { key: 'MSQ', label: 'Multiple Select (MSQ)' },
  { key: 'NAT', label: 'Fill in Blank (NAT)' },
  { key: 'Match', label: 'Match the Following' },
];
export const TYPE_KEYS = QUESTION_TYPES.map(t => t.key);

export const TYPE_PRESETS = [
  { key: 'equal', label: 'Equal 25% Split', icon: '🎯' },
  { key: 'nextBest', label: 'Next Best Equal Split', icon: '⚡' },
  { key: 'pool', label: 'Match Pool Ratio', icon: '📊' },
];
export const presetLabel = (key) => TYPE_PRESETS.find(p => p.key === key)?.label || 'Custom';

const TYPE_BY_NAME = {
  'single choice': 'MCQ',
  'mcq': 'MCQ',
  'multiple choice': 'MSQ',
  'multiple select': 'MSQ',
  'msq': 'MSQ',
  'fill in blanks': 'NAT',
  'fill in the blanks': 'NAT',
  'numerical answer type': 'NAT',
  'numerical / fill in the blanks': 'NAT',
  'nat': 'NAT',
  'match': 'Match',
  'match the following': 'Match',
};

// A question with no / an unknown type is single choice - that's how the rest of the app shows it
export const questionTypeKey = (q) => TYPE_BY_NAME[String(q?.questionType || '').trim().toLowerCase()] || 'MCQ';

const zero = () => Object.fromEntries(TYPE_KEYS.map(k => [k, 0]));
const num = (v) => parseInt(v) || 0;
export const sumCounts = (counts) => TYPE_KEYS.reduce((a, k) => a + num(counts?.[k]), 0);

export const typeCountsOf = (questions) => {
  const out = zero();
  questions.forEach(q => { out[questionTypeKey(q)] += 1; });
  return out;
};

export const pctOf = (count, total) => (total > 0 ? Math.round((num(count) / total) * 1000) / 10 : 0);

const shuffled = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Max flow source -> cells -> types -> sink. Returns the flow and x[cell][typeIndex].
// `randomize` pushes one question at a time along randomly ordered paths so the types spread over
// the topics instead of the first topic taking all of one type.
const maxFlow = (cells, quotas, randomize = false) => {
  const C = cells.length;
  const K = TYPE_KEYS.length;
  const n = C + K + 2;
  const S = C + K;
  const T = S + 1;
  const cap = Array.from({ length: n }, () => new Array(n).fill(0));
  const avail = cells.map(c => {
    const counts = typeCountsOf(c.questions);
    return TYPE_KEYS.map(k => counts[k]);
  });
  cells.forEach((c, i) => {
    cap[S][i] = num(c.count);
    avail[i].forEach((a, j) => { cap[i][C + j] = a; });
  });
  TYPE_KEYS.forEach((k, j) => { cap[C + j][T] = Math.max(0, num(quotas[k])); });

  const nodes = [...Array(n).keys()];
  let flow = 0;
  for (;;) {
    const prev = new Array(n).fill(-1);
    prev[S] = S;
    const queue = [S];
    const order = randomize ? shuffled(nodes) : nodes;
    while (queue.length && prev[T] === -1) {
      const u = queue.shift();
      for (const v of order) {
        if (prev[v] === -1 && cap[u][v] > 0) { prev[v] = u; queue.push(v); }
      }
    }
    if (prev[T] === -1) break;
    let add = randomize ? 1 : Infinity;
    for (let v = T; v !== S; v = prev[v]) add = Math.min(add, cap[prev[v]][v]);
    for (let v = T; v !== S; v = prev[v]) { cap[prev[v]][v] -= add; cap[v][prev[v]] += add; }
    flow += add;
  }
  const x = cells.map((_, i) => TYPE_KEYS.map((_, j) => avail[i][j] - cap[i][C + j]));
  return { flow, x };
};

// Can the cells supply `quotas` (as part of their counts)?
export const cellsCanSupply = (cells, quotas) => maxFlow(cells, quotas).flow === sumCounts(quotas);

// How many questions of each type the cells take, or null when the mix can't be met exactly.
// Returns x[cell][typeIndex] in TYPE_KEYS order.
export const planTypeMix = (cells, quotas) => {
  const total = cells.reduce((a, c) => a + num(c.count), 0);
  if (sumCounts(quotas) !== total) return null;
  const { flow, x } = maxFlow(cells, quotas, true);
  return flow === total ? x : null;
};

// Exact equal split, remainder to the first types
const equalCounts = (total) => {
  const out = zero();
  TYPE_KEYS.forEach((k, i) => { out[k] = Math.floor(total / TYPE_KEYS.length) + (i < total % TYPE_KEYS.length ? 1 : 0); });
  return out;
};

// Hand out `total` questions one at a time to the type furthest below its weighted share, dropping a
// type once `fits` says it can't take another. (Achievable mixes form a polymatroid, so a type that
// can't grow now never can later, and this always reaches the largest achievable total.)
const fairFill = (total, weights, fits) => {
  let counts = zero();
  const open = TYPE_KEYS.filter(k => weights[k] > 0);
  let placed = 0;
  while (placed < total && open.length) {
    const k = open.reduce((best, t) => ((counts[t] + 1) / weights[t] < (counts[best] + 1) / weights[best] ? t : best));
    const next = { ...counts, [k]: counts[k] + 1 };
    if (fits(next)) { counts = next; placed += 1; } else open.splice(open.indexOf(k), 1);
  }
  return counts;
};

// Counts for a preset.
//   total: questions the auto-selection picks
//   pool:  { MCQ: n, ... } questions of each type in the selected topics
//   fits:  counts -> whether the allocations can supply them
export const presetCounts = (preset, total, pool, fits) => {
  if (preset === 'equal') return equalCounts(total);
  if (preset === 'pool') return fairFill(total, pool, fits);
  return fairFill(total, Object.fromEntries(TYPE_KEYS.map(k => [k, 1])), fits);
};

const splitFrom = (mode, counts, total, autoAdjusted = false) => ({
  mode,
  autoAdjusted,
  count: counts,
  pct: Object.fromEntries(TYPE_KEYS.map(k => [k, mode === 'equal' && total % TYPE_KEYS.length === 0 ? 100 / TYPE_KEYS.length : pctOf(counts[k], total)])),
});

export const buildTypeSplit = (preset, total, pool, fits) => splitFrom(preset, presetCounts(preset, total, pool, fits), total);

// Default rule: 25% each; if the topics can't supply that, the next best equal split
export const defaultTypeSplit = (total, pool, fits) => {
  const equal = equalCounts(total);
  const split = fits(equal) ? splitFrom('equal', equal, total) : splitFrom('nextBest', presetCounts('nextBest', total, pool, fits), total, true);
  return { ...split, fromDefault: true };
};
