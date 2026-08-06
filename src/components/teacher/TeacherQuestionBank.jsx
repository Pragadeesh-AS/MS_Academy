import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Layers, Search, Filter, BookOpen, AlertCircle, FileText, Sparkles, ChevronDown } from 'lucide-react';
import Loader from '../Loader';

export default function TeacherQuestionBank({ department }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const relativeTime = (isoString) => {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) {
      if (date.getDate() === now.getDate()) return 'Today';
      return 'Yesterday';
    }
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  
  // Hardcoded departments to map short codes to full names if needed
  const departmentMapping = {
    'CSE': 'Computer Science (CSE)',
    'ECE': 'Electronics (ECE)',
    'ME': 'Mechanical (ME)',
    'CE': 'Civil (CE)',
    'EE': 'Electrical (EE)',
    'DS': 'Data Science (DS)'
  };
  
  const teacherFullDept = departmentMapping[department] || department || 'All Departments';

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      try {
        const qSnapshot = await getDocs(collection(db, 'question_bank'));
        const qData = qSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Filter questions by teacher's department or 'All Departments'
        const filtered = qData.filter(q => {
          if (teacherFullDept === 'All Departments') return true;
          return q.department === teacherFullDept || q.department === 'All Departments' || q.department === 'ALL';
        });
        
        setQuestions(filtered);
      } catch (e) {
        console.error("Failed to fetch questions", e);
      }
      setLoading(false);
    };

    fetchQuestions();
  }, [department, teacherFullDept]);

  const filteredQuestions = questions.filter(q => 
    (q.questionText || '').toLowerCase().includes(search.toLowerCase()) ||
    (q.topic || '').toLowerCase().includes(search.toLowerCase()) ||
    (q.subject || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm mt-6 min-h-[500px]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-[900] text-slate-900 flex items-center gap-2">
            <BookOpen className="text-blue-600" size={24} />
            Question Bank
          </h2>
          <p className="text-slate-500 font-medium text-sm mt-1 flex items-center gap-1.5">
            <Layers size={14} /> Showing questions for: <span className="font-bold text-slate-700">{teacherFullDept}</span>
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search questions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-sm font-semibold rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader />
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
            <FileText className="text-slate-400" size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No Questions Found</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">
            The administrator hasn't added any questions for your department yet, or no questions match your search.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#EEF2F7] rounded-[24px] shadow-[0_10px_28px_rgba(15,23,42,0.05)] flex flex-col overflow-hidden mb-8">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="border-b border-[#EEF2F7]">
                  <th className="py-5 px-6 text-[12px] font-[700] text-[#64748B] uppercase tracking-wider w-[100px]">ID</th>
                  <th className="py-5 px-6 text-[12px] font-[700] text-[#64748B] uppercase tracking-wider">Question</th>
                  <th className="py-5 px-6 text-[12px] font-[700] text-[#64748B] uppercase tracking-wider w-[140px]">Type</th>
                  <th className="py-5 px-6 text-[12px] font-[700] text-[#64748B] uppercase tracking-wider w-[120px]">Marks</th>
                  <th className="py-5 px-6 text-[12px] font-[700] text-[#64748B] uppercase tracking-wider w-[120px]">Difficulty</th>
                  <th className="py-5 px-6 text-[12px] font-[700] text-[#64748B] uppercase tracking-wider w-[160px]">Department</th>
                  <th className="py-5 px-6 text-[12px] font-[700] text-[#64748B] uppercase tracking-wider w-[140px]">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2F7]">
                {filteredQuestions.map((q, index) => (
                  <React.Fragment key={q.id}>
                    <tr 
                      onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                      className="group hover:bg-[#F8FAFF] transition-colors duration-200 cursor-pointer"
                    >
                      <td className="py-4 px-6 h-[82px]">
                        <span className="text-[13px] font-[700] text-[#64748B] bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm inline-flex items-center justify-center min-w-[28px]">
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-4 px-6 h-[82px] max-w-[400px]">
                        <div className="flex items-center gap-4">
                          <div className="w-[42px] h-[42px] rounded-[12px] bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
                            <FileText size={20} className="text-[#2563EB]" />
                          </div>
                          <div className="flex flex-col gap-1 min-w-0">
                            <span className="text-[15px] font-[600] text-[#0F172A] truncate block flex items-center gap-1.5" title={q.questionText}>
                              {q.isImported && <Sparkles size={14} className="text-purple-600 flex-shrink-0" title="AI Imported" />}
                              <span className="truncate">{q.questionText || 'Untitled Question'}</span>
                            </span>
                            <span className="text-[13px] font-[500] text-[#64748B] truncate block">
                              {q.subject || 'No Subject'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 h-[82px]">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-50 text-purple-600 border border-purple-100 text-[12px] font-[700] whitespace-nowrap">
                          {q.questionType}
                        </span>
                      </td>
                      <td className="py-4 px-6 h-[82px]">
                        <span className="text-[14px] font-[600] text-[#0F172A]">{q.mark?.split(' ')[0] || '1'} Mark</span>
                      </td>
                      <td className="py-4 px-6 h-[82px]">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full border text-[12px] font-[700] ${
                          q.difficultyLevel === 'Hard' ? 'bg-red-50 text-red-600 border-red-100' :
                          q.difficultyLevel === 'Medium' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                          'bg-green-50 text-green-600 border-green-100'
                        }`}>
                          {q.difficultyLevel || 'Easy'}
                        </span>
                      </td>
                      <td className="py-4 px-6 h-[82px]">
                        <span className="text-[14px] font-[500] text-[#0F172A]">{q.department || 'All'}</span>
                      </td>
                      <td className="py-4 px-6 h-[82px]">
                        <span className="text-[13px] font-[500] text-[#64748B]">{relativeTime(q.createdAt)}</span>
                      </td>
                    </tr>
                    {expandedId === q.id && (
                      <tr className="bg-[#F8FAFF] border-b border-[#EEF2F7]">
                        <td colSpan="7" className="px-6 py-6">
                          <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm relative cursor-default" onClick={(e) => e.stopPropagation()}>
                            <h4 className="text-[16px] font-bold text-slate-800 mb-4 flex items-start gap-2">
                              {q.isImported && <Sparkles size={16} className="text-purple-600 mt-1 flex-shrink-0" title="AI Imported" />}
                              <span dangerouslySetInnerHTML={{ __html: q.questionText || 'Untitled Question' }} />
                            </h4>
                            {q.questionImageUrl && (
                              <img src={q.questionImageUrl} alt="Question" className="max-h-48 rounded-lg mb-4 object-contain border border-slate-200" />
                            )}
                            {q.questionType === 'Single Choice' && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                {['A', 'B', 'C', 'D'].map(opt => {
                                  const text = q[`option${opt}`];
                                  const image = q[`option${opt}Image`];
                                  if (!text && !image) return null;
                                  const isCorrect = q.correctAnswer === opt;
                                  return (
                                    <div key={opt} className={`p-3 rounded-xl text-[14px] font-medium border flex items-start gap-2 ${isCorrect ? 'bg-green-50 border-green-200 text-green-800 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                                      <span className={`font-bold shrink-0 ${isCorrect ? 'text-green-600' : 'text-slate-400'}`}>{opt}.</span> 
                                      <div className="flex flex-col gap-2">
                                        {text && <span dangerouslySetInnerHTML={{ __html: text }} />}
                                        {image && <img src={image} alt={`Option ${opt}`} className="max-h-20 rounded-lg border border-slate-200 shadow-sm" />}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {q.questionType === 'Multiple Choice' && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                {['A', 'B', 'C', 'D'].map(opt => {
                                  const text = q[`option${opt}`];
                                  const image = q[`option${opt}Image`];
                                  if (!text && !image) return null;
                                  const isCorrect = (q.correctAnswers || []).includes(opt);
                                  return (
                                    <div key={opt} className={`p-3 rounded-xl text-[14px] font-medium border flex items-start gap-2 ${isCorrect ? 'bg-green-50 border-green-200 text-green-800 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                                      <span className={`font-bold shrink-0 ${isCorrect ? 'text-green-600' : 'text-slate-400'}`}>{opt}.</span> 
                                      <div className="flex flex-col gap-2">
                                        {text && <span dangerouslySetInnerHTML={{ __html: text }} />}
                                        {image && <img src={image} alt={`Option ${opt}`} className="max-h-20 rounded-lg border border-slate-200 shadow-sm" />}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {q.questionType === 'Numerical / Fill in the Blanks' && (
                              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl inline-block">
                                <span className="text-green-800 font-bold text-[14px]">Correct Answer: </span>
                                <span className="text-green-900 font-[900] text-[14px]">
                                  {q.fillBlankMode === 'Range' ? `${q.fillBlankRangeStart} to ${q.fillBlankRangeEnd}` : q.fillBlankAnswer}
                                </span>
                              </div>
                            )}
                            {q.explanation && (
                              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 mt-4">
                                <span className="text-[12px] font-bold text-blue-600 uppercase tracking-wider mb-1 block flex items-center gap-1.5"><AlertCircle size={14} /> Explanation</span>
                                <p className="text-[14px] text-slate-700" dangerouslySetInnerHTML={{ __html: q.explanation }} />
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-5 border-t border-[#EEF2F7] flex items-center justify-between bg-[#F8FAFC]/50">
            <span className="text-[13px] font-[500] text-[#64748B]">
              Showing 1 to {filteredQuestions.length} of {filteredQuestions.length} questions
            </span>
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 rounded-lg bg-[#2563EB] text-white font-[600] text-[13px] shadow-sm flex items-center justify-center">1</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
