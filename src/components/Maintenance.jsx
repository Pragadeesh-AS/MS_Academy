import React from 'react';
import { Wrench } from 'lucide-react';

export default function Maintenance() {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        <div className="flex justify-center mb-8">
          <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-3xl rotate-12 flex items-center justify-center shadow-lg">
            <Wrench size={48} className="-rotate-12" />
          </div>
        </div>
        <h1 className="text-4xl font-black text-slate-900 mb-4">Under Maintenance</h1>
        <p className="text-lg text-slate-500 mb-8 leading-relaxed">
          We are currently performing scheduled maintenance to improve your experience. We'll be back online shortly.
        </p>
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 font-medium inline-block">
          Expected downtime: ~2 hours
        </div>
      </div>
    </div>
  );
}
