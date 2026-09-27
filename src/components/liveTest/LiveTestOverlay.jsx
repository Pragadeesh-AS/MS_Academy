import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../../firebase';
import { doc, setDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { Timer, Trophy, CheckCircle2, XCircle, Clock, ChevronRight, Lock, X } from 'lucide-react';

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

export const buildLeaderboard = (liveTest, participants) =>
  participants
    .filter(p => p.role !== 'teacher')
    .map(p => {
      let score = 0;
      let correct = 0;
      let time = 0;
      liveTest.questions.forEach((q, i) => {
        const a = p.liveAnswers?.[answerKey(liveTest, i)];
        if (isOnTime(liveTest, a) && checkAnswer(q, a.answer)) {
          score += questionMarks(q);
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

  // Teacher's client automatically advances to the next question after 5 seconds of reveal
  useEffect(() => {
    if (isTeacher && phase === 'reveal') {
      const timer = setTimeout(() => {
        if (index + 1 < liveTest.questions.length) {
          updateDoc(sessionRef, {
            'liveTest.currentIndex': index + 1,
            'liveTest.phase': 'question',
            'liveTest.questionStartedAt': serverTimestamp()
          }).catch(console.error);
        } else {
          updateDoc(sessionRef, { 'liveTest.phase': 'finished' }).catch(console.error);
        }
      }, 5000); // 5 seconds reveal time
      return () => clearTimeout(timer);
    }
  }, [isTeacher, phase, index, liveTest.questions.length]);

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

  const wasCorrect = locked && isOnTime(liveTest, myAnswer) && checkAnswer(question, myAnswer.answer);

  const questionBlock = (
    <>
      <div className="text-[15px] md:text-[17px] font-semibold text-slate-900 leading-relaxed" dangerouslySetInnerHTML={{ __html: question.questionText }} />
      {question.questionImageUrl && (
        <img src={question.questionImageUrl} alt="Question" className="mt-3 max-h-56 object-contain rounded-lg" />
      )}
    </>
  );

  // ------------------------------------------------------------------ finished
  if (phase === 'finished') {
    return (
      <div className={isTeacher ? 'fixed top-4 right-4 z-[500] w-[440px] max-w-[95vw] max-h-[90vh] overflow-y-auto' : 'fixed inset-0 z-[500] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4'}>
        <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-xl max-h-[92vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2"><Trophy className="text-yellow-500" /> Live Test Leaderboard</h3>
            {isTeacher && <button onClick={closeTest} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full" title="Close"><X size={18} /></button>}
          </div>
          {!isTeacher && myRank >= 0 && (
            <p className="text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 mb-4">
              You finished #{myRank + 1} with {leaderboard[myRank].score} pts ({leaderboard[myRank].correct}/{liveTest.questions.length} correct)
            </p>
          )}
          <LeaderboardList rows={leaderboard} myId={String(myUid)} />
          {isTeacher && (
            <button onClick={closeTest} className="mt-5 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors">
              Close Live Test & Continue Class
            </button>
          )}
          {!isTeacher && <p className="mt-4 text-xs text-center font-semibold text-slate-400">Waiting for your teacher to continue the class...</p>}
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------- teacher
  if (isTeacher) {
    return (
      <div className="fixed top-4 right-4 z-[500] w-[440px] max-w-[95vw] max-h-[92vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-black uppercase tracking-widest text-white bg-red-500 px-2.5 py-1 rounded-full animate-pulse">Live Test</span>
          <span className="text-sm font-bold text-slate-500">Question {index + 1} / {liveTest.questions.length}</span>
        </div>
        <div className="flex items-center gap-4 mb-4">
          {phase === 'question' ? <CountdownRing remainingMs={remainingMs} totalSeconds={liveTest.secondsPerQuestion} /> : (
            <div className="w-20 h-20 shrink-0 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center"><CheckCircle2 size={34} /></div>
          )}
          <div className="text-sm font-semibold text-slate-600">
            <div className="flex items-center gap-1.5"><Clock size={14} /> {liveTest.secondsPerQuestion}s per question</div>
            <div className="mt-1">Answered: <span className="font-black text-indigo-600">{answeredCount}</span> / {students.length}</div>
            {phase === 'reveal' && <div className="mt-1 text-emerald-600 font-bold">Correct: {correctAnswerText(question)}</div>}
          </div>
        </div>
        <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-xl p-3 mb-4 bg-slate-50">{questionBlock}</div>
        {phase === 'reveal' && (
          <div className="mb-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Leaderboard so far</h4>
            <LeaderboardList rows={leaderboard} myId={null} limit={5} />
          </div>
        )}
        <div className="flex gap-2">
          {phase === 'question' && <button onClick={revealNow} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">Reveal now</button>}
          {phase === 'reveal' && (
            <button onClick={nextQuestion} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5">
              {index + 1 < liveTest.questions.length ? <>Next Question <ChevronRight size={16} /></> : 'Show Final Leaderboard'}
            </button>
          )}
          <button onClick={finishTest} className="py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl transition-colors">End Test</button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------- student
  const revealed = phase === 'reveal';
  const numerical = isNumericalQuestion(question);
  const multi = isMultiQuestion(question);
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
  const isCorrectOpt = (opt) => (multi ? (question.correctAnswers || []).includes(opt) : question.correctAnswer === opt);

  return (
    <div className="fixed inset-0 z-[500] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-3 md:p-6">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-y-auto p-5 md:p-8">
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
            <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Your answer</label>
            <input
              type="text"
              inputMode="decimal"
              disabled={inputsDisabled}
              value={locked ? String(myAnswer.answer) : (draft ?? '')}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type your numerical answer"
              className="w-full px-4 py-3 text-lg font-bold border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
            {revealed && (
              <p className="mt-2 text-sm font-bold text-emerald-600">Correct answer: {correctAnswerText(question)}</p>
            )}
          </div>
        ) : (
          <div className="grid gap-3 mb-5">
            {['A', 'B', 'C', 'D'].map(opt => {
              const text = question[`option${opt}`];
              if (!text) return null;
              let style = 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800';
              if (revealed) {
                if (isCorrectOpt(opt)) style = 'border-emerald-300 bg-emerald-50 text-emerald-800';
                else if (isPicked(opt)) style = 'border-red-200 bg-red-50 text-red-700';
                else style = 'border-slate-100 bg-slate-50 text-slate-400';
              } else if (isPicked(opt)) {
                style = 'border-indigo-400 bg-indigo-50 text-indigo-800';
              }
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={inputsDisabled}
                  onClick={() => toggleOption(opt)}
                  className={`flex items-center gap-3 text-left p-4 rounded-2xl border-2 font-semibold transition-all disabled:cursor-default ${style}`}
                >
                  <span className="w-8 h-8 shrink-0 rounded-lg bg-white/80 border border-current/20 flex items-center justify-center font-black">{opt}</span>
                  <span className="min-w-0 break-words" dangerouslySetInnerHTML={{ __html: text }} />
                </button>
              );
            })}
          </div>
        )}

        {phase === 'question' && (
          locked ? (
            <div className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-50 text-emerald-700 font-bold"><Lock size={16} /> Answer locked - waiting for the timer</div>
          ) : (
            <button
              onClick={() => submitAnswer(draft)}
              disabled={submitting || timeIsUp || draft === null || draft === '' || (Array.isArray(draft) && draft.length === 0)}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-2xl transition-colors"
            >
              Lock Answer
            </button>
          )
        )}

        {revealed && (
          <div className="space-y-4">
            <div className={`flex items-center gap-2 py-3 px-4 rounded-2xl font-bold ${!locked ? 'bg-slate-100 text-slate-500' : wasCorrect ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
              {!locked ? <><Clock size={18} /> You did not answer this question</> : wasCorrect
                ? <><CheckCircle2 size={18} /> Correct! +{questionMarks(question)} {questionMarks(question) === 1 ? 'mark' : 'marks'}</>
                : <><XCircle size={18} /> Incorrect. Correct answer: {correctAnswerText(question)}</>}
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Leaderboard so far</h4>
              <LeaderboardList rows={leaderboard} myId={String(myUid)} limit={5} />
              {myRank >= 5 && <p className="mt-2 text-xs font-bold text-slate-500">Your rank: #{myRank + 1} ({leaderboard[myRank].score} pts)</p>}
            </div>
            <p className="text-xs text-center font-semibold text-slate-400">Waiting for your teacher to continue...</p>
          </div>
        )}
      </div>
    </div>
  );
}
