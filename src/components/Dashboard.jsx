import React, { useEffect, useState } from 'react';
import Loader from './Loader';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Video, PlayCircle, Play, Calendar, GraduationCap, Building2, HelpCircle, School, FileText, Eye, Trophy, ChevronLeft, ChevronRight, Crown, Lock, ArrowRight } from 'lucide-react';
import logoImg from '../assets/msgate_logo.png';
import { db, storage } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, listAll, getDownloadURL } from 'firebase/storage';
import StudentLiveClasses from './StudentLiveClasses';
import StudentTests from './StudentTests';
import PDFViewer from './PDFViewer';
import { gateCoursesData } from './GateCourses';

export default function Dashboard() {
  const navigate = useNavigate();
  const [studentName, setStudentName] = useState('Student');
  const [studentDepartment, setStudentDepartment] = useState('');
  const [isPro, setIsPro] = useState(false);
  const [purchasedBundles, setPurchasedBundles] = useState([]);
  const [availableBundles, setAvailableBundles] = useState([]);
  const [activeTab, setActiveTab] = useState('learning');
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Onboarding State
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [docId, setDocId] = useState(null);
  
  const [formData, setFormData] = useState({
    department: '',
    collegeName: '',
    yearOfStudy: '',
    referralSource: ''
  });

  const [recordings, setRecordings] = useState([]);
  const [notes, setNotes] = useState([]);
  const [playingVideoUrl, setPlayingVideoUrl] = useState(null);
  const [viewingNoteUrl, setViewingNoteUrl] = useState(null);
  const [viewingNoteAccess, setViewingNoteAccess] = useState(false);

  const canAccessRecording = (rec) => {
    if (isPro) return true;

    // 1. EXCLUSIVE BUNDLE: If the recording is assigned to a specific paid bundle
    if (rec.bundleId && rec.bundleId !== 'free') {
      if (purchasedBundles && purchasedBundles.includes(rec.bundleId)) {
        const bundle = (availableBundles || []).find(b => b.id === rec.bundleId);
        if (!bundle || !bundle.permissions || bundle.permissions.includes('recordings')) {
          return true;
        }
      }
      return false; // Do not fall through
    }

    // 2. GENERAL RECORDINGS (No specific bundleId):
    // Check if they own any bundle for this department that has the 'recordings' permission
    const studentPurchasedDeptBundles = (availableBundles || []).filter(b => 
      purchasedBundles.includes(b.id) && 
      (b.department === rec.department || rec.department === 'General' || !rec.department) &&
      (b.permissions?.includes('recordings') || !b.permissions)
    );
    
    if (studentPurchasedDeptBundles.length > 0) return true;
    
    // 3. Legacy support: Admin-created recordings without a bundleId are accessible to everyone
    const isAdmin = rec.teacherName === 'Admin' || rec.teacherName === 'MS Academy Admin';
    if (isAdmin) return true;

    return false;
  };

  const canAccessNote = (note) => {
    if (isPro) return true;
    
    // EXCLUSIVE BUNDLE: If a note is assigned to a specific bundle, 
    // it can ONLY be unlocked by purchasing that specific bundle.
    if (note.bundleId) {
      return purchasedBundles.includes(note.bundleId);
    }

    // GENERAL NOTES: If no specific bundle is assigned, 
    // unlock it if they have any purchased bundle for this department with 'notes' permission.
    const studentPurchasedDeptBundles = (availableBundles || []).filter(b => 
      purchasedBundles.includes(b.id) && 
      (b.department === note.department || b.department === 'General' || note.department === 'General') &&
      (b.permissions?.includes('notes') || !b.permissions)
    );
    
    if (studentPurchasedDeptBundles.length > 0) return true;
    
    return false;
  };

  useEffect(() => {
    if (!studentDepartment) return;
    const q = query(
      collection(db, 'recordings'),
      where('department', '==', studentDepartment)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const recs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      recs.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setRecordings(recs);
    });
    return () => unsubscribe();
  }, [studentDepartment]);

  useEffect(() => {
    if (!studentDepartment) return;
    const q = query(
      collection(db, 'notes'),
      where('department', '==', studentDepartment)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedNotes.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setNotes(fetchedNotes);
    });
    return () => unsubscribe();
  }, [studentDepartment]);

  // One-time sync to pull orphaned recordings from storage into firestore
  useEffect(() => {
    const syncStorageToFirestore = async () => {
      try {
        const listRef = ref(storage, 'recordings');
        const res = await listAll(listRef);
        for (const itemRef of res.items) {
          const fileName = itemRef.name;
          // Check for exact match or name without extension (for backwards compatibility with older recordings)
          const baseName = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
          
          const q1 = query(collection(db, 'recordings'), where('fileName', '==', fileName));
          const snap1 = await getDocs(q1);
          
          const q2 = query(collection(db, 'recordings'), where('fileName', '==', baseName));
          const snap2 = await getDocs(q2);

          if (snap1.empty && snap2.empty) {
            const url = await getDownloadURL(itemRef);
            await addDoc(collection(db, 'recordings'), {
              fileName,
              url,
              teacherName: 'Teacher (Synced)',
              department: 'General',
              createdAt: serverTimestamp()
            });
            console.log("Synced orphaned recording:", fileName);
          }
        }
      } catch (err) {
        console.error("Error syncing storage:", err);
      }
    };
    syncStorageToFirestore();
    
    const fetchBundles = async () => {
      try {
        const bSnapshot = await getDocs(collection(db, 'course_bundles'));
        setAvailableBundles(bSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      } catch (e) {
        console.error("Failed to fetch bundles:", e);
      }
    };
    fetchBundles();
  }, []);

  useEffect(() => {
    const role = localStorage.getItem('auth_role');
    const name = localStorage.getItem('auth_name');
    const email = localStorage.getItem('auth_email');
    
    if (role !== 'student') {
      navigate('/login');
      return;
    }
    
    setStudentName(name || 'Student');

    const checkOnboarding = async () => {
      try {
        if (email) {
          const q = query(collection(db, 'joined_students'), where('email', '==', email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const studentDoc = querySnapshot.docs[0];
            const data = studentDoc.data();
            setDocId(studentDoc.id);
            
            if (data.department) {
              setStudentDepartment(data.department);
              localStorage.setItem('student_department', data.department);
            }
            if (data.isPro) {
              setIsPro(true);
            }
            if (data.purchasedBundles) {
              setPurchasedBundles(data.purchasedBundles);
            }
            
            // Check if all onboarding fields exist
            if (!data.department || !data.collegeName || !data.yearOfStudy || !data.referralSource) {
              setShowOnboarding(true);
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch student details", e);
      } finally {
        setLoading(false);
      }
    };
    
    checkOnboarding();
  }, [navigate]);

  const handleOnboardingSubmit = async (e) => {
    e.preventDefault();
    if (!docId) return;

    try {
      await updateDoc(doc(db, 'joined_students', docId), {
        department: formData.department,
        collegeName: formData.collegeName,
        yearOfStudy: formData.yearOfStudy,
        referralSource: formData.referralSource,
        onboardingCompleted: true
      });
      setStudentDepartment(formData.department);
      localStorage.setItem('student_department', formData.department);
      setShowOnboarding(false);
    } catch (e) {
      console.error("Error updating onboarding details", e);
      alert("Failed to save details. Please try again.");
    }
  };

  const handleUpgradeToPro = async (bundleId) => {
    if (!docId || !bundleId) return;
    
    // Simulate payment process delay
    setLoading(true);
    setTimeout(async () => {
      try {
        const newPurchased = [...purchasedBundles, bundleId];
        await updateDoc(doc(db, 'joined_students', docId), {
          purchasedBundles: newPurchased
        });
        setPurchasedBundles(newPurchased);
        alert('Payment Successful! Bundle unlocked. 🎉');
      } catch (e) {
        console.error("Error upgrading account", e);
        alert("Failed to upgrade account. Please try again.");
      } finally {
        setLoading(false);
      }
    }, 1500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex relative overflow-hidden">
      
      {/* Onboarding Modal Overlay */}
      {showOnboarding && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                <GraduationCap size={32} className="text-white" />
              </div>
              <h2 className="text-2xl font-[900] tracking-tight">Welcome to MS Academy!</h2>
              <p className="text-blue-100 font-medium text-sm mt-1">Let's personalize your learning experience.</p>
            </div>
            
            <form onSubmit={handleOnboardingSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Building2 size={16} className="text-slate-400" /> College Name
                </label>
                <input 
                  type="text" 
                  required
                  value={formData.collegeName}
                  onChange={(e) => setFormData({...formData, collegeName: e.target.value})}
                  placeholder="e.g. NIT Trichy"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-[14px] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>

              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <School size={16} className="text-slate-400" /> Department
                </label>
                <select 
                  required
                  value={formData.department}
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-[14px] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white"
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
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Calendar size={16} className="text-slate-400" /> Current Year of Study
                </label>
                <select 
                  required
                  value={formData.yearOfStudy}
                  onChange={(e) => setFormData({...formData, yearOfStudy: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-[14px] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white"
                >
                  <option value="">Select Year...</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                  <option value="Graduated">Graduated / Working</option>
                </select>
              </div>

              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <HelpCircle size={16} className="text-slate-400" /> How did you hear about us?
                </label>
                <select 
                  required
                  value={formData.referralSource}
                  onChange={(e) => setFormData({...formData, referralSource: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-[14px] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white"
                >
                  <option value="">Select an option...</option>
                  <option value="College Seminar / Professor">College Seminar / Professor</option>
                  <option value="Friends / Seniors">Friends / Seniors</option>
                  <option value="Social Media (Instagram/Facebook)">Social Media</option>
                  <option value="Google Search">Google Search</option>
                  <option value="YouTube">YouTube</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <button 
                type="submit"
                className="w-full py-3 mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/30 active:scale-[0.98]"
              >
                Complete Profile
              </button>
            </form>
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
              <p className="text-xs font-bold text-slate-400 whitespace-nowrap">Student Portal</p>
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          <button 
            onClick={() => setActiveTab('learning')}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl font-bold transition-all ${activeTab === 'learning' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
          >
            <BookOpen size={18} />
            {!isCollapsed && <span>My Learning</span>}
          </button>
          <button 
            onClick={() => setActiveTab('live')}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl font-bold transition-all ${activeTab === 'live' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
          >
            <Video size={18} />
            {!isCollapsed && <span>Live Sessions</span>}
          </button>
          <button 
            onClick={() => setActiveTab('recordings')}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl font-bold transition-all ${activeTab === 'recordings' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
          >
            <PlayCircle size={18} /> {!isCollapsed && <span>Recordings</span>}
          </button>
          <button 
            onClick={() => setActiveTab('notes')}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl font-bold transition-all ${activeTab === 'notes' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
          >
            <FileText size={18} /> {!isCollapsed && <span>Study Notes</span>}
          </button>
          <button 
            onClick={() => setActiveTab('schedule')}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl font-bold transition-all ${activeTab === 'schedule' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
          >
            <Calendar size={18} />
            {!isCollapsed && <span>Schedule</span>}
          </button>
          <button 
            onClick={() => setActiveTab('tests')}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl font-bold transition-all ${activeTab === 'tests' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
          >
            <Trophy size={18} />
            {!isCollapsed && <span>Practice Tests</span>}
          </button>
          
          {/* Upgrade to Premium Banner */}
          {!isCollapsed && !isPro && (
            <div className="mt-6 bg-gradient-to-br from-[#4f46e5] to-[#8b5cf6] rounded-[20px] p-5 text-white shadow-[0_10px_25px_rgba(99,102,241,0.4)] relative overflow-hidden">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-bold text-[18px] leading-tight w-[60%] tracking-tight">Upgrade to<br/>Premium</h4>
                <div className="text-4xl drop-shadow-md z-10 relative">🎓</div>
              </div>
              <p className="text-[12.5px] text-indigo-50 mb-5 leading-[1.4] font-medium opacity-90">Unlock premium questions,<br/>advanced analytics & more.</p>
              <button 
                onClick={() => setActiveTab('upgrade')} 
                className="w-full bg-white text-[#5b21b6] font-bold text-[14px] py-2.5 rounded-[14px] hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98]"
              >
                Upgrade Now <ArrowRight size={16} strokeWidth={2.5} />
              </button>
            </div>
          )}
          
          {/* Original button fallback for collapsed state or Pro users */}
          {(isCollapsed || isPro) && (
            <div className="pt-4 mt-4 border-t border-slate-200">
              <button 
                onClick={() => setActiveTab('upgrade')}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl font-bold transition-all ${activeTab === 'upgrade' ? 'bg-amber-50 text-amber-600' : isPro ? 'text-amber-500 hover:bg-amber-50' : 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5'}`}
              >
                <Crown size={18} className={isPro && activeTab !== 'upgrade' ? 'text-amber-500' : ''} />
                {!isCollapsed && <span>{isPro ? 'Pro Benefits' : 'Upgrade to Pro'}</span>}
              </button>
            </div>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 p-8 overflow-y-auto ${showOnboarding ? 'blur-sm pointer-events-none' : ''} transition-all duration-300`}>
        <header className="mb-8 flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
          <div>
            <h1 className="text-2xl sm:text-3xl font-[900] text-slate-900 tracking-tight flex items-center gap-3">
              Welcome back, {studentName.split(' ')[0]} 👋
              {isPro && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-200 text-[12px] text-amber-700 font-bold uppercase tracking-wider shadow-sm">
                  <Crown size={14} className="text-amber-500" /> Pro
                </span>
              )}
            </h1>
            <p className="text-slate-500 font-medium text-sm sm:text-[15px] mt-1 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              {studentDepartment || "Department Not Set"}
            </p>
          </div>
          <button 
            onClick={() => navigate('/student/profile')}
            className="w-12 h-12 shrink-0 bg-gradient-to-br from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 text-blue-700 rounded-full flex items-center justify-center font-[900] text-xl transition-all shadow-sm border border-blue-200 hover:shadow-md"
            title="My Profile"
          >
            {studentName.charAt(0).toUpperCase()}
          </button>
        </header>

        {activeTab === 'learning' && (
          <div className="space-y-8 mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Active Courses */}
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-[900] text-slate-900">Your Enrolled Courses</h2>
                <button onClick={() => navigate('/gate-courses')} className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors">Browse catalog &rarr;</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Dynamic Course Card */}
                {(() => {
                  const match = studentDepartment?.match(/\(([^)]+)\)/);
                  const deptCode = match ? match[1] : null;
                  const course = gateCoursesData.find(c => c.code === deptCode);
                  
                  if (!course) return (
                    <div className="col-span-full text-center text-slate-500 py-6">
                      No specific courses found for your department.
                    </div>
                  );
                  
                  const Icon = course.icon || BookOpen;
                  
                  return (
                    <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all cursor-pointer group" onClick={() => navigate(course.path)}>
                      <div className="flex items-start justify-between mb-5">
                        <div className="w-12 h-12 rounded-[14px] flex items-center justify-center bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-inner">
                          <Icon size={24} />
                        </div>
                        <span className="text-xs font-[900] text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">0%</span>
                      </div>
                      <h3 className="font-[900] text-slate-900 text-[17px] mb-4 group-hover:text-blue-600 transition-colors leading-snug">{course.name}</h3>
                      
                      {/* Progress Bar */}
                      <div className="w-full bg-slate-100 h-2.5 rounded-full mb-4 overflow-hidden shadow-inner">
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full w-[0%] relative">
                        </div>
                      </div>
                      
                      <p className="text-[13px] text-slate-500 font-bold flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></span> Start Learning
                      </p>
                    </div>
                  );
                })()}

              </div>
            </div>

            {/* Study Materials */}
            <div>
              <h2 className="text-xl font-[900] text-slate-900 mb-5 mt-4 flex items-center gap-2">
                Recent Study Materials
                {!isPro && <Lock size={16} className="text-amber-500" />}
              </h2>
              <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden relative">

                <div className="divide-y divide-slate-100">
                  {notes.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 font-medium">
                      No study materials available yet.
                    </div>
                  ) : (
                    notes.slice(0, 5).map(note => {
                      const hasAccess = canAccessNote(note);
                      return (
                        <div key={note.id} className={`p-4 sm:p-6 flex items-center justify-between transition-colors group ${!hasAccess ? 'opacity-50 select-none' : 'hover:bg-slate-50'}`}>
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform ${hasAccess ? 'bg-blue-50 text-blue-500' : 'bg-slate-100 text-slate-400'}`}>
                              <FileText size={24} />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 text-sm sm:text-[15px]">{note.title}</h4>
                              <p className="text-[12px] text-slate-500 font-bold mt-1">
                                {note.fileName ? `${note.fileName} • ` : ''}
                                {note.createdAt?.toDate ? note.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Just now'}
                              </p>
                            </div>
                          </div>
                          {hasAccess ? (
                            <button onClick={() => { setViewingNoteUrl(note.url); setViewingNoteAccess(true); }} className="px-4 py-2.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 rounded-xl text-sm font-bold transition-colors flex items-center gap-2">
                              <Eye size={16} /> <span className="hidden sm:inline">View Full</span>
                            </button>
                          ) : (
                            <button onClick={() => { setViewingNoteUrl(note.url); setViewingNoteAccess(false); }} className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-xl text-sm font-bold transition-colors flex items-center gap-2">
                              <Eye size={16} /> <span className="hidden sm:inline">Preview</span>
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="p-5 bg-slate-50 border-t border-slate-100 text-center">
                  <button onClick={() => setActiveTab('notes')} className="text-[13px] font-[900] text-blue-600 hover:text-blue-700 uppercase tracking-wide">View all study materials &rarr;</button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'live' && (
          <StudentLiveClasses department={studentDepartment} isPro={isPro} purchasedBundles={purchasedBundles} bundles={availableBundles} />
        )}

        {activeTab === 'recordings' && (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm mt-6 relative overflow-hidden">
            <h2 className="text-2xl font-[900] text-slate-900 mb-6 flex items-center gap-3">
              <PlayCircle className="text-purple-500" size={28} /> Past Class Recordings
            </h2>
            
            <div>
              {recordings.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <PlayCircle size={32} />
                  </div>
                  <h3 className="text-xl font-[900] text-slate-900 mb-2">No Recordings Yet</h3>
                  <p className="text-slate-500 max-w-md mx-auto">
                    Once live classes are completed, their recordings will automatically appear here for you to review.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recordings.map(rec => (
                    <div key={rec.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-5 hover:shadow-md hover:border-purple-200 transition-all group">
                      <div className="aspect-video bg-slate-200 rounded-xl mb-4 relative overflow-hidden group-cursor-pointer flex items-center justify-center">
                         {!canAccessRecording(rec) ? (
                            <Lock size={48} className="text-slate-400 drop-shadow-md z-10" />
                         ) : (
                            <PlayCircle size={48} className="text-white drop-shadow-md opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all z-10 cursor-pointer" onClick={() => setPlayingVideoUrl(rec.url)} />
                         )}
                         <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent pointer-events-none"></div>
                         <span className="absolute bottom-3 left-3 text-white text-xs font-bold px-2 py-1 bg-black/40 rounded-lg pointer-events-none backdrop-blur-sm">
                           {new Date(rec.createdAt?.toMillis() || Date.now()).toLocaleDateString()}
                         </span>
                      </div>
                      <h3 className="font-bold text-slate-800 text-lg line-clamp-2 mb-1">{rec.fileName}</h3>
                      <p className="text-sm text-slate-500 font-medium">By {rec.teacherName}</p>
                      
                      {!canAccessRecording(rec) ? (
                        <button disabled className="w-full mt-4 py-2.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-xl font-bold flex items-center justify-center gap-2 cursor-not-allowed">
                          <Lock size={16} /> Locked (Pro)
                        </button>
                      ) : (
                        <button onClick={() => setPlayingVideoUrl(rec.url)} className="w-full mt-4 py-2.5 bg-purple-100 text-purple-700 hover:bg-purple-600 hover:text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
                          <Play size={16} /> Watch Now
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm mt-6 relative overflow-hidden">
            <h2 className="text-2xl font-[900] text-slate-900 mb-6 flex items-center gap-3">
              <FileText className="text-blue-500" size={28} /> All Study Notes
            </h2>
            
            <div>
              {notes.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FileText size={32} />
                  </div>
                  <h3 className="text-xl font-[900] text-slate-900 mb-2">No Study Notes Yet</h3>
                  <p className="text-slate-500 max-w-md mx-auto">
                    Once teachers upload study materials for your department, they will appear here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {notes.map(note => {
                    const hasAccess = canAccessNote(note);
                    return (
                      <div key={note.id} className={`bg-white rounded-2xl border ${hasAccess ? 'border-slate-200 hover:border-blue-300 hover:shadow-md' : 'border-slate-100 opacity-75'} p-5 transition-all flex flex-col`}>
                        <div className="flex items-start gap-4 mb-4">
                          <div className={`w-14 h-14 shrink-0 rounded-[14px] flex items-center justify-center shadow-inner ${hasAccess ? 'bg-blue-50 text-blue-500' : 'bg-slate-100 text-slate-400'}`}>
                            <FileText size={28} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-[900] text-slate-900 text-[16px] mb-1 truncate" title={note.title}>{note.title}</h4>
                            {note.description && (
                              <p className="text-[13px] text-slate-500 font-medium line-clamp-2 mb-2">{note.description}</p>
                            )}
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-auto">
                              {note.fileName && (
                                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                                  <FileText size={12} /> {note.fileName}
                                </span>
                              )}
                              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                                <Calendar size={12} /> {note.createdAt?.toDate ? note.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-auto pt-4 border-t border-slate-100">
                          {hasAccess ? (
                            <button onClick={() => { setViewingNoteUrl(note.url); setViewingNoteAccess(true); }} className="w-full py-2.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
                              <Eye size={16} /> View Full Note
                            </button>
                          ) : (
                            <button onClick={() => { setViewingNoteUrl(note.url); setViewingNoteAccess(false); }} className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
                              <Eye size={16} /> Preview (3 Pages)
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-sm text-center mt-6">
             <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar size={32} />
            </div>
            <h2 className="text-2xl font-[900] text-slate-900 mb-2">Your Calendar is Clear</h2>
            <p className="text-slate-500 max-w-md mx-auto">
              No upcoming tests or classes are scheduled in the next 7 days.
            </p>
          </div>
        )}

        {activeTab === 'tests' && (
          <StudentTests isPro={isPro} department={studentDepartment} purchasedBundles={purchasedBundles} bundles={availableBundles} />
        )}

        {activeTab === 'upgrade' && (
          <div className="max-w-6xl mx-auto py-10 px-4">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 text-amber-500 mb-6 shadow-sm border border-amber-200">
                <Crown size={40} />
              </div>
              <h2 className="text-4xl font-[900] text-slate-900 tracking-tight mb-4">
                Explore MS Academy Course Bundles
              </h2>
              <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto">
                Unlock your true potential and get access to all our premium GATE preparation features by purchasing a bundle below.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {availableBundles.length === 0 ? (
                <div className="col-span-full text-center py-12 text-slate-500 font-medium">
                  No course bundles available at the moment. Please check back later!
                </div>
              ) : (
                (() => {
                  const filteredBundles = availableBundles.filter(b => 
                    b.department === studentDepartment
                  );
                  
                  if (filteredBundles.length === 0) {
                    return (
                      <div className="col-span-full text-center py-12 text-slate-500 font-medium">
                        No course bundles available for your department at the moment.
                      </div>
                    );
                  }
                  
                  return filteredBundles.map(bundle => {
                    const isPurchased = purchasedBundles.includes(bundle.id);
                    return (
                    <div key={bundle.id} className={`bg-white rounded-[24px] border ${isPurchased ? 'border-emerald-200 shadow-emerald-500/10' : 'border-amber-200 shadow-amber-500/10'} shadow-xl overflow-hidden flex flex-col relative`}>
                      {isPurchased && (
                        <div className="absolute top-4 right-4 bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full z-10 flex items-center gap-1 shadow-md">
                           ✓ Purchased
                        </div>
                      )}
                      {bundle.imageUrl ? (
                        <img src={bundle.imageUrl} alt={bundle.name} className="w-full h-48 object-cover" />
                      ) : (
                        <div className="w-full h-48 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                          <BookOpen size={48} className="text-slate-300" />
                        </div>
                      )}
                      <div className="p-6 flex-1 flex flex-col">
                        <div className="mb-4">
                          <h3 className="text-xl font-[900] text-slate-900 line-clamp-2 leading-tight">{bundle.name}</h3>
                          <p className="text-sm text-slate-500 font-medium mt-1">{bundle.tagline}</p>
                        </div>
                        
                        <div className="flex items-end gap-2 mb-6">
                          <span className="text-3xl font-[900] text-slate-900">₹{bundle.discountedPrice || bundle.price}</span>
                          {bundle.discountedPrice && bundle.discountedPrice !== bundle.price && (
                            <span className="text-sm font-bold text-slate-400 line-through mb-1">₹{bundle.price}</span>
                          )}
                        </div>

                        <div className="flex-1">
                          <ul className="space-y-3 mb-6">
                            {(bundle.features || []).map((feature, idx) => (
                              <li key={idx} className="flex items-start gap-3">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isPurchased ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                  <span className="text-[10px] font-bold">✓</span>
                                </div>
                                <span className="text-sm text-slate-600 font-medium">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        {isPurchased ? (
                          <button 
                            disabled
                            className="w-full py-3 bg-slate-100 text-slate-400 font-bold rounded-xl cursor-not-allowed"
                          >
                            Already Owned
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleUpgradeToPro(bundle.id)}
                            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-[900] rounded-xl shadow-md transition-transform hover:-translate-y-0.5"
                          >
                            Buy Now
                          </button>
                        )}
                      </div>
                    </div>
                  );
                  });
                })()
              )}
            </div>
          </div>
        )}
      </main>

      {/* In-App Video Player Modal */}
      {playingVideoUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setPlayingVideoUrl(null)}></div>
          <div className="relative z-10 w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl bg-black border border-slate-800 animate-in zoom-in-95 duration-300">
            <button 
              onClick={() => setPlayingVideoUrl(null)} 
              className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-red-500 transition-colors backdrop-blur-sm"
            >
              <X size={20} />
            </button>
            <video 
              src={playingVideoUrl} 
              controls 
              autoPlay 
              className="w-full h-auto max-h-[85vh] outline-none"
            />
          </div>
        </div>
      )}

      {/* Note Viewer Modal */}
      {viewingNoteUrl && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-4">
          <button 
            onClick={() => setViewingNoteUrl(null)}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors z-10"
          >
            ✕
          </button>
          <div className="w-full max-w-5xl h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col relative">
            <PDFViewer 
               url={viewingNoteUrl} 
               previewLimit={viewingNoteAccess ? null : 3} 
               onUpgrade={() => { setViewingNoteUrl(null); setActiveTab('upgrade'); }} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
