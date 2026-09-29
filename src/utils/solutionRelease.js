// When a test's answers/solutions become visible to students. Stored on the test document:
//   solutionsReleaseMode      'manual' (default) | 'immediate' | 'scheduled'
//   solutionsUnlocked         true once released (manual unlock, or the scheduled release ran)
//   solutionsReleaseAt        Firestore Timestamp - scheduled mode only
//   solutionsReleaseAfterHours hours after the test ends, when the time was set that way (else null)
//   solutionsReleasePending   true while a scheduled release hasn't run yet - the Cloud Function
//                             `releaseScheduledSolutions` looks for these, unlocks them and emails
//                             the students who took the test.

export const RELEASE_MODES = { MANUAL: 'manual', IMMEDIATE: 'immediate', SCHEDULED: 'scheduled' };

export const releaseMode = (test) => test?.solutionsReleaseMode || RELEASE_MODES.MANUAL;

export const releaseAtMillis = (test) => {
  const at = test?.solutionsReleaseAt;
  if (!at) return null;
  if (typeof at.toMillis === 'function') return at.toMillis();
  if (typeof at.seconds === 'number') return at.seconds * 1000;
  const ms = new Date(at).getTime();
  return Number.isNaN(ms) ? null : ms;
};

// End of the test window: scheduled start (a datetime-local string, i.e. local time) + duration
export const testEndMillis = (test) => {
  if (!test?.scheduledTime) return null;
  const start = new Date(test.scheduledTime).getTime();
  if (Number.isNaN(start)) return null;
  return start + (parseInt(test.duration) || 0) * 60 * 1000;
};

// Checked on the student's results screen. A scheduled release counts as soon as its time has
// passed, even if the Cloud Function hasn't flipped solutionsUnlocked yet.
export const areSolutionsVisible = (test, now = Date.now()) => {
  if (!test) return false;
  if (test.solutionsUnlocked === true) return true;
  const mode = releaseMode(test);
  if (mode === RELEASE_MODES.IMMEDIATE) return true;
  if (mode === RELEASE_MODES.SCHEDULED) {
    const at = releaseAtMillis(test);
    return at !== null && at <= now;
  }
  return false;
};

export const formatReleaseTime = (ms) => new Date(ms).toLocaleString('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
});

// Short status for the admin's test card
export const releaseStatusLabel = (test, now = Date.now()) => {
  if (test?.solutionsUnlocked === true) return 'Answers released';
  const mode = releaseMode(test);
  if (mode === RELEASE_MODES.IMMEDIATE) return 'Answers shown after submit';
  if (mode === RELEASE_MODES.SCHEDULED) {
    const at = releaseAtMillis(test);
    if (at === null) return 'Answers locked';
    return at <= now ? 'Answers released' : `Answers release ${formatReleaseTime(at)}`;
  }
  return 'Answers locked';
};

export const solutionsEmail = (testTitle) => ({
  subject: `Solutions Unlocked: ${testTitle}`,
  html: `
    <div style="font-family: sans-serif; padding: 20px;">
      <h2>Solutions are now available!</h2>
      <p>The solutions and explanations for the test <strong>${String(testTitle || '').replace(/</g, '&lt;')}</strong> have been unlocked by your teacher.</p>
      <p>You can now log in to your dashboard and review your detailed performance.</p>
    </div>
  `
});
