import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { Users, Clock, Search } from 'lucide-react';

const formatTime = (seconds) => {
  if (!seconds) return '0m 0s';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
};

const getScoreColor = (percentage) => {
  if (percentage >= 80) return 'text-emerald-600 bg-emerald-500';
  if (percentage >= 50) return 'text-amber-500 bg-amber-400';
  return 'text-rose-500 bg-rose-500';
};

export default function TestLeaderboard({ testId, currentStudentEmail }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const attemptsQuery = query(collection(db, 'test_attempts'), where('testId', '==', testId));
        const attemptsSnap = await getDocs(attemptsQuery);
        
        let fetchedStudents = attemptsSnap.docs.map(doc => {
          const data = doc.data();
          let attemptTimeTaken = 0;
          if (data.responses && Array.isArray(data.responses)) {
            attemptTimeTaken = data.responses.reduce((acc, r) => acc + (r.timeSpent || 0), 0);
          }
          const maxScore = data.totalMarks || (data.responses ? data.responses.length : 100);
          
          return {
            id: doc.id,
            name: data.studentName || data.studentEmail || 'Unknown',
            email: data.studentEmail || '',
            score: data.score || 0,
            maxScore: maxScore,
            timeTaken: formatTime(attemptTimeTaken),
            timeSeconds: attemptTimeTaken
          };
        });

        // Sort by score (desc), then time taken (asc)
        fetchedStudents.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return a.timeSeconds - b.timeSeconds;
        });

        setStudents(fetchedStudents);
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (testId) {
      fetchLeaderboard();
    }
  }, [testId]);

  if (loading) {
    return <div className="text-center p-6 text-slate-400 font-bold text-sm">Loading leaderboard...</div>;
  }

  if (error) {
    return <div className="text-center p-6 text-red-400 font-bold text-sm">Leaderboard unavailable: {error}</div>;
  }

  if (students.length === 0) return null;

  const filteredStudents = students.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex flex-col bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mt-8">
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-[15px] font-[900] text-slate-800 flex items-center gap-2">
          <Users size={18} className="text-blue-500"/> Student Leaderboard
        </h4>
        <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 flex items-center gap-2">
          <Search size={14} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search leaderboard..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-xs text-slate-600 font-medium placeholder:text-slate-400 w-32"
          />
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
        {filteredStudents.map((student, idx) => {
          const percent = student.maxScore > 0 ? Math.round((student.score / student.maxScore) * 100) : 0;
          const colorClass = getScoreColor(percent).split(' ')[1]; // bg-color
          const textClass = getScoreColor(percent).split(' ')[0]; // text-color
          
          const isCurrentUser = student.email === currentStudentEmail;

          return (
            <div key={student.id} className={`grid grid-cols-12 gap-4 px-4 py-4 items-center bg-white border ${isCurrentUser ? 'border-blue-300 shadow-md ring-2 ring-blue-50' : 'border-slate-100'} hover:border-slate-300 rounded-2xl transition-colors hover:shadow-sm`}>
              
              {/* Student Profile Info */}
              <div className="col-span-5 flex items-center gap-3">
                <div className="relative">
                  <div className={`w-9 h-9 rounded-full ${isCurrentUser ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'} font-[900] text-sm flex items-center justify-center border`}>
                    {student.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </div>
                  {idx === 0 && <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 border-2 border-white rounded-full flex items-center justify-center shadow-sm">👑</div>}
                </div>
                <span className="font-[800] text-slate-800 text-[14px] truncate flex items-center gap-2">
                  {student.name}
                  {isCurrentUser && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] uppercase tracking-wider rounded-md">You</span>}
                </span>
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
  );
}
