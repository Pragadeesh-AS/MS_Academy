// Acronym and stream metadata for GATE and competitive exam study notes
const KNOWN_ACRONYMS = {
  // Mechanical Engineering
  'strength of materials': 'SOM',
  'mechanics of materials': 'SOM',
  'theory of machines': 'TOM',
  'fluid mechanics': 'FM',
  'fulid mechanics-mech': 'FM',
  'fluid mechanics-chem': 'FM',
  'engineering thermodynamics': 'ET',
  'thermodynamics - mech': 'ET',
  'thermodynamics-chem': 'TD',
  'thermodynamics': 'ET',
  'heat transfer': 'HT',
  'heat transfer-mech': 'HT',
  'heat transfer-chem': 'HT',
  'machine design': 'MD',
  'manufacturing': 'MP',
  'production engineering': 'PE',
  'industrial engineering': 'IE',
  'engineering mechanics': 'EM',
  'vibrations': 'VIB',
  'mechanical operations-chem': 'MO',
  'process calculations-chem': 'PC',

  // Computer Science & Data Science
  'algorithms': 'ALGO',
  'data structures': 'DS',
  'programming and data structures': 'P&DS',
  'programming, data structures and algorithms': 'PDSA',
  'computer organization and architecture': 'COA',
  'operating systems': 'OS',
  'database management systems': 'DBMS',
  'database management and warehousing': 'DBMS',
  'theory of computation': 'TOC',
  'compiler design': 'CD',
  'computer networks': 'CN',
  'digital logic': 'DL',
  'artificial intelligence': 'AI',
  'machine learning': 'ML',
  'python': 'PY',

  // Electrical & Electronics
  'analog circuits': 'AC',
  'digital circuits': 'DC',
  'control system': 'CS',
  'control systems': 'CS',
  'communications': 'COMM',
  'electronic devices': 'EDC',
  'electronic devices and circuits': 'EDC',
  'signals and systems': 'SS',
  'network': 'NET',
  'network theory': 'NET',
  'electromagnetics': 'EMF',
  'electrical machines': 'EM',
  'power systems': 'PS',
  'power electronics': 'PE',

  // Civil
  'structural analysis': 'SA',
  'geotechnical engineering': 'GE',
  'soil mechanics': 'SM',
  'environmental engineering': 'ENVI',
  'transportation engineering': 'TE',
  'surveying': 'SURV',
  'concrete structures': 'RCC',
  'steel structures': 'STEEL',
  'hydrology': 'HYD',
  'irrigation': 'IRR',

  // Mathematics & Aptitude
  'linear algebra': 'LA',
  'calculus': 'CALC',
  'calculus - maths': 'CALC',
  'differential equations': 'DE',
  'complex variables': 'CV',
  'probability': 'PROB',
  'probability and statistic': 'PROB',
  'probability and statistics': 'PROB',
  'numerical methods': 'NM',
  'general aptitude': 'GA',
  'engineering mathematics': 'EM',
  'matrix theory': 'MT',
  'joint distributions': 'JD',

  // Biotechnology
  'biochemistry': 'BIOCHEM',
  'cell biology': 'CELL BIO',
  'molecular biology': 'MOL BIO',
  'molecular   biology': 'MOL BIO',
  'immunology': 'IMMUNO',
  'genetics': 'GEN',
  'microbiology': 'MICRO',
  'animal biotechnology': 'ANIMAL BT',
  'plant biotechnology': 'PLANT BT',
  'bioreaction engineering': 'BRE',
  'recombinant dna technology': 'RDT',
  'tools in biotechnology': 'TOOLS BT',
  'upstream and downstream processing': 'DSP'
};

const SUBJECT_STREAM_CODES = {
  'strength of materials': 'ME · XE · PI',
  'theory of machines': 'ME · PI',
  'fluid mechanics': 'ME · XE · PI',
  'fulid mechanics-mech': 'ME · XE · PI',
  'fluid mechanics-chem': 'CH · XE',
  'engineering thermodynamics': 'ME · XE · PI',
  'thermodynamics - mech': 'ME · XE · PI',
  'thermodynamics-chem': 'CH · XE',
  'thermodynamics': 'ME · XE · PI',
  'heat transfer': 'ME · XE · PI',
  'heat transfer-mech': 'ME · XE · PI',
  'heat transfer-chem': 'CH · XE',
  'machine design': 'ME · PI',
  'production engineering': 'ME · PI',
  'manufacturing': 'ME · PI',
  'industrial engineering': 'ME · PI',
  'engineering mechanics': 'ME · XE · PI',
  'vibrations': 'ME · PI',
  'algorithms': 'CS · DA · IT',
  'programming and data structures': 'CS · DA · IT',
  'computer organization and architecture': 'CS · IT',
  'database management and warehousing': 'CS · DA · IT',
  'operating systems': 'CS · IT',
  'digital logic': 'CS · EC · EE',
  'machine learning': 'DA · CS · ST',
  'artificial intelligence': 'DA · CS',
  'analog circuits': 'EC · EE · IN',
  'digital circuits': 'EC · EE · IN',
  'control system': 'EC · EE · IN',
  'communications': 'EC · EE',
  'electronic devices': 'EC · IN',
  'signals and systems': 'EC · EE · IN',
  'network': 'EC · EE · IN',
  'linear algebra': 'ALL BRANCHES',
  'calculus': 'ALL BRANCHES',
  'differential equations': 'ALL BRANCHES',
  'probability and statistics': 'ALL BRANCHES',
  'engineering mathematics': 'ALL BRANCHES',
  'general aptitude': 'ALL BRANCHES'
};

const DEPT_DEFAULT_STREAMS = {
  'MECHANICAL ENGINEERING': 'ME · XE · PI',
  'Computer Science (CSE)': 'CS · IT · DA',
  'Data Science & AI (DS)': 'DA · CS · ST',
  'ECE': 'EC · EE · IN',
  'CHEMICAL ENGINEERING': 'CH · XE',
  'Civil (CE)': 'CE · ES',
  'Electrical (EE)': 'EE · IN',
  'Biotechnology (BT)': 'BT · XL',
  'STATISTICS': 'ST · DA',
  'ENGINEERING MATHEMATICS': 'ALL BRANCHES',
  'General Aptitude': 'ALL BRANCHES'
};

export const getSubjectAcronym = (name) => {
  if (!name) return 'NOTE';
  const clean = name.trim();
  const parenMatch = clean.match(/\(([^)]+)\)/);
  if (parenMatch && parenMatch[1].length <= 5) {
    return parenMatch[1].toUpperCase();
  }
  const lower = clean.toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
  if (KNOWN_ACRONYMS[lower]) return KNOWN_ACRONYMS[lower];

  const stripped = lower.replace(/\s*-\s*(chem|mech|maths)$/, '').trim();
  if (KNOWN_ACRONYMS[stripped]) return KNOWN_ACRONYMS[stripped];

  const stopWords = new Set(['of', 'and', '&', 'the', 'in', 'to', 'for', 'with', 'on', 'at', 'by']);
  const words = clean.split(/[\s\-_]+/).filter(w => w && !stopWords.has(w.toLowerCase()));
  if (words.length >= 2) {
    return words.slice(0, 4).map(w => w[0].toUpperCase()).join('');
  }
  if (clean.length <= 4) return clean.toUpperCase();
  return clean.slice(0, 4).toUpperCase();
};

export const getSubjectSubtitle = (name) => {
  if (!name) return 'STUDY MATERIAL';
  const clean = name.trim();
  const lower = clean.toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
  if (lower.includes('thermodynamics') && lower.includes('mech')) return 'ENGINEERING THERMODYNAMICS';
  if (lower.includes('fulid mechanics') || lower.includes('fluid mechanics')) return 'FLUID MECHANICS';
  if (lower.includes('heat transfer')) return 'HEAT TRANSFER';
  // Strip trailing -MECH, -CHEM, etc.
  return clean.replace(/\s*-\s*(chem|mech|maths)$/i, '').toUpperCase();
};

export const getSubjectStreamCodes = (subjectName, departmentName) => {
  if (subjectName) {
    const lower = subjectName.toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
    if (SUBJECT_STREAM_CODES[lower]) return SUBJECT_STREAM_CODES[lower];
    const stripped = lower.replace(/\s*-\s*(chem|mech|maths)$/, '').trim();
    if (SUBJECT_STREAM_CODES[stripped]) return SUBJECT_STREAM_CODES[stripped];
  }
  if (departmentName && DEPT_DEFAULT_STREAMS[departmentName]) {
    return DEPT_DEFAULT_STREAMS[departmentName];
  }
  return 'GATE · ESE';
};
