// Post-class quizzes are kept for QUIZ_KEEP_DAYS after their class ends, then deleted. The
// teacher's Live Classes page removes a teacher's own expired quizzes as it loads, and the
// cleanupPostClassQuizzes Cloud Function (functions/postClassQuizCleanup.js - keep the two in
// sync) does it daily for every class. Only the quiz and its results go; the class session stays.
import { db } from '../firebase';
import { collection, deleteField, doc, getDocs, updateDoc, writeBatch } from 'firebase/firestore';

export const QUIZ_KEEP_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

const endedAtMillis = (session) => session?.endedAt?.toMillis?.() ?? null;

// When this session's quiz is (or was) due to be deleted, or null if the class hasn't ended
export const quizExpiresAt = (session) => {
  const ended = endedAtMillis(session);
  return ended === null ? null : ended + QUIZ_KEEP_DAYS * DAY_MS;
};

export const isQuizExpired = (session, now = Date.now()) => {
  const at = quizExpiresAt(session);
  return at !== null && at <= now;
};

// "2 days" / "5 hours" left before the quiz is deleted
export const quizTimeLeft = (session, now = Date.now()) => {
  const at = quizExpiresAt(session);
  if (at === null) return '';
  const ms = Math.max(0, at - now);
  const days = Math.floor(ms / DAY_MS);
  if (days >= 1) return `${days} day${days === 1 ? '' : 's'}`;
  const hours = Math.max(1, Math.ceil(ms / (60 * 60 * 1000)));
  return `${hours} hour${hours === 1 ? '' : 's'}`;
};

// Removes the quiz and every student's result from the session
export const deletePostClassQuiz = async (sessionId) => {
  const results = await getDocs(collection(db, 'live_sessions', sessionId, 'quiz_results'));
  for (let i = 0; i < results.docs.length; i += 450) {
    const batch = writeBatch(db);
    results.docs.slice(i, i + 450).forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
  await updateDoc(doc(db, 'live_sessions', sessionId), { postClassQuiz: deleteField() });
};
