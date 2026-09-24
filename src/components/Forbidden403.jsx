import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function Forbidden403() {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-red-100 blur-2xl rounded-full opacity-50"></div>
            <ShieldAlert size={100} className="text-red-500 relative z-10" />
          </div>
        </div>
        <h1 className="text-7xl font-black text-slate-900 mb-4 tracking-tight">403</h1>
        <h2 className="text-2xl font-bold text-slate-800 mb-3">Access Forbidden</h2>
        <p className="text-slate-500 mb-8 leading-relaxed">
          You don't have permission to access this page. Please contact the administrator if you believe this is a mistake.
        </p>
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
        >
          <ArrowLeft size={18} />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
