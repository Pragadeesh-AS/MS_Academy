import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, ClipboardPaste, Upload, PenLine, Eraser, X, LogOut, Loader2, CheckCircle2, AlertCircle, FileSignature, ArrowRight, ArrowLeft } from 'lucide-react';
import logoImg from '../../assets/msgate_logo.png';
import { AdmissionPageOne, AdmissionPageTwo } from './AdmissionFormSheet';
import {
  emptyAdmissionForm, validateAdmissionForm, processPhoto, processSignatureFile, processSignatureCanvas,
  imageFromClipboard, submitAdmissionForm, loadDraft, saveDraft, clearDraft, todayIso,
  GATE_PAPERS, CURRENT_YEARS
} from '../../utils/admissionForm';

// Full-screen Admission Application Form shown instead of the student portal until it's submitted.
// There is no way past it except submitting (or logging out); payments are also refused by the
// server until the signed form exists.

const PROGRESS_FIELDS = [
  'ugBatch', 'fullName', 'dob', 'gender', 'mobile', 'whatsapp', 'email', 'address', 'degreeBranch', 'college',
  'currentYear', 'passingYear', 'cgpa', 'gatePaper', 'gateYear', 'referralSources', 'photo', 'signature', 'declarationAccepted'
];

// Prefill from what we already know about the student
const prefill = (student, email) => {
  const f = emptyAdmissionForm();
  const s = student || {};
  f.fullName = s.name || '';
  f.email = s.email || email || '';
  f.mobile = s.mobileNumber || '';
  f.whatsapp = s.whatsappNumber || '';
  f.college = s.collegeName || '';
  f.cgpa = s.cgpa || '';
  if (GATE_PAPERS.includes(s.department)) f.gatePaper = s.department;
  if (CURRENT_YEARS.includes(s.yearOfStudy)) f.currentYear = s.yearOfStudy;
  if (/^\d{4}\s*-\s*\d{4}$/.test(s.batch || '')) f.ugBatch = s.batch;
  return f;
};

// ---- Passport photo box (top right of page 1)
function PhotoBox({ photo, busy, onFile, onFocusChange, hasError }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
      onFocus={() => onFocusChange(true)}
      onBlur={() => onFocusChange(false)}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files?.[0]) onFile(e.dataTransfer.files[0]); }}
      className={`group relative w-[104px] h-[134px] sm:w-[120px] sm:h-[154px] border ${hasError ? 'border-red-500 bg-red-50' : dragging ? 'border-blue-500 bg-blue-50' : 'border-slate-500 bg-white'} cursor-pointer overflow-hidden outline-none focus-visible:ring-4 focus-visible:ring-blue-200 transition-colors`}
      title="Upload your passport-size photo"
    >
      {photo ? (
        <>
          <img src={photo} alt="Your photo" className="w-full h-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 bg-slate-900/70 text-white text-[11px] font-bold py-1.5 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity">
            <Camera size={12} /> Change
          </div>
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-center px-2 gap-1.5">
          <Camera size={22} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
          <span className="text-[10.5px] leading-tight text-slate-600">Affix recent passport-size photo</span>
          <span className="text-[10px] font-bold text-blue-700 leading-tight">Click to upload</span>
        </div>
      )}
      {busy && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 size={22} className="animate-spin text-blue-600" /></div>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) onFile(e.target.files[0]); e.target.value = ''; }} />
    </div>
  );
}

// ---- Draw-your-signature pad
function SignaturePad({ onCancel, onUse }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef(null);
  const [hasInk, setHasInk] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f1f4b';
    ctx.lineWidth = 2.6;
  }, []);

  const point = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const down = (e) => {
    e.preventDefault();
    canvasRef.current.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = point(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.arc(last.current.x, last.current.y, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = '#0f1f4b';
    ctx.fill();
    setHasInk(true);
  };
  const move = (e) => {
    if (!drawing.current) return;
    const p = point(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };
  const up = () => { drawing.current = false; };
  const clear = () => {
    const c = canvasRef.current;
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
    setHasInk(false);
    setError('');
  };
  const use = () => {
    try {
      onUse(processSignatureCanvas(canvasRef.current));
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-3xl w-full max-w-[560px] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-[17px] font-[800] text-slate-900">Draw your signature</h3>
            <p className="text-[12.5px] text-slate-500 font-medium">Use your mouse, finger or stylus.</p>
          </div>
          <button type="button" onClick={onCancel} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="p-5">
          <div className="relative rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50">
            <canvas
              ref={canvasRef}
              className="w-full h-[200px] block touch-none cursor-crosshair"
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onPointerCancel={up}
            />
            <div className="pointer-events-none absolute left-6 right-6 bottom-12 border-b border-slate-300" />
            {!hasInk && <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-slate-300 text-[15px] font-semibold">Sign here</div>}
          </div>
          {error && <p className="text-[12.5px] font-semibold text-red-600 mt-2">{error}</p>}
        </div>
        <div className="flex items-center justify-between gap-3 px-5 pb-5">
          <button type="button" onClick={clear} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13.5px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
            <Eraser size={15} /> Clear
          </button>
          <button type="button" disabled={!hasInk} onClick={use} className="px-5 py-2.5 rounded-xl text-[13.5px] font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Use this signature
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Signature options under the signature line
function SignatureTools({ signature, busy, onFile, onDraw, onRemove, onFocusChange }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  return (
    <div
      tabIndex={0}
      onFocus={() => onFocusChange(true)}
      onBlur={() => onFocusChange(false)}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files?.[0]) onFile(e.dataTransfer.files[0]); }}
      className={`mt-4 rounded-2xl border-2 border-dashed px-4 py-3.5 outline-none transition-colors focus:border-blue-400 focus:bg-blue-50/40 ${dragging ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-slate-50/70'}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex items-start gap-2.5 min-w-0">
          {busy ? <Loader2 size={18} className="animate-spin text-blue-600 shrink-0 mt-0.5" /> : <ClipboardPaste size={18} className="text-blue-600 shrink-0 mt-0.5" />}
          <div className="text-[12.5px] leading-snug text-slate-600 font-medium">
            {signature
              ? <>Your signature is placed on the form. To change it, paste a new one ({isMac ? '⌘' : 'Ctrl'}+V), upload or draw again.</>
              : <><span className="font-bold text-slate-800">Paste your signature photo ({isMac ? '⌘' : 'Ctrl'}+V)</span>, drop it here, upload it, or draw it. Sign on plain white paper - the background is removed automatically.</>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12.5px] font-bold text-blue-700 bg-white border border-blue-200 hover:bg-blue-50 transition-colors">
            <Upload size={14} /> Upload
          </button>
          <button type="button" onClick={onDraw} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12.5px] font-bold text-blue-700 bg-white border border-blue-200 hover:bg-blue-50 transition-colors">
            <PenLine size={14} /> Draw
          </button>
          {signature && (
            <button type="button" onClick={onRemove} className="p-2 rounded-xl text-slate-500 bg-white border border-slate-200 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors" title="Remove signature" aria-label="Remove signature">
              <Eraser size={14} />
            </button>
          )}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) onFile(e.target.files[0]); e.target.value = ''; }} />
    </div>
  );
}

// forPayment: opened from a Buy Now button - the student can go back instead of logging out, and
// submitting continues to the payment.
export default function AdmissionGate({ studentId, student, email, onSubmitted, onLogout, forPayment = false, onCancel }) {
  const [form, setForm] = useState(() => ({ ...prefill(student, email), ...(loadDraft(email) || {}) }));
  const [attempted, setAttempted] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [sigBusy, setSigBusy] = useState(false);
  const [imageError, setImageError] = useState('');
  const [drawing, setDrawing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [done, setDone] = useState(null); // { formNo, studentId }
  const photoFocused = useRef(false);
  const today = todayIso();

  const allErrors = useMemo(() => validateAdmissionForm(form), [form]);
  const errors = attempted ? allErrors : {};
  const doneCount = PROGRESS_FIELDS.filter(k => !allErrors[k]).length;
  const pct = Math.round((doneCount / PROGRESS_FIELDS.length) * 100);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  // Keep a draft so a refresh or a dropped connection doesn't lose the typing
  useEffect(() => {
    if (done) return undefined;
    const t = setTimeout(() => saveDraft(email, form), 400);
    return () => clearTimeout(t);
  }, [form, email, done]);

  const handlePhoto = async (file) => {
    setImageError('');
    setPhotoBusy(true);
    try {
      set('photo', await processPhoto(file));
    } catch (e) {
      setImageError(e.message);
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleSignature = async (file) => {
    setImageError('');
    setSigBusy(true);
    try {
      set('signature', await processSignatureFile(file));
    } catch (e) {
      setImageError(e.message);
    } finally {
      setSigBusy(false);
    }
  };

  // A pasted image goes to the photo box when it has focus, otherwise onto the signature line
  useEffect(() => {
    const onPaste = (e) => {
      if (done) return;
      const file = imageFromClipboard(e);
      if (!file) return; // ordinary text paste into a field
      e.preventDefault();
      if (photoFocused.current) handlePhoto(file); else handleSignature(file);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  });

  const scrollToFirstError = (errs) => {
    const order = ['photo', 'ugBatch', ...PROGRESS_FIELDS];
    const first = order.find(k => errs[k]);
    const el = first && (document.querySelector(`[data-field="${first}"]`) || (first === 'passingYear' || first === 'currentYear' ? document.querySelector('[data-field="currentYear"], [data-field="passingYear"]') : null));
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleSubmit = async () => {
    setAttempted(true);
    setSubmitError('');
    if (Object.keys(allErrors).length) {
      scrollToFirstError(allErrors);
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitAdmissionForm(studentId, form, { existingAvatar: student?.avatarUrl });
      clearDraft(email);
      setDone(result);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      console.error('Admission form submit failed', e);
      setSubmitError(e?.code === 'permission-denied'
        ? 'Your form could not be saved (permission denied). Please contact the MS GATE Academy office.'
        : 'Your form could not be saved. Check your internet connection and try again - nothing you typed has been lost.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-[0_20px_60px_rgba(15,23,42,0.12)] border border-slate-100 w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 size={34} />
          </div>
          <h1 className="text-[24px] font-[900] text-slate-900 tracking-tight mt-5">Application submitted</h1>
          <p className="text-[14px] text-slate-500 font-medium mt-2">Thank you, {form.fullName.split(' ')[0]}. Your signed admission form has been sent to MS GATE Academy.</p>
          <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-100 py-3">
            <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Form No</div>
            <div className="text-[20px] font-[900] text-[#1f3a68] tracking-wide mt-0.5">{done.formNo}</div>
          </div>
          <button
            type="button"
            onClick={() => onSubmitted({ studentId: done.studentId, name: form.fullName.trim(), department: form.gatePaper })}
            className="mt-6 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[15px] shadow-lg shadow-blue-600/25 transition-colors inline-flex items-center justify-center gap-2"
          >
            {forPayment ? 'Continue to payment' : 'Continue to MS GATE Academy'} <ArrowRight size={17} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/80 pb-28">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-[860px] mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src={logoImg} alt="MS GATE Academy" className="w-9 h-9 object-contain shrink-0" />
            <div className="min-w-0">
              <div className="text-[14px] font-[900] text-slate-900 leading-none truncate">Admission Application</div>
              <div className="text-[11.5px] font-semibold text-slate-500 mt-1 truncate">{email}</div>
            </div>
          </div>
          {forPayment ? (
            <button type="button" onClick={onCancel} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0">
              <ArrowLeft size={15} /> Back
            </button>
          ) : (
            <button type="button" onClick={onLogout} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-bold text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0">
              <LogOut size={15} /> Log out
            </button>
          )}
        </div>
      </header>

      <main className="max-w-[860px] mx-auto px-3 sm:px-4 pt-6 space-y-6">
        {/* Intro */}
        <div className="rounded-2xl bg-gradient-to-r from-[#1f3a68] to-[#2563eb] text-white p-5 sm:p-6 flex items-start gap-4 shadow-lg shadow-blue-900/10">
          <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0"><FileSignature size={22} /></div>
          <div>
            <h1 className="text-[19px] sm:text-[21px] font-[900] tracking-tight leading-tight">{forPayment ? 'Complete your admission form to continue to payment' : 'Complete your admission form to continue'}</h1>
            <p className="text-[13.5px] text-blue-100 font-medium mt-1.5 leading-relaxed">
              {forPayment
                ? 'Fill in every field, add your passport photo and signature, and submit. You fill it in only once - the payment opens right after, and later purchases go straight to payment. It takes about 5 minutes.'
                : 'Fill in every field, add your passport photo and signature, and submit. Your classes, tests, notes and payments open once it is submitted. It takes about 5 minutes.'}
            </p>
          </div>
        </div>

        {imageError && (
          <div className="sticky top-[72px] z-30 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700 shadow-sm">
            <AlertCircle size={17} className="shrink-0 mt-0.5" />
            <span className="flex-1">{imageError}</span>
            <button type="button" onClick={() => setImageError('')} className="text-red-400 hover:text-red-700" aria-label="Dismiss"><X size={16} /></button>
          </div>
        )}

        <AdmissionPageOne
          form={form}
          set={set}
          errors={errors}
          applicationDate={today}
          photoSlot={(
            <PhotoBox
              photo={form.photo}
              busy={photoBusy}
              hasError={!!errors.photo}
              onFile={handlePhoto}
              onFocusChange={(f) => { photoFocused.current = f; }}
            />
          )}
        />

        <AdmissionPageTwo
          form={form}
          set={set}
          errors={errors}
          signedDate={today}
          signatureSlot={form.signature
            ? <img src={form.signature} alt="Your signature" className="max-h-[60px] max-w-full object-contain mb-0.5" />
            : <span className="text-[12px] text-slate-300 font-semibold pb-1.5">{sigBusy ? 'Placing signature…' : 'Your signature appears here'}</span>}
          signatureTools={(
            <SignatureTools
              signature={form.signature}
              busy={sigBusy}
              onFile={handleSignature}
              onDraw={() => setDrawing(true)}
              onRemove={() => set('signature', '')}
              onFocusChange={() => { photoFocused.current = false; }}
            />
          )}
        />
      </main>

      {/* Submit bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-8px_30px_rgba(15,23,42,0.06)]">
        <div className="max-w-[860px] mx-auto px-4 py-3 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-[12px] font-bold text-slate-500 mb-1.5">
              <span>{doneCount} of {PROGRESS_FIELDS.length} completed</span>
              <span className={pct === 100 ? 'text-emerald-600' : ''}>{pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-300 ${pct === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${pct}%` }} />
            </div>
            {(submitError || (attempted && Object.keys(allErrors).length > 0)) && (
              <div className="text-[12px] font-semibold text-red-600 mt-1.5 truncate">
                {submitError || `Please fix the ${Object.keys(allErrors).length} highlighted field${Object.keys(allErrors).length === 1 ? '' : 's'}.`}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || photoBusy || sigBusy}
            className="shrink-0 inline-flex items-center gap-2 px-5 sm:px-7 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[14.5px] font-bold shadow-lg shadow-blue-600/25 disabled:opacity-60 transition-colors"
          >
            {submitting ? <><Loader2 size={17} className="animate-spin" /> Submitting…</> : 'Submit Form'}
          </button>
        </div>
      </div>

      {drawing && (
        <SignaturePad
          onCancel={() => setDrawing(false)}
          onUse={(sig) => { set('signature', sig); setDrawing(false); setImageError(''); }}
        />
      )}
    </div>
  );
}
