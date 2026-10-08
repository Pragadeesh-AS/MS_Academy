// One definition of "the same question", shared by the Question Bank (its duplicate cleanup and
// its add/save check) and the AI importer, so a question one of them accepts is never treated as a
// duplicate by the other.
//
// A question is the same when its text, options (and Match columns) and images are the same.
// Options matter: "Which of the following is correct?" with different options are different questions.

const OPTION_FIELDS = ['optionA', 'optionB', 'optionC', 'optionD'];
const IMAGE_FIELDS = ['questionImageUrl', 'optionAImage', 'optionBImage', 'optionCImage', 'optionDImage'];
const SEP = '␟';

// Only real HTML tags are removed: option text like "<class 'dict'>" is content, and stripping it
// would make "<class 'dict'>" and "<class 'list'>" look identical.
const HTML_TAG = /<\/?(?:a|abbr|b|blockquote|br|code|div|em|font|h[1-6]|hr|i|img|li|mark|math|ol|p|pre|s|small|span|strike|strong|sub|sup|svg|path|line|table|tbody|td|th|thead|tr|u|ul|annotation|semantics|mrow|mi|mo|mn|msup|msub|msubsup|mfrac|msqrt|mtext|mspace)\b[^>]*>/gi;

const stripHtml = (html) => String(html || '')
  .replace(/&nbsp;/g, ' ')
  .replace(HTML_TAG, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const decodeEntities = (s) => s
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;|&#x27;/g, "'")
  .replace(/&amp;/g, '&');

const columns = (q) => [...(q.matchColumn1 || []), ...(q.matchColumn2 || [])];

export const isEmptyQuestion = (q) => !stripHtml(q?.questionText)
  && OPTION_FIELDS.every(f => !stripHtml(q?.[f]))
  && IMAGE_FIELDS.every(f => !q?.[f]);

// Exact identity: used where duplicates are deleted automatically, so it stays strict.
// A question the extracter compared and chose to import anyway (allowDuplicate) is its own
// identity, so the Question Bank cleanup never deletes it as a copy of the one it was compared with.
export const questionFingerprint = (q) => [
  stripHtml(q.questionText),
  ...OPTION_FIELDS.map(f => stripHtml(q[f])),
  ...columns(q).map(stripHtml).filter(Boolean),
  ...IMAGE_FIELDS.map(f => q[f] || ''),
  ...(q.allowDuplicate === true ? [`keep:${q.id || ''}`] : [])
].join(SEP);

// Looser text identity for spotting an incoming question that is already in the bank: ignores
// spacing and HTML entity differences between the AI's output and hand-typed questions.
const looseText = (html) => decodeEntities(stripHtml(html)).replace(/\s+/g, '');
const looseTextKey = (q) => [
  looseText(q.questionText),
  ...OPTION_FIELDS.map(f => looseText(q[f])),
  ...columns(q).map(looseText).filter(Boolean)
].join(SEP);

// 64-bit difference hash of an image, so two crops of the same diagram (a few pixels apart)
// still count as the same picture. null when the image can't be read (e.g. cross-origin).
const imageSignature = (src) => new Promise(resolve => {
  if (typeof Image === 'undefined') { resolve(null); return; }
  const img = new Image();
  img.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 9;
      canvas.height = 8;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 9, 8);
      ctx.drawImage(img, 0, 0, 9, 8);
      const d = ctx.getImageData(0, 0, 9, 8).data;
      const gray = Array.from({ length: 72 }, (_, i) => 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]);
      const bits = [];
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits.push(gray[y * 9 + x] > gray[y * 9 + x + 1] ? 1 : 0);
      resolve(bits);
    } catch {
      resolve(null);
    }
  };
  img.onerror = () => resolve(null);
  img.src = src;
});

const MAX_HASH_DISTANCE = 10;

/**
 * For each candidate, finds whether it duplicates a question already in `existing` or an earlier
 * candidate in the same list. Returns an array parallel to `candidates`:
 *   null                                  - new question
 *   { source: 'bank', question }          - already in the Question Bank
 *   { source: 'batch', index }            - repeats candidates[index]
 */
export const findDuplicateQuestions = async (candidates, existing) => {
  const signatures = new Map();
  const signatureOf = (src) => {
    if (!signatures.has(src)) signatures.set(src, imageSignature(src));
    return signatures.get(src);
  };

  // Same text and options: now the pictures decide. A missing picture on one side still counts
  // as the same question (e.g. typed by hand without the diagram); two different pictures don't.
  const sameImages = async (a, b) => {
    for (const f of IMAGE_FIELDS) {
      if (!a[f] || !b[f] || a[f] === b[f]) continue;
      const [sa, sb] = await Promise.all([signatureOf(a[f]), signatureOf(b[f])]);
      if (!sa || !sb) return false; // can't compare - keep both rather than lose a question
      const distance = sa.reduce((n, bit, i) => n + (bit !== sb[i] ? 1 : 0), 0);
      if (distance > MAX_HASH_DISTANCE) return false;
    }
    return true;
  };

  const bankIndex = new Map();
  for (const q of existing) {
    if (isEmptyQuestion(q)) continue;
    const key = looseTextKey(q);
    if (!bankIndex.has(key)) bankIndex.set(key, []);
    bankIndex.get(key).push(q);
  }

  const batchIndex = new Map();
  const results = [];
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    if (isEmptyQuestion(c)) { results.push(null); continue; }
    const key = looseTextKey(c);
    let match = null;
    for (const q of bankIndex.get(key) || []) {
      if (await sameImages(c, q)) { match = { source: 'bank', question: q }; break; }
    }
    if (!match) {
      for (const j of batchIndex.get(key) || []) {
        if (await sameImages(c, candidates[j])) { match = { source: 'batch', index: j }; break; }
      }
    }
    if (!match) {
      if (!batchIndex.has(key)) batchIndex.set(key, []);
      batchIndex.get(key).push(i);
    }
    results.push(match);
  }
  return results;
};
