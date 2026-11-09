// Subjects come from the admin Attributes tab (Firestore 'question_attributes'): a 'subject' attribute's
// parentId is its department attribute. Department names differ across the app - teachers/students
// carry "Computer Science (CSE)" while attributes may say "CSE" - so both forms are accepted.

// Engineering Mathematics and Aptitude banks are shared by every department.
export const isCommonDeptName = (name) => {
  const n = (name || '').trim().toLowerCase();
  return n === 'engineering mathematics' || /ap+titude/.test(n);
};

const shortCode = (name) => ((name || '').match(/\(([^)]+)\)/) || [])[1]?.trim().toLowerCase() || '';

// The name without its "(CODE)" and a trailing "Engineering": "Mechanical Engineering (ME)" -> "mechanical"
const baseName = (name) => (name || '').replace(/\([^)]*\)/g, '').trim().toLowerCase().replace(/\s+engineering$/, '').trim();

// "Mechanical (ME)", "ME", "Mechanical" and "Mechanical Engineering" are all the same department
export const sameDepartment = (a, b) => {
  const x = (a || '').trim().toLowerCase();
  const y = (b || '').trim().toLowerCase();
  if (!x || !y) return false;
  if (x === y) return true;
  if (/ap+titude/.test(x) && /ap+titude/.test(y)) return true;
  if ((x.includes('mathematics') || x.includes('maths')) && (y.includes('mathematics') || y.includes('maths'))) return true;
  const cx = shortCode(a);
  const cy = shortCode(b);
  if ((!!cx && (cx === y || cx === cy)) || (!!cy && cy === x)) return true;
  const bx = baseName(a);
  return !!bx && bx === baseName(b);
};

// The departments students pick from during onboarding - tests and classes are saved under these
// names so they reach the right students (see canonicalDepartment)
export const STUDENT_DEPARTMENTS = [
  'Computer Science (CSE)',
  'ECE',
  'MECHANICAL ENGINEERING',
  'Civil (CE)',
  'Electrical (EE)',
  'Data Science & AI (DS)',
  'Production & Industrial Engg (PI)',
  'Instrumentation Engg (IN)',
  'Biotechnology (BT)',
  'CHEMICAL ENGINEERING',
  'Biomedical Engineering (BM)',
  'Physics (PH)',
  'Architecture & Planning (AR)',
  'Agricultural Engineering (AG)',
  'Metallurgical Engineering (MT)',
  'Environmental Science (ES)',
  'Life Sciences (XL)',
  'Aerospace Engineering (AE)',
  'STATISTICS',
];

// Other common ways admins or users name a department, mapped to the official attribute names
const DEPARTMENT_ALIASES = {
  aids: 'Data Science & AI (DS)',
  'ai&ds': 'Data Science & AI (DS)',
  'ai & ds': 'Data Science & AI (DS)',
  'ai and ds': 'Data Science & AI (DS)',
  'ai-ds': 'Data Science & AI (DS)',
  'artificial intelligence and data science': 'Data Science & AI (DS)',
  eee: 'Electrical (EE)',
  civil: 'Civil (CE)',
  'electronics (ece)': 'ECE',
  electronics: 'ECE',
  ece: 'ECE',
  'mechanical (me)': 'MECHANICAL ENGINEERING',
  'mechanical engineering (me)': 'MECHANICAL ENGINEERING',
  'mechanical engineering': 'MECHANICAL ENGINEERING',
  mechanical: 'MECHANICAL ENGINEERING',
  me: 'MECHANICAL ENGINEERING',
  'chemical (ch)': 'CHEMICAL ENGINEERING',
  'chemical engineering (ch)': 'CHEMICAL ENGINEERING',
  'chemical engineering': 'CHEMICAL ENGINEERING',
  chemical: 'CHEMICAL ENGINEERING',
  ch: 'CHEMICAL ENGINEERING',
  'statistics (st)': 'STATISTICS',
  statistics: 'STATISTICS',
  stats: 'STATISTICS',
  st: 'STATISTICS',
  aptitude: 'General Aptitude',
  apptitude: 'General Aptitude',
  'general aptitude': 'General Aptitude',
  'engineering mathematics': 'ENGINEERING MATHEMATICS',
  mathematics: 'ENGINEERING MATHEMATICS',
  maths: 'ENGINEERING MATHEMATICS',
};

// Returns the official attribute department name ("MECHANICAL ENGINEERING", "CHEMICAL ENGINEERING", "ECE", "STATISTICS", "General Aptitude", etc.)
export const canonicalDepartment = (name) => {
  const n = (name || '').trim();
  if (!n) return '';
  const lower = n.toLowerCase();
  if (DEPARTMENT_ALIASES[lower]) return DEPARTMENT_ALIASES[lower];
  if (/ap+titude/.test(lower)) return 'General Aptitude';
  if (lower.includes('mathematics') || lower.includes('maths')) return 'ENGINEERING MATHEMATICS';
  const hit = STUDENT_DEPARTMENTS.find(d => sameDepartment(d, n));
  return hit || n;
};

const toTitleCase = (s) => (s || '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

/**
 * Subjects a class in `department` can be about: the department's own subjects first, then the
 * shared Engineering Mathematics / Aptitude subjects (flagged `common`, labelled with their bank).
 * Returns [{ name, label, common }], de-duplicated by name.
 */
export const subjectOptionsFor = (attributes, department) => {
  const deptAttrs = attributes.filter(a => a.type === 'department');
  const ownDept = deptAttrs.find(a => sameDepartment(a.name, department));
  const commonDepts = deptAttrs.filter(a => isCommonDeptName(a.name) && a.id !== ownDept?.id);

  const seen = new Set();
  const options = [];
  const add = (name, label, common) => {
    const key = (name || '').trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    options.push({ name: name.trim(), label, common });
  };

  attributes
    .filter(a => a.type === 'subject' && ownDept && a.parentId === ownDept.id)
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(a => add(a.name, a.name, false));
  commonDepts.forEach(dept => attributes
    .filter(a => a.type === 'subject' && a.parentId === dept.id)
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(a => add(a.name, `${toTitleCase(dept.name)} : ${a.name}`, true)));

  return options;
};

// Folder name for a recording/class with no subject (older recordings, synced files)
export const NO_SUBJECT = 'Other Recordings';

export const subjectFolderName = (item) => (item?.subject || '').trim() || NO_SUBJECT;

// Groups items into subject folders, alphabetically, with the no-subject folder last
export const groupBySubject = (items) => {
  const map = {};
  items.forEach(item => {
    const key = subjectFolderName(item);
    (map[key] = map[key] || []).push(item);
  });
  return Object.keys(map)
    .sort((a, b) => (a === NO_SUBJECT) - (b === NO_SUBJECT) || a.localeCompare(b))
    .map(name => ({ name, items: map[name] }));
};
