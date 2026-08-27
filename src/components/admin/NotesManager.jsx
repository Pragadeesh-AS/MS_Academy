import React, { useState, useEffect } from 'react';
import { db, storage } from '../../firebase';
import { collection, query, getDocs, addDoc, deleteDoc, doc, serverTimestamp, onSnapshot, orderBy } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { FileText, Plus, Trash2, UploadCloud, Link as LinkIcon, X, CheckCircle2, ChevronDown, Layers, Book, Copy, Search, AlertCircle, FilePlus, ArrowUpRight, Save } from 'lucide-react';
import Loader from '../Loader';
import { gateCoursesData } from '../GateCourses';

export default function NotesManager() {
  const [notes, setNotes] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [search, setSearch] = useState('');

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('General');
  const [bundleId, setBundleId] = useState('');
  const [uploadMode, setUploadMode] = useState('file'); // 'file' or 'url'
  const [fileUrl, setFileUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [departments, setDepartments] = useState(['General']);

  useEffect(() => {
    // Populate departments from the comprehensive list in gateCoursesData
    const fetchedDepts = ['General', ...gateCoursesData.map(c => c.name)];
    setDepartments(fetchedDepts);

    // Fetch course bundles from Firestore
    const fetchBundles = async () => {
      try {
        const bSnapshot = await getDocs(collection(db, 'course_bundles'));
        setBundles(bSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      } catch (e) {
        console.error("Failed to fetch bundles:", e);
      }
    };
    fetchBundles();

    // Real-time listener for notes
    const q = query(collection(db, 'notes'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a,b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setNotes(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching notes:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!title) return alert("Title is required");
    
    if (uploadMode === 'file' && !selectedFile) {
      return alert("Please select a PDF file.");
    }
    if (uploadMode === 'url' && !fileUrl) {
      return alert("Please enter a valid document URL.");
    }

    setIsUploading(true);
    let finalUrl = fileUrl;

    try {
      if (uploadMode === 'file' && selectedFile) {
        const storageRef = ref(storage, `notes/${Date.now()}_${selectedFile.name}`);
        const uploadTask = uploadBytesResumable(storageRef, selectedFile);
        
        await new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const prog = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(prog);
            },
            (error) => reject(error),
            async () => {
              finalUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve();
            }
          );
        });
      }

      await addDoc(collection(db, 'notes'), {
        title,
        description,
        department,
        bundleId: bundleId || '', // empty means applicable to dept
        url: finalUrl,
        fileName: uploadMode === 'file' && selectedFile ? selectedFile.name : 'External Link',
        fileSize: uploadMode === 'file' && selectedFile ? selectedFile.size : 0,
        createdAt: serverTimestamp()
      });

      // Reset form
      setIsModalOpen(false);
      setTitle('');
      setDescription('');
      setDepartment('General');
      setBundleId('');
      setFileUrl('');
      setSelectedFile(null);
      setUploadProgress(0);
      setUploadMode('file');
      
    } catch (err) {
      console.error(err);
      alert("Failed to add note: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (note) => {
    if (!window.confirm("Are you sure you want to delete this note?")) return;
    try {
      // If it's a file uploaded to Firebase Storage, delete the file first
      if (note.url && note.url.includes('firebasestorage.googleapis.com')) {
        const fileRef = ref(storage, note.url);
        try {
          await deleteObject(fileRef);
        } catch (storageErr) {
          console.warn("Could not delete from storage (might already be deleted):", storageErr);
        }
      }
      
      // Delete the Firestore document
      await deleteDoc(doc(db, 'notes', note.id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete note");
    }
  };

  const getBundleName = (bId) => {
    if (!bId) return 'Any bundle (Dept-level)';
    const b = bundles.find(x => x.id === bId);
    return b ? b.name : bId;
  };

  const filteredNotes = notes.filter(n => 
    n.title?.toLowerCase().includes(search.toLowerCase()) || 
    n.department?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-[32px] font-[900] text-slate-900 tracking-tight leading-none mb-2 flex items-center gap-2">
            <FileText className="text-blue-600" size={32} />
            Study Notes Manager
          </h2>
          <p className="text-slate-500 font-medium text-[15px]">Upload and distribute departmental study materials to specific bundles.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/30"
        >
          <Plus size={20} /> Add New Note
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
        <Search className="text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Search notes by title or department..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent border-none outline-none font-medium text-slate-700 placeholder-slate-400"
        />
      </div>

      {loading ? (
        <div className="flex justify-center p-10"><Loader /></div>
      ) : filteredNotes.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-16 text-center">
          <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <FilePlus size={40} />
          </div>
          <h3 className="text-2xl font-[900] text-slate-900 mb-2">No Study Notes Yet</h3>
          <p className="text-slate-500 font-medium mb-8 max-w-md mx-auto">Upload PDF notes and assign them to specific departments or bundles to distribute them to students.</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-100 transition-colors inline-flex items-center gap-2"
          >
            <Plus size={20} /> Add Your First Note
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredNotes.map(note => (
            <div key={note.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden group hover:border-blue-300 hover:shadow-md transition-all">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 ${note.department === 'General' ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-700'}`}>
                    <Layers size={12} /> {note.department}
                  </div>
                  <button onClick={() => handleDelete(note.id)} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <h3 className="text-lg font-[900] text-slate-900 mb-2 line-clamp-2" title={note.title}>{note.title}</h3>
                {note.description && <p className="text-sm font-medium text-slate-500 line-clamp-2 mb-4">{note.description}</p>}
                
                <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 font-medium flex items-center gap-1.5"><Book size={14} /> Bundle Access:</span>
                    <span className="text-slate-700 font-bold max-w-[150px] truncate" title={getBundleName(note.bundleId)}>{getBundleName(note.bundleId)}</span>
                  </div>
                  {note.fileName && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400 font-medium flex items-center gap-1.5"><FileText size={14} /> File:</span>
                      <span className="text-slate-700 font-bold max-w-[150px] truncate" title={note.fileName}>{note.fileName}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">
                  {note.createdAt?.toDate ? note.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Just now'}
                </span>
                <a href={note.url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                  View File <ArrowUpRight size={14} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Note Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scaleIn custom-scrollbar">
            <div className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-slate-100 p-6 px-8 flex items-center justify-between z-10">
              <h3 className="text-2xl font-[900] text-slate-900">Upload Study Note</h3>
              <button onClick={() => !isUploading && setIsModalOpen(false)} className="w-10 h-10 bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 rounded-full flex items-center justify-center transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddNote} className="p-8 space-y-6">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Note Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g., CSE Notes Ch 1"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Department</label>
                  <div className="relative">
                    <select
                      value={department}
                      onChange={e => setDepartment(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-medium focus:outline-none focus:border-blue-500 focus:bg-white appearance-none cursor-pointer"
                    >
                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Assign to Bundle (Optional)</label>
                <div className="relative">
                  <select
                    value={bundleId}
                    onChange={e => setBundleId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-medium focus:outline-none focus:border-blue-500 focus:bg-white appearance-none cursor-pointer"
                  >
                    <option value="">-- Apply to ANY bundle containing Notes for this dept --</option>
                    {bundles.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                <p className="text-[13px] text-slate-500 font-medium mt-1.5 flex items-start gap-1.5">
                  <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                  Leave blank to allow access for anyone who has bought a bundle for {department} that includes notes access.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Brief description about these notes..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-colors resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="flex bg-slate-100 p-1 rounded-xl mb-4 w-fit">
                  <button type="button" onClick={() => setUploadMode('file')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${uploadMode === 'file' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    Upload File
                  </button>
                  <button type="button" onClick={() => setUploadMode('url')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${uploadMode === 'url' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    Paste URL
                  </button>
                </div>

                {uploadMode === 'file' ? (
                  <div className="relative">
                    <input 
                      type="file" 
                      accept=".pdf,.doc,.docx,.ppt,.pptx" 
                      onChange={e => setSelectedFile(e.target.files[0])}
                      className="hidden" 
                      id="note-file-upload" 
                    />
                    <label 
                      htmlFor="note-file-upload" 
                      className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${selectedFile ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400'}`}
                    >
                      {selectedFile ? (
                        <>
                          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3">
                            <CheckCircle2 size={24} />
                          </div>
                          <span className="font-bold text-slate-800">{selectedFile.name}</span>
                          <span className="text-sm font-medium text-slate-500 mt-1">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 bg-white text-slate-400 rounded-full flex items-center justify-center mb-3 shadow-sm border border-slate-200">
                            <UploadCloud size={24} />
                          </div>
                          <span className="font-bold text-slate-700">Click to upload PDF or Document</span>
                          <span className="text-sm font-medium text-slate-400 mt-1">Max file size 20MB</span>
                        </>
                      )}
                    </label>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Document URL (Google Drive, Dropbox, etc.)</label>
                    <div className="relative">
                      <LinkIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="url"
                        value={fileUrl}
                        onChange={e => setFileUrl(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-slate-700 font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                      />
                    </div>
                  </div>
                )}
              </div>

              {isUploading && (
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between text-xs font-bold text-slate-600">
                    <span>Uploading...</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all duration-300 ease-out rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => !isUploading && setIsModalOpen(false)} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={isUploading} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-50 flex items-center gap-2">
                  {isUploading ? <Loader size={18} color="white" /> : <Save size={18} />}
                  {isUploading ? 'Uploading...' : 'Save Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
