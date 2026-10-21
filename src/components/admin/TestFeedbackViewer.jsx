import React, { useState, useEffect, useMemo } from 'react';
import { 
  Star, MessageSquareHeart, Search, Filter, Calendar, Award, 
  Trash2, Download, AlertCircle, Sparkles, RefreshCw, Layers, CheckCircle2, X
} from 'lucide-react';
import { db } from '../../firebase';
import { collection, getDocs, deleteDoc, doc, query, orderBy, onSnapshot } from 'firebase/firestore';

export default function TestFeedbackViewer({ initialTestId = null, onClose = null }) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTestId, setSelectedTestId] = useState(initialTestId || 'All');
  const [starFilter, setStarFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (initialTestId) {
      setSelectedTestId(initialTestId);
    }
  }, [initialTestId]);

  // Real-time listener for test feedback
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'test_feedback'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      setFeedbacks(data);
      setLoading(false);
    }, (error) => {
      console.error('Failed to load test feedback:', error);
      // Fallback query without orderBy if index is building
      getDocs(collection(db, 'test_feedback')).then(snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => new Date(b.createdAtIso || 0) - new Date(a.createdAtIso || 0));
        setFeedbacks(data);
      }).catch(err => console.error('Fallback feedback load error:', err))
        .finally(() => setLoading(false));
    });

    return () => unsubscribe();
  }, []);

  // Distinct tests with review counts & average rating
  const testOptions = useMemo(() => {
    const map = {};
    feedbacks.forEach(f => {
      const tid = f.testId || 'Unknown';
      if (!map[tid]) {
        map[tid] = {
          id: tid,
          title: f.testTitle || 'Untitled Test',
          department: f.testDepartment || '',
          count: 0,
          totalRating: 0
        };
      }
      map[tid].count++;
      map[tid].totalRating += (Number(f.rating) || 0);
    });

    return Object.values(map).map(t => ({
      ...t,
      avgRating: (t.totalRating / t.count).toFixed(1)
    })).sort((a, b) => b.count - a.count);
  }, [feedbacks]);

  // Filtered feedbacks
  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter(f => {
      const matchesTest = selectedTestId === 'All' || f.testId === selectedTestId;
      const matchesStar = starFilter === 'All' || Number(f.rating) === Number(starFilter);
      const search = searchTerm.toLowerCase().trim();
      const matchesSearch = !search ||
        (f.studentName || '').toLowerCase().includes(search) ||
        (f.studentEmail || '').toLowerCase().includes(search) ||
        (f.feedbackText || '').toLowerCase().includes(search) ||
        (f.testTitle || '').toLowerCase().includes(search);

      return matchesTest && matchesStar && matchesSearch;
    });
  }, [feedbacks, selectedTestId, starFilter, searchTerm]);

  // Analytics Metrics
  const activeTestFeedbacks = useMemo(() => {
    return selectedTestId === 'All' ? feedbacks : feedbacks.filter(f => f.testId === selectedTestId);
  }, [feedbacks, selectedTestId]);

  const metrics = useMemo(() => {
    const total = activeTestFeedbacks.length;
    if (total === 0) {
      return { avg: 0, total: 0, starCounts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }, positivePct: 0, negativeCount: 0 };
    }
    const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;
    activeTestFeedbacks.forEach(f => {
      const r = Math.min(5, Math.max(1, Math.round(Number(f.rating) || 0)));
      starCounts[r] = (starCounts[r] || 0) + 1;
      sum += r;
    });

    const avg = (sum / total).toFixed(1);
    const positiveCount = (starCounts[5] || 0) + (starCounts[4] || 0);
    const positivePct = Math.round((positiveCount / total) * 100);
    const negativeCount = (starCounts[1] || 0) + (starCounts[2] || 0);

    return { avg, total, starCounts, positivePct, negativeCount };
  }, [activeTestFeedbacks]);

  const handleDeleteFeedback = async (id, studentName) => {
    if (!window.confirm(`Are you sure you want to delete this feedback from ${studentName}?`)) return;
    try {
      await deleteDoc(doc(db, 'test_feedback', id));
      setFeedbacks(prev => prev.filter(f => f.id !== id));
      showToast('Feedback deleted.');
    } catch (err) {
      console.error('Failed to delete feedback:', err);
      showToast('Failed to delete feedback.', 'error');
    }
  };

  const exportCSV = () => {
    if (filteredFeedbacks.length === 0) return;
    const headers = ['Test Title', 'Student Name', 'Student Email', 'Rating', 'Feedback Description', 'Score', 'Total Marks', 'Date'];
    const rows = filteredFeedbacks.map(f => [
      `"${(f.testTitle || '').replace(/"/g, '""')}"`,
      `"${(f.studentName || '').replace(/"/g, '""')}"`,
      `"${(f.studentEmail || '').replace(/"/g, '""')}"`,
      f.rating,
      `"${(f.feedbackText || '').replace(/"/g, '""')}"`,
      f.score !== null && f.score !== undefined ? f.score : 'N/A',
      f.totalMarks !== null && f.totalMarks !== undefined ? f.totalMarks : 'N/A',
      `"${f.createdAtIso ? new Date(f.createdAtIso).toLocaleDateString() : 'N/A'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Test_Feedback_${selectedTestId}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[99999] px-4 py-3 rounded-2xl shadow-xl text-white font-bold text-sm flex items-center gap-2 ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
          <CheckCircle2 size={16} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
            <Star size={28} className="fill-white text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-[900] text-slate-900 tracking-tight">Test Feedback & Reviews</h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
                {feedbacks.length} Total
              </span>
            </div>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Read and analyze student ratings and feedback organized by test series and mock exams.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            disabled={filteredFeedbacks.length === 0}
            className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            title="Export filtered feedback as CSV"
          >
            <Download size={14} /> Export CSV
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              title="Close"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Analytics KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Average Rating Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 shrink-0 shadow-sm">
            <Star size={28} className="fill-amber-400 text-amber-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-[900] text-slate-900 leading-none">{metrics.avg}</span>
              <span className="text-xs font-bold text-slate-400">/ 5.0</span>
            </div>
            <span className="text-xs font-[700] text-slate-500 block mt-1.5">
              Average Rating
            </span>
          </div>
        </div>

        {/* Total Feedbacks */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 shadow-sm">
            <MessageSquareHeart size={26} />
          </div>
          <div>
            <span className="text-3xl font-[900] text-slate-900 leading-none">{metrics.total}</span>
            <span className="text-xs font-[700] text-slate-500 block mt-1.5">
              {selectedTestId === 'All' ? 'Total Submissions' : 'Test Submissions'}
            </span>
          </div>
        </div>

        {/* Positive Sentiment % */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 shadow-sm">
            <CheckCircle2 size={26} />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-[900] text-emerald-600 leading-none">{metrics.positivePct}%</span>
            </div>
            <span className="text-xs font-[700] text-slate-500 block mt-1.5">
              Positive (4★ or 5★)
            </span>
          </div>
        </div>

        {/* Critical Ratings */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0 shadow-sm">
            <AlertCircle size={26} />
          </div>
          <div>
            <span className="text-3xl font-[900] text-red-600 leading-none">{metrics.negativeCount}</span>
            <span className="text-xs font-[700] text-slate-500 block mt-1.5">
              Needs Attention (1★ & 2★)
            </span>
          </div>
        </div>
      </div>

      {/* Test Selector & Star Filter Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          {/* 1. SELECT TEST (Primary Filter according to tests) */}
          <div className="md:col-span-5 relative">
            <label className="text-[11px] font-[800] text-slate-500 uppercase tracking-wider block mb-1.5">
              Filter by Test:
            </label>
            <div className="relative">
              <select
                value={selectedTestId}
                onChange={(e) => setSelectedTestId(e.target.value)}
                className="w-full h-[46px] pl-10 pr-9 bg-slate-50 border border-slate-200 hover:border-blue-400 focus:border-blue-600 rounded-xl text-sm font-bold text-slate-800 outline-none appearance-none cursor-pointer transition-colors"
              >
                <option value="All">All Tests ({feedbacks.length} feedbacks)</option>
                {testOptions.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.count} reviews • ⭐ {t.avgRating})
                  </option>
                ))}
              </select>
              <Layers size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* 2. STAR RATING FILTER */}
          <div className="md:col-span-3">
            <label className="text-[11px] font-[800] text-slate-500 uppercase tracking-wider block mb-1.5">
              Star Rating:
            </label>
            <div className="relative">
              <select
                value={starFilter}
                onChange={(e) => setStarFilter(e.target.value)}
                className="w-full h-[46px] pl-10 pr-9 bg-slate-50 border border-slate-200 hover:border-blue-400 focus:border-blue-600 rounded-xl text-sm font-bold text-slate-800 outline-none appearance-none cursor-pointer transition-colors"
              >
                <option value="All">All Stars</option>
                <option value="5">⭐⭐⭐⭐⭐ (5 Stars)</option>
                <option value="4">⭐⭐⭐⭐ (4 Stars)</option>
                <option value="3">⭐⭐⭐ (3 Stars)</option>
                <option value="2">⭐⭐ (2 Stars)</option>
                <option value="1">⭐ (1 Star)</option>
              </select>
              <Star size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none" />
            </div>
          </div>

          {/* 3. SEARCH INPUT */}
          <div className="md:col-span-4">
            <label className="text-[11px] font-[800] text-slate-500 uppercase tracking-wider block mb-1.5">
              Search by Student / Text:
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search student or comments..."
                className="w-full h-[46px] pl-10 pr-9 bg-slate-50 border border-slate-200 hover:border-blue-400 focus:border-blue-600 rounded-xl text-sm font-medium text-slate-800 outline-none transition-colors placeholder:text-slate-400"
              />
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Active Filter Chips / Reset */}
        {(selectedTestId !== 'All' || starFilter !== 'All' || searchTerm) && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
            <span className="text-xs font-bold text-slate-500">Active Filters:</span>
            {selectedTestId !== 'All' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                Test: {testOptions.find(t => t.id === selectedTestId)?.title || selectedTestId}
                <button onClick={() => setSelectedTestId('All')} className="hover:text-red-600"><X size={12} /></button>
              </span>
            )}
            {starFilter !== 'All' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100">
                {starFilter} Stars
                <button onClick={() => setStarFilter('All')} className="hover:text-red-600"><X size={12} /></button>
              </span>
            )}
            {searchTerm && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
                "{searchTerm}"
                <button onClick={() => setSearchTerm('')} className="hover:text-red-600"><X size={12} /></button>
              </span>
            )}
            <button
              onClick={() => { setSelectedTestId('All'); setStarFilter('All'); setSearchTerm(''); }}
              className="text-xs font-bold text-red-600 hover:underline ml-auto"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Feedback Cards List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-slate-200">
            <RefreshCw size={28} className="animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-500">Loading student test feedbacks...</p>
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 p-8">
            <MessageSquareHeart size={44} className="text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-[800] text-slate-800">No Feedback Found</h3>
            <p className="text-sm text-slate-500 font-medium max-w-sm mx-auto mt-1">
              {feedbacks.length === 0 
                ? 'No students have submitted feedback for tests yet. When students complete a test, their required feedback will show up here.'
                : 'No feedback matches the selected filters. Try choosing "All Tests" or clearing search filters.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredFeedbacks.map((f) => {
              const stars = Number(f.rating) || 0;
              const dateStr = f.createdAtIso 
                ? new Date(f.createdAtIso).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : f.createdAt?.toDate ? f.createdAt.toDate().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recently';

              return (
                <div 
                  key={f.id}
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between gap-4 group"
                >
                  <div className="space-y-3">
                    {/* Top Row: Test Badge & Rating */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 inline-block mb-1">
                          {f.testDepartment || 'General'}
                        </span>
                        <h4 className="text-[15px] font-[800] text-slate-900 leading-snug line-clamp-1" title={f.testTitle}>
                          {f.testTitle || 'Untitled Test'}
                        </h4>
                      </div>

                      {/* Stars */}
                      <div className="flex items-center gap-1 shrink-0 bg-amber-50/80 border border-amber-200/80 px-2.5 py-1 rounded-xl">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star 
                            key={s} 
                            size={14} 
                            className={s <= stars ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} 
                          />
                        ))}
                        <span className="text-xs font-black text-amber-900 ml-1">{stars}.0</span>
                      </div>
                    </div>

                    {/* Student Info */}
                    <div className="flex items-center gap-2.5 pt-1">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-50 to-blue-50 text-blue-700 font-[800] text-xs flex items-center justify-center border border-blue-100 shrink-0">
                        {(f.studentName || 'S').trim().charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-[800] text-slate-800 block truncate">{f.studentName}</span>
                        <span className="text-[11px] text-slate-400 font-medium block truncate">{f.studentEmail}</span>
                      </div>
                      {f.score !== null && f.score !== undefined && (
                        <div className="text-right shrink-0">
                          <span className="text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg">
                            Score: {f.score}/{f.totalMarks || 100}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Feedback Description Text */}
                    <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 text-slate-700 text-xs sm:text-[13px] leading-relaxed italic relative">
                      "{f.feedbackText}"
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} /> {dateStr}
                    </span>
                    <button
                      onClick={() => handleDeleteFeedback(f.id, f.studentName)}
                      className="text-slate-300 hover:text-red-600 p-1 rounded-lg transition-colors"
                      title="Delete Feedback"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
