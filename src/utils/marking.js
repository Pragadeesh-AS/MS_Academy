// GATE marking scheme, in one place for the Question Bank, the AI importer, the test screen and
// scoring. A question stores its marks as a label ("1 Mark (-0.33)" / "2 Mark (-0.66)") plus a
// numeric `negativeMark`:
//   MCQ (Single Choice) and Match: wrong answer loses 1/3 of the marks  (1 -> 0.33, 2 -> 0.66)
//   MSQ (Multiple Choice) and NAT (Fill in Blanks): no negative marking

export const MARK_LABELS = { 1: '1 Mark (-0.33)', 2: '2 Mark (-0.66)' };

const NEGATIVE_MARKED_TYPES = ['Single Choice', 'Match'];

// "1 Mark (-0.33)" -> 1, "2" -> 2
export const markNumberOf = (mark) => {
  const m = String(mark ?? '').match(/\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
};

export const positiveMarkFor = (q) => markNumberOf(q?.mark) || 1;

export const hasNegativeMarking = (q) => NEGATIVE_MARKED_TYPES.includes(q?.questionType);

export const negativeMarkFor = (q) => {
  if (!hasNegativeMarking(q)) return 0;
  const n = positiveMarkFor(q);
  if (n === 1) return 0.33;
  if (n === 2) return 0.66;
  return Math.round((n / 3) * 100) / 100;
};

// Mark label for n marks: the admin's Mark attribute value if one matches, else the standard label
export const markLabelFor = (n, markAttributeNames = []) => (
  markAttributeNames.find(m => markNumberOf(m) === n) || MARK_LABELS[n] || `${n} Mark (-${Math.round((n / 3) * 100) / 100})`
);

// Fields to save when a question's marks (or type) change
export const markingFields = (q) => ({ negativeMark: negativeMarkFor(q) });
