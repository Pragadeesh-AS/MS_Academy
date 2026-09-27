import React from 'react';
import { Users, Mic, MicOff, Video, VideoOff, X } from 'lucide-react';

const HELPER_UIDS = [999997, 999998, 999999]; // screen-share / whiteboard streams, not people

// Everyone currently connected to the class: you plus whoever is in the call right now.
export const buildPeople = ({ myUid, myRole, remoteUsers, names, roles }) => {
  const me = {
    uid: String(myUid ?? 'me'),
    name: sessionStorage.getItem('auth_name') || (myRole === 'teacher' ? 'Teacher' : 'Student'),
    role: myRole,
    isYou: true
  };
  const others = remoteUsers
    .filter(u => !HELPER_UIDS.includes(Number(u.uid)))
    .map(u => ({
      uid: String(u.uid),
      name: names[String(u.uid)] || 'Joining...',
      role: roles[String(u.uid)] || 'student',
      hasAudio: u.hasAudio,
      hasVideo: u.hasVideo,
      isYou: false
    }));
  return [me, ...others].sort((a, b) => (a.role === 'teacher' ? -1 : 0) - (b.role === 'teacher' ? -1 : 0) || a.name.localeCompare(b.name));
};

export default function ParticipantsPanel({ people, onClose }) {
  const teachers = people.filter(p => p.role === 'teacher');
  const students = people.filter(p => p.role !== 'teacher');

  const Row = ({ p }) => (
    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-800/70 border border-slate-700/60">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-black ${p.role === 'teacher' ? 'bg-indigo-500/30 text-indigo-200' : 'bg-slate-700 text-slate-200'}`}>
          {(p.name || '?').trim().charAt(0).toUpperCase()}
        </div>
        <span className="text-sm font-semibold text-white truncate">{p.name}{p.isYou ? ' (You)' : ''}</span>
      </div>
      {!p.isYou && (
        <div className="flex items-center gap-1.5 text-slate-400 shrink-0">
          {p.hasAudio ? <Mic size={14} className="text-emerald-400" /> : <MicOff size={14} />}
          {p.hasVideo ? <Video size={14} className="text-emerald-400" /> : <VideoOff size={14} />}
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed right-3 bottom-24 z-[300] w-72 max-w-[92vw] max-h-[60vh] flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl">
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-bold text-white"><Users size={16} className="text-blue-400" /> In this class ({people.length})</span>
        <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800"><X size={16} /></button>
      </div>
      <div className="p-3 overflow-y-auto space-y-3">
        {teachers.length > 0 && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Teacher</p>
            <div className="space-y-1.5">{teachers.map(p => <Row key={p.uid} p={p} />)}</div>
          </div>
        )}
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Students ({students.length})</p>
          <div className="space-y-1.5">
            {students.map(p => <Row key={p.uid} p={p} />)}
            {students.length === 0 && <p className="text-xs text-slate-500 font-medium">No students have joined yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
