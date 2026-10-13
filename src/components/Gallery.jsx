import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Image as ImageIcon, Sparkles } from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

export default function Gallery() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(null);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const snap = await getDocs(collection(db, 'gallery'));
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setPhotos(data);
      } catch (err) {
        console.error('Failed to load gallery:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchPhotos();
  }, []);

  const close = useCallback(() => setActiveIndex(null), []);
  const showPrev = useCallback(() => setActiveIndex(i => (i - 1 + photos.length) % photos.length), [photos.length]);
  const showNext = useCallback(() => setActiveIndex(i => (i + 1) % photos.length), [photos.length]);

  useEffect(() => {
    if (activeIndex === null) return;
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') showPrev();
      else if (e.key === 'ArrowRight') showNext();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [activeIndex, close, showPrev, showNext]);

  if (loading) {
    return (
      <div className="w-full max-w-[1200px] mx-auto px-6 py-24 text-center text-slate-400 font-bold">
        Loading gallery...
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-[1200px] mx-auto px-6 py-24 text-center">
        <h2 className="text-2xl font-black text-slate-800 mb-2">Couldn't load the gallery</h2>
        <p className="text-slate-500">Please try again in a little while.</p>
      </div>
    );
  }

  const active = activeIndex !== null ? photos[activeIndex] : null;

  return (
    <div className="w-full max-w-[1200px] mx-auto px-6 pt-4 pb-20">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-[#1d4ed8] font-semibold text-sm border border-blue-100 mb-5">
          <Sparkles size={16} /> <span>MS GATE Academy Gallery</span>
        </div>
        <h1 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-4">Moments at MS GATE Academy</h1>
        <p className="text-lg text-slate-500">Classes, events and celebrations from our campus.</p>
      </div>

      {photos.length === 0 ? (
        <div className="text-center bg-white border border-slate-200 rounded-3xl p-16 shadow-sm">
          <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <ImageIcon size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-1">No photos yet</h3>
          <p className="text-slate-500">Check back soon for new photos.</p>
        </div>
      ) : photos.length === 1 ? (
        <div className="flex justify-center w-full">
          <motion.button
            key={photos[0].id}
            type="button"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setActiveIndex(0)}
            className="group relative block w-full max-w-sm rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-xl transition-all duration-300 cursor-zoom-in"
          >
            <img
              src={photos[0].url}
              alt={photos[0].caption || 'MS GATE Academy gallery photo'}
              loading="lazy"
              className="w-full h-auto block group-hover:scale-105 transition-transform duration-500"
            />
            {photos[0].caption && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pt-10 pb-3 text-left opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-white text-sm font-semibold line-clamp-2">{photos[0].caption}</p>
              </div>
            )}
          </motion.button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {photos.map((photo, i) => (
            <motion.button
              key={photo.id}
              type="button"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 8) * 0.05 }}
              onClick={() => setActiveIndex(i)}
              className="group relative block w-full rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-xl transition-all duration-300 cursor-zoom-in"
            >
              <img
                src={photo.url}
                alt={photo.caption || 'MS GATE Academy gallery photo'}
                loading="lazy"
                className="w-full h-auto block group-hover:scale-105 transition-transform duration-500"
              />
              {photo.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pt-10 pb-3 text-left opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p className="text-white text-sm font-semibold line-clamp-2">{photo.caption}</p>
                </div>
              )}
            </motion.button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-10"
          >
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X size={24} />
            </button>

            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); showPrev(); }}
                  aria-label="Previous photo"
                  className="absolute left-2 sm:left-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <ChevronLeft size={28} />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); showNext(); }}
                  aria-label="Next photo"
                  className="absolute right-2 sm:right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <ChevronRight size={28} />
                </button>
              </>
            )}

            <figure onClick={(e) => e.stopPropagation()} className="flex flex-col items-center max-w-full max-h-full">
              <motion.img
                key={active.id}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                src={active.url}
                alt={active.caption || 'MS GATE Academy gallery photo'}
                className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
              />
              <figcaption className="mt-4 text-center text-white/90 text-sm font-semibold">
                {active.caption}
                <span className="block text-white/50 text-xs mt-1">{activeIndex + 1} / {photos.length}</span>
              </figcaption>
            </figure>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
