// Practice tests: a student builds their own test from their department's subjects / topics. They
// only pick the topics, the number of questions and the duration - the questions themselves are
// auto-selected, spread as evenly as the bank allows over the topics, then 1-mark / 2-mark, then
// question type (MCQ / MSQ / NAT / Match), then difficulty.
//
// Stored in Firestore 'practice_tests' (one document per practice test, holding the questions and,
// once submitted, the attempt) - kept apart from 'tests' / 'test_attempts' so practice never shows
// up in academy leaderboards, analytics or answer-key re-grading.
//
// Free allowance: FREE_PRACTICE_QUESTIONS questions in total across all practice tests (counted when
// a test is started). A student who bought a full bundle for their department - one with every
// resource ticked - gets unlimited practice as a complement.

import { markNumberOf } from './marking';
import { questionTypeKey } from './questionTypeSplit';
import { difficultyKey } from './questionDifficulty';
import { sameDepartment, isCommonDeptName } from './subjects';

export const FREE_PRACTICE_QUESTIONS = 50;

// Every resource a bundle can grant (see admin/CourseSetup) - a bundle with all of them is "full"
export const FULL_BUNDLE_PERMISSIONS = ['tests', 'live_classes', 'recordings', 'notes'];

// Bundles saved before permissions existed gave access to everything, so they count as full
export const isFullBundle = (bundle) => !bundle?.permissions || FULL_BUNDLE_PERMISSIONS.every(p => bundle.permissions.includes(p));

export const hasUnlimitedPractice = ({ purchasedBundles = [], bundles = [], department = '' } = {}) => (bundles || []).some(b =>
  purchasedBundles.includes(b.id) &&
  (b.department === 'General' || sameDepartment(b.department, department)) &&
  isFullBundle(b)
);

// Questions the student has used up (every practice test started counts, finished or not)
export const practiceQuestionsUsed = (practiceTests) => (practiceTests || [])
  .reduce((sum, t) => sum + (Array.isArray(t.questions) ? t.questions.length : 0), 0);

// A bank question belongs to this student's practice pool: their own department's question, or
// one from the shared Engineering Mathematics / Aptitude banks
export const isPracticeQuestionFor = (q, department) => (q.status === 'Approved' || !q.status) &&
  (sameDepartment(q.department, department) || isCommonDeptName(q.department));

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Spread `wanted` over groups as evenly as possible, never giving a group more than it has
const spreadEvenly = (sizes, wanted) => {
  const out = sizes.map(() => 0);
  let left = wanted;
  let progress = true;
  while (left > 0 && progress) {
    progress = false;
    for (let i = 0; i < sizes.length && left > 0; i++) {
      if (out[i] < sizes[i]) { out[i] += 1; left -= 1; progress = true; }
    }
  }
  return out;
};

// Pick `count` items, balanced level by level over keyFns (each level splits its share evenly
// over that key's groups, in random order so leftovers don't always land on the same group)
const balancedPick = (items, count, keyFns) => {
  if (count <= 0) return [];
  if (keyFns.length === 0) return shuffle(items).slice(0, count);
  const [keyOf, ...rest] = keyFns;
  const groups = {};
  items.forEach(it => { const k = String(keyOf(it) ?? ''); (groups[k] = groups[k] || []).push(it); });
  const lists = shuffle(Object.values(groups));
  const shares = spreadEvenly(lists.map(l => l.length), count);
  return lists.flatMap((list, i) => balancedPick(list, shares[i], rest));
};

const topicKey = (q) => (q.topic || '').trim().toLowerCase();
const markKey = (q) => markNumberOf(q.mark) || 1;

export const pickPracticeQuestions = (pool, count) =>
  balancedPick(pool, count, [topicKey, markKey, questionTypeKey, (q) => difficultyKey(q) || 'none']);

export const markOf = markKey;
