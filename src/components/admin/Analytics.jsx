import React, { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, Users, Award, Search, Clock, CheckCircle2, XCircle, AlertCircle, ChevronRight, MinusCircle, UserCircle2, Globe2, Filter, ArrowLeft, Target, FileText, Download, FileSpreadsheet, GraduationCap, Crown, HelpCircle } from 'lucide-react';
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
import MatchColumns from '../shared/MatchColumns';
import { paletteFor, monogramOf } from '../../utils/departmentColors';
import { sameDepartment, isCommonDeptName } from '../../utils/subjects';
import { collection, getDocs, query, where, doc, getDoc, setDoc, documentId } from 'firebase/firestore';
import { getCachedQuestionsSync } from '../../utils/questionBankCache';

// Helper
const formatTime = (seconds) => {
  if (!seconds) return '0m 0s';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
};

import Toast from '../shared/Toast';

export default function Analytics({ joinedStudents = [], department = null, studentViewOnlyEmail = null, studentViewOnlyName = null, openTestId = null, onOpenedTest = null, onReviewSolutions = null }) {
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => setToast({ show: true, message, type });

  const [activeInnerTab, setActiveInnerTab] = useState('global'); // 'global' or 'student'
  
  // Drill-down states for Global
  const [detailedGlobalTestId, setDetailedGlobalTestId] = useState(null);
  const [globalTestTab, setGlobalTestTab] = useState('overview'); // 'overview' | 'questions'
  const [viewingFromGlobalTestId, setViewingFromGlobalTestId] = useState(null);
  const [leaderboardSearch, setLeaderboardSearch] = useState('');
  
  // Drill-down states for Student
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentName, setSelectedStudentName] = useState(null);
  const [detailedTestId, setDetailedTestId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All'); 
  const [expandedFolders, setExpandedFolders] = useState({});
  const [showLegend, setShowLegend] = useState(true);
  const toggleFolder = (folder) => setExpandedFolders(prev => ({ ...prev, [folder]: !prev[folder] }));
  const [testSearch, setTestSearch] = useState(''); // Global Tests list search
  
  // Department grouping states for Student Directory
  const [expandedStudentDepts, setExpandedStudentDepts] = useState({});
  const toggleStudentDept = (dept) => setExpandedStudentDepts(prev => ({ ...prev, [dept]: !prev[dept] }));
  const [selectedStudentDeptFilter, setSelectedStudentDeptFilter] = useState('All');
  const [enrolledStudents, setEnrolledStudents] = useState(joinedStudents || []);

  useEffect(() => {
    if (joinedStudents && joinedStudents.length > 0) {
      setEnrolledStudents(joinedStudents);
    }
  }, [joinedStudents]);
  
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
        let attemptsQuery = collection(db, 'test_attempts');
        if (studentViewOnlyEmail) {
          attemptsQuery = query(collection(db, 'test_attempts'), where('studentEmail', '==', studentViewOnlyEmail));
        }

        const [testsSnap, attemptsSnap, attributesSnap] = await Promise.all([
          getDocs(collection(db, 'tests')),
          getDocs(attemptsQuery),
          getDocs(collection(db, 'question_attributes'))
        ]);

        let currentJoined = joinedStudents;
        if ((!currentJoined || currentJoined.length === 0) && !studentViewOnlyEmail) {
          try {
            const jsSnap = await getDocs(collection(db, 'joined_students'));
            currentJoined = jsSnap.docs.map(d => ({ ...d.data(), id: d.id }));
            setEnrolledStudents(currentJoined);
          } catch (jsErr) {
            console.warn("Could not fetch joined_students in Analytics", jsErr);
          }
        }

        let fetchedTests = testsSnap.docs.map(d => ({ ...d.data(), id: d.id }));
        if (department) {
          fetchedTests = fetchedTests.filter(t => sameDepartment(t.department, department));
        }
        const fetchedAttempts = attemptsSnap.docs.map(d => ({ ...d.data(), id: d.id }));

        // Collect all question IDs needed across attempts and tests
        const neededQuestionIds = new Set();
        fetchedAttempts.forEach(attempt => {
          if (Array.isArray(attempt.responses)) {
            attempt.responses.forEach(r => {
              if (r?.questionId && typeof r.questionId === 'string' && !r.questionId.includes('/')) {
                neededQuestionIds.add(r.questionId);
              }
            });
          }
        });
        fetchedTests.forEach(test => {
          if (Array.isArray(test.questions)) {
            test.questions.forEach(qId => {
              if (qId && typeof qId === 'string' && !qId.includes('/')) {
                neededQuestionIds.add(qId);
              }
            });
          }
        });

        const questionsMap = {};
        // Populate from in-memory cache if available
        const cachedQ = getCachedQuestionsSync('all') || [];
        cachedQ.forEach(q => {
          if (q?.id && neededQuestionIds.has(q.id)) {
            questionsMap[q.id] = q;
          }
        });

        // Fetch remaining uncached questions in batches of 30
        const missingIds = Array.from(neededQuestionIds).filter(id => !questionsMap[id]);
        if (missingIds.length > 0) {
          const batchPromises = [];
          for (let i = 0; i < missingIds.length; i += 30) {
            const chunk = missingIds.slice(i, i + 30);
            batchPromises.push(
              getDocs(query(collection(db, 'question_bank'), where(documentId(), 'in', chunk)))
                .catch(err => {
                  console.warn('Batch question fetch failed in Analytics:', err);
                  return { docs: [] };
                })
            );
          }
          try {
            const batchResults = await Promise.all(batchPromises);
            batchResults.forEach(snap => {
              snap.docs?.forEach(d => {
                questionsMap[d.id] = { id: d.id, ...d.data() };
              });
            });
          } catch (err) {
            console.warn('Error fetching question batch in Analytics:', err);
          }
        }
        const fetchedAttributes = attributesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const deptAttrs = fetchedAttributes.filter(a => a.type === 'department' && !isCommonDeptName(a.name));

        const resolveDept = (rawDept) => {
          const raw = (rawDept || '').trim();
          if (!raw) return 'General';
          const attr = deptAttrs.find(a => sameDepartment(a.name, raw));
          if (attr) {
            if (raw === attr.name) return attr.name;
            const hasExactAttrTest = fetchedTests.some(x => (x.department || '').trim() === attr.name);
            if (hasExactAttrTest) return attr.name;
            const variant = fetchedTests.find(x => {
              const d = (x.department || '').trim();
              return d && sameDepartment(d, raw);
            });
            if (variant) return (variant.department || '').trim();
            return attr.name;
          }
          return raw;
        };

        // Allowed emails for this department/global view
        let validEmails = null;
        if (department && joinedStudents) {
           const departmentStudents = joinedStudents.filter(s => sameDepartment(s.department, department));
           validEmails = departmentStudents.map(s => s.email?.toLowerCase()).filter(Boolean);
        }

        const tAnalytics = {};
        const sHistory = {};

        fetchedTests.forEach(test => {
          const normalizedDept = resolveDept(test.department);
          tAnalytics[test.id] = {
            id: test.id,
            title: test.title || 'Untitled Test',
            category: test.subject || normalizedDept || 'General',
            department: normalizedDept,
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

          // Responses are saved in the test's standard order; questionOrder is the shuffled order
          // this student saw the questions in (attempts from before shuffling don't have it)
          const shownPos = Array.isArray(attempt.questionOrder) ? new Map(attempt.questionOrder.map((id, i) => [id, i + 1])) : null;

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
                questionId: r.questionId,
                shownAs: shownPos?.get(r.questionId) || null,
                q: qData.questionText || "Question text unavailable",
                qImage: qData.questionImageUrl || null,
                // Group I / Group II of a Match question - its options ("P-2, Q-1...") refer to them
                matchColumn1: qData.matchColumn1 || [],
                matchColumn2: qData.matchColumn2 || [],
                selected: formatAnswer(r.selectedAnswer),
                correct: formatAnswer(r.correctAnswer) || 'Unknown',
                explanation: qData.explanation || 'No explanation provided.',
                status,
                timeSpent: formatTime(r.timeSpent || 0),
                isFillBlank,
                questionType: qData.questionType || 'Single Choice',
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
            // Per question, not per position, so every student's answer to it is counted together
            const qKey = q.questionId || q.qIndex || (idx + 1);
            if (!testSummary.questionStats[qKey]) {
              testSummary.questionStats[qKey] = {
                qIndex: q.qIndex || (idx + 1),
                qText: q.q,
                qImage: q.qImage,
                matchColumn1: q.matchColumn1,
                matchColumn2: q.matchColumn2,
                options: q.options,
                isFillBlank: q.isFillBlank,
                questionType: q.questionType,
                marks: q.marks,
                total: 0,
                correct: 0,
                wrong: 0,
                unattempted: 0,
                totalTimeSeconds: 0
              };
            }
            testSummary.questionStats[qKey].total++;
            testSummary.questionStats[qKey].totalTimeSeconds = (testSummary.questionStats[qKey].totalTimeSeconds || 0) + (q.timeSeconds || 0);
            if (q.status === 'Correct') testSummary.questionStats[qKey].correct++;
            else if (q.status === 'Wrong') testSummary.questionStats[qKey].wrong++;
            else testSummary.questionStats[qKey].unattempted++;

            if (q.questionId) testSummary.questionStats[q.questionId] = testSummary.questionStats[qKey];
            if (q.qIndex) testSummary.questionStats[q.qIndex] = testSummary.questionStats[qKey];
            testSummary.questionStats[idx + 1] = testSummary.questionStats[qKey];
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
            department: testSummary.department || '',
            studentEmail: attempt.studentEmail || '',
            studentName: attempt.studentName || sName,
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
      } finally {
        setIsLoading(false);
      }
    };
    // Failsafe timeout to prevent infinite spinner if network stalls
    const safetyTimer = setTimeout(() => {
      setIsLoading(false);
    }, 10000);
    fetchData().finally(() => clearTimeout(safetyTimer));
    return () => clearTimeout(safetyTimer);
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

  // Helper to resolve student department
  const resolveStudentDept = (sName, sEmail, historyAttempts) => {
    if (sEmail) {
      const byEmail = enrolledStudents.find(s => s.email && s.email.trim().toLowerCase() === sEmail.trim().toLowerCase());
      if (byEmail?.department?.trim()) return byEmail.department.trim();
    }
    if (sName) {
      const byName = enrolledStudents.find(s => s.name && s.name.trim().toLowerCase() === sName.trim().toLowerCase());
      if (byName?.department?.trim()) return byName.department.trim();
    }
    if (Array.isArray(historyAttempts) && historyAttempts.length > 0) {
      const deptAttempt = historyAttempts.find(a => a.test?.department || a.department);
      const d = deptAttempt?.test?.department || deptAttempt?.department;
      if (d && d.trim()) return d.trim();
    }
    return 'General';
  };

  // Build unified student directory list
  const studentDirectoryList = React.useMemo(() => {
    const map = new Map();

    // 1. Enrolled students
    (enrolledStudents || []).forEach(st => {
      if (department && !sameDepartment(st.department, department)) return;
      const key = (st.name || st.email || '').trim();
      if (!key) return;
      map.set(key.toLowerCase(), {
        id: st.id,
        name: st.name || st.email || 'Unknown',
        email: (st.email || '').trim(),
        department: (st.department || 'General').trim(),
        college: st.college || '',
      });
    });

    // 2. Students from computedStudentHistory
    Object.entries(computedStudentHistory).forEach(([sName, attempts]) => {
      const first = attempts[0] || {};
      const sEmail = (first.studentEmail || '').trim();
      const key = sName.trim().toLowerCase();

      let existingKey = map.has(key) ? key : null;
      if (!existingKey && sEmail) {
        for (const [k, v] of map.entries()) {
          if (v.email && v.email.toLowerCase() === sEmail.toLowerCase()) {
            existingKey = k;
            break;
          }
        }
      }

      const dept = resolveStudentDept(sName, sEmail, attempts);
      if (department && !sameDepartment(dept, department)) return;

      if (existingKey) {
        const existing = map.get(existingKey);
        if (!existing.email && sEmail) existing.email = sEmail;
        if (!existing.department || existing.department === 'General') existing.department = dept;
      } else {
        map.set(key, {
          id: first.id || sName,
          name: sName,
          email: sEmail,
          department: dept,
          college: '',
        });
      }
    });

    return Array.from(map.values()).map(st => {
      let history = computedStudentHistory[st.name];
      if (!history && st.email) {
        const matchEntry = Object.entries(computedStudentHistory).find(([_, list]) => 
          list.some(a => (a.studentEmail || '').toLowerCase() === st.email.toLowerCase())
        );
        if (matchEntry) history = matchEntry[1];
      }
      if (!history) history = [];

      const totalTests = history.length;
      const avgScore = totalTests > 0 
        ? Math.round((history.reduce((acc, t) => acc + (t.score || 0), 0) / totalTests) * 100) / 100 
        : 0;

      return {
        ...st,
        history,
        totalTests,
        avgScore
      };
    });
  }, [enrolledStudents, computedStudentHistory, department]);

  const availableStudentDepts = React.useMemo(() => {
    return Array.from(new Set(studentDirectoryList.map(s => s.department).filter(Boolean))).sort();
  }, [studentDirectoryList]);

  const filteredStudents = React.useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    return studentDirectoryList.filter(st => {
      if (selectedStudentDeptFilter !== 'All' && !sameDepartment(st.department, selectedStudentDeptFilter)) {
        return false;
      }
      if (q) {
        const matchName = (st.name || '').toLowerCase().includes(q);
        const matchEmail = (st.email || '').toLowerCase().includes(q);
        const matchDept = (st.department || '').toLowerCase().includes(q);
        const matchCollege = (st.college || '').toLowerCase().includes(q);
        return matchName || matchEmail || matchDept || matchCollege;
      }
      return true;
    });
  }, [studentDirectoryList, studentSearch, selectedStudentDeptFilter]);

  const studentsByDept = React.useMemo(() => {
    const groups = {};
    filteredStudents.forEach(st => {
      const d = st.department || 'General';
      if (!groups[d]) groups[d] = [];
      groups[d].push(st);
    });
    Object.keys(groups).forEach(d => {
      groups[d].sort((a, b) => (b.totalTests - a.totalTests) || a.name.localeCompare(b.name));
    });
    return groups;
  }, [filteredStudents]);

  const studentDepts = Object.keys(studentsByDept).sort();
  const allStudentDeptsExpanded = studentDepts.length > 0 && studentDepts.every(d => expandedStudentDepts[d]);

  const selectedStudentObj = React.useMemo(() => {
    if (!selectedStudentName) return null;
    return studentDirectoryList.find(s => 
      s.name.trim().toLowerCase() === selectedStudentName.trim().toLowerCase() ||
      (studentViewOnlyEmail && s.email.toLowerCase() === studentViewOnlyEmail.toLowerCase())
    ) || null;
  }, [selectedStudentName, studentDirectoryList, studentViewOnlyEmail]);

  const activeStudentData = React.useMemo(() => {
    if (!selectedStudentName) return [];
    if (computedStudentHistory[selectedStudentName]?.length) {
      return computedStudentHistory[selectedStudentName];
    }
    if (selectedStudentObj?.history?.length) {
      return selectedStudentObj.history;
    }
    const studentEmail = selectedStudentObj?.email?.toLowerCase();
    for (const [key, attempts] of Object.entries(computedStudentHistory)) {
      if (key.trim().toLowerCase() === selectedStudentName.trim().toLowerCase()) {
        return attempts;
      }
      if (studentEmail && attempts.some(a => (a.studentEmail || '').toLowerCase() === studentEmail)) {
        return attempts;
      }
    }
    return [];
  }, [selectedStudentName, computedStudentHistory, selectedStudentObj]);

  const selectedStudentDept = selectedStudentObj?.department || 
    resolveStudentDept(selectedStudentName, selectedStudentObj?.email, activeStudentData);
  const selectedStudentPalette = paletteFor(selectedStudentDept);

  const studentTotalAttempts = studentDirectoryList.reduce((acc, s) => acc + s.totalTests, 0);
  const studentActiveCount = studentDirectoryList.filter(s => s.totalTests > 0).length;

  const studentOverviewStats = [
    { label: 'Total Students', value: studentDirectoryList.length, icon: Users, tile: 'bg-blue-50/70 border-blue-100', iconBg: 'from-blue-500 to-indigo-600' },
    { label: 'Active Test Takers', value: studentActiveCount, icon: Target, tile: 'bg-emerald-50/70 border-emerald-100', iconBg: 'from-emerald-500 to-teal-600' },
    { label: 'Total Attempts', value: studentTotalAttempts, icon: Award, tile: 'bg-violet-50/70 border-violet-100', iconBg: 'from-violet-500 to-purple-600' },
    { label: 'Departments', value: availableStudentDepts.length, icon: GraduationCap, tile: 'bg-amber-50/70 border-amber-100', iconBg: 'from-amber-500 to-orange-600' },
  ];
  const activeDetailedTest = detailedTestId ? (
    (activeStudentData && activeStudentData.find(t => t.id === detailedTestId)) ||
    Object.values(computedStudentHistory).flat().find(t => t.id === detailedTestId) ||
    null
  ) : null;
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
    setViewingFromGlobalTestId(null);
  };

  const openGlobalTestDetail = (id) => {
    setDetailedGlobalTestId(id);
    setGlobalTestTab('overview');
    setViewingFromGlobalTestId(null);
    setLeaderboardSearch('');
  };

  const closeGlobalTestDetail = () => {
    setDetailedGlobalTestId(null);
    setViewingFromGlobalTestId(null);
    setDetailedTestId(null);
    setLeaderboardSearch('');
  };

  const openStudentTestFromGlobal = (student) => {
    setSelectedStudentName(student.name);
    setDetailedTestId(student.id);
    setViewingFromGlobalTestId(detailedGlobalTestId);
    setFilterStatus('All');
  };

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const handleExportPdf = async () => {
    if (!activeGlobalTest || isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      await exportTestReportPdf(activeGlobalTest);
      showToast('Test report PDF downloaded successfully.', 'success');
    } catch (err) {
      console.error('Failed to export test report PDF', err);
      showToast('Could not create the PDF. Please try again.', 'error');
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
    setViewingFromGlobalTestId(null);
    setLeaderboardSearch('');
  };

  // If search changes, reset detailed view
  const handleSearchChange = (e) => {
    setStudentSearch(e.target.value);
  };

  // Helper to color percentage rings (>=60% green, 40-59% yellow, <40% red)
  const getScoreColor = (percent) => {
    if (percent >= 60) return 'text-emerald-500 bg-emerald-500';
    if (percent >= 40) return 'text-amber-500 bg-amber-500';
    return 'text-rose-500 bg-rose-500';
  };

  const renderTestReportView = (attempt, studentName, onBackHandler) => {
    if (!attempt) return null;
    const isKeyHidden = !!studentViewOnlyEmail && !attempt.solutionsVisible;
    const activeTestSummary = attempt?.testId ? computedTestAnalytics[attempt.testId] : null;

    return (
      <TestReport
        attempt={attempt}
        studentName={studentName}
        hideKey={isKeyHidden}
        onBack={onBackHandler}
        onReviewSolutions={onReviewSolutions}
        solutions={(
          <div className="flex flex-col">
            {/* Timing Benchmarks & Symbol Reference Guide */}
            <div className="mb-6 bg-slate-50/80 border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-200/70 flex items-center justify-between gap-3 bg-white/70">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <HelpCircle size={14} />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="text-[13px] font-bold text-slate-800">Timing Benchmarks &amp; Symbol Guide</span>
                    <span className="text-[11px] font-medium text-slate-400 hidden sm:inline">
                      • Topper comparison, average speed &amp; status indicators
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLegend(prev => !prev)}
                  className="text-[11.5px] font-semibold text-slate-600 hover:text-indigo-600 px-2.5 py-1 rounded-md hover:bg-slate-100 transition-colors shrink-0"
                >
                  {showLegend ? 'Hide Guide' : 'Show Guide'}
                </button>
              </div>

              {showLegend && (
                <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
                  {/* 1. Topper Result & Border Meaning */}
                  <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 flex flex-col justify-between shadow-xs">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Crown size={13} className="text-amber-500" />
                        <span className="font-bold text-slate-800 text-[12px]">Topper Border Indicators</span>
                      </div>
                      <p className="text-slate-500 text-[11px] leading-relaxed mb-3">
                        The Rank 1 Topper badge uses colored borders to indicate their result on each question:
                      </p>
                    </div>
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                          <span className="w-2.5 h-2.5 rounded-full border-2 border-emerald-500 bg-emerald-50" />
                          Green Border
                        </span>
                        <span className="text-slate-600 font-medium">Topper was Correct</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-rose-700">
                          <span className="w-2.5 h-2.5 rounded-full border-2 border-rose-500 bg-rose-50" />
                          Red Border
                        </span>
                        <span className="text-slate-600 font-medium">Topper was Wrong</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-slate-500">
                          <span className="w-2.5 h-2.5 rounded-full border-2 border-slate-300 bg-slate-50" />
                          Gray Border
                        </span>
                        <span className="text-slate-600 font-medium">Topper Skipped</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Speed & Timing Comparisons */}
                  <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 flex flex-col justify-between shadow-xs">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Clock size={13} className="text-indigo-500" />
                        <span className="font-bold text-slate-800 text-[12px]">Question Pacing</span>
                      </div>
                      <p className="text-slate-500 text-[11px] leading-relaxed mb-3">
                        Benchmark your speed against the batch average and the top-ranking candidate:
                      </p>
                    </div>
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 font-bold text-slate-700 text-[10px]">
                          <Clock size={10} className="text-blue-500" /> You
                        </span>
                        <span className="text-slate-600 font-medium">Your time spent on this question</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 font-bold text-indigo-700 text-[10px]">
                          <Clock size={10} className="text-indigo-500" /> Avg
                        </span>
                        <span className="text-slate-600 font-medium">Class average across all test takers</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 font-bold text-amber-800 text-[10px]">
                          <Crown size={10} className="text-amber-500" /> Topper
                        </span>
                        <span className="text-slate-600 font-medium">Time achieved by Rank 1 Topper</span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Evaluation & Marking Format */}
                  <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 flex flex-col justify-between shadow-xs">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <CheckCircle2 size={13} className="text-emerald-500" />
                        <span className="font-bold text-slate-800 text-[12px]">Scoring &amp; Question Format</span>
                      </div>
                      <div className="space-y-1 text-[11px] text-slate-600 mb-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 size={12} className="text-emerald-500" /> Correct
                          </span>
                          <span>Full marks awarded</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-rose-700 flex items-center gap-1">
                            <XCircle size={12} className="text-rose-500" /> Wrong
                          </span>
                          <span>Negative marks (MCQ only)</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-500 flex items-center gap-1">
                            <MinusCircle size={12} className="text-slate-400" /> Unattempted
                          </span>
                          <span>0 marks change</span>
                        </div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-medium">Types:</span>
                      <div className="flex items-center gap-1 font-mono font-bold text-[9.5px]">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">MCQ</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">MSQ</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">NAT</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">MATCH</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2 mb-8 bg-slate-50 p-2 rounded-xl border border-slate-200">
              {['All', 'Correct', 'Wrong', 'Unattempted'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${filterStatus === status ? 'bg-white shadow-sm border border-slate-200 text-slate-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                >
                  {status} ({status === 'All' ? (attempt.allQuestions || []).length : (attempt.allQuestions || []).filter(q => q.status === status).length})
                </button>
              ))}
            </div>

            {isKeyHidden && (
              <div className="mb-6 flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl px-5 py-4 text-sm font-semibold">
                <AlertCircle size={18} className="shrink-0 text-amber-500" />
                Correct answers and explanations will appear here once your teacher releases the solutions for this test.
              </div>
            )}

            {/* Detailed Questions List */}
            <div className="space-y-6">
              {(() => {
                const allQ = attempt.allQuestions || [];
                const filteredQuestions = filterStatus === 'All' 
                  ? allQ 
                  : allQ.filter(q => q.status === filterStatus);

                return filteredQuestions.length > 0 ? (
                  filteredQuestions.map((q, i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
                      
                      {/* Header of Question */}
                      <div className={`px-6 py-4 border-b flex justify-between items-center ${q.status === 'Correct' ? 'bg-emerald-50 border-emerald-100' : q.status === 'Wrong' ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-black text-slate-500 bg-white border border-slate-200 w-8 h-8 flex items-center justify-center rounded-xl shadow-sm">
                            Q{q.qIndex}
                          </span>
                          {q.shownAs && q.shownAs !== q.qIndex && (
                            <span className="text-[11px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-lg" title="Questions are shuffled for each student - this is the number this student saw">
                              Seen as Q{q.shownAs}
                            </span>
                          )}
                          {q.status === 'Correct' && <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700"><CheckCircle2 size={16} className="text-emerald-500"/> Correct</span>}
                          {q.status === 'Wrong' && <span className="flex items-center gap-1.5 text-xs font-bold text-red-700"><XCircle size={16} className="text-red-500"/> Wrong</span>}
                          {q.status === 'Unattempted' && <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600"><MinusCircle size={16} className="text-slate-400"/> Unattempted</span>}
                        </div>
                        {(() => {
                          const qStat = activeTestSummary?.questionStats?.[q.questionId]
                            || activeTestSummary?.questionStats?.[q.qIndex]
                            || activeTestSummary?.questionStats?.[i + 1]
                            || (activeTestSummary?.questionStats ? Object.values(activeTestSummary.questionStats).find(s => s.qText === q.q) : null);
                          const qAvgSecs = qStat && qStat.total > 0 ? Math.round((qStat.totalTimeSeconds || 0) / qStat.total) : null;
                          const qAvgTime = qAvgSecs !== null ? formatTime(qAvgSecs) : null;

                          const topperQ = topperAttempt
                            ? topperAttempt.allQuestions.find(tq => (q.questionId ? tq.questionId === q.questionId : tq.q === q.q))
                            : null;
                          const topperBorder = isKeyHidden ? 'border border-amber-300'
                            : topperQ?.status === 'Correct' ? 'border-2 border-emerald-500'
                            : topperQ?.status === 'Wrong' ? 'border-2 border-red-500'
                            : 'border-2 border-slate-300';
                          const topperStatusLabel = isKeyHidden ? '' : ` (${topperQ?.status || 'Unattempted'})`;

                          return (
                            <div className="flex items-center gap-2 flex-wrap justify-end">
                              {/* Question Type */}
                              <div className="text-[10px] font-bold text-blue-700 bg-blue-100/50 border border-blue-200 px-2 py-1 rounded-md uppercase">
                                {(q.questionType === 'Multiple Choice' || q.questionType === 'Multiple Select') ? 'MSQ' : (q.questionType === 'Fill in Blanks' || q.questionType === 'Numerical Answer Type') ? 'NAT' : q.questionType === 'Match' ? 'MATCH' : 'MCQ'}
                              </div>

                              {/* Topper's Time Badge with Gold Crown and Colored Border */}
                              {topperQ && (
                                <div 
                                  className={`flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl shadow-sm ${topperBorder}`} 
                                  title={`Topper's Time: ${topperQ.timeSpent}${topperStatusLabel} - Gold Crown represents Rank 1 Topper`}
                                >
                                  <Crown size={12} className="text-amber-500 shrink-0" />
                                  <span>Topper: {topperQ.timeSpent}</span>
                                </div>
                              )}

                              {/* Average Time Badge for this Question */}
                              {qAvgTime && (
                                <div 
                                  className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl shadow-sm"
                                  title={`Average Time: ${qAvgTime} (Mean time taken by all test takers on this question)`}
                                >
                                  <Clock size={13} className="text-indigo-500" />
                                  <span>Avg: {qAvgTime}</span>
                                </div>
                              )}

                              {/* Student's Actual Time */}
                              <div 
                                className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm" 
                                title="Time you spent on this question"
                              >
                                <Clock size={13} className="text-blue-500" />
                                <span>You: {q.timeSpent}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="p-6">
                        <p className="font-[800] text-slate-800 mb-6 text-base leading-relaxed tracking-tight" dangerouslySetInnerHTML={{ __html: q.q }} />
                        {q.qImage && <img src={q.qImage} alt="Question" className="max-w-full h-auto mb-6 rounded-lg border border-slate-200 shadow-sm" />}
                        <MatchColumns question={q} className="mb-6" />
                        
                        {q.options ? (
                          <div className="flex flex-col gap-3 mb-6">
                            {['A', 'B', 'C', 'D'].map(optKey => {
                              const opt = q.options[optKey];
                              if (!opt || (!opt.text && !opt.image)) return null;
                              
                              const letters = (ans) => String(ans || '').replace(/^Option\s+/, '').split(',').map(s => s.trim());
                              const isSelected = letters(q.selected).includes(optKey);
                              const isCorrect = !isKeyHidden && letters(q.correct).includes(optKey);
                              
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
                              } else if (isSelected && isKeyHidden) {
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
                            {q.status !== 'Correct' && !isKeyHidden && (
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
                        
                        {!isKeyHidden && (
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
    );
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
          <div className="max-w-6xl mx-auto flex flex-col gap-8 pb-12">
            {!detailedGlobalTestId ? (
              // LIST VIEW - overview, then one card per department with its tests grouped by subject
              (() => {
                const allTests = Object.values(computedTestAnalytics);
                const q = testSearch.trim().toLowerCase();
                const shown = q ? allTests.filter(t => [t.title, t.subject, t.department].some(v => String(v || '').toLowerCase().includes(q))) : allTests;
                const tree = shown.reduce((acc, test) => {
                  const d = test.department || 'General';
                  const s = test.subject || 'General';
                  if (!acc[d]) acc[d] = {};
                  if (!acc[d][s]) acc[d][s] = [];
                  acc[d][s].push(test);
                  return acc;
                }, {});
                const depts = Object.keys(tree).sort();
                const allExpanded = depts.length > 0 && depts.every(d => expandedFolders[d]);

                const attemptsOf = (tests) => tests.reduce((a, t) => a + (t.participants || 0), 0);
                // average of the tests' average scores, weighted by how many students took each
                const avgOf = (tests) => {
                  const n = attemptsOf(tests);
                  return n ? Math.round(tests.reduce((a, t) => a + (t.avgScore || 0) * (t.participants || 0), 0) / n) : 0;
                };
                const scoreTone = (pct) => (pct >= 60 ? { bar: 'bg-emerald-500', text: 'text-emerald-600', soft: 'bg-emerald-50' } : pct >= 40 ? { bar: 'bg-amber-500', text: 'text-amber-600', soft: 'bg-amber-50' } : { bar: 'bg-rose-500', text: 'text-rose-600', soft: 'bg-rose-50' });

                const overview = [
                  { label: 'Tests', value: allTests.length, icon: FileText, tile: 'bg-blue-50/70 border-blue-100', iconBg: 'from-blue-500 to-indigo-600' },
                  { label: 'Total attempts', value: attemptsOf(allTests), icon: Users, tile: 'bg-violet-50/70 border-violet-100', iconBg: 'from-violet-500 to-purple-600' },
                  { label: 'Average score', value: `${avgOf(allTests)}%`, icon: TrendingUp, tile: 'bg-emerald-50/70 border-emerald-100', iconBg: 'from-emerald-500 to-teal-600' },
                  { label: 'Best score', value: `${allTests.reduce((m, t) => Math.max(m, t.highestScore || 0), 0)}%`, icon: Award, tile: 'bg-amber-50/70 border-amber-100', iconBg: 'from-amber-500 to-orange-600' },
                ];

                return (
                  <div className="flex flex-col gap-6">
                    {/* Overview */}
                    <div className="bg-white rounded-[24px] border border-[#EEF2F7] shadow-[0_10px_28px_rgba(15,23,42,0.04)] p-4 sm:p-5">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {overview.map(st => (
                          <div key={st.label} className={`rounded-[18px] border px-4 py-3.5 flex items-center gap-3 ${st.tile}`}>
                            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${st.iconBg} text-white flex items-center justify-center shrink-0 shadow-md`}><st.icon size={20} /></div>
                            <div className="min-w-0">
                              <div className="text-[24px] font-bold text-[#0F172A] leading-none">{st.value}</div>
                              <div className="text-[12.5px] font-medium text-[#64748B] mt-1 truncate">{st.label}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Search + expand */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="relative group flex-1 min-w-[240px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-[#2563EB] transition-colors" size={19} />
                        <input
                          value={testSearch}
                          onChange={e => setTestSearch(e.target.value)}
                          placeholder="Search tests by name, subject or department..."
                          className="w-full h-[46px] pl-11 pr-4 bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-[14px] text-[14px] font-medium text-[#0F172A] placeholder:text-[#94A3B8] placeholder:font-normal outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 transition-all"
                        />
                      </div>
                      {depts.length > 0 && (
                        <button
                          onClick={() => setExpandedFolders(allExpanded ? {} : Object.fromEntries(depts.map(d => [d, true])))}
                          className="h-[46px] px-4 rounded-[14px] bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] text-[13px] font-bold text-[#2563EB] hover:bg-blue-50 transition-colors"
                        >
                          {allExpanded ? 'Collapse all' : 'Expand all'}
                        </button>
                      )}
                    </div>

                    {depts.length === 0 ? (
                      <div className="bg-white rounded-[24px] border border-[#EEF2F7] p-12 text-center text-slate-400 font-bold">
                        {allTests.length === 0 ? 'No tests found.' : 'No tests match your search.'}
                      </div>
                    ) : depts.map(dept => {
                      const subjects = tree[dept];
                      const deptTests = Object.values(subjects).flat();
                      const expanded = !!expandedFolders[dept] || !!q;
                      const p = paletteFor(dept);
                      const mono = dept === 'General' ? 'GN' : monogramOf(dept);
                      const deptAvg = avgOf(deptTests);
                      return (
                        <div key={dept} className="bg-white rounded-[24px] border border-[#EEF2F7] shadow-[0_10px_28px_rgba(15,23,42,0.04)] overflow-hidden">
                          <button
                            onClick={() => toggleFolder(dept)}
                            className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-[#F8FAFF] transition-colors"
                          >
                            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${p.badge} text-white flex items-center justify-center shrink-0 shadow-md`}>
                              <span className={`font-[900] tracking-tight ${mono.length > 2 ? 'text-[13px]' : 'text-[16px]'}`}>{mono}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-[16px] text-[#0F172A] truncate">{dept}</h4>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[12.5px] font-semibold text-[#64748B]">
                                <span>{deptTests.length} {deptTests.length === 1 ? 'test' : 'tests'}</span>
                                <span className="text-slate-300">•</span>
                                <span>{attemptsOf(deptTests)} attempts</span>
                                <span className="text-slate-300">•</span>
                                <span className={scoreTone(deptAvg).text}>avg {deptAvg}%</span>
                              </div>
                            </div>
                            <ChevronRight size={20} className={`text-slate-400 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
                          </button>

                          {expanded && (
                            <div className="px-5 pb-5 pt-1 space-y-5 border-t border-[#EEF2F7]">
                              {Object.keys(subjects).sort().map(subj => (
                                <div key={subj} className="pt-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <span className={`w-1.5 h-4 rounded-full bg-gradient-to-b ${p.badge}`} />
                                    <span className="text-[12px] font-bold uppercase tracking-wider text-[#475569]">{subj}</span>
                                    <span className="text-[11px] font-bold text-[#94A3B8]">{subjects[subj].length}</span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                                    {subjects[subj].map(test => {
                                      const tone = scoreTone(test.avgScore || 0);
                                      return (
                                        <button
                                          key={test.id}
                                          onClick={() => openGlobalTestDetail(test.id)}
                                          className="group text-left rounded-[18px] border border-[#EEF2F7] bg-[#FBFCFE] hover:bg-white hover:border-blue-200 hover:shadow-[0_12px_28px_rgba(37,99,235,0.10)] hover:-translate-y-0.5 transition-all duration-200 p-4 flex flex-col gap-3"
                                        >
                                          <div className="flex items-start justify-between gap-3">
                                            <span className="font-bold text-[14px] text-[#0F172A] group-hover:text-[#2563EB] leading-snug line-clamp-2">{test.title}</span>
                                            <ChevronRight size={16} className="text-slate-300 group-hover:text-[#2563EB] shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-all" />
                                          </div>
                                          <div className="flex items-center gap-3 text-[12px] font-semibold text-[#64748B]">
                                            <span className="flex items-center gap-1"><Clock size={13} /> {test.date || '-'}</span>
                                            <span className="flex items-center gap-1"><Users size={13} /> {test.participants || 0} {test.participants === 1 ? 'attempt' : 'attempts'}</span>
                                          </div>
                                          <div>
                                            <div className="flex items-center justify-between text-[12px] font-bold mb-1.5">
                                              <span className="text-[#94A3B8] uppercase tracking-wider text-[10.5px]">Avg score</span>
                                              <span className={tone.text}>{test.participants ? `${test.avgScore || 0}%` : 'No attempts'}</span>
                                            </div>
                                            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                              <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${Math.min(100, test.avgScore || 0)}%` }} />
                                            </div>
                                            {test.participants > 0 && (
                                              <div className="mt-2 text-[11.5px] font-semibold text-[#64748B]">Highest <span className="text-[#0F172A] font-bold">{test.highestScore || 0}%</span></div>
                                            )}
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            ) : (viewingFromGlobalTestId && detailedTestId && activeDetailedTest) ? (
              // DRILLED-DOWN STUDENT INDIVIDUAL ANALYSIS FROM LEADERBOARD
              <div className="flex flex-col animate-in fade-in duration-300">
                <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => {
                        setDetailedTestId(null);
                        setViewingFromGlobalTestId(null);
                      }}
                      className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors bg-slate-50 hover:bg-blue-50 px-4 py-2 rounded-xl border border-slate-200"
                    >
                      <ArrowLeft size={16} /> Back to Leaderboard
                    </button>
                    <div>
                      <span className="text-xs font-black text-blue-600 uppercase tracking-widest block">Individual Test Analysis</span>
                      <h4 className="text-xl md:text-2xl font-[900] tracking-tight text-slate-800">{activeGlobalTest.title}</h4>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 bg-blue-50/80 px-4 py-2.5 rounded-2xl border border-blue-100">
                    <UserCircle2 size={20} className="text-blue-600" />
                    <span className="font-extrabold text-blue-900 text-sm">{selectedStudentName || activeDetailedTest.name}</span>
                  </div>
                </div>

                {renderTestReportView(
                  activeDetailedTest,
                  selectedStudentName || activeDetailedTest.name,
                  () => {
                    setDetailedTestId(null);
                    setViewingFromGlobalTestId(null);
                  }
                )}
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
                  <div className="xl:col-span-5 xl:self-start flex flex-col bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <h4 className="text-[15px] font-[900] text-slate-800 mb-8 flex items-center gap-2">
                      <BarChart2 size={18} className="text-blue-500"/> Score Distribution
                    </h4>
                    <div className="w-full h-[320px]">
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
                          value={leaderboardSearch}
                          onChange={(e) => setLeaderboardSearch(e.target.value)}
                          className="bg-transparent border-none outline-none text-xs text-slate-600 font-medium placeholder:text-slate-400 w-32 focus:w-44 transition-all"
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
                      {(() => {
                        const filteredLeaderboard = activeGlobalTest.students
                          .filter(s => (s.name || '').toLowerCase().includes(leaderboardSearch.toLowerCase()))
                          .sort((a, b) => b.score - a.score);

                        if (filteredLeaderboard.length === 0) {
                          return (
                            <div className="text-center py-8 text-slate-400 font-medium text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                              No students found matching "{leaderboardSearch}".
                            </div>
                          );
                        }

                        return filteredLeaderboard.map((student, idx) => {
                          const percent = Math.round((student.score / student.maxScore) * 100);
                          const colorClass = getScoreColor(percent).split(' ')[1]; // bg-color
                          const textClass = getScoreColor(percent).split(' ')[0]; // text-color
                          
                          return (
                            <div 
                              key={student.id} 
                              onClick={() => openStudentTestFromGlobal(student)}
                              title={`Click to view ${student.name}'s individual test analysis`}
                              className="grid grid-cols-12 gap-4 px-4 py-3.5 items-center bg-white border border-slate-100 hover:border-blue-400 hover:bg-blue-50/20 rounded-2xl transition-all hover:shadow-sm cursor-pointer group"
                            >
                              
                              {/* Student Profile Info */}
                              <div className="col-span-5 flex items-center gap-3 min-w-0">
                                <div className="relative shrink-0">
                                  <div className="w-9 h-9 rounded-full bg-slate-100 group-hover:bg-blue-100 text-slate-600 group-hover:text-blue-700 font-[900] text-sm flex items-center justify-center border border-slate-200 group-hover:border-blue-300 transition-colors">
                                    {(student.name || 'S').split(' ').map(n => n[0]).join('').slice(0, 2)}
                                  </div>
                                  {idx === 0 && <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 border-2 border-white rounded-full flex items-center justify-center shadow-sm text-[10px]">👑</div>}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="font-[800] text-slate-800 text-[14px] truncate group-hover:text-blue-600 transition-colors">{student.name}</span>
                                  <span className="text-[11px] font-semibold text-slate-400 group-hover:text-blue-500/70 transition-colors flex items-center gap-1">
                                    View individual analysis &rarr;
                                  </span>
                                </div>
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

                              {/* Time Taken & Action */}
                              <div className="col-span-3 flex items-center justify-end gap-2">
                                <div className="flex items-center gap-1.5 bg-slate-50 group-hover:bg-white px-2.5 py-1.5 rounded-lg border border-slate-100 group-hover:border-blue-200 transition-colors">
                                  <Clock size={12} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                                  <span className="text-xs font-bold text-slate-600 tracking-tight">{student.timeTaken}</span>
                                </div>
                                <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                              </div>

                            </div>
                          );
                        });
                      })()}
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
                                    <MatchColumns question={q} className="mt-3" />
                                  </div><div className="shrink-0 text-[10px] font-bold text-blue-700 bg-blue-100/50 border border-blue-200 px-2 py-1 rounded-md uppercase">{(q.questionType === 'Multiple Choice' || q.questionType === 'Multiple Select') ? 'MSQ' : (q.questionType === 'Fill in Blanks' || q.questionType === 'Numerical Answer Type') ? 'NAT' : q.questionType === 'Match' ? 'MATCH' : 'MCQ'}</div>
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
          <div className="max-w-6xl mx-auto flex flex-col gap-6 pb-12">
            
            {!selectedStudentName ? (
              // 1. STUDENT DIRECTORY LIST VIEW (GROUPED BY DEPARTMENT)
              <div className="flex flex-col gap-6">
                
                {/* Overview Stats */}
                <div className="bg-white rounded-[24px] border border-[#EEF2F7] shadow-[0_10px_28px_rgba(15,23,42,0.04)] p-4 sm:p-5">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {studentOverviewStats.map(st => (
                      <div key={st.label} className={`rounded-[18px] border px-4 py-3.5 flex items-center gap-3 ${st.tile}`}>
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${st.iconBg} text-white flex items-center justify-center shrink-0 shadow-md`}>
                          <st.icon size={20} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[24px] font-bold text-[#0F172A] leading-none">{st.value}</div>
                          <div className="text-[12.5px] font-medium text-[#64748B] mt-1 truncate">{st.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Search & Department Filter Bar */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative group flex-1 min-w-[240px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-[#2563EB] transition-colors" size={19} />
                    <input
                      value={studentSearch}
                      onChange={handleSearchChange}
                      placeholder="Search students by name, email or department..."
                      className="w-full h-[46px] pl-11 pr-4 bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-[14px] text-[14px] font-medium text-[#0F172A] placeholder:text-[#94A3B8] placeholder:font-normal outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>

                  {availableStudentDepts.length > 1 && (
                    <div className="w-full sm:w-auto min-w-[200px]">
                      <select
                        value={selectedStudentDeptFilter}
                        onChange={(e) => setSelectedStudentDeptFilter(e.target.value)}
                        className="w-full h-[46px] px-3.5 bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-[14px] text-[13.5px] font-bold text-[#0F172A] outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
                      >
                        <option value="All">All Departments ({studentDirectoryList.length})</option>
                        {availableStudentDepts.map(d => {
                          const count = studentDirectoryList.filter(s => sameDepartment(s.department, d)).length;
                          return <option key={d} value={d}>{d} ({count})</option>;
                        })}
                      </select>
                    </div>
                  )}

                  {studentDepts.length > 0 && (
                    <button
                      onClick={() => setExpandedStudentDepts(allStudentDeptsExpanded ? {} : Object.fromEntries(studentDepts.map(d => [d, true])))}
                      className="h-[46px] px-4 rounded-[14px] bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] text-[13px] font-bold text-[#2563EB] hover:bg-blue-50 transition-colors shrink-0"
                    >
                      {allStudentDeptsExpanded ? 'Collapse all' : 'Expand all'}
                    </button>
                  )}
                </div>

                {/* Department Accordion Cards */}
                {studentDepts.length === 0 ? (
                  <div className="bg-white rounded-[24px] border border-[#EEF2F7] p-12 text-center text-slate-400 font-bold flex flex-col items-center justify-center">
                    <Search size={40} className="mb-3 opacity-30 text-slate-500" />
                    <p className="text-base text-slate-600">No students found matching "{studentSearch}"</p>
                    {selectedStudentDeptFilter !== 'All' && (
                      <button 
                        onClick={() => setSelectedStudentDeptFilter('All')} 
                        className="mt-3 text-xs font-bold text-blue-600 hover:underline"
                      >
                        Clear department filter
                      </button>
                    )}
                  </div>
                ) : (
                  studentDepts.map(dept => {
                    const deptStudents = studentsByDept[dept];
                    const isExpanded = !!expandedStudentDepts[dept] || !!studentSearch.trim() || studentDepts.length === 1;
                    const p = paletteFor(dept);
                    const mono = dept === 'General' ? 'GN' : monogramOf(dept);
                    const deptAttempts = deptStudents.reduce((sum, s) => sum + s.totalTests, 0);
                    const deptActiveCount = deptStudents.filter(s => s.totalTests > 0).length;

                    return (
                      <div key={dept} className="bg-white rounded-[24px] border border-[#EEF2F7] shadow-[0_10px_28px_rgba(15,23,42,0.04)] overflow-hidden">
                        <button
                          onClick={() => toggleStudentDept(dept)}
                          className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-[#F8FAFF] transition-colors"
                        >
                          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${p.badge} text-white flex items-center justify-center shrink-0 shadow-md`}>
                            <span className={`font-[900] tracking-tight ${mono.length > 2 ? 'text-[13px]' : 'text-[16px]'}`}>{mono}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-[16px] text-[#0F172A] truncate">{dept}</h4>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[12.5px] font-semibold text-[#64748B]">
                              <span>{deptStudents.length} {deptStudents.length === 1 ? 'student' : 'students'}</span>
                              <span className="text-slate-300">•</span>
                              <span>{deptActiveCount} active test takers</span>
                              <span className="text-slate-300">•</span>
                              <span>{deptAttempts} total attempts</span>
                            </div>
                          </div>
                          <ChevronRight size={20} className={`text-slate-400 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                        </button>

                        {isExpanded && (
                          <div className="px-5 pb-5 pt-2 border-t border-[#EEF2F7] bg-slate-50/40">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
                              {deptStudents.map(student => (
                                <div 
                                  key={student.id || student.name}
                                  onClick={() => selectStudent(student.name)}
                                  className="group border border-slate-200/90 rounded-2xl bg-white hover:border-indigo-300 hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden p-4 flex items-center justify-between"
                                >
                                  <div className="flex items-center gap-3.5 min-w-0">
                                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${p.badge} text-white font-black text-lg flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform`}>
                                      {student.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-[800] text-slate-800 text-[15.5px] group-hover:text-indigo-600 transition-colors tracking-tight truncate">
                                          {student.name}
                                        </span>
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200/60">
                                          <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${p.badge}`} />
                                          {student.department}
                                        </span>
                                      </div>
                                      {student.email && (
                                        <span className="text-[12px] font-medium text-slate-400 truncate mt-0.5">
                                          {student.email}
                                        </span>
                                      )}
                                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mt-1">
                                        <span className="bg-slate-100 px-2 py-0.5 rounded-md">{student.totalTests} Tests</span>
                                        <span>•</span>
                                        <span className={student.totalTests > 0 ? "text-emerald-600 font-semibold" : "text-slate-400 font-normal"}>
                                          {student.totalTests > 0 ? `Avg ${student.avgScore} Marks` : 'No tests taken'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="p-2 rounded-xl bg-slate-50 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors text-slate-400 shrink-0 ml-2">
                                    <ChevronRight size={18} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
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

                {/* Student Profile & Department Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${selectedStudentPalette.badge} text-white font-black text-2xl flex items-center justify-center shadow-md shrink-0`}>
                      {selectedStudentName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h4 className="text-2xl font-[900] text-slate-800 truncate">{selectedStudentName}</h4>
                        {selectedStudentDept && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white border border-slate-200 shadow-sm text-slate-700">
                            <span className={`w-2 h-2 rounded-full bg-gradient-to-br ${selectedStudentPalette.badge}`} />
                            {selectedStudentDept}
                          </span>
                        )}
                      </div>
                      {selectedStudentObj?.email && (
                        <p className="text-xs font-medium text-slate-500 mt-0.5">{selectedStudentObj.email}</p>
                      )}
                      <p className="text-xs font-bold text-indigo-600 mt-1">Historical Test Trajectory (Marks Scored)</p>
                    </div>
                  </div>
                  {activeStudentData.length > 0 && (
                    <div className="flex items-center gap-3 bg-white/80 border border-indigo-100 rounded-xl px-4 py-2.5 self-start sm:self-auto shadow-sm shrink-0">
                      <div className="text-center px-2">
                        <div className="text-lg font-black text-slate-800">{activeStudentData.length}</div>
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tests</div>
                      </div>
                      <div className="w-px h-8 bg-slate-200" />
                      <div className="text-center px-2">
                        <div className="text-lg font-black text-emerald-600">
                          {Math.round((activeStudentData.reduce((acc, t) => acc + (t.score || 0), 0) / activeStudentData.length) * 100) / 100}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Avg Marks</div>
                      </div>
                    </div>
                  )}
                </div>

                {activeStudentData.length > 0 ? (
                  <>
                    <div className="w-full h-[280px] mb-12">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={activeStudentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="testName" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} />
                          <YAxis domain={[0, 'auto']} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} />
                          <RechartsTooltip 
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', padding: '12px 16px' }} 
                            formatter={(value) => [`${value} Marks`, 'Score']}
                          />
                          <Line type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={5} dot={{ r: 5, fill: '#4f46e5', strokeWidth: 3, stroke: '#fff' }} activeDot={{ r: 8, stroke: '#e0e7ff', strokeWidth: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Clean List of Test Cards with Department and Subject Badges */}
                    <div>
                      <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 text-center">Test History</h4>
                      <div className="flex flex-col gap-4">
                        {activeStudentData.map(test => {
                          const testDept = test.test?.department || test.department;
                          const testSubj = test.subject || test.test?.subject;
                          const testPalette = paletteFor(testDept || 'General');

                          return (
                            <div 
                              key={test.id} 
                              onClick={() => openStudentTestDetail(test.id)}
                              className="group border border-slate-200 rounded-2xl bg-white hover:border-blue-300 hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden"
                            >
                              <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <span className="font-bold text-slate-800 text-lg group-hover:text-blue-600 transition-colors">{test.testName}</span>
                                    {testDept && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200/60">
                                        <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${testPalette.badge}`} />
                                        {testDept}
                                      </span>
                                    )}
                                    {testSubj && (
                                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                                        {testSubj}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-sm font-bold text-slate-500 mt-0.5">
                                    Score: <span className="text-blue-600 font-bold">{test.score}</span>
                                    {test.totalMarks || test.maxScore ? (
                                      <span className="text-slate-400 font-semibold"> / {test.totalMarks || test.maxScore}</span>
                                    ) : ''}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-slate-400 shrink-0">
                                  <div className="flex items-center gap-1.5 text-sm font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
                                    <Clock size={16} className="text-blue-500" /> {test.timeTaken}
                                  </div>
                                  <div className="p-2 rounded-full bg-slate-50 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                    <ChevronRight size={20} />
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center flex-1 text-slate-400 min-h-[360px] py-12">
                    <Users size={64} className="mb-4 opacity-30 text-indigo-400" />
                    <p className="text-lg font-bold text-slate-700 mb-1">No Test Attempts Found</p>
                    <p className="text-sm font-medium text-slate-400 text-center max-w-md">
                      This student is enrolled in <strong className="text-slate-700">{selectedStudentDept}</strong>, but has not completed any test attempts yet.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              // 3. DRILLED-DOWN DETAILED TEST VIEW - GATE test-series style report (analytics/TestReport)
              renderTestReportView(
                activeDetailedTest,
                selectedStudentName,
                closeStudentTestDetail
              )
            )}
          </div>
        )}
          </>
        )}

      </div>

      {/* In-App Toast */}
      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, show: false }))}
      />
    </div>
  );
}




