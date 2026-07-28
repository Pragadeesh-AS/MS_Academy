import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, 
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Clock, 
  Users,
  User,
  Send,
  MessageCircle,
  Pin,
  PinOff,
  X
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, setDoc, doc } from 'firebase/firestore';
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
const StudentCall = ({ appId, channel, token, handleLeaveMeet, sessionId, isChatOpen, toggleChat, chatToast, setChatToast }) => {
  const [micOn, setMicOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [pinnedUid, setPinnedUid] = useState(null);
  const [participantNames, setParticipantNames] = useState({});

  useJoin({ appid: appId, channel: channel, token: token, uid: null });
  const client = useRTCClient();

  useEffect(() => {
    if (client.uid && sessionId) {
      const userName = localStorage.getItem('auth_name') || 'Student';
      setDoc(doc(db, 'live_sessions', sessionId, 'participants', client.uid.toString()), {
        name: userName
      }).catch(console.error);
    }
  }, [client.uid, sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const unsub = onSnapshot(collection(db, 'live_sessions', sessionId, 'participants'), (snapshot) => {
      const names = {};
      snapshot.forEach(d => { names[d.id] = d.data().name; });
      setParticipantNames(names);
    });
    return () => unsub();
  }, [sessionId]);

  const { localMicrophoneTrack } = useLocalMicrophoneTrack(micOn);
  const { localCameraTrack } = useLocalCameraTrack(cameraOn);

  // Store a ref to the latest tracks to forcefully close them on component unmount (End Call) or toggle off
  const tracksRef = useRef({ cam: null, mic: null });
  useEffect(() => {
    if (localCameraTrack) tracksRef.current.cam = localCameraTrack;
    if (localMicrophoneTrack) tracksRef.current.mic = localMicrophoneTrack;
  }, [localCameraTrack, localMicrophoneTrack]);

  // Force hardware release when toggled off
  useEffect(() => {
    if (!cameraOn && tracksRef.current.cam) {
      try {
        tracksRef.current.cam.setEnabled(false);
        tracksRef.current.cam.stop();
        tracksRef.current.cam.close();
      } catch (e) {}
      tracksRef.current.cam = null;
    }
    if (!micOn && tracksRef.current.mic) {
      try {
        tracksRef.current.mic.setEnabled(false);
        tracksRef.current.mic.stop();
        tracksRef.current.mic.close();
      } catch (e) {}
      tracksRef.current.mic = null;
    }
  }, [cameraOn, micOn]);

  useEffect(() => {
    return () => {
      if (tracksRef.current.cam) {
        try {
          tracksRef.current.cam.stop();
          tracksRef.current.cam.close();
        } catch (e) {}
      }
      if (tracksRef.current.mic) {
        try {
          tracksRef.current.mic.stop();
          tracksRef.current.mic.close();
        } catch (e) {}
      }
    };
  }, []);

  const tracksToPublish = [];
  if (localMicrophoneTrack) tracksToPublish.push(localMicrophoneTrack);
  if (localCameraTrack) tracksToPublish.push(localCameraTrack);

  usePublish(tracksToPublish);

  const remoteUsers = useRemoteUsers();
  const remoteUserStyle = { width: '100%', height: '100%' };
  
  // Actually trigger subscriptions for the remote users
  useRemoteVideoTracks(remoteUsers);
  useRemoteAudioTracks(remoteUsers);

  // Dynamic grid based on participant count
  const totalParticipants = 1 + remoteUsers.length;
  const gridColsClass = 
    totalParticipants === 1 ? 'grid-cols-1 md:grid-cols-1' :
    totalParticipants === 2 ? 'grid-cols-1 md:grid-cols-2' :
    totalParticipants <= 4 ? 'grid-cols-2 md:grid-cols-2' :
    'grid-cols-2 md:grid-cols-3';

  const togglePin = (id) => {
    setPinnedUid(prev => prev === id ? null : id);
  };

  // Auto-pin screen share (UID 999999)
  useEffect(() => {
    const hasScreenShare = remoteUsers.some(u => u.uid === 999999);
    if (hasScreenShare && pinnedUid !== 999999) {
      setPinnedUid(999999);
    } else if (!hasScreenShare && pinnedUid === 999999) {
      setPinnedUid(null); // Unpin when screen share stops
    }
  }, [remoteUsers, pinnedUid]);

  const renderGridTiles = () => {
    const pinnedTiles = [];
    const unpinnedTiles = [];
    
    // 1. Local Camera
    const isLocalPinned = pinnedUid === 'local-camera';
    const localTile = (
      <div key="local-camera" className={`relative rounded-2xl overflow-hidden bg-slate-900 shadow-xl border border-slate-800 group transition-all duration-300 ${isLocalPinned ? 'absolute inset-0 z-0 rounded-none border-none h-full w-full' : (pinnedUid ? 'w-48 h-32 shrink-0 z-50' : 'h-full')}`}>
        {localCameraTrack ? (
          <LocalVideoTrack track={localCameraTrack} play={true} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-800 z-10">
            <div className="w-16 h-16 md:w-24 md:h-24 bg-slate-700 rounded-full flex items-center justify-center shadow-inner">
              <User size={32} className="text-slate-400" />
            </div>
          </div>
        )}
        <div className={`absolute top-2 left-2 md:top-4 md:left-4 bg-black/70 px-2 py-1 md:px-3 md:py-1 rounded-lg text-white text-xs md:text-sm font-bold shadow-md z-30 ${pinnedUid && !isLocalPinned ? 'scale-75 origin-top-left' : ''}`}>You (Student)</div>
        <button onClick={() => togglePin('local-camera')} className="absolute top-2 right-2 md:top-4 md:right-4 p-2 bg-black/50 hover:bg-blue-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all z-30">
            {isLocalPinned ? <PinOff size={16} /> : <Pin size={16} />}
        </button>
      </div>
    );
    
    if (isLocalPinned) pinnedTiles.push(localTile);
    else unpinnedTiles.push(localTile);
    
    // 2. Remote Users
    remoteUsers.forEach(user => {
      const isPinned = pinnedUid === user.uid;
      let userName = participantNames[user.uid] || `Remote User`;
      
      // If it's the Teacher's Screen Share Client (UID 999999), hardcode the label and icon
      if (user.uid === 999999) {
        userName = "Teacher's Screen";
      }

      const remoteTile = (
        <div key={user.uid} className={`relative rounded-2xl overflow-hidden bg-slate-900 shadow-xl border border-slate-800 group transition-all duration-300 ${isPinned ? 'absolute inset-0 z-0 rounded-none border-none h-full w-full' : (pinnedUid ? 'w-48 h-32 shrink-0 z-50' : 'h-full')}`}>
          <div className="absolute inset-0">
            <RemoteUser user={user} style={remoteUserStyle} />
          </div>
          {!user.hasVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-800 z-10">
              <div className="w-16 h-16 md:w-24 md:h-24 bg-slate-700 rounded-full flex items-center justify-center shadow-inner">
                <User size={32} className="text-slate-400" />
              </div>
            </div>
          )}
          <div className={`absolute top-2 left-2 md:top-4 md:left-4 px-2 py-1 md:px-3 md:py-1 rounded-lg text-white text-xs md:text-sm font-bold shadow-md z-30 transition-opacity ${user.uid === 999999 ? 'bg-blue-600/90' : 'bg-black/70'} ${pinnedUid && !isPinned ? 'scale-75 origin-top-left' : ''}`}>
            {userName} {!user.hasAudio && user.uid !== 999999 && <MicOff size={12} className="inline ml-1 text-red-400" />}
          </div>
          <button onClick={() => togglePin(user.uid)} className="absolute top-2 right-2 md:top-4 md:right-4 p-2 bg-black/50 hover:bg-blue-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all z-30">
            {isPinned ? <PinOff size={16} /> : <Pin size={16} />}
          </button>
        </div>
      );
      
      if (isPinned) pinnedTiles.push(remoteTile);
      else unpinnedTiles.push(remoteTile);
    });
    
    return { pinnedTiles, unpinnedTiles };
  };

  const { pinnedTiles, unpinnedTiles } = renderGridTiles();
  const isScreenSharePinned = pinnedUid === 999999 || pinnedUid === 'local-screen';

  return (
    <div className="flex-1 flex flex-col relative bg-black">
      {/* Video Grid */}
      <div className={`flex-1 relative ${pinnedUid ? 'overflow-hidden' : `p-4 grid ${gridColsClass} gap-4 auto-rows-fr`}`}>
        {pinnedUid ? (
          <>
            {/* The single pinned video taking the full background */}
            {pinnedTiles}
            
            {/* Small floating PIP videos container (Vertical Stack) */}
            <div className={`absolute bottom-28 ${isScreenSharePinned ? 'right-6' : 'left-6'} z-[90] flex flex-col gap-3 max-h-[calc(100vh-250px)] overflow-y-auto pr-2 custom-scrollbar`}>
              {unpinnedTiles}
            </div>
          </>
        ) : (
          unpinnedTiles
        )}
      </div>

      {/* Custom Control Bar (Glassmorphic Theme mimicking Navbar) */}
      <div 
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 px-8 py-4 rounded-full z-[100] transition-all duration-500 hover:scale-[1.02]"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.15)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          boxShadow: "rgba(0, 0, 0, 0.3) 0px 20px 40px -10px, inset 0px 1px 1px rgba(255, 255, 255, 0.4), inset 0px 0px 0px 1px rgba(255, 255, 255, 0.15)"
        }}
      >
        <div className="flex items-center gap-6 pr-6 border-r border-white/20">
          {/* Camera Button */}
          <button 
            onClick={() => setCameraOn(!cameraOn)} 
            className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${cameraOn ? 'control-btn' : 'control-btn off'}`}
            title={cameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
          >
            {cameraOn ? <Video size={22} strokeWidth={1.5} /> : <VideoOff size={22} strokeWidth={1.5} />}
          </button>
          
          {/* Mic Button */}
          <button 
            onClick={() => setMicOn(!micOn)} 
            className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${micOn ? 'control-btn' : 'control-btn off'}`}
            title={micOn ? 'Mute' : 'Unmute'}
          >
            {micOn ? <Mic size={22} strokeWidth={1.5} /> : <MicOff size={22} strokeWidth={1.5} />}
          </button>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Chat Button */}
          <button 
            onClick={toggleChat} 
            className={`w-12 h-12 rounded-full flex items-center justify-center relative text-white ${isChatOpen ? 'control-btn' : 'control-btn off'}`}
            title={isChatOpen ? 'Close Chat' : 'Open Chat'}
          >
            <MessageCircle size={22} strokeWidth={1.5} />
          </button>
          
          {/* End Call Button */}
          <button 
            onClick={() => handleLeaveMeet()} 
            className="w-12 h-12 rounded-full text-white flex items-center justify-center control-btn-danger"
            title="Leave Class"
          >
            <PhoneOff size={22} strokeWidth={1.5} />
          </button>
        </div>
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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatToast, setChatToast] = useState({ show: false, sender: '', message: '' });
  const prevMessagesLength = useRef(0);

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
      
      if (prevMessagesLength.current > 0 && messages.length > prevMessagesLength.current && !isChatOpen) {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg.senderEmail !== localStorage.getItem('auth_email')) {
          setChatToast({ show: true, sender: lastMsg.senderName, message: lastMsg.message });
          setTimeout(() => setChatToast(prev => ({ ...prev, show: false })), 5000);
        }
      }
      prevMessagesLength.current = messages.length;
      
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

  const handleLeaveMeet = async () => {
    if (agoraClient) {
      try {
        await agoraClient.leave();
        agoraClient.removeAllListeners();
      } catch (e) {
        console.error("Error leaving Agora channel:", e);
      }
    }
    setCurrentSession(null);
    setIsInCall(false);
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
        


        {/* Top Header overlay for aesthetics */}
        <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
           <div className="flex items-center gap-3">
             <div className="bg-red-500/20 text-red-500 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 backdrop-blur-md border border-red-500/30">
               <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
               LIVE
             </div>
             <span className="font-bold text-sm text-slate-200">{currentSession?.topic} - Live Session</span>
           </div>
        </div>

        {!rtcProps.appId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-white p-8 text-center z-40">
            <h3 className="text-2xl font-bold text-red-400 mb-4">Agora App ID Missing</h3>
            <p className="text-slate-300 max-w-md">The teacher has not configured the live streaming service properly.</p>
            <button onClick={handleLeaveMeet} className="mt-6 px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold transition-colors">Go Back</button>
          </div>
        ) : (
          <div className="absolute inset-0 z-50 flex flex-col bg-slate-900">
          {chatToast.show && (
            <div className="absolute top-6 right-6 bg-slate-800 border border-slate-700 text-white p-4 rounded-xl shadow-2xl z-50 flex flex-col gap-1 min-w-[280px] animate-in slide-in-from-top-4 duration-300">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-400 text-sm">{chatToast.sender}</span>
                <button onClick={() => setChatToast({ show: false })}><X size={14} className="text-slate-400 hover:text-white"/></button>
              </div>
              <p className="text-sm text-slate-300 truncate max-w-[240px]">{chatToast.message}</p>
              <button onClick={() => { setChatToast({ show: false }); setIsChatOpen(true); }} className="text-xs text-blue-400 font-bold mt-2 text-left hover:text-blue-300 transition-colors uppercase tracking-wider">Reply</button>
            </div>
          )}
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col relative bg-black">
            <AgoraRTCProvider client={agoraClient}>
              <StudentCall 
                appId={rtcProps.appId} 
                channel={rtcProps.channel} 
                token={rtcProps.token}
                sessionId={currentSession.id}
                handleLeaveMeet={handleLeaveMeet}
                isChatOpen={isChatOpen}
                toggleChat={() => setIsChatOpen(!isChatOpen)}
                chatToast={chatToast}
                setChatToast={setChatToast}
              />
            </AgoraRTCProvider>
            </div>
            
            {/* CHAT SIDEBAR */}
            {isChatOpen && (
            <div className="w-80 border-l border-slate-800 bg-slate-900 flex flex-col animate-in slide-in-from-right duration-300">
              <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MessageCircle size={18} className="text-blue-400"/>
                  <h3 className="text-white font-bold text-sm">Live Chat</h3>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X size={18} />
                </button>
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
            )}
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
                <p className="text-slate-500 font-medium text-[14px]">by {cls.teacher}</p>
                
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
