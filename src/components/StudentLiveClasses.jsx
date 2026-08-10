import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  X,
  CheckCircle2,
  WifiOff,
  Lock
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import AgoraRTC, { 
  AgoraRTCProvider, 
  useRTCClient, 
  useJoin, 
  usePublish,
  useRemoteUsers,
  useRemoteVideoTracks,
  useRemoteAudioTracks,
  LocalVideoTrack,
  RemoteUser,
  useConnectionState,
  useLocalMicrophoneTrack,
  useLocalCameraTrack,
  useNetworkQuality
} from "agora-rtc-react";

// Extracted StudentCall component for custom Agora rendering
const StudentCall = ({ appId, channel, token, handleLeaveMeet, sessionId, isChatOpen, toggleChat, chatToast, setChatToast }) => {
  const [micOn, setMicOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [pinnedUid, setPinnedUid] = useState(null);
  const [participantNames, setParticipantNames] = useState({});
  const [participantRoles, setParticipantRoles] = useState({});

  useJoin({ appid: appId, channel: channel, token: token, uid: null });
  const client = useRTCClient();
  const connectionState = useConnectionState();

  useEffect(() => {
    if (client.uid && sessionId) {
      const userName = localStorage.getItem('auth_name') || 'Student';
      setDoc(doc(db, 'live_sessions', sessionId, 'participants', client.uid.toString()), {
        name: userName,
        role: 'student'
      }).catch(console.error);
    }
  }, [client.uid, sessionId]);

  const [activeQuestionState, setActiveQuestionState] = useState(null);
  const [studentGuess, setStudentGuess] = useState(null); // The option the student guessed

  useEffect(() => {
    if (!sessionId) return;
    
    // Listen to participant names and roles
    const unsubParticipants = onSnapshot(collection(db, 'live_sessions', sessionId, 'participants'), (snapshot) => {
      const names = {};
      const roles = {};
      snapshot.forEach(d => { 
        names[d.id] = d.data().name; 
        roles[d.id] = d.data().role;
      });
      setParticipantNames(names);
      setParticipantRoles(roles);
    });

    // Listen for session state (Question Bank sync)
    const unsubSession = onSnapshot(doc(db, 'live_sessions', sessionId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.activeQuestionState) {
          // If the question changed, reset the student's guess
          setActiveQuestionState(prevState => {
            if (prevState && data.activeQuestionState && prevState.currentIndex !== data.activeQuestionState.currentIndex) {
              setStudentGuess(null);
            }
            return data.activeQuestionState;
          });
        } else {
          setActiveQuestionState(null);
          setStudentGuess(null);
        }
      }
    });

    return () => {
      unsubParticipants();
      unsubSession();
    };
  }, [sessionId]);

  const [localMicrophoneTrack, setLocalMicrophoneTrack] = useState(null);
  const [localCameraTrack, setLocalCameraTrack] = useState(null);

  useEffect(() => {
    let activeTrack = null;
    if (cameraOn) {
      AgoraRTC.createCameraVideoTrack().then(track => {
        activeTrack = track;
        setLocalCameraTrack(track);
      }).catch(console.error);
    } else {
      setLocalCameraTrack(prev => {
        if (prev) {
          try {
            prev.stop();
            prev.close();
          } catch(e) {}
        }
        return null;
      });
    }
    return () => {
      if (activeTrack) {
        try {
          activeTrack.stop();
          activeTrack.close();
        } catch(e) {}
      }
    };
  }, [cameraOn]);

  useEffect(() => {
    let activeTrack = null;
    if (micOn) {
      AgoraRTC.createMicrophoneAudioTrack().then(track => {
        activeTrack = track;
        setLocalMicrophoneTrack(track);
      }).catch(console.error);
    } else {
      setLocalMicrophoneTrack(prev => {
        if (prev) {
          try {
            prev.stop();
            prev.close();
          } catch(e) {}
        }
        return null;
      });
    }
    return () => {
      if (activeTrack) {
        try {
          activeTrack.stop();
          activeTrack.close();
        } catch(e) {}
      }
    };
  }, [micOn]);

  // We are handling publishing manually in useEffects above
  // usePublish([localMicrophoneTrack, localCameraTrack].filter(Boolean));

  useEffect(() => {
    if (localCameraTrack && client.connectionState === 'CONNECTED') {
      client.publish(localCameraTrack).catch(console.error);
      return () => {
        if (client.connectionState === 'CONNECTED') {
          client.unpublish(localCameraTrack).catch(console.error);
        }
      };
    }
  }, [localCameraTrack, client, client.connectionState]);

  useEffect(() => {
    if (localMicrophoneTrack && client.connectionState === 'CONNECTED') {
      client.publish(localMicrophoneTrack).catch(console.error);
      return () => {
        if (client.connectionState === 'CONNECTED') {
          client.unpublish(localMicrophoneTrack).catch(console.error);
        }
      };
    }
  }, [localMicrophoneTrack, client, client.connectionState]);

  const remoteUsers = useRemoteUsers();
  const networkQuality = useNetworkQuality();
  const remoteUserStyle = { width: '100%', height: '100%' };

  const getQuality = (uid) => {
    const stats = networkQuality[uid];
    if (!stats) return 0;
    return Math.max(stats.uplinkNetworkQuality, stats.downlinkNetworkQuality);
  };
  
  // Actually trigger subscriptions for the remote users
  useRemoteVideoTracks(remoteUsers);
  useRemoteAudioTracks(remoteUsers);

  // Dynamic grid based on participant count
  const totalParticipants = 1 + remoteUsers.length + (activeQuestionState?.isActive ? 1 : 0);
  const gridColsClass = 
    totalParticipants === 1 ? 'grid-cols-1 md:grid-cols-1' :
    totalParticipants === 2 ? 'grid-cols-1 md:grid-cols-2' :
    totalParticipants <= 4 ? 'grid-cols-2 md:grid-cols-2' :
    'grid-cols-2 md:grid-cols-3';

  const togglePin = (id) => {
    setPinnedUid(prev => prev === id ? null : id);
  };

  // Auto-pin screen share (UID 999999) or whiteboard (UID 999998) or Question Bank
  useEffect(() => {
    const hasScreenShare = remoteUsers.some(u => u.uid === 999999);
    const hasWhiteboard = remoteUsers.some(u => u.uid === 999998);
    const hasQuestionBank = activeQuestionState?.isActive;
    
    if (hasQuestionBank && pinnedUid !== 'question-bank') {
      setPinnedUid('question-bank');
    } else if (hasScreenShare && pinnedUid !== 999999 && !hasQuestionBank) {
      setPinnedUid(999999);
    } else if (hasWhiteboard && pinnedUid !== 999998 && !hasQuestionBank && !hasScreenShare) {
      setPinnedUid(999998);
    } else if (!hasScreenShare && !hasWhiteboard && !hasQuestionBank && (pinnedUid === 999999 || pinnedUid === 999998 || pinnedUid === 'question-bank')) {
      setPinnedUid(null); // Unpin when all stop
    }
  }, [remoteUsers, pinnedUid, activeQuestionState?.isActive]);

  const qbWhiteboardUser = remoteUsers.find(u => u.uid === 999997);
  const hasQbWhiteboard = !!qbWhiteboardUser;

  const whiteboardOverlayNode = useMemo(() => {
    if (hasQbWhiteboard && qbWhiteboardUser && pinnedUid === 'question-bank') {
      return (
        <div className="absolute inset-0 z-20 pointer-events-none mix-blend-multiply">
          <RemoteUser user={qbWhiteboardUser} playVideo={true} playAudio={false} style={{ objectFit: 'none', objectPosition: 'top left' }} />
        </div>
      );
    }
    return null;
  }, [hasQbWhiteboard, qbWhiteboardUser?.uid, pinnedUid]);

  const renderGridTiles = () => {
    const pinnedTiles = [];
    const unpinnedTiles = [];
    
    const qbWhiteboardUserLocal = remoteUsers.find(u => u.uid === 999997);
    const hasQbWhiteboardLocal = !!qbWhiteboardUserLocal;
    
    // -1. Question Bank Overlay
    if (activeQuestionState?.isActive && activeQuestionState.questions) {
      const isPinned = pinnedUid === 'question-bank';
      const qbContentNode = (
        <>
          {/* Base Layer: Question Content */}
          <div id="qb-content" className={`absolute inset-0 h-full flex flex-col w-full z-10 pointer-events-none bg-white md:bg-white/90 md:backdrop-blur-sm p-6 md:p-12`}>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 flex flex-col">
              {/* Top: Full Width Question */}
              <div className={`w-full flex font-bold text-slate-900 ${isPinned ? 'text-base md:text-lg mb-6' : 'text-sm mb-4'}`}>
                <div id="qb-qnum" className={`text-slate-500 shrink-0 flex flex-col items-center gap-4 mt-1 ${isPinned ? 'w-16 mr-4' : 'w-10 mr-2'}`}>
                  <span>Q.{activeQuestionState.currentIndex + 1}</span>
                </div>
                <div id="qb-qtext" className="flex-1" dangerouslySetInnerHTML={{ __html: activeQuestionState.questions[activeQuestionState.currentIndex].questionText }} />
              </div>
              
              {/* Bottom: Options (Left 40%) */}
              <div id="qb-options-area" className="w-full md:w-[45%] flex flex-col">
                {activeQuestionState.questions[activeQuestionState.currentIndex].questionImageUrl && (
                  <div className={`${isPinned ? 'ml-20' : 'ml-10'} mb-6`}>
                    <img src={activeQuestionState.questions[activeQuestionState.currentIndex].questionImageUrl} alt="Question" className={`${isPinned ? 'max-h-[30vh]' : 'max-h-16'} object-contain`} />
                  </div>
                )}
                <div className={`flex flex-col gap-4 md:gap-5 ${isPinned ? 'ml-20' : 'ml-10'}`}>
                  {['A', 'B', 'C', 'D'].map(opt => {
                    const text = activeQuestionState.questions[activeQuestionState.currentIndex][`option${opt}`];
                    if (!text) return null;
                    const isCorrect = activeQuestionState.questions[activeQuestionState.currentIndex].correctAnswer === opt;
                    const isGuessed = studentGuess === opt;
                    const isRevealed = activeQuestionState.isAnswerRevealed;

                    let bgClass = 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200';
                    if (isRevealed) {
                      if (isCorrect) bgClass = 'bg-green-100 text-green-800 border-green-300 shadow-sm';
                      else if (isGuessed) bgClass = 'bg-red-50 text-red-700 border-red-200';
                      else bgClass = 'bg-slate-50/50 text-slate-400 border-slate-100';
                    } else if (isGuessed) {
                      bgClass = 'bg-indigo-100 text-indigo-800 border-indigo-300 shadow-sm';
                    }

                    return (
                      <button
                        id={`qb-opt-container-${opt}`}
                        key={opt}
                        onClick={() => !isRevealed && setStudentGuess(opt)}
                        className={`flex items-center text-base md:text-lg font-semibold transition-all p-3 rounded-xl ${bgClass} pointer-events-auto text-left w-max`}
                      >
                        <span id={`qb-opt-prefix-${opt}`} className="mr-4 font-bold shrink-0 whitespace-nowrap">( {opt} )</span> 
                        <span id={`qb-opt-text-${opt}`} dangerouslySetInnerHTML={{ __html: text }} />
                        {isRevealed && isCorrect && <CheckCircle2 size={24} className="inline ml-4 text-green-500 shrink-0" />}
                        {isRevealed && isGuessed && !isCorrect && <X size={24} className="inline ml-4 text-red-500 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      );

      const qbTile = (
        <div key="question-bank" className={`relative overflow-hidden bg-white shadow-xl group transition-all duration-300 ${isPinned ? 'absolute inset-0 z-0 h-full w-full' : 'w-48 h-32 shrink-0 z-50 rounded-2xl pointer-events-none p-4'}`}>
          {qbContentNode}
          {whiteboardOverlayNode}
          {/* Top Layer: Header */}
          {isPinned && (
            <div className={`absolute inset-x-0 top-0 w-full max-w-6xl mx-auto p-8 md:p-12 z-30 pointer-events-none flex justify-between items-start`}>
            </div>
          )}
          
          <button onClick={() => togglePin('question-bank')} className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-blue-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all z-[70] pointer-events-auto">
            {isPinned ? <PinOff size={16} /> : <Pin size={16} />}
          </button>
        </div>
      );
      if (isPinned) pinnedTiles.push(qbTile);
      else unpinnedTiles.push(qbTile);
    }

    // 1. Local Camera
    const isLocalPinned = pinnedUid === 'local-camera';
    const localQuality = getQuality(client.uid);
    const isLocalSlow = localQuality >= 4 && localQuality <= 6;
    const localTile = (
      <div key="local-camera" className={`relative rounded-2xl overflow-hidden bg-slate-900 shadow-xl border border-slate-800 group transition-all duration-300 ${isLocalPinned ? 'absolute inset-0 z-0 rounded-none border-none h-full w-full' : (pinnedUid ? 'w-48 h-32 shrink-0 z-50' : 'h-full')}`}>
        {localCameraTrack && cameraOn ? (
          <LocalVideoTrack track={localCameraTrack} play={true} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-800 z-10">
            <div className="w-16 h-16 md:w-24 md:h-24 bg-slate-700 rounded-full flex items-center justify-center shadow-inner">
              <User size={32} className="text-slate-400" />
            </div>
          </div>
        )}
        <div className={`absolute top-2 left-2 md:top-4 md:left-4 bg-black/70 px-2 py-1 md:px-3 md:py-1 rounded-lg text-white text-xs md:text-sm font-bold shadow-md z-30 ${pinnedUid && !isLocalPinned ? 'scale-75 origin-top-left' : ''}`}>
          You (Student)
          {isLocalSlow && <span className="ml-2 text-red-500 inline-flex items-center gap-1"><WifiOff size={12}/> Slow Network</span>}
        </div>
        <button onClick={() => togglePin('local-camera')} className="absolute top-2 right-2 md:top-4 md:right-4 p-2 bg-black/50 hover:bg-blue-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all z-30">
            {isLocalPinned ? <PinOff size={16} /> : <Pin size={16} />}
        </button>
      </div>
    );
    
    if (isLocalPinned) {
      pinnedTiles.push(localTile);
    } else if (!pinnedUid) {
      unpinnedTiles.push(localTile);
    }
    
    // 2. Remote Users
    remoteUsers.forEach(user => {
      // Hide QB whiteboard stream from standalone tiles
      if (user.uid === 999997) return;

      const isPinned = pinnedUid === user.uid;
      let userName = participantNames[user.uid] || `Remote User`;
      const quality = getQuality(user.uid);
      const isSlow = quality >= 4 && quality <= 6;
      
      // If it's the Teacher's Screen Share Client (UID 999999), hardcode the label and icon
      if (user.uid === 999999) {
        userName = "Teacher's Screen";
      } else if (user.uid === 999998) {
        userName = "Teacher's Whiteboard";
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
          <div className={`absolute top-2 left-2 md:top-4 md:left-4 px-2 py-1 md:px-3 md:py-1 rounded-lg text-white text-xs md:text-sm font-bold shadow-md z-30 transition-opacity ${(user.uid === 999999 || user.uid === 999998) ? 'bg-blue-600/90' : 'bg-black/70'} ${pinnedUid && !isPinned ? 'scale-75 origin-top-left' : ''}`}>
            {userName} 
            {!user.hasAudio && user.uid !== 999999 && user.uid !== 999998 && <MicOff size={12} className="inline ml-1 text-red-400" />}
            {isSlow && <span className="ml-2 text-red-500 inline-flex items-center gap-1"><WifiOff size={12}/> Slow Network</span>}
          </div>
          <button onClick={() => togglePin(user.uid)} className="absolute top-2 right-2 md:top-4 md:right-4 p-2 bg-black/50 hover:bg-blue-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all z-30">
            {isPinned ? <PinOff size={16} /> : <Pin size={16} />}
          </button>
        </div>
      );
      
      const isTeacher = participantRoles[user.uid] === 'teacher' || participantNames[user.uid]?.toLowerCase().includes('teacher') || user.uid === 999999 || user.uid === 999998;

      if (isPinned) {
        pinnedTiles.push(remoteTile);
      } else if (!pinnedUid || isTeacher) {
        unpinnedTiles.push(remoteTile);
      } else {
        // Render visually hidden to maintain audio playback when PIP is restricted.
        // display: none causes some browsers or intersection observers to pause media.
        unpinnedTiles.push(
          <div key={user.uid} className="absolute opacity-0 pointer-events-none w-1 h-1 overflow-hidden">
            <RemoteUser user={user} />
          </div>
        );
      }
    });
    
    return { pinnedTiles, unpinnedTiles };
  };

  const { pinnedTiles, unpinnedTiles } = renderGridTiles();

  return (
    <div className="flex-1 flex flex-col relative bg-black">
      {/* Video Grid */}
      <div className={`flex-1 relative ${pinnedUid ? 'overflow-hidden' : `p-4 grid ${gridColsClass} gap-4 auto-rows-fr`}`}>
        {pinnedUid ? (
          <>
            {/* The single pinned video taking the full background */}
            {pinnedTiles}
            
            {/* Small floating PIP videos container (Vertical Stack) */}
            <div className="absolute bottom-28 right-6 z-[90] flex flex-col gap-3 max-h-[calc(100vh-250px)] overflow-y-auto pl-2 custom-scrollbar">
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

        {/* Connection Status Indicator */}
        <div className="absolute -top-10 right-4 text-xs font-bold px-3 py-1 rounded-full shadow-md bg-black/50 text-white backdrop-blur-md border border-white/10 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connectionState === 'CONNECTED' ? 'bg-green-500' : connectionState === 'CONNECTING' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`}></div>
          {connectionState || 'DISCONNECTED'}
        </div>
      </div>

    </div>
  );
};

export default function StudentLiveClasses({ department, isPro, purchasedBundles = [], bundles = [] }) {
  const [agoraClient] = useState(() => AgoraRTC.createClient({ mode: "rtc", codec: "vp8" }));
  const [isInCall, setIsInCall] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [activeClasses, setActiveClasses] = useState([]);
  
  // Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const chatEndRef = useRef(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
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
          bundleId: data.bundleId || 'free',
          ...data
        });
      });
      setActiveClasses(sessions);
    });

    return () => unsubscribe();
  }, [department]);

  const canAccessClass = (cls) => {
    const isAdmin = cls.teacher === 'Admin' || cls.teacher === 'MS Academy Admin';
    
    let hasExactBundle = false;
    if (cls.bundleId && cls.bundleId !== 'free') {
      if (purchasedBundles && purchasedBundles.includes(cls.bundleId)) {
        const bundle = (bundles || []).find(b => b.id === cls.bundleId);
        if (!bundle || !bundle.permissions || bundle.permissions.includes('live_classes')) {
          hasExactBundle = true;
        }
      }
    } else if (isAdmin) {
      hasExactBundle = true;
    }

    if (hasExactBundle) return true;
    if (isPro) return true;
    
    // Check if they own any bundle for this department that has the 'live_classes' permission
    const studentPurchasedDeptBundles = (bundles || []).filter(b => 
      purchasedBundles.includes(b.id) && 
      b.department === cls.department &&
      (b.permissions?.includes('live_classes') || !b.permissions)
    );
    if (studentPurchasedDeptBundles.length > 0) return true;
    
    return false;
  };

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
                {!canAccessClass(cls) ? (
                  <button 
                    disabled
                    className="w-full sm:w-auto px-6 py-2.5 bg-amber-50 text-amber-600 font-bold rounded-xl flex items-center justify-center gap-2 cursor-not-allowed border border-amber-200"
                  >
                    Locked (Pro) <Lock size={16} />
                  </button>
                ) : cls.isLive ? (
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
