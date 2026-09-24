import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, FileEdit, ClipboardCheck, LogOut, ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import logoImg from '../assets/msgate_logo.png';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import QuestionBank from './admin/QuestionBank';

export default function TypistDashboard() {
  const navigate = useNavigate();
  const [typistName, setTypistName] = useState('Typist');
  const pairRole = localStorage.getItem('pair_role') || 'typist';
  const [activeTab, setActiveTab] = useState(pairRole === 'reviewer' ? 'review' : 'all');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    const role = sessionStorage.getItem('auth_role');
    const name = sessionStorage.getItem('auth_name');
    const email = sessionStorage.getItem('auth_email');
    
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

          if (!isStillTypist) {
            const aiSnap = await getDoc(doc(db, 'site_settings', 'ai_review'));
            isStillTypist = aiSnap.exists() && (aiSnap.data().reviewerEmail || '').toLowerCase() === email.toLowerCase();
          }
        }
      } catch (e) {
        console.error("Failed to verify typist role from Firestore", e);
      }
      
      if (role !== 'typist' || !isStillTypist) {
        if (role === 'typist') {
          // They were a typist, but their access was revoked by the Admin. Sign them out completely.
          sessionStorage.removeItem('auth_role');
          sessionStorage.removeItem('auth_email');
          sessionStorage.removeItem('auth_name');
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
    sessionStorage.removeItem('auth_role');
    sessionStorage.removeItem('auth_email');
    sessionStorage.removeItem('auth_name');
    window.dispatchEvent(new Event('storage'));
    navigate('/');
  };

  const renderNavButtons = (closeOnClick) => (
    <>
      {pairRole === 'typist' && (
        <>
          <button
            onClick={() => { setActiveTab('all'); if (closeOnClick) setIsMobileNavOpen(false); }}
            className={`w-full flex items-center ${!closeOnClick && isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl font-bold transition-all ${activeTab === 'all' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <BookOpen size={18} />
            {(closeOnClick || !isCollapsed) && <span>Question Bank</span>}
          </button>

          <button
            onClick={() => { setActiveTab('draft'); if (closeOnClick) setIsMobileNavOpen(false); }}
            className={`w-full flex items-center ${!closeOnClick && isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl font-bold transition-all ${activeTab === 'draft' ? 'bg-slate-100 text-slate-700' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <FileEdit size={18} />
            {(closeOnClick || !isCollapsed) && <span>Drafts</span>}
          </button>
        </>
      )}

      {pairRole === 'reviewer' && (
        <button
          onClick={() => { setActiveTab('review'); if (closeOnClick) setIsMobileNavOpen(false); }}
          className={`w-full flex items-center ${!closeOnClick && isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl font-bold transition-all ${activeTab === 'review' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <ClipboardCheck size={18} />
          {(closeOnClick || !isCollapsed) && <span>Pending Review</span>}
        </button>
      )}
    </>
  );

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
            <p className="text-[11px] font-bold text-slate-400 truncate">{pairRole === 'reviewer' ? 'Reviewer Portal' : 'Typist Portal'}</p>
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
                  <p className="text-xs font-bold text-slate-400">{pairRole === 'reviewer' ? 'Reviewer Portal' : 'Typist Portal'}</p>
                </div>
              </div>
              <button onClick={() => setIsMobileNavOpen(false)} aria-label="Close menu" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
              {renderNavButtons(true)}
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
              <p className="text-xs font-bold text-slate-400 whitespace-nowrap">{pairRole === 'reviewer' ? 'Reviewer Portal' : 'Typist Portal'}</p>
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {renderNavButtons(false)}
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
          <h1 className="text-2xl md:text-3xl font-[900] text-slate-900 tracking-tight">Welcome back, {typistName}!</h1>
          <p className="text-slate-500 font-medium mt-1">Manage and type questions for the question bank.</p>
        </header>

        <div>
          <QuestionBank externalFilter={activeTab === 'review' ? 'In Review' : activeTab === 'draft' ? 'Draft' : 'Approved'} />
        </div>
      </main>
    </div>
  );
}
