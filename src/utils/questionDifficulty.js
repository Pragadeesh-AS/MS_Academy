// Question difficulty for the Tests Manager: an optional Easy / Medium / Hard count per topic that
// the auto-selection must follow (Step 3 "Topic Marks").

export const DIFFICULTIES = [
  { key: 'easy', label: 'Easy' },
  { key: 'medium', label: 'Medium' },
  { key: 'hard', label: 'Hard' },
];
export const DIFFICULTY_KEYS = DIFFICULTIES.map(d => d.key);

// Older questions use the GATE-style names
const BY_NAME = {
  easy: 'easy',
  'basic gate': 'easy',
  medium: 'medium',
  'exact gate': 'medium',
  hard: 'hard',
  'advanced gate': 'hard',
};

// 'easy' | 'medium' | 'hard', or null for a question with no (known) difficulty
export const difficultyKey = (q) => BY_NAME[String(q?.difficultyLevel || '').trim().toLowerCase()] || null;

const num = (v) => parseInt(v) || 0;

// Whether a topic's allocation has a difficulty mix (any of the three boxes filled in)
export const hasDifficultyMix = (alloc) => DIFFICULTY_KEYS.some(k => alloc?.[k] !== undefined && alloc?.[k] !== '' && alloc?.[k] !== null);

export const difficultyTotal = (alloc) => DIFFICULTY_KEYS.reduce((a, k) => a + num(alloc?.[k]), 0);

// Splits a topic's 1-mark / 2-mark counts over the difficulties.
//   marks:  { 1: n1, 2: n2 }                         questions wanted per mark
//   wanted: { easy, medium, hard }                   questions wanted per difficulty
//   avail:  { 1: { easy, medium, hard }, 2: {...} }  questions in the bank
// Returns { 1: { easy, ... }, 2: { easy, ... } } meeting both, or null if the bank can't.
// Each 1-mark share sits between what the 2-mark questions can't cover and what's available;
// the rest is handed out evenly, always in the same order so every caller gets the same split.
export const splitByDifficulty = (marks, wanted, avail) => {
  const n1 = num(marks[1]);
  const n2 = num(marks[2]);
  const want = Object.fromEntries(DIFFICULTY_KEYS.map(k => [k, num(wanted[k])]));
  if (DIFFICULTY_KEYS.reduce((a, k) => a + want[k], 0) !== n1 + n2) return null;

  const lo = Object.fromEntries(DIFFICULTY_KEYS.map(k => [k, Math.max(0, want[k] - num(avail[2]?.[k]))]));
  const hi = Object.fromEntries(DIFFICULTY_KEYS.map(k => [k, Math.min(want[k], num(avail[1]?.[k]))]));
  if (DIFFICULTY_KEYS.some(k => lo[k] > hi[k])) return null;
  const loSum = DIFFICULTY_KEYS.reduce((a, k) => a + lo[k], 0);
  const hiSum = DIFFICULTY_KEYS.reduce((a, k) => a + hi[k], 0);
  if (n1 < loSum || n1 > hiSum) return null;

  const one = { ...lo };
  let left = n1 - loSum;
  while (left > 0) {
    for (const k of DIFFICULTY_KEYS) {
      if (left > 0 && one[k] < hi[k]) { one[k] += 1; left -= 1; }
    }
  }
  return {
    1: one,
    2: Object.fromEntries(DIFFICULTY_KEYS.map(k => [k, want[k] - one[k]])),
  };
};
