import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, LogOut, Settings, Users, Video, Calendar, ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import logoImg from '../assets/msgate_logo.png';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import LiveClasses from './teacher/LiveClasses';
import TeacherQuestionBank from './teacher/TeacherQuestionBank';
import TestsManager from './TestsManager';
import TeacherStudents from './teacher/TeacherStudents';
import Analytics from './admin/Analytics';
import { TrendingUp, ShieldAlert } from 'lucide-react';
import ReportedQuestions from './admin/ReportedQuestions';
import QuestionBank from './admin/QuestionBank';

const sidebarNavItems = [
  { key: 'courses', label: 'My Courses', icon: BookOpen },
  { key: 'live', label: 'Live Classes', icon: Video },
  { key: 'students', label: 'Students', icon: Users },
  { key: 'questions', label: 'Question Bank', icon: BookOpen },
  { key: 'tests', label: 'Test Modules', icon: Calendar },
  { key: 'analytics', label: 'Analytics', icon: TrendingUp },
  { key: 'reported', label: "Reported Q's", icon: ShieldAlert },
];

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [teacherName, setTeacherName] = useState('Teacher');
  const [teacherDepartment, setTeacherDepartment] = useState('');
  const [activeTab, setActiveTab] = useState('courses');
  const [editQuestionId, setEditQuestionId] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [joinedStudents, setJoinedStudents] = useState([]);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    const role = sessionStorage.getItem('auth_role');
    const name = sessionStorage.getItem('auth_name');
    const email = sessionStorage.getItem('auth_email');
    
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
          sessionStorage.removeItem('auth_role');
          sessionStorage.removeItem('auth_email');
          sessionStorage.removeItem('auth_name');
          window.dispatchEvent(new Event('storage'));
        }
        navigate('/login');
      } else {
        setTeacherName(name || 'Teacher');
        // Fetch all students for analytics
        try {
          const studentsSnapshot = await getDocs(collection(db, 'joined_students'));
          setJoinedStudents(studentsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        } catch (error) {
          console.error("Error fetching students:", error);
        }
      }
    };
    checkAccess();
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('auth_role');
    sessionStorage.removeItem('auth_email');
    sessionStorage.removeItem('auth_name');
    window.dispatchEvent(new Event('storage'));
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-white border-b border-slate-200 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center p-1 border border-blue-100 flex-shrink-0">
            <img src={logoImg} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <h2 className="font-[900] text-blue-700 text-sm leading-tight truncate">MS Academy</h2>
            <p className="text-[11px] font-bold text-slate-400 truncate">Faculty Portal</p>
          </div>
        </div>
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
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center p-1 border border-blue-100 flex-shrink-0">
                  <img src={logoImg} alt="Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h2 className="font-[900] text-blue-700 text-lg leading-tight">MS Academy</h2>
                  <p className="text-xs font-bold text-slate-400">Faculty Portal</p>
                </div>
              </div>
              <button onClick={() => setIsMobileNavOpen(false)} aria-label="Close menu" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
              {sidebarNavItems.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => { setActiveTab(key); setIsMobileNavOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === key ? (key === 'reported' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-700') : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </button>
              ))}
              <button
                onClick={() => { handleLogout(); setIsMobileNavOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl font-bold transition-all mt-4"
              >
                <LogOut size={18} />
                <span>Log Out</span>
              </button>
            </nav>
          </div>
        </div>
      )}

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
          {sidebarNavItems.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl font-bold transition-all ${activeTab === key ? (key === 'reported' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-700') : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
            >
              <Icon size={18} />
              {!isCollapsed && <span>{label}</span>}
            </button>
          ))}
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
      <main className="flex-1 min-w-0 p-4 pt-20 sm:p-6 sm:pt-20 md:p-8 overflow-y-auto">
        <header className="mb-8">
          <h1 className="text-2xl md:text-3xl font-[900] text-slate-900 tracking-tight">Welcome back, {teacherName}!</h1>
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
        {activeTab === 'students' && <TeacherStudents department={teacherDepartment} />}
        {activeTab === 'questions' && (
          <div className="h-[800px]">
             <QuestionBank lockedDepartment={teacherDepartment} initialEditQuestionId={editQuestionId} onClearEdit={() => setEditQuestionId(null)} />
          </div>
        )}
        {activeTab === 'tests' && <TestsManager department={teacherDepartment} isTeacher={true} />}
        {activeTab === 'analytics' && <Analytics joinedStudents={joinedStudents} department={teacherDepartment} />}
        {activeTab === 'reported' && (
          <ReportedQuestions 
            role="teacher" 
            department={teacherDepartment}
            onViewQuestion={(qId) => {
              setEditQuestionId(qId);
              setActiveTab('questions');
            }}
          />
        )}
      </main>
    </div>
  );
}
