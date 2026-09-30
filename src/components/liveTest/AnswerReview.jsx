import React from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { db } from '../../firebase';
import { normalizeQuestion, correctAnswerText } from '../../utils/testGrading';

// The live test / post-class quiz keep a copy of each question from when they started. The review
// shows the answer key and explanation as they are in the Question Bank now, so a corrected answer
// shows up; a question deleted since then falls back to the copy.
export const fetchQuestionBankCopies = async (questions) => {
  const fresh = await Promise.all(questions.map(async (q) => {
    if (!q?.id) return q;
    try {
      const snap = await getDoc(doc(db, 'question_bank', q.id));
      return snap.exists() ? { ...q, ...snap.data(), id: q.id } : q;
    } catch (err) {
      console.error('Failed to load question for review', q.id, err);
      return q;
    }
  }));
  return fresh.map(normalizeQuestion);
};

const OPTIONS = ['A', 'B', 'C', 'D'];

const answerText = (answer) => (Array.isArray(answer) ? answer.join(', ') : String(answer ?? ''));

/**
 * Question-by-question results: the student's answer, the correct answer and the explanation.
 * items: [{ question, answer, isAnswered, isCorrect, badge? }]  - badge is e.g. "+2 marks" / "+873 pts"
 */
export default function AnswerReview({ items, dark = false }) {
  const c = dark
    ? {
      card: 'bg-white/[0.06] border-white/10', text: 'text-white', muted: 'text-white/60', num: 'bg-white/10 text-white',
      opt: 'border-white/10 text-white/80', right: 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100',
      wrong: 'border-red-400/60 bg-red-500/15 text-red-100', box: 'bg-white/[0.06] border-white/10', expl: 'bg-white/[0.04] border-white/10 text-white/80',
    }
    : {
      card: 'bg-white border-slate-200', text: 'text-slate-800', muted: 'text-slate-500', num: 'bg-slate-100 text-slate-600',
      opt: 'border-slate-200 text-slate-700', right: 'border-green-300 bg-green-50 text-green-800',
      wrong: 'border-red-300 bg-red-50 text-red-800', box: 'bg-slate-50 border-slate-200', expl: 'bg-blue-50/50 border-blue-100 text-slate-700',
    };
  const inherit = dark ? '[&_*]:text-inherit!' : '';

  return (
    <div className="space-y-4">
      {items.map(({ question: q, answer, isAnswered, isCorrect, badge }, i) => {
        const status = !isAnswered ? 'unattempted' : isCorrect ? 'correct' : 'wrong';
        const numerical = q.questionType === 'Fill in Blanks';
        const multi = q.questionType === 'Multiple Choice';
        const isKey = (opt) => (multi ? (q.correctAnswers || []).includes(opt) : q.correctAnswer === opt);
        const picked = (opt) => (Array.isArray(answer) ? answer.includes(opt) : answer === opt);
        return (
          <div key={q.id || i} className={`rounded-2xl border p-5 ${c.card}`}>
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${c.num}`}>Question {i + 1}</span>
              <div className="flex items-center gap-2">
                {badge && <span className={`text-xs font-black ${status === 'correct' ? 'text-emerald-500' : c.muted}`}>{badge}</span>}
                <span className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 ${
                  status === 'correct' ? 'bg-emerald-500 text-white' : status === 'wrong' ? 'bg-red-500 text-white' : dark ? 'bg-white/15 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {status === 'correct' ? <><CheckCircle2 size={13} /> Correct</> : status === 'wrong' ? <><XCircle size={13} /> Incorrect</> : <><MinusCircle size={13} /> Unattempted</>}
                </span>
              </div>
            </div>

            <div className={`font-semibold leading-relaxed mb-3 ${c.text} ${inherit}`} dangerouslySetInnerHTML={{ __html: q.questionText || '' }} />
            {q.questionImageUrl && <img src={q.questionImageUrl} alt="Question" className="max-h-48 object-contain rounded-xl bg-white p-1 mb-3" />}

            {q.questionType === 'Match' && ((q.matchColumn1 || []).some(Boolean) || (q.matchColumn2 || []).some(Boolean)) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                {[['List I', q.matchColumn1, (k) => String.fromCharCode(80 + k)], ['List II', q.matchColumn2, (k) => k + 1]].map(([title, col, label]) => (
                  <div key={title} className={`rounded-xl border p-3 text-sm ${c.box}`}>
                    <p className={`text-xs font-black mb-1.5 ${c.muted}`}>{title}</p>
                    {(col || []).filter(Boolean).map((item, k) => (
                      <div key={k} className={`flex gap-2 py-0.5 ${c.text} ${inherit}`}>
                        <span className="font-bold shrink-0">{label(k)}.</span>
                        <span dangerouslySetInnerHTML={{ __html: item }} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {numerical ? (
              <div className="grid sm:grid-cols-2 gap-2 text-sm">
                <div className={`rounded-xl border px-4 py-2.5 ${!isAnswered ? c.box : isCorrect ? c.right : c.wrong}`}>
                  <span className="font-semibold opacity-80">Your answer: </span>
                  <span className="font-black font-mono">{isAnswered ? answerText(answer) : '(not answered)'}</span>
                </div>
                <div className={`rounded-xl border px-4 py-2.5 ${c.right}`}>
                  <span className="font-semibold opacity-80">Correct answer: </span>
                  <span className="font-black font-mono">{correctAnswerText(q) || '-'}</span>
                </div>
              </div>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 gap-2">
                  {OPTIONS.filter(opt => q[`option${opt}`] || isKey(opt)).map(opt => {
                    const key = isKey(opt);
                    const mine = picked(opt);
                    return (
                      <div key={opt} className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm font-semibold ${key ? c.right : mine ? c.wrong : c.opt}`}>
                        <span className="font-black shrink-0">{opt}.</span>
                        <span className={`min-w-0 break-words flex-1 ${inherit}`} dangerouslySetInnerHTML={{ __html: q[`option${opt}`] || '' }} />
                        {key && <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />}
                        {mine && !key && <XCircle size={16} className="shrink-0 text-red-500" />}
                      </div>
                    );
                  })}
                </div>
                <p className={`mt-2 text-xs font-bold ${c.muted}`}>
                  Your answer: <span className={c.text}>{isAnswered ? answerText(answer) : 'not answered'}</span>
                  <span className="mx-2">|</span>
                  Correct answer: <span className="text-emerald-500">{correctAnswerText(q) || '-'}</span>
                </p>
              </>
            )}

            {(q.explanation || q.explanationImageUrl) && (
              <div className={`mt-3 rounded-xl border p-3.5 text-sm ${c.expl}`}>
                <p className="text-[11px] font-black uppercase tracking-wider mb-1 opacity-70">Explanation</p>
                {q.explanation && <div className={`leading-relaxed ${inherit}`} dangerouslySetInnerHTML={{ __html: q.explanation }} />}
                {q.explanationImageUrl && <img src={q.explanationImageUrl} alt="Explanation" className="mt-2 max-h-40 rounded-lg bg-white p-1" />}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
