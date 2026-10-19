import { isFullBundle } from './practiceTests';
import { sameDepartment } from './subjects';

// Membership tiers:
//   Elite      - owns a "full" course bundle (Academy Tests, Live Classes, Recordings and Study Notes
//                all ticked in Course Setup) for their department or a General one. Elite unlocks every
//                test, live class, recording and note of the department.
//   Prime      - owns any other bundle; gets what that bundle includes.
//   Foundation - no bundles.
// The functions/testNotifications.js Cloud Function has a copy of the Elite rule - keep the two in sync.

export const fullBundleOf = ({ purchasedBundles = [], bundles = [], department = '' } = {}) =>
  (bundles || []).find(b => {
    if (!purchasedBundles.includes(b.id)) return false;
    const isNamedElite = b.tier === 'elite' || b.isElite === true || /elite/i.test(b.name || '');
    const isFull = isFullBundle(b) || isNamedElite;
    if (!isFull) return false;
    const deptMatch = !department || !b.department || b.department === 'General' || b.department === 'All' || sameDepartment(b.department, department);
    return deptMatch;
  }) || null;

export const isEliteStudent = (args = {}) => {
  if (args.isPro === true || args.student?.isPro === true) return true;
  return !!fullBundleOf(args);
};

export const tierKeyOf = ({ purchasedBundles = [], bundles = [], department = '', isPro = false, student = null } = {}) => {
  const effectiveBundles = (purchasedBundles && purchasedBundles.length > 0) ? purchasedBundles : (student?.purchasedBundles || []);
  const effectiveDept = department || student?.department || '';
  const effectivePro = isPro || student?.isPro || false;
  if (isEliteStudent({ purchasedBundles: effectiveBundles, bundles, department: effectiveDept, isPro: effectivePro, student })) return 'elite';
  return effectiveBundles.length > 0 ? 'prime' : 'foundation';
};

