import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import CreateTestButton from './CreateTestButton';
import { 
  Users, FileText, LayoutDashboard, LayoutGrid, Settings, Mail, LogOut,
  Search, Filter, Check, X, Eye, BookOpen, Book, Clock, Tag, RefreshCw,
  ChevronLeft, ChevronRight, ChevronDown, UserCheck, Database, BarChart2, Megaphone, Sparkles,
  Plus, Trophy, CheckCircle2, TrendingUp, MailPlus, Trash2, Package, Calendar, Edit2, ArrowRight, MoreHorizontal, Bell, ArrowUpRight, Wallet, IndianRupee, Video, ShieldCheck, Menu, Images, MessageSquareText,
  PhoneCall, Phone, MessageCircle, Star, ScrollText
} from 'lucide-react';
import emailjs from '@emailjs/browser';
import logoImg from '../assets/msgate_logo.png';
import { db, storage } from '../firebase';
import { sendWebhookEmail } from '../utils/emailWebhook';
import { STUDENT_DEPARTMENTS } from '../utils/subjects';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc, onSnapshot, serverTimestamp, arrayUnion, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import QuestionBank from './admin/QuestionBank';
import QuestionImportLogs from './admin/QuestionImportLogs';
import { prewarmQuestionBankCache } from '../utils/questionBankCache';
import NotesManager from './admin/NotesManager';
import RecordingsManager from './admin/RecordingsManager';
import Analytics from './admin/Analytics';
import AIGenerator from './admin/AIGenerator';
import AttributesManager from './admin/AttributesManager';
import CourseSetup from './admin/CourseSetup';
import TypistDirectory from './admin/TypistDirectory';
import StudentDirectory from './admin/StudentDirectory';
import TeacherDirectory from './admin/TeacherDirectory';
import FeesTracker from './admin/FeesTracker';
import SalaryManager from './admin/SalaryManager';
import TestsManager from './TestsManager';
import TestFeedbackViewer from './admin/TestFeedbackViewer';
import ReportedQuestions from './admin/ReportedQuestions';
import ReportCountBadge, { usePendingReportCount } from './shared/ReportCountBadge';
import InvoiceGenerator from './admin/InvoiceGenerator';
import WelcomeLetter from './admin/WelcomeLetter';
import BlogManager from './admin/BlogManager';
import GalleryManager from './admin/GalleryManager';
import PopupManager from './admin/PopupManager';
import RoleSwitcher from './shared/RoleSwitcher';
import Toast from './shared/Toast';

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'Anonymous';
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});

// Emails go through the shared sender (utils/emailWebhook - the Google Apps Script webhook).
// Throws if the email didn't go out.
const sendEmailViaGAS = (to, subject, htmlMessage, attachment = null) =>
  sendWebhookEmail({ to, subject, html: htmlMessage, attachments: attachment ? [].concat(attachment) : undefined });

const toDate = (v) => {
  if (!v) return null;
  if (typeof v.toDate === 'function') return v.toDate();
  if (typeof v.seconds === 'number') return new Date(v.seconds * 1000);
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

const formatTestOctDate = (test) => {
  const raw = test?.scheduledTime || test?.createdAt || test?.date;
  const d = toDate(raw);
  if (!d) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Percentage change between two periods; null when there is no baseline to compare against
const pctChange = (curr, prev) => (prev > 0 ? Math.round(((curr - prev) / prev) * 100) : null);

const VALID_ADMIN_TABS = [
  'overview', 'teachers', 'typists', 'queries', 'questions', 'premium_questions',
  'logs', 'question_logs',
  'reported', 'notes', 'recordings', 'attributes', 'analytics', 'popup',
  'courses', 'invoice', 'welcome_letter', 'fees', 'salary', 'ai', 'tests', 'test_feedback',
  'blogs', 'gallery'
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const activeTab = (rawTab && VALID_ADMIN_TABS.includes(rawTab)) ? rawTab : 'overview';

  const setActiveTab = (newTab) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (!newTab || newTab === 'overview' || newTab === 'dashboard') {
        next.delete('tab');
      } else {
        next.set('tab', newTab);
      }
      return next;
    });
  };
  const [testsView, setTestsView] = useState('templates'); // 'templates' | 'schedule'
  // Open reported questions across all departments - red badge on "Reported Q's"
  const pendingReports = usePendingReportCount();
  const [editQuestionId, setEditQuestionId] = useState(null);
  const [adminName, setAdminName] = useState('Admin');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Core datasets states
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [purchases, setPurchases] = useState([]); // paid orders from the 'payments' collection
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessingApp, setIsProcessingApp] = useState(false);
  const [queries, setQueries] = useState([]);
  const [tests, setTests] = useState([]);
  const [testAttempts, setTestAttempts] = useState([]);
  
  // Joined students dataset and subtab state
  const [joinedStudents, setJoinedStudents] = useState([]);
  const [studentSubTab, setStudentSubTab] = useState('joined'); // 'joined', 'recent', 'forms' or 'queries'

  // Invited teachers dataset
  const [invitedTeachers, setInvitedTeachers] = useState([]);
  const [teacherSubTab, setTeacherSubTab] = useState('faculty'); // 'faculty' or 'recruitment'
  const [isTeacherInviteModalOpen, setIsTeacherInviteModalOpen] = useState(false);
  const [teacherInviteForm, setTeacherInviteForm] = useState({ name: '', department: '', qualification: '', experience: '', email: '' });
  const [isTeacherInviting, setIsTeacherInviting] = useState(false);

  // Invited typists dataset
  const [invitedTypists, setInvitedTypists] = useState([]);
  const [isTypistInviteModalOpen, setIsTypistInviteModalOpen] = useState(false);
  const [typistInviteForm, setTypistInviteForm] = useState({ typistName: '', typistEmail: '', reviewerName: '', reviewerEmail: '' });
  const [typistInviteReviewerMode, setTypistInviteReviewerMode] = useState('new'); // 'new' | 'existing' - lets many typists share one reviewer
  const [isTypistInviting, setIsTypistInviting] = useState(false);

  // The AI Generator's "non-paired" mode (used outside a typist/reviewer pairing) saves whoever
  // is typed into its Reviewer Email field here - separately from the Data Entry Team list below,
  // and with no other admin UI to see or clear it. Surfaced here so removing someone as a reviewer
  // in one place doesn't silently leave them still able to log in as reviewer via the other.
  const [aiReviewEmail, setAiReviewEmail] = useState('');
  useEffect(() => {
    getDoc(doc(db, 'site_settings', 'ai_review')).then(snap => {
      if (snap.exists()) setAiReviewEmail(snap.data().reviewerEmail || '');
    }).catch(err => console.error('Failed to load AI review setting', err));
  }, []);
  const updateAiReviewEmail = async (email) => {
    try {
      await setDoc(doc(db, 'site_settings', 'ai_review'), { reviewerEmail: email.trim().toLowerCase() }, { merge: true });
      setAiReviewEmail(email.trim().toLowerCase());
      return true;
    } catch (err) {
      console.error('Failed to update AI review setting', err);
      return false;
    }
  };

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => setToast({ show: true, message, type });

  const [confirmDeleteObj, setConfirmDeleteObj] = useState(null);

  // Search & Filter states
  const [appSearch, setAppSearch] = useState('');
  const [appFilter, setAppFilter] = useState('All');
  const [queryFilter, setQueryFilter] = useState('All');
  const [querySearch, setQuerySearch] = useState('');
  const [isAddQueryModalOpen, setIsAddQueryModalOpen] = useState(false);
  const [manualQueryForm, setManualQueryForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    source: 'Direct Phone Call',
    department: '',
    course: '',
    college: '',
    notes: '',
    status: 'Pending'
  });
  const [isSavingManualQuery, setIsSavingManualQuery] = useState(false);

  // Modal detail states
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [activeHeatmapIndex, setActiveHeatmapIndex] = useState(null);

  // Invite Student states
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', department: '', email: '' });
  const [isInviting, setIsInviting] = useState(false);


  // Auth Guard
  useEffect(() => {
    const role = sessionStorage.getItem('auth_role');
    const name = sessionStorage.getItem('auth_name');
    if (!role) {
      navigate('/login');
    } else if (role !== 'admin') {
      navigate('/403');
    } else {
      setAdminName(name || 'Admin');
    }
  }, [navigate]);

  // Load database from Firestore
  useEffect(() => {
    prewarmQuestionBankCache();
    const syncData = async () => {
      try {
        // 1. Applications are kept live by the notifications listener below

        // 2. Queries (enquiries) are kept live by the contact_queries listener below

        // 3. Fetch Joined Students
        const studentsSnapshot = await getDocs(collection(db, 'joined_students'));
        setJoinedStudents(studentsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));

        // 4. Fetch Invited Teachers
        const teachersSnapshot = await getDocs(collection(db, 'invited_teachers'));
        const fetchedTeachers = teachersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setInvitedTeachers(fetchedTeachers);

        // 4.5. Fetch Invited Typists
        const typistsSnapshot = await getDocs(collection(db, 'invited_typists'));
        const fetchedTypists = typistsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setInvitedTypists(fetchedTypists);

      } catch (err) {
        console.error("Failed to sync data from Firestore", err);
      }
    };

    syncData();
  }, []);

  // Tests + attempts power the overview stats (fetched separately so a failure here doesn't block the other lists)
  const fetchTestsAndAttempts = async () => {
    try {
      const [testsSnap, attemptsSnap] = await Promise.all([
        getDocs(collection(db, 'tests')),
        getDocs(collection(db, 'test_attempts'))
      ]);
      setTests(testsSnap.docs.map(d => ({ ...d.data(), id: d.id })));
      setTestAttempts(attemptsSnap.docs.map(d => ({ ...d.data(), id: d.id })));
    } catch (err) {
      console.error('Failed to load tests/attempts', err);
    }
  };

  useEffect(() => {
    fetchTestsAndAttempts();
  }, []);

  const overview = React.useMemo(() => {
    const now = Date.now();
    const monthStart = now - 30 * DAY_MS;
    const prevMonthStart = now - 60 * DAY_MS;
    const inWindow = (d, from, to) => d && d.getTime() >= from && d.getTime() < to;

    const attempts = testAttempts.map(a => ({
      ...a,
      _date: toDate(a.submittedAt),
      _pct: a.totalQuestions > 0 ? ((a.score || 0) / a.totalQuestions) * 100 : null
    }));

    const avgOf = (list) => {
      const scored = list.filter(a => a._pct !== null);
      return scored.length ? scored.reduce((sum, a) => sum + a._pct, 0) / scored.length : null;
    };
    const attemptsNow = attempts.filter(a => inWindow(a._date, monthStart, now + DAY_MS));
    const attemptsPrev = attempts.filter(a => inWindow(a._date, prevMonthStart, monthStart));

    const testsNow = tests.filter(t => inWindow(toDate(t.createdAt), monthStart, now + DAY_MS)).length;
    const testsPrev = tests.filter(t => inWindow(toDate(t.createdAt), prevMonthStart, monthStart)).length;

    const studentsNow = joinedStudents.filter(s => inWindow(toDate(s.joinedDate), monthStart, now + DAY_MS)).length;
    const studentsPrev = joinedStudents.filter(s => inWindow(toDate(s.joinedDate), prevMonthStart, monthStart)).length;

    const key = (a) => (a.studentEmail || a.studentName || '').toLowerCase();
    const uniqueStudents = (list) => new Set(list.map(key).filter(Boolean)).size;

    const avgScore = avgOf(attempts);
    const avgScoreDelta = avgOf(attemptsNow) !== null && avgOf(attemptsPrev) !== null
      ? Math.round(avgOf(attemptsNow) - avgOf(attemptsPrev))
      : null;

    const participation = joinedStudents.length > 0
      ? Math.min(100, Math.round((uniqueStudents(attempts) / joinedStudents.length) * 100))
      : null;
    const participationNow = uniqueStudents(attemptsNow);
    const participationPrev = uniqueStudents(attemptsPrev);

    // Heatmap: last 5 weeks (Mon-Sun rows) of submitted attempts per day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysSinceMonday = (today.getDay() + 6) % 7;
    const firstMonday = new Date(today.getTime() - (daysSinceMonday + 28) * DAY_MS);
    const perDay = {};
    attempts.forEach(a => {
      if (!a._date) return;
      const d = new Date(a._date);
      d.setHours(0, 0, 0, 0);
      perDay[d.getTime()] = (perDay[d.getTime()] || 0) + 1;
    });
    const weeks = Array.from({ length: 5 }, (_, w) => {
      const weekStart = new Date(firstMonday.getTime() + w * 7 * DAY_MS);
      return {
        label: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        days: Array.from({ length: 7 }, (_, d) => {
          const date = new Date(weekStart.getTime() + d * DAY_MS);
          return { date, count: date.getTime() > today.getTime() ? null : (perDay[date.getTime()] || 0) };
        })
      };
    });
    const maxCount = Math.max(0, ...weeks.flatMap(w => w.days.map(d => d.count || 0)));
    const level = (count) => {
      if (!count) return 0;
      return Math.max(1, Math.ceil((count / maxCount) * 6));
    };

    const attemptsByTest = {};
    attempts.forEach(a => { attemptsByTest[a.testId] = (attemptsByTest[a.testId] || 0) + 1; });
    const recentTests = [...tests]
      .sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0))
      .slice(0, 8)
      .map(t => ({ ...t, attemptCount: attemptsByTest[t.id] || 0 }));

    return {
      testsDelta: pctChange(testsNow, testsPrev),
      studentsDelta: pctChange(studentsNow, studentsPrev),
      participation,
      participationDelta: pctChange(participationNow, participationPrev),
      avgScore: avgScore === null ? null : Math.round(avgScore),
      avgScoreDelta,
      weeks,
      level,
      activeStudents: participationNow,
      activeStudentsDelta: pctChange(participationNow, participationPrev),
      attemptsImproved: attemptsNow.length >= attemptsPrev.length && attemptsNow.length > 0,
      recentTests
    };
  }, [tests, testAttempts, joinedStudents]);

  // ---- Admin notifications: everything that needs the admin's action - website enquiries,
  // reported questions and job applications - is listened to live, so a new one shows up here
  // (pop-up + bell list) without reloading
  const [reportedList, setReportedList] = useState([]);
  const [alerts, setAlerts] = useState([]); // pop-ups for items that arrived since this page opened
  const [showInbox, setShowInbox] = useState(false);
  const inboxRef = useRef(null);

  const msOf = (ts, dateText) => ts?.toMillis?.() || Date.parse(dateText) || 0;
  const NOTIFY_KINDS = {
    enquiry: { label: 'New enquiry', icon: Mail, tint: 'bg-blue-50 text-[#2563EB]' },
    report: { label: 'Question reported', icon: ShieldCheck, tint: 'bg-red-50 text-red-600' },
    application: { label: 'New job application', icon: Users, tint: 'bg-amber-50 text-amber-600' },
    purchase: { label: 'New purchase', icon: IndianRupee, tint: 'bg-emerald-50 text-emerald-600' },
  };
  const PURCHASE_LABELS = { bundle: 'Bundle purchased', notebundle: 'Notes bundle purchased', subject: 'Subject purchased' };
  const formatRupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
  const toNotification = {
    enquiry: (q) => ({ kind: 'enquiry', id: q.id, title: q.fullName || 'Enquiry', detail: [q.course, q.phone].filter(Boolean).join(' · ') || q.email, ms: msOf(q.createdAt, q.date), dateText: q.date }),
    report: (r) => ({ kind: 'report', id: r.id, title: r.studentName || 'Student', detail: [r.testTitle, r.reason && `"${r.reason}"`].filter(Boolean).join(' · '), ms: msOf(r.timestamp), dateText: '' }),
    application: (a) => ({ kind: 'application', id: a.id, title: a.fullName || 'Applicant', detail: [a.role, a.phone].filter(Boolean).join(' · ') || a.email, ms: msOf(a.createdAt, a.date), dateText: a.date }),
    purchase: (p) => ({ kind: 'purchase', id: p.id, label: PURCHASE_LABELS[p.itemType || 'bundle'] || 'New purchase', title: p.studentName || p.studentEmail || 'Student', detail: [p.itemName || p.bundleName, formatRupees(p.amount)].filter(Boolean).join(' · '), ms: msOf(p.paidAt || p.createdAt), dateText: '' }),
  };
  // A purchase stays in the bell until the admin opens it (adminSeen)
  const isPendingItem = { enquiry: (q) => q.status === 'Pending', report: (r) => r.status !== 'resolved', application: (a) => a.status === 'Pending', purchase: (p) => p.status === 'PAID' && !p.adminSeen };

  useEffect(() => {
    const watch = (source, kind, setList) => {
      let first = true;
      const name = typeof source === 'string' ? source : kind;
      return onSnapshot(typeof source === 'string' ? collection(db, source) : source, (snap) => {
        setList(snap.docs.map(d => ({ ...d.data(), id: d.id })));
        if (first) { first = false; return; } // what was already there when the page opened
        const added = snap.docChanges()
          .filter(c => c.type === 'added' && !c.doc.metadata.hasPendingWrites)
          .map(c => ({ ...c.doc.data(), id: c.doc.id }))
          .filter(isPendingItem[kind])
          .map(toNotification[kind]);
        if (added.length) setAlerts(prev => [...added, ...prev].slice(0, 3));
      }, (err) => console.error(`Failed to listen to ${name}`, err));
    };
    const unsubs = [
      watch('contact_queries', 'enquiry', setQueries),
      watch('reported_questions', 'report', setReportedList),
      watch('career_applications', 'application', setApplications),
      // only confirmed payments - a student who opened checkout but didn't pay isn't a purchase
      watch(query(collection(db, 'payments'), where('status', '==', 'PAID')), 'purchase', setPurchases),
    ];
    return () => unsubs.forEach(u => u());
  }, []);
  // A pop-up hides itself after 10 seconds; the item stays in the bell list until it is dealt with
  useEffect(() => {
    if (alerts.length === 0) return undefined;
    const t = setTimeout(() => setAlerts(prev => prev.slice(0, -1)), 10000);
    return () => clearTimeout(t);
  }, [alerts]);
  useEffect(() => {
    if (!showInbox) return undefined;
    const close = (e) => { if (inboxRef.current && !inboxRef.current.contains(e.target)) setShowInbox(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showInbox]);

  const pendingNotifications = [
    ...queries.filter(isPendingItem.enquiry).map(toNotification.enquiry),
    ...reportedList.filter(isPendingItem.report).map(toNotification.report),
    ...applications.filter(isPendingItem.application).map(toNotification.application),
    ...purchases.filter(isPendingItem.purchase).map(toNotification.purchase),
  ].sort((a, b) => b.ms - a.ms);
  const pendingInbox = pendingNotifications.length;
  const timeAgo = (n) => {
    if (!n.ms) return n.dateText || '';
    const mins = Math.round((Date.now() - n.ms) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    if (mins < 24 * 60) return `${Math.round(mins / 60)} h ago`;
    return n.dateText || new Date(n.ms).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };
  // Opens the item: an enquiry or application in its details pop-up, a report in Reported Q's
  const openNotification = (n) => {
    setShowInbox(false);
    setAlerts(prev => prev.filter(a => !(a.kind === n.kind && a.id === n.id)));
    if (n.kind === 'enquiry') setSelectedQuery(queries.find(x => x.id === n.id) || null);
    else if (n.kind === 'application') setSelectedApp(applications.find(x => x.id === n.id) || null);
    else if (n.kind === 'purchase') {
      const p = purchases.find(x => x.id === n.id);
      setSelectedPurchase(p || null);
      if (p && !p.adminSeen) {
        setPurchases(prev => prev.map(x => (x.id === p.id ? { ...x, adminSeen: true } : x)));
        updateDoc(doc(db, 'payments', p.id), { adminSeen: true, adminSeenAt: serverTimestamp() }).catch(err => console.error('Could not mark purchase as seen', err));
      }
    }
    else setActiveTab('reported');
  };

  const deleteTest = (test) => {
    setConfirmDeleteObj({
      title: 'Delete Test',
      message: `Delete "${test.title || 'this test'}"? Student attempts already recorded will remain.`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'tests', test.id));
          setTests(prev => prev.filter(t => t.id !== test.id));
          showToast('Test deleted successfully.', 'success');
        } catch (err) {
          console.error('Failed to delete test', err);
          showToast('Failed to delete test. Please try again.', 'error');
        }
      }
    });
  };

  const renderDelta = (delta, suffix = 'vs last 30 days') => {
    if (delta === null || delta === undefined) {
      return <span className="text-[12px] font-semibold tracking-tight text-[#94A3B8]">No prior data</span>;
    }
    const up = delta >= 0;
    return (
      <div className={`flex items-center gap-1.5 ${up ? 'text-[#16A34A]' : 'text-[#EF4444]'}`}>
        <ArrowUpRight size={14} strokeWidth={3} className={up ? '' : 'rotate-90'} />
        <span className="text-[12px] font-semibold tracking-tight">{up ? '+' : ''}{delta}% {suffix}</span>
      </div>
    );
  };

  const handleLogout = () => {
    sessionStorage.removeItem('auth_role');
    sessionStorage.removeItem('auth_email');
    sessionStorage.removeItem('auth_name');
    sessionStorage.removeItem('auth_roles');
    localStorage.removeItem('pair_id');
    localStorage.removeItem('pair_role');
    window.dispatchEvent(new Event('storage'));
    navigate('/login');
  };

  const updateAppStatus = async (app, status, reason = '') => {
    setIsProcessingApp(true);
    const updated = applications.map(a => 
      a.id === app.id ? { ...a, status } : a
    );
    setApplications(updated);
    
    let emailFailed = false;
    let emailErrorMsg = '';
    try {
      let subject, htmlMessage, attachment = null;

      if (status === 'Shortlisted') {
        subject = 'Congratulations! Welcome to MS Academy';
        
        // ----------------------------------------------------
        // PDF 1: OFFER LETTER
        // ----------------------------------------------------
        const doc1 = new jsPDF();
        
        doc1.setFillColor(30, 58, 138);
        doc1.rect(0, 0, 210, 40, 'F');
        
        let headerImgLoaded = false;
        let loadedImg = null;
        try {
          loadedImg = await loadImage(logoImg);
          headerImgLoaded = true;
          doc1.addImage(loadedImg, 'PNG', 20, 8, 24, 24);
          doc1.setTextColor(255, 255, 255);
          doc1.setFontSize(28);
          doc1.setFont('helvetica', 'bold');
          doc1.text('MS ACADEMY', 50, 26);
        } catch (e) {
          doc1.setTextColor(255, 255, 255);
          doc1.setFontSize(28);
          doc1.setFont('helvetica', 'bold');
          doc1.text('MS ACADEMY', 20, 26);
        }
        
        doc1.setFontSize(14);
        doc1.setFont('helvetica', 'normal');
        doc1.text('OFFER OF EMPLOYMENT', 190, 26, { align: 'right' });
        
        doc1.setTextColor(51, 51, 51);
        doc1.setFontSize(10);
        doc1.text(`Ref: MSA/HR/${new Date().getFullYear()}/${Math.floor(Math.random()*10000)}`, 20, 55);
        doc1.text(`Date: ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}`, 190, 55, { align: 'right' });
        
        doc1.setFontSize(12);
        doc1.setFont('helvetica', 'bold');
        doc1.text(`Dear ${app.fullName},`, 20, 75);
        
        doc1.setFont('helvetica', 'normal');
        doc1.setFontSize(11);
        
        const p1 = `We are thrilled to officially extend an offer of employment to you for the position of ${app.role} at MS Academy. Following our rigorous recruitment process, our faculty board was highly impressed with your academic background and your experience (${app.experience}).`;
        const p2 = `At MS Academy, we are committed to excellence in education and shaping the future of brilliant minds. We believe that your expertise will be a tremendous asset to our institution and our students.`;
        const p3 = `This offer is contingent upon the successful completion of our standard onboarding background checks and verification of your academic credentials. Detailed terms and conditions of your employment, including compensation, benefits, and faculty guidelines, are enclosed in the orientation package that will be sent to you shortly.`;
        const p4 = `Please indicate your acceptance of this offer by signing and returning a copy of this letter to the HR department within 5 business days.`;
        const p5 = `We look forward to welcoming you to the MS Academy family and are excited about the positive impact you will make.`;
        
        let yPos1 = 90;
        const lineSpacing1 = 6;
        const writeParagraph1 = (text) => {
           const lines = doc1.splitTextToSize(text, 170);
           doc1.text(lines, 20, yPos1);
           yPos1 += (lines.length * lineSpacing1) + 5;
        };
        writeParagraph1(p1);
        writeParagraph1(p2);
        writeParagraph1(p3);
        writeParagraph1(p4);
        writeParagraph1(p5);
        
        yPos1 += 15;
        doc1.setFont('helvetica', 'bold');
        doc1.text('Sincerely,', 20, yPos1);
        yPos1 += 20;
        doc1.text('_______________________', 20, yPos1);
        yPos1 += 7;
        doc1.text('Director of Recruitment', 20, yPos1);
        doc1.setFont('helvetica', 'normal');
        doc1.text('MS Academy', 20, yPos1 + 5);
        
        doc1.setDrawColor(200, 200, 200);
        doc1.line(20, 280, 190, 280);
        doc1.setFontSize(8);
        doc1.setTextColor(150, 150, 150);
        doc1.text('MS Academy | Tech City Campus | contact@msacademy.example.com', 105, 287, { align: 'center' });
        
        const pdfBase64Data1 = doc1.output('datauristring').split(',')[1];
        
        // ----------------------------------------------------
        // PDF 2: ACCEPTANCE FORM
        // ----------------------------------------------------
        const doc2 = new jsPDF();
        
        doc2.setFillColor(30, 58, 138); 
        doc2.rect(0, 0, 210, 40, 'F');
        
        if (headerImgLoaded && loadedImg) {
          doc2.addImage(loadedImg, 'PNG', 20, 8, 24, 24);
          doc2.setTextColor(255, 255, 255);
          doc2.setFontSize(28);
          doc2.setFont('helvetica', 'bold');
          doc2.text('MS ACADEMY', 50, 26);
        } else {
          doc2.setTextColor(255, 255, 255);
          doc2.setFontSize(28);
          doc2.setFont('helvetica', 'bold');
          doc2.text('MS ACADEMY', 20, 26);
        }
        
        doc2.setFontSize(14);
        doc2.setFont('helvetica', 'normal');
        doc2.text('ACCEPTANCE OF OFFER', 190, 26, { align: 'right' });
        
        doc2.setTextColor(51, 51, 51);
        doc2.setFontSize(16);
        doc2.setFont('helvetica', 'bold');
        doc2.text('OFFER ACCEPTANCE LETTER', 105, 60, { align: 'center' });
        
        doc2.setFontSize(11);
        doc2.setFont('helvetica', 'normal');
        
        const acceptText = `I, ${app.fullName}, hereby accept the offer of employment from MS Academy for the position of ${app.role}, as outlined in the Offer Letter dated ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}.`;
        
        const acceptLines = doc2.splitTextToSize(acceptText, 170);
        doc2.text(acceptLines, 20, 80);
        
        const acceptText2 = `I understand that my employment is subject to the terms and conditions provided, and I am excited to join the faculty team.`;
        const acceptLines2 = doc2.splitTextToSize(acceptText2, 170);
        doc2.text(acceptLines2, 20, 95);
        
        let yForm = 130;
        doc2.setFont('helvetica', 'bold');
        doc2.text('Candidate Signature:', 20, yForm);
        doc2.setFont('helvetica', 'normal');
        doc2.line(70, yForm + 1, 190, yForm + 1); // underline
        
        yForm += 20;
        doc2.setFont('helvetica', 'bold');
        doc2.text('Printed Name:', 20, yForm);
        doc2.setFont('helvetica', 'normal');
        doc2.text(`${app.fullName}`, 70, yForm);
        doc2.line(70, yForm + 1, 190, yForm + 1); // underline
        
        yForm += 20;
        doc2.setFont('helvetica', 'bold');
        doc2.text('Date of Signature:', 20, yForm);
        doc2.setFont('helvetica', 'normal');
        doc2.line(70, yForm + 1, 190, yForm + 1); // underline
        
        doc2.setDrawColor(200, 200, 200);
        doc2.line(20, 280, 190, 280);
        doc2.setFontSize(8);
        doc2.setTextColor(150, 150, 150);
        doc2.text('Please sign and return this page to the MS Academy HR Department.', 105, 287, { align: 'center' });
        
        const pdfBase64Data2 = doc2.output('datauristring').split(',')[1];
        
        attachment = [
          {
            filename: 'MS_Academy_Offer_Letter.pdf',
            mimeType: 'application/pdf',
            base64Data: pdfBase64Data1
          },
          {
            filename: 'MS_Academy_Acceptance_Form.pdf',
            mimeType: 'application/pdf',
            base64Data: pdfBase64Data2
          }
        ];

        htmlMessage = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 30px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; letter-spacing: 1px;">Welcome to MS Academy</h1>
            </div>
            <div style="padding: 40px 30px; background-color: #ffffff;">
              <h2 style="color: #1e293b; margin-top: 0;">Dear ${app.fullName},</h2>
              <p style="color: #475569; font-size: 16px; line-height: 1.6;">We are absolutely delighted to inform you that you have been <strong>Shortlisted</strong> for the role of <strong>${app.role}</strong>.</p>
              <p style="color: #475569; font-size: 16px; line-height: 1.6;">Our team was extremely impressed by your profile and experience. We are excited about the prospect of you joining our esteemed faculty and making a significant impact.</p>
              <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 15px 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; color: #334155; font-weight: 500;">Please find your official Offer Letter attached to this email as a PDF document.</p>
              </div>
              <p style="color: #475569; font-size: 16px; line-height: 1.6;">Our HR team will reach out to you shortly with the next steps regarding your onboarding and orientation.</p>
              <div style="margin-top: 40px;">
                <p style="color: #1e293b; font-weight: bold; margin: 0;">Warmest congratulations,</p>
                <p style="color: #64748B; margin: 5px 0 0 0;">MS Academy Recruitment Team</p>
              </div>
            </div>
          </div>
        `;
      } else {
        subject = 'Update on your Application';
        const messageText = `We regret to inform you that your application for <b>${app.role}</b> was not successful at this time.<br/><br/><b>Reason:</b> ${reason}`;
        
        htmlMessage = `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>Hello ${app.fullName},</h2>
            <p>${messageText}</p>
            <br/>
            <p>Best regards,<br/>MS Academy Team</p>
          </div>
        `;
      }
      
      await sendEmailViaGAS(app.email, subject, htmlMessage, attachment);
    } catch (emailErr) {
      console.error("Email Error:", emailErr);
      emailFailed = true;
      emailErrorMsg = emailErr.message || "Failed to send email.";
    }

    try {
      await updateDoc(doc(db, 'career_applications', app.id), { status });
      if (selectedApp && selectedApp.id === app.id) {
        setSelectedApp({ ...selectedApp, status });
      }
      
      if (status === 'Rejected') {
        setShowRejectInput(false);
        setRejectReason('');
      }
      
      if (emailFailed) {
        showToast(`Application status updated to ${status}, but email failed: ${emailErrorMsg}`, 'warning');
      } else {
        showToast(`Application ${status.toLowerCase()} successfully and email sent.`, 'success');
      }
    } catch (e) {
      console.error(e);
      showToast('Error updating status or sending email. Please try again.', 'error');
    } finally {
      setIsProcessingApp(false);
    }
  };

  // Resolving an enquiry needs a note of what was discussed with the person (resolveDialog);
  // reopening one (back to Pending) is a single click and keeps the earlier notes.
  const [resolveDialog, setResolveDialog] = useState(null); // the query being resolved
  const [resolveNote, setResolveNote] = useState('');
  const [isSavingResolve, setIsSavingResolve] = useState(false);
  const MIN_RESOLVE_NOTE = 10;

  const setQueryFields = (id, fields) => {
    setQueries(prev => prev.map(q => (q.id === id ? { ...q, ...fields } : q)));
    setSelectedQuery(prev => (prev && prev.id === id ? { ...prev, ...fields } : prev));
  };

  const toggleQueryStatus = async (id) => {
    const query = queries.find(q => q.id === id);
    if (!query) return;
    if (query.status !== 'Resolved') {
      setResolveNote('');
      setResolveDialog(query);
      return;
    }
    setQueryFields(id, { status: 'Pending' });
    try {
      await updateDoc(doc(db, 'contact_queries', id), { status: 'Pending' });
      showToast('Enquiry reopened and set to Pending.', 'info');
    } catch (e) {
      console.error(e);
      setQueryFields(id, { status: 'Resolved' });
      showToast('Could not reopen the enquiry. Please try again.', 'error');
    }
  };

  const confirmResolve = async () => {
    const query = resolveDialog;
    const note = resolveNote.trim();
    if (!query || note.length < MIN_RESOLVE_NOTE) return;
    setIsSavingResolve(true);
    const entry = {
      note,
      by: sessionStorage.getItem('auth_name') || sessionStorage.getItem('auth_email') || 'Admin',
      at: new Date().toISOString(),
    };
    try {
      await updateDoc(doc(db, 'contact_queries', query.id), {
        status: 'Resolved',
        resolutionNote: note,
        resolvedBy: entry.by,
        resolvedAt: serverTimestamp(),
        resolutionNotes: arrayUnion(entry),
      });
      setQueryFields(query.id, {
        status: 'Resolved',
        resolutionNote: note,
        resolvedBy: entry.by,
        resolutionNotes: [...(query.resolutionNotes || []), entry],
      });
      setResolveDialog(null);
      showToast('Enquiry marked as resolved.', 'success');
    } catch (e) {
      console.error(e);
      showToast('Could not mark the enquiry as resolved. Please try again.', 'error');
    } finally {
      setIsSavingResolve(false);
    }
  };

  const handleSaveManualQuery = async (e) => {
    e.preventDefault();
    if (!manualQueryForm.fullName.trim()) {
      showToast('Please enter caller / student name.', 'warning');
      return;
    }
    if (!manualQueryForm.phone.trim()) {
      showToast('Please enter a contact phone number.', 'warning');
      return;
    }
    if (!manualQueryForm.notes.trim()) {
      showToast('Please enter discussion notes or query details.', 'warning');
      return;
    }
    setIsSavingManualQuery(true);
    try {
      const callerName = manualQueryForm.fullName.trim();
      const phone = manualQueryForm.phone.trim();
      const email = (manualQueryForm.email || '').trim().toLowerCase();
      const source = manualQueryForm.source || 'Direct Phone Call';
      const dept = manualQueryForm.department || '';
      const course = manualQueryForm.course || '';
      const college = manualQueryForm.college.trim();
      const notes = manualQueryForm.notes.trim();

      const newQuery = {
        fullName: callerName,
        phone,
        email,
        source,
        department: dept,
        course,
        college,
        description: notes,
        message: `Source: ${source}${course ? `\nCourse: ${course}` : ''}${dept ? `\nDept: ${dept}` : ''}${college ? `\nCollege: ${college}` : ''}\n\nCall / Query Notes:\n${notes}`,
        date: new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
        createdAt: serverTimestamp(),
        status: manualQueryForm.status || 'Pending',
        isManual: true,
        loggedBy: sessionStorage.getItem('auth_name') || 'Admin'
      };

      await addDoc(collection(db, 'contact_queries'), newQuery);

      setIsAddQueryModalOpen(false);
      setManualQueryForm({
        fullName: '',
        phone: '',
        email: '',
        source: 'Direct Phone Call',
        department: '',
        course: '',
        college: '',
        notes: '',
        status: 'Pending'
      });
      showToast('Support query logged successfully!', 'success');
    } catch (err) {
      console.error('Failed to log query:', err);
      showToast(`Failed to log query: ${err.message}`, 'error');
    } finally {
      setIsSavingManualQuery(false);
    }
  };

  const handleDeleteQuery = (id) => {
    setConfirmDeleteObj({
      title: 'Delete Query Record',
      message: 'Are you sure you want to delete this query record? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'contact_queries', id));
          setSelectedQuery(null);
          setQueries(prev => prev.filter(q => q.id !== id));
          showToast('Query record deleted.', 'success');
        } catch (err) {
          console.error('Failed to delete query:', err);
          showToast(`Failed to delete query: ${err.message}`, 'error');
        }
      }
    });
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    setIsInviting(true);

    try {
      const originUrl = window.location.hostname === 'localhost' ? 'https://msacademy-portal.example.com' : window.location.origin;
      const loginLink = originUrl + '/login';
      const htmlMessage = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 30px 20px; text-align: center;">
            <img src="https://raw.githubusercontent.com/Pragadeesh-AS/MS_Academy/main/src/assets/msgate_logo.png" alt="MS GATE Academy Logo" style="height: 60px; margin-bottom: 15px; border-radius: 8px; background-color: white; padding: 5px;" />
            <h1 style="color: white; margin: 0; font-size: 28px; letter-spacing: 1px;">Welcome to MS GATE Academy 🎓</h1>
          </div>
          <div style="padding: 40px 30px; background-color: #ffffff;">
            <h2 style="color: #1e293b; margin-top: 0;">Hello ${inviteForm.name}, 👋</h2>
            <p style="color: #475569; font-size: 16px; line-height: 1.6;">You have been officially invited to join <strong>MS GATE Academy</strong> under the <strong>${inviteForm.department}</strong> department! 📚✨</p>
            <p style="color: #475569; font-size: 16px; line-height: 1.6;">We are excited to have you on board. Start exploring your courses and modules by logging into the student portal.</p>
            <div style="text-align: center; margin: 35px 0;">
              <a href="${loginLink}" style="display:inline-block; padding:12px 28px; background-color:#2563EB; color:#ffffff; font-weight:bold; text-decoration:none; border-radius:8px; font-size: 16px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);">🚀 Login to Portal</a>
            </div>
            <div style="margin-top: 40px; border-top: 1px solid #e2e8f0; pt-4;">
              <p style="color: #1e293b; font-weight: bold; margin: 20px 0 0 0;">Best regards,</p>
              <p style="color: #64748B; margin: 5px 0 0 0;">MS GATE Academy Team 🏫</p>
            </div>
          </div>
        </div>
      `;
      const cleanEmail = (inviteForm.email || '').trim().toLowerCase();
      const existingSnap = await getDocs(query(collection(db, 'joined_students'), where('email', '==', cleanEmail)));
      if (!existingSnap.empty) {
        showToast(`A student with email ${cleanEmail} already exists in the directory.`, 'warning');
        setIsInviting(false);
        return;
      }

      await sendEmailViaGAS(cleanEmail, "Invitation to join MS Academy", htmlMessage);

      const newStudent = {
        name: inviteForm.name.trim(),
        email: cleanEmail,
        department: inviteForm.department,
        joinedDate: new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
        joinedAt: serverTimestamp(), // exact time, for the Recently Joined list
        status: "Invited",
        isPro: false
      };
      
      const docRef = await addDoc(collection(db, 'joined_students'), newStudent);
      newStudent.id = docRef.id;
      
      const updatedStudents = [newStudent, ...joinedStudents];
      setJoinedStudents(updatedStudents);
      
      setIsInviteModalOpen(false);
      setInviteForm({ name: '', department: '', email: '' });
      showToast(`Invitation sent successfully to ${cleanEmail}.`, 'success');
      
    } catch (error) {
      console.error('Error sending invite:', error);
      showToast('Failed to send invite email. Please try again.', 'error');
    } finally {
      setIsInviting(false);
    }
  };

  const handleTeacherInviteSubmit = async (e) => {
    e.preventDefault();
    setIsTeacherInviting(true);

    try {
      const originUrl = window.location.hostname === 'localhost' ? 'https://msacademy-portal.example.com' : window.location.origin;
      const loginLink = originUrl + '/login';
      const htmlMessage = `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Hello ${teacherInviteForm.name} (Faculty),</h2>
          <p>You have been invited to join MS Academy under the ${teacherInviteForm.department} department.</p>
          <p><a href="${loginLink}" style="display:inline-block; padding:10px 20px; background:#2563EB; color:#fff; text-decoration:none; border-radius:5px;">Login to Portal</a></p>
          <br/>
          <p>Best regards,<br/>MS Academy Team</p>
        </div>
      `;
      await sendEmailViaGAS(teacherInviteForm.email, "Faculty Invitation - MS Academy", htmlMessage);

      const newTeacher = {
        name: teacherInviteForm.name,
        email: teacherInviteForm.email,
        department: teacherInviteForm.department,
        qualification: teacherInviteForm.qualification,
        experience: teacherInviteForm.experience,
        invitedDate: new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
        status: "Invited"
      };

      const docRef = await addDoc(collection(db, 'invited_teachers'), newTeacher);
      newTeacher.id = docRef.id;

      const updatedTeachers = [newTeacher, ...invitedTeachers];
      setInvitedTeachers(updatedTeachers);

      setIsTeacherInviteModalOpen(false);
      setTeacherInviteForm({ name: '', department: '', qualification: '', experience: '', email: '' });
      showToast(`Teacher invitation sent successfully to ${newTeacher.email}.`, 'success');
      
    } catch (error) {
      console.error('Failed to send teacher invite:', error);
      showToast(`Failed to send teacher invite email: ${error.message || 'email service unreachable'}`, 'error');
    } finally {
      setIsTeacherInviting(false);
    }
  };

  const deleteApplication = async (appId, appName) => {
    setConfirmDeleteObj({
      type: 'application',
      id: appId,
      title: 'Delete Application',
      message: `Are you sure you want to delete the application for "${appName || 'this candidate'}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'career_applications', appId));
          setApplications(prev => prev.filter(a => a.id !== appId));
          if (selectedApp?.id === appId) setSelectedApp(null);
          showToast('Application deleted successfully.', 'success');
        } catch (e) {
          console.error("Failed to delete application", e);
          showToast('Failed to delete application.', 'error');
        }
      }
    });
  };

  const deleteTeacher = async (teacherId) => {
    setConfirmDeleteObj({
      type: 'teacher',
      id: teacherId,
      title: 'Remove Faculty Member',
      message: 'Are you sure you want to remove this teacher? They will lose access to the Faculty portal.'
    });
  };

  const updateTeacher = async (teacherId, updates) => {
    try {
      await updateDoc(doc(db, 'invited_teachers', teacherId), updates);
      setInvitedTeachers(prev => prev.map(t => t.id === teacherId ? { ...t, ...updates } : t));
      showToast('Faculty member updated successfully.', 'success');
      return true;
    } catch (e) {
      console.error('Failed to update teacher', e);
      showToast('Failed to update teacher. Please try again.', 'error');
      return false;
    }
  };

  const updateTypist = async (pairId, updates) => {
    try {
      await updateDoc(doc(db, 'invited_typists', pairId), updates);
      setInvitedTypists(prev => prev.map(t => t.id === pairId ? { ...t, ...updates } : t));
      showToast('Typist pair updated successfully.', 'success');
      return true;
    } catch (e) {
      console.error('Failed to update pair', e);
      showToast('Failed to update pair. Please try again.', 'error');
      return false;
    }
  };

  const confirmDeleteAction = async () => {
    if (!confirmDeleteObj) return;
    const { type, id, onConfirm } = confirmDeleteObj;
    
    if (onConfirm) {
      await onConfirm();
      setConfirmDeleteObj(null);
      return;
    }

    if (type === 'teacher') {
      const updatedTeachers = invitedTeachers.filter(t => t.id !== id);
      setInvitedTeachers(updatedTeachers);
      try {
        await deleteDoc(doc(db, 'invited_teachers', id));
        showToast('Teacher removed from Faculty.', 'success');
      } catch (e) {
        console.error("Failed to delete teacher", e);
        showToast('Failed to delete teacher.', 'error');
      }
    } else if (type === 'typist') {
      setInvitedTypists(prev => prev.filter(t => t.id !== id));
      try {
        await deleteDoc(doc(db, 'invited_typists', id));
        showToast('Typist pair removed.', 'success');
      } catch (e) {
        console.error("Failed to delete pair", e);
        showToast('Failed to delete pair.', 'error');
      }
    }
    setConfirmDeleteObj(null);
  };

  // Filter lists
  const filteredApps = applications.filter(app => {
    const matchesSearch = app.fullName.toLowerCase().includes(appSearch.toLowerCase()) || 
                          app.email.toLowerCase().includes(appSearch.toLowerCase()) ||
                          app.specialization.toLowerCase().includes(appSearch.toLowerCase());
    const matchesRole = appFilter === 'All' || app.role === appFilter;
    return matchesSearch && matchesRole;
  });

  const filteredQueries = queries.filter(q => {
    const matchesStatus = queryFilter === 'All' || q.status === queryFilter;
    if (!matchesStatus) return false;
    if (!querySearch.trim()) return true;
    const term = querySearch.toLowerCase();
    return (
      (q.fullName || '').toLowerCase().includes(term) ||
      (q.phone || '').includes(term) ||
      (q.email || '').toLowerCase().includes(term) ||
      (q.source || '').toLowerCase().includes(term) ||
      (q.course || '').toLowerCase().includes(term) ||
      (q.department || '').toLowerCase().includes(term) ||
      (q.message || '').toLowerCase().includes(term) ||
      (q.description || '').toLowerCase().includes(term) ||
      (q.college || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="h-screen w-full bg-slate-50/50 flex md:flex-row overflow-hidden">

      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-[#111827] flex items-center justify-between px-4 py-3 shadow-lg">
        <Link to="/" className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm flex-shrink-0 border border-slate-200 overflow-hidden p-0.5">
            <img src={logoImg} alt="MS Gate Academy Logo" className="w-full h-full object-contain" />
          </div>
          <h3 className="text-[14px] font-[900] text-white tracking-tight truncate flex items-center gap-1.5">MS Gate Academy <ShieldCheck size={14} className="text-amber-400 flex-shrink-0" /></h3>
        </Link>
        <button
          onClick={() => setIsMobileNavOpen(true)}
          aria-label="Open menu"
          className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 flex-shrink-0"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile Sidebar Drawer */}
      {isMobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsMobileNavOpen(false)}></div>
          <div className="relative z-10 w-80 max-w-[85vw] h-full bg-[#111827] flex flex-col justify-between pt-6 pb-6 px-4 overflow-y-auto shadow-2xl animate-in slide-in-from-left duration-300">
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-3 px-2 mb-2">
                <Link to="/" className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm flex-shrink-0 border border-slate-200 overflow-hidden p-0.5">
                    <img src={logoImg} alt="MS Gate Academy Logo" className="w-full h-full object-contain" />
                  </div>
                  <h3 className="text-[15px] font-[900] text-white tracking-tight truncate flex items-center gap-2">MS Gate Academy <ShieldCheck size={16} className="text-amber-400 flex-shrink-0" /></h3>
                </Link>
                <button onClick={() => setIsMobileNavOpen(false)} aria-label="Close menu" className="p-2 rounded-lg text-slate-300 hover:bg-slate-800 flex-shrink-0">
                  <X size={20} />
                </button>
              </div>

              <nav className="space-y-1.5 px-1">
                {[
                  { key: 'overview', label: 'Dashboard', icon: LayoutGrid },
                  { key: 'teachers', label: 'Teacher', icon: BookOpen },
                  { key: 'queries', label: 'Student', icon: Users },
                  { key: 'attributes', label: 'Attributes', icon: Tag },
                  { key: 'ai', label: 'AI Extract', icon: Sparkles },
                  { key: 'questions', label: 'Question Bank', icon: Database },
                  { key: 'premium_questions', label: 'Premium Question Bank', icon: Database, isPremium: true },
                  { key: 'tests', label: 'Create Test', icon: Trophy },
                  { key: 'analytics', label: 'Analytics', icon: BarChart2 },
                  { key: 'reported', label: 'Reported Questions', icon: ShieldCheck, danger: true },
                  { key: 'test_feedback', label: 'Feedback', icon: Star, warning: true },
                  { key: 'typists', label: 'Data Entry Pairs', icon: Book },
                  { key: 'fees', label: 'Fees Tracker', icon: Wallet },
                  { key: 'salary', label: 'Staff Salary', icon: IndianRupee },
                  { key: 'courses', label: 'Course Setup', icon: Package },
                  { key: 'invoice', label: 'Invoice', icon: FileText },
                  { key: 'welcome_letter', label: 'Welcome Letter', icon: Mail },
                  { key: 'notes', label: 'Study Notes', icon: FileText },
                  { key: 'recordings', label: 'Live Recordings', icon: Video },
                  { key: 'popup', label: 'Popup', icon: Megaphone },
                  { key: 'logs', label: 'Logs', icon: ScrollText },
                  { key: 'gallery', label: 'Gallery', icon: Images },
                  { key: 'blogs', label: 'Blog', icon: FileText },
                ].map(({ key, label, icon: Icon, danger, warning, isPremium }) => (
                  <button
                    key={key}
                    onClick={() => { setActiveTab(key); setIsMobileNavOpen(false); }}
                    className={`w-full relative flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${(activeTab === key || (key === 'logs' && activeTab === 'question_logs')) ? (danger ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg' : warning ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg') : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                  >
                    {isPremium ? (
                      <div className="relative">
                        <Icon size={20} className="text-amber-500" />
                        <span className="absolute -top-1.5 -right-1.5 text-amber-500 text-[12px]">★</span>
                      </div>
                    ) : (
                      <Icon size={20} className={(activeTab === key || (key === 'logs' && activeTab === 'question_logs')) ? 'text-white' : (warning ? 'text-amber-400' : 'text-slate-400')} />
                    )}
                    <span>{label}</span>
                    {key === 'reported' && <ReportCountBadge count={pendingReports} />}
                  </button>
                ))}
              </nav>
            </div>
            <div className="pt-5 mt-8 space-y-3 px-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1e293b] text-white font-black text-[16px] flex items-center justify-center flex-shrink-0">
                  {(sessionStorage.getItem('auth_name') || 'A').trim().charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0 overflow-hidden">
                  <span className="font-bold text-[14px] text-white truncate">{sessionStorage.getItem('auth_name') || 'Admin'}</span>
                  <span className="text-[12px] font-semibold text-slate-400 truncate">{sessionStorage.getItem('auth_email') || ''}</span>
                </div>
              </div>
              <RoleSwitcher dark onNavigate={() => setIsMobileNavOpen(false)} />
              <button
                onClick={() => { setIsMobileNavOpen(false); handleLogout(); }}
                className="w-full flex items-center gap-3 px-2 py-2.5 mt-2 rounded-xl font-bold text-[14px] text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
              >
                <LogOut size={18} className="text-slate-500" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Side Navigation Panel Wrapper */}
      <div className={`hidden md:block transition-all duration-300 ${isCollapsed ? 'w-[88px]' : 'w-full md:w-[280px]'} h-full flex-shrink-0 relative z-20`}>

        {/* Collapse Button (Now outside the overflow container so it's fully visible!) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-3.5 top-9 w-7 h-7 bg-white border border-slate-200 rounded-full items-center justify-center shadow-sm text-slate-500 hover:text-slate-800 transition-colors z-30 hover:shadow-md"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <aside className="w-full h-full bg-[#111827] flex flex-col justify-between pt-8 pb-6 px-4 overflow-y-auto border-none shadow-2xl [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="space-y-8">
            {/* Admin title */}
            <Link to="/" className={`flex items-center gap-3 px-2 mb-2 ${isCollapsed ? 'justify-center px-0' : ''}`}>
              <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm flex-shrink-0 border border-slate-200 overflow-hidden p-0.5 mx-auto md:mx-0">
                <img src={logoImg} alt="MS Gate Academy Logo" className="w-full h-full object-contain" />
              </div>
              {!isCollapsed && <h3 className="text-[17px] font-[900] text-white tracking-tight whitespace-nowrap mt-0.5 flex items-center gap-2">MS Gate Academy <ShieldCheck size={16} className="text-amber-400" /></h3>}
            </Link>

            {/* Navigation Links */}
            <nav className="space-y-1.5 px-1">
              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full relative flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${activeTab === 'overview' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                title={isCollapsed ? "Dashboard" : ""}
              >
                <LayoutGrid size={20} className={activeTab === 'overview' ? 'text-white' : 'text-slate-400'} />
                {!isCollapsed && <span>Dashboard</span>}
              </button>

              <button
                onClick={() => setActiveTab('teachers')}
                className={`w-full relative flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${activeTab === 'teachers' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                title={isCollapsed ? "Teacher" : ""}
              >
                <BookOpen size={20} className={activeTab === 'teachers' ? 'text-white' : 'text-slate-400'} />
                {!isCollapsed && <span>Teacher</span>}
              </button>

              <button
                onClick={() => setActiveTab('queries')}
                className={`w-full relative flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${activeTab === 'queries' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                title={isCollapsed ? "Student" : ""}
              >
                <Users size={20} className={activeTab === 'queries' ? 'text-white' : 'text-slate-400'} />
                {!isCollapsed && <span>Student</span>}
              </button>

              <button 
                onClick={() => setActiveTab('attributes')}
                className={`w-full relative flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${activeTab === 'attributes' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                title={isCollapsed ? "Attributes" : ""}
              >
                <Tag size={20} className={activeTab === 'attributes' ? 'text-white' : 'text-slate-400'} />
                {!isCollapsed && <span>Attributes</span>}
              </button>

              <button 
                onClick={() => setActiveTab('ai')}
                className={`w-full relative flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${activeTab === 'ai' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                title={isCollapsed ? "AI Extract" : ""}
              >
                <Sparkles size={20} className={activeTab === 'ai' ? 'text-white' : 'text-slate-400'} />
                {!isCollapsed && <span>AI Extract</span>}
              </button>

              <button
                onClick={() => setActiveTab('questions')}
                className={`w-full relative flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${activeTab === 'questions' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                title={isCollapsed ? "Question Bank" : ""}
              >
                <Database size={20} className={activeTab === 'questions' ? 'text-white' : 'text-slate-400'} />
                {!isCollapsed && <span>Question Bank</span>}
              </button>

              <button
                onClick={() => setActiveTab('premium_questions')}
                className={`w-full relative flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${activeTab === 'premium_questions' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                title={isCollapsed ? "Premium Question Bank" : ""}
              >
                <div className="relative">
                  <Database size={20} className={activeTab === 'premium_questions' ? 'text-amber-500' : 'text-amber-500'} />
                  <span className="absolute -top-1.5 -right-1.5 text-amber-500 text-[12px]">★</span>
                </div>
                {!isCollapsed && <span>Premium Question Bank</span>}
              </button>

              <button
                onClick={() => setActiveTab('tests')}
                className={`w-full relative flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${activeTab === 'tests' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                title={isCollapsed ? "Create Test" : ""}
              >
                <Trophy size={20} className={activeTab === 'tests' ? 'text-white' : 'text-slate-400'} />
                {!isCollapsed && <span>Create Test</span>}
              </button>

              <button 
                onClick={() => setActiveTab('analytics')}
                className={`w-full relative flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${activeTab === 'analytics' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                title={isCollapsed ? "Analytics" : ""}
              >
                <BarChart2 size={20} className={activeTab === 'analytics' ? 'text-white' : 'text-slate-400'} />
                {!isCollapsed && <span>Analytics</span>}
              </button>

              <button
                onClick={() => setActiveTab('reported')}
                className={`w-full relative flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${activeTab === 'reported' ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                title={isCollapsed ? "Reported Questions" : ""}
              >
                <ShieldCheck size={20} className={activeTab === 'reported' ? 'text-white' : 'text-slate-400'} />
                {!isCollapsed && <span>Reported Questions</span>}
                <ReportCountBadge count={pendingReports} collapsed={isCollapsed} />
              </button>

              <button
                onClick={() => setActiveTab('test_feedback')}
                className={`w-full relative flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${activeTab === 'test_feedback' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                title={isCollapsed ? "Feedback" : ""}
              >
                <Star size={20} className={activeTab === 'test_feedback' ? 'text-white' : 'text-amber-400'} />
                {!isCollapsed && <span>Feedback</span>}
              </button>

              <button
                onClick={() => setActiveTab('typists')}
                className={`w-full relative flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${activeTab === 'typists' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                title={isCollapsed ? "Data Entry Pairs" : ""}
              >
                <Book size={20} className={activeTab === 'typists' ? 'text-white' : 'text-slate-400'} />
                {!isCollapsed && <span>Data Entry Pairs</span>}
              </button>

              <button
                onClick={() => setActiveTab('fees')}
                className={`w-full relative flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${activeTab === 'fees' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                title={isCollapsed ? "Fees Tracker" : ""}
              >
                <Wallet size={20} className={activeTab === 'fees' ? 'text-white' : 'text-slate-400'} />
                {!isCollapsed && <span>Fees Tracker</span>}
              </button>

              <button
                onClick={() => setActiveTab('salary')}
                className={`w-full relative flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${activeTab === 'salary' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                title={isCollapsed ? "Staff Salary" : ""}
              >
                <IndianRupee size={20} className={activeTab === 'salary' ? 'text-white' : 'text-slate-400'} />
                {!isCollapsed && <span>Staff Salary</span>}
              </button>

              <button
                onClick={() => setActiveTab('courses')}
                className={`w-full relative flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${activeTab === 'courses' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                title={isCollapsed ? "Course Setup" : ""}
              >
                <Package size={20} className={activeTab === 'courses' ? 'text-white' : 'text-slate-400'} />
                {!isCollapsed && <span>Course Setup</span>}
              </button>

              <button
                onClick={() => setActiveTab('invoice')}
                className={`w-full relative flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${activeTab === 'invoice' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                title={isCollapsed ? "Invoice" : ""}
              >
                <FileText size={20} className={activeTab === 'invoice' ? 'text-white' : 'text-slate-400'} />
                {!isCollapsed && <span>Invoice</span>}
              </button>

              <button
                onClick={() => setActiveTab('welcome_letter')}
                className={`w-full relative flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${activeTab === 'welcome_letter' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                title={isCollapsed ? "Welcome Letter" : ""}
              >
                <Mail size={20} className={activeTab === 'welcome_letter' ? 'text-white' : 'text-slate-400'} />
                {!isCollapsed && <span>Welcome Letter</span>}
              </button>

              {/* Decorative Placeholders */}
              <button
                onClick={() => { setActiveTab('notes'); setIsCollapsed(true); }}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${activeTab === 'notes' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                title={isCollapsed ? "Study Notes" : ""}
              >
                <FileText size={20} className={activeTab === 'notes' ? 'text-white' : 'text-slate-400'} />
                {!isCollapsed && <span>Study Notes</span>}
              </button>

              <button
                onClick={() => { setActiveTab('recordings'); setIsCollapsed(true); }}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${activeTab === 'recordings' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                title={isCollapsed ? "Live Recordings" : ""}
              >
                <Video size={20} className={activeTab === 'recordings' ? 'text-white' : 'text-slate-400'} />
                {!isCollapsed && <span>Live Recordings</span>}
              </button>

              <button 
                onClick={() => setActiveTab('popup')}
                className={`w-full relative flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${activeTab === 'popup' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                title={isCollapsed ? "Popup" : ""}
              >
                <Megaphone size={20} className={activeTab === 'popup' ? 'text-white' : 'text-slate-400'} />
                {!isCollapsed && <span>Popup</span>}
              </button>

              <button
                onClick={() => setActiveTab('logs')}
                className={`w-full relative flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${(activeTab === 'logs' || activeTab === 'question_logs') ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                title={isCollapsed ? "Logs" : ""}
              >
                <ScrollText size={20} className={(activeTab === 'logs' || activeTab === 'question_logs') ? 'text-white' : 'text-slate-400'} />
                {!isCollapsed && <span>Logs</span>}
              </button>

              <button 
                onClick={() => setActiveTab('gallery')}
                className={`w-full relative flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${activeTab === 'gallery' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                title={isCollapsed ? "Gallery" : ""}
              >
                <Images size={20} className={activeTab === 'gallery' ? 'text-white' : 'text-slate-400'} />
                {!isCollapsed && <span>Gallery</span>}
              </button>

              <button 
                onClick={() => setActiveTab('blogs')}
                className={`w-full relative flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${activeTab === 'blogs' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                title={isCollapsed ? "Blog" : ""}
              >
                <FileText size={20} className={activeTab === 'blogs' ? 'text-white' : 'text-slate-400'} />
                {!isCollapsed && <span>Blog</span>}
              </button>

            </nav>
          </div>
          <div className={`pt-5 mt-8 space-y-3 ${isCollapsed ? 'px-0' : 'px-2'}`}>
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
              <div className="w-10 h-10 rounded-full bg-[#1e293b] text-white font-black text-[16px] flex items-center justify-center flex-shrink-0">
                {(sessionStorage.getItem('auth_name') || 'A').trim().charAt(0).toUpperCase()}
              </div>
              {!isCollapsed && (
                <div className="flex flex-col min-w-0 overflow-hidden">
                  <span className="font-bold text-[14px] text-white truncate">{sessionStorage.getItem('auth_name') || 'Admin'}</span>
                  <span className="text-[12px] font-semibold text-slate-400 truncate">{sessionStorage.getItem('auth_email') || ''}</span>
                </div>
              )}
            </div>

            <RoleSwitcher dark collapsed={isCollapsed} />
            <button
              onClick={handleLogout}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-2'} py-2.5 mt-2 rounded-xl font-bold text-[14px] text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors`}
            >
              <LogOut size={18} className="text-slate-500" />
              {!isCollapsed && <span>Logout</span>}
            </button>
          </div>
        </aside>
      </div>

      {/* Main Dashboard Container */}
      {/* overflow-y-auto lives on this full-width <main> so its scrollbar sits at the true edge
          of the page; the inner div below only handles centering/width, never scroll, so a
          max-w-capped page doesn't end up with its scrollbar floating inboard of the real edge. */}
      <main className="flex-1 w-full min-w-0 z-10 h-full overflow-y-auto">
        <div className={activeTab === 'analytics' ? 'h-full flex flex-col pt-16 md:pt-0' : 'p-4 pt-20 sm:p-6 sm:pt-20 md:p-10 md:pt-10 max-w-[1400px] mx-auto space-y-8'}>

        {/* Active Tab: Overview Dashboard */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            
            
            {/* Premium SaaS Top Navigation Header */}
            <div className="flex items-center justify-between bg-transparent mb-2">
              
              {/* Left Section: Avatar + Welcome Message */}
              <div className="flex items-center gap-4">
                {/* Profile Avatar */}
                <div className="w-[48px] h-[48px] rounded-full bg-slate-200 border border-slate-200 shadow-[0_2px_8px_rgba(15,23,42,0.06)] overflow-hidden cursor-pointer hover:scale-105 transition-transform shrink-0">
                  <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}&background=1E293B&color=fff&size=100`} alt="Admin Profile" className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <h1 className="text-[22px] font-[700] text-[#0F172A] leading-tight font-sans tracking-tight">Welcome back, {adminName}! 👋</h1>
                  <p className="text-[13px] font-[500] text-[#64748B] tracking-tight">Here's what's happening across your academy.</p>
                </div>
              </div>

              {/* Center Section: Search Bar */}
              <div className="hidden lg:flex items-center bg-[#FFFFFF] border border-[#EEF2F7] rounded-full h-[42px] w-[380px] px-4 shadow-[0_2px_12px_rgba(15,23,42,0.03)] transition-all hover:border-blue-400 hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)] group">
                <Search size={16} className="text-[#94A3B8] shrink-0" />
                <input 
                  type="text" 
                  placeholder="Search tests, students, modules..." 
                  className="w-full bg-transparent border-none outline-none text-[13px] text-[#0F172A] placeholder-[#94A3B8] font-sans px-3"
                />
                <div className="flex items-center justify-center bg-[#F1F5F9] rounded-[6px] px-2 py-0.5 shrink-0">
                  <span className="text-[11px] font-[600] text-[#64748B]">Ctrl + K</span>
                </div>
              </div>

              {/* Right Section: Notification */}
              <div className="flex items-center relative" ref={inboxRef}>
                {/* Notification Button - opens the list of pending enquiries */}
                <button
                  onClick={() => setShowInbox(v => !v)}
                  title={pendingInbox > 0 ? `${pendingInbox} new notifications (enquiries, purchases, reports, applications)` : 'No pending items'}
                  className="relative flex items-center justify-center w-[42px] h-[42px] bg-[#FFFFFF] border border-[#EEF2F7] rounded-full shadow-[0_2px_12px_rgba(15,23,42,0.03)] hover:bg-[#F8FAFF] hover:border-blue-200 transition-all group"
                >
                  <Bell size={18} className="text-[#64748B] group-hover:text-[#2563EB] group-hover:animate-pulse" />
                  {pendingInbox > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex">
                      {/* soft pulsing halo so a pending item is noticed straight away */}
                      <span className="absolute inset-0 rounded-full bg-[#DC2626] opacity-60 animate-ping" />
                      <span className="relative min-w-[20px] h-[20px] px-1.5 bg-[#B91C1C] rounded-full border-2 border-white flex items-center justify-center text-[11px] font-black text-white leading-none tabular-nums shadow-[0_2px_8px_rgba(185,28,28,0.55)]">{pendingInbox > 99 ? '99+' : pendingInbox}</span>
                    </span>
                  )}
                </button>
                {showInbox && (
                  <div className="absolute right-0 top-[52px] z-50 w-[360px] max-w-[calc(100vw-32px)] bg-white border border-[#EEF2F7] rounded-[18px] shadow-[0_20px_50px_rgba(15,23,42,0.15)] overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#EEF2F7] flex items-center justify-between">
                      <span className="text-[14px] font-bold text-[#0F172A]">Notifications</span>
                      <span className="text-[12px] font-semibold text-[#64748B]">{pendingNotifications.length} pending</span>
                    </div>
                    <div className="max-h-[380px] overflow-y-auto">
                      {pendingNotifications.length === 0 ? (
                        <p className="px-4 py-8 text-center text-[13px] font-medium text-[#94A3B8]">You're all caught up</p>
                      ) : pendingNotifications.slice(0, 30).map(n => {
                        const kind = NOTIFY_KINDS[n.kind];
                        const Icon = kind.icon;
                        return (
                          <button
                            key={`${n.kind}:${n.id}`}
                            onClick={() => openNotification(n)}
                            className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-[#F8FAFF] border-b border-[#F1F5F9] last:border-b-0 transition-colors"
                          >
                            <span className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${kind.tint}`}><Icon size={15} /></span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8]">{n.label || kind.label}</span>
                                <span className="text-[11px] font-semibold text-[#94A3B8] shrink-0">{timeAgo(n)}</span>
                              </span>
                              <span className="block text-[13.5px] font-bold text-[#0F172A] truncate">{n.title}</span>
                              <span className="block text-[12.5px] font-medium text-[#64748B] truncate">{n.detail}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-2 border-t border-[#EEF2F7]">
                      <button
                        onClick={() => { setShowInbox(false); setStudentSubTab('queries'); setActiveTab('queries'); }}
                        className="px-4 py-2.5 text-[13px] font-bold text-[#2563EB] bg-[#F8FAFC] hover:bg-blue-50 transition-colors"
                      >
                        All enquiries
                      </button>
                      <button
                        onClick={() => { setShowInbox(false); setActiveTab('reported'); }}
                        className="px-4 py-2.5 text-[13px] font-bold text-[#2563EB] bg-[#F8FAFC] hover:bg-blue-50 border-l border-[#EEF2F7] transition-colors"
                      >
                        Reported questions
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Top Stat Bar - Premium SaaS Cards (Reduced Size) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
              
              {/* Card 1: Total Tests */}
              <div className="bg-white rounded-[22px] border border-[#EEF2F7] shadow-[0_12px_35px_rgba(15,23,42,0.06)] p-5 h-[130px] flex flex-col justify-between relative group cursor-pointer transition-all duration-300 ease-out hover:-translate-y-[4px] hover:shadow-[0_16px_40px_rgba(37,99,235,0.12)] hover:border-blue-400">
                <div className="absolute top-5 right-5 text-[#94A3B8] group-hover:text-slate-600 transition-colors">
                  <MoreHorizontal size={18} strokeWidth={2.5} />
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-[50px] h-[50px] rounded-full bg-gradient-to-br from-[#EEF6FF] to-[#DCEEFF] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <FileText size={20} className="text-[#2563EB]" strokeWidth={2.5} style={{ filter: 'drop-shadow(0 0 6px rgba(37,99,235,0.3))' }} />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-[30px] font-[700] text-[#0F172A] leading-none font-sans tracking-tight">{tests.length}</h3>
                    <span className="text-[14px] font-[500] text-[#64748B] mt-1 tracking-tight">Total Tests</span>
                  </div>
                </div>
                <div className="flex items-end justify-between w-full mt-auto pt-1">
                  {renderDelta(overview.testsDelta, "vs last 30 days")}
                </div>
              </div>

              {/* Card 2: Total Students */}
              <div className="bg-white rounded-[22px] border border-[#EEF2F7] shadow-[0_12px_35px_rgba(15,23,42,0.06)] p-5 h-[130px] flex flex-col justify-between relative group cursor-pointer transition-all duration-300 ease-out hover:-translate-y-[4px] hover:shadow-[0_16px_40px_rgba(37,99,235,0.12)] hover:border-blue-400">
                <div className="absolute top-5 right-5 text-[#94A3B8] group-hover:text-slate-600 transition-colors">
                  <MoreHorizontal size={18} strokeWidth={2.5} />
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-[50px] h-[50px] rounded-full bg-gradient-to-br from-[#F3E8FF] to-[#E9D5FF] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Users size={20} className="text-[#8B5CF6]" strokeWidth={2.5} style={{ filter: 'drop-shadow(0 0 6px rgba(139,92,246,0.3))' }} />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-[30px] font-[700] text-[#0F172A] leading-none font-sans tracking-tight">{joinedStudents.length}</h3>
                    <span className="text-[14px] font-[500] text-[#64748B] mt-1 tracking-tight">Total Students</span>
                  </div>
                </div>
                <div className="flex items-end justify-between w-full mt-auto pt-1">
                  {renderDelta(overview.studentsDelta, "new vs last 30 days")}
                </div>
              </div>

              {/* Card 3: Completion Rate */}
              <div className="bg-white rounded-[22px] border border-[#EEF2F7] shadow-[0_12px_35px_rgba(15,23,42,0.06)] p-5 h-[130px] flex flex-col justify-between relative group cursor-pointer transition-all duration-300 ease-out hover:-translate-y-[4px] hover:shadow-[0_16px_40px_rgba(37,99,235,0.12)] hover:border-blue-400">
                <div className="absolute top-5 right-5 text-[#94A3B8] group-hover:text-slate-600 transition-colors">
                  <MoreHorizontal size={18} strokeWidth={2.5} />
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-[50px] h-[50px] rounded-full bg-gradient-to-br from-[#ECFDF5] to-[#D1FAE5] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <CheckCircle2 size={20} className="text-[#10B981]" strokeWidth={2.5} style={{ filter: 'drop-shadow(0 0 6px rgba(16,185,129,0.3))' }} />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-[30px] font-[700] text-[#0F172A] leading-none font-sans tracking-tight">{overview.participation === null ? "—" : `${overview.participation}%`}</h3>
                    <span className="text-[14px] font-[500] text-[#64748B] mt-1 tracking-tight">Test Participation</span>
                  </div>
                </div>
                <div className="flex items-end justify-between w-full mt-auto pt-1">
                  {renderDelta(overview.participationDelta, "active vs last 30 days")}
                </div>
              </div>

              {/* Card 4: Average Score */}
              <div className="bg-white rounded-[22px] border border-[#EEF2F7] shadow-[0_12px_35px_rgba(15,23,42,0.06)] p-5 h-[130px] flex flex-col justify-between relative group cursor-pointer transition-all duration-300 ease-out hover:-translate-y-[4px] hover:shadow-[0_16px_40px_rgba(37,99,235,0.12)] hover:border-blue-400">
                <div className="absolute top-5 right-5 text-[#94A3B8] group-hover:text-slate-600 transition-colors">
                  <MoreHorizontal size={18} strokeWidth={2.5} />
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-[50px] h-[50px] rounded-full bg-gradient-to-br from-[#FFF7ED] to-[#FED7AA] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <TrendingUp size={20} className="text-[#F59E0B]" strokeWidth={2.5} style={{ filter: 'drop-shadow(0 0 6px rgba(245,158,11,0.3))' }} />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-[30px] font-[700] text-[#0F172A] leading-none font-sans tracking-tight">{overview.avgScore === null ? "—" : `${overview.avgScore}%`}</h3>
                    <span className="text-[14px] font-[500] text-[#64748B] mt-1 tracking-tight">Average Score</span>
                  </div>
                </div>
                <div className="flex items-end justify-between w-full mt-auto pt-1">
                  {renderDelta(overview.avgScoreDelta, "pts vs last 30 days")}
                </div>
              </div>

            </div>

            {/* Main Grid (Tests + Bento Quick Actions) */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
              
              {/* Left Section: Interactive List-View (Col span 7 or 8) */}
              <div className="xl:col-span-8 flex flex-col">
                <div className="bg-white border border-[#EEF2F7] rounded-[26px] shadow-[0_12px_35px_rgba(15,23,42,0.06)] p-4 sm:p-6 md:p-8">
                  {/* Header */}
                  <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 shadow-sm">
                        <FileText size={18} />
                      </div>
                      <div className="flex flex-col">
                        <h3 className="text-[20px] font-bold text-[#0F172A] tracking-tight font-sans leading-tight">Recent Tests</h3>
                        <p className="text-[13px] text-[#64748B] font-medium">Most recently created tests</p>
                      </div>
                    </div>
                    <button onClick={() => setActiveTab('tests')} className="text-[13px] font-semibold text-[#0F172A] border border-[#E5E7EB] px-5 py-2 rounded-full hover:bg-slate-50 transition-colors shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
                      View All &rarr;
                    </button>
                  </div>

                  {/* Test List */}
                  <div className="flex flex-col gap-2.5 overflow-x-auto">
                    {overview.recentTests.length === 0 && (
                      <div className="text-center py-10 text-[14px] font-medium text-[#94A3B8]">No tests created yet. Use "Create Test" to add your first one.</div>
                    )}
                    {overview.recentTests.map((test) => {
                      return (
                        <div key={test.id} className="group flex flex-col bg-white border border-[#EEF2F7] rounded-[16px] px-3.5 py-3 sm:px-4 sm:py-3 shadow-[0_2px_10px_rgba(15,23,42,0.04)] hover:bg-[#F8FAFF] hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(37,99,235,0.10)] transition-all duration-300 z-10 hover:z-20 overflow-hidden min-w-[620px]">
                          
                          {/* Main Row Content (Always visible) */}
                          <div className="flex items-center justify-between">
                            
                            {/* Left Side */}
                            <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
                              <div className="w-9 h-9 rounded-full bg-blue-50/50 border border-blue-100 flex items-center justify-center text-[#2563EB] shrink-0">
                                <FileText size={17} strokeWidth={2.5} />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <h4 className="font-[600] text-[16px] text-[#0F172A] font-sans leading-tight truncate">{test.title || 'Untitled Test'}</h4>
                                <span className="text-[12.5px] font-medium text-[#64748B] font-sans mt-0.5 truncate">{[test.subject, test.department].filter(Boolean).join(' • ') || 'General'}</span>
                              </div>
                            </div>

                            {/* Metadata - Fixed width columns so all rows align straight */}
                            <div className="flex items-center gap-2.5 text-[#64748B] shrink-0">
                              <span className="w-[88px] text-[13px] font-bold text-[#2563EB] whitespace-nowrap text-left">
                                {test.attemptCount} {test.attemptCount === 1 ? 'attempt' : 'attempts'}
                              </span>
                              <span className="text-slate-300 font-light select-none">|</span>
                              <div className="w-[78px] flex items-center gap-1.5 text-[13px] font-medium whitespace-nowrap">
                                <Calendar size={14} className="opacity-70 text-[#2563EB] shrink-0" />
                                <span>{formatTestOctDate(test)}</span>
                              </div>
                              <span className="text-slate-300 font-light select-none">|</span>
                              <div className="w-[76px] flex items-center gap-1.5 text-[13px] font-medium whitespace-nowrap">
                                <Clock size={14} className="opacity-70 shrink-0" />
                                <span>{test.duration || "—"} mins</span>
                              </div>
                              <span className="text-slate-300 font-light select-none">|</span>
                              <div className="w-[56px] flex items-center gap-1.5 text-[13px] font-medium whitespace-nowrap">
                                <Trophy size={14} className="opacity-70 shrink-0" />
                                <span>{test.targetMarks || "—"} M</span>
                              </div>
                              <ChevronRight size={17} className="opacity-40 group-hover:opacity-100 group-hover:text-[#2563EB] transition-all shrink-0 ml-1" />
                            </div>
                          </div>

                          {/* Hover Action Buttons (Expands downwards) */}
                          <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-300 ease-in-out opacity-0 group-hover:opacity-100">
                            <div className="overflow-hidden">
                              <div className="flex items-center gap-2.5 pt-3 mt-3 border-t border-[#EEF2F7]">
                                <button onClick={() => { setTestsView('templates'); setActiveTab('tests'); }} className="h-[36px] px-4 bg-white border border-[#E5E7EB] rounded-[12px] shadow-[0_4px_12px_rgba(15,23,42,0.06)] text-[#2563EB] font-semibold text-[13px] flex items-center gap-1.5 hover:border-[#2563EB]/40 hover:shadow-[0_0_15px_rgba(37,99,235,0.15)] transition-all">
                                  <Edit2 size={15} strokeWidth={2.5} /> Edit Test
                                </button>
                                <button onClick={() => setActiveTab('analytics')} className="h-[36px] px-4 bg-white border border-[#E5E7EB] rounded-[12px] shadow-[0_4px_12px_rgba(15,23,42,0.06)] text-[#2563EB] font-semibold text-[13px] flex items-center gap-1.5 hover:border-[#2563EB]/40 hover:shadow-[0_0_15px_rgba(37,99,235,0.15)] transition-all">
                                  <BarChart2 size={15} strokeWidth={2.5} /> Analytics
                                </button>
                                <button onClick={() => { setTestsView('schedule'); setActiveTab('tests'); }} className="h-[36px] px-4 bg-white border border-[#E5E7EB] rounded-[12px] shadow-[0_4px_12px_rgba(15,23,42,0.06)] text-[#2563EB] font-semibold text-[13px] flex items-center gap-1.5 hover:border-[#2563EB]/40 hover:shadow-[0_0_15px_rgba(37,99,235,0.15)] transition-all">
                                  <Calendar size={15} strokeWidth={2.5} /> Calendar
                                </button>
                                <div className="flex-1"></div>
                                <button onClick={() => deleteTest(test)} className="h-[36px] px-4 bg-[#FEF2F2] border border-red-100 rounded-[12px] shadow-[0_4px_12px_rgba(15,23,42,0.06)] text-[#EF4444] font-semibold text-[13px] flex items-center gap-1.5 hover:bg-red-100 transition-all">
                                  <Trash2 size={15} strokeWidth={2.5} /> Delete
                                </button>
                              </div>
                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Section: Bento Quick Actions (Col span 4) */}
              <div className="xl:col-span-4 space-y-6">

                {/* Asymmetrical Bento Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Primary Action (Styled component) */}
                  <div className="col-span-2 w-full">
                    <CreateTestButton onClick={() => setActiveTab('tests')} />
                  </div>

                  {/* Secondary Action 1 (Students) */}
                  <button onClick={() => { setStudentSubTab('joined'); setActiveTab('queries'); }} className="bg-white border border-[#EEF2F7] rounded-[20px] h-[80px] px-4 flex items-center justify-between shadow-[0_4px_20px_rgba(15,23,42,0.04)] hover:-translate-y-1 hover:shadow-[0_10px_25px_rgba(15,23,42,0.08)] hover:border-blue-400 transition-all group cursor-pointer text-left w-full overflow-hidden">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-[38px] h-[38px] shrink-0 rounded-full bg-gradient-to-br from-[#EEF6FF] to-[#DCEEFF] flex items-center justify-center text-[#2563EB]">
                        <Users size={18} strokeWidth={2.5} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <h4 className="font-bold text-[14px] text-[#0F172A] font-sans">Students</h4>
                        <span className="text-[11px] text-[#64748B] font-medium whitespace-nowrap overflow-hidden text-ellipsis">Manage all students</span>
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-slate-400 group-hover:text-blue-600 transition-colors ml-1 shrink-0" strokeWidth={2.5} />
                  </button>

                  {/* Secondary Action 2 (Analytics) */}
                  <button onClick={() => setActiveTab('analytics')} className="bg-white border border-[#EEF2F7] rounded-[20px] h-[80px] px-4 flex items-center justify-between shadow-[0_4px_20px_rgba(15,23,42,0.04)] hover:-translate-y-1 hover:shadow-[0_10px_25px_rgba(15,23,42,0.08)] hover:border-blue-400 transition-all group cursor-pointer text-left w-full overflow-hidden">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-[38px] h-[38px] shrink-0 rounded-full bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center text-indigo-600">
                        <BarChart2 size={18} strokeWidth={2.5} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <h4 className="font-bold text-[14px] text-[#0F172A] font-sans">Analytics</h4>
                        <span className="text-[11px] text-[#64748B] font-medium whitespace-nowrap overflow-hidden text-ellipsis">View all reports</span>
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-slate-400 group-hover:text-indigo-600 transition-colors ml-1 shrink-0" strokeWidth={2.5} />
                  </button>
                </div>

                {/* Student Activity Heatmap (GitHub Style) */}
                <div className="bg-white border border-[#EEF2F7] rounded-[26px] shadow-[0_12px_35px_rgba(15,23,42,0.06)] p-[24px]">
                  
                  {/* Header */}
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#2563EB] animate-pulse shadow-[0_0_8px_rgba(37,99,235,0.6)]"></div>
                      <div className="flex flex-col">
                        <h4 className="font-bold text-[17px] text-[#0F172A] leading-tight">Student Activity</h4>
                        <span className="font-medium text-[12px] text-[#64748B] mt-0.5">Test attempts submitted per day</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F8FAFC] border border-[#EEF2F7] rounded-full">
                      <span className="text-[12px] font-semibold text-[#0F172A]">Last 5 Weeks</span>
                    </div>
                  </div>

                  {/* Heatmap Grid */}
                  <div className="flex gap-3 mb-6">
                    {/* Y-Axis Labels (Weeks) */}
                    <div className="flex flex-col justify-between text-[11px] font-medium text-[#64748B] pt-6 pb-2 w-16 text-right shrink-0">
                      {overview.weeks.map(w => <span key={w.label}>{w.label}</span>)}
                    </div>

                    {/* Grid + X-Axis Labels */}
                    <div className="flex flex-col flex-1">
                      {/* X-Axis Labels (Days) */}
                      <div className="grid grid-cols-7 gap-2 mb-2 text-center">
                        <span className="text-[11px] font-medium text-[#64748B]">Mon</span>
                        <span className="text-[11px] font-medium text-[#64748B]">Tue</span>
                        <span className="text-[11px] font-medium text-[#64748B]">Wed</span>
                        <span className="text-[11px] font-medium text-[#64748B]">Thu</span>
                        <span className="text-[11px] font-medium text-[#64748B]">Fri</span>
                        <span className="text-[11px] font-medium text-[#64748B]">Sat</span>
                        <span className="text-[11px] font-medium text-[#64748B]">Sun</span>
                      </div>

                      {/* Cells */}
                      <div className="flex flex-col gap-2">
                        {overview.weeks.map((week, weekIdx) => (
                          <div key={weekIdx} className="grid grid-cols-7 gap-2">
                            {week.days.map((day, dayIdx) => {
                              const val = overview.level(day.count);
                              const colors = [
                                'bg-[#F8FAFC] border border-[#EEF2F7]', // 0
                                'bg-[#DBEAFE]', // 1
                                'bg-[#BFDBFE]', // 2
                                'bg-[#93C5FD]', // 3
                                'bg-[#60A5FA]', // 4
                                'bg-[#3B82F6]', // 5
                                'bg-[#2563EB] shadow-[0_0_8px_rgba(37,99,235,0.4)]'  // 6
                              ];
                              
                              const count = day.count;

                              return (
                                <div key={dayIdx} className="relative group/cell flex justify-center">
                                  <div className={`w-[18px] h-[18px] rounded-[4px] ${count === null ? 'bg-transparent border border-dashed border-[#E2E8F0]' : colors[val]} transition-all duration-200 cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-blue-400 group-hover/cell:scale-110 z-10`}></div>
                                  
                                  {/* Tooltip */}
                                  <div className="absolute bottom-[140%] opacity-0 group-hover/cell:opacity-100 pointer-events-none transition-all duration-200 w-max bg-[#0F172A] text-white text-[11px] rounded-[8px] px-3 py-2 shadow-xl z-[100] translate-y-1 group-hover/cell:-translate-y-1">
                                    <div className="font-bold text-[#93C5FD] mb-0.5">{day.date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                                    <div><span className="font-[900] text-white text-[13px]">{count === null ? '—' : count}</span> {count === 1 ? 'attempt' : 'attempts'}</div>
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#0F172A]"></div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Heatmap Legend */}
                  <div className="flex items-center justify-end gap-2 mb-6">
                    <span className="text-[11px] font-medium text-[#64748B]">Less Active</span>
                    <div className="flex gap-1">
                      <div className="w-[12px] h-[12px] rounded-[2px] bg-[#F8FAFC] border border-[#EEF2F7]"></div>
                      <div className="w-[12px] h-[12px] rounded-[2px] bg-[#DBEAFE]"></div>
                      <div className="w-[12px] h-[12px] rounded-[2px] bg-[#93C5FD]"></div>
                      <div className="w-[12px] h-[12px] rounded-[2px] bg-[#3B82F6]"></div>
                      <div className="w-[12px] h-[12px] rounded-[2px] bg-[#2563EB]"></div>
                    </div>
                    <span className="text-[11px] font-medium text-[#64748B]">More Active</span>
                  </div>

                  {/* Summary Footer Metric Chips */}
                  <div className="grid grid-cols-2 gap-3 pt-5 border-t border-[#EEF2F7]">
                    
                    <div className="bg-[#F8FAFC] rounded-[14px] p-3 flex items-center gap-3 border border-[#F1F5F9]">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><Users size={14} strokeWidth={2.5} /></div>
                      <div className="flex flex-col">
                        <span className="text-[15px] font-bold text-[#0F172A] leading-tight">{overview.activeStudents}</span>
                        <span className="text-[11px] font-medium text-[#64748B]">Active Students (30d)</span>
                      </div>
                    </div>

                    <div className="bg-[#F8FAFC] rounded-[14px] p-3 flex items-center gap-3 border border-[#F1F5F9]">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><TrendingUp size={14} strokeWidth={2.5} /></div>
                      <div className="flex flex-col">
                        <span className="text-[15px] font-bold text-[#0F172A] leading-tight">{overview.activeStudentsDelta === null ? "—" : `${overview.activeStudentsDelta >= 0 ? "+" : ""}${overview.activeStudentsDelta}%`}</span>
                        <span className="text-[11px] font-medium text-[#64748B]">vs Previous 30 Days</span>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Keep it up Banner */}
                <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-[26px] p-6 shadow-[0_12px_35px_rgba(37,99,235,0.2)] flex justify-between items-center relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -ml-10 -mb-10"></div>
                  <div className="relative z-10 flex flex-col w-[60%]">
                    <h3 className="text-[20px] font-bold text-white mb-2 leading-tight">{overview.attemptsImproved ? 'Keep it up!' : 'Time to engage!'}</h3>
                    <p className="text-[13px] text-blue-100 font-medium leading-relaxed">{overview.attemptsImproved ? 'Test activity is at least on par with the previous 30 days.' : 'Test activity is down from the previous 30 days. Consider publishing a new test.'}</p>
                  </div>
                  <div className="relative z-10">
                    <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center text-4xl shadow-[0_0_30px_rgba(250,204,21,0.4)] group-hover:scale-110 transition-transform">
                      🏆
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* Active Tab: Teachers (Faculty & Recruitment) */}
        {activeTab === 'teachers' && (
          <TeacherDirectory
            invitedTeachers={invitedTeachers}
            deleteTeacher={deleteTeacher}
            updateTeacher={updateTeacher}
            onInvite={() => setIsTeacherInviteModalOpen(true)}
            activeSubTab={teacherSubTab}
            setActiveSubTab={setTeacherSubTab}
          >
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-[20px] font-bold text-[#0F172A]">Recruitment Applications</h3>
                  <p className="text-[#64748B] text-[14px]">Review and manage incoming faculty applications</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      placeholder="Search applications..."
                      value={appSearch}
                      onChange={(e) => setAppSearch(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 w-full sm:w-[250px]"
                    />
                  </div>
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select
                      value={appFilter}
                      onChange={(e) => setAppFilter(e.target.value)}
                      className="pl-10 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 appearance-none cursor-pointer"
                    >
                      <option value="All">All Status</option>
                      <option value="Pending">Pending</option>
                      <option value="Shortlisted">Shortlisted</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                  </div>
                </div>
              </div>

              {/* Applications Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-200">
                        <th className="py-4 px-4 text-xs font-bold text-[#0B1220] uppercase tracking-wider">Candidate</th>
                        <th className="py-4 px-4 text-xs font-bold text-[#0B1220] uppercase tracking-wider">Applied For</th>
                        <th className="py-4 px-4 text-xs font-bold text-[#0B1220] uppercase tracking-wider">Experience</th>
                        <th className="py-4 px-4 text-xs font-bold text-[#0B1220] uppercase tracking-wider">Date</th>
                        <th className="py-4 px-4 text-xs font-bold text-[#0B1220] uppercase tracking-wider">Status</th>
                        <th className="py-4 px-4 text-xs font-bold text-[#0B1220] uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {applications.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="py-12 text-center text-slate-500">No applications found.</td>
                        </tr>
                      ) : (
                        applications
                          .filter(app => appFilter === 'All' || app.status === appFilter)
                          .filter(app => app.fullName.toLowerCase().includes(appSearch.toLowerCase()) || app.email.toLowerCase().includes(appSearch.toLowerCase()))
                          .map(app => (
                          <tr key={app.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 flex items-center justify-center font-bold text-sm border border-blue-100">
                                  {app.fullName.split(' ').map(n=>n[0]).join('').substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-900 text-sm">{app.fullName}</div>
                                  <div className="text-xs text-slate-500">{app.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-sm font-medium text-slate-700">{app.role}</td>
                            <td className="py-4 px-4 text-sm text-slate-600">{app.experience}</td>
                            <td className="py-4 px-4 text-sm text-slate-500">{app.date}</td>
                            <td className="py-4 px-4">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                                app.status === 'Shortlisted' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                                app.status === 'Rejected' ? 'bg-red-100 text-red-700 border border-red-200' :
                                'bg-amber-100 text-amber-700 border border-amber-200'
                              }`}>
                                {app.status}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setSelectedApp(app)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 rounded-lg text-xs font-semibold transition-all shadow-sm"
                                >
                                  <Eye size={14} />
                                  View
                                </button>
                                <button
                                  onClick={() => deleteApplication(app.id, app.fullName)}
                                  title="Delete Application"
                                  className="p-1.5 bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 rounded-lg transition-all shadow-sm"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </TeacherDirectory>
        )}
        
        {activeTab === 'typists' && (
          <TypistDirectory 
            invitedTypists={invitedTypists}
            deleteTypist={async (typistId) => {
              setConfirmDeleteObj({
                type: 'typist',
                id: typistId,
                message: 'Are you sure you want to remove this pair?'
              });
            }}
            updateTypist={updateTypist}
            onInvite={() => setIsTypistInviteModalOpen(true)}
            aiReviewEmail={aiReviewEmail}
            updateAiReviewEmail={updateAiReviewEmail}
          />
        )}

        {/* Active Tab: Contact Queries / Joined Students */}

        {activeTab === 'queries' && (
          <StudentDirectory
            joinedStudents={joinedStudents}
            setJoinedStudents={setJoinedStudents}
            onInvite={() => setIsInviteModalOpen(true)}
            activeSubTab={studentSubTab}
            setActiveSubTab={setStudentSubTab}
          >
            {studentSubTab === 'queries' && (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                  <div className="flex flex-wrap items-center gap-2">
                    {['All', 'Pending', 'Resolved'].map((status) => (
                      <button
                        key={status}
                        onClick={() => setQueryFilter(status)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                          queryFilter === status 
                            ? 'bg-slate-950 text-white border-slate-950 shadow-sm' 
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {status} Queries
                      </button>
                    ))}
                    
                    {/* Search box for queries */}
                    <div className="relative min-w-[180px] sm:min-w-[220px]">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={querySearch}
                        onChange={(e) => setQuerySearch(e.target.value)}
                        placeholder="Search caller, phone, dept..."
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500 shadow-sm"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => setIsAddQueryModalOpen(true)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all shrink-0 active:scale-95"
                  >
                    <PhoneCall size={14} />
                    <span>Log Call / Query</span>
                  </button>
                </div>

            {/* Queries Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredQueries.length === 0 ? (
                <div className="bg-white border border-slate-100 p-6 sm:p-8 md:p-10 text-center text-slate-400 font-semibold rounded-3xl md:col-span-2">
                  No inquiries found matching your filters.
                </div>
              ) : (
                filteredQueries.map((q) => (
                  <div 
                    key={q.id} 
                    onClick={() => setSelectedQuery(q)}
                    className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-all hover:scale-[1.01] cursor-pointer"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-slate-900 truncate">{q.fullName}</h4>
                            {q.source && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${
                                q.source.includes('Call') || q.source.includes('Phone')
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : q.source.includes('WhatsApp')
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-purple-50 text-purple-700 border-purple-200'
                              }`}>
                                {q.source.includes('Call') || q.source.includes('Phone') ? <PhoneCall size={10} /> : q.source.includes('WhatsApp') ? <MessageCircle size={10} /> : <Tag size={10} />}
                                {q.source}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 font-medium flex-wrap">
                            {q.phone && (
                              <a
                                href={`tel:${q.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="hover:text-blue-600 flex items-center gap-1 font-semibold"
                                title="Click to call"
                              >
                                <Phone size={11} className="text-slate-400" /> {q.phone}
                              </a>
                            )}
                            {q.phone && q.email && <span>•</span>}
                            {q.email && <span className="truncate">{q.email}</span>}
                          </div>
                          {(q.course || q.department) && (
                            <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-semibold flex-wrap">
                              {q.department && <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">{q.department}</span>}
                              {q.course && <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">{q.course}</span>}
                            </div>
                          )}
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 border ${
                          q.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100 animate-pulse'
                        }`}>
                          {q.status}
                        </span>
                      </div>
                      
                      <p className="whitespace-pre-wrap text-slate-600 text-[13.5px] leading-relaxed italic bg-slate-50/50 p-4 border border-slate-100/50 rounded-2xl line-clamp-3 overflow-hidden">
                        "{q.description || q.message}"
                      </p>
                      {q.status === 'Resolved' && q.resolutionNote && (
                        <div className="flex gap-2 p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                          <MessageSquareText size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                          <p className="text-[12.5px] text-emerald-900 font-medium leading-snug line-clamp-2">
                            <span className="font-bold">{q.resolvedBy || 'Admin'}:</span> {q.resolutionNote}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-50 text-[11px] font-bold text-slate-400">
                      <span>Received: {q.date}</span>
                      {q.status !== 'Resolved' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleQueryStatus(q.id);
                          }}
                          className="px-3 py-1.5 rounded-xl border flex items-center gap-1 transition-all bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-100"
                        >
                          <Check size={12} />
                          <span>Mark as Resolved</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            </>
            )}
          </StudentDirectory>
        )}

        {/* Question Bank Tab */}
        {activeTab === 'questions' && (
          <div>
            <QuestionBank initialEditQuestionId={editQuestionId} onClearEdit={() => setEditQuestionId(null)} />
          </div>
        )}

        {/* Premium Question Bank Tab */}
        {activeTab === 'premium_questions' && (
          <div>
            <QuestionBank isPremiumView={true} initialEditQuestionId={editQuestionId} onClearEdit={() => setEditQuestionId(null)} />
          </div>
        )}

        {/* Logs and Activities Tab */}
        {(activeTab === 'logs' || activeTab === 'question_logs') && (
          <QuestionImportLogs />
        )}
        
        {/* Reported Questions Tab */}
        {activeTab === 'reported' && (
          <div className="flex flex-col h-full w-full max-w-6xl mx-auto pb-12 animate-in fade-in duration-300">
            <ReportedQuestions 
              role="admin" 
              onViewQuestion={(qId) => {
                setEditQuestionId(qId);
                setActiveTab('questions');
              }}
            />
          </div>
        )}
        
        {activeTab === 'notes' && (
          <NotesManager />
        )}

        {activeTab === 'recordings' && (
          <RecordingsManager />
        )}

        {activeTab === 'attributes' && (
          <AttributesManager />
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="flex flex-col h-full w-full">
            <Analytics joinedStudents={joinedStudents} />
          </div>
        )}

        {/* Popup Configuration Tab */}
        {activeTab === 'popup' && <PopupManager />}

        {/* Active Tab: Course Bundles */}
        {activeTab === 'courses' && <CourseSetup />}
        {activeTab === 'invoice' && <InvoiceGenerator />}
        {activeTab === 'welcome_letter' && (
          <WelcomeLetter
            students={joinedStudents}
            sendEmail={sendEmailViaGAS}
            onSent={(updated) => setJoinedStudents(prev => prev.map(st => (st.id === updated.id ? updated : st)))}
          />
        )}
        {activeTab === 'fees' && <FeesTracker />}
        {activeTab === 'salary' && <SalaryManager teachers={invitedTeachers} typists={invitedTypists} />}

        {/* AI Generator Tab */}
        {activeTab === 'ai' && <AIGenerator />}

        {/* Tests Manager Tab */}
        {activeTab === 'tests' && (
          <TestsManager
            department=""
            isTeacher={false}
            initialView={testsView}
            onBack={() => setActiveTab('overview')}
            onEditQuestion={(qId) => { setEditQuestionId(qId); setActiveTab('questions'); }}
          />
        )}
        
        {/* Test Feedback Tab */}
        {activeTab === 'test_feedback' && (
          <TestFeedbackViewer />
        )}

        {/* Blogs Tab */}
        {activeTab === 'blogs' && <BlogManager />}

        {/* Gallery Tab */}
        {activeTab === 'gallery' && <GalleryManager />}

        {/* Fallback to Overview if no tab matched (never allow a blank page) */}
        {!VALID_ADMIN_TABS.includes(activeTab) && (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-8">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Section not found</h3>
            <p className="text-slate-500 mb-6 font-medium">The requested section does not exist.</p>
            <button onClick={() => setActiveTab('overview')} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors">
              Return to Dashboard
            </button>
          </div>
        )}

        </div>
      </main>

      {/* Details Modal Overlay for applications */}
      {selectedApp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-[600px] max-h-[90vh] overflow-y-auto shadow-2xl p-5 sm:p-6 md:p-8 relative space-y-6">
            <button
              onClick={() => setSelectedApp(null)}
              className="absolute right-6 top-6 p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors focus:outline-none"
            >
              <X size={16} />
            </button>

            {/* Modal Title */}
            <div>
              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-black uppercase tracking-wider">
                {selectedApp.role}
              </span>
              <h3 className="text-2xl font-[900] text-slate-900 mt-3">{selectedApp.fullName}</h3>
              <p className="text-xs text-slate-400 font-semibold mt-1">{selectedApp.email} • {selectedApp.phone}</p>
            </div>

            {/* Details Fields */}
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Experience</span>
                  <span className="font-semibold text-slate-800 text-sm">{selectedApp.experience}</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Application Date</span>
                  <span className="font-semibold text-slate-800 text-sm">{selectedApp.date}</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Subject Specialization</span>
                <span className="font-semibold text-slate-800 text-sm">{selectedApp.specialization}</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Cover Message</span>
                <p className="text-slate-600 text-xs leading-relaxed italic">"{selectedApp.message}"</p>
              </div>

              {/* Resume Box */}
              <div className="mt-4 p-4 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-colors">
                <div className="flex items-center gap-3 overflow-hidden w-full">
                  <FileText size={24} className="text-[#1d4ed8] shrink-0" />
                  <div className="flex flex-col overflow-hidden w-full">
                    <span className="text-xs font-bold text-white truncate">{selectedApp.resumeName || `Resume_${selectedApp.fullName.replace(/\s+/g, '_')}.pdf`}</span>
                    <span className="text-[10px] font-medium text-slate-400">Document</span>
                  </div>
                </div>
                {selectedApp.resumeUrl ? (
                  <a 
                    href={selectedApp.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full uppercase tracking-wider transition-colors shrink-0 flex items-center gap-1.5"
                  >
                    <span>View Resume</span>
                    <ArrowUpRight size={14} />
                  </a>
                ) : (
                  <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full uppercase tracking-wider">No File</span>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 pt-4 border-t border-slate-50">
              {showRejectInput ? (
                <div className="flex flex-col w-full gap-3">
                  <textarea 
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Enter reason for rejection (this will be sent to the applicant)"
                    className="w-full p-3 text-sm border border-slate-200 rounded-xl outline-none focus:border-red-400 bg-slate-50 min-h-[80px]"
                  />
                  <div className="flex gap-2 justify-end">
                    <button 
                      onClick={() => { setShowRejectInput(false); setRejectReason(''); }}
                      className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                      disabled={isProcessingApp}
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => updateAppStatus(selectedApp, 'Rejected', rejectReason)}
                      className="px-4 py-2 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg flex items-center gap-2 transition-colors"
                      disabled={isProcessingApp || !rejectReason.trim()}
                    >
                      {isProcessingApp ? 'Processing...' : 'Confirm Reject'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => updateAppStatus(selectedApp, 'Shortlisted')}
                    disabled={isProcessingApp}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      selectedApp.status === 'Shortlisted'
                        ? 'bg-emerald-500 text-white cursor-default'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100'
                    }`}
                  >
                    <Check size={14} />
                    <span>{isProcessingApp ? 'Processing...' : selectedApp.status === 'Shortlisted' ? 'Shortlisted!' : 'Shortlist Candidate'}</span>
                  </button>
                  <button
                    onClick={() => setShowRejectInput(true)}
                    disabled={isProcessingApp}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      selectedApp.status === 'Rejected'
                        ? 'bg-red-500 text-white cursor-default'
                        : 'bg-red-50 hover:bg-red-100 text-red-750 border border-red-100'
                    }`}
                  >
                    <X size={14} />
                    <span>{isProcessingApp ? 'Processing...' : selectedApp.status === 'Rejected' ? 'Rejected' : 'Reject Candidate'}</span>
                  </button>
                  <button
                    onClick={() => deleteApplication(selectedApp.id, selectedApp.fullName)}
                    disabled={isProcessingApp}
                    title="Delete Application"
                    className="p-3 rounded-xl font-bold text-xs flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-all shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Details Modal Overlay for queries */}
      {/* Notification pop-ups (bottom right) for new enquiries, reports and applications */}
      {alerts.length > 0 && (
        <div className="fixed bottom-5 right-5 z-[120] flex flex-col gap-3 w-[340px] max-w-[calc(100vw-40px)]">
          {alerts.map(n => {
            const kind = NOTIFY_KINDS[n.kind];
            const Icon = kind.icon;
            return (
              <div key={`${n.kind}:${n.id}`} className="bg-white border border-slate-200 rounded-[18px] shadow-[0_20px_50px_rgba(15,23,42,0.18)] p-4 flex items-start gap-3">
                <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${kind.tint}`}><Icon size={18} /></span>
                <div className="min-w-0 flex-1">
                  <div className={`text-[11px] font-bold uppercase tracking-wider ${n.kind === 'purchase' ? 'text-emerald-600' : 'text-[#2563EB]'}`}>{n.label || kind.label}</div>
                  <div className="text-[14px] font-bold text-[#0F172A] truncate">{n.title}</div>
                  <div className="text-[12.5px] font-medium text-[#64748B] truncate">{n.detail}</div>
                  <button onClick={() => openNotification(n)} className="mt-2 text-[12.5px] font-bold text-[#2563EB] hover:underline">View</button>
                </div>
                <button onClick={() => setAlerts(prev => prev.filter(a => !(a.kind === n.kind && a.id === n.id)))} className="p-1 text-[#94A3B8] hover:text-[#0F172A] rounded-full hover:bg-slate-100" title="Dismiss">
                  <X size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {selectedPurchase && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setSelectedPurchase(null)}>
          <div className="bg-white rounded-[2rem] w-full max-w-[480px] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-6 pt-6 pb-5 border-b border-emerald-100 relative">
              <button onClick={() => setSelectedPurchase(null)} className="absolute right-5 top-5 p-2 bg-white/80 hover:bg-white border border-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors">
                <X size={16} />
              </button>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700">
                <CheckCircle2 size={12} /> {PURCHASE_LABELS[selectedPurchase.itemType || 'bundle'] || 'Purchase'}
              </span>
              <div className="mt-3 text-[30px] font-[900] text-slate-900 leading-none">{formatRupees(selectedPurchase.amount)}</div>
              <div className="mt-1.5 text-[15px] font-bold text-slate-700">{selectedPurchase.itemName || selectedPurchase.bundleName || 'Item'}</div>
            </div>
            <div className="p-6 space-y-3">
              {[
                { label: 'Student', value: selectedPurchase.studentName || '-' },
                { label: 'Email', value: selectedPurchase.studentEmail || '-' },
                { label: 'Paid on', value: (() => { const ms = msOf(selectedPurchase.paidAt || selectedPurchase.createdAt); return ms ? new Date(ms).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '-'; })() },
                { label: 'Order ID', value: selectedPurchase.orderId || selectedPurchase.id },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between gap-4 text-[14px]">
                  <span className="font-semibold text-slate-400">{row.label}</span>
                  <span className="font-bold text-slate-800 text-right truncate" title={row.value}>{row.value}</span>
                </div>
              ))}
              {selectedPurchase.env === 'sandbox' && (
                <p className="text-[12px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">Test payment (Cashfree sandbox) - no real money was collected.</p>
              )}
            </div>
            <div className="px-6 pb-6">
              <button onClick={() => setSelectedPurchase(null)} className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-colors">Done</button>
            </div>
          </div>
        </div>
      )}

      {selectedQuery && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-[600px] max-h-[90vh] overflow-y-auto shadow-2xl p-5 sm:p-6 md:p-8 relative space-y-6">
            <button
              onClick={() => setSelectedQuery(null)}
              className="absolute right-6 top-6 p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors focus:outline-none"
            >
              <X size={16} />
            </button>

            {/* Modal Title & Contact Channels */}
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                  selectedQuery.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100 animate-pulse'
                }`}>
                  {selectedQuery.status}
                </span>
                {selectedQuery.source && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    <PhoneCall size={10} /> {selectedQuery.source}
                  </span>
                )}
                {selectedQuery.loggedBy && (
                  <span className="text-[11px] text-slate-400 font-medium">
                    Logged by {selectedQuery.loggedBy}
                  </span>
                )}
              </div>
              <h3 className="text-2xl font-[900] text-slate-900">{selectedQuery.fullName}</h3>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {selectedQuery.phone && (
                  <a
                    href={`tel:${selectedQuery.phone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-colors"
                  >
                    <Phone size={12} /> Call: {selectedQuery.phone}
                  </a>
                )}
                {selectedQuery.phone && (
                  <a
                    href={`https://wa.me/${selectedQuery.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-colors"
                  >
                    <MessageCircle size={12} /> WhatsApp
                  </a>
                )}
                {selectedQuery.email && (
                  <a
                    href={`mailto:${selectedQuery.email}`}
                    className="text-xs text-slate-500 font-semibold hover:text-blue-600 truncate max-w-[220px]"
                  >
                    {selectedQuery.email}
                  </a>
                )}
              </div>
            </div>

            {/* Query Content */}
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 shadow-inner">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Enquiry Details</span>
              <p className="whitespace-pre-wrap text-slate-700 text-sm leading-relaxed font-medium">
                {selectedQuery.message || selectedQuery.description}
              </p>
            </div>

            {/* What was discussed each time it was resolved */}
            {(selectedQuery.resolutionNotes || []).length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Conversation Notes</span>
                {[...selectedQuery.resolutionNotes].reverse().map((n, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                    <p className="whitespace-pre-wrap text-[13.5px] text-emerald-950 font-medium leading-relaxed">{n.note}</p>
                    <p className="text-[11px] font-bold text-emerald-700/80 mt-2">
                      {n.by || 'Admin'} · {n.at ? new Date(n.at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-50">
              <button
                type="button"
                onClick={() => handleDeleteQuery(selectedQuery.id)}
                className="px-3.5 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs flex items-center gap-1.5 transition-colors"
                title="Delete query record"
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </button>

              {selectedQuery.status !== 'Resolved' && (
                <button
                  onClick={() => {
                    toggleQueryStatus(selectedQuery.id);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-100 border shadow-sm"
                >
                  <Check size={14} />
                  <span>Mark as Resolved</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Log Manual / Direct Call Support Query Modal */}
      {isAddQueryModalOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-3 sm:p-4"
          onClick={() => !isSavingManualQuery && setIsAddQueryModalOpen(false)}
        >
          <div 
            className="bg-white rounded-[2rem] w-full max-w-[620px] max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-blue-50/60 via-indigo-50/30 to-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <PhoneCall size={18} />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">Log Call / Support Query</h3>
                  <p className="text-xs text-slate-500 font-medium">Record inquiries from phone calls, WhatsApp, or walk-ins</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isSavingManualQuery && setIsAddQueryModalOpen(false)}
                className="p-2 bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors border border-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveManualQuery} className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
              {/* Row 1: Caller Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Caller / Student Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={manualQueryForm.fullName}
                    onChange={(e) => setManualQueryForm({ ...manualQueryForm, fullName: e.target.value })}
                    placeholder="e.g. Arun Kumar"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={manualQueryForm.phone}
                    onChange={(e) => setManualQueryForm({ ...manualQueryForm, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* Row 2: Email & Channel / Source */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Email Address <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="email"
                    value={manualQueryForm.email}
                    onChange={(e) => setManualQueryForm({ ...manualQueryForm, email: e.target.value })}
                    placeholder="e.g. student@gmail.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Source / Channel
                  </label>
                  <select
                    value={manualQueryForm.source}
                    onChange={(e) => setManualQueryForm({ ...manualQueryForm, source: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="Direct Phone Call">📞 Direct Phone Call</option>
                    <option value="WhatsApp Enquiry">💬 WhatsApp Enquiry</option>
                    <option value="Office Walk-in">🏢 Office Walk-in</option>
                    <option value="Instagram / Social">📱 Instagram / Social</option>
                    <option value="Website Enquiry">🌐 Website Enquiry</option>
                    <option value="Other">📌 Other</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Department & Course */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Department / GATE Paper
                  </label>
                  <select
                    value={manualQueryForm.department}
                    onChange={(e) => setManualQueryForm({ ...manualQueryForm, department: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Select Department (Optional)...</option>
                    {STUDENT_DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Course / Requirement
                  </label>
                  <input
                    type="text"
                    value={manualQueryForm.course}
                    onChange={(e) => setManualQueryForm({ ...manualQueryForm, course: e.target.value })}
                    placeholder="e.g. GATE 2027 Full Course, Test Series..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* Row 4: College & Initial Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    College / City <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={manualQueryForm.college}
                    onChange={(e) => setManualQueryForm({ ...manualQueryForm, college: e.target.value })}
                    placeholder="e.g. PSG Tech, Coimbatore"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Initial Status
                  </label>
                  <select
                    value={manualQueryForm.status}
                    onChange={(e) => setManualQueryForm({ ...manualQueryForm, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="Pending">⏳ Pending (Needs follow-up)</option>
                    <option value="Resolved">✅ Resolved (Inquiry answered / completed)</option>
                  </select>
                </div>
              </div>

              {/* Call Notes / Query Details */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Call Discussion / Query Notes <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={manualQueryForm.notes}
                  onChange={(e) => setManualQueryForm({ ...manualQueryForm, notes: e.target.value })}
                  placeholder="Record what was discussed during the call, specific student concerns, fees discussed, follow-up date..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none leading-relaxed"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddQueryModalOpen(false)}
                  disabled={isSavingManualQuery}
                  className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingManualQuery}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSavingManualQuery ? 'Saving…' : 'Save & Log Query'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resolveDialog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[210] flex items-center justify-center p-4" onClick={() => !isSavingResolve && setResolveDialog(null)}>
          <div className="bg-white rounded-[2rem] w-full max-w-[520px] shadow-2xl p-6 sm:p-7 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-xl font-[900] text-slate-900">Resolve enquiry</h3>
                <p className="text-sm font-medium text-slate-500 mt-1 truncate">{resolveDialog.fullName} · {resolveDialog.phone || resolveDialog.email}</p>
              </div>
              <button onClick={() => setResolveDialog(null)} disabled={isSavingResolve} className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors shrink-0">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">What did you discuss with {resolveDialog.fullName || 'them'}? *</label>
              <textarea
                autoFocus
                rows={5}
                value={resolveNote}
                onChange={e => setResolveNote(e.target.value)}
                placeholder="e.g. Called on 13 Oct - explained the GATE EE course and fees, sent the brochure on WhatsApp. They will join the next batch."
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none text-sm font-medium text-slate-800 resize-y"
              />
              <p className={`text-xs font-semibold ${resolveNote.trim().length >= MIN_RESOLVE_NOTE ? 'text-emerald-600' : 'text-slate-400'}`}>
                {resolveNote.trim().length >= MIN_RESOLVE_NOTE
                  ? 'This note is saved with the enquiry.'
                  : `Write at least ${MIN_RESOLVE_NOTE} characters about the conversation to mark it as resolved.`}
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setResolveDialog(null)} disabled={isSavingResolve} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={confirmResolve}
                disabled={isSavingResolve || resolveNote.trim().length < MIN_RESOLVE_NOTE}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center gap-2 transition-colors shadow-sm"
              >
                <Check size={16} /> {isSavingResolve ? 'Saving...' : 'Mark as Resolved'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Student Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-[500px] max-h-[90vh] overflow-y-auto shadow-2xl p-5 sm:p-6 md:p-8 relative">
            <button
              onClick={() => setIsInviteModalOpen(false)}
              className="absolute right-6 top-6 p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors focus:outline-none"
            >
              <X size={16} />
            </button>

            <div className="mb-8">
              <span className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                <MailPlus size={24} />
              </span>
              <h3 className="text-2xl font-[900] text-slate-900">Invite Student</h3>
              <p className="text-slate-500 text-sm font-medium mt-1">Send an official invitation with a secure login link.</p>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Student Name</label>
                <input
                  type="text"
                  required
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-[#1D4ED8] focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold text-slate-800"
                  placeholder="e.g. Rahul Sharma"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Department / Course</label>
                <select
                  required
                  value={inviteForm.department}
                  onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-[#1D4ED8] focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold text-slate-800"
                >
                  <option value="">Select Department...</option>
                  <option value="Computer Science (CSE)">Computer Science (CSE)</option>
                  <option value="Electronics (ECE)">Electronics (ECE)</option>
                  <option value="Mechanical (ME)">Mechanical (ME)</option>
                  <option value="Civil (CE)">Civil (CE)</option>
                  <option value="Electrical (EE)">Electrical (EE)</option>
                  <option value="Data Science & AI (DS)">Data Science & AI (DS)</option>
                  <option value="Production & Industrial Engg (PI)">Production & Industrial Engg (PI)</option>
                  <option value="Instrumentation Engg (IN)">Instrumentation Engg (IN)</option>
                  <option value="Biotechnology (BT)">Biotechnology (BT)</option>
                  <option value="Chemical Engineering (CH)">Chemical Engineering (CH)</option>
                  <option value="Biomedical Engineering (BM)">Biomedical Engineering (BM)</option>
                  <option value="Physics (PH)">Physics (PH)</option>
                  <option value="Architecture & Planning (AR)">Architecture & Planning (AR)</option>
                  <option value="Agricultural Engineering (AG)">Agricultural Engineering (AG)</option>
                  <option value="Metallurgical Engineering (MT)">Metallurgical Engineering (MT)</option>
                  <option value="Environmental Science (ES)">Environmental Science (ES)</option>
                  <option value="Life Sciences (XL)">Life Sciences (XL)</option>
                  <option value="Aerospace Engineering (AE)">Aerospace Engineering (AE)</option>
                  <option value="Statistics (ST)">Statistics (ST)</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-[#1D4ED8] focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold text-slate-800"
                  placeholder="student@example.com"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isInviting}
                  className="w-full bg-[#1D4ED8] hover:bg-blue-800 text-white font-bold py-3.5 rounded-2xl transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isInviting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Sending Invitation...</span>
                    </>
                  ) : (
                    <>
                      <Mail size={18} />
                      <span>Send Invitation via Email</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Teacher Invite Modal */}
      {isTeacherInviteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-[500px] max-h-[90vh] overflow-y-auto shadow-2xl p-5 sm:p-6 md:p-8 relative">
            <button
              onClick={() => setIsTeacherInviteModalOpen(false)}
              className="absolute right-6 top-6 p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors focus:outline-none"
            >
              <X size={16} />
            </button>

            <div className="mb-8">
              <span className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4">
                <MailPlus size={24} />
              </span>
              <h3 className="text-2xl font-[900] text-slate-900">Invite Faculty</h3>
              <p className="text-slate-500 text-sm font-medium mt-1">Send an official invitation to a new teacher.</p>
            </div>

            <form onSubmit={handleTeacherInviteSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Teacher Name</label>
                <input
                  type="text"
                  required
                  value={teacherInviteForm.name}
                  onChange={(e) => setTeacherInviteForm({ ...teacherInviteForm, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-[#5b32ea] focus:ring-4 focus:ring-purple-500/10 transition-all font-semibold text-slate-800"
                  placeholder="e.g. Dr. Rajesh Kumar"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Department</label>
                <select
                  required
                  value={teacherInviteForm.department}
                  onChange={(e) => setTeacherInviteForm({ ...teacherInviteForm, department: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-[#5b32ea] focus:ring-4 focus:ring-purple-500/10 transition-all font-semibold text-slate-800"
                >
                  <option value="">Select Department...</option>
                  <option value="Computer Science (CSE)">Computer Science (CSE)</option>
                  <option value="Electronics (ECE)">Electronics (ECE)</option>
                  <option value="Mechanical (ME)">Mechanical (ME)</option>
                  <option value="Civil (CE)">Civil (CE)</option>
                  <option value="Electrical (EE)">Electrical (EE)</option>
                  <option value="Data Science & AI (DS)">Data Science & AI (DS)</option>
                  <option value="Production & Industrial Engg (PI)">Production & Industrial Engg (PI)</option>
                  <option value="Instrumentation Engg (IN)">Instrumentation Engg (IN)</option>
                  <option value="Biotechnology (BT)">Biotechnology (BT)</option>
                  <option value="Chemical Engineering (CH)">Chemical Engineering (CH)</option>
                  <option value="Biomedical Engineering (BM)">Biomedical Engineering (BM)</option>
                  <option value="Physics (PH)">Physics (PH)</option>
                  <option value="Architecture & Planning (AR)">Architecture & Planning (AR)</option>
                  <option value="Agricultural Engineering (AG)">Agricultural Engineering (AG)</option>
                  <option value="Metallurgical Engineering (MT)">Metallurgical Engineering (MT)</option>
                  <option value="Environmental Science (ES)">Environmental Science (ES)</option>
                  <option value="Life Sciences (XL)">Life Sciences (XL)</option>
                  <option value="Aerospace Engineering (AE)">Aerospace Engineering (AE)</option>
                  <option value="Statistics (ST)">Statistics (ST)</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Qualification</label>
                <input
                  type="text"
                  required
                  value={teacherInviteForm.qualification}
                  onChange={(e) => setTeacherInviteForm({ ...teacherInviteForm, qualification: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-[#5b32ea] focus:ring-4 focus:ring-purple-500/10 transition-all font-semibold text-slate-800"
                  placeholder="e.g. Ph.D. in AI"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Experience</label>
                <input
                  type="text"
                  value={teacherInviteForm.experience}
                  onChange={(e) => setTeacherInviteForm({ ...teacherInviteForm, experience: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-[#5b32ea] focus:ring-4 focus:ring-purple-500/10 transition-all font-semibold text-slate-800"
                  placeholder="e.g. 8 Years"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  value={teacherInviteForm.email}
                  onChange={(e) => setTeacherInviteForm({ ...teacherInviteForm, email: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-[#5b32ea] focus:ring-4 focus:ring-purple-500/10 transition-all font-semibold text-slate-800"
                  placeholder="faculty@university.edu"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isTeacherInviting}
                  className="w-full bg-[#5b32ea] hover:bg-[#4c28c8] text-white font-bold py-3.5 rounded-2xl transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isTeacherInviting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Sending Invitation...</span>
                    </>
                  ) : (
                    <>
                      <MailPlus size={18} />
                      <span>Send Invitation via Email</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Typist Invite Modal */}
      {isTypistInviteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[24px] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.15)] animate-in fade-in zoom-in-95 duration-200 relative">
            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[24px] font-[800] text-slate-800 tracking-tight flex items-center gap-2">
                  <MailPlus size={24} className="text-blue-600" />
                  Invite Data Entry Pair
                </h3>
                <button 
                  onClick={() => setIsTypistInviteModalOpen(false)} 
                  className="w-10 h-10 flex items-center justify-center text-slate-400 hover:bg-slate-100 rounded-2xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={async (e) => {
                e.preventDefault();
                setIsTypistInviting(true);
                try {
                  // A reviewer who already accepted for another typist doesn't need to accept again per-pairing.
                  const reviewerAlreadyAccepted = invitedTypists.some(t =>
                    (t.reviewerEmail || '').toLowerCase() === typistInviteForm.reviewerEmail.trim().toLowerCase() &&
                    (t.reviewerAccepted ?? t.status === 'Accepted')
                  );
                  const newPair = {
                    ...typistInviteForm,
                    status: 'Pending', // becomes 'Accepted' once the typist accepts too (see TypistDashboard)
                    typistAccepted: false,
                    reviewerAccepted: reviewerAlreadyAccepted,
                    ...(reviewerAlreadyAccepted ? { reviewerAcceptedAt: new Date().toISOString() } : {}),
                    invitedAt: new Date().toISOString()
                  };
                  const docRef = await addDoc(collection(db, 'invited_typists'), newPair);
                  setInvitedTypists(prev => [{ id: docRef.id, ...newPair }, ...prev]);
                  setIsTypistInviteModalOpen(false);
                  setTypistInviteForm({ typistName: '', typistEmail: '', reviewerName: '', reviewerEmail: '' });
                  setTypistInviteReviewerMode('new');
                  showToast('Typist pair invitation sent successfully!', 'success');
                } catch (err) {
                  console.error("Failed to invite pair", err);
                  showToast(`Failed to invite pair: ${err.message}`, 'error');
                }
                setIsTypistInviting(false);
              }} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-bold text-slate-700 mb-2">Typist Name</label>
                    <input type="text" required value={typistInviteForm.typistName} onChange={(e) => setTypistInviteForm({...typistInviteForm, typistName: e.target.value})} className="w-full h-[48px] border border-slate-200 rounded-xl px-4 text-[14px] bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="e.g. John Doe" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-bold text-slate-700 mb-2">Typist Email</label>
                    <input type="email" required value={typistInviteForm.typistEmail} onChange={(e) => setTypistInviteForm({...typistInviteForm, typistEmail: e.target.value})} className="w-full h-[48px] border border-slate-200 rounded-xl px-4 text-[14px] bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="e.g. john@example.com" />
                  </div>
                </div>

                {(() => {
                  const uniqueReviewers = Object.values(
                    invitedTypists.reduce((acc, t) => {
                      if (t.reviewerEmail) acc[t.reviewerEmail.toLowerCase()] = { name: t.reviewerName, email: t.reviewerEmail };
                      return acc;
                    }, {})
                  );
                  return (
                    <div className="pt-2">
                      <label className="block text-[13px] font-bold text-slate-700 mb-2">Reviewer</label>
                      {uniqueReviewers.length > 0 && (
                        <div className="flex bg-slate-100 p-1 rounded-xl mb-3 w-fit">
                          <button type="button" onClick={() => setTypistInviteReviewerMode('existing')} className={`px-4 py-1.5 text-[13px] font-bold rounded-lg transition-all ${typistInviteReviewerMode === 'existing' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500'}`}>Existing Reviewer</button>
                          <button type="button" onClick={() => { setTypistInviteReviewerMode('new'); setTypistInviteForm({ ...typistInviteForm, reviewerName: '', reviewerEmail: '' }); }} className={`px-4 py-1.5 text-[13px] font-bold rounded-lg transition-all ${typistInviteReviewerMode === 'new' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500'}`}>New Reviewer</button>
                        </div>
                      )}
                      {typistInviteReviewerMode === 'existing' && uniqueReviewers.length > 0 ? (
                        <select
                          required
                          value={typistInviteForm.reviewerEmail}
                          onChange={(e) => {
                            const r = uniqueReviewers.find(x => x.email === e.target.value);
                            setTypistInviteForm({ ...typistInviteForm, reviewerEmail: r?.email || '', reviewerName: r?.name || '' });
                          }}
                          className="w-full h-[48px] border border-slate-200 rounded-xl px-4 text-[14px] bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                        >
                          <option value="">Select a reviewer...</option>
                          {uniqueReviewers.map(r => (
                            <option key={r.email} value={r.email}>{r.name} ({r.email})</option>
                          ))}
                        </select>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <input type="text" required value={typistInviteForm.reviewerName} onChange={(e) => setTypistInviteForm({...typistInviteForm, reviewerName: e.target.value})} className="w-full h-[48px] border border-slate-200 rounded-xl px-4 text-[14px] bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="Reviewer Name, e.g. Jane Smith" />
                          <input type="email" required value={typistInviteForm.reviewerEmail} onChange={(e) => setTypistInviteForm({...typistInviteForm, reviewerEmail: e.target.value})} className="w-full h-[48px] border border-slate-200 rounded-xl px-4 text-[14px] bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="Reviewer Email, e.g. jane@example.com" />
                        </div>
                      )}
                      {typistInviteReviewerMode === 'existing' && (
                        <p className="text-[11px] text-slate-400 font-medium mt-2">This typist's extracted questions will go to the same reviewer as everyone else assigned to them.</p>
                      )}
                    </div>
                  );
                })()}

                <div className="pt-4 mt-6 border-t border-slate-100 flex gap-3">
                  <button type="button" onClick={() => setIsTypistInviteModalOpen(false)} className="flex-1 h-[48px] bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-[14px] transition-all">
                    Cancel
                  </button>
                  <button type="submit" disabled={isTypistInviting} className="flex-[2] h-[48px] bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-[14px] transition-all flex items-center justify-center shadow-lg shadow-blue-500/20 disabled:opacity-70">
                    {isTypistInviting ? 'Sending Invite...' : 'Send Pair Invitation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Generic Confirmation Modal */}
      {confirmDeleteObj && (
        <div className="fixed inset-0 z-[999999] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="text-[17px] font-[800] text-slate-800 mb-2">
                {confirmDeleteObj.title || 'Confirm Deletion'}
              </h3>
              <p className="text-[14px] font-[500] text-slate-500 leading-relaxed mb-6">
                {confirmDeleteObj.message}
              </p>
              
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteObj(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-[13px] hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteAction}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-[13px] shadow-sm transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* In-App Toast Feedback */}
      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, show: false }))}
      />

    </div>
  );
}
