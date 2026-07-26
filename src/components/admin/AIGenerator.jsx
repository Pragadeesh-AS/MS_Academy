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
  const fileInputRef = useRef(null);

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
            
            for (const item of textContent.items) {
              if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
                pageText += '\n';
              } else if (lastY !== null && !pageText.endsWith(' ') && !item.str.startsWith(' ')) {
                pageText += ' ';
              }
              pageText += item.str;
              lastY = item.transform[5];
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
    // Split by Q followed by numbers and parenthesis, e.g., "Q1 ("
    const blocks = text.split(/(?=Q\d+\s*\()/i).filter(b => b.trim().match(/^Q\d+/i));
    
    blocks.forEach(block => {
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
      }
      
      let questionType = 'Single Choice';
      if (qTypeStr.includes('MSQ')) questionType = 'Multiple Choice';
      else if (qTypeStr.includes('NAT')) questionType = 'Fill in the Blanks';
      
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
      
      if (questionType !== 'Fill in the Blanks') {
        const aMatch = beforeConcept.match(/\(A\)\s*(.*?)(?=\(B\)|$)/is);
        const bMatch = beforeConcept.match(/\(B\)\s*(.*?)(?=\(C\)|$)/is);
        const cMatch = beforeConcept.match(/\(C\)\s*(.*?)(?=\(D\)|$)/is);
        const dMatch = beforeConcept.match(/\(D\)\s*(.*?)$/is);
        
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
      qText = qText.replace(/\n/g, '<br/>');
      explanation = explanation.replace(/\n/g, '<br/>');
      
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
        explanation: explanation,
        department: 'GATE',
        subject: 'Mechanics of Materials',
        topic: topic,
        year: new Date().getFullYear().toString(),
        mark: '1 Mark',
        difficultyLevel: qTypeStr.includes('Advanced') ? 'Hard' : 'Medium',
        isImported: true
      });
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

  const handleApprove = async () => {
    setStatus('saving');
    try {
      for (const question of extractedQuestions) {
        await addDoc(collection(db, 'question_bank'), question);
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
              <p className="text-sm text-blue-700 mt-1">We successfully extracted {extractedQuestions.length} questions from <strong>{file.name}</strong>. Please review them before importing.</p>
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
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-md">{q.subject} • {q.topic}</span>
                </div>
                
                <h4 className="text-lg font-bold text-slate-900 mb-4" dangerouslySetInnerHTML={{ __html: q.questionText }}></h4>
                
                {q.questionType !== 'Fill in the Blanks' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                    {['A', 'B', 'C', 'D'].map(opt => (
                      <div key={opt} className={`p-3 rounded-xl border font-medium text-sm flex gap-3 ${(q.questionType === 'Single Choice' && q.correctAnswer === opt) || (q.questionType === 'Multiple Choice' && q.correctAnswers.includes(opt)) ? 'bg-green-50 border-green-200 text-green-800' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                        <span className={`w-6 h-6 rounded flex flex-shrink-0 items-center justify-center font-bold ${(q.questionType === 'Single Choice' && q.correctAnswer === opt) || (q.questionType === 'Multiple Choice' && q.correctAnswers.includes(opt)) ? 'bg-green-200 text-green-800' : 'bg-white border border-slate-300'}`}>
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
    </div>
  );
}
