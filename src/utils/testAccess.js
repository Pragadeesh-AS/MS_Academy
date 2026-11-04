// Whether a student may take a test, from its bundle settings and the student's plan.
// The Cloud Function that emails test notifications (functions/testNotifications.js) has a copy
// of this rule - keep the two in sync.
import { bundleIdsOf } from './bundleAccess';
import { sameDepartment, isCommonDeptName } from './subjects';
import { isEliteStudent } from './membership';

export const canAccessTest = (test, { isPro = false, purchasedBundles = [], bundles = [], department = '', student = null } = {}) => {
  // 1. Explicitly free
  if (test?.bundleId === 'free') return true;

  // Legacy support: old tests created by Admin without a bundleId were considered free
  if (test?.bundleId === undefined && (test?.createdBy === 'Admin' || test?.createdBy === 'MS Academy Admin')) {
    return true;
  }

  // 2. Pro users get every test
  if (isPro || student?.isPro) return true;

  const effectiveDept = department || student?.department || '';

  // 3. Common tests (Engineering Mathematics & Aptitude) are automatically available
  // to all Elite students from every department
  if (isCommonDeptName(test?.department) && isEliteStudent({ isPro, purchasedBundles, bundles, department: effectiveDept, student })) {
    return true;
  }

  // 4. Exclusive bundles: students who bought one of them
  const onlyBundles = bundleIdsOf(test);
  if (onlyBundles.length && onlyBundles.some(id => purchasedBundles.includes(id))) {
    return true;
  }

  // 5. Elite students get every test in their own department (or All / General)
  if (isEliteStudent({ isPro, purchasedBundles, bundles, department: effectiveDept, student })) {
    if (!effectiveDept || !test?.department || test.department === 'All' || test.department === 'General' || sameDepartment(effectiveDept, test.department)) {
      return true;
    }
  }

  // 6. General tests: any purchased bundle for this department (or common) that includes tests
  return (bundles || []).some(b =>
    purchasedBundles.includes(b.id) &&
    (sameDepartment(b.department, test?.department) || (isCommonDeptName(test?.department) && (isCommonDeptName(b.department) || b.department === 'General' || b.department === 'All'))) &&
    (!b.permissions || b.permissions.includes('tests'))
  );
};
