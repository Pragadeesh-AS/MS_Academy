import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Upload, FileText, CheckCircle2, X, Database, BrainCircuit, AlertCircle } from 'lucide-react';
import { db } from '../../firebase';
import { collection, addDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import { GoogleGenAI } from '@google/genai';
import katex from 'katex';
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

export default function AIGenerator({ pairMode = false }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | uploading | analyzing | review | success | error
  const [errorMsg, setErrorMsg] = useState('');
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

    // Convert any $...$ LaTeX blocks directly to HTML using KaTeX
    processed = processed.replace(/\$([^\$]+)\$/g, (match, math) => {
      try {
        return katex.renderToString(math, { throwOnError: false, output: 'html' });
      } catch (e) {
        return match;
      }
    });
    
    return processed;
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
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result.split(',')[1];
        resolve({
          inlineData: { data: base64Data, mimeType: fileObj.type }
        });
      };
      reader.readAsDataURL(fileObj);
    });
  };

  const startAnalysis = async () => {
    if (!file) return;
    setStatus('uploading');
    setErrorMsg('');
    
    try {
      setStatus('analyzing');
      let parsedQuestions = [];
      
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (apiKey) {
        let apiSuccess = false;
        const modelsToTry = [
          "gemini-3.5-flash-lite",
          "gemini-3.6-flash",
          "gemini-2.0-flash",
          "gemini-1.5-flash",
          "gemini-1.5-flash-8b",
          "gemini-1.0-pro"
        ];
        
        console.log("Attempting to use Gemini API for extraction...");
        const ai = new GoogleGenAI({ apiKey });
        const pdfPart = await fileToGenerativePart(file);
        
        const prompt = `You are a specialized AI that extracts multiple-choice and numerical questions from PDF documents.
Read the attached PDF and extract all questions. 
Respond ONLY with a valid JSON array of objects. Do not include markdown code blocks (\`\`\`json) or any other text.
Each object must have exactly these fields:
{
  "questionType": "Single Choice" | "Multiple Choice" | "Fill in the Blanks" | "Match",
  "questionText": "Text of the question (Do NOT include the question number). Use LaTeX inside $...$ for all math/equations.",
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
  "topic": "Extracted Topic",
  "difficultyLevel": "Easy" | "Medium" | "Hard",
  "explanation": "Explanation or calculation (use LaTeX inside $...$ for all math/equations)",
  "matchColumn1": ["Item P", "Item Q", "Item R", "Item S"], (Only for Match questions, array of exactly 4 strings. Fill empty strings if less than 4)
  "matchColumn2": ["Item 1", "Item 2", "Item 3", "Item 4"] (Only for Match questions, array of exactly 4 strings. Fill empty strings if less than 4)
}
IMPORTANT: 
- For equations, fractions, subscripts, or math symbols, use standard LaTeX formatting enclosed in $...$ (e.g., $m^2K$, $\\\\frac{1}{U}$). YOU MUST double-escape all backslashes so the output is valid JSON (e.g. use \\\\frac instead of \\frac).
- For Fill in the Blanks (NAT) questions, read the answer key / answer line carefully. Put a single value in fillBlankAnswer, or if a range of accepted answers is given, set fillBlankMode to \"Numeric Range\" and fill fillBlankRangeStart and fillBlankRangeEnd. Never put units in these fields.
- For Match type questions, extract the columns accurately.
- The response MUST be a pure JSON array parseable by JSON.parse().`;

        for (const modelName of modelsToTry) {
          if (apiSuccess) break;
          try {
            console.log(`Trying model: ${modelName}...`);
            const interaction = await ai.interactions.create({
                model: modelName,
                input: [
                    { type: "text", text: prompt },
                    { type: "document", data: pdfPart.inlineData.data, mime_type: pdfPart.inlineData.mimeType }
                ]
            });
            const responseText = interaction.output_text;
            
            const cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
            parsedQuestions = JSON.parse(cleanJson);
            parsedQuestions = parsedQuestions.map(q => ({
              ...q, 
              isImported: true,
              questionText: renderLatexToHTML(q.questionText),
              optionA: renderLatexToHTML(q.optionA),
              optionB: renderLatexToHTML(q.optionB),
              optionC: renderLatexToHTML(q.optionC),
              optionD: renderLatexToHTML(q.optionD),
              explanation: renderLatexToHTML(q.explanation)
            }));
            
            console.log(`Successfully extracted via Gemini API using ${modelName}.`);
            apiSuccess = true;
          } catch (modelError) {
            console.warn(`Model ${modelName} failed:`, modelError.message || modelError);
          }
        }
        
        if (!apiSuccess) {
          setErrorMsg("All Gemini AI models failed. Please check your API key or try again later.");
          setStatus('error');
          return;
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
      // Match items may contain $...$ LaTeX; render them like the question text so they show as symbols
      parsedQuestions = parsedQuestions.map(q => (q.questionType === 'Match' ? {
        ...q,
        matchColumn1: (q.matchColumn1 || []).map(item => renderLatexToHTML(item)),
        matchColumn2: (q.matchColumn2 || []).map(item => renderLatexToHTML(item))
      } : q));
      setExtractedQuestions(parsedQuestions);
      setStatus('review');
    } catch (err) {
      console.error("PDF Parsing Error", err);
      setErrorMsg(err.message || "Failed to parse the PDF document.");
      setStatus('error');
    }
  };

  const handleApprove = () => {
    if (!canImport) return;
    confirmApprove();
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

  const confirmApprove = async () => {
    setStatus('saving');
    setErrorMsg('');
    try {
      const reviewer = reviewerEmail.trim().toLowerCase();
      if (!pairMode) await setDoc(doc(db, 'site_settings', 'ai_review'), { reviewerEmail: reviewer }, { merge: true });
      const pairFields = pairMode
        ? { pairId: localStorage.getItem('pair_id'), typedBy: sessionStorage.getItem('auth_name') || 'Typist' }
        : {};

      for (const question of extractedQuestions) {
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
          status: 'In Review',
          reviewerEmail: reviewer,
          source: 'AI Generator',
          ...pairFields,
          isPremium: importAsPremium,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      setStatus('success');
      setTimeout(() => {
        resetState();
      }, 3000);
    } catch (error) {
      console.error("Error importing questions:", error);
      setErrorMsg("Failed to import questions to database.");
      setStatus('review');
    }
  };

  const resetState = () => {
    setFile(null);
    setStatus('idle');
    setErrorMsg('');
    setExtractedQuestions([]);
    setShowImportModal(false);
    setImportSettings({ department: '', year: '', subject: '', topic: '', mark: '', difficultyLevel: 'Auto' });
  };

  const removeQuestion = (index) => {
    const newQuestions = [...extractedQuestions];
    newQuestions.splice(index, 1);
    setExtractedQuestions(newQuestions);
    if (newQuestions.length === 0) {
      resetState();
    }
  };

  const canImport = isValidReviewerEmail && !!importSettings.department && !!importSettings.year && !!importSettings.subject && !!importSettings.mark && !!importSettings.difficultyLevel;

  const importDetailsForm = (
    <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <h3 className="text-lg font-bold text-slate-800 mb-1">Import Details</h3>
      <p className="text-sm text-slate-500 font-medium mb-4">These details apply to every extracted question. Once you click Approve & Import, the questions are sent straight to the reviewer.</p>
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
                <label className="block text-sm font-bold text-slate-700 mb-1">Regulation (Year)</label>
                <select 
                  name="year" 
                  value={importSettings.year} 
                  onChange={handleSettingChange}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="">Select Regulation...</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
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

              <div className="grid grid-cols-2 gap-4 md:col-span-2">
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
        <p className="mt-4 text-xs font-bold text-amber-600">Fill in Department, Regulation, Subject, Marks, Difficulty and a valid reviewer to enable Approve & Import.</p>
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
          <button 
            onClick={handleApprove}
            disabled={!canImport}
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-[0_4px_14px_rgba(147,51,234,0.3)] flex items-center gap-2"
          >
            <Database size={18} /> Approve & Import
          </button>
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
            {status === 'analyzing' ? "We are reading the document text and matching question patterns." : "Please do not close this window."}
          </p>
        </div>
      )}

      {status === 'success' && (
        <div className="border border-slate-200 rounded-3xl p-16 bg-white flex flex-col items-center justify-center text-center h-[400px] shadow-sm">
          <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 size={48} />
          </div>
          <h3 className="text-2xl font-black text-slate-800 mb-2">Successfully Imported!</h3>
          <p className="text-slate-500 font-medium">The extracted questions have been sent to the reviewer. They reach the Question Bank once approved.</p>
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
  
            <div className="grid grid-cols-1 gap-6">
              {extractedQuestions.map((q, idx) => (
                <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative group">
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
                  </div>
                  
                  <h4 className="text-lg font-bold text-slate-900 mb-4" dangerouslySetInnerHTML={{ __html: q.questionText }}></h4>
                  
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
                          <span dangerouslySetInnerHTML={{ __html: q[`option${opt}`] }}></span>
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
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

    </div>
  );
}
