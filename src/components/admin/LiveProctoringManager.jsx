import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, Eye, AlertTriangle, ShieldAlert, ShieldCheck, Search, 
  ChevronLeft, ChevronRight, Maximize2, X, RefreshCw, Send, CheckCircle2, 
  Clock, BookOpen, User, Sparkles, Filter, ChevronDown, Layers
} from 'lucide-react';
import { db } from '../../firebase';
import { 
  collection, onSnapshot, doc, updateDoc, 
  serverTimestamp, deleteDoc 
} from 'firebase/firestore';
import { connectToStudentLiveFeed } from '../../utils/webrtcProctoring';
import { STUDENT_DEPARTMENTS, sameDepartment, canonicalDepartment } from '../../utils/subjects';
import { paletteFor, NEUTRAL } from '../../utils/departmentColors';

/**
 * Individual Student Live Video Tile
 * Direct WebRTC connection to student's webcam
 */
function StudentProctorTile({ testId, student, onSpotlight, onWarn }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [connectionState, setConnectionState] = useState('connecting');

  useEffect(() => {
    let cleanup = null;
    if (testId && student.studentId) {
      cleanup = connectToStudentLiveFeed({
        testId,
        studentId: student.studentId,
        onRemoteStream: (remoteStream) => {
          setStream(remoteStream);
          if (videoRef.current) {
            videoRef.current.srcObject = remoteStream;
          }
        },
        onConnectionStateChange: (state) => {
          setConnectionState(state);
        },
        onError: () => {
          setConnectionState('failed');
        }
      });
    }

    return () => {
      if (cleanup) cleanup();
      setStream(null);
    };
  }, [testId, student.studentId]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const hasTabSwitches = (student.tabSwitchCount || 0) > 0;
  const answeredPercent = student.totalQuestions > 0 
    ? Math.round(((student.questionsAnswered || 0) / student.totalQuestions) * 100) 
    : 0;

  return (
    <div className={`relative bg-slate-900 rounded-2xl overflow-hidden border transition-all duration-300 shadow-md group ${
      hasTabSwitches ? 'border-amber-500/80 shadow-amber-500/10' : 'border-slate-800 hover:border-slate-700'
    }`}>
      {/* Video Stream Container (Aspect 4:3) */}
      <div className="relative aspect-[4/3] w-full bg-slate-950 flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition-opacity duration-300 ${stream ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Video Placeholder / Connecting State */}
        {!stream && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-slate-950">
            {student.cameraStatus === 'denied' ? (
              <div className="flex flex-col items-center text-rose-400 gap-1.5">
                <AlertTriangle size={28} />
                <span className="text-xs font-bold">Camera Blocked</span>
                <span className="text-[10px] text-slate-500">Student denied access</span>
              </div>
            ) : (
              <div className="flex flex-col items-center text-slate-400 gap-2">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
                <span className="text-xs font-semibold text-slate-400">Connecting P2P Feed...</span>
                <span className="text-[10px] text-slate-600">STUN Handshake in progress</span>
              </div>
            )}
          </div>
        )}

        {/* Top Badges Overlay */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between gap-1 pointer-events-none">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md ${
            stream 
              ? 'bg-emerald-500/90 text-white shadow-sm' 
              : connectionState === 'connecting'
              ? 'bg-amber-500/80 text-white'
              : 'bg-rose-500/80 text-white'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${stream ? 'bg-white animate-pulse' : 'bg-slate-200'}`} />
            {stream ? 'LIVE' : connectionState}
          </span>

          {hasTabSwitches && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-md animate-bounce">
              <AlertTriangle size={11} /> {student.tabSwitchCount} Switch{student.tabSwitchCount > 1 ? 'es' : ''}
            </span>
          )}
        </div>

        {/* Hover Action Overlay */}
        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 backdrop-blur-[2px]">
          <button
            onClick={() => onSpotlight(student, stream, testId)}
            className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg transition-transform hover:scale-105 flex items-center gap-1 text-xs font-bold"
            title="Spotlight Feed"
          >
            <Maximize2 size={14} /> Spotlight
          </button>
          <button
            onClick={() => onWarn(student, testId)}
            className="p-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-lg transition-transform hover:scale-105 flex items-center gap-1 text-xs font-bold"
            title="Send Warning Notice"
          >
            <ShieldAlert size={14} /> Warn
          </button>
        </div>
      </div>

      {/* Student Details Card Footer */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-slate-100 truncate flex items-center gap-1">
              <User size={13} className="text-slate-400 flex-shrink-0" />
              <span className="truncate">{student.studentName || 'Unknown Student'}</span>
            </h4>
            <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
              {student.regNo || student.studentEmail || 'No ID'}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-semibold text-slate-400">
            <span>Answered: {student.questionsAnswered || 0} / {student.totalQuestions || 0}</span>
            <span>{answeredPercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
              style={{ width: `${answeredPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Main Admin Live Proctoring Manager Component
 */
export default function LiveProctoringManager() {
  const [activeTests, setActiveTests] = useState([]);
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedTestId, setSelectedTestId] = useState('');
  const [testStudentsMap, setTestStudentsMap] = useState({}); // testId -> student[]
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Modals
  const [spotlightStudent, setSpotlightStudent] = useState(null);
  const [spotlightTestId, setSpotlightTestId] = useState(null);
  const [spotlightStream, setSpotlightStream] = useState(null);
  const spotlightVideoRef = useRef(null);

  const [warningModalStudent, setWarningModalStudent] = useState(null);
  const [warningTestId, setWarningTestId] = useState(null);
  const [warningText, setWarningText] = useState('');
  const [sendingWarning, setSendingWarning] = useState(false);
  const [warningSentSuccess, setWarningSentSuccess] = useState(false);

  // 1. Subscribe to active tests
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'active_proctoring'), (snap) => {
      const list = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setActiveTests(list);
    }, (err) => {
      console.error('Error loading active proctoring tests:', err);
    });

    return () => unsub();
  }, []);

  // 2. Subscribe to students for each active test
  useEffect(() => {
    const unsubs = [];
    activeTests.forEach((t) => {
      const unsub = onSnapshot(collection(db, 'active_proctoring', t.id, 'students'), (snap) => {
        const students = [];
        snap.forEach((docSnap) => {
          students.push({ id: docSnap.id, ...docSnap.data(), testId: t.id, testTitle: t.title, department: t.department });
        });
        setTestStudentsMap((prev) => ({
          ...prev,
          [t.id]: students
        }));
      }, (err) => {
        console.warn(`Error loading students for test ${t.id}:`, err);
      });
      unsubs.push(unsub);
    });

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [activeTests]);

  // Aggregate student counts
  const allStudents = Object.values(testStudentsMap).flat();
  const totalLiveStudents = allStudents.length;
  const totalFlaggedStudents = allStudents.filter((s) => (s.tabSwitchCount || 0) > 0).length;

  // Filter tests by selected department
  const departmentFilteredTests = activeTests.filter((t) => {
    if (selectedDept === 'ALL') return true;
    return sameDepartment(t.department, selectedDept);
  });

  // Automatically select first test if not set
  useEffect(() => {
    if (departmentFilteredTests.length > 0) {
      if (!selectedTestId || !departmentFilteredTests.some((t) => t.id === selectedTestId)) {
        setSelectedTestId(departmentFilteredTests[0].id);
        setCurrentPage(1);
      }
    } else {
      setSelectedTestId('');
    }
  }, [selectedDept, departmentFilteredTests.length]);

  // Students to display in current view
  const currentTestStudents = selectedTestId ? (testStudentsMap[selectedTestId] || []) : [];

  // Filter by search query (Global across all tests if search has text, else current test)
  const isGlobalSearching = globalSearchQuery.trim().length > 0;
  const displayedStudents = (isGlobalSearching ? allStudents : currentTestStudents).filter((s) => {
    if (!isGlobalSearching) return true;
    const q = globalSearchQuery.toLowerCase();
    return (
      (s.studentName || '').toLowerCase().includes(q) ||
      (s.regNo || '').toLowerCase().includes(q) ||
      (s.studentEmail || '').toLowerCase().includes(q) ||
      (s.testTitle || '').toLowerCase().includes(q) ||
      (s.department || '').toLowerCase().includes(q)
    );
  });

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(displayedStudents.length / pageSize));
  const paginatedStudents = displayedStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Bind spotlight stream
  useEffect(() => {
    if (spotlightVideoRef.current && spotlightStream) {
      spotlightVideoRef.current.srcObject = spotlightStream;
    }
  }, [spotlightStream, spotlightStudent]);

  // Warning Dispatcher
  const handleSendWarning = async (customMessage = null) => {
    if (!warningModalStudent || !warningTestId) return;
    const msg = customMessage || warningText.trim();
    if (!msg) return;

    setSendingWarning(true);
    try {
      const studentDocRef = doc(db, 'active_proctoring', warningTestId, 'students', warningModalStudent.studentId || warningModalStudent.id);
      await updateDoc(studentDocRef, {
        warningMessage: msg,
        warningTimestamp: serverTimestamp(),
        warningId: 'w_' + Date.now(),
        sentBy: 'Academy Chief Invigilator (Admin)'
      });
      setWarningSentSuccess(true);
      setTimeout(() => {
        setWarningModalStudent(null);
        setWarningTestId(null);
        setWarningText('');
        setWarningSentSuccess(false);
      }, 1400);
    } catch (e) {
      console.error('Failed to dispatch warning:', e);
      alert('Could not dispatch warning. Please try again.');
    } finally {
      setSendingWarning(false);
    }
  };

  const PRESET_WARNINGS = [
    '⚠️ Please keep your eyes focused on your screen and exam questions.',
    '📷 Please ensure your face is well lit and fully visible in the camera frame.',
    '🚫 No talking, whispering, or external devices allowed during the test.',
    '⚠️ Multiple tab-switches detected. Further violations will disqualify your test.'
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white border border-slate-800 shadow-xl">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Academy Live Proctoring Command Center
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                100% Free Peer-to-Peer WebRTC
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white/90">
                Zero Cloud Storage Cost
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-[900] tracking-tight">Real-Time Exam Invigilation</h1>
            <p className="text-slate-400 text-sm max-w-2xl font-medium">
              Monitor active candidates across all engineering departments live. Ephemeral browser-to-browser streaming with instant warning broadcast and tab violation tracking.
            </p>
          </div>

          {/* Academy Metrics Counters */}
          <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex-shrink-0">
            <div className="text-center px-3">
              <p className="text-2xl font-black text-white">{activeTests.length}</p>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Tests</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center px-3">
              <p className="text-2xl font-black text-emerald-400">{totalLiveStudents}</p>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Live Students</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center px-3">
              <p className="text-2xl font-black text-rose-400">{totalFlaggedStudents}</p>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Violations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search any candidate across the academy by name, register number, email, or department..."
            value={globalSearchQuery}
            onChange={(e) => {
              setGlobalSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />
          {globalSearchQuery && (
            <button
              onClick={() => setGlobalSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Page size */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold text-slate-500">Grid:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
          >
            <option value={8}>8 per page</option>
            <option value={12}>12 per page</option>
            <option value={16}>16 per page</option>
          </select>
        </div>
      </div>

      {/* Department Filter Pills */}
      {!isGlobalSearching && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Filter size={14} className="text-indigo-600" /> Filter by Department
            </span>
            <span className="text-xs font-bold text-slate-400">
              {activeTests.length} tests active across academy
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            <button
              onClick={() => { setSelectedDept('ALL'); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                selectedDept === 'ALL'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Departments ({totalLiveStudents})
            </button>

            {STUDENT_DEPARTMENTS.map((dept) => {
              const code = (dept.match(/\(([^)]+)\)/) || [])[1] || dept;
              const deptStudentsCount = allStudents.filter((s) => sameDepartment(s.department, dept)).length;
              const p = paletteFor(dept);

              return (
                <button
                  key={dept}
                  onClick={() => { setSelectedDept(dept); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
                    selectedDept === dept
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{code}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    selectedDept === dept ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {deptStudentsCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Tests Selector Bar (when not in global search) */}
      {!isGlobalSearching && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen size={14} className="text-indigo-600" /> Active Tests in {selectedDept === 'ALL' ? 'All Departments' : selectedDept}
            </h3>
            <span className="text-xs font-bold text-slate-400">
              {departmentFilteredTests.length} tests in progress
            </span>
          </div>

          {departmentFilteredTests.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-medium">
              No active tests in progress for the selected department filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {departmentFilteredTests.map((t) => {
                const isSelected = t.id === selectedTestId;
                const testStudents = testStudentsMap[t.id] || [];
                const flaggedCount = testStudents.filter((s) => (s.tabSwitchCount || 0) > 0).length;
                const p = paletteFor(t.department || 'General');

                return (
                  <button
                    key={t.id}
                    onClick={() => { setSelectedTestId(t.id); setCurrentPage(1); }}
                    className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${p.soft}`}>
                          {t.department || 'General'}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {testStudents.length} Live
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{t.title}</h4>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                      <span>Violations:</span>
                      <span className={`font-bold ${flaggedCount > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                        {flaggedCount} flagged
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Global Search Results Alert */}
      {isGlobalSearching && (
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-700 flex items-center justify-between">
          <span>Global Search across entire academy: <strong>{displayedStudents.length} candidates</strong> match "{globalSearchQuery}"</span>
          <button onClick={() => setGlobalSearchQuery('')} className="text-indigo-600 hover:underline">Clear search</button>
        </div>
      )}

      {/* Video Grid */}
      {displayedStudents.length === 0 ? (
        <div className="p-16 bg-white rounded-3xl border border-slate-200 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
            <Video size={32} />
          </div>
          <h3 className="text-lg font-black text-slate-800">
            {isGlobalSearching ? 'No Candidates Match Your Search' : 'No Students Currently Online in this Test'}
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            {isGlobalSearching 
              ? 'Try searching by a different name, register number, or clear your query.' 
              : 'As soon as candidates join the proctored interface, their webcam feeds will stream here in real time.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Responsive Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedStudents.map((student) => (
              <StudentProctorTile
                key={student.studentId || student.id}
                testId={student.testId || selectedTestId}
                student={student}
                onSpotlight={(stud, strm, tId) => {
                  setSpotlightStudent(stud);
                  setSpotlightStream(strm);
                  setSpotlightTestId(tId || student.testId || selectedTestId);
                }}
                onWarn={(stud, tId) => {
                  setWarningModalStudent(stud);
                  setWarningTestId(tId || student.testId || selectedTestId);
                  setWarningText('');
                }}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <p className="text-xs font-bold text-slate-500">
                Showing <span className="text-slate-800">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                <span className="text-slate-800">{Math.min(currentPage * pageSize, displayedStudents.length)}</span> of{' '}
                <span className="text-slate-800">{displayedStudents.length}</span> students
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition"
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <span className="text-xs font-bold text-indigo-600 px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Spotlight Modal */}
      {spotlightStudent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col text-white">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">{spotlightStudent.studentName}</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {spotlightStudent.regNo || spotlightStudent.studentEmail} &middot; {spotlightStudent.department}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setWarningModalStudent(spotlightStudent);
                    setWarningTestId(spotlightTestId || spotlightStudent.testId);
                    setSpotlightStudent(null);
                  }}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5 shadow-md"
                >
                  <ShieldAlert size={14} /> Send Warning
                </button>
                <button
                  onClick={() => {
                    setSpotlightStudent(null);
                    setSpotlightStream(null);
                  }}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Spotlight Video Display */}
            <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
              <video
                ref={spotlightVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
              />
              <div className="absolute top-3 left-3 bg-emerald-600/90 text-white px-2.5 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                SPOTLIGHT VIEW
              </div>
            </div>

            {/* Student Stats Footer */}
            <div className="p-5 bg-slate-950 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center border-t border-slate-800">
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                <p className="text-xs text-slate-400 font-bold uppercase">Questions Answered</p>
                <p className="text-lg font-black text-white mt-1">
                  {spotlightStudent.questionsAnswered || 0} / {spotlightStudent.totalQuestions || 0}
                </p>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                <p className="text-xs text-slate-400 font-bold uppercase">Tab Switches</p>
                <p className={`text-lg font-black mt-1 ${
                  (spotlightStudent.tabSwitchCount || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {spotlightStudent.tabSwitchCount || 0}
                </p>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                <p className="text-xs text-slate-400 font-bold uppercase">Department</p>
                <p className="text-xs font-bold text-indigo-300 mt-1 truncate">
                  {spotlightStudent.department || 'General'}
                </p>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                <p className="text-xs text-slate-400 font-bold uppercase">Test</p>
                <p className="text-xs font-bold text-slate-200 mt-1 truncate">
                  {spotlightStudent.testTitle || 'Online Test'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Warning Modal */}
      {warningModalStudent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="p-5 bg-gradient-to-r from-rose-600 to-red-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldAlert size={22} />
                <div>
                  <h3 className="font-black text-base">Issue Invigilator Warning</h3>
                  <p className="text-xs text-rose-100">Broadcasts instant alert overlay to student</p>
                </div>
              </div>
              <button
                onClick={() => setWarningModalStudent(null)}
                className="p-1 text-white/80 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-500">Student: </span>
                <span className="font-bold text-slate-800">{warningModalStudent.studentName}</span>
                <span className="text-slate-400 ml-2">({warningModalStudent.regNo || warningModalStudent.studentEmail})</span>
              </div>

              <div>
                <label className="text-xs font-black text-slate-600 uppercase tracking-wide block mb-2">
                  Quick Warning Presets:
                </label>
                <div className="space-y-1.5">
                  {PRESET_WARNINGS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setWarningText(preset)}
                      className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-rose-400 hover:bg-rose-50/50 text-xs text-slate-700 transition flex items-center gap-2 group"
                    >
                      <span className="text-rose-500 font-bold group-hover:scale-110 transition-transform">&bull;</span>
                      <span className="flex-1 font-medium">{preset}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-600 uppercase tracking-wide block mb-1.5">
                  Custom Warning Message:
                </label>
                <textarea
                  rows={3}
                  value={warningText}
                  onChange={(e) => setWarningText(e.target.value)}
                  placeholder="Type an official warning notice to be displayed immediately on the student's exam screen..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition"
                />
              </div>

              {warningSentSuccess ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                  <CheckCircle2 size={16} /> Warning flashed on candidate screen successfully!
                </div>
              ) : (
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setWarningModalStudent(null)}
                    disabled={sendingWarning}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendWarning()}
                    disabled={sendingWarning || !warningText.trim()}
                    className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 text-white text-xs font-black rounded-xl hover:from-rose-700 hover:to-red-700 transition shadow-lg shadow-rose-600/20 disabled:opacity-50 flex items-center gap-2"
                  >
                    {sendingWarning ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Transmitting...
                      </>
                    ) : (
                      <>
                        <Send size={13} /> Flash Warning Now
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
