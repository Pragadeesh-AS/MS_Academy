import React from 'react';
import { ServerCrash, RefreshCcw } from 'lucide-react';

export default function ServerError500({ error }) {
  const isDev = import.meta.env.DEV;

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full text-center">
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

        {isDev && error && (
          <div className="mt-12 text-left bg-red-50 p-6 rounded-xl border border-red-200 overflow-auto max-h-[500px]">
            <h3 className="text-red-800 font-bold mb-2 text-lg flex items-center gap-2">
              <span className="bg-red-200 text-red-800 text-xs px-2 py-1 rounded">DEV MODE</span>
              Error Details:
            </h3>
            <p className="text-red-600 font-mono text-sm mb-4">
              {error.message || String(error)}
            </p>
            {error.stack && (
              <pre className="text-xs text-red-500 font-mono whitespace-pre-wrap bg-white p-4 rounded border border-red-100">
                {error.stack}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
