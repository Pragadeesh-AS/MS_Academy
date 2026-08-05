import React, { useState } from 'react';
import { 
  Search, 
  ChevronDown, 
  Eye, 
  Edit, 
  MoreVertical, 
  Users, 
  UserCheck, 
  Clock, 
  ShieldCheck, 
  MailPlus,
  ChevronLeft,
  ChevronRight,
  Filter,
  Trash2,
  RotateCcw,
  X
} from 'lucide-react';

const TypistDirectory = ({ 
  invitedTypists, 
  deleteTypist, 
  onInvite
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const typistsPerPage = 10;

  const filteredTypists = invitedTypists.filter(typist => 
    typist.typistName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    typist.typistEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    typist.reviewerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    typist.reviewerEmail?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredTypists.length / typistsPerPage);
  const paginatedTypists = filteredTypists.slice(
    (currentPage - 1) * typistsPerPage, 
    currentPage * typistsPerPage
  );

  return (
    <div className="bg-[#F8FAFC] min-h-full rounded-[2rem] px-8 pb-8 pt-0 relative overflow-hidden" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(79, 70, 229, 0.04) 0%, transparent 70%)' }}>
      
      {/* Background Texture Overlay */}
      <div className="absolute inset-0 z-0 opacity-40 mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'radial-gradient(#94A3B8 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10 relative z-10 pt-8">
        <div>
          <h2 className="text-[36px] font-bold text-[#0F172A] tracking-tight leading-tight font-sans">
            Data Entry Pairs
          </h2>
          <p className="text-[#64748B] text-[15px] font-medium mt-1">
            Manage Typist and Reviewer pairs for question bank management.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={onInvite}
            className="bg-gradient-to-r from-[#4F46E5] to-[#2563EB] hover:from-[#4338CA] hover:to-[#1D4ED8] text-white px-5 py-2.5 rounded-[16px] text-[15px] font-semibold shadow-[0_4px_14px_rgba(79,70,229,0.3)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.45)] hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 whitespace-nowrap"
          >
            <MailPlus size={18} strokeWidth={2.5} />
            <span>Invite Pair</span>
          </button>
        </div>
      </div>

      <div className="space-y-7 relative z-10">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-7">
          {/* Total Typists */}
          <div className="bg-white rounded-[22px] p-6 border border-[#EEF2F7] shadow-[0_10px_28px_rgba(15,23,42,0.05)] hover:-translate-y-1 transition-transform duration-300 flex flex-col justify-between h-[130px]">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-[#64748B] mb-2">
                  <span className="text-[13px] font-medium">Total Pairs</span>
                </div>
                <h3 className="text-[34px] font-bold text-[#0F172A] leading-none">
                  {invitedTypists.length}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-[#2563EB]">
                <Users size={24} strokeWidth={2} />
              </div>
            </div>
          </div>

          {/* Active Typists */}
          <div className="bg-white rounded-[22px] p-6 border border-[#EEF2F7] shadow-[0_10px_28px_rgba(15,23,42,0.05)] hover:-translate-y-1 transition-transform duration-300 flex flex-col justify-between h-[130px]">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-[#64748B] mb-2">
                  <span className="text-[13px] font-medium">Active Pairs</span>
                </div>
                <h3 className="text-[34px] font-bold text-[#0F172A] leading-none">
                  {invitedTypists.filter(t => t.status === 'Accepted').length}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center text-[#10B981]">
                <UserCheck size={24} strokeWidth={2} />
              </div>
            </div>
          </div>

          {/* Pending Approval */}
          <div className="bg-white rounded-[22px] p-6 border border-[#EEF2F7] shadow-[0_10px_28px_rgba(15,23,42,0.05)] hover:-translate-y-1 transition-transform duration-300 flex flex-col justify-between h-[130px]">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-[#64748B] mb-2">
                  <span className="text-[13px] font-medium">Pending Invites</span>
                </div>
                <h3 className="text-[34px] font-bold text-[#0F172A] leading-none">
                  {invitedTypists.filter(t => t.status !== 'Accepted').length}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center text-[#F59E0B]">
                <Clock size={24} strokeWidth={2} />
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col xl:flex-row xl:items-start gap-4">
          <div className="relative group flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-[#2563EB] transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Search typist by name, email..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full h-[48px] pl-12 pr-6 bg-white border border-[#EEF2F7] rounded-[14px] text-[14px] text-[#0F172A] placeholder:text-[#94A3B8] shadow-sm outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 transition-all"
            />
          </div>
        </div>

        {/* Typists Table */}
        <div className="bg-white rounded-[24px] border border-[#EEF2F7] shadow-[0_12px_30px_rgba(15,23,42,0.05)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#EEF2F7]">
                  <th className="py-5 px-6 font-semibold text-[#64748B] text-[13px] uppercase tracking-wider">Pair Info</th>
                  <th className="py-5 px-6 font-semibold text-[#64748B] text-[13px] uppercase tracking-wider">Status</th>
                  <th className="py-5 px-6 font-semibold text-[#64748B] text-[13px] uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2F7]">
                {paginatedTypists.map((typist) => (
                  <tr key={typist.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-16">Typist</span>
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 shadow-sm flex items-center justify-center text-[12px] font-bold text-blue-600 uppercase shrink-0">
                            {typist.typistName?.charAt(0) || '?'}
                          </div>
                          <div>
                            <div className="font-bold text-[#0F172A] text-[14px]">{typist.typistName}</div>
                            <div className="text-[#64748B] text-[12px]">{typist.typistEmail}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-16">Reviewer</span>
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 shadow-sm flex items-center justify-center text-[12px] font-bold text-emerald-600 uppercase shrink-0">
                            {typist.reviewerName?.charAt(0) || '?'}
                          </div>
                          <div>
                            <div className="font-bold text-[#0F172A] text-[14px]">{typist.reviewerName}</div>
                            <div className="text-[#64748B] text-[12px]">{typist.reviewerEmail}</div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-semibold ${typist.status === 'Accepted' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                        {typist.status === 'Accepted' ? <ShieldCheck size={14} /> : <Clock size={14} />}
                        {typist.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => deleteTypist(typist.id)}
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Revoke Access"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTypists.length === 0 && (
                  <tr>
                    <td colSpan="3" className="py-16 text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4 text-[#94A3B8]">
                        <Users size={32} />
                      </div>
                      <div className="text-[16px] font-bold text-[#0F172A] mb-1">No typists found</div>
                      <div className="text-[#64748B] text-[14px]">Try adjusting your search criteria</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-[#EEF2F7] flex items-center justify-between bg-slate-50/50">
              <span className="text-[#64748B] text-[13px] font-medium">
                Showing {((currentPage - 1) * typistsPerPage) + 1} to {Math.min(currentPage * typistsPerPage, filteredTypists.length)} of {filteredTypists.length}
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="w-9 h-9 rounded-xl flex items-center justify-center border border-[#EEF2F7] bg-white text-[#475569] hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="w-9 h-9 rounded-xl flex items-center justify-center border border-[#EEF2F7] bg-white text-[#475569] hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TypistDirectory;
