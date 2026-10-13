import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Dumbbell, CheckCircle2, Target, Clock, ListChecks, Infinity as InfinityIcon } from 'lucide-react';
import { FREE_PRACTICE_QUESTIONS, practiceQuestionsUsed } from '../../utils/practiceTests';

// Practice-test analytics for one student, shown in the Student Directory's details panel.
// Reads only this student's 'practice_tests' documents when the panel opens.

const toMs = (v) => (v?.toMillis ? v.toMillis() : v?.seconds ? v.seconds * 1000 : typeof v === 'string' || typeof v === 'number' ? (new Date(v).getTime() || 0) : 0);
const formatDay = (ms) => (ms ? new Date(ms).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');
const formatDuration = (secs) => {
  const s = Math.max(0, Math.round(secs || 0));
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
};
const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

//   embedded: shown as its own tab (no divider or heading of its own, wider layout)
export default function StudentPracticeStats({ email, unlimited, embedded = false }) {
  const [tests, setTests] = useState(null); // null = loading
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!email) { setTests([]); return; }
    let cancelled = false;
    setTests(null);
    setError(false);
    const emails = [...new Set([email, email.toLowerCase()])];
    getDocs(query(collection(db, 'practice_tests'), where('studentEmail', 'in', emails)))
      .then(snap => {
        if (cancelled) return;
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => toMs(b.submittedAt || b.createdAt) - toMs(a.submittedAt || a.createdAt));
        setTests(list);
      })
      .catch(err => { console.error('Could not load practice tests', err); if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [email]);

  const header = (
    <div className="flex items-center justify-between mb-4">
      <h5 className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5"><Dumbbell size={14} /> Practice Tests</h5>
      {tests && tests.length > 0 && <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{tests.length}</span>}
    </div>
  );

  const wrapCls = embedded ? '' : 'pt-6 border-t border-[#EEF2F7]';

  if (error) return <div className={wrapCls}>{embedded ? null : header}<p className="text-[13px] font-medium text-red-600">Couldn't load practice tests.</p></div>;
  if (tests === null) return <div className={wrapCls}>{embedded ? null : header}<p className="text-[13px] font-medium text-slate-400">Loading practice tests...</p></div>;

  const completed = tests.filter(t => t.status === 'completed');
  const inProgress = tests.length - completed.length;
  const questionsPractised = practiceQuestionsUsed(tests);
  const answered = completed.reduce((a, t) => a + (Array.isArray(t.responses) ? t.responses.filter(r => r.isAnswered).length : 0), 0);
  const correct = completed.reduce((a, t) => a + (Number(t.correctCount) || 0), 0);
  const scored = completed.filter(t => Number(t.totalMarks) > 0);
  const avgScore = scored.length ? Math.round(scored.reduce((a, t) => a + (Number(t.score) || 0) / Number(t.totalMarks), 0) / scored.length * 100) : 0;
  const timeSpent = completed.reduce((a, t) => a + (Number(t.timeTakenSeconds) || 0), 0);
  const lastMs = tests.length ? toMs(tests[0].submittedAt || tests[0].createdAt) : 0;

  const stats = [
    { label: 'Tests taken', value: completed.length, sub: inProgress ? `${inProgress} in progress` : 'all finished', icon: CheckCircle2, tint: 'text-emerald-600 bg-emerald-50' },
    { label: 'Questions practised', value: questionsPractised, sub: `${answered} answered`, icon: ListChecks, tint: 'text-blue-600 bg-blue-50' },
    { label: 'Accuracy', value: `${pct(correct, answered)}%`, sub: `${correct} correct · avg score ${avgScore}%`, icon: Target, tint: 'text-violet-600 bg-violet-50' },
    { label: 'Time practising', value: formatDuration(timeSpent), sub: `last on ${formatDay(lastMs)}`, icon: Clock, tint: 'text-amber-600 bg-amber-50' },
  ];

  return (
    <div className={wrapCls}>
      {embedded ? null : header}
      {tests.length === 0 ? (
        <div className="text-center py-5 bg-[#F8FAFC] rounded-[16px] border border-[#EEF2F7] border-dashed">
          <p className="text-[14px] font-medium text-[#64748B]">No practice tests taken yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className={`grid grid-cols-2 gap-3 ${embedded ? 'lg:grid-cols-4' : ''}`}>
            {stats.map(s => (
              <div key={s.label} className="bg-[#F8FAFC] p-3.5 rounded-[16px] border border-[#EEF2F7]">
                <div className="flex items-center gap-2">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${s.tint}`}><s.icon size={15} /></span>
                  <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider leading-tight">{s.label}</span>
                </div>
                <div className="text-[22px] font-bold text-[#0F172A] mt-2 leading-none">{s.value}</div>
                <div className="text-[11.5px] font-medium text-[#64748B] mt-1 truncate" title={s.sub}>{s.sub}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[12.5px] font-semibold px-3.5 py-2.5 rounded-[14px] border border-[#EEF2F7] bg-white">
            {unlimited ? (
              <><InfinityIcon size={16} className="text-emerald-600" /><span className="text-emerald-700">Unlimited practice (owns a full bundle)</span></>
            ) : (
              <>
                <span className="text-[#64748B]">Free questions used:</span>
                <span className="text-[#0F172A]">{Math.min(questionsPractised, FREE_PRACTICE_QUESTIONS)} / {FREE_PRACTICE_QUESTIONS}</span>
                <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden ml-1">
                  <div className={`h-full rounded-full ${questionsPractised >= FREE_PRACTICE_QUESTIONS ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, pct(questionsPractised, FREE_PRACTICE_QUESTIONS))}%` }} />
                </div>
              </>
            )}
          </div>

          <div>
            <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Recent practice tests</p>
            <div className={`space-y-2 ${embedded ? '' : 'max-h-[220px] overflow-y-auto'} pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full`}>
              {tests.slice(0, 10).map(t => {
                const done = t.status === 'completed';
                const qCount = Array.isArray(t.questions) ? t.questions.length : (t.totalQuestions || 0);
                const topics = [].concat(t.subjects || t.subject || []).filter(Boolean).join(', ');
                return (
                  <div key={t.id} className="flex items-center justify-between gap-3 bg-white p-3 rounded-[14px] border border-[#EEF2F7]">
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-bold text-[#0F172A] truncate" title={t.title || t.testTitle}>{t.title || t.testTitle || 'Practice test'}</p>
                      <p className="text-[11.5px] font-medium text-[#64748B] truncate">{formatDay(toMs(t.submittedAt || t.createdAt))} · {qCount} questions{topics ? ` · ${topics}` : ''}</p>
                    </div>
                    {done ? (
                      <span className="text-[12px] font-bold text-[#0F172A] bg-[#F8FAFC] border border-[#EEF2F7] px-2.5 py-1 rounded-lg whitespace-nowrap">
                        {Math.round((Number(t.score) || 0) * 100) / 100} / {t.totalMarks ?? '-'}
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-lg whitespace-nowrap">In progress</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
