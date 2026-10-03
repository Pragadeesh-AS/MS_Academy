import React from 'react';
import { CheckCircle2, Lightbulb, Lock, X } from 'lucide-react';
import { normalizeQuestion, correctAnswerText } from '../../utils/testGrading';

// The answer + explanation for the teacher only, while presenting a question-bank question.
// It floats over the teacher's screen and is never written to the class session, so students
// don't get it - and it sits outside the question panel the recording captures, so it isn't
// recorded either. It also doesn't move anything on the slide, so whiteboard writing still lines
// up with what students see.
// `floating`: pinned to the browser window (used when the question isn't the main screen) instead
// of the top-right corner of the question slide.
export default function TeacherSolutionCard({ question, onClose, floating = false }) {
  const q = normalizeQuestion(question || {});
  const answer = correctAnswerText(q);
  const hasExplanation = !!(q.explanation || q.explanationImageUrl);

  return (
    <div className={`${floating ? 'fixed top-20 right-4 md:right-6 z-[9999] w-[min(420px,calc(100vw-2rem))] max-h-[65vh]' : 'absolute top-16 right-4 md:right-6 w-[min(420px,calc(100%-2rem))] max-h-[60%]'} flex flex-col rounded-2xl bg-white border-2 border-amber-300 shadow-2xl pointer-events-auto overflow-hidden text-left`}>
      <div className="flex items-center justify-between gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200">
        <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-700">
          <Lock size={13} /> Only you can see this
        </span>
        <button onClick={onClose} className="p-1 rounded-lg text-amber-700 hover:bg-amber-100" title="Hide solution">
          <X size={16} />
        </button>
      </div>
      <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border-b border-green-100 text-green-800">
        <CheckCircle2 size={18} className="shrink-0" />
        <span className="text-sm font-black break-words">Answer: {answer || '-'}</span>
      </div>
      <div className="px-4 py-3 overflow-y-auto custom-scrollbar">
        {hasExplanation ? (
          <>
            <p className="text-[11px] font-black uppercase tracking-wider text-blue-600 mb-1.5 flex items-center gap-1.5">
              <Lightbulb size={13} /> Explanation
            </p>
            {q.explanation && (
              <div className="text-[14px] font-medium text-slate-700 leading-relaxed break-words" dangerouslySetInnerHTML={{ __html: q.explanation }} />
            )}
            {q.explanationImageUrl && (
              <img src={q.explanationImageUrl} alt="Explanation" className="mt-2 max-h-48 object-contain rounded-lg border border-slate-200" />
            )}
          </>
        ) : (
          <p className="text-sm font-semibold text-slate-400">No written explanation for this question.</p>
        )}
      </div>
      <p className="px-4 py-1.5 text-[10.5px] font-semibold text-slate-400 border-t border-slate-100">
        Hidden from students and the class recording. If you're sharing your screen, they will see it.
      </p>
    </div>
  );
}
