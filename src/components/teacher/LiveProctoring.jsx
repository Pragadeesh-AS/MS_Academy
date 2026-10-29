import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, Eye, AlertTriangle, ShieldAlert, ShieldCheck, Search, 
  ChevronLeft, ChevronRight, Maximize2, X, RefreshCw, Send, CheckCircle2, 
  Clock, BookOpen, User, Sparkles
} from 'lucide-react';
import { db } from '../../firebase';
import { 
  collection, query, where, onSnapshot, doc, updateDoc, 
  serverTimestamp, getDocs 
} from 'firebase/firestore';
import { connectToStudentLiveFeed } from '../../utils/webrtcProctoring';
import { sameDepartment } from '../../utils/subjects';
import { paletteFor } from '../../utils/departmentColors';

/**
 * Individual Student Live Video Tile
 * Connects directly to student's webcam via WebRTC peer-to-peer.
 */
function StudentProctorTile({ testId, student, onSpotlight, onWarn }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [connectionState, setConnectionState] = useState('connecting'); // 'connecting' | 'connected' | 'disconnected' | 'failed'

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
          <div className="flex items-center gap-1.5">
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
          </div>

          {hasTabSwitches && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-md animate-bounce">
              <AlertTriangle size={11} /> {student.tabSwitchCount} Switch{student.tabSwitchCount > 1 ? 'es' : ''}
            </span>
          )}
        </div>

        {/* Hover Action Overlay */}
        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 backdrop-blur-[2px]">
          <button
            onClick={() => onSpotlight(student, stream)}
            className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg transition-transform hover:scale-105 flex items-center gap-1 text-xs font-bold"
            title="Spotlight Feed"
          >
            <Maximize2 size={14} /> Spotlight
          </button>
          <button
            onClick={() => onWarn(student)}
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
 * Main Teacher Live Proctoring Component
 */
export default function LiveProctoring({ department, teacherName }) {
  const [activeTests, setActiveTests] = useState([]);
  const [selectedTestId, setSelectedTestId] = useState('');
  const [students, setStudents] = useState([]);
  const [loadingTests, setLoadingTests] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Modals
  const [spotlightStudent, setSpotlightStudent] = useState(null);
  const [spotlightStream, setSpotlightStream] = useState(null);
  const spotlightVideoRef = useRef(null);

  const [warningModalStudent, setWarningModalStudent] = useState(null);
  const [warningText, setWarningText] = useState('');
  const [sendingWarning, setSendingWarning] = useState(false);
  const [warningSentSuccess, setWarningSentSuccess] = useState(false);

  // 1. Fetch active tests in teacher's department
  useEffect(() => {
    setLoadingTests(true);
    const q = collection(db, 'active_proctoring');
    const unsub = onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (!department || sameDepartment(data.department, department)) {
          list.push({ id: docSnap.id, ...data });
        }
      });
      setActiveTests(list);
      setLoadingTests(false);

      // Auto select first test if not set or if current selection disappeared
      if (list.length > 0) {
        setSelectedTestId((prev) => {
          if (!prev || !list.some((t) => t.id === prev)) {
            return list[0].id;
          }
          return prev;
        });
      } else {
        setSelectedTestId('');
      }
    }, (err) => {
      console.error('Error listening to active tests:', err);
      setLoadingTests(false);
    });

    return () => unsub();
  }, [department]);

  // 2. Fetch active students in selected test
  useEffect(() => {
    if (!selectedTestId) {
      setStudents([]);
      return;
    }

    setLoadingStudents(true);
    const studentsCol = collection(db, 'active_proctoring', selectedTestId, 'students');
    const unsub = onSnapshot(studentsCol, (snap) => {
      const list = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setStudents(list);
      setLoadingStudents(false);
    }, (err) => {
      console.error('Error listening to students in test:', err);
      setLoadingStudents(false);
    });

    return () => unsub();
  }, [selectedTestId]);

  // Bind spotlight video ref
  useEffect(() => {
    if (spotlightVideoRef.current && spotlightStream) {
      spotlightVideoRef.current.srcObject = spotlightStream;
    }
  }, [spotlightStream, spotlightStudent]);

  // Filter students by search
  const filteredStudents = students.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (s.studentName || '').toLowerCase().includes(q) ||
      (s.regNo || '').toLowerCase().includes(q) ||
      (s.studentEmail || '').toLowerCase().includes(q)
    );
  });

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const selectedTest = activeTests.find((t) => t.id === selectedTestId);
  const deptPalette = paletteFor(department || 'General');

  // Warning Dispatcher
  const handleSendWarning = async (customMessage = null) => {
    if (!warningModalStudent || !selectedTestId) return;
    const msg = customMessage || warningText.trim();
    if (!msg) return;

    setSendingWarning(true);
    try {
      const studentDocRef = doc(db, 'active_proctoring', selectedTestId, 'students', warningModalStudent.studentId || warningModalStudent.id);
      await updateDoc(studentDocRef, {
        warningMessage: msg,
        warningTimestamp: serverTimestamp(),
        warningId: 'w_' + Date.now(),
        sentBy: teacherName || 'Invigilator'
      });
      setWarningSentSuccess(true);
      setTimeout(() => {
        setWarningModalStudent(null);
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
      {/* Top Banner / Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white border border-indigo-900/40 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Invigilation
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white/90 backdrop-blur-sm">
                {department || 'Department Exam Hall'}
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                100% Free P2P WebRTC
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-[900] tracking-tight">Live Exam Proctoring</h1>
            <p className="text-slate-300 text-sm max-w-2xl font-medium">
              Zero-cost, peer-to-peer live webcam monitoring with automatic tab-switch detection and direct invigilator warning broadcast.
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex-shrink-0">
            <div className="text-center px-2">
              <p className="text-2xl font-black text-white">{activeTests.length}</p>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Tests</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center px-2">
              <p className="text-2xl font-black text-emerald-400">{students.length}</p>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Students Live</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center px-2">
              <p className="text-2xl font-black text-amber-400">
                {students.filter(s => (s.tabSwitchCount || 0) > 0).length}
              </p>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Flagged</p>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Test Selector, Search & Pagination */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Test Selector Dropdown */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <label className="text-xs font-black text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
            <BookOpen size={15} className="text-indigo-600" /> Active Test:
          </label>
          <select
            value={selectedTestId}
            onChange={(e) => {
              setSelectedTestId(e.target.value);
              setCurrentPage(1);
            }}
            disabled={activeTests.length === 0}
            className="w-full md:max-w-md px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition disabled:opacity-60"
          >
            {activeTests.length === 0 ? (
              <option value="">No Active Tests in Session</option>
            ) : (
              activeTests.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title || 'Untitled Test'} ({t.department || 'General'})
                </option>
              ))
            )}
          </select>
        </div>

        {/* Search Student */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by name / reg no..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Grid Page Size Picker */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none"
          >
            <option value={8}>8 / page</option>
            <option value={12}>12 / page</option>
            <option value={16}>16 / page</option>
          </select>
        </div>
      </div>

      {/* Video Grid Section */}
      {loadingTests || loadingStudents ? (
        <div className="p-16 bg-white rounded-3xl border border-slate-200 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-600">Connecting to Live Exam Rooms...</p>
        </div>
      ) : activeTests.length === 0 ? (
        <div className="p-16 bg-white rounded-3xl border border-slate-200 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
            <Video size={32} />
          </div>
          <h3 className="text-lg font-black text-slate-800">No Active Tests Currently in Session</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            When students begin a proctored examination in <strong>{department || 'your department'}</strong>, their live camera feeds will stream here automatically.
          </p>
        </div>
      ) : paginatedStudents.length === 0 ? (
        <div className="p-16 bg-white rounded-3xl border border-slate-200 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <User size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-700">No Students Currently Online in this Test</h3>
          <p className="text-xs text-slate-400">Waiting for candidates to join the exam interface.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Grid Layout: Responsive 1 to 4 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedStudents.map((student) => (
              <StudentProctorTile
                key={student.studentId || student.id}
                testId={selectedTestId}
                student={student}
                onSpotlight={(stud, strm) => {
                  setSpotlightStudent(stud);
                  setSpotlightStream(strm);
                }}
                onWarn={(stud) => {
                  setWarningModalStudent(stud);
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
                <span className="text-slate-800">{Math.min(currentPage * pageSize, filteredStudents.length)}</span> of{' '}
                <span className="text-slate-800">{filteredStudents.length}</span> students
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
                  <p className="text-xs text-slate-400 font-mono">{spotlightStudent.regNo || spotlightStudent.studentEmail}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setWarningModalStudent(spotlightStudent);
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
                <p className="text-xs text-slate-400 font-bold uppercase">Camera Status</p>
                <p className="text-sm font-bold text-emerald-400 mt-1 capitalize">
                  {spotlightStudent.cameraStatus || 'Active'}
                </p>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                <p className="text-xs text-slate-400 font-bold uppercase">Test</p>
                <p className="text-xs font-bold text-indigo-300 mt-1 truncate">
                  {selectedTest?.title || 'Online Test'}
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
