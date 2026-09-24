import React from 'react';
import { AlertOctagon, RefreshCcw } from 'lucide-react';

export default function ErrorState({ 
  title = "Something went wrong", 
  message = "An error occurred while loading this content. Please try again.",
  onRetry = null 
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[250px] w-full bg-red-50 rounded-2xl border border-red-100">
      <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
        <AlertOctagon size={28} />
      </div>
      <h3 className="text-lg font-bold text-red-800 mb-2">{title}</h3>
      <p className="text-red-600/80 max-w-md mb-5 text-sm">{message}</p>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors text-sm shadow-sm shadow-red-200"
        >
          <RefreshCcw size={16} />
          Try Again
        </button>
      )}
    </div>
  );
}
