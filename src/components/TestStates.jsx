import React from 'react';
import EmptyState from './ui/EmptyState';
import NoSearchResults from './ui/NoSearchResults';
import ErrorState from './ui/ErrorState';
import SuccessState from './ui/SuccessState';

export default function TestStates() {
  return (
    <div className="flex-1 bg-transparent p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-slate-900">UI States Gallery</h1>
          <p className="text-slate-500 mt-2">A playground to verify your newly created reusable components</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-700 mb-6 border-b border-slate-100 pb-3">Empty State</h2>
            <EmptyState 
              title="No tests available" 
              message="You haven't created any tests yet. Click the button below to get started." 
              actionButton={<button className="px-5 py-2.5 bg-[#1d4ed8] text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">Create Test</button>}
            />
          </section>

          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-700 mb-6 border-b border-slate-100 pb-3">No Search Results</h2>
            <NoSearchResults 
              query="Advanced React Patterns" 
              onClear={() => alert('Search cleared!')}
            />
          </section>

          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-700 mb-6 border-b border-slate-100 pb-3">Error State</h2>
            <ErrorState 
              title="Failed to load dashboard"
              message="We couldn't fetch your profile data because the server took too long to respond."
              onRetry={() => alert('Retrying fetch...')}
            />
          </section>

          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-700 mb-6 border-b border-slate-100 pb-3">Success State</h2>
            <SuccessState 
              title="Payment Successful!"
              message="Your subscription has been activated. You now have full access to all premium courses."
              actionButton={<button className="px-6 py-2.5 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors">Go to Dashboard</button>}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
