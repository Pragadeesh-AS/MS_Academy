// Whether a student may take a test, from its bundle settings and the student's plan.
// The Cloud Function that emails test notifications (functions/testNotifications.js) has a copy
// of this rule - keep the two in sync.
export const canAccessTest = (test, { isPro = false, purchasedBundles = [], bundles = [] } = {}) => {
  // 1. Explicitly free
  if (test.bundleId === 'free') return true;

  // Legacy support: old tests created by Admin without a bundleId were considered free
  if (test.bundleId === undefined && (test.createdBy === 'Admin' || test.createdBy === 'MS Academy Admin')) {
    return true;
  }

  // 2. Exclusive bundle: only students who bought that bundle
  if (test.bundleId && test.bundleId !== 'free') {
    return purchasedBundles.includes(test.bundleId);
  }

  // 3. Pro users get every department test
  if (isPro) return true;

  // 4. General tests: any purchased bundle for this department that includes tests
  return (bundles || []).some(b =>
    purchasedBundles.includes(b.id) &&
    b.department === test.department &&
    (!b.permissions || b.permissions.includes('tests'))
  );
};
