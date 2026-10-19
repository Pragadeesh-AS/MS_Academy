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
  (bundles || []).find(b =>
    purchasedBundles.includes(b.id) &&
    (b.department === 'General' || sameDepartment(b.department, department) || (!department && isFullBundle(b))) &&
    isFullBundle(b)
  ) || null;

export const isEliteStudent = (args = {}) => {
  if (args.isPro === true || args.student?.isPro === true) return true;
  return !!fullBundleOf(args);
};

export const tierKeyOf = ({ purchasedBundles = [], bundles = [], department = '', isPro = false, student = null } = {}) => {
  if (isEliteStudent({ purchasedBundles, bundles, department, isPro, student })) return 'elite';
  const count = (purchasedBundles?.length || 0) || (student?.purchasedBundles?.length || 0);
  return count > 0 ? 'prime' : 'foundation';
};

