import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, LogOut } from 'lucide-react';
import logoImg from '../assets/msgate_logo.png';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import QuestionBank from './admin/QuestionBank';

export default function TypistDashboard() {
  const navigate = useNavigate();
  const [typistName, setTypistName] = useState('Typist');
  const pairRole = localStorage.getItem('pair_role') || 'typist';
  const [activeTab, setActiveTab] = useState(pairRole === 'reviewer' ? 'review' : 'all');

  useEffect(() => {
    const role = localStorage.getItem('auth_role');
    const name = localStorage.getItem('auth_name');
    const email = localStorage.getItem('auth_email');
    
    const checkAccess = async () => {
      // Check if they are still an invited typist in the database
      let isStillTypist = false;
      try {
        if (email) {
          let q = query(collection(db, 'invited_typists'), where('typistEmail', '==', email));
          let querySnapshot = await getDocs(q);
          if (querySnapshot.empty) {
            q = query(collection(db, 'invited_typists'), where('reviewerEmail', '==', email));
            querySnapshot = await getDocs(q);
          }
          isStillTypist = !querySnapshot.empty;
        }
      } catch (e) {
        console.error("Failed to verify typist role from Firestore", e);
      }
      
      if (role !== 'typist' || !isStillTypist) {
        if (role === 'typist') {
          // They were a typist, but their access was revoked by the Admin. Sign them out completely.
          localStorage.removeItem('auth_role');
          localStorage.removeItem('auth_email');
          localStorage.removeItem('auth_name');
          localStorage.removeItem('pair_id');
          localStorage.removeItem('pair_role');
          window.dispatchEvent(new Event('storage'));
        }
        navigate('/login');
      } else {
        setTypistName(name || 'Typist');
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
          <div className="w-10 h-10 bg-pink-50 rounded-xl flex items-center justify-center p-1 border border-pink-100">
            <img src={logoImg} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h2 className="font-[900] text-pink-700 text-lg leading-tight">MS Academy</h2>
            <p className="text-xs font-bold text-slate-400">Typist Portal</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {pairRole === 'typist' && (
            <>
              <button 
                onClick={() => setActiveTab('all')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'all' ? 'bg-pink-50 text-pink-700' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <BookOpen size={18} />
                <span>Question Bank</span>
              </button>
              
              <button 
                onClick={() => setActiveTab('draft')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'draft' ? 'bg-slate-100 text-slate-700' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <BookOpen size={18} />
                <span>Drafts</span>
              </button>
            </>
          )}

          {pairRole === 'reviewer' && (
            <button 
              onClick={() => setActiveTab('review')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'review' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <BookOpen size={18} />
              <span>Review</span>
            </button>
          )}
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
          <h1 className="text-3xl font-[900] text-slate-900 tracking-tight">Welcome back, {typistName}!</h1>
          <p className="text-slate-500 font-medium mt-1">Manage and type questions for the question bank.</p>
        </header>

        <div className="h-[calc(100vh-140px)]">
          <QuestionBank externalFilter={activeTab === 'review' ? 'In Review' : activeTab === 'draft' ? 'Draft' : 'Approved'} />
        </div>
      </main>
    </div>
  );
}
