import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { BookOpen, LogOut, Settings, Users, Video, Calendar, ChevronLeft, ChevronRight, Menu, X, FileText, ArrowRight, Clock, Sparkles } from 'lucide-react';
import logoImg from '../assets/msgate_logo.png';
import { db } from '../firebase';
import { collection, query, where, getDocs, getCountFromServer } from 'firebase/firestore';
import LiveClasses from './teacher/LiveClasses';
import TeacherQuestionBank from './teacher/TeacherQuestionBank';
import TestsManager from './TestsManager';
import TeacherStudents from './teacher/TeacherStudents';
import Analytics from './admin/Analytics';
import { TrendingUp, ShieldAlert } from 'lucide-react';
import ReportedQuestions from './admin/ReportedQuestions';
import QuestionBank from './admin/QuestionBank';
import { gateCoursesData } from './GateCourses';

const sidebarNavItems = [
  { key: 'courses', label: 'My Courses', icon: BookOpen },
  { key: 'live', label: 'Live Classes', icon: Video },
  { key: 'students', label: 'Students', icon: Users },
  { key: 'questions', label: 'Question Bank', icon: BookOpen },
  { key: 'tests', label: 'Test Modules', icon: Calendar },
  { key: 'analytics', label: 'Analytics', icon: TrendingUp },
  { key: 'reported', label: "Reported Q's", icon: ShieldAlert },
];

function StatCard({ icon: Icon, label, value, onClick, gradient, index = 0 }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07, ease: 'easeOut' }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative bg-white rounded-2xl border border-slate-200 shadow-sm p-5 text-left overflow-hidden group hover:shadow-xl hover:border-transparent transition-[box-shadow,border-color] duration-300"
    >
      <div className={`absolute -right-6 -top-6 w-28 h-28 rounded-full bg-gradient-to-br ${gradient} opacity-[0.06] group-hover:opacity-[0.14] group-hover:scale-110 transition-all duration-500 pointer-events-none`}></div>
      <div className={`relative w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center mb-4 shadow-lg shadow-slate-900/10 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300`}>
        <Icon size={20} strokeWidth={2.25} />
      </div>
      <p className="relative text-3xl font-[900] text-slate-900 tabular-nums">{value}</p>
      <p className="relative text-xs font-bold text-slate-500 mt-1 uppercase tracking-wide">{label}</p>
      <div className="relative mt-3 flex items-center gap-1 text-[11px] font-bold text-slate-400 group-hover:text-slate-700 transition-colors">
        <span>View details</span>
        <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
      </div>
    </motion.button>
  );
}

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [teacherName, setTeacherName] = useState('Teacher');
  const [teacherDepartment, setTeacherDepartment] = useState('');
  const [activeTab, setActiveTab] = useState('courses');
  const [editQuestionId, setEditQuestionId] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [joinedStudents, setJoinedStudents] = useState([]);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [courseStats, setCourseStats] = useState({ testsCount: 0, questionsCount: 0, recordingsCount: 0 });
  const [recentTests, setRecentTests] = useState([]);
  const [upcomingClasses, setUpcomingClasses] = useState([]);
  const [authChecked, setAuthChecked] = useState(false);

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
          navigate('/login');
        } else if (!role) {
          navigate('/login');
        } else {
          navigate('/403');
        }
      } else {
        setTeacherName(name || 'Teacher');
        // Fetch all students for analytics
        try {
          const studentsSnapshot = await getDocs(collection(db, 'joined_students'));
          setJoinedStudents(studentsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        } catch (error) {
          console.error("Error fetching students:", error);
        }
        setAuthChecked(true);
      }
    };
    checkAccess();
  }, [navigate]);

  useEffect(() => {
    if (!teacherDepartment) return;
    const fetchCourseOverview = async () => {
      try {
        const [testsSnap, questionsCountSnap, recordingsCountSnap, classesSnap] = await Promise.all([
          getDocs(query(collection(db, 'tests'), where('department', '==', teacherDepartment))),
          getCountFromServer(query(collection(db, 'question_bank'), where('department', '==', teacherDepartment))),
          getCountFromServer(query(collection(db, 'recordings'), where('department', '==', teacherDepartment))),
          getDocs(query(collection(db, 'scheduled_classes'), where('department', '==', teacherDepartment))),
        ]);

        const tests = testsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        tests.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        setRecentTests(tests.slice(0, 5));

        setCourseStats({
          testsCount: tests.length,
          questionsCount: questionsCountSnap.data().count,
          recordingsCount: recordingsCountSnap.data().count,
        });

        const now = Date.now();
        const classes = classesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const upcoming = classes
          .filter(c => c.time && c.time.includes('T') && new Date(c.time).getTime() >= now)
          .sort((a, b) => new Date(a.time) - new Date(b.time))
          .slice(0, 5);
        setUpcomingClasses(upcoming);
      } catch (e) {
        console.error('Failed to fetch course overview', e);
      }
    };
    fetchCourseOverview();
  }, [teacherDepartment]);

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
          !authChecked ? (
            <div className="mt-6 space-y-6 animate-pulse">
              <div className="h-32 bg-gradient-to-br from-slate-200 to-slate-100 rounded-[28px]"></div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {[0, 1, 2, 3].map(i => <div key={i} className="h-32 bg-white rounded-2xl border border-slate-200"></div>)}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[0, 1].map(i => <div key={i} className="h-64 bg-white rounded-3xl border border-slate-200"></div>)}
              </div>
            </div>
          ) : !teacherDepartment ? (
            <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-sm text-center mt-6">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <BookOpen size={32} />
              </div>
              <h2 className="text-2xl font-[900] text-slate-900 mb-2">No Department on Your Account</h2>
              <p className="text-slate-500 max-w-md mx-auto">
                Teachers are assigned a department when invited, so this shouldn't normally happen. Please contact the administrator to fix your account.
              </p>
            </div>
          ) : (() => {
            const deptMatch = teacherDepartment.match(/\(([^)]+)\)/);
            const deptCode = deptMatch ? deptMatch[1] : null;
            const courseInfo = gateCoursesData.find(c => c.code === deptCode);
            const CourseIcon = courseInfo?.icon || BookOpen;
            const deptStudentCount = joinedStudents.filter(s => s.department === teacherDepartment).length;

            return (
              <div className="mt-6 space-y-6">
                {/* Course Hero */}
                <motion.div
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="relative overflow-hidden bg-gradient-to-br from-[#1d4ed8] via-[#2f5ce0] to-[#4f46e5] rounded-[28px] shadow-xl shadow-blue-900/15 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-6"
                >
                  <div className="absolute -top-16 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                  <div className="absolute -bottom-24 -left-10 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none"></div>

                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-white flex items-center justify-center flex-shrink-0 shadow-inner">
                    <CourseIcon size={34} strokeWidth={2} />
                  </div>
                  <div className="relative flex-1 min-w-0">
                    <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3 border border-white/10">
                      <Sparkles size={12} /> Your Assigned Course
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-[900] text-white tracking-tight truncate">{courseInfo?.name || teacherDepartment}</h2>
                    <p className="text-blue-100/90 text-sm font-medium mt-2 max-w-lg">GATE preparation coaching for {courseInfo?.name || teacherDepartment} students.</p>
                  </div>
                  <div className="relative flex-shrink-0">
                    <span className="inline-flex items-center gap-1.5 bg-white/15 text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/10">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Active
                    </span>
                  </div>
                </motion.div>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  <StatCard index={0} icon={Users} label="Enrolled Students" value={deptStudentCount} onClick={() => setActiveTab('students')} gradient="from-blue-500 to-blue-600" />
                  <StatCard index={1} icon={Calendar} label="Tests Created" value={courseStats.testsCount} onClick={() => setActiveTab('tests')} gradient="from-violet-500 to-purple-600" />
                  <StatCard index={2} icon={BookOpen} label="Question Bank" value={courseStats.questionsCount} onClick={() => setActiveTab('questions')} gradient="from-indigo-500 to-blue-600" />
                  <StatCard index={3} icon={Video} label="Recordings" value={courseStats.recordingsCount} onClick={() => setActiveTab('live')} gradient="from-rose-500 to-pink-600" />
                </div>

                {/* Upcoming Classes / Recent Tests */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.3, ease: 'easeOut' }}
                    className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-[900] text-slate-900 text-lg flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><Calendar size={16} /></span>
                        Upcoming Live Classes
                      </h3>
                      <button onClick={() => setActiveTab('live')} className="text-xs font-bold text-blue-600 hover:text-white hover:bg-blue-600 px-2.5 py-1.5 rounded-lg transition-colors flex-shrink-0 flex items-center gap-1">
                        View all <ArrowRight size={12} />
                      </button>
                    </div>
                    {upcomingClasses.length === 0 ? (
                      <div className="py-8 text-center">
                        <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Calendar size={20} />
                        </div>
                        <p className="text-slate-400 text-sm font-medium">No upcoming classes scheduled.</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {upcomingClasses.map(cls => (
                          <div key={cls.id} className="group flex items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 hover:bg-blue-50/70 border border-slate-100 hover:border-blue-200 transition-all">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-lg bg-white text-blue-600 border border-blue-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors">
                                <Clock size={16} />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-800 text-sm truncate">{cls.topic}</p>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">
                                  {new Date(cls.time).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-blue-600 bg-white border border-blue-100 px-2.5 py-1 rounded-full flex-shrink-0">{cls.students || 0} students</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.36, ease: 'easeOut' }}
                    className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-[900] text-slate-900 text-lg flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center"><FileText size={16} /></span>
                        Recent Tests
                      </h3>
                      <button onClick={() => setActiveTab('tests')} className="text-xs font-bold text-blue-600 hover:text-white hover:bg-blue-600 px-2.5 py-1.5 rounded-lg transition-colors flex-shrink-0 flex items-center gap-1">
                        View all <ArrowRight size={12} />
                      </button>
                    </div>
                    {recentTests.length === 0 ? (
                      <div className="py-8 text-center">
                        <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-3">
                          <FileText size={20} />
                        </div>
                        <p className="text-slate-400 text-sm font-medium">No tests created yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {recentTests.map(t => (
                          <div key={t.id} className="group flex items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 hover:bg-purple-50/70 border border-slate-100 hover:border-purple-200 transition-all">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-lg bg-white text-purple-600 border border-purple-100 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-600 group-hover:text-white group-hover:border-purple-600 transition-colors">
                                <FileText size={16} />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-800 text-sm truncate">{t.title}</p>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">{t.subject || 'General'} &middot; {t.questions?.length || 0} questions</p>
                              </div>
                            </div>
                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${t.status === 'active' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500 bg-slate-100'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                              {t.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                </div>
              </div>
            );
          })()
        )}

        {activeTab === 'live' && <LiveClasses department={teacherDepartment} />}
        {activeTab === 'students' && <TeacherStudents department={teacherDepartment} />}
        {activeTab === 'questions' && (
          <div>
             <QuestionBank lockedDepartment={teacherDepartment} initialEditQuestionId={editQuestionId} onClearEdit={() => setEditQuestionId(null)} />
          </div>
        )}
        {activeTab === 'tests' && (
          <TestsManager
            department={teacherDepartment}
            isTeacher={true}
            onEditQuestion={(qId) => { setEditQuestionId(qId); setActiveTab('questions'); }}
          />
        )}
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
