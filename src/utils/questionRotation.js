// Auto-selected test questions rotate: a question used in another test of the same department
// within REPEAT_GAP_DAYS of the new test's date (before or after it) is held back, so students
// don't meet the same question again for two months. Only if a topic runs out of fresh questions
// are recently used ones taken, the longest-ago used first. Nothing about this is shown in the UI.

import { sameDepartment } from './subjects';
import { testStartMillis } from './testSchedule';

export const REPEAT_GAP_DAYS = 60;
const GAP_MS = REPEAT_GAP_DAYS * 24 * 60 * 60 * 1000;

const testTimeMillis = (test) => testStartMillis(test)
  ?? (typeof test?.createdAt?.toMillis === 'function' ? test.createdAt.toMillis() : null);

// { questionId: distance in ms from the new test to the nearest other test that used it }, for
// tests of `department` within the gap of `atMillis`
export const recentQuestionUse = (tests, { department, atMillis = Date.now(), excludeTestId = null }) => {
  const near = {};
  (tests || []).forEach(t => {
    if (t.id === excludeTestId || !sameDepartment(t.department, department)) return;
    const at = testTimeMillis(t);
    if (at === null) return;
    const distance = Math.abs(at - atMillis);
    if (distance >= GAP_MS) return;
    (Array.isArray(t.questions) ? t.questions : []).forEach(id => {
      if (near[id] === undefined || distance < near[id]) near[id] = distance;
    });
  });
  return near;
};

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// `n` ids from `ids`: fresh ones in random order, then recently used ones furthest-in-time first
export const pickRotated = (ids, n, recentUse) => {
  if (n <= 0) return [];
  const fresh = ids.filter(id => recentUse[id] === undefined);
  const recent = shuffle(ids.filter(id => recentUse[id] !== undefined)).sort((a, b) => recentUse[b] - recentUse[a]);
  return [...shuffle(fresh), ...recent].slice(0, n);
};
