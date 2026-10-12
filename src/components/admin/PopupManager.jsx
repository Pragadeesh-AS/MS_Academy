import React, { useState, useEffect, useRef } from 'react';
import { db, storage } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { Upload, Trash2, ChevronLeft, ChevronRight, Timer, Image as ImageIcon } from 'lucide-react';
import { resizeImage } from '../../utils/imageResize';
import { popupImagesOf, popupIntervalOf, POPUP_INTERVAL_OPTIONS } from '../../utils/popupSettings';

const POPUP_DOC = () => doc(db, 'site_settings', 'popup');
const safeName = (name) => name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60) || 'poster';

// Admin tab for the website's marketing popup: on/off, several posters in order, and how often they change
export default function PopupManager() {
  const [loading, setLoading] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [images, setImages] = useState([]);
  const [interval, setIntervalSeconds] = useState(5);
  const [uploadLabel, setUploadLabel] = useState('');
  const [previewIndex, setPreviewIndex] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => {
    getDoc(POPUP_DOC())
      .then(snap => {
        const data = snap.exists() ? snap.data() : {};
        setIsActive(!!data.isActive);
        setImages(popupImagesOf(data));
        setIntervalSeconds(popupIntervalOf(data));
      })
      .catch(err => console.error('Popup fetch error:', err))
      .finally(() => setLoading(false));
  }, []);

  // Preview rotates like the real popup
  useEffect(() => {
    if (images.length < 2) { setPreviewIndex(0); return; }
    const t = setInterval(() => setPreviewIndex(i => (i + 1) % images.length), interval * 1000);
    return () => clearInterval(t);
  }, [images.length, interval]);

  // imageUrl mirrors the first poster for older versions of the site
  const saveImages = (next) => setDoc(POPUP_DOC(), { images: next, imageUrl: next[0]?.url || '' }, { merge: true });

  const uploadBlob = (blob, name) => new Promise((resolve, reject) => {
    const storagePath = `popups/${Date.now()}_${safeName(name)}.${blob.type === 'image/png' ? 'png' : blob.type === 'image/gif' ? 'gif' : 'jpg'}`;
    const task = uploadBytesResumable(ref(storage, storagePath), blob, { contentType: blob.type || 'image/jpeg' });
    task.on('state_changed', null, reject, async () => resolve({ url: await getDownloadURL(task.snapshot.ref), storagePath }));
  });

  // A poster from before multi-poster support is a data: URL inside the settings document - move it to Storage
  const ensureStored = async (item) => {
    if (item.storagePath || !item.url.startsWith('data:')) return item;
    const blob = await (await fetch(item.url)).blob();
    return uploadBlob(blob, 'popup');
  };

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    e.target.value = '';
    if (!files.length) return;
    const previous = images;
    try {
      const kept = [];
      for (const item of previous) kept.push(await ensureStored(item));
      const added = [];
      for (const [i, file] of files.entries()) {
        setUploadLabel(`Uploading ${i + 1} of ${files.length}...`);
        added.push(await uploadBlob(await resizeImage(file, 1600), file.name));
      }
      const next = [...kept, ...added];
      await saveImages(next);
      setImages(next);
    } catch (err) {
      console.error('Popup upload failed:', err);
      alert('Failed to upload the poster(s). Please try again.');
    } finally {
      setUploadLabel('');
    }
  };

  const reorder = async (from, to) => {
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    [next[from], next[to]] = [next[to], next[from]];
    const previous = images;
    setImages(next);
    try { await saveImages(next); } catch (err) { console.error(err); setImages(previous); alert('Failed to reorder posters.'); }
  };

  const remove = async (index) => {
    if (!window.confirm('Remove this poster from the popup?')) return;
    const item = images[index];
    const next = images.filter((_, i) => i !== index);
    try {
      await saveImages(next);
      setImages(next);
      if (item.storagePath) {
        deleteObject(ref(storage, item.storagePath)).catch(err => console.warn('Could not delete poster file:', err));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to remove the poster.');
    }
  };

  const toggleActive = async () => {
    const next = !isActive;
    setIsActive(next);
    try { await setDoc(POPUP_DOC(), { isActive: next }, { merge: true }); } catch (err) { console.error(err); setIsActive(!next); }
  };

  const changeInterval = async (seconds) => {
    const previous = interval;
    setIntervalSeconds(seconds);
    try { await setDoc(POPUP_DOC(), { intervalSeconds: seconds }, { merge: true }); } catch (err) { console.error(err); setIntervalSeconds(previous); }
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6 sm:gap-8 pb-12 animate-in fade-in duration-300">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl sm:text-3xl font-[900] text-slate-800 tracking-tight">Marketing Popup</h2>
        <p className="text-slate-500 font-medium">Posters shown to visitors on the website. With more than one, they change automatically.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 md:p-8 shadow-sm flex flex-col gap-6 sm:gap-8">
        {/* Status + timing */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex flex-col gap-1">
              <span className="text-lg font-[800] text-slate-800 flex items-center gap-2">
                Popup Status
                {isActive
                  ? <span className="bg-emerald-100 text-emerald-700 text-xs px-2.5 py-1 rounded-md font-bold uppercase tracking-widest">Live</span>
                  : <span className="bg-slate-200 text-slate-500 text-xs px-2.5 py-1 rounded-md font-bold uppercase tracking-widest">Off</span>}
              </span>
              <span className="text-sm font-medium text-slate-500">Show the popup on the website.</span>
            </div>
            <button
              onClick={toggleActive}
              disabled={loading}
              className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
              <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isActive ? 'translate-x-3' : '-translate-x-3'}`} />
            </button>
          </div>

          <div className="flex flex-col gap-3 p-5 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-lg font-[800] text-slate-800 flex items-center gap-2"><Timer size={18} className="text-blue-500" /> Change every</span>
            <div className="flex flex-wrap gap-2">
              {POPUP_INTERVAL_OPTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => changeInterval(s)}
                  disabled={loading}
                  className={`px-3.5 py-1.5 rounded-xl border text-sm font-bold transition-all ${interval === s ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-100' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'}`}
                >
                  {s} sec
                </button>
              ))}
            </div>
            <span className="text-xs font-medium text-slate-400">Only used when there's more than one poster.</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Posters */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-[800] text-slate-800 uppercase tracking-widest">Posters ({images.length})</h3>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || !!uploadLabel}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold flex items-center gap-2 shadow-sm transition-colors"
              >
                <Upload size={16} /> {uploadLabel || 'Add Posters'}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
            </div>

            {loading ? (
              <div className="h-48 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-sm font-bold text-slate-400">Loading...</div>
            ) : images.length === 0 ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="h-48 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 hover:bg-slate-100 hover:border-blue-400 flex flex-col items-center justify-center gap-2 text-slate-500 transition-all"
              >
                <ImageIcon size={32} className="text-slate-400" />
                <span className="font-bold text-slate-700">Click to add posters</span>
                <span className="text-xs font-medium">Select one or more images</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map((img, i) => (
                  <div key={img.storagePath || img.url.slice(-40) + i} className={`group relative rounded-2xl border overflow-hidden bg-slate-100 ${i === previewIndex ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200'}`}>
                    <img src={img.url} alt={`Poster ${i + 1}`} className="w-full aspect-[4/5] object-contain p-1.5" />
                    <span className="absolute top-2 left-2 w-7 h-7 rounded-full bg-slate-900/80 text-white text-xs font-black flex items-center justify-center">{i + 1}</span>
                    <div className="absolute inset-x-0 bottom-0 p-2 flex items-center justify-between gap-1 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex gap-1">
                        <button onClick={() => reorder(i, i - 1)} disabled={i === 0} className="w-8 h-8 rounded-lg bg-white/90 text-slate-700 flex items-center justify-center disabled:opacity-40" title="Show earlier"><ChevronLeft size={16} /></button>
                        <button onClick={() => reorder(i, i + 1)} disabled={i === images.length - 1} className="w-8 h-8 rounded-lg bg-white/90 text-slate-700 flex items-center justify-center disabled:opacity-40" title="Show later"><ChevronRight size={16} /></button>
                      </div>
                      <button onClick={() => remove(i)} className="w-8 h-8 rounded-lg bg-white/90 text-red-600 flex items-center justify-center hover:bg-red-50" title="Remove"><Trash2 size={15} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs font-medium text-slate-400">Posters are shown in this order. Hover a poster to move or remove it.</p>
          </div>

          {/* Preview */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <h3 className="text-[15px] font-[800] text-slate-800 uppercase tracking-widest">Preview</h3>
            <div className="relative w-full aspect-[4/5] border border-slate-200 rounded-2xl bg-slate-900 overflow-hidden shadow-inner">
              {images.length === 0 ? (
                <span className="absolute inset-0 flex items-center justify-center text-slate-400 font-bold text-sm">No posters yet</span>
              ) : images.map((img, i) => (
                <img
                  key={img.storagePath || i}
                  src={img.url}
                  alt=""
                  className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-700 ${i === previewIndex ? 'opacity-100' : 'opacity-0'}`}
                />
              ))}
              {images.length > 1 && (
                <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
                  {images.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === previewIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`} />)}
                </div>
              )}
            </div>
            {images.length > 1 && <p className="text-xs font-medium text-slate-400">Changes every {interval} seconds, like on the website.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
