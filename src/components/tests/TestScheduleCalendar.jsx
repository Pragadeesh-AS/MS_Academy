import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, CalendarDays, Clock, AlertTriangle, CalendarClock, Edit2 } from 'lucide-react';
import {
  AVAILABILITY, testAvailability, testStartMillis, testCloseMillis, formatTestTime, formatCountdown,
  toDateTimeLocal, dayKey, overlappingTests
} from '../../utils/testSchedule';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const STATUS_STYLE = {
  [AVAILABILITY.UPCOMING]: { chip: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100', dot: 'bg-indigo-500', label: 'Upcoming' },
  [AVAILABILITY.OPEN]: { chip: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100', dot: 'bg-emerald-500', label: 'Open now' },
  [AVAILABILITY.CLOSED]: { chip: 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200', dot: 'bg-slate-400', label: 'Closed / past' },
};

const timeLabel = (ms) => new Date(ms).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
const shortDept = (dept) => ((dept || '').match(/\(([^)]+)\)/) || [])[1] || dept || '';

/**
 * Month calendar of scheduled tests. Click a day to schedule a test on it, click a test to
 * reschedule it. `onSchedule(test, { scheduledTime, closesAt })` saves and resolves true on success.
 */
export default function TestScheduleCalendar({ tests, showDepartment = false, onSchedule, onCreateOnDate, onEditTest }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [now, setNow] = useState(Date.now());
  const [dialog, setDialog] = useState(null); // { test?: existing test, date: 'YYYY-MM-DD' }

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  // Tests keyed by the local day they start on
  const byDay = useMemo(() => {
    const map = {};
    tests.forEach(t => {
      const start = testStartMillis(t);
      if (start === null) return;
      (map[dayKey(start)] = map[dayKey(start)] || []).push(t);
    });
    Object.values(map).forEach(list => list.sort((a, b) => testStartMillis(a) - testStartMillis(b)));
    return map;
  }, [tests]);

  const unscheduled = tests.filter(t => testStartMillis(t) === null);
  const upcoming = tests
    .filter(t => testStartMillis(t) !== null && testAvailability(t, now) !== AVAILABILITY.CLOSED)
    .sort((a, b) => testStartMillis(a) - testStartMillis(b))
    .slice(0, 8);

  // 6 weeks x 7 days, starting on the Monday on/before the 1st of the month
  const cells = useMemo(() => {
    const first = new Date(cursor);
    const offset = (first.getDay() + 6) % 7; // Monday = 0
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset);
    return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }, [cursor]);

  const todayKey = dayKey(now);
  const monthLabel = cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const shiftMonth = (n) => setCursor(c => new Date(c.getFullYear(), c.getMonth() + n, 1));

  const chip = (t) => {
    const style = STATUS_STYLE[testAvailability(t, now)];
    return (
      <button
        key={t.id}
        type="button"
        onClick={(e) => { e.stopPropagation(); setDialog({ test: t, date: dayKey(testStartMillis(t)) }); }}
        title={`${t.title} - ${formatTestTime(testStartMillis(t))} (${t.duration || 0} min)`}
        className={`w-full text-left px-1.5 py-1 rounded-md border text-[10.5px] font-bold leading-tight truncate transition-colors ${style.chip}`}
      >
        <span className="tabular-nums">{timeLabel(testStartMillis(t))}</span>{' '}
        {showDepartment && t.department && <span className="opacity-70">[{shortDept(t.department)}] </span>}
        {t.title}
      </button>
    );
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6 items-start">
      {/* ---------------- Month grid ---------------- */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <button onClick={() => shiftMonth(-1)} className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50" title="Previous month"><ChevronLeft size={18} /></button>
            <h3 className="text-lg font-[900] text-slate-900 min-w-[170px] text-center">{monthLabel}</h3>
            <button onClick={() => shiftMonth(1)} className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50" title="Next month"><ChevronRight size={18} /></button>
            <button
              onClick={() => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); }}
              className="ml-1 px-3 py-2 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-50"
            >
              Today
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-slate-500">
            {Object.values(STATUS_STYLE).map(s => (
              <span key={s.label} className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${s.dot}`} /> {s.label}</span>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAYS.map(d => <div key={d} className="text-center text-[11px] font-black uppercase tracking-wider text-slate-400 py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map(date => {
                const key = dayKey(date.getTime());
                const inMonth = date.getMonth() === cursor.getMonth();
                const isToday = key === todayKey;
                const isPast = key < todayKey;
                const dayTests = byDay[key] || [];
                return (
                  <div
                    key={key}
                    onClick={() => setDialog({ date: key })}
                    className={`group relative min-h-[104px] rounded-xl border p-1.5 flex flex-col gap-1 cursor-pointer transition-colors ${
                      isToday ? 'border-blue-400 bg-blue-50/40' : inMonth ? 'border-slate-200 bg-white hover:bg-slate-50' : 'border-slate-100 bg-slate-50/60 hover:bg-slate-50'
                    }`}
                    title="Click to schedule a test on this day"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[12px] font-black w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : inMonth ? (isPast ? 'text-slate-400' : 'text-slate-700') : 'text-slate-300'}`}>
                        {date.getDate()}
                      </span>
                      <Plus size={14} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {dayTests.slice(0, 3).map(chip)}
                    {dayTests.length > 3 && (
                      <span className="text-[10.5px] font-bold text-slate-500 px-1">+{dayTests.length - 3} more</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- Side panel: upcoming + not scheduled ---------------- */}
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-5">
          <h4 className="text-sm font-[900] text-slate-800 flex items-center gap-2 mb-3"><CalendarClock size={17} className="text-indigo-500" /> Upcoming & open</h4>
          {upcoming.length === 0 ? (
            <p className="text-xs font-semibold text-slate-400">No upcoming tests. Click a day on the calendar to schedule one.</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map(t => {
                const availability = testAvailability(t, now);
                const start = testStartMillis(t);
                const close = testCloseMillis(t);
                return (
                  <button
                    key={t.id}
                    onClick={() => setDialog({ test: t, date: dayKey(start) })}
                    className="w-full text-left p-3 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-bold text-slate-800 truncate">{t.title}</span>
                      <span className={`shrink-0 text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${availability === AVAILABILITY.OPEN ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
                        {availability === AVAILABILITY.OPEN ? 'Open' : `in ${formatCountdown(start - now)}`}
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500 mt-1">
                      {showDepartment && t.department ? `${shortDept(t.department)} · ` : ''}{formatTestTime(start)} · {t.duration || 0} min
                      {close !== null && <span className="block">Closes {formatTestTime(close)}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {unscheduled.length > 0 && (
          <div className="bg-white border border-amber-200 rounded-3xl shadow-sm p-5">
            <h4 className="text-sm font-[900] text-amber-800 flex items-center gap-2 mb-3"><AlertTriangle size={16} /> Not scheduled ({unscheduled.length})</h4>
            <div className="space-y-2">
              {unscheduled.map(t => (
                <div key={t.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-50/60 border border-amber-100">
                  <span className="text-[12.5px] font-bold text-slate-700 truncate">{t.title}</span>
                  <button onClick={() => setDialog({ test: t, date: todayKey })} className="shrink-0 text-[11px] font-black text-blue-600 hover:underline">Schedule</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {dialog && (
        <ScheduleDialog
          dialog={dialog}
          tests={tests}
          now={now}
          showDepartment={showDepartment}
          onClose={() => setDialog(null)}
          onSave={async (test, schedule) => { if (await onSchedule(test, schedule)) setDialog(null); }}
          onCreateOnDate={(date) => { setDialog(null); onCreateOnDate(date); }}
          onEditTest={(test) => { setDialog(null); onEditTest(test); }}
        />
      )}
    </div>
  );
}

function ScheduleDialog({ dialog, tests, now, showDepartment, onClose, onSave, onCreateOnDate, onEditTest }) {
  const existing = dialog.test || null;
  const existingStart = existing ? testStartMillis(existing) : null;
  const [testId, setTestId] = useState(existing?.id || '');
  const [date, setDate] = useState(existingStart !== null ? dayKey(existingStart) : dialog.date);
  const [time, setTime] = useState(existingStart !== null ? toDateTimeLocal(existingStart).slice(11, 16) : '10:00');
  const [hasClose, setHasClose] = useState(!!existing?.closesAt);
  const [closesAt, setClosesAt] = useState(existing?.closesAt || '');
  const [saving, setSaving] = useState(false);

  const selected = tests.find(t => t.id === testId) || null;
  const scheduledTime = date && time ? `${date}T${time}` : '';
  const startMs = scheduledTime ? new Date(scheduledTime).getTime() : null;
  const closeMs = hasClose && closesAt ? new Date(closesAt).getTime() : null;

  // Default closing time: the end of the test's own duration after the start
  useEffect(() => {
    if (hasClose && !closesAt && startMs !== null && selected) {
      setClosesAt(toDateTimeLocal(startMs + (parseInt(selected.duration) || 60) * 60000));
    }
  }, [hasClose]); // eslint-disable-line react-hooks/exhaustive-deps

  const error = !selected ? 'Pick the test to schedule.'
    : !scheduledTime || Number.isNaN(startMs) ? 'Pick a date and start time.'
    : hasClose && (!closesAt || Number.isNaN(closeMs)) ? 'Pick the closing time, or turn "Closes at" off.'
    : closeMs !== null && closeMs <= startMs ? 'The closing time must be after the start time.'
    : null;
  const clashes = selected && startMs !== null && !Number.isNaN(startMs)
    ? overlappingTests({ ...selected, scheduledTime }, tests)
    : [];
  const inPast = startMs !== null && startMs < now;

  const sortedTests = [...tests].sort((a, b) => (a.title || '').localeCompare(b.title || ''));

  const save = async () => {
    if (error || saving) return;
    setSaving(true);
    await onSave(selected, { scheduledTime, closesAt: hasClose ? closesAt : '' });
    setSaving(false);
  };

  const inputCls = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[14px] font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !saving && onClose()}>
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-[900] text-slate-900 flex items-center gap-2">
            <CalendarDays size={20} className="text-indigo-600" /> {existing ? 'Reschedule test' : 'Schedule a test'}
          </h3>
          <button onClick={onClose} disabled={saving} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[13px] font-[800] text-slate-800">Test</label>
            {existing ? (
              <div className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[14px] font-bold text-slate-800">
                {existing.title}
                {showDepartment && existing.department && <span className="text-slate-400 font-semibold"> · {existing.department}</span>}
              </div>
            ) : (
              <select value={testId} onChange={e => setTestId(e.target.value)} className={inputCls}>
                <option value="">Select a test template...</option>
                {sortedTests.map(t => {
                  const s = testStartMillis(t);
                  return (
                    <option key={t.id} value={t.id}>
                      {t.title}{showDepartment && t.department ? ` [${shortDept(t.department)}]` : ''} - {s !== null ? `now ${formatTestTime(s)}` : 'not scheduled'}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[13px] font-[800] text-slate-800">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-[800] text-slate-800">Opens at</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[13px] font-[800] text-slate-800 cursor-pointer">
              <input type="checkbox" checked={hasClose} onChange={e => setHasClose(e.target.checked)} className="w-4 h-4 accent-indigo-600" />
              Closes at (optional)
            </label>
            {hasClose && <input type="datetime-local" value={closesAt} onChange={e => setClosesAt(e.target.value)} className={inputCls} />}
            <p className="text-[11.5px] font-semibold text-slate-400">
              {hasClose ? 'Students can start the test only between the opening and closing time.' : 'Once it opens, students can start the test any time after.'}
              {selected ? ` Test duration: ${selected.duration || 0} min.` : ''}
            </p>
          </div>

          {startMs !== null && !Number.isNaN(startMs) && selected && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-[12.5px] font-semibold text-indigo-800">
              <Clock size={15} className="mt-0.5 shrink-0" />
              <span>Students can start it from <strong>{formatTestTime(startMs)}</strong>{closeMs !== null && !Number.isNaN(closeMs) ? <> until <strong>{formatTestTime(closeMs)}</strong></> : ''}.</span>
            </div>
          )}
          {inPast && !error && (
            <p className="text-[12px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">This time is already in the past - the test will be open straight away.</p>
          )}
          {clashes.length > 0 && (
            <div className="text-[12px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              <span className="flex items-center gap-1.5"><AlertTriangle size={14} /> Overlaps with {clashes.length} other test{clashes.length === 1 ? '' : 's'} for this department:</span>
              <ul className="mt-1 ml-5 list-disc font-semibold">
                {clashes.slice(0, 4).map(c => <li key={c.id}>{c.title} ({formatTestTime(testStartMillis(c))}, {c.duration || 0} min)</li>)}
              </ul>
            </div>
          )}
          {error && <p className="text-[12px] font-bold text-slate-500">{error}</p>}
        </div>

        <div className="px-6 pb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {existing ? (
              <button onClick={() => onEditTest(existing)} className="flex items-center gap-1.5 text-[12.5px] font-bold text-slate-500 hover:text-indigo-600">
                <Edit2 size={14} /> Edit full test
              </button>
            ) : (
              <button onClick={() => onCreateOnDate(date || dialog.date)} className="flex items-center gap-1.5 text-[12.5px] font-bold text-slate-500 hover:text-indigo-600">
                <Plus size={14} /> Create a new test on this day
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} disabled={saving} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50">Cancel</button>
            <button
              onClick={save}
              disabled={!!error || saving}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm shadow-sm"
            >
              {saving ? 'Saving...' : existing ? 'Save schedule' : 'Schedule test'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
