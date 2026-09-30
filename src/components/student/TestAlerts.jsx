import React, { useEffect, useMemo, useState } from 'react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { BellRing, CalendarPlus, X, ArrowRight, Bell } from 'lucide-react';
import { db } from '../../firebase';
import { canAccessTest } from '../../utils/testAccess';
import { AVAILABILITY, testAvailability, testStartMillis, formatTestTime, formatCountdown } from '../../utils/testSchedule';

const REMINDER_WINDOW_MS = 30 * 60 * 1000;
const SEEN_KEY = 'test_alerts_seen'; // { [testId]: scheduledTime } - "new test scheduled" notices dismissed
const PUSHED_KEY = 'test_alerts_pushed'; // { [`${kind}:${testId}:${scheduledTime}`]: true } - browser notifications sent

const readMap = (key) => {
  try { return JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch { return {}; }
};
const writeMap = (key, map) => {
  try { localStorage.setItem(key, JSON.stringify(map)); } catch { /* storage unavailable - alerts just repeat */ }
};

const canNotify = () => typeof window !== 'undefined' && 'Notification' in window;

/**
 * In-app test alerts on the student dashboard: a notice when a new test is scheduled, and a
 * countdown banner (plus a browser notification, if allowed) from 30 minutes before a test opens.
 * Emails for the same events are sent by the testNotifications Cloud Function.
 */
export default function TestAlerts({ department, isPro, purchasedBundles, bundles, onOpenTests }) {
  const [tests, setTests] = useState([]);
  const [attemptedIds, setAttemptedIds] = useState(new Set());
  const [now, setNow] = useState(Date.now());
  const [seen, setSeen] = useState(() => readMap(SEEN_KEY));
  const [permission, setPermission] = useState(() => (canNotify() ? Notification.permission : 'unsupported'));

  // Live, so a test the teacher schedules while the student is on the dashboard shows up at once
  useEffect(() => {
    if (!department) return undefined;
    const unsub = onSnapshot(
      query(collection(db, 'tests'), where('department', '==', department)),
      snap => setTests(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err => console.error('Failed to watch tests for alerts', err)
    );
    return () => unsub();
  }, [department]);

  useEffect(() => {
    const email = sessionStorage.getItem('auth_email');
    if (!email) return;
    getDocs(query(collection(db, 'test_attempts'), where('studentEmail', '==', email)))
      .then(snap => setAttemptedIds(new Set(snap.docs.map(d => d.data().testId))))
      .catch(err => console.error('Failed to load attempts for alerts', err));
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const relevant = useMemo(() => tests.filter(t =>
    testStartMillis(t) !== null && !attemptedIds.has(t.id) && canAccessTest(t, { isPro, purchasedBundles, bundles })
  ), [tests, attemptedIds, isPro, purchasedBundles, bundles]);

  // Opening within the next 30 minutes
  const startingSoon = relevant
    .filter(t => testAvailability(t, now) === AVAILABILITY.UPCOMING && testStartMillis(t) - now <= REMINDER_WINDOW_MS)
    .sort((a, b) => testStartMillis(a) - testStartMillis(b));
  // Scheduled further out, and not yet dismissed at this schedule time
  const newlyScheduled = relevant
    .filter(t => testStartMillis(t) - now > REMINDER_WINDOW_MS && seen[t.id] !== t.scheduledTime)
    .sort((a, b) => testStartMillis(a) - testStartMillis(b));

  // Browser notifications - once per test per schedule time, per kind
  useEffect(() => {
    if (permission !== 'granted') return;
    const pushed = readMap(PUSHED_KEY);
    let changed = false;
    const push = (kind, test, body) => {
      const key = `${kind}:${test.id}:${test.scheduledTime}`;
      if (pushed[key]) return;
      pushed[key] = true;
      changed = true;
      try {
        new Notification(kind === 'soon' ? `Test starts soon: ${test.title}` : `New test scheduled: ${test.title}`, { body, tag: key, icon: '/logo.png' });
      } catch (err) {
        console.error('Browser notification failed', err);
      }
    };
    startingSoon.forEach(t => push('soon', t, `Opens at ${formatTestTime(testStartMillis(t))}. Get ready!`));
    newlyScheduled.forEach(t => push('new', t, `Opens ${formatTestTime(testStartMillis(t))} · ${t.duration || 0} min`));
    if (changed) writeMap(PUSHED_KEY, pushed);
  }, [permission, startingSoon.map(t => t.id + t.scheduledTime).join(), newlyScheduled.map(t => t.id + t.scheduledTime).join()]); // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = (test) => {
    const next = { ...seen, [test.id]: test.scheduledTime };
    setSeen(next);
    writeMap(SEEN_KEY, next);
  };

  const enableBrowserAlerts = async () => {
    if (!canNotify()) return;
    try {
      setPermission(await Notification.requestPermission());
    } catch (err) {
      console.error('Notification permission request failed', err);
    }
  };

  if (startingSoon.length === 0 && newlyScheduled.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      {startingSoon.map(t => (
        <div key={`soon-${t.id}`} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 animate-pulse">
            <BellRing size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-[900] text-amber-900 truncate">{t.title} starts in <span className="tabular-nums">{formatCountdown(testStartMillis(t) - now)}</span></p>
            <p className="text-[13px] font-semibold text-amber-800/80">Opens at {formatTestTime(testStartMillis(t))} · {t.duration || 0} min · {t.questions?.length || 0} questions</p>
          </div>
          <button onClick={onOpenTests} className="shrink-0 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition-colors">
            Go to Tests <ArrowRight size={16} />
          </button>
        </div>
      ))}

      {newlyScheduled.map(t => (
        <div key={`new-${t.id}`} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl border border-indigo-200 bg-indigo-50/70 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
            <CalendarPlus size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-[900] text-indigo-900 truncate">New test scheduled: {t.title}</p>
            <p className="text-[13px] font-semibold text-indigo-800/80">Opens {formatTestTime(testStartMillis(t))} · {t.duration || 0} min{t.subject ? ` · ${t.subject}` : ''}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={onOpenTests} className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors">View</button>
            <button onClick={() => dismiss(t)} className="p-2.5 rounded-xl text-indigo-400 hover:text-indigo-700 hover:bg-indigo-100 transition-colors" title="Dismiss">
              <X size={18} />
            </button>
          </div>
        </div>
      ))}

      {permission === 'default' && (
        <button onClick={enableBrowserAlerts} className="flex items-center gap-2 text-[13px] font-bold text-indigo-600 hover:text-indigo-800">
          <Bell size={15} /> Turn on browser notifications for test alerts
        </button>
      )}
    </div>
  );
}
