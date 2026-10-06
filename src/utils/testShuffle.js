// Exam question order and per-student shuffling.
//
// examSections() is the standard order of a test: General Aptitude first, then the core section
// (maths + core subject), 1-mark questions before 2-mark ones in each. Attempts are always saved in
// this order, so "Q5" is the same question for every student in analytics, reports and exports.
//
// Each student is shown their own shuffle of it: questions are shuffled inside each section and
// mark group (the GATE layout stays - aptitude first, 1-mark before 2-mark), and the options of
// every MCQ / MSQ / Match question are shuffled too. The shuffle is seeded by student + test, so it
// is the same after a refresh or resume, but different from the student sitting next to them.
// Answers are still stored by the option's own key ('A'..'D'), so grading and analytics don't
// depend on the order it was shown in.

const isAptitude = (q) => /ap+titude/.test((q.department || '').trim().toLowerCase()); // also the "Apptitude" spelling
const isMaths = (q) => {
  const dept = (q.department || '').trim().toLowerCase();
  return dept.includes('mathematics') || dept.includes('maths');
};
const markOf = (q) => parseFloat(q.mark) || 1;
const byMarks = (qs) => [...qs].sort((a, b) => markOf(a) - markOf(b));

// { orderedQuestions, sections: [{ id, name, startIndex, count }] }
export const examSections = (questions, department) => {
  const aptitudeQs = [];
  const mathsQs = [];
  const coreQs = [];
  questions.forEach(q => {
    if (isAptitude(q)) aptitudeQs.push(q);
    else if (isMaths(q)) mathsQs.push(q);
    else coreQs.push(q);
  });

  const sortedAptitude = byMarks(aptitudeQs);
  const coreSectionQs = [...byMarks(mathsQs), ...byMarks(coreQs)];

  const sections = [];
  let ordered = [];
  if (sortedAptitude.length > 0) {
    sections.push({ id: 'aptitude', name: 'General Aptitude', startIndex: 0, count: sortedAptitude.length });
    ordered = ordered.concat(sortedAptitude);
  }
  if (coreSectionQs.length > 0) {
    const coreDeptName = coreQs.length > 0 ? coreQs[0].department : (mathsQs.length > 0 ? mathsQs[0].department : department);
    sections.push({ id: 'core', name: coreDeptName || 'Core Subject', startIndex: ordered.length, count: coreSectionQs.length });
    ordered = ordered.concat(coreSectionQs);
  }
  if (sections.length === 0) {
    sections.push({ id: 'all', name: 'All Sections', startIndex: 0, count: ordered.length });
  }
  return { orderedQuestions: ordered, sections };
};

// ---- Seeded randomness (same seed -> same shuffle)

const hashString = (str) => {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  return h1 >>> 0;
};

const randomFrom = (seed) => {
  let a = hashString(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const seededShuffle = (items, seed) => {
  const out = [...items];
  const rand = randomFrom(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

// The student + test the shuffle is seeded with
export const shuffleSeed = (email, testId) => `${(email || 'guest').trim().toLowerCase()}|${testId || 'test'}`;

// This student's question order: shuffled inside each section and each mark group of it.
// sections come from examSections(); the section boundaries don't move.
export const shuffledQuestions = (orderedQuestions, sections, seed) => sections.flatMap(sec => {
  const inSection = orderedQuestions.slice(sec.startIndex, sec.startIndex + sec.count);
  const marks = [...new Set(inSection.map(markOf))].sort((a, b) => a - b);
  return marks.flatMap(m => seededShuffle(inSection.filter(q => markOf(q) === m), `${seed}|${sec.id}|${m}`));
});

// ---- Options

export const OPTION_KEYS = ['A', 'B', 'C', 'D'];

const plainText = (html) => String(html || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

// Options like "All of the above", "Both A and B" or "(a) and (c)" depend on where the other options
// are, so a question with any of them keeps its options in the original order
const REFERS_TO_OTHER_OPTIONS = [
  /\b(all|none|any)\s+of\s+(the\s+)?(above|these|them|those|options)\b/i,
  /\b(the\s+)?(above|preceding)\s+(options?|answers?|statements?)\b/i,
  /\bboth\b.*\band\b/i,
  /\bneither\b.*\bnor\b/i,
  /\boptions?\s*\(?[a-d]\)?(?![a-z])/i,
  /\([a-d]\)/i,
  /\b[A-D]\s*(,|&|and|or)\s*[A-D]\b/,
  /^\s*(only\s+)?[A-D]\s*$/,
];
const refersToOtherOptions = (q) => OPTION_KEYS.some(k => {
  const text = plainText(q[`option${k}`]);
  return text && REFERS_TO_OTHER_OPTIONS.some(re => re.test(text));
});

const hasOption = (q, k) => !!plainText(q[`option${k}`]) || !!q[`option${k}Image`];

// The option keys of a question in the order this student sees them, e.g. ['C', 'A', 'D', 'B'].
// NAT questions have no options; questions whose options refer to each other aren't shuffled.
export const optionOrderFor = (q, seed) => {
  const keys = OPTION_KEYS.filter(k => hasOption(q, k));
  if (q.questionType === 'Fill in Blanks' || keys.length < 2 || refersToOtherOptions(q)) return keys;
  return seededShuffle(keys, `${seed}|${q.id}|options`);
};
