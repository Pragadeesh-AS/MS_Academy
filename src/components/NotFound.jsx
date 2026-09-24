import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import lottie from 'lottie-web';
import animationData from '../assets/404-animation.json';

export default function NotFound() {
  const navigate = useNavigate();
  const animationContainer = useRef(null);

  useEffect(() => {
    if (!animationContainer.current) return;
    
    const anim = lottie.loadAnimation({
      container: animationContainer.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: animationData,
    });
    
    return () => {
      anim.destroy();
    };
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      {/* Lottie Animation Container */}
      <div 
        ref={animationContainer} 
        className="w-full max-w-[600px] h-auto mb-8 pointer-events-none flex justify-center"
      />

      <p className="text-slate-700 font-semibold mb-8 text-lg md:text-xl text-center">
        Something went wrong please return to homepage
      </p>
      
      <button 
        onClick={() => navigate('/')} 
        className="px-10 py-3 bg-[#2d2d3a] hover:bg-[#1a1a24] text-white rounded-full font-medium transition-colors duration-300 tracking-wide shadow-md"
      >
        Home
      </button>
    </div>
  );
}
