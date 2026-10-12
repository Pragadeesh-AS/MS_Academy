import React from 'react';
import { ArrowRight, CalendarClock, Home, ChevronRight } from 'lucide-react';
import { formatDay } from '../../utils/folderDates';

// Shared look of the student Notes and Recordings tabs, matching the admin folder screens.
// palette comes from utils/departmentColors (paletteFor / NEUTRAL).

// Banner at the top of a tab: department badge, title, optional subtitle and a row of stats ({ label, value })
export function FolderHero({ palette, monogram, department, title, subtitle, icon: Icon, stats }) {
  return (
    <div className="relative overflow-hidden bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <span aria-hidden className={`pointer-events-none absolute -right-3 -top-8 text-[130px] font-[900] leading-none tracking-tighter select-none ${palette.mark}`}>{monogram}</span>
      <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4 min-w-0">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${palette.badge} text-white flex items-center justify-center shrink-0 shadow-lg`}>
            <Icon size={28} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <h2 className="text-2xl font-[900] text-slate-900 leading-tight">{title}</h2>
            <p className={`text-sm font-bold mt-1 truncate ${palette.text}`}>{department || 'My Department'}</p>
            {subtitle && <p className="text-[13px] font-medium text-slate-500 mt-1">{subtitle}</p>}
          </div>
        </div>
        {stats.length > 0 && <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {stats.map(s => (
            <div key={s.label} className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 min-w-[110px]">
              <div className="text-[20px] font-[900] text-slate-900 leading-none truncate">{s.value}</div>
              <div className="text-[10.5px] font-[800] uppercase tracking-wider text-slate-400 mt-1.5">{s.label}</div>
            </div>
          ))}
        </div>}
      </div>
    </div>
  );
}

// "My Department > Subject > Topic"; crumbs: [{ label, onClick }] - the last one is the current place
export function FolderBreadcrumb({ crumbs }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-sm font-bold">
      {crumbs.map((c, i) => {
        const current = i === crumbs.length - 1;
        return (
          <React.Fragment key={i}>
            {i > 0 && <ChevronRight size={15} className="text-slate-300" />}
            <button
              type="button"
              onClick={c.onClick}
              disabled={current}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${current ? 'text-slate-900 bg-white border border-slate-200 shadow-sm cursor-default' : 'text-slate-500 hover:text-blue-600 hover:bg-white'}`}
            >
              {i === 0 && <Home size={15} />} {c.label}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// One subject / topic folder. The whole card opens the folder; buttons inside (e.g. Buy) should
// stop the click from bubbling. The bottom line shows `latest` as "<dateLabel>: <date>", or
// emptyDate when there's no date.
export function FolderCard({ palette, icon: Icon, title, count, countLabel, corner, chips, footer, latest, onOpen, muted = false, dateLabel = 'Latest', emptyDate = 'Nothing added yet', formatDate = formatDay }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      className={`group relative overflow-hidden cursor-pointer text-left bg-white rounded-[24px] border p-6 shadow-[0_8px_24px_rgba(15,23,42,0.04)] hover:shadow-2xl ${palette.glow} ${palette.ring} hover:-translate-y-1 transition-all duration-300 flex flex-col focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 ${muted ? 'border-dashed border-slate-300' : 'border-slate-200/80'}`}
    >
      <Icon aria-hidden size={110} strokeWidth={1.5} className={`pointer-events-none absolute -right-5 -top-5 opacity-[0.06] ${palette.text} group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500`} />

      <div className="relative flex items-start justify-between gap-3">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${palette.badge} text-white flex items-center justify-center shadow-lg group-hover:rotate-[-4deg] group-hover:scale-105 transition-transform duration-300`}>
          <Icon size={22} strokeWidth={2.2} />
        </div>
        {corner}
      </div>

      <h3 className={`relative mt-4 font-[800] text-[16px] leading-snug line-clamp-2 break-words ${muted ? 'text-slate-500' : 'text-slate-900'}`} title={title}>{title}</h3>
      <div className="relative mt-3 flex items-baseline gap-2">
        <span className="text-[32px] font-[900] text-slate-900 leading-none tracking-tight">{count}</span>
        <span className="text-[12px] font-[800] uppercase tracking-wider text-slate-400">{countLabel}</span>
      </div>
      {chips && <div className="relative mt-3 flex flex-wrap gap-1.5">{chips}</div>}
      {footer && <div className="relative mt-4">{footer}</div>}

      <div className="relative mt-auto pt-5">
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-[12.5px] font-semibold text-slate-500 min-w-0">
            <CalendarClock size={15} className="text-emerald-500 shrink-0" />
            <span className="truncate">{latest ? <>{dateLabel}: <span className="text-slate-700 font-bold">{formatDate(latest)}</span></> : emptyDate}</span>
          </span>
          <ArrowRight size={18} className={`${palette.text} shrink-0 group-hover:translate-x-1.5 transition-transform duration-300`} />
        </div>
      </div>
    </div>
  );
}
