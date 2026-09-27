import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, FileEdit, ClipboardCheck, Sparkles, LogOut, ChevronLeft, ChevronRight, Menu, X, CheckCircle2, Clock } from 'lucide-react';
import logoImg from '../assets/msgate_logo.png';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import QuestionBank from './admin/QuestionBank';
import AIGenerator from './admin/AIGenerator';

export default function TypistDashboard() {
  const navigate = useNavigate();
  const [typistName, setTypistName] = useState('Typist');
  const pairRole = localStorage.getItem('pair_role') || 'typist';
  const [activeTab, setActiveTab] = useState(pairRole === 'reviewer' ? 'review' : 'all');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [pair, setPair] = useState(null);
  const [reviewerPairs, setReviewerPairs] = useState([]); // every typist assigned to this reviewer, when myRole === 'reviewer'
  const [myRole, setMyRole] = useState(null);
  const [isAccepting, setIsAccepting] = useState(false);

  // Older pairs only have `status`; treat a legacy Accepted pair as accepted by both.
  const hasAccepted = (p, who) => (p ? (p[`${who}Accepted`] ?? p.status === 'Accepted') : false);

  const handleAcceptInvite = async () => {
    if (!myRole) return;
    setIsAccepting(true);
    try {
      if (myRole === 'typist') {
        if (!pair) return;
        const pairRef = doc(db, 'invited_typists', pair.id);
        const latest = (await getDoc(pairRef)).data() || pair;
        const updates = {
          typistAccepted: true,
          typistAcceptedAt: new Date().toISOString(),
          status: hasAccepted(latest, 'reviewer') ? 'Accepted' : 'Pending'
        };
        await updateDoc(pairRef, updates);
        setPair({ ...latest, ...updates, id: pair.id });
      } else {
        // A reviewer accepts once, for every typist currently assigned to them - not once per typist.
        const pending = reviewerPairs.filter(p => !hasAccepted(p, 'reviewer'));
        const acceptedAt = new Date().toISOString();
        await Promise.all(pending.map(async (p) => {
          const pairRef = doc(db, 'invited_typists', p.id);
          const latest = (await getDoc(pairRef)).data() || p;
          const updates = {
            reviewerAccepted: true,
            reviewerAcceptedAt: acceptedAt,
            status: hasAccepted(latest, 'typist') ? 'Accepted' : 'Pending'
          };
          await updateDoc(pairRef, updates);
          return { ...latest, ...updates, id: p.id };
        }));
        setReviewerPairs(prev => prev.map(p => pending.some(x => x.id === p.id)
          ? { ...p, reviewerAccepted: true, reviewerAcceptedAt: acceptedAt, status: hasAccepted(p, 'typist') ? 'Accepted' : 'Pending' }
          : p));
      }
    } catch (e) {
      console.error('Failed to accept invitation', e);
      alert('Failed to accept the invitation. Please try again.');
    }
    setIsAccepting(false);
  };

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
          let foundRole = 'typist';
          if (querySnapshot.empty) {
            q = query(collection(db, 'invited_typists'), where('reviewerEmail', '==', email));
            querySnapshot = await getDocs(q);
            foundRole = 'reviewer';
          }
          isStillTypist = !querySnapshot.empty;
          if (isStillTypist) {
            setMyRole(foundRole);
            if (foundRole === 'reviewer') {
              setReviewerPairs(querySnapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            } else {
              setPair({ id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() });
            }
          }

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
          navigate('/login');
        } else if (!role) {
          navigate('/login');
        } else {
          navigate('/403');
        }
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
    localStorage.removeItem('pair_id');
    localStorage.removeItem('pair_role');
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

          <button
            onClick={() => { setActiveTab('ai'); if (closeOnClick) setIsMobileNavOpen(false); }}
            className={`w-full flex items-center ${!closeOnClick && isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl font-bold transition-all ${activeTab === 'ai' ? 'bg-purple-50 text-purple-700' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Sparkles size={18} />
            {(closeOnClick || !isCollapsed) && <span>AI Generator</span>}
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
    <div className="h-screen overflow-hidden bg-slate-50 flex">
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
              <div className="flex items-center gap-3 px-4 py-3 mt-4 border-t border-slate-100 pt-4">
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-black text-[14px] flex items-center justify-center flex-shrink-0">
                  {(typistName || 'T').trim().charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0 overflow-hidden">
                  <span className="font-bold text-[13px] text-slate-800 truncate">{typistName}</span>
                  <span className="text-[11px] font-semibold text-slate-400 truncate">{sessionStorage.getItem('auth_email') || ''}</span>
                </div>
              </div>
              <button
                onClick={() => { handleLogout(); setIsMobileNavOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl font-bold transition-all"
              >
                <LogOut size={18} />
                <span>Log Out</span>
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`transition-all duration-300 flex-shrink-0 relative h-full z-20 ${isCollapsed ? 'w-[88px]' : 'w-64'} bg-white border-r border-slate-200 flex flex-col hidden md:flex`}>
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

        <nav className="flex-1 min-h-0 px-4 py-4 space-y-2 overflow-y-auto">
          {renderNavButtons(false)}
        </nav>

        <div className={`p-4 border-t border-slate-100 space-y-3 ${isCollapsed ? 'px-2' : ''}`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-black text-[14px] flex items-center justify-center flex-shrink-0">
              {(typistName || 'T').trim().charAt(0).toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0 overflow-hidden">
                <span className="font-bold text-[13px] text-slate-800 truncate">{typistName}</span>
                <span className="text-[11px] font-semibold text-slate-400 truncate">{sessionStorage.getItem('auth_email') || ''}</span>
              </div>
            )}
          </div>
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

        {myRole === 'typist' && pair && (
          hasAccepted(pair, 'typist') ? (
            <div className="mb-6 p-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 flex items-start gap-3">
              <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={20} />
              <div className="text-sm">
                <p className="font-bold text-emerald-800">
                  {pair.status === 'Accepted'
                    ? 'Your pairing is active.'
                    : 'You have accepted. Waiting for your reviewer to accept.'}
                </p>
                <p className="text-emerald-700/80 font-medium mt-0.5">
                  Paired with reviewer {pair.reviewerName || ''} ({pair.reviewerEmail})
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-6 p-5 rounded-2xl border border-amber-200 bg-amber-50/70 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              <div className="flex items-start gap-3">
                <Clock className="text-amber-600 shrink-0 mt-0.5" size={20} />
                <div className="text-sm">
                  <p className="font-bold text-amber-900">You have been invited to a Data Entry pair.</p>
                  <p className="text-amber-800/80 font-medium mt-0.5">
                    Your reviewer will be {pair.reviewerName || ''} ({pair.reviewerEmail}). The pair becomes active once both of you accept.
                  </p>
                </div>
              </div>
              <button
                onClick={handleAcceptInvite}
                disabled={isAccepting}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-xl transition-all shadow-md shrink-0"
              >
                {isAccepting ? 'Accepting...' : 'Accept Invitation'}
              </button>
            </div>
          )
        )}

        {myRole === 'reviewer' && reviewerPairs.length > 0 && (() => {
          const pendingTypists = reviewerPairs.filter(p => !hasAccepted(p, 'reviewer'));
          if (pendingTypists.length === 0) {
            return (
              <div className="mb-6 p-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 flex items-start gap-3">
                <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={20} />
                <div className="text-sm">
                  <p className="font-bold text-emerald-800">You're reviewing for {reviewerPairs.length} {reviewerPairs.length === 1 ? 'typist' : 'typists'}.</p>
                  <p className="text-emerald-700/80 font-medium mt-0.5">
                    {reviewerPairs.map(p => p.typistName).filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
            );
          }
          return (
            <div className="mb-6 p-5 rounded-2xl border border-amber-200 bg-amber-50/70 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              <div className="flex items-start gap-3">
                <Clock className="text-amber-600 shrink-0 mt-0.5" size={20} />
                <div className="text-sm">
                  <p className="font-bold text-amber-900">
                    You've been assigned as reviewer for {pendingTypists.length} {pendingTypists.length === 1 ? 'typist' : 'typists'}.
                  </p>
                  <p className="text-amber-800/80 font-medium mt-0.5">
                    {pendingTypists.map(p => p.typistName).filter(Boolean).join(', ')}. Accept once to start reviewing all of their questions.
                  </p>
                </div>
              </div>
              <button
                onClick={handleAcceptInvite}
                disabled={isAccepting}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-xl transition-all shadow-md shrink-0"
              >
                {isAccepting ? 'Accepting...' : 'Accept Invitation'}
              </button>
            </div>
          );
        })()}

        <div>
          {activeTab === 'ai' && pairRole === 'typist' ? (
            <AIGenerator pairMode />
          ) : (
            <QuestionBank externalFilter={activeTab === 'review' ? 'In Review' : activeTab === 'draft' ? 'Draft' : 'Approved'} />
          )}
        </div>
      </main>
    </div>
  );
}
