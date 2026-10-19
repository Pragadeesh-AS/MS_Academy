import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { 
  Dumbbell, 
  Lock, 
  Check, 
  Clock, 
  HelpCircle, 
  ArrowRight, 
  Crown, 
  Infinity as InfinityIcon, 
  AlertCircle, 
  History,
  Sparkles,
  X,
  CheckCircle2,
  ChevronRight,
  Zap,
  Award,
  Video,
  BookOpen,
  ShieldCheck
} from 'lucide-react';
import { sameDepartment, isCommonDeptName } from '../../utils/subjects';
import {
  FREE_PRACTICE_QUESTIONS, practiceQuestionsUsed, isPracticeQuestionFor, pickPracticeQuestions, markOf, isFullBundle
} from '../../utils/practiceTests';
import Toast from '../shared/Toast';

const toTitleCase = (s) => (s || '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
const sameName = (a, b) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();
const MINUTES_PER_QUESTION = 3; // GATE: 180 minutes for 65 questions

const formatPrice = (val) => {
  const n = Number(String(val || '').replace(/[^\d.]/g, ''));
  return n ? n.toLocaleString('en-IN') : val;
};

const getSavings = (orig, disc) => {
  const o = Number(String(orig || '').replace(/[^\d.]/g, ''));
  const d = Number(String(disc || '').replace(/[^\d.]/g, ''));
  if (o && d && o > d) {
    const diff = o - d;
    const pct = Math.round((diff / o) * 100);
    return { amount: diff.toLocaleString('en-IN'), pct };
  }
  return null;
};

// Practice tab of Academy Tests (see utils/practiceTests). The student picks subjects + topics of
// their department, a question count and a duration; the questions are auto-selected.
//   practiceTests  this student's 'practice_tests' documents (newest first)
//   unlimited      bought a full bundle - no question allowance
//   onStart(test)  a new practice test was created - start it
//   onResume(test) / onReview(test)  continue an unfinished one / see a finished one's results
export default function PracticeTests({ 
  department, 
  studentEmail, 
  studentName, 
  practiceTests = [], 
  unlimited = false, 
  bundles = [],
  onBuyBundle = null,
  payingBundleId = null,
  onStart, 
  onResume, 
  onReview, 
  onUpgrade 
}) {
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'info') => setToast({ message, type });
  const [attributes, setAttributes] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [questionCount, setQuestionCount] = useState(10);
  const [duration, setDuration] = useState(10 * MINUTES_PER_QUESTION);
  const [durationTouched, setDurationTouched] = useState(false);
  // { topicName(lowercase): questions[] } - bank questions read per topic, so each topic is read once
  const [topicPools, setTopicPools] = useState({});
  const [loadingPool, setLoadingPool] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showEliteModal, setShowEliteModal] = useState(false);

  useEffect(() => {
    getDocs(collection(db, 'question_attributes'))
      .then(snap => setAttributes(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(err => console.error('Failed to load subjects', err));
  }, []);

  // Find matching Elite bundle for this department
  const eliteBundle = (bundles || []).find(b =>
    !b.isHidden &&
    (b.tier === 'elite' || b.isElite === true || /elite/i.test(b.name || '') || isFullBundle(b)) &&
    (sameDepartment(b.department, department) || b.department === 'General' || b.department === 'All')
  ) || (bundles || []).find(b => !b.isHidden && sameDepartment(b.department, department)) || (bundles || []).find(b => !b.isHidden) || null;

  // The department's own subjects, then the shared Engineering Mathematics / Aptitude subjects
  const deptAttrs = attributes.filter(a => a.type === 'department');
  const ownDeptIds = new Set(deptAttrs.filter(a => !isCommonDeptName(a.name) && sameDepartment(a.name, department)).map(a => a.id));
  const commonDepts = deptAttrs.filter(a => isCommonDeptName(a.name));
  const subjects = [
    ...attributes.filter(a => a.type === 'subject' && ownDeptIds.has(a.parentId))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(a => ({ attr: a, label: a.name })),
    ...commonDepts.flatMap(dept => attributes.filter(a => a.type === 'subject' && a.parentId === dept.id)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(a => ({ attr: a, label: `${toTitleCase(dept.name)} : ${a.name}` }))),
  ].filter((s, i, all) => all.findIndex(x => sameName(x.attr.name, s.attr.name)) === i);

  const subjectIds = new Set(subjects.filter(s => selectedSubjects.includes(s.attr.name)).map(s => s.attr.id));
  const topics = [...new Set(attributes
    .filter(a => a.type === 'topic' && subjectIds.has(a.parentId))
    .map(a => a.name.trim()))]
    .sort((a, b) => a.localeCompare(b));

  // Topics that belong to no selected subject any more drop out
  useEffect(() => {
    setSelectedTopics(prev => prev.filter(t => topics.includes(t)));
  }, [selectedSubjects.join('|'), attributes.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Read the bank questions of newly selected topics (a Firestore 'in' filter takes 30 values)
  useEffect(() => {
    const missing = selectedTopics.filter(t => !topicPools[t.toLowerCase()]);
    if (missing.length === 0) return;
    let cancelled = false;
    setLoadingPool(true);
    const groups = [];
    for (let i = 0; i < missing.length; i += 30) groups.push(missing.slice(i, i + 30));
    Promise.all(groups.map(g => getDocs(query(collection(db, 'question_bank'), where('topic', 'in', g)))))
      .then(snaps => {
        if (cancelled) return;
        const found = Object.fromEntries(missing.map(t => [t.toLowerCase(), []]));
        snaps.flatMap(s => s.docs).forEach(d => {
          const q = { id: d.id, ...d.data() };
          const key = (q.topic || '').trim().toLowerCase();
          if (found[key] && isPracticeQuestionFor(q, department)) found[key].push(q);
        });
        setTopicPools(prev => ({ ...prev, ...found }));
      })
      .catch(err => console.error('Failed to load practice questions', err))
      .finally(() => { if (!cancelled) setLoadingPool(false); });
    return () => { cancelled = true; };
  }, [selectedTopics.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  // Only questions filed under a selected subject (a topic name can exist under two subjects)
  const pool = selectedTopics.flatMap(t => (topicPools[t.toLowerCase()] || [])
    .filter(q => selectedSubjects.some(s => sameName(s, q.subject))));

  const used = practiceQuestionsUsed(practiceTests);
  const remaining = unlimited ? Infinity : Math.max(0, FREE_PRACTICE_QUESTIONS - used);
  const maxQuestions = pool.length;
  const count = Math.max(0, Math.min(parseInt(questionCount) || 0, maxQuestions));

  // Duration follows the question count until the student sets it themselves
  const setCount = (value) => {
    setQuestionCount(value);
    const n = parseInt(value) || 0;
    if (!durationTouched && n > 0) setDuration(n * MINUTES_PER_QUESTION);
  };

  const toggle = (list, setList, value) => setList(list.includes(value) ? list.filter(x => x !== value) : [...list, value]);

  const warning = !selectedSubjects.length ? 'Select at least one subject'
    : !selectedTopics.length ? 'Select at least one topic'
    : loadingPool ? 'Checking the question bank...'
    : pool.length === 0 ? 'No questions are available for these topics yet - try other topics'
    : !(parseInt(questionCount) > 0) ? 'Enter how many questions you want'
    : parseInt(questionCount) > pool.length ? `Only ${pool.length} questions are available for these topics`
    : !(parseInt(duration) > 0) ? 'Enter the test duration in minutes'
    : null;

  const createPracticeTest = async () => {
    if (warning || creating) return;
    setCreating(true);
    try {
      const picked = pickPracticeQuestions(pool, count);
      const total1Mark = picked.filter(q => markOf(q) === 1).length;
      const total2Mark = picked.filter(q => markOf(q) === 2).length;
      const shownTopics = selectedTopics.slice(0, 2).join(', ') + (selectedTopics.length > 2 ? ` +${selectedTopics.length - 2} more` : '');
      const test = {
        isPractice: true,
        title: `Practice: ${shownTopics}`,
        studentEmail,
        studentName,
        department,
        subjects: selectedSubjects,
        topics: selectedTopics,
        subject: selectedSubjects.join(', '),
        topic: selectedTopics.join(', '),
        duration: parseInt(duration),
        questions: picked.map(q => q.id),
        total1Mark,
        total2Mark,
        targetMarks: picked.reduce((sum, q) => sum + markOf(q), 0),
        solutionsUnlocked: true,
        status: 'in_progress',
        createdAt: serverTimestamp(),
      };
      const ref = await addDoc(collection(db, 'practice_tests'), test);
      onStart({ ...test, id: ref.id, createdAt: null });
    } catch (err) {
      console.error('Failed to create practice test', err);
      showToast('Could not create the practice test. Please try again.', 'error');
    }
    setCreating(false);
  };

  const handleStartPractice = () => {
    if (warning || creating) return;
    // Check if free allowance (50 questions) is reached or exceeded
    if (!unlimited && (used >= FREE_PRACTICE_QUESTIONS || used + count > FREE_PRACTICE_QUESTIONS)) {
      setShowEliteModal(true);
      return;
    }
    createPracticeTest();
  };

  const locked = !unlimited && remaining <= 0;
  const chip = (active) => `px-3.5 py-2 rounded-xl border text-[13px] font-bold transition-all flex items-center gap-1.5 ${active ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-700'}`;
  const formatDate = (ts) => (ts?.toDate ? ts.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Just now');

  return (
    <div className="space-y-6">
      {/* Motivational / Access Banner */}
      {unlimited ? (
        <div className="rounded-3xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50 via-teal-50/40 to-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <InfinityIcon size={24} />
            </div>
            <div>
              <p className="font-[900] text-slate-800 text-[16px] flex items-center gap-2">
                <span>Unlimited Practice Unlocked</span>
                <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">👑 Elite Access</span>
              </p>
              <p className="text-[13px] font-semibold text-slate-500 mt-0.5">
                Generate as many customized practice tests as you want across all subjects and topics with instant evaluations and detailed solutions.
              </p>
            </div>
          </div>
        </div>
      ) : locked ? (
        <div className="rounded-3xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-orange-50/40 to-white p-6 sm:p-8 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold">
                <Crown size={14} className="text-amber-600" />
                <span>Unlimited Practice Upgrade</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-[900] text-slate-900 tracking-tight leading-tight">
                Do you want to continue? Enroll in our Elite courses to get unlimited practice tests!
              </h2>
              <p className="text-[14px] text-slate-600 font-medium leading-relaxed">
                Take your GATE preparation to the highest level. Enroll in our Elite package to get unlimited practice tests, full mock exams, live lectures, and study notes.
              </p>
            </div>

            {eliteBundle && (
              <div className="w-full md:w-80 bg-white rounded-2xl border-2 border-amber-200 p-5 shadow-lg flex flex-col justify-between shrink-0">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                      {eliteBundle.department || department || 'GATE Elite'}
                    </span>
                    <span className="text-xs font-bold text-emerald-600">Full Access</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-[15px] leading-snug line-clamp-2">
                    {eliteBundle.name}
                  </h3>
                  <div className="flex items-baseline gap-2 mt-2 mb-3">
                    <span className="text-2xl font-[900] text-slate-900">
                      ₹{eliteBundle.discountedPrice || eliteBundle.price}
                    </span>
                    {eliteBundle.discountedPrice && eliteBundle.discountedPrice !== eliteBundle.price && (
                      <span className="text-xs font-bold text-slate-400 line-through">₹{eliteBundle.price}</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onBuyBundle ? onBuyBundle(eliteBundle.id) : (onUpgrade && onUpgrade())}
                  disabled={payingBundleId === eliteBundle.id}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-60 text-white font-[900] text-[13px] rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Crown size={15} />
                  <span>{payingBundleId === eliteBundle.id ? 'Opening Checkout...' : 'Enroll in Elite Course'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-50/90 via-indigo-50/40 to-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
              <Sparkles size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-[900] text-slate-900 text-lg">Targeted Practice Test Generator</h2>
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 uppercase tracking-wide">Self-Paced</span>
              </div>
              <p className="text-[13px] font-medium text-slate-600 mt-1">
                Pick your subjects and topics, set your question count and duration, and sharpen your GATE problem-solving speed with instant evaluations and detailed solutions.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Builder */}
      {!locked && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-[900] text-slate-900">Create a practice test</h3>
            <p className="text-[13px] font-semibold text-slate-500">Choose subjects and topics from {department || 'your department'}. Questions are picked for you, split evenly over the topics, marks, question types and difficulty.</p>
          </div>

          <div className="space-y-2">
            <label className="text-[13px] font-[800] text-slate-800">1. Subjects</label>
            {subjects.length === 0 ? (
              <p className="text-sm font-semibold text-slate-400">{attributes.length ? 'No subjects are set up for your department yet.' : 'Loading subjects...'}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {subjects.map(s => {
                  const active = selectedSubjects.includes(s.attr.name);
                  return (
                    <button key={s.attr.id} type="button" onClick={() => toggle(selectedSubjects, setSelectedSubjects, s.attr.name)} className={chip(active)}>
                      {active && <Check size={14} />} {s.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {selectedSubjects.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[13px] font-[800] text-slate-800">2. Topics</label>
                {topics.length > 0 && (
                  <button type="button" onClick={() => setSelectedTopics(selectedTopics.length === topics.length ? [] : topics)} className="text-[12px] font-[800] text-blue-600 hover:text-blue-800">
                    {selectedTopics.length === topics.length ? 'Clear all' : 'Select all'}
                  </button>
                )}
              </div>
              {topics.length === 0 ? (
                <p className="text-sm font-semibold text-slate-400">No topics are set up for these subjects yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {topics.map(t => {
                    const active = selectedTopics.includes(t);
                    const n = topicPools[t.toLowerCase()]?.filter(q => selectedSubjects.some(s => sameName(s, q.subject))).length;
                    return (
                      <button key={t} type="button" onClick={() => toggle(selectedTopics, setSelectedTopics, t)} className={chip(active)}>
                        {active && <Check size={14} />} {t}
                        {active && n !== undefined && <span className="text-[11px] font-[800] text-blue-100">({n})</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {selectedTopics.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-[800] text-slate-800">3. Number of questions</label>
                <input
                  type="number" min="1" max={pool.length || undefined}
                  value={questionCount}
                  onChange={e => setCount(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-[14px] font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm"
                />
                <p className="text-[12px] font-semibold text-slate-400">
                  {loadingPool ? 'Checking question bank...' : `${pool.length} questions available for your chosen topics`}
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-[800] text-slate-800">4. Duration (minutes)</label>
                <input
                  type="number" min="1" max="600"
                  value={duration}
                  onChange={e => { setDuration(e.target.value); setDurationTouched(true); }}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-[14px] font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm"
                />
                <p className="text-[12px] font-semibold text-slate-400">Suggested: {MINUTES_PER_QUESTION} minutes per question</p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <span className={`text-[13px] font-bold flex items-center gap-1.5 ${warning ? 'text-amber-600' : 'text-emerald-600'}`}>
              {warning ? <><AlertCircle size={15} /> {warning}</> : <><Check size={15} /> {count} questions · {duration} mins - ready</>}
            </span>
            <button
              onClick={handleStartPractice}
              disabled={!!warning || creating}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-[800] text-sm rounded-2xl flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {creating ? 'Preparing...' : <>Start Practice Test <ArrowRight size={18} /></>}
            </button>
          </div>
        </div>
      )}

      {/* Elite Upsell Modal */}
      {showEliteModal && (
        <div 
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-[200] flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-300"
          onClick={() => setShowEliteModal(false)}
        >
          <div 
            className="bg-[#0b1222] text-slate-100 rounded-[32px] w-full max-w-[560px] shadow-[0_30px_90px_-15px_rgba(0,0,0,0.8)] border border-slate-700/70 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 relative"
            onClick={e => e.stopPropagation()}
          >
            {/* Header Banner with subtle champagne glow */}
            <div className="relative px-6 sm:px-8 pt-8 pb-6 text-center border-b border-slate-800/80 overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-40 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/20 via-orange-500/5 to-transparent pointer-events-none" />
              
              <button 
                type="button"
                onClick={() => setShowEliteModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/70 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700/60 z-10 cursor-pointer"
                aria-label="Close"
              >
                <X size={16} />
              </button>
              
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-amber-400/20 via-amber-500/10 to-transparent border border-amber-400/40 flex items-center justify-center mx-auto mb-3 shadow-[0_0_25px_rgba(245,158,11,0.25)] relative">
                <Crown size={28} className="text-amber-400 fill-amber-400/30 drop-shadow-[0_2px_8px_rgba(245,158,11,0.5)]" />
              </div>

              <div className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-[0.2em] uppercase px-3 py-1 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/25 mb-2.5">
                <Sparkles size={11} className="text-amber-400" />
                <span>Official GATE Elite Pass</span>
              </div>

              <h2 className="text-2xl sm:text-[28px] font-[900] text-white tracking-tight leading-tight">
                Do you want to continue?
              </h2>
              <p className="text-slate-300 text-xs sm:text-[13.5px] font-medium mt-1.5 max-w-md mx-auto leading-relaxed">
                Enroll in our Elite courses to get unlimited practice tests, full mock exams, live lectures, and study notes!
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-7 overflow-y-auto space-y-4 bg-[#080d19]/60">
              {eliteBundle ? (() => {
                const savings = getSavings(eliteBundle.price, eliteBundle.discountedPrice);
                const displayPrice = eliteBundle.discountedPrice || eliteBundle.price;
                return (
                  <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 rounded-2xl border border-amber-400/30 p-5 sm:p-6 space-y-4 shadow-[0_12px_30px_rgba(0,0,0,0.4)] relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500" />

                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <span className="inline-block text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md bg-amber-400/15 text-amber-300 border border-amber-400/30">
                          {eliteBundle.department || department || 'GATE Full Course'}
                        </span>
                        <h3 className="text-lg sm:text-[20px] font-[900] text-white mt-1.5 leading-snug">
                          {eliteBundle.name}
                        </h3>
                        {eliteBundle.tagline && (
                          <p className="text-[11px] text-amber-200/70 font-semibold tracking-wide uppercase mt-0.5">
                            {eliteBundle.tagline}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-2xl sm:text-[28px] font-[900] text-amber-300 tracking-tight leading-none">
                          ₹{formatPrice(displayPrice)}
                        </div>
                        {eliteBundle.discountedPrice && eliteBundle.discountedPrice !== eliteBundle.price && (
                          <div className="flex items-center justify-end gap-1.5 mt-1.5">
                            <span className="text-xs font-bold text-slate-500 line-through">
                              ₹{formatPrice(eliteBundle.price)}
                            </span>
                            {savings && (
                              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                Save ₹{savings.amount}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Highlights Grid with bespoke icons */}
                    <div className="border-t border-slate-800 pt-4 space-y-2.5">
                      <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                        Everything Included in Elite:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-semibold text-slate-200">
                        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-800/40 border border-slate-700/50">
                          <div className="w-7 h-7 rounded-lg bg-amber-400/15 text-amber-400 flex items-center justify-center shrink-0 border border-amber-400/25">
                            <Zap size={14} />
                          </div>
                          <div>
                            <div className="font-bold text-white text-[13px]">Unlimited Practice</div>
                            <div className="text-[10px] text-slate-400">No question limits or caps</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-800/40 border border-slate-700/50">
                          <div className="w-7 h-7 rounded-lg bg-blue-400/15 text-blue-400 flex items-center justify-center shrink-0 border border-blue-400/25">
                            <Award size={14} />
                          </div>
                          <div>
                            <div className="font-bold text-white text-[13px]">Full Mock Series</div>
                            <div className="text-[10px] text-slate-400">All department GATE mocks</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-800/40 border border-slate-700/50">
                          <div className="w-7 h-7 rounded-lg bg-purple-400/15 text-purple-400 flex items-center justify-center shrink-0 border border-purple-400/25">
                            <Video size={14} />
                          </div>
                          <div>
                            <div className="font-bold text-white text-[13px]">Live Classes & Vault</div>
                            <div className="text-[10px] text-slate-400">HD lectures with recordings</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-800/40 border border-slate-700/50">
                          <div className="w-7 h-7 rounded-lg bg-emerald-400/15 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-400/25">
                            <BookOpen size={14} />
                          </div>
                          <div>
                            <div className="font-bold text-white text-[13px]">Complete Study Notes</div>
                            <div className="text-[10px] text-slate-400">Formulas, shortcuts & theory</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Purchase CTA */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (onBuyBundle && eliteBundle) {
                            onBuyBundle(eliteBundle.id);
                          } else if (onUpgrade) {
                            onUpgrade();
                          }
                          setShowEliteModal(false);
                        }}
                        disabled={payingBundleId === eliteBundle.id}
                        className="w-full py-4 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-[900] text-sm sm:text-[15px] rounded-xl shadow-[0_10px_28px_rgba(245,158,11,0.35)] hover:shadow-[0_12px_32px_rgba(245,158,11,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5 disabled:opacity-60"
                      >
                        <Crown size={18} className="fill-slate-950/30" />
                        <span>
                          {payingBundleId === eliteBundle.id 
                            ? 'Opening Checkout...' 
                            : `Enroll in Elite Course • ₹${formatPrice(displayPrice)}`}
                        </span>
                        <ArrowRight size={16} />
                      </button>

                      <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium pt-2">
                        <ShieldCheck size={13} className="text-emerald-400" />
                        <span>Instant access · 100% verified syllabus curriculum</span>
                      </div>
                    </div>
                  </div>
                );
              })() : (
                <div className="text-center py-6 space-y-4">
                  <p className="text-slate-300 font-semibold text-sm">
                    Upgrade to our Elite Membership to get unlimited practice tests, live lectures, study notes, and mock series!
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onUpgrade && onUpgrade();
                      setShowEliteModal(false);
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold rounded-xl shadow-md text-sm"
                  >
                    Explore Course Bundles
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between gap-4 pt-2 text-xs border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    onUpgrade && onUpgrade();
                    setShowEliteModal(false);
                  }}
                  className="text-slate-400 hover:text-amber-400 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>View all course bundles</span>
                  <ChevronRight size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowEliteModal(false)}
                  className="text-slate-500 hover:text-slate-300 font-semibold transition-colors cursor-pointer"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {practiceTests.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-[15px] font-[900] text-slate-800 flex items-center gap-2"><History size={18} className="text-slate-400" /> Your practice tests</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {practiceTests.map(t => {
              const done = t.status === 'completed';
              return (
                <div key={t.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="font-[900] text-slate-900 leading-tight line-clamp-2">{t.title}</h4>
                      <p className="text-[12px] font-semibold text-slate-400 mt-1 truncate">{t.subject}</p>
                    </div>
                    {done && (
                      <span className="shrink-0 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-[900]">
                        {t.score} / {t.totalMarks}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-[12px] font-bold text-slate-500">
                    <span className="flex items-center gap-1"><HelpCircle size={14} className="text-blue-400" /> {t.questions?.length || 0} Qs</span>
                    <span className="flex items-center gap-1"><Clock size={14} className="text-amber-400" /> {t.duration} mins</span>
                    <span className="ml-auto text-slate-400">{formatDate(done ? t.submittedAt : t.createdAt)}</span>
                  </div>
                  {done ? (
                    <button onClick={() => onReview(t)} className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-sm rounded-xl border border-emerald-200 flex items-center justify-center gap-2">
                      Review Results <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button onClick={() => onResume(t)} className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-[800] text-sm rounded-xl flex items-center justify-center gap-2">
                      Resume Test <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
