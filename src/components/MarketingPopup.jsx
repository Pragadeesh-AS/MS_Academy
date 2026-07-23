import React, { useState, useEffect } from 'react';
import { X, PhoneCall, MessageSquare } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useLocation, useNavigate } from 'react-router-dom';

export default function MarketingPopup() {
  const [popupData, setPopupData] = useState({ isActive: false, imageUrl: null });
  const [isVisible, setIsVisible] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPopupSettings = async () => {
      try {
        const docRef = doc(db, 'site_settings', 'popup');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPopupData(data);
          
          // Only show if active, has an image, and hasn't been closed in this session
          if (data.isActive && data.imageUrl && !sessionStorage.getItem('marketing_popup_closed')) {
            setIsVisible(true);
          }
        }
      } catch (err) {
        console.error("Failed to fetch popup settings:", err);
      }
    };

    fetchPopupSettings();
  }, [location.pathname]); // Re-check if settings changed when navigating, but session storage prevents re-showing

  const handleClose = () => {
    setIsVisible(false);
    sessionStorage.setItem('marketing_popup_closed', 'true');
  };

  const handleEnquiry = () => {
    handleClose();
    navigate('/contact');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="relative max-w-3xl w-full rounded-[2rem] overflow-hidden shadow-2xl bg-white flex flex-col items-center justify-center animate-in zoom-in-95 duration-500 border border-white/10">
        
        {/* Close Button */}
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/20 hover:bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white/90 hover:text-white transition-all cursor-pointer"
        >
          <X size={20} strokeWidth={2.5} />
        </button>

        {/* Image */}
        <div className="w-full bg-slate-100 flex items-center justify-center overflow-hidden">
          <img 
            src={popupData.imageUrl} 
            alt="Announcement" 
            className="w-full h-auto max-h-[65vh] object-contain"
          />
        </div>

        {/* Action Bar */}
        <div className="w-full bg-white p-5 sm:p-6 flex flex-col sm:flex-row gap-4 justify-between items-center border-t border-slate-100">
          <div className="flex flex-col text-center sm:text-left mb-2 sm:mb-0">
            <h3 className="text-lg font-[900] text-slate-800">Interested?</h3>
            <p className="text-sm font-medium text-slate-500">Get in touch with us to learn more.</p>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
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
