import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Upload, FileText, CheckCircle2, X, Database, BrainCircuit, AlertCircle } from 'lucide-react';
import { db } from '../../firebase';
import { collection, addDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import { GoogleGenAI } from '@google/genai';
import katex from 'katex';
import { findDuplicateQuestions } from '../../utils/questionDuplicates';
import { QUESTION_CATEGORIES, inferQuestionCategory } from '../../utils/questionCategory';
import 'katex/dist/katex.min.css';

// Configure the worker for PDF.js using a CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = '//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';


// ---------- Numerical (Fill in Blanks / NAT) answer handling ----------
const NUM_RE = '-?\\d+(?:\\.\\d+)?';

const decimalsOf = (numStr) => {
  const m = String(numStr).match(/\.(\d+)/);
  return m ? m[1].length : 0;
};

const stripTags = (html) => String(html || '')
  // KaTeX keeps a hidden MathML copy of every formula, which would double every number
  .replace(/<span class="katex-mathml">[\s\S]*?<\/span>/g, ' ')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/\u2212|\u2013|\u2014/g, '-');

// Cleans LaTeX / symbols so "0.24 \text{ to } 0.26", "0.24 → 0.26" or "0.24 ~ 0.26" read like plain ranges
const normalizeNumericText = (raw) => stripTags(raw)
  .replace(/\\(?:text|mathrm|textbf|mathbf)\s*\{([^}]*)\}/g, ' $1 ')
  .replace(/\\(?:to|rightarrow)(?![a-zA-Z])/g, ' to ')
  .replace(/\\[,;:! ]/g, ' ')
  .replace(/[{}$]/g, ' ')
  .replace(/(\d),(?=\d{3}(?!\d))/g, '$1')
  .replace(/\u2192|->|~/g, ' to ');

const allNumbers = (raw) => (normalizeNumericText(raw).match(new RegExp(NUM_RE, 'g')) || []);

// Reads one piece of text and returns { mode, answer, start, end } if it holds a number or a range
const readNumeric = (raw) => {
  const text = normalizeNumericText(raw);

  // 2.5 ± 0.1  /  2.5 +/- 0.1
  const pm = text.match(new RegExp(`(${NUM_RE})\\s*[A-Za-z%\u00b0\u00b5\u03a9/\u00b2\u00b3]{0,8}\\s*(?:\u00b1|\\+\\s*/\\s*-|\\+-)\\s*(\\d+(?:\\.\\d+)?)`));
  if (pm) {
    const v = parseFloat(pm[1]);
    const d = parseFloat(pm[2]);
    const dec = Math.max(decimalsOf(pm[1]), decimalsOf(pm[2]));
    return { mode: 'Numeric Range', start: (v - d).toFixed(dec), end: (v + d).toFixed(dec), dec };
  }

  // 2.4 to 2.6  /  2.4 - 2.6  /  2.4 m to 2.6 m  /  between 2.4 and 2.6
  const range = text.match(new RegExp(`(${NUM_RE})[A-Za-z%\u00b0\u00b5\u03a9/\u00b2\u00b3\\s]{0,14}?\\s*(?:\\bto\\b|\\band\\b|-)\\s*(${NUM_RE})`, 'i'));
  if (range) {
    const a = parseFloat(range[1]);
    const b = parseFloat(range[2]);
    const [lo, hi] = a <= b ? [range[1], range[2]] : [range[2], range[1]];
    return { mode: 'Numeric Range', start: lo, end: hi, dec: Math.max(decimalsOf(range[1]), decimalsOf(range[2])) };
  }

  const single = text.match(new RegExp(`${NUM_RE}(?:[eE][-+]?\\d+)?`));
  if (single) return { mode: 'Exact Match', answer: single[0], dec: decimalsOf(single[0]) };
  return null;
};

// Fills the question-bank fields for a NAT question: answer, or the accepted range, plus precision
const applyNatFields = (q) => {
  const isNat = ['Fill in the Blanks', 'Fill in Blanks'].includes(q.questionType);
  if (!isNat) return q;

  const base = {
    ...q,
    questionType: 'Fill in Blanks',
    fillBlankMode: 'Exact Match',
    fillBlankPrecision: 'None',
    fillBlankRangeStart: '',
    fillBlankRangeEnd: ''
  };

  // Places the question / explanation usually state the answer or the accepted range
  const context = [q.questionText, q.explanation].map(stripTags).join('\n');
  const lines = context.split('\n');
  const answerLines = lines.filter(l => /(answer|\bans\b)/i.test(l));
  const rangeLines = lines.filter(l => /(accept|tolerance|range)/i.test(l));

  const explicitRange = q.fillBlankRangeStart !== undefined && q.fillBlankRangeEnd !== undefined
    && String(q.fillBlankRangeStart).trim() !== '' && String(q.fillBlankRangeEnd).trim() !== ''
    ? readNumeric(`${q.fillBlankRangeStart} to ${q.fillBlankRangeEnd}`) : null;
  const fromAnswerField = q.fillBlankAnswer ? readNumeric(q.fillBlankAnswer) : null;
  const fromAnswerLines = answerLines.map(readNumeric).filter(Boolean);
  const fromRangeLines = rangeLines.map(readNumeric).filter(r => r && r.mode === 'Numeric Range');

  // The AI flagged a range but its bounds did not read cleanly: take the first two numbers it gave
  const flaggedRange = (() => {
    if (q.fillBlankMode !== 'Numeric Range') return null;
    const nums = [q.fillBlankRangeStart, q.fillBlankRangeEnd, q.fillBlankAnswer, ...answerLines, ...rangeLines]
      .filter(v => v !== undefined && v !== null && String(v).trim() !== '')
      .flatMap(allNumbers);
    if (nums.length < 2) return null;
    const [a, b] = [nums[0], nums[1]];
    const [lo, hi] = parseFloat(a) <= parseFloat(b) ? [a, b] : [b, a];
    return { mode: 'Numeric Range', start: lo, end: hi, dec: Math.max(decimalsOf(a), decimalsOf(b)) };
  })();

  const range = explicitRange
    || (fromAnswerField && fromAnswerField.mode === 'Numeric Range' ? fromAnswerField : null)
    || fromAnswerLines.find(r => r.mode === 'Numeric Range')
    || fromRangeLines[0]
    || flaggedRange;
  const exact = (fromAnswerField && fromAnswerField.mode === 'Exact Match' ? fromAnswerField : null)
    || fromAnswerLines.find(r => r.mode === 'Exact Match');
  const pick = range || exact;
  if (!pick) return base;

  const precision = pick.dec >= 4 ? '.0000' : pick.dec === 3 ? '.000' : pick.dec === 2 ? '.00' : 'None';
  if (pick.mode === 'Numeric Range') {
    return {
      ...base,
      fillBlankMode: 'Numeric Range',
      fillBlankRangeStart: pick.start,
      fillBlankRangeEnd: pick.end,
      fillBlankAnswer: exact ? exact.answer : '',
      fillBlankPrecision: precision
    };
  }
  return { ...base, fillBlankAnswer: pick.answer, fillBlankPrecision: precision };
};

// ---------- LaTeX safety net ----------
// The AI's LaTeX is not always valid (e.g. "10^1^\circ"). KaTeX's non-throwing mode shows such
// formulas as red source code, so every formula is rendered strictly, repaired and retried on
// failure, and as a last resort turned into readable plain text - never shown as an error.
const escapeHTML = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const LATEX_SYMBOLS = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε', zeta: 'ζ', eta: 'η',
  theta: 'θ', vartheta: 'ϑ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π',
  rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ', phi: 'φ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
  times: '×', cdot: '·', div: '÷', pm: '±', mp: '∓', circ: '°', degree: '°', infty: '∞', approx: '≈',
  neq: '≠', ne: '≠', leq: '≤', le: '≤', geq: '≥', ge: '≥', ll: '≪', gg: '≫', to: '→', rightarrow: '→',
  leftarrow: '←', Rightarrow: '⇒', Leftarrow: '⇐', leftrightarrow: '↔', Leftrightarrow: '⇔',
  partial: '∂', nabla: '∇', sum: '∑', prod: '∏', int: '∫', oint: '∮', propto: '∝', equiv: '≡', sim: '∼',
  simeq: '≃', cdots: '⋯', ldots: '…', dots: '…', angle: '∠', perp: '⊥', parallel: '∥', in: '∈', notin: '∉',
  forall: '∀', exists: '∃', hbar: 'ℏ', ell: 'ℓ', prime: '′', therefore: '∴', because: '∵', cup: '∪',
  cap: '∩', subset: '⊂', subseteq: '⊆', emptyset: '∅', neg: '¬', land: '∧', lor: '∨', oplus: '⊕',
  uparrow: '↑', downarrow: '↓', triangle: '△', square: '□', bullet: '•', star: '⋆', langle: '⟨', rangle: '⟩'
};
const LATEX_FUNCTIONS = new Set(['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'log', 'ln', 'exp', 'lim', 'max', 'min', 'det', 'sinh', 'cosh', 'tanh', 'arcsin', 'arccos', 'arctan']);
// Commands whose "\b", "\f", "\n", "\r", "\t" start collides with a JSON escape (see repairJsonBackslashes)
const LATEX_COMMANDS = new Set([
  ...Object.keys(LATEX_SYMBOLS), ...LATEX_FUNCTIONS,
  'text', 'textbf', 'textit', 'textrm', 'textdegree', 'tfrac', 'dfrac', 'frac', 'binom', 'bar', 'boldsymbol', 'bf',
  'begin', 'bmatrix', 'big', 'bigg', 'bigl', 'bigr', 'biggl', 'biggr', 'bot', 'boxed', 'right', 'rm', 'rceil',
  'rfloor', 'rbrace', 'rvert', 'rVert', 'nabla', 'not', 'newline', 'nleq', 'ngeq', 'nmid', 'nparallel',
  'nexists', 'nless', 'ngtr', 'theta', 'tau', 'tan', 'tanh', 'tilde', 'triangle', 'therefore', 'times', 'tfrac', 'nu'
]);

// The AI is told to double every backslash, but sometimes writes "\times" or "\frac" in the JSON.
// JSON.parse turns "\t"/"\f"/"\b"/"\n"/"\r" into control characters ("\times" -> TAB + "imes") and
// rejects "\D", "\{" etc. outright, so fix those backslashes before parsing.
const repairJsonBackslashes = (raw) => raw.replace(/\\(\\|u[0-9a-fA-F]{4}|[a-zA-Z]+|[\s\S])/g, (m, tok) => {
  if (tok === '\\' || /^u[0-9a-fA-F]{4}$/.test(tok) || tok === '"' || tok === '/') return m;
  if (/^[a-zA-Z]/.test(tok)) {
    const first = tok[0];
    if (first === 'b' || first === 'f') return '\\' + m; // a real backspace/form feed never appears here
    if ('nrt'.includes(first)) return LATEX_COMMANDS.has(tok) ? '\\' + m : m; // "\nThe" stays a newline
    return '\\' + m; // "\Delta", "\sigma", "\underline": invalid JSON escapes
  }
  return '\\' + m; // "\{", "\,", "\%" ...
});

// Brace-balanced script argument: {..}, \command, or one character
const SCRIPT_ARG = String.raw`(?:\{[^{}]*\}|\\[a-zA-Z]+|[^\s{}\\^_])`;

const balanceBraces = (src) => {
  let depth = 0;
  let out = '';
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '\\' && i + 1 < src.length) { out += ch + src[++i]; continue; }
    if (ch === '{') depth++;
    if (ch === '}') { if (depth === 0) continue; depth--; }
    out += ch;
  }
  return out + '}'.repeat(depth);
};

// Always-safe clean-up: over-escaped "\\times" (a line break + "times") and siunitx-style macros
const normalizeLatex = (src) => {
  let s = String(src);
  if (!s.includes('\\begin')) s = s.replace(/\\\\(?=[a-zA-Z])/g, '\\');
  return s
    // siunitx first, while its unit argument still has no nested braces
    .replace(/\\(?:SI|qty)\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '$1\\,\\mathrm{$2}')
    .replace(/\\(?:si|unit)\s*\{([^{}]*)\}/g, '\\mathrm{$1}')
    .replace(/\\(?:degree|textdegree)(?![a-zA-Z])/g, '^{\\circ}')
    .replace(/\\celsius(?![a-zA-Z])/g, '{}^{\\circ}\\mathrm{C}')
    .replace(/\\ohm(?![a-zA-Z])/g, '\\Omega')
    .replace(/\\micro(?![a-zA-Z])/g, '\\mu')
    .replace(/\\percent(?![a-zA-Z])/g, '\\%')
    .replace(/\^?\s*°/g, '^{\\circ}');
};

// Fixes for LaTeX KaTeX rejected
const repairLatex = (src) => balanceBraces(normalizeLatex(src))
  // "10^1^\circ" -> "10^1{}^\circ" (double superscript), same for subscripts
  .replace(new RegExp(`(\\^${SCRIPT_ARG})(?=\\s*\\^)`, 'g'), '$1{}')
  .replace(new RegExp(`(_${SCRIPT_ARG})(?=\\s*_)`, 'g'), '$1{}')
  // Unpaired \left / \right
  .replace(/\\(?:left|right)\s*\./g, '')
  .replace(/\\(?:left|right)(?![a-zA-Z])/g, '')
  // A trailing ^ or _ with nothing after it
  .replace(/[\^_]\s*$/, '');

// Last resort: readable text with <sup>/<sub>, e.g. "T_\infty = 25^\circ\text{C}" -> T<sub>∞</sub> = 25<sup>°</sup>C
const latexToReadableHTML = (src) => {
  let s = escapeHTML(normalizeLatex(src));
  for (let i = 0; i < 4; i++) {
    s = s.replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)')
      .replace(/\\sqrt\s*\{([^{}]*)\}/g, '√($1)')
      .replace(/\\(?:text|textbf|textit|textrm|mathrm|mathbf|mathit|mathcal|boldsymbol|operatorname|vec|hat|bar|overline|underline)\s*\{([^{}]*)\}/g, '$1');
  }
  s = s.replace(/\\([a-zA-Z]+)/g, (m, name) => LATEX_SYMBOLS[name] ?? (LATEX_FUNCTIONS.has(name) ? name : ''))
    .replace(/\^\s*\{([^{}]*)\}/g, '<sup>$1</sup>')
    .replace(/\^\s*([^\s<])/g, '<sup>$1</sup>')
    .replace(/_\s*\{([^{}]*)\}/g, '<sub>$1</sub>')
    .replace(/_\s*([^\s<])/g, '<sub>$1</sub>')
    .replace(/\\[,;:! ]/g, ' ')
    .replace(/\\([%$#&_{}])/g, '$1')
    .replace(/[{}]/g, '')
    .replace(/~/g, '&nbsp;');
  return `<span style="font-family:KaTeX_Main,'Times New Roman',serif">${s}</span>`;
};

const renderMath = (math, displayMode = false) => {
  const render = (src) => katex.renderToString(src, { throwOnError: true, strict: 'ignore', output: 'html', displayMode });
  const normalized = normalizeLatex(math);
  try { return render(normalized); } catch { /* try the repaired version */ }
  try { return render(repairLatex(math)); } catch (err) {
    console.warn('Unrenderable LaTeX, showing it as text:', math, err?.message);
  }
  return latexToReadableHTML(math);
};

// Stray LaTeX the AI left outside $...$ in normal text: turn known commands into their symbols
const cleanBareLatex = (text) => text
  .replace(/\\(?:text|textbf|mathrm)\s*\{([^{}]*)\}/g, '$1')
  .replace(/\\([a-zA-Z]+)(?![a-zA-Z])/g, (m, name) => LATEX_SYMBOLS[name] ?? m);

// ---------- Complete extraction ----------
// Big PDFs are extracted a few pages per request so one reply never runs out of output room
const PAGES_PER_BATCH = 4;
const MAX_CONTINUATIONS = 6;

const stripJsonFence = (text) => text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

// Parses the model's JSON array. If the reply was cut off part-way, every question that was
// fully written is still recovered (complete: false tells the caller to fetch the rest).
const parseQuestionArray = (text) => {
  const clean = repairJsonBackslashes(stripJsonFence(text));
  try {
    const value = JSON.parse(clean);
    return { items: Array.isArray(value) ? value : (value?.questions || [value]), complete: true };
  } catch { /* salvage below */ }

  const items = [];
  let depth = 0, inString = false, escaped = false, start = -1;
  for (let i = Math.max(0, clean.indexOf('[') + 1); i < clean.length; i++) {
    const ch = clean[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') { if (depth === 0) start = i; depth++; }
    else if (ch === '}' && depth > 0) {
      depth--;
      if (depth === 0) {
        try { items.push(JSON.parse(clean.slice(start, i + 1))); } catch { /* skip a broken object */ }
      }
    }
  }
  return { items, complete: false };
};

const questionNumberOf = (q) => {
  const m = String(q?.questionNumber ?? '').match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
};

// Same question returned by two neighbouring page batches
const questionKey = (q) => String(q?.questionText || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 160);
const contentLength = (q) => ['questionText', 'optionA', 'optionB', 'optionC', 'optionD', 'explanation']
  .reduce((sum, f) => sum + String(q?.[f] || '').length, 0);

const dedupeQuestions = (questions) => {
  const out = [];
  const seen = new Map();
  for (const q of questions) {
    const key = questionKey(q);
    if (key && seen.has(key)) {
      const idx = seen.get(key);
      if (contentLength(q) > contentLength(out[idx])) out[idx] = q; // keep the fuller copy
      continue;
    }
    if (key) seen.set(key, out.length);
    out.push(q);
  }
  return out;
};

// Gaps in the numbering (Q3, Q5 -> Q4 missing), as { afterIndex, numbers }
const findNumberGaps = (questions) => {
  const gaps = [];
  for (let i = 1; i < questions.length; i++) {
    const a = questionNumberOf(questions[i - 1]);
    const b = questionNumberOf(questions[i]);
    if (a === null || b === null || b - a < 2 || b - a > 10) continue;
    gaps.push({ afterIndex: i - 1, numbers: Array.from({ length: b - a - 1 }, (_, k) => a + 1 + k) });
  }
  return gaps;
};

const countPdfPages = async (fileObj) => {
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await fileObj.arrayBuffer()) }).promise;
  const count = pdf.numPages;
  pdf.destroy();
  return count;
};

// ---------- Diagram extraction ----------
// The AI reports where each figure sits (page + box); we render that page with pdf.js and crop it
// into the same image fields the Question Bank editor uses.
const IMAGE_TARGETS = {
  question: 'questionImageUrl',
  explanation: 'explanationImageUrl',
  optionA: 'optionAImage',
  optionB: 'optionBImage',
  optionC: 'optionCImage',
  optionD: 'optionDImage'
};
const PAGE_RENDER_SCALE = 2.5;
const MAX_IMAGE_WIDTH = 1000;
// Images are stored as base64 inside the question doc, and Firestore caps a doc at 1 MiB
const MAX_IMAGE_BYTES = 250 * 1024;
const CROP_PADDING = 0.012;

// box_2d is [ymin, xmin, ymax, xmax] on a 0-1000 scale; returns page fractions or null if unusable
const normalizeBox = (box) => {
  if (!Array.isArray(box) || box.length !== 4) return null;
  let nums = box.map(Number);
  if (nums.some(n => !Number.isFinite(n))) return null;
  if (nums.every(n => n <= 1)) nums = nums.map(n => n * 1000); // model answered in 0-1 fractions
  const [y0, x0, y1, x1] = nums.map(n => Math.min(1000, Math.max(0, n)) / 1000);
  const rect = { top: Math.min(y0, y1), left: Math.min(x0, x1), bottom: Math.max(y0, y1), right: Math.max(x0, x1) };
  if (rect.bottom - rect.top < 0.01 || rect.right - rect.left < 0.01) return null;
  return rect;
};

const makeCanvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
};

// Shrinks the crop to its drawn content (plus a small margin) so loose AI boxes don't leave big white borders
const trimWhitespace = (canvas, margin = 12) => {
  const { width, height } = canvas;
  const data = canvas.getContext('2d').getImageData(0, 0, width, height).data;
  let top = height, left = width, bottom = -1, right = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i] < 245 || data[i + 1] < 245 || data[i + 2] < 245) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }
  if (bottom < 0) return null; // blank region - the box missed the figure
  top = Math.max(0, top - margin);
  left = Math.max(0, left - margin);
  bottom = Math.min(height - 1, bottom + margin);
  right = Math.min(width - 1, right + margin);
  const out = makeCanvas(right - left + 1, bottom - top + 1);
  out.getContext('2d').drawImage(canvas, left, top, out.width, out.height, 0, 0, out.width, out.height);
  return out;
};

const cropRegion = (pageCanvas, rect) => {
  const W = pageCanvas.width, H = pageCanvas.height;
  const sx = Math.floor(Math.max(0, rect.left - CROP_PADDING) * W);
  const sy = Math.floor(Math.max(0, rect.top - CROP_PADDING) * H);
  const ex = Math.ceil(Math.min(1, rect.right + CROP_PADDING) * W);
  const ey = Math.ceil(Math.min(1, rect.bottom + CROP_PADDING) * H);
  const crop = makeCanvas(ex - sx, ey - sy);
  crop.getContext('2d').drawImage(pageCanvas, sx, sy, crop.width, crop.height, 0, 0, crop.width, crop.height);
  return trimWhitespace(crop);
};

const scaleCanvas = (canvas, factor) => {
  const out = makeCanvas(canvas.width * factor, canvas.height * factor);
  const ctx = out.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, 0, 0, out.width, out.height);
  return out;
};

// Several figures for the same slot (e.g. two diagrams in one question) are stacked into one image
const stackCanvases = (canvases, gap = 16) => {
  if (canvases.length === 1) return canvases[0];
  const width = Math.max(...canvases.map(c => c.width));
  const height = canvases.reduce((sum, c) => sum + c.height, 0) + gap * (canvases.length - 1);
  const out = makeCanvas(width, height);
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  let y = 0;
  for (const c of canvases) {
    ctx.drawImage(c, Math.round((width - c.width) / 2), y);
    y += c.height + gap;
  }
  return out;
};

const dataUrlBytes = (url) => Math.ceil((url.length - url.indexOf(',') - 1) * 0.75);

// PNG keeps line diagrams crisp; fall back to JPEG and then smaller sizes to stay under the size cap
const canvasToDataUrl = (canvas) => {
  let c = canvas.width > MAX_IMAGE_WIDTH ? scaleCanvas(canvas, MAX_IMAGE_WIDTH / canvas.width) : canvas;
  for (let attempt = 0; attempt < 5; attempt++) {
    const png = c.toDataURL('image/png');
    if (dataUrlBytes(png) <= MAX_IMAGE_BYTES) return png;
    const jpg = c.toDataURL('image/jpeg', 0.85);
    if (dataUrlBytes(jpg) <= MAX_IMAGE_BYTES) return jpg;
    c = scaleCanvas(c, 0.75);
  }
  return c.toDataURL('image/jpeg', 0.7);
};

// Crops every figure the AI located and stores it on the question; `images` itself is dropped
const attachDiagramImages = async (fileObj, questions) => {
  const strip = questions.map(({ images, ...rest }) => rest);
  if (!questions.some(q => Array.isArray(q.images) && q.images.length > 0)) return strip;

  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await fileObj.arrayBuffer()) }).promise;
  // Only the last rendered page is kept - questions come in page order and full pages are large
  let cached = { num: 0, canvas: null };
  const renderPage = async (num) => {
    if (cached.num === num) return cached.canvas;
    const page = await pdf.getPage(num);
    const viewport = page.getViewport({ scale: PAGE_RENDER_SCALE });
    const canvas = makeCanvas(viewport.width, viewport.height);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    cached = { num, canvas };
    return canvas;
  };

  try {
    const result = [];
    for (let qi = 0; qi < questions.length; qi++) {
      const q = strip[qi];
      const crops = {};
      for (const img of Array.isArray(questions[qi].images) ? questions[qi].images : []) {
        const field = IMAGE_TARGETS[img?.target] || IMAGE_TARGETS.question;
        const pageNum = parseInt(img?.page, 10);
        const rect = normalizeBox(img?.box_2d);
        if (!rect || !(pageNum >= 1 && pageNum <= pdf.numPages)) continue;
        try {
          const crop = cropRegion(await renderPage(pageNum), rect);
          if (crop) (crops[field] ||= []).push(crop);
        } catch (err) {
          console.warn(`Could not crop a figure for question ${qi + 1}:`, err);
        }
      }
      for (const [field, list] of Object.entries(crops)) q[field] = canvasToDataUrl(stackCanvases(list));
      result.push(q);
    }
    return result;
  } finally {
    pdf.destroy();
  }
};

export default function AIGenerator({ pairMode = false }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | uploading | analyzing | review | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const [progressMsg, setProgressMsg] = useState('');
  // Pages / question numbers the extraction could not fully recover, shown on the review screen
  const [extractionWarnings, setExtractionWarnings] = useState([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [importSummary, setImportSummary] = useState(null); // { imported, skipped }
  const [extractedQuestions, setExtractedQuestions] = useState([]);
  const [importAsPremium, setImportAsPremium] = useState(false);
  // Extracted questions go to this person for review before they reach the question bank
  const [reviewerEmail, setReviewerEmail] = useState('');

  useEffect(() => {
    // Typists send to the reviewer they are paired with; admins use the saved AI reviewer
    const settingsRef = pairMode
      ? doc(db, 'invited_typists', localStorage.getItem('pair_id') || 'none')
      : doc(db, 'site_settings', 'ai_review');
    getDoc(settingsRef)
      .then(snap => { if (snap.exists()) setReviewerEmail(snap.data().reviewerEmail || ''); })
      .catch(err => console.error('Failed to load reviewer:', err));
  }, [pairMode]);

  const isValidReviewerEmail = /^\S+@\S+\.\S+$/.test(reviewerEmail.trim());
  const [importSettings, setImportSettings] = useState({ department: '', year: '', subject: '', topic: '', mark: '', difficultyLevel: 'Auto' });
  const fileInputRef = useRef(null);
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({length: currentYear - 1990 + 1}, (_, i) => (currentYear - i).toString());
  // Departments / subjects / topics / marks / difficulties come from the admin Attributes tab
  const [attributes, setAttributes] = useState([]);
  useEffect(() => {
    getDocs(collection(db, 'question_attributes'))
      .then(snap => setAttributes(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(err => console.error('Failed to load attributes:', err));
  }, []);

  const attrNames = (type) => attributes.filter(a => a.type === type).map(a => a.name);
  const departments = attrNames('department');
  const selectedDeptAttr = attributes.find(a => a.type === 'department' && a.name === importSettings.department);
  const selectedSubjectAttr = attributes.find(
    a => a.type === 'subject' && a.name === importSettings.subject && (!selectedDeptAttr || a.parentId === selectedDeptAttr.id)
  );
  const subjects = attributes
    .filter(a => a.type === 'subject' && selectedDeptAttr && a.parentId === selectedDeptAttr.id)
    .map(a => a.name);
  const topics = attributes
    .filter(a => a.type === 'topic' && selectedSubjectAttr && a.parentId === selectedSubjectAttr.id)
    .map(a => a.name);
  const difficultyLevels = attrNames('difficulty');
  // Same two labels the Question Bank editor uses, so an imported mark can always be edited there
  const markOptions = ['1 Mark (-0.33)', '2 Mark (-0.66)'];

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
    } else {
      alert("Please upload a valid PDF file.");
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
    } else {
      alert("Please upload a valid PDF file.");
    }
  };

  const extractTextFromPDF = async (fileObj) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async function(e) {
        try {
          const typedarray = new Uint8Array(e.target.result);
          const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
          let fullText = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            let pageText = '';
            let lastY = null;
            let lastX = null;
            let minX = Infinity;
            
            for (const item of textContent.items) {
               if (item.str.trim().length > 0 && item.transform[4] < minX) {
                  minX = item.transform[4];
               }
            }
            if (minX === Infinity) minX = 0;
            
            for (const item of textContent.items) {
              if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
                pageText += '\n';
                const indent = Math.max(0, Math.floor((item.transform[4] - minX) / 5)); 
                if (indent > 0) pageText += ' '.repeat(indent);
              } else if (lastY !== null && !pageText.endsWith(' ') && !item.str.startsWith(' ')) {
                const gap = item.transform[4] - (lastX || item.transform[4]);
                if (gap > 8) {
                    pageText += ' '.repeat(Math.floor(gap / 4));
                } else {
                    pageText += ' ';
                }
              }
              pageText += item.str;
              lastY = item.transform[5];
              lastX = item.transform[4] + (item.width || 0);
            }
            fullText += pageText + '\n\n';
          }
          resolve(fullText);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(fileObj);
    });
  };

  // Safety net for when the AI forgets to wrap a short math expression in $...$ (seen on Match
  // column items like "4\sigma/R"): if the whole string is raw LaTeX with no $ delimiters at
  // all, wrap it once so KaTeX still renders it instead of showing the backslash commands as-is.
  const wrapBareLatex = (text) => {
    if (!text || text.includes('$')) return text;
    return /\\[a-zA-Z]+|[a-zA-Z0-9]\^[{a-zA-Z0-9]|[a-zA-Z0-9]_[{a-zA-Z0-9]/.test(text) ? `$${text}$` : text;
  };

  const renderLatexToHTML = (text) => {
    if (!text) return text;
    // Keep old pdf.js fallbacks just in case
    let processed = text
      .replace(/1\s*U\s*=\s*1\s*h\s*i\s*\+\s*1\s*h\s*o\s*\.?/gi, '1/U = 1/h<sub>i</sub> + 1/h<sub>o</sub>.')
      .replace(/Q\s*hot/gi, 'Q<sub>hot</sub>')
      .replace(/Q\s*cold/gi, 'Q<sub>cold</sub>')
      .replace(/m\s*2\s*K/g, 'm²K')
      .replace(/10\s*3\b/g, '10³')
      .replace(/10\s*-\s*3\b/g, '10⁻³')
      .replace(/m\s*2\b/g, 'm²')
      .replace(/mm\s*2\b/g, 'mm²')
      .replace(/cm\s*2\b/g, 'cm²')
      .replace(/m\s*3\b/g, 'm³')
      .replace(/mm\s*3\b/g, 'mm³')
      .replace(/cm\s*3\b/g, 'cm³');

    // Convert any $$...$$ / $...$ LaTeX blocks directly to HTML using KaTeX
    processed = processed.replace(/\$\$([^$]+)\$\$|\$([^$]+)\$/g, (match, display, inline) => (
      display !== undefined ? renderMath(display, true) : renderMath(inline)
    ));

    return processed;
  };

  // Inline styles so code keeps its look wherever the saved HTML is shown (question bank, tests)
  const MONO_FONT = "ui-monospace,SFMono-Regular,Menlo,Consolas,'Courier New',monospace";
  const CODE_BLOCK_STYLE = `background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;margin:8px 0;overflow-x:auto;white-space:pre;font-family:${MONO_FONT};font-size:0.85em;font-weight:500;line-height:1.5;text-align:left`;
  const INLINE_CODE_STYLE = `background:#f1f5f9;border-radius:4px;padding:1px 5px;font-family:${MONO_FONT};font-size:0.9em`;

  // Turns AI-extracted text into HTML: ```fenced``` code keeps its lines and indentation,
  // `inline code` gets a monospace chip, $...$ goes through KaTeX, and everything else is
  // escaped so text like <class 'dict'> shows up instead of being swallowed as an HTML tag.
  const formatExtractedText = (text) => {
    if (!text) return text;
    const parts = String(text)
      // \( ... \) and \[ ... \] are also LaTeX delimiters - bring them to the $ form
      .replace(/\\\(([\s\S]+?)\\\)/g, (m, math) => `$${math}$`)
      .replace(/\\\[([\s\S]+?)\\\]/g, (m, math) => `$$${math}$$`)
      .split(/(```[\s\S]*?```)/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        const code = part.replace(/^```[\w+#.-]*[ \t]*\n?/, '').replace(/\n?```$/, '');
        return `<pre style="${CODE_BLOCK_STYLE}"><code>${escapeHTML(code)}</code></pre>`;
      }
      // The <pre> already breaks the line, so drop the newlines that touch it
      let prose = part;
      if (i > 0) prose = prose.replace(/^\s*\n/, '');
      if (i < parts.length - 1) prose = prose.replace(/\n\s*$/, '');
      return prose.split(/(`[^`\n]+`)/g).map((seg, j) => {
        if (j % 2 === 1) return `<code style="${INLINE_CODE_STYLE}">${escapeHTML(seg.slice(1, -1))}</code>`;
        return seg.split(/(\$\$[^$]+\$\$|\$[^$]+\$)/g)
          .map((s, k) => {
            if (k % 2 === 1) return s.startsWith('$$') ? renderMath(s.slice(2, -2), true) : renderMath(s.slice(1, -1));
            // A lone "$" (e.g. "$5") is just text
            return renderLatexToHTML(cleanBareLatex(escapeHTML(s)))
              .replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>') // "**Concept:**" labels
              .replace(/\*\*/g, '') // half of a bold run that was split by a formula
              .replace(/\n/g, '<br/>');
          })
          .join('');
      }).join('');
    }).join('');
  };

  const parseQuestionsFromText = (text) => {
    const questions = [];
    
    let currentDifficulty = 'Medium'; // Default
    const rawBlocks = text.split(/(?=Q\d+\s*\()/i);
    
    rawBlocks.forEach(block => {
      const isQuestion = block.trim().match(/^Q\d+/i);
      const blockLower = block.toLowerCase();
      const firstLine = blockLower.substring(0, blockLower.indexOf('\n') > -1 ? blockLower.indexOf('\n') : blockLower.length);

      // 1. Update section difficulty if found in interstitial text or the very first line of a question
      if (!isQuestion) {
          if (blockLower.includes('basic level')) currentDifficulty = 'Easy';
          else if (blockLower.includes('exact gate level')) currentDifficulty = 'Medium';
          else if (blockLower.match(/\badvanced\b/)) currentDifficulty = 'Hard';
      } else {
          if (firstLine.includes('basic level')) currentDifficulty = 'Easy';
          else if (firstLine.includes('exact gate level')) currentDifficulty = 'Medium';
          else if (firstLine.match(/\badvanced\b/)) currentDifficulty = 'Hard';
      }

      let difficultyForThisQuestion = currentDifficulty;

      if (isQuestion) {
        let qNum = '';
        const qNumMatch = block.match(/^(Q\d+)/i);
        if (qNumMatch) {
            qNum = qNumMatch[1];
        }

        // 1. Extract Header
        // Now that we have real newlines, the header is on the first line(s) of the block until the first newline that separates it from the body.
        // Sometimes the title might wrap, but usually it's one line.
        const headerMatch = block.match(/^Q\d+\s*\((.*?)\):\s*(.*?)(?=\n)/i);
        let qTypeStr = 'MCQ';
        let topic = 'Extracted Topic';
        let qTextRaw = block;
        
        if (headerMatch) {
          qTypeStr = headerMatch[1].toUpperCase();
          topic = headerMatch[2].trim();
          qTextRaw = block.substring(headerMatch[0].length).trim();
          
          // Check difficulty from the parenthesis (e.g., "Basic - MCQ")
          const typeLower = qTypeStr.toLowerCase();
          if (typeLower.includes('basic')) difficultyForThisQuestion = 'Easy';
          else if (typeLower.includes('exact')) difficultyForThisQuestion = 'Medium';
          else if (typeLower.includes('advanced')) difficultyForThisQuestion = 'Hard';
        }

        // 2. Override for this specific question if keywords appear anywhere in its text as fallback
        if (blockLower.includes('basic level')) difficultyForThisQuestion = 'Easy';
        else if (blockLower.includes('exact gate level')) difficultyForThisQuestion = 'Medium';
        else if (blockLower.match(/\badvanced level\b/)) difficultyForThisQuestion = 'Hard';

      
      let questionType = 'Single Choice';
      if (qTypeStr.includes('MSQ')) questionType = 'Multiple Choice';
      else if (qTypeStr.includes('NAT')) questionType = 'Fill in the Blanks';
      else if (qTypeStr.includes('MTF') || qTextRaw.toLowerCase().includes('match the following') || qTextRaw.includes('Group I') || qTextRaw.includes('Column I')) {
         questionType = 'Match';
      }
      
      // 2. Extract Concept & Calculation (Explanation)
      let explanation = '';
      let beforeConcept = qTextRaw;
      const conceptIndex = qTextRaw.search(/\n\s*Concept:/i);
      if (conceptIndex !== -1) {
        beforeConcept = qTextRaw.substring(0, conceptIndex);
        explanation = qTextRaw.substring(conceptIndex).trim();
      } else {
        // Fallback if 'Concept:' wasn't at the start of a line
        const inlineConceptIndex = qTextRaw.search(/Concept:/i);
        if (inlineConceptIndex !== -1) {
          beforeConcept = qTextRaw.substring(0, inlineConceptIndex);
          explanation = qTextRaw.substring(inlineConceptIndex).trim();
        }
      }
      
      // 3. Extract Options (if MCQ/MSQ/MTF)
      let qText = beforeConcept.trim();
      let optA = '', optB = '', optC = '', optD = '';
      let correctAnswer = 'A';
      let correctAnswers = [];
      let fillBlankAnswer = '';
      let matchColumn1 = [];
      let matchColumn2 = [];
      
      if (questionType === 'Match') {
        let textWithoutOptions = beforeConcept;
        const firstOptionIndex = beforeConcept.search(/\(A\)|A\./i);
        if (firstOptionIndex !== -1 && firstOptionIndex > 20) { // arbitrary threshold to avoid matching early A.
            textWithoutOptions = beforeConcept.substring(0, firstOptionIndex);
        }

        // Force match items to be on their own lines in case OCR put them on the same line
        let formattedText = textWithoutOptions
            .replace(/\s+(?=[PQRST]\.)/g, '\n')
            .replace(/\s+(?=[1-6]\.)/g, '\n');

        const lines = formattedText.split('\n');
        let lastAddedTo = 0; // 1 for col1, 2 for col2
        let textAccumulator = [];

        lines.forEach(line => {
            const trimLine = line.trim();
            if (!trimLine) return;

            if (trimLine.match(/^[PQRST]\s*\./i)) {
                matchColumn1.push(trimLine);
                lastAddedTo = 1;
            } else if (trimLine.match(/^[1-6]\s*\./)) {
                matchColumn2.push(trimLine);
                lastAddedTo = 2;
            } else if (lastAddedTo === 1) {
                matchColumn1[matchColumn1.length - 1] += ' ' + trimLine;
            } else if (lastAddedTo === 2) {
                matchColumn2[matchColumn2.length - 1] += ' ' + trimLine;
            } else {
                textAccumulator.push(trimLine);
            }
        });
        
        while (matchColumn1.length < 2) matchColumn1.push('');
        while (matchColumn2.length < 2) matchColumn2.push('');
        
        qText = textAccumulator.join('<br/>').trim();
        beforeConcept = beforeConcept.substring(textWithoutOptions.length); // Keep only options for the next step
      }

      if (questionType !== 'Fill in the Blanks') {
        const aMatch = beforeConcept.match(/(?:\(A\)|A\.)\s*(.*?)(?=\(B\)|B\.|(?:\(C\)|C\.)|(?:\(D\)|D\.)|$)/is);
        const bMatch = beforeConcept.match(/(?:\(B\)|B\.)\s*(.*?)(?=\(A\)|A\.|(?:\(C\)|C\.)|(?:\(D\)|D\.)|$)/is);
        const cMatch = beforeConcept.match(/(?:\(C\)|C\.)\s*(.*?)(?=\(A\)|A\.|(?:\(B\)|B\.)|(?:\(D\)|D\.)|$)/is);
        const dMatch = beforeConcept.match(/(?:\(D\)|D\.)\s*(.*?)(?=\(A\)|A\.|(?:\(B\)|B\.)|(?:\(C\)|C\.)|$)/is);
        
        if (aMatch) optA = aMatch[1].trim();
        if (bMatch) optB = bMatch[1].trim();
        if (cMatch) optC = cMatch[1].trim();
        if (dMatch) optD = dMatch[1].trim();
        
        if (aMatch) {
          qText = beforeConcept.substring(0, beforeConcept.indexOf('(A)')).trim();
        }
        
        // Check for checkmarks ✓
        const checkAndClean = (optStr, letter) => {
          if (optStr.includes('✓')) {
            if (questionType === 'Single Choice') correctAnswer = letter;
            correctAnswers.push(letter);
            return optStr.replace('✓', '').trim();
          }
          return optStr;
        };
        
        optA = cleanMathText(checkAndClean(optA, 'A'));
        optB = cleanMathText(checkAndClean(optB, 'B'));
        optC = cleanMathText(checkAndClean(optC, 'C'));
        optD = cleanMathText(checkAndClean(optD, 'D'));
      } else {
        // For NAT, try to find the last number in the calculation as the answer
        const calcMatch = explanation.match(/Calculation:[\s\S]*=\s*([\d,.]+)\s*[a-zA-Z]*\.*$/i);
        if (calcMatch) {
           fillBlankAnswer = calcMatch[1].replace(/,/g, '').trim();
        }
      }
      
      // Fix newline formatting
      const preserveWhitespace = (text) => {
         return text.split('\n').map(line => {
             let newLine = line;
             const leadingSpaces = newLine.match(/^ +/);
             if (leadingSpaces) {
                 newLine = '&nbsp;'.repeat(leadingSpaces[0].length) + newLine.trimStart();
             }
             newLine = newLine.replace(/ {2,}/g, match => '&nbsp;'.repeat(match.length));
             return newLine;
         }).join('<br/>');
      };
      
      qText = preserveWhitespace(renderLatexToHTML(qText));
      explanation = preserveWhitespace(renderLatexToHTML(explanation));
      
      questions.push({
        questionType: questionType,
        questionText: qText,
        optionA: optA,
        optionB: optB,
        optionC: optC,
        optionD: optD,
        correctAnswer: correctAnswer,
        correctAnswers: correctAnswers,
        fillBlankAnswer: fillBlankAnswer,
        topic: topic,
        matchColumn1: matchColumn1,
        matchColumn2: matchColumn2,
        explanation: explanation,
        difficultyLevel: difficultyForThisQuestion,
        isImported: true
      });
    }
    });
    
    return questions;
  };

  const fileToGenerativePart = async (fileObj) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result.split(',')[1];
        resolve({
          inlineData: { data: base64Data, mimeType: fileObj.type }
        });
      };
      reader.onerror = () => reject(reader.error || new Error('Failed to read the file.'));
      reader.readAsDataURL(fileObj);
    });
  };

  const startAnalysis = async () => {
    if (!file) return;
    setStatus('uploading');
    setErrorMsg('');
    setProgressMsg('');
    setExtractionWarnings([]);

    try {
      setStatus('analyzing');
      let parsedQuestions = [];
      
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (apiKey) {
        const modelsToTry = [
          "gemini-3.6-flash",
          "gemini-3.5-flash-lite",
          "gemini-3.7-flash",
          "gemini-3.8-flash",
          "gemini-flash-latest"
        ];
        let lastError = null;
        
        console.log("Attempting to use Gemini API for extraction...");
        const ai = new GoogleGenAI({ apiKey });
        const pdfPart = await fileToGenerativePart(file);
        
        const prompt = `You are a specialized AI that transcribes multiple-choice and numerical questions from PDF documents into JSON, completely and word for word.
Read the attached PDF and extract the questions described in SCOPE at the end.
Respond ONLY with a valid JSON array of objects. Do not include markdown code blocks (\`\`\`json) or any other text.
Each object must have exactly these fields:
{
  "questionNumber": "The question's label exactly as printed, e.g. \\"Q1\\", \\"12\\", \\"Q3(a)\\"",
  "questionType": "Single Choice" | "Multiple Choice" | "Fill in the Blanks" | "Match",
  "questionCategory": "Numerical" | "Theory" ("Numerical" when the answer is a numerical value that has to be calculated or worked out - every Fill in the Blanks/NAT question, and any MCQ/MSQ whose correct option is a number or a value with a unit. "Theory" for conceptual, definition, statement, reasoning or code-reading questions whose answer is not a computed value),
  "questionText": "The COMPLETE question exactly as printed, word for word: every sentence, given data, list, note and instruction (e.g. \\"Round off to two decimal places\\", \\"Answer in kJ\\"). Do NOT include the question number or header label. Use LaTeX inside $...$ for all math/equations.",
  "optionA": "Option A text",
  "optionB": "Option B text",
  "optionC": "Option C text",
  "optionD": "Option D text",
  "correctAnswer": "A", "B", "C", or "D" (For Single Choice/Match. Auto-detect if checked/marked),
  "correctAnswers": ["A", "B"] (Array of strings for Multiple Choice. Auto-detect if checked/marked),
  "fillBlankAnswer": "For NAT only: the exact numerical answer as plain digits (no units, no commas). Take it from the answer key / answer line / calculation in the PDF.",
  "fillBlankMode": "For NAT only: \"Numeric Range\" if the PDF states a range of accepted answers (e.g. \"2.4 to 2.6\", \"between 2.4 and 2.6\", \"2.5 ± 0.1\"), otherwise \"Exact Match\"",
  "fillBlankRangeStart": "For NAT with a range only: the lowest accepted value as plain digits, else empty string",
  "fillBlankRangeEnd": "For NAT with a range only: the highest accepted value as plain digits, else empty string",
  "topic": "The title printed in the question's header (e.g. \\"Function Annotations\\"), else a short topic",
  "difficultyLevel": "Easy" | "Medium" | "Hard",
  "explanation": "The COMPLETE solution exactly as printed: everything after the options/answer, e.g. Concept, Reasoning, Given, Formula, Calculation, every step, the final answer line and any notes. Start each labelled part on its own line with the label in bold, e.g. \\"**Concept:** Metadata and Type Hinting.\\\\n**Reasoning:** Python stores ...\\". Use LaTeX inside $...$ for all math/equations. Empty string only if the PDF has no solution.",
  "matchColumn1": ["Item P", "Item Q", "Item R", "Item S"], (Only for Match questions, array of exactly 4 strings, LaTeX inside $...$ for any math/equations, e.g. "$4\\\\sigma/R$")
  "matchColumn2": ["Item 1", "Item 2", "Item 3", "Item 4"], (Only for Match questions, array of exactly 4 strings, LaTeX inside $...$ for any math/equations, e.g. "$\\\\sigma (1/R_1 + 1/R_2)$")
  "images": [{ "target": "question" | "optionA" | "optionB" | "optionC" | "optionD" | "explanation", "page": 1, "box_2d": [ymin, xmin, ymax, xmax] }] (Figures belonging to this question - use [] when there are none)
}
IMPORTANT:
- COMPLETENESS IS THE TOP PRIORITY. Extract every question in SCOPE - never skip one, including long questions and ones with diagrams, tables, code or unusual layouts. Transcribe everything; never shorten, summarize, paraphrase, merge or "clean up" any text in the question, options or solution. When unsure whether something belongs, include it.
- Keep the structure: separate paragraphs, calculation steps, list items and sub-parts with \\n, keep their numbering/bullets, and put each equation step of a calculation on its own line.
- For equations, fractions, subscripts, or math symbols, use standard LaTeX formatting enclosed in $...$ (e.g., $m^2K$, $\\\\frac{1}{U}$). YOU MUST double-escape all backslashes so the output is valid JSON (e.g. use \\\\frac instead of \\frac).
- Every $...$ must compile in KaTeX: balanced braces, never two superscripts or two subscripts in a row (write $25^{\\\\circ}\\\\text{C}$, never $10^1^\\\\circ$), degrees as ^{\\\\circ}, only standard LaTeX math commands (no siunitx such as \\\\SI or \\\\si, no custom macros, no \\\\( \\\\) or \\\\[ \\\\] delimiters).
- Copy every number, unit and symbol exactly as printed in the PDF. Never rewrite a value into another form (if the PDF says 25°C, write $25^{\\\\circ}\\\\text{C}$, not 2.5 × 10^1). Do not add, drop, summarize or reword any text; keep the full question and full explanation.
- This applies to matchColumn1 and matchColumn2 too - every expression containing a LaTeX command (\\\\sigma, \\\\Delta, \\\\frac, subscripts like R_1, etc.) MUST be wrapped in $...$. Never output a bare backslash command outside $...$ anywhere in the JSON.
- For Fill in the Blanks (NAT) questions, read the answer key / answer line carefully. Put a single value in fillBlankAnswer, or if a range of accepted answers is given, set fillBlankMode to \"Numeric Range\" and fill fillBlankRangeStart and fillBlankRangeEnd. Never put units in these fields.
- CODE: If a question or explanation contains a code snippet (Python, C, Java, SQL, shell, etc.), put it inside a fenced block: three backticks + language name, a newline, the code, a newline, three backticks (e.g. "Determine val:\\n\`\`\`python\\ndef f(x):\\n    return x\\n\`\`\`"). Keep every line break (as \\n) and every leading space of indentation exactly as printed. Never flatten code onto one line and never use $...$ inside code.
- Short inline code such as identifiers, keywords or literals (e.g. __annotations__, 'return', None) goes in single backticks.
- Copy option text exactly as printed, including angle brackets and quotes (e.g. <class 'dict'>). Options are plain text: use single backticks for code-like options, never HTML. Do not include the ✓ tick mark in the option text; use it only to set the correct answer.
- DIAGRAMS: For every figure drawn as a graphic - diagram, graph, plot, circuit, tree, flowchart, geometric figure, chemical structure, photo, or a table - add one entry to "images" of the question it belongs to:
  - "page": the 1-based index of the page within this PDF file (the file's first page is 1; ignore printed page numbers).
  - "box_2d": [ymin, xmin, ymax, xmax] normalized to 0-1000 of that page's height and width, drawn tightly around the whole figure including its labels and caption, but NOT the question text, options, code, or the question's header bar/border.
  - "target": "question" for a figure in the question body; "optionA"-"optionD" when that option is itself a figure (then its option text should be empty); "explanation" for a figure in the solution/explanation.
  - Never make images for code snippets, equations or plain text - transcribe those as text. Do not describe the figure in the text, but keep references like "the figure below".
- For Match type questions, extract the columns accurately.
- For Match type questions, optionA, optionB, optionC and optionD MUST be filled with the answer choices exactly as printed in the PDF (for example "P-2, Q-1, R-4, S-3"). Never leave them empty, and set correctAnswer to the letter of the correct choice.
- The response MUST be a pure JSON array parseable by JSON.parse().`;

        const quotaExhausted = new Set();
        const failureMessage = () => {
          const busy = /503|high demand|unavailable|overloaded/i.test(String(lastError?.message || lastError));
          return quotaExhausted.size > 0
            ? "The Gemini API key has reached its daily free-tier limit. Enable billing for the key's Google project (ai.dev/rate-limit) or try again tomorrow."
            : busy
              ? "Google's Gemini servers are busy right now. Please wait a minute and click Retry."
              : "All Gemini AI models failed. Please check your API key or try again later.";
        };

        // Sends the prompt plus one SCOPE instruction. 503 "high demand" errors from Gemini are
        // transient, so fail over to the next model quickly (1 SDK retry instead of ~30s of
        // backoff) and make a second pass if all were busy.
        const askGemini = async (scope) => {
          const attempts = [...modelsToTry, ...modelsToTry];
          for (let i = 0; i < attempts.length; i++) {
            const modelName = attempts[i];
            // A 429 means the daily free-tier quota for that model is used up - retrying it is pointless
            if (quotaExhausted.has(modelName)) continue;
            if (i === modelsToTry.length) await new Promise(r => setTimeout(r, 5000));
            try {
              console.log(`Trying model: ${modelName}...`);
              const interaction = await ai.interactions.create({
                  model: modelName,
                  input: [
                      { type: "text", text: `${prompt}\n\nSCOPE: ${scope}` },
                      { type: "document", data: pdfPart.inlineData.data, mime_type: pdfPart.inlineData.mimeType }
                  ]
              }, { timeout: 300000, maxRetries: 1 });
              const responseText = interaction.output_text;
              if (!responseText) throw new Error('Empty response from model');
              const { items, complete } = parseQuestionArray(responseText);
              // "incomplete" = the reply hit the output limit; salvaged questions are still usable
              const truncated = !complete || ['incomplete', 'budget_exceeded'].includes(interaction.status);
              if (!complete && items.length === 0) throw new Error('Reply was not valid JSON');
              console.log(`Extracted ${items.length} question(s) via ${modelName}${truncated ? ' (reply was cut off)' : ''}.`);
              return { items, truncated };
            } catch (modelError) {
              lastError = modelError;
              if (/429|rate limit|quota/i.test(String(modelError?.message || modelError))) quotaExhausted.add(modelName);
              console.warn(`Model ${modelName} failed:`, modelError.message || modelError);
            }
          }
          throw new Error(failureMessage());
        };

        const warnings = [];
        const pageLabel = (from, to) => (from === to ? `page ${from}` : `pages ${from}-${to}`);
        const rangeScope = (from, to, total) => (from === 1 && to === total
          ? 'Extract every question in the whole PDF.'
          : `Extract ONLY the questions that START on ${pageLabel(from, to)} of this PDF (1-based page index within the file). A question that starts in this range but continues onto a later page must still be extracted completely, including its options and full solution from the following page(s). Skip questions that start before page ${from} or after page ${to}.`);

        // Extracts a page range; if the reply is cut off, the range is split, or on a single page
        // the extraction continues after the last complete question until nothing is left.
        const extractRange = async (from, to, total) => {
          const collected = [];
          let scope = rangeScope(from, to, total);
          for (let round = 0; round <= MAX_CONTINUATIONS; round++) {
            const { items, truncated } = await askGemini(scope);
            collected.push(...items);
            if (!truncated) return collected;
            if (round === 0 && to > from && items.length === 0) {
              const mid = Math.floor((from + to) / 2);
              return [...await extractRange(from, mid, total), ...await extractRange(mid + 1, to, total)];
            }
            const last = collected[collected.length - 1];
            if (!last) break;
            setProgressMsg(`Reply was long - continuing ${pageLabel(from, to)} after question ${last.questionNumber || collected.length}...`);
            scope = `${rangeScope(from, to, total)} The questions up to and including question ${JSON.stringify(last.questionNumber || '')} (the one beginning "${String(last.questionText || '').slice(0, 80)}") are already extracted - start with the question right after it.`;
          }
          warnings.push(`The AI reply for ${pageLabel(from, to)} kept getting cut off - check the last questions from those pages.`);
          return collected;
        };

        const totalPages = await countPdfPages(file);
        let rawQuestions = [];
        let batchError = null;
        for (let from = 1; from <= totalPages; from += PAGES_PER_BATCH) {
          const to = Math.min(totalPages, from + PAGES_PER_BATCH - 1);
          setProgressMsg(totalPages > PAGES_PER_BATCH ? `Extracting ${pageLabel(from, to)} of ${totalPages}...` : 'Extracting questions...');
          try {
            rawQuestions.push(...await extractRange(from, to, totalPages));
          } catch (batchErr) {
            // Keep what the other pages produced and flag the pages that failed
            batchError = batchErr;
            warnings.push(`Could not extract ${pageLabel(from, to)}: ${batchErr.message}`);
          }
        }
        if (rawQuestions.length === 0 && batchError) {
          setErrorMsg(batchError.message);
          setStatus('error');
          return;
        }
        rawQuestions = dedupeQuestions(rawQuestions);

        // Numbering gaps usually mean the AI skipped a question - ask for exactly those again
        const gaps = findNumberGaps(rawQuestions);
        if (gaps.length > 0) {
          const missing = gaps.flatMap(g => g.numbers);
          setProgressMsg(`Recovering skipped question(s) ${missing.join(', ')}...`);
          let recovered = [];
          try {
            ({ items: recovered } = await askGemini(`Extract ONLY the question(s) numbered ${missing.join(', ')} (by their printed question labels) - they were missed earlier. Return each of them completely.`));
          } catch (gapErr) {
            console.warn('Could not recover skipped questions:', gapErr);
          }
          const known = new Set(rawQuestions.map(questionKey));
          // Insert from the last gap backwards so earlier indexes stay valid
          for (const gap of [...gaps].reverse()) {
            const found = recovered
              .filter(q => gap.numbers.includes(questionNumberOf(q)) && !known.has(questionKey(q)))
              .sort((a, b) => questionNumberOf(a) - questionNumberOf(b));
            rawQuestions.splice(gap.afterIndex + 1, 0, ...found);
            const stillMissing = gap.numbers.filter(n => !found.some(q => questionNumberOf(q) === n));
            if (stillMissing.length) warnings.push(`Question ${stillMissing.join(', ')} could not be extracted - please add ${stillMissing.length > 1 ? 'them' : 'it'} manually.`);
          }
        }

        setExtractionWarnings(warnings);
        parsedQuestions = rawQuestions.map(({ questionNumber, ...q }) => ({
          ...q,
          isImported: true,
          questionText: formatExtractedText(q.questionText),
          optionA: formatExtractedText(q.optionA),
          optionB: formatExtractedText(q.optionB),
          optionC: formatExtractedText(q.optionC),
          optionD: formatExtractedText(q.optionD),
          explanation: formatExtractedText(q.explanation)
        }));

        try {
          parsedQuestions = await attachDiagramImages(file, parsedQuestions);
        } catch (imgErr) {
          // Text extraction still worked - keep the questions and let images be added by hand
          console.error('Diagram cropping failed:', imgErr);
          parsedQuestions = parsedQuestions.map(({ images, ...rest }) => rest);
        }
      } else {
        console.log("No VITE_GEMINI_API_KEY found. Using pdf.js fallback...");
        const text = await extractTextFromPDF(file);
        parsedQuestions = parseQuestionsFromText(text);
      }
      
      if (parsedQuestions.length === 0) {
        setErrorMsg("We couldn't detect any structured questions in this PDF. Please ensure it follows a standard format.");
        setStatus('error');
        return;
      }
      
      parsedQuestions = parsedQuestions.map(applyNatFields);
      // NAT is always numerical; otherwise keep the AI's call, or work it out from the options
      parsedQuestions = parsedQuestions.map(q => ({
        ...q,
        questionCategory: q.questionType === 'Fill in Blanks'
          ? 'Numerical'
          : (QUESTION_CATEGORIES.includes(q.questionCategory) ? q.questionCategory : inferQuestionCategory(q))
      }));
      // Match items may contain $...$ LaTeX; render them like the question text so they show as symbols
      parsedQuestions = parsedQuestions.map(q => (q.questionType === 'Match' ? {
        ...q,
        matchColumn1: (q.matchColumn1 || []).map(item => formatExtractedText(wrapBareLatex(item))),
        matchColumn2: (q.matchColumn2 || []).map(item => formatExtractedText(wrapBareLatex(item)))
      } : q));
      setExtractedQuestions(parsedQuestions);
      setStatus('review');
      markDuplicates(parsedQuestions);
    } catch (err) {
      console.error("PDF Parsing Error", err);
      setErrorMsg(err.message || "Failed to parse the PDF document.");
      setStatus('error');
    }
  };

  const handleApprove = () => {
    if (!canImport) return;
    confirmApprove(false);
  };

  const handleImportDirect = () => {
    if (!canImportDirect) return;
    confirmApprove(true);
  };

  const handleSettingChange = (e) => {
    const { name, value } = e.target;
    setImportSettings(prev => ({
      ...prev,
      [name]: value,
      // Changing a parent clears the dependent choices
      ...(name === 'department' ? { subject: '', topic: '' } : {}),
      ...(name === 'subject' ? { topic: '' } : {})
    }));
  };

  const loadQuestionBank = async () => {
    const snap = await getDocs(collection(db, 'question_bank'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  };

  const describeDuplicate = (match) => (match.source === 'bank'
    ? { source: 'bank', id: match.question.id, status: match.question.status || '', subject: match.question.subject || '' }
    : { source: 'batch' });

  // Flags extracted questions that are already in the Question Bank (or repeat another question
  // from the same PDF) so the review screen shows which ones the import will skip.
  const markDuplicates = async (list) => {
    setCheckingDuplicates(true);
    try {
      const matches = await findDuplicateQuestions(list, await loadQuestionBank());
      // Match by object, not index - the reviewer may have removed questions meanwhile
      setExtractedQuestions(prev => prev.map(q => {
        const i = list.indexOf(q);
        return i === -1 ? q : { ...q, _duplicate: matches[i] ? describeDuplicate(matches[i]) : null };
      }));
    } catch (err) {
      console.error('Duplicate check failed:', err);
    } finally {
      setCheckingDuplicates(false);
    }
  };

  // direct=true skips the reviewer entirely: questions land straight in the Question
  // Bank as Approved, but flagged reviewed:false since nobody but the typist/admin who
  // extracted them has actually looked them over.
  const confirmApprove = async (direct = false) => {
    setStatus('saving');
    setErrorMsg('');

    // Re-check against the bank as it is right now (someone may have added questions since the
    // review screen opened); duplicates are skipped and everything else is imported.
    let matches;
    try {
      matches = await findDuplicateQuestions(extractedQuestions, await loadQuestionBank());
    } catch (err) {
      console.error('Duplicate check failed:', err);
      setErrorMsg("Couldn't check the Question Bank for duplicates, so nothing was imported. Please try again.");
      setStatus('review');
      return;
    }
    const toImport = extractedQuestions.filter((_, i) => !matches[i]);
    const skipped = extractedQuestions.length - toImport.length;
    const imported = new Set();

    try {
      const reviewer = reviewerEmail.trim().toLowerCase();
      if (!direct && !pairMode) await setDoc(doc(db, 'site_settings', 'ai_review'), { reviewerEmail: reviewer }, { merge: true });
      const pairFields = pairMode
        ? { pairId: localStorage.getItem('pair_id'), typedBy: sessionStorage.getItem('auth_name') || 'Typist' }
        : {};
      const reviewFields = direct
        ? { status: 'Approved', reviewed: false, reviewedBy: '' }
        : { status: 'In Review', reviewed: false, reviewerEmail: reviewer };

      for (const original of toImport) {
        const { _duplicate, ...question } = original;
        await addDoc(collection(db, 'question_bank'), {
          ...question,
          department: importSettings.department,
          year: importSettings.year,
          subject: importSettings.subject,
          topic: importSettings.topic || question.topic || '',
          mark: importSettings.mark,
          difficultyLevel: importSettings.difficultyLevel === 'Auto' ? (question.difficultyLevel || 'Medium') : importSettings.difficultyLevel,
          fillBlankMode: question.fillBlankMode || 'Exact Match',
          fillBlankPrecision: question.fillBlankPrecision || 'None',
          fillBlankRangeStart: question.fillBlankRangeStart || '',
          fillBlankRangeEnd: question.fillBlankRangeEnd || '',
          matchColumn1: question.matchColumn1 || ['', ''],
          matchColumn2: question.matchColumn2 || ['', ''],
          source: 'AI Generator',
          ...reviewFields,
          ...pairFields,
          isPremium: importAsPremium,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        imported.add(original);
      }
      setImportSummary({ imported: toImport.length, skipped });
      setStatus('success');
      setTimeout(() => {
        resetState();
      }, toImport.length === 0 ? 5000 : 3000);
    } catch (error) {
      console.error("Error importing questions:", error);
      // Drop the ones that did get saved, so pressing Import again can't save them twice
      setExtractedQuestions(prev => prev.filter(q => !imported.has(q)));
      setErrorMsg(`Failed to import questions to database.${imported.size ? ` ${imported.size} question(s) were saved before the error and were removed from this list.` : ''}`);
      setStatus('review');
    }
  };

  const resetState = () => {
    setFile(null);
    setStatus('idle');
    setErrorMsg('');
    setExtractedQuestions([]);
    setExtractionWarnings([]);
    setProgressMsg('');
    setImportSummary(null);
    setShowImportModal(false);
    setImportSettings({ department: '', year: '', subject: '', topic: '', mark: '', difficultyLevel: 'Auto' });
  };

  const toggleCategory = (index) => {
    setExtractedQuestions(prev => prev.map((q, i) => (i === index
      ? { ...q, questionCategory: q.questionCategory === 'Numerical' ? 'Theory' : 'Numerical' }
      : q)));
  };

  const removeExtractedImage = (index, field) => {
    setExtractedQuestions(prev => prev.map((q, i) => (i === index ? { ...q, [field]: '' } : q)));
  };

  const renderExtractedImage = (q, idx, field, alt, className) => q[field] && (
    <div className="relative inline-block group/img">
      <img src={q[field]} alt={alt} className={`rounded-lg border border-slate-200 bg-white ${className}`} />
      <button
        type="button"
        onClick={() => removeExtractedImage(idx, field)}
        className="absolute -top-2 -right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full shadow opacity-0 group-hover/img:opacity-100 transition-opacity"
        title="Remove image"
      >
        <X size={12} />
      </button>
    </div>
  );

  const removeQuestion = (index) => {
    const newQuestions = [...extractedQuestions];
    newQuestions.splice(index, 1);
    setExtractedQuestions(newQuestions);
    if (newQuestions.length === 0) {
      resetState();
    }
  };

  const duplicateCount = extractedQuestions.filter(q => q._duplicate).length;
  // Regulation (year) is optional; the other attributes are required on every question.
  const canImport = isValidReviewerEmail && !!importSettings.department && !!importSettings.subject && !!importSettings.mark && !!importSettings.difficultyLevel;
  // Skipping the reviewer doesn't need a reviewer email - just the attributes every question needs.
  const canImportDirect = !!importSettings.department && !!importSettings.subject && !!importSettings.mark && !!importSettings.difficultyLevel;

  const importDetailsForm = (
    <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <h3 className="text-lg font-bold text-slate-800 mb-1">Import Details</h3>
      <p className="text-sm text-slate-500 font-medium mb-4">These details apply to every extracted question. "Approve & Import" sends them to the reviewer first; "Import Directly" skips the reviewer and adds them to the Question Bank right away, flagged as Not Reviewed.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Department</label>
                <select 
                  name="department" 
                  value={importSettings.department} 
                  onChange={handleSettingChange}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="">Select Department...</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Subject</label>
                <select
                  name="subject"
                  value={importSettings.subject}
                  onChange={handleSettingChange}
                  disabled={!importSettings.department}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 disabled:opacity-60"
                >
                  <option value="">{importSettings.department ? 'Select Subject...' : 'Select a department first'}</option>
                  {subjects.map(x => <option key={x} value={x}>{x}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Topic / Subtopic</label>
                <select
                  name="topic"
                  value={importSettings.topic}
                  onChange={handleSettingChange}
                  disabled={!importSettings.subject}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 disabled:opacity-60"
                >
                  <option value="">{importSettings.subject ? 'Select Topic (Optional)...' : 'Select a subject first'}</option>
                  {topics.map(x => <option key={x} value={x}>{x}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Marks</label>
                <select
                  name="mark"
                  value={importSettings.mark}
                  onChange={handleSettingChange}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="">Select Marks...</option>
                  {markOptions.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Difficulty</label>
                <select
                  name="difficultyLevel"
                  value={importSettings.difficultyLevel}
                  onChange={handleSettingChange}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="Auto">Auto-detected from PDF</option>
                  {difficultyLevels.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Regulation (Year) <span className="font-medium text-slate-400">(Optional)</span>
                </label>
                <select
                  name="year"
                  value={importSettings.year}
                  onChange={handleSettingChange}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="">No Regulation</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              {pairMode ? (
                <div className="md:col-span-2 p-4 rounded-xl border border-blue-200 bg-blue-50/60">
                  <span className="block text-sm font-bold text-slate-800">Sent to your assigned reviewer</span>
                  <span className="block text-sm text-slate-600 mt-0.5">
                    {isValidReviewerEmail ? reviewerEmail : 'No reviewer is paired with your account yet. Please contact the admin.'}
                  </span>
                </div>
              ) : (
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-1">Reviewer Email</label>
                <input
                  type="email"
                  value={reviewerEmail}
                  onChange={(e) => setReviewerEmail(e.target.value)}
                  placeholder="reviewer@example.com"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                />
                <p className="text-xs text-slate-500 mt-1">Extracted questions go to this person for review. Only approved questions reach the Question Bank.</p>
              </div>
              )}

              <label className="md:col-span-2 flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={importAsPremium}
                  onChange={(e) => setImportAsPremium(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-amber-500"
                />
                <span>
                  <span className="block text-sm font-bold text-slate-800">Move all extracted questions to the Premium Question Bank</span>
                  <span className="block text-xs text-slate-500 mt-0.5">They will be imported as premium questions instead of the regular question bank.</span>
                </span>
              </label>
      </div>
      {!canImport && (
        <p className="mt-4 text-xs font-bold text-amber-600">Fill in Department, Subject, Marks, Difficulty and a valid reviewer to enable Approve & Import.</p>
      )}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-[900] text-slate-900 tracking-tight flex items-center gap-2">
            <BrainCircuit className="text-purple-600" size={28} />
            AI Question Extractor
          </h2>
          <p className="text-slate-500 font-medium mt-1">Upload a PDF document and let the engine automatically extract and format questions.</p>
        </div>
        {status === 'review' && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleApprove}
              disabled={!canImport}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-[0_4px_14px_rgba(147,51,234,0.3)] flex items-center gap-2"
            >
              <Database size={18} /> Approve & Import
            </button>
            <button
              onClick={handleImportDirect}
              disabled={!canImportDirect}
              title="Skips the reviewer - the questions go straight into the Question Bank, flagged as Not Reviewed"
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-[0_4px_14px_rgba(245,158,11,0.3)] flex items-center gap-2"
            >
              <Upload size={18} /> Import Directly (Skip Review)
            </button>
          </div>
        )}
      </div>

      {status === 'idle' && (
        <>
        <div 
          className="border-2 border-dashed border-slate-300 rounded-2xl px-6 py-6 bg-white flex flex-col items-center justify-center text-center transition-all hover:border-purple-400 hover:bg-purple-50 group cursor-pointer"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".pdf" 
            onChange={handleFileChange} 
          />
          
          {!file ? (
            <>
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Upload size={22} />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">Drag & Drop your PDF here</h3>
              <p className="text-slate-500 font-medium text-sm max-w-md">Ensure your PDF contains numbered questions and lettered options (e.g., 1. What is... A) ...)</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-3 shadow-sm">
                <FileText size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-0.5">{file.name}</h3>
              <p className="text-slate-500 font-medium text-sm mb-4">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              
              <div className="flex gap-4" onClick={(e) => e.stopPropagation()}>
                <button 
                  onClick={resetState}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={startAnalysis}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all shadow-[0_4px_14px_rgba(147,51,234,0.3)] flex items-center gap-2"
                >
                  <Sparkles size={18} /> Extract Questions
                </button>
              </div>
            </>
          )}
        </div>
        {importDetailsForm}
        </>
      )}

      {(status === 'uploading' || status === 'analyzing' || status === 'saving') && (
        <div className="border border-slate-200 rounded-3xl p-16 bg-white flex flex-col items-center justify-center text-center h-[400px] shadow-sm">
          <div className="relative mb-8">
            <div className="w-24 h-24 border-4 border-slate-100 rounded-full"></div>
            <div className="w-24 h-24 border-4 border-purple-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
            <BrainCircuit size={32} className="text-purple-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            {status === 'uploading' && "Loading PDF..."}
            {status === 'analyzing' && "Parsing & Extracting Questions..."}
            {status === 'saving' && "Importing to Database..."}
          </h3>
          <p className="text-slate-500 font-medium max-w-sm">
            {status === 'analyzing' ? (progressMsg || "We are reading the document text and matching question patterns.") : "Please do not close this window."}
          </p>
        </div>
      )}

      {status === 'success' && (
        <div className="border border-slate-200 rounded-3xl p-16 bg-white flex flex-col items-center justify-center text-center h-[400px] shadow-sm">
          <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 size={48} />
          </div>
          <h3 className="text-2xl font-black text-slate-800 mb-2">
            {importSummary && importSummary.imported === 0 ? 'Nothing New to Import' : 'Successfully Imported!'}
          </h3>
          <p className="text-slate-500 font-medium">
            {importSummary && importSummary.imported === 0
              ? `All ${importSummary.skipped} question(s) are already in the Question Bank, so no duplicates were added.`
              : `${importSummary ? `${importSummary.imported} question(s) imported. ` : ''}The extracted questions have been sent to the reviewer. They reach the Question Bank once approved.`}
          </p>
          {importSummary?.skipped > 0 && importSummary.imported > 0 && (
            <p className="text-amber-700 font-semibold mt-2">{importSummary.skipped} duplicate question(s) were skipped.</p>
          )}
        </div>
      )}

      {status === 'error' && (
        <div className="border border-red-200 rounded-3xl p-16 bg-red-50 flex flex-col items-center justify-center text-center h-[400px] shadow-sm">
          <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
            <AlertCircle size={48} />
          </div>
          <h3 className="text-2xl font-black text-slate-800 mb-2">Extraction Failed</h3>
          <p className="text-slate-600 font-medium mb-6 max-w-md">{errorMsg}</p>
          <div className="flex gap-4">
            <button 
              onClick={resetState}
              className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={() => {
                setStatus('idle');
                setErrorMsg('');
                startAnalysis();
              }}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-[0_4px_14px_rgba(220,38,38,0.3)] flex items-center gap-2"
            >
              Retry
            </button>
          </div>
        </div>
      )}

        {status === 'review' && (
          <div className="space-y-6">
            {importDetailsForm}
            {errorMsg && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-4">
                <div className="p-2 bg-red-100 text-red-700 rounded-lg">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-red-900">Import Failed</h4>
                  <p className="text-sm text-red-700 mt-1">{errorMsg}</p>
                </div>
              </div>
            )}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-4">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                <Sparkles size={20} />
              </div>
              <div>
                <h4 className="font-bold text-blue-900">Review Extracted Questions</h4>
                <p className="text-sm text-blue-700 mt-1">We successfully extracted {extractedQuestions.length} questions from <strong>{file?.name}</strong>. Please review them before importing.</p>
              </div>
            </div>
            {checkingDuplicates && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium text-slate-600">
                Checking the Question Bank for duplicates...
              </div>
            )}
            {!checkingDuplicates && duplicateCount > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-4">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                  <Database size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-amber-900">{duplicateCount} duplicate question{duplicateCount > 1 ? 's' : ''} found</h4>
                  <p className="text-sm text-amber-800 mt-1">
                    {duplicateCount > 1 ? 'They are' : 'It is'} marked below and will be skipped. The other {extractedQuestions.length - duplicateCount} question(s) will be imported.
                  </p>
                </div>
              </div>
            )}
            {extractionWarnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-4">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-amber-900">Some content may be missing</h4>
                  <ul className="text-sm text-amber-800 mt-1 list-disc pl-5 space-y-0.5">
                    {extractionWarnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6">
              {extractedQuestions.map((q, idx) => (
                <div key={idx} className={`bg-white border rounded-2xl p-6 shadow-sm relative group ${q._duplicate ? 'border-amber-300 opacity-60' : 'border-slate-200'}`}>
                  <button 
                    onClick={() => removeQuestion(idx)}
                    className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-600 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Discard Question"
                  >
                    <X size={18} />
                  </button>
                  
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-md text-xs font-bold flex items-center gap-1">
                      <Sparkles size={12} /> AI Extracted
                    </span>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-md ${q.difficultyLevel === 'Hard' ? 'bg-red-100 text-red-700' : q.difficultyLevel === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{q.difficultyLevel}</span>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-md">{q.subject} • {q.topic}</span>
                    <button
                      type="button"
                      onClick={() => toggleCategory(idx)}
                      title="Click to switch between Numerical and Theory"
                      className={`text-xs font-bold px-3 py-1 rounded-md border transition-colors ${q.questionCategory === 'Numerical' ? 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100' : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'}`}
                    >
                      {q.questionCategory || 'Theory'} ⇄
                    </button>
                    {q._duplicate && (
                      <span className="text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-md">
                        {q._duplicate.source === 'bank'
                          ? `Already in Question Bank${q._duplicate.subject ? ` (${q._duplicate.subject}${q._duplicate.status ? `, ${q._duplicate.status}` : ''})` : ''} - will be skipped`
                          : 'Repeats another question in this PDF - will be skipped'}
                      </span>
                    )}
                  </div>
                  
                  <h4 className="text-lg font-bold text-slate-900 mb-4" dangerouslySetInnerHTML={{ __html: q.questionText }}></h4>

                  {q.questionImageUrl && (
                    <div className="mb-6">{renderExtractedImage(q, idx, 'questionImageUrl', 'Question diagram', 'max-h-80 max-w-full')}</div>
                  )}

                  {q.questionType === 'Match' && q.matchColumn1 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                      <div className="space-y-2 border border-slate-200 rounded-xl p-4 bg-slate-50">
                        <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Column 1</h5>
                        {q.matchColumn1.filter(item => item.trim()).map((item, i) => (
                          <div key={i} className="text-sm font-medium text-slate-700 bg-white p-2 rounded-lg border border-slate-200 shadow-sm" dangerouslySetInnerHTML={{ __html: item }} />
                        ))}
                      </div>
                      <div className="space-y-2 border border-slate-200 rounded-xl p-4 bg-slate-50">
                        <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Column 2</h5>
                        {q.matchColumn2.filter(item => item.trim()).map((item, i) => (
                          <div key={i} className="text-sm font-medium text-slate-700 bg-white p-2 rounded-lg border border-slate-200 shadow-sm" dangerouslySetInnerHTML={{ __html: item }} />
                        ))}
                      </div>
                    </div>
                  )}

                  {!['Fill in the Blanks', 'Fill in Blanks'].includes(q.questionType) ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                      {['A', 'B', 'C', 'D'].map(opt => (
                        <div key={opt} className={`p-3 rounded-xl border font-medium text-sm flex gap-3 ${((q.questionType === 'Single Choice' || q.questionType === 'Match') && q.correctAnswer === opt) || (q.questionType === 'Multiple Choice' && q.correctAnswers.includes(opt)) ? 'bg-green-50 border-green-200 text-green-800' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                          <span className={`w-6 h-6 rounded flex flex-shrink-0 items-center justify-center font-bold ${((q.questionType === 'Single Choice' || q.questionType === 'Match') && q.correctAnswer === opt) || (q.questionType === 'Multiple Choice' && q.correctAnswers.includes(opt)) ? 'bg-green-200 text-green-800' : 'bg-white border border-slate-300'}`}>
                            {opt}
                          </span>
                          <div className="min-w-0 space-y-2">
                            <span dangerouslySetInnerHTML={{ __html: q[`option${opt}`] }}></span>
                            {renderExtractedImage(q, idx, `option${opt}Image`, `Option ${opt} diagram`, 'max-h-40 max-w-full')}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                      {q.fillBlankMode === 'Numeric Range' ? (
                        <>
                          <span className="font-bold text-green-800">Accepted Range: </span>
                          <span className="text-green-700">{q.fillBlankRangeStart} to {q.fillBlankRangeEnd}</span>
                        </>
                      ) : (
                        <>
                          <span className="font-bold text-green-800">Numerical Answer: </span>
                          <span className="text-green-700">{q.fillBlankAnswer || 'N/A'}</span>
                        </>
                      )}
                    </div>
                  )}
  
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Explanation / Calculation</h5>
                    <p className="text-sm text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: q.explanation }}></p>
                    {q.explanationImageUrl && (
                      <div className="mt-3">{renderExtractedImage(q, idx, 'explanationImageUrl', 'Explanation diagram', 'max-h-64 max-w-full')}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

    </div>
  );
}
