import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { 
  Video, 
  Calendar, 
  Plus, 
  Clock, 
  MoreHorizontal, 
  PlayCircle,
  Users,
  Mic,
  MicOff,
  VideoOff,
  MonitorUp,
  Hand,
  PhoneOff,
  MessageSquare,
  Settings,
  X,
  Send,
  Check,
  Search,
  UserPlus
} from 'lucide-react';

// Mock student list for scheduling
const MOCK_STUDENTS = [];

export default function LiveClasses({ department }) {
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  
  // New States
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatLog, setChatLog] = useState([]);

  // Schedule Form State
  const [newClass, setNewClass] = useState({ subject: "", topic: "", time: "", selectedStudents: [] });

  const [upcomingClasses, setUpcomingClasses] = useState([]);
  const [departmentStudents, setDepartmentStudents] = useState([]);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!department) return;
      try {
        const q = query(
          collection(db, 'joined_students'), 
          where('department', '==', department),
          where('plan', '==', 'Pro')
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

  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  const recentRecordings = [];

  // Auto-scroll chat
  useEffect(() => {
    if (isChatOpen && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatLog, isChatOpen]);

  useEffect(() => {
    if (isInCall) {
      startMedia();
    } else {
      stopMedia();
    }
    return () => stopMedia();
  }, [isInCall]);

  const startMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsMuted(false);
      setIsVideoOff(false);
    } catch (err) {
      console.error("Error accessing media devices.", err);
      setIsVideoOff(true);
      setIsMuted(true);
    }
  };

  const stopMedia = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const toggleMute = () => {
    if (mediaStreamRef.current) {
      const audioTracks = mediaStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const newMutedState = !isMuted;
        audioTracks[0].enabled = !newMutedState;
        setIsMuted(newMutedState);
      }
    }
  };

  const toggleVideo = () => {
    if (mediaStreamRef.current) {
      const videoTracks = mediaStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        const newVideoState = !isVideoOff;
        videoTracks[0].enabled = !newVideoState;
        setIsVideoOff(newVideoState);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!isSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        
        screenTrack.onended = () => {
          revertToCamera();
        };

        if (videoRef.current) {
          videoRef.current.srcObject = new MediaStream([screenTrack]);
        }
        setIsSharing(true);
      } catch (err) {
        console.error("Error sharing screen.", err);
      }
    } else {
      revertToCamera();
    }
  };

  const revertToCamera = () => {
    if (mediaStreamRef.current && videoRef.current) {
      const videoTrack = mediaStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoRef.current.srcObject = mediaStreamRef.current;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
    setIsSharing(false);
  };

  const handleStartMeet = () => {
    setIsInCall(true);
  };

  const handleEndMeet = () => {
    setIsInCall(false);
    setIsSharing(false);
    setIsHandRaised(false);
    setIsChatOpen(false);
    setIsSettingsOpen(false);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    setChatLog([...chatLog, { sender: "Teacher (You)", time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), text: chatMessage }]);
    setChatMessage("");
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

  if (isInCall) {
    return (
      <div className="bg-[#111827] rounded-3xl overflow-hidden shadow-2xl h-[calc(100vh-140px)] flex flex-col relative text-white transition-all duration-300">
        
        {/* Top Header */}
        <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center gap-3">
            <div className="bg-red-500/20 text-red-500 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 backdrop-blur-md border border-red-500/30">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              REC
            </div>
            <span className="font-bold text-sm text-slate-200">Live Session Active</span>
          </div>
          <div className="flex items-center gap-4 text-slate-300">
            <div className="flex items-center gap-2 text-sm font-semibold bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md">
              <Users size={16}/> 42
            </div>
          </div>
        </div>

        {/* Main Workspace */}
        <div className="flex-1 p-4 pt-16 pb-24 flex gap-4 overflow-hidden relative">
          
          {/* Main Feed */}
          <div className="flex-1 bg-[#1F2937] rounded-2xl border border-white/10 relative overflow-hidden flex flex-col items-center justify-center group shadow-inner transition-all duration-300">
            <video 
              ref={videoRef}
              autoPlay 
              playsInline 
              muted 
              className={`absolute inset-0 w-full h-full object-cover ${(isVideoOff && !isSharing) ? 'hidden' : 'block'} ${isSharing ? 'object-contain bg-black' : ''}`}
            />
            
            {isVideoOff && !isSharing && (
              <div className="w-32 h-32 bg-blue-600 rounded-full flex items-center justify-center text-5xl font-bold shadow-lg z-10">
                T
              </div>
            )}
            
            <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-lg text-sm font-medium border border-white/10 flex items-center gap-2 z-20">
              Teacher (You) {isMuted && <MicOff size={14} className="text-red-400" />} {isSharing && <MonitorUp size={14} className="text-blue-400" />}
            </div>
          </div>

          {/* Dynamic Sidebar (Students / Chat) */}
          <div className={`w-80 flex flex-col gap-4 transition-all duration-300 ${isChatOpen ? 'flex' : 'hidden lg:flex'}`}>
            
            {isChatOpen ? (
              // Chat Panel
              <div className="flex-1 bg-[#1F2937] rounded-2xl border border-white/10 flex flex-col overflow-hidden relative">
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                  <h3 className="font-bold text-sm flex items-center gap-2"><MessageSquare size={16}/> Class Chat</h3>
                  <button onClick={() => setIsChatOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                    <X size={16} />
                  </button>
                </div>
                
                <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto space-y-4">
                  {chatLog.map((msg, idx) => (
                    <div key={idx} className={`flex flex-col ${msg.sender === 'Teacher (You)' ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-300">{msg.sender}</span>
                        <span className="text-[10px] text-slate-500">{msg.time}</span>
                      </div>
                      <div className={`px-3 py-2 rounded-xl text-sm ${msg.sender === 'Teacher (You)' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white/10 text-slate-200 rounded-tl-sm'}`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                
                <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 bg-white/5 flex gap-2">
                  <input 
                    type="text" 
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Type a message..." 
                    className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <button type="submit" className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex shrink-0 items-center justify-center">
                    <Send size={16} />
                  </button>
                </form>
              </div>
            ) : (
              // Student Gallery
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-white/10 border-dashed rounded-2xl bg-white/5">
                <Users size={32} className="text-slate-500 mb-3" />
                <p className="text-slate-400 font-medium text-sm">Waiting for students to join...</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Control Dock */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-[#1F2937]/90 backdrop-blur-xl p-3 rounded-2xl border border-white/10 shadow-2xl z-20">
          <button 
            onClick={toggleMute}
            title={isMuted ? "Unmute" : "Mute"}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isMuted ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-white/10 hover:bg-white/20 text-slate-200'}`}
          >
            {isMuted ? <MicOff size={20}/> : <Mic size={20}/>}
          </button>
          
          <button 
            onClick={toggleVideo}
            title={isVideoOff ? "Turn on camera" : "Turn off camera"}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isVideoOff ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-white/10 hover:bg-white/20 text-slate-200'}`}
          >
            {isVideoOff ? <VideoOff size={20}/> : <Video size={20}/>}
          </button>

          <div className="w-px h-8 bg-white/10 mx-1"></div>

          <button 
            onClick={toggleScreenShare}
            title="Present screen"
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isSharing ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-white/10 hover:bg-white/20 text-slate-200'}`}
          >
            <MonitorUp size={20}/>
          </button>

          <button 
            onClick={() => setIsHandRaised(!isHandRaised)}
            title="Raise hand"
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isHandRaised ? 'bg-yellow-500 text-white shadow-[0_0_15px_rgba(234,179,8,0.5)]' : 'bg-white/10 hover:bg-white/20 text-slate-200'}`}
          >
            <Hand size={20}/>
          </button>

          <button 
            onClick={() => setIsChatOpen(!isChatOpen)}
            title="Chat"
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isChatOpen ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-white/10 hover:bg-white/20 text-slate-200'}`}
          >
            <MessageSquare size={20}/>
          </button>

          <button 
            onClick={() => setIsSettingsOpen(true)}
            title="Settings"
            className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
          >
            <Settings size={20}/>
          </button>

          <div className="w-px h-8 bg-white/10 mx-1"></div>

          <button 
            onClick={handleEndMeet}
            className="px-6 h-12 rounded-xl flex items-center justify-center bg-red-600 hover:bg-red-700 text-white font-bold transition-all shadow-[0_4px_14px_rgba(220,38,38,0.4)] hover:shadow-[0_6px_20px_rgba(220,38,38,0.6)] gap-2"
          >
            <PhoneOff size={18}/> End Call
          </button>
        </div>

        {/* Settings Modal (In-Call) */}
        {isSettingsOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#1F2937] border border-white/10 rounded-2xl w-[400px] shadow-2xl p-6 relative">
              <button onClick={() => setIsSettingsOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                <X size={20}/>
              </button>
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2"><Settings size={20}/> Audio & Video Settings</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Microphone</label>
                  <select className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500">
                    <option>Default - Built-in Microphone</option>
                    <option>External USB Mic</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Camera</label>
                  <select className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500">
                    <option>FaceTime HD Camera</option>
                    <option>OBS Virtual Camera</option>
                  </select>
                </div>
              </div>
              <div className="mt-8 flex justify-end">
                <button onClick={() => setIsSettingsOpen(false)} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors">
                  Done
                </button>
              </div>
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
            onClick={handleStartMeet}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-[0_4px_14px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] flex items-center gap-2"
          >
            <Plus size={18} strokeWidth={2.5} /> Start Instant Class
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
        
        {/* Main Section: Upcoming Classes */}
        <div className="lg:col-span-2 space-y-6">
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
                    onClick={handleStartMeet}
                    className="w-full sm:w-auto px-6 py-2.5 bg-blue-50 text-blue-700 font-bold rounded-xl hover:bg-blue-600 hover:text-white transition-colors flex items-center justify-center gap-2"
                  >
                    Join Class <Video size={16} />
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

        {/* Sidebar Section: Recent Recordings */}
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <PlayCircle className="text-purple-500" size={20} /> Recent Recordings
          </h3>
          
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
            {recentRecordings.map((rec) => (
              <div key={rec.id} className="flex gap-4 p-3 bg-white border border-slate-100 rounded-xl hover:shadow-sm cursor-pointer group">
                <div className={`w-20 h-16 ${rec.thumbnail} rounded-lg flex items-center justify-center shrink-0 relative overflow-hidden`}>
                  <PlayCircle className="text-slate-600 opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all z-10" size={24} />
                  <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-colors"></div>
                </div>
                <div className="flex flex-col justify-center overflow-hidden">
                  <h5 className="text-[14px] font-bold text-slate-900 truncate">{rec.topic}</h5>
                  <p className="text-[12px] text-slate-500 truncate">{rec.subject}</p>
                  <span className="text-[11px] font-semibold text-slate-400 mt-1">{rec.date} • {rec.duration}</span>
                </div>
              </div>
            ))}
          </div>
          
          <button className="w-full py-2.5 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-transparent hover:border-blue-100">
            View All Recordings
          </button>
        </div>

      </div>

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
