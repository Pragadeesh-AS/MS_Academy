import React, { useState } from 'react';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Eye,
  Edit,
  Users,
  UserCheck,
  Clock,
  ShieldCheck,
  MailPlus,
  Trash2,
  X
} from 'lucide-react';

const TypistDirectory = ({
  invitedTypists,
  deleteTypist,
  updateTypist,
  onInvite
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedReviewers, setCollapsedReviewers] = useState({});
  const toggleReviewer = (key) => setCollapsedReviewers(prev => ({ ...prev, [key]: !prev[key] }));
  const [editingPair, setEditingPair] = useState(null);
  const [editForm, setEditForm] = useState({ typistName: '', typistEmail: '', reviewerName: '', reviewerEmail: '' });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const openEdit = (pair) => {
    setEditForm({
      typistName: pair.typistName || '',
      typistEmail: pair.typistEmail || '',
      reviewerName: pair.reviewerName || '',
      reviewerEmail: pair.reviewerEmail || ''
    });
    setEditingPair(pair);
  };

  // Emails are the login keys, so they can only change while the pair is still Pending (nobody has logged in yet).
  const hasAccepted = (pair, who) => (pair ? (pair[`${who}Accepted`] ?? pair.status === 'Accepted') : false);
  const emailLocked = (field) => !!editingPair && hasAccepted(editingPair, field === 'typistEmail' ? 'typist' : 'reviewer');

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingPair) return;
    const updates = {
      typistName: editForm.typistName.trim(),
      reviewerName: editForm.reviewerName.trim()
    };
    if (!emailLocked('typistEmail')) updates.typistEmail = editForm.typistEmail.trim().toLowerCase();
    if (!emailLocked('reviewerEmail')) updates.reviewerEmail = editForm.reviewerEmail.trim().toLowerCase();
    setIsSavingEdit(true);
    const ok = await updateTypist(editingPair.id, updates);
    setIsSavingEdit(false);
    if (ok) setEditingPair(null);
  };

  const filteredTypists = invitedTypists.filter(typist =>
    typist.typistName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    typist.typistEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    typist.reviewerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    typist.reviewerEmail?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Grouped by reviewer so it's obvious when several typists share one reviewer.
  const reviewerGroups = Object.values(
    filteredTypists.reduce((acc, t) => {
      const key = (t.reviewerEmail || '').toLowerCase() || `unassigned-${t.id}`;
      if (!acc[key]) acc[key] = { key, reviewerName: t.reviewerName, reviewerEmail: t.reviewerEmail, typists: [] };
      acc[key].typists.push(t);
      return acc;
    }, {})
  ).sort((a, b) => (a.reviewerName || '').localeCompare(b.reviewerName || ''));

  const uniqueReviewerCount = new Set(invitedTypists.map(t => (t.reviewerEmail || '').toLowerCase()).filter(Boolean)).size;

  return (
    <div className="bg-[#F8FAFC] min-h-full rounded-[2rem] px-4 sm:px-6 lg:px-8 pb-8 pt-0 relative overflow-hidden" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(79, 70, 229, 0.04) 0%, transparent 70%)' }}>
      
      {/* Background Texture Overlay */}
      <div className="absolute inset-0 z-0 opacity-40 mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'radial-gradient(#94A3B8 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10 relative z-10 pt-8">
        <div>
          <h2 className="text-[26px] sm:text-[30px] lg:text-[36px] font-bold text-[#0F172A] tracking-tight leading-tight font-sans">
            Data Entry Team
          </h2>
          <p className="text-[#64748B] text-[15px] font-medium mt-1">
            Manage typists and their reviewers. Several typists can share the same reviewer - all their extracted questions go to that reviewer.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={onInvite}
            className="bg-gradient-to-r from-[#4F46E5] to-[#2563EB] hover:from-[#4338CA] hover:to-[#1D4ED8] text-white px-5 py-2.5 rounded-[16px] text-[15px] font-semibold shadow-[0_4px_14px_rgba(79,70,229,0.3)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.45)] hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 whitespace-nowrap"
          >
            <MailPlus size={18} strokeWidth={2.5} />
            <span>Invite Typist</span>
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
                  <span className="text-[13px] font-medium">Total Typists</span>
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
                  <span className="text-[13px] font-medium">Active Typists</span>
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

          {/* Reviewers */}
          <div className="bg-white rounded-[22px] p-6 border border-[#EEF2F7] shadow-[0_10px_28px_rgba(15,23,42,0.05)] hover:-translate-y-1 transition-transform duration-300 flex flex-col justify-between h-[130px]">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-[#64748B] mb-2">
                  <span className="text-[13px] font-medium">Reviewers</span>
                </div>
                <h3 className="text-[34px] font-bold text-[#0F172A] leading-none">
                  {uniqueReviewerCount}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center text-[#8B5CF6]">
                <ShieldCheck size={24} strokeWidth={2} />
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
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-[48px] pl-12 pr-6 bg-white border border-[#EEF2F7] rounded-[14px] text-[14px] text-[#0F172A] placeholder:text-[#94A3B8] shadow-sm outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 transition-all"
            />
          </div>
        </div>

        {/* Typists grouped by their shared reviewer */}
        <div className="space-y-4">
          {reviewerGroups.map(group => {
            const isCollapsed = collapsedReviewers[group.key];
            const acceptedCount = group.typists.filter(t => t.status === 'Accepted').length;
            return (
              <div key={group.key} className="bg-white rounded-[24px] border border-[#EEF2F7] shadow-[0_12px_30px_rgba(15,23,42,0.05)] overflow-hidden">
                {/* Reviewer header */}
                <div
                  onClick={() => toggleReviewer(group.key)}
                  className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer hover:bg-emerald-50/30 transition-colors select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ChevronRight size={18} className={`text-[#64748B] shrink-0 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`} />
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 shadow-sm flex items-center justify-center text-[13px] font-bold text-emerald-600 uppercase shrink-0">
                      {group.reviewerName?.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-[#0F172A] text-[15px] truncate">{group.reviewerName || 'Unnamed Reviewer'} <span className="font-medium text-[#94A3B8]">- Reviewer</span></div>
                      <div className="text-[#64748B] text-[12px] truncate">{group.reviewerEmail}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[12px] font-bold text-[#0F172A] bg-slate-100 px-3 py-1 rounded-full">{group.typists.length} {group.typists.length === 1 ? 'typist' : 'typists'}</span>
                    <span className="hidden sm:inline text-[12px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">{acceptedCount} active</span>
                  </div>
                </div>

                {/* Typists under this reviewer */}
                {!isCollapsed && (
                  <div className="border-t border-[#EEF2F7] divide-y divide-[#EEF2F7]">
                    {group.typists.map(typist => (
                      <div key={typist.id} className="flex items-center justify-between gap-3 pl-14 pr-5 py-3.5 hover:bg-blue-50/30 transition-colors group">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 shadow-sm flex items-center justify-center text-[12px] font-bold text-blue-600 uppercase shrink-0">
                            {typist.typistName?.charAt(0) || '?'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-[#0F172A] text-[14px] flex items-center gap-2 truncate">
                              {typist.typistName}
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${hasAccepted(typist, 'typist') ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{hasAccepted(typist, 'typist') ? 'Accepted' : 'Awaiting'}</span>
                            </div>
                            <div className="text-[#64748B] text-[12px] truncate">{typist.typistEmail}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold ${typist.status === 'Accepted' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                            {typist.status === 'Accepted' ? <ShieldCheck size={13} /> : <Clock size={13} />}
                            {typist.status}
                          </span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEdit(typist)}
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-amber-50 hover:text-amber-500 transition-colors"
                              title="Edit Pairing"
                            >
                              <Edit size={17} />
                            </button>
                            <button
                              onClick={() => deleteTypist(typist.id)}
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                              title="Revoke Access"
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {reviewerGroups.length === 0 && (
            <div className="bg-white rounded-[24px] border border-[#EEF2F7] shadow-[0_12px_30px_rgba(15,23,42,0.05)] py-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4 text-[#94A3B8]">
                <Users size={32} />
              </div>
              <div className="text-[16px] font-bold text-[#0F172A] mb-1">No typists found</div>
              <div className="text-[#64748B] text-[14px]">Try adjusting your search criteria</div>
            </div>
          )}
        </div>
      </div>

      {editingPair && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => !isSavingEdit && setEditingPair(null)}>
          <div className="bg-white rounded-[24px] w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-[#EEF2F7] flex justify-between items-center shrink-0">
              <h3 className="text-[20px] font-bold text-[#0F172A]">Edit Data Entry Pair</h3>
              <button type="button" onClick={() => !isSavingEdit && setEditingPair(null)} className="text-[#64748B] hover:text-[#0F172A] transition-colors bg-slate-100 hover:bg-slate-200 p-2 rounded-full">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-5 sm:p-8 space-y-4 overflow-y-auto">
              {[
                ['typistName', 'Typist Name', 'text', false],
                ['typistEmail', 'Typist Email', 'email', true],
                ['reviewerName', 'Reviewer Name', 'text', false],
                ['reviewerEmail', 'Reviewer Email', 'email', true]
              ].map(([field, label, type, isEmail]) => (
                <div key={field}>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">{label}</label>
                  <input
                    type={type}
                    required
                    disabled={isEmail && emailLocked(field)}
                    value={editForm[field]}
                    onChange={(e) => setEditForm({ ...editForm, [field]: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold text-slate-800 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                  />
                </div>
              ))}
              {(emailLocked('typistEmail') || emailLocked('reviewerEmail')) && (
                <p className="text-[11px] text-slate-400 font-medium">An email is tied to that person's login and can't be changed once they have accepted. Remove and re-invite the pair to use a different email.</p>
              )}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button type="button" onClick={() => setEditingPair(null)} disabled={isSavingEdit} className="px-6 py-2.5 bg-white border border-[#E5E7EB] hover:bg-slate-50 text-[#64748B] font-semibold rounded-[14px] transition-colors shadow-sm disabled:opacity-60">Cancel</button>
                <button type="submit" disabled={isSavingEdit} className="px-6 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold rounded-[14px] transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed">{isSavingEdit ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TypistDirectory;
