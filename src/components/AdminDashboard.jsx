import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { useNavigate } from 'react-router-dom';
import CreateTestButton from './CreateTestButton';
import { 
  Users, FileText, LayoutGrid, Mail, LogOut, 
  Search, Filter, Check, X, Eye, BookOpen, Book, Clock, Tag, RefreshCw,
  ChevronLeft, ChevronRight, ChevronDown, Database, BarChart2, Megaphone, Sparkles,
  Trophy, CheckCircle2, TrendingUp, MailPlus, Trash2, Package, Calendar, Edit2, ArrowRight, MoreHorizontal, Bell, ArrowUpRight, Wallet
} from 'lucide-react';
import logoImg from '../assets/msgate_logo.png';
import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc } from 'firebase/firestore';
import QuestionBank from './admin/QuestionBank';
import Analytics from './admin/Analytics';
import AIGenerator from './admin/AIGenerator';
import AttributesManager from './admin/AttributesManager';
import CourseSetup from './admin/CourseSetup';
import TypistDirectory from './admin/TypistDirectory';
import StudentDirectory from './admin/StudentDirectory';
import TeacherDirectory from './admin/TeacherDirectory';
import FeesTracker from './admin/FeesTracker';

// Default mock data to populate localStorage if empty
const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'Anonymous';
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});

const defaultStudents = [
  { id: 1, name: "Arjun Kumar", email: "arjun.k@gmail.com", joinedDate: "15 Jul 2026", status: "Active" },
  { id: 2, name: "Priya Sharma", email: "priya.sharma@yahoo.com", joinedDate: "18 Jul 2026", status: "Active" },
  { id: 3, name: "Rahul Verma", email: "rahul.v@nitc.ac.in", joinedDate: "20 Jul 2026", status: "Inactive" },
  { id: 4, name: "Sneha Reddy", email: "sneha.r@gmail.com", joinedDate: "21 Jul 2026", status: "Active" },
  { id: 5, name: "Karthik Raja", email: "karthik.r@iitm.ac.in", joinedDate: "22 Jul 2026", status: "Active" }
];

const defaultApplications = [
  {
    id: 'app-1',
    fullName: 'Rahul Sharma',
    email: 'rahul.sharma@nitc.ac.in',
    phone: '9876543210',
    experience: '3+ Years',
    specialization: 'Computer Science (Algorithms & OS)',
    message: 'Graduated from NIT Calicut. I have 3 years of teaching experience for GATE candidates and CS subjects.',
    role: 'GATE Coaching Teacher',
    date: '21 Jul 2026',
    status: 'Pending'
  },
  {
    id: 'app-2',
    fullName: 'Anjali Nair',
    email: 'anjali.nair@iitb.ac.in',
    phone: '8765432109',
    experience: 'Fresher',
    specialization: 'Electronics (VLSI & Networks)',
    message: 'M.Tech graduate from IIT Bombay. Highly passionate about teaching and solving network equations.',
    role: 'GATE Coaching Teacher',
    date: '20 Jul 2026',
    status: 'Shortlisted'
  },
  {
    id: 'app-3',
    fullName: 'Karthik Raja',
    email: 'karthik.r@gmail.com',
    phone: '7654321098',
    experience: '5+ Years',
    specialization: 'Physics (Mechanics)',
    message: 'Applying for High School Physics Teacher. 5 years teaching CBSE curricula in top coaching centers.',
    role: 'School Teachers (6th – 12th)',
    date: '18 Jul 2026',
    status: 'Pending'
  }
];

const sendEmailViaGAS = async (to, subject, htmlMessage, attachment = null) => {
  const webhookUrl = import.meta.env.VITE_GAS_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("VITE_GAS_WEBHOOK_URL is not set. Skipping email.");
    return;
  }
  
  const payload = {
    to_email: to,
    subject: subject,
    message_html: htmlMessage
  };

  if (attachment) {
    if (Array.isArray(attachment)) {
      payload.attachments = attachment;
    } else {
      payload.attachment = attachment;
    }
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify(payload)
  });
  
  const result = await response.json();
  if (result.status !== "success") {
    throw new Error(result.message || "Failed to send email via Google Apps Script");
  }
};

const defaultQueries = [
  {
    id: 'q-1',
    fullName: 'Preeti Deshmukh',
    email: 'preeti.d@outlook.com',
    phone: '9988776655',
    message: 'Hello, do you provide weekend online classes for GATE Mechanical? I am currently working in an IT firm.',
    date: '22 Jul 2026',
    status: 'Pending'
  },
  {
    id: 'q-2',
    fullName: 'Siddharth Sen',
    email: 'sidd.sen@gmail.com',
    phone: '8877665544',
    message: 'I want to enroll for the test series package. Are full-length CBT mock tests included in the price?',
    date: '21 Jul 2026',
    status: 'Resolved'
  },
  {
    id: 'q-3',
    fullName: 'Venkatesh Prasad',
    email: 'venky.p@gmail.com',
    phone: '7766554433',
    message: 'Is study material posted to our address or is it online PDF format only?',
    date: '19 Jul 2026',
    status: 'Pending'
  }
];

const defaultCourseOverrides = [
  { code: 'CSE', fee: '₹35,000', batch: 'Starts 1st Aug (Evening)', status: 'Active' },
  { code: 'ECE', fee: '₹35,000', batch: 'Starts 1st Aug (Morning)', status: 'Active' },
  { code: 'ME', fee: '₹32,000', batch: 'Starts 5th Aug (Evening)', status: 'Active' },
  { code: 'CE', fee: '₹30,000', batch: 'Starts 10th Aug (Morning)', status: 'Active' },
  { code: 'DS', fee: '₹38,000', batch: 'Starts 1st Aug (Hybrid)', status: 'Active' }
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [queries, setQueries] = useState([]);
  const [courses, setCourses] = useState([]);
  
  const [joinedStudents, setJoinedStudents] = useState([]);

  const [invitedTeachers, setInvitedTeachers] = useState([]);
  const [teacherSubTab, setTeacherSubTab] = useState('faculty');
  const [isTeacherInviteModalOpen, setIsTeacherInviteModalOpen] = useState(false);
  const [teacherInviteForm, setTeacherInviteForm] = useState({ name: '', department: '', qualification: '', email: '' });
  const [isTeacherInviting, setIsTeacherInviting] = useState(false);

  const [invitedTypists, setInvitedTypists] = useState([]);
  
  const [confirmDeleteObj, setConfirmDeleteObj] = useState(null);

  const [appSearch, setAppSearch] = useState('');
  const [appFilter, setAppFilter] = useState('All');
  const [queryFilter, setQueryFilter] = useState('All');

  const [selectedQuery, setSelectedQuery] = useState(null);

  const [popupActive, setPopupActive] = useState(false);
  const [popupImageUrl, setPopupImageUrl] = useState('');

  useEffect(() => {
    const role = localStorage.getItem('auth_role');
    if (role !== 'admin') {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    const syncData = async () => {
      try {
        const appsSnapshot = await getDocs(collection(db, 'career_applications'));
        const fetchedApps = appsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setApplications(fetchedApps.length > 0 ? fetchedApps : defaultApplications);

        const queriesSnapshot = await getDocs(collection(db, 'contact_queries'));
        const fetchedQueries = queriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setQueries(fetchedQueries.length > 0 ? fetchedQueries : defaultQueries);

        const studentsSnapshot = await getDocs(collection(db, 'joined_students'));
        const fetchedStudents = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setJoinedStudents(fetchedStudents.length > 0 ? fetchedStudents : defaultStudents);

        const teachersSnapshot = await getDocs(collection(db, 'invited_teachers'));
        setInvitedTeachers(teachersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const typistsSnapshot = await getDocs(collection(db, 'invited_typists'));
        setInvitedTypists(typistsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const savedCourses = localStorage.getItem('gate_courses_config');
        setCourses(savedCourses ? JSON.parse(savedCourses) : defaultCourseOverrides);
      } catch (err) {
        console.error("Failed to sync data", err);
      }
    };
    syncData();
  }, []);

  useEffect(() => {
    const fetchPopup = async () => {
      try {
        const docRef = doc(db, 'site_settings', 'popup');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setPopupActive(snap.data().isActive || false);
          setPopupImageUrl(snap.data().imageUrl || '');
        }
      } catch (e) { console.error(e); }
    };
    fetchPopup();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('auth_role');
    navigate('/login');
  };

  const updateAppStatus = async (app, status, reason = '') => {
    const updated = applications.map(a => a.id === app.id ? { ...a, status } : a);
    setApplications(updated);
    try {
      await updateDoc(doc(db, 'career_applications', app.id), { status });
      if (selectedApp && selectedApp.id === app.id) setSelectedApp({ ...selectedApp, status });
    } catch (e) { console.error(e); }
  };

  const toggleQueryStatus = async (id) => {
    const query = queries.find(q => q.id === id);
    if (!query) return;
    const newStatus = query.status === 'Pending' ? 'Resolved' : 'Pending';
    setQueries(queries.map(q => q.id === id ? { ...q, status: newStatus } : q));
    try {
      await updateDoc(doc(db, 'contact_queries', id), { status: newStatus });
      if (selectedQuery && selectedQuery.id === id) setSelectedQuery({ ...selectedQuery, status: newStatus });
    } catch (e) { console.error(e); }
  };

  const handleTeacherInviteSubmit = async (e) => {
    e.preventDefault();
    setIsTeacherInviting(true);
    try {
      const newTeacher = {
        name: teacherInviteForm.name,
        email: teacherInviteForm.email,
        department: teacherInviteForm.department,
        qualification: teacherInviteForm.qualification,
        invitedDate: new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
        status: "Invited"
      };
      const docRef = await addDoc(collection(db, 'invited_teachers'), newTeacher);
      setInvitedTeachers([{ ...newTeacher, id: docRef.id }, ...invitedTeachers]);
      setIsTeacherInviteModalOpen(false);
      setTeacherInviteForm({ name: '', department: '', qualification: '', email: '' });
    } finally { setIsTeacherInviting(false); }
  };

  const deleteTeacher = async (teacherId) => {
    setConfirmDeleteObj({ type: 'teacher', id: teacherId, message: 'Are you sure you want to remove this teacher?' });
  };

  const confirmDeleteAction = async () => {
    if (!confirmDeleteObj) return;
    const { type, id } = confirmDeleteObj;
    if (type === 'teacher') {
      setInvitedTeachers(invitedTeachers.filter(t => t.id !== id));
      await deleteDoc(doc(db, 'invited_teachers', id));
    } else if (type === 'typist') {
      setInvitedTypists(invitedTypists.filter(t => t.id !== id));
      await deleteDoc(doc(db, 'invited_typists', id));
    }
    setConfirmDeleteObj(null);
  };

  return (
    <div className="h-screen w-full bg-slate-50/50 flex flex-col md:flex-row overflow-hidden">
      <div className={`transition-all duration-300 ${isCollapsed ? 'w-[88px]' : 'w-full md:w-[280px]'} h-full flex-shrink-0 relative z-20`}>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-3.5 top-9 w-7 h-7 bg-white border border-slate-200 rounded-full items-center justify-center shadow-sm text-slate-500 hover:text-slate-800 transition-colors z-30 hover:shadow-md"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <aside className="w-full h-full bg-[#f8f9fa] flex flex-col justify-between pt-8 pb-6 px-4 overflow-y-auto border-r border-slate-200/60 shadow-[4px_0_24px_rgba(0,0,0,0.02)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="space-y-8">
            <div className={`flex items-center gap-3 px-2 mb-2 ${isCollapsed ? 'justify-center px-0' : ''}`}>
              <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm flex-shrink-0 border border-slate-200 overflow-hidden p-0.5">
                <img src={logoImg} alt="MS Gate Academy Logo" className="w-full h-full object-contain" />
              </div>
              {!isCollapsed && <h3 className="text-[17px] font-[900] text-[#1D4ED8] tracking-tight whitespace-nowrap mt-0.5">MS Gate Academy</h3>}
            </div>

            <nav className="space-y-1.5 px-1">
              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full relative flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${activeTab === 'overview' ? 'bg-[#ebeeff] text-[#5b32ea]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/80'}`}
              >
                <LayoutGrid size={20} className={activeTab === 'overview' ? 'text-[#3b82f6]' : 'text-[#3b82f6]'} />
                {!isCollapsed && <span>Dashboard</span>}
              </button>

              <button
                onClick={() => setActiveTab('teachers')}
                className={`w-full relative flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${activeTab === 'teachers' ? 'bg-[#ebeeff] text-[#5b32ea]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/80'}`}
              >
                <BookOpen size={20} className={activeTab === 'teachers' ? 'text-[#8b5cf6]' : 'text-[#8b5cf6]'} />
                {!isCollapsed && <span>Teachers</span>}
              </button>

              <button
                onClick={() => setActiveTab('typists')}
                className={`w-full relative flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${activeTab === 'typists' ? 'bg-[#ebeeff] text-[#5b32ea]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/80'}`}
              >
                <Book size={20} className={activeTab === 'typists' ? 'text-[#3b82f6]' : 'text-[#3b82f6]'} />
                {!isCollapsed && <span>Data Entry Pairs</span>}
              </button>

              <button
                onClick={() => setActiveTab('queries')}
                className={`w-full relative flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${activeTab === 'queries' ? 'bg-[#ebeeff] text-[#5b32ea]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/80'}`}
              >
                <Users size={20} className="text-[#f97316]" />
                {!isCollapsed && <span>Students</span>}
              </button>

              <button
                onClick={() => setActiveTab('fees')}
                className={`w-full relative flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${activeTab === 'fees' ? 'bg-[#ebeeff] text-[#5b32ea]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/80'}`}
              >
                <Wallet size={20} className={activeTab === 'fees' ? 'text-[#eab308]' : 'text-[#eab308]'} />
                {!isCollapsed && <span>Fees Tracker</span>}
              </button>

              <button
                onClick={() => setActiveTab('courses')}
                className={`w-full relative flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${activeTab === 'courses' ? 'bg-[#ebeeff] text-[#5b32ea]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/80'}`}
              >
                <Database size={20} className={activeTab === 'courses' ? 'text-[#8b5cf6]' : 'text-[#8b5cf6]'} />
                {!isCollapsed && <span>Course Setup</span>}
              </button>

              <button 
                onClick={() => setActiveTab('attributes')}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${activeTab === 'attributes' ? 'bg-[#ebeeff] text-[#5b32ea]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/80'}`}
              >
                <Tag size={20} className="text-[#0d9488]" />
                {!isCollapsed && <span>Attributes</span>}
              </button>

              <button 
                onClick={() => setActiveTab('analytics')}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${activeTab === 'analytics' ? 'bg-[#ebeeff] text-[#5b32ea]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/80'}`}
              >
                <BarChart2 size={20} className="text-[#e11d48]" />
                {!isCollapsed && <span>Analytics</span>}
              </button>

              <button
                onClick={() => setActiveTab('questions')}
                className={`w-full relative flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${activeTab === 'questions' ? 'bg-[#ebeeff] text-[#5b32ea]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/80'}`}
              >
                <Database size={20} className={activeTab === 'questions' ? 'text-[#eab308]' : 'text-[#eab308]'} />
                {!isCollapsed && <span>Question Bank</span>}
              </button>

              <button 
                onClick={() => setActiveTab('popup')}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${activeTab === 'popup' ? 'bg-[#ebeeff] text-[#5b32ea]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/80'}`}
              >
                <Megaphone size={20} className="text-[#a855f7]" />
                {!isCollapsed && <span>Popup</span>}
              </button>

              <button 
                onClick={() => setActiveTab('ai')}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${activeTab === 'ai' ? 'bg-[#ebeeff] text-[#5b32ea]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/80'}`}
              >
                <Sparkles size={20} className={activeTab === 'ai' ? 'text-[#5b32ea]' : 'text-[#eab308]'} />
                {!isCollapsed && <span>AI Generator</span>}
              </button>
            </nav>
          </div>

          <div className={`pt-5 border-t border-slate-200 mt-8 space-y-3 ${isCollapsed ? 'px-0' : 'px-2'}`}>
            <button
              onClick={handleLogout}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-2'} py-2.5 mt-2 rounded-xl font-bold text-[14px] text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors`}
            >
              <LogOut size={18} className="text-slate-500" />
              {!isCollapsed && <span>Logout</span>}
            </button>
          </div>
        </aside>
      </div>

      <main className={`flex-1 w-full z-10 p-6 md:p-10 max-w-[1400px] mx-auto space-y-8 overflow-y-auto h-full`}>
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between bg-transparent mb-2">
              <div className="flex items-center gap-4">
                <div className="w-[48px] h-[48px] rounded-full bg-slate-200 border border-slate-200 shadow-[0_2px_8px_rgba(15,23,42,0.06)] overflow-hidden cursor-pointer hover:scale-105 transition-transform shrink-0">
                  <img src="https://ui-avatars.com/api/?name=Admin+User&background=1E293B&color=fff&size=100" alt="Admin Profile" className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <h1 className="text-[22px] font-[700] text-[#0F172A] leading-tight font-sans tracking-tight">Welcome back, Admin! 👋</h1>
                  <p className="text-[13px] font-[500] text-[#64748B] tracking-tight">Here's what's happening with your tests today.</p>
                </div>
              </div>
              <div className="flex items-center">
                <button className="relative flex items-center justify-center w-[42px] h-[42px] bg-[#FFFFFF] border border-[#EEF2F7] rounded-full shadow-[0_2px_12px_rgba(15,23,42,0.03)] hover:bg-[#F8FAFF] hover:border-blue-200 transition-all group">
                  <Bell size={18} className="text-[#64748B] group-hover:text-[#2563EB] group-hover:animate-pulse" />
                  <span className="absolute -top-1 -right-0.5 w-[16px] h-[16px] bg-[#EF4444] rounded-full border-[1.5px] border-white flex items-center justify-center text-[9px] font-bold text-white shadow-sm">3</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
              <div className="bg-white rounded-[22px] border border-[#EEF2F7] shadow-[0_12px_35px_rgba(15,23,42,0.06)] p-5 h-[130px] flex flex-col justify-between relative group cursor-pointer transition-all duration-300 ease-out hover:-translate-y-[4px] hover:shadow-[0_16px_40px_rgba(37,99,235,0.12)] hover:border-blue-400">
                <div className="flex items-center gap-4">
                  <div className="w-[50px] h-[50px] rounded-full bg-gradient-to-br from-[#EEF6FF] to-[#DCEEFF] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <FileText size={20} className="text-[#2563EB]" />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-[30px] font-[700] text-[#0F172A] leading-none font-sans tracking-tight">128</h3>
                    <span className="text-[14px] font-[500] text-[#64748B] mt-1 tracking-tight">Total Tests</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[22px] border border-[#EEF2F7] shadow-[0_12px_35px_rgba(15,23,42,0.06)] p-5 h-[130px] flex flex-col justify-between relative group cursor-pointer transition-all duration-300 ease-out hover:-translate-y-[4px] hover:shadow-[0_16px_40px_rgba(37,99,235,0.12)] hover:border-blue-400">
                <div className="flex items-center gap-4">
                  <div className="w-[50px] h-[50px] rounded-full bg-gradient-to-br from-[#F3E8FF] to-[#E9D5FF] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Users size={20} className="text-[#8B5CF6]" />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-[30px] font-[700] text-[#0F172A] leading-none font-sans tracking-tight">521</h3>
                    <span className="text-[14px] font-[500] text-[#64748B] mt-1 tracking-tight">Total Students</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[22px] border border-[#EEF2F7] shadow-[0_12px_35px_rgba(15,23,42,0.06)] p-5 h-[130px] flex flex-col justify-between relative group cursor-pointer transition-all duration-300 ease-out hover:-translate-y-[4px] hover:shadow-[0_16px_40px_rgba(37,99,235,0.12)] hover:border-blue-400">
                <div className="flex items-center gap-4">
                  <div className="w-[50px] h-[50px] rounded-full bg-gradient-to-br from-[#ECFDF5] to-[#D1FAE5] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <CheckCircle2 size={20} className="text-[#10B981]" />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-[30px] font-[700] text-[#0F172A] leading-none font-sans tracking-tight">87%</h3>
                    <span className="text-[14px] font-[500] text-[#64748B] mt-1 tracking-tight">Completion Rate</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[22px] border border-[#EEF2F7] shadow-[0_12px_35px_rgba(15,23,42,0.06)] p-5 h-[130px] flex flex-col justify-between relative group cursor-pointer transition-all duration-300 ease-out hover:-translate-y-[4px] hover:shadow-[0_16px_40px_rgba(37,99,235,0.12)] hover:border-blue-400">
                <div className="flex items-center gap-4">
                  <div className="w-[50px] h-[50px] rounded-full bg-gradient-to-br from-[#FFF7ED] to-[#FED7AA] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <TrendingUp size={20} className="text-[#F59E0B]" />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-[30px] font-[700] text-[#0F172A] leading-none font-sans tracking-tight">89%</h3>
                    <span className="text-[14px] font-[500] text-[#64748B] mt-1 tracking-tight">Average Score</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
              <div className="xl:col-span-8 flex flex-col">
                <div className="bg-white border border-[#EEF2F7] rounded-[26px] shadow-[0_12px_35px_rgba(15,23,42,0.06)] p-8">
                  <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 shadow-sm">
                        <FileText size={18} />
                      </div>
                      <div className="flex flex-col">
                        <h3 className="text-[20px] font-bold text-[#0F172A] tracking-tight font-sans leading-tight">Recent Tests</h3>
                        <p className="text-[13px] text-[#64748B] font-medium">Recently created AI-generated assessments</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="xl:col-span-4 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 w-full">
                    <CreateTestButton />
                  </div>
                                  {/* Tooltip */}
                                  <div className="absolute bottom-[140%] opacity-0 group-hover/cell:opacity-100 pointer-events-none transition-all duration-200 w-max bg-[#0F172A] text-white text-[11px] rounded-[8px] px-3 py-2 shadow-xl z-[100] translate-y-1 group-hover/cell:-translate-y-1">
                                    <div className="font-bold text-[#93C5FD] mb-0.5">Week {weekIdx + 1}, Day {dayIdx + 1}</div>
                                    <div><span className="font-[900] text-white text-[13px]">{count}</span> active</div>
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
                        <span className="text-[15px] font-bold text-[#0F172A] leading-tight">1,284</span>
                        <span className="text-[11px] font-medium text-[#64748B]">Active Students</span>
                      </div>
                    </div>

                    <div className="bg-[#F8FAFC] rounded-[14px] p-3 flex items-center gap-3 border border-[#F1F5F9]">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><TrendingUp size={14} strokeWidth={2.5} /></div>
                      <div className="flex flex-col">
                        <span className="text-[15px] font-bold text-[#0F172A] leading-tight">+12%</span>
                        <span className="text-[11px] font-medium text-[#64748B]">vs Last 30 Days</span>
                      </div>
                    </div>

                    <div className="bg-[#F8FAFC] rounded-[14px] p-3 flex items-center gap-3 border border-[#F1F5F9]">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600"><Sparkles size={14} strokeWidth={2.5} /></div>
                      <div className="flex flex-col">
                        <span className="text-[15px] font-bold text-[#0F172A] leading-tight">98%</span>
                        <span className="text-[11px] font-medium text-[#64748B]">Avg Engagement</span>
                      </div>
                    </div>

                    <div className="bg-[#F8FAFC] rounded-[14px] p-3 flex items-center gap-3 border border-[#F1F5F9]">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600"><Calendar size={14} strokeWidth={2.5} /></div>
                      <div className="flex flex-col">
                        <span className="text-[15px] font-bold text-[#0F172A] leading-tight">28 Days</span>
                        <span className="text-[11px] font-medium text-[#64748B]">Tracked</span>
                      </div>
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
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text"
                      placeholder="Search applications..."
                      value={appSearch}
                      onChange={(e) => setAppSearch(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 w-[250px]"
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
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-200">
                        <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Candidate</th>
                        <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Applied For</th>
                        <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Experience</th>
                        <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                        <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
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
                            <td className="py-4 px-6">
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
                            <td className="py-4 px-6 text-sm font-medium text-slate-700">{app.role}</td>
                            <td className="py-4 px-6 text-sm text-slate-600">{app.experience}</td>
                            <td className="py-4 px-6 text-sm text-slate-500">{app.date}</td>
                            <td className="py-4 px-6">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                                app.status === 'Shortlisted' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                                app.status === 'Rejected' ? 'bg-red-100 text-red-700 border border-red-200' :
                                'bg-amber-100 text-amber-700 border border-amber-200'
                              }`}>
                                {app.status}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <button
                                onClick={() => setSelectedApp(app)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 rounded-lg text-xs font-semibold transition-all shadow-sm"
                              >
                                <Eye size={14} />
                                View
                              </button>
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
            onInvite={() => setIsTypistInviteModalOpen(true)}
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
                <div className="flex items-center justify-between mb-6">
                  <div className="flex gap-2">
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
                  </div>
                  
                  {/* Reset seed button */}
                  <button 
                    onClick={() => {
                      localStorage.removeItem('contact_queries');
                      localStorage.setItem('contact_queries', JSON.stringify(defaultQueries));
                      setQueries(defaultQueries);
                    }}
                    className="w-fit px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw size={12} />
                    <span>Reset Seed Data</span>
                  </button>
                </div>

            {/* Queries Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredQueries.length === 0 ? (
                <div className="bg-white border border-slate-100 p-10 text-center text-slate-400 font-semibold rounded-3xl md:col-span-2">
                  No inquiries found.
                </div>
              ) : (
                filteredQueries.map((q) => (
                  <div 
                    key={q.id} 
                    onClick={() => setSelectedQuery(q)}
                    className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-all hover:scale-[1.01] cursor-pointer"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-900">{q.fullName}</h4>
                          <span className="text-xs text-slate-400 font-medium">{q.email} • {q.phone}</span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          q.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100 animate-pulse'
                        }`}>
                          {q.status}
                        </span>
                      </div>
                      
                      <p className="whitespace-pre-wrap text-slate-600 text-[13.5px] leading-relaxed italic bg-slate-50/50 p-4 border border-slate-100/50 rounded-2xl line-clamp-3 overflow-hidden">
                        "{q.message}"
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-50 text-[11px] font-bold text-slate-400">
                      <span>Received: {q.date}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleQueryStatus(q.id);
                        }}
                        className={`px-3 py-1.5 rounded-xl border flex items-center gap-1 transition-all ${
                          q.status === 'Resolved' 
                            ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-100' 
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-100'
                        }`}
                      >
                        <Check size={12} />
                        <span>Mark as {q.status === 'Resolved' ? 'Pending' : 'Resolved'}</span>
                      </button>
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
          <div className="h-full">
            <QuestionBank />
          </div>
        )}

        {/* Premium Question Bank Tab */}
        {activeTab === 'premium_questions' && (
          <div className="h-full">
            <QuestionBank isPremiumView={true} />
          </div>
        )}
        
        {activeTab === 'attributes' && (
          <AttributesManager />
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="h-full">
            <Analytics joinedStudents={joinedStudents} />
          </div>
        )}

        {/* Popup Configuration Tab */}
        {activeTab === 'popup' && (
          <div className="max-w-4xl mx-auto flex flex-col gap-8 pb-12 animate-in fade-in duration-300">
            <div className="flex flex-col gap-2">
              <h2 className="text-3xl font-[900] text-slate-800 tracking-tight">Marketing Popup</h2>
              <p className="text-slate-500 font-medium">Configure the global announcement popup that greets visitors on the home page.</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col gap-8">
              
              {/* Status Toggle */}
              <div className="flex items-center justify-between p-6 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex flex-col gap-1">
                  <span className="text-lg font-[800] text-slate-800 flex items-center gap-2">
                    Popup Status 
                    {popupActive ? 
                      <span className="bg-emerald-100 text-emerald-700 text-xs px-2.5 py-1 rounded-md font-bold uppercase tracking-widest">Live</span> : 
                      <span className="bg-slate-200 text-slate-500 text-xs px-2.5 py-1 rounded-md font-bold uppercase tracking-widest">Off</span>
                    }
                  </span>
                  <span className="text-sm font-medium text-slate-500">Enable or disable the popup from appearing on the website.</span>
                </div>
                
                <button 
                  onClick={handleTogglePopup}
                  className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${popupActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                >
                  <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${popupActive ? 'translate-x-3' : '-translate-x-3'}`} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Upload Section */}
                <div className="flex flex-col gap-4">
                  <h3 className="text-[15px] font-[800] text-slate-800 uppercase tracking-widest">Upload Banner</h3>
                  <label className="relative flex flex-col items-center justify-center w-full h-64 border-2 border-slate-300 border-dashed rounded-2xl cursor-pointer bg-slate-50 hover:bg-slate-100 hover:border-blue-400 transition-all group overflow-hidden">
                    {isUploadingPopup ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm font-bold text-slate-500">Uploading Image...</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <div className="w-16 h-16 mb-4 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                            <svg className="w-8 h-8 text-blue-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                            </svg>
                          </div>
                          <p className="mb-2 text-sm text-slate-500"><span className="font-bold text-blue-600">Click to upload</span> or drag and drop</p>
                          <p className="text-xs text-slate-400 font-medium">SVG, PNG, JPG or GIF (MAX. 800x800px)</p>
                        </div>
                        <input type="file" className="hidden" accept="image/*" onChange={handlePopupImageUpload} disabled={isUploadingPopup} />
                      </>
                    )}
                  </label>
                </div>

                {/* Preview Section */}
                <div className="flex flex-col gap-4">
                  <h3 className="text-[15px] font-[800] text-slate-800 uppercase tracking-widest flex justify-between items-center">
                    Preview
                    {popupImageUrl && <button onClick={() => setPopupImageUrl('')} className="text-xs text-red-500 hover:text-red-700 capitalize tracking-normal">Clear</button>}
                  </h3>
                  <div className="w-full h-64 border border-slate-200 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden relative shadow-inner">
                    {popupImageUrl ? (
                      <img src={popupImageUrl} alt="Popup Preview" className="w-full h-full object-contain p-2" />
                    ) : (
                      <span className="text-slate-400 font-bold text-sm">No image uploaded</span>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Active Tab: Course Bundles */}
        {activeTab === 'courses' && <CourseSetup />}
        {activeTab === 'fees' && <FeesTracker />}

        {/* AI Generator Tab */}
        {activeTab === 'ai' && <AIGenerator />}

      </main>

      {/* Details Modal Overlay for applications */}
      {selectedApp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-[600px] max-h-[90vh] overflow-y-auto shadow-2xl p-8 relative space-y-6">
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
                    <span className="text-xs font-bold text-slate-800 truncate">{selectedApp.resumeName || `Resume_${selectedApp.fullName.replace(/\s+/g, '_')}.pdf`}</span>
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
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Details Modal Overlay for queries */}
      {selectedQuery && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-[600px] max-h-[90vh] overflow-y-auto shadow-2xl p-8 relative space-y-6">
            <button
              onClick={() => setSelectedQuery(null)}
              className="absolute right-6 top-6 p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors focus:outline-none"
            >
              <X size={16} />
            </button>

            {/* Modal Title */}
            <div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                selectedQuery.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100 animate-pulse'
              }`}>
                {selectedQuery.status}
              </span>
              <h3 className="text-2xl font-[900] text-slate-900 mt-3">{selectedQuery.fullName}</h3>
              <p className="text-xs text-slate-400 font-semibold mt-1">{selectedQuery.email} • {selectedQuery.phone}</p>
            </div>

            {/* Query Content */}
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 shadow-inner">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Enquiry Details</span>
              <p className="whitespace-pre-wrap text-slate-700 text-sm leading-relaxed font-medium">
                {selectedQuery.message}
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 pt-4 border-t border-slate-50">
              <button
                onClick={() => {
                  toggleQueryStatus(selectedQuery.id);
                  setSelectedQuery(null);
                }}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  selectedQuery.status === 'Resolved' 
                    ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-100 border' 
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-100 border'
                }`}
              >
                <Check size={14} />
                <span>Mark as {selectedQuery.status === 'Resolved' ? 'Pending' : 'Resolved'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Student Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-[500px] shadow-2xl p-8 relative">
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
          <div className="bg-white rounded-[2.5rem] w-full max-w-[500px] shadow-2xl p-8 relative">
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
          <div className="bg-white rounded-[24px] w-full max-w-lg shadow-[0_20px_60px_rgba(0,0,0,0.15)] overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative">
            <div className="p-6">
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
                  const newPair = {
                    ...typistInviteForm,
                    status: 'Pending',
                    invitedAt: new Date().toISOString()
                  };
                  const docRef = await addDoc(collection(db, 'invited_typists'), newPair);
                  setInvitedTypists(prev => [{ id: docRef.id, ...newPair }, ...prev]);
                  setIsTypistInviteModalOpen(false);
                  setTypistInviteForm({ typistName: '', typistEmail: '', reviewerName: '', reviewerEmail: '' });
                } catch (err) {
                  console.error("Failed to invite pair", err);
                }
                setIsTypistInviting(false);
              }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-bold text-slate-700 mb-2">Typist Name</label>
                    <input type="text" required value={typistInviteForm.typistName} onChange={(e) => setTypistInviteForm({...typistInviteForm, typistName: e.target.value})} className="w-full h-[48px] border border-slate-200 rounded-xl px-4 text-[14px] bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="e.g. John Doe" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-bold text-slate-700 mb-2">Typist Email</label>
                    <input type="email" required value={typistInviteForm.typistEmail} onChange={(e) => setTypistInviteForm({...typistInviteForm, typistEmail: e.target.value})} className="w-full h-[48px] border border-slate-200 rounded-xl px-4 text-[14px] bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="e.g. john@example.com" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-[13px] font-bold text-slate-700 mb-2">Reviewer Name</label>
                    <input type="text" required value={typistInviteForm.reviewerName} onChange={(e) => setTypistInviteForm({...typistInviteForm, reviewerName: e.target.value})} className="w-full h-[48px] border border-slate-200 rounded-xl px-4 text-[14px] bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="e.g. Jane Smith" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-bold text-slate-700 mb-2">Reviewer Email</label>
                    <input type="email" required value={typistInviteForm.reviewerEmail} onChange={(e) => setTypistInviteForm({...typistInviteForm, reviewerEmail: e.target.value})} className="w-full h-[48px] border border-slate-200 rounded-xl px-4 text-[14px] bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="e.g. jane@example.com" />
                  </div>
                </div>

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
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center font-sans text-black">
          <div className="bg-white rounded-md shadow-xl w-full max-w-sm overflow-hidden">
            <div className="bg-red-600 text-white px-4 py-3 font-bold text-lg border-b">Confirm Deletion</div>
            <div className="p-6">
              <p className="text-gray-800 text-base mb-6">{confirmDeleteObj.message}</p>
              
              <div className="flex justify-end gap-3">
                <button onClick={() => setConfirmDeleteObj(null)} className="px-4 py-2 border border-gray-300 rounded text-gray-700 font-bold hover:bg-gray-100 transition">Cancel</button>
                <button onClick={confirmDeleteAction} className="px-4 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700 transition">Remove</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
