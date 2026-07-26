import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { 
  Video, 
  Calendar, 
  Plus, 
  Clock, 
  MoreHorizontal, 
  PlayCircle,
  Users,
  Check,
  UserPlus,
  X
} from 'lucide-react';
import { JitsiMeeting } from '@jitsi/react-sdk';

export default function LiveClasses({ department }) {
  const [isInCall, setIsInCall] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  
  // Modals
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  
  const [newClass, setNewClass] = useState({ subject: '', topic: '', time: '', selectedStudents: [] });
  const [startClassData, setStartClassData] = useState({ subject: '', topic: '' });
  
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

  const handleEndMeet = async () => {
    setIsInCall(false);
    
    if (currentSessionId) {
      try {
        await updateDoc(doc(db, 'live_sessions', currentSessionId), {
          status: 'ended',
          endedAt: serverTimestamp()
        });
        setCurrentSessionId(null);
      } catch (e) {
        console.error("Failed to end live session in Firestore", e);
      }
    }
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
    return (
      <div className="bg-[#111827] rounded-3xl overflow-hidden shadow-2xl h-[calc(100vh-140px)] w-full relative transition-all duration-300">
        <JitsiMeeting
          domain="meet.jit.si"
          roomName={`MSAcademy_Class_${currentSessionId}`}
          configOverwrite={{
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            requireDisplayName: true
          }}
          interfaceConfigOverwrite={{
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true
          }}
          userInfo={{
            displayName: localStorage.getItem('auth_name') || 'Teacher',
            email: localStorage.getItem('auth_email')
          }}
          onApiReady={(externalApi) => {
            // Optional: attach listeners if needed
          }}
          getIFrameRef={(iframeRef) => { iframeRef.style.height = '100%'; iframeRef.style.width = '100%'; }}
        />
        
        {/* End Call Override Button (to ensure Firestore updates) */}
        <button 
          onClick={handleEndMeet}
          className="absolute bottom-6 right-6 px-6 h-12 rounded-xl flex items-center justify-center bg-red-600 hover:bg-red-700 text-white font-bold transition-all shadow-[0_4px_14px_rgba(220,38,38,0.4)] hover:shadow-[0_6px_20px_rgba(220,38,38,0.6)] z-50 border border-white/20"
        >
          End Class (Save to DB)
        </button>
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
