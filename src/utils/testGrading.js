// Marks one answer of a test attempt. Used when a student submits a test (StudentTests) and when a
// question's answer key is corrected afterwards (utils/regradeAttempts) - both must mark identically.
import { positiveMarkFor, negativeMarkFor } from './marking';

// Older AI imports stored NAT questions as 'Fill in the Blanks'; grading expects 'Fill in Blanks'
export const normalizeQuestion = (q) => (
  q?.questionType === 'Fill in the Blanks' ? { ...q, questionType: 'Fill in Blanks' } : q
);

// The correct answer as shown to students ("B", "A, C", "12.5", "3 to 4")
export const correctAnswerText = (q) => {
  if (q.questionType === 'Fill in Blanks') {
    return q.fillBlankMode === 'Numeric Range'
      ? `${q.fillBlankRangeStart} to ${q.fillBlankRangeEnd}`
      : (q.fillBlankAnswer ?? '');
  }
  if (q.questionType === 'Multiple Choice') return (q.correctAnswers || []).join(', ');
  return q.correctAnswer ?? '';
};

/**
 * { selectedAnswer, isAnswered, isCorrect, marksAwarded, maxMarks, correctAnswer }
 * An unanswered question scores 0; a wrong one loses the question's negative mark.
 */
export const gradeAnswer = (question, rawAnswer) => {
  const q = normalizeQuestion(question);
  const selectedAnswer = q.questionType === 'Multiple Choice'
    ? (Array.isArray(rawAnswer) ? rawAnswer : [])
    : (rawAnswer || '');
  const isAnswered = q.questionType === 'Multiple Choice'
    ? selectedAnswer.length > 0
    : String(selectedAnswer).trim() !== '';

  let isCorrect = false;
  if (q.questionType === 'Fill in Blanks') {
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
  } else if (q.questionType === 'Multiple Choice') {
    const correctSet = (q.correctAnswers || []).slice().sort();
    const studentSet = selectedAnswer.slice().sort();
    isCorrect = correctSet.length > 0 &&
      correctSet.length === studentSet.length &&
      correctSet.every((opt, i) => opt === studentSet[i]);
  } else {
    isCorrect = selectedAnswer === q.correctAnswer;
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
