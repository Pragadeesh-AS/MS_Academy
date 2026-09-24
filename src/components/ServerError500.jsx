import React from 'react';
import { ServerCrash, RefreshCcw } from 'lucide-react';

export default function ServerError500() {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-orange-100 blur-2xl rounded-full opacity-50"></div>
            <ServerCrash size={100} className="text-orange-500 relative z-10" />
          </div>
        </div>
        <h1 className="text-7xl font-black text-slate-900 mb-4 tracking-tight">500</h1>
        <h2 className="text-2xl font-bold text-slate-800 mb-3">Internal Server Error</h2>
        <p className="text-slate-500 mb-8 leading-relaxed">
          Oops! Something went wrong on our end. Our team has been notified and is working to fix the issue.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#1d4ed8] text-white font-medium rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
        >
          <RefreshCcw size={18} />
          Reload Page
        </button>
      </div>
    </div>
  );
}
