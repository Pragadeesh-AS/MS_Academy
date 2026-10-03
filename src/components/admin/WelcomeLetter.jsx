import React, { useMemo, useRef, useState } from 'react';
import { Download, Send, Search, Mail, CheckCircle2, AlertCircle, UserRound, X } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import {
  INK, pageStyle, protectedImg, protectedImgStyle, useLetterheadFonts, useSignOffImages, LetterheadTop,
  SignatoryLines, ScriptTagline, FooterWave, A4Preview, renderPagePdf, safeFilePart,
} from './letterhead/Letterhead';

// Student Welcome Letter: pick a student, the letter fills in, then download it or email it to the
// student as a PDF (through the same Google Apps Script email webhook as the other admin emails).
// The page uses the academy letterhead shared with the Invoice (letterhead/Letterhead.jsx).

const todayIso = () => new Date().toISOString().split('T')[0];
const toDisplayDate = (iso) => {
  const [y, m, d] = (iso || '').split('-');
  return y ? { d, m, y } : null;
};
const sentOn = (s) => {
  const v = s?.welcomeLetterSentAt;
  const d = v?.toDate ? v.toDate() : v ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
};
// "Mechanical (ME)" -> "ME"; otherwise the department as written
const deptCode = (dept) => ((dept || '').match(/\(([^)]+)\)/) || [])[1] || dept || '';

// Text written on a blank line of the form (the line grows for a long value); empty = blank line
const Blank = ({ value, width, style }) => (
  <span style={{ display: 'inline-block', minWidth: width, borderBottom: `1.5px solid ${INK}`, lineHeight: 1.2, padding: '0 4px', verticalAlign: 'baseline', whiteSpace: 'nowrap', boxSizing: 'border-box', ...style }}>
    {value || ' '}
  </span>
);

const emailHtml = ({ name, paper, department, college, refNo }) => `
  <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 620px; margin: 0 auto; border: 1px solid #dbe3f1; border-radius: 12px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #0b1d45 0%, #1a3a7c 100%); padding: 26px 24px; text-align: center; border-bottom: 3px solid #d4a43a;">
      <h1 style="color: #ffffff; margin: 0; font-size: 26px; letter-spacing: 0.5px;">Welcome to MS GATE Academy</h1>
      <p style="color: #f0cf7a; margin: 8px 0 0; font-size: 13px; letter-spacing: 3px;">IGNITE YOUR DREAMS</p>
    </div>
    <div style="padding: 30px 28px; background: #ffffff; color: #13285a; font-size: 16px; line-height: 1.65;">
      <p style="margin-top: 0;">Dear ${name},</p>
      <p>It gives us great pleasure to warmly welcome you to <b>MS GATE Academy</b> for your <b>GATE ${paper}</b> preparation.</p>
      <p>As a student of ${department} at ${college}, you have chosen to invest in your technical foundation and future career opportunities. Your association with MS GATE Academy marks the beginning of a structured preparation journey built around strong concepts, focused practice, regular assessment and continuous guidance.</p>
      <div style="background: #f4f8fe; border-left: 4px solid #d4a43a; padding: 14px 18px; margin: 22px 0; border-radius: 0 8px 8px 0;">
        <p style="margin: 0;">Your official <b>Welcome Letter</b> is attached to this email as a PDF${refNo ? ` (Ref. No. ${refNo})` : ''}. Please keep it for your records.</p>
      </div>
      <p>We are glad to have you with us and look forward to supporting your progress at every stage of your preparation.</p>
      <p style="margin-bottom: 4px;">With best wishes,</p>
      <p style="margin: 0; font-weight: bold;">Dr. M. Muthu Samy (M.E., Ph.D.)</p>
      <p style="margin: 0; color: #475569; font-size: 14px;">Founder &amp; Educator, MS GATE Academy</p>
    </div>
    <div style="background: #0b1d45; color: #ffffff; padding: 16px 24px; text-align: center; font-size: 13px; line-height: 1.7;">
      +91 80120 52331 &nbsp;|&nbsp; msamy5031@gmail.com &nbsp;|&nbsp; www.msgateacademy.com<br/>
      <span style="color: #f0cf7a;">Othakkalmandapam &amp; Malumichampatti, Coimbatore</span>
    </div>
  </div>
`;

export default function WelcomeLetter({ students = [], sendEmail, onSent }) {
  useLetterheadFonts();
  const { stamp, signature } = useSignOffImages();
  const pageRef = useRef(null);

  const [search, setSearch] = useState('');
  const [studentId, setStudentId] = useState(null);
  const [form, setForm] = useState({ refNo: '', date: todayIso(), name: '', email: '', department: '', college: '', paper: '' });
  const [busy, setBusy] = useState(null); // 'pdf' | 'email'
  const [notice, setNotice] = useState(null); // { type, text }

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const nextRefNo = useMemo(() => {
    const sent = students.filter(s => s.welcomeLetterRef).length;
    return `MSGA/WL/${new Date().getFullYear()}/${String(sent + 1).padStart(3, '0')}`;
  }, [students]);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students
      .filter(s => s.email && (!q || (s.name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q) || (s.department || '').toLowerCase().includes(q)))
      .slice(0, 40);
  }, [students, search]);

  const selected = students.find(s => s.id === studentId) || null;

  const pickStudent = (s) => {
    setStudentId(s.id);
    setNotice(null);
    const year = new Date().getFullYear() + 1;
    setForm({
      refNo: s.welcomeLetterRef || nextRefNo,
      date: todayIso(),
      name: s.name || '',
      email: s.email || '',
      department: s.department || '',
      college: s.collegeName || '',
      paper: s.welcomeLetterGatePaper || (s.department ? `${deptCode(s.department)} ${year}` : ''),
    });
  };

  const clearStudent = () => {
    setStudentId(null);
    setForm({ refNo: nextRefNo, date: todayIso(), name: '', email: '', department: '', college: '', paper: '' });
  };

  const missing = ['name', 'department', 'college', 'paper'].filter(k => !form[k].trim());
  const fileName = `Welcome_Letter_${safeFilePart(form.name) || 'Student'}.pdf`;

  const buildPdf = async () => {
    if (!pageRef.current) throw new Error('Letter not ready');
    return renderPagePdf(pageRef.current);
  };

  const handleDownload = async () => {
    setBusy('pdf');
    try {
      (await buildPdf()).save(fileName);
    } catch (err) {
      console.error('Welcome letter PDF failed', err);
      setNotice({ type: 'error', text: `Could not create the PDF: ${err.message || err}` });
    }
    setBusy(null);
  };

  const handleSend = async () => {
    if (!form.email.trim()) { setNotice({ type: 'error', text: 'Enter the student\'s email address.' }); return; }
    if (missing.length) { setNotice({ type: 'error', text: 'Fill in every field of the letter before sending.' }); return; }
    if (!sendEmail) { setNotice({ type: 'error', text: 'Email service is not available.' }); return; }
    if (selected?.welcomeLetterSentAt && !window.confirm(`A welcome letter was already sent to ${form.name} on ${sentOn(selected)}. Send it again?`)) return;

    setBusy('email');
    setNotice(null);
    try {
      const pdf = await buildPdf();
      const base64Data = pdf.output('datauristring').split(',')[1];
      await sendEmail(
        form.email.trim(),
        `Welcome to MS GATE Academy - GATE ${form.paper.trim()} Preparation`,
        emailHtml({ name: form.name.trim(), paper: form.paper.trim(), department: form.department.trim(), college: form.college.trim(), refNo: form.refNo.trim() }),
        [{ filename: fileName, mimeType: 'application/pdf', base64Data }]
      );
      if (selected) {
        const update = { welcomeLetterSentAt: serverTimestamp(), welcomeLetterRef: form.refNo.trim(), welcomeLetterGatePaper: form.paper.trim() };
        try {
          await updateDoc(doc(db, 'joined_students', selected.id), update);
          onSent?.({ ...selected, ...update, welcomeLetterSentAt: new Date() });
        } catch (err) {
          console.error('Sent, but could not record it on the student', err);
        }
      }
      setNotice({ type: 'success', text: `Welcome letter emailed to ${form.email.trim()}.` });
    } catch (err) {
      console.error('Welcome letter email failed', err);
      setNotice({ type: 'error', text: `Email failed: ${err.message || 'email service unreachable'}. Check that the Google Apps Script email webhook (VITE_GAS_WEBHOOK_URL) is deployed.` });
    }
    setBusy(null);
  };

  const date = toDisplayDate(form.date);
  const inputCls = 'w-full px-3 py-2 border border-[#e2e8f0] rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm';
  const p = (field, fallback) => form[field].trim() || fallback;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Mail className="text-[#2563eb]" /> Student Welcome Letter
        </h2>
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            disabled={!!busy}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 font-semibold rounded-lg transition-colors"
          >
            <Download size={18} /> {busy === 'pdf' ? 'Preparing...' : 'Download PDF'}
          </button>
          <button
            onClick={handleSend}
            disabled={!!busy}
            className="flex items-center gap-2 px-4 py-2 bg-[#2563eb] hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors shadow-md"
          >
            <Send size={18} /> {busy === 'email' ? 'Sending...' : 'Send Email'}
          </button>
        </div>
      </div>

      {notice && (
        <div className={`flex items-start gap-2 px-4 py-3 rounded-xl border text-sm font-semibold ${notice.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {notice.type === 'success' ? <CheckCircle2 size={18} className="shrink-0" /> : <AlertCircle size={18} className="shrink-0" />}
          {notice.text}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-8 items-start">
        {/* ---------------- Student + letter details */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#e2e8f0]">
            <h3 className="text-lg font-semibold text-[#1e293b] mb-3 border-b pb-2">1. Choose the student</h3>
            {selected ? (
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl p-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-black flex items-center justify-center shrink-0">{(selected.name || '?').charAt(0).toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-800 truncate">{selected.name}</p>
                  <p className="text-xs font-semibold text-slate-500 truncate">{selected.email} · {selected.department || 'No department'}</p>
                  {sentOn(selected) && <p className="text-xs font-bold text-emerald-700 mt-0.5">Letter already sent on {sentOn(selected)}</p>}
                </div>
                <button onClick={clearStudent} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg" title="Choose another student"><X size={16} /></button>
              </div>
            ) : (
              <>
                <div className="relative mb-2">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email or department" className={inputCls + ' pl-9'} />
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl">
                  {matches.length === 0 ? (
                    <p className="p-4 text-sm text-slate-500">No students found. You can still fill in the details below by hand.</p>
                  ) : matches.map(s => (
                    <button key={s.id} onClick={() => pickStudent(s)} className="w-full text-left flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50">
                      <UserRound size={18} className="text-slate-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800 truncate">{s.name || s.email}</p>
                        <p className="text-xs font-semibold text-slate-500 truncate">{s.email} · {s.department || 'No department'}</p>
                      </div>
                      {sentOn(s) && <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full shrink-0">Sent</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#e2e8f0]">
            <h3 className="text-lg font-semibold text-[#1e293b] mb-4 border-b pb-2">2. Letter details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#334155] mb-1">Ref. No.</label>
                <input value={form.refNo} onChange={set('refNo')} placeholder={nextRefNo} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#334155] mb-1">Date</label>
                <input type="date" value={form.date} onChange={set('date')} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#334155] mb-1">Student Name</label>
                <input value={form.name} onChange={set('name')} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#334155] mb-1">Student Email</label>
                <input type="email" value={form.email} onChange={set('email')} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#334155] mb-1">Department</label>
                <input value={form.department} onChange={set('department')} placeholder="e.g. Mechanical Engineering" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#334155] mb-1">GATE Paper with Year</label>
                <input value={form.paper} onChange={set('paper')} placeholder="e.g. ME 2027" className={inputCls} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-[#334155] mb-1">UG College Name</label>
                <input value={form.college} onChange={set('college')} className={inputCls} />
              </div>
            </div>
            <p className="mt-4 text-xs text-[#64748b]">
              The email goes to the student with the subject "Welcome to MS GATE Academy - GATE {form.paper || '[Paper with Year]'} Preparation", a short welcome message and this letter attached as a PDF.
            </p>
          </div>
        </div>

        {/* ---------------- The letter (exact A4 page) */}
        <div className="bg-[#e2e8f0] p-3 sm:p-6 rounded-2xl">
          <A4Preview pageRef={pageRef}>
            <div ref={pageRef} style={pageStyle}>
              <LetterheadTop />

              {/* Ref. No. / Date */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 18, fontSize: 16.5 }}>
                <span>Ref. No.: <Blank value={form.refNo} width={150} style={{ fontSize: 15 }} /></span>
                <span>
                  Date: <Blank value={date?.d} width={30} style={{ textAlign: 'center', paddingLeft: 0 }} /> / <Blank value={date?.m} width={30} style={{ textAlign: 'center', paddingLeft: 0 }} /> / <Blank value={date?.y} width={44} style={{ textAlign: 'center', paddingLeft: 0 }} />
                </span>
              </div>

              {/* Student details */}
              <div style={{ marginTop: 30, marginLeft: 43, fontSize: 17, lineHeight: 1, display: 'flex', flexDirection: 'column', gap: 13 }}>
                <div>Student Name: <Blank value={form.name} width={273} /></div>
                <div>Department: <Blank value={form.department} width={289} /></div>
                <div>UG College Name: <Blank value={form.college} width={254} /></div>
                <div>GATE Paper with Year: <Blank value={form.paper} width={209} /></div>
              </div>

              {/* Letter body */}
              <div style={{ marginTop: 34, marginLeft: 43, marginRight: 20, fontSize: 17.5, lineHeight: '27px' }}>
                <p style={{ margin: 0 }}>Dear {p('name', '[Student Name]')},</p>
                <p style={{ margin: '18px 0 0' }}>It gives us great pleasure to warmly welcome you to MS GATE Academy for your GATE {p('paper', '[Paper with Year]')} preparation.</p>
                <p style={{ margin: '23px 0 0' }}>As a student of {p('department', '[Department]')} at {p('college', '[UG College Name]')}, you have chosen to invest in your technical foundation and future career opportunities. Your association with MS GATE Academy marks the beginning of a structured preparation journey built around strong concepts, focused practice, regular assessment and continuous guidance.</p>
                <p style={{ margin: '23px 0 0' }}>We are glad to have you with us and look forward to supporting your progress at every stage of your preparation.</p>
                <p style={{ margin: '26px 0 0' }}>Welcome to MS GATE Academy. <b><i>Ignite Your Dreams.</i></b></p>
              </div>

              {/* Sign-off */}
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 150, height: 240, pointerEvents: 'none' }}>
                <img src={stamp} alt="Academy stamp" {...protectedImg} style={{ ...protectedImgStyle, position: 'absolute', left: 264, bottom: -22, width: 124, height: 124, objectFit: 'contain' }} />
                <div style={{ position: 'absolute', left: 540, bottom: 6, width: 240 }}>
                  <img src={signature} alt="Authorized signature" {...protectedImg} style={{ ...protectedImgStyle, width: 176, display: 'block', margin: '0 0 0 4px' }} />
                  <SignatoryLines />
                </div>
              </div>
              <ScriptTagline />

              <FooterWave />
            </div>
          </A4Preview>
        </div>
      </div>
    </div>
  );
}
