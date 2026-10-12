import React, { useState, useEffect } from 'react';
import { X, PhoneCall, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useLocation, useNavigate } from 'react-router-dom';
import { popupImagesOf, popupIntervalOf } from '../utils/popupSettings';

export default function MarketingPopup() {
  const [images, setImages] = useState([]);
  const [intervalSeconds, setIntervalSeconds] = useState(5);
  const [isVisible, setIsVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPopupSettings = async () => {
      try {
        const docRef = doc(db, 'site_settings', 'popup');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const posters = popupImagesOf(data);
          setImages(posters);
          setIntervalSeconds(popupIntervalOf(data));

          // Only show if active, has a poster, and hasn't been closed in this session
          if (data.isActive && posters.length > 0 && !sessionStorage.getItem('marketing_popup_closed')) {
            setIsVisible(true);
          }
        }
      } catch (err) {
        console.error("Failed to fetch popup settings:", err);
      }
    };

    fetchPopupSettings();
  }, [location.pathname]); // Re-check if settings changed when navigating, but session storage prevents re-showing

  // Several posters: move to the next one every few seconds (paused while the visitor hovers / touches it)
  const count = images.length;
  useEffect(() => {
    if (!isVisible || count < 2 || paused) return;
    const t = setTimeout(() => setIndex(i => (i + 1) % count), intervalSeconds * 1000);
    return () => clearTimeout(t);
  }, [isVisible, count, paused, intervalSeconds, index]);

  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  const handleClose = () => {
    setIsVisible(false);
    sessionStorage.setItem('marketing_popup_closed', 'true');
  };

  const handleEnquiry = () => {
    handleClose();
    navigate('/contact');
  };

  const go = (step) => setIndex(i => (i + step + count) % count);

  if (!isVisible || count === 0) return null;

  const multiple = count > 1;
  const current = images[Math.min(index, count - 1)];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-300">
      <div className={`relative max-w-3xl max-h-[92vh] overflow-y-auto rounded-[2rem] shadow-2xl bg-white flex flex-col items-center justify-center animate-in zoom-in-95 duration-500 border border-white/10 ${multiple ? 'w-[min(42rem,100%)]' : 'w-fit min-w-[min(20rem,100%)]'}`}>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/20 hover:bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white/90 hover:text-white transition-all cursor-pointer"
        >
          <X size={20} strokeWidth={2.5} />
        </button>

        {multiple ? (
          /* Several posters: a fixed stage so the popup doesn't jump in size; each poster fades in over a blurred copy of itself */
          <div
            className="relative w-full h-[min(calc(92vh-11rem),40rem)] bg-slate-900 overflow-hidden"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onTouchStart={() => setPaused(true)}
            onTouchEnd={() => setPaused(false)}
          >
            <img src={current.url} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-60" />
            {images.map((img, i) => (
              <img
                key={img.storagePath || i}
                src={img.url}
                alt={`Announcement ${i + 1}`}
                className={`absolute inset-0 w-full h-full object-contain transition-all duration-700 ease-out ${i === index ? 'opacity-100 scale-100' : 'opacity-0 scale-[1.03] pointer-events-none'}`}
              />
            ))}

            <button
              onClick={() => go(-1)}
              aria-label="Previous poster"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/30 hover:bg-black/60 backdrop-blur-md text-white flex items-center justify-center transition-colors"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              onClick={() => go(1)}
              aria-label="Next poster"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/30 hover:bg-black/60 backdrop-blur-md text-white flex items-center justify-center transition-colors"
            >
              <ChevronRight size={22} />
            </button>

            <div className="absolute bottom-4 inset-x-0 z-10 flex justify-center gap-2">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  aria-label={`Show poster ${i + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${i === index ? 'w-7 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'}`}
                />
              ))}
            </div>
          </div>
        ) : (
          /* Image */
          <div className="w-full bg-slate-100 flex items-center justify-center overflow-hidden">
            {/* Sized by the poster itself: portrait posters stay tall and narrow, landscape ones stay wide */}
            <img
              src={current.url}
              alt="Announcement"
              className="block w-auto h-auto max-w-full max-h-[calc(92vh-11rem)] object-contain"
            />
          </div>
        )}

        {/* Action Bar */}
        <div className="w-full bg-white p-5 sm:p-6 flex flex-wrap gap-4 justify-between items-center border-t border-slate-100">
          <div className="flex flex-col text-center sm:text-left mx-auto sm:mx-0">
            <h3 className="text-lg font-[900] text-slate-800">Interested?</h3>
            <p className="text-sm font-medium text-slate-500">Get in touch with us to learn more.</p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto mx-auto sm:mx-0">
            <a
              href="tel:+918012052331"
              onClick={handleClose}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white px-5 py-3 rounded-xl font-bold text-[15px] transition-all shadow-sm"
            >
              <PhoneCall size={18} />
              Call Now
            </a>
            <button
              onClick={handleEnquiry}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#1d4ed8] hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-bold text-[15px] transition-all shadow-sm"
            >
              <MessageSquare size={18} />
              Enquiry Form
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
