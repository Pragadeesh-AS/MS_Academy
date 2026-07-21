import React from 'react';

export default function Overlay() {
  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col">
      <nav className="p-6 flex justify-between items-center pointer-events-auto">
        <div className="flex items-center gap-2">
          <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-blue-700 uppercase tracking-tight">
            MS Gate Academy
          </div>
          <span className="text-[10px] text-blue-600 font-bold uppercase tracking-widest leading-none">Coimbatore</span>
        </div>
        <div className="hidden md:flex space-x-6 text-sm font-semibold text-slate-700">
          <a href="#" className="hover:text-blue-500 transition-colors">Home</a>
          <a href="#courses" className="hover:text-blue-500 transition-colors">GATE Courses</a>
          <a href="#" className="hover:text-blue-500 transition-colors">About Us</a>
          <a href="#" className="hover:text-blue-500 transition-colors">Contact</a>
        </div>
        <button className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-full hover:shadow-lg hover:shadow-blue-500/40 transition-all pointer-events-auto">
          Student Portal
        </button>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 pointer-events-auto">
        <h1 className="text-5xl md:text-7xl font-bold mb-6 text-slate-900 drop-shadow-sm">
          Best GATE Coaching in Coimbatore
        </h1>
        <h2 className="text-3xl md:text-4xl font-bold mb-6 text-slate-700">
          Ignite your dreams
        </h2>
        <p className="text-xl md:text-2xl text-slate-600 max-w-2xl mb-10 italic">
          Learn directly from <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-amber-600 font-extrabold not-italic">Mr. M. Muthu Samy</span> (NIT Trichy Alumnus & 4-Time Consecutive GATE Qualifier)
        </p>
        <button className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-500 via-purple-600 to-blue-600 hover:scale-105 text-white px-8 py-4 rounded-full font-bold shadow-xl shadow-blue-500/20 transition-transform">
          Book your 1st free session
        </button>
      </main>

      <div className="absolute bottom-10 left-0 right-0 flex justify-center pointer-events-auto">
        <div className="text-center">
          <p className="text-slate-500 text-sm mb-2 uppercase tracking-widest font-semibold">Explore Courses</p>
          <div className="animate-bounce">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-blue-500">
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
