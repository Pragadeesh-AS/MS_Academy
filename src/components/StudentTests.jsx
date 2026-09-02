import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { db, auth } from '../firebase';
import { collection, getDocs, addDoc, query, where, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { FileText, Clock, Award, CheckCircle, XCircle, ArrowRight, ArrowLeft, RefreshCw, AlertTriangle, Eye, ShieldAlert, Lock } from 'lucide-react';
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

  useEffect(() => {
    fetchTestsAndAttempts();
  }, [department]);

  const fetchTestsAndAttempts = async () => {
    setLoading(true);
    try {
      const email = auth.currentUser?.email || localStorage.getItem('auth_email') || '';
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
        correctAnswer: q.questionType === 'Fill in the Blank' ? q.fillBlankAnswer : q.correctAnswer
      };
    });

    const attemptPayload = {
      testId: test.id,
      testTitle: test.title,
      studentEmail: auth.currentUser?.email || localStorage.getItem('auth_email') || '',
      studentName: localStorage.getItem('auth_name') || 'Student',
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
        studentName={localStorage.getItem('auth_name') || 'Student'}
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
                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-56 border-l-4 border-l-blue-600"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-1 text-xs font-bold bg-slate-100 text-slate-600 rounded-lg">
                      {test.subject}
                    </span>
                    
                    {isCompleted ? (
                      <span className="px-2.5 py-1 text-xs font-[800] bg-green-50 text-green-600 rounded-lg flex items-center gap-1">
                        <CheckCircle size={12} /> Score: {userAttempt.score}/{userAttempt.totalQuestions}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 text-xs font-[800] bg-blue-50 text-blue-600 rounded-lg flex items-center gap-1">
                        <Clock size={12} /> Active
                      </span>
                    )}
                  </div>

                  <h4 className="text-[17px] font-[900] text-slate-900 leading-tight mb-2">{test.title}</h4>
                  <p className="text-xs text-slate-400 font-semibold mb-3">Topic: {test.topic}</p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-150 pt-4 mt-2">
                  <div className="text-[12px] font-semibold text-slate-400 flex flex-col">
                    <span>Questions: {test.questions?.length || 0} ({test.total1Mark || 0} × 1M + {test.total2Mark || 0} × 2M)</span>
                    <span className="mt-0.5">Duration: {test.duration} mins • Target: {test.targetMarks || 100} Marks</span>
                  </div>

                  {!canAccessTest(test) ? (
                    <button 
                      disabled
                      className="px-4 py-2 bg-amber-50 text-amber-600 font-bold text-xs rounded-xl flex items-center gap-1.5 opacity-80 cursor-not-allowed border border-amber-200"
                    >
                      <Lock size={14} /> Locked (Pro)
                    </button>
                  ) : isCompleted ? (
                    <button 
                      onClick={() => viewAttemptResult(test.id)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                    >
                      Review Test <Eye size={14} />
                    </button>
                  ) : (
                    <button 
                      onClick={() => startTest(test)}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center gap-1.5"
                    >
                      Start Test <ArrowRight size={14} />
                    </button>
                  )}
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
