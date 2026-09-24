import React from 'react';
import { WifiOff, RefreshCcw } from 'lucide-react';

export default function Offline() {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-8">
          <div className="w-24 h-24 bg-slate-200 text-slate-500 rounded-full flex items-center justify-center shadow-inner">
            <WifiOff size={48} />
          </div>
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-3">You're Offline</h1>
        <p className="text-slate-500 mb-8 leading-relaxed">
          It looks like you've lost your internet connection. Please check your network settings and try again.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-all shadow-lg"
        >
          <RefreshCcw size={18} />
          Retry Connection
        </button>
      </div>
    </div>
  );
}
