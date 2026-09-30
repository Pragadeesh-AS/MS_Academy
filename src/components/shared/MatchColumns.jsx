import React from 'react';

// The two lists of a Match question - Group I (P, Q, R, S...) and Group II (1, 2, 3, 4...) - that
// its options ("P-2, Q-1, R-4, S-3") refer to. Renders nothing for other question types or when
// both lists are empty. Items are HTML (maths is KaTeX).
export default function MatchColumns({ question, dark = false, className = '' }) {
  if (question?.questionType !== 'Match') return null;
  const col1 = (question.matchColumn1 || []).filter(item => item && String(item).trim());
  const col2 = (question.matchColumn2 || []).filter(item => item && String(item).trim());
  if (col1.length === 0 && col2.length === 0) return null;

  const box = dark ? 'border-white/15 bg-white/[0.06]' : 'border-slate-200 bg-white';
  const head = dark ? 'bg-white/10 text-white/80 border-white/10' : 'bg-slate-50 text-slate-600 border-slate-200';
  const row = dark ? 'text-white divide-white/10 [&_*]:text-inherit!' : 'text-slate-700 divide-slate-100';

  const list = (title, items, label) => (
    <div className={`border rounded-xl overflow-hidden ${box}`}>
      <div className={`text-xs font-bold px-3 py-2 border-b ${head}`}>{title}</div>
      <div className={`divide-y ${row}`}>
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 px-3 py-2 text-sm text-left">
            <span className="font-bold shrink-0">{label(i)}.</span>
            <span className="min-w-0 break-words" dangerouslySetInnerHTML={{ __html: item }} />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 w-full ${className}`}>
      {list('Group I', col1, i => String.fromCharCode(80 + i))}
      {list('Group II', col2, i => i + 1)}
    </div>
  );
}
