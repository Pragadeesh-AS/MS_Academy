import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, FileText, LayoutDashboard, Settings, Mail, LogOut, 
  Search, Filter, Check, X, Eye, BookOpen, Clock, Tag, RefreshCw,
  ChevronLeft, ChevronRight, UserCheck, Database, BarChart2, Megaphone, Sparkles,
  Plus, Trophy, CheckCircle2, TrendingUp
} from 'lucide-react';
import logoImg from '../assets/msgate_logo.png';

// Default mock data to populate localStorage if empty
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
  const [joinedStudents, setJoinedStudents] = useState([
    { id: 1, name: "Arjun Kumar", email: "arjun.k@gmail.com", joinedDate: "15 Jul 2026", status: "Active" },
    { id: 2, name: "Priya Sharma", email: "priya.sharma@yahoo.com", joinedDate: "18 Jul 2026", status: "Active" },
    { id: 3, name: "Rahul Verma", email: "rahul.v@nitc.ac.in", joinedDate: "20 Jul 2026", status: "Inactive" },
    { id: 4, name: "Sneha Reddy", email: "sneha.r@gmail.com", joinedDate: "21 Jul 2026", status: "Active" },
    { id: 5, name: "Karthik Raja", email: "karthik.r@iitm.ac.in", joinedDate: "22 Jul 2026", status: "Active" }
  ]);
  const [studentSubTab, setStudentSubTab] = useState('joined'); // 'joined' or 'queries'

  // Search & Filter states
  const [appSearch, setAppSearch] = useState('');
  const [appFilter, setAppFilter] = useState('All');
  const [queryFilter, setQueryFilter] = useState('All');

  // Modal detail states
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [activeHeatmapIndex, setActiveHeatmapIndex] = useState(null);

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

  // Load database from localStorage or seed defaults
  useEffect(() => {
    const syncData = () => {
      const savedApps = localStorage.getItem('career_applications');
      if (savedApps) {
        setApplications(JSON.parse(savedApps));
      } else {
        localStorage.setItem('career_applications', JSON.stringify(defaultApplications));
        setApplications(defaultApplications);
      }

      const savedQueries = localStorage.getItem('contact_queries');
      if (savedQueries) {
        setQueries(JSON.parse(savedQueries));
      } else {
        localStorage.setItem('contact_queries', JSON.stringify(defaultQueries));
        setQueries(defaultQueries);
      }

      const savedCourses = localStorage.getItem('gate_courses_config');
      if (savedCourses) {
        setCourses(JSON.parse(savedCourses));
      } else {
        localStorage.setItem('gate_courses_config', JSON.stringify(defaultCourseOverrides));
        setCourses(defaultCourseOverrides);
      }
    };

    // Run initial sync
    syncData();

    // Listen for storage events (real-time cross-tab updates)
    window.addEventListener('storage', syncData);
    
    // Cleanup listener on unmount
    return () => window.removeEventListener('storage', syncData);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('auth_role');
    localStorage.removeItem('auth_email');
    localStorage.removeItem('auth_name');
    window.dispatchEvent(new Event('storage'));
    navigate('/login');
  };

  // Actions for applications
  const updateAppStatus = (id, newStatus) => {
    const updated = applications.map(app => 
      app.id === id ? { ...app, status: newStatus } : app
    );
    setApplications(updated);
    localStorage.setItem('career_applications', JSON.stringify(updated));
    if (selectedApp && selectedApp.id === id) {
      setSelectedApp({ ...selectedApp, status: newStatus });
    }
  };

  // Actions for queries
  const toggleQueryStatus = (id) => {
    const updated = queries.map(q => 
      q.id === id ? { ...q, status: q.status === 'Pending' ? 'Resolved' : 'Pending' } : q
    );
    setQueries(updated);
    localStorage.setItem('contact_queries', JSON.stringify(updated));
  };

  // Actions for courses config
  const updateCourseDetail = (code, field, value) => {
    const updated = courses.map(c => 
      c.code === code ? { ...c, [field]: value } : c
    );
    // If course isn't in overrides list yet, add it
    if (!courses.some(c => c.code === code)) {
      updated.push({ code, fee: '₹30,000', batch: 'TBD', status: 'Active', [field]: value });
    }
    setCourses(updated);
    localStorage.setItem('gate_courses_config', JSON.stringify(updated));
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
                onClick={() => setActiveTab('queries')}
                className={`w-full relative flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${activeTab === 'queries' ? 'bg-[#ebeeff] text-[#5b32ea]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/80'}`}
              >
                <Users size={20} className="text-[#f97316]" />
                {!isCollapsed && <span>Students</span>}
                {!isCollapsed && queries.filter(q => q.status === 'Pending').length > 0 && (
                  <span className="ml-auto w-5 h-5 rounded-full bg-[#f97316] text-[10px] font-bold text-white flex items-center justify-center">
                    {queries.filter(q => q.status === 'Pending').length}
                  </span>
                )}
                {isCollapsed && queries.filter(q => q.status === 'Pending').length > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#f97316]"></span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('applications')}
                className={`w-full relative flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${activeTab === 'applications' ? 'bg-[#ebeeff] text-[#5b32ea]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/80'}`}
              >
                <UserCheck size={20} className="text-[#10b981]" />
                {!isCollapsed && <span>Teachers</span>}
                {!isCollapsed && applications.filter(a => a.status === 'Pending').length > 0 && (
                  <span className="ml-auto w-5 h-5 rounded-full bg-[#10b981] text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                    {applications.filter(a => a.status === 'Pending').length}
                  </span>
                )}
                {isCollapsed && applications.filter(a => a.status === 'Pending').length > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('courses')}
                className={`w-full relative flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] transition-all duration-300 ${activeTab === 'courses' ? 'bg-[#ebeeff] text-[#5b32ea]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/80'}`}
              >
                <Database size={20} className="text-[#8b5cf6]" />
                {!isCollapsed && <span>Course Setup</span>}
              </button>

              {/* Decorative Placeholders */}
              <button className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] text-slate-500 hover:text-slate-700 hover:bg-slate-100/80 transition-all`}>
                <Tag size={20} className="text-[#0d9488]" />
                {!isCollapsed && <span>Attributes</span>}
              </button>
              
              <button className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] text-slate-500 hover:text-slate-700 hover:bg-slate-100/80 transition-all`}>
                <BarChart2 size={20} className="text-[#e11d48]" />
                {!isCollapsed && <span>Analytics</span>}
              </button>

              <button className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] text-slate-500 hover:text-slate-700 hover:bg-slate-100/80 transition-all`}>
                <FileText size={20} className="text-[#3b82f6]" />
                {!isCollapsed && <span>Blogs</span>}
              </button>

              <button className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-2xl font-bold text-[14.5px] text-slate-500 hover:text-slate-700 hover:bg-slate-100/80 transition-all`}>
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
      <main className="flex-1 p-6 md:p-10 max-w-[1400px] mx-auto w-full space-y-8 overflow-y-auto h-full z-10">
        
        {/* Active Tab: Overview Dashboard */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            
            {/* Top Stat Bar - Unified Glass Pill */}
            <div className="w-full bg-white border border-slate-100 rounded-full shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-2.5 flex justify-between items-center relative overflow-hidden group/stats">
              {/* Stat 1 */}
              <div className="flex-1 flex items-center justify-center gap-4 border-r border-slate-100 px-4 group/stat hover:bg-slate-50/50 rounded-l-full transition-colors cursor-pointer py-3">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-[#1D4ED8] flex items-center justify-center group-hover/stat:scale-110 transition-transform group-hover/stat:shadow-[0_0_15px_rgba(29,78,216,0.3)]">
                  <FileText size={20} />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-[26px] font-[900] text-slate-800 leading-none group-hover/stat:text-[#1D4ED8] transition-colors">20</h3>
                  <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-1">Total Tests</span>
                </div>
              </div>
              {/* Stat 2 */}
              <div className="flex-1 flex items-center justify-center gap-4 border-r border-slate-100 px-4 group/stat hover:bg-slate-50/50 transition-colors cursor-pointer py-3">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-[#1D4ED8] flex items-center justify-center group-hover/stat:scale-110 transition-transform group-hover/stat:shadow-[0_0_15px_rgba(29,78,216,0.3)]">
                  <Users size={20} />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-[26px] font-[900] text-slate-800 leading-none group-hover/stat:text-[#1D4ED8] transition-colors">10</h3>
                  <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-1">Active Students</span>
                </div>
              </div>
              {/* Stat 3 */}
              <div className="flex-1 flex items-center justify-center gap-4 border-r border-slate-100 px-4 group/stat hover:bg-slate-50/50 transition-colors cursor-pointer py-3">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-[#1D4ED8] flex items-center justify-center group-hover/stat:scale-110 transition-transform group-hover/stat:shadow-[0_0_15px_rgba(29,78,216,0.3)]">
                  <CheckCircle2 size={20} />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-[26px] font-[900] text-slate-800 leading-none group-hover/stat:text-[#1D4ED8] transition-colors">71%</h3>
                  <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-1">Completion Rate</span>
                </div>
              </div>
              {/* Stat 4 */}
              <div className="flex-1 flex items-center justify-center gap-4 px-4 group/stat hover:bg-slate-50/50 rounded-r-full transition-colors cursor-pointer py-3">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-[#1D4ED8] flex items-center justify-center group-hover/stat:scale-110 transition-transform group-hover/stat:shadow-[0_0_15px_rgba(29,78,216,0.3)]">
                  <TrendingUp size={20} />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-[26px] font-[900] text-slate-800 leading-none group-hover/stat:text-[#1D4ED8] transition-colors">49%</h3>
                  <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-1">Avg. Score</span>
                </div>
              </div>
            </div>

            {/* Main Grid (Tests + Bento Quick Actions) */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
              
              {/* Left Section: Interactive List-View (Col span 7 or 8) */}
              <div className="xl:col-span-8 flex flex-col space-y-6">
                <div className="flex justify-between items-center px-1 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-md">
                      <FileText size={14} />
                    </div>
                    <h3 className="text-[22px] font-[900] text-slate-900 tracking-tight">Recent Tests</h3>
                  </div>
                  <button className="text-[12px] font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-full hover:bg-blue-100 transition-colors">View All Directory</button>
                </div>

                {/* Sleek List Container */}
                <div className="bg-white border border-slate-100 rounded-[2rem] shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-3 space-y-1 flex-1">
                  
                  {/* Test Row Mapping */}
                  {[
                    { title: "Practice Test: ME2023.pdf", diff: "Medium", status: "Draft", time: "60m", pts: "10" },
                    { title: "Practice Test: ME2024.pdf", diff: "Medium", status: "Draft", time: "60m", pts: "50" },
                    { title: "Practice Test: ME2025.pdf", diff: "Medium", status: "Draft", time: "180m", pts: "20" },
                    { title: "Practice Test: CS2025.pdf", diff: "Hard", status: "Active", time: "120m", pts: "100" },
                    { title: "Mock Test: CE2026.pdf", diff: "Easy", status: "Draft", time: "30m", pts: "5" },
                    { title: "Aptitude Test: Gen-1.pdf", diff: "Medium", status: "Active", time: "45m", pts: "15" },
                    { title: "Core Subject: EE-Basics.pdf", diff: "Hard", status: "Draft", time: "90m", pts: "60" },
                    { title: "Final Mock: ALL-2025.pdf", diff: "Hard", status: "Draft", time: "180m", pts: "200" }
                  ].map((test, idx) => (
                    <div key={idx} className="group flex flex-col bg-transparent hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-[1.5rem] p-5 transition-all cursor-pointer overflow-hidden">
                      {/* Main Row Content */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-2.5 h-2.5 rounded-full ${test.status === 'Active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-slate-300'}`}></div>
                          <h4 className="font-[800] text-[15px] text-slate-800">{test.title}</h4>
                          <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${test.diff === 'Hard' ? 'text-rose-600 bg-rose-50' : test.diff === 'Medium' ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50'}`}>{test.diff}</span>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2 text-slate-500">
                            <Clock size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                            <span className="text-[12px] font-semibold">{test.time}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-500 w-16">
                            <Trophy size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                            <span className="text-[12px] font-semibold">{test.pts} pts</span>
                          </div>
                        </div>
                      </div>

                      {/* Expandable Actions (Hidden by default, expands on hover) */}
                      <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-300 ease-in-out">
                        <div className="overflow-hidden">
                          <div className="flex gap-3 pt-5 mt-5 border-t border-slate-200/60">
                            <button className="px-5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-[12px] hover:border-blue-500 hover:text-blue-600 transition-colors shadow-sm">Edit Test</button>
                            <button className="px-5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-[12px] hover:border-blue-500 hover:text-blue-600 transition-colors shadow-sm">Analytics</button>
                            <div className="flex-1"></div>
                            <button className="px-5 py-2 rounded-xl bg-rose-50 text-rose-600 font-bold text-[12px] hover:bg-rose-500 hover:text-white transition-colors shadow-sm">Delete</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Section: Bento Quick Actions (Col span 4) */}
              <div className="xl:col-span-4 space-y-6">

                {/* Asymmetrical Bento Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Huge Primary Action (Spans 2 cols) */}
                  <button className="col-span-2 relative overflow-hidden bg-gradient-to-b from-[#4a4a4a] via-[#2a2a2a] to-[#111111] border border-[#333333] rounded-[2rem] p-7 text-left shadow-[0_8px_30px_rgba(0,0,0,0.12)] group hover:scale-[1.02] transition-all">
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                    <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md text-white flex items-center justify-center mb-6 shadow-sm border border-white/10">
                      <Plus size={24} />
                    </div>
                    <h3 className="text-white font-[900] text-[24px] leading-tight mb-1">Create New<br/>Test Module</h3>
                    <p className="text-blue-100 text-[13px] font-medium">Use AI to generate tests instantly</p>
                  </button>

                  {/* Secondary Action 1 */}
                  <button className="bg-white border border-slate-100 rounded-[2rem] p-6 flex flex-col items-center justify-center gap-3 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center group-hover:bg-[#1D4ED8] group-hover:text-white transition-colors">
                      <Users size={20} />
                    </div>
                    <span className="font-bold text-[14px] text-slate-800">Students</span>
                  </button>

                  {/* Secondary Action 2 */}
                  <button className="bg-white border border-slate-100 rounded-[2rem] p-6 flex flex-col items-center justify-center gap-3 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center group-hover:bg-[#1D4ED8] group-hover:text-white transition-colors">
                      <BarChart2 size={20} />
                    </div>
                    <span className="font-bold text-[14px] text-slate-800">Analytics</span>
                  </button>
                  
                  {/* Secondary Action 3 (Spans 2 cols, thin bar) */}
                  <button className="col-span-2 bg-white border border-slate-100 rounded-[1.5rem] p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-all group px-7">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-[#1D4ED8] flex items-center justify-center group-hover:scale-110 transition-transform">
                        <UserCheck size={18} />
                      </div>
                      <span className="font-bold text-[14px] text-slate-800">Manage Teachers</span>
                    </div>
                    <ChevronRight size={18} className="text-slate-400 group-hover:text-[#1D4ED8] group-hover:translate-x-1 transition-all" />
                  </button>
                </div>

                {/* Student Activity Heatmap */}
                <div className="bg-white border border-slate-100 rounded-[2rem] shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-6">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
                      <h4 className="font-[900] text-[15px] text-slate-800">Student Activity</h4>
                    </div>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider">This Month</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5 px-2">
                    {[
                      0,1,0,2,3,1,0,
                      1,4,2,1,0,3,1,
                      0,1,3,4,4,2,0,
                      1,2,0,1,3,2,1
                    ].map((val, i) => {
                      const levels = [
                        'bg-slate-100', 
                        'bg-blue-200', 
                        'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.4)]', 
                        'bg-blue-600 shadow-[0_0_12px_rgba(37,99,235,0.4)]', 
                        'bg-[#1D4ED8] shadow-[0_0_16px_rgba(29,78,216,0.4)]'
                      ];
                      
                      const date = new Date();
                      date.setDate(date.getDate() - (27 - i));
                      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                      const studentsCount = val === 0 ? 0 : val * 24 + (i % 5);

                      return (
                        <div key={i} className="relative">
                          <div 
                            onClick={() => setActiveHeatmapIndex(activeHeatmapIndex === i ? null : i)}
                            className={`w-full aspect-square rounded-[4px] ${levels[val]} hover:scale-125 transition-transform cursor-pointer z-10 hover:z-20`}
                          ></div>
                          
                          {activeHeatmapIndex === i && (
                            <div className="absolute bottom-[120%] left-1/2 -translate-x-1/2 mb-1 w-max bg-slate-900 text-white text-[11px] rounded-xl px-3 py-2 shadow-xl z-[100] animate-in fade-in zoom-in duration-200">
                              <div className="font-bold text-blue-300 mb-0.5">{dateStr}</div>
                              <div><span className="font-[900] text-white text-[13px]">{studentsCount}</span> active</div>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-900"></div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* Active Tab: Applications Manager */}
        {activeTab === 'applications' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-[32px] font-[900] text-slate-900 tracking-tight leading-none mb-2">Job Applicants</h2>
                <p className="text-slate-500 text-sm font-medium">Review and shortlist applicants from the Careers portal.</p>
              </div>
              
              {/* Reset seed button */}
              <button 
                onClick={() => {
                  localStorage.removeItem('career_applications');
                  localStorage.setItem('career_applications', JSON.stringify(defaultApplications));
                  setApplications(defaultApplications);
                }}
                className="w-fit self-start px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
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

              {/* Sub-tab Navigation */}
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

        {/* Active Tab: Course Configurator */}
        {activeTab === 'courses' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-[32px] font-[900] text-slate-900 tracking-tight leading-none mb-2">Course Configuration</h2>
                <p className="text-slate-500 text-sm font-medium">Update pricing structures, active states, and batches dynamically.</p>
              </div>

              {/* Reset seed button */}
              <button 
                onClick={() => {
                  localStorage.removeItem('gate_courses_config');
                  localStorage.setItem('gate_courses_config', JSON.stringify(defaultCourseOverrides));
                  setCourses(defaultCourseOverrides);
                }}
                className="w-fit self-start px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw size={12} />
                <span>Reset Course Overrides</span>
              </button>
            </div>

            {/* Dynamic Grid of key disciplines */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { code: 'CSE', name: 'Computer Science' },
                { code: 'ECE', name: 'Electronics Engineering' },
                { code: 'ME', name: 'Mechanical Engineering' },
                { code: 'CE', name: 'Civil Engineering' },
                { code: 'DS', name: 'Data Science & AI' },
                { code: 'IN', name: 'Instrumentation' }
              ].map((c) => {
                const conf = courses.find(o => o.code === c.code) || { code: c.code, fee: '₹30,000', batch: 'TBD', status: 'Active' };
                return (
                  <div key={c.code} className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm space-y-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">{c.code}</span>
                        <h4 className="font-bold text-slate-900 text-base mt-2">{c.name}</h4>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      {/* Price config */}
                      <div className="flex items-center gap-3">
                        <Tag size={16} className="text-slate-400 flex-shrink-0" />
                        <div className="flex-1 flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-400 uppercase w-20">Course Fee:</span>
                          <input
                            type="text"
                            value={conf.fee}
                            onChange={(e) => updateCourseDetail(c.code, 'fee', e.target.value)}
                            className="flex-1 px-2.5 py-1 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#1d4ed8] text-slate-800 font-bold"
                          />
                        </div>
                      </div>

                      {/* Batch config */}
                      <div className="flex items-center gap-3">
                        <Clock size={16} className="text-slate-400 flex-shrink-0" />
                        <div className="flex-1 flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-400 uppercase w-20">Batch Info:</span>
                          <input
                            type="text"
                            value={conf.batch}
                            onChange={(e) => updateCourseDetail(c.code, 'batch', e.target.value)}
                            className="flex-1 px-2.5 py-1 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#1d4ed8] text-slate-850 font-semibold"
                          />
                        </div>
                      </div>

                      {/* Status config */}
                      <div className="flex items-center gap-3">
                        <BookOpen size={16} className="text-slate-400 flex-shrink-0" />
                        <div className="flex-1 flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-400 uppercase w-20">Course Status:</span>
                          <select
                            value={conf.status}
                            onChange={(e) => updateCourseDetail(c.code, 'status', e.target.value)}
                            className="flex-1 px-2.5 py-1 border border-slate-200 bg-white rounded-lg text-xs focus:outline-none focus:border-[#1d4ed8] text-slate-850 font-semibold"
                          >
                            <option value="Active">Active</option>
                            <option value="Upcoming">Upcoming</option>
                            <option value="Suspended">Suspended</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
                    <span className="text-xs font-bold text-slate-800 truncate max-w-[250px]">Resume_{selectedApp.fullName.replace(/\s+/g, '_')}.pdf</span>
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

    </div>
  );
}
