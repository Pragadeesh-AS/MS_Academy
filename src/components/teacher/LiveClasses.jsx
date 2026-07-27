import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { 
  Video, 
  VideoOff,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Calendar, 
  Plus, 
  Clock, 
  MoreHorizontal, 
  PlayCircle,
  Users,
  Check,
  UserPlus,
  X,
  Send,
  MessageCircle
} from 'lucide-react';
import AgoraRTC, { 
  AgoraRTCProvider, 
  useRTCClient, 
  useLocalCameraTrack, 
  useLocalMicrophoneTrack,
  usePublish, 
  useJoin, 
  useRemoteUsers,
  RemoteUser,
  LocalVideoTrack,
  useLocalScreenTrack
} from "agora-rtc-react";

// Extracted component to handle screen sharing lifecycle
const ScreenShareView = ({ onTrackEnded }) => {
  const { screenTrack } = useLocalScreenTrack(true, {}, 'disable');

  useEffect(() => {
    if (screenTrack) {
      screenTrack.on('track-ended', onTrackEnded);
      return () => {
        screenTrack.off('track-ended', onTrackEnded);
        // Explicitly close the track to clear the browser's native "Stop Sharing" UI
        screenTrack.close();
      };
    }
  }, [screenTrack, onTrackEnded]);

  const tracks = screenTrack ? [screenTrack] : [];
  usePublish(tracks);

  if (!screenTrack) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white font-bold animate-pulse">
        Initializing Screen Share...
      </div>
    );
  }

  return <LocalVideoTrack track={screenTrack} play={true} className="w-full h-full object-cover" />;
};

// Extracted TeacherCall component for custom Agora rendering
const TeacherCall = ({ appId, channel, token, handleEndMeet, isRecording, togglePauseRecording, stopRecording, startRecording, isPaused, recordingTime, formatTime }) => {
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [screenShareOn, setScreenShareOn] = useState(false);

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
  
  // If not sharing screen, publish camera. The ScreenShareView handles publishing the screen track.
  if (!screenShareOn && localCameraTrack) {
    tracksToPublish.push(localCameraTrack);
  }

  usePublish(tracksToPublish);

  const remoteUsers = useRemoteUsers();

  return (
    <div className="flex-1 flex flex-col relative bg-black">
      {/* RECORDING CONTROLS */}
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        {!isRecording ? (
          <button onClick={startRecording} className="px-4 py-2 bg-slate-800/80 hover:bg-red-600 backdrop-blur text-white text-sm font-bold rounded-lg flex items-center gap-2 transition-colors border border-slate-700">
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>Record Session
          </button>
        ) : (
          <>
            <button onClick={togglePauseRecording} className="px-4 py-2 bg-yellow-500/90 hover:bg-yellow-600 backdrop-blur text-white text-sm font-bold rounded-lg flex items-center gap-2 transition-colors shadow-md">
              {isPaused ? (
                <><div className="w-0 h-0 border-t-[5px] border-t-transparent border-l-[8px] border-l-white border-b-[5px] border-b-transparent"></div>Resume</>
              ) : (
                <><div className="flex gap-1"><div className="w-1 h-3 bg-white rounded-full"></div><div className="w-1 h-3 bg-white rounded-full"></div></div>Pause</>
              )}
            </button>
            <button onClick={stopRecording} className={`px-4 py-2 bg-red-600/90 hover:bg-red-700 backdrop-blur text-white text-sm font-bold rounded-lg flex items-center gap-2 transition-colors shadow-[0_0_15px_rgba(220,38,38,0.5)] ${isPaused ? '' : 'animate-pulse'}`}>
              <div className="w-2.5 h-2.5 bg-white rounded-full"></div>Stop Recording ({formatTime(recordingTime)})
            </button>
          </>
        )}
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-fr">
        <div className="relative rounded-2xl overflow-hidden bg-slate-900 shadow-xl border border-slate-800">
          {screenShareOn ? (
            <ScreenShareView onTrackEnded={() => setScreenShareOn(false)} />
          ) : (
            localCameraTrack && <LocalVideoTrack track={localCameraTrack} play={true} className="w-full h-full object-cover" />
          )}
          <div className="absolute bottom-4 left-4 bg-black/70 px-3 py-1 rounded-lg text-white text-sm font-bold shadow-md z-10">You (Teacher)</div>
        </div>
        {remoteUsers.map(user => (
          <div key={user.uid} className="relative rounded-2xl overflow-hidden bg-slate-900 shadow-xl border border-slate-800">
            <RemoteUser user={user} className="w-full h-full object-cover" />
            <div className="absolute bottom-4 left-4 bg-black/70 px-3 py-1 rounded-lg text-white text-sm font-bold shadow-md">Student {user.uid}</div>
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

          {/* Screen Share Button */}
          <button 
            onClick={() => setScreenShareOn(!screenShareOn)} 
            className={`w-12 h-12 rounded-full border-[1.5px] flex items-center justify-center transition-all ${screenShareOn ? 'border-transparent bg-white text-[#0078FF] shadow-[0_0_15px_rgba(255,255,255,0.5)]' : 'border-white text-white hover:bg-white/20'}`}
            title={screenShareOn ? 'Stop Sharing' : 'Share Screen'}
          >
            <MonitorUp size={22} strokeWidth={1.5} />
          </button>
        </div>
        
        {/* End Call Button */}
        <button 
          onClick={() => handleEndMeet()} 
          className="w-12 h-12 rounded-full bg-[#FF3B30] text-white flex items-center justify-center transition-all hover:bg-red-600 shadow-[0_0_15px_rgba(255,59,48,0.4)]"
          title="End Call"
        >
          <PhoneOff size={22} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
};

export default function LiveClasses({ department }) {
  const [agoraClient] = useState(() => AgoraRTC.createClient({ mode: "rtc", codec: "vp8" }));
  const [isInCall, setIsInCall] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  
  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  
  // Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const chatEndRef = useRef(null);
  
  // Modals
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  
  const [newClass, setNewClass] = useState({ subject: '', topic: '', time: '', selectedStudents: [] });
  const [startClassData, setStartClassData] = useState({ subject: '', topic: '' });
  
  const [activeSessions, setActiveSessions] = useState([]);
  const [upcomingClasses, setUpcomingClasses] = useState([]);
  const [departmentStudents, setDepartmentStudents] = useState([]);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!department) return;
      try {
        const q = query(
          collection(db, 'joined_students'),
          where('department', '==', department)
        );
        const snapshot = await getDocs(q);
        const students = snapshot.docs.map(doc => doc.data().name);
        setDepartmentStudents(students);
      } catch (err) {
        console.error("Error fetching students:", err);
      }
    };
    fetchStudents();
  }, [department]);

  useEffect(() => {
    const teacherEmail = localStorage.getItem('auth_email');
    if (!teacherEmail) return;

    const q = query(
      collection(db, 'live_sessions'),
      where('teacherEmail', '==', teacherEmail),
      where('status', '==', 'live')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setActiveSessions(sessions);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isInCall || !currentSessionId) return;
    const q = query(collection(db, 'live_chats'), where('sessionId', '==', currentSessionId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      messages.sort((a, b) => (a.timestamp?.toMillis() || 0) - (b.timestamp?.toMillis() || 0));
      setChatMessages(messages);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return () => unsubscribe();
  }, [isInCall, currentSessionId]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentSessionId) return;
    
    try {
      await addDoc(collection(db, 'live_chats'), {
        sessionId: currentSessionId,
        senderName: localStorage.getItem('auth_name') || 'Teacher',
        senderEmail: localStorage.getItem('auth_email') || '',
        message: newMessage,
        timestamp: serverTimestamp()
      });
      setNewMessage("");
    } catch (err) {
      console.error("Error sending message", err);
    }
  };

  const recentRecordings = [];

  const handleConfirmStartMeet = async (e) => {
    if (e) e.preventDefault();
    setIsStartModalOpen(false);
    setIsInCall(true);
    
    try {
      const teacherName = localStorage.getItem('auth_name') || 'Teacher';
      const teacherEmail = localStorage.getItem('auth_email') || '';
      
      const sessionData = {
        teacherName,
        teacherEmail,
        department: department || 'General',
        subject: startClassData.subject || "General Class",
        topic: startClassData.topic || "Instant Live Session",
        status: 'live',
        startedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'live_sessions'), sessionData);
      setCurrentSessionId(docRef.id);
    } catch (e) {
      console.error("Failed to create live session in Firestore", e);
    }
  };

  const handleEndMeet = async (sessionIdToEnd = currentSessionId) => {
    if (sessionIdToEnd === currentSessionId) setIsInCall(false);
    
    if (sessionIdToEnd) {
      try {
        await updateDoc(doc(db, 'live_sessions', sessionIdToEnd), {
          status: 'ended',
          endedAt: serverTimestamp()
        });
        if (sessionIdToEnd === currentSessionId) setCurrentSessionId(null);
      } catch (e) {
        console.error("Failed to end live session in Firestore", e);
      }
    }
    
    // Force release camera/mic hardware locks
    if (sessionIdToEnd === currentSessionId) {
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  const startRecording = async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const tracks = [...displayStream.getTracks(), ...voiceStream.getTracks()];
      const combinedStream = new MediaStream(tracks);
      
      const mediaRecorder = new MediaRecorder(combinedStream);
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.style = 'display: none';
        a.href = url;
        a.download = `LiveClass_Recording_${new Date().toISOString().replace(/:/g, '-')}.webm`;
        a.click();
        window.URL.revokeObjectURL(url);
        setIsRecording(false);
      };

      displayStream.getVideoTracks()[0].onended = () => {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
      
      timerIntervalRef.current = setInterval(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          setRecordingTime(prev => prev + 1);
        }
      }, 1000);
      
    } catch (err) {
      console.error("Error starting recording:", err);
    }
  };

  const togglePauseRecording = () => {
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
      } else if (mediaRecorderRef.current.state === 'paused') {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
      }
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleScheduleSubmit = (e) => {
    e.preventDefault();
    if (!newClass.topic || !newClass.time) return;
    
    setUpcomingClasses([
      ...upcomingClasses, 
      {
        id: Date.now(),
        subject: newClass.subject || "General Class",
        topic: newClass.topic,
        time: newClass.time,
        students: newClass.selectedStudents.length || departmentStudents.length,
        duration: "1h 00m"
      }
    ]);
    setIsScheduleModalOpen(false);
    setNewClass({ subject: "", topic: "", time: "", selectedStudents: [] });
  };

  const toggleStudentSelection = (studentName) => {
    if (newClass.selectedStudents.includes(studentName)) {
      setNewClass({ ...newClass, selectedStudents: newClass.selectedStudents.filter(s => s !== studentName) });
    } else {
      setNewClass({ ...newClass, selectedStudents: [...newClass.selectedStudents, studentName] });
    }
  };

  if (isInCall && currentSessionId) {
    const rtcProps = {
      appId: import.meta.env.VITE_AGORA_APP_ID || '',
      channel: 'MS_ACADEMY',
      token: import.meta.env.VITE_AGORA_TEMP_TOKEN || null,
      role: 'host',
      layout: 0,
      enableScreensharing: true
    };

    const callbacks = {
      EndCall: () => handleEndMeet(),
    };

    return (
      <div className="fixed inset-0 z-[100] bg-[#111827] w-full h-full flex overflow-hidden">
        {!rtcProps.appId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-white p-8 text-center">
            <h3 className="text-2xl font-bold text-red-400 mb-4">Agora App ID Missing</h3>
            <p className="text-slate-300 max-w-md">Please add your Agora App ID to the <code className="bg-slate-800 px-2 py-1 rounded">.env</code> file as <code className="bg-slate-800 px-2 py-1 rounded">VITE_AGORA_APP_ID</code> and restart the server.</p>
            <button onClick={handleEndMeet} className="mt-6 px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold transition-colors">Go Back</button>
          </div>
        ) : (
          <div className="flex-1 w-full h-full flex overflow-hidden">
            <AgoraRTCProvider client={agoraClient}>
              <TeacherCall 
                appId={rtcProps.appId} 
                channel={rtcProps.channel} 
                token={rtcProps.token} 
                handleEndMeet={handleEndMeet}
                isRecording={isRecording}
                togglePauseRecording={togglePauseRecording}
                stopRecording={stopRecording}
                startRecording={startRecording}
                isPaused={isPaused}
                recordingTime={recordingTime}
                formatTime={formatTime}
              />
            </AgoraRTCProvider>
            
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

  // Regular Dashboard View
  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm min-h-[calc(100vh-140px)] flex flex-col relative">
      
      {/* Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-2xl font-[900] text-slate-900 tracking-tight flex items-center gap-2">
            <Video className="text-blue-600" size={28} />
            Live Classes
          </h2>
          <p className="text-slate-500 font-medium mt-1">Manage your virtual classrooms and recordings.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsScheduleModalOpen(true)}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors flex items-center gap-2"
          >
            <Calendar size={18} /> Schedule Class
          </button>
          <button 
            onClick={() => setIsStartModalOpen(true)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-[0_4px_14px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] flex items-center gap-2"
          >
            <Plus size={18} strokeWidth={2.5} /> Start Instant Class
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
        
        {/* Main Section */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Active Sessions */}
          {activeSessions.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div> 
                Active Live Sessions
              </h3>
              <div className="space-y-4">
                {activeSessions.map((session) => (
                  <div key={session.id} className="p-5 border-2 border-red-200 rounded-2xl bg-red-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500 opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                    <div className="relative z-10">
                      <div className="text-sm font-bold text-red-600 mb-1 flex items-center gap-2">
                        LIVE NOW
                      </div>
                      <h4 className="text-lg font-[800] text-slate-900 mb-1">{session.topic}</h4>
                      <p className="text-slate-600 font-medium text-[14px]">{session.subject}</p>
                    </div>
                    
                    <div className="flex flex-row items-center gap-3 relative z-10">
                      <button 
                        onClick={() => handleEndMeet(session.id)}
                        className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        End Class
                      </button>
                      <button 
                        onClick={() => {
                          setCurrentSessionId(session.id);
                          setIsInCall(true);
                        }}
                        className="px-5 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2 shadow-md shadow-red-500/20"
                      >
                        Re-Join <Video size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Classes */}
          <div className="space-y-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Clock className="text-orange-500" size={20} /> Upcoming Sessions
          </h3>
          
          <div className="space-y-4">
            {upcomingClasses.map((cls) => (
              <div key={cls.id} className="p-5 border border-slate-200 rounded-2xl hover:border-blue-300 hover:shadow-md transition-all group bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-blue-600 mb-1">{cls.time}</div>
                  <h4 className="text-lg font-[800] text-slate-900 mb-1">{cls.topic}</h4>
                  <p className="text-slate-500 font-medium text-[14px]">{cls.subject}</p>
                  
                  <div className="flex items-center gap-4 mt-4 text-[13px] font-semibold text-slate-400">
                    <span className="flex items-center gap-1.5"><Users size={14}/> {cls.students} Enrolled</span>
                    <span className="flex items-center gap-1.5"><Clock size={14}/> {cls.duration}</span>
                  </div>
                </div>
                
                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-2 mt-2 sm:mt-0">
                  <button 
                    onClick={() => {
                      setStartClassData({ subject: cls.subject, topic: cls.topic });
                      setIsStartModalOpen(true);
                    }}
                    className="w-full sm:w-auto px-6 py-2.5 bg-blue-50 text-blue-700 font-bold rounded-xl hover:bg-blue-600 hover:text-white transition-colors flex items-center justify-center gap-2"
                  >
                    Start Class <Video size={16} />
                  </button>
                  <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
                    <MoreHorizontal size={18} />
                  </button>
                </div>
              </div>
            ))}

            {upcomingClasses.length === 0 && (
              <div className="text-center p-10 border border-dashed border-slate-300 rounded-2xl bg-slate-50">
                <p className="text-slate-500 font-medium">No upcoming classes scheduled.</p>
              </div>
            )}
          </div>
        </div>
        </div>

        {/* Sidebar Section: Recent Recordings */}
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <PlayCircle className="text-purple-500" size={20} /> Recent Recordings
          </h3>
          
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
            {recentRecordings.length === 0 && (
              <p className="text-slate-400 text-sm font-medium text-center py-4">No recordings yet.</p>
            )}
          </div>
          
          <button className="w-full py-2.5 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-transparent hover:border-blue-100">
            View All Recordings
          </button>
        </div>

      </div>

      {/* Start Instant Class Modal */}
      {isStartModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-300">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-[900] text-slate-800">Start Live Class</h2>
              <button onClick={() => setIsStartModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <form id="start-form" onSubmit={handleConfirmStartMeet} className="space-y-5">
                <div>
                  <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Subject Category</label>
                  <select 
                    required
                    value={startClassData.subject}
                    onChange={(e) => setStartClassData({...startClassData, subject: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-[14px] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white"
                  >
                    <option value="">Select a Subject...</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="General Aptitude">General Aptitude</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Class Topic / Title</label>
                  <input 
                    type="text" 
                    required
                    value={startClassData.topic}
                    onChange={(e) => setStartClassData({...startClassData, topic: e.target.value})}
                    placeholder="e.g. Advanced Database Optimization"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-[14px] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-3xl flex justify-end gap-3">
              <button 
                onClick={() => setIsStartModalOpen(false)}
                className="px-5 py-2.5 font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                form="start-form"
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md flex items-center gap-2"
              >
                <Video size={16} /> Go Live
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Class Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-[900] text-slate-800">Schedule Targeted Class</h2>
              <button onClick={() => setIsScheduleModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="schedule-form" onSubmit={handleScheduleSubmit} className="space-y-6">
                <div>
                  <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Class Topic</label>
                  <input 
                    type="text" 
                    required
                    value={newClass.topic}
                    onChange={(e) => setNewClass({...newClass, topic: e.target.value})}
                    placeholder="e.g. Advanced Database Optimization"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-[14px] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Date & Time</label>
                    <input 
                      type="text" 
                      required
                      value={newClass.time}
                      onChange={(e) => setNewClass({...newClass, time: e.target.value})}
                      placeholder="e.g. Tomorrow, 4:00 PM"
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-[14px] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Subject Category</label>
                    <select 
                      value={newClass.subject}
                      onChange={(e) => setNewClass({...newClass, subject: e.target.value})}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-[14px] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white"
                    >
                      <option value="">Select a Subject...</option>
                      <option value="Computer Science">Computer Science</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="General Aptitude">General Aptitude</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Invite Specific Students</label>
                  <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto">
                    {departmentStudents.length === 0 ? (
                      <p className="p-4 text-sm text-slate-500 text-center">No students found in your department ({department}).</p>
                    ) : (
                      departmentStudents.map((student, idx) => (
                        <label key={idx} onClick={() => toggleStudentSelection(student)} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors last:border-0">
                          <div className={`w-5 h-5 rounded flex items-center justify-center border ${newClass.selectedStudents.includes(student) ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300 bg-white'}`}>
                            {newClass.selectedStudents.includes(student) && <Check size={14} strokeWidth={3} />}
                          </div>
                          <span className="text-[14px] font-medium text-slate-700">{student}</span>
                        </label>
                      ))
                    )}
                  </div>
                  <p className="text-[12px] text-slate-500 mt-2 flex items-center gap-1">
                    <UserPlus size={14}/> {newClass.selectedStudents.length === 0 ? "All enrolled students will be invited." : `${newClass.selectedStudents.length} student(s) selected.`}
                  </p>
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-3xl flex justify-end gap-3">
              <button 
                onClick={() => setIsScheduleModalOpen(false)}
                className="px-5 py-2.5 font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                form="schedule-form"
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md"
              >
                Schedule Class
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
