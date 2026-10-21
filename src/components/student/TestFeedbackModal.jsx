import React, { useState, useEffect } from 'react';
import { Star, Send, MessageSquareHeart, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';

const RATING_LABELS = {
  1: { label: 'Very Difficult / Needs Improvement', color: 'text-red-500', bg: 'bg-red-50 border-red-200' },
  2: { label: 'Difficult / Could Be Better', color: 'text-orange-500', bg: 'bg-orange-50 border-orange-200' },
  3: { label: 'Moderate / Balanced Standard', color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200' },
  4: { label: 'Good / High Quality Test', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  5: { label: 'Excellent / True GATE Exam Level', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' }
};

const QUICK_TAGS = [
  '🎯 GATE Standard',
  '⏱️ Time was Sufficient',
  '🔥 Challenging Questions',
  '📚 Great Concept Coverage',
  '💡 Clear & Error-Free',
  '⏳ Needed More Time'
];

export default function TestFeedbackModal({ feedbackData, onSuccess }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Lock down background scroll while feedback is pending
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Prevent escape key dismissal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  const handleTagClick = (tag) => {
    setFeedbackText(prev => {
      const trimmed = prev.trim();
      if (!trimmed) return tag;
      if (trimmed.includes(tag)) return trimmed;
      return `${trimmed} • ${tag}`;
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating || rating < 1) {
      setError('Please select a star rating from 1 to 5.');
      return;
    }
    if (!feedbackText.trim() || feedbackText.trim().length < 5) {
      setError('Please share a few words (at least 5 characters) about how you felt about this test.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const studentEmail = feedbackData.studentEmail || sessionStorage.getItem('auth_email') || '';
      const studentName = feedbackData.studentName || sessionStorage.getItem('auth_name') || 'Student';

      const payload = {
        testId: feedbackData.testId || '',
        testTitle: feedbackData.testTitle || 'Untitled Test',
        testDepartment: feedbackData.testDepartment || '',
        testSubject: feedbackData.testSubject || '',
        studentEmail: studentEmail.toLowerCase().trim(),
        studentName: studentName,
        rating: Number(rating),
        feedbackText: feedbackText.trim(),
        attemptId: feedbackData.attemptId || null,
        score: feedbackData.score !== undefined ? feedbackData.score : null,
        totalMarks: feedbackData.totalMarks !== undefined ? feedbackData.totalMarks : null,
        createdAt: serverTimestamp(),
        createdAtIso: new Date().toISOString()
      };

      // 1. Add to test_feedback collection
      await addDoc(collection(db, 'test_feedback'), payload);

      // 2. If attempt exists, flag hasFeedback: true
      if (feedbackData.attemptId && !feedbackData.isPractice) {
        try {
          await updateDoc(doc(db, 'test_attempts', feedbackData.attemptId), {
            hasFeedback: true,
            feedbackRating: rating
          });
        } catch (attErr) {
          console.warn('Could not update test_attempts document with feedback flag', attErr);
        }
      }

      // 3. Clear pending feedback from localStorage
      try {
        localStorage.removeItem('pending_feedback_test');
      } catch (storageErr) {
        console.warn('Could not remove pending_feedback_test', storageErr);
      }

      // 4. Proceed to results / dashboard
      if (onSuccess) {
        onSuccess(payload);
      }
    } catch (err) {
      console.error('Failed to submit test feedback:', err);
      setError('Failed to submit feedback. Please check your internet connection and try again.');
      setSubmitting(false);
    }
  };

  const activeStar = hoverRating || rating;
  const ratingInfo = RATING_LABELS[activeStar];

  return (
    <div 
      className="fixed inset-0 z-[999999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-title"
    >
      <div 
        className="relative w-full max-w-xl bg-white rounded-[28px] shadow-[0_25px_70px_rgba(15,23,42,0.4)] border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 sm:p-7 text-white relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="absolute left-1/3 -top-10 w-24 h-24 bg-white/10 rounded-full blur-lg pointer-events-none" />

          <div className="relative z-10 flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-inner shrink-0">
              <MessageSquareHeart size={24} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                  Mandatory Feedback
                </span>
                <span className="flex items-center gap-1 text-[11px] font-bold text-blue-100">
                  <Sparkles size={12} /> Test Completed
                </span>
              </div>
              <h2 id="feedback-title" className="text-xl sm:text-2xl font-[900] tracking-tight leading-tight mt-1 truncate">
                {feedbackData.testTitle || 'Test Feedback'}
              </h2>
            </div>
          </div>
          <p className="text-xs sm:text-[13px] text-blue-100/90 font-medium mt-3 leading-relaxed">
            Please share your honest experience before accessing your results and analytics. Your feedback is sent directly to our academic team to improve test quality.
          </p>
        </div>

        {/* Feedback Form Content */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-6">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold animate-in fade-in">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Star Rating */}
          <div className="space-y-3 text-center sm:text-left">
            <div className="flex items-center justify-between">
              <label className="text-sm font-[800] text-slate-800">
                Rate the Test Quality & Standard <span className="text-red-500">*</span>
              </label>
              {rating > 0 && (
                <span className="text-xs font-bold text-slate-400">
                  {rating} of 5 Stars
                </span>
              )}
            </div>

            {/* Stars Selector */}
            <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3 py-1">
              {[1, 2, 3, 4, 5].map((starNum) => {
                const isFilled = starNum <= activeStar;
                return (
                  <button
                    key={starNum}
                    type="button"
                    onClick={() => { setRating(starNum); setError(''); }}
                    onMouseEnter={() => setHoverRating(starNum)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 rounded-xl transition-all duration-200 hover:scale-125 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    title={`${starNum} Star${starNum > 1 ? 's' : ''}`}
                  >
                    <Star
                      size={36}
                      className={`transition-colors duration-200 ${
                        isFilled
                          ? 'fill-amber-400 text-amber-400 drop-shadow-[0_2px_8px_rgba(251,191,36,0.5)]'
                          : 'text-slate-200 hover:text-slate-300'
                      }`}
                      strokeWidth={1.5}
                    />
                  </button>
                );
              })}
            </div>

            {/* Rating description chip */}
            {ratingInfo ? (
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${ratingInfo.bg} ${ratingInfo.color}`}>
                <CheckCircle2 size={13} />
                <span>{ratingInfo.label}</span>
              </div>
            ) : (
              <p className="text-xs text-slate-400 font-medium">Click on a star to set your rating</p>
            )}
          </div>

          {/* Section 2: Written Description */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label htmlFor="test-feedback-text" className="text-sm font-[800] text-slate-800">
                Describe how you feel about the test <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] font-bold text-slate-400">
                {feedbackText.trim().length} chars
              </span>
            </div>

            <textarea
              id="test-feedback-text"
              rows={4}
              required
              value={feedbackText}
              onChange={(e) => { setFeedbackText(e.target.value); setError(''); }}
              placeholder="How was the difficulty? Were the questions relevant to GATE syllabus? Did you find any errors or feel challenged? Tell us your thoughts..."
              className="w-full p-4 text-sm font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400 resize-none leading-relaxed"
            />

            {/* Quick Helper Tags */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Quick Tags (Click to add):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagClick(tag)}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200/80 hover:border-blue-200 transition-colors cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={submitting || rating === 0 || !feedbackText.trim()}
              className="w-full py-4 px-6 rounded-2xl font-[800] text-sm text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_25px_rgba(37,99,235,0.3)] hover:shadow-[0_12px_30px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Submitting Feedback...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Submit Feedback & View Results</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-center font-bold text-slate-400 mt-2.5">
              🔒 Feedback is required to unlock your test report, analytics, and solutions.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
