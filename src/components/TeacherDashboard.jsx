import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, LogOut, Settings, Users, Video, Calendar } from 'lucide-react';
import logoImg from '../assets/msgate_logo.png';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [teacherName, setTeacherName] = useState('Teacher');

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
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center p-1 border border-blue-100">
            <img src={logoImg} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h2 className="font-[900] text-blue-700 text-lg leading-tight">MS Academy</h2>
            <p className="text-xs font-bold text-slate-400">Faculty Portal</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-700 rounded-xl font-bold transition-all">
            <BookOpen size={18} />
            <span>My Courses</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:text-slate-700 rounded-xl font-bold transition-all">
            <Video size={18} />
            <span>Live Classes</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:text-slate-700 rounded-xl font-bold transition-all">
            <Users size={18} />
            <span>Students</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:text-slate-700 rounded-xl font-bold transition-all">
            <Calendar size={18} />
            <span>Schedule</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl font-bold transition-all"
          >
            <LogOut size={18} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-[900] text-slate-900 tracking-tight">Welcome back, {teacherName}!</h1>
          <p className="text-slate-500 font-medium mt-1">Manage your courses, students, and live sessions.</p>
        </header>

        <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-sm text-center">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <BookOpen size={32} />
          </div>
          <h2 className="text-2xl font-[900] text-slate-900 mb-2">Your Workspace is Ready</h2>
          <p className="text-slate-500 max-w-md mx-auto">
            This is your private faculty dashboard. The administration will assign courses and schedules to your profile shortly.
          </p>
        </div>
      </main>
    </div>
  );
}
