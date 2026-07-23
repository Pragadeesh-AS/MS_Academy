import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2, Edit2, Search, Filter } from 'lucide-react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

export default function QuestionBank() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('All');

  const [formData, setFormData] = useState({
    questionText: '',
    department: 'CSE',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: 'A',
    explanation: ''
  });

  const departments = ['CSE', 'ECE', 'ME', 'CE', 'EE'];
  const optionsList = ['A', 'B', 'C', 'D'];

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const qSnapshot = await getDocs(collection(db, 'question_bank'));
      const qData = qSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setQuestions(qData);
    } catch (e) {
      console.error("Failed to fetch questions", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await updateDoc(doc(db, 'question_bank', currentId), formData);
      } else {
        await addDoc(collection(db, 'question_bank'), {
          ...formData,
          createdAt: new Date().toISOString()
        });
      }
      setIsModalOpen(false);
      fetchQuestions();
    } catch (e) {
      console.error("Failed to save question", e);
    }
  };

  const handleEdit = (q) => {
    setFormData({
      questionText: q.questionText,
      department: q.department,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || ''
    });
    setCurrentId(q.id);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this question?")) {
      try {
        await deleteDoc(doc(db, 'question_bank', id));
        fetchQuestions();
      } catch (e) {
        console.error("Failed to delete question", e);
      }
    }
  };

  const openAddModal = () => {
    setFormData({
      questionText: '',
      department: 'CSE',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correctAnswer: 'A',
      explanation: ''
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.questionText.toLowerCase().includes(search.toLowerCase());
    const matchesDept = filterDept === 'All' || q.department === filterDept;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
        <div>
          <h2 className="text-2xl font-[900] text-slate-800 tracking-tight flex items-center gap-2">
            <BookOpen className="text-blue-600" /> Question Bank
          </h2>
          <p className="text-slate-500 text-sm mt-1">Manage practice questions for students across all departments</p>
        </div>
        
        <button 
          onClick={openAddModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all w-fit"
        >
          <Plus size={18} />
          Add Question
        </button>
      </div>

      {/* Controls */}
      <div className="p-6 border-b border-slate-100 bg-white flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative w-full max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search questions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-slate-400" />
          <select 
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
          >
            <option value="All">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <BookOpen size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium">No questions found</p>
            <p className="text-sm">Try adjusting your filters or add a new question.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredQuestions.map((q, i) => (
              <div key={q.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-md transition-all group">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="bg-blue-50 text-blue-700 font-bold text-[10px] uppercase tracking-wider px-2 py-1 rounded-md">
                        {q.department}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">Q{i + 1}</span>
                    </div>
                    <p className="text-slate-800 font-semibold mb-4 leading-relaxed">{q.questionText}</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                      {optionsList.map(opt => (
                        <div key={opt} className={`p-2 rounded-lg text-sm border ${q.correctAnswer === opt ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-medium' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                          <span className="font-bold mr-2">{opt}.</span> {q[`option${opt}`]}
                        </div>
                      ))}
                    </div>

                    {q.explanation && (
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <p className="text-xs font-bold text-slate-500 mb-1">Explanation:</p>
                        <p className="text-xs text-slate-600 leading-relaxed">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button 
                      onClick={() => handleEdit(q)}
                      className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                      title="Edit Question"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(q.id)}
                      className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                      title="Delete Question"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 md:p-8">
              <h3 className="text-2xl font-[900] text-slate-800 mb-6">
                {isEditing ? 'Edit Question' : 'Add New Question'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Question Text</label>
                    <textarea 
                      name="questionText"
                      required
                      value={formData.questionText}
                      onChange={handleInputChange}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24"
                      placeholder="Enter the question here..."
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Department</label>
                    <select 
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Correct Answer</label>
                    <select 
                      name="correctAnswer"
                      value={formData.correctAnswer}
                      onChange={handleInputChange}
                      className="w-full p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      {optionsList.map(opt => <option key={opt} value={opt}>Option {opt}</option>)}
                    </select>
                  </div>

                  {optionsList.map(opt => (
                    <div key={opt}>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Option {opt}</label>
                      <input 
                        type="text"
                        name={`option${opt}`}
                        required
                        value={formData[`option${opt}`]}
                        onChange={handleInputChange}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder={`Value for option ${opt}`}
                      />
                    </div>
                  ))}

                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Explanation (Optional)</label>
                    <textarea 
                      name="explanation"
                      value={formData.explanation}
                      onChange={handleInputChange}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-20"
                      placeholder="Explain why the answer is correct..."
                    ></textarea>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition-all"
                  >
                    {isEditing ? 'Save Changes' : 'Add Question'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
