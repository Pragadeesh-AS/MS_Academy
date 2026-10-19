import React, { useState, useEffect } from 'react';
import { db, storage } from '../../firebase';
import { collection, query, getDocs, deleteDoc, updateDoc, doc, onSnapshot, orderBy } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { Video, Trash2, Search, Clock, Users, BookOpen, ChevronRight, Package, Pencil, ArrowRight, Building2, Layers, CalendarClock, Home } from 'lucide-react';
import Loader from '../Loader';
import RecordingPlayerModal from '../shared/RecordingPlayerModal';
import { BundleAccessModal } from '../shared/BundleAccessPicker';
import Toast from '../shared/Toast';
import { accessOf, accessFields, bundleNamesOf } from '../../utils/bundleAccess';
import { groupBySubject, subjectOptionsFor, NO_SUBJECT } from '../../utils/subjects';
import { paletteFor, monogramOf, NEUTRAL } from '../../utils/departmentColors';

function VideoDuration({ url, storedDuration }) {
  const [duration, setDuration] = useState('Loading...');

  useEffect(() => {
    const formatAndSetDuration = (totalSeconds) => {
      if (!totalSeconds || !isFinite(totalSeconds)) {
        setDuration('Unknown length');
        return;
      }
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = Math.floor(totalSeconds % 60);
      
      let formatted = '';
      if (hours > 0) {
        formatted += `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      } else {
        formatted += `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }
      setDuration(formatted);
    };

    if (storedDuration !== undefined && storedDuration !== null) {
      formatAndSetDuration(storedDuration);
      return;
    }

    if (!url) {
      setDuration('Unknown');
      return;
    }
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    // Some webm files recorded via MediaRecorder have Infinity duration.
    // If we can't load metadata or it's infinite, we'll fall back after a timeout.
    const timeout = setTimeout(() => {
      setDuration('Unknown length');
    }, 5000);

    video.onloadedmetadata = () => {
      clearTimeout(timeout);
      let totalSeconds = video.duration;
      
      // If it's infinity (common for raw webm), try to seek to end to get duration
      if (totalSeconds === Infinity) {
        video.currentTime = 1e101;
        video.ontimeupdate = () => {
          video.ontimeupdate = null;
          totalSeconds = video.duration;
          formatAndSetDuration(totalSeconds);
        };
        return;
      }
      
      formatAndSetDuration(totalSeconds);
    };

    video.onerror = () => {
      clearTimeout(timeout);
      setDuration('Unknown length');
    };

    video.src = url;
    
    return () => clearTimeout(timeout);
  }, [url, storedDuration]);

  return (
    <span className="absolute bottom-3 right-3 text-white text-xs font-bold px-2 py-1 bg-black/70 rounded-lg pointer-events-none backdrop-blur-sm shadow-sm flex items-center gap-1 z-20">
      <Clock size={12} /> {duration}
    </span>
  );
}
export default function RecordingsManager() {
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => setToast({ show: true, message, type });

  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(null);
  // Drill-down: department folder -> subject folder -> recordings (null = the level above)
  const [openDept, setOpenDept] = useState(null);
  const [openSubject, setOpenSubject] = useState(null);
  const [playingRecording, setPlayingRecording] = useState(null); // { id, url, duration? }

  useEffect(() => {
    // Real-time listener for recordings
    const q = query(collection(db, 'recordings'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort manually since we might have some without proper timestamps initially
      data.sort((a,b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setRecordings(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching recordings:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const executeDelete = async (recording) => {
    try {
      // 1. Delete from Firebase Storage if it exists
      if (recording.url && recording.url.includes('firebasestorage.googleapis.com')) {
        const fileRef = ref(storage, recording.url);
        try {
          await deleteObject(fileRef);
        } catch (storageErr) {
          console.warn("Could not delete from storage (might already be deleted):", storageErr);
        }
      } else if (recording.fileName) {
        // Fallback for older sync logic that might use a direct path
        const fileRef = ref(storage, `recordings/${recording.fileName}`);
        try {
          await deleteObject(fileRef);
        } catch (storageErr) {
          console.warn("Could not delete via path from storage:", storageErr);
        }
      }
      
      // 2. Delete Firestore document
      await deleteDoc(doc(db, 'recordings', recording.id));
      showToast('Recording deleted successfully.', 'success');
    } catch (err) {
      console.error("Error deleting recording document:", err);
      showToast("Failed to delete recording metadata.", 'error');
    }
  };


  // Subjects per department, for moving older recordings (saved before classes had a subject)
  const [attributes, setAttributes] = useState([]);
  useEffect(() => {
    getDocs(collection(db, 'question_attributes'))
      .then(snap => setAttributes(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(err => console.error('Failed to load subjects:', err));
  }, []);

  const handleSetSubject = async (recording, subject) => {
    try {
      await updateDoc(doc(db, 'recordings', recording.id), { subject });
      showToast('Recording moved to subject successfully.', 'success');
    } catch (err) {
      console.error('Failed to move recording to subject:', err);
      showToast('Failed to move the recording. Please try again.', 'error');
    }
  };

  // Course bundles, for limiting a recording to buyers of one or more bundles
  const [bundles, setBundles] = useState([]);
  const [accessRecording, setAccessRecording] = useState(null);
  const [accessValue, setAccessValue] = useState({ mode: 'default', ids: [] });
  const [isSavingAccess, setIsSavingAccess] = useState(false);
  useEffect(() => {
    getDocs(collection(db, 'course_bundles'))
      .then(snap => setBundles(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(err => console.error('Failed to load bundles:', err));
  }, []);

  const bundleLabel = (rec) => {
    const names = bundleNamesOf(rec, bundles);
    return names.length ? names.join(', ') : 'Any bundle (Dept-level)';
  };

  const openAccessEditor = (rec) => {
    setAccessRecording(rec);
    setAccessValue(accessOf(rec));
  };

  const saveRecordingAccess = async () => {
    if (!accessRecording) return;
    setIsSavingAccess(true);
    try {
      await updateDoc(doc(db, 'recordings', accessRecording.id), accessFields(accessValue));
      setAccessRecording(null);
      showToast('Recording access updated successfully.', 'success');
    } catch (err) {
      console.error('Failed to update recording access:', err);
      showToast('Failed to update access. Please try again.', 'error');
    } finally {
      setIsSavingAccess(false);
    }
  };

  const handleDelete = (recording) => {
    setConfirmDialog({
      message: "Are you sure you want to completely delete this recording? This will permanently remove the video file from storage.",
      onConfirm: async () => {
        setConfirmDialog(null);
        await executeDelete(recording);
      }
    });
  };

  const filteredRecordings = recordings.filter(r => 
    (r.topic && r.topic.toLowerCase().includes(search.toLowerCase())) || 
    (r.subject && r.subject.toLowerCase().includes(search.toLowerCase())) ||
    (r.fileName && r.fileName.toLowerCase().includes(search.toLowerCase())) ||
    (r.teacherName && r.teacherName.toLowerCase().includes(search.toLowerCase()))
  );

  // Group recordings into one folder per department (teacher's department); anything untagged goes to General
  const folders = React.useMemo(() => {
    const map = {};
    filteredRecordings.forEach(r => {
      const dept = (r.department && r.department.trim()) || 'General';
      (map[dept] = map[dept] || []).push(r);
    });
    return Object.keys(map)
      .sort((a, b) => (a === 'General') - (b === 'General') || a.localeCompare(b))
      .map(name => ({ name, items: map[name] }));
  }, [filteredRecordings]);

  const isSearching = search.trim().length > 0;

  // A folder that was emptied (recordings deleted or moved) closes itself
  const deptFolder = folders.find(f => f.name === openDept) || null;
  const subjectFolders = deptFolder ? groupBySubject(deptFolder.items) : [];
  const subjectFolder = subjectFolders.find(f => f.name === openSubject) || null;
  useEffect(() => {
    if (loading || isSearching) return;
    if (openDept && !deptFolder) { setOpenDept(null); setOpenSubject(null); }
    else if (openSubject && !subjectFolder) setOpenSubject(null);
  }, [loading, isSearching, openDept, openSubject, deptFolder, subjectFolder]);

  const millisOf = (rec) => (rec.createdAt?.toMillis ? rec.createdAt.toMillis() : 0);
  const latestOf = (items) => items.reduce((m, r) => Math.max(m, millisOf(r)), 0);
  const formatDay = (ms) => (ms ? new Date(ms).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No date');
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const deptPalette = (name) => (name === 'General' ? NEUTRAL : paletteFor(name));
  const subjectCount = (items) => groupBySubject(items).filter(g => g.name !== NO_SUBJECT).length;

  // One recording: play, move to a subject, change bundle access, delete
  const renderRecordingCard = (rec, showLocation) => (
            <div key={rec.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col h-full relative">
              <div className="h-40 bg-slate-900 relative flex items-center justify-center group-hover:bg-slate-800 transition-colors">
                <Video size={48} className="text-slate-700 group-hover:text-blue-500 transition-colors" />
                
                {/* Play Overlay */}
                <button
                  type="button"
                  onClick={() => setPlayingRecording({ id: rec.id, url: rec.url, duration: rec.duration })}
                  className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40"
                >
                  <div className="w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center pl-1">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                  </div>
                </button>
                <VideoDuration url={rec.url} storedDuration={rec.duration} />
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
                {showLocation && (
                  <p className="text-[11px] font-[800] uppercase tracking-wide text-blue-600 mb-1.5 truncate">{(rec.department && rec.department.trim()) || 'General'} / {(rec.subject || '').trim() || NO_SUBJECT}</p>
                )}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-bold text-slate-800 text-lg leading-tight line-clamp-2">
                    {rec.topic || rec.fileName || 'Untitled Recording'}
                  </h3>
                </div>
                
                <div className="space-y-2 mb-6">
                  {rec.subject && (
                    <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                      <BookOpen size={16} className="text-blue-500 shrink-0" />
                      <span className="truncate">{rec.subject}</span>
                    </div>
                  )}
                  {rec.teacherName && (
                    <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                      <Users size={16} className="text-purple-500 shrink-0" />
                      <span className="truncate">{rec.teacherName}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                    <Clock size={16} className="text-slate-400 shrink-0" />
                    <span>{rec.createdAt ? new Date(rec.createdAt.toMillis()).toLocaleString() : 'Unknown date'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openAccessEditor(rec)}
                    className="w-full flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 font-medium transition-colors text-left"
                    title={`Access: ${bundleLabel(rec)} - click to change`}
                  >
                    <Package size={16} className="text-amber-500 shrink-0" />
                    <span className="truncate">{bundleLabel(rec)}</span>
                    <Pencil size={12} className="text-slate-400 shrink-0" />
                  </button>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <select
                    value={rec.subject || ''}
                    onChange={(e) => handleSetSubject(rec, e.target.value)}
                    className="min-w-0 flex-1 text-xs font-bold px-2 py-1.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 outline-none cursor-pointer"
                    title="Move this recording to a subject folder"
                  >
                    <option value="">{NO_SUBJECT}</option>
                    {rec.subject && !subjectOptionsFor(attributes, rec.department).some(o => o.name === rec.subject) && (
                      <option value={rec.subject}>{rec.subject}</option>
                    )}
                    {subjectOptionsFor(attributes, rec.department).map(o => <option key={o.name} value={o.name}>{o.label}</option>)}
                  </select>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(rec); }}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
                      title="Delete Recording"
                    >
                      <Trash2 size={18} />
                    </button>
                </div>
              </div>
            </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-[32px] font-[900] text-slate-900 tracking-tight leading-none mb-2 flex items-center gap-2">
            <Video className="text-blue-600" size={32} />
            Live Recordings Management
          </h2>
          <p className="text-slate-500 font-medium text-sm sm:text-base">
            View and manage all saved class recordings.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search recordings by topic, subject or teacher..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="text-sm font-bold text-slate-500 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100 flex items-center gap-2">
          Departments: <span className="text-blue-600">{folders.length}</span><span className="text-slate-300">|</span>Recordings: <span className="text-blue-600">{filteredRecordings.length}</span>
        </div>
      </div>

      {/* Breadcrumb */}
      {!loading && !isSearching && openDept && (
        <div className="flex flex-wrap items-center gap-1.5 text-sm font-bold">
          <button onClick={() => { setOpenDept(null); setOpenSubject(null); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-white transition-colors">
            <Home size={15} /> All Departments
          </button>
          <ChevronRight size={15} className="text-slate-300" />
          <button onClick={() => setOpenSubject(null)} className={`px-3 py-1.5 rounded-lg transition-colors ${openSubject ? 'text-slate-500 hover:text-blue-600 hover:bg-white' : 'text-slate-900 bg-white border border-slate-200 shadow-sm'}`}>
            {openDept}
          </button>
          {openSubject && (
            <>
              <ChevronRight size={15} className="text-slate-300" />
              <span className="px-3 py-1.5 rounded-lg text-slate-900 bg-white border border-slate-200 shadow-sm">{openSubject}</span>
            </>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader />
        </div>
      ) : filteredRecordings.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <Video className="text-slate-300" size={40} />
          </div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">No recordings found</h3>
          <p className="text-slate-500 font-medium">No recorded classes match your search criteria.</p>
        </div>
      ) : isSearching ? (
        /* Search: every match at once, labelled with its folder */
        <div className="space-y-4">
          <div className="text-[13px] font-[800] text-slate-400 uppercase tracking-widest">{plural(filteredRecordings.length, 'result')}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredRecordings.map(rec => renderRecordingCard(rec, true))}
          </div>
        </div>
      ) : !deptFolder ? (
        /* Department folders */
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: 'Recordings', value: recordings.length, icon: Video, tint: 'from-blue-500 to-indigo-600' },
              { label: 'Departments', value: folders.length, icon: Building2, tint: 'from-emerald-500 to-teal-600' },
              { label: 'Subjects', value: folders.reduce((a, f) => a + subjectCount(f.items), 0), icon: Layers, tint: 'from-violet-500 to-purple-600' },
              { label: 'Latest Recording', value: formatDay(latestOf(recordings)), icon: CalendarClock, tint: 'from-amber-500 to-orange-600' },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.tint} text-white flex items-center justify-center shrink-0 shadow-md`}>
                  <stat.icon size={22} strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-[800] uppercase tracking-widest text-slate-400">{stat.label}</div>
                  <div className="text-[22px] font-[900] text-slate-900 leading-tight truncate">{stat.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[13px] font-[800] text-slate-400 uppercase tracking-widest">Departments</span>
            <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {folders.map(folder => {
              const p = deptPalette(folder.name);
              const mono = folder.name === 'General' ? 'GN' : monogramOf(folder.name);
              const named = groupBySubject(folder.items).filter(g => g.name !== NO_SUBJECT).sort((a, b) => b.items.length - a.items.length);
              return (
                <button
                  key={folder.name}
                  type="button"
                  onClick={() => { setOpenDept(folder.name); setOpenSubject(null); }}
                  className={`group relative overflow-hidden text-left bg-white rounded-[24px] border border-slate-200/80 p-6 shadow-[0_8px_24px_rgba(15,23,42,0.04)] hover:shadow-2xl ${p.glow} ${p.ring} hover:-translate-y-1 transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200`}
                >
                  <span aria-hidden className={`pointer-events-none absolute -right-2 -top-5 text-[96px] font-[900] leading-none tracking-tighter select-none ${p.mark} group-hover:scale-110 transition-transform duration-500`}>{mono}</span>

                  <div className="relative flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${p.badge} text-white flex items-center justify-center shrink-0 shadow-lg group-hover:rotate-[-4deg] group-hover:scale-105 transition-transform duration-300`}>
                      <span className={`font-[900] tracking-tight ${mono.length > 2 ? 'text-[15px]' : 'text-[18px]'}`}>{mono}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-[800] text-[16px] text-slate-900 leading-snug line-clamp-2 break-words" title={folder.name}>{folder.name}</h3>
                      <div className="mt-0.5 text-[12.5px] font-semibold text-slate-500">{plural(named.length, 'subject')}</div>
                    </div>
                  </div>

                  <div className="relative mt-5 flex items-baseline gap-2">
                    <span className="text-[34px] font-[900] text-slate-900 leading-none tracking-tight">{folder.items.length}</span>
                    <span className="text-[12px] font-[800] uppercase tracking-wider text-slate-400">{folder.items.length === 1 ? 'Recording' : 'Recordings'}</span>
                  </div>

                  <div className="relative mt-4 flex flex-wrap gap-1.5 min-h-[26px]">
                    {named.slice(0, 3).map(g => (
                      <span key={g.name} className={`px-2 py-1 rounded-lg border text-[11px] font-bold truncate max-w-[160px] ${p.soft}`} title={g.name}>{g.name} · {g.items.length}</span>
                    ))}
                    {named.length > 3 && <span className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500">+{named.length - 3} more</span>}
                    {named.length === 0 && <span className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500">No subject folders yet</span>}
                  </div>

                  <div className="relative mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-[12.5px] font-semibold text-slate-500 min-w-0">
                      <CalendarClock size={15} className="text-emerald-500 shrink-0" />
                      <span className="truncate">Latest: <span className="text-slate-700 font-bold">{formatDay(latestOf(folder.items))}</span></span>
                    </span>
                    <ArrowRight size={18} className={`${p.text} shrink-0 group-hover:translate-x-1.5 transition-transform duration-300`} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : !subjectFolder ? (
        /* Subject folders of one department */
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {subjectFolders.map(g => {
            const other = g.name === NO_SUBJECT;
            const p = other ? NEUTRAL : deptPalette(deptFolder.name);
            return (
              <button
                key={g.name}
                type="button"
                onClick={() => setOpenSubject(g.name)}
                className={`group relative overflow-hidden text-left bg-white rounded-[24px] border p-6 shadow-[0_8px_24px_rgba(15,23,42,0.04)] hover:shadow-2xl ${p.glow} ${p.ring} hover:-translate-y-1 transition-all duration-300 flex flex-col focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 ${other ? 'border-dashed border-slate-300' : 'border-slate-200/80'}`}
              >
                <BookOpen aria-hidden size={110} strokeWidth={1.5} className={`pointer-events-none absolute -right-5 -top-5 opacity-[0.06] ${p.text} group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500`} />
                <div className={`relative w-12 h-12 rounded-2xl bg-gradient-to-br ${p.badge} text-white flex items-center justify-center shadow-lg group-hover:rotate-[-4deg] group-hover:scale-105 transition-transform duration-300`}>
                  {other ? <Layers size={22} strokeWidth={2.2} /> : <BookOpen size={22} strokeWidth={2.2} />}
                </div>
                <h3 className={`relative mt-4 font-[800] text-[16px] leading-snug line-clamp-2 break-words ${other ? 'text-slate-500' : 'text-slate-900'}`} title={g.name}>{g.name}</h3>
                <div className="relative mt-3 flex items-baseline gap-2">
                  <span className="text-[34px] font-[900] text-slate-900 leading-none tracking-tight">{g.items.length}</span>
                  <span className="text-[12px] font-[800] uppercase tracking-wider text-slate-400">{g.items.length === 1 ? 'Recording' : 'Recordings'}</span>
                </div>
                {other && <p className="relative mt-2 text-[12px] font-semibold text-slate-400">Saved without a subject - move them with the subject menu on each recording.</p>}
                <div className="relative mt-auto pt-5">
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-[12.5px] font-semibold text-slate-500 min-w-0">
                      <CalendarClock size={15} className="text-emerald-500 shrink-0" />
                      <span className="truncate">Latest: <span className="text-slate-700 font-bold">{formatDay(latestOf(g.items))}</span></span>
                    </span>
                    <ArrowRight size={18} className={`${p.text} shrink-0 group-hover:translate-x-1.5 transition-transform duration-300`} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* Recordings of one subject */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {subjectFolder.items.map(rec => renderRecordingCard(rec, false))}
        </div>
      )}

      {/* In-App Video Player Modal */}
      {playingRecording && (
        <RecordingPlayerModal recording={playingRecording} onClose={() => setPlayingRecording(null)} />
      )}

      {accessRecording && (
        <BundleAccessModal
          subtitle={accessRecording.topic || accessRecording.fileName || 'Recording'}
          bundles={bundles}
          value={accessValue}
          onChange={setAccessValue}
          onSave={saveRecordingAccess}
          onClose={() => setAccessRecording(null)}
          saving={isSavingAccess}
          defaultLabel="Any bundle with Recordings for this dept"
        />
      )}

      {/* Generic Confirmation Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[999999] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="text-[17px] font-[800] text-slate-800 mb-2">Confirm Action</h3>
              <p className="text-[14px] font-[500] text-slate-500 leading-relaxed mb-6">
                {confirmDialog.message}
              </p>
              
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-[13px] hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDialog.onConfirm}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-[13px] shadow-sm transition-colors"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* In-App Toast */}
      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(prev => ({ ...prev, show: false }))}
      />
    </div>
  );
}
