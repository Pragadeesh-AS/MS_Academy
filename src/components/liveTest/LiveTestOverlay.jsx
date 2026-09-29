import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../../firebase';
import { doc, setDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { Timer, Trophy, CheckCircle2, XCircle, Clock, ChevronRight, Lock, X, Check, Flame, Zap, Eraser } from 'lucide-react';

// ---------------------------------------------------------------------------
// Scoring helpers - answers are always checked against the question-bank record
// that was copied into the session when the test started.
// ---------------------------------------------------------------------------
export const isNumericalQuestion = (q) => /fill in (the )?blanks/i.test(q?.questionType || '');
export const isMultiQuestion = (q) => q?.questionType === 'Multiple Choice';
export const questionMarks = (q) => parseInt(q?.mark) || 1;

export const checkAnswer = (q, answer) => {
  if (!q || answer === undefined || answer === null || answer === '') return false;

  if (isNumericalQuestion(q)) {
    const typed = String(answer).trim();
    if (!typed) return false;
    if (q.fillBlankMode === 'Numeric Range') {
      const value = parseFloat(typed);
      const min = parseFloat(q.fillBlankRangeStart);
      const max = parseFloat(q.fillBlankRangeEnd);
      return !isNaN(value) && !isNaN(min) && !isNaN(max) && value >= min && value <= max;
    }
    const expected = String(q.fillBlankAnswer ?? '').trim();
    if (typed.toLowerCase() === expected.toLowerCase()) return true;
    const a = Number(typed);
    const b = Number(expected);
    return expected !== '' && !isNaN(a) && !isNaN(b) && Math.abs(a - b) < 1e-9;
  }

  if (isMultiQuestion(q)) {
    const correct = (q.correctAnswers || []).slice().sort();
    const given = (Array.isArray(answer) ? answer : []).slice().sort();
    return correct.length > 0 && correct.length === given.length && correct.every((v, i) => v === given[i]);
  }

  return answer === q.correctAnswer;
};

const correctAnswerText = (q) => {
  if (isNumericalQuestion(q)) {
    return q.fillBlankMode === 'Numeric Range'
      ? `${q.fillBlankRangeStart} to ${q.fillBlankRangeEnd}`
      : String(q.fillBlankAnswer ?? '');
  }
  if (isMultiQuestion(q)) return (q.correctAnswers || []).join(', ');
  return q.correctAnswer || '';
};

const answerKey = (liveTest, index) => `${liveTest.testId}_${index}`;

// Late answers (tampered clocks) are ignored; a small grace covers network delay.
const isOnTime = (liveTest, a) => a && a.timeMs <= liveTest.secondsPerQuestion * 1000 + 2500;

// ---------------------------------------------------------------------------
// Wayground-style points and power-ups
// ---------------------------------------------------------------------------
// A correct answer earns 600 points per mark, plus up to 400 per mark for speed (full bonus for
// an instant answer, none at the buzzer). Wrong or missed answers earn nothing.
const BASE_POINTS = 600;
const SPEED_POINTS = 400;

// Each student gets POWER_UPS_PER_STUDENT of these per test; each can be used once, on the
// question that is live when they tap it. Used power-ups are stored on the participant doc as
// livePowerUps[`${testId}_${type}`] = questionIndex.
export const POWER_UPS = {
  double: { label: '2X', hint: 'Double points on this question' },
  fiftyFifty: { label: '50-50', hint: 'Remove half of the wrong options' },
  eraser: { label: 'Eraser', hint: 'Remove one wrong option' },
  jeopardy: { label: 'Double Jeopardy', hint: `Double points if right - lose ${BASE_POINTS} per mark if wrong` },
};
const POWER_UPS_PER_STUDENT = 3;

// Small stable hash, so every screen derives the same power-ups / removed options without storing them
const hashString = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
export const stableShuffle = (items, seed) =>
  items.slice().sort((a, b) => hashString(`${seed}:${a}`) - hashString(`${seed}:${b}`));

export const grantedPowerUps = (liveTest, uid) =>
  stableShuffle(Object.keys(POWER_UPS), `${liveTest.testId}:${uid}`).slice(0, POWER_UPS_PER_STUDENT);

export const powerUpKey = (liveTest, type) => `${liveTest.testId}_${type}`;
// Question index a power-up was used on (undefined while unused)
export const powerUpUsedOn = (p, liveTest, type) => p?.livePowerUps?.[powerUpKey(liveTest, type)];
// Only power-ups the student was actually granted count towards the score
const powerUpActive = (p, liveTest, type, index) =>
  powerUpUsedOn(p, liveTest, type) === index && grantedPowerUps(liveTest, p.id).includes(type);

// Points for one question: { points, base, speed, doubled, jeopardyLoss }
export const questionPoints = (liveTest, q, a, p, index) => {
  const marks = questionMarks(q);
  const jeopardy = powerUpActive(p, liveTest, 'jeopardy', index);
  if (!(isOnTime(liveTest, a) && checkAnswer(q, a.answer))) {
    const loss = jeopardy ? BASE_POINTS * marks : 0;
    return { points: -loss, base: 0, speed: 0, doubled: false, jeopardyLoss: loss };
  }
  const totalMs = liveTest.secondsPerQuestion * 1000;
  const speedFactor = totalMs > 0 ? Math.max(0, 1 - a.timeMs / totalMs) : 0;
  const base = BASE_POINTS * marks;
  const speed = Math.round(SPEED_POINTS * marks * speedFactor);
  const doubled = jeopardy || powerUpActive(p, liveTest, 'double', index);
  return { points: (base + speed) * (doubled ? 2 : 1), base, speed, doubled, jeopardyLoss: 0 };
};

// A question only counts once it is revealed, so the score can't give the answer away early.
const isScored = (liveTest, i) => i < liveTest.currentIndex || (i === liveTest.currentIndex && liveTest.phase !== 'question');

export const buildLeaderboard = (liveTest, participants) =>
  participants
    .filter(p => p.role !== 'teacher')
    .map(p => {
      let score = 0;
      let correct = 0;
      let time = 0;
      liveTest.questions.forEach((q, i) => {
        if (!isScored(liveTest, i)) return;
        const a = p.liveAnswers?.[answerKey(liveTest, i)];
        score += questionPoints(liveTest, q, a, p, i).points;
        if (isOnTime(liveTest, a) && checkAnswer(q, a.answer)) {
          correct += 1;
          time += a.timeMs;
        }
      });
      return { id: p.id, name: p.name || 'Student', score, correct, time };
    })
    .sort((a, b) => b.score - a.score || a.time - b.time);

// ---------------------------------------------------------------------------
// Start / control helpers used by the teacher UI
// ---------------------------------------------------------------------------
export const startLiveTest = async (sessionId, questions, secondsPerQuestion) => {
  // Explanations are not needed live and keep the session document small.
  const slim = questions.map(({ explanation, explanationImageUrl, ...rest }) => rest);
  await updateDoc(doc(db, 'live_sessions', sessionId), {
    activeQuestionState: null,
    liveTest: {
      active: true,
      testId: `lt${Date.now()}`,
      questions: slim,
      secondsPerQuestion,
      currentIndex: 0,
      phase: 'question',
      questionStartedAt: serverTimestamp()
    }
  });
};

// Keeps every device on the same clock so the stopwatch matches on all screens.
const useServerOffset = (sessionId, myUid) => {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    if (!sessionId || myUid === undefined || myUid === null) return undefined;
    const ref = doc(db, 'live_sessions', sessionId, 'participants', String(myUid));
    let unsub = () => {};
    setDoc(ref, { clockProbe: serverTimestamp() }, { merge: true }).catch(console.error);
    unsub = onSnapshot(ref, (snap) => {
      const t = snap.data()?.clockProbe;
      if (t?.toMillis && !snap.metadata.hasPendingWrites) {
        setOffset(t.toMillis() - Date.now());
        unsub();
      }
    });
    return () => unsub();
  }, [sessionId, myUid]);
  return offset;
};

const LeaderboardList = ({ rows, myId, limit = 10 }) => (
  <div className="space-y-2">
    {rows.slice(0, limit).map((r, i) => (
      <div key={r.id} className={`flex items-center justify-between p-3 rounded-xl border ${r.id === myId ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100'}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-slate-200 text-slate-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-white text-slate-500 border border-slate-200'}`}>
            {i + 1}
          </div>
          <span className="font-bold text-slate-700 truncate">{r.name}{r.id === myId ? ' (You)' : ''}</span>
        </div>
        <div className="text-right shrink-0 ml-3">
          <div className="font-black text-indigo-600">{r.score} pts</div>
          <div className="text-[11px] font-semibold text-slate-400">{r.correct} correct - {(r.time / 1000).toFixed(1)}s</div>
        </div>
      </div>
    ))}
    {rows.length === 0 && <p className="text-sm text-slate-400 font-medium">No students have joined the test yet.</p>}
  </div>
);

// --- Student game screen (Wayground style) ---------------------------------
// Each option letter keeps its own colour tile, with a darker "3D" bottom edge.
const TILE_STYLES = {
  A: 'bg-[#2F6DAE] shadow-[0_6px_0_#1E4A78]',
  B: 'bg-[#2C9CA6] shadow-[0_6px_0_#1C6C73]',
  C: 'bg-[#E9A22A] shadow-[0_6px_0_#A87414]',
  D: 'bg-[#D5546D] shadow-[0_6px_0_#963246]',
};
const TILE_COLUMNS = { 1: 'lg:grid-cols-1', 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4' };
// Question/option HTML can carry inline colours from the editor - force it to the game's text colour.
const INHERIT_TEXT = '[&_*]:text-inherit!';

const GameLeaderboard = ({ rows, myId, limit = 5 }) => (
  <div className="space-y-2">
    {rows.slice(0, limit).map((r, i) => (
      <div key={r.id} className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl ${r.id === myId ? 'bg-[#8854F5] ring-2 ring-white/60' : 'bg-white/[0.07]'}`}>
        <div className="flex items-center gap-3 min-w-0">
          <span className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-black ${i === 0 ? 'bg-yellow-400 text-yellow-950' : i === 1 ? 'bg-slate-300 text-slate-800' : i === 2 ? 'bg-orange-400 text-orange-950' : 'bg-white/10 text-white/70'}`}>
            {i + 1}
          </span>
          <span className="font-bold truncate">{r.name}{r.id === myId ? ' (You)' : ''}</span>
        </div>
        <div className="text-right shrink-0">
          <div className="font-black tabular-nums">{r.score} pts</div>
          <div className="text-[11px] font-semibold text-white/50">{r.correct} correct · {(r.time / 1000).toFixed(1)}s</div>
        </div>
      </div>
    ))}
    {rows.length === 0 && <p className="text-sm text-white/50 font-medium">No students have joined the test yet.</p>}
  </div>
);

const CountdownRing = ({ remainingMs, totalSeconds }) => {
  const seconds = Math.ceil(remainingMs / 1000);
  const fraction = totalSeconds > 0 ? Math.min(1, remainingMs / (totalSeconds * 1000)) : 0;
  const urgent = seconds <= 5 || fraction <= 0.2;
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative w-20 h-20 shrink-0">
      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="7" />
        <circle
          cx="40" cy="40" r={radius} fill="none" strokeWidth="7" strokeLinecap="round"
          stroke={urgent ? '#ef4444' : '#4f46e5'}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
        />
      </svg>
      <div className={`absolute inset-0 flex flex-col items-center justify-center font-black tabular-nums ${urgent ? 'text-red-500' : 'text-slate-800'}`}>
        <span className="text-2xl leading-none">{seconds}</span>
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">sec</span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// The overlay itself - one component for both roles.
// ---------------------------------------------------------------------------
export default function LiveTestOverlay({ liveTest, participants, myUid, sessionId, isTeacher }) {
  const offset = useServerOffset(sessionId, myUid);
  const [now, setNow] = useState(Date.now());
  const [draft, setDraft] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const index = liveTest.currentIndex;
  const question = liveTest.questions[index];
  const phase = liveTest.phase;
  const totalMs = liveTest.secondsPerQuestion * 1000;
  const startedAt = liveTest.questionStartedAt?.toMillis ? liveTest.questionStartedAt.toMillis() : null;
  const serverNow = now + offset;
  const elapsed = startedAt ? Math.max(0, serverNow - startedAt) : 0;
  const remainingMs = phase === 'question' ? Math.max(0, totalMs - elapsed) : 0;
  const timeIsUp = phase === 'question' && !!startedAt && remainingMs === 0;

  const me = participants.find(p => p.id === String(myUid));
  const myAnswer = me?.liveAnswers?.[answerKey(liveTest, index)];
  const locked = !!myAnswer;

  // New question -> clear whatever was being typed/selected.
  useEffect(() => {
    setDraft(null);
  }, [index, liveTest.testId]);

  const leaderboard = useMemo(() => buildLeaderboard(liveTest, participants), [liveTest, participants]);
  const students = participants.filter(p => p.role !== 'teacher');
  const answeredCount = students.filter(p => p.liveAnswers?.[answerKey(liveTest, index)]).length;
  const myRank = leaderboard.findIndex(r => r.id === String(myUid));

  const sessionRef = doc(db, 'live_sessions', sessionId);

  // Teacher's client moves the test on to the reveal when the timer runs out.
  useEffect(() => {
    if (isTeacher && timeIsUp) {
      updateDoc(sessionRef, { 'liveTest.phase': 'reveal' }).catch(console.error);
    }
  }, [isTeacher, timeIsUp]);

  const submitAnswer = async (value) => {
    if (locked || submitting || value === null || value === '' || (Array.isArray(value) && value.length === 0)) return;
    setSubmitting(true);
    try {
      const timeMs = Math.min(totalMs, Math.max(0, serverNow - (startedAt || serverNow)));
      await setDoc(
        doc(db, 'live_sessions', sessionId, 'participants', String(myUid)),
        { liveAnswers: { [answerKey(liveTest, index)]: { answer: value, timeMs } } },
        { merge: true }
      );
    } catch (e) {
      console.error('Failed to submit live-test answer', e);
    }
    setSubmitting(false);
  };

  // Whatever the student picked is submitted automatically when time runs out or the phase moves to reveal.
  useEffect(() => {
    if (!isTeacher && (timeIsUp || phase === 'reveal') && !locked) {
      if (draft !== null && draft !== '' && (!Array.isArray(draft) || draft.length > 0)) {
        submitAnswer(draft);
      }
    }
  }, [isTeacher, timeIsUp, phase, locked, draft]);

  const nextQuestion = () => {
    if (index + 1 < liveTest.questions.length) {
      updateDoc(sessionRef, {
        'liveTest.currentIndex': index + 1,
        'liveTest.phase': 'question',
        'liveTest.questionStartedAt': serverTimestamp()
      }).catch(console.error);
    } else {
      updateDoc(sessionRef, { 'liveTest.phase': 'finished' }).catch(console.error);
    }
  };
  const revealNow = () => updateDoc(sessionRef, { 'liveTest.phase': 'reveal' }).catch(console.error);
  const finishTest = () => updateDoc(sessionRef, { 'liveTest.phase': 'finished' }).catch(console.error);
  const closeTest = () => updateDoc(sessionRef, { liveTest: null }).catch(console.error);

  // Teacher's client automatically advances to the next question after 5 seconds of reveal,
  // unless the teacher has already moved on manually in the meantime.
  useEffect(() => {
    if (isTeacher && phase === 'reveal') {
      const timer = setTimeout(nextQuestion, 5000);
      return () => clearTimeout(timer);
    }
  }, [isTeacher, phase, index]);

  const wasCorrect = locked && isOnTime(liveTest, myAnswer) && checkAnswer(question, myAnswer.answer);
  const revealed = phase === 'reveal';
  const numerical = isNumericalQuestion(question);
  const multi = isMultiQuestion(question);
  const isCorrectOpt = (opt) => (multi ? (question.correctAnswers || []).includes(opt) : question.correctAnswer === opt);

  // Student screen extras - display only, the leaderboard scoring above is unchanged.
  // Streak = run of consecutive on-time correct answers up to the last revealed question.
  const streakUpTo = revealed || phase === 'finished' ? index : index - 1;
  let myStreak = 0;
  for (let i = 0; i <= streakUpTo; i++) {
    const a = me?.liveAnswers?.[answerKey(liveTest, i)];
    myStreak = isOnTime(liveTest, a) && checkAnswer(liveTest.questions[i], a.answer) ? myStreak + 1 : 0;
  }
  const mine = myRank >= 0 ? leaderboard[myRank] : null;

  const questionBlock = (
    <>
      <div className="text-[15px] md:text-[17px] font-semibold text-slate-900 leading-relaxed" dangerouslySetInnerHTML={{ __html: question.questionText }} />
      {question.questionImageUrl && (
        <img src={question.questionImageUrl} alt="Question" className="mt-3 max-h-56 object-contain rounded-lg" />
      )}
    </>
  );

  // ---------------------------------------------------------- finished (student)
  if (phase === 'finished' && !isTeacher) {
    const total = liveTest.questions.length;
    const accuracy = mine && total ? Math.round((mine.correct / total) * 100) : 0;
    return (
      <div className="fixed inset-0 z-[500] overflow-y-auto bg-[#1C0B2B] text-white">
        <div className="w-full max-w-xl mx-auto px-4 py-8 md:py-12">
          <div className="text-center mb-6">
            <Trophy size={48} className="mx-auto text-yellow-400 mb-3" />
            <h3 className="text-2xl md:text-3xl font-black">Quiz complete!</h3>
            {mine && <p className="mt-1 text-white/60 font-semibold">You finished #{myRank + 1} of {leaderboard.length}</p>}
          </div>
          {mine && (
            <>
              <div className="grid grid-cols-3 gap-3">
                {[['Rank', `#${myRank + 1}`], ['Score', `${mine.score} pts`], ['Accuracy', `${accuracy}%`]].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-white/[0.07] p-4 text-center">
                    <div className="text-xl md:text-2xl font-black tabular-nums">{value}</div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-white/50 mt-1">{label}</div>
                  </div>
                ))}
              </div>
              <p className="mt-3 mb-6 text-center text-sm font-semibold text-white/60">{mine.correct}/{total} correct</p>
            </>
          )}
          <h4 className="text-xs font-black uppercase tracking-wider text-white/50 mb-3">Leaderboard</h4>
          <GameLeaderboard rows={leaderboard} myId={String(myUid)} limit={10} />
          <p className="mt-6 text-xs text-center font-semibold text-white/40">Waiting for your teacher to continue the class...</p>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------ finished (teacher)
  if (phase === 'finished') {
    return (
      <div className="fixed inset-0 z-[500] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-xl max-h-[92vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2"><Trophy className="text-yellow-500" /> Live Test Leaderboard</h3>
            {isTeacher && <button onClick={closeTest} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full" title="Close"><X size={18} /></button>}
          </div>
          <LeaderboardList rows={leaderboard} myId={String(myUid)} />
          <button onClick={closeTest} className="mt-5 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors">
            Close Live Test & Continue Class
          </button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------- teacher
  if (isTeacher) {
    return (
      <div className="fixed inset-0 z-[500] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-3 md:p-6">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto p-5 md:p-8 grid md:grid-cols-[1fr_260px] gap-6">
          <div>
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <span className="text-[11px] font-black uppercase tracking-widest text-white bg-red-500 px-2.5 py-1 rounded-full animate-pulse">Live Test</span>
                <p className="mt-2 text-sm font-bold text-slate-500">
                  Question {index + 1} / {liveTest.questions.length} - {questionMarks(question)} {questionMarks(question) === 1 ? 'mark' : 'marks'}
                  {numerical ? ' - Numerical' : multi ? ' - Select all that apply' : ''}
                </p>
              </div>
              {phase === 'question' ? (
                <CountdownRing remainingMs={remainingMs} totalSeconds={liveTest.secondsPerQuestion} />
              ) : (
                <div className="flex items-center gap-1.5 text-sm font-bold text-slate-400"><Timer size={16} /> Time&apos;s up</div>
              )}
            </div>

            <div className="mb-5">{questionBlock}</div>

            {numerical ? (
              <div className="mb-5">
                {revealed && (
                  <p className="text-sm font-bold text-emerald-600">Correct answer: {correctAnswerText(question)}</p>
                )}
              </div>
            ) : (
              <div className="grid gap-3 mb-5">
                {['A', 'B', 'C', 'D'].map(opt => {
                  const text = question[`option${opt}`];
                  if (!text && !(revealed && isCorrectOpt(opt))) return null;
                  const style = revealed && isCorrectOpt(opt)
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-800';
                  return (
                    <div key={opt} className={`flex items-center gap-3 p-4 rounded-2xl border-2 font-semibold ${style}`}>
                      <span className="w-8 h-8 shrink-0 rounded-lg bg-white/80 border border-current/20 flex items-center justify-center font-black">{opt}</span>
                      <span className="min-w-0 break-words" dangerouslySetInnerHTML={{ __html: text }} />
                      {revealed && isCorrectOpt(opt) && <CheckCircle2 size={20} className="ml-auto text-emerald-500 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2">
              {phase === 'question' && (
                <>
                  <button onClick={revealNow} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">Reveal now</button>
                  <button onClick={nextQuestion} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5">
                    {index + 1 < liveTest.questions.length ? <>Skip <ChevronRight size={16} /></> : 'End & Show Leaderboard'}
                  </button>
                </>
              )}
              {phase === 'reveal' && (
                <button onClick={nextQuestion} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5">
                  {index + 1 < liveTest.questions.length ? <>Next Question <ChevronRight size={16} /></> : 'Show Final Leaderboard'}
                </button>
              )}
              <button onClick={finishTest} className="py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl transition-colors">End Test</button>
            </div>
          </div>

          <div className="border-t md:border-t-0 md:border-l border-slate-100 pt-5 md:pt-0 md:pl-6 flex flex-col">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
              Answered <span className="text-indigo-600">{answeredCount}</span> / {students.length}
            </h4>
            <div className="space-y-2 overflow-y-auto max-h-[40vh] md:max-h-none md:flex-1">
              {students.map(s => {
                const answered = !!s.liveAnswers?.[answerKey(liveTest, index)];
                return (
                  <div key={s.id} className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-sm font-semibold ${answered ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                    <span className="truncate">{s.name || 'Student'}</span>
                    {answered ? <CheckCircle2 size={16} className="shrink-0" /> : <Clock size={16} className="shrink-0" />}
                  </div>
                );
              })}
              {students.length === 0 && <p className="text-sm text-slate-400 font-medium">No students in this session yet.</p>}
            </div>
            {phase === 'reveal' && (
              <div className="mt-5">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Leaderboard so far</h4>
                <LeaderboardList rows={leaderboard} myId={null} limit={5} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------- student
  const inputsDisabled = locked || timeIsUp || revealed;

  const toggleOption = (opt) => {
    if (inputsDisabled) return;
    if (multi) {
      const current = Array.isArray(draft) ? draft : [];
      setDraft(current.includes(opt) ? current.filter(x => x !== opt) : [...current, opt]);
    } else {
      setDraft(opt);
    }
  };
  const shownAnswer = locked ? myAnswer.answer : draft;
  const isPicked = (opt) => (Array.isArray(shownAnswer) ? shownAnswer.includes(opt) : shownAnswer === opt);

  const fraction = totalMs > 0 ? Math.min(1, remainingMs / totalMs) : 0;
  const secondsLeft = Math.ceil(remainingMs / 1000);
  const urgent = phase === 'question' && (secondsLeft <= 5 || fraction <= 0.2);
  const hasDraft = draft !== null && draft !== '' && (!Array.isArray(draft) || draft.length > 0);
  const visibleOptions = ['A', 'B', 'C', 'D'].filter(opt => question[`option${opt}`]);

  // --- Power-ups
  const myId = String(myUid);
  const myPowerUps = grantedPowerUps(liveTest, myId);
  const usedOn = (type) => powerUpUsedOn(me, liveTest, type);
  const activeHere = (type) => usedOn(type) === index;
  const wrongOptions = numerical ? [] : visibleOptions.filter(opt => !isCorrectOpt(opt));
  // Wrong options knocked out by 50-50 / Eraser on this question, in a fixed per-student order
  const removedOptions = (extraType = null) => {
    const on = (type) => type === extraType || activeHere(type);
    const count = (on('fiftyFifty') ? Math.ceil(wrongOptions.length / 2) : 0) + (on('eraser') ? 1 : 0);
    return stableShuffle(wrongOptions, `${liveTest.testId}:${myId}:${index}`).slice(0, count);
  };
  const removed = removedOptions();
  const canUsePowerUp = (type) => {
    if (usedOn(type) !== undefined || phase !== 'question' || inputsDisabled) return false;
    if (type === 'fiftyFifty' || type === 'eraser') return wrongOptions.length > removed.length;
    // 2X and Double Jeopardy don't stack on the same question
    return !activeHere(type === 'double' ? 'jeopardy' : 'double');
  };
  const activatePowerUp = async (type) => {
    if (!canUsePowerUp(type)) return;
    if (type === 'fiftyFifty' || type === 'eraser') {
      const gone = removedOptions(type);
      setDraft(prev => (Array.isArray(prev) ? prev.filter(o => !gone.includes(o)) : gone.includes(prev) ? null : prev));
    }
    try {
      await setDoc(
        doc(db, 'live_sessions', sessionId, 'participants', myId),
        { livePowerUps: { [powerUpKey(liveTest, type)]: index } },
        { merge: true }
      );
    } catch (e) {
      console.error('Failed to use power-up', e);
    }
  };
  const activePowerUps = myPowerUps.filter(activeHere);
  const myPoints = questionPoints(liveTest, question, myAnswer, me || { id: myId }, index);

  const tileState = (opt) => {
    if (removed.includes(opt)) return 'opacity-15 grayscale';
    if (revealed) {
      if (isCorrectOpt(opt)) return 'ring-4 ring-emerald-400';
      if (isPicked(opt)) return 'ring-4 ring-red-500';
      return 'opacity-25';
    }
    if (locked) return isPicked(opt) ? 'ring-4 ring-white' : 'opacity-35';
    if (isPicked(opt)) return 'ring-4 ring-white -translate-y-1';
    return 'hover:-translate-y-1 hover:brightness-110';
  };

  return (
    <div className="fixed inset-0 z-[500] flex flex-col overflow-y-auto bg-[#1C0B2B] text-white">
      {/* Timer bar - drains left to right like Wayground's */}
      <div className="h-2 w-full shrink-0 bg-white/10">
        <div
          className={`h-full transition-[width] duration-300 ease-linear ${urgent ? 'bg-red-500' : 'bg-[#A78BFA]'}`}
          style={{ width: `${phase === 'question' ? fraction * 100 : 0}%` }}
        />
      </div>

      {/* Top bar: question counter, timer, streak, rank and score */}
      <div className="flex items-center justify-between gap-2 px-3 md:px-6 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-white/10 text-sm font-black tabular-nums">{index + 1}/{liveTest.questions.length}</span>
          <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full bg-red-500 text-[10px] font-black uppercase tracking-widest animate-pulse">Live</span>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-black tabular-nums ${urgent ? 'bg-red-500 text-white' : 'bg-white/10'}`}>
          <Timer size={15} /> {phase === 'question' ? `${secondsLeft}s` : "Time's up"}
        </div>
        <div className="flex items-center gap-2">
          {myStreak >= 2 && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-500/20 text-orange-300 text-sm font-black" title="Correct answers in a row">
              <Flame size={15} /> {myStreak}
            </span>
          )}
          {mine && <span className="hidden sm:inline-flex px-2.5 py-1.5 rounded-lg bg-white/10 text-sm font-black">#{myRank + 1}</span>}
          <span className="px-3 py-1.5 rounded-lg bg-white text-[#1C0B2B] text-sm font-black tabular-nums">{mine ? mine.score : 0} pts</span>
        </div>
      </div>

      <div className="flex-1 w-full max-w-5xl mx-auto px-3 md:px-6 pb-6 flex flex-col gap-4">
        {/* Feedback banner after the reveal */}
        {revealed && (
          <div className={`rounded-2xl px-5 py-4 text-center shadow-[0_6px_0_rgba(0,0,0,0.25)] ${!locked ? 'bg-white/15' : wasCorrect ? 'bg-emerald-500' : 'bg-red-500'}`}>
            <div className="text-2xl md:text-3xl font-black flex items-center justify-center gap-2">
              {!locked ? <><Clock size={26} /> Time&apos;s up</> : wasCorrect ? <><CheckCircle2 size={28} /> Correct!</> : <><XCircle size={28} /> Incorrect</>}
            </div>
            {wasCorrect ? (
              <>
                <p className="mt-1 text-3xl md:text-4xl font-black tabular-nums">+{myPoints.points} pts</p>
                <p className="mt-1 text-xs md:text-sm font-bold text-white/85">
                  {myPoints.base} base + {myPoints.speed} speed bonus{myPoints.doubled ? ' · doubled' : ''}{myStreak >= 2 ? ` · ${myStreak} in a row!` : ''}
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm md:text-base font-bold text-white/90">
                {!locked ? "You didn't answer this question" : `Correct answer: ${correctAnswerText(question)}`}
                {myPoints.jeopardyLoss > 0 && <span className="block mt-1 text-lg font-black">Double Jeopardy: -{myPoints.jeopardyLoss} pts</span>}
              </p>
            )}
          </div>
        )}

        {/* Question card */}
        <div className="rounded-2xl bg-white/[0.07] border border-white/10 px-5 py-6 md:px-8 md:py-10 flex flex-col items-center justify-center text-center">
          <p className="text-[11px] font-black uppercase tracking-widest text-white/50 mb-3">
            {questionMarks(question)} {questionMarks(question) === 1 ? 'mark' : 'marks'}
            {numerical ? ' · Numerical' : multi ? ' · Select all that apply' : ''}
          </p>
          <div className={`text-lg md:text-2xl font-bold leading-snug break-words max-w-full ${INHERIT_TEXT}`} dangerouslySetInnerHTML={{ __html: question.questionText }} />
          {question.questionImageUrl && (
            <img src={question.questionImageUrl} alt="Question" className="mt-4 max-h-56 object-contain rounded-xl bg-white p-1" />
          )}
        </div>

        {/* Answers */}
        {numerical ? (
          <div className="w-full max-w-xl mx-auto">
            <input
              type="text"
              inputMode="decimal"
              disabled={inputsDisabled}
              value={locked ? String(myAnswer.answer) : (draft ?? '')}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type your answer"
              className="w-full px-5 py-5 text-2xl md:text-3xl font-black text-center rounded-2xl bg-white text-[#1C0B2B] placeholder:text-slate-300 border-4 border-transparent focus:border-[#A78BFA] outline-none disabled:opacity-80 shadow-[0_6px_0_rgba(0,0,0,0.25)]"
            />
          </div>
        ) : (
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${TILE_COLUMNS[visibleOptions.length] || 'lg:grid-cols-4'} gap-3 md:gap-4`}>
            {visibleOptions.map(opt => (
              <button
                key={opt}
                type="button"
                disabled={inputsDisabled || removed.includes(opt)}
                onClick={() => toggleOption(opt)}
                className={`relative flex items-center justify-center text-center min-h-[88px] sm:min-h-[140px] lg:min-h-[200px] px-4 pt-10 pb-5 rounded-2xl text-base md:text-lg font-bold text-white transition-all duration-200 disabled:cursor-default ${TILE_STYLES[opt]} ${tileState(opt)}`}
              >
                <span className="absolute top-2.5 left-2.5 w-7 h-7 rounded-lg bg-black/20 flex items-center justify-center text-sm font-black">{opt}</span>
                {multi && !revealed && (
                  <span className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-md border-2 border-white flex items-center justify-center ${isPicked(opt) ? 'bg-white text-[#1C0B2B]' : ''}`}>
                    {isPicked(opt) && <Check size={16} strokeWidth={4} />}
                  </span>
                )}
                {revealed && isCorrectOpt(opt) && (
                  <span className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-emerald-500 ring-2 ring-white flex items-center justify-center"><Check size={16} strokeWidth={4} /></span>
                )}
                {revealed && isPicked(opt) && !isCorrectOpt(opt) && (
                  <span className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-red-600 ring-2 ring-white flex items-center justify-center"><X size={16} strokeWidth={4} /></span>
                )}
                <span className={`min-w-0 break-words drop-shadow-sm ${INHERIT_TEXT}`} dangerouslySetInnerHTML={{ __html: question[`option${opt}`] }} />
              </button>
            ))}
          </div>
        )}

        {/* Submit / waiting */}
        {phase === 'question' && (
          locked ? (
            <div className="self-center flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/10 font-bold"><Lock size={16} /> Answer submitted · waiting for the timer</div>
          ) : (
            <button
              onClick={() => submitAnswer(draft)}
              disabled={submitting || timeIsUp || !hasDraft}
              className="self-center w-full sm:w-auto sm:min-w-[280px] px-10 py-4 rounded-2xl bg-[#8854F5] hover:bg-[#7a45ec] shadow-[0_6px_0_#5B30B8] active:translate-y-1 active:shadow-[0_2px_0_#5B30B8] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:translate-y-0 text-lg font-black transition-all"
            >
              {hasDraft ? 'Submit' : multi ? 'Select all that apply' : numerical ? 'Type your answer' : 'Pick an answer'}
            </button>
          )
        )}

        {/* Power-ups - each one disappears once used, like Wayground's */}
        {phase === 'question' && (myPowerUps.some(t => usedOn(t) === undefined) || activePowerUps.length > 0) && (
          <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
            {activePowerUps.map(type => (
              <span key={`on-${type}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-400 text-yellow-950 text-xs font-black">
                <Zap size={13} /> {POWER_UPS[type].label} active
              </span>
            ))}
            {myPowerUps.filter(t => usedOn(t) === undefined).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => activatePowerUp(type)}
                disabled={!canUsePowerUp(type)}
                title={POWER_UPS[type].hint}
                className="flex items-center gap-2 pl-2 pr-4 py-2 rounded-full bg-gradient-to-b from-[#9B6BFF] to-[#6D3FE0] shadow-[0_4px_0_#4B2A9E] active:translate-y-0.5 active:shadow-[0_2px_0_#4B2A9E] disabled:opacity-35 disabled:cursor-not-allowed disabled:active:translate-y-0 transition-all"
              >
                <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  {type === 'eraser' ? <Eraser size={16} /> : type === 'jeopardy' ? <Zap size={16} /> : <span className="text-[11px] font-black">{type === 'double' ? '2X' : '½'}</span>}
                </span>
                <span className="text-left leading-tight">
                  <span className="block text-sm font-black">{POWER_UPS[type].label}</span>
                  <span className="hidden sm:block text-[10.5px] font-semibold text-white/75">{POWER_UPS[type].hint}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Leaderboard after each question */}
        {revealed && (
          <div className="w-full max-w-xl mx-auto mt-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-white/50 mb-2">Leaderboard</h4>
            <GameLeaderboard rows={leaderboard} myId={String(myUid)} limit={5} />
            {myRank >= 5 && <p className="mt-2 text-xs font-bold text-white/60">Your rank: #{myRank + 1} ({leaderboard[myRank].score} pts)</p>}
            <p className="mt-4 text-xs text-center font-semibold text-white/40">Waiting for your teacher to continue...</p>
          </div>
        )}
      </div>
    </div>
  );
}
