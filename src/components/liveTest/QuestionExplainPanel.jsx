import React from 'react';
import { Lightbulb, PenLine, CheckCircle2 } from 'lucide-react';
import { normalizeQuestion, correctAnswerText } from '../../utils/testGrading';

// Right-hand column of a question-bank question presented in a live class - identical on the
// teacher's and the students' screens, so what the teacher writes over it on the whiteboard
// overlay lines up for everyone.
//   before reveal: an empty, marked space to work the problem in
//   after reveal:  the correct answer and the question's explanation, with the space below them
export default function QuestionExplainPanel({ question, revealed, isPinned }) {
  const q = normalizeQuestion(question || {});
  const answer = correctAnswerText(q);
  const hasExplanation = !!(q.explanation || q.explanationImageUrl);

  return (
    <div id="qb-explain-panel" className="w-full md:w-[55%] min-w-0 flex flex-col gap-4 min-h-[220px]">
      {revealed && (
        <div className="rounded-2xl border border-green-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border-b border-green-100 text-green-800">
            <CheckCircle2 size={18} className="shrink-0" />
            <span className="text-sm font-black">Answer: {answer || '-'}</span>
          </div>
          {hasExplanation ? (
            <div className={`px-4 py-3 overflow-y-auto pointer-events-auto custom-scrollbar ${isPinned ? 'max-h-[34vh]' : 'max-h-24'}`}>
              <p className="text-[11px] font-black uppercase tracking-wider text-blue-600 mb-1.5 flex items-center gap-1.5">
                <Lightbulb size={13} /> Explanation
              </p>
              {q.explanation && (
                <div className="text-[14px] md:text-[15px] font-medium text-slate-700 leading-relaxed break-words" dangerouslySetInnerHTML={{ __html: q.explanation }} />
              )}
              {q.explanationImageUrl && (
                <img src={q.explanationImageUrl} alt="Explanation" className="mt-2 max-h-40 object-contain rounded-lg border border-slate-200" />
              )}
            </div>
          ) : (
            <p className="px-4 py-3 text-sm font-semibold text-slate-400">No written explanation for this question.</p>
          )}
        </div>
      )}

      {/* Clear space to write on with the whiteboard pen */}
      <div className="flex-1 min-h-[160px] rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/40 relative">
        <span className="absolute top-2 left-3 text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <PenLine size={12} /> {revealed ? 'Explain here' : 'Work it out here'}
        </span>
      </div>
    </div>
  );
}
