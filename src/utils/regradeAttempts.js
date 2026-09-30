// Re-marks every saved attempt that contains a question after its answer key (correct option,
// NAT answer/range, type or marks) has been corrected - e.g. after a student reported a wrong
// answer. Strict re-grade, like an official answer-key revision: everyone is marked against the
// new key, so students who picked the new answer gain the marks and students who picked the old
// one lose them (including negative marking). Runs whether or not the solutions are released.
import { db } from '../firebase';
import { collection, getDocs, query, where, writeBatch, doc, updateDoc } from 'firebase/firestore';
import { gradeAnswer } from './testGrading';

const round2 = (n) => Math.round(n * 100) / 100;

// --- One-time clean-up: attempts submitted while MSQ / NAT were (wrongly) negatively marked.
// MSQ and NAT never lose marks (utils/marking), so any negative marks saved on those answers are
// refunded. Only the score and those answers' marks change - questions are never touched.
const NO_NEGATIVE_TYPES = new Set(['Multiple Choice', 'Fill in Blanks', 'Fill in the Blanks']);

// Preview: [{ id, student, test, answers, oldScore, newScore, responses }]
export const findMsqNatNegativeFixes = async () => {
  const [qSnap, aSnap] = await Promise.all([getDocs(collection(db, 'question_bank')), getDocs(collection(db, 'test_attempts'))]);
  const typeOf = new Map(qSnap.docs.map(d => [d.id, d.data().questionType]));
  const fixes = [];
  aSnap.docs.forEach(d => {
    const attempt = d.data();
    let refund = 0;
    let answers = 0;
    const responses = (Array.isArray(attempt.responses) ? attempt.responses : []).map(r => {
      // A deleted question's type is unknown - only an MSQ answer (an array) can still be recognised
      const type = typeOf.get(r.questionId) || (Array.isArray(r.selectedAnswer) ? 'Multiple Choice' : null);
      if (!NO_NEGATIVE_TYPES.has(type) || !(typeof r.marksAwarded === 'number' && r.marksAwarded < 0)) return r;
      refund += -r.marksAwarded;
      answers += 1;
      return { ...r, marksAwarded: 0 };
    });
    if (answers === 0) return;
    fixes.push({
      id: d.id,
      student: attempt.studentName || attempt.studentEmail || 'Student',
      test: attempt.testTitle || 'Untitled Test',
      answers,
      oldScore: attempt.score || 0,
      newScore: round2((attempt.score || 0) + refund),
      responses,
    });
  });
  return fixes;
};

export const applyMsqNatNegativeFixes = async (fixes) => {
  for (let i = 0; i < fixes.length; i += 450) {
    const batch = writeBatch(db);
    fixes.slice(i, i + 450).forEach(f => batch.update(doc(db, 'test_attempts', f.id), { responses: f.responses, score: f.newScore }));
    await batch.commit();
  }
};

/**
 * `before` / `after` are the question as it was and as it is now saved.
 * Resolves { attempts: re-graded attempt count, gained, lost } (students whose marks went up / down).
 */
export const regradeAttemptsForQuestion = async (before, after) => {
  const questionId = after.id;
  const testsSnap = await getDocs(query(collection(db, 'tests'), where('questions', 'array-contains', questionId)));
  const testIds = testsSnap.docs.map(d => d.id);
  if (testIds.length === 0) return { attempts: 0, gained: 0, lost: 0 };

  const attempts = [];
  for (let i = 0; i < testIds.length; i += 30) {
    const snap = await getDocs(query(collection(db, 'test_attempts'), where('testId', 'in', testIds.slice(i, i + 30))));
    snap.docs.forEach(d => attempts.push({ id: d.id, ...d.data() }));
  }

  const now = new Date().toISOString();
  const oldMax = gradeAnswer(before, null).maxMarks;
  const updates = [];
  let gained = 0;
  let lost = 0;

  attempts.forEach(attempt => {
    const responses = Array.isArray(attempt.responses) ? attempt.responses : [];
    let scoreDelta = 0;
    let correctDelta = 0;
    let maxDelta = 0;
    let touched = false;

    const next = responses.map(r => {
      if (r.questionId !== questionId) return r;
      const graded = gradeAnswer(after, r.selectedAnswer);
      // Very old attempts didn't store marksAwarded - work it out from the old key
      const oldMarks = typeof r.marksAwarded === 'number' ? r.marksAwarded : gradeAnswer(before, r.selectedAnswer).marksAwarded;
      maxDelta += graded.maxMarks - oldMax;
      const marksChanged = graded.isCorrect !== !!r.isCorrect || graded.marksAwarded !== oldMarks;
      if (!marksChanged) {
        // Same marks - only refresh the stored correct answer, without flagging it as re-marked
        if (graded.correctAnswer === r.correctAnswer) return r;
        touched = true;
        return { ...r, correctAnswer: graded.correctAnswer };
      }
      touched = true;
      scoreDelta += graded.marksAwarded - oldMarks;
      correctDelta += (graded.isCorrect ? 1 : 0) - (r.isCorrect ? 1 : 0);
      return {
        ...r,
        isAnswered: graded.isAnswered,
        isCorrect: graded.isCorrect,
        marksAwarded: graded.marksAwarded,
        correctAnswer: graded.correctAnswer,
        previousMarks: oldMarks,
        regradedAt: now,
      };
    });
    if (!touched && maxDelta === 0) return;

    const regraded = scoreDelta !== 0 || correctDelta !== 0 || maxDelta !== 0;
    if (scoreDelta > 0) gained += 1;
    else if (scoreDelta < 0) lost += 1;
    updates.push({
      id: attempt.id,
      regraded,
      data: {
        responses: next,
        score: round2((attempt.score || 0) + scoreDelta),
        correctCount: Math.max(0, (attempt.correctCount || 0) + correctDelta),
        ...(typeof attempt.totalMarks === 'number' ? { totalMarks: round2(attempt.totalMarks + maxDelta) } : {}),
        ...(regraded ? { regradedAt: now } : {}),
      },
    });
  });
  const regradedCount = updates.filter(u => u.regraded).length;

  // Firestore batches cap at 500 writes
  for (let i = 0; i < updates.length; i += 450) {
    const batch = writeBatch(db);
    updates.slice(i, i + 450).forEach(u => batch.update(doc(db, 'test_attempts', u.id), u.data));
    await batch.commit();
  }

  // Reports about this question are dealt with once its answer key has been corrected
  if (updates.length > 0 || testIds.length > 0) {
    try {
      const reports = await getDocs(query(collection(db, 'reported_questions'), where('questionId', '==', questionId)));
      const resolver = sessionStorage.getItem('auth_name') || 'Teacher';
      await Promise.all(reports.docs
        .filter(d => d.data().status !== 'resolved')
        .map(d => updateDoc(d.ref, {
          status: 'resolved',
          resolvedBy: resolver,
          resolvedAt: new Date(),
          resolution: `Answer key corrected - ${regradedCount} attempt(s) re-graded (${gained} gained, ${lost} lost marks)`,
        })));
    } catch (err) {
      console.error('Re-graded, but could not resolve the reports for this question', err);
    }
  }

  return { attempts: regradedCount, gained, lost };
};
