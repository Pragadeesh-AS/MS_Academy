import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, LogIn } from 'lucide-react';

export default function SessionExpired() {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 bg-white rounded-3xl shadow-xl border border-slate-100 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center">
            <Clock size={40} />
          </div>
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-3">Session Expired</h2>
        <p className="text-slate-500 mb-8">
          For your security, you have been logged out due to inactivity. Please log in again to continue.
        </p>
        <Link 
          to="/login"
          className="flex items-center justify-center gap-2 w-full py-3 bg-[#1d4ed8] text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
        >
          <LogIn size={18} />
          Log In Again
        </Link>
      </div>
    </div>
  );
}
