const { onRequest } = require('firebase-functions/v2/https');
const cors = require('cors')({ origin: true });

const LLAMA_CLOUD_BASE = 'https://api.cloud.llamaindex.ai';

const QUESTION_EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      description: "Array of extracted questions from the document in exact reading order",
      items: {
        type: "object",
        properties: {
          questionNumber: {
            type: "string",
            description: "The question's label exactly as printed, e.g. \"Q1\", \"12\", \"Q3(a)\""
          },
          questionType: {
            type: "string",
            enum: ["Single Choice", "Multiple Choice", "Fill in the Blanks", "Match"],
            description: "Single Choice | Multiple Choice | Fill in the Blanks | Match"
          },
          questionCategory: {
            type: "string",
            enum: ["Numerical", "Theory"],
            description: "Numerical when the answer is a calculated value or for NAT/Fill in the Blanks; Theory for conceptual/statement/code questions"
          },
          questionText: {
            type: "string",
            description: "The COMPLETE question text exactly as printed, word for word. Use LaTeX inside $...$ ONLY for genuine mathematical formulas, equations, variables, or Greek letters. Do NOT put dollar signs ($) around plain numbers or numbers with units (e.g., write 8 kg, 3200 N/m, 10 rad/s as plain text without dollars). Do NOT include question number or header."
          },
          optionA: { type: "string", description: "Option A text as plain text without dollar signs (e.g. 10 rad/s). Use $...$ only if it is an actual mathematical formula." },
          optionB: { type: "string", description: "Option B text as plain text without dollar signs (e.g. 20 rad/s). Use $...$ only if it is an actual mathematical formula." },
          optionC: { type: "string", description: "Option C text as plain text without dollar signs (e.g. 25 rad/s). Use $...$ only if it is an actual mathematical formula." },
          optionD: { type: "string", description: "Option D text as plain text without dollar signs (e.g. 40 rad/s). Use $...$ only if it is an actual mathematical formula." },
          correctAnswer: { type: "string", description: "A, B, C, or D (For Single Choice/Match)" },
          correctAnswers: {
            type: "array",
            items: { type: "string" },
            description: "Array of correct option letters for Multiple Choice, e.g. [\"A\", \"B\"]"
          },
          fillBlankAnswer: {
            type: "string",
            description: "For NAT only: exact numerical answer as plain digits (no units, no commas, no dollar signs)"
          },
          fillBlankMode: {
            type: "string",
            enum: ["Exact Match", "Numeric Range"],
            description: "Numeric Range if PDF states a range of accepted answers, otherwise Exact Match"
          },
          fillBlankRangeStart: { type: "string", description: "Lowest accepted value as plain digits for range" },
          fillBlankRangeEnd: { type: "string", description: "Highest accepted value as plain digits for range" },
          topic: { type: "string", description: "The title printed in question's header or short topic" },
          difficultyLevel: {
            type: "string",
            enum: ["Easy", "Medium", "Hard"],
            description: "Easy | Medium | Hard"
          },
          explanation: {
            type: "string",
            description: "The COMPLETE solution/explanation exactly as printed, with all steps, concepts, formulas, calculations. Use LaTeX inside $...$ ONLY for math/equations, never around plain numbers or units."
          },
          matchColumn1: {
            type: "array",
            items: { type: "string" },
            description: "Only for Match questions, array of exactly 4 strings"
          },
          matchColumn2: {
            type: "array",
            items: { type: "string" },
            description: "Only for Match questions, array of exactly 4 strings"
          },
          images: {
            type: "array",
            items: {
              type: "object",
              properties: {
                target: {
                  type: "string",
                  enum: ["question", "optionA", "optionB", "optionC", "optionD", "explanation"]
                },
                page: { type: "number", description: "1-based page index within the PDF" },
                box_2d: {
                  type: "array",
                  items: { type: "number" },
                  description: "[ymin, xmin, ymax, xmax] normalized to 0-1000"
                }
              }
            },
            description: "Figures/diagrams belonging to this question"
          }
        },
        required: ["questionText", "questionType"]
      }
    }
  },
  required: ["questions"]
};

const DEFAULT_PROMPT = `You are a specialized AI that transcribes multiple-choice, numerical and match-the-column questions from PDF documents into JSON, completely and word for word.
Read the attached document and extract all questions.
Extract each question object strictly adhering to the schema.
IMPORTANT:
- COMPLETENESS IS THE TOP PRIORITY. Extract every question - never skip one, including long questions and ones with diagrams, tables, code or unusual layouts. Transcribe everything; never shorten, summarize, paraphrase, merge or "clean up" any text in the question, options or solution. When unsure whether something belongs, include it.
- Keep the structure: separate paragraphs, calculation steps, list items and sub-parts with \\n, keep their numbering/bullets, and put each equation step of a calculation on its own line.
- DO NOT wrap plain numbers or values with units in dollar signs ($). Plain values like "8 kg", "10 rad/s", "3200 N/m", "25 m/s", "100 N", "50 Hz", "20 s", "300 K", "12 V", "5 A", "100%" or plain numbers like "8", "500", "0.25" must be written as PLAIN TEXT without any dollar symbols ($).
- ONLY use $...$ for genuine mathematical expressions, formulas, equations, fractions, variables, Greek letters, square roots, integrals, or sub/superscripts (e.g., $\\omega_n = \\sqrt{k/m}$, $\\frac{1}{U}$, $\\sigma_x$, $x^2 + y^2 = r^2$, $x$, $y$).
- Options (optionA, optionB, optionC, optionD) MUST be plain text without dollar signs ($) unless an option is an actual mathematical formula. Never wrap option values and units (such as "10 rad/s", "20 rad/s") in dollar signs.
- Never produce empty dollar signs ($$ or $ $) or wrap ordinary English words in dollar signs.
- Every $...$ must compile in KaTeX: balanced braces, never two superscripts or two subscripts in a row (write $25^{\\circ}\\text{C}$, never $10^1^\\circ$), degrees as ^{\\circ}, only standard LaTeX math commands (no siunitx such as \\SI or \\si, no custom macros, no \\( \\) or \\[ \\] delimiters).
- Copy every number, unit and symbol exactly as printed in the PDF. Never rewrite a value into another form. Do not add, drop, summarize or reword any text; keep the full question and full explanation.
- This applies to matchColumn1 and matchColumn2 too - every expression containing a LaTeX command (\\sigma, \\Delta, \\frac, subscripts like R_1, etc.) MUST be wrapped in $...$. Never output a bare backslash command outside $...$ anywhere in the JSON.
- For Fill in the Blanks (NAT) questions, read the answer key / answer line carefully. Put a single value in fillBlankAnswer, or if a range of accepted answers is given, set fillBlankMode to "Numeric Range" and fill fillBlankRangeStart and fillBlankRangeEnd. Never put units in these fields.
- CODE: If a question or explanation contains a code snippet (Python, C, Java, SQL, shell, etc.), put it inside a fenced block: three backticks + language name, a newline, the code, a newline, three backticks. Keep every line break (as \\n) and every leading space of indentation exactly as printed. Never flatten code onto one line and never use $...$ inside code.
- Short inline code such as identifiers, keywords or literals goes in single backticks.
- Copy option text exactly as printed, including angle brackets and quotes. Options are plain text: use single backticks for code-like options, never HTML. Do not include the ✓ tick mark in the option text; use it only to set the correct answer.
- TABLES: Transcribe every table of text or numbers as a Markdown table on its own lines: a header row, then a separator row, then one row per table row, each cell between | characters. Keep every row, column, header and value exactly as printed, use $...$ for maths inside cells, and put the table's caption on its own line just before it. Never make an image for such a table.
- DIAGRAMS: For every figure drawn as a graphic - diagram, graph, plot, circuit, tree, flowchart, geometric figure, chemical structure or photo - add one entry to "images" of the question it belongs to:
  - "page": the 1-based index of the page within this PDF file (the file's first page is 1; ignore printed page numbers).
  - "box_2d": [ymin, xmin, ymax, xmax] normalized to 0-1000 of that page's height and width, drawn tightly around the whole figure including its labels and caption. STRICT REQUIREMENT: box_2d MUST NEVER include any options (A, B, C, D), option labels, or explanation text. ymax MUST stop strictly above the start of Option (A) and Option (B). ymin MUST be strictly below the question text. Do NOT include question text, options, code, or the question's header bar/border.
  - "target": "question" for a figure in the question body; "optionA"-"optionD" when that option is itself a figure; "explanation" for a figure in the solution/explanation.
  - Never make images for code snippets, equations or plain text - transcribe those as text.
- For Match type questions, extract the columns accurately.
- For Match type questions, optionA, optionB, optionC and optionD MUST be filled with the answer choices exactly as printed in the PDF (for example "P-2, Q-1, R-4, S-3"). Never leave them empty, and set correctAnswer to the letter of the correct choice.
- CONTINUATIONS ACROSS PAGES: Questions often start near the bottom of one page and continue with options (A, B, C, D) or explanation/solution at the top of the next page. You MUST connect the continuation from the next page to the question. Never leave optionA, optionB, optionC, optionD, correctAnswer, or explanation empty when they appear on the subsequent page.`;

async function getLlamaCloudProjectId(apiKey) {
  try {
    const res = await fetch(`${LLAMA_CLOUD_BASE}/api/v1/projects`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    if (res.ok) {
      const projects = await res.json();
      if (Array.isArray(projects) && projects.length > 0) {
        const def = projects.find(p => p.is_default) || projects[0];
        return def.id;
      }
    }
  } catch (err) {
    console.warn("Could not fetch LlamaCloud projects:", err);
  }
  return '696d4251-46c7-40d2-9b29-ceaa6d9b04b9';
}

async function uploadFileBuffer(buffer, fileName, mimeType, apiKey) {
  const form = new FormData();
  const blob = new Blob([buffer], { type: mimeType || 'application/pdf' });
  form.append('file', blob, fileName || 'document.pdf');
  form.append('purpose', 'extract');
  const res = await fetch(`${LLAMA_CLOUD_BASE}/api/v1/beta/files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Failed to upload file to LlamaIndex (${res.status})`);
  }
  const data = await res.json();
  return data.id;
}

async function pollJob(jobId, apiKey, maxWaitSeconds = 280) {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitSeconds * 1000) {
    await new Promise(r => setTimeout(r, 2000));
    const res = await fetch(`${LLAMA_CLOUD_BASE}/api/v2/extract/${jobId}`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    if (!res.ok) {
      if (res.status === 429) {
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `LlamaIndex job check failed (${res.status})`);
    }
    const data = await res.json();
    if (data.status === 'COMPLETED') {
      return data.extract_result?.questions || [];
    }
    if (data.status === 'FAILED') {
      throw new Error(data.error_message || 'LlamaIndex extraction job failed.');
    }
  }
  throw new Error('LlamaIndex extraction timed out.');
}

// Strip unwanted dollar signs ($) from plain numbers, values with units, or plain words
function cleanUnwantedDollars(text) {
  if (!text || typeof text !== 'string') return text;

  // 1. Remove empty or whitespace-only dollar wrappers: $$ $$, $$, $ $
  let cleaned = text.replace(/\$\$\s*\$\$/g, '').replace(/\$\s*\$/g, '');

  // 2. Helper to test if content inside $...$ is just a plain number, number with unit, or plain text
  const isUnwantedMath = (inner) => {
    const trimmed = inner.trim();
    if (!trimmed) return true;

    // Normalize \text{...} or \mathrm{...} inside the dollar (e.g. $8 \text{ kg}$ -> 8 kg)
    const unwrapped = trimmed
      .replace(/\\(?:text|mathrm|mathbf|mathit)\s*\{([^{}]*)\}/g, '$1')
      .trim();

    // Check if it has genuine math commands or symbols
    // Math commands: \frac, \sqrt, \alpha-\omega, \sum, \int, \partial, \infty, etc.
    const hasMathCommand = /\\(?!text|mathrm|mathbf|mathit)[a-zA-Z]+/.test(unwrapped);
    if (hasMathCommand) return false;

    // If it has '=' or '<' or '>' or '\approx' or '\neq', it's an equation/relation
    if (/[=<>]/.test(unwrapped)) return false;

    // Check if it has algebraic operators like +, * between variables (e.g. a + b, 2x * y)
    // Note: slash '/' is commonly used in units (rad/s, m/s, N/m), so only + and * or - between letters indicate algebra
    if (/[a-zA-Z]\s*[+*]\s*[a-zA-Z0-9]/.test(unwrapped) || /[0-9]\s*[+*]\s*[a-zA-Z]/.test(unwrapped)) {
      return false;
    }
    if (/[a-zA-Z]\s*-\s*[a-zA-Z]/.test(unwrapped)) {
      return false;
    }

    // Check if it's a single letter variable like $x$, $y$, $k$, $m$, $t$, $T$
    if (/^[a-zA-Z]$/.test(unwrapped)) return false;

    // If it has superscripts/subscripts on variables like x_1 or k_e
    if (/[a-zA-Z][_^]\{?[a-zA-Z0-9+-]+\}?/.test(unwrapped)) {
      // Check if it's just a unit power like m^2, m^3, s^-1, cm^2
      if (!/^\s*\d*(?:\.\d+)?\s*(?:[a-zA-Z]+\s*\/)?\s*[a-zA-Z]+\^[0-9+-]+\s*$/i.test(unwrapped)) {
        return false;
      }
    }

    // Plain numbers: $8$, $3200$, $-15$, $0.25$, $+10$
    if (/^[-+]?\s*\d+(?:\.\d+)?\s*%?$/.test(unwrapped)) {
      return true;
    }

    // Numbers with units:
    // e.g. "8 kg", "10 rad/s", "3200 N/m", "25 m/s", "100 N", "50 Hz", "300 K", "12 V", "5 A", "100 rpm"
    if (/^[-+]?\s*\d+(?:\.\d+)?\s*(?:[a-zA-Z°%µΩ]+|\b)(?:\s*[\/·•]\s*[a-zA-Z°%µΩ]+)*(?:\^[0-9+-]+)?\s*$/.test(unwrapped)) {
      return true;
    }

    // Plain prose words without math symbols (e.g. "$mass$", "$spring$", "$True$", "$None of the above$")
    if (/^[A-Za-z\s.,;:()'"\-_/]+$/.test(unwrapped) && !trimmed.includes('\\')) {
      return true;
    }

    return false;
  };

  // Replace $$...$$ where inner is unwanted
  cleaned = cleaned.replace(/\$\$([^$]+)\$\$/g, (match, inner) => {
    if (isUnwantedMath(inner)) {
      return inner.trim().replace(/\\(?:text|mathrm|mathbf|mathit)\s*\{([^{}]*)\}/g, '$1');
    }
    return match;
  });

  // Replace $...$ where inner is unwanted
  cleaned = cleaned.replace(/\$([^$\n]+)\$/g, (match, inner) => {
    if (isUnwantedMath(inner)) {
      return inner.trim().replace(/\\(?:text|mathrm|mathbf|mathit)\s*\{([^{}]*)\}/g, '$1');
    }
    return match;
  });

  return cleaned;
}

function sanitizeQuestionObject(q) {
  if (!q || typeof q !== 'object') return q;
  const sanitized = { ...q };
  if (typeof sanitized.questionText === 'string') sanitized.questionText = cleanUnwantedDollars(sanitized.questionText);
  if (typeof sanitized.optionA === 'string') sanitized.optionA = cleanUnwantedDollars(sanitized.optionA);
  if (typeof sanitized.optionB === 'string') sanitized.optionB = cleanUnwantedDollars(sanitized.optionB);
  if (typeof sanitized.optionC === 'string') sanitized.optionC = cleanUnwantedDollars(sanitized.optionC);
  if (typeof sanitized.optionD === 'string') sanitized.optionD = cleanUnwantedDollars(sanitized.optionD);
  if (typeof sanitized.explanation === 'string') sanitized.explanation = cleanUnwantedDollars(sanitized.explanation);
  if (typeof sanitized.fillBlankAnswer === 'string') sanitized.fillBlankAnswer = cleanUnwantedDollars(sanitized.fillBlankAnswer).replace(/[\$\s]/g, '');
  if (Array.isArray(sanitized.matchColumn1)) {
    sanitized.matchColumn1 = sanitized.matchColumn1.map(item => cleanUnwantedDollars(item));
  }
  if (Array.isArray(sanitized.matchColumn2)) {
    sanitized.matchColumn2 = sanitized.matchColumn2.map(item => cleanUnwantedDollars(item));
  }
  return sanitized;
}

exports.extractQuestions = onRequest({
  cors: true,
  timeoutSeconds: 300,
  memory: '512MiB'
}, (req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const apiKey = process.env.LLAMA_INDEX_API
        || process.env.LLAMA_CLOUD_API_KEY
        || process.env.Lama_INDEX_API
        || process.env.VITE_LLAMA_INDEX_API_KEY
        || req.body?.apiKey
        || (req.headers.authorization ? req.headers.authorization.replace(/^Bearer\s+/i, '').trim() : null);

      if (!apiKey) {
        return res.status(500).json({ error: 'Question extraction service is not configured on the server.' });
      }

      let fileId = req.body?.fileId;
      if (!fileId && req.body?.fileBase64) {
        const buffer = Buffer.from(req.body.fileBase64, 'base64');
        fileId = await uploadFileBuffer(buffer, req.body.fileName, req.body.fileType, apiKey);
      }

      if (!fileId) {
        return res.status(400).json({ error: 'Either fileBase64 or fileId is required.' });
      }

      const projectId = await getLlamaCloudProjectId(apiKey);
      const prompt = req.body?.prompt || DEFAULT_PROMPT;
      const scopeText = req.body?.scopeText || '';
      const systemPrompt = scopeText ? `${prompt}\n\nSCOPE: ${scopeText}` : prompt;

      const config = {
        tier: req.body?.tier || 'agentic',
        version: '2.6',
        system_prompt: systemPrompt,
        data_schema: req.body?.data_schema || QUESTION_EXTRACTION_SCHEMA
      };

      if (req.body?.targetPages) {
        config.target_pages = req.body.targetPages;
      }

      const createRes = await fetch(`${LLAMA_CLOUD_BASE}/api/v2/extract?project_id=${projectId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          file_input: fileId,
          configuration: config
        })
      });

      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        throw new Error(err.detail || `LlamaIndex extract job creation failed (${createRes.status})`);
      }

      const job = await createRes.json();
      const questions = await pollJob(job.id, apiKey, 280);

      // Normalize diagram image page numbers if extracted within a target_pages slice (e.g. "13-16")
      if (req.body?.targetPages && typeof req.body.targetPages === 'string') {
        const parts = req.body.targetPages.split('-').map(s => parseInt(s.trim(), 10));
        const from = parts[0];
        const to = parts[1] || from;
        if (from > 1 && Array.isArray(questions)) {
          for (const q of questions) {
            if (Array.isArray(q.images)) {
              for (const img of q.images) {
                if (img && img.page != null) {
                  const p = parseInt(img.page, 10);
                  if (!isNaN(p)) {
                    if (to && p >= from && p <= to) {
                      img.page = p;
                    } else if (p >= 1 && (!to || p <= (to - from + 1))) {
                      img.page = (from - 1) + p;
                    }
                  }
                }
              }
            }
          }
        }
      }

      const sanitizedQuestions = Array.isArray(questions) ? questions.map(sanitizeQuestionObject) : questions;

      return res.status(200).json({
        success: true,
        fileId,
        jobId: job.id,
        questions: sanitizedQuestions
      });
    } catch (err) {
      console.error('extractQuestions error:', err);
      let msg = err.message || 'Question extraction failed';
      if (/401|unauthorized|invalid.*key/i.test(msg)) {
        msg = "AI extraction authentication error. Please check server configuration.";
      } else if (/429|quota|credits|rate limit/i.test(msg)) {
        msg = "AI service rate limit reached or credits exhausted. Please try again later.";
      } else if (/503|service unavailable|overloaded/i.test(msg)) {
        msg = "AI extraction servers are busy right now. Please wait a moment and try again.";
      }
      return res.status(500).json({ error: msg });
    }
  });
});
