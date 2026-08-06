import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, LogOut, Settings, Users, Video, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import logoImg from '../assets/msgate_logo.png';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import LiveClasses from './teacher/LiveClasses';
import TeacherQuestionBank from './teacher/TeacherQuestionBank';
import TestsManager from './TestsManager';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [teacherName, setTeacherName] = useState('Teacher');
  const [teacherDepartment, setTeacherDepartment] = useState('');
  const [activeTab, setActiveTab] = useState('courses');
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem('auth_role');
    const name = localStorage.getItem('auth_name');
    const email = localStorage.getItem('auth_email');
    
    const checkAccess = async () => {
      // Check if they are still an invited teacher in the database
      let isStillTeacher = false;
      try {
        if (email) {
          const q = query(collection(db, 'invited_teachers'), where('email', '==', email));
          const querySnapshot = await getDocs(q);
          isStillTeacher = !querySnapshot.empty;
          if (isStillTeacher) {
            const data = querySnapshot.docs[0].data();
            if (data.department) {
              setTeacherDepartment(data.department);
            }
          }
        }
      } catch (e) {
        console.error("Failed to verify teacher role from Firestore", e);
      }
      
      if (role !== 'teacher' || !isStillTeacher) {
        if (role === 'teacher') {
          // They were a teacher, but their access was revoked by the Admin. Sign them out completely.
          localStorage.removeItem('auth_role');
          localStorage.removeItem('auth_email');
          localStorage.removeItem('auth_name');
          window.dispatchEvent(new Event('storage'));
        }
        navigate('/login');
      } else {
        setTeacherName(name || 'Teacher');
      }
    };
    checkAccess();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('auth_role');
    localStorage.removeItem('auth_email');
    localStorage.removeItem('auth_name');
    window.dispatchEvent(new Event('storage'));
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={`transition-all duration-300 flex-shrink-0 relative z-20 ${isCollapsed ? 'w-[88px]' : 'w-64'} bg-white border-r border-slate-200 flex flex-col hidden md:flex`}>
        {/* Collapse Button */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-6 bg-white border border-slate-200 rounded-full p-1.5 text-slate-400 hover:text-[#1D4ED8] hover:border-[#1D4ED8] shadow-sm z-50 transition-colors"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3'}`}>
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center p-1 border border-blue-100 flex-shrink-0">
            <img src={logoImg} alt="Logo" className="w-full h-full object-contain" />
          </div>
          {!isCollapsed && (
            <div>
              <h2 className="font-[900] text-blue-700 text-lg leading-tight whitespace-nowrap">MS Academy</h2>
              <p className="text-xs font-bold text-slate-400 whitespace-nowrap">Faculty Portal</p>
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          <button 
            onClick={() => setActiveTab('courses')}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl font-bold transition-all ${activeTab === 'courses' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
          >
            <BookOpen size={18} />
            {!isCollapsed && <span>My Courses</span>}
          </button>
          <button 
            onClick={() => setActiveTab('live')}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl font-bold transition-all ${activeTab === 'live' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
          >
            <Video size={18} />
            {!isCollapsed && <span>Live Classes</span>}
          </button>
          <button 
            onClick={() => setActiveTab('students')}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl font-bold transition-all ${activeTab === 'students' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
          >
            <Users size={18} />
            {!isCollapsed && <span>Students</span>}
          </button>
          <button 
            onClick={() => setActiveTab('questions')}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl font-bold transition-all ${activeTab === 'questions' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
          >
            <BookOpen size={18} />
            {!isCollapsed && <span>Question Bank</span>}
          </button>
          <button 
            onClick={() => setActiveTab('tests')}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl font-bold transition-all ${activeTab === 'tests' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
          >
            <Calendar size={18} />
            {!isCollapsed && <span>Test Modules</span>}
          </button>
        </nav>

        <div className={`p-4 border-t border-slate-100 ${isCollapsed ? 'px-2' : ''}`}>
          <button 
            onClick={handleLogout}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 text-red-500 hover:bg-red-50 rounded-xl font-bold transition-all`}
          >
            <LogOut size={18} />
            {!isCollapsed && <span>Log Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-[900] text-slate-900 tracking-tight">Welcome back, {teacherName}!</h1>
          <p className="text-slate-500 font-medium mt-1">Manage your courses, students, and live sessions.</p>
        </header>

        {activeTab === 'courses' && (
          <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-sm text-center mt-6">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen size={32} />
            </div>
            <h2 className="text-2xl font-[900] text-slate-900 mb-2">Your Workspace is Ready</h2>
            <p className="text-slate-500 max-w-md mx-auto">
              This is your private faculty dashboard. The administration will assign courses and schedules to your profile shortly.
            </p>
          </div>
        )}

        {activeTab === 'live' && <LiveClasses department={teacherDepartment} />}
        {activeTab === 'questions' && <TeacherQuestionBank department={teacherDepartment} />}
        {activeTab === 'tests' && <TestsManager department={teacherDepartment} isTeacher={true} />}
      </main>
    </div>
  );
}
