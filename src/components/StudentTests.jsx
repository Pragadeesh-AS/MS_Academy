import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { db, auth } from '../firebase';
import { collection, getDocs, addDoc, query, where, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { FileText, Clock, Award, CheckCircle, XCircle, ArrowRight, ArrowLeft, RefreshCw, AlertTriangle, Eye, ShieldAlert, Lock, HelpCircle, Target, MinusCircle, CalendarClock, Flag } from 'lucide-react';
import GateTestInterface from './student/GateTestInterface';
import logoImg from '../assets/msgate_logo.png';
import { RELEASE_MODES, releaseMode, releaseAtMillis, areSolutionsVisible, formatReleaseTime } from '../utils/solutionRelease';
import { gradeAnswer, normalizeQuestion, correctAnswerText } from '../utils/testGrading';
import { canAccessTest as canAccessTestFor } from '../utils/testAccess';
import { sameDepartment } from '../utils/subjects';
import { templateKeyOf, templateFoldersFor, folderName, templateMarks } from '../utils/testTemplates';
import { AVAILABILITY, testAvailability, testStartMillis, testCloseMillis, minutesAvailable, formatTestTime, formatCountdown } from '../utils/testSchedule';
import { loadTestProgress, saveTestProgress, clearTestProgress, inProgressTestIds } from '../utils/testProgress';

import TestLeaderboard from './student/TestLeaderboard';

// The signed-in student (sessionStorage survives a refresh, before Firebase Auth has restored the user)
const currentEmail = () => auth.currentUser?.email || sessionStorage.getItem('auth_email') || '';

// onTestCompleted(testId): after submitting, the student is taken to their Analytics for that test.
// reviewTestId: open that completed test's solution review (asked for from Analytics); onReviewClosed
// takes them back there.
export default function StudentTests({ department, isPro, purchasedBundles = [], bundles = [], onTestCompleted = null, reviewTestId = null, onReviewClosed = null }) {
  const [tests, setTests] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openTemplateFolder, setOpenTemplateFolder] = useState(null); // 'topic' | 'subject' | 'full' | 'other'

  // Active Test States
  const [activeTest, setActiveTest] = useState(null);
  const [testQuestions, setTestQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { qId: answerString }
  const [flagged, setFlagged] = useState([]); // [qId]
  const [timeRemaining, setTimeRemaining] = useState(0); // in seconds
  const [testMode, setTestMode] = useState('list'); // 'list' | 'taking' | 'result'
  const [activeAttempt, setActiveAttempt] = useState(null);
  const [globalQuestionStats, setGlobalQuestionStats] = useState(null);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  // A test started earlier and not submitted (refresh / crash / dropped connection), being resumed
  const [resumeProgress, setResumeProgress] = useState(null);

  // Re-checks a scheduled answer release the moment its time arrives, so a student sitting on the
  // results screen sees the solutions appear without reloading
  const [releaseClock, setReleaseClock] = useState(Date.now());
  useEffect(() => {
    if (releaseMode(activeTest) !== RELEASE_MODES.SCHEDULED) return undefined;
    const at = releaseAtMillis(activeTest);
    if (at === null || at <= Date.now()) return undefined;
    // setTimeout can't wait longer than ~24.8 days; re-arm daily for anything further out
    const wait = Math.min(at - Date.now() + 500, 24 * 60 * 60 * 1000);
    const timer = setTimeout(() => setReleaseClock(Date.now()), wait);
    return () => clearTimeout(timer);
  }, [activeTest, releaseClock]);

  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  // --- Reporting a question from the solution review
  const REPORT_TYPES = ['The correct answer is wrong', 'The question has an error', 'An option is wrong or missing', 'Other'];
  const [reportingQuestion, setReportingQuestion] = useState(null);
  const [reportType, setReportType] = useState(REPORT_TYPES[0]);
  const [reportText, setReportText] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportedIds, setReportedIds] = useState(() => new Set()); // questions this student already reported in this test

  useEffect(() => {
    const email = sessionStorage.getItem('auth_email');
    if (testMode !== 'result' || !activeTest?.id || !email) return;
    getDocs(query(collection(db, 'reported_questions'), where('studentEmail', '==', email), where('testId', '==', activeTest.id)))
      .then(snap => setReportedIds(new Set(snap.docs.map(d => d.data().questionId))))
      .catch(err => console.error('Failed to load your reports', err));
  }, [testMode, activeTest?.id]);

  const submitSolutionReport = async () => {
    const q = reportingQuestion;
    if (!q || reportSubmitting) return;
    if (reportType === 'Other' && !reportText.trim()) return;
    setReportSubmitting(true);
    try {
      const resp = activeAttempt?.responses?.find(r => r.questionId === q.id);
      await addDoc(collection(db, 'reported_questions'), {
        questionId: q.id,
        testId: activeTest.id || 'unknown',
        testTitle: activeTest.title || 'Untitled Test',
        department: activeTest.department || department || 'General',
        studentEmail: sessionStorage.getItem('auth_email') || 'unknown',
        studentName: sessionStorage.getItem('auth_name') || 'Student',
        reason: reportText.trim() ? `${reportType}: ${reportText.trim()}` : reportType,
        reportType,
        source: 'solution-review',
        studentAnswer: resp?.selectedAnswer ?? '',
        keyAnswer: correctAnswerText(q),
        questionText: q.questionText || '',
        teacher: q.teacher || q.typedBy || 'Unknown',
        status: 'pending',
        timestamp: serverTimestamp()
      });
      setReportedIds(prev => new Set([...prev, q.id]));
      setReportingQuestion(null);
      setReportText('');
      setReportType(REPORT_TYPES[0]);
    } catch (err) {
      console.error('Failed to report question', err);
      alert('Could not send the report. Please try again.');
    }
    setReportSubmitting(false);
  };

  // Ticks every second on the test list so "Opens in ..." counts down and a test unlocks the
  // moment its scheduled time arrives, without a reload
  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    if (testMode !== 'list') return undefined;
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [testMode]);

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
      
      // The student's department ("Chemical Engineering (CH)" also matches tests saved as
      // "CHEMICAL ENGINEERING" / "Chemical Engineering")
      const studentTests = allTests.filter(t => sameDepartment(t.department, department));
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
        allAttempts.forEach(a => clearTestProgress(email, a.testId));
      }
    } catch (err) {
      console.error("Error fetching tests/attempts:", err);
    } finally {
      setLoading(false);
    }
  };

  const startTest = async (test) => {
    // Already started on this device: resume it, even if the test has closed since
    const saved = loadTestProgress(currentEmail(), test.id);
    let timedTest = test;
    if (!saved) {
      // Re-checked at the click - the list may have been open since before the test opened/closed
      const availability = testAvailability(test);
      if (availability === AVAILABILITY.UPCOMING) {
        alert(`This test opens on ${formatTestTime(testStartMillis(test))}.`);
        return;
      }
      const minutesLeft = minutesAvailable(test);
      if (availability === AVAILABILITY.CLOSED || minutesLeft <= 0) {
        alert('This test has closed and can no longer be started.');
        return;
      }
      // Starting close to the closing time: the timer only runs until the test closes
      if (minutesLeft < (parseInt(test.duration) || 0)) timedTest = { ...test, duration: minutesLeft };
    }
    try {
      setLoading(true);
      // Fetch full question details for the list of IDs in this test
      const qSnapshot = await getDocs(collection(db, 'question_bank'));
      const allQuestions = qSnapshot.docs.map(doc => normalizeQuestion({ id: doc.id, ...doc.data() })).filter(q => q.status === 'Approved' || !q.status);
      
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
      setActiveTest(timedTest);
      if (saved && saved.deadline <= Date.now()) {
        // Time ran out while the student was away - submit what they had saved
        alert('Time ran out for this test while you were away. Your saved answers will now be submitted.');
        startTimeRef.current = saved.startedAt;
        await handleSubmitTest(matchedQuestions, timedTest, saved.answers, {
          timeSpent: saved.timeSpent,
          order: saved.order,
          timeTakenSeconds: Math.round((saved.deadline - saved.startedAt) / 1000)
        });
        return;
      }
      startTimeRef.current = saved ? saved.startedAt : Date.now();
      setResumeProgress(saved);
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

  // meta (from the exam screen): { timeSpent: { questionId: seconds }, order: [questionId in exam order] }
  const handleSubmitTest = async (questionsList, test, answers, meta = {}) => {
    setLoading(true);
    let correctCount = 0;
    let totalScore = 0;
    let totalMarks = 0;

    const timeTakenSeconds = meta.timeTakenSeconds ?? (startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0);
    const avgTimePerQuestion = questionsList.length > 0 ? timeTakenSeconds / questionsList.length : 0;
    // Report questions in the order the student saw them (aptitude section first, etc.)
    if (Array.isArray(meta.order) && meta.order.length) {
      const pos = new Map(meta.order.map((id, i) => [id, i]));
      questionsList = [...questionsList].sort((a, b) => (pos.get(a.id) ?? 1e9) - (pos.get(b.id) ?? 1e9));
    }
    const hasRealTimes = !!meta.timeSpent && Object.keys(meta.timeSpent).length > 0;

    // Evaluate answers - the same marking the answer-key re-grade uses (utils/testGrading).
    // Skipped questions never lose marks - only an attempted-but-wrong answer does.
      const evaluation = questionsList.map(q => {
        const graded = gradeAnswer(q, answers[q.id]);

        totalMarks += graded.maxMarks;
        totalScore += graded.marksAwarded;
        if (graded.isCorrect) correctCount++;

        return {
          questionId: q.id,
          selectedAnswer: graded.selectedAnswer,
          isAnswered: graded.isAnswered,
          isCorrect: graded.isCorrect,
          marksAwarded: graded.marksAwarded,
          correctAnswer: graded.correctAnswer,
          // Real seconds on this question (older exam screens only gave the average)
          timeSpent: hasRealTimes ? (meta.timeSpent[q.id] || 0) : avgTimePerQuestion
        };
      });

    const attemptPayload = {
      testId: test.id,
      testTitle: test.title,
      studentEmail: auth.currentUser?.email || sessionStorage.getItem('auth_email') || '',
      studentName: sessionStorage.getItem('auth_name') || 'Student',
      score: Math.round(totalScore * 100) / 100,
      totalMarks,
      correctCount,
      totalQuestions: questionsList.length,
      timeTakenSeconds,
      responses: evaluation,
      submittedAt: serverTimestamp()
    };

    try {
      const docRef = await addDoc(collection(db, 'test_attempts'), attemptPayload);
      // Saved for good - the in-progress copy is no longer needed. (If saving failed it stays, so
      // the student can reopen the test and submit again.)
      clearTestProgress(attemptPayload.studentEmail, test.id);
      setResumeProgress(null);
      const freshAttempt = { id: docRef.id, ...attemptPayload };
      fetchTestsAndAttempts();
      if (onTestCompleted) {
        setTestMode('list');
        setActiveAttempt(null);
        setActiveTest(null);
        onTestCompleted(test.id);
      } else {
        setActiveAttempt(freshAttempt);
        setTestMode('result');
      }
    } catch (err) {
      console.error("Failed to save attempt:", err);
      alert("Test graded but failed to save logs. Score: " + attemptPayload.score + "/" + totalMarks);
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const fetchGlobalQuestionStats = (tId) => {
    getDocs(query(collection(db, 'test_attempts'), where('testId', '==', tId))).then(snap => {
      const stats = {};
      snap.docs.forEach(doc => {
        const data = doc.data();
        if (data.responses && Array.isArray(data.responses)) {
          data.responses.forEach(r => {
            const qId = r.questionId;
            if (!stats[qId]) stats[qId] = { total: 0, correct: 0, wrong: 0, unattempted: 0 };
            stats[qId].total++;
            
            let isCorrect = false;
            let hasAnswer = Array.isArray(r.selectedAnswer) ? r.selectedAnswer.length > 0 : !!String(r.selectedAnswer || '').trim();
            
            if (r.isCorrect !== undefined) isCorrect = r.isCorrect;
            else {
              const sel = Array.isArray(r.selectedAnswer) ? r.selectedAnswer.slice().sort().join(',') : String(r.selectedAnswer || '').trim().toLowerCase();
              const cor = Array.isArray(r.correctAnswer) ? r.correctAnswer.slice().sort().join(',') : String(r.correctAnswer || '').trim().toLowerCase();
              isCorrect = (sel === cor) && sel !== '';
            }

            if (!hasAnswer) stats[qId].unattempted++;
            else if (isCorrect) stats[qId].correct++;
            else stats[qId].wrong++;
          });
        }
      });
      setGlobalQuestionStats(stats);
    }).catch(err => {
      console.error("Error fetching global question stats:", err);
      setGlobalQuestionStats({});
    });
  };

  const viewAttemptResult = (testId) => {
    const matchedAttempt = attempts.find(a => a.testId === testId);
    if (matchedAttempt) {
      // Reload questions first
      setLoading(true);
      getDocs(collection(db, 'question_bank')).then((qSnapshot) => {
        const allQuestions = qSnapshot.docs.map(doc => normalizeQuestion({ id: doc.id, ...doc.data() })).filter(q => q.status === 'Approved' || !q.status);
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
        fetchGlobalQuestionStats(testId);
      }).catch(err => {
        console.error(err);
      }).finally(() => {
        setLoading(false);
      });
    }
  };

  // Analytics asked to review a finished test's solutions: open it once tests + attempts are in
  const openedReviewRef = useRef(null);
  useEffect(() => {
    if (!reviewTestId) { openedReviewRef.current = null; return; }
    if (loading || openedReviewRef.current === reviewTestId) return;
    if (!tests.some(t => t.id === reviewTestId) || !attempts.some(a => a.testId === reviewTestId)) return;
    openedReviewRef.current = reviewTestId;
    viewAttemptResult(reviewTestId);
  }, [reviewTestId, loading, tests, attempts]);

  // A test left unfinished (the student refreshed or the tab crashed mid-test) reopens on its own
  const autoResumedRef = useRef(false);
  useEffect(() => {
    if (autoResumedRef.current || loading || testMode !== 'list' || reviewTestId) return;
    autoResumedRef.current = true;
    const unfinished = new Set(inProgressTestIds(currentEmail()));
    const test = tests.find(t => unfinished.has(t.id) && !attempts.some(a => a.testId === t.id));
    if (test) startTest(test);
  }, [loading, testMode, reviewTestId, tests, attempts]); // eslint-disable-line react-hooks/exhaustive-deps

  if (testMode === 'taking' && activeTest) {
    return (
      <GateTestInterface 
        test={activeTest}
        testQuestions={testQuestions}
        studentName={sessionStorage.getItem('auth_name') || 'Student'}
        onSubmit={(answers, meta) => handleSubmitTest(testQuestions, activeTest, answers, meta)}
        onCancel={() => setTestMode('list')}
        savedProgress={resumeProgress}
        onProgress={(progress) => saveTestProgress(currentEmail(), activeTest.id, progress)}
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
              <div className="text-[22px] font-[900] text-slate-900 leading-none">{activeAttempt.score} / {activeAttempt.totalMarks ?? activeAttempt.totalQuestions} marks</div>
              <div className="text-[12px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                {activeAttempt.correctCount ?? '?'} / {activeAttempt.totalQuestions} Correct
              </div>
            </div>
            <div className="border-l border-slate-200 h-10 mx-2"></div>
            <div className="text-2xl font-[900] text-blue-600">
              {Math.round((activeAttempt.score / (activeAttempt.totalMarks || activeAttempt.totalQuestions || 1)) * 100)}%
            </div>
          </div>
        </div>

        {/* Student Leaderboard */}
        <TestLeaderboard testId={activeTest.id} currentStudentEmail={sessionStorage.getItem('auth_email')} />

        {/* Detailed Question Review List */}
        {areSolutionsVisible(activeTest, releaseClock) ? (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Eye size={20} className="text-blue-500" /> Review Questions
            </h3>

            <div className="space-y-5">
              {testQuestions.map((q, idx) => {
                const studentResp = activeAttempt.responses?.find(r => r.questionId === q.id) || { selectedAnswer: '', isCorrect: false, isAnswered: false };
                let isCorrect = false;
                if (studentResp.isCorrect !== undefined) {
                  isCorrect = studentResp.isCorrect;
                } else {
                  const sel = Array.isArray(studentResp.selectedAnswer) ? studentResp.selectedAnswer.slice().sort().join(',') : String(studentResp.selectedAnswer || '').trim().toLowerCase();
                  const cor = Array.isArray(studentResp.correctAnswer) ? studentResp.correctAnswer.slice().sort().join(',') : String(studentResp.correctAnswer || '').trim().toLowerCase();
                  isCorrect = (sel === cor) && sel !== '';
                }
                // Older attempts have no isAnswered flag - fall back to whether an answer was recorded
                const noAnswer = Array.isArray(studentResp.selectedAnswer) ? studentResp.selectedAnswer.length === 0 : !String(studentResp.selectedAnswer ?? '').trim();
                const unattempted = studentResp.isAnswered === false || (studentResp.isAnswered === undefined && noAnswer);
                const cardBorder = unattempted ? 'border-slate-200 hover:border-slate-300' : isCorrect ? 'border-green-100 hover:border-green-200' : 'border-red-100 hover:border-red-200';
                const badgeStyle = unattempted ? 'bg-slate-100 text-slate-500' : isCorrect ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600';

                return (
                  <div key={q.id} className={`p-6 border rounded-3xl bg-white shadow-sm transition-all ${cardBorder}`}>

                    {/* Header Row */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                      <span className="px-2.5 py-1 bg-slate-50 text-slate-500 rounded-lg text-xs font-bold flex items-center gap-1.5">
                        <span>Question {idx + 1}</span>
                        {typeof studentResp.marksAwarded === 'number' && (
                          <span className={`ml-2 font-mono ${studentResp.marksAwarded > 0 ? 'text-green-600' : studentResp.marksAwarded < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                            ({studentResp.marksAwarded > 0 ? '+' : ''}{studentResp.marksAwarded})
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-100/50 border border-blue-200 px-2 py-1 rounded-md uppercase">{q.questionType === 'Multiple Select' ? 'MSQ' : (q.questionType === 'Fill in Blanks' || q.questionType === 'Numerical Answer Type') ? 'NAT' : q.questionType === 'Match' ? 'MATCH' : 'MCQ'}</span>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-[800] flex items-center gap-1.5 ${badgeStyle}`}>
                          {unattempted ? (
                            <><MinusCircle size={14} /> Unattempted</>
                          ) : isCorrect ? (
                            <><CheckCircle size={14} /> Correct</>
                          ) : (
                            <><XCircle size={14} /> Incorrect</>
                          )}
                        </span>
                        {reportedIds.has(q.id) ? (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-[800] flex items-center gap-1.5 bg-amber-50 text-amber-600 border border-amber-100">
                            <Flag size={13} /> Reported
                          </span>
                        ) : (
                          <button
                            onClick={() => { setReportingQuestion(q); setReportType(REPORT_TYPES[0]); setReportText(''); }}
                            className="px-2.5 py-1 rounded-lg text-xs font-[800] flex items-center gap-1.5 text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 transition-colors"
                            title="Report a problem with this question or its answer"
                          >
                            <Flag size={13} /> Report
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Answer key was corrected after this attempt - it has been re-marked */}
                    {studentResp.regradedAt && (
                      <div className="mb-4 flex items-start gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-[12.5px] font-semibold text-indigo-800">
                        <RefreshCw size={14} className="mt-0.5 shrink-0" />
                        <span>
                          The answer key for this question was corrected and your answer was re-marked
                          {typeof studentResp.previousMarks === 'number' ? ` (${studentResp.previousMarks > 0 ? '+' : ''}${studentResp.previousMarks} → ${studentResp.marksAwarded > 0 ? '+' : ''}${studentResp.marksAwarded})` : ''}.
                        </span>
                      </div>
                    )}

                    {/* Question Text */}
                    <p className="font-bold text-slate-800 leading-relaxed mb-4" dangerouslySetInnerHTML={{ __html: q.questionText || '' }} />
                    {q.questionImageUrl && (
                      <img src={q.questionImageUrl} alt="Question Graphic" className="max-h-52 object-contain rounded-xl border border-slate-100 p-2 mb-4 bg-slate-50" />
                    )}

                    {/* Match Columns */}
                    {q.questionType === 'Match' && (q.matchColumn1 || q.matchColumn2) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                          <div className="bg-slate-50 text-xs font-bold text-slate-600 px-3 py-2 border-b border-slate-200">List I</div>
                          <div className="divide-y divide-slate-100">
                            {(q.matchColumn1 || []).filter(item => item && item.trim()).map((item, i) => (
                              <div key={i} className="flex gap-2 px-3 py-2 text-sm text-slate-700">
                                <span className="font-bold shrink-0">{String.fromCharCode(80 + i)}.</span>
                                <span dangerouslySetInnerHTML={{ __html: item }} />
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                          <div className="bg-slate-50 text-xs font-bold text-slate-600 px-3 py-2 border-b border-slate-200">List II</div>
                          <div className="divide-y divide-slate-100">
                            {(q.matchColumn2 || []).filter(item => item && item.trim()).map((item, i) => (
                              <div key={i} className="flex gap-2 px-3 py-2 text-sm text-slate-700">
                                <span className="font-bold shrink-0">{i + 1}.</span>
                                <span dangerouslySetInnerHTML={{ __html: item }} />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Options List */}
                    {q.questionType === 'Fill in Blanks' ? (
                      <div className="space-y-3 max-w-md pt-2">
                        <div className="flex items-center justify-between text-sm bg-slate-50 px-4 py-3 rounded-xl border border-slate-150">
                          <span className="font-semibold text-slate-500">Your Answer:</span>
                          <span className={`font-bold font-mono ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>{studentResp.selectedAnswer || '(Blank)'}</span>
                        </div>
                        {!isCorrect && (
                          <div className="flex items-center justify-between text-sm bg-green-50/50 px-4 py-3 rounded-xl border border-green-100">
                            <span className="font-semibold text-green-700">Correct Answer:</span>
                            <span className="font-bold font-mono text-green-600">{correctAnswerText(q)}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                          {['A', 'B', 'C', 'D'].map((opt) => {
                            const optionText = q[`option${opt}`];
                            if (!optionText) return null;
  
                            const isSelectedByStudent = Array.isArray(studentResp.selectedAnswer)
                              ? studentResp.selectedAnswer.includes(opt)
                              : studentResp.selectedAnswer === opt;
                            const isCorrectOpt = q.questionType === 'Multiple Choice'
                              ? (q.correctAnswers || []).includes(opt)
                              : q.correctAnswer === opt;
  
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
                                <span className="leading-snug" dangerouslySetInnerHTML={{ __html: optionText }} />
                              </div>
                            );
                          })}
                        </div>
                        {!isCorrect && q.questionType === 'Multiple Choice' && (q.correctAnswers || []).length > 0 && (
                          <div className="flex flex-col gap-2 text-sm bg-green-50/50 px-4 py-3 rounded-xl border border-green-100 mb-4 mt-2">
                            <span className="font-semibold text-green-700">Correct Answer{q.correctAnswers.length > 1 ? 's' : ''}:</span>
                            {q.correctAnswers.map(opt => (
                              <span key={opt} className="font-bold text-green-600">
                                Option {opt} - <span dangerouslySetInnerHTML={{ __html: q[`option${opt}`] || '' }} />
                              </span>
                            ))}
                          </div>
                        )}
                        {!isCorrect && q.questionType !== 'Multiple Choice' && q.correctAnswer && (
                          <div className="flex items-center justify-between text-sm bg-green-50/50 px-4 py-3 rounded-xl border border-green-100 mb-4 mt-2">
                            <span className="font-semibold text-green-700">Correct Answer:</span>
                            <span className="font-bold text-green-600">
                              Option {q.correctAnswer} - <span dangerouslySetInnerHTML={{ __html: q[`option${q.correctAnswer}`] || '' }} />
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    {/* Global Question Stats */}
                    {globalQuestionStats && globalQuestionStats[q.id] && globalQuestionStats[q.id].total > 0 && (
                      <div className="mt-5 border-t border-slate-100 pt-5">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs mb-3">
                          <Target size={14} className="text-blue-500" /> Class Performance for this Question
                        </div>
                        <div className="grid grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <div>
                            <div className="text-xl font-[900] text-slate-700">{globalQuestionStats[q.id].total}</div>
                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Attempts</div>
                          </div>
                          <div>
                            <div className="text-xl font-[900] text-emerald-600">{Math.round((globalQuestionStats[q.id].correct / globalQuestionStats[q.id].total) * 100)}%</div>
                            <div className="text-[9px] font-bold text-emerald-500/70 uppercase tracking-wider">Correct ({globalQuestionStats[q.id].correct})</div>
                          </div>
                          <div>
                            <div className="text-xl font-[900] text-red-500">{Math.round((globalQuestionStats[q.id].wrong / globalQuestionStats[q.id].total) * 100)}%</div>
                            <div className="text-[9px] font-bold text-red-400/70 uppercase tracking-wider">Wrong ({globalQuestionStats[q.id].wrong})</div>
                          </div>
                          <div>
                            <div className="text-xl font-[900] text-slate-400">{Math.round((globalQuestionStats[q.id].unattempted / globalQuestionStats[q.id].total) * 100)}%</div>
                            <div className="text-[9px] font-bold text-slate-400/70 uppercase tracking-wider">Unattempted ({globalQuestionStats[q.id].unattempted})</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Explanation Block */}
                    {q.explanation && (
                      <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-xs leading-relaxed text-slate-600 mt-4">
                        <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                          <AlertTriangle size={14} className="text-orange-500" /> Explanation:
                        </div>
                        <p className="font-medium" dangerouslySetInnerHTML={{ __html: q.explanation }} />
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
              {releaseMode(activeTest) === RELEASE_MODES.SCHEDULED && releaseAtMillis(activeTest) !== null
                ? <>Your score has been successfully recorded. Detailed solutions and explanations will be released on <strong className="text-slate-700">{formatReleaseTime(releaseAtMillis(activeTest))}</strong>, and you'll get an email when they're available.</>
                : 'Your score has been successfully recorded. Detailed solutions and explanations will be unlocked once your teacher reviews and releases them for this test.'}
            </p>
          </div>
        )}

        {/* Report a question from the solutions */}
        {reportingQuestion && (
          <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" onClick={() => !reportSubmitting && setReportingQuestion(null)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="bg-red-600 text-white px-5 py-3.5 font-bold text-lg flex items-center gap-2">
                <Flag size={18} /> Report Question {testQuestions.findIndex(x => x.id === reportingQuestion.id) + 1}
              </div>
              <div className="p-5 space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-bold text-slate-700">What's wrong?</p>
                  {REPORT_TYPES.map(t => (
                    <label key={t} className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border cursor-pointer text-sm font-semibold transition-colors ${reportType === t ? 'border-red-300 bg-red-50 text-red-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                      <input type="radio" name="reportType" checked={reportType === t} onChange={() => setReportType(t)} className="accent-red-600" />
                      {t}
                    </label>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <p className="text-sm font-bold text-slate-700">Details {reportType === 'Other' ? '' : <span className="text-slate-400 font-semibold">(optional)</span>}</p>
                  <textarea
                    value={reportText}
                    onChange={e => setReportText(e.target.value)}
                    placeholder={reportType === 'The correct answer is wrong' ? 'e.g. The answer should be option C because...' : 'Describe the problem...'}
                    className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[100px]"
                    disabled={reportSubmitting}
                  />
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Your teacher will review it. If the answer key is corrected, every attempt of this test is re-marked automatically.
                </p>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setReportingQuestion(null)} disabled={reportSubmitting} className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-100 transition">Cancel</button>
                  <button
                    onClick={submitSolutionReport}
                    disabled={reportSubmitting || (reportType === 'Other' && !reportText.trim())}
                    className="px-4 py-2 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition disabled:opacity-50"
                  >
                    {reportSubmitting ? 'Sending...' : 'Send Report'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Finish Review Button */}
        <div className="flex justify-end pt-4">
          <button 
            onClick={() => { setTestMode('list'); setActiveAttempt(null); setActiveTest(null); onReviewClosed?.(); }}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md"
          >
            {onReviewClosed ? 'Back to Analytics' : 'Back to Dashboard'}
          </button>
        </div>

      </div>
    );
  }


  const canAccessTest = (test) => canAccessTestFor(test, { isPro, purchasedBundles, bundles });

  const isTestCompleted = (test) => attempts.some(a => a.testId === test.id);
  // Open tests first, then upcoming ones soonest-first, then closed ones
  const availabilityRank = { [AVAILABILITY.OPEN]: 0, [AVAILABILITY.UPCOMING]: 1, [AVAILABILITY.CLOSED]: 2 };
  const pendingTests = tests.filter(t => !isTestCompleted(t)).sort((a, b) =>
    availabilityRank[testAvailability(a, nowTick)] - availabilityRank[testAvailability(b, nowTick)]
    || (testStartMillis(a) ?? 0) - (testStartMillis(b) ?? 0));
  // Finished tests aren't listed here - their results are in the student's Analytics.
  // They're grouped into one folder per test template (Topic / Subject / Full Length).
  const studentFolders = templateFoldersFor(pendingTests);
  const visibleTests = openTemplateFolder ? pendingTests.filter(t => templateKeyOf(t) === openTemplateFolder) : pendingTests;
  const unfinishedTestIds = new Set(inProgressTestIds(currentEmail()));


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
        <>
        {openTemplateFolder && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpenTemplateFolder(null)}
              className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 bg-white transition-colors"
              title="Back to folders"
            >
              <ArrowLeft size={18} />
            </button>
            <h3 className="text-lg font-[900] text-slate-800">{folderName(openTemplateFolder)}</h3>
          </div>
        )}
        {!openTemplateFolder ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {studentFolders.map(folder => {
              const openNow = pendingTests.filter(t => templateKeyOf(t) === folder.key && testAvailability(t, nowTick) === AVAILABILITY.OPEN).length;
              return (
                <button
                  key={folder.key}
                  onClick={() => setOpenTemplateFolder(folder.key)}
                  className="text-left bg-white rounded-2xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-lg transition-all duration-200 group flex items-center gap-4"
                >
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors">
                    <FileText size={22} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-[800] text-[15px] text-slate-800 truncate">{folder.name}</h3>
                    <p className="text-[13px] font-semibold text-slate-400">
                      {folder.count} {folder.count === 1 ? 'test' : 'tests'} to take{openNow ? ` · ${openNow} open now` : ''}
                    </p>
                    {folder.template && (
                      <p className="text-[11px] font-semibold text-slate-400">{folder.template.duration} mins · {templateMarks(folder.template)} marks</p>
                    )}
                  </div>
                  <ArrowRight size={16} className="ml-auto text-slate-300 group-hover:text-blue-500 shrink-0" />
                </button>
              );
            })}
          </div>
        ) : visibleTests.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm text-center p-16 flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-6">
              <Award size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              All Caught Up!
            </h3>
            <p className="text-slate-500 max-w-md font-medium">
              You have completed every available practice test. See your results in Analytics.
            </p>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {visibleTests.map((test) => {
            const userAttempt = attempts.find(a => a.testId === test.id);
            const isCompleted = !!userAttempt;
            const isUnfinished = !isCompleted && unfinishedTestIds.has(test.id);
            const availability = testAvailability(test, nowTick);
            const startMs = testStartMillis(test);
            const closeMs = testCloseMillis(test);

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
                    {startMs !== null && (
                      <div className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border col-span-2 ${availability === AVAILABILITY.UPCOMING ? 'bg-indigo-50 border-indigo-100' : availability === AVAILABILITY.CLOSED ? 'bg-slate-50 border-slate-100' : 'bg-emerald-50 border-emerald-100'}`}>
                        <CalendarClock size={18} className={`shrink-0 ${availability === AVAILABILITY.UPCOMING ? 'text-indigo-500' : availability === AVAILABILITY.CLOSED ? 'text-slate-400' : 'text-emerald-500'}`} />
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {availability === AVAILABILITY.UPCOMING ? 'Scheduled' : availability === AVAILABILITY.CLOSED ? 'Closed' : 'Open now'}
                          </span>
                          <span className="text-xs font-bold text-slate-700">
                            {formatTestTime(startMs)}{closeMs !== null ? ` - closes ${formatTestTime(closeMs)}` : ''}
                          </span>
                        </div>
                      </div>
                    )}
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
                    ) : isUnfinished ? (
                      <button
                        onClick={() => startTest(test)}
                        className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white font-[800] text-sm rounded-2xl transition-all shadow-[0_4px_14px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2 hover:-translate-y-0.5"
                      >
                        Resume Test <ArrowRight size={18} />
                      </button>
                    ) : !isCompleted && availability === AVAILABILITY.UPCOMING ? (
                      <button
                        disabled
                        className="w-full py-4 bg-indigo-50 text-indigo-600 font-bold text-sm rounded-2xl flex items-center justify-center gap-2 cursor-not-allowed border border-indigo-100 tabular-nums"
                      >
                        <Lock size={18} /> Opens in {formatCountdown(startMs - nowTick)}
                      </button>
                    ) : !isCompleted && availability === AVAILABILITY.CLOSED ? (
                      <button
                        disabled
                        className="w-full py-4 bg-slate-50 text-slate-400 font-bold text-sm rounded-2xl flex items-center justify-center gap-2 cursor-not-allowed border border-slate-200"
                      >
                        <Lock size={18} /> Test Closed
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
        </>
      )}

      {/* Custom Confirmation Modal */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center font-sans text-black p-4">
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





