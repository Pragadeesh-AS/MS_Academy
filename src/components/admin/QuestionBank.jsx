import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Plus, Trash2, Edit2, Search, Filter, X, Save, Image as ImageIcon, CheckCircle2, ChevronRight, FileText, Settings, AlignLeft, Bold, Italic, List, Type, MousePointerClick, ChevronDown, ListTodo, Paperclip } from 'lucide-react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

// Searchable Select Component
const SearchableSelect = ({ label, options, value, onChange, placeholder = "Select..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  // Close when clicking outside
  useEffect(() => {
    const handleWindowClick = (e) => {
      if (!e.target.closest(`.select-container-${label.replace(/\\s+/g, '-')}`)) {
        setIsOpen(false);
      }
    };
    if (isOpen) window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, [isOpen, label]);

  const filteredOptions = options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className={`relative select-container-${label.replace(/\\s+/g, '-')}`}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border border-slate-200 text-slate-800 text-[13px] font-bold rounded-xl pl-9 pr-8 py-2.5 hover:border-blue-300 focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer transition-all shadow-sm flex items-center justify-between"
      >
        <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap text-ellipsis max-w-full">
          <span className={value === 'All' ? 'text-slate-500' : 'text-blue-700'}>
            {value === 'All' ? placeholder : value}
          </span>
        </div>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full min-w-[200px] bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col max-h-[300px]">
          <div className="p-2 border-b border-slate-100 sticky top-0 bg-white">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder={`Search ${label.toLowerCase()}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-slate-50 border border-slate-200 text-xs font-medium rounded-lg pl-8 pr-3 py-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all"
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-1">
            <div 
              onClick={() => { onChange('All'); setIsOpen(false); setSearch(''); }}
              className={`px-3 py-2 text-[13px] font-bold rounded-lg cursor-pointer transition-colors ${value === 'All' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              {placeholder}
            </div>
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-[12px] font-medium text-slate-400">No results found</div>
            ) : (
              filteredOptions.map(opt => (
                <div 
                  key={opt}
                  onClick={() => { onChange(opt); setIsOpen(false); setSearch(''); }}
                  className={`px-3 py-2 text-[13px] font-bold rounded-lg cursor-pointer transition-colors ${value === opt ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  {opt}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function QuestionBank() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [filterSubject, setFilterSubject] = useState('All');
  const [filterTopic, setFilterTopic] = useState('All');
  const [filterYear, setFilterYear] = useState('All');
  const [filterMark, setFilterMark] = useState('All');
  const [filterDifficulty, setFilterDifficulty] = useState('All');

  const [formData, setFormData] = useState({
    questionType: 'Single Choice',
    questionText: '',
    questionImageUrl: '',
    explanation: '',
    optionA: '',
    optionAImage: '',
    optionB: '',
    optionBImage: '',
    optionC: '',
    optionCImage: '',
    optionD: '',
    optionDImage: '',
    correctAnswer: 'A',
    department: '',
    subject: '',
    topic: '',
    year: '',
    mark: '1 Mark (-0.33)',
    difficultyLevel: ''
  });

  const [attributes, setAttributes] = useState([]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const qSnapshot = await getDocs(collection(db, 'question_bank'));
      const qData = qSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setQuestions(qData);
      
      const attrSnapshot = await getDocs(collection(db, 'question_attributes'));
      const attrData = attrSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAttributes(attrData);
    } catch (e) {
      console.error("Failed to fetch data", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  // Cascading logic to get parent IDs
  const selectedDeptObj = filterDept !== 'All' 
    ? attributes.find(a => a.type === 'department' && a.name === filterDept) 
    : null;
    
  const selectedSubjectObj = filterSubject !== 'All' 
    ? attributes.find(a => a.type === 'subject' && a.name === filterSubject) 
    : null;

  const departments = attributes.filter(a => a.type === 'department').map(a => a.name);
  
  const subjects = attributes
    .filter(a => a.type === 'subject' && (!selectedDeptObj || a.parentId === selectedDeptObj.id))
    .map(a => a.name);
    
  const topics = attributes
    .filter(a => a.type === 'topic' && (!selectedSubjectObj || a.parentId === selectedSubjectObj.id))
    .map(a => a.name);
  const currentYear = new Date().getFullYear();
  const years = Array.from({length: currentYear - 1990 + 1}, (_, i) => (currentYear - i).toString()); // 1990 to current year, descending
  const marks = attributes.filter(a => a.type === 'mark').map(a => a.name);
  const difficulties = attributes.filter(a => a.type === 'difficulty').map(a => a.name);
  const optionsList = ['A', 'B', 'C', 'D'];

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Generic Image Handler for Base64 (Question or Options)
  const handleImageUpload = (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 1048576) {
      alert("Image is too large. Please upload an image under 1MB.");
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, [field]: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (field) => {
    setFormData(prev => ({ ...prev, [field]: '' }));
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
      setIsCreatorOpen(false);
      fetchQuestions();
    } catch (e) {
      console.error("Failed to save question", e);
      alert("Failed to save question. Please try again.");
    }
  };

  const handleSaveAndNext = async (e) => {
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
      // Reset form for next question
      openAddCreator();
      fetchQuestions();
    } catch (e) {
      console.error("Failed to save question", e);
      alert("Failed to save question. Please try again.");
    }
  };

  const handleEdit = (q) => {
    setFormData({
      questionType: q.questionType || 'Single Choice',
      questionText: q.questionText || '',
      questionImageUrl: q.questionImageUrl || '',
      explanation: q.explanation || '',
      optionA: q.optionA || '',
      optionAImage: q.optionAImage || '',
      optionB: q.optionB || '',
      optionBImage: q.optionBImage || '',
      optionC: q.optionC || '',
      optionCImage: q.optionCImage || '',
      optionD: q.optionD || '',
      optionDImage: q.optionDImage || '',
      correctAnswer: q.correctAnswer || 'A',
      department: q.department || '',
      subject: q.subject || '',
      topic: q.topic || '',
      year: q.year || '',
      mark: q.mark || '1 Mark (-0.33)',
      difficultyLevel: q.difficultyLevel || ''
    });
    setCurrentId(q.id);
    setIsEditing(true);
    setIsCreatorOpen(true);
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

  const openAddCreator = () => {
    setFormData({
      questionType: 'Single Choice',
      questionText: '',
      questionImageUrl: '',
      explanation: '',
      optionA: '',
      optionAImage: '',
      optionB: '',
      optionBImage: '',
      optionC: '',
      optionCImage: '',
      optionD: '',
      optionDImage: '',
      correctAnswer: 'A',
      department: '',
      subject: '',
      topic: '',
      year: '',
      mark: '1 Mark (-0.33)',
      difficultyLevel: ''
    });
    setIsEditing(false);
    setIsCreatorOpen(true);
  };

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.questionText?.toLowerCase().includes(search.toLowerCase());
    const matchesDept = filterDept === 'All' || q.department === filterDept;
    const matchesSubject = filterSubject === 'All' || q.subject === filterSubject;
    const matchesTopic = filterTopic === 'All' || q.topic === filterTopic;
    const matchesYear = filterYear === 'All' || q.year === filterYear;
    const matchesMark = filterMark === 'All' || q.mark === filterMark;
    const matchesDifficulty = filterDifficulty === 'All' || q.difficultyLevel === filterDifficulty;
    
    return matchesSearch && matchesDept && matchesSubject && matchesTopic && matchesYear && matchesMark && matchesDifficulty;
  });

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative">
      {/* List View Header */}
      <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
        <div>
          <h2 className="text-2xl font-[900] text-slate-800 tracking-tight flex items-center gap-2">
            <BookOpen className="text-[#1d4ed8]" /> Question Bank
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">Manage practice questions for students across all departments</p>
        </div>
        
        <button 
          onClick={openAddCreator}
          className="flex items-center gap-2 bg-[#1d4ed8] hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all w-fit"
        >
          <Plus size={18} />
          Add Question
        </button>
      </div>

      {/* Advanced Filter Controls */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-6">
        
        {/* Search Bar */}
        <div className="relative w-full">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" />
          <input 
            type="text" 
            placeholder="Search questions by text..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-[15px] font-bold text-slate-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 placeholder:font-medium shadow-sm"
          />
        </div>
        
        {/* Dropdowns Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-[900] text-slate-500 uppercase tracking-widest pl-1">Department</label>
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
              <SearchableSelect 
                label="Department"
                placeholder="All Departments"
                options={departments}
                value={filterDept}
                onChange={(val) => {
                  setFilterDept(val);
                  setFilterSubject('All'); // Reset child
                  setFilterTopic('All'); // Reset grandchild
                }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-[900] text-slate-500 uppercase tracking-widest pl-1">Subject</label>
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
              <SearchableSelect 
                label="Subject"
                placeholder="All Subjects"
                options={subjects}
                value={filterSubject}
                onChange={(val) => {
                  setFilterSubject(val);
                  setFilterTopic('All'); // Reset child
                }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-[900] text-slate-500 uppercase tracking-widest pl-1">Topic</label>
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
              <SearchableSelect 
                label="Topic"
                placeholder="All Topics"
                options={topics}
                value={filterTopic}
                onChange={setFilterTopic}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-[900] text-slate-500 uppercase tracking-widest pl-1">Year</label>
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
              <SearchableSelect 
                label="Year"
                placeholder="All Years"
                options={years}
                value={filterYear}
                onChange={setFilterYear}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-[900] text-slate-500 uppercase tracking-widest pl-1">Marks</label>
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
              <SearchableSelect 
                label="Marks"
                placeholder="All Marks"
                options={marks}
                value={filterMark}
                onChange={setFilterMark}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-[900] text-slate-500 uppercase tracking-widest pl-1">Difficulty</label>
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
              <SearchableSelect 
                label="Difficulty"
                placeholder="All Difficulties"
                options={difficulties}
                value={filterDifficulty}
                onChange={setFilterDifficulty}
              />
            </div>
          </div>

        </div>
      </div>

      {/* Question List */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1d4ed8]"></div>
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
                        {q.department || 'General'}
                      </span>
                      <span className="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase tracking-wider px-2 py-1 rounded-md">
                        {q.mark}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">Q{i + 1}</span>
                    </div>
                    <p className="text-slate-800 font-semibold mb-4 leading-relaxed">{q.questionText}</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                      {optionsList.map(opt => (
                        <div key={opt} className={`p-2 rounded-lg text-sm border flex items-center gap-2 ${q.correctAnswer === opt ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-medium' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                          <span className="font-bold">{opt}.</span> 
                          <span className="truncate">{q[`option${opt}`] || (q[`option${opt}Image`] ? '[Image Option]' : '')}</span>
                        </div>
                      ))}
                    </div>
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

      {/* FULL-SCREEN STANDALONE QUESTION CREATOR */}
      {isCreatorOpen && createPortal(
        <div className="fixed inset-0 bg-[#f4f7fb] z-[99999] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          {/* TOP BAR */}
          <div className="h-[72px] bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                <BookOpen size={18} className="text-blue-600" />
                <span className="font-bold text-blue-900 text-[15px]">Standalone Question Creator</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Questions:</span>
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold shadow-sm">1</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => {}} className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-bold text-sm bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-colors border border-blue-100">
                <Plus size={16} /> Add Question
              </button>
              <div className="w-px h-6 bg-slate-200"></div>
              <button 
                onClick={() => setIsCreatorOpen(false)}
                className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 font-bold text-sm bg-white hover:bg-slate-50 px-4 py-2 rounded-xl transition-colors border border-slate-200"
              >
                <X size={16} /> Close
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex overflow-hidden">
            
            {/* LEFT / CENTER SCROLLABLE AREA */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 lg:p-8 flex flex-col xl:flex-row gap-8">
              
              {/* LEFT COLUMN: QUESTION CONTENT */}
              <div className="flex-1 min-w-0 flex flex-col gap-6 max-w-4xl xl:max-w-none">
                
                {/* Header info */}
                <div className="flex items-center justify-between">
                  <div className="relative">
                    <select 
                      name="questionType"
                      value={formData.questionType}
                      onChange={handleInputChange}
                      className="appearance-none bg-white border border-slate-200 text-slate-800 font-bold text-sm rounded-xl pl-4 pr-10 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm cursor-pointer"
                    >
                      <option value="Single Choice">Single Choice</option>
                      <option value="Multiple Choice">Multiple Choice</option>
                      <option value="NAT">Numerical Answer Type (NAT)</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Marks:</span>
                    <span className="bg-white border border-blue-200 text-blue-700 text-sm font-bold px-3 py-1.5 rounded-lg shadow-sm">
                      {formData.mark}
                    </span>
                    <span className="bg-red-50 border border-red-200 text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> Neg: {formData.mark.includes('2') ? '-0.66' : '-0.33'}
                    </span>
                  </div>
                </div>

                {/* Question Text Editor */}
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-[800] text-slate-600 uppercase tracking-wider">Question Text <span className="text-red-500">*</span></label>
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                    {/* Rich text toolbar mock */}
                    <div className="h-12 border-b border-slate-100 bg-slate-50/50 flex items-center px-2 gap-1">
                      <button type="button" className="p-2 text-slate-500 hover:bg-slate-200 rounded-lg"><Bold size={16}/></button>
                      <button type="button" className="p-2 text-slate-500 hover:bg-slate-200 rounded-lg"><Italic size={16}/></button>
                      <div className="w-px h-4 bg-slate-200 mx-1"></div>
                      <button type="button" className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-lg font-serif text-sm font-bold">x²</button>
                      <button type="button" className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-lg font-serif text-sm font-bold">x₂</button>
                      <div className="w-px h-4 bg-slate-200 mx-1"></div>
                      <button type="button" className="p-2 text-slate-500 hover:bg-slate-200 rounded-lg"><List size={16}/></button>
                      <div className="ml-auto flex pr-2">
                         <button type="button" className="p-2 text-slate-400 hover:bg-slate-200 rounded-lg"><Paperclip size={16}/></button>
                      </div>
                    </div>
                    <textarea 
                      name="questionText"
                      required
                      value={formData.questionText}
                      onChange={handleInputChange}
                      className="w-full p-4 h-40 resize-none outline-none text-slate-700 placeholder-slate-300"
                      placeholder="Start typing your question here..."
                    ></textarea>
                  </div>
                </div>

                {/* Question Image (Optional) */}
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-[800] text-slate-600 uppercase tracking-wider">Question Image (Optional)</label>
                  {formData.questionImageUrl ? (
                    <div className="relative bg-slate-100 rounded-2xl border border-slate-200 p-2 w-fit">
                      <img src={formData.questionImageUrl} alt="Question" className="max-h-40 rounded-xl" />
                      <button type="button" onClick={() => removeImage('questionImageUrl')} className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:bg-red-600">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-slate-300 hover:border-blue-400 bg-white hover:bg-slate-50 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm group">
                      <ImageIcon size={24} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                      <span className="text-sm font-bold text-slate-600 group-hover:text-blue-600 transition-colors">Upload, Paste or Drop Image</span>
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'questionImageUrl')} />
                    </label>
                  )}
                </div>

                {/* Explanation Editor */}
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-[800] text-slate-600 uppercase tracking-wider">Explanation <span className="text-slate-400 normal-case tracking-normal">(shown after test)</span></label>
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                    <div className="h-12 border-b border-slate-100 bg-slate-50/50 flex items-center px-2 gap-1">
                      <button type="button" className="p-2 text-slate-500 hover:bg-slate-200 rounded-lg"><Bold size={16}/></button>
                      <button type="button" className="p-2 text-slate-500 hover:bg-slate-200 rounded-lg"><Italic size={16}/></button>
                      <div className="w-px h-4 bg-slate-200 mx-1"></div>
                      <button type="button" className="p-2 text-slate-500 hover:bg-slate-200 rounded-lg"><List size={16}/></button>
                    </div>
                    <textarea 
                      name="explanation"
                      value={formData.explanation}
                      onChange={handleInputChange}
                      className="w-full p-4 h-32 resize-none outline-none text-slate-700 placeholder-slate-300"
                      placeholder="Add detailed explanation here..."
                    ></textarea>
                  </div>
                </div>

              </div>

              {/* CENTER COLUMN: ANSWER OPTIONS */}
              <div className="w-full xl:w-[450px] shrink-0 flex flex-col bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden h-fit xl:h-full">
                
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <ListTodo size={20} />
                  </div>
                  <h3 className="text-lg font-[900] text-slate-800 tracking-tight">Answer Options</h3>
                </div>

                <div className="p-6 flex flex-col gap-4 overflow-y-auto bg-slate-50/30 flex-1">
                  <p className="text-sm font-bold text-slate-500 mb-2">Select the correct answer</p>

                  {optionsList.map(opt => (
                    <div key={opt} className={`relative flex flex-col bg-white border-2 rounded-2xl transition-all ${formData.correctAnswer === opt ? 'border-emerald-500 shadow-md ring-4 ring-emerald-500/10' : 'border-slate-200 hover:border-slate-300 shadow-sm'}`}>
                      
                      {/* Option Header & Selection */}
                      <div className="flex items-center gap-3 p-4 border-b border-slate-100">
                        <div className={`w-8 h-8 rounded-lg font-[900] flex items-center justify-center ${formData.correctAnswer === opt ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {opt}
                        </div>
                        <div className="flex-1">
                          <input 
                            type="text"
                            name={`option${opt}`}
                            value={formData[`option${opt}`]}
                            onChange={handleInputChange}
                            placeholder={`Enter Option ${opt}`}
                            className="w-full bg-transparent outline-none text-[15px] font-medium text-slate-800 placeholder-slate-400"
                          />
                        </div>
                        <label className="cursor-pointer">
                          <input 
                            type="radio"
                            name="correctAnswer"
                            value={opt}
                            checked={formData.correctAnswer === opt}
                            onChange={handleInputChange}
                            className="hidden"
                          />
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${formData.correctAnswer === opt ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`}>
                            {formData.correctAnswer === opt && <div className="w-2.5 h-2.5 rounded-full bg-white"></div>}
                          </div>
                        </label>
                      </div>

                      {/* Image Upload Area for Option */}
                      <div className="p-3 bg-slate-50/50 rounded-b-2xl flex items-center justify-center">
                         {formData[`option${opt}Image`] ? (
                            <div className="relative group">
                              <img src={formData[`option${opt}Image`]} alt={`Option ${opt}`} className="max-h-24 rounded-lg shadow-sm border border-slate-200" />
                              <button type="button" onClick={() => removeImage(`option${opt}Image`)} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                                <X size={12} />
                              </button>
                            </div>
                         ) : (
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 cursor-pointer transition-colors py-2">
                              <ImageIcon size={14} /> ADD IMAGE
                              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, `option${opt}Image`)} />
                            </label>
                         )}
                      </div>

                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* RIGHT SIDEBAR: ATTRIBUTES & ACTIONS */}
            <div className="w-80 shrink-0 bg-white border-l border-slate-200 flex flex-col shadow-[-10px_0_20px_rgba(0,0,0,0.02)] z-10 relative">
              <div className="p-6 border-b border-slate-100 flex items-center gap-2">
                <Settings size={16} className="text-blue-600" />
                <h3 className="text-[13px] font-[900] text-slate-800 uppercase tracking-widest">Question Attributes</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-slate-500">Department</label>
                  <div className="relative">
                    <select name="department" value={formData.department} onChange={handleInputChange} className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl pl-4 pr-10 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer">
                      <option value="">-- No Department --</option>
                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-slate-500">Subject</label>
                  <div className="relative">
                    <select name="subject" value={formData.subject} onChange={handleInputChange} className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl pl-4 pr-10 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer">
                      <option value="">-- No Subject --</option>
                      {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-slate-500">Topic</label>
                  <div className="relative">
                    <select name="topic" value={formData.topic} onChange={handleInputChange} className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl pl-4 pr-10 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer">
                      <option value="">-- No Topic --</option>
                      {topics.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-slate-500">Year</label>
                  <div className="relative">
                    <select name="year" value={formData.year} onChange={handleInputChange} className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl pl-4 pr-10 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer">
                      <option value="">-- No Year --</option>
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-slate-500">Mark</label>
                  <div className="relative">
                    <select name="mark" value={formData.mark} onChange={handleInputChange} className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl pl-4 pr-10 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer">
                      {marks.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-slate-500">Difficulty Level</label>
                  <div className="relative">
                    <select name="difficultyLevel" value={formData.difficultyLevel} onChange={handleInputChange} className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl pl-4 pr-10 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer">
                      <option value="">-- No Difficulty Level --</option>
                      {difficulties.map(df => <option key={df} value={df}>{df}</option>)}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-6 border-t border-slate-100 bg-white space-y-3 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
                <button 
                  type="button"
                  onClick={handleSaveAndNext}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm"
                >
                  <ChevronRight size={16} /> Save & Next
                </button>
                <button 
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#059669] hover:bg-emerald-700 text-white font-bold text-sm transition-colors shadow-md shadow-emerald-500/20"
                >
                  <CheckCircle2 size={16} /> Save & Close
                </button>
                <button 
                  type="button"
                  onClick={() => setIsCreatorOpen(false)}
                  className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Close Creator
                </button>
              </div>

            </div>
          </form>
        </div>,
        document.body
      )}

    </div>
  );
}
