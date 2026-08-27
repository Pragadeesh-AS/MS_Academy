import React, { useState, useEffect } from 'react';
import { db, storage } from '../../firebase';
import { collection, query, getDocs, deleteDoc, doc, onSnapshot, orderBy } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { Video, Trash2, Search, Clock, Users, BookOpen, AlertCircle } from 'lucide-react';
import Loader from '../Loader';

export default function RecordingsManager() {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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

  const handleDelete = async (recording) => {
    if (!window.confirm("Are you sure you want to completely delete this recording? This will permanently remove the video file from storage.")) return;
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
      
      // 2. Delete the Firestore document
      await deleteDoc(doc(db, 'recordings', recording.id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete recording");
    }
  };

  const filteredRecordings = recordings.filter(r => 
    (r.topic && r.topic.toLowerCase().includes(search.toLowerCase())) || 
    (r.subject && r.subject.toLowerCase().includes(search.toLowerCase())) ||
    (r.fileName && r.fileName.toLowerCase().includes(search.toLowerCase())) ||
    (r.teacherName && r.teacherName.toLowerCase().includes(search.toLowerCase()))
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
          Total Recordings: <span className="text-blue-600">{filteredRecordings.length}</span>
        </div>
      </div>

      {/* Recordings Grid */}
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecordings.map(rec => (
            <div key={rec.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col h-full relative">
              <div className="h-40 bg-slate-900 relative flex items-center justify-center group-hover:bg-slate-800 transition-colors">
                <Video size={48} className="text-slate-700 group-hover:text-blue-500 transition-colors" />
                
                {/* Play Overlay */}
                <a 
                  href={rec.url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40"
                >
                  <div className="w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center pl-1">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                  </div>
                </a>
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
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
                </div>

                <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700">
                    {rec.department || 'General'}
                  </span>
                  
                  <button 
                    onClick={() => handleDelete(rec)}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
                    title="Delete Recording"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
