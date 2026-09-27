import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { addDoc, collection, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { BarChart3, Plus, Trash2, X, Clock, CheckCircle2 } from 'lucide-react';

// Polls live in the existing `live_chats` collection:
//   poll message : { type: 'poll', question, options[], durationSeconds, timestamp, closedAt? }
//   vote         : { type: 'poll_vote', pollId, voterKey, optionIndex, timestamp }
// Both are plain creates, the same kind of write the chat already does.

export const voterKeyFor = () =>
  (sessionStorage.getItem('auth_email') || sessionStorage.getItem('auth_name') || 'student').replace(/[^a-zA-Z0-9]/g, '_');

const DURATIONS = [
  { label: '30 seconds', value: 30 },
  { label: '1 minute', value: 60 },
  { label: '2 minutes', value: 120 },
  { label: '3 minutes', value: 180 },
  { label: '5 minutes', value: 300 },
  { label: '10 minutes', value: 600 },
  { label: '15 minutes', value: 900 }
];

const pollEndMs = (poll) => {
  const start = poll.timestamp?.toMillis ? poll.timestamp.toMillis() : null;
  if (start === null) return null; // still being written
  let end = start + (poll.durationSeconds || 60) * 1000;
  if (poll.closedAt?.toMillis) end = Math.min(end, poll.closedAt.toMillis());
  return end;
};

// Votes are judged on their server timestamps, so a slow or wrong device clock cannot vote late.
const tallyVotes = (poll, votes) => {
  const end = pollEndMs(poll);
  const seen = new Set();
  const counts = poll.options.map(() => 0);
  votes
    .filter(v => v.pollId === poll.id)
    .sort((a, b) => (a.timestamp?.toMillis?.() ?? Infinity) - (b.timestamp?.toMillis?.() ?? Infinity))
    .forEach(v => {
      const t = v.timestamp?.toMillis ? v.timestamp.toMillis() : null;
      if (end !== null && t !== null && t > end + 1500) return;
      if (seen.has(v.voterKey)) return;
      if (v.optionIndex < 0 || v.optionIndex >= counts.length) return;
      seen.add(v.voterKey);
      counts[v.optionIndex] += 1;
    });
  return counts;
};

const formatRemaining = (ms) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

export function PollCard({ poll, votes, isTeacher, sessionId }) {
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const end = pollEndMs(poll);
  const isOpen = end === null || now < end;
  const remaining = end === null ? (poll.durationSeconds || 60) * 1000 : end - now;
  const counts = tallyVotes(poll, votes);
  const totalVotes = counts.reduce((a, b) => a + b, 0);
  const myKey = voterKeyFor();
  const myVote = votes.find(v => v.pollId === poll.id && v.voterKey === myKey);
  const showResults = isTeacher || !isOpen || !!myVote;

  const vote = async (index) => {
    if (!isOpen || myVote || busy || isTeacher) return;
    setBusy(true);
    try {
      await setDoc(doc(db, 'live_chats', `${poll.id}_${myKey}`), {
        sessionId,
        type: 'poll_vote',
        pollId: poll.id,
        voterKey: myKey,
        voterName: sessionStorage.getItem('auth_name') || 'Student',
        optionIndex: index,
        timestamp: serverTimestamp()
      });
    } catch (e) {
      console.error('Failed to record vote', e);
    }
    setBusy(false);
  };

  const closePoll = () => updateDoc(doc(db, 'live_chats', poll.id), { closedAt: serverTimestamp() }).catch(console.error);

  return (
    <div className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-slate-200">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-indigo-300"><BarChart3 size={13} /> Poll</span>
        <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${isOpen ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>
          <Clock size={11} /> {isOpen ? `Closes in ${formatRemaining(remaining)}` : 'Poll closed'}
        </span>
      </div>
      <p className="text-sm font-bold text-white mb-3 break-words">{poll.question}</p>

      <div className="space-y-2">
        {poll.options.map((opt, i) => {
          const pct = totalVotes > 0 ? Math.round((counts[i] / totalVotes) * 100) : 0;
          const mine = myVote?.optionIndex === i;
          if (!showResults) {
            return (
              <button
                key={i}
                type="button"
                onClick={() => vote(i)}
                disabled={busy}
                className="w-full text-left px-3 py-2.5 rounded-xl border border-slate-600 bg-slate-900/50 hover:border-indigo-400 hover:bg-slate-900 text-sm font-semibold transition-colors"
              >
                {opt}
              </button>
            );
          }
          return (
            <div key={i} className={`relative overflow-hidden rounded-xl border ${mine ? 'border-indigo-400' : 'border-slate-700'} bg-slate-900/50`}>
              <div className="absolute inset-y-0 left-0 bg-indigo-500/30" style={{ width: `${pct}%` }} />
              <div className="relative flex items-center justify-between gap-2 px-3 py-2 text-sm font-semibold">
                <span className="flex items-center gap-1.5 min-w-0 break-words">{mine && <CheckCircle2 size={14} className="text-indigo-300 shrink-0" />}{opt}</span>
                <span className="text-xs font-bold text-slate-300 shrink-0">{pct}% ({counts[i]})</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-3 text-[11px] font-semibold text-slate-400">
        <span>{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</span>
        {isTeacher && isOpen && (
          <button onClick={closePoll} className="text-red-300 hover:text-red-200 font-bold">End poll now</button>
        )}
        {!isTeacher && myVote && isOpen && <span className="text-emerald-300">Vote recorded</span>}
      </div>
    </div>
  );
}

export function PollComposer({ sessionId, onClose }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [duration, setDuration] = useState(60);
  const [posting, setPosting] = useState(false);

  const cleanOptions = options.map(o => o.trim()).filter(Boolean);
  const canPost = question.trim() && cleanOptions.length >= 2 && !posting;

  const post = async () => {
    if (!canPost) return;
    setPosting(true);
    try {
      await addDoc(collection(db, 'live_chats'), {
        sessionId,
        type: 'poll',
        senderName: sessionStorage.getItem('auth_name') || 'Teacher',
        senderEmail: sessionStorage.getItem('auth_email') || '',
        question: question.trim(),
        options: cleanOptions,
        durationSeconds: duration,
        timestamp: serverTimestamp()
      });
      onClose();
    } catch (e) {
      console.error('Failed to post poll', e);
      alert('Could not post the poll. Please try again.');
    }
    setPosting(false);
  };

  return (
    <div className="p-3 border-t border-slate-800 bg-slate-900">
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-indigo-300"><BarChart3 size={14} /> New Poll</span>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800"><X size={15} /></button>
      </div>
      <input
        type="text"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask a question..."
        className="w-full mb-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-400"
      />
      <div className="space-y-1.5 mb-2 max-h-40 overflow-y-auto">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input
              type="text"
              value={opt}
              onChange={(e) => setOptions(options.map((o, j) => (j === i ? e.target.value : o)))}
              placeholder={`Option ${i + 1}`}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-400"
            />
            {options.length > 2 && (
              <button type="button" onClick={() => setOptions(options.filter((_, j) => j !== i))} className="text-slate-500 hover:text-red-300 p-1"><Trash2 size={14} /></button>
            )}
          </div>
        ))}
      </div>
      {options.length < 6 && (
        <button type="button" onClick={() => setOptions([...options, ''])} className="flex items-center gap-1 text-xs font-bold text-indigo-300 hover:text-indigo-200 mb-3"><Plus size={13} /> Add option</button>
      )}
      <div className="flex items-center gap-2">
        <select
          value={duration}
          onChange={(e) => setDuration(parseInt(e.target.value))}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-sm text-white outline-none"
          title="The poll closes automatically after this time"
        >
          {DURATIONS.map(d => <option key={d.value} value={d.value}>Closes after {d.label}</option>)}
        </select>
        <button
          type="button"
          onClick={post}
          disabled={!canPost}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-bold rounded-lg transition-colors"
        >
          Post Poll
        </button>
      </div>
    </div>
  );
}
