import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CreateTestButton from './CreateTestButton';
import { 
  Users, FileText, LayoutDashboard, Settings, Mail, LogOut, 
  Search, Filter, Check, X, Eye, BookOpen, Clock, Tag, RefreshCw,
  ChevronLeft, ChevronRight, UserCheck, Database, BarChart2, Megaphone, Sparkles,
  Plus, Trophy, CheckCircle2, TrendingUp, MailPlus, Trash2, Package, Calendar, Edit2, ArrowRight, MoreHorizontal, Bell, ArrowUpRight
} from 'lucide-react';
import emailjs from '@emailjs/browser';
import logoImg from '../assets/msgate_logo.png';
import { db, storage } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import QuestionBank from './admin/QuestionBank';
import Analytics from './admin/Analytics';
import AttributesManager from './admin/AttributesManager';
import CourseSetup from './admin/CourseSetup';

// Default mock data to populate localStorage if empty
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
  const [adminName, setAdminName] = useState('Admin');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Core datasets states
  const [applications, setApplications] = useState([]);
  const [queries, setQueries] = useState([]);
  const [courses, setCourses] = useState([]);
  
  // Joined students dataset and subtab state
  const [joinedStudents, setJoinedStudents] = useState([]);
  const [studentSubTab, setStudentSubTab] = useState('joined'); // 'joined' or 'queries'

  // Invited teachers dataset
  const [invitedTeachers, setInvitedTeachers] = useState([]);
  const [teacherSubTab, setTeacherSubTab] = useState('faculty'); // 'faculty' or 'recruitment'
  const [isTeacherInviteModalOpen, setIsTeacherInviteModalOpen] = useState(false);
  const [teacherInviteForm, setTeacherInviteForm] = useState({ name: '', department: '', qualification: '', email: '' });
  const [isTeacherInviting, setIsTeacherInviting] = useState(false);

  // Search & Filter states
  const [appSearch, setAppSearch] = useState('');
  const [appFilter, setAppFilter] = useState('All');
  const [queryFilter, setQueryFilter] = useState('All');

  // Modal detail states
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [activeHeatmapIndex, setActiveHeatmapIndex] = useState(null);

  // Invite Student states
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', department: '', email: '' });
  const [isInviting, setIsInviting] = useState(false);

  // Popup States
  const [popupActive, setPopupActive] = useState(false);
  const [popupImageUrl, setPopupImageUrl] = useState('');
  const [isUploadingPopup, setIsUploadingPopup] = useState(false);

  // Auth Guard
  useEffect(() => {
    const role = localStorage.getItem('auth_role');
    const name = localStorage.getItem('auth_name');
    if (role !== 'admin') {
      navigate('/login');
    } else {
      setAdminName(name || 'Admin');
    }
  }, [navigate]);

  // Load database from Firestore (with fallbacks to localStorage for courses config)
  useEffect(() => {
    const syncData = async () => {
      try {
        // 1. Fetch Applications
        const appsSnapshot = await getDocs(collection(db, 'career_applications'));
        const fetchedApps = appsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (fetchedApps.length > 0) {
          setApplications(fetchedApps);
        } else {
          setApplications(defaultApplications);
        }

        // 2. Fetch Queries
        const queriesSnapshot = await getDocs(collection(db, 'contact_queries'));
        const fetchedQueries = queriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (fetchedQueries.length > 0) {
          setQueries(fetchedQueries);
        } else {
          setQueries(defaultQueries);
        }

        // 3. Fetch Joined Students
        const studentsSnapshot = await getDocs(collection(db, 'joined_students'));
        const fetchedStudents = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (fetchedStudents.length > 0) {
          setJoinedStudents(fetchedStudents);
        } else {
          setJoinedStudents(defaultStudents);
        }

        // 4. Fetch Invited Teachers
        const teachersSnapshot = await getDocs(collection(db, 'invited_teachers'));
        const fetchedTeachers = teachersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setInvitedTeachers(fetchedTeachers);

        // 5. Keep courses config in localStorage for now since it's just settings
        const savedCourses = localStorage.getItem('gate_courses_config');
        if (savedCourses) {
          setCourses(JSON.parse(savedCourses));
        } else {
          localStorage.setItem('gate_courses_config', JSON.stringify(defaultCourseOverrides));
          setCourses(defaultCourseOverrides);
        }
      } catch (err) {
        console.error("Failed to sync data from Firestore", err);
      }
    };

    // Run initial sync
    syncData();

    // Listen for storage events on courses config
    const handleStorage = () => syncData();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
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
      } catch (e) {
        console.error("Popup fetch error:", e);
      }
    };
    fetchPopup();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('auth_role');
    localStorage.removeItem('auth_email');
    localStorage.removeItem('auth_name');
    window.dispatchEvent(new Event('storage'));
    navigate('/login');
  };

  const updateAppStatus = async (id, status) => {
    const updated = applications.map(app => 
      app.id === id ? { ...app, status } : app
    );
    setApplications(updated);
    try {
      await updateDoc(doc(db, 'career_applications', id), { status });
      if (selectedApp && selectedApp.id === id) {
        setSelectedApp({ ...selectedApp, status });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleQueryStatus = async (id) => {
    const query = queries.find(q => q.id === id);
    if (!query) return;
    const newStatus = query.status === 'Pending' ? 'Resolved' : 'Pending';

    const updated = queries.map(q => 
      q.id === id ? { ...q, status: newStatus } : q
    );
    setQueries(updated);
    try {
      await updateDoc(doc(db, 'contact_queries', id), { status: newStatus });
      if (selectedQuery && selectedQuery.id === id) {
        setSelectedQuery({ ...selectedQuery, status: newStatus });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateCourseDetail = (code, field, value) => {
    const updated = courses.map(c => 
      c.code === code ? { ...c, [field]: value } : c
    );
    if (!courses.some(c => c.code === code)) {
      updated.push({ code, fee: '₹30,000', batch: 'TBD', status: 'Active', [field]: value });
    }
    setCourses(updated);
    localStorage.setItem('gate_courses_config', JSON.stringify(updated));
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    setIsInviting(true);

    try {
      const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'YOUR_SERVICE_ID';
      const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_INVITE_TEMPLATE_ID || 'YOUR_INVITE_TEMPLATE_ID';
      const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'YOUR_PUBLIC_KEY';

      const loginLink = window.location.origin + '/login';

      if (SERVICE_ID !== 'YOUR_SERVICE_ID') {
        const templateParams = {
          student_name: inviteForm.name,
          to_email: inviteForm.email,
          department: inviteForm.department,
          login_link: loginLink
        };
        await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
      }

      const newStudent = {
        name: inviteForm.name,
        email: inviteForm.email,
        joinedDate: new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
        status: "Invited"
      };
      
      const docRef = await addDoc(collection(db, 'joined_students'), newStudent);
      newStudent.id = docRef.id;
      
      const updatedStudents = [newStudent, ...joinedStudents];
      setJoinedStudents(updatedStudents);
      
      setIsInviteModalOpen(false);
      setInviteForm({ name: '', department: '', email: '' });
      
    } catch (error) {
      console.error('Error sending invite:', error);
      alert('Failed to send invite email. Please try again.');
    } finally {
      setIsInviting(false);
    }
  };

  const handlePopupImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 1048576) {
      alert("Image is too large. Please upload an image under 1MB.");
      return;
    }
    
    setIsUploadingPopup(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Url = reader.result;
          setPopupImageUrl(base64Url);
          
          const docRef = doc(db, 'site_settings', 'popup');
          await setDoc(docRef, { imageUrl: base64Url, isActive: popupActive }, { merge: true });
        } catch (err) {
          console.error("Firestore error:", err);
          alert("Failed to save image to database.");
        } finally {
          setIsUploadingPopup(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("FileReader error:", err);
      setIsUploadingPopup(false);
      alert("Failed to read image file.");
    }
  };

  const handleTogglePopup = async () => {
    const newStatus = !popupActive;
    setPopupActive(newStatus);
    try {
      const docRef = doc(db, 'site_settings', 'popup');
      await setDoc(docRef, { isActive: newStatus, imageUrl: popupImageUrl }, { merge: true });
    } catch (err) {
      console.error(err);
      setPopupActive(!newStatus); 
    }
  };

  const handleTeacherInviteSubmit = async (e) => {
    e.preventDefault();
    setIsTeacherInviting(true);

    try {
      const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'YOUR_SERVICE_ID';
      const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_INVITE_TEMPLATE_ID || 'YOUR_INVITE_TEMPLATE_ID';
      const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'YOUR_PUBLIC_KEY';

      const loginLink = window.location.origin + '/login';

      if (SERVICE_ID !== 'YOUR_SERVICE_ID') {
        const templateParams = {
          student_name: `${teacherInviteForm.name} (Faculty)`,
          to_email: teacherInviteForm.email,
          department: teacherInviteForm.department,
          login_link: loginLink
        };
        await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
      }

      const newTeacher = {
        name: teacherInviteForm.name,
        email: teacherInviteForm.email,
        department: teacherInviteForm.department,
        qualification: teacherInviteForm.qualification,
        invitedDate: new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
        status: "Invited"
      };
      
      const docRef = await addDoc(collection(db, 'invited_teachers'), newTeacher);
      newTeacher.id = docRef.id;
      
      const updatedTeachers = [newTeacher, ...invitedTeachers];
      setInvitedTeachers(updatedTeachers);
      
      setIsTeacherInviteModalOpen(false);
      setTeacherInviteForm({ name: '', department: '', qualification: '', email: '' });
      
    } catch (error) {
      console.error('Failed to send teacher invite:', error);
      alert('Failed to send teacher invite email. Please check your EmailJS configuration.');
    } finally {
      setIsTeacherInviting(false);
    }
  };

  const deleteTeacher = async (teacherId) => {
    if (window.confirm('Are you sure you want to remove this teacher? They will lose access to the Faculty portal.')) {
      const updatedTeachers = invitedTeachers.filter(t => t.id !== teacherId);
      setInvitedTeachers(updatedTeachers);
      try {
        await deleteDoc(doc(db, 'invited_teachers', teacherId));
      } catch (e) {
        console.error("Failed to delete teacher", e);
      }
    }
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
    if (queryFilter === 'All') return true;
    return q.status === queryFilter;
  });

  return (
    <div className="h-screen w-full bg-slate-50/50 flex flex-col md:flex-row overflow-hidden">
      
      {/* Side Navigation Panel Wrapper */}
      <div className={`transition-all duration-300 ${isCollapsed ? 'w-[88px]' : 'w-full md:w-[280px]'} h-full flex-shrink-0 relative z-20`}>
        
        {/* Collapse Button (Now outside the overflow container so it's fully visible!) */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-3.5 top-9 w-7 h-7 bg-white border border-slate-200 rounded-full items-center justify-center shadow-sm text-slate-500 hover:text-slate-800 transition-colors z-30 hover:shadow-md"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <aside className="w-full h-full bg-[#f8f9fa] flex flex-col justify-between pt-8 pb-6 px-4 overflow-y-auto border-r border-slate-200/60 shadow-[4px_0_24px_rgba(0,0,0,0.02)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="space-y-8">
            {/* Admin title */}
            <div className={`flex items-center gap-3 px-2 mb-2 ${isCollapsed ? 'justify-center px-0' : ''}`}>
              <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm flex-shrink-0 border border-slate-200 overflow-hidden p-0.5">
                <img src={logoImg} alt="MS Gate Academy Logo" className="w-full h-full object-contain" />
              </div>
              {!isCollapsed && <h3 className="text-[17px] font-[900] text-[#1D4ED8] tracking-tight whitespace-nowrap mt-0.5">MS Gate Academy</h3>}
            </div>

            {/* Navigation Links */}
            <nav className="space-y-1.5 px-1">
              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full relative flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${activeTab === 'overview' ? 'bg-[#ebeeff] text-[#5b32ea]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/80'}`}
              >
                <LayoutDashboard size={20} className={activeTab === 'overview' ? 'text-[#3b82f6]' : 'text-[#3b82f6]'} />
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
                onClick={() => setActiveTab('queries')}
                className={`w-full relative flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${activeTab === 'queries' ? 'bg-[#ebeeff] text-[#5b32ea]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/80'}`}
              >
                <Users size={20} className="text-[#f97316]" />
                {!isCollapsed && <span>Students</span>}
              </button>

              <button
                onClick={() => setActiveTab('courses')}
                className={`w-full relative flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${activeTab === 'courses' ? 'bg-[#ebeeff] text-[#5b32ea]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/80'}`}
              >
                <Package size={20} className={activeTab === 'courses' ? 'text-[#8b5cf6]' : 'text-[#8b5cf6]'} />
                {!isCollapsed && <span>Course Setup</span>}
              </button>

              {/* Decorative Placeholders */}
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
                <BookOpen size={20} className="text-[#0ea5e9]" />
                {!isCollapsed && <span>Question Bank</span>}
              </button>

              <button className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] text-slate-500 hover:text-slate-700 hover:bg-slate-100/80 transition-all`}>
                <FileText size={20} className="text-[#3b82f6]" />
                {!isCollapsed && <span>Blogs</span>}
              </button>

              <button 
                onClick={() => setActiveTab('popup')}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${activeTab === 'popup' ? 'bg-[#ebeeff] text-[#5b32ea]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/80'}`}
              >
                <Megaphone size={20} className="text-[#a855f7]" />
                {!isCollapsed && <span>Popup</span>}
              </button>

              <button className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] text-slate-500 hover:text-slate-700 hover:bg-slate-100/80 transition-all`}>
                <Sparkles size={20} className="text-[#eab308]" />
                {!isCollapsed && <span>AI Generator</span>}
              </button>

            </nav>
          </div>

          {/* Profile Card & Logout */}
          <div className={`pt-5 border-t border-slate-200 mt-8 space-y-3 ${isCollapsed ? 'px-0' : 'px-2'}`}>
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
              <div className="w-10 h-10 rounded-full bg-[#e0e7ff] text-[#4f46e5] font-black text-[16px] flex items-center justify-center flex-shrink-0">
                M
              </div>
              {!isCollapsed && (
                <div className="flex flex-col min-w-0 overflow-hidden">
                  <span className="font-bold text-[14px] text-slate-800 truncate">User</span>
                  <span className="text-[12px] font-semibold text-slate-500 truncate">msacademics.edu@gmail.com</span>
                </div>
              )}
            </div>

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

      {/* Main Dashboard Container */}
      <main className={`flex-1 w-full z-10 ${activeTab === 'analytics' ? 'h-full flex flex-col' : 'p-6 md:p-10 max-w-[1400px] mx-auto space-y-8 overflow-y-auto h-full'}`}>
        
        {/* Active Tab: Overview Dashboard */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            
            
            {/* Premium SaaS Top Navigation Header */}
            <div className="flex items-center justify-between bg-transparent mb-2">
              
              {/* Left Section: Avatar + Welcome Message */}
              <div className="flex items-center gap-4">
                {/* Profile Avatar */}
                <div className="w-[48px] h-[48px] rounded-full bg-slate-200 border border-slate-200 shadow-[0_2px_8px_rgba(15,23,42,0.06)] overflow-hidden cursor-pointer hover:scale-105 transition-transform shrink-0">
                  <img src="https://ui-avatars.com/api/?name=Admin+User&background=1E293B&color=fff&size=100" alt="Admin Profile" className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <h1 className="text-[22px] font-[700] text-[#0F172A] leading-tight font-sans tracking-tight">Welcome back, Admin! 👋</h1>
                  <p className="text-[13px] font-[500] text-[#64748B] tracking-tight">Here's what's happening with your tests today.</p>
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
              <div className="flex items-center">
                {/* Notification Button */}
                <button className="relative flex items-center justify-center w-[42px] h-[42px] bg-[#FFFFFF] border border-[#EEF2F7] rounded-full shadow-[0_2px_12px_rgba(15,23,42,0.03)] hover:bg-[#F8FAFF] hover:border-blue-200 transition-all group">
                  <Bell size={18} className="text-[#64748B] group-hover:text-[#2563EB] group-hover:animate-pulse" />
                  <span className="absolute -top-1 -right-0.5 w-[16px] h-[16px] bg-[#EF4444] rounded-full border-[1.5px] border-white flex items-center justify-center text-[9px] font-bold text-white shadow-sm">3</span>
                </button>
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
                    <h3 className="text-[30px] font-[700] text-[#0F172A] leading-none font-sans tracking-tight">128</h3>
                    <span className="text-[14px] font-[500] text-[#64748B] mt-1 tracking-tight">Total Tests</span>
                  </div>
                </div>
                <div className="flex items-center text-[#16A34A] gap-2 mt-auto pt-1">
                  <div className="w-[18px] h-[18px] rounded-full bg-green-50 flex items-center justify-center shrink-0">
                    <ArrowUpRight size={12} strokeWidth={3} />
                  </div>
                  <span className="text-[13px] font-semibold tracking-tight">12% this month</span>
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
                    <h3 className="text-[30px] font-[700] text-[#0F172A] leading-none font-sans tracking-tight">521</h3>
                    <span className="text-[14px] font-[500] text-[#64748B] mt-1 tracking-tight">Total Students</span>
                  </div>
                </div>
                <div className="flex items-center text-[#16A34A] gap-2 mt-auto pt-1">
                  <div className="w-[18px] h-[18px] rounded-full bg-green-50 flex items-center justify-center shrink-0">
                    <ArrowUpRight size={12} strokeWidth={3} />
                  </div>
                  <span className="text-[13px] font-semibold tracking-tight">8% this month</span>
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
                    <h3 className="text-[30px] font-[700] text-[#0F172A] leading-none font-sans tracking-tight">87%</h3>
                    <span className="text-[14px] font-[500] text-[#64748B] mt-1 tracking-tight">Completion Rate</span>
                  </div>
                </div>
                <div className="flex items-center text-[#16A34A] gap-2 mt-auto pt-1">
                  <div className="w-[18px] h-[18px] rounded-full bg-green-50 flex items-center justify-center shrink-0">
                    <ArrowUpRight size={12} strokeWidth={3} />
                  </div>
                  <span className="text-[13px] font-semibold tracking-tight">5% this month</span>
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
                    <h3 className="text-[30px] font-[700] text-[#0F172A] leading-none font-sans tracking-tight">89%</h3>
                    <span className="text-[14px] font-[500] text-[#64748B] mt-1 tracking-tight">Average Score</span>
                  </div>
                </div>
                <div className="flex items-center text-[#16A34A] gap-2 mt-auto pt-1">
                  <div className="w-[18px] h-[18px] rounded-full bg-green-50 flex items-center justify-center shrink-0">
                    <ArrowUpRight size={12} strokeWidth={3} />
                  </div>
                  <span className="text-[13px] font-semibold tracking-tight">7% this month</span>
                </div>
              </div>

            </div>

            {/* Main Grid (Tests + Bento Quick Actions) */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
              
              {/* Left Section: Interactive List-View (Col span 7 or 8) */}
              <div className="xl:col-span-8 flex flex-col">
                <div className="bg-white border border-[#EEF2F7] rounded-[26px] shadow-[0_12px_35px_rgba(15,23,42,0.06)] p-8">
                  {/* Header */}
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
                    <button className="text-[13px] font-semibold text-[#0F172A] border border-[#E5E7EB] px-5 py-2 rounded-full hover:bg-slate-50 transition-colors shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
                      View All &rarr;
                    </button>
                  </div>

                  {/* Test List */}
                  <div className="flex flex-col gap-[14px]">
                    {[
                      { title: "Practice Test: ME2023.pdf", sub: "Mechanical Engineering", diff: "Medium", color: "orange", time: "60", marks: "100", date: "2 Jul 2025" },
                      { title: "CS Foundations: Q1.pdf", sub: "Computer Science", diff: "Easy", color: "green", time: "45", marks: "50", date: "1 Jul 2025" },
                      { title: "Advanced Calculus: Final.pdf", sub: "Mathematics", diff: "Hard", color: "red", time: "120", marks: "200", date: "28 Jun 2025" },
                      { title: "Physics Mock: PH2025.pdf", sub: "Physics", diff: "Medium", color: "orange", time: "90", marks: "100", date: "25 Jun 2025" },
                      { title: "Data Structures 101.pdf", sub: "Computer Science", diff: "Easy", color: "green", time: "30", marks: "30", date: "20 Jun 2025" },
                      { title: "Thermodynamics: ME-Mid.pdf", sub: "Mechanical Engineering", diff: "Hard", color: "red", time: "180", marks: "150", date: "18 Jun 2025" },
                      { title: "Organic Chem: CH-202.pdf", sub: "Chemistry", diff: "Medium", color: "orange", time: "60", marks: "80", date: "15 Jun 2025" },
                      { title: "Ethics in Tech: ET-400.pdf", sub: "Humanities", diff: "Easy", color: "green", time: "45", marks: "50", date: "10 Jun 2025" }
                    ].map((test, idx) => {
                      const diffStyles = {
                        green: 'text-[#10B981] bg-gradient-to-r from-emerald-50 to-emerald-100/50',
                        orange: 'text-[#F59E0B] bg-gradient-to-r from-orange-50 to-orange-100/50',
                        red: 'text-[#EF4444] bg-gradient-to-r from-rose-50 to-rose-100/50'
                      }[test.color];

                      return (
                        <div key={idx} className="group flex flex-col bg-white border border-[#EEF2F7] rounded-[18px] px-5 py-4 shadow-[0_3px_12px_rgba(15,23,42,0.04)] hover:bg-[#F8FAFF] hover:-translate-y-1 hover:shadow-[0_16px_35px_rgba(37,99,235,0.12)] transition-all duration-300 z-10 hover:z-20 overflow-hidden">
                          
                          {/* Main Row Content (Always visible) */}
                          <div className="flex items-center justify-between">
                            
                            {/* Left Side */}
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-blue-50/50 border border-blue-100 flex items-center justify-center text-[#2563EB]">
                                <FileText size={18} strokeWidth={2.5} />
                              </div>
                              <div className="flex flex-col w-[240px]">
                                <h4 className="font-[600] text-[17px] text-[#0F172A] font-sans leading-tight whitespace-nowrap overflow-hidden text-ellipsis">{test.title}</h4>
                                <span className="text-[13px] font-medium text-[#64748B] font-sans mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{test.sub}</span>
                              </div>
                              <span className={`ml-2 px-3 py-1 rounded-full text-[12px] font-bold tracking-wide shadow-sm whitespace-nowrap ${diffStyles}`}>
                                {test.diff}
                              </span>
                            </div>

                            {/* Metadata */}
                            <div className="flex items-center gap-8 text-[#64748B] flex-1 justify-end">
                              <div className="flex items-center gap-2 text-[14px] font-medium whitespace-nowrap">
                                <Clock size={16} className="opacity-70" /> {test.time} mins
                              </div>
                              <div className="flex items-center gap-2 text-[14px] font-medium whitespace-nowrap">
                                <Trophy size={16} className="opacity-70" /> {test.marks} Marks
                              </div>
                            </div>
                          </div>

                          {/* Hover Action Buttons (Expands downwards) */}
                          <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-300 ease-in-out opacity-0 group-hover:opacity-100">
                            <div className="overflow-hidden">
                              <div className="flex items-center gap-3 pt-4 mt-4 border-t border-[#EEF2F7]">
                                <button className="h-[40px] px-5 bg-white border border-[#E5E7EB] rounded-[14px] shadow-[0_6px_16px_rgba(15,23,42,0.08)] text-[#2563EB] font-semibold text-[14px] flex items-center gap-2 hover:border-[#2563EB]/40 hover:shadow-[0_0_15px_rgba(37,99,235,0.15)] transition-all">
                                  <Edit2 size={16} strokeWidth={2.5} /> Edit Test
                                </button>
                                <button className="h-[40px] px-5 bg-white border border-[#E5E7EB] rounded-[14px] shadow-[0_6px_16px_rgba(15,23,42,0.08)] text-[#2563EB] font-semibold text-[14px] flex items-center gap-2 hover:border-[#2563EB]/40 hover:shadow-[0_0_15px_rgba(37,99,235,0.15)] transition-all">
                                  <BarChart2 size={16} strokeWidth={2.5} /> Analytics
                                </button>
                                <div className="flex-1"></div>
                                <button className="h-[40px] px-5 bg-[#FEF2F2] border border-red-100 rounded-[14px] shadow-[0_6px_16px_rgba(15,23,42,0.08)] text-[#EF4444] font-semibold text-[14px] flex items-center gap-2 hover:bg-red-100 transition-all">
                                  <Trash2 size={16} strokeWidth={2.5} /> Delete
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
                    <CreateTestButton />
                  </div>

                  {/* Secondary Action 1 (Students) */}
                  <button className="bg-white border border-[#EEF2F7] rounded-[20px] h-[80px] px-5 flex items-center justify-between shadow-[0_4px_20px_rgba(15,23,42,0.04)] hover:-translate-y-1 hover:shadow-[0_10px_25px_rgba(15,23,42,0.08)] hover:border-blue-400 transition-all group cursor-pointer text-left w-full overflow-hidden">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-[42px] h-[42px] shrink-0 rounded-full bg-gradient-to-br from-[#EEF6FF] to-[#DCEEFF] flex items-center justify-center text-[#2563EB]">
                        <Users size={20} strokeWidth={2.5} />
                      </div>
                      <h4 className="font-bold text-[16px] text-[#0F172A] font-sans shrink-0">Students</h4>
                    </div>
                  </button>

                  {/* Secondary Action 2 (Analytics) */}
                  <button className="bg-white border border-[#EEF2F7] rounded-[20px] h-[80px] px-5 flex items-center justify-between shadow-[0_4px_20px_rgba(15,23,42,0.04)] hover:-translate-y-1 hover:shadow-[0_10px_25px_rgba(15,23,42,0.08)] hover:border-blue-400 transition-all group cursor-pointer text-left w-full overflow-hidden">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-[42px] h-[42px] shrink-0 rounded-full bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center text-indigo-600">
                        <BarChart2 size={20} strokeWidth={2.5} />
                      </div>
                      <h4 className="font-bold text-[16px] text-[#0F172A] font-sans shrink-0">Analytics</h4>
                    </div>
                  </button>
                  
                  {/* Secondary Action 3 (Manage Faculty, Spans 2 cols) */}
                  <button className="col-span-2 bg-white border border-[#EEF2F7] rounded-[20px] h-[70px] px-6 py-0 flex items-center justify-between shadow-[0_4px_20px_rgba(15,23,42,0.04)] hover:-translate-y-1 hover:shadow-[0_10px_25px_rgba(15,23,42,0.08)] hover:border-blue-400 transition-all group text-left w-full overflow-hidden">
                    <h4 className="font-bold text-[16px] text-[#0F172A] font-sans shrink-0">Manage Faculty</h4>
                    
                    <div className="w-8 h-8 shrink-0 rounded-full bg-slate-50 text-slate-600 border border-slate-100 flex items-center justify-center group-hover:translate-x-1 transition-transform group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100 ml-2">
                      <ArrowRight size={16} strokeWidth={2.5} />
                    </div>
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
                        <span className="font-medium text-[12px] text-[#64748B] mt-0.5">Daily student engagement overview</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F8FAFC] border border-[#EEF2F7] rounded-full cursor-pointer hover:bg-slate-50 transition-colors">
                      <span className="text-[12px] font-semibold text-[#0F172A]">Last 30 Days</span>
                      <ChevronRight size={14} className="text-slate-400 rotate-90" />
                    </div>
                  </div>

                  {/* Heatmap Grid */}
                  <div className="flex gap-3 mb-6">
                    {/* Y-Axis Labels (Weeks) */}
                    <div className="flex flex-col justify-between text-[11px] font-medium text-[#64748B] pt-6 pb-2 w-16 text-right shrink-0">
                      <span>May 6</span>
                      <span>May 13</span>
                      <span>May 20</span>
                      <span>May 27</span>
                      <span>Jun 3</span>
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
                        {[[0,1,2,4,3,0,0],[1,2,4,5,2,1,0],[2,3,5,6,4,2,1],[1,4,6,6,5,1,0],[2,5,6,6,6,2,1]].map((week, weekIdx) => (
                          <div key={weekIdx} className="grid grid-cols-7 gap-2">
                            {week.map((val, dayIdx) => {
                              const colors = [
                                'bg-[#F8FAFC] border border-[#EEF2F7]', // 0
                                'bg-[#DBEAFE]', // 1
                                'bg-[#BFDBFE]', // 2
                                'bg-[#93C5FD]', // 3
                                'bg-[#60A5FA]', // 4
                                'bg-[#3B82F6]', // 5
                                'bg-[#2563EB] shadow-[0_0_8px_rgba(37,99,235,0.4)]'  // 6
                              ];
                              
                              const count = val === 0 ? 0 : val * 35 + (dayIdx * 12);
                              const id = weekIdx * 7 + dayIdx;

                              return (
                                <div key={dayIdx} className="relative group/cell flex justify-center">
                                  <div className={`w-[18px] h-[18px] rounded-[4px] ${colors[val]} transition-all duration-200 cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-blue-400 group-hover/cell:scale-110 z-10`}></div>
                                  
                                  {/* Tooltip */}
                                  <div className="absolute bottom-[140%] opacity-0 group-hover/cell:opacity-100 pointer-events-none transition-all duration-200 w-max bg-[#0F172A] text-white text-[11px] rounded-[8px] px-3 py-2 shadow-xl z-[100] translate-y-1 group-hover/cell:-translate-y-1">
                                    <div className="font-bold text-[#93C5FD] mb-0.5">Week ${weekIdx + 1}, Day ${dayIdx + 1}</div>
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
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-[32px] font-[900] text-slate-900 tracking-tight leading-none mb-2">Teacher Directory</h2>
                <p className="text-slate-500 text-sm font-medium">Manage faculty and process job applications.</p>
              </div>
              
              {/* Sub-tab Navigation */}
              <div className="flex bg-slate-100 p-1 rounded-2xl w-fit">
                <button 
                  onClick={() => setTeacherSubTab('faculty')}
                  className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${teacherSubTab === 'faculty' ? 'bg-white text-[#8b5cf6] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Active Faculty
                </button>
                <button 
                  onClick={() => setTeacherSubTab('recruitment')}
                  className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${teacherSubTab === 'recruitment' ? 'bg-white text-[#8b5cf6] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Recruitment
                </button>
              </div>
            </div>

            {teacherSubTab === 'recruitment' ? (
              <>
                <div className="flex flex-col sm:flex-row justify-end gap-4">
                  {/* Reset seed button */}
                  <button 
                    onClick={() => {
                      localStorage.removeItem('career_applications');
                      localStorage.setItem('career_applications', JSON.stringify(defaultApplications));
                      setApplications(defaultApplications);
                    }}
                    className="w-fit self-end px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw size={12} />
                    <span>Reset Seed Data</span>
                  </button>
                </div>

                {/* Filter controls */}
            <div className="bg-white border border-slate-100 p-4 rounded-3xl flex flex-col md:flex-row items-center gap-4">
              <div className="relative w-full md:flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search by candidate name, email, specialty..."
                  value={appSearch}
                  onChange={(e) => setAppSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-2xl text-[14px] focus:outline-none focus:border-[#1d4ed8] focus:ring-1 focus:ring-[#1d4ed8] transition-all text-slate-800"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <Filter className="text-slate-400 flex-shrink-0" size={16} />
                <select
                  value={appFilter}
                  onChange={(e) => setAppFilter(e.target.value)}
                  className="w-full md:w-56 px-4 py-2.5 border border-slate-200 rounded-2xl text-[14px] bg-white focus:outline-none text-slate-700 font-medium"
                >
                  <option value="All">All Job Positions</option>
                  <option value="GATE Coaching Teacher">GATE Coaching Teacher</option>
                  <option value="School Teachers (6th – 12th)">School Teachers</option>
                </select>
              </div>
            </div>

            {/* Applicants Table */}
            <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-4 px-6">Candidate Name</th>
                      <th className="py-4 px-6">Position</th>
                      <th className="py-4 px-6">Specialization</th>
                      <th className="py-4 px-6">Experience</th>
                      <th className="py-4 px-6 text-center">Status</th>
                      <th className="py-4 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60 text-slate-700 text-sm">
                    {filteredApps.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-12 text-center text-slate-400 font-semibold bg-white">
                          No applicants found matching filters.
                        </td>
                      </tr>
                    ) : (
                      filteredApps.map((app) => (
                        <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 text-sm">{app.fullName}</span>
                              <span className="text-[11px] text-slate-400 font-medium">{app.email} • {app.phone}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold whitespace-nowrap">
                              {app.role === 'GATE Coaching Teacher' ? 'GATE Coach' : 'School Coach'}
                            </span>
                          </td>
                          <td className="py-4 px-6 font-semibold text-slate-800 text-[13px]">{app.specialization}</td>
                          <td className="py-4 px-6 text-slate-500 font-medium text-[13px]">{app.experience}</td>
                          <td className="py-4 px-6 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                              app.status === 'Shortlisted' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                              app.status === 'Rejected' ? 'bg-red-50 text-red-600 border border-red-100' :
                              'bg-amber-50 text-amber-600 border border-amber-100'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                app.status === 'Shortlisted' ? 'bg-emerald-500' :
                                app.status === 'Rejected' ? 'bg-red-500' : 'bg-amber-500'
                              }`} />
                              {app.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setSelectedApp(app)}
                                className="p-2 hover:bg-blue-50 text-blue-600 rounded-xl transition-colors border border-transparent hover:border-blue-100/50"
                                title="View Details"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() => updateAppStatus(app.id, 'Shortlisted')}
                                className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-xl transition-colors border border-transparent hover:border-emerald-100/50 disabled:opacity-30"
                                disabled={app.status === 'Shortlisted'}
                                title="Shortlist Candidate"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={() => updateAppStatus(app.id, 'Rejected')}
                                className="p-2 hover:bg-red-50 text-red-600 rounded-xl transition-colors border border-transparent hover:border-red-100/50 disabled:opacity-30"
                                disabled={app.status === 'Rejected'}
                                title="Reject Candidate"
                              >
                                <X size={16} />
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
            </>
            ) : (
            <>
              <div className="flex justify-end gap-4">
                <button 
                  onClick={() => setIsTeacherInviteModalOpen(true)}
                  className="bg-[#5b32ea] hover:bg-[#4c28c8] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                >
                  <MailPlus size={16} />
                  <span className="hidden sm:inline">Invite Teacher</span>
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">Teacher Name</th>
                      <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">Department</th>
                      <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">Qualification</th>
                      <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invitedTeachers.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center text-slate-500 font-medium">No faculty members invited yet.</td>
                      </tr>
                    ) : (
                      invitedTeachers.map(teacher => (
                        <tr key={teacher.id} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900">{teacher.name}</div>
                            <div className="text-xs font-medium text-slate-500 mt-0.5">{teacher.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100/50">
                              {teacher.department}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-700 text-sm">{teacher.qualification}</div>
                          </td>
                          <td className="px-6 py-4">
                            {teacher.status === 'Accepted' ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-bold border border-emerald-100">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Accepted
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 text-amber-600 text-xs font-bold border border-amber-100">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Invited
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => deleteTeacher(teacher.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                              title="Remove Teacher"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            </>
            )}
          </div>
        )}

        {/* Active Tab: Contact Queries / Joined Students */}
        {activeTab === 'queries' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-[32px] font-[900] text-slate-900 tracking-tight leading-none mb-2">Student Directory</h2>
                <p className="text-slate-500 text-sm font-medium">Manage enrolled students and support inquiries.</p>
              </div>

              {/* Sub-tab Navigation & Actions */}
              <div className="flex items-center gap-4">
                <div className="flex bg-slate-100 p-1 rounded-2xl w-fit">
                  <button 
                    onClick={() => setStudentSubTab('joined')}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${studentSubTab === 'joined' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Enrolled Students
                  </button>
                  <button 
                    onClick={() => setStudentSubTab('queries')}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${studentSubTab === 'queries' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Support Queries
                  </button>
                </div>

                <button 
                  onClick={() => setIsInviteModalOpen(true)}
                  className="bg-[#1D4ED8] hover:bg-blue-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                >
                  <MailPlus size={16} />
                  <span className="hidden sm:inline">Invite Student</span>
                </button>
              </div>
            </div>

            {studentSubTab === 'joined' ? (
              <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-4 px-6">Student Name & Email</th>
                        <th className="py-4 px-6 text-center">Status</th>
                        <th className="py-4 px-6">Joined Date</th>
                        <th className="py-4 px-6 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/60 text-slate-700 text-sm">
                      {joinedStudents.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="py-12 text-center text-slate-400 font-semibold bg-white">
                            No enrolled students found.
                          </td>
                        </tr>
                      ) : (
                        joinedStudents.map((student) => (
                          <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 font-bold flex items-center justify-center shrink-0">
                                  {student.name.charAt(0)}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-900 text-sm">{student.name}</span>
                                  <span className="text-[12px] text-slate-500 font-medium">{student.email}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                                student.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'
                              }`}>
                                {student.status}
                              </span>
                            </td>
                            <td className="py-4 px-6 font-semibold text-slate-800 text-[13px]">{student.joinedDate}</td>
                            <td className="py-4 px-6 text-center">
                              <button 
                                onClick={() => setJoinedStudents(joinedStudents.filter(s => s.id !== student.id))}
                                className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-colors inline-flex"
                                title="Delete Student"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
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
                          q.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100 animate-pulse'
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
      </div>
    )}

        {/* Question Bank Tab */}
        {activeTab === 'questions' && (
          <div className="h-full">
            <QuestionBank />
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

              {/* Simulated Resume Box */}
              <div className="p-4 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-between text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText size={24} className="text-[#1d4ed8]" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800 truncate max-w-[250px]">{selectedApp.resumeName || `Resume_${selectedApp.fullName.replace(/\s+/g, '_')}.pdf`}</span>
                    <span className="text-[10px] font-medium text-slate-400">PDF Document • 1.4 MB</span>
                  </div>
                </div>
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider">Simulated</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 pt-4 border-t border-slate-50">
              <button
                onClick={() => {
                  updateAppStatus(selectedApp.id, 'Shortlisted');
                }}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  selectedApp.status === 'Shortlisted'
                    ? 'bg-emerald-500 text-white cursor-default'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100'
                }`}
              >
                <Check size={14} />
                <span>{selectedApp.status === 'Shortlisted' ? 'Shortlisted!' : 'Shortlist Candidate'}</span>
              </button>
              <button
                onClick={() => {
                  updateAppStatus(selectedApp.id, 'Rejected');
                }}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  selectedApp.status === 'Rejected'
                    ? 'bg-red-500 text-white cursor-default'
                    : 'bg-red-50 hover:bg-red-100 text-red-750 border border-red-100'
                }`}
              >
                <X size={14} />
                <span>{selectedApp.status === 'Rejected' ? 'Rejected' : 'Reject Candidate'}</span>
              </button>
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
                <input
                  type="text"
                  required
                  value={inviteForm.department}
                  onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-[#1D4ED8] focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold text-slate-800"
                  placeholder="e.g. Computer Science"
                />
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
                <input
                  type="text"
                  required
                  value={teacherInviteForm.department}
                  onChange={(e) => setTeacherInviteForm({ ...teacherInviteForm, department: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-[#5b32ea] focus:ring-4 focus:ring-purple-500/10 transition-all font-semibold text-slate-800"
                  placeholder="e.g. Computer Science"
                />
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

    </div>
  );
}
