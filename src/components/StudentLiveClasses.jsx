import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, 
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Clock, 
  Users,
  Send,
  MessageCircle
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import AgoraRTC, { 
  AgoraRTCProvider, 
  useRTCClient, 
  useLocalCameraTrack, 
  useLocalMicrophoneTrack,
  usePublish, 
  useJoin, 
  useRemoteUsers,
  useRemoteVideoTracks,
  useRemoteAudioTracks,
  RemoteUser,
  LocalVideoTrack
} from "agora-rtc-react";
// Extracted StudentCall component for custom Agora rendering
const StudentCall = ({ appId, channel, token, handleLeaveMeet }) => {
  const [micOn, setMicOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);

  useJoin({ appid: appId, channel: channel, token: token, uid: null });

  const { localMicrophoneTrack } = useLocalMicrophoneTrack(true);
  const { localCameraTrack } = useLocalCameraTrack(true);

  useEffect(() => {
    if (localMicrophoneTrack) {
      localMicrophoneTrack.setMuted(!micOn).catch(console.error);
    }
  }, [micOn, localMicrophoneTrack]);

  useEffect(() => {
    if (localCameraTrack) {
      localCameraTrack.setEnabled(cameraOn).catch(console.error);
    }
  }, [cameraOn, localCameraTrack]);

  const tracksToPublish = [];
  if (localMicrophoneTrack) tracksToPublish.push(localMicrophoneTrack);
  if (localCameraTrack) tracksToPublish.push(localCameraTrack);

  usePublish(tracksToPublish);

  const remoteUsers = useRemoteUsers();
  
  // Actually trigger subscriptions for the remote users
  useRemoteVideoTracks(remoteUsers);
  useRemoteAudioTracks(remoteUsers);

  return (
    <div className="flex-1 flex flex-col relative bg-black">
      {/* Video Grid */}
      <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-fr">
        <div className="relative rounded-2xl overflow-hidden bg-slate-900 shadow-xl border border-slate-800">
          {localCameraTrack && <LocalVideoTrack track={localCameraTrack} play={true} className="w-full h-full object-cover" />}
          <div className="absolute bottom-4 left-4 bg-black/70 px-3 py-1 rounded-lg text-white text-sm font-bold shadow-md">You (Student)</div>
        </div>
        {remoteUsers.map(user => (
          <div key={user.uid} className="relative rounded-2xl overflow-hidden bg-slate-900 shadow-xl border border-slate-800">
            <RemoteUser user={user} className="w-full h-full object-cover" />
            <div className="absolute bottom-4 left-4 bg-black/70 px-3 py-1 rounded-lg text-white text-sm font-bold shadow-md">Remote User</div>
          </div>
        ))}
      </div>

      {/* Custom Control Bar (Blue theme with outlined icons) */}
      <div className="h-20 bg-[#0078FF] flex items-center justify-around px-8 shadow-[0_-4px_20px_rgba(0,120,255,0.3)]">
        <div className="flex items-center gap-12">
          {/* Camera Button */}
          <button 
            onClick={() => setCameraOn(!cameraOn)} 
            className="w-12 h-12 rounded-full border-[1.5px] border-white flex items-center justify-center text-white hover:bg-white/20 transition-all"
            title={cameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
          >
            {cameraOn ? <Video size={22} strokeWidth={1.5} /> : <VideoOff size={22} strokeWidth={1.5} />}
          </button>
          
          {/* Mic Button */}
          <button 
            onClick={() => setMicOn(!micOn)} 
            className="w-12 h-12 rounded-full border-[1.5px] border-white flex items-center justify-center text-white hover:bg-white/20 transition-all"
            title={micOn ? 'Mute' : 'Unmute'}
          >
            {micOn ? <Mic size={22} strokeWidth={1.5} /> : <MicOff size={22} strokeWidth={1.5} />}
          </button>
        </div>
        
        {/* End Call Button */}
        <button 
          onClick={() => handleLeaveMeet()} 
          className="w-12 h-12 rounded-full bg-[#FF3B30] text-white flex items-center justify-center transition-all hover:bg-red-600 shadow-[0_0_15px_rgba(255,59,48,0.4)]"
          title="Leave Call"
        >
          <PhoneOff size={22} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
};

export default function StudentLiveClasses({ department }) {
  const [agoraClient] = useState(() => AgoraRTC.createClient({ mode: "rtc", codec: "vp8" }));
  const [isInCall, setIsInCall] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [activeClasses, setActiveClasses] = useState([]);
  
  // Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const chatEndRef = useRef(null);

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

  useEffect(() => {
    if (!isInCall || !currentSession) return;
    const q = query(collection(db, 'live_chats'), where('sessionId', '==', currentSession.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      messages.sort((a, b) => (a.timestamp?.toMillis() || 0) - (b.timestamp?.toMillis() || 0));
      setChatMessages(messages);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return () => unsubscribe();
  }, [isInCall, currentSession]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentSession) return;
    
    try {
      await addDoc(collection(db, 'live_chats'), {
        sessionId: currentSession.id,
        senderName: localStorage.getItem('auth_name') || 'Student',
        senderEmail: localStorage.getItem('auth_email') || '',
        message: newMessage,
        timestamp: serverTimestamp()
      });
      setNewMessage("");
    } catch (err) {
      console.error("Error sending message", err);
    }
  };

  const handleJoinMeet = (cls) => {
    setCurrentSession(cls);
    setIsInCall(true);
  };

  const handleLeaveMeet = () => {
    setCurrentSession(null);
    setIsInCall(false);
    
    // Force release camera/mic hardware locks
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  if (isInCall && currentSession) {
    const rtcProps = {
      appId: import.meta.env.VITE_AGORA_APP_ID || '',
      channel: 'MS_ACADEMY',
      token: import.meta.env.VITE_AGORA_TEMP_TOKEN || null,
      role: 'host',
      layout: 0,
      enableScreensharing: true
    };

    const callbacks = {
      EndCall: () => handleLeaveMeet(),
    };

    return (
      <div className="fixed inset-0 z-[100] bg-[#111827] w-full h-full flex overflow-hidden">
        
        {/* Dynamic Watermark Overlay to discourage screenshots/recording */}
        <div className="absolute inset-0 pointer-events-none z-[100] overflow-hidden flex flex-wrap gap-x-20 gap-y-32 p-10 justify-center items-center opacity-30 mix-blend-overlay">
           {Array.from({ length: 20 }).map((_, i) => (
             <div key={i} className="text-white text-lg font-black whitespace-nowrap select-none -rotate-12">
               {localStorage.getItem('auth_email') || 'student@msacademy.com'}
             </div>
           ))}
        </div>

        {/* Top Header overlay for aesthetics */}
        <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
           <div className="flex items-center gap-3">
             <div className="bg-red-500/20 text-red-500 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 backdrop-blur-md border border-red-500/30">
               <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
               LIVE
             </div>
             <span className="font-bold text-sm text-slate-200">{currentSession?.subject || "Live Session"} - {currentSession?.topic}</span>
           </div>
        </div>

        {!rtcProps.appId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-white p-8 text-center z-40">
            <h3 className="text-2xl font-bold text-red-400 mb-4">Agora App ID Missing</h3>
            <p className="text-slate-300 max-w-md">The teacher has not configured the live streaming service properly.</p>
            <button onClick={handleLeaveMeet} className="mt-6 px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold transition-colors">Go Back</button>
          </div>
        ) : (
          <div className="flex-1 w-full h-full flex overflow-hidden">
            <div className="flex-1 flex flex-col relative bg-black">
            <AgoraRTCProvider client={agoraClient}>
              <StudentCall 
                appId={rtcProps.appId} 
                channel={rtcProps.channel} 
                token={rtcProps.token} 
                handleLeaveMeet={handleLeaveMeet}
              />
            </AgoraRTCProvider>
            </div>
            
            {/* CHAT SIDEBAR */}
            <div className="w-80 border-l border-slate-800 bg-slate-900 flex flex-col">
              <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center gap-2">
                <MessageCircle size={18} className="text-blue-400"/>
                <h3 className="text-white font-bold text-sm">Live Chat</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.length === 0 ? (
                  <div className="text-center text-slate-500 text-sm mt-10">No messages yet. Say hi!</div>
                ) : (
                  chatMessages.map(msg => (
                    <div key={msg.id} className="flex flex-col">
                      <span className="text-[11px] font-bold text-slate-500 mb-1">{msg.senderName}</span>
                      <div className={`px-3 py-2 rounded-xl text-sm max-w-[90%] break-words ${msg.senderEmail === localStorage.getItem('auth_email') ? 'bg-blue-600 text-white self-end rounded-tr-sm' : 'bg-slate-800 text-slate-200 self-start rounded-tl-sm'}`}>
                        {msg.message}
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>
              
              <form onSubmit={sendMessage} className="p-3 border-t border-slate-800 bg-slate-900">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-slate-800 border-none rounded-lg px-3 py-2 text-sm text-white placeholder-slate-400 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                  <button type="submit" disabled={!newMessage.trim()} className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors">
                    <Send size={16} />
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
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
