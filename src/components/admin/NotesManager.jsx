import React, { useState, useEffect, useMemo } from 'react';
import { db, storage } from '../../firebase';
import { collection, query, getDocs, addDoc, deleteDoc, updateDoc, doc, serverTimestamp, onSnapshot, writeBatch, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { FileText, Plus, Trash2, UploadCloud, Link as LinkIcon, X, CheckCircle2, ChevronDown, ChevronRight, Book, Search, AlertCircle, ArrowUpRight, Save, Folder, FolderPlus, FolderOpen, Home, Users, Tag, Package, Pencil } from 'lucide-react';
import Loader from '../Loader';
import { gateCoursesData } from '../GateCourses';

// Folder depth: Department (fixed) -> Subject -> Topic. Topics cannot contain further folders.
const LEVEL_NAMES = ['Subject', 'Topic'];
const MAX_FOLDER_DEPTH = LEVEL_NAMES.length;

const safeSegment = (s) => String(s || '').replace(/[^\w.\- ]/g, '_').trim() || 'untitled';

export default function NotesManager() {
  const [notes, setNotes] = useState([]);
  const [folders, setFolders] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Navigation: selected department + stack of folders opened inside it
  const [department, setDepartment] = useState(null);
  const [stack, setStack] = useState([]);

  // Upload modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadLabel, setUploadLabel] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bundleId, setBundleId] = useState('');
  const [uploadMode, setUploadMode] = useState('file'); // 'file' or 'url'
  const [fileUrl, setFileUrl] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);

  // New folder modal
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Subject access: price + assigning a whole subject to students
  const [students, setStudents] = useState([]);
  const [priceFolder, setPriceFolder] = useState(null);
  const [priceForm, setPriceForm] = useState({ price: '', discountedPrice: '' });
  const [isSavingPrice, setIsSavingPrice] = useState(false);
  const [assignFolder, setAssignFolder] = useState(null);
  const [assignSelected, setAssignSelected] = useState(new Set());
  const [assignSearch, setAssignSearch] = useState('');
  const [assignShowAll, setAssignShowAll] = useState(false);
  const [isSavingAssign, setIsSavingAssign] = useState(false);
  const [assignField, setAssignField] = useState('purchasedSubjects'); // or 'purchasedNoteBundles'

  // Notes bundles (a department's subjects sold together)
  const [noteBundles, setNoteBundles] = useState([]);
  const [bundleModal, setBundleModal] = useState(null); // { id? } when open
  const [bundleForm, setBundleForm] = useState({ name: '', includeAll: true, subjectIds: [], price: '', discountedPrice: '' });
  const [isSavingBundle, setIsSavingBundle] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState(null);

  const departments = useMemo(() => ['General', ...gateCoursesData.map(c => c.name)], []);

  useEffect(() => {
    const fetchBundles = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'course_bundles')));
        setBundles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Failed to load bundles', err);
      }
    };
    fetchBundles();

    const unsubNotes = onSnapshot(query(collection(db, 'notes')), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setNotes(data);
      setLoading(false);
    }, (err) => {
      console.error('Notes listener failed', err);
      setLoading(false);
    });

    const unsubFolders = onSnapshot(query(collection(db, 'note_folders')), (snapshot) => {
      setFolders(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error('Folders listener failed', err));

    const unsubStudents = onSnapshot(query(collection(db, 'joined_students')), (snapshot) => {
      setStudents(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error('Students listener failed', err));

    const unsubBundles = onSnapshot(query(collection(db, 'note_bundles')), (snapshot) => {
      setNoteBundles(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error('Note bundles listener failed', err));

    return () => { unsubNotes(); unsubFolders(); unsubStudents(); unsubBundles(); };
  }, []);

  const currentFolder = stack[stack.length - 1] || null;

  // All folder ids under (and including) a given folder
  const descendantIds = (folderId) => {
    const ids = [folderId];
    folders.filter(f => f.parentId === folderId).forEach(f => ids.push(...descendantIds(f.id)));
    return ids;
  };

  const notesInFolder = (folderId) => {
    const ids = new Set(descendantIds(folderId));
    return notes.filter(n => n.folderId && ids.has(n.folderId));
  };

  const notesInDepartment = (dept) => notes.filter(n => (n.department || 'General') === dept);

  // What to show in the current location
  const childFolders = department
    ? folders
        .filter(f => f.department === department && (f.parentId || null) === (currentFolder ? currentFolder.id : null))
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  const filesHere = department
    ? notes.filter(n => (n.department || 'General') === department && (n.folderId || null) === (currentFolder ? currentFolder.id : null))
    : [];

  const isSearching = search.trim().length > 0;
  const searchResults = isSearching
    ? notes.filter(n => {
        const q = search.toLowerCase();
        return [n.title, n.department, n.subject, n.topic, n.fileName].some(v => v && String(v).toLowerCase().includes(q));
      })
    : [];

  const canCreateFolder = department && stack.length < MAX_FOLDER_DEPTH;
  const nextLevelName = LEVEL_NAMES[stack.length]; // 'Subject' or 'Topic'

  const openDepartment = (dept) => { setDepartment(dept); setStack([]); setSearch(''); };
  const goRoot = () => { setDepartment(null); setStack([]); };
  const goToLevel = (idx) => setStack(stack.slice(0, idx + 1)); // idx -1 handled by department crumb
  const goDepartmentRoot = () => setStack([]);

  const resetUploadForm = () => {
    setTitle('');
    setDescription('');
    setBundleId('');
    setFileUrl('');
    setSelectedFiles([]);
    setUploadProgress(0);
    setUploadLabel('');
    setUploadMode('file');
  };

  const subjectPrice = (f) => Number(String(f.discountedPrice || f.price || '').replace(/[^\d.]/g, '')) || 0;
  const studentsWithAccess = (id, field = 'purchasedSubjects') => students.filter(st => (st[field] || []).includes(id));

  const openPrice = (folder) => {
    setPriceFolder(folder);
    setPriceForm({ price: folder.price || '', discountedPrice: folder.discountedPrice || '' });
  };

  const handleSavePrice = async (e) => {
    e.preventDefault();
    const price = Number(priceForm.price) || 0;
    const discounted = Number(priceForm.discountedPrice) || 0;
    if (discounted && price && discounted > price) {
      alert('Discounted price cannot be higher than the price.');
      return;
    }
    setIsSavingPrice(true);
    try {
      await updateDoc(doc(db, 'note_folders', priceFolder.id), { price, discountedPrice: discounted });
      // keep the open breadcrumb copy in sync
      setStack(prev => prev.map(f => (f.id === priceFolder.id ? { ...f, price, discountedPrice: discounted } : f)));
      setPriceFolder(null);
    } catch (err) {
      console.error(err);
      alert('Failed to save price: ' + err.message);
    } finally {
      setIsSavingPrice(false);
    }
  };

  const openAssign = (folder, field = 'purchasedSubjects') => {
    setAssignFolder(folder);
    setAssignField(field);
    setAssignSelected(new Set(studentsWithAccess(folder.id, field).map(st => st.id)));
    setAssignSearch('');
    setAssignShowAll(false);
  };

  const toggleAssign = (id) => setAssignSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const handleSaveAssign = async () => {
    const before = new Set(studentsWithAccess(assignFolder.id, assignField).map(st => st.id));
    const toAdd = [...assignSelected].filter(id => !before.has(id));
    const toRemove = [...before].filter(id => !assignSelected.has(id));
    if (toAdd.length === 0 && toRemove.length === 0) { setAssignFolder(null); return; }
    setIsSavingAssign(true);
    try {
      const batch = writeBatch(db);
      toAdd.forEach(id => batch.update(doc(db, 'joined_students', id), { [assignField]: arrayUnion(assignFolder.id) }));
      toRemove.forEach(id => batch.update(doc(db, 'joined_students', id), { [assignField]: arrayRemove(assignFolder.id) }));
      await batch.commit();
      setAssignFolder(null);
    } catch (err) {
      console.error(err);
      alert('Failed to update access: ' + err.message);
    } finally {
      setIsSavingAssign(false);
    }
  };

  const assignList = assignFolder
    ? students
        .filter(st => assignShowAll || (st.department || '') === assignFolder.department)
        .filter(st => {
          const q = assignSearch.toLowerCase();
          return !q || (st.name || '').toLowerCase().includes(q) || (st.email || '').toLowerCase().includes(q);
        })
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    : [];

  const deptSubjects = (dept) => folders.filter(f => f.department === dept && !f.parentId).sort((a, b) => a.name.localeCompare(b.name));
  const bundlePrice = (b) => Number(String(b.discountedPrice || b.price || '').replace(/[^\d.]/g, '')) || 0;
  const bundleSubjectCount = (b) => (b.includeAll ? deptSubjects(b.department).length : (b.subjectIds || []).filter(id => folders.some(f => f.id === id)).length);

  const openBundleModal = (bundle = null) => {
    setBundleForm(bundle
      ? { name: bundle.name || '', includeAll: !!bundle.includeAll, subjectIds: bundle.subjectIds || [], price: bundle.price || '', discountedPrice: bundle.discountedPrice || '' }
      : { name: `${department} Full Notes`, includeAll: true, subjectIds: [], price: '', discountedPrice: '' });
    setBundleModal({ id: bundle ? bundle.id : null });
  };

  const toggleBundleSubject = (id) => setBundleForm(prev => ({
    ...prev,
    subjectIds: prev.subjectIds.includes(id) ? prev.subjectIds.filter(x => x !== id) : [...prev.subjectIds, id]
  }));

  const handleSaveBundle = async (e) => {
    e.preventDefault();
    const name = bundleForm.name.trim();
    const price = Number(bundleForm.price) || 0;
    const discounted = Number(bundleForm.discountedPrice) || 0;
    if (!name) return;
    if (!bundleForm.includeAll && bundleForm.subjectIds.length === 0) {
      alert('Select at least one subject, or include all subjects.');
      return;
    }
    if (discounted && price && discounted > price) {
      alert('Offer price cannot be higher than the price.');
      return;
    }
    setIsSavingBundle(true);
    try {
      const data = { name, department, includeAll: bundleForm.includeAll, subjectIds: bundleForm.includeAll ? [] : bundleForm.subjectIds, price, discountedPrice: discounted };
      if (bundleModal.id) {
        await updateDoc(doc(db, 'note_bundles', bundleModal.id), data);
      } else {
        await addDoc(collection(db, 'note_bundles'), { ...data, createdAt: serverTimestamp() });
      }
      setBundleModal(null);
    } catch (err) {
      console.error(err);
      alert('Failed to save bundle: ' + err.message);
    } finally {
      setIsSavingBundle(false);
    }
  };

  const handleDeleteBundle = (bundle) => {
    const holders = studentsWithAccess(bundle.id, 'purchasedNoteBundles').length;
    setConfirmDialog({
      message: holders > 0
        ? `"${bundle.name}" is held by ${holders} student${holders === 1 ? '' : 's'}. Deleting it removes their access to it. Delete anyway?`
        : `Delete the notes bundle "${bundle.name}"?`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await deleteDoc(doc(db, 'note_bundles', bundle.id));
        } catch (err) {
          console.error(err);
          alert('Failed to delete bundle');
        }
      }
    });
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    const name = folderName.trim();
    if (!name) return;
    const duplicate = childFolders.some(f => f.name.toLowerCase() === name.toLowerCase());
    if (duplicate) {
      alert(`A ${nextLevelName.toLowerCase()} folder named "${name}" already exists here.`);
      return;
    }
    setIsCreatingFolder(true);
    try {
      await addDoc(collection(db, 'note_folders'), {
        name,
        department,
        parentId: currentFolder ? currentFolder.id : null,
        level: nextLevelName.toLowerCase(),
        createdAt: serverTimestamp()
      });
      setFolderName('');
      setFolderModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to create folder: ' + err.message);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleDeleteFolder = (folder) => {
    const hasChildren = folders.some(f => f.parentId === folder.id);
    const fileCount = notesInFolder(folder.id).length;
    if (hasChildren || fileCount > 0) {
      alert(`"${folder.name}" is not empty. Delete or move its ${hasChildren ? 'folders and ' : ''}files first.`);
      return;
    }
    setConfirmDialog({
      message: `Delete the empty folder "${folder.name}"?`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await deleteDoc(doc(db, 'note_folders', folder.id));
        } catch (err) {
          console.error(err);
          alert('Failed to delete folder');
        }
      }
    });
  };

  const uploadOne = (file) => new Promise((resolve, reject) => {
    const parts = ['notes', safeSegment(department), ...stack.map(f => safeSegment(f.name))];
    const storageRef = ref(storage, `${parts.join('/')}/${Date.now()}_${safeSegment(file.name)}`);
    const task = uploadBytesResumable(storageRef, file);
    task.on(
      'state_changed',
      (snap) => setUploadProgress((snap.bytesTransferred / snap.totalBytes) * 100),
      reject,
      async () => resolve(await getDownloadURL(task.snapshot.ref))
    );
  });

  const locationFields = () => ({
    department,
    folderId: currentFolder ? currentFolder.id : null,
    subjectId: stack[0] ? stack[0].id : '',
    subject: stack[0] ? stack[0].name : '',
    topic: stack[1] ? stack[1].name : ''
  });

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (uploadMode === 'file' && selectedFiles.length === 0) {
      alert('Please select at least one file to upload');
      return;
    }
    if (uploadMode === 'url' && (!fileUrl.trim() || !title.trim())) {
      alert('Please provide a title and a valid URL');
      return;
    }

    setIsUploading(true);
    try {
      if (uploadMode === 'file') {
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          setUploadLabel(`Uploading ${i + 1} of ${selectedFiles.length}: ${file.name}`);
          setUploadProgress(0);
          const url = await uploadOne(file);
          const baseName = file.name.replace(/\.[^.]+$/, '');
          await addDoc(collection(db, 'notes'), {
            title: selectedFiles.length === 1 && title.trim() ? title.trim() : baseName,
            description,
            bundleId,
            url,
            type: 'pdf',
            fileName: file.name,
            fileSize: file.size,
            ...locationFields(),
            createdAt: serverTimestamp()
          });
        }
      } else {
        await addDoc(collection(db, 'notes'), {
          title: title.trim(),
          description,
          bundleId,
          url: fileUrl.trim(),
          type: 'link',
          fileName: 'External Link',
          fileSize: 0,
          ...locationFields(),
          createdAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      resetUploadForm();
    } catch (err) {
      console.error(err);
      alert('Failed to add note: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const executeDelete = async (note) => {
    try {
      if (note.url && note.url.includes('firebasestorage.googleapis.com')) {
        try {
          await deleteObject(ref(storage, note.url));
        } catch (storageErr) {
          console.warn('Could not delete from storage (might already be deleted):', storageErr);
        }
      }
      await deleteDoc(doc(db, 'notes', note.id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete note');
    }
  };

  const handleDelete = (note) => {
    setConfirmDialog({
      message: 'Are you sure you want to delete this note?',
      onConfirm: async () => {
        setConfirmDialog(null);
        await executeDelete(note);
      }
    });
  };

  const getBundleName = (bId) => {
    if (!bId) return 'Any bundle (Dept-level)';
    const b = bundles.find(x => x.id === bId);
    return b ? b.name : bId;
  };

  const locationLabel = (n) => [n.department || 'General', n.subject, n.topic].filter(Boolean).join(' / ');

  const renderNoteCard = (note, showLocation = false) => (
    <div key={note.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden group hover:border-blue-300 hover:shadow-md transition-all">
      <div className="p-5">
        <div className="flex justify-between items-start mb-3 gap-2">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            {note.type === 'link' ? <LinkIcon size={18} /> : <FileText size={18} />}
          </div>
          <button onClick={() => handleDelete(note)} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete note">
            <Trash2 size={16} />
          </button>
        </div>
        <h3 className="text-[16px] font-[900] text-slate-900 mb-1 line-clamp-2" title={note.title}>{note.title}</h3>
        {showLocation && <p className="text-[11px] font-bold text-blue-600 mb-1 truncate" title={locationLabel(note)}>{locationLabel(note)}</p>}
        {note.description && <p className="text-sm font-medium text-slate-500 line-clamp-2">{note.description}</p>}
        <div className="space-y-2 mt-4 pt-3 border-t border-slate-100 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-400 font-medium flex items-center gap-1.5 shrink-0"><Book size={14} /> Access:</span>
            <span className="text-slate-700 font-bold truncate" title={getBundleName(note.bundleId)}>{getBundleName(note.bundleId)}</span>
          </div>
          {note.fileName && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400 font-medium flex items-center gap-1.5 shrink-0"><FileText size={14} /> File:</span>
              <span className="text-slate-700 font-bold truncate" title={note.fileName}>{note.fileName}</span>
            </div>
          )}
        </div>
      </div>
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400">
          {note.createdAt?.toDate ? note.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Just now'}
        </span>
        <a href={note.url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
          View File <ArrowUpRight size={14} />
        </a>
      </div>
    </div>
  );

  const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-colors';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-[32px] font-[900] text-slate-900 tracking-tight leading-none mb-2 flex items-center gap-2">
            <FileText className="text-blue-600" size={32} />
            Study Notes Manager
          </h2>
          <p className="text-slate-500 font-medium text-[15px]">Organise notes into Department &rarr; Subject &rarr; Topic folders and upload files into them.</p>
        </div>
        {department && (
          <div className="flex flex-wrap gap-3">
            {canCreateFolder && (
              <button
                onClick={() => { setFolderName(''); setFolderModalOpen(true); }}
                className="px-5 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm"
              >
                <FolderPlus size={20} className="text-amber-500" /> New {nextLevelName} Folder
              </button>
            )}
            <button
              onClick={() => { resetUploadForm(); setIsModalOpen(true); }}
              className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/30"
            >
              <UploadCloud size={20} /> Upload Here
            </button>
          </div>
        )}
      </div>

      {/* Search + breadcrumb */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <Search className="text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search all notes by title, department, subject or topic..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent border-none outline-none font-medium text-slate-700 placeholder-slate-400"
          />
        </div>
        {!isSearching && (
          <div className="flex flex-wrap items-center gap-1.5 text-sm font-bold pt-3 border-t border-slate-100">
            <button onClick={goRoot} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors ${!department ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-100'}`}>
              <Home size={14} /> All Departments
            </button>
            {department && (
              <>
                <ChevronRight size={14} className="text-slate-300" />
                <button onClick={goDepartmentRoot} className={`px-2.5 py-1 rounded-lg transition-colors ${stack.length === 0 ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-100'}`}>
                  {department}
                </button>
              </>
            )}
            {stack.map((f, i) => (
              <React.Fragment key={f.id}>
                <ChevronRight size={14} className="text-slate-300" />
                <button onClick={() => goToLevel(i)} className={`px-2.5 py-1 rounded-lg transition-colors ${i === stack.length - 1 ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-100'}`}>
                  {f.name}
                </button>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center p-10"><Loader /></div>
      ) : isSearching ? (
        searchResults.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center text-slate-500 font-semibold">No notes match your search.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">{searchResults.map(n => renderNoteCard(n, true))}</div>
        )
      ) : !department ? (
        /* Root: department folders */
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {departments.map(dept => {
            const count = notesInDepartment(dept).length;
            const subjectCount = folders.filter(f => f.department === dept && !f.parentId).length;
            return (
              <button
                key={dept}
                onClick={() => openDepartment(dept)}
                className="text-left bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-md transition-all group"
              >
                <Folder size={34} className="text-amber-500 mb-3 group-hover:hidden" />
                <FolderOpen size={34} className="text-amber-500 mb-3 hidden group-hover:block" />
                <div className="font-[900] text-slate-900 leading-tight line-clamp-2" title={dept}>{dept}</div>
                <div className="text-xs font-bold text-slate-400 mt-2">
                  {subjectCount} {subjectCount === 1 ? 'subject' : 'subjects'} &bull; {count} {count === 1 ? 'file' : 'files'}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Subject access bar (shown inside a subject folder) */}
          {stack[0] && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-bold text-slate-700">
                <span className="text-slate-500 font-semibold">Subject access &mdash; </span>
                {subjectPrice(stack[0]) ? <span className="text-emerald-600">Sold for ₹{subjectPrice(stack[0])}</span> : <span className="text-slate-500">Not for individual sale</span>}
                <span className="text-slate-400"> &bull; {studentsWithAccess(stack[0].id).length} students have access</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openAssign(stack[0])} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 flex items-center gap-1.5"><Users size={15} /> Assign to students</button>
                <button onClick={() => openPrice(stack[0])} className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 flex items-center gap-1.5"><Tag size={15} /> Set price</button>
              </div>
            </div>
          )}

          {/* Notes bundles (department level) */}
          {stack.length === 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[12px] font-[800] uppercase tracking-wider text-slate-400">Notes Bundles</h3>
                <button onClick={() => openBundleModal()} className="px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 flex items-center gap-1.5"><Package size={14} /> Create Bundle</button>
              </div>
              {noteBundles.filter(b => b.department === department).length === 0 ? (
                <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-6 text-center text-sm font-semibold text-slate-400">
                  No bundles yet. Create one to sell all subjects of {department} together.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {noteBundles.filter(b => b.department === department).map(b => (
                    <div key={b.id} className="bg-white border border-indigo-100 rounded-2xl p-5 shadow-sm space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><Package size={22} /></div>
                        <div className="min-w-0 flex-1">
                          <div className="font-[900] text-slate-900 leading-tight line-clamp-2" title={b.name}>{b.name}</div>
                          <div className="text-xs font-bold text-slate-400 mt-1">
                            {b.includeAll ? `All subjects (${bundleSubjectCount(b)} now)` : `${bundleSubjectCount(b)} selected subjects`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className={bundlePrice(b) ? 'text-emerald-600' : 'text-slate-400'}>{bundlePrice(b) ? `₹${bundlePrice(b)}` : 'Not for sale'}</span>
                        <span className="text-slate-400">{studentsWithAccess(b.id, 'purchasedNoteBundles').length} with access</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => openAssign(b, 'purchasedNoteBundles')} className="flex-1 px-2 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 flex items-center justify-center gap-1"><Users size={12} /> Assign</button>
                        <button onClick={() => openBundleModal(b)} className="flex-1 px-2 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 flex items-center justify-center gap-1"><Pencil size={12} /> Edit</button>
                        <button onClick={() => handleDeleteBundle(b)} className="px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50" title="Delete bundle"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sub-folders */}
          {(childFolders.length > 0 || canCreateFolder) && (
            <div>
              <h3 className="text-[12px] font-[800] uppercase tracking-wider text-slate-400 mb-3">
                {stack.length === 0 ? 'Subjects' : stack.length === 1 ? 'Topics' : 'Folders'}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {childFolders.map(f => {
                  const fileCount = notesInFolder(f.id).length;
                  const subCount = folders.filter(x => x.parentId === f.id).length;
                  return (
                    <div key={f.id} className="relative bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-md transition-all group">
                      <button onClick={() => setStack([...stack, f])} className="text-left w-full">
                        <Folder size={34} className="text-amber-500 mb-3" />
                        <div className="font-[900] text-slate-900 leading-tight line-clamp-2" title={f.name}>{f.name}</div>
                        <div className="text-xs font-bold text-slate-400 mt-2">
                          {stack.length === 0 && `${subCount} ${subCount === 1 ? 'topic' : 'topics'} • `}{fileCount} {fileCount === 1 ? 'file' : 'files'}
                        </div>
                      </button>
                      {stack.length === 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className={subjectPrice(f) ? 'text-emerald-600' : 'text-slate-400'}>{subjectPrice(f) ? `₹${subjectPrice(f)}` : 'Not for sale'}</span>
                            <span className="text-slate-400">{studentsWithAccess(f.id).length} with access</span>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => openAssign(f)} className="flex-1 px-2 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 flex items-center justify-center gap-1"><Users size={12} /> Assign</button>
                            <button onClick={() => openPrice(f)} className="flex-1 px-2 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 flex items-center justify-center gap-1"><Tag size={12} /> Price</button>
                          </div>
                        </div>
                      )}
                      <button
                        onClick={() => handleDeleteFolder(f)}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete folder"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                })}
                {canCreateFolder && (
                  <button
                    onClick={() => { setFolderName(''); setFolderModalOpen(true); }}
                    className="border-2 border-dashed border-slate-300 rounded-2xl p-5 flex flex-col items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50/40 transition-all min-h-[120px]"
                  >
                    <FolderPlus size={28} className="mb-2" />
                    <span className="text-sm font-bold">New {nextLevelName}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Files in this folder */}
          <div>
            <h3 className="text-[12px] font-[800] uppercase tracking-wider text-slate-400 mb-3">Files ({filesHere.length})</h3>
            {filesHere.length === 0 ? (
              <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center">
                <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UploadCloud size={30} />
                </div>
                <p className="text-slate-500 font-semibold mb-5">No files in this folder yet.</p>
                <button
                  onClick={() => { resetUploadForm(); setIsModalOpen(true); }}
                  className="px-6 py-3 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-100 transition-colors inline-flex items-center gap-2"
                >
                  <Plus size={20} /> Upload Files Here
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">{filesHere.map(n => renderNoteCard(n))}</div>
            )}
          </div>
        </div>
      )}

      {/* Create / Edit Notes Bundle Modal */}
      {bundleModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveBundle} className="bg-white rounded-[24px] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl p-8 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-[900] text-slate-900 flex items-center gap-2"><Package className="text-indigo-600" /> {bundleModal.id ? 'Edit' : 'Create'} Notes Bundle</h3>
              <button type="button" onClick={() => setBundleModal(null)} className="w-9 h-9 bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 rounded-full flex items-center justify-center transition-colors"><X size={18} /></button>
            </div>
            <p className="text-sm font-semibold text-slate-500">Department: <span className="text-slate-800">{department}</span></p>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Bundle name</label>
              <input type="text" required value={bundleForm.name} onChange={e => setBundleForm({ ...bundleForm, name: e.target.value })} className={inputCls} />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-700">Subjects included</label>
              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer ${bundleForm.includeAll ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-200'}`}>
                <input type="radio" checked={bundleForm.includeAll} onChange={() => setBundleForm({ ...bundleForm, includeAll: true })} className="mt-1" />
                <span className="text-sm">
                  <span className="font-bold text-slate-800">All subjects in {department}</span>
                  <span className="block text-xs font-medium text-slate-500">{deptSubjects(department).length} now &mdash; subjects added later are included automatically.</span>
                </span>
              </label>
              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer ${!bundleForm.includeAll ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-200'}`}>
                <input type="radio" checked={!bundleForm.includeAll} onChange={() => setBundleForm({ ...bundleForm, includeAll: false })} className="mt-1" />
                <span className="text-sm font-bold text-slate-800">Only selected subjects</span>
              </label>
              {!bundleForm.includeAll && (
                <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                  {deptSubjects(department).length === 0 ? (
                    <div className="p-4 text-sm font-semibold text-slate-400 text-center">Create subject folders first.</div>
                  ) : deptSubjects(department).map(f => (
                    <label key={f.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer text-sm font-semibold text-slate-700">
                      <input type="checkbox" checked={bundleForm.subjectIds.includes(f.id)} onChange={() => toggleBundleSubject(f.id)} />
                      {f.name}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Price (₹)</label>
                <input type="number" min="0" value={bundleForm.price} onChange={e => setBundleForm({ ...bundleForm, price: e.target.value })} className={inputCls} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Offer price (₹)</label>
                <input type="number" min="0" value={bundleForm.discountedPrice} onChange={e => setBundleForm({ ...bundleForm, discountedPrice: e.target.value })} placeholder="optional" className={inputCls} />
              </div>
            </div>
            <p className="text-xs font-medium text-slate-400">Leave the price at 0 if you only want to assign this bundle to students yourself.</p>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setBundleModal(null)} className="px-5 py-2.5 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
              <button type="submit" disabled={isSavingBundle} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl disabled:opacity-50 transition-colors">{isSavingBundle ? 'Saving...' : 'Save Bundle'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Set Price Modal */}
      {priceFolder && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSavePrice} className="bg-white rounded-[24px] w-full max-w-md shadow-2xl p-8 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-[900] text-slate-900 flex items-center gap-2"><Tag className="text-blue-600" /> Subject Price</h3>
              <button type="button" onClick={() => setPriceFolder(null)} className="w-9 h-9 bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 rounded-full flex items-center justify-center transition-colors"><X size={18} /></button>
            </div>
            <p className="text-sm font-semibold text-slate-500">Students of <span className="text-slate-800">{priceFolder.department}</span> can buy <span className="text-slate-800">{priceFolder.name}</span> on its own for this price. Leave at 0 to keep it out of individual sale.</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Price (₹)</label>
                <input type="number" min="0" value={priceForm.price} onChange={e => setPriceForm({ ...priceForm, price: e.target.value })} className={inputCls} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Offer price (₹)</label>
                <input type="number" min="0" value={priceForm.discountedPrice} onChange={e => setPriceForm({ ...priceForm, discountedPrice: e.target.value })} placeholder="optional" className={inputCls} />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setPriceFolder(null)} className="px-5 py-2.5 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
              <button type="submit" disabled={isSavingPrice} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl disabled:opacity-50 transition-colors">{isSavingPrice ? 'Saving...' : 'Save Price'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Assign Subject to Students Modal */}
      {assignFolder && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-[900] text-slate-900 flex items-center gap-2"><Users className="text-blue-600" /> {assignField === 'purchasedNoteBundles' ? 'Assign Notes Bundle' : 'Assign Subject'}</h3>
                <p className="text-sm font-semibold text-slate-500 mt-1">{assignField === 'purchasedNoteBundles'
                    ? <>Selected students get access to every subject in the bundle <span className="text-slate-800">{assignFolder.department} / {assignFolder.name}</span>.</>
                    : <>Selected students get access to every note in <span className="text-slate-800">{assignFolder.department} / {assignFolder.name}</span>.</>}</p>
              </div>
              <button onClick={() => setAssignFolder(null)} className="w-9 h-9 bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 rounded-full flex items-center justify-center transition-colors shrink-0"><X size={18} /></button>
            </div>
            <div className="p-4 border-b border-slate-100 space-y-3">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3">
                <Search size={16} className="text-slate-400" />
                <input value={assignSearch} onChange={e => setAssignSearch(e.target.value)} placeholder="Search students..." className="w-full bg-transparent py-2.5 outline-none text-sm font-medium" />
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500 cursor-pointer select-none">
                <input type="checkbox" checked={assignShowAll} onChange={e => setAssignShowAll(e.target.checked)} />
                Also show students from other departments
              </label>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {assignList.length === 0 ? (
                <div className="p-10 text-center text-sm font-semibold text-slate-400">No students found.</div>
              ) : assignList.map(st => (
                <label key={st.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={assignSelected.has(st.id)} onChange={() => toggleAssign(st.id)} className="w-4 h-4" />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-800 text-sm truncate">{st.name || 'Unnamed'}</div>
                    <div className="text-xs font-medium text-slate-400 truncate">{st.email}{st.department ? ` • ${st.department}` : ''}</div>
                  </div>
                </label>
              ))}
            </div>
            <div className="p-5 border-t border-slate-100 flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-slate-500">{assignSelected.size} selected</span>
              <div className="flex gap-3">
                <button onClick={() => setAssignFolder(null)} className="px-5 py-2.5 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                <button onClick={handleSaveAssign} disabled={isSavingAssign} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl disabled:opacity-50 transition-colors">{isSavingAssign ? 'Saving...' : 'Save Access'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {folderModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateFolder} className="bg-white rounded-[24px] w-full max-w-md shadow-2xl p-8 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-[900] text-slate-900 flex items-center gap-2"><FolderPlus className="text-amber-500" /> New {nextLevelName} Folder</h3>
              <button type="button" onClick={() => setFolderModalOpen(false)} className="w-9 h-9 bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 rounded-full flex items-center justify-center transition-colors">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm font-semibold text-slate-500">
              Inside: <span className="text-slate-800">{[department, ...stack.map(f => f.name)].join(' / ')}</span>
            </p>
            <input
              autoFocus
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder={nextLevelName === 'Subject' ? 'e.g. Data Structures' : 'e.g. Binary Trees'}
              className={inputCls}
            />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setFolderModalOpen(false)} className="px-5 py-2.5 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
              <button type="submit" disabled={isCreatingFolder || !folderName.trim()} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl disabled:opacity-50 transition-colors">
                {isCreatingFolder ? 'Creating...' : 'Create Folder'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scaleIn custom-scrollbar">
            <div className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-slate-100 p-6 px-8 flex items-center justify-between z-10">
              <div>
                <h3 className="text-2xl font-[900] text-slate-900">Upload Study Notes</h3>
                <p className="text-sm font-semibold text-slate-500 mt-1 flex items-center gap-1.5">
                  <Folder size={14} className="text-amber-500" />
                  {[department, ...stack.map(f => f.name)].join(' / ')}
                </p>
              </div>
              <button onClick={() => !isUploading && setIsModalOpen(false)} className="w-10 h-10 bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 rounded-full flex items-center justify-center transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddNote} className="p-8 space-y-6">
              <div className="pt-1">
                <div className="flex bg-slate-100 p-1 rounded-xl mb-4 w-fit">
                  <button type="button" onClick={() => setUploadMode('file')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${uploadMode === 'file' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    Upload Files
                  </button>
                  <button type="button" onClick={() => setUploadMode('url')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${uploadMode === 'url' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    Paste URL
                  </button>
                </div>

                {uploadMode === 'file' ? (
                  <div className="relative">
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.ppt,.pptx"
                      onChange={e => setSelectedFiles(Array.from(e.target.files || []))}
                      className="hidden"
                      id="note-file-upload"
                    />
                    <label
                      htmlFor="note-file-upload"
                      className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${selectedFiles.length ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400'}`}
                    >
                      {selectedFiles.length ? (
                        <>
                          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3">
                            <CheckCircle2 size={24} />
                          </div>
                          <span className="font-bold text-slate-800">{selectedFiles.length === 1 ? selectedFiles[0].name : `${selectedFiles.length} files selected`}</span>
                          <span className="text-sm font-medium text-slate-500 mt-1">
                            {(selectedFiles.reduce((a, f) => a + f.size, 0) / 1024 / 1024).toFixed(2)} MB total
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 bg-white text-slate-400 rounded-full flex items-center justify-center mb-3 shadow-sm border border-slate-200">
                            <UploadCloud size={24} />
                          </div>
                          <span className="font-bold text-slate-700">Click to choose one or more files</span>
                          <span className="text-sm font-medium text-slate-400 mt-1">PDF, DOC, DOCX, PPT, PPTX</span>
                        </>
                      )}
                    </label>
                    {selectedFiles.length > 1 && (
                      <ul className="mt-3 max-h-28 overflow-y-auto text-xs font-semibold text-slate-500 space-y-1">
                        {selectedFiles.map(f => <li key={f.name + f.size} className="truncate">&bull; {f.name}</li>)}
                      </ul>
                    )}
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
                        className={inputCls + ' pl-11'}
                      />
                    </div>
                  </div>
                )}
              </div>

              {(uploadMode === 'url' || selectedFiles.length <= 1) && (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Note Title {uploadMode === 'url' ? '*' : '(defaults to the file name)'}</label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g., Binary Trees - Chapter 1"
                    className={inputCls}
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Assign to Bundle (Optional)</label>
                <div className="relative">
                  <select value={bundleId} onChange={e => setBundleId(e.target.value)} className={inputCls + ' appearance-none cursor-pointer'}>
                    <option value="">-- Apply to ANY bundle containing Notes for this dept --</option>
                    {bundles.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
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
                  className={inputCls + ' resize-none'}
                />
              </div>

              {isUploading && (
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between text-xs font-bold text-slate-600 gap-3">
                    <span className="truncate">{uploadLabel || 'Uploading...'}</span>
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
                  {isUploading ? 'Uploading...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generic Confirmation Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center font-sans text-black p-4">
          <div className="bg-white rounded-md shadow-xl w-full max-w-sm overflow-hidden">
            <div className="bg-red-600 text-white px-4 py-3 font-bold text-lg border-b">Confirm Action</div>
            <div className="p-6">
              <p className="text-gray-800 text-base mb-6">{confirmDialog.message}</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setConfirmDialog(null)} className="px-4 py-2 border border-gray-300 rounded text-gray-700 font-bold hover:bg-gray-100 transition">Cancel</button>
                <button onClick={confirmDialog.onConfirm} className="px-4 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700 transition">Confirm</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
