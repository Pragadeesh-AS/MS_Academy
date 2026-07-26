import React, { useState, useEffect } from 'react';
import { 
  Video, 
  Clock, 
  Users
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { JitsiMeeting } from '@jitsi/react-sdk';

export default function StudentLiveClasses({ department }) {
  const [isInCall, setIsInCall] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [activeClasses, setActiveClasses] = useState([]);

  useEffect(() => {
    if (!department) return;

    const q = query(
      collection(db, 'live_sessions'),
      where('department', '==', department),
      where('status', '==', 'live')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessions = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        sessions.push({
          id: doc.id,
          subject: data.subject || 'General Class',
          topic: data.topic || 'Live Session',
          teacher: data.teacherName || 'Teacher',
          time: 'Started recently',
          students: '...', // Mocked student count for now
          isLive: true,
          ...data
        });
      });
      setActiveClasses(sessions);
    });

    return () => unsubscribe();
  }, [department]);

  const handleJoinMeet = (cls) => {
    setCurrentSession(cls);
    setIsInCall(true);
  };

  const handleLeaveMeet = () => {
    setCurrentSession(null);
    setIsInCall(false);
  };

  if (isInCall && currentSession) {
    return (
      <div className="bg-[#111827] rounded-3xl overflow-hidden shadow-2xl h-[calc(100vh-140px)] w-full relative transition-all duration-300 mt-6 animate-in fade-in zoom-in-95">
        
        {/* Top Header overlay for aesthetics (Jitsi renders below it) */}
        <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
          <div className="flex items-center gap-3">
            <div className="bg-red-500/20 text-red-500 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 backdrop-blur-md border border-red-500/30">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              LIVE
            </div>
            <span className="font-bold text-sm text-slate-200">{currentSession?.subject || "Live Session"} - {currentSession?.topic}</span>
          </div>
        </div>

        <JitsiMeeting
          domain="meet.jit.si"
          roomName={`MSAcademy_Class_${currentSession.id}`}
          configOverwrite={{
            startWithAudioMuted: true,
            startWithVideoMuted: true,
            requireDisplayName: true
          }}
          interfaceConfigOverwrite={{
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true
          }}
          userInfo={{
            displayName: localStorage.getItem('auth_name') || 'Student',
            email: localStorage.getItem('auth_email')
          }}
          getIFrameRef={(iframeRef) => { iframeRef.style.height = '100%'; iframeRef.style.width = '100%'; }}
        />

        {/* Leave Call Button overlay */}
        <button 
          onClick={handleLeaveMeet}
          className="absolute bottom-6 right-6 px-6 h-12 rounded-xl flex items-center justify-center bg-red-600 hover:bg-red-700 text-white font-bold transition-all shadow-[0_4px_14px_rgba(220,38,38,0.4)] hover:shadow-[0_6px_20px_rgba(220,38,38,0.6)] z-50 border border-white/20"
        >
          Leave Class
        </button>
      </div>
    );
  }

  // Regular Dashboard View for Live Sessions
  return (
    <div className="space-y-8 mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Active & Scheduled Classes */}
      <div>
        <h2 className="text-xl font-[900] text-slate-900 mb-5">Today's Live Sessions</h2>
        
        <div className="space-y-4">
          {activeClasses.map((cls) => (
            <div key={cls.id} className="p-5 border border-slate-200 rounded-2xl hover:border-blue-300 hover:shadow-md transition-all group bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  {cls.isLive ? (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-600 rounded-md text-xs font-bold uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Live Now
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-bold uppercase tracking-wider">
                      <Clock size={12} /> Scheduled
                    </span>
                  )}
                  <div className={`text-sm font-bold ${cls.isLive ? 'text-red-600' : 'text-slate-500'}`}>{cls.time}</div>
                </div>
                
                <h4 className="text-lg font-[800] text-slate-900 mb-1">{cls.topic}</h4>
                <p className="text-slate-500 font-medium text-[14px]">{cls.subject} • by {cls.teacher}</p>
                
                <div className="flex items-center gap-4 mt-4 text-[13px] font-semibold text-slate-400">
                  <span className="flex items-center gap-1.5"><Users size={14}/> Live</span>
                </div>
              </div>
              
              <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-2 mt-2 sm:mt-0">
                {cls.isLive ? (
                  <button 
                    onClick={() => handleJoinMeet(cls)}
                    className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-md shadow-blue-600/20"
                  >
                    Join Class <Video size={16} />
                  </button>
                ) : (
                  <button 
                    disabled
                    className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 text-slate-400 font-bold rounded-xl flex items-center justify-center gap-2 cursor-not-allowed"
                  >
                    Not Started <Clock size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {activeClasses.length === 0 && (
            <div className="text-center p-10 border border-dashed border-slate-300 rounded-2xl bg-slate-50">
              <p className="text-slate-500 font-medium">No active live sessions for your department right now.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
