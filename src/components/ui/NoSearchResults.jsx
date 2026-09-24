import React from 'react';
import { SearchX } from 'lucide-react';

export default function NoSearchResults({ 
  query = "",
  onClear = null
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center w-full my-8">
      <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-5">
        <SearchX size={40} />
      </div>
      <h3 className="text-2xl font-bold text-slate-800 mb-2">No results found</h3>
      <p className="text-slate-500 max-w-md mb-6">
        We couldn't find any matches {query ? <span>for "<span className="font-semibold text-slate-700">{query}</span>"</span> : "for your search"}. Try adjusting your keywords or filters.
      </p>
      {onClear && (
        <button 
          onClick={onClear}
          className="px-6 py-2 bg-[#1d4ed8] text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Clear Search
        </button>
      )}
    </div>
  );
}
