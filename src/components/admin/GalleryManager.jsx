import React, { useState, useEffect, useRef } from 'react';
import { db, storage } from '../../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { Upload, Trash2, X, Image as ImageIcon, Check } from 'lucide-react';
import { resizeImage } from '../../utils/imageResize';
import Toast from '../shared/Toast';

const safeName = (name) => name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60) || 'photo';

export default function GalleryManager() {
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => setToast({ show: true, message, type });
  const [confirmDeleteObj, setConfirmDeleteObj] = useState(null);

  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({ done: 0, total: 0, progress: 0 });
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchPhotos();
  }, []);

  useEffect(() => {
    const urls = files.map(f => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach(u => URL.revokeObjectURL(u));
  }, [files]);

  const fetchPhotos = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'gallery'));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setPhotos(data);
    } catch (error) {
      console.error("Error fetching gallery:", error);
    } finally {
      setLoading(false);
    }
  };

  const openUploadModal = () => {
    setFiles([]);
    setCaption('');
    setShowModal(true);
  };

  const closeModal = () => {
    if (isUploading) return;
    setShowModal(false);
  };

  const handleFileSelect = (e) => {
    const picked = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    setFiles(picked);
  };

  const uploadOne = (blob, originalName) => new Promise((resolve, reject) => {
    const ext = blob.type === 'image/jpeg' ? 'jpg' : (originalName.split('.').pop() || 'jpg');
    const storagePath = `gallery/${Date.now()}_${safeName(originalName)}.${ext}`;
    const task = uploadBytesResumable(ref(storage, storagePath), blob, { contentType: blob.type || 'image/jpeg' });
    task.on(
      'state_changed',
      (snap) => setUploadStatus(s => ({ ...s, progress: (snap.bytesTransferred / snap.totalBytes) * 100 })),
      reject,
      async () => resolve({ url: await getDownloadURL(task.snapshot.ref), storagePath })
    );
  });

  const handleUpload = async () => {
    if (files.length === 0) {
      showToast("Please select at least one photo.", 'warning');
      return;
    }
    setIsUploading(true);
    setUploadStatus({ done: 0, total: files.length, progress: 0 });
    const added = [];
    try {
      for (const file of files) {
        const blob = await resizeImage(file);
        const { url, storagePath } = await uploadOne(blob, file.name);
        const entry = { url, storagePath, caption: caption.trim() };
        const docRef = await addDoc(collection(db, 'gallery'), { ...entry, createdAt: serverTimestamp() });
        added.unshift({ id: docRef.id, ...entry, createdAt: { seconds: Date.now() / 1000 } });
        setUploadStatus(s => ({ ...s, done: s.done + 1, progress: 0 }));
      }
      setShowModal(false);
      showToast(`Uploaded ${added.length} photo${added.length === 1 ? '' : 's'} successfully!`, 'success');
    } catch (error) {
      console.error("Error uploading photo:", error);
      showToast(`Upload failed after ${added.length} of ${files.length} photo(s): ${error.message}`, 'error');
    } finally {
      if (added.length) setPhotos(prev => [...added, ...prev]);
      setIsUploading(false);
    }
  };

  const handleDelete = (photo) => {
    setConfirmDeleteObj({
      title: 'Delete Photo',
      message: 'Are you sure you want to delete this photo from the gallery?',
      onConfirm: async () => {
        try {
          if (photo.storagePath) {
            try {
              await deleteObject(ref(storage, photo.storagePath));
            } catch (storageErr) {
              console.warn('Could not delete from storage (might already be deleted):', storageErr);
            }
          }
          await deleteDoc(doc(db, 'gallery', photo.id));
          setPhotos(photos.filter(p => p.id !== photo.id));
          showToast('Photo deleted from gallery.', 'success');
        } catch (error) {
          console.error("Error deleting photo:", error);
          showToast("Failed to delete photo.", 'error');
        }
      }
    });
  };

  return (
    <div className="flex flex-col h-full w-full max-w-6xl mx-auto pb-12 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Gallery Manager</h2>
          <p className="text-slate-500 font-medium mt-1">Upload photos to the public gallery on the main website.</p>
        </div>
        <button
          onClick={openUploadModal}
          className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm"
        >
          <Upload size={18} /> Upload Photos
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 font-bold bg-white rounded-3xl border border-slate-200">
          Loading gallery...
        </div>
      ) : photos.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
          <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <ImageIcon size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">No Photos Yet</h3>
          <p className="text-slate-500 mb-6">Upload photos to show them in the website gallery.</p>
          <button
            onClick={openUploadModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 mx-auto transition-colors"
          >
            <Upload size={18} /> Upload Photos
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map(photo => (
            <div key={photo.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col">
              <div className="aspect-square w-full overflow-hidden bg-slate-100 relative">
                <img src={photo.url} alt={photo.caption || 'Gallery photo'} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <button
                  onClick={() => handleDelete(photo)}
                  className="absolute top-2 right-2 p-2 bg-white/90 backdrop-blur-sm text-slate-500 hover:text-red-600 hover:bg-white rounded-lg shadow-sm transition-colors"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              {photo.caption && (
                <p className="px-3 py-2.5 text-sm font-semibold text-slate-600 line-clamp-2">{photo.caption}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <h3 className="text-xl font-black text-slate-800">Upload Photos</h3>
              <button
                onClick={closeModal}
                disabled={isUploading}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors disabled:opacity-40"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/50">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 rounded-2xl p-8 flex flex-col items-center gap-2 text-slate-500 transition-colors disabled:opacity-50"
              >
                <ImageIcon size={32} className="text-slate-400" />
                <span className="font-bold text-slate-700">Click to choose photos</span>
                <span className="text-xs font-medium">You can select multiple images at once</span>
              </button>

              {files.length > 0 && (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {previews.map((src, i) => (
                    <div key={src} className="aspect-square rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                      <img src={src} alt={files[i]?.name || ''} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Caption (Optional)</label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  disabled={isUploading}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm font-medium"
                  placeholder="e.g. Annual Day 2026, Toppers felicitation..."
                />
                <p className="text-xs text-slate-400 font-medium">Applied to all photos in this upload.</p>
              </div>

              {isUploading && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-500">
                    <span>Uploading {Math.min(uploadStatus.done + 1, uploadStatus.total)} of {uploadStatus.total}...</span>
                    <span>{Math.round(((uploadStatus.done + uploadStatus.progress / 100) / uploadStatus.total) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${((uploadStatus.done + uploadStatus.progress / 100) / uploadStatus.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={closeModal}
                disabled={isUploading}
                className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={isUploading || files.length === 0}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Check size={18} /> {isUploading ? 'Uploading...' : `Upload ${files.length || ''} Photo${files.length === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmDeleteObj && (
        <div className="fixed inset-0 z-[999999] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="text-[17px] font-[800] text-slate-800 mb-2">
                {confirmDeleteObj.title || 'Confirm Deletion'}
              </h3>
              <p className="text-[14px] font-[500] text-slate-500 leading-relaxed mb-6">
                {confirmDeleteObj.message}
              </p>
              
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteObj(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-[13px] hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const action = confirmDeleteObj.onConfirm;
                    setConfirmDeleteObj(null);
                    if (action) await action();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-[13px] shadow-sm transition-colors"
                >
                  Delete
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
