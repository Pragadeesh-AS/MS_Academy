import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { db, auth } from '../firebase';
import { collection, getDocs, addDoc, query, where, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { FileText, Clock, Award, CheckCircle, XCircle, ArrowRight, ArrowLeft, RefreshCw, AlertTriangle, Eye, ShieldAlert, Lock, HelpCircle, Target } from 'lucide-react';
import GateTestInterface from './student/GateTestInterface';
import logoImg from '../assets/msgate_logo.png';

export default function StudentTests({ department, isPro, purchasedBundles = [], bundles = [] }) {
  const [tests, setTests] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Test States
  const [activeTest, setActiveTest] = useState(null);
  const [testQuestions, setTestQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { qId: answerString }
  const [flagged, setFlagged] = useState([]); // [qId]
  const [timeRemaining, setTimeRemaining] = useState(0); // in seconds
  const [testMode, setTestMode] = useState('list'); // 'list' | 'taking' | 'result'
  const [activeAttempt, setActiveAttempt] = useState(null);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    fetchTestsAndAttempts();
  }, [department]);

  const fetchTestsAndAttempts = async () => {
    setLoading(true);
    try {
      const email = auth.currentUser?.email || sessionStorage.getItem('auth_email') || '';
      if (!email) {
        console.warn('No email found for student');
      }

      // Fetch all tests
      const testsSnapshot = await getDocs(collection(db, 'tests'));
      const allTests = testsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter by department (matching student department or "All Departments")
      const studentTests = allTests.filter(t => 
        t.department === department
      );
      setTests(studentTests);

      if (email) {
        // Fetch student attempts
        const attemptsQuery = query(
          collection(db, 'test_attempts'),
          where('studentEmail', '==', email)
        );
        const attemptsSnapshot = await getDocs(attemptsQuery);
        const allAttempts = attemptsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAttempts(allAttempts);
      }
    } catch (err) {
      console.error("Error fetching tests/attempts:", err);
    } finally {
      setLoading(false);
    }
  };

  const startTest = async (test) => {
    try {
      setLoading(true);
      // Fetch full question details for the list of IDs in this test
      const qSnapshot = await getDocs(collection(db, 'question_bank'));
      const allQuestions = qSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(q => q.status === 'Approved' || !q.status);
      
      const qList = Array.isArray(test.questions) ? test.questions : [];
      const matchedQuestions = qList.map(qId => {
        return allQuestions.find(q => q.id === qId) || {
          id: qId,
          questionText: "Question content not found in database.",
          optionA: "N/A", optionB: "N/A", optionC: "N/A", optionD: "N/A",
          correctAnswer: "A"
        };
      });

      startTimeRef.current = Date.now();
      setTestQuestions(matchedQuestions);
      setActiveTest(test);
      setTestMode('taking');
    } catch (err) {
      console.error("Error loading test questions:", err);
      alert("Failed to start test. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (qId, option) => {
    setSelectedAnswers(prev => ({ ...prev, [qId]: option }));
  };

  const handleClearAnswer = (qId) => {
    setSelectedAnswers(prev => {
      const copy = { ...prev };
      delete copy[qId];
      return copy;
    });
  };

  const handleToggleFlag = (qId) => {
    if (flagged.includes(qId)) {
      setFlagged(prev => prev.filter(id => id !== qId));
    } else {
      setFlagged(prev => [...prev, qId]);
    }
  };

  const submitTestWithConfirmation = () => {
    setShowConfirmSubmit(true);
  };

  const confirmSubmitAction = () => {
    setShowConfirmSubmit(false);
    if (timerRef.current) clearInterval(timerRef.current);
    handleSubmitTest(testQuestions, activeTest, selectedAnswers);
  };

  const handleSubmitTest = async (questionsList, test, answers) => {
    setLoading(true);
    let correctCount = 0;
    
    const timeTakenSeconds = startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0;
    const avgTimePerQuestion = questionsList.length > 0 ? timeTakenSeconds / questionsList.length : 0;
    
    // Evaluate answers
    const evaluation = questionsList.map(q => {
      const studentAns = answers[q.id] || '';
      
      let isCorrect = false;
      if (q.questionType === 'Fill in the Blank') {
        const cleanStudent = studentAns.trim().toLowerCase();
        const cleanCorrect = (q.fillBlankAnswer || '').trim().toLowerCase();
        isCorrect = cleanStudent === cleanCorrect;
      } else {
        isCorrect = studentAns === q.correctAnswer;
      }

      if (isCorrect) correctCount++;
      
      return {
        questionId: q.id,
        selectedAnswer: studentAns,
        isCorrect,
        correctAnswer: q.questionType === 'Fill in the Blank' ? q.fillBlankAnswer : q.correctAnswer,
        timeSpent: avgTimePerQuestion
      };
    });

    const attemptPayload = {
      testId: test.id,
      testTitle: test.title,
      studentEmail: auth.currentUser?.email || sessionStorage.getItem('auth_email') || '',
      studentName: sessionStorage.getItem('auth_name') || 'Student',
      score: correctCount,
      totalQuestions: questionsList.length,
      responses: evaluation,
      submittedAt: serverTimestamp()
    };

    try {
      const docRef = await addDoc(collection(db, 'test_attempts'), attemptPayload);
      const freshAttempt = { id: docRef.id, ...attemptPayload };
      setActiveAttempt(freshAttempt);
      setTestMode('result');
      fetchTestsAndAttempts();
    } catch (err) {
      console.error("Failed to save attempt:", err);
      alert("Test graded but failed to save logs. Score: " + correctCount + "/" + questionsList.length);
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const viewAttemptResult = (testId) => {
    const matchedAttempt = attempts.find(a => a.testId === testId);
    if (matchedAttempt) {
      // Reload questions first
      setLoading(true);
      getDocs(collection(db, 'question_bank')).then((qSnapshot) => {
        const allQuestions = qSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(q => q.status === 'Approved' || !q.status);
        const testObj = tests.find(t => t.id === testId);
        
        const matchedQuestions = testObj.questions.map(qId => {
          return allQuestions.find(q => q.id === qId) || {
            id: qId,
            questionText: "Question details not found.",
            optionA: "N/A", optionB: "N/A", optionC: "N/A", optionD: "N/A",
            correctAnswer: "A"
          };
        });

        setTestQuestions(matchedQuestions);
        setActiveTest(testObj);
        setActiveAttempt(matchedAttempt);
        setTestMode('result');
      }).catch(err => {
        console.error(err);
      }).finally(() => {
        setLoading(false);
      });
    }
  };

  if (testMode === 'taking' && activeTest) {
    return (
      <GateTestInterface 
        test={activeTest}
        testQuestions={testQuestions}
        studentName={sessionStorage.getItem('auth_name') || 'Student'}
        onSubmit={(answers) => handleSubmitTest(testQuestions, activeTest, answers)}
        onCancel={() => setTestMode('list')}
      />
    );
  }

  if (testMode === 'result' && activeAttempt && activeTest) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
        
        {/* Results Banner */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="space-y-2 text-center md:text-left">
            <h2 className="text-2xl font-[900] text-slate-900 leading-tight">{activeTest.title} - Results</h2>
            <p className="text-sm text-slate-500 font-medium">{activeTest.subject} • {activeTest.topic}</p>
            <div className="text-xs text-slate-400 font-semibold mt-1">
              Completed on {activeAttempt.submittedAt?.toDate ? activeAttempt.submittedAt.toDate().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Just now'}
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl">
            <Award className="text-blue-600 shrink-0" size={32} />
            <div>
              <div className="text-[22px] font-[900] text-slate-900 leading-none">{activeAttempt.score} / {activeAttempt.totalQuestions}</div>
              <div className="text-[12px] text-slate-400 font-bold uppercase tracking-wider mt-1">Your Grade</div>
            </div>
            <div className="border-l border-slate-200 h-10 mx-2"></div>
            <div className="text-2xl font-[900] text-blue-600">
              {Math.round((activeAttempt.score / activeAttempt.totalQuestions) * 100)}%
            </div>
          </div>
        </div>

        {/* Detailed Question Review List */}
        {activeTest.solutionsUnlocked ? (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Eye size={20} className="text-blue-500" /> Review Questions
            </h3>

            <div className="space-y-5">
              {testQuestions.map((q, idx) => {
                const studentResp = activeAttempt.responses?.find(r => r.questionId === q.id) || { selectedAnswer: '', isCorrect: false };
                const isCorrect = studentResp.isCorrect;

                return (
                  <div key={q.id} className={`p-6 border rounded-3xl bg-white shadow-sm transition-all ${isCorrect ? 'border-green-100 hover:border-green-200' : 'border-red-100 hover:border-red-200'}`}>
                    
                    {/* Header Row */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                      <span className="px-2.5 py-1 bg-slate-50 text-slate-500 rounded-lg text-xs font-bold">
                        Question {idx + 1}
                      </span>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-[800] flex items-center gap-1.5 ${isCorrect ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        {isCorrect ? (
                          <><CheckCircle size={14} /> Correct</>
                        ) : (
                          <><XCircle size={14} /> Incorrect</>
                        )}
                      </span>
                    </div>

                    {/* Question Text */}
                    <p className="font-bold text-slate-800 leading-relaxed mb-4 whitespace-pre-wrap">{q.questionText}</p>
                    {q.questionImageUrl && (
                      <img src={q.questionImageUrl} alt="Question Graphic" className="max-h-52 object-contain rounded-xl border border-slate-100 p-2 mb-4 bg-slate-50" />
                    )}

                    {/* Options List */}
                    {q.questionType === 'Fill in the Blank' ? (
                      <div className="space-y-3 max-w-md pt-2">
                        <div className="flex items-center justify-between text-sm bg-slate-50 px-4 py-3 rounded-xl border border-slate-150">
                          <span className="font-semibold text-slate-500">Your Answer:</span>
                          <span className={`font-bold font-mono ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>{studentResp.selectedAnswer || '(Blank)'}</span>
                        </div>
                        {!isCorrect && (
                          <div className="flex items-center justify-between text-sm bg-green-50/50 px-4 py-3 rounded-xl border border-green-100">
                            <span className="font-semibold text-green-700">Correct Answer:</span>
                            <span className="font-bold font-mono text-green-600">{q.fillBlankAnswer}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                          {['A', 'B', 'C', 'D'].map((opt) => {
                            const optionText = q[`option${opt}`];
                            if (!optionText) return null;
  
                            const isSelectedByStudent = studentResp.selectedAnswer === opt;
                            const isCorrectOpt = q.correctAnswer === opt;
  
                            let cardClass = 'border-slate-200 bg-white text-slate-600';
                            let badgeClass = 'border-slate-350 text-slate-400';
  
                            if (isCorrectOpt) {
                              cardClass = 'border-green-300 bg-green-50/30 text-green-800';
                              badgeClass = 'bg-green-500 border-green-500 text-white';
                            } else if (isSelectedByStudent && !isCorrectOpt) {
                              cardClass = 'border-red-300 bg-red-50/30 text-red-800';
                              badgeClass = 'bg-red-500 border-red-500 text-white';
                            }
  
                            return (
                              <div key={opt} className={`p-3.5 border rounded-xl flex items-center gap-3 text-xs font-semibold ${cardClass}`}>
                                <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${badgeClass}`}>
                                  {opt}
                                </span>
                                <span className="leading-snug">{optionText}</span>
                              </div>
                            );
                          })}
                        </div>
                        {!isCorrect && q.correctAnswer && (
                          <div className="flex items-center justify-between text-sm bg-green-50/50 px-4 py-3 rounded-xl border border-green-100 mb-4 mt-2">
                            <span className="font-semibold text-green-700">Correct Answer:</span>
                            <span className="font-bold text-green-600">
                              Option {q.correctAnswer} - <span dangerouslySetInnerHTML={{ __html: q[`option${q.correctAnswer}`] || '' }} />
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    {/* Explanation Block */}
                    {q.explanation && (
                      <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-xs leading-relaxed text-slate-600 mt-4">
                        <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                          <AlertTriangle size={14} className="text-orange-500" /> Explanation:
                        </div>
                        <p className="whitespace-pre-wrap font-medium">{q.explanation}</p>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-8 bg-blue-50 border border-blue-100 rounded-3xl p-12 text-center flex flex-col items-center shadow-sm">
            <Lock className="text-blue-500 mb-4" size={48} />
            <h3 className="text-xl font-bold text-slate-800 mb-2">Solutions Locked</h3>
            <p className="text-slate-500 max-w-md font-medium leading-relaxed">
              Your score has been successfully recorded. Detailed solutions and explanations will be unlocked once your teacher reviews and releases them for this test.
            </p>
          </div>
        )}

        {/* Finish Review Button */}
        <div className="flex justify-end pt-4">
          <button 
            onClick={() => { setTestMode('list'); setActiveAttempt(null); setActiveTest(null); }}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md"
          >
            Back to Dashboard
          </button>
        </div>

      </div>
    );
  }


  const canAccessTest = (test) => {
    // 1. Explicitly Free
    if (test.bundleId === 'free') return true;
    
    // Legacy support: Old tests created by Admin without a bundleId were considered free
    if (test.bundleId === undefined && (test.createdBy === 'Admin' || test.createdBy === 'MS Academy Admin')) {
      return true;
    }

    // 2. EXCLUSIVE BUNDLE: If assigned to a specific paid bundle
    if (test.bundleId && test.bundleId !== 'free') {
      return purchasedBundles.includes(test.bundleId);
    }

    // 3. Pro User Fallback
    if (isPro) return true;
    
    // 4. GENERAL TESTS: Check if student purchased ANY bundle for this department with 'tests' permission
    const studentPurchasedDeptBundles = (bundles || []).filter(b => 
      purchasedBundles.includes(b.id) && 
      b.department === test.department &&
      (!b.permissions || b.permissions.includes('tests'))
    );
    
    return studentPurchasedDeptBundles.length > 0;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header section */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-[900] text-slate-900 tracking-tight flex items-center gap-2">
            <Award className="text-blue-600" size={28} />
            Practice Tests
          </h2>
          <p className="text-slate-500 font-medium mt-1">Take practice exams and review your key performance metrics.</p>
        </div>
      </div>

      {/* Tests Board */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-20 text-center flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-semibold">Loading practice tests...</p>
        </div>
      ) : tests.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm text-center p-20 flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6">
            <ShieldAlert size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">No Active Tests</h3>
          <p className="text-slate-500 max-w-md font-medium">There are currently no active practice test modules scheduled for your department ({department}).</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tests.map((test) => {
            const userAttempt = attempts.find(a => a.testId === test.id);
            const isCompleted = !!userAttempt;

            return (
              <div 
                key={test.id} 
                className="group relative bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full"
              >
                {/* Status Badge & Title */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1.5 text-[11px] uppercase tracking-wider font-bold bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                        {test.subject || 'Subject'}
                      </span>
                      {test.topic && (
                        <span className="px-3 py-1.5 text-[11px] font-bold bg-slate-50 text-slate-500 rounded-xl border border-slate-100">
                          {test.topic}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xl font-[900] text-slate-900 leading-tight mt-1 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {test.title}
                    </h4>
                  </div>
                  
                  {isCompleted ? (
                    <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100 shadow-sm text-emerald-600 shrink-0 ml-4">
                       <div className="text-center">
                         <div className="text-[9px] font-black uppercase tracking-wider opacity-60">Score</div>
                         <div className="text-xl font-black leading-none">{userAttempt.score}<span className="text-sm opacity-60">/{userAttempt.totalQuestions}</span></div>
                       </div>
                    </div>
                  ) : (
                    <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100 text-blue-500 shrink-0 ml-4">
                      <FileText size={24} strokeWidth={2.5} />
                    </div>
                  )}
                </div>

                {/* Stats Grid */}
                <div className="mt-auto pt-6 space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2.5 text-slate-500 bg-slate-50 px-3.5 py-2.5 rounded-2xl border border-slate-100">
                      <HelpCircle size={18} className="text-blue-400 shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Questions</span>
                        <span className="text-xs font-bold text-slate-700">{test.questions?.length || 0} Qs</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 text-slate-500 bg-slate-50 px-3.5 py-2.5 rounded-2xl border border-slate-100">
                      <Clock size={18} className="text-amber-400 shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Duration</span>
                        <span className="text-xs font-bold text-slate-700">{test.duration} mins</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 text-slate-500 bg-slate-50 px-3.5 py-2.5 rounded-2xl border border-slate-100 col-span-2">
                      <Target size={18} className="text-emerald-400 shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Score</span>
                        <span className="text-xs font-bold text-slate-700">{test.targetMarks || 100} Marks (1M: {test.total1Mark||0}, 2M: {test.total2Mark||0})</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-2">
                    {!canAccessTest(test) ? (
                      <button 
                        disabled
                        className="w-full py-4 bg-slate-50 text-slate-400 font-bold text-sm rounded-2xl flex items-center justify-center gap-2 cursor-not-allowed border border-slate-200"
                      >
                        <Lock size={18} /> Locked (Pro Required)
                      </button>
                    ) : isCompleted ? (
                      <button 
                        onClick={() => viewAttemptResult(test.id)}
                        className="w-full py-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-sm rounded-2xl transition-all flex items-center justify-center gap-2 shadow-sm border border-emerald-200 hover:border-emerald-300"
                      >
                        Review Results <ArrowRight size={18} />
                      </button>
                    ) : (
                      <button 
                        onClick={() => startTest(test)}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-[800] text-sm rounded-2xl transition-all shadow-[0_4px_14px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] flex items-center justify-center gap-2 hover:-translate-y-0.5"
                      >
                        Start Test Now <ArrowRight size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center font-sans text-black">
          <div className="bg-white rounded-md shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-blue-600 text-white px-4 py-3 font-bold text-lg border-b">Confirm Submission</div>
            <div className="p-6">
              <p className="text-gray-800 text-base mb-2">
                You have answered {Object.keys(selectedAnswers).length} of {testQuestions.length} questions.
              </p>
              <p className="font-bold text-gray-900 mb-6">Are you sure you want to submit and complete the test?</p>
              
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowConfirmSubmit(false)} className="px-4 py-2 border border-gray-300 rounded text-gray-700 font-bold hover:bg-gray-100 transition">Cancel</button>
                <button onClick={confirmSubmitAction} className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 transition">Yes, Submit Exam</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
