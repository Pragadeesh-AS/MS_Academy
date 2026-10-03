import React, { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, Users, Award, Search, Clock, CheckCircle2, XCircle, AlertCircle, ChevronRight, MinusCircle, UserCircle2, Globe2, Filter, ArrowLeft, Target, Folder, FolderOpen, FileText, Download, FileSpreadsheet } from 'lucide-react';
import { exportTestReportCsv, exportTestReportPdf } from '../../utils/testReportExport';
import { findMsqNatNegativeFixes, applyMsqNatNegativeFixes } from '../../utils/regradeAttempts';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';

import { db } from '../../firebase';
import { areSolutionsVisible } from '../../utils/solutionRelease';
import { positiveMarkFor, negativeMarkFor } from '../../utils/marking';
import TestReport from '../analytics/TestReport';
import { collection, getDocs, query, where, doc, getDoc, setDoc } from 'firebase/firestore';

// Helper
const formatTime = (seconds) => {
  if (!seconds) return '0m 0s';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
};

export default function Analytics({ joinedStudents = [], department = null, studentViewOnlyEmail = null, studentViewOnlyName = null, openTestId = null, onOpenedTest = null, onReviewSolutions = null }) {
  const [activeInnerTab, setActiveInnerTab] = useState('global'); // 'global' or 'student'
  
  // Drill-down states for Global
  const [detailedGlobalTestId, setDetailedGlobalTestId] = useState(null);
  const [globalTestTab, setGlobalTestTab] = useState('overview'); // 'overview' | 'questions'
  
  // Drill-down states for Student
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentName, setSelectedStudentName] = useState(null);
  const [detailedTestId, setDetailedTestId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All'); 
  const [expandedFolders, setExpandedFolders] = useState({});
  const toggleFolder = (folder) => setExpandedFolders(prev => ({ ...prev, [folder]: !prev[folder] }));
  
  // Enforce student view
  useEffect(() => {
    if (studentViewOnlyEmail && studentViewOnlyName) {
      setActiveInnerTab('student');
      setSelectedStudentName(studentViewOnlyName);
    }
  }, [studentViewOnlyEmail, studentViewOnlyName]);

  const [isLoading, setIsLoading] = React.useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [realTests, setRealTests] = React.useState([]);
  const [computedTestAnalytics, setComputedTestAnalytics] = React.useState({});
  const [computedStudentHistory, setComputedStudentHistory] = React.useState({});

  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        let testsQuery = collection(db, 'tests');
        if (department) {
          testsQuery = query(collection(db, 'tests'), where('department', '==', department));
        }
        
        let attemptsQuery = collection(db, 'test_attempts');
        if (studentViewOnlyEmail) {
          attemptsQuery = query(collection(db, 'test_attempts'), where('studentEmail', '==', studentViewOnlyEmail));
        }

        const [testsSnap, attemptsSnap, questionsSnap] = await Promise.all([
          getDocs(testsQuery),
          getDocs(attemptsQuery),
          getDocs(collection(db, 'question_bank'))
        ]);

        const fetchedTests = testsSnap.docs.map(d => ({ ...d.data(), id: d.id }));
        const fetchedAttempts = attemptsSnap.docs.map(d => ({ ...d.data(), id: d.id }));
        const questionsMap = {};
        questionsSnap.docs.forEach(d => { questionsMap[d.id] = { id: d.id, ...d.data() }; });
        
        // Allowed emails for this department/global view
        let validEmails = null;
        if (department && joinedStudents) {
           const departmentStudents = joinedStudents.filter(s => s.department?.toLowerCase() === department.toLowerCase());
           validEmails = departmentStudents.map(s => s.email?.toLowerCase()).filter(Boolean);
        }

        const tAnalytics = {};
        const sHistory = {};

        fetchedTests.forEach(test => {
          tAnalytics[test.id] = {
            id: test.id,
            title: test.title || 'Untitled Test',
            category: test.subject || test.department || 'General',
            department: test.department || 'General',
            subject: test.subject || 'General',
            date: test.createdAt ? new Date(test.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown Date',
            avgScore: 0,
            highestScore: 0,
            participants: 0,
            avgTime: '0m 0s',
            distribution: [
              { range: '0-20%', count: 0 }, { range: '21-40%', count: 0 },
              { range: '41-60%', count: 0 }, { range: '61-80%', count: 0 }, { range: '81-100%', count: 0 },
            ],
            students: [],
            _totalScore: 0,
            _totalTime: 0,
            _targetMarks: test.targetMarks || 100,
          };
        });

        fetchedAttempts.forEach(attempt => {
          if (!tAnalytics[attempt.testId]) return;
          
          if (validEmails && !validEmails.includes(attempt.studentEmail?.toLowerCase())) {
            return;
          }

          const testSummary = tAnalytics[attempt.testId];
          testSummary.participants += 1;
          testSummary._totalScore += attempt.score || 0;
          
          let attemptTimeTaken = 0;
          if (attempt.responses && Array.isArray(attempt.responses)) {
              attemptTimeTaken = attempt.responses.reduce((sum, r) => sum + (r.timeSpent || 0), 0);
          }
          testSummary._totalTime += attemptTimeTaken;

          if ((attempt.score || 0) > testSummary.highestScore) {
            testSummary.highestScore = attempt.score;
          }
          
          const maxScore = testSummary._targetMarks;
          const pct = maxScore > 0 ? ((attempt.score || 0) / maxScore) * 100 : 0;
          
          if (pct <= 20) testSummary.distribution[0].count++;
          else if (pct <= 40) testSummary.distribution[1].count++;
          else if (pct <= 60) testSummary.distribution[2].count++;
          else if (pct <= 80) testSummary.distribution[3].count++;
          else testSummary.distribution[4].count++;
          
          const sName = attempt.studentName || attempt.studentEmail || 'Unknown';
          if (!sHistory[sName]) {
            sHistory[sName] = [];
          }
          
          let allQuestions = [];
          let correct = 0;
          let wrong = 0;
          let unattempted = 0;
          let negMarks = 0;

          if (attempt.responses && Array.isArray(attempt.responses)) {
            allQuestions = attempt.responses.map((r, i) => {
              const qData = questionsMap[r.questionId] || {};
              const isFillBlank = qData.questionType === 'Fill in Blanks';

              const hasAnswer = Array.isArray(r.selectedAnswer) ? r.selectedAnswer.length > 0 : !!r.selectedAnswer;

              let status = 'Unattempted';
              if (hasAnswer) {
                 let isCorrectAnswer = false;
                 if (r.isCorrect !== undefined) {
                   isCorrectAnswer = r.isCorrect;
                 } else {
                   const sel = Array.isArray(r.selectedAnswer) ? r.selectedAnswer.slice().sort().join(',') : String(r.selectedAnswer || '').trim().toLowerCase();
                   const cor = Array.isArray(r.correctAnswer) ? r.correctAnswer.slice().sort().join(',') : String(r.correctAnswer || '').trim().toLowerCase();
                   isCorrectAnswer = (sel === cor);
                 }

                 if (isCorrectAnswer) {
                   status = 'Correct';
                   correct++;
                 } else {
                   status = 'Wrong';
                   wrong++;
                 }
              } else {
                 unattempted++;
              }

              const formatAnswer = (ans) => {
                if (ans === undefined || ans === null || ans === '') return null;
                if (Array.isArray(ans)) return ans.length ? `Option ${ans.slice().sort().join(', ')}` : null;
                return isFillBlank ? ans : `Option ${ans}`;
              };

              return {
                qIndex: i + 1,
                q: qData.questionText || "Question text unavailable",
                qImage: qData.questionImageUrl || null,
                selected: formatAnswer(r.selectedAnswer),
                correct: formatAnswer(r.correctAnswer) || 'Unknown',
                explanation: qData.explanation || 'No explanation provided.',
                status,
                timeSpent: formatTime(r.timeSpent || 0),
                isFillBlank,
                questionType: qData.questionType || 'Multiple Choice',
                subject: qData.subject || 'General',
                topic: qData.topic || '',
                department: qData.department || '',
                timeSeconds: Math.round(r.timeSpent || 0),
                // Marks this answer earned (negative for a penalised wrong answer)
                awarded: typeof r.marksAwarded === 'number'
                  ? r.marksAwarded
                  : status === 'Correct' ? positiveMarkFor(qData) : status === 'Wrong' ? -negativeMarkFor(qData) : 0,
                marks: qData.marks ? Number(qData.marks) : positiveMarkFor(qData),
                options: isFillBlank ? null : {
                  A: { text: qData.optionA, image: qData.optionAImage },
                  B: { text: qData.optionB, image: qData.optionBImage },
                  C: { text: qData.optionC, image: qData.optionCImage },
                  D: { text: qData.optionD, image: qData.optionDImage },
                }
              };
            });
          }

          if (!testSummary.questionStats) testSummary.questionStats = {};
          allQuestions.forEach((q, idx) => {
            const qKey = q.qIndex || (idx + 1);
            if (!testSummary.questionStats[qKey]) {
              testSummary.questionStats[qKey] = {
                qIndex: qKey,
                qText: q.q,
                qImage: q.qImage,
                options: q.options,
                isFillBlank: q.isFillBlank,
                questionType: q.questionType,
                marks: q.marks,
                total: 0,
                correct: 0,
                wrong: 0,
                unattempted: 0
              };
            }
            testSummary.questionStats[qKey].total++;
            if (q.status === 'Correct') testSummary.questionStats[qKey].correct++;
            else if (q.status === 'Wrong') testSummary.questionStats[qKey].wrong++;
            else testSummary.questionStats[qKey].unattempted++;
          });

          // Leaderboard row for this test (also what the Excel / PDF export writes out)
          const totalQ = attempt.totalQuestions || allQuestions.length;
          testSummary.students.push({
            id: attempt.id,
            name: attempt.studentName || attempt.studentEmail || 'Unknown',
            email: attempt.studentEmail || '',
            score: attempt.score || 0,
            maxScore: maxScore,
            timeTaken: formatTime(attemptTimeTaken),
            timeSeconds: attemptTimeTaken,
            correct,
            wrong,
            unattempted: allQuestions.length ? unattempted : Math.max(0, totalQ - correct - wrong),
            submittedAt: attempt.submittedAt?.toDate ? attempt.submittedAt.toDate().toLocaleString('en-IN') : ''
          });

          sHistory[sName].push({
            id: attempt.id,
            testId: attempt.testId,
            testName: attempt.testTitle || 'Untitled Test',
            subject: testSummary.subject || 'General',
            maxScore: maxScore,
            score: attempt.score || 0,
            timeTaken: formatTime(attemptTimeTaken),
            timeSeconds: attemptTimeTaken,
            totalQ: attempt.totalQuestions || allQuestions.length,
            attempted: correct + wrong,
            correct,
            wrong,
            negMarks: 0,
            totalMarks: attempt.totalMarks ?? maxScore,
            timeTakenSeconds: attempt.timeTakenSeconds ?? attemptTimeTaken,
            submittedAt: attempt.submittedAt?.toDate ? attempt.submittedAt.toDate() : null,
            test: fetchedTests.find(t => t.id === attempt.testId) || null,
            // Students only see answers / explanations once the test's solutions are released
            solutionsVisible: areSolutionsVisible(fetchedTests.find(t => t.id === attempt.testId)),
            allQuestions
          });
        });

        // Finalize averages
        Object.values(tAnalytics).forEach(test => {
           if (test.participants > 0) {
             const avgScoreRaw = test._totalScore / test.participants;
             test.avgTime = formatTime(test._totalTime / test.participants);
             test.avgScore = Math.round((avgScoreRaw / test._targetMarks) * 100) || 0;
             test.highestScore = Math.round((test.highestScore / test._targetMarks) * 100) || 0;
           } else {
             test.avgScore = 0;
             test.highestScore = 0;
           }
        });

        setRealTests(fetchedTests);
        setComputedTestAnalytics(tAnalytics);
        setComputedStudentHistory(sHistory);
      } catch (err) {
        console.error("Failed to fetch analytics data", err);
      }
      setIsLoading(false);
    };
    fetchData();
  }, [department, joinedStudents?.length, reloadKey, studentViewOnlyEmail]);

  // Admin one-time clean-up: refund negative marks saved on MSQ / NAT answers (see utils/regradeAttempts).
  // Once it has been applied (or there turns out to be nothing to fix) it is recorded in
  // site_settings/migrations and the button no longer shows for any admin.
  const [negFix, setNegFix] = useState(null); // null | { loading } | { fixes, applying, done, error }
  const [negFixDone, setNegFixDone] = useState(true); // hidden until we know it hasn't been run
  useEffect(() => {
    if (department) return;
    getDoc(doc(db, 'site_settings', 'migrations'))
      .then(snap => setNegFixDone(snap.exists() && snap.data().msqNatNegativeFixDone === true))
      .catch(err => console.error('Failed to read migrations', err));
  }, [department]);
  const markNegFixDone = async () => {
    setNegFixDone(true);
    try {
      await setDoc(doc(db, 'site_settings', 'migrations'), { msqNatNegativeFixDone: true, msqNatNegativeFixAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      console.error('Failed to record the MSQ/NAT fix as done', err);
    }
  };
  const openNegFix = async () => {
    setNegFix({ loading: true });
    try {
      const fixes = await findMsqNatNegativeFixes();
      setNegFix({ fixes });
      if (fixes.length === 0) markNegFixDone();
    } catch (err) {
      console.error('Failed to check attempts', err);
      setNegFix({ fixes: [], error: 'Could not read the test attempts. Please try again.' });
    }
  };
  const applyNegFix = async () => {
    setNegFix(prev => ({ ...prev, applying: true }));
    try {
      await applyMsqNatNegativeFixes(negFix.fixes);
      setNegFix(prev => ({ ...prev, applying: false, done: true }));
      markNegFixDone();
      setReloadKey(k => k + 1);
    } catch (err) {
      console.error('Failed to fix attempts', err);
      setNegFix(prev => ({ ...prev, applying: false, error: 'Saving failed - nothing or only part was changed. Please try again.' }));
    }
  };

  const allStudentNames = Object.keys(computedStudentHistory);
  const filteredStudentNames = allStudentNames.filter(name => name.toLowerCase().includes(studentSearch.toLowerCase()));
  
  const activeStudentData = selectedStudentName ? (computedStudentHistory[selectedStudentName] || []) : [];
  const activeDetailedTest = detailedTestId ? activeStudentData.find(t => t.id === detailedTestId) : null;
  // A student looking at a test whose solutions aren't released yet sees their answers, not the key
  const hideKey = !!studentViewOnlyEmail && !!activeDetailedTest && !activeDetailedTest.solutionsVisible;

  let topperAttempt = null;
  if (activeDetailedTest && activeDetailedTest.testId) {
    let bestScore = -1;
    let minTime = Infinity;
    Object.values(computedStudentHistory).forEach(history => {
      history.forEach(attempt => {
        if (attempt.testId === activeDetailedTest.testId) {
          if (attempt.score > bestScore || (attempt.score === bestScore && attempt.timeSeconds < minTime)) {
            bestScore = attempt.score;
            minTime = attempt.timeSeconds;
            topperAttempt = attempt;
          }
        }
      });
    });
  }

  // Global Logic
  const activeGlobalTest = detailedGlobalTestId ? computedTestAnalytics[detailedGlobalTestId] : null;

  // Student just finished a test (or picked one): open that test's latest attempt once data is in
  useEffect(() => {
    if (!openTestId || !studentViewOnlyEmail) return;
    const attemptsOfTest = activeStudentData.filter(t => t.testId === openTestId);
    if (attemptsOfTest.length === 0) return; // not loaded yet
    setDetailedTestId(attemptsOfTest[attemptsOfTest.length - 1].id);
    setFilterStatus('All');
    onOpenedTest?.();
  }, [openTestId, studentViewOnlyEmail, activeStudentData, onOpenedTest]);

  const openStudentTestDetail = (id) => {
    setDetailedTestId(id);
    setFilterStatus('All');
  };

  const closeStudentTestDetail = () => {
    setDetailedTestId(null);
  };

  const openGlobalTestDetail = (id) => {
    setDetailedGlobalTestId(id);
    setGlobalTestTab('overview');
  };

  const closeGlobalTestDetail = () => {
    setDetailedGlobalTestId(null);
  };

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const handleExportPdf = async () => {
    if (!activeGlobalTest || isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      await exportTestReportPdf(activeGlobalTest);
    } catch (err) {
      console.error('Failed to export test report PDF', err);
      alert('Could not create the PDF. Please try again.');
    }
    setIsExportingPdf(false);
  };

  const selectStudent = (name) => {
    setSelectedStudentName(name);
    setDetailedTestId(null);
  };

  const backToStudentList = () => {
    setSelectedStudentName(null);
    setDetailedTestId(null);
  };

  // If tab switches, reset detailed views
  const handleTabChange = (tab) => {
    setActiveInnerTab(tab);
    setDetailedTestId(null);
    setSelectedStudentName(null);
    setDetailedGlobalTestId(null);
  };

  // If search changes, reset detailed view
  const handleSearchChange = (e) => {
    setStudentSearch(e.target.value);
  };

  // Helper to color percentage rings
  const getScoreColor = (percent) => {
    if (percent >= 80) return 'text-emerald-500 bg-emerald-500';
    if (percent >= 50) return 'text-amber-500 bg-amber-500';
    return 'text-rose-500 bg-rose-500';
  };

  return (
    <div className="w-full flex flex-col bg-slate-50/50">
      
      {/* Header & Tab Switcher */}
      <div className="p-4 sm:p-6 lg:p-8 border-b border-slate-200 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shrink-0 z-10">
        <div>
          <h2 className="text-2xl font-[900] text-slate-800 tracking-tight flex items-center gap-2">
            <BarChart2 className="text-blue-600" /> Performance Analytics
          </h2>
          <p className="text-slate-500 text-sm mt-1">Deep insights into global test performance and individual student metrics</p>
          {/* Admin only: one-time refund of negative marks saved on MSQ / NAT answers */}
          {!department && !negFixDone && (
            <button
              onClick={openNegFix}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
            >
              <AlertCircle size={14} /> Fix MSQ/NAT negative marks in past attempts
            </button>
          )}
        </div>

        {!studentViewOnlyEmail && (
          <div className="flex bg-slate-100/80 p-1.5 rounded-2xl w-full md:w-auto shadow-inner border border-slate-200/60">
            <button
              onClick={() => handleTabChange('global')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeInnerTab === 'global' ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            >
              <Globe2 size={16} /> Global Tests
            </button>
            <button
              onClick={() => handleTabChange('student')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeInnerTab === 'student' ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            >
              <UserCircle2 size={16} /> Individual Student
            </button>
          </div>
        )}
      </div>

      {negFix && (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !negFix.applying && setNegFix(null)}>
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-[900] text-slate-900">Fix MSQ/NAT negative marks</h3>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">MSQ and NAT have no negative marking - refund marks deducted on those answers in saved attempts. Questions are not changed.</p>
              </div>
              <button onClick={() => !negFix.applying && setNegFix(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full shrink-0"><XCircle size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto">
              {negFix.loading ? (
                <p className="text-sm font-bold text-slate-500 text-center py-6">Checking every test attempt...</p>
              ) : negFix.done ? (
                <p className="text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-2">
                  <CheckCircle2 size={18} /> Updated {negFix.fixes.length} attempt{negFix.fixes.length === 1 ? '' : 's'}. Analytics has been refreshed with the corrected scores.
                </p>
              ) : negFix.fixes?.length === 0 ? (
                <p className="text-sm font-bold text-slate-600 text-center py-6">{negFix.error || 'Nothing to fix - no saved attempt has negative marks on an MSQ or NAT answer.'}</p>
              ) : (
                <>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
                        <th className="py-2 pr-3">Test</th>
                        <th className="py-2 pr-3">Student</th>
                        <th className="py-2 pr-3 text-center">MSQ/NAT answers</th>
                        <th className="py-2 text-right">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {negFix.fixes.map(f => (
                        <tr key={f.id} className="border-b border-slate-50">
                          <td className="py-2 pr-3 font-semibold text-slate-700">{f.test}</td>
                          <td className="py-2 pr-3 font-semibold text-slate-700">{f.student}</td>
                          <td className="py-2 pr-3 text-center font-bold text-slate-600">{f.answers}</td>
                          <td className="py-2 text-right font-bold whitespace-nowrap">
                            <span className="text-red-500">{f.oldScore}</span> <span className="text-slate-300">→</span> <span className="text-emerald-600">{f.newScore}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {negFix.error && <p className="mt-4 text-sm font-bold text-red-600">{negFix.error}</p>}
                </>
              )}
            </div>
            <div className="px-6 pb-6 flex justify-end gap-3">
              <button onClick={() => setNegFix(null)} disabled={negFix.applying} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50">
                {negFix.done || negFix.fixes?.length === 0 ? 'Close' : 'Cancel'}
              </button>
              {!negFix.done && negFix.fixes?.length > 0 && (
                <button
                  onClick={applyNegFix}
                  disabled={negFix.applying}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-sm"
                >
                  {negFix.applying ? 'Updating...' : `Apply to ${negFix.fixes.length} attempt${negFix.fixes.length === 1 ? '' : 's'}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center flex-1 min-h-[400px]">
             <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
             <p className="text-slate-500 font-bold">Compiling Analytics Data...</p>
          </div>
        ) : (
          <>
            {/* ============================================================== */}
            {/* GLOBAL TEST ANALYTICS */}
            {/* ============================================================== */}
        {activeInnerTab === 'global' && (
          <div className="max-w-5xl mx-auto flex flex-col gap-8 pb-12">
            {!detailedGlobalTestId ? (
              // LIST VIEW
              <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-10 shadow-sm flex flex-col">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <Target size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Global Test Database</h3>
                    <p className="text-sm font-semibold text-slate-500">Select a test to view detailed performance metrics.</p>
                  </div>
                </div>

                    {(() => {
                      const tree = Object.values(computedTestAnalytics).reduce((acc, test) => {
                        const d = test.department || 'General';
                        const s = test.subject || 'General';
                        if (!acc[d]) acc[d] = {};
                        if (!acc[d][s]) acc[d][s] = [];
                        acc[d][s].push(test);
                        return acc;
                      }, {});
                      const depts = Object.keys(tree).sort();
                      const allKeys = depts.flatMap(d => [d, ...Object.keys(tree[d]).map(s => `${d}-${s}`)]);
                      const allExpanded = allKeys.length > 0 && allKeys.every(k => expandedFolders[k]);

                      if (depts.length === 0) {
                        return (
                          <div className="text-center py-12 text-slate-400 font-bold bg-slate-50 rounded-2xl">
                            No tests found.
                          </div>
                        );
                      }

                      return (
                        <div className="border border-slate-200 rounded-2xl bg-white p-3">
                          <div className="flex justify-end px-2 pb-2 mb-1 border-b border-slate-100">
                            <button
                              onClick={() => setExpandedFolders(allExpanded ? {} : Object.fromEntries(allKeys.map(k => [k, true])))}
                              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              {allExpanded ? 'Collapse all' : 'Expand all'}
                            </button>
                          </div>

                          <div className="flex flex-col gap-0.5">
                            {depts.map(dept => {
                              const subjects = tree[dept];
                              const isDeptExpanded = !!expandedFolders[dept];
                              const totalDeptTests = Object.values(subjects).reduce((sum, arr) => sum + arr.length, 0);

                              return (
                                <div key={dept}>
                                  <div
                                    onClick={() => toggleFolder(dept)}
                                    className="flex items-center gap-2.5 px-2 py-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors select-none"
                                  >
                                    <ChevronRight size={16} className={`text-slate-400 shrink-0 transition-transform duration-200 ${isDeptExpanded ? 'rotate-90' : ''}`} />
                                    {isDeptExpanded ? <FolderOpen size={18} className="text-blue-600 shrink-0" /> : <Folder size={18} className="text-blue-500 shrink-0" />}
                                    <span className="font-bold text-slate-800 truncate">{dept}</span>
                                    <span className="bg-slate-100 text-slate-500 text-[11px] px-2 py-0.5 rounded-full font-bold shrink-0">{totalDeptTests}</span>
                                  </div>

                                  {isDeptExpanded && (
                                    <div className="ml-[15px] pl-4 border-l border-slate-200 flex flex-col gap-0.5">
                                      {Object.keys(subjects).sort().map(subj => {
                                        const subjKey = `${dept}-${subj}`;
                                        const isSubjExpanded = !!expandedFolders[subjKey];
                                        const tests = subjects[subj];

                                        return (
                                          <div key={subjKey} className="relative">
                                            <span className="absolute -left-4 top-[18px] w-4 border-t border-slate-200" />
                                            <div
                                              onClick={() => toggleFolder(subjKey)}
                                              className="flex items-center gap-2.5 px-2 py-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors select-none"
                                            >
                                              <ChevronRight size={15} className={`text-slate-400 shrink-0 transition-transform duration-200 ${isSubjExpanded ? 'rotate-90' : ''}`} />
                                              {isSubjExpanded ? <FolderOpen size={16} className="text-indigo-500 shrink-0" /> : <Folder size={16} className="text-indigo-400 shrink-0" />}
                                              <span className="font-semibold text-slate-700 truncate">{subj}</span>
                                              <span className="bg-slate-100 text-slate-500 text-[11px] px-2 py-0.5 rounded-full font-bold shrink-0">{tests.length}</span>
                                            </div>

                                            {isSubjExpanded && (
                                              <div className="ml-[14px] pl-4 border-l border-slate-200 flex flex-col">
                                                {tests.map(test => (
                                                  <div
                                                    key={test.id}
                                                    onClick={() => openGlobalTestDetail(test.id)}
                                                    className="group relative flex items-center justify-between gap-3 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors"
                                                  >
                                                    <span className="absolute -left-4 top-1/2 w-4 border-t border-slate-200" />
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                      <FileText size={14} className="text-slate-400 group-hover:text-blue-600 shrink-0" />
                                                      <span className="font-semibold text-[14px] text-slate-700 group-hover:text-blue-700 truncate">{test.title}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wide shrink-0">
                                                      <span className="hidden sm:inline">{test.date}</span>
                                                      <span className="hidden sm:inline">•</span>
                                                      <span>{test.participants} Attempts</span>
                                                      <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-600" />
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
              </div>
            ) : (
              // DRILLED-DOWN VIEW
              <div className="flex flex-col">
                
                {/* Back Button & Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm mb-6">
                  <div className="flex flex-col items-start gap-4">
                    <button 
                      onClick={closeGlobalTestDetail}
                      className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors bg-slate-50 hover:bg-blue-50 px-3 py-1.5 rounded-lg"
                    >
                      <ArrowLeft size={16} /> Back to Global Tests
                    </button>
                    <div>
                      <h4 className="text-[26px] font-[900] tracking-tight text-slate-800">{activeGlobalTest.title}</h4>
                      <p className="text-sm font-bold text-slate-500 mt-1">Aggregated class performance metrics</p>
                    </div>
                  </div>

                  {/* View Toggle */}
                  <div className="flex bg-slate-100 p-1 rounded-xl w-fit mt-4 sm:mt-0">
                    <button 
                      onClick={() => setGlobalTestTab('overview')}
                      className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${globalTestTab === 'overview' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Overview
                    </button>
                    <button 
                      onClick={() => setGlobalTestTab('questions')}
                      className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${globalTestTab === 'questions' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Questions
                    </button>
                  </div>

                  {/* Export this test's report */}
                  <div className="flex items-center gap-2 mt-4 sm:mt-0 shrink-0">
                    <button
                      onClick={() => exportTestReportCsv(activeGlobalTest)}
                      title="Download as a spreadsheet (opens in Excel)"
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                    >
                      <FileSpreadsheet size={16} /> Excel
                    </button>
                    <button
                      onClick={handleExportPdf}
                      disabled={isExportingPdf}
                      title="Download as a PDF report"
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-sm"
                    >
                      <Download size={16} /> {isExportingPdf ? 'Preparing...' : 'PDF'}
                    </button>
                  </div>
                </div>

                {globalTestTab === 'overview' && (
                  <>
                    {/* Key Metrics Blocks */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                    <Users size={24} className="text-purple-500 mb-2" />
                    <span className="text-4xl font-[900] text-slate-800 tracking-tight">{activeGlobalTest.participants}</span>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Attempts</span>
                  </div>
                  <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 shadow-sm flex flex-col items-center justify-center text-center">
                    <TrendingUp size={24} className="text-blue-500 mb-2" />
                    <span className="text-4xl font-[900] text-blue-700 tracking-tight">{activeGlobalTest.avgScore}%</span>
                    <span className="text-[11px] font-bold text-blue-500/80 uppercase tracking-widest mt-1">Average Score</span>
                  </div>
                  <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 shadow-sm flex flex-col items-center justify-center text-center">
                    <Award size={24} className="text-emerald-500 mb-2" />
                    <span className="text-4xl font-[900] text-emerald-700 tracking-tight">{activeGlobalTest.highestScore}%</span>
                    <span className="text-[11px] font-bold text-emerald-600/80 uppercase tracking-widest mt-1">Highest Score</span>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                    <Clock size={24} className="text-amber-500 mb-2" />
                    <span className="text-[28px] leading-9 font-[900] text-slate-800 tracking-tight">{activeGlobalTest.avgTime}</span>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Avg Time Taken</span>
                  </div>
                </div>

                {/* Chart and Table Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                  
                  {/* Left: Score Distribution Chart */}
                  <div className="xl:col-span-5 flex flex-col bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <h4 className="text-[15px] font-[900] text-slate-800 mb-8 flex items-center gap-2">
                      <BarChart2 size={18} className="text-blue-500"/> Score Distribution
                    </h4>
                    <div className="w-full flex-1 min-h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={activeGlobalTest.distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#64748b', fontWeight: 600 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#64748b', fontWeight: 600 }} />
                          <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', padding: '12px 16px' }} />
                          <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} isAnimationActive={false} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Right: Innovative Leaderboard */}
                  <div className="xl:col-span-7 flex flex-col bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="text-[15px] font-[900] text-slate-800 flex items-center gap-2">
                        <Users size={18} className="text-blue-500"/> Student Leaderboard
                      </h4>
                      <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 flex items-center gap-2">
                        <Search size={14} className="text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search leaderboard..."
                          className="bg-transparent border-none outline-none text-xs text-slate-600 font-medium placeholder:text-slate-400 w-32"
                        />
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                      {/* Table Header Row */}
                      <div className="grid grid-cols-12 gap-4 px-4 py-2 border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        <div className="col-span-5">Student Name</div>
                        <div className="col-span-4">Performance</div>
                        <div className="col-span-3 text-right">Time Taken</div>
                      </div>

                      {/* Leaderboard Rows */}
                      {activeGlobalTest.students.sort((a, b) => b.score - a.score).map((student, idx) => {
                        const percent = Math.round((student.score / student.maxScore) * 100);
                        const colorClass = getScoreColor(percent).split(' ')[1]; // bg-color
                        const textClass = getScoreColor(percent).split(' ')[0]; // text-color
                        
                        return (
                          <div key={student.id} className="grid grid-cols-12 gap-4 px-4 py-4 items-center bg-white border border-slate-100 hover:border-slate-300 rounded-2xl transition-colors hover:shadow-sm">
                            
                            {/* Student Profile Info */}
                            <div className="col-span-5 flex items-center gap-3">
                              <div className="relative">
                                <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 font-[900] text-sm flex items-center justify-center border border-slate-200">
                                  {student.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                {idx === 0 && <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 border-2 border-white rounded-full flex items-center justify-center shadow-sm">👑</div>}
                              </div>
                              <span className="font-[800] text-slate-800 text-[14px] truncate">{student.name}</span>
                            </div>

                            {/* Performance Bar */}
                            <div className="col-span-4 flex flex-col justify-center gap-1.5">
                              <div className="flex justify-between items-end">
                                <span className="font-bold text-slate-800 text-[13px]">{student.score} <span className="text-[10px] text-slate-400">/ {student.maxScore}</span></span>
                                <span className={`font-black text-[11px] ${textClass}`}>{percent}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${percent}%` }}></div>
                              </div>
                            </div>

                            {/* Time Taken */}
                            <div className="col-span-3 flex justify-end">
                              <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                                <Clock size={12} className="text-slate-400" />
                                <span className="text-xs font-bold text-slate-600 tracking-tight">{student.timeTaken}</span>
                              </div>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                </>
                )}

                {globalTestTab === 'questions' && (
                  <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                      <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Target size={20} className="text-blue-500" /> Question-wise Analytics
                      </h3>
                      {(!activeGlobalTest.questionStats || Object.keys(activeGlobalTest.questionStats).length === 0) ? (
                        <div className="text-center p-8 text-slate-500 font-bold bg-slate-50 rounded-xl border border-slate-100">
                          No question data available for this test yet.
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {Object.values(activeGlobalTest.questionStats)
                            .sort((a, b) => {
                              const numA = parseInt(a.qIndex);
                              const numB = parseInt(b.qIndex);
                              return (isNaN(numA) || isNaN(numB)) ? String(a.qIndex).localeCompare(String(b.qIndex)) : numA - numB;
                            })
                            .map((q) => {
                            const correctPct = q.total > 0 ? Math.round((q.correct / q.total) * 100) : 0;
                            const wrongPct = q.total > 0 ? Math.round((q.wrong / q.total) * 100) : 0;
                            const unattemptedPct = q.total > 0 ? Math.round((q.unattempted / q.total) * 100) : 0;
                            
                            return (
                              <div key={q.qIndex} className="p-5 border border-slate-100 bg-slate-50 rounded-2xl">
                                <div className="flex justify-between items-start gap-4 mb-4">
                                  <div>
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">Question {q.qIndex}</span>
                                    <p className="text-sm font-semibold text-slate-700" dangerouslySetInnerHTML={{ __html: q.qText }} />
                                    {q.qImage && <img src={q.qImage} alt="Question" className="mt-3 max-h-40 rounded-lg shadow-sm" />}
                                  </div><div className="shrink-0 text-[10px] font-bold text-blue-700 bg-blue-100/50 border border-blue-200 px-2 py-1 rounded-md uppercase">{q.questionType === 'Multiple Select' ? 'MSQ' : (q.questionType === 'Fill in Blanks' || q.questionType === 'Numerical Answer Type') ? 'NAT' : q.questionType === 'Match' ? 'MATCH' : 'MCQ'}</div>
                                </div>
                                
                                <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t border-slate-200">
                                  <div>
                                    <div className="text-2xl font-[900] text-slate-700">{q.total}</div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Attempts</div>
                                  </div>
                                  <div>
                                    <div className="text-2xl font-[900] text-emerald-600">{correctPct}%</div>
                                    <div className="text-[10px] font-bold text-emerald-500/70 uppercase tracking-wider">Correct ({q.correct})</div>
                                  </div>
                                  <div>
                                    <div className="text-2xl font-[900] text-red-500">{wrongPct}%</div>
                                    <div className="text-[10px] font-bold text-red-400/70 uppercase tracking-wider">Wrong ({q.wrong})</div>
                                  </div>
                                  <div>
                                    <div className="text-2xl font-[900] text-slate-400">{unattemptedPct}%</div>
                                    <div className="text-[10px] font-bold text-slate-400/70 uppercase tracking-wider">Unattempted ({q.unattempted})</div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* INDIVIDUAL STUDENT ANALYTICS */}
        {/* ============================================================== */}
        {activeInnerTab === 'student' && (
          <div className="max-w-5xl mx-auto flex flex-col gap-8 pb-12">
            
            {!selectedStudentName ? (
              // 1. STUDENT DIRECTORY LIST VIEW
              <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-10 shadow-sm flex flex-col">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
                      <Users size={20} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">Student Directory</h3>
                      <p className="text-sm font-semibold text-slate-500">Select a student to view their detailed performance analysis.</p>
                    </div>
                  </div>
                  <div className="relative w-full sm:w-[300px]">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search student by name..."
                      value={studentSearch}
                      onChange={handleSearchChange}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredStudentNames.length > 0 ? (
                    filteredStudentNames.map(name => {
                      const data = computedStudentHistory[name];
                      const totalTests = data.length;
                      const avgScore = totalTests > 0 ? Math.round(data.reduce((acc, t) => acc + t.score, 0) / totalTests) : 0;
                      
                      return (
                        <div 
                          key={name}
                          onClick={() => selectStudent(name)}
                          className="group border border-slate-200 rounded-2xl bg-white hover:border-indigo-300 hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden p-5 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 font-black text-xl flex items-center justify-center border border-indigo-200 group-hover:scale-105 transition-transform">
                              {name.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-[800] text-slate-800 text-[17px] group-hover:text-indigo-600 transition-colors tracking-tight">{name}</span>
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mt-1">
                                <span className="bg-slate-100 px-2 py-0.5 rounded-md">{totalTests} Tests</span>
                                <span>•</span>
                                <span className="text-emerald-600">Avg {avgScore}%</span>
                              </div>
                            </div>
                          </div>
                          <div className="p-2 rounded-full bg-slate-50 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors text-slate-400">
                            <ChevronRight size={20} />
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="col-span-2 flex flex-col items-center justify-center p-12 text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                      <Search size={48} className="mb-4 opacity-30" />
                      <p className="text-lg font-bold text-slate-600">No students found matching "{studentSearch}"</p>
                    </div>
                  )}
                </div>
              </div>
            ) : !detailedTestId ? (
              // 2. STUDENT OVERVIEW (Graph + List of Tests)
              <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-10 shadow-sm flex flex-col">
                {!studentViewOnlyEmail && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 border-b border-slate-100 pb-6">
                    <button 
                      onClick={backToStudentList}
                      className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors bg-slate-50 hover:bg-indigo-50 px-4 py-2 rounded-xl"
                    >
                      <ArrowLeft size={16} /> Back to Directory
                    </button>
                  </div>
                )}

                {activeStudentData.length > 0 ? (
                  <>
                    <div className="flex items-center gap-4 mb-8 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                      <div className="w-16 h-16 rounded-full bg-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-md">
                        {selectedStudentName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-2xl font-[900] text-slate-800">{selectedStudentName}</h4>
                        <p className="text-sm font-bold text-indigo-500 mt-0.5">Historical Test Trajectory</p>
                      </div>
                    </div>

                    <div className="w-full h-[280px] mb-12">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={activeStudentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="testName" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} />
                          <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} />
                          <RechartsTooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', padding: '12px 16px' }} />
                          <Line type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={5} dot={{ r: 5, fill: '#4f46e5', strokeWidth: 3, stroke: '#fff' }} activeDot={{ r: 8, stroke: '#e0e7ff', strokeWidth: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Clean List of Test Cards */}
                    <div>
                      <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 text-center">Test History</h4>
                      <div className="flex flex-col gap-4">
                        {activeStudentData.map(test => (
                          <div 
                            key={test.id} 
                            onClick={() => openStudentTestDetail(test.id)}
                            className="group border border-slate-200 rounded-2xl bg-white hover:border-blue-300 hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden"
                          >
                            <div className="p-5 flex items-center justify-between">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800 text-lg group-hover:text-blue-600 transition-colors">{test.testName}</span>
                                <span className="text-sm font-bold text-slate-500 mt-0.5">Score: <span className="text-blue-600">{test.score}%</span></span>
                              </div>
                              <div className="flex items-center gap-5 text-slate-400">
                                <div className="flex items-center gap-1.5 text-sm font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
                                  <Clock size={16} className="text-blue-500" /> {test.timeTaken}
                                </div>
                                <div className="p-2 rounded-full bg-slate-50 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                  <ChevronRight size={20} />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center flex-1 text-slate-400 min-h-[400px]">
                    <Users size={64} className="mb-6 opacity-30" />
                    <p className="text-xl font-bold text-slate-600 mb-2">No Student Data Found</p>
                    <p className="text-sm font-medium text-slate-400">Search for an enrolled student to view their analytics trajectory.</p>
                  </div>
                )}
              </div>
            ) : (
              // 3. DRILLED-DOWN DETAILED TEST VIEW - GATE test-series style report (analytics/TestReport)
              <TestReport
                attempt={activeDetailedTest}
                studentName={selectedStudentName}
                hideKey={hideKey}
                onBack={closeStudentTestDetail}
                onReviewSolutions={onReviewSolutions}
                solutions={(
              <div className="flex flex-col">
                {/* Filter Bar */}
                <div className="flex flex-wrap items-center gap-2 mb-8 bg-slate-50 p-2 rounded-xl border border-slate-200">
                  {['All', 'Correct', 'Wrong', 'Unattempted'].map(status => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${filterStatus === status ? 'bg-white shadow-sm border border-slate-200 text-slate-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                    >
                      {status} ({status === 'All' ? activeDetailedTest.allQuestions.length : activeDetailedTest.allQuestions.filter(q => q.status === status).length})
                    </button>
                  ))}
                </div>

                {hideKey && (
                  <div className="mb-6 flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl px-5 py-4 text-sm font-semibold">
                    <AlertCircle size={18} className="shrink-0 text-amber-500" />
                    Correct answers and explanations will appear here once your teacher releases the solutions for this test.
                  </div>
                )}

                {/* Detailed Questions List */}
                <div className="space-y-6">
                  {(() => {
                    const filteredQuestions = filterStatus === 'All' 
                      ? activeDetailedTest.allQuestions 
                      : activeDetailedTest.allQuestions.filter(q => q.status === filterStatus);

                    return filteredQuestions.length > 0 ? (
                      filteredQuestions.map((q, i) => (
                        <div key={i} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
                          
                          {/* Header of Question */}
                          <div className={`px-6 py-4 border-b flex justify-between items-center ${q.status === 'Correct' ? 'bg-emerald-50 border-emerald-100' : q.status === 'Wrong' ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-black text-slate-500 bg-white border border-slate-200 w-8 h-8 flex items-center justify-center rounded-xl shadow-sm">
                                Q{q.qIndex}
                              </span>
                              {q.status === 'Correct' && <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700"><CheckCircle2 size={16} className="text-emerald-500"/> Correct</span>}
                              {q.status === 'Wrong' && <span className="flex items-center gap-1.5 text-xs font-bold text-red-700"><XCircle size={16} className="text-red-500"/> Wrong</span>}
                              {q.status === 'Unattempted' && <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600"><MinusCircle size={16} className="text-slate-400"/> Unattempted</span>}
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="text-[10px] font-bold text-blue-700 bg-blue-100/50 border border-blue-200 px-2 py-1 rounded-md uppercase">{q.questionType === 'Multiple Select' ? 'MSQ' : (q.questionType === 'Fill in Blanks' || q.questionType === 'Numerical Answer Type') ? 'NAT' : q.questionType === 'Match' ? 'MATCH' : 'MCQ'}</div>
                              {(() => {
                                const topperQ = topperAttempt ? topperAttempt.allQuestions.find(tq => tq.q === q.q) : null;
                                return topperQ ? (
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl shadow-sm" title="Topper's Time">
                                    👑 <Clock size={14} className="text-amber-500" />
                                    {topperQ.timeSpent}
                                  </div>
                                ) : null;
                              })()}
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm" title="Student's Time">
                                <Clock size={14} className="text-blue-500" />
                                {q.timeSpent}
                              </div>
                            </div>
                          </div>

                          <div className="p-6">
                            <p className="font-[800] text-slate-800 mb-6 text-base leading-relaxed tracking-tight" dangerouslySetInnerHTML={{ __html: q.q }} />
                            {q.qImage && <img src={q.qImage} alt="Question" className="max-w-full h-auto mb-6 rounded-lg border border-slate-200 shadow-sm" />}
                            
                            {q.options ? (
                              <div className="flex flex-col gap-3 mb-6">
                                {['A', 'B', 'C', 'D'].map(optKey => {
                                  const opt = q.options[optKey];
                                  if (!opt || (!opt.text && !opt.image)) return null;
                                  
                                  const isSelected = q.selected && q.selected.includes(`Option ${optKey}`);
                                  const isCorrect = !hideKey && q.correct && q.correct.includes(`Option ${optKey}`);
                                  
                                  let ringClass = "border-slate-200";
                                  let bgClass = "bg-white";
                                  let badges = null;
                                  
                                  if (isSelected && isCorrect) {
                                    ringClass = "border-emerald-500";
                                    bgClass = "bg-emerald-50";
                                    badges = (
                                      <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
                                        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-200/50 px-2 py-1 rounded border border-emerald-200/50">
                                          <CheckCircle2 size={12} /> Correct & Selected
                                        </span>
                                      </div>
                                    );
                                  } else if (isSelected && hideKey) {
                                    ringClass = "border-blue-400";
                                    bgClass = "bg-blue-50";
                                    badges = (
                                      <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
                                        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-200/50 px-2 py-1 rounded border border-blue-200/50">
                                          Your Answer
                                        </span>
                                      </div>
                                    );
                                  } else if (isSelected && !isCorrect) {
                                    ringClass = "border-red-400";
                                    bgClass = "bg-red-50";
                                    badges = (
                                      <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
                                        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-red-700 bg-red-200/50 px-2 py-1 rounded border border-red-200/50">
                                          <XCircle size={12} /> Student Selected
                                        </span>
                                      </div>
                                    );
                                  } else if (!isSelected && isCorrect) {
                                    ringClass = "border-emerald-500";
                                    bgClass = "bg-white";
                                    badges = (
                                      <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
                                        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-200/50 px-2 py-1 rounded border border-emerald-200/50">
                                          <CheckCircle2 size={12} /> Correct Answer
                                        </span>
                                      </div>
                                    );
                                  }
                                  
                                  return (
                                    <div key={optKey} className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-colors ${ringClass} ${bgClass}`}>
                                      <div className="flex items-center justify-center w-6 h-6 rounded bg-slate-100 text-slate-500 font-bold text-sm shrink-0 border border-slate-200">
                                        {optKey}
                                      </div>
                                      <div className="flex-1 flex flex-col gap-2 overflow-hidden mt-0.5">
                                        {opt.text && <div className="text-sm font-semibold text-slate-700 break-words" dangerouslySetInnerHTML={{ __html: opt.text }} />}
                                        {opt.image && <img src={opt.image} alt={`Option ${optKey}`} className="max-w-full h-auto rounded border border-slate-200 shadow-sm" />}
                                      </div>
                                      {badges}
                                    </div>
                                  );
                                })}
                                {!q.selected && <div className="text-sm font-bold text-slate-500 mt-2 flex items-center gap-2"><MinusCircle size={16}/> Left Blank</div>}
                              </div>
                            ) : (
                              <div className="flex flex-col gap-4 mb-6">
                                {/* Student Selected */}
                                <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                  <div className="mt-0.5 shrink-0 bg-white p-1.5 rounded-full shadow-sm border border-slate-200">
                                    {q.status === 'Correct' ? <CheckCircle2 className="text-emerald-500" size={18} /> : q.status === 'Wrong' ? <XCircle className="text-red-500" size={18} /> : <MinusCircle className="text-slate-400" size={18} />}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Student Selected</span>
                                    <span className={`font-[700] text-[15px] ${q.status === 'Correct' ? 'text-emerald-700' : q.status === 'Wrong' ? 'text-red-700' : 'text-slate-600'}`}>{q.selected || "Left Blank"}</span>
                                  </div>
                                </div>
                                
                                {/* Correct Answer */}
                                {q.status !== 'Correct' && !hideKey && (
                                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                                    <div className="mt-0.5 shrink-0 bg-white p-1.5 rounded-full shadow-sm border border-emerald-200">
                                      <CheckCircle2 className="text-emerald-500" size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-[11px] font-bold text-emerald-600/70 uppercase tracking-widest mb-1.5">Correct Answer</span>
                                      <span className="font-[700] text-[15px] text-emerald-800">{q.correct}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {!hideKey && (
                            <div className="pt-5 border-t border-slate-100">
                              <div className="flex items-center gap-3 text-[15px] text-slate-600 bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                                <AlertCircle className="shrink-0 text-blue-500" size={20} />
                                <p className="leading-relaxed"><span className="font-bold text-slate-800 mr-1">Explanation:</span> <span dangerouslySetInnerHTML={{ __html: q.explanation }} /></p>
                              </div>
                            </div>
                            )}
                          </div>

                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center border-2 border-dashed border-slate-300 bg-slate-50 rounded-2xl flex flex-col items-center justify-center mt-4">
                        <Filter size={32} className="text-slate-300 mb-3" />
                        <p className="text-base font-bold text-slate-600">No questions found matching this filter.</p>
                      </div>
                    );
                  })()}
                </div>
              </div>
                )}
              />
            )}
          </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}




