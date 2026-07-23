import React, { useState } from 'react';
import { BarChart2, TrendingUp, Users, Award, Search, Clock, CheckCircle2, XCircle, AlertCircle, ChevronRight, MinusCircle, UserCircle2, Globe2, Filter, ArrowLeft, Target } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';

// --- MOCK DATA ---
const mockTests = [
  { id: 't1', title: 'Mock Test 1: CSE Core', category: 'Core subject', date: 'Oct 15, 2026' },
  { id: 't2', title: 'Aptitude Assessment', category: 'General', date: 'Oct 20, 2026' },
  { id: 't3', title: 'Mathematics Final', category: 'Engineering Math', date: 'Nov 02, 2026' }
];

const mockTestAnalytics = {
  t1: {
    title: 'Mock Test 1: CSE Core',
    avgScore: 72, highestScore: 98, participants: 145, avgTime: '45m 20s',
    distribution: [
      { range: '0-20%', count: 5 }, { range: '21-40%', count: 15 },
      { range: '41-60%', count: 45 }, { range: '61-80%', count: 60 }, { range: '81-100%', count: 20 },
    ],
    students: [
      { id: 's1', name: 'Arjun Kumar', score: 75, maxScore: 100, timeTaken: '58m 00s' },
      { id: 's2', name: 'Priya Sharma', score: 82, maxScore: 100, timeTaken: '59m 10s' },
      { id: 's3', name: 'Rahul Verma', score: 98, maxScore: 100, timeTaken: '40m 15s' },
      { id: 's4', name: 'Sneha Reddy', score: 45, maxScore: 100, timeTaken: '60m 00s' },
      { id: 's5', name: 'Karthik Raja', score: 68, maxScore: 100, timeTaken: '55m 40s' }
    ]
  },
  t2: {
    title: 'Aptitude Assessment',
    avgScore: 65, highestScore: 92, participants: 120, avgTime: '38m 15s',
    distribution: [
      { range: '0-20%', count: 10 }, { range: '21-40%', count: 25 },
      { range: '41-60%', count: 50 }, { range: '61-80%', count: 30 }, { range: '81-100%', count: 5 },
    ],
    students: [
      { id: 's1', name: 'Arjun Kumar', score: 65, maxScore: 100, timeTaken: '42m 15s' },
      { id: 's2', name: 'Priya Sharma', score: 80, maxScore: 100, timeTaken: '40m 00s' },
      { id: 's6', name: 'Vikram Singh', score: 92, maxScore: 100, timeTaken: '35m 10s' }
    ]
  },
  t3: {
    title: 'Mathematics Final',
    avgScore: 85, highestScore: 100, participants: 90, avgTime: '110m 00s',
    distribution: [
      { range: '0-20%', count: 0 }, { range: '21-40%', count: 5 },
      { range: '41-60%', count: 10 }, { range: '61-80%', count: 35 }, { range: '81-100%', count: 40 },
    ],
    students: [
      { id: 's7', name: 'Aditi Rao', score: 100, maxScore: 100, timeTaken: '95m 20s' },
      { id: 's8', name: 'Sanjay Dutt', score: 85, maxScore: 100, timeTaken: '115m 00s' },
      { id: 's9', name: 'Neha Gupta', score: 70, maxScore: 100, timeTaken: '120m 00s' }
    ]
  }
};

const fullTestTemplate1 = [
  { q: "What is the time complexity of QuickSort in the worst case?", selected: "O(n log n)", correct: "O(n^2)", explanation: "QuickSort degrades to O(n^2) when the pivot is the smallest or largest element.", status: "Wrong", timeSpent: "2m 15s" },
  { q: "Which protocol is used for secure communication over a computer network?", selected: "HTTPS", correct: "HTTPS", explanation: "HTTPS encrypts the HTTP protocol using TLS/SSL.", status: "Correct", timeSpent: "0m 45s" },
  { q: "What does HTML stand for?", selected: "Hyper Text Markup Language", correct: "Hyper Text Markup Language", explanation: "Standard markup language for documents designed to be displayed in a web browser.", status: "Correct", timeSpent: "0m 10s" },
  { q: "Which of the following is not a NoSQL database?", selected: null, correct: "MySQL", explanation: "MySQL is a relational database management system.", status: "Unattempted", timeSpent: "0m 30s" },
  { q: "In Python, which of the following is a mutable data type?", selected: "Tuple", correct: "List", explanation: "Lists can be modified after creation, whereas tuples are immutable.", status: "Wrong", timeSpent: "1m 10s" }
];

const fullTestTemplate2 = [
  { q: "If A is 10 miles north of B, and C is 10 miles east of B. What is the distance between A and C?", selected: "10 miles", correct: "14.14 miles", explanation: "Using the Pythagorean theorem: sqrt(10^2 + 10^2).", status: "Wrong", timeSpent: "3m 20s" },
  { q: "What is the next number in the sequence: 2, 6, 12, 20, ...?", selected: "30", correct: "30", explanation: "The differences are 4, 6, 8, so the next difference is 10.", status: "Correct", timeSpent: "1m 05s" },
  { q: "A train running at the speed of 60 km/hr crosses a pole in 9 seconds. What is the length of the train?", selected: null, correct: "150 meters", explanation: "Speed = 60 * (5/18) m/s. Distance = Speed * Time.", status: "Unattempted", timeSpent: "2m 00s" }
];

const mockStudentHistory = {
  'Arjun Kumar': [
    { id: 'a1', testName: 'Aptitude Test', score: 65, timeTaken: '42m 15s', totalQ: 3, attempted: 2, correct: 1, wrong: 1, negMarks: -3.33, allQuestions: fullTestTemplate2 },
    { id: 'a2', testName: 'Mock Test 1', score: 75, timeTaken: '58m 00s', totalQ: 5, attempted: 4, correct: 2, wrong: 2, negMarks: -2.5, allQuestions: fullTestTemplate1 }
  ],
  'Priya Sharma': [
    { id: 'p1', testName: 'Aptitude Test', score: 80, timeTaken: '40m 00s', totalQ: 3, attempted: 3, correct: 2, wrong: 1, negMarks: -2.0, allQuestions: fullTestTemplate2 },
    { id: 'p2', testName: 'Mock Test 1', score: 82, timeTaken: '59m 10s', totalQ: 5, attempted: 5, correct: 4, wrong: 1, negMarks: -1.0, allQuestions: fullTestTemplate1 }
  ]
};

export default function Analytics({ joinedStudents = [] }) {
  const [activeInnerTab, setActiveInnerTab] = useState('global'); // 'global' or 'student'
  
  // Drill-down states for Global
  const [detailedGlobalTestId, setDetailedGlobalTestId] = useState(null);
  
  // Drill-down states for Student
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentName, setSelectedStudentName] = useState(null);
  const [detailedTestId, setDetailedTestId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All'); 
  
  // Student Logic
  const allStudentNames = Object.keys(mockStudentHistory);
  const filteredStudentNames = allStudentNames.filter(name => name.toLowerCase().includes(studentSearch.toLowerCase()));
  
  const activeStudentData = selectedStudentName ? mockStudentHistory[selectedStudentName] : [];
  const activeDetailedTest = detailedTestId ? activeStudentData.find(t => t.id === detailedTestId) : null;

  // Global Logic
  const activeGlobalTest = detailedGlobalTestId ? mockTestAnalytics[detailedGlobalTestId] : null;

  const openStudentTestDetail = (id) => {
    setDetailedTestId(id);
    setFilterStatus('All');
  };

  const closeStudentTestDetail = () => {
    setDetailedTestId(null);
  };

  const openGlobalTestDetail = (id) => {
    setDetailedGlobalTestId(id);
  };

  const closeGlobalTestDetail = () => {
    setDetailedGlobalTestId(null);
  };

  const selectStudent = (name) => {
    setSelectedStudentName(name);
    setDetailedTestId(null);
  };

  const backToStudentList = () => {
    setSelectedStudentName(null);
    setDetailedTestId(null);
  };

  // If tab switches, reset detailed views
  const handleTabChange = (tab) => {
    setActiveInnerTab(tab);
    setDetailedTestId(null);
    setSelectedStudentName(null);
    setDetailedGlobalTestId(null);
  };

  // If search changes, reset detailed view
  const handleSearchChange = (e) => {
    setStudentSearch(e.target.value);
  };

  // Helper to color percentage rings
  const getScoreColor = (percent) => {
    if (percent >= 80) return 'text-emerald-500 bg-emerald-500';
    if (percent >= 50) return 'text-amber-500 bg-amber-500';
    return 'text-rose-500 bg-rose-500';
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-slate-50/50">
      
      {/* Header & Tab Switcher */}
      <div className="p-4 sm:p-6 lg:p-8 border-b border-slate-200 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shrink-0 z-10">
        <div>
          <h2 className="text-2xl font-[900] text-slate-800 tracking-tight flex items-center gap-2">
            <BarChart2 className="text-blue-600" /> Performance Analytics
          </h2>
          <p className="text-slate-500 text-sm mt-1">Deep insights into global test performance and individual student metrics</p>
        </div>

        <div className="flex bg-slate-100/80 p-1.5 rounded-2xl w-full md:w-auto shadow-inner border border-slate-200/60">
          <button
            onClick={() => handleTabChange('global')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeInnerTab === 'global' ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
          >
            <Globe2 size={16} /> Global Tests
          </button>
          <button
            onClick={() => handleTabChange('student')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeInnerTab === 'student' ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
          >
            <UserCircle2 size={16} /> Individual Student
          </button>
        </div>
      </div>

      {/* Main Content Area (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        
        {/* ============================================================== */}
        {/* GLOBAL TEST ANALYTICS */}
        {/* ============================================================== */}
        {activeInnerTab === 'global' && (
          <div className="max-w-5xl mx-auto flex flex-col gap-8 pb-12">
            {!detailedGlobalTestId ? (
              // LIST VIEW
              <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-10 shadow-sm flex flex-col">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <Target size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Global Test Database</h3>
                    <p className="text-sm font-semibold text-slate-500">Select a test to view detailed performance metrics.</p>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {mockTests.map(test => (
                    <div 
                      key={test.id} 
                      onClick={() => openGlobalTestDetail(test.id)}
                      className="group border border-slate-200 rounded-2xl bg-white hover:border-blue-300 hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden p-5 flex items-center justify-between"
                    >
                      <div className="flex flex-col gap-1.5">
                        <span className="font-[800] text-slate-800 text-[17px] group-hover:text-blue-600 transition-colors tracking-tight">{test.title}</span>
                        <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                          <span className="bg-slate-100 px-2.5 py-1 rounded-md">{test.category}</span>
                          <span>•</span>
                          <span>{test.date}</span>
                        </div>
                      </div>
                      <div className="p-3 rounded-full bg-slate-50 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors text-slate-400">
                        <ChevronRight size={20} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // DRILLED-DOWN VIEW
              <div className="flex flex-col">
                
                {/* Back Button & Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm mb-6">
                  <div className="flex flex-col items-start gap-4">
                    <button 
                      onClick={closeGlobalTestDetail}
                      className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors bg-slate-50 hover:bg-blue-50 px-3 py-1.5 rounded-lg"
                    >
                      <ArrowLeft size={16} /> Back to Global Tests
                    </button>
                    <div>
                      <h4 className="text-[26px] font-[900] tracking-tight text-slate-800">{activeGlobalTest.title}</h4>
                      <p className="text-sm font-bold text-slate-500 mt-1">Aggregated class performance metrics</p>
                    </div>
                  </div>
                </div>

                {/* Key Metrics Blocks */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                    <Users size={24} className="text-purple-500 mb-2" />
                    <span className="text-4xl font-[900] text-slate-800 tracking-tight">{activeGlobalTest.participants}</span>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Attempts</span>
                  </div>
                  <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 shadow-sm flex flex-col items-center justify-center text-center">
                    <TrendingUp size={24} className="text-blue-500 mb-2" />
                    <span className="text-4xl font-[900] text-blue-700 tracking-tight">{activeGlobalTest.avgScore}%</span>
                    <span className="text-[11px] font-bold text-blue-500/80 uppercase tracking-widest mt-1">Average Score</span>
                  </div>
                  <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 shadow-sm flex flex-col items-center justify-center text-center">
                    <Award size={24} className="text-emerald-500 mb-2" />
                    <span className="text-4xl font-[900] text-emerald-700 tracking-tight">{activeGlobalTest.highestScore}%</span>
                    <span className="text-[11px] font-bold text-emerald-600/80 uppercase tracking-widest mt-1">Highest Score</span>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                    <Clock size={24} className="text-amber-500 mb-2" />
                    <span className="text-[28px] leading-9 font-[900] text-slate-800 tracking-tight">{activeGlobalTest.avgTime}</span>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Avg Time Taken</span>
                  </div>
                </div>

                {/* Chart and Table Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                  
                  {/* Left: Score Distribution Chart */}
                  <div className="xl:col-span-5 flex flex-col bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <h4 className="text-[15px] font-[900] text-slate-800 mb-8 flex items-center gap-2">
                      <BarChart2 size={18} className="text-blue-500"/> Score Distribution
                    </h4>
                    <div className="w-full flex-1 min-h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={activeGlobalTest.distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#64748b', fontWeight: 600 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#64748b', fontWeight: 600 }} />
                          <RechartsTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', padding: '12px 16px' }} />
                          <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} isAnimationActive={false} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Right: Innovative Leaderboard */}
                  <div className="xl:col-span-7 flex flex-col bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="text-[15px] font-[900] text-slate-800 flex items-center gap-2">
                        <Users size={18} className="text-blue-500"/> Student Leaderboard
                      </h4>
                      <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 flex items-center gap-2">
                        <Search size={14} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-400">Search disabled in mock mode</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                      {/* Table Header Row */}
                      <div className="grid grid-cols-12 gap-4 px-4 py-2 border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        <div className="col-span-5">Student Name</div>
                        <div className="col-span-4">Performance</div>
                        <div className="col-span-3 text-right">Time Taken</div>
                      </div>

                      {/* Leaderboard Rows */}
                      {activeGlobalTest.students.sort((a, b) => b.score - a.score).map((student, idx) => {
                        const percent = Math.round((student.score / student.maxScore) * 100);
                        const colorClass = getScoreColor(percent).split(' ')[1]; // bg-color
                        const textClass = getScoreColor(percent).split(' ')[0]; // text-color
                        
                        return (
                          <div key={student.id} className="grid grid-cols-12 gap-4 px-4 py-4 items-center bg-white border border-slate-100 hover:border-slate-300 rounded-2xl transition-colors hover:shadow-sm">
                            
                            {/* Student Profile Info */}
                            <div className="col-span-5 flex items-center gap-3">
                              <div className="relative">
                                <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 font-[900] text-sm flex items-center justify-center border border-slate-200">
                                  {student.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                {idx === 0 && <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 border-2 border-white rounded-full flex items-center justify-center shadow-sm">👑</div>}
                              </div>
                              <span className="font-[800] text-slate-800 text-[14px] truncate">{student.name}</span>
                            </div>

                            {/* Performance Bar */}
                            <div className="col-span-4 flex flex-col justify-center gap-1.5">
                              <div className="flex justify-between items-end">
                                <span className="font-bold text-slate-800 text-[13px]">{student.score} <span className="text-[10px] text-slate-400">/ {student.maxScore}</span></span>
                                <span className={`font-black text-[11px] ${textClass}`}>{percent}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${percent}%` }}></div>
                              </div>
                            </div>

                            {/* Time Taken */}
                            <div className="col-span-3 flex justify-end">
                              <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                                <Clock size={12} className="text-slate-400" />
                                <span className="text-xs font-bold text-slate-600 tracking-tight">{student.timeTaken}</span>
                              </div>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* INDIVIDUAL STUDENT ANALYTICS */}
        {/* ============================================================== */}
        {activeInnerTab === 'student' && (
          <div className="max-w-5xl mx-auto flex flex-col gap-8 pb-12">
            
            {!selectedStudentName ? (
              // 1. STUDENT DIRECTORY LIST VIEW
              <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-10 shadow-sm flex flex-col">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
                      <Users size={20} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">Student Directory</h3>
                      <p className="text-sm font-semibold text-slate-500">Select a student to view their detailed performance analysis.</p>
                    </div>
                  </div>
                  <div className="relative w-full sm:w-[300px]">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search student by name..."
                      value={studentSearch}
                      onChange={handleSearchChange}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredStudentNames.length > 0 ? (
                    filteredStudentNames.map(name => {
                      const data = mockStudentHistory[name];
                      const totalTests = data.length;
                      const avgScore = totalTests > 0 ? Math.round(data.reduce((acc, t) => acc + t.score, 0) / totalTests) : 0;
                      
                      return (
                        <div 
                          key={name}
                          onClick={() => selectStudent(name)}
                          className="group border border-slate-200 rounded-2xl bg-white hover:border-indigo-300 hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden p-5 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 font-black text-xl flex items-center justify-center border border-indigo-200 group-hover:scale-105 transition-transform">
                              {name.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-[800] text-slate-800 text-[17px] group-hover:text-indigo-600 transition-colors tracking-tight">{name}</span>
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mt-1">
                                <span className="bg-slate-100 px-2 py-0.5 rounded-md">{totalTests} Tests</span>
                                <span>•</span>
                                <span className="text-emerald-600">Avg {avgScore}%</span>
                              </div>
                            </div>
                          </div>
                          <div className="p-2 rounded-full bg-slate-50 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors text-slate-400">
                            <ChevronRight size={20} />
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="col-span-2 flex flex-col items-center justify-center p-12 text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                      <Search size={48} className="mb-4 opacity-30" />
                      <p className="text-lg font-bold text-slate-600">No students found matching "{studentSearch}"</p>
                    </div>
                  )}
                </div>
              </div>
            ) : !detailedTestId ? (
              // 2. STUDENT OVERVIEW (Graph + List of Tests)
              <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-10 shadow-sm flex flex-col">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4 border-b border-slate-100 pb-6">
                  <button 
                    onClick={backToStudentList}
                    className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors bg-slate-50 hover:bg-indigo-50 px-4 py-2 rounded-xl"
                  >
                    <ArrowLeft size={16} /> Back to Directory
                  </button>
                </div>

                {activeStudentData.length > 0 ? (
                  <>
                    <div className="flex items-center gap-4 mb-8 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                      <div className="w-16 h-16 rounded-full bg-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-md">
                        {selectedStudentName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-2xl font-[900] text-slate-800">{selectedStudentName}</h4>
                        <p className="text-sm font-bold text-indigo-500 mt-0.5">Historical Test Trajectory</p>
                      </div>
                    </div>

                    <div className="w-full h-[280px] mb-12">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={activeStudentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="testName" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} />
                          <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} />
                          <RechartsTooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', padding: '12px 16px' }} />
                          <Line type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={5} dot={{ r: 5, fill: '#4f46e5', strokeWidth: 3, stroke: '#fff' }} activeDot={{ r: 8, stroke: '#e0e7ff', strokeWidth: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Clean List of Test Cards */}
                    <div>
                      <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 text-center">Test History</h4>
                      <div className="flex flex-col gap-4">
                        {activeStudentData.map(test => (
                          <div 
                            key={test.id} 
                            onClick={() => openStudentTestDetail(test.id)}
                            className="group border border-slate-200 rounded-2xl bg-white hover:border-blue-300 hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden"
                          >
                            <div className="p-5 flex items-center justify-between">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800 text-lg group-hover:text-blue-600 transition-colors">{test.testName}</span>
                                <span className="text-sm font-bold text-slate-500 mt-0.5">Score: <span className="text-blue-600">{test.score}%</span></span>
                              </div>
                              <div className="flex items-center gap-5 text-slate-400">
                                <div className="flex items-center gap-1.5 text-sm font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
                                  <Clock size={16} className="text-blue-500" /> {test.timeTaken}
                                </div>
                                <div className="p-2 rounded-full bg-slate-50 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                  <ChevronRight size={20} />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center flex-1 text-slate-400 min-h-[400px]">
                    <Users size={64} className="mb-6 opacity-30" />
                    <p className="text-xl font-bold text-slate-600 mb-2">No Student Data Found</p>
                    <p className="text-sm font-medium text-slate-400">Search for an enrolled student to view their analytics trajectory.</p>
                  </div>
                )}
              </div>
            ) : (
              // 3. DRILLED-DOWN DETAILED TEST VIEW                               
              <div className="flex flex-col">
                {/* Back Button & Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm mb-6">
                  <div className="flex flex-col items-start gap-4">
                    <button 
                      onClick={closeStudentTestDetail}
                      className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors bg-slate-50 hover:bg-indigo-50 px-3 py-1.5 rounded-lg"
                    >
                      <ArrowLeft size={16} /> Back to Student Overview
                    </button>
                    <div>
                      <h4 className="text-[26px] font-[900] tracking-tight text-slate-800">{activeDetailedTest.testName}</h4>
                      <p className="text-sm font-bold text-slate-500 mt-1">Detailed Performance Breakdown for {selectedStudentName}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end mt-6 sm:mt-0 bg-blue-50/50 px-6 py-4 rounded-2xl border border-blue-100">
                    <span className="text-4xl font-[900] text-blue-600">{activeDetailedTest.score}%</span>
                    <span className="text-xs font-black text-blue-400 uppercase tracking-widest mt-1">Final Score</span>
                  </div>
                </div>

                {/* Key Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
                    <span className="text-2xl font-[900] text-slate-700">{activeDetailedTest.attempted}/{activeDetailedTest.totalQ}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Attempted</span>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex flex-col items-center text-center">
                    <span className="text-2xl font-[900] text-emerald-700">{activeDetailedTest.correct}</span>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mt-1">Correct</span>
                  </div>
                  <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex flex-col items-center text-center">
                    <span className="text-2xl font-[900] text-red-700">{activeDetailedTest.wrong}</span>
                    <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider mt-1">Wrong</span>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex flex-col items-center text-center">
                    <span className="text-2xl font-[900] text-amber-700">{activeDetailedTest.negMarks}</span>
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mt-1">Negative Marks</span>
                  </div>
                </div>

                {/* Filter Bar */}
                <div className="flex flex-wrap items-center gap-2 mb-8 bg-slate-50 p-2 rounded-xl border border-slate-200">
                  {['All', 'Correct', 'Wrong', 'Unattempted'].map(status => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${filterStatus === status ? 'bg-white shadow-sm border border-slate-200 text-slate-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                    >
                      {status} ({status === 'All' ? activeDetailedTest.allQuestions.length : activeDetailedTest.allQuestions.filter(q => q.status === status).length})
                    </button>
                  ))}
                </div>

                {/* Detailed Questions List */}
                <div className="space-y-6">
                  {(() => {
                    const filteredQuestions = filterStatus === 'All' 
                      ? activeDetailedTest.allQuestions 
                      : activeDetailedTest.allQuestions.filter(q => q.status === filterStatus);

                    return filteredQuestions.length > 0 ? (
                      filteredQuestions.map((q, i) => (
                        <div key={i} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
                          
                          {/* Header of Question */}
                          <div className={`px-6 py-4 border-b flex justify-between items-center ${q.status === 'Correct' ? 'bg-emerald-50 border-emerald-100' : q.status === 'Wrong' ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-black text-slate-500 bg-white border border-slate-200 w-8 h-8 flex items-center justify-center rounded-xl shadow-sm">
                                Q{activeDetailedTest.allQuestions.findIndex(origQ => origQ.q === q.q) + 1}
                              </span>
                              {q.status === 'Correct' && <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700"><CheckCircle2 size={16} className="text-emerald-500"/> Correct</span>}
                              {q.status === 'Wrong' && <span className="flex items-center gap-1.5 text-xs font-bold text-red-700"><XCircle size={16} className="text-red-500"/> Wrong</span>}
                              {q.status === 'Unattempted' && <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600"><MinusCircle size={16} className="text-slate-400"/> Unattempted</span>}
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm">
                              <Clock size={14} className="text-blue-500" />
                              {q.timeSpent}
                            </div>
                          </div>

                          <div className="p-6">
                            <p className="font-[800] text-slate-800 mb-6 text-base leading-relaxed tracking-tight">{q.q}</p>
                            
                            <div className="flex flex-col gap-4 mb-6">
                              {/* Student Selected */}
                              <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                <div className="mt-0.5 shrink-0 bg-white p-1.5 rounded-full shadow-sm border border-slate-200">
                                  {q.status === 'Correct' ? <CheckCircle2 className="text-emerald-500" size={18} /> : q.status === 'Wrong' ? <XCircle className="text-red-500" size={18} /> : <MinusCircle className="text-slate-400" size={18} />}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Student Selected</span>
                                  <span className={`font-[700] text-[15px] ${q.status === 'Correct' ? 'text-emerald-700' : q.status === 'Wrong' ? 'text-red-700' : 'text-slate-600'}`}>{q.selected || "Left Blank"}</span>
                                </div>
                              </div>
                              
                              {/* Correct Answer */}
                              {q.status !== 'Correct' && (
                                <div className="flex items-start gap-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                                  <div className="mt-0.5 shrink-0 bg-white p-1.5 rounded-full shadow-sm border border-emerald-200">
                                    <CheckCircle2 className="text-emerald-500" size={18} />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[11px] font-bold text-emerald-600/70 uppercase tracking-widest mb-1.5">Correct Answer</span>
                                    <span className="font-[700] text-[15px] text-emerald-800">{q.correct}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <div className="pt-5 border-t border-slate-100">
                              <div className="flex items-center gap-3 text-[15px] text-slate-600 bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                                <AlertCircle className="shrink-0 text-blue-500" size={20} />
                                <p className="leading-relaxed"><span className="font-bold text-slate-800 mr-1">Explanation:</span> {q.explanation}</p>
                              </div>
                            </div>
                          </div>

                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center border-2 border-dashed border-slate-300 bg-slate-50 rounded-2xl flex flex-col items-center justify-center mt-4">
                        <Filter size={32} className="text-slate-300 mb-3" />
                        <p className="text-base font-bold text-slate-600">No questions found matching this filter.</p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
