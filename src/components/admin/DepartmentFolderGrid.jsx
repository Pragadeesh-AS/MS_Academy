import React from 'react';
import { ArrowRight, Layers, Building2, Trophy, BookMarked, Image as ImageIcon } from 'lucide-react';
import { TYPE_KEYS, questionTypeKey } from '../../utils/questionTypeSplit';
import { paletteFor, monogramOf, NEUTRAL } from '../../utils/departmentColors';
import { hasDiagram } from '../../utils/questionLogger';

// Same colours as the question-type chips on the test cards
const TYPE_COLORS = { MCQ: 'bg-blue-500', MSQ: 'bg-violet-500', NAT: 'bg-amber-500', Match: 'bg-emerald-500' };

const fmt = (n) => n.toLocaleString('en-IN');

// Department folders of the Question Bank: one card per department with its size, share of the
// bank, subjects and question-type mix.
//   departments: [{ name, questions, label?, tag?, common?, always? }]
//     label: name to show (defaults to name), tag: small line under it ("Your department"),
//     common: a shared bank (tag shown in violet), always: show the folder even when it's empty
//   sortBySize: largest first (false keeps the given order)
export default function DepartmentFolderGrid({ departments, onOpen, title = 'Departments', countLabel = 'Departments', sortBySize = true }) {
  const cards = departments
    .map(d => {
      const typeCounts = Object.fromEntries(TYPE_KEYS.map(k => [k, 0]));
      let diagramCount = 0;
      d.questions.forEach(q => {
        typeCounts[questionTypeKey(q)] += 1;
        if (hasDiagram(q)) diagramCount += 1;
      });
      const subjects = new Set(d.questions.map(q => (q.subject || '').trim().toLowerCase()).filter(Boolean)).size;
      return { ...d, count: d.questions.length, typeCounts, subjects, diagramCount };
    })
    .filter(d => d.count > 0 || d.always);
  if (sortBySize) cards.sort((a, b) => b.count - a.count);

  const total = cards.reduce((a, d) => a + d.count, 0);
  const largest = cards.reduce((best, d) => (!best || d.count > best.count ? d : best), null);

  const summary = [
    { label: 'Total Questions', value: fmt(total), icon: Layers, tint: 'from-blue-500 to-indigo-600' },
    { label: countLabel, value: cards.length, icon: Building2, tint: 'from-emerald-500 to-teal-600' },
    { label: 'Largest Bank', value: largest ? (largest.label || largest.name) : '-', sub: largest ? `${fmt(largest.count)} questions` : '', icon: Trophy, tint: 'from-amber-500 to-orange-600' },
  ];

  return (
    <div className="mt-4 space-y-8">
      {/* Bank overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {summary.map(s => (
          <div key={s.label} className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${s.tint} text-white flex items-center justify-center shrink-0 shadow-md`}>
              <s.icon size={22} strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-[800] uppercase tracking-widest text-slate-400">{s.label}</div>
              <div className="text-[22px] font-[900] text-slate-900 leading-tight truncate" title={String(s.value)}>{s.value}</div>
              {s.sub && <div className="text-[12px] font-semibold text-slate-500">{s.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Folder grid header */}
      <div className="flex items-center gap-3">
        <span className="text-[13px] font-[800] text-slate-400 uppercase tracking-widest">{title}</span>
        <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent"></div>
        {sortBySize && <span className="text-[12px] font-bold text-slate-400">Sorted by size</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {cards.map(d => {
          const p = d.name === 'Uncategorized' ? NEUTRAL : paletteFor(d.name);
          const label = d.label || d.name;
          const mono = d.name === 'Uncategorized' ? '?' : monogramOf(label);
          const pct = total ? (d.count / total) * 100 : 0;
          const share = pct > 0 && pct < 1 ? '<1' : Math.round(pct);
          return (
            <button
              key={d.name}
              type="button"
              onClick={() => onOpen(d.name)}
              className={`group relative overflow-hidden text-left bg-white rounded-[24px] border border-slate-200/80 p-6 shadow-[0_8px_24px_rgba(15,23,42,0.04)] hover:shadow-2xl ${p.glow} ${p.ring} hover:-translate-y-1 transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200`}
            >
              {/* Watermark monogram */}
              <span aria-hidden className={`pointer-events-none absolute -right-2 -top-5 text-[96px] font-[900] leading-none tracking-tighter select-none ${p.mark} group-hover:scale-110 transition-transform duration-500`}>
                {mono}
              </span>

              <div className="relative flex items-start gap-4">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${p.badge} text-white flex items-center justify-center shrink-0 shadow-lg group-hover:rotate-[-4deg] group-hover:scale-105 transition-transform duration-300`}>
                  <span className={`font-[900] tracking-tight ${mono.length > 2 ? 'text-[15px]' : 'text-[18px]'}`}>{mono}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-[800] text-[16px] text-slate-900 leading-snug line-clamp-2 break-words" title={label}>{label}</h3>
                  {d.tag && (
                    <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-md border text-[10.5px] font-[800] uppercase tracking-wide ${d.common ? 'bg-violet-50 text-violet-600 border-violet-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{d.tag}</span>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] font-semibold text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <BookMarked size={13} className="shrink-0" />
                      {d.subjects} {d.subjects === 1 ? 'subject' : 'subjects'}
                    </span>
                    {d.diagramCount > 0 && (
                      <span className="flex items-center gap-1 text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 text-[11px]" title={`${d.diagramCount} diagrammatic question${d.diagramCount === 1 ? '' : 's'}`}>
                        <ImageIcon size={11} className="shrink-0" />
                        {d.diagramCount} {d.diagramCount === 1 ? 'diagram' : 'diagrams'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="relative mt-6 flex items-end justify-between gap-3">
                <div>
                  <div className="text-[34px] font-[900] text-slate-900 leading-none tracking-tight">{fmt(d.count)}</div>
                  <div className="text-[12px] font-[700] uppercase tracking-wider text-slate-400 mt-1.5">Questions</div>
                </div>
                <span className={`px-2.5 py-1 rounded-full border text-[11.5px] font-[800] whitespace-nowrap ${p.soft}`}>
                  {share}% of bank
                </span>
              </div>

              {/* Question type mix */}
              <div className="relative mt-5">
                <div className="flex h-2 rounded-full overflow-hidden bg-slate-100">
                  {TYPE_KEYS.map(k => d.typeCounts[k] > 0 && (
                    <div key={k} className={TYPE_COLORS[k]} style={{ width: `${(d.typeCounts[k] / (d.count || 1)) * 100}%` }} title={`${k}: ${d.typeCounts[k]}`} />
                  ))}
                </div>
                <div className="mt-2.5 flex flex-wrap gap-x-3.5 gap-y-1">
                  {TYPE_KEYS.map(k => (
                    <span key={k} className={`flex items-center gap-1.5 text-[11.5px] font-bold ${d.typeCounts[k] ? 'text-slate-500' : 'text-slate-300'}`}>
                      <span className={`w-2 h-2 rounded-full ${d.typeCounts[k] ? TYPE_COLORS[k] : 'bg-slate-200'}`}></span>
                      {k} {fmt(d.typeCounts[k])}
                    </span>
                  ))}
                </div>
              </div>

              <div className={`relative mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[13px] font-[800] ${p.text}`}>
                <span>Open folder</span>
                <ArrowRight size={18} className="group-hover:translate-x-1.5 transition-transform duration-300" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
