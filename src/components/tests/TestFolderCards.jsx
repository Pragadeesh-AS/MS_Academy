import React from 'react';
import { ArrowRight, ClipboardList, CalendarClock } from 'lucide-react';
import { TEMPLATE_META } from '../../utils/templateStyles';
import { TEMPLATE_FOLDERS, OTHER_FOLDER, templateKeyOf, templateMarks, templateQuestions } from '../../utils/testTemplates';
import { testStartMillis, formatTestTime } from '../../utils/testSchedule';
import { paletteFor, monogramOf, NEUTRAL } from '../../utils/departmentColors';

const countByTemplate = (tests) => {
  const out = { topic: 0, subject: 0, full: 0, other: 0 };
  tests.forEach(t => { out[templateKeyOf(t)] += 1; });
  return out;
};

// Upcoming tests and the soonest start time among them
const upcomingOf = (tests, now) => {
  const starts = tests.map(testStartMillis).filter(ms => ms !== null && ms > now).sort((a, b) => a - b);
  return { count: starts.length, next: starts[0] ?? null };
};

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

const NextLine = ({ upcoming }) => (
  <div className="flex items-center gap-2 text-[12.5px] font-semibold text-slate-500 min-w-0">
    <CalendarClock size={15} className={upcoming.next ? 'text-emerald-500 shrink-0' : 'text-slate-300 shrink-0'} />
    <span className="truncate">
      {upcoming.next
        ? <>Next: <span className="text-slate-700 font-bold">{formatTestTime(upcoming.next)}</span>{upcoming.count > 1 ? ` · ${upcoming.count} upcoming` : ''}</>
        : 'No upcoming tests'}
    </span>
  </div>
);

const SummaryTile = ({ label, value, icon: Icon, tint }) => (
  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] flex items-center gap-4">
    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${tint} text-white flex items-center justify-center shrink-0 shadow-md`}>
      <Icon size={22} strokeWidth={2.2} />
    </div>
    <div className="min-w-0">
      <div className="text-[11px] font-[800] uppercase tracking-widest text-slate-400 truncate">{label}</div>
      <div className="text-[24px] font-[900] text-slate-900 leading-tight">{value}</div>
    </div>
  </div>
);

// Admin's department folders, with how many Topic / Subject / Full Length tests each holds.
//   folders: [{ name, tests }]
export function DepartmentTestFolders({ folders, onOpen }) {
  const now = Date.now();
  const allTests = folders.flatMap(f => f.tests);
  const totals = countByTemplate(allTests);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryTile label="Total Tests" value={allTests.length} icon={ClipboardList} tint="from-slate-700 to-slate-900" />
        {TEMPLATE_FOLDERS.map(f => (
          <SummaryTile key={f.key} label={f.name} value={totals[f.key]} icon={TEMPLATE_META[f.key].icon} tint={TEMPLATE_META[f.key].badge} />
        ))}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-[13px] font-[800] text-slate-400 uppercase tracking-widest">Departments</span>
        <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent"></div>
        {totals.other > 0 && <span className="text-[12px] font-bold text-slate-400">{plural(totals.other, 'other test')}</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {folders.map(f => {
          const p = f.name === 'Uncategorized' ? NEUTRAL : paletteFor(f.name);
          const mono = f.name === 'Uncategorized' ? '?' : monogramOf(f.name);
          const counts = countByTemplate(f.tests);
          const keys = [...TEMPLATE_FOLDERS.map(t => t.key), ...(counts.other ? [OTHER_FOLDER.key] : [])];
          const total = f.tests.length;
          return (
            <button
              key={f.name}
              type="button"
              onClick={() => onOpen(f.name)}
              className={`group relative overflow-hidden text-left bg-white rounded-[24px] border border-slate-200/80 p-6 shadow-[0_8px_24px_rgba(15,23,42,0.04)] hover:shadow-2xl ${p.glow} ${p.ring} hover:-translate-y-1 transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200`}
            >
              <span aria-hidden className={`pointer-events-none absolute -right-2 -top-5 text-[96px] font-[900] leading-none tracking-tighter select-none ${p.mark} group-hover:scale-110 transition-transform duration-500`}>
                {mono}
              </span>

              <div className="relative flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${p.badge} text-white flex items-center justify-center shrink-0 shadow-lg group-hover:rotate-[-4deg] group-hover:scale-105 transition-transform duration-300`}>
                  <span className={`font-[900] tracking-tight ${mono.length > 2 ? 'text-[15px]' : 'text-[18px]'}`}>{mono}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-[800] text-[16px] text-slate-900 leading-snug line-clamp-2 break-words" title={f.name}>{f.name}</h3>
                  <div className="mt-0.5 text-[12.5px] font-semibold text-slate-500">{plural(total, 'test')}</div>
                </div>
              </div>

              {/* Tests per template */}
              <div className={`relative mt-5 grid gap-2 ${keys.length === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
                {keys.map(k => {
                  const m = TEMPLATE_META[k];
                  return (
                    <div key={k} className={`rounded-xl border px-2 py-2.5 text-center ${counts[k] ? m.soft : 'bg-white border-slate-100'}`}>
                      <div className={`text-[22px] font-[900] leading-none ${counts[k] ? m.num : 'text-slate-300'}`}>{counts[k]}</div>
                      <div className={`mt-1 flex items-center justify-center gap-1 text-[10.5px] font-[800] uppercase tracking-wide ${counts[k] ? 'text-slate-500' : 'text-slate-300'}`}>
                        <m.icon size={11} className="shrink-0" /> {m.short}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="relative mt-3 flex h-1.5 rounded-full overflow-hidden bg-slate-100">
                {keys.map(k => counts[k] > 0 && (
                  <div key={k} className={TEMPLATE_META[k].bar} style={{ width: `${(counts[k] / (total || 1)) * 100}%` }} />
                ))}
              </div>

              <div className="relative mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <NextLine upcoming={upcomingOf(f.tests, now)} />
                <ArrowRight size={18} className={`${p.text} shrink-0 group-hover:translate-x-1.5 transition-transform duration-300`} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Template folders inside a department (and a teacher's own list).
//   folders: templateFoldersFor(deptTests) - [{ key, name, count, template }]
//   tests:   the department's tests, for the upcoming line
export function TemplateTestFolders({ folders, tests, onOpen }) {
  const now = Date.now();
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-5 ${folders.length === 4 ? 'xl:grid-cols-4' : 'xl:grid-cols-3'}`}>
      {folders.map(folder => {
        const m = TEMPLATE_META[folder.key] || TEMPLATE_META.other;
        const t = folder.template;
        const folderTests = tests.filter(x => templateKeyOf(x) === folder.key);
        return (
          <button
            key={folder.key}
            type="button"
            onClick={() => onOpen(folder.key)}
            className={`group relative overflow-hidden text-left bg-white rounded-[24px] border border-slate-200/80 p-6 shadow-[0_8px_24px_rgba(15,23,42,0.04)] hover:shadow-2xl ${m.glow} ${m.ring} hover:-translate-y-1 transition-all duration-300 flex flex-col focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200`}
          >
            <m.icon aria-hidden size={110} strokeWidth={1.5} className={`pointer-events-none absolute -right-5 -top-5 opacity-[0.06] ${m.text} group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500`} />

            <div className={`relative w-12 h-12 rounded-2xl bg-gradient-to-br ${m.badge} text-white flex items-center justify-center shadow-lg group-hover:rotate-[-4deg] group-hover:scale-105 transition-transform duration-300`}>
              <m.icon size={22} strokeWidth={2.2} />
            </div>
            <h3 className="relative mt-4 font-[800] text-[17px] text-slate-900">{folder.name}</h3>

            <div className="relative mt-3 flex items-baseline gap-2">
              <span className={`text-[38px] font-[900] leading-none tracking-tight ${folder.count ? 'text-slate-900' : 'text-slate-300'}`}>{folder.count}</span>
              <span className="text-[12px] font-[800] uppercase tracking-wider text-slate-400">{folder.count === 1 ? 'Test' : 'Tests'}</span>
            </div>

            <div className="relative mt-4 flex flex-wrap gap-1.5">
              {t ? (
                <>
                  <span className={`px-2 py-1 rounded-lg border text-[11px] font-bold text-slate-600 ${m.soft}`}>{t.duration} mins</span>
                  <span className={`px-2 py-1 rounded-lg border text-[11px] font-bold text-slate-600 ${m.soft}`}>{templateMarks(t)} marks</span>
                  <span className={`px-2 py-1 rounded-lg border text-[11px] font-bold text-slate-600 ${m.soft}`}>{templateQuestions(t)} Qs · {t.q1}×1M + {t.q2}×2M</span>
                </>
              ) : (
                <span className={`px-2 py-1 rounded-lg border text-[11px] font-bold text-slate-600 ${m.soft}`}>Custom tests</span>
              )}
            </div>

            <div className="relative mt-auto pt-5">
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <NextLine upcoming={upcomingOf(folderTests, now)} />
                <ArrowRight size={18} className={`${m.text} shrink-0 group-hover:translate-x-1.5 transition-transform duration-300`} />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
