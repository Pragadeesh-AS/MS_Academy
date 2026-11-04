// Marks one answer of a test attempt. Used when a student submits a test (StudentTests) and when a
// question's answer key is corrected afterwards (utils/regradeAttempts) - both must mark identically.
import { positiveMarkFor, negativeMarkFor } from './marking';
import { isNatQuestion, isMsqQuestion } from './questionTypeSplit';

// Older AI imports stored NAT questions as 'Fill in the Blanks'; grading expects 'Fill in Blanks'
export const normalizeQuestion = (q) => (
  q?.questionType === 'Fill in the Blanks' ? { ...q, questionType: 'Fill in Blanks' } : q
);

// The correct answer as shown to students ("B", "A, C", "12.5", "3 to 4")
export const correctAnswerText = (q) => {
  if (isNatQuestion(q)) {
    return q.fillBlankMode === 'Numeric Range'
      ? `${q.fillBlankRangeStart} to ${q.fillBlankRangeEnd}`
      : (q.fillBlankAnswer ?? '');
  }
  if (isMsqQuestion(q)) {
    const list = Array.isArray(q.correctAnswers) && q.correctAnswers.length > 0
      ? q.correctAnswers
      : (q.correctAnswer ? [q.correctAnswer] : []);
    return list.slice().sort().join(', ');
  }
  return q.correctAnswer || (Array.isArray(q.correctAnswers) ? q.correctAnswers[0] : '') || '';
};

/**
 * { selectedAnswer, isAnswered, isCorrect, marksAwarded, maxMarks, correctAnswer }
 * An unanswered question scores 0; a wrong one loses the question's negative mark.
 */
export const gradeAnswer = (question, rawAnswer) => {
  const q = normalizeQuestion(question);
  const isMsq = isMsqQuestion(q);
  const isNat = isNatQuestion(q);
  const selectedAnswer = isMsq
    ? (Array.isArray(rawAnswer) ? rawAnswer : (rawAnswer ? [rawAnswer] : []))
    : (Array.isArray(rawAnswer) ? (rawAnswer[0] || '') : (rawAnswer || ''));
  const isAnswered = isMsq
    ? selectedAnswer.length > 0
    : String(selectedAnswer).trim() !== '';

  let isCorrect = false;
  if (isNat) {
    const cleanStudent = String(selectedAnswer).trim();
    if (q.fillBlankMode === 'Numeric Range') {
      const studentNum = parseFloat(cleanStudent);
      const min = parseFloat(q.fillBlankRangeStart);
      const max = parseFloat(q.fillBlankRangeEnd);
      if (!isNaN(studentNum) && !isNaN(min) && !isNaN(max)) {
        isCorrect = studentNum >= min && studentNum <= max;
      }
    } else {
      isCorrect = cleanStudent.toLowerCase() === String(q.fillBlankAnswer || '').trim().toLowerCase();
    }
  } else if (isMsq) {
    const correctSet = (Array.isArray(q.correctAnswers) && q.correctAnswers.length > 0
      ? q.correctAnswers
      : (q.correctAnswer ? [q.correctAnswer] : [])
    ).slice().sort();
    const studentSet = selectedAnswer.slice().sort();
    isCorrect = correctSet.length > 0 &&
      correctSet.length === studentSet.length &&
      correctSet.every((opt, i) => opt === studentSet[i]);
  } else {
    const expected = q.correctAnswer || (Array.isArray(q.correctAnswers) ? q.correctAnswers[0] : '');
    isCorrect = selectedAnswer === expected;
  }

  const maxMarks = positiveMarkFor(q);
  const marksAwarded = !isAnswered ? 0 : (isCorrect ? maxMarks : -negativeMarkFor(q));
  return { selectedAnswer, isAnswered, isCorrect, marksAwarded, maxMarks, correctAnswer: correctAnswerText(q) };
};

// Fields that decide how an answer is marked - a change to any of them means attempts need re-grading
const ANSWER_KEY_FIELDS = ['questionType', 'correctAnswer', 'correctAnswers', 'fillBlankAnswer', 'fillBlankMode', 'fillBlankRangeStart', 'fillBlankRangeEnd', 'mark'];

const keyValue = (q, field) => {
  // "1" and "1 Mark (-0.33)" are the same mark
  if (field === 'mark') return JSON.stringify(positiveMarkFor(q || {}));
  const v = normalizeQuestion(q || {})[field];
  if (Array.isArray(v)) return JSON.stringify(v.slice().sort());
  return JSON.stringify(v === undefined || v === '' ? null : String(v).trim());
};

export const answerKeyChanged = (before, after) => ANSWER_KEY_FIELDS.some(f => keyValue(before, f) !== keyValue(after, f));
