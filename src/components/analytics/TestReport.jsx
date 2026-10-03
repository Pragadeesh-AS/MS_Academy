import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Trophy, Star, CheckCircle2, XCircle, Info, Lock, FileText, TrendingUp, UserRound } from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import logoImg from '../../assets/msgate_logo.png';

// One test attempt's report, laid out like a GATE test-series result page:
// a dark header with the test details, then four tabs -
//   Your Performance (result + All India Rank, time, answer evaluation, percentage, trophy,
//                     section-wise and topic-wise results, time used on each question)
//   Solutions        (the question-by-question review passed in as `solutions`)
//   Key              (answer key vs your answer + time, per question)
//   Top Rankers      (top 10 of everyone who took this test)
// `attempt` is a Student History entry built in admin/Analytics.jsx.

const COLORS = { correct: '#22c55e', wrong: '#dc2626', unattempted: '#d4d4d8', blue: '#0284c7' };
const TOP_N = 10;

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const pad = (n) => String(n).padStart(2, '0');

// "42 mins" / "38 min 56 sec" / "45 sec"
const humanTime = (secs) => {
  const s = Math.max(0, Math.round(Number(secs) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m === 0) return `${r} sec`;
  return r ? `${m} min ${r} sec` : `${m} min${m === 1 ? '' : 's'}`;
};

// datetime-local string / Date / Timestamp -> "29-04-2026 18:00:00"
const formatDateTime = (v) => {
  if (!v) return null;
  const d = v?.toDate ? v.toDate() : new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

// "Option A, C" -> "A, C"
const plainAnswer = (text) => (text ? String(text).replace(/^Option\s+/i, '') : null);

// Same sections as the exam screen: General Aptitude, then the core subject
const sectionOf = (q, coreName) => (/ap+titude/i.test(q.department || '') ? 'General Aptitude' : coreName);

// Time on a test: the stored total, else the sum of per-question times
const attemptSeconds = (a) => a.timeTakenSeconds
  ?? (Array.isArray(a.responses) ? a.responses.reduce((sum, r) => sum + (Number(r.timeSpent) || 0), 0) : 0);

const isAnswered = (r) => (Array.isArray(r.selectedAnswer) ? r.selectedAnswer.length > 0 : r.selectedAnswer !== undefined && r.selectedAnswer !== null && String(r.selectedAnswer).trim() !== '');

// Best score first; equal scores -> the faster attempt ranks higher; same score and time share a rank
const rankAttempts = (attempts) => {
  const sorted = [...attempts].sort((a, b) => (b.score || 0) - (a.score || 0) || attemptSeconds(a) - attemptSeconds(b));
  let prev = null;
  return sorted.map((a, i) => {
    const same = prev && (prev.score || 0) === (a.score || 0) && attemptSeconds(prev) === attemptSeconds(a);
    const rank = same ? prev.rank : i + 1;
    prev = { ...a, rank };
    return prev;
  });
};

const Card = ({ title, children, className = '' }) => (
  <section className={`min-w-0 ${className}`}>
    {title && <h3 className="text-lg md:text-xl font-semibold text-slate-700 mb-3">{title}</h3>}
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 md:p-6 min-w-0">{children}</div>
  </section>
);

export default function TestReport({ attempt, studentName, hideKey = false, onBack, onReviewSolutions = null, solutions = null }) {
  const [tab, setTab] = useState('performance');
  const [allAttempts, setAllAttempts] = useState(null); // everyone's attempts at this test (for AIR / Top Rankers)

  useEffect(() => { setTab('performance'); }, [attempt?.id]);

  useEffect(() => {
    if (!attempt?.testId) return undefined;
    let cancelled = false;
    setAllAttempts(null);
    getDocs(query(collection(db, 'test_attempts'), where('testId', '==', attempt.testId)))
      .then(snap => { if (!cancelled) setAllAttempts(snap.docs.map(d => ({ id: d.id, ...d.data() }))); })
      .catch(err => { console.error('Failed to load attempts for ranking', err); if (!cancelled) setAllAttempts([]); });
    return () => { cancelled = true; };
  }, [attempt?.testId]);

  const test = attempt.test || {};
  const questions = attempt.allQuestions || [];
  const totalMarks = Number(attempt.totalMarks ?? attempt.maxScore) || questions.reduce((s, q) => s + (q.marks || 1), 0);
  const score = round2(attempt.score);
  const negative = round2(questions.reduce((s, q) => s + (q.awarded < 0 ? -q.awarded : 0), 0));
  const percentage = totalMarks > 0 ? round2((attempt.score / totalMarks) * 100) : 0;
  const counts = {
    correct: questions.filter(q => q.status === 'Correct').length,
    wrong: questions.filter(q => q.status === 'Wrong').length,
    unattempted: questions.filter(q => q.status === 'Unattempted').length,
  };
  const durationSecs = (Number(test.duration) || 0) * 60;
  const yourSecs = Number(attempt.timeTakenSeconds ?? attempt.timeSeconds) || 0;
  const timeProgress = durationSecs > 0 ? Math.min(100, round2((yourSecs / durationSecs) * 100)) : null;
  const coreName = test.subject || attempt.subject || 'Technical';

  const ranked = useMemo(() => (allAttempts ? rankAttempts(allAttempts) : []), [allAttempts]);
  const mine = ranked.find(a => a.id === attempt.id);
  const myRank = mine?.rank ?? null;

  const sections = useMemo(() => {
    const map = new Map();
    questions.forEach(q => {
      const name = sectionOf(q, coreName);
      if (!map.has(name)) map.set(name, { name, total: 0, obtained: 0, correct: 0, wrong: 0, unattempted: 0 });
      const sec = map.get(name);
      sec.total += q.marks || 1;
      sec.obtained += Number(q.awarded) || 0;
      if (q.status === 'Correct') sec.correct += 1;
      else if (q.status === 'Wrong') sec.wrong += 1;
      else sec.unattempted += 1;
    });
    return [...map.values()];
  }, [questions, coreName]);

  const topics = useMemo(() => {
    const stats = {};
    questions.forEach(q => {
      const name = (q.topic || '').trim() || q.subject || 'General';
      if (!stats[name]) stats[name] = { name, scored: 0, total: 0, correct: 0, count: 0 };
      stats[name].total += q.marks || 1;
      stats[name].count += 1;
      if (q.status === 'Correct') { stats[name].scored += q.marks || 1; stats[name].correct += 1; }
    });
    return Object.values(stats)
      .map(t => ({ ...t, percentage: t.total > 0 ? Math.round((t.scored / t.total) * 100) : 0 }))
      .sort((a, b) => b.percentage - a.percentage);
  }, [questions]);

  const pieData = [
    { name: 'Total Un Attempted', value: counts.unattempted, color: COLORS.unattempted },
    { name: 'Total Correct', value: counts.correct, color: COLORS.correct },
    { name: 'Total Wrong', value: counts.wrong, color: COLORS.wrong },
  ].filter(d => d.value > 0);

  const timeData = questions.map(q => ({
    name: `Q${q.qIndex}`,
    seconds: q.timeSeconds || 0,
    status: q.status,
  }));
  const hasRealTimes = new Set(timeData.map(d => d.seconds)).size > 1;

  const TABS = [
    { key: 'performance', label: 'Your Performance' },
    { key: 'solutions', label: 'Solutions' },
    { key: 'key', label: 'Key' },
    { key: 'rankers', label: 'Top Rankers' },
  ];

  const detailRows = [
    ['Subject', test.subject || attempt.subject || '-'],
    ['No. of Sections', String(sections.length || 1)],
    ['Total Marks', String(round2(totalMarks))],
    ['Duration', test.duration ? `${test.duration} mins` : '-'],
    ['Start Time', formatDateTime(test.scheduledTime) || '-'],
    ['End Time', formatDateTime(test.closesAt) || 'No end time'],
    ['Submitted On', formatDateTime(attempt.submittedAt) || '-'],
  ];

  const lockedNotice = (what) => (
    <div className="bg-white rounded-2xl border border-amber-200 p-10 text-center flex flex-col items-center">
      <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mb-4"><Lock size={26} /></div>
      <p className="text-lg font-bold text-slate-800">{what} are locked</p>
      <p className="mt-1 text-sm font-medium text-slate-500 max-w-md">They'll appear here once your teacher releases the solutions for this test.</p>
    </div>
  );

  return (
    <div className="flex flex-col rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 min-w-0 w-full">
      {/* ---------------- Header */}
      <div className="bg-[#232b3b] text-white">
        <div className="flex items-center justify-between px-4 md:px-6 py-2.5 bg-black/30">
          <span className="text-sm font-medium text-white/80">{TABS.find(t => t.key === tab)?.label}</span>
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-semibold text-white/90 hover:text-white">
            <ArrowLeft size={16} /> Back
          </button>
        </div>
        <div className="relative px-5 md:px-10 pt-7 pb-8 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.18),transparent_45%),radial-gradient(circle_at_85%_70%,rgba(14,165,233,0.12),transparent_40%)]">
          <img src={logoImg} alt="" className="hidden md:block absolute top-6 right-8 w-14 h-14 object-contain rounded-full bg-white/95 p-1" />
          <h2 className="text-center text-2xl md:text-4xl font-semibold tracking-tight">{attempt.testName}</h2>
          <p className="text-center text-sm md:text-base text-white/70 mt-1">{studentName}</p>
          <dl className="mt-7 grid grid-cols-[auto_1fr] gap-x-8 md:gap-x-24 gap-y-1.5 max-w-xl mx-auto text-sm md:text-base">
            {detailRows.map(([label, value]) => (
              <React.Fragment key={label}>
                <dt className="text-white/80">{label}</dt>
                <dd className="font-bold break-words">{value}</dd>
              </React.Fragment>
            ))}
          </dl>
        </div>
      </div>

      {/* ---------------- Tabs */}
      <div className="flex bg-white border-b border-slate-200 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 px-5 md:px-8 py-3.5 text-sm md:text-base transition-colors border-b-4 ${tab === t.key ? 'bg-sky-100 border-sky-400 font-bold text-slate-900' : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-3 sm:p-4 md:p-8 min-w-0">
        {/* ================= Your Performance */}
        {tab === 'performance' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
            <Card title="Result">
              <div className="text-center py-2">
                <div className="flex items-baseline justify-center gap-4">
                  <span className="text-xl text-slate-600">Marks</span>
                  <span className={`text-4xl font-medium tabular-nums ${score < 0 ? 'text-red-600' : 'text-slate-800'}`}>{score}</span>
                </div>
                <p className="mt-1 text-sm text-slate-500">Negative Marks: {negative}</p>
                <div className="mt-3 flex items-end justify-center gap-3">
                  <span className="text-xl text-slate-700 mb-2">AIR</span>
                  <span className="text-7xl font-medium text-sky-600 leading-none tabular-nums">{allAttempts === null ? '…' : (myRank ?? '-')}</span>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  Total Attempted students (till now) : <strong>{allAttempts === null ? '…' : allAttempts.length}</strong>
                </p>
              </div>
            </Card>

            <Card title="Time">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-lg sm:text-2xl md:text-3xl font-bold text-slate-800">{test.duration ? `${test.duration} mins` : '-'}</p>
                  <p className="text-slate-600">Test Duration</p>
                </div>
                <div>
                  <p className="text-lg sm:text-2xl md:text-3xl font-bold text-slate-800">{humanTime(yourSecs)}</p>
                  <p className="text-slate-600">Your Time</p>
                </div>
              </div>
              {timeProgress !== null && (
                <div className="mt-8">
                  <p className="text-center text-slate-700 mb-1.5">Your Time Progress</p>
                  <div className="h-7 rounded-md bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full flex items-center justify-center text-sm font-medium text-white ${timeProgress > 95 ? 'bg-amber-500' : 'bg-green-600'}`}
                      style={{ width: `${Math.max(timeProgress, 8)}%` }}
                    >
                      {timeProgress.toFixed(2)} %
                    </div>
                  </div>
                </div>
              )}
            </Card>

            <Card title="Answer Evaluation">
              {pieData.length === 0 ? (
                <p className="text-center text-slate-500 py-10">No answers recorded.</p>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius="78%" startAngle={90} endAngle={-270} stroke="#fff" strokeWidth={2} paddingAngle={pieData.length > 1 ? 1 : 0} isAnimationActive={false}>
                        {pieData.map(d => <Cell key={d.name} fill={d.color} />)}
                      </Pie>
                      <Tooltip formatter={(v, n) => [`${v} question${v === 1 ? '' : 's'} (${round2((v / questions.length) * 100)}%)`, n]} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 13, fontWeight: 700 }} formatter={(name, entry) => <span className="text-slate-700">{name} ({entry.payload.value})</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card title="Percentage">
              <div className="flex flex-col items-center py-2">
                <div className="relative w-48 h-48">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="#fafafa" stroke="#d4d4d8" strokeWidth="8" />
                    <circle
                      cx="50" cy="50" r="42" fill="none" stroke={COLORS.blue} strokeWidth="8"
                      strokeDasharray={`${(Math.max(0, Math.min(100, percentage)) / 100) * 263.9} 263.9`}
                    />
                  </svg>
                  <span className={`absolute inset-0 flex items-center justify-center text-3xl tabular-nums ${percentage < 0 ? 'text-red-600' : 'text-slate-800'}`}>{percentage}</span>
                </div>
                <p className="mt-4 text-lg text-slate-700">Your Total Percentage</p>
              </div>
            </Card>

            <Card title="Performance">
              <div className="flex flex-col items-center text-center py-2">
                <div className="flex items-end justify-center gap-4 mb-3">
                  {[2, 1, 3].map(place => {
                    const won = myRank === place;
                    const tint = place === 1 ? 'text-yellow-500' : place === 2 ? 'text-slate-400' : 'text-orange-500';
                    return (
                      <div key={place} className="flex flex-col items-center">
                        <Trophy size={place === 1 ? 72 : 52} className={won ? tint : 'text-slate-200'} strokeWidth={1.5} />
                        <div className={`mt-1 ${place === 1 ? 'w-24 h-4' : 'w-16 h-3'} rounded-sm ${won ? 'bg-slate-300' : 'bg-slate-100'}`} />
                      </div>
                    );
                  })}
                </div>
                <p className="font-bold text-slate-800">MS GATE Academy</p>
                <p className="text-sm text-slate-500">{new Date().getFullYear()}</p>
                <p className="mt-3 text-slate-700">
                  {allAttempts === null ? 'Working out your rank…'
                    : myRank && myRank <= 3
                      ? <>Congratulations! You won the <strong>{myRank === 1 ? 'gold' : myRank === 2 ? 'silver' : 'bronze'}</strong> trophy - Rank <strong>{myRank}</strong>.</>
                      : <>You didn't get any trophy. Your Rank is <strong>{myRank ?? '-'}</strong>.<br />* You can do better.</>}
                </p>
              </div>
            </Card>

            <Card title="Section Wise Result View">
              <div className="space-y-5">
                {sections.map(sec => (
                  <div key={sec.name} className="grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-4">
                    <p className="col-span-2 text-xl font-bold text-slate-800 break-words">{sec.name}</p>
                    <div>
                      <p className="text-slate-500 text-sm">Obtained Marks</p>
                      <p className={`text-xl ${sec.obtained < 0 ? 'text-red-600' : 'text-green-700'}`}>{round2(sec.obtained)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-sm">Percentage</p>
                      <p className="text-xl text-slate-800">{sec.total ? round2((sec.obtained / sec.total) * 100) : 0} %</p>
                    </div>
                    <div><p className="text-slate-700 text-sm">Total Marks</p><p className="text-lg text-slate-800">{round2(sec.total)}</p></div>
                    <div><p className="text-green-700 text-sm">Correct</p><p className="text-lg text-green-700">{sec.correct}</p></div>
                    <div><p className="text-red-600 text-sm">Wrong</p><p className="text-lg text-red-600">{sec.wrong}</p></div>
                    <div><p className="text-slate-400 text-sm">Unattempted</p><p className="text-lg text-slate-400">{sec.unattempted}</p></div>
                  </div>
                ))}
              </div>
            </Card>

            {topics.length > 0 && (
              <Card title="Topic Wise Analysis" className="lg:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { title: 'Strong Topics', list: topics.filter(t => t.percentage >= 60), good: true },
                    { title: 'Topics to Improve', list: topics.filter(t => t.percentage < 60), good: false },
                  ].map(group => (
                    <div key={group.title} className={`rounded-2xl p-4 border ${group.good ? 'bg-emerald-50/60 border-emerald-100' : 'bg-rose-50/60 border-rose-100'}`}>
                      <h4 className={`font-black flex items-center gap-2 mb-3 ${group.good ? 'text-emerald-700' : 'text-rose-700'}`}>
                        <TrendingUp size={18} className={group.good ? '' : 'rotate-180'} /> {group.title}
                      </h4>
                      {group.list.length === 0 ? (
                        <p className={`text-sm italic font-semibold ${group.good ? 'text-emerald-600/60' : 'text-rose-600/60'}`}>{group.good ? 'No strong topics in this test yet.' : 'No weak topics in this test!'}</p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {group.list.map(t => (
                            <div key={t.name} className="flex justify-between items-center gap-3 bg-white p-3 rounded-xl shadow-sm">
                              <div className="min-w-0">
                                <span className="font-bold text-slate-700 text-sm block truncate">{t.name}</span>
                                <span className="text-[11px] font-semibold text-slate-400">{t.correct} of {t.count} question{t.count === 1 ? '' : 's'} correct</span>
                              </div>
                              <span className={`font-black shrink-0 ${group.good ? 'text-emerald-600' : 'text-rose-600'}`}>{t.percentage}%</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card title="Answer Evaluation Vs Time Usage" className="lg:col-span-2">
              <p className="text-center text-slate-700 mb-2">Time Usage For Each Question</p>
              <div className="h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} label={{ value: 'Time in seconds', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 12 }} />
                    <Tooltip formatter={(v, n, p) => [humanTime(v), p.payload.status]} cursor={{ fill: 'rgba(148,163,184,0.12)' }} />
                    <Bar dataKey="seconds" maxBarSize={22} isAnimationActive={false}>
                      {timeData.map(d => (
                        <Cell key={d.name} fill={d.status === 'Correct' ? '#16a34a' : d.status === 'Wrong' ? '#b91c1c' : '#a3a3a3'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap justify-center gap-4 text-xs font-bold text-slate-600">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-600" /> Correct</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-700" /> Wrong</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-neutral-400" /> Unattempted</span>
              </div>
              {!hasRealTimes && (
                <p className="mt-3 text-center text-xs font-semibold text-slate-400">
                  This attempt was taken before per-question timing was recorded, so each question shows the average time.
                </p>
              )}
            </Card>
          </div>
        )}

        {/* ================= Solutions */}
        {tab === 'solutions' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="text-xl font-semibold text-slate-800">Solutions</h3>
                <p className="text-sm text-slate-500">Total Questions: {questions.length} &nbsp;|&nbsp; Max Marks: {round2(totalMarks)}</p>
              </div>
              {onReviewSolutions && (
                <button
                  onClick={() => onReviewSolutions(attempt.testId)}
                  className="flex items-center justify-center gap-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-xl shadow-sm transition-colors"
                  title="Open the full review - report a question from there"
                >
                  <FileText size={16} /> Open Full Review &amp; Report a Question
                </button>
              )}
            </div>
            {solutions}
          </div>
        )}

        {/* ================= Key */}
        {tab === 'key' && (
          hideKey ? lockedNotice('The answer key and solutions') : (
            <div>
              <div className="text-center mb-6">
                <h3 className="text-2xl text-slate-800">Question Paper Key</h3>
                <p className="text-sm text-slate-500">Check individual questions with Analysis</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {questions.map(q => {
                  const key = plainAnswer(q.correct);
                  const yours = plainAnswer(q.selected);
                  return (
                    <div key={q.qIndex} className={`rounded-xl border shadow-sm overflow-hidden ${q.status === 'Wrong' ? 'bg-red-100 border-red-200' : 'bg-white border-slate-200'}`}>
                      <p className={`text-center text-lg py-2 border-b ${q.status === 'Wrong' ? 'border-red-200' : 'border-slate-100 bg-slate-50'}`}>Q.No : {q.qIndex}</p>
                      <div className="grid grid-cols-3 gap-2 px-4 py-3 text-sm">
                        <div><p className="font-semibold text-slate-800">{humanTime(q.timeSeconds)}</p><p className="text-slate-500">Time</p></div>
                        <div><p className="font-bold text-slate-800 break-words">{key || '-'}</p><p className="text-slate-500">Answer</p></div>
                        <div>
                          <p className="font-semibold text-slate-800 flex items-center gap-1 break-words">
                            {yours || 'NA'}
                            {q.status === 'Correct' && <CheckCircle2 size={15} className="text-green-600 shrink-0" />}
                            {q.status === 'Wrong' && <XCircle size={15} className="text-red-600 shrink-0" />}
                            {q.status === 'Unattempted' && <Info size={15} className="text-amber-500 shrink-0" />}
                          </p>
                          <p className="text-slate-500">Your Answer</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}

        {/* ================= Top Rankers */}
        {tab === 'rankers' && (
          <div>
            <div className="text-center mb-6">
              <h3 className="text-2xl text-slate-800">TOP Rankers</h3>
              <p className="text-sm text-slate-500">These are the Top Rankers for this Test.</p>
            </div>
            {allAttempts === null ? (
              <p className="text-center text-slate-500 py-10">Loading rankers…</p>
            ) : ranked.length === 0 ? (
              <p className="text-center text-slate-500 py-10">No one has taken this test yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {ranked.slice(0, TOP_N).map(a => {
                  const responses = Array.isArray(a.responses) ? a.responses : [];
                  const attempted = responses.filter(isAnswered).length;
                  const correct = a.correctCount ?? responses.filter(r => r.isCorrect).length;
                  const max = Number(a.totalMarks) || totalMarks;
                  const isMe = a.id === attempt.id;
                  return (
                    <div key={a.id} className={`relative bg-white rounded-xl border shadow-sm p-4 ${isMe ? 'border-sky-400 ring-2 ring-sky-200' : 'border-slate-200'}`}>
                      <span className="absolute top-3 right-3 flex items-center gap-1 bg-sky-500 text-white text-xs font-bold px-2.5 py-1 rounded">
                        <Star size={12} /> AIR-{a.rank}
                      </span>
                      <div className="flex items-center gap-3 mb-4 pr-20">
                        <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                          <UserRound size={30} />
                        </div>
                        <p className="font-bold text-slate-800 truncate">{a.studentName || 'Student'}{isMe ? ' (You)' : ''}</p>
                      </div>
                      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                        <dt className="text-slate-600">Obtained Marks</dt><dd className="font-bold text-slate-800">{round2(a.score)}</dd>
                        <dt className="text-slate-600">Percentage</dt><dd className="font-bold text-slate-800">{max ? `${round2((a.score / max) * 100).toFixed(2)} %` : '-'}</dd>
                        <dt className="text-slate-600">Time Duration</dt><dd className="font-bold text-slate-800">{humanTime(attemptSeconds(a))}</dd>
                        <dt className="text-slate-600">Success Rate</dt>
                        <dd className="font-bold text-slate-800">
                          {attempted ? `${round2((correct / attempted) * 100).toFixed(2)} %` : '-'}
                          <span className="block text-xs font-semibold text-slate-500">(Correct {correct} / Attempted {attempted})</span>
                        </dd>
                      </dl>
                    </div>
                  );
                })}
              </div>
            )}
            {mine && mine.rank > TOP_N && (
              <p className="mt-6 text-center text-sm font-semibold text-slate-600">Your rank: <strong>AIR-{mine.rank}</strong> of {ranked.length}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
