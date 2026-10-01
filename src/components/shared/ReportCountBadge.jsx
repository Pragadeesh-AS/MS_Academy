import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase';

// Live number of reported questions still waiting to be resolved - for the "Reported Q's" menu
// item. A teacher counts their department's reports (same filter as their Reported Q's tab);
// the admin (no department) counts all of them.
export const usePendingReportCount = (department = null, enabled = true) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!enabled) return undefined;
    const source = department
      ? query(collection(db, 'reported_questions'), where('department', '==', department))
      : collection(db, 'reported_questions');
    return onSnapshot(
      source,
      snap => setCount(snap.docs.filter(d => d.data().status !== 'resolved').length),
      err => console.error('Failed to watch reported questions', err)
    );
  }, [department, enabled]);
  return count;
};

// Small red count bubble: a pill at the end of the menu item, or a corner dot when the sidebar
// is collapsed. Nothing when there are no open reports.
export default function ReportCountBadge({ count, collapsed = false }) {
  if (!count) return null;
  const text = count > 99 ? '99+' : String(count);
  if (collapsed) {
    return (
      <span className="absolute top-1 right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center shadow ring-2 ring-white animate-pulse">
        {text}
      </span>
    );
  }
  return (
    <span
      className="ml-auto min-w-[22px] h-[22px] px-1.5 rounded-full bg-red-500 text-white text-[11px] font-black flex items-center justify-center shadow-sm animate-pulse"
      title={`${count} reported question${count === 1 ? '' : 's'} waiting`}
    >
      {text}
    </span>
  );
}
