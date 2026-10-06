import React, { useEffect, useRef, useState } from 'react';
import { X, Download, Loader2, FileSignature, AlertCircle } from 'lucide-react';
import { AdmissionPageOne, AdmissionPageTwo } from '../admission/AdmissionFormSheet';
import { A4Preview, renderPagesPdf, safeFilePart } from './letterhead/Letterhead';
import { fetchAdmissionForm, formatFormDate } from '../../utils/admissionForm';

// Admin view of a student's signed Admission Application Form: both pages exactly as the student
// filled them in, with a PDF download.
export default function AdmissionFormViewer({ student, onClose }) {
  const [form, setForm] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | missing | error
  const [downloading, setDownloading] = useState(false);
  const pageOne = useRef(null);
  const pageTwo = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetchAdmissionForm(String(student.id))
      .then(f => { if (!cancelled) { setForm(f); setStatus(f ? 'ready' : 'missing'); } })
      .catch(e => { console.error('Failed to load admission form', e); if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, [student.id]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !downloading) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, downloading]);

  const download = async () => {
    if (!pageOne.current || !pageTwo.current) return;
    setDownloading(true);
    try {
      const pdf = await renderPagesPdf([pageOne.current, pageTwo.current], { scale: 3 });
      pdf.save(`Admission_Form_${safeFilePart(form.formNo)}_${safeFilePart(form.fullName)}.pdf`);
    } catch (e) {
      console.error('PDF export failed', e);
      alert('Could not create the PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const submittedOn = form?.submittedAt?.toDate
    ? form.submittedAt.toDate().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : formatFormDate(form?.applicationDate);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[120] flex items-center justify-center p-3 sm:p-6" onClick={() => !downloading && onClose()}>
      <div className="bg-slate-100 rounded-[24px] w-full max-w-[920px] h-full max-h-[94vh] shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="bg-white px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><FileSignature size={20} /></div>
            <div className="min-w-0">
              <h3 className="text-[17px] font-bold text-[#0F172A] truncate">Admission Application Form</h3>
              <p className="text-[13px] font-medium text-[#64748B] truncate">
                {student.name}{form ? ` · ${form.formNo} · Submitted ${submittedOn}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {status === 'ready' && (
              <button
                onClick={download}
                disabled={downloading}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[14px] bg-gradient-to-r from-[#2563EB] to-blue-500 text-white text-[14px] font-semibold shadow-[0_4px_14px_rgba(37,99,235,0.25)] disabled:opacity-60 transition-all"
              >
                {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                <span className="hidden sm:inline">{downloading ? 'Preparing…' : 'Download PDF'}</span>
              </button>
            )}
            <button onClick={() => !downloading && onClose()} className="text-[#64748B] hover:text-[#0F172A] bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors" aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {status === 'loading' && (
            <div className="h-full flex items-center justify-center text-slate-500 gap-2 text-[14px] font-semibold"><Loader2 size={18} className="animate-spin" /> Loading form…</div>
          )}
          {(status === 'missing' || status === 'error') && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-2">
              <AlertCircle size={28} className="text-slate-400" />
              <p className="text-[15px] font-semibold text-slate-700">{status === 'missing' ? 'This student has not submitted the admission form yet.' : 'The form could not be loaded.'}</p>
              {status === 'missing' && <p className="text-[13px] text-slate-500">They will be asked to fill it in the next time they open the student portal.</p>}
            </div>
          )}
          {status === 'ready' && (
            <div className="space-y-6">
              <A4Preview pageRef={pageOne}>
                <AdmissionPageOne
                  form={form}
                  readOnly
                  print
                  pageRef={pageOne}
                  formNo={form.formNo}
                  applicationDate={form.applicationDate}
                  photoSlot={(
                    <div className="w-[120px] h-[154px] border border-slate-500 overflow-hidden bg-white">
                      {form.photo && <img src={form.photo} alt="Student" className="w-full h-full object-cover" />}
                    </div>
                  )}
                />
              </A4Preview>
              <A4Preview pageRef={pageTwo}>
                <AdmissionPageTwo
                  form={form}
                  readOnly
                  print
                  pageRef={pageTwo}
                  signedDate={form.signedDate}
                  signatureSlot={form.signature ? <img src={form.signature} alt="Signature" className="max-h-[60px] max-w-full object-contain mb-0.5" /> : null}
                />
              </A4Preview>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
