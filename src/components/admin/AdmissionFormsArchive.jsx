import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Search, FileSignature, Eye, UserCheck, UserX } from 'lucide-react';
import { ADMISSION_FORMS } from '../../utils/admissionForm';

// Every admission form students have submitted. Forms live in their own 'admission_forms' collection
// (one per student, id = the student's id) and are never deleted with the student, so this list also
// keeps the forms of students who were removed from the directory.
const toMs = (v) => (v?.toMillis ? v.toMillis() : v?.seconds ? v.seconds * 1000 : (new Date(v).getTime() || 0));
const formatDay = (ms) => (ms ? new Date(ms).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');

export default function AdmissionFormsArchive({ joinedStudents, onView }) {
  const [forms, setForms] = useState(null); // null = loading
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getDocs(collection(db, ADMISSION_FORMS))
      .then(snap => setForms(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => toMs(b.submittedAt) - toMs(a.submittedAt))))
      .catch(err => { console.error('Could not load admission forms', err); setError(true); });
  }, []);

  const inDirectory = useMemo(() => new Set((joinedStudents || []).map(s => String(s.id))), [joinedStudents]);

  if (error) return <div className="bg-white rounded-[22px] border border-[#EEF2F7] p-10 text-center text-red-600 font-semibold">Couldn't load admission forms.</div>;
  if (forms === null) return <div className="bg-white rounded-[22px] border border-[#EEF2F7] p-10 text-center text-slate-400 font-semibold">Loading admission forms...</div>;

  // One list of every form - a deleted student's form stays right here with the rest
  const q = search.trim().toLowerCase();
  const visible = forms.filter(f => {
    return !q || [f.formNo, f.fullName, f.email, f.loginEmail, f.mobile, f.college, f.gatePaper].some(v => String(v || '').toLowerCase().includes(q));
  });

  return (
    <div className="space-y-5 relative z-10">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative group flex-1 basis-[280px] min-w-[240px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B] group-focus-within:text-[#2563EB] transition-colors" size={20} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by form no., name, email, phone or college..."
            className="w-full h-[48px] pl-12 pr-6 bg-white border border-[#EEF2F7] rounded-[14px] text-[14px] text-[#0F172A] placeholder:text-[#94A3B8] shadow-[0_4px_12px_rgba(15,23,42,0.02)] outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 transition-all"
          />
        </div>
        <span className="h-[40px] px-4 rounded-full text-[13px] font-semibold bg-white text-[#475569] border border-[#E5E7EB] flex items-center whitespace-nowrap">
          {q ? `${visible.length} of ${forms.length}` : forms.length} {forms.length === 1 ? 'form' : 'forms'}
        </span>
      </div>

      <p className="text-[12.5px] font-medium text-[#64748B] flex items-center gap-1.5">
        <FileSignature size={14} className="text-[#2563EB]" />
        Forms are kept here even after a student is deleted from the directory.
      </p>

      {visible.length === 0 ? (
        <div className="bg-white rounded-[22px] border border-[#EEF2F7] p-12 text-center text-slate-500 font-semibold">
          {forms.length === 0 ? 'No admission forms have been submitted yet.' : 'No forms match your search.'}
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(f => {
            const deleted = !inDirectory.has(f.id);
            return (
              <div key={f.id} className="bg-white rounded-[20px] border border-[#EEF2F7] p-4 sm:p-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)] flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  {f.photo ? (
                    <img src={f.photo} alt={f.fullName || 'Student photo'} className="w-[49px] h-[63px] rounded-lg object-cover object-top border border-[#E2E8F0] shadow-sm bg-white shrink-0" />
                  ) : (
                    <div className="w-[49px] h-[63px] rounded-lg bg-blue-50 border border-blue-100 text-[#2563EB] flex items-center justify-center shrink-0"><FileSignature size={20} /></div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[15px] text-[#0F172A] truncate">{f.fullName || 'Unnamed'}</span>
                      <span className="text-[11px] font-bold text-[#2563EB] bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">{f.formNo || 'No form no.'}</span>
                      {deleted ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md"><UserX size={12} /> Student deleted</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md"><UserCheck size={12} /> In directory</span>
                      )}
                    </div>
                    <p className="text-[13px] font-medium text-[#64748B] truncate mt-0.5">
                      {[f.email || f.loginEmail, f.mobile, f.gatePaper, f.college].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <div className="text-right">
                    <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">Submitted</div>
                    <div className="text-[13px] font-bold text-[#0F172A]">{formatDay(toMs(f.submittedAt))}</div>
                  </div>
                  <button
                    onClick={() => onView({ id: f.id, name: f.fullName })}
                    className="h-10 px-4 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-[13px] font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Eye size={15} /> View
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
