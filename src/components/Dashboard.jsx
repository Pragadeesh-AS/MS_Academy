import React, { useEffect, useState } from 'react';
import Loader from './Loader';
import { useNavigate, Link } from 'react-router-dom';
import { BookOpen, Video, PlayCircle, Play, Calendar, GraduationCap, Building2, HelpCircle, School, FileText, Eye, Trophy, ChevronLeft, ChevronRight, Crown, Lock, ArrowRight, Clock, CheckCircle, Menu, X, LogOut, Folder, Package, ArrowLeft } from 'lucide-react';
import logoImg from '../assets/msgate_logo.png';
import { db, storage } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, listAll, getDownloadURL } from 'firebase/storage';
import StudentLiveClasses from './StudentLiveClasses';
import RecordingPlayerModal from './shared/RecordingPlayerModal';
import RoleSwitcher from './shared/RoleSwitcher';
import { STUDENT_DEPARTMENTS, groupBySubject, NO_SUBJECT } from '../utils/subjects';
import StudentTests from './StudentTests';
import TestAlerts from './student/TestAlerts';
import { canAccessTest } from '../utils/testAccess';
import { AVAILABILITY, testAvailability, testStartMillis, testCloseMillis, formatTestTime, formatCountdown } from '../utils/testSchedule';
import { inProgressTestIds } from '../utils/testProgress';
import PDFViewer from './PDFViewer';
import { gateCoursesData } from './GateCourses';
import { buyBundle, buySubject, buyNoteBundle, verifyOrder } from '../cashfree';
import Analytics from './admin/Analytics';
import AdmissionGate from './admission/AdmissionGate';
import { needsAdmissionForm, admissionFormBlocksPortal } from '../utils/admissionForm';
import { TrendingUp } from 'lucide-react';

function VideoDuration({ url, storedDuration }) {
  const [duration, setDuration] = useState('Loading...');

  useEffect(() => {
    const formatAndSetDuration = (totalSeconds) => {
      if (!totalSeconds || !isFinite(totalSeconds)) {
        setDuration('Unknown length');
        return;
      }
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = Math.floor(totalSeconds % 60);
      
      let formatted = '';
      if (hours > 0) {
        formatted += `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      } else {
        formatted += `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }
      setDuration(formatted);
    };

    if (storedDuration !== undefined && storedDuration !== null) {
      formatAndSetDuration(storedDuration);
      return;
    }

    if (!url) {
      setDuration('Unknown');
      return;
    }
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    // Some webm files recorded via MediaRecorder have Infinity duration.
    // If we can't load metadata or it's infinite, we'll fall back after a timeout.
    const timeout = setTimeout(() => {
      setDuration('Unknown length');
    }, 5000);

    video.onloadedmetadata = () => {
      clearTimeout(timeout);
      let totalSeconds = video.duration;
      
      // If it's infinity (common for raw webm), try to seek to end to get duration
      if (totalSeconds === Infinity) {
        video.currentTime = 1e101;
        video.ontimeupdate = () => {
          video.ontimeupdate = null;
          totalSeconds = video.duration;
          formatAndSetDuration(totalSeconds);
        };
        return;
      }
      
      formatAndSetDuration(totalSeconds);
    };

    video.onerror = () => {
      clearTimeout(timeout);
      setDuration('Unknown length');
    };

    video.src = url;
    
    return () => clearTimeout(timeout);
  }, [url, storedDuration]);

  return (
    <span className="absolute bottom-3 right-3 text-white text-xs font-bold px-2 py-1 bg-black/70 rounded-lg pointer-events-none backdrop-blur-sm shadow-sm flex items-center gap-1 z-20">
      <Clock size={12} /> {duration}
    </span>
  );
}

const sidebarNavItems = [
  { key: 'learning', label: 'My Learning', icon: BookOpen },
  { key: 'live', label: 'Live Sessions', icon: Video },
  { key: 'recordings', label: 'Recordings', icon: PlayCircle },
  { key: 'notes', label: 'Study Notes', icon: FileText },
  { key: 'schedule', label: 'Schedule', icon: Calendar },
  { key: 'tests', label: 'Academy Tests', icon: Trophy },
  { key: 'analytics', label: 'Analytics', icon: TrendingUp },
];

const isStartingSoon = (timeStr) => {
  if (!timeStr || !timeStr.includes('T')) return false;
  try {
    const classTime = new Date(timeStr).getTime();
    const now = new Date().getTime();
    const diffMins = (classTime - now) / (1000 * 60);
    return diffMins > 0 && diffMins <= 60;
  } catch(e) {
    return false;
  }
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [studentName, setStudentName] = useState('Student');
  const [studentDepartment, setStudentDepartment] = useState('');
  const [isPro, setIsPro] = useState(false);
  const [purchasedBundles, setPurchasedBundles] = useState([]);
  const [availableBundles, setAvailableBundles] = useState([]);
  // Membership tier: Elite (pro) > Prime (bought bundles) > Foundation (everyone else)
  const bundleCount = purchasedBundles.length;
  const tier = isPro
    ? { tier: 'elite', label: 'MS GATE ELITE', icon: '👑' }
    : bundleCount > 0
      ? { tier: 'prime', label: 'MS GATE PRIME', icon: '⭐' }
      : { tier: 'foundation', label: 'MS GATE FOUNDATION', icon: '🌱' };
  // Back on the Tests tab if a test was left mid-way (refresh / crash), where it reopens
  const [activeTab, setActiveTab] = useState(() => (inProgressTestIds(sessionStorage.getItem('auth_email')).length ? 'tests' : 'learning'));
  // Finished practice test -> its report in Analytics; "Review Solutions" there -> the test's review
  const [analyticsTestId, setAnalyticsTestId] = useState(null);
  const [reviewTestId, setReviewTestId] = useState(null);
  // Leaving via the sidebar drops a pending "open this test" so it doesn't pop up later
  useEffect(() => {
    if (activeTab !== 'tests') setReviewTestId(null);
    if (activeTab !== 'analytics') setAnalyticsTestId(null);
  }, [activeTab]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [scheduledClasses, setScheduledClasses] = useState([]);
  
  // Onboarding State
  const [loading, setLoading] = useState(true);
  // Students must submit the signed Admission Application Form before using the portal
  const [admissionPending, setAdmissionPending] = useState(false);
  const [studentRecord, setStudentRecord] = useState(null);
  // A purchase waiting for the admission form: { kind: 'bundle' | 'subject' | 'notebundle', id }
  const [admissionForPurchase, setAdmissionForPurchase] = useState(null);
  const [docId, setDocId] = useState(null);
  const [payingBundleId, setPayingBundleId] = useState(null);
  const [purchasedSubjects, setPurchasedSubjects] = useState([]);
  const [noteFolders, setNoteFolders] = useState([]);
  const [noteStack, setNoteStack] = useState([]);
  const [payingSubjectId, setPayingSubjectId] = useState(null);
  const [purchasedNoteBundles, setPurchasedNoteBundles] = useState([]);
  const [noteBundles, setNoteBundles] = useState([]);
  const [payingNoteBundleId, setPayingNoteBundleId] = useState(null);
  
  useEffect(() => {
    // Prevent back button from leaving the dashboard
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
      setActiveTab('learning'); // Optionally take them to learning tab
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [recordings, setRecordings] = useState([]);
  const [recordingSubject, setRecordingSubject] = useState(null); // open subject folder (null = folder list)
  const [notes, setNotes] = useState([]);
  const [playingRecording, setPlayingRecording] = useState(null); // { id, url, duration? }
  const [viewingNoteUrl, setViewingNoteUrl] = useState(null);
  const [viewingNoteAccess, setViewingNoteAccess] = useState(false);

  const canAccessRecording = (rec) => {
    if (isPro) return true;

    // 1. EXCLUSIVE BUNDLE: If the recording is assigned to a specific paid bundle
    if (rec.bundleId && rec.bundleId !== 'free') {
      if (purchasedBundles && purchasedBundles.includes(rec.bundleId)) {
        const bundle = (availableBundles || []).find(b => b.id === rec.bundleId);
        if (!bundle || !bundle.permissions || bundle.permissions.includes('recordings')) {
          return true;
        }
      }
      return false; // Do not fall through
    }

    // 2. GENERAL RECORDINGS (No specific bundleId):
    // Check if they own any bundle for this department that has the 'recordings' permission
    const studentPurchasedDeptBundles = (availableBundles || []).filter(b => 
      purchasedBundles.includes(b.id) && 
      (b.department === rec.department || rec.department === 'General' || !rec.department) &&
      (b.permissions?.includes('recordings') || !b.permissions)
    );
    
    if (studentPurchasedDeptBundles.length > 0) return true;
    
    // 3. Legacy support: Admin-created recordings without a bundleId are accessible to everyone
    const isAdmin = rec.teacherName === 'Admin' || rec.teacherName === 'MS Academy Admin';
    if (isAdmin) return true;

    return false;
  };

  // Top-level (subject) folder a note belongs to
  const subjectIdOf = (note) => {
    if (note.subjectId) return note.subjectId;
    let folder = noteFolders.find(f => f.id === note.folderId);
    while (folder && folder.parentId) folder = noteFolders.find(f => f.id === folder.parentId);
    return folder ? folder.id : '';
  };

  // A notes bundle the student owns covers all subjects of the department, or only the ones it lists
  const coveredByNoteBundle = (subjectId) => noteBundles.some(b =>
    purchasedNoteBundles.includes(b.id) && (b.includeAll || (b.subjectIds || []).includes(subjectId))
  ) || (availableBundles || []).some(b =>
    // A purchased course bundle with notes access: all subjects, or only those the admin selected
    purchasedBundles.includes(b.id) &&
    (b.permissions?.includes('notes') || !b.permissions) &&
    (b.department === studentDepartment || b.department === 'General') &&
    (b.notesSubjectMode !== 'selected' || (b.noteSubjectIds || []).includes(subjectId))
  );

  const canAccessNote = (note) => {
    if (isPro) return true;

    // SUBJECT / NOTES BUNDLE (bought or assigned by admin): unlocks every note inside the subject
    const subjectId = subjectIdOf(note);
    if (subjectId && (purchasedSubjects.includes(subjectId) || coveredByNoteBundle(subjectId))) return true;
    
    // EXCLUSIVE BUNDLE: If a note is assigned to a specific bundle, 
    // it can ONLY be unlocked by purchasing that specific bundle.
    if (note.bundleId) {
      return purchasedBundles.includes(note.bundleId);
    }

    // Notes inside a subject folder are unlocked per subject (checked above), not department-wide
    if (subjectId) return false;

    // GENERAL NOTES: If no specific bundle is assigned, 
    // unlock it if they have any purchased bundle for this department with 'notes' permission.
    const studentPurchasedDeptBundles = (availableBundles || []).filter(b => 
      purchasedBundles.includes(b.id) && 
      (b.department === note.department || b.department === 'General' || note.department === 'General') &&
      (b.permissions?.includes('notes') || !b.permissions)
    );
    
    if (studentPurchasedDeptBundles.length > 0) return true;
    
    return false;
  };

  useEffect(() => {
    if (!studentDepartment) return;
    const q = query(
      collection(db, 'recordings'),
      where('department', '==', studentDepartment)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const recs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      recs.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setRecordings(recs);
    });
    return () => unsubscribe();
  }, [studentDepartment]);

  useEffect(() => {
    if (!studentDepartment) return;

    const mineOnly = (docs) => docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(cls => !cls.selectedStudentNames || cls.selectedStudentNames.length === 0 || cls.selectedStudentNames.includes(studentName));

    // Elite students also see "common" classes (Maths/Aptitude etc.) scheduled for every
    // department, merged with their own department's classes.
    let deptClasses = [];
    let commonClasses = [];
    const applyMerge = () => {
      const merged = [...deptClasses, ...commonClasses.filter(c => !deptClasses.some(d => d.id === c.id))];
      merged.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
      setScheduledClasses(merged);
    };

    const deptQ = query(
      collection(db, 'scheduled_classes'),
      where('department', '==', studentDepartment)
    );
    const unsubDept = onSnapshot(deptQ, (snapshot) => {
      deptClasses = mineOnly(snapshot.docs);
      applyMerge();
    });

    const commonQ = query(
      collection(db, 'scheduled_classes'),
      where('openToAllDepartments', '==', true)
    );
    const unsubCommon = onSnapshot(commonQ, (snapshot) => {
      commonClasses = mineOnly(snapshot.docs);
      applyMerge();
    });

    return () => {
      unsubDept();
      unsubCommon();
    };
  }, [studentDepartment, studentName]);

  // Scheduled tests for the Schedule tab (live, so a test the teacher schedules shows up at once)
  const [deptTests, setDeptTests] = useState([]);
  const [attemptedTestIds, setAttemptedTestIds] = useState(() => new Set());
  const [scheduleNow, setScheduleNow] = useState(Date.now());
  useEffect(() => {
    if (!studentDepartment) return undefined;
    const unsub = onSnapshot(
      query(collection(db, 'tests'), where('department', '==', studentDepartment)),
      snap => setDeptTests(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err => console.error('Failed to load scheduled tests', err)
    );
    const email = sessionStorage.getItem('auth_email');
    if (email) {
      getDocs(query(collection(db, 'test_attempts'), where('studentEmail', '==', email)))
        .then(snap => setAttemptedTestIds(new Set(snap.docs.map(d => d.data().testId))))
        .catch(err => console.error('Failed to load test attempts', err));
    }
    return () => unsub();
  }, [studentDepartment]);
  useEffect(() => {
    if (activeTab !== 'schedule') return undefined;
    const t = setInterval(() => setScheduleNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, [activeTab]);

  // Tests this student can take that haven't closed and they haven't attempted, soonest first
  const scheduledTests = deptTests.filter(t =>
    testStartMillis(t) !== null
    && !attemptedTestIds.has(t.id)
    && testAvailability(t, scheduleNow) !== AVAILABILITY.CLOSED
    && canAccessTest(t, { isPro, purchasedBundles, bundles: availableBundles })
  );
  // Classes and tests on one timeline
  const classTime = (cls) => {
    const ms = cls.time?.includes?.('T') ? new Date(cls.time).getTime() : NaN;
    return Number.isNaN(ms) ? Infinity : ms;
  };
  const scheduleItems = [
    ...scheduledClasses.map(cls => ({ kind: 'class', id: `c-${cls.id}`, at: classTime(cls), cls })),
    ...scheduledTests.map(test => ({ kind: 'test', id: `t-${test.id}`, at: testStartMillis(test), test })),
  ].sort((a, b) => a.at - b.at);

  useEffect(() => {
    if (!studentDepartment) return;
    const q = query(
      collection(db, 'notes'),
      where('department', '==', studentDepartment)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedNotes.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setNotes(fetchedNotes);
    });
    return () => unsubscribe();
  }, [studentDepartment]);

  // Only the student's own department's subject folders are ever loaded
  useEffect(() => {
    if (!studentDepartment) return;
    const q = query(collection(db, 'note_folders'), where('department', '==', studentDepartment));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNoteFolders(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error('Failed to load note folders', err));
    return () => unsubscribe();
  }, [studentDepartment]);

  useEffect(() => {
    if (!studentDepartment) return;
    const q = query(collection(db, 'note_bundles'), where('department', '==', studentDepartment));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNoteBundles(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error('Failed to load notes bundles', err));
    return () => unsubscribe();
  }, [studentDepartment]);

  const [courseProgress, setCourseProgress] = useState(0);
  
  useEffect(() => {
    if (!studentDepartment) return;
    const email = sessionStorage.getItem('auth_email');
    if (!email) return;

    const fetchProgress = async () => {
      try {
        // Fetch all tests for this department
        const tQuery = query(collection(db, 'tests'), where('department', '==', studentDepartment));
        const tSnap = await getDocs(tQuery);
        const totalTests = tSnap.docs.length;

        // Fetch student attempts
        const aQuery = query(collection(db, 'test_attempts'), where('studentEmail', '==', email));
        const aSnap = await getDocs(aQuery);
        
        // Match unique tests attempted that belong to this dept
        const attemptedIds = new Set(aSnap.docs.map(d => d.data().testId));
        
        let validAttempts = 0;
        tSnap.docs.forEach(doc => {
          if (attemptedIds.has(doc.id)) validAttempts++;
        });
        
        if (totalTests === 0) {
           setCourseProgress(0);
        } else {
           const prog = Math.round((validAttempts / totalTests) * 100);
           setCourseProgress(prog > 100 ? 100 : prog);
        }
      } catch(err) {
        console.error('Error fetching progress', err);
      }
    };
    fetchProgress();
  }, [studentDepartment]);

  // One-time sync to pull orphaned recordings from storage into firestore
  useEffect(() => {
    const syncStorageToFirestore = async () => {
      try {
        const listRef = ref(storage, 'recordings');
        const res = await listAll(listRef);
        for (const itemRef of res.items) {
          const fileName = itemRef.name;
          // Check for exact match or name without extension (for backwards compatibility with older recordings)
          const baseName = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
          
          const q1 = query(collection(db, 'recordings'), where('fileName', '==', fileName));
          const snap1 = await getDocs(q1);
          
          const q2 = query(collection(db, 'recordings'), where('fileName', '==', baseName));
          const snap2 = await getDocs(q2);

          if (snap1.empty && snap2.empty) {
            const url = await getDownloadURL(itemRef);
            await addDoc(collection(db, 'recordings'), {
              fileName,
              url,
              teacherName: 'Teacher (Synced)',
              department: 'General',
              createdAt: serverTimestamp()
            });
            console.log("Synced orphaned recording:", fileName);
          }
        }
      } catch (err) {
        console.error("Error syncing storage:", err);
      }
    };
    syncStorageToFirestore();
    
    const fetchBundles = async () => {
      try {
        const bSnapshot = await getDocs(collection(db, 'course_bundles'));
        setAvailableBundles(bSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      } catch (e) {
        console.error("Failed to fetch bundles:", e);
      }
    };
    fetchBundles();
  }, []);

  useEffect(() => {
    const role = sessionStorage.getItem('auth_role');
    const name = sessionStorage.getItem('auth_name');
    const email = sessionStorage.getItem('auth_email');
    
    if (role !== 'student') {
      if (!role) {
        navigate('/login');
      } else {
        navigate('/403');
      }
      return;
    }
    
    setStudentName(name || 'Student');

    const checkOnboarding = async () => {
      try {
        if (email) {
          const q = query(collection(db, 'joined_students'), where('email', '==', email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const studentDoc = querySnapshot.docs[0];
            const data = studentDoc.data();
            setDocId(studentDoc.id);
            
            if (data.department) {
              setStudentDepartment(data.department);
              localStorage.setItem('student_department', data.department);
            }
            if (data.isPro) {
              setIsPro(true);
            }
            if (data.purchasedBundles) {
              setPurchasedBundles(data.purchasedBundles);
            }
            if (data.purchasedSubjects) {
              setPurchasedSubjects(data.purchasedSubjects);
            }
            if (data.purchasedNoteBundles) {
              setPurchasedNoteBundles(data.purchasedNoteBundles);
            }
            
            setStudentRecord(data);
            setAdmissionPending(admissionFormBlocksPortal(data));
          } else {
            setAdmissionPending(true);
          }
        }
      } catch (e) {
        console.error("Failed to fetch student details", e);
      } finally {
        setLoading(false);
      }
    };
    
    checkOnboarding();
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('auth_role');
    sessionStorage.removeItem('auth_email');
    sessionStorage.removeItem('auth_name');
    sessionStorage.removeItem('auth_roles');
    localStorage.removeItem('pair_id');
    localStorage.removeItem('pair_role');
    window.dispatchEvent(new Event('storage'));
    navigate('/');
  };

  const handleUpgradeToPro = async (bundleId, { formDone = false } = {}) => {
    if (!docId || !bundleId || payingBundleId) return;
    if (!formDone && needsAdmissionForm(studentRecord)) { setAdmissionForPurchase({ kind: 'bundle', id: bundleId }); return; }

    setPayingBundleId(bundleId);
    try {
      const { status, message } = await buyBundle(bundleId);
      if (status === 'PAID') {
        setPurchasedBundles(prev => (prev.includes(bundleId) ? prev : [...prev, bundleId]));
        alert('Payment successful! Your bundle is now unlocked. 🎉');
      } else if (status === 'PENDING') {
        alert('Your payment is still being processed. The bundle will unlock automatically once it is confirmed.');
      } else if (status === 'FAILED') {
        alert('Payment failed. You have not been charged. Please try again.');
      } else if (message) {
        console.warn('Checkout closed:', message);
      }
    } catch (e) {
      console.error('Payment error', e);
      alert(e.message || 'Could not start the payment. Please try again.');
    } finally {
      setPayingBundleId(null);
    }
  };

  const handleBuySubject = async (subjectId, { formDone = false } = {}) => {
    if (!docId || !subjectId || payingSubjectId) return;
    if (!formDone && needsAdmissionForm(studentRecord)) { setAdmissionForPurchase({ kind: 'subject', id: subjectId }); return; }

    setPayingSubjectId(subjectId);
    try {
      const { status, message } = await buySubject(subjectId);
      if (status === 'PAID') {
        setPurchasedSubjects(prev => (prev.includes(subjectId) ? prev : [...prev, subjectId]));
        alert('Payment successful! The subject is now unlocked. 🎉');
      } else if (status === 'PENDING') {
        alert('Your payment is still being processed. The subject will unlock automatically once it is confirmed.');
      } else if (status === 'FAILED') {
        alert('Payment failed. You have not been charged. Please try again.');
      } else if (message) {
        console.warn('Checkout closed:', message);
      }
    } catch (e) {
      console.error('Payment error', e);
      alert(e.message || 'Could not start the payment. Please try again.');
    } finally {
      setPayingSubjectId(null);
    }
  };

  const handleBuyNoteBundle = async (bundleId, { formDone = false } = {}) => {
    if (!docId || !bundleId || payingNoteBundleId) return;
    if (!formDone && needsAdmissionForm(studentRecord)) { setAdmissionForPurchase({ kind: 'notebundle', id: bundleId }); return; }

    setPayingNoteBundleId(bundleId);
    try {
      const { status, message } = await buyNoteBundle(bundleId);
      if (status === 'PAID') {
        setPurchasedNoteBundles(prev => (prev.includes(bundleId) ? prev : [...prev, bundleId]));
        alert('Payment successful! Your notes bundle is now unlocked. 🎉');
      } else if (status === 'PENDING') {
        alert('Your payment is still being processed. The bundle will unlock automatically once it is confirmed.');
      } else if (status === 'FAILED') {
        alert('Payment failed. You have not been charged. Please try again.');
      } else if (message) {
        console.warn('Checkout closed:', message);
      }
    } catch (e) {
      console.error('Payment error', e);
      alert(e.message || 'Could not start the payment. Please try again.');
    } finally {
      setPayingNoteBundleId(null);
    }
  };

  // ---- Study notes folder helpers ----
  const noteIdsUnder = (folderId) => {
    const ids = [folderId];
    noteFolders.filter(f => f.parentId === folderId).forEach(f => ids.push(...noteIdsUnder(f.id)));
    return ids;
  };
  const notesUnder = (folderId) => {
    const ids = new Set(noteIdsUnder(folderId));
    return notes.filter(n => n.folderId && ids.has(n.folderId));
  };
  const folderPrice = (f) => Number(String(f.discountedPrice || f.price || '').replace(/[^\d.]/g, '')) || 0;

  // 'owned' (bought/assigned) | 'included' (via Elite or a bundle) | 'locked'
  const subjectAccess = (subject) => {
    if (purchasedSubjects.includes(subject.id) || coveredByNoteBundle(subject.id)) return 'owned';
    const list = notesUnder(subject.id);
    if (list.length > 0 && list.every(canAccessNote)) return 'included';
    return 'locked';
  };

  const renderNoteCard = (note) => {
    const hasAccess = canAccessNote(note);
    return (
      <div key={note.id} className={`bg-white rounded-2xl border ${hasAccess ? 'border-slate-200 hover:border-blue-300 hover:shadow-md' : 'border-slate-100 opacity-75'} p-5 transition-all flex flex-col`}>
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-14 h-14 shrink-0 rounded-[14px] flex items-center justify-center shadow-inner ${hasAccess ? 'bg-blue-50 text-blue-500' : 'bg-slate-100 text-slate-400'}`}>
            <FileText size={28} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-[900] text-slate-900 text-[16px] mb-1 truncate" title={note.title}>{note.title}</h4>
            {note.description && (
              <p className="text-[13px] text-slate-500 font-medium line-clamp-2 mb-2">{note.description}</p>
            )}
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-auto">
              {note.fileName && (
                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <FileText size={12} /> {note.fileName}
                </span>
              )}
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                <Calendar size={12} /> {note.createdAt?.toDate ? note.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-slate-100">
          {hasAccess ? (
            <button onClick={() => { setViewingNoteUrl(note.url); setViewingNoteAccess(true); }} className="w-full py-2.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
              <Eye size={16} /> View Full Note
            </button>
          ) : (
            <button onClick={() => { setViewingNoteUrl(note.url); setViewingNoteAccess(false); }} className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
              <Eye size={16} /> Preview (3 Pages)
            </button>
          )}
        </div>
      </div>
    );
  };

  // If Cashfree redirected back with ?order_id=..., confirm that order with the server
  useEffect(() => {
    const orderId = new URLSearchParams(window.location.search).get('order_id');
    if (!orderId || !docId) return;
    window.history.replaceState({}, '', window.location.pathname);
    verifyOrder(orderId)
      .then(async (status) => {
        if (status === 'PAID') {
          const snap = await getDocs(query(collection(db, 'joined_students'), where('email', '==', sessionStorage.getItem('auth_email') || '')));
          if (!snap.empty) {
            setPurchasedBundles(snap.docs[0].data().purchasedBundles || []);
            setPurchasedSubjects(snap.docs[0].data().purchasedSubjects || []);
            setPurchasedNoteBundles(snap.docs[0].data().purchasedNoteBundles || []);
          }
          alert('Payment successful! Your bundle is now unlocked. 🎉');
        }
      })
      .catch((e) => console.error('Order verification failed', e));
  }, [docId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (admissionPending || admissionForPurchase) {
    const purchase = admissionPending ? null : admissionForPurchase;
    return (
      <AdmissionGate
        studentId={docId}
        student={studentRecord}
        email={sessionStorage.getItem('auth_email') || ''}
        onLogout={handleLogout}
        forPayment={!!purchase}
        onCancel={() => setAdmissionForPurchase(null)}
        onSubmitted={({ studentId, name, department }) => {
          setDocId(studentId);
          setStudentName(name);
          sessionStorage.setItem('auth_name', name);
          setStudentDepartment(department);
          localStorage.setItem('student_department', department);
          // Submitted once - later purchases go straight to payment
          setStudentRecord(prev => ({ ...(prev || {}), admissionFormSubmitted: true }));
          setAdmissionPending(false);
          setAdmissionForPurchase(null);
          window.dispatchEvent(new Event('storage'));
          // Carry on with the purchase that asked for the form
          if (purchase?.kind === 'bundle') handleUpgradeToPro(purchase.id, { formDone: true });
          else if (purchase?.kind === 'subject') handleBuySubject(purchase.id, { formDone: true });
          else if (purchase?.kind === 'notebundle') handleBuyNoteBundle(purchase.id, { formDone: true });
        }}
      />
    );
  }

  return (
    <div className="h-screen bg-slate-50 flex relative overflow-hidden">
      
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-white border-b border-slate-200 flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center p-1 border border-blue-100 flex-shrink-0">
            <img src={logoImg} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <h2 className="font-[900] text-blue-700 text-sm leading-tight truncate">MS Academy</h2>
            <p className="text-[11px] font-bold text-slate-400 truncate">Student Portal</p>
          </div>
        </Link>
        <button
          onClick={() => setIsMobileNavOpen(true)}
          aria-label="Open menu"
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 flex-shrink-0"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile Sidebar Drawer */}
      {isMobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsMobileNavOpen(false)}></div>
          <div className="relative z-10 w-72 max-w-[80vw] h-full bg-white flex flex-col shadow-2xl animate-in slide-in-from-left duration-300">
            <div className="p-5 flex items-center justify-between border-b border-slate-100">
              <Link to="/" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center p-1 border border-blue-100 flex-shrink-0">
                  <img src={logoImg} alt="Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h2 className="font-[900] text-blue-700 text-lg leading-tight">MS Academy</h2>
                  <p className="text-xs font-bold text-slate-400">Student Portal</p>
                </div>
              </Link>
              <button onClick={() => setIsMobileNavOpen(false)} aria-label="Close menu" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
              {sidebarNavItems.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => { setActiveTab(key); setIsMobileNavOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === key ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </button>
              ))}
              <button
                onClick={() => { setActiveTab('upgrade'); setIsMobileNavOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all mt-4 ${activeTab === 'upgrade' ? 'pro-badge border border-[#F2C94C] text-[#B8860B]' : isPro ? 'text-[#B8860B] hover:bg-[#FFF9E6]' : 'pro-badge border border-[#F2C94C] text-[#B8860B]'}`}
              >
                <Crown size={18} className="text-[#B8860B]" />
                <span>{isPro ? 'Elite Benefits' : 'Upgrade to Elite'}</span>
              </button>
            </nav>
            <div className="p-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center gap-3 px-2">
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-black text-[14px] flex items-center justify-center flex-shrink-0">
                  {(studentName || 'S').trim().charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0 overflow-hidden">
                  <span className="font-bold text-[13px] text-slate-800 truncate">{studentName}</span>
                  <span className="text-[11px] font-semibold text-slate-400 truncate">{sessionStorage.getItem('auth_email') || ''}</span>
                </div>
              </div>
              <RoleSwitcher onNavigate={() => setIsMobileNavOpen(false)} />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-red-500 hover:bg-red-50 transition-all"
              >
                <LogOut size={18} />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`transition-all duration-300 flex-shrink-0 sticky top-0 h-screen z-20 ${isCollapsed ? 'w-[88px]' : 'w-64'} bg-white border-r border-slate-200 flex flex-col hidden md:flex`}>
        {/* Collapse Button */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-6 bg-white border border-slate-200 rounded-full p-1.5 text-slate-400 hover:text-[#1D4ED8] hover:border-[#1D4ED8] shadow-sm z-50 transition-colors"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <Link to="/" className={`p-5 flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3'} hover:bg-slate-50 transition-colors w-full`}>
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center p-1 border border-blue-100 flex-shrink-0 mx-auto md:mx-0">
            <img src={logoImg} alt="Logo" className="w-full h-full object-contain" />
          </div>
          {!isCollapsed && (
            <div>
              <h2 className="font-[900] text-blue-700 text-lg leading-tight whitespace-nowrap">MS Academy</h2>
              <p className="text-xs font-bold text-slate-400 whitespace-nowrap">Student Portal</p>
            </div>
          )}
        </Link>

        <nav className="flex-1 min-h-0 px-4 py-3 space-y-1.5 overflow-y-auto">
          {sidebarNavItems.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-2.5 rounded-xl font-bold transition-all ${activeTab === key ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
            >
              <Icon size={18} />
              {!isCollapsed && <span>{label}</span>}
            </button>
          ))}

          {/* Upgrade to Premium Banner */}
          {!isCollapsed && !isPro && (
            <div className="mt-6 bg-gradient-to-br from-[#4f46e5] to-[#8b5cf6] rounded-[20px] p-5 text-white shadow-[0_10px_25px_rgba(99,102,241,0.4)] relative overflow-hidden">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-bold text-[18px] leading-tight w-[60%] tracking-tight">Upgrade to<br/>Premium</h4>
                <div className="text-4xl drop-shadow-md z-10 relative">🎓</div>
              </div>
              <p className="text-[12.5px] text-indigo-50 mb-5 leading-[1.4] font-medium opacity-90">Unlock premium questions,<br/>advanced analytics & more.</p>
              <button 
                onClick={() => setActiveTab('upgrade')} 
                className="w-full bg-white text-[#5b21b6] font-bold text-[14px] py-2.5 rounded-[14px] hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98]"
              >
                Upgrade Now <ArrowRight size={16} strokeWidth={2.5} />
              </button>
            </div>
          )}
          
          {/* Original button fallback for collapsed state or Pro users */}
          {(isCollapsed || isPro) && (
            <div className="pt-3 mt-3 border-t border-slate-200">
              <button 
                onClick={() => setActiveTab('upgrade')}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-2.5 rounded-xl font-bold transition-all ${activeTab === 'upgrade' ? 'pro-badge border border-[#F2C94C] text-[#B8860B] shadow-sm' : isPro ? 'text-[#B8860B] hover:bg-[#FFF9E6]' : 'pro-badge border border-[#F2C94C] text-[#B8860B] shadow-md hover:shadow-lg hover:-translate-y-0.5'}`}
              >
                <Crown size={18} className={isPro && activeTab !== 'upgrade' ? 'text-[#B8860B]' : 'text-[#B8860B]'} />
                {!isCollapsed && <span>{isPro ? 'Elite Benefits' : 'Upgrade to Elite'}</span>}
              </button>
            </div>
          )}
        </nav>

        <div className={`p-3 border-t border-slate-100 space-y-2 ${isCollapsed ? 'px-2' : ''}`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-black text-[14px] flex items-center justify-center flex-shrink-0">
              {(studentName || 'S').trim().charAt(0).toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0 overflow-hidden">
                <span className="font-bold text-[13px] text-slate-800 truncate">{studentName}</span>
                <span className="text-[11px] font-semibold text-slate-400 truncate">{sessionStorage.getItem('auth_email') || ''}</span>
              </div>
            )}
          </div>
          <RoleSwitcher collapsed={isCollapsed} />
          <button
            onClick={handleLogout}
            title="Log Out"
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-2.5 rounded-xl font-bold text-red-500 hover:bg-red-50 transition-all`}
          >
            <LogOut size={18} />
            {!isCollapsed && <span>Log Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 min-w-0 p-4 pt-20 sm:p-6 sm:pt-20 md:p-8 overflow-y-auto`}>
        <header className="mb-8 flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
          <div>
            <h1 className="text-2xl sm:text-3xl font-[900] text-slate-900 tracking-tight flex items-center gap-3">
              Welcome back, {studentName.split(' ')[0]} 👋
              <span className={isPro ? 'elite-badge cursor-default' : `inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[12px] font-[900] uppercase tracking-widest shadow-sm cursor-default ${bundleCount > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                {tier.label} <span className="text-[14px] leading-none">{tier.icon}</span>
                {tier.tier === 'prime' && <span className="normal-case tracking-normal font-[800] opacity-80">&middot; {bundleCount} {bundleCount === 1 ? 'bundle' : 'bundles'}</span>}
              </span>
            </h1>
            <p className="text-slate-500 font-medium text-sm sm:text-[15px] mt-1 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              {studentDepartment || "Department Not Set"}
            </p>
          </div>
          <button 
            onClick={() => navigate('/student/profile')}
            className="w-12 h-12 shrink-0 bg-gradient-to-br from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 rounded-full flex items-center justify-center text-2xl transition-all shadow-sm border border-blue-200 hover:shadow-md"
            title={`${tier.label} - My Profile`}
          >
            {tier.icon}
          </button>
        </header>

        {/* New-test and starting-in-30-minutes alerts */}
        <TestAlerts
          department={studentDepartment}
          isPro={isPro}
          purchasedBundles={purchasedBundles}
          bundles={availableBundles}
          onOpenTests={() => setActiveTab('tests')}
        />

        {activeTab === 'learning' && (
          <div className="space-y-8 mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Active Courses */}
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-[900] text-slate-900">Your Enrolled Courses</h2>
                <button onClick={() => navigate('/gate-courses')} className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors">Browse catalog &rarr;</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Dynamic Course Card */}
                {(() => {
                  const match = studentDepartment?.match(/\(([^)]+)\)/);
                  const deptCode = match ? match[1] : null;
                  const course = gateCoursesData.find(c => c.code === deptCode);
                  
                  if (!course) return (
                    <div className="col-span-full text-center text-slate-500 py-6">
                      No specific courses found for your department.
                    </div>
                  );
                  
                  const Icon = course.icon || BookOpen;
                  
                  return (
                    <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all cursor-pointer group" onClick={() => navigate(course.path)}>
                      <div className="flex items-start justify-between mb-5">
                        <div className="w-12 h-12 rounded-[14px] flex items-center justify-center bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-inner">
                          <Icon size={24} />
                        </div>
                        <span className="text-xs font-[900] text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">{courseProgress}%</span>
                      </div>
                      <h3 className="font-[900] text-slate-900 text-[17px] mb-4 group-hover:text-blue-600 transition-colors leading-snug">{course.name}</h3>
                      
                      {/* Progress Bar */}
                      <div className="w-full bg-slate-100 h-2.5 rounded-full mb-4 overflow-hidden shadow-inner">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full relative transition-all duration-1000"
                          style={{ width: `${courseProgress}%` }}
                        >
                        </div>
                      </div>
                      
                      <p className="text-[13px] text-slate-500 font-bold flex items-center gap-2">
                        {courseProgress === 100 ? (
                          <><CheckCircle size={14} className="text-green-500" /> Completed</>
                        ) : courseProgress > 0 ? (
                          <><span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span> Continue Learning</>
                        ) : (
                          <><span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span> Start Learning</>
                        )}
                      </p>
                    </div>
                  );
                })()}

              </div>
            </div>

            {/* Study Materials */}
            <div>
              <h2 className="text-xl font-[900] text-slate-900 mb-5 mt-4 flex items-center gap-2">
                Recent Study Materials
                {!isPro && <Lock size={16} className="text-slate-400" />}
              </h2>
              <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden relative">

                <div className="divide-y divide-slate-100">
                  {notes.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 font-medium">
                      No study materials available yet.
                    </div>
                  ) : (
                    notes.slice(0, 5).map(note => {
                      const hasAccess = canAccessNote(note);
                      return (
                        <div key={note.id} className={`p-4 sm:p-6 flex items-center justify-between transition-colors group ${!hasAccess ? 'opacity-50 select-none' : 'hover:bg-slate-50'}`}>
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform ${hasAccess ? 'bg-blue-50 text-blue-500' : 'bg-slate-100 text-slate-400'}`}>
                              <FileText size={24} />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 text-sm sm:text-[15px]">{note.title}</h4>
                              <p className="text-[12px] text-slate-500 font-bold mt-1">
                                {note.fileName ? `${note.fileName} • ` : ''}
                                {note.createdAt?.toDate ? note.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Just now'}
                              </p>
                            </div>
                          </div>
                          {hasAccess ? (
                            <button onClick={() => { setViewingNoteUrl(note.url); setViewingNoteAccess(true); }} className="px-4 py-2.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 rounded-xl text-sm font-bold transition-colors flex items-center gap-2">
                              <Eye size={16} /> <span className="hidden sm:inline">View Full</span>
                            </button>
                          ) : (
                            <button onClick={() => { setViewingNoteUrl(note.url); setViewingNoteAccess(false); }} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl text-sm font-bold transition-colors flex items-center gap-2">
                              <Eye size={16} /> <span className="hidden sm:inline">Preview</span>
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="p-5 bg-slate-50 border-t border-slate-100 text-center">
                  <button onClick={() => setActiveTab('notes')} className="text-[13px] font-[900] text-blue-600 hover:text-blue-700 uppercase tracking-wide">View all study materials &rarr;</button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'live' && (
          <StudentLiveClasses department={studentDepartment} isPro={isPro} purchasedBundles={purchasedBundles} bundles={availableBundles} />
        )}

        {activeTab === 'recordings' && (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm mt-6 relative overflow-hidden">
            <h2 className="text-2xl font-[900] text-slate-900 mb-6 flex items-center gap-3">
              <PlayCircle className="text-purple-500" size={28} /> Past Class Recordings
            </h2>
            
            <div>
              {recordings.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <PlayCircle size={32} />
                  </div>
                  <h3 className="text-xl font-[900] text-slate-900 mb-2">No Recordings Yet</h3>
                  <p className="text-slate-500 max-w-md mx-auto">
                    Once live classes are completed, their recordings will automatically appear here for you to review.
                  </p>
                </div>
              ) : (() => {
                const subjectFolders = groupBySubject(recordings);
                const openFolder = subjectFolders.length === 1
                  ? subjectFolders[0]
                  : subjectFolders.find(f => f.name === recordingSubject) || null;

                // Subject folders first; a folder opens into its videos
                if (!openFolder) {
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {subjectFolders.map(folder => (
                        <button
                          key={folder.name}
                          onClick={() => setRecordingSubject(folder.name)}
                          className="text-left bg-slate-50 border border-slate-100 rounded-2xl p-5 hover:shadow-md hover:border-purple-200 transition-all flex items-center gap-4"
                        >
                          <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                            <Folder size={24} />
                          </div>
                          <div className="min-w-0">
                            <h3 className={`font-bold text-lg truncate ${folder.name === NO_SUBJECT ? 'text-slate-500' : 'text-slate-800'}`}>{folder.name}</h3>
                            <p className="text-sm text-slate-500 font-medium">{folder.items.length} recording{folder.items.length !== 1 ? 's' : ''}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                }

                return (
                <div className="space-y-4">
                  {subjectFolders.length > 1 && (
                    <button
                      onClick={() => setRecordingSubject(null)}
                      className="inline-flex items-center gap-2 text-sm font-bold text-purple-700 hover:text-purple-900"
                    >
                      <ArrowLeft size={16} /> All subjects
                    </button>
                  )}
                  <h3 className="text-lg font-[900] text-slate-800 flex items-center gap-2">
                    <Folder size={20} className="text-purple-500" /> {openFolder.name}
                  </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {openFolder.items.map(rec => (
                    <div key={rec.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-5 hover:shadow-md hover:border-purple-200 transition-all group">
                      <div className="aspect-video bg-slate-200 rounded-xl mb-4 relative overflow-hidden group-cursor-pointer flex items-center justify-center">
                         {!canAccessRecording(rec) ? (
                            <Lock size={48} className="text-slate-400 drop-shadow-md z-10" />
                         ) : (
                            <PlayCircle size={48} className="text-white drop-shadow-md opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all z-10 cursor-pointer" onClick={() => setPlayingRecording({ id: rec.id, url: rec.url, duration: rec.duration })} />
                         )}
                         <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent pointer-events-none"></div>
                         <span className="absolute bottom-3 left-3 text-white text-xs font-bold px-2 py-1 bg-black/40 rounded-lg pointer-events-none backdrop-blur-sm">
                           {new Date(rec.createdAt?.toMillis() || Date.now()).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                         </span>
                         <VideoDuration url={rec.url} storedDuration={rec.duration} />
                      </div>
                      <h3 className="font-bold text-slate-800 text-lg line-clamp-2 mb-1">{rec.topic || rec.fileName}</h3>
                      <p className="text-sm text-slate-500 font-medium">By {rec.teacherName}</p>
                      
                      {!canAccessRecording(rec) ? (
                        <button disabled className="w-full mt-4 py-2.5 bg-slate-50 text-slate-400 border border-slate-200 rounded-xl font-bold flex items-center justify-center gap-2 cursor-not-allowed">
                          <Lock size={16} /> Locked (Elite)
                        </button>
                      ) : (
                        <button onClick={() => setPlayingRecording({ id: rec.id, url: rec.url, duration: rec.duration })} className="w-full mt-4 py-2.5 bg-purple-100 text-purple-700 hover:bg-purple-600 hover:text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
                          <Play size={16} /> Watch Now
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                </div>
                );
              })()}
            </div>
          </div>
        )}

        {activeTab === 'notes' && (() => {
          const currentNoteFolder = noteStack[noteStack.length - 1] || null;
          const currentSubject = noteStack[0] || null;
          const parentKey = currentNoteFolder ? currentNoteFolder.id : null;
          const childFolders = noteFolders
            .filter(f => (f.parentId || null) === parentKey)
            .sort((a, b) => a.name.localeCompare(b.name));
          const filesHere = notes.filter(n => (n.folderId || null) === parentKey);
          const subjectStatus = currentSubject ? subjectAccess(currentSubject) : null;

          const buyButton = (subject, full = false) => {
            const price = folderPrice(subject);
            if (!price) return null;
            return (
              <button
                onClick={(e) => { e.stopPropagation(); handleBuySubject(subject.id); }}
                disabled={!!payingSubjectId}
                className={`${full ? 'w-full' : ''} px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-[900] rounded-xl shadow-[0_4px_14px_rgba(37,99,235,0.25)] transition-all`}
              >
                {payingSubjectId === subject.id ? 'Processing…' : `Buy Subject • ₹${price}`}
              </button>
            );
          };

          return (
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm mt-6 relative overflow-hidden">
              <h2 className="text-2xl font-[900] text-slate-900 mb-4 flex items-center gap-3">
                <FileText className="text-blue-500" size={28} /> Study Notes
              </h2>

              {/* Breadcrumb */}
              <div className="flex flex-wrap items-center gap-1.5 text-sm font-bold mb-6">
                <button onClick={() => setNoteStack([])} className={`px-2.5 py-1 rounded-lg transition-colors ${noteStack.length === 0 ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-100'}`}>
                  {studentDepartment || 'My Department'}
                </button>
                {noteStack.map((f, i) => (
                  <React.Fragment key={f.id}>
                    <ChevronRight size={14} className="text-slate-300" />
                    <button onClick={() => setNoteStack(noteStack.slice(0, i + 1))} className={`px-2.5 py-1 rounded-lg transition-colors ${i === noteStack.length - 1 ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-100'}`}>
                      {f.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>

              {/* Subject access banner */}
              {currentSubject && (
                <div className={`mb-6 rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-3 ${subjectStatus === 'locked' ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                  <div className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    {subjectStatus === 'locked' ? <Lock size={16} className="text-amber-600" /> : <CheckCircle size={16} className="text-emerald-600" />}
                    {subjectStatus === 'owned' && 'You own this subject. Every note inside is unlocked.'}
                    {subjectStatus === 'included' && 'Unlocked with your current plan.'}
                    {subjectStatus === 'locked' && (folderPrice(currentSubject) ? 'Unlock this whole subject to read every note inside.' : 'This subject is available with a course bundle.')}
                  </div>
                  {subjectStatus === 'locked' && buyButton(currentSubject)}
                </div>
              )}

              {/* Notes bundles for this department */}
              {noteStack.length === 0 && noteBundles.filter(b => purchasedNoteBundles.includes(b.id) || folderPrice(b)).length > 0 && (
                <div className="mb-8">
                  <h3 className="text-[12px] font-[800] uppercase tracking-wider text-slate-400 mb-3">Notes Bundles</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {noteBundles.filter(b => purchasedNoteBundles.includes(b.id) || folderPrice(b)).map(b => {
                      const owned = purchasedNoteBundles.includes(b.id);
                      const covered = noteFolders.filter(f => !f.parentId && (b.includeAll || (b.subjectIds || []).includes(f.id)));
                      const worth = covered.reduce((sum, f) => sum + folderPrice(f), 0);
                      const price = folderPrice(b);
                      return (
                        <div key={b.id} className={`rounded-2xl border p-5 flex flex-col gap-4 ${owned ? 'bg-emerald-50 border-emerald-200' : 'bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200'}`}>
                          <div className="flex items-start gap-3">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${owned ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}><Package size={26} /></div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-[900] text-slate-900 leading-tight">{b.name}</h4>
                              <p className="text-xs font-bold text-slate-500 mt-1">
                                {b.includeAll ? `All ${covered.length} subjects` : `${covered.length} subjects`} of {studentDepartment}
                                {!owned && worth > price && price > 0 ? ` • worth ₹${worth}` : ''}
                              </p>
                            </div>
                            {owned && <span className="text-[11px] font-[800] px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">Owned</span>}
                          </div>
                          {!owned && (
                            <button
                              onClick={() => handleBuyNoteBundle(b.id)}
                              disabled={!!payingNoteBundleId}
                              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-[900] rounded-xl shadow-[0_4px_14px_rgba(79,70,229,0.25)] transition-all"
                            >
                              {payingNoteBundleId === b.id ? 'Processing…' : `Buy Full Notes • ₹${price}`}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {childFolders.length === 0 && filesHere.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FileText size={32} />
                  </div>
                  <h3 className="text-xl font-[900] text-slate-900 mb-2">{noteStack.length ? 'This folder is empty' : 'No Study Notes Yet'}</h3>
                  <p className="text-slate-500 max-w-md mx-auto">
                    {noteStack.length ? 'Notes added here will show up automatically.' : 'Once study materials are uploaded for your department, they will appear here.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  {childFolders.length > 0 && (
                    <div>
                      <h3 className="text-[12px] font-[800] uppercase tracking-wider text-slate-400 mb-3">{noteStack.length === 0 ? 'Subjects' : 'Topics'}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {childFolders.map(f => {
                          const isSubject = noteStack.length === 0;
                          const status = isSubject ? subjectAccess(f) : null;
                          const count = notesUnder(f.id).length;
                          return (
                            <div
                              key={f.id}
                              onClick={() => setNoteStack([...noteStack, f])}
                              className="cursor-pointer bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-md transition-all flex flex-col gap-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0"><Folder size={26} /></div>
                                {isSubject && (
                                  <span className={`text-[11px] font-[800] px-2.5 py-1 rounded-full ${status === 'locked' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-600'}`}>
                                    {status === 'owned' ? 'Owned' : status === 'included' ? 'Unlocked' : 'Locked'}
                                  </span>
                                )}
                              </div>
                              <div>
                                <h4 className="font-[900] text-slate-900 leading-tight line-clamp-2" title={f.name}>{f.name}</h4>
                                <p className="text-xs font-bold text-slate-400 mt-1">{count} {count === 1 ? 'note' : 'notes'}</p>
                              </div>
                              {isSubject && status === 'locked' && (
                                folderPrice(f) ? buyButton(f, true) : <p className="text-xs font-bold text-slate-400">Included in course bundles</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {filesHere.length > 0 && (
                    <div>
                      {(childFolders.length > 0 || noteStack.length === 0) && (
                        <h3 className="text-[12px] font-[800] uppercase tracking-wider text-slate-400 mb-3">{noteStack.length === 0 ? 'Other Notes' : 'Notes'}</h3>
                      )}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {filesHere.map(renderNoteCard)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {activeTab === 'schedule' && (
          <div className="mt-6 space-y-6">
            <h2 className="text-2xl font-[900] text-slate-800 flex items-center gap-2">
              <Calendar className="text-blue-500" size={24} /> My Schedule
            </h2>

            {scheduleItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {scheduleItems.map(item => item.kind === 'test' ? (() => {
                  const test = item.test;
                  const start = testStartMillis(test);
                  const close = testCloseMillis(test);
                  const isOpen = testAvailability(test, scheduleNow) === AVAILABILITY.OPEN;
                  const soon = !isOpen && start - scheduleNow <= 30 * 60 * 1000;
                  return (
                    <div key={item.id} className="p-6 border border-indigo-200 rounded-3xl hover:border-indigo-400 hover:shadow-lg transition-all bg-white flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full uppercase tracking-wide">
                            <FileText size={12} /> Test
                          </span>
                          {isOpen ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full uppercase tracking-wide">Open now</span>
                          ) : soon ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full uppercase tracking-wide animate-pulse"><Clock size={12} /> Starts in {formatCountdown(start - scheduleNow)}</span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full uppercase tracking-wide"><Calendar size={12} /> Opens in {formatCountdown(start - scheduleNow)}</span>
                          )}
                        </div>
                        <h4 className="text-[18px] leading-tight font-[900] text-slate-900 mb-2">{test.title}</h4>
                        <div className="text-sm font-bold text-slate-700">{formatTestTime(start)}</div>
                        {close !== null && <div className="text-xs font-semibold text-slate-500 mt-1">Closes {formatTestTime(close)}</div>}
                        {test.subject && <p className="text-sm text-slate-500 font-medium mt-2 truncate">{test.subject}</p>}
                      </div>
                      <div className="flex items-center justify-between gap-3 mt-2 text-[13px] font-semibold text-slate-400 border-t border-slate-100 pt-4">
                        <span className="flex items-center gap-3">
                          <span className="flex items-center gap-1.5"><Clock size={14} /> {test.duration || 0} min</span>
                          <span>{test.questions?.length || 0} Qs</span>
                        </span>
                        <button onClick={() => setActiveTab('tests')} className="text-indigo-600 hover:text-indigo-800 font-bold">
                          {isOpen ? 'Start Test' : 'View'} →
                        </button>
                      </div>
                    </div>
                  );
                })() : (() => { const cls = item.cls; return (
                  <div key={item.id} className="p-6 border border-slate-200 rounded-3xl hover:border-blue-300 hover:shadow-lg transition-all group bg-white flex flex-col justify-between gap-4">
                    <div>
                      {isStartingSoon(cls.time) ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full mb-3 animate-pulse uppercase tracking-wide">
                          <Clock size={12} /> Starting Soon
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full mb-3 uppercase tracking-wide">
                          <Calendar size={12} /> Scheduled
                        </div>
                      )}
                      <h4 className="text-[18px] leading-tight font-[900] text-slate-900 mb-2">{cls.topic}</h4>
                      <div className="text-sm font-bold text-slate-700 mb-3">
                        {cls.time.includes('T') ? new Date(cls.time).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : cls.time}
                      </div>
                      
                      <p className="text-sm text-slate-500 font-medium flex items-center gap-2 mt-2">
                         <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">{cls.teacherName ? cls.teacherName[0] : 'T'}</span>
                         {cls.teacherName || 'Teacher'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-[13px] font-semibold text-slate-400 border-t border-slate-100 pt-4">
                      <span className="flex items-center gap-1.5"><Clock size={14} /> {cls.duration}</span>
                    </div>
                  </div>
                ); })())}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-sm text-center">
                <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Calendar size={32} />
                </div>
                <h2 className="text-2xl font-[900] text-slate-900 mb-2">Your Calendar is Clear</h2>
                <p className="text-slate-500 max-w-md mx-auto">
                  No upcoming tests or classes are scheduled right now.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <Analytics
            studentViewOnlyEmail={sessionStorage.getItem('auth_email')}
            studentViewOnlyName={studentName}
            openTestId={analyticsTestId}
            onOpenedTest={() => setAnalyticsTestId(null)}
            onReviewSolutions={(testId) => { setReviewTestId(testId); setActiveTab('tests'); }}
          />
        )}

        {activeTab === 'tests' && (
          <StudentTests
            isPro={isPro}
            department={studentDepartment}
            purchasedBundles={purchasedBundles}
            bundles={availableBundles}
            onTestCompleted={(testId) => { setReviewTestId(null); setAnalyticsTestId(testId); setActiveTab('analytics'); }}
            reviewTestId={reviewTestId}
            onReviewClosed={reviewTestId ? () => { setAnalyticsTestId(reviewTestId); setReviewTestId(null); setActiveTab('analytics'); } : null}
          />
        )}

        {activeTab === 'upgrade' && (
          <div className="max-w-6xl mx-auto py-10 px-4">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-500 mb-6 shadow-sm border border-blue-100">
                <Crown size={40} />
              </div>
              <h2 className="text-4xl font-[900] text-slate-900 tracking-tight mb-4">
                Explore MS Academy Course Bundles
              </h2>
              <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto">
                Unlock your true potential and get access to all our premium GATE preparation features by purchasing a bundle below.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {availableBundles.length === 0 ? (
                <div className="col-span-full text-center py-12 text-slate-500 font-medium">
                  No course bundles available at the moment. Please check back later!
                </div>
              ) : (
                (() => {
                  const filteredBundles = availableBundles.filter(b => 
                    b.department === studentDepartment
                  );
                  
                  if (filteredBundles.length === 0) {
                    return (
                      <div className="col-span-full text-center py-12 text-slate-500 font-medium">
                        No course bundles available for your department at the moment.
                      </div>
                    );
                  }
                  
                  return filteredBundles.map(bundle => {
                    const isPurchased = purchasedBundles.includes(bundle.id);
                    return (
                    <div key={bundle.id} className={`bg-white rounded-[24px] border ${isPurchased ? 'border-emerald-200 shadow-emerald-500/10' : 'border-blue-200 shadow-blue-500/10'} shadow-xl overflow-hidden flex flex-col relative`}>
                      {isPurchased && (
                        <div className="absolute top-4 right-4 bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full z-30 flex items-center gap-1 shadow-md">
                           ✓ Purchased
                        </div>
                      )}
                      {bundle.imageUrl ? (
                        <div className="relative w-full h-56 bg-slate-50 flex items-center justify-center overflow-hidden p-2">
                          <img src={bundle.imageUrl} alt={bundle.name} className="relative z-10 w-full h-full object-contain transition-transform duration-500 hover:scale-105" />
                        </div>
                      ) : (
                        <div className="w-full h-56 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center relative z-10">
                          <BookOpen size={48} className="text-slate-300" />
                        </div>
                      )}
                      <div className="p-6 flex-1 flex flex-col">
                        <div className="mb-4">
                          <h3 className="text-xl font-[900] text-slate-900 line-clamp-2 leading-tight">{bundle.name}</h3>
                          <p className="text-sm text-slate-500 font-medium mt-1">{bundle.tagline}</p>
                        </div>
                        
                        <div className="flex items-end gap-2 mb-6">
                          <span className="text-3xl font-[900] text-slate-900">₹{bundle.discountedPrice || bundle.price}</span>
                          {bundle.discountedPrice && bundle.discountedPrice !== bundle.price && (
                            <span className="text-sm font-bold text-slate-400 line-through mb-1">₹{bundle.price}</span>
                          )}
                        </div>

                        <div className="flex-1">
                          <ul className="space-y-3 mb-6">
                            {(bundle.features || []).map((feature, idx) => (
                              <li key={idx} className="flex items-start gap-3">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isPurchased ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                  <span className="text-[10px] font-bold">✓</span>
                                </div>
                                <span className="text-sm text-slate-600 font-medium">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        {isPurchased ? (
                          <button 
                            disabled
                            className="w-full py-3 bg-slate-100 text-slate-400 font-bold rounded-xl cursor-not-allowed"
                          >
                            Already Owned
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleUpgradeToPro(bundle.id)}
                            disabled={!!payingBundleId}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-[900] rounded-xl shadow-[0_4px_14px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] transition-all hover:-translate-y-0.5"
                          >
                            {payingBundleId === bundle.id ? 'Processing…' : 'Buy Now'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                  });
                })()
              )}
            </div>
          </div>
        )}
      </main>

      {/* In-App Video Player Modal */}
      {playingRecording && (
        <RecordingPlayerModal recording={playingRecording} onClose={() => setPlayingRecording(null)} />
      )}

      {/* Note Viewer Modal */}
      {viewingNoteUrl && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-4">
          <button 
            onClick={() => setViewingNoteUrl(null)}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors z-10"
          >
            ✕
          </button>
          <div className="w-full max-w-5xl h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col relative">
            <PDFViewer 
               url={viewingNoteUrl} 
               previewLimit={viewingNoteAccess ? null : 3} 
               onUpgrade={() => { setViewingNoteUrl(null); setActiveTab('upgrade'); }} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
