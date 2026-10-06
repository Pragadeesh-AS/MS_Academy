// A test in progress, saved in the browser as the student works, so a refresh, a crashed tab or a
// dropped connection doesn't lose their answers. Kept per student + test (shared lab computers):
//   answers, flagged, visited, currentIdx  - the exam screen as it was
//   timeSpent    { questionId: seconds } so far
//   fsWarnings   full-screen exits so far (a refresh doesn't reset them)
//   startedAt    ms when the exam screen started
//   deadline     ms when time runs out - the clock keeps running while the page is closed
// Removed once the attempt is saved to Firestore.

const PREFIX = 'test_progress:';
const keyFor = (email, testId) => `${PREFIX}${(email || '').toLowerCase()}:${testId}`;

export const loadTestProgress = (email, testId) => {
  if (!email || !testId) return null;
  try {
    const saved = JSON.parse(localStorage.getItem(keyFor(email, testId)));
    return saved && typeof saved.deadline === 'number' && saved.answers ? saved : null;
  } catch {
    return null;
  }
};

export const saveTestProgress = (email, testId, progress) => {
  if (!email || !testId) return;
  try {
    localStorage.setItem(keyFor(email, testId), JSON.stringify({ ...progress, savedAt: Date.now() }));
  } catch { /* storage full or blocked - the test still runs, it just can't be resumed */ }
};

export const clearTestProgress = (email, testId) => {
  if (!email || !testId) return;
  try { localStorage.removeItem(keyFor(email, testId)); } catch { /* storage unavailable */ }
};

// Ids of this student's tests that were started but never submitted
export const inProgressTestIds = (email) => {
  if (!email) return [];
  const prefix = keyFor(email, '');
  try {
    return Object.keys(localStorage).filter(k => k.startsWith(prefix)).map(k => k.slice(prefix.length));
  } catch {
    return [];
  }
};
