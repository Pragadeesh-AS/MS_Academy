// A student's own report of a live test or post-class quiz, so they can review it after the class
// with the answers and explanations from the Question Bank. Stored in `live_reports` (one document
// per student per test/quiz) and deleted LIVE_REPORT_KEEP_DAYS after it was made - by the student's
// own Live Sessions page as it loads, and daily by the cleanupPostClassQuizzes Cloud Function.
// Only question ids are stored (not question content), so the review always shows the Question
// Bank's current answer key and explanation.
import { db } from '../firebase';
import { collection, deleteDoc, doc, getDocs, query, serverTimestamp, setDoc, Timestamp, where } from 'firebase/firestore';
import { QUIZ_KEEP_DAYS } from './postClassQuiz';

export const LIVE_REPORT_KEEP_DAYS = QUIZ_KEEP_DAYS;
const DAY_MS = 24 * 60 * 60 * 1000;

export const REPORT_TYPES = { LIVE_TEST: 'live-test', QUIZ: 'post-class-quiz' };

const reportId = (type, key, email) => `${type}_${key}_${email}`.replace(/[/\s]/g, '_');

/**
 * Saves (or overwrites - safe to call twice) a report.
 * report: { type, key, title, sessionId, scoreText, summary, items: [{ questionId, answer, isAnswered, isCorrect, badge }] }
 */
export const saveLiveReport = async (report) => {
  const email = (sessionStorage.getItem('auth_email') || '').toLowerCase();
  if (!email) return;
  await setDoc(doc(db, 'live_reports', reportId(report.type, report.key, email)), {
    ...report,
    studentEmail: email,
    studentName: sessionStorage.getItem('auth_name') || 'Student',
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + LIVE_REPORT_KEEP_DAYS * DAY_MS),
  });
};

const expiresAtMillis = (r) => r?.expiresAt?.toMillis?.() ?? null;
export const isReportExpired = (r, now = Date.now()) => {
  const at = expiresAtMillis(r);
  return at !== null && at <= now;
};

// "2 days" / "5 hours" before the report is deleted
export const reportTimeLeft = (r, now = Date.now()) => {
  const at = expiresAtMillis(r);
  if (at === null) return '';
  const ms = Math.max(0, at - now);
  const days = Math.floor(ms / DAY_MS);
  if (days >= 1) return `${days} day${days === 1 ? '' : 's'}`;
  const hours = Math.max(1, Math.ceil(ms / (60 * 60 * 1000)));
  return `${hours} hour${hours === 1 ? '' : 's'}`;
};

// The signed-in student's reports, newest first; expired ones are deleted on the way
export const loadMyReports = async () => {
  const email = (sessionStorage.getItem('auth_email') || '').toLowerCase();
  if (!email) return [];
  const snap = await getDocs(query(collection(db, 'live_reports'), where('studentEmail', '==', email)));
  const now = Date.now();
  const reports = [];
  snap.docs.forEach(d => {
    const r = { id: d.id, ...d.data() };
    if (isReportExpired(r, now)) deleteDoc(d.ref).catch(err => console.error('Failed to delete expired report', d.id, err));
    else reports.push(r);
  });
  return reports.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
};
