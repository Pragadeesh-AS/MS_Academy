import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Upload, FileText, CheckCircle2, X, Database, BrainCircuit, Play, Loader2 } from 'lucide-react';
import { db } from '../../firebase';
import { collection, addDoc } from 'firebase/firestore';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';

// Configure the worker for PDF.js using a CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = '//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

export default function AIGenerator() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | uploading | analyzing | review | success
  const [extractedQuestions, setExtractedQuestions] = useState([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importSettings, setImportSettings] = useState({ department: '', year: '', subject: '', topic: '', mark: '', difficultyLevel: 'Auto' });
  const fileInputRef = useRef(null);
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({length: currentYear - 1990 + 1}, (_, i) => (currentYear - i).toString());
  const departments = [
    'Computer Science (CSE)',
    'Electronics (ECE)',
    'Mechanical (ME)',
    'Civil (CE)',
    'Electrical (EE)',
    'Data Science (DS)',
    'All Departments'
  ];
  const difficultyLevels = ['Easy', 'Medium', 'Hard'];
  const markOptions = ['1 Mark', '2 Marks', '3 Marks', '4 Marks', '5 Marks', '10 Marks', '15 Marks', '1 Mark (-0.33)', '2 Marks (-0.66)'];

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
        
        optA = checkAndClean(optA, 'A');
        optB = checkAndClean(optB, 'B');
        optC = checkAndClean(optC, 'C');
        optD = checkAndClean(optD, 'D');
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
      
      qText = preserveWhitespace(qText);
      explanation = preserveWhitespace(explanation);
      
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

  const startAnalysis = async () => {
    if (!file) return;
    setStatus('uploading');
    
    try {
      setStatus('analyzing');
      const text = await extractTextFromPDF(file);
      const parsedQuestions = parseQuestionsFromText(text);
      
      if (parsedQuestions.length === 0) {
        alert("We couldn't detect any structured questions in this PDF. Please ensure it follows a standard format (1. Question... A) Option...).");
        setStatus('idle');
        return;
      }
      
      setExtractedQuestions(parsedQuestions);
      setStatus('review');
    } catch (err) {
      console.error("PDF Parsing Error", err);
      alert("Failed to parse the PDF document.");
      setStatus('idle');
    }
  };

  const handleApprove = () => {
    setShowImportModal(true);
  };

  const handleSettingChange = (e) => {
    setImportSettings({ ...importSettings, [e.target.name]: e.target.value });
  };

  const confirmApprove = async () => {
    setShowImportModal(false);
    setStatus('saving');
    try {
      for (const question of extractedQuestions) {
        await addDoc(collection(db, 'question_bank'), { 
          ...question, 
          department: importSettings.department,
          year: importSettings.year,
          subject: importSettings.subject,
          topic: importSettings.topic || question.topic || '',
          mark: importSettings.mark || '1',
          difficultyLevel: importSettings.difficultyLevel === 'Auto' ? (question.difficultyLevel || 'Medium') : importSettings.difficultyLevel,
          matchColumn1: question.matchColumn1 || ['', ''],
          matchColumn2: question.matchColumn2 || ['', ''],
          status: 'Approved' 
        });
      }
      setStatus('success');
      setTimeout(() => {
        resetState();
      }, 3000);
    } catch (error) {
      console.error("Error importing questions:", error);
      alert("Failed to import questions to database.");
      setStatus('review');
    }
  };

  const resetState = () => {
    setFile(null);
    setStatus('idle');
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

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-[900] text-slate-900 tracking-tight flex items-center gap-2">
            <BrainCircuit className="text-purple-600" size={28} />
            AI Question Extractor
          </h2>
          <p className="text-slate-500 font-medium mt-1">Upload a PDF document and let the engine automatically extract and format questions.</p>
        </div>
        {status === 'review' && (
          <button 
            onClick={handleApprove}
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all shadow-[0_4px_14px_rgba(147,51,234,0.3)] flex items-center gap-2"
          >
            <Database size={18} /> Approve & Import
          </button>
        )}
      </div>

      {status === 'idle' && (
        <div 
          className="border-2 border-dashed border-slate-300 rounded-3xl p-12 bg-white flex flex-col items-center justify-center text-center transition-all hover:border-purple-400 hover:bg-purple-50 group cursor-pointer h-[400px]"
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
              <div className="w-20 h-20 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Upload size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Drag & Drop your PDF here</h3>
              <p className="text-slate-500 font-medium max-w-sm">Ensure your PDF contains numbered questions and lettered options (e.g., 1. What is... A) ...)</p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                <FileText size={40} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">{file.name}</h3>
              <p className="text-slate-500 font-medium text-sm mb-8">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              
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
          <p className="text-slate-500 font-medium">The extracted questions are now live in your Question Bank.</p>
        </div>
      )}

        {status === 'review' && (
          <div className="space-y-6">
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
                    <div className="grid grid-cols-2 gap-6 mb-6">
                      <div className="space-y-2 border border-slate-200 rounded-xl p-4 bg-slate-50">
                        <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Column 1</h5>
                        {q.matchColumn1.filter(item => item.trim()).map((item, i) => (
                          <div key={i} className="text-sm font-medium text-slate-700 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                            {item}
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2 border border-slate-200 rounded-xl p-4 bg-slate-50">
                        <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Column 2</h5>
                        {q.matchColumn2.filter(item => item.trim()).map((item, i) => (
                          <div key={i} className="text-sm font-medium text-slate-700 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {q.questionType !== 'Fill in the Blanks' ? (
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
                      <span className="font-bold text-green-800">Numerical Answer: </span>
                      <span className="text-green-700">{q.fillBlankAnswer || 'N/A'}</span>
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

      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">Import Details</h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
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
                <input 
                  type="text" 
                  name="subject" 
                  value={importSettings.subject} 
                  onChange={handleSettingChange}
                  placeholder="Enter Subject..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Topic / Subtopic</label>
                <input 
                  type="text" 
                  name="topic" 
                  value={importSettings.topic} 
                  onChange={handleSettingChange}
                  placeholder="Enter Topic (Optional)..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setShowImportModal(false)}
                className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmApprove}
                disabled={!importSettings.department || !importSettings.year || !importSettings.subject || !importSettings.mark || !importSettings.difficultyLevel}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-sm flex items-center gap-2"
              >
                <Database size={18} /> Confirm Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
