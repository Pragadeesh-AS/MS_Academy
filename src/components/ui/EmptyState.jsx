import React from 'react';
import { FileQuestion } from 'lucide-react';

export default function EmptyState({ 
  icon: Icon = FileQuestion, 
  title = "No Data Found", 
  message = "We couldn't find anything here.",
  actionButton = null 
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px] w-full border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
      <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
        <Icon size={32} />
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
      <p className="text-slate-500 max-w-sm mb-6">{message}</p>
      {actionButton}
    </div>
  );
}
