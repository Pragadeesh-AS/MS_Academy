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
            description: "The COMPLETE question text exactly as printed, word for word. Use LaTeX inside $...$ for all math/equations. Do NOT include question number or header."
          },
          optionA: { type: "string", description: "Option A text" },
          optionB: { type: "string", description: "Option B text" },
          optionC: { type: "string", description: "Option C text" },
          optionD: { type: "string", description: "Option D text" },
          correctAnswer: { type: "string", description: "A, B, C, or D (For Single Choice/Match)" },
          correctAnswers: {
            type: "array",
            items: { type: "string" },
            description: "Array of correct option letters for Multiple Choice, e.g. [\"A\", \"B\"]"
          },
          fillBlankAnswer: {
            type: "string",
            description: "For NAT only: exact numerical answer as plain digits (no units, no commas)"
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
            description: "The COMPLETE solution/explanation exactly as printed, with all steps, concepts, formulas, calculations. Use LaTeX inside $...$."
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
- For equations, fractions, subscripts, or math symbols, use standard LaTeX formatting enclosed in $...$ (e.g., $m^2K$, $\\frac{1}{U}$).
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
  - "box_2d": [ymin, xmin, ymax, xmax] normalized to 0-1000 of that page's height and width, drawn tightly around the whole figure including its labels and caption, but NOT the question text, options, code, or the question's header bar/border.
  - "target": "question" for a figure in the question body; "optionA"-"optionD" when that option is itself a figure; "explanation" for a figure in the solution/explanation.
  - Never make images for code snippets, equations or plain text - transcribe those as text.
- For Match type questions, extract the columns accurately.
- For Match type questions, optionA, optionB, optionC and optionD MUST be filled with the answer choices exactly as printed in the PDF (for example "P-2, Q-1, R-4, S-3"). Never leave them empty, and set correctAnswer to the letter of the correct choice.`;

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
      const apiKey = req.body?.apiKey
        || (req.headers.authorization ? req.headers.authorization.replace(/^Bearer\s+/i, '').trim() : null)
        || process.env.LLAMA_INDEX_API
        || process.env.LLAMA_CLOUD_API_KEY
        || process.env.VITE_LLAMA_INDEX_API_KEY
        || process.env.Lama_INDEX_API;

      if (!apiKey) {
        return res.status(400).json({ error: 'LlamaIndex API key is required. Please check your Lama_INDEX_API key in the environment.' });
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

      return res.status(200).json({
        success: true,
        fileId,
        jobId: job.id,
        questions
      });
    } catch (err) {
      console.error('extractQuestions error:', err);
      let msg = err.message || 'Question extraction failed';
      if (/401|unauthorized|invalid.*key/i.test(msg)) {
        msg = "The LlamaIndex API key is invalid or unauthorized. Please verify your Lama_INDEX_API key in the .env file.";
      } else if (/429|quota|credits|rate limit/i.test(msg)) {
        msg = "LlamaIndex API rate limit reached or credits exhausted. Please check your LlamaCloud account.";
      } else if (/503|service unavailable|overloaded/i.test(msg)) {
        msg = "LlamaIndex servers are busy right now. Please wait a moment and try again.";
      }
      return res.status(500).json({ error: msg });
    }
  });
});
