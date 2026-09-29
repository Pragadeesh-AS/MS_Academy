// Numerical vs Theory classification, shared by the AI importer, the Question Bank editor and the
// test creator. It is separate from questionType: an MCQ whose options are values like "25 °C" is
// a numerical question, a NAT question always is one.
//
// A question's own `questionCategory` (set by the AI importer or by hand in the editor) always
// wins. Questions saved before this field existed fall back to inferQuestionCategory().

export const QUESTION_CATEGORIES = ['Numerical', 'Theory'];

const NAT_TYPES = ['Fill in Blanks', 'Fill in the Blanks'];

const plainText = (html) => String(html || '')
  .replace(/<span class="katex-mathml">[\s\S]*?<\/span>/g, ' ') // KaTeX's hidden MathML copy
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim();

// "25 °C", "-3.5", "2.0 × 10−3 m", "0.25 kJ/kg K", "₹ 450", "45%", "1/2" - a value, optionally with a unit
const isNumericValue = (text) => {
  const t = plainText(text).replace(/^[₹$€£]\s*/, '');
  if (!/^[-−+±]?\s*\(?\s*\d/.test(t)) return false;
  const rest = t.replace(/[-−+±×x·*/^()\d.,:%°\s′″'"≈=~⁰-₟]/g, ' ');
  const words = rest.split(/[\s/]+/).filter(Boolean);
  // Unit symbols are short ("m", "kJ", "rad", "mmHg"); real words mean it's a statement
  return words.length <= 4 && words.every(w => w.length <= 5);
};

export const inferQuestionCategory = (q) => {
  if (NAT_TYPES.includes(q?.questionType)) return 'Numerical';
  const options = ['optionA', 'optionB', 'optionC', 'optionD'].map(f => q?.[f]).filter(o => plainText(o));
  if (options.length >= 2 && options.every(isNumericValue)) return 'Numerical';
  return 'Theory';
};

export const getQuestionCategory = (q) => (
  QUESTION_CATEGORIES.includes(q?.questionCategory) ? q.questionCategory : inferQuestionCategory(q)
);

export const isNumericalQuestion = (q) => getQuestionCategory(q) === 'Numerical';
