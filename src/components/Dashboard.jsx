import React, { useEffect, useState } from 'react';
import Loader from './Loader';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Video, PlayCircle, Play, Calendar, GraduationCap, Building2, HelpCircle, School, FileText, Download, Trophy, ChevronLeft, ChevronRight } from 'lucide-react';
import logoImg from '../assets/msgate_logo.png';
import { db, storage } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, listAll, getDownloadURL } from 'firebase/storage';
import StudentLiveClasses from './StudentLiveClasses';
import StudentTests from './StudentTests';

export default function Dashboard() {
  const navigate = useNavigate();
  const [studentName, setStudentName] = useState('Student');
  const [studentDepartment, setStudentDepartment] = useState('');
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

  useEffect(() => {
    if (!studentDepartment) return;
    const q = query(
      collection(db, 'recordings'),
      where('department', 'in', [studentDepartment, 'General'])
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const recs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      recs.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setRecordings(recs);
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
          const q = query(collection(db, 'recordings'), where('fileName', '==', fileName));
          const snap = await getDocs(q);
          if (snap.empty) {
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
      setShowOnboarding(false);
    } catch (e) {
      console.error("Error updating onboarding details", e);
      alert("Failed to save details. Please try again.");
    }
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
            <PlayCircle size={18} />
            {!isCollapsed && <span>Recordings</span>}
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
        </nav>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 p-8 overflow-y-auto ${showOnboarding ? 'blur-sm pointer-events-none' : ''} transition-all duration-300`}>
        <header className="mb-8 flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
          <div>
            <h1 className="text-3xl font-[900] text-slate-900 tracking-tight">Welcome, {studentName}! 👋</h1>
            <p className="text-slate-500 font-medium mt-1">Pick up where you left off and track your progress.</p>
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
                
                {/* Course Card 1 */}
                <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all cursor-pointer group">
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-12 h-12 rounded-[14px] flex items-center justify-center bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-inner">
                      <BookOpen size={24} />
                    </div>
                    <span className="text-xs font-[900] text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">45%</span>
                  </div>
                  <h3 className="font-[900] text-slate-900 text-[17px] mb-4 group-hover:text-blue-600 transition-colors leading-snug">Computer Science & IT (GATE 2027)</h3>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 h-2.5 rounded-full mb-4 overflow-hidden shadow-inner">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full w-[45%] relative">
                      <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]"></div>
                    </div>
                  </div>
                  
                  <p className="text-[13px] text-slate-500 font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></span> Up next: Data Structures (Trees)
                  </p>
                </div>

                {/* Course Card 2 */}
                <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 transition-all cursor-pointer group">
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-12 h-12 rounded-[14px] flex items-center justify-center bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-inner">
                      <BookOpen size={24} />
                    </div>
                    <span className="text-xs font-[900] text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">78%</span>
                  </div>
                  <h3 className="font-[900] text-slate-900 text-[17px] mb-4 group-hover:text-indigo-600 transition-colors leading-snug">Engineering Mathematics (Common)</h3>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 h-2.5 rounded-full mb-4 overflow-hidden shadow-inner">
                    <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full w-[78%]"></div>
                  </div>
                  
                  <p className="text-[13px] text-slate-500 font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></span> Up next: Linear Algebra Matrices
                  </p>
                </div>

                {/* Course Card 3 */}
                <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-1 transition-all cursor-pointer group">
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-12 h-12 rounded-[14px] flex items-center justify-center bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors shadow-inner">
                      <BookOpen size={24} />
                    </div>
                    <span className="text-xs font-[900] text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">12%</span>
                  </div>
                  <h3 className="font-[900] text-slate-900 text-[17px] mb-4 group-hover:text-emerald-600 transition-colors leading-snug">General Aptitude (Common)</h3>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 h-2.5 rounded-full mb-4 overflow-hidden shadow-inner">
                    <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-full rounded-full w-[12%]"></div>
                  </div>
                  
                  <p className="text-[13px] text-slate-500 font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Up next: Quantitative Aptitude 1
                  </p>
                </div>

              </div>
            </div>

            {/* Study Materials */}
            <div>
              <h2 className="text-xl font-[900] text-slate-900 mb-5 mt-4">Recent Study Materials</h2>
              <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden">
                <div className="divide-y divide-slate-100">
                  
                  {/* Material 1 */}
                  <div className="p-4 sm:p-6 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-[14px] bg-red-50 text-red-500 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                        <FileText size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm sm:text-[15px]">Data Structures Handwritten Notes</h4>
                        <p className="text-[12px] text-slate-500 font-bold mt-1">PDF Document • 2.4 MB • Uploaded Today</p>
                      </div>
                    </div>
                    <button className="px-4 py-2.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 rounded-xl text-sm font-bold transition-colors flex items-center gap-2">
                       <Download size={16} /> <span className="hidden sm:inline">Download</span>
                    </button>
                  </div>

                  {/* Material 2 */}
                  <div className="p-4 sm:p-6 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-[14px] bg-purple-50 text-purple-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                        <FileText size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm sm:text-[15px]">GATE CSE 2023 Solved Paper (PYQ)</h4>
                        <p className="text-[12px] text-slate-500 font-bold mt-1">PDF Document • 5.1 MB • Uploaded Yesterday</p>
                      </div>
                    </div>
                    <button className="px-4 py-2.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 rounded-xl text-sm font-bold transition-colors flex items-center gap-2">
                       <Download size={16} /> <span className="hidden sm:inline">Download</span>
                    </button>
                  </div>

                  {/* Material 3 */}
                  <div className="p-4 sm:p-6 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-[14px] bg-orange-50 text-orange-500 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                        <FileText size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm sm:text-[15px]">Engineering Maths Calculus Cheat Sheet</h4>
                        <p className="text-[12px] text-slate-500 font-bold mt-1">PDF Document • 1.1 MB • Uploaded Oct 12</p>
                      </div>
                    </div>
                    <button className="px-4 py-2.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 rounded-xl text-sm font-bold transition-colors flex items-center gap-2">
                       <Download size={16} /> <span className="hidden sm:inline">Download</span>
                    </button>
                  </div>

                </div>
                <div className="p-5 bg-slate-50 border-t border-slate-100 text-center">
                  <button className="text-[13px] font-[900] text-blue-600 hover:text-blue-700 uppercase tracking-wide">View all materials in drive &rarr;</button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'live' && (
          <StudentLiveClasses department={studentDepartment} />
        )}

        {activeTab === 'recordings' && (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm mt-6">
            <h2 className="text-2xl font-[900] text-slate-900 mb-6 flex items-center gap-3">
              <PlayCircle className="text-purple-500" size={28} /> Past Class Recordings
            </h2>
            
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
                       <PlayCircle size={48} className="text-white drop-shadow-md opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all z-10 cursor-pointer" onClick={() => window.open(rec.url, '_blank')} />
                       <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent pointer-events-none"></div>
                       <span className="absolute bottom-3 left-3 text-white text-xs font-bold px-2 py-1 bg-black/40 rounded-lg pointer-events-none backdrop-blur-sm">
                         {new Date(rec.createdAt?.toMillis() || Date.now()).toLocaleDateString()}
                       </span>
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg line-clamp-2 mb-1">{rec.fileName}</h3>
                    <p className="text-sm text-slate-500 font-medium">By {rec.teacherName}</p>
                    <button onClick={() => window.open(rec.url, '_blank')} className="w-full mt-4 py-2.5 bg-purple-100 text-purple-700 hover:bg-purple-600 hover:text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
                      <Play size={16} /> Watch Now
                    </button>
                  </div>
                ))}
              </div>
            )}
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
          <StudentTests department={studentDepartment} />
        )}
      </main>
    </div>
  );
}
