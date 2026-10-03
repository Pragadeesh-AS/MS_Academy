// Built-in test blueprints for the Tests Manager wizard. Picking one fills the specs (duration,
// marks, 1-mark / 2-mark counts, numerical / theory split); after the topics are chosen the
// question counts are spread across those topics automatically (see distributeAllocations).
//
// Every template is 70% numerical and 30% theory questions (by question count).

export const NUMERICAL_SHARE = 0.7;

export const TEST_TEMPLATES = [
  {
    key: 'topic',
    name: 'Topic Test',
    duration: 40,
    q1: 10,
    q2: 5,
    description: 'One or more topics - 10 x 1 mark + 5 x 2 marks',
  },
  {
    key: 'subject',
    name: 'Subject / Multi-Subject Test',
    duration: 60,
    q1: 20,
    q2: 10,
    description: 'One or more subjects - 20 x 1 mark + 10 x 2 marks',
  },
  {
    key: 'full',
    name: 'Full Length Test',
    duration: 180,
    q1: 30,
    q2: 35,
    description: 'GATE pattern - General Aptitude, Engineering Mathematics and the core subject',
    // Section 1 = General Aptitude (15 marks); Section 2 = Mathematics (15) + Core subject (70)
    sections: [
      { group: 'aptitude', name: 'General Aptitude', section: 'Section 1', q1: 5, q2: 5 },
      { group: 'maths', name: 'Engineering Mathematics', section: 'Section 2', q1: 5, q2: 5 },
      { group: 'core', name: 'Core Subject', section: 'Section 2', q1: 20, q2: 25 },
    ],
  },
];

export const templateByKey = (key) => TEST_TEMPLATES.find(t => t.key === key) || null;

export const templateMarks = (t) => t.q1 + t.q2 * 2;
export const templateQuestions = (t) => t.q1 + t.q2;
export const templateNumerical = (t) => Math.round(templateQuestions(t) * NUMERICAL_SHARE);

// Which part of a full-length paper a subject belongs to
export const subjectGroup = (subjectName, commonDeptName = '') => {
  const dept = (commonDeptName || '').trim().toLowerCase();
  const sub = (subjectName || '').trim().toLowerCase();
  if (/ap+titude/.test(dept) || /ap+titude/.test(sub)) return 'aptitude';
  if (dept === 'engineering mathematics' || /mathematics|maths/.test(sub)) return 'maths';
  return 'core';
};

// Spread `wanted` questions over topics as evenly as possible, never giving a topic more than
// the bank has. Returns { [topic]: count } and how many couldn't be placed.
const spread = (topics, wanted, available) => {
  const out = Object.fromEntries(topics.map(t => [t, 0]));
  let left = wanted;
  let progress = true;
  while (left > 0 && progress) {
    progress = false;
    for (const t of topics) {
      if (left > 0 && out[t] < (available[t] || 0)) {
        out[t] += 1;
        left -= 1;
        progress = true;
      }
    }
  }
  return { counts: out, short: left };
};

// Allocations for a template over the selected topics.
//   topics:       selected topic names
//   availability: { [topic]: { q1, q2 } } questions in the bank
//   groupOf:      topic -> 'aptitude' | 'maths' | 'core' (only used by sectioned templates)
// Returns { allocations: { [topic]: { q1, q2 } }, shortages: [{ name, mark, missing }] }
export const distributeAllocations = (template, topics, availability, groupOf = () => 'core') => {
  const parts = template.sections
    ? template.sections.map(s => ({ ...s, topics: topics.filter(t => groupOf(t) === s.group) }))
    : [{ name: template.name, q1: template.q1, q2: template.q2, topics }];

  const allocations = Object.fromEntries(topics.map(t => [t, { q1: 0, q2: 0 }]));
  const shortages = [];
  parts.forEach(part => {
    ['q1', 'q2'].forEach(markKey => {
      const wanted = part[markKey];
      if (!wanted) return;
      if (part.topics.length === 0) {
        shortages.push({ name: part.name, mark: markKey === 'q1' ? 1 : 2, missing: wanted, noTopics: true });
        return;
      }
      const avail = Object.fromEntries(part.topics.map(t => [t, availability[t]?.[markKey] || 0]));
      const { counts, short } = spread(part.topics, wanted, avail);
      Object.entries(counts).forEach(([t, n]) => { allocations[t][markKey] = n; });
      if (short > 0) shortages.push({ name: part.name, mark: markKey === 'q1' ? 1 : 2, missing: short });
    });
  });
  return { allocations, shortages };
};

// ---- Folders: tests are grouped by the template they were made from (admin and students)
export const TEMPLATE_FOLDERS = [
  { key: 'topic', name: 'Topic Tests' },
  { key: 'subject', name: 'Subject Tests' },
  { key: 'full', name: 'Full Length Tests' },
];
export const OTHER_FOLDER = { key: 'other', name: 'Other Tests' };

// Template a test belongs to. Tests saved before templates existed are matched by their specs
// (duration + 1-mark / 2-mark counts); anything else is 'other'.
export const templateKeyOf = (test) => {
  if (templateByKey(test?.templateKey)) return test.templateKey;
  const match = TEST_TEMPLATES.find(t =>
    Number(test?.duration) === t.duration && Number(test?.total1Mark) === t.q1 && Number(test?.total2Mark) === t.q2);
  return match ? match.key : OTHER_FOLDER.key;
};

// The three template folders, plus "Other Tests" only when some test needs it
export const templateFoldersFor = (tests) => {
  const counts = {};
  tests.forEach(t => { const k = templateKeyOf(t); counts[k] = (counts[k] || 0) + 1; });
  return [...TEMPLATE_FOLDERS, ...(counts[OTHER_FOLDER.key] ? [OTHER_FOLDER] : [])]
    .map(f => ({ ...f, count: counts[f.key] || 0, template: templateByKey(f.key) }));
};

export const folderName = (key) => [...TEMPLATE_FOLDERS, OTHER_FOLDER].find(f => f.key === key)?.name || '';
