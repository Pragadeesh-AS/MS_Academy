import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, FileText, LayoutDashboard, Settings, Mail, LogOut, 
  Search, Filter, Check, X, Eye, BookOpen, Clock, Tag, RefreshCw 
} from 'lucide-react';

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

  // Core datasets states
  const [applications, setApplications] = useState([]);
  const [queries, setQueries] = useState([]);
  const [courses, setCourses] = useState([]);

  // Search & Filter states
  const [appSearch, setAppSearch] = useState('');
  const [appFilter, setAppFilter] = useState('All');
  const [queryFilter, setQueryFilter] = useState('All');

  // Modal detail states
  const [selectedApp, setSelectedApp] = useState(null);

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
    <div className="min-h-[calc(100vh-100px)] w-full bg-slate-50/50 flex flex-col md:flex-row relative">
      
      {/* Side Navigation Panel */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col justify-between p-6 md:min-h-[calc(100vh-100px)] flex-shrink-0 relative z-20">
        <div className="space-y-8">
          {/* Admin title */}
          <div>
            <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest block mb-1">MS Academy</span>
            <h3 className="text-xl font-black text-white tracking-tight">Admin Console</h3>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-[14px] transition-all duration-300 ${activeTab === 'overview' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
            >
              <LayoutDashboard size={18} />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('applications')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-[14px] transition-all duration-300 ${activeTab === 'applications' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
            >
              <FileText size={18} />
              <span>Applications</span>
              {applications.filter(a => a.status === 'Pending').length > 0 && (
                <span className="ml-auto w-5 h-5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                  {applications.filter(a => a.status === 'Pending').length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('queries')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-[14px] transition-all duration-300 ${activeTab === 'queries' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
            >
              <Mail size={18} />
              <span>Inquiries</span>
              {queries.filter(q => q.status === 'Pending').length > 0 && (
                <span className="ml-auto w-5 h-5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                  {queries.filter(q => q.status === 'Pending').length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('courses')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-[14px] transition-all duration-300 ${activeTab === 'courses' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
            >
              <Settings size={18} />
              <span>Course Setup</span>
            </button>
          </nav>
        </div>

        {/* Profile Card & Logout */}
        <div className="pt-6 border-t border-slate-800/60 mt-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/25 border border-blue-500/30 text-blue-400 font-bold text-[15px] flex items-center justify-center">
              {adminName[0].toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm text-white truncate">{adminName}</span>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Super Administrator</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-[13.5px] text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Dashboard Container */}
      <main className="flex-1 p-6 md:p-10 max-w-[1400px] mx-auto w-full space-y-8 overflow-hidden z-10">
        
        {/* Active Tab: Overview Dashboard */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-[32px] font-[900] text-slate-900 tracking-tight leading-none mb-2">Metrics Overview</h2>
              <p className="text-slate-500 text-sm font-medium">Real-time statistics and registration tracking details.</p>
            </div>

            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Total Job Applications */}
              <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow">
                <div className="space-y-1">
                  <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest block">Job Applicants</span>
                  <span className="text-[36px] font-[900] text-slate-900 leading-none">{applications.length}</span>
                  <span className="text-xs text-blue-600 font-bold block pt-1">{applications.filter(a => a.status === 'Pending').length} Pending</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText size={22} />
                </div>
              </div>

              {/* Total Queries */}
              <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow">
                <div className="space-y-1">
                  <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest block">Student Queries</span>
                  <span className="text-[36px] font-[900] text-slate-900 leading-none">{queries.length}</span>
                  <span className="text-xs text-amber-600 font-bold block pt-1">{queries.filter(q => q.status === 'Pending').length} Pending</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Mail size={22} />
                </div>
              </div>

              {/* Total GATE Disciplines */}
              <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow">
                <div className="space-y-1">
                  <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest block">GATE Courses</span>
                  <span className="text-[36px] font-[900] text-slate-900 leading-none">18</span>
                  <span className="text-xs text-emerald-600 font-bold block pt-1">All fully video-linked</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BookOpen size={22} />
                </div>
              </div>

              {/* Total Online Registered Students (Mock) */}
              <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow">
                <div className="space-y-1">
                  <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest block">Portal Users</span>
                  <span className="text-[36px] font-[900] text-slate-900 leading-none">124</span>
                  <span className="text-xs text-purple-600 font-bold block pt-1">+18 new this week</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users size={22} />
                </div>
              </div>

            </div>

            {/* Visual Charts / Graphic Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Graphic 1: Registration Trend Line */}
              <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm space-y-6 lg:col-span-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-[18px] font-[800] text-slate-950">Student Registration Trend</h4>
                  <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full">Last 6 Months</span>
                </div>
                {/* SVG Visualizer */}
                <div className="relative h-64 w-full flex items-end">
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                    {/* Background Gradients */}
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    
                    {/* Area path */}
                    <path 
                      d="M0 200 L50 150 L150 160 L250 90 L350 110 L450 40 L500 30 L500 200 Z" 
                      fill="url(#chartGradient)"
                    />
                    
                    {/* Trend Line */}
                    <path 
                      d="M0 200 L50 150 L150 160 L250 90 L350 110 L450 40 L500 30" 
                      fill="none" 
                      stroke="#1d4ed8" 
                      strokeWidth="3.5" 
                      strokeLinecap="round"
                    />

                    {/* Nodes */}
                    <circle cx="50" cy="150" r="5" fill="#1d4ed8" stroke="white" strokeWidth="2" />
                    <circle cx="150" cy="160" r="5" fill="#1d4ed8" stroke="white" strokeWidth="2" />
                    <circle cx="250" cy="90" r="5" fill="#1d4ed8" stroke="white" strokeWidth="2" />
                    <circle cx="350" cy="110" r="5" fill="#1d4ed8" stroke="white" strokeWidth="2" />
                    <circle cx="450" cy="40" r="5" fill="#1d4ed8" stroke="white" strokeWidth="2" />
                    <circle cx="500" cy="30" r="5" fill="#1d4ed8" stroke="white" strokeWidth="2" />
                  </svg>
                  {/* Custom Axis Labels */}
                  <div className="absolute inset-x-0 bottom-0 flex justify-between px-2 pt-2 border-t border-slate-100 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                    <span>Feb</span>
                    <span>Mar</span>
                    <span>Apr</span>
                    <span>May</span>
                    <span>Jun</span>
                    <span>Jul</span>
                  </div>
                </div>
              </div>

              {/* Graphic 2: Branch Breakdown Progress bars */}
              <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm space-y-6">
                <h4 className="text-[18px] font-[800] text-slate-950">Branch Distribution</h4>
                <div className="space-y-4">
                  
                  {/* Computer Science */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>Computer Science</span>
                      <span>42%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-blue-600" style={{ width: '42%' }} />
                    </div>
                  </div>

                  {/* ECE */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>Electronics & EEE</span>
                      <span>28%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-purple-500" style={{ width: '28%' }} />
                    </div>
                  </div>

                  {/* Mechanical */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>Mechanical</span>
                      <span>15%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-orange-500" style={{ width: '15%' }} />
                    </div>
                  </div>

                  {/* Others */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>Civil & Other Specializations</span>
                      <span>15%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: '15%' }} />
                    </div>
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

        {/* Active Tab: Contact Queries */}
        {activeTab === 'queries' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-[32px] font-[900] text-slate-900 tracking-tight leading-none mb-2">Student Inquiries</h2>
                <p className="text-slate-500 text-sm font-medium">Manage message queries submitted through the Contact info portal.</p>
              </div>

              {/* Reset seed button */}
              <button 
                onClick={() => {
                  localStorage.removeItem('contact_queries');
                  localStorage.setItem('contact_queries', JSON.stringify(defaultQueries));
                  setQueries(defaultQueries);
                }}
                className="w-fit self-start px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw size={12} />
                <span>Reset Seed Data</span>
              </button>
            </div>

            {/* Filter Toggles */}
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

            {/* Queries Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredQueries.length === 0 ? (
                <div className="bg-white border border-slate-100 p-10 text-center text-slate-400 font-semibold rounded-3xl md:col-span-2">
                  No inquiries found.
                </div>
              ) : (
                filteredQueries.map((q) => (
                  <div key={q.id} className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
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
                      
                      <p className="text-slate-600 text-[13.5px] leading-relaxed italic bg-slate-50/50 p-4 border border-slate-100/50 rounded-2xl">
                        "{q.message}"
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-50 text-[11px] font-bold text-slate-400">
                      <span>Received: {q.date}</span>
                      <button
                        onClick={() => toggleQueryStatus(q.id)}
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

    </div>
  );
}
