import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Plus, Trash2, Edit2, Search, Filter, X, Save, Image as ImageIcon, CheckCircle2, ChevronRight, FileText, Settings, AlignLeft, Bold, Italic, List, Type, MousePointerClick, ChevronDown, ListTodo, Paperclip, Calculator, Eraser, Tag, Check } from 'lucide-react';
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

const SYMBOL_PALETTE = {
  "Basic Math": ["+", "-", "×", "÷", "=", "≠", "≈", "±", "∓", "∞", "√", "∛", "∜", "%", "°", "π", "∝"],
  "Fractions": ["½", "⅓", "⅔", "¼", "¾", "⅕", "⅖", "⅗", "⅘", "⅙", "⅚", "⅛", "⅜", "⅝", "⅞"],
  "Calculus": ["∫", "∬", "∭", "∮", "∯", "∰", "∂", "∇", "lim", "Σ", "∏", "∐", "dx", "dy", "dt", "′", "″", "‴", "⁗"],
  "Algebra & Sets": ["∀", "∃", "∄", "∈", "∉", "⊂", "⊃", "⊆", "⊇", "⊄", "⊅", "∪", "∩", "∅", "ℝ", "ℕ", "ℤ", "ℚ", "ℂ", "ℙ", "ℵ"],
  "Geometry": ["∠", "∡", "∢", "△", "⊥", "∥", "∦", "≅", "∼", "≃", "≄", "∴", "∵", "π", "θ", "α", "β", "γ", "ϕ", "ω"],
  "Greek (Lower)": ["α", "β", "γ", "δ", "ε", "ζ", "η", "θ", "ι", "κ", "λ", "μ", "ν", "ξ", "ο", "π", "ρ", "σ", "τ", "υ", "φ", "χ", "ψ", "ω"],
  "Greek (Upper)": ["Α", "Β", "Γ", "Δ", "Ε", "Ζ", "Η", "Θ", "Ι", "Κ", "Λ", "Μ", "Ν", "Ξ", "Ο", "Π", "Ρ", "Σ", "Τ", "Υ", "Φ", "Χ", "Ψ", "Ω"],
  "Logic & Arrows": ["∧", "∨", "¬", "⇒", "⇐", "⇔", "→", "←", "↔", "↑", "↓", "⊕", "⊗", "⊢", "⊨"],
  "Superscripts": ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹", "⁺", "⁻", "⁼", "⁽", "⁾", "ⁿ"],
  "Subscripts": ["₀", "₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈", "₉", "₊", "₋", "₌", "₍", "₎"],
  "Expressions": ["f(x)", "d/dx", "∫_a^b", "lim_{x→∞}", "lim_{x→0}", "sin(θ)", "cos(θ)", "tan(θ)", "log_{10}(x)", "ln(x)", "e^x", "e^{iπ}", "n!", "P(A∪B)"]
};

export default function QuestionBank() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  
  const [isSymbolPaletteOpen, setIsSymbolPaletteOpen] = useState(false);
  const [palettePos, setPalettePos] = useState({ x: window.innerWidth > 800 ? window.innerWidth - 350 : 20, y: 80 });
  const [isDraggingPalette, setIsDraggingPalette] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingPalette) return;
      setPalettePos({
        x: e.clientX - dragRef.current.startX,
        y: e.clientY - dragRef.current.startY
      });
    };
    const handleMouseUp = () => setIsDraggingPalette(false);
    
    if (isDraggingPalette) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPalette]);

  const insertSymbol = (symbol) => {
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT')) {
      const start = activeEl.selectionStart;
      const end = activeEl.selectionEnd;
      const val = activeEl.value;
      const newVal = val.substring(0, start) + symbol + val.substring(end);
      
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
      const nativeInputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      const setter = activeEl.tagName === 'TEXTAREA' ? nativeInputValueSetter : nativeInputSetter;
      
      if (setter) {
        setter.call(activeEl, newVal);
        const ev = new Event('input', { bubbles: true});
        activeEl.dispatchEvent(ev);
      }
      
      setTimeout(() => {
        activeEl.focus();
        activeEl.selectionStart = activeEl.selectionEnd = start + symbol.length;
      }, 0);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };
  
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
    correctAnswers: [],
    fillBlankAnswer: '',
    fillBlankPrecision: 'None',
    fillBlankMode: 'Exact Match',
    fillBlankRangeStart: '',
    fillBlankRangeEnd: '',
    matchColumn1: ['', ''],
    matchColumn2: ['', ''],
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

  const handleCheckboxChange = (opt) => {
    setFormData(prev => {
      const current = prev.correctAnswers || [];
      if (current.includes(opt)) {
        return { ...prev, correctAnswers: current.filter(o => o !== opt) };
      } else {
        return { ...prev, correctAnswers: [...current, opt] };
      }
    });
  };

  const handleMatchColumn1Change = (index, value) => {
    setFormData(prev => {
      const newCol = [...(prev.matchColumn1 || [])];
      newCol[index] = value;
      return { ...prev, matchColumn1: newCol };
    });
  };

  const handleMatchColumn2Change = (index, value) => {
    setFormData(prev => {
      const newCol = [...(prev.matchColumn2 || [])];
      newCol[index] = value;
      return { ...prev, matchColumn2: newCol };
    });
  };

  const addMatchColumn1Item = () => {
    setFormData(prev => ({ ...prev, matchColumn1: [...(prev.matchColumn1 || []), ''] }));
  };

  const addMatchColumn2Item = () => {
    setFormData(prev => ({ ...prev, matchColumn2: [...(prev.matchColumn2 || []), ''] }));
  };

  const removeMatchColumn1Item = (index) => {
    setFormData(prev => ({ ...prev, matchColumn1: (prev.matchColumn1 || []).filter((_, i) => i !== index) }));
  };

  const removeMatchColumn2Item = (index) => {
    setFormData(prev => ({ ...prev, matchColumn2: (prev.matchColumn2 || []).filter((_, i) => i !== index) }));
  };

  // Generic Image Handler for Base64 (Question or Options)
  const handleImageUpload = (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 1048576) {
      showToast("Image is too large. Please upload an image under 1MB.", "error");
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
    const payload = { ...formData, createdAt: new Date().toISOString() };
    
    // Optimistic UI Update & close instantly
    setIsCreatorOpen(false);
    
    if (isEditing) {
      setQuestions(prev => prev.map(q => q.id === currentId ? { id: currentId, ...payload } : q));
      updateDoc(doc(db, 'question_bank', currentId), payload).then(() => {
        showToast("Question saved successfully", "success");
      }).catch(e => {
        console.error("Failed to update question", e);
        showToast("Failed to save. Changes reverted.", "error");
        fetchQuestions();
      });
    } else {
      const tempId = 'temp-' + Date.now();
      setQuestions(prev => [{ id: tempId, ...payload }, ...prev]);
      addDoc(collection(db, 'question_bank'), payload).then(docRef => {
        setQuestions(prev => prev.map(q => q.id === tempId ? { ...q, id: docRef.id } : q));
        showToast("Question saved successfully", "success");
      }).catch(e => {
        console.error("Failed to add question", e);
        showToast("Failed to save. Changes reverted.", "error");
        fetchQuestions();
      });
    }
  };

  const handleSaveAndNext = async (e) => {
    e.preventDefault();
    const form = e.target.closest('form');
    if (form && !form.checkValidity()) {
      form.reportValidity();
      return;
    }
    
    const payload = { ...formData, createdAt: new Date().toISOString() };
    
    // Reset form instantly
    openAddCreator();
    
    if (isEditing) {
      setQuestions(prev => prev.map(q => q.id === currentId ? { id: currentId, ...payload } : q));
      updateDoc(doc(db, 'question_bank', currentId), payload).then(() => {
        showToast("Question saved successfully. Add next.", "success");
      }).catch(e => {
        console.error("Failed to update question", e);
        showToast("Failed to save. Changes reverted.", "error");
        fetchQuestions();
      });
    } else {
      const tempId = 'temp-' + Date.now();
      setQuestions(prev => [{ id: tempId, ...payload }, ...prev]);
      addDoc(collection(db, 'question_bank'), payload).then(docRef => {
        setQuestions(prev => prev.map(q => q.id === tempId ? { ...q, id: docRef.id } : q));
        showToast("Question saved successfully. Add next.", "success");
      }).catch(e => {
        console.error("Failed to add question", e);
        showToast("Failed to save. Changes reverted.", "error");
        fetchQuestions();
      });
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
      correctAnswers: q.correctAnswers || [],
      fillBlankAnswer: q.fillBlankAnswer || '',
      fillBlankPrecision: q.fillBlankPrecision || 'None',
      fillBlankMode: q.fillBlankMode || 'Exact Match',
      fillBlankRangeStart: q.fillBlankRangeStart || '',
      fillBlankRangeEnd: q.fillBlankRangeEnd || '',
      matchColumn1: q.matchColumn1 || ['', ''],
      matchColumn2: q.matchColumn2 || ['', ''],
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

  const handleDelete = (id) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteDoc(doc(db, 'question_bank', deleteConfirmId));
      setDeleteConfirmId(null);
      showToast("Question deleted successfully", "success");
      fetchQuestions();
    } catch (e) {
      console.error("Failed to delete question", e);
      showToast("Failed to delete question", "error");
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
      correctAnswers: [],
      fillBlankAnswer: '',
      fillBlankPrecision: 'None',
      fillBlankMode: 'Exact Match',
      fillBlankRangeStart: '',
      fillBlankRangeEnd: '',
      matchColumn1: ['', ''],
      matchColumn2: ['', ''],
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
            {filteredQuestions.map((q, i) => {
              const shortType = q.questionType === 'Single Choice' ? 'Single' : 
                                q.questionType === 'Multiple Choice' ? 'Multiple' : 
                                q.questionType === 'Fill in Blanks' ? 'Fill Blank' : 
                                q.questionType === 'Match' ? 'Match' : q.questionType;
              const shortMark = q.mark ? q.mark.split('(')[0].trim() : '1 Mark';
              
              const isExpanded = expandedId === q.id;
              
              return (
                <div key={q.id} className={`bg-white transition-shadow duration-300 ${isExpanded ? 'rounded-[24px] shadow-lg' : 'rounded-full shadow-sm hover:shadow-md'} overflow-hidden group`}>
                  
                  {/* Collapsed / Header View */}
                  <div 
                    onClick={() => setExpandedId(isExpanded ? null : q.id)}
                    className={`py-4 px-6 flex items-center gap-4 cursor-pointer select-none ${isExpanded ? 'bg-slate-50/50 border-b border-slate-100' : ''}`}
                  >
                    <ChevronRight size={18} className={`shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-90 text-[#7c3aed]' : 'text-slate-300'}`} />
                    
                    <span className="bg-[#7c3aed] text-white px-4 py-1 rounded-full text-[12px] font-[800] whitespace-nowrap tracking-wide shrink-0">
                      {shortType}
                    </span>
                    
                    <span className="bg-white border-[1.5px] border-slate-200 text-[#111827] px-3 py-1 rounded-full text-[12px] font-[900] whitespace-nowrap shrink-0 shadow-sm">
                      {shortMark}
                    </span>
                    
                    <div className="w-px h-5 bg-slate-200 mx-1 shrink-0"></div>
                    
                    <span className={`flex-1 truncate text-[14px] font-[800] pr-4 transition-colors ${isExpanded ? 'text-[#7c3aed]' : 'text-[#111827]'}`}>
                      {q.questionText}
                    </span>
                    
                    <div className={`flex gap-4 shrink-0 transition-opacity ${isExpanded ? 'opacity-100' : 'opacity-50 group-hover:opacity-100'}`}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleEdit(q); }}
                        className="text-slate-400 hover:text-blue-600 transition-colors"
                        title="Edit Question"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(q.id); }}
                        className="text-slate-400 hover:text-red-600 transition-colors"
                        title="Delete Question"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="p-6 md:p-8 animate-in slide-in-from-top-2 fade-in duration-200">
                      
                      {/* Full Question Text */}
                      <div className="mb-8">
                        <p className="text-[15px] font-[800] text-[#111827] leading-relaxed whitespace-pre-wrap mb-4">
                          {q.questionText}
                        </p>
                        {q.questionImageUrl && (
                          <div className="rounded-[16px] border-[1.5px] border-slate-200 p-2 max-w-xl bg-white shadow-sm">
                            <img src={q.questionImageUrl} alt="Question" className="w-full h-auto rounded-[10px]" />
                          </div>
                        )}
                      </div>

                      {/* Options or Match Content based on type */}
                      {q.questionType === 'Match' ? (
                        <div className="grid grid-cols-2 gap-6 mb-8 bg-slate-50 rounded-2xl p-6 border border-slate-200">
                          <div className="flex flex-col gap-3">
                            <h4 className="text-[12px] font-[900] text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-2">Column 1</h4>
                            {(q.matchColumn1 || []).map((item, idx) => (
                              <div key={`col1-${idx}`} className="bg-white border border-slate-200 rounded-xl p-3 text-[14px] font-[700] text-[#111827] shadow-sm min-h-[46px] flex items-center">
                                {item || <span className="text-slate-300 italic">Empty</span>}
                              </div>
                            ))}
                          </div>
                          <div className="flex flex-col gap-3">
                            <h4 className="text-[12px] font-[900] text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-2">Column 2</h4>
                            {(q.matchColumn2 || []).map((item, idx) => (
                              <div key={`col2-${idx}`} className="bg-white border border-slate-200 rounded-xl p-3 text-[14px] font-[700] text-[#111827] shadow-sm min-h-[46px] flex items-center">
                                {item || <span className="text-slate-300 italic">Empty</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : q.questionType === 'Fill in Blanks' ? (
                        <div className="mb-8 p-5 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-start gap-3">
                          <CheckCircle2 size={20} className="text-emerald-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[12px] font-[900] text-emerald-600 uppercase tracking-wider mb-1">Accepted Answer</p>
                            <p className="text-[15px] font-[800] text-emerald-900">{q.fillBlankAnswer || 'Not set'}</p>
                            {q.fillBlankPrecision && q.fillBlankPrecision !== 'None' && (
                              <p className="text-[13px] font-[600] text-emerald-700 mt-2 flex items-center gap-2">
                                <span className="bg-emerald-200/50 px-2 py-0.5 rounded text-emerald-800">Precision: {q.fillBlankPrecision}</span>
                                {q.fillBlankMode === 'Range' ? `(Range: ${q.fillBlankRangeStart} - ${q.fillBlankRangeEnd})` : `(Mode: ${q.fillBlankMode})`}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                          {['A', 'B', 'C', 'D'].map(opt => {
                            const isCorrect = q.questionType === 'Multiple Choice' 
                              ? (q.correctAnswers || []).includes(opt) 
                              : q.correctAnswer === opt;
                            
                            const optText = q[`option${opt}`];
                            const optImg = q[`option${opt}Image`];
                            
                            if (!optText && !optImg) return null;

                            return (
                              <div key={opt} className={`flex items-start gap-4 p-4 rounded-[16px] border-[1.5px] ${isCorrect ? 'bg-emerald-50 border-emerald-300 shadow-sm' : 'bg-white border-slate-200'} transition-all`}>
                                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-[900] ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                  {opt}
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-center gap-3 min-h-[32px]">
                                  {optText && (
                                    <p className={`text-[14px] font-[700] ${isCorrect ? 'text-emerald-900' : 'text-[#111827]'}`}>{optText}</p>
                                  )}
                                  {optImg && (
                                    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white max-w-[200px]">
                                      <img src={optImg} alt={`Option ${opt}`} className="w-full h-auto" />
                                    </div>
                                  )}
                                </div>
                                {isCorrect && (
                                  <div className="shrink-0 text-emerald-500 flex items-center h-8">
                                    <Check size={20} />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Explanation */}
                      <div className="bg-[#f8fafc] rounded-xl p-5 mb-6">
                        <h4 className="text-[11px] font-[900] text-slate-400 uppercase tracking-widest mb-2">Explanation</h4>
                        {q.explanation ? (
                          <p className="text-[14px] font-[600] text-slate-700 leading-relaxed">{q.explanation}</p>
                        ) : (
                          <p className="text-[14px] font-[500] text-slate-400 italic">No explanation given</p>
                        )}
                      </div>

                      {/* Tags Footer */}
                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        {q.department && (
                          <div className="flex items-center gap-2 bg-slate-50 text-slate-600 px-3 py-1.5 rounded-full text-[12px] font-[700]">
                            <Tag size={12} className="text-slate-400" />
                            Department: {q.department}
                          </div>
                        )}
                        {q.subject && (
                          <div className="flex items-center gap-2 bg-slate-50 text-slate-600 px-3 py-1.5 rounded-full text-[12px] font-[700]">
                            <Tag size={12} className="text-slate-400" />
                            Subject: {q.subject}
                          </div>
                        )}
                        {q.topic && (
                          <div className="flex items-center gap-2 bg-slate-50 text-slate-600 px-3 py-1.5 rounded-full text-[12px] font-[700]">
                            <Tag size={12} className="text-slate-400" />
                            Topic: {q.topic}
                          </div>
                        )}
                        {q.difficultyLevel && (
                          <div className="flex items-center gap-2 bg-slate-50 text-slate-600 px-3 py-1.5 rounded-full text-[12px] font-[700]">
                            <Tag size={12} className="text-slate-400" />
                            Difficulty: {q.difficultyLevel}
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FULL-SCREEN STANDALONE QUESTION CREATOR */}
      {isCreatorOpen && createPortal(
        <div className="fixed inset-0 bg-[#f4f7fb] z-[99999] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          {/* TOP BAR */}
          <div className="h-[60px] bg-white px-6 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-lg">
                <BookOpen size={16} className="text-indigo-600" />
                <span className="font-[800] text-indigo-900 text-[13px] tracking-wide">Standalone Question Creator</span>
              </div>
              <div className="bg-slate-100 px-3 py-1 rounded-full text-[12px] font-[700] text-slate-500">
                1 Saved
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                type="button" 
                onClick={() => setIsSymbolPaletteOpen(!isSymbolPaletteOpen)}
                className={`p-2 rounded-lg transition-colors shadow-sm ${isSymbolPaletteOpen ? 'bg-[#5b32ea] text-white' : 'text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200'}`}
              >
                <Calculator size={18} />
              </button>
              <div className="w-px h-5 bg-slate-200"></div>
              <button 
                type="button"
                onClick={() => setIsCreatorOpen(false)}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-[800] text-[14px] transition-colors"
              >
                <X size={16} /> Done
              </button>
            </div>
          </div>

          {/* SECOND TOOLBAR */}
          <div className="h-[60px] bg-white border-b border-slate-100 px-6 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-[13px] font-[900] text-[#111827]">Questions:</span>
              <div className="w-7 h-7 rounded-full bg-[#059669] text-white flex items-center justify-center font-[800] text-[13px] shadow-sm">1</div>
            </div>
            <button type="button" className="flex items-center gap-1.5 text-[#059669] hover:text-emerald-700 font-[800] text-[13px] bg-white hover:bg-emerald-50 px-4 py-2 rounded-full transition-colors border-[1.5px] border-[#059669]">
              <Plus size={16} /> Add Question
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex overflow-hidden">
            
            {/* LEFT / CENTER SCROLLABLE AREA */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 lg:p-8 flex flex-col xl:flex-row gap-8 bg-[#fcfcfd]">
              
              {/* LEFT COLUMN: QUESTION CONTENT */}
              <div className="flex-1 min-w-0 flex flex-col gap-6 max-w-4xl xl:max-w-none xl:border-r-[4px] xl:border-slate-200/60 xl:pr-8">
                
                {/* Header info */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100">
                  <div className="relative">
                    <select 
                      name="questionType"
                      value={formData.questionType}
                      onChange={handleInputChange}
                      className="appearance-none bg-white border-[1.5px] border-slate-200 text-[#111827] font-[900] text-[13px] rounded-full pl-5 pr-10 py-2.5 outline-none shadow-sm cursor-pointer hover:border-slate-300"
                    >
                      <option value="Single Choice">Single Choice</option>
                      <option value="Multiple Choice">Multiple Choice</option>
                      <option value="Fill in Blanks">Fill in Blanks</option>
                      <option value="Match">Match (Column 1 ≤ Column 2)</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                    <span className="text-[13px] font-[900] text-[#111827] whitespace-nowrap">Marks:</span>
                    <button type="button" onClick={() => setFormData({...formData, mark: '1 Mark (-0.33)'})} className={`whitespace-nowrap px-4 sm:px-5 py-2 text-[13px] font-[800] rounded-full transition-colors ${formData.mark === '1 Mark (-0.33)' ? 'border-[1.5px] border-blue-600 text-blue-600 bg-white shadow-sm' : 'text-slate-500'}`}>1 Mark (-0.33)</button>
                    <button type="button" onClick={() => setFormData({...formData, mark: '2 Mark (-0.66)'})} className={`whitespace-nowrap px-4 sm:px-5 py-2 text-[13px] font-[800] rounded-full transition-colors ${formData.mark === '2 Mark (-0.66)' ? 'border-[1.5px] border-blue-600 text-blue-600 bg-white shadow-sm' : 'text-slate-500'}`}>2 Mark (-0.66)</button>
                    <span className="bg-red-50 border-[1.5px] border-red-200 text-red-600 text-[13px] font-[900] px-3 sm:px-4 py-2 rounded-full flex items-center gap-1.5 sm:gap-2 ml-1 sm:ml-2 shadow-sm whitespace-nowrap">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></div> Neg: {formData.mark.includes('2') ? '-0.66' : '-0.33'}
                    </span>
                  </div>
                </div>

                {/* Question Text Editor */}
                <div className="flex flex-col gap-3">
                  <label className="text-[15px] font-[900] text-[#111827]">Question Text <span className="text-red-500">*</span></label>
                  <div className="bg-white border-[1.5px] border-slate-200 rounded-[20px] overflow-hidden flex flex-col shadow-sm">
                    {/* Rich text toolbar */}
                    <div className="h-14 border-b border-slate-100 flex items-center px-4 gap-2">
                      <button type="button" className="p-2 text-[#111827] hover:bg-slate-50 rounded-lg"><Bold size={16}/></button>
                      <button type="button" className="p-2 text-[#111827] hover:bg-slate-50 rounded-lg"><Italic size={16}/></button>
                      <button type="button" className="p-2 text-[#111827] hover:bg-slate-50 rounded-lg font-serif text-[15px] font-bold">x²</button>
                      <button type="button" className="p-2 text-[#111827] hover:bg-slate-50 rounded-lg font-serif text-[15px] font-bold">x₂</button>
                      <div className="w-px h-5 bg-slate-200 mx-2"></div>
                      <button type="button" className="p-2 text-[#111827] hover:bg-slate-50 rounded-lg"><List size={16}/></button>
                      <button type="button" className="p-2 text-[#111827] hover:bg-slate-50 rounded-lg"><ListTodo size={16}/></button>
                      <div className="ml-auto flex">
                         <button type="button" className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg"><Eraser size={16}/></button>
                      </div>
                    </div>
                    <textarea 
                      name="questionText"
                      required
                      value={formData.questionText}
                      onChange={handleInputChange}
                      className="w-full p-6 h-48 resize-none outline-none text-[16px] font-[500] text-[#111827] placeholder-slate-300"
                      placeholder="Match the following:"
                    ></textarea>
                  </div>
                </div>

                {/* MATCH BUILDER (LEFT COLUMN) */}
                {formData.questionType === 'Match' && (
                  <div className="flex flex-col gap-2 mt-4">
                    <div className="bg-white border-[1.5px] border-slate-200 rounded-[24px] p-6 flex flex-col shadow-sm">
                      <div className="flex gap-6">
                        
                        {/* Column 1 */}
                        <div className="flex-1 min-w-0 flex flex-col gap-4">
                          <h4 className="text-[13px] font-[900] text-[#111827] border-b border-slate-100 pb-3">Column 1</h4>
                          
                          {(formData.matchColumn1 || []).map((item, idx) => (
                            <div key={idx} className="flex items-start gap-3">
                              <div className="w-8 h-8 shrink-0 rounded-full bg-blue-50 text-indigo-600 flex items-center justify-center font-[900] text-[13px] mt-2">
                                {String.fromCharCode(97 + idx)}
                              </div>
                              <textarea 
                                value={item}
                                onChange={(e) => handleMatchColumn1Change(idx, e.target.value)}
                                className={`flex-1 w-full bg-white border-[1.5px] ${idx === 0 ? 'border-indigo-400' : 'border-slate-200'} rounded-[16px] p-4 text-[15px] font-[600] text-[#111827] outline-none focus:border-indigo-400 transition-colors shadow-sm min-h-[100px] resize-none`}
                              />
                              <button type="button" onClick={() => removeMatchColumn1Item(idx)} className="text-slate-300 hover:text-red-500 transition-colors mt-4 shrink-0">
                                <Trash2 size={18} />
                              </button>
                            </div>
                          ))}
                          
                          <button type="button" onClick={addMatchColumn1Item} className="w-full py-3 mt-2 border-[1.5px] border-dashed border-slate-300 text-[13px] font-[800] text-[#111827] rounded-full hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                            <Plus size={14} /> Add Column 1 Item
                          </button>
                        </div>

                        {/* Column 2 */}
                        <div className="flex-1 min-w-0 flex flex-col gap-4">
                          <h4 className="text-[13px] font-[900] text-[#111827] border-b border-slate-100 pb-3">Column 2</h4>
                          
                          {(formData.matchColumn2 || []).map((item, idx) => (
                            <div key={idx} className="flex items-start gap-3">
                              <div className="w-8 h-8 shrink-0 rounded-full bg-blue-50 text-indigo-600 flex items-center justify-center font-[900] text-[13px] mt-2">
                                {idx + 1}
                              </div>
                              <textarea 
                                value={item}
                                onChange={(e) => handleMatchColumn2Change(idx, e.target.value)}
                                className="flex-1 w-full bg-white border-[1.5px] border-slate-200 rounded-[16px] p-4 text-[15px] font-[600] text-[#111827] outline-none focus:border-indigo-400 transition-colors shadow-sm min-h-[100px] resize-none"
                              />
                              <button type="button" onClick={() => removeMatchColumn2Item(idx)} className="text-slate-300 hover:text-red-500 transition-colors mt-4 shrink-0">
                                <Trash2 size={18} />
                              </button>
                            </div>
                          ))}

                          <button type="button" onClick={addMatchColumn2Item} className="w-full py-3 mt-2 border-[1.5px] border-dashed border-slate-300 text-[13px] font-[800] text-[#111827] rounded-full hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                            <Plus size={14} /> Add Column 2 Item
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Question Image (Optional) */}
                <div className="flex flex-col gap-3 mt-6">
                  <label className="text-[13px] font-[900] text-slate-500 uppercase tracking-widest">Question Image (Optional)</label>
                  {formData.questionImageUrl ? (
                    <div className="relative bg-slate-50 rounded-[20px] border-[1.5px] border-slate-200 p-2 w-fit">
                      <img src={formData.questionImageUrl} alt="Question" className="max-h-40 rounded-xl" />
                      <button type="button" onClick={() => removeImage('questionImageUrl')} className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:bg-red-600">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <label className="border-[1.5px] border-dashed border-slate-300 hover:border-blue-400 bg-white rounded-full py-5 flex items-center justify-center gap-3 cursor-pointer transition-colors shadow-sm group">
                      <ImageIcon size={18} className="text-[#111827]" />
                      <span className="text-[14px] font-[900] text-[#111827]">Upload, Paste or Drop Image</span>
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'questionImageUrl')} />
                    </label>
                  )}
                </div>

                {/* Explanation Editor */}
                <div className="flex flex-col gap-3 mt-6">
                  <label className="text-[15px] font-[900] text-[#111827]">Explanation <span className="text-slate-500 text-[14px] font-[700]">(shown after test)</span></label>
                  <div className="bg-white border-[1.5px] border-slate-200 rounded-[20px] overflow-hidden flex flex-col shadow-sm">
                    <div className="h-14 border-b border-slate-100 flex items-center px-4 gap-2">
                      <button type="button" className="p-2 text-[#111827] hover:bg-slate-50 rounded-lg"><Bold size={16}/></button>
                      <button type="button" className="p-2 text-[#111827] hover:bg-slate-50 rounded-lg"><Italic size={16}/></button>
                      <button type="button" className="p-2 text-[#111827] hover:bg-slate-50 rounded-lg font-serif text-[15px] font-bold">x²</button>
                      <button type="button" className="p-2 text-[#111827] hover:bg-slate-50 rounded-lg font-serif text-[15px] font-bold">x₂</button>
                      <div className="w-px h-5 bg-slate-200 mx-2"></div>
                      <button type="button" className="p-2 text-[#111827] hover:bg-slate-50 rounded-lg"><List size={16}/></button>
                      <button type="button" className="p-2 text-[#111827] hover:bg-slate-50 rounded-lg"><ListTodo size={16}/></button>
                      <div className="ml-auto flex">
                         <button type="button" className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg"><Eraser size={16}/></button>
                      </div>
                    </div>
                    <textarea 
                      name="explanation"
                      value={formData.explanation}
                      onChange={handleInputChange}
                      className="w-full p-6 h-32 resize-none outline-none text-[16px] font-[500] text-[#111827] placeholder-slate-300"
                    ></textarea>
                  </div>
                </div>

              </div>

              {/* CENTER COLUMN: ANSWER OPTIONS */}
              <div className="w-full xl:w-[450px] shrink-0 flex flex-col bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden h-fit xl:h-full">
                
                <div className="p-6 border-b border-slate-100 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center">
                    <List size={22} />
                  </div>
                  <h3 className="text-[19px] font-[900] text-[#111827] tracking-tight">Answer Options</h3>
                </div>

                <div className="p-6 flex flex-col gap-4 overflow-y-auto flex-1 bg-white">
                  
                  {/* SINGLE CHOICE & MULTIPLE CHOICE & MATCH */}
                  {(formData.questionType === 'Single Choice' || formData.questionType === 'Multiple Choice' || formData.questionType === 'Match') && (
                    <>
                      <p className="text-[14px] font-[600] text-slate-500 mb-2">
                        {formData.questionType === 'Single Choice' || formData.questionType === 'Match' ? 'Select the correct answer' : 'Select all correct answers'}
                      </p>

                      {optionsList.map(opt => {
                        const isChecked = formData.questionType === 'Single Choice' 
                          ? formData.correctAnswer === opt
                          : (formData.correctAnswers || []).includes(opt);

                        return (
                          <div key={opt} className={`relative flex flex-col bg-white border-[1.5px] rounded-[24px] transition-all p-3 ${isChecked ? 'border-[#059669]' : 'border-slate-200'}`}>
                            
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 shrink-0 rounded-full font-[900] text-[15px] flex items-center justify-center transition-colors ${isChecked ? 'bg-[#059669] text-white' : 'bg-slate-100 text-slate-700'}`}>
                                {opt}
                              </div>
                              
                              <div className="flex-1">
                                <input 
                                  type="text"
                                  name={`option${opt}`}
                                  value={formData[`option${opt}`]}
                                  onChange={handleInputChange}
                                  placeholder={`Option ${opt}`}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-[15px] font-[700] text-slate-800 placeholder-slate-400 outline-none focus:border-slate-300 transition-colors"
                                />
                              </div>

                              {isChecked && (
                                <div className="px-3 py-1.5 rounded-full bg-emerald-50 text-[#059669] font-[800] text-[13px]">
                                  Correct
                                </div>
                              )}
                              
                              <label className="cursor-pointer shrink-0 ml-1">
                                {(formData.questionType === 'Single Choice' || formData.questionType === 'Match') ? (
                                  <>
                                    <input type="radio" name="correctAnswer" value={opt} checked={isChecked} onChange={handleInputChange} className="hidden" />
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${isChecked ? 'bg-[#059669]' : 'border-[2px] border-slate-200 bg-slate-50 hover:bg-slate-100'}`}>
                                      {isChecked && <CheckCircle2 size={18} className="text-white" />}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <input type="checkbox" checked={isChecked} onChange={() => handleCheckboxChange(opt)} className="hidden" />
                                    <div className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${isChecked ? 'bg-[#059669]' : 'border-[2px] border-slate-200 bg-slate-50 hover:bg-slate-100'}`}>
                                      {isChecked && <CheckCircle2 size={18} className="text-white" />}
                                    </div>
                                  </>
                                )}
                              </label>
                            </div>

                            <div className="flex items-center justify-end px-12 pt-2">
                              {formData[`option${opt}Image`] ? (
                                  <div className="relative group w-fit">
                                    <img src={formData[`option${opt}Image`]} alt={`Option ${opt}`} className="max-h-20 rounded-lg shadow-sm border border-slate-200" />
                                    <button type="button" onClick={() => removeImage(`option${opt}Image`)} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                                      <X size={12} />
                                    </button>
                                  </div>
                              ) : (
                                  <label className="flex items-center gap-1.5 text-[11px] font-[800] text-slate-400 hover:text-blue-600 cursor-pointer transition-colors">
                                    <ImageIcon size={14} /> ADD IMAGE
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, `option${opt}Image`)} />
                                  </label>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}

                  {/* FILL IN BLANKS / NAT */}
                  {formData.questionType === 'Fill in Blanks' && (
                    <div className="flex flex-col gap-6">
                      
                      {/* Decimal Precision */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <label className="text-[13px] font-[900] text-slate-800">Decimal Precision</label>
                          <span className="text-[12px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">(numeric check)</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-1 flex items-center">
                          {['None', '.00', '.000', '.0000'].map(prec => (
                            <button
                              key={prec}
                              type="button"
                              onClick={() => setFormData({...formData, fillBlankPrecision: prec})}
                              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${formData.fillBlankPrecision === prec ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
                            >
                              {prec}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Answer Matching Mode */}
                      <div className="flex flex-col gap-2">
                        <label className="text-[13px] font-[900] text-slate-800">Answer Matching Mode</label>
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-1 flex items-center">
                          {['Exact Match', 'Numeric Range'].map(mode => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => setFormData({...formData, fillBlankMode: mode})}
                              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${formData.fillBlankMode === mode ? 'bg-white border-2 border-blue-600 text-slate-900 shadow-sm ring-4 ring-blue-500/10' : 'text-slate-500 border-2 border-transparent hover:text-slate-700 hover:bg-slate-100/50'}`}
                            >
                              {mode}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="w-full h-px bg-slate-100 my-2"></div>

                      {/* Value Input */}
                      {formData.fillBlankMode === 'Exact Match' ? (
                        <div className="flex flex-col gap-2">
                          <label className="text-[13px] font-[900] text-slate-800">Exact Answer Value <span className="text-red-500">*</span></label>
                          <input 
                            type="text"
                            name="fillBlankAnswer"
                            value={formData.fillBlankAnswer || ''}
                            onChange={handleInputChange}
                            placeholder="e.g. 2"
                            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-[15px] font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <label className="text-[13px] font-[900] text-slate-800">Numeric Range <span className="text-red-500">*</span></label>
                          <div className="flex items-center gap-3">
                            <input 
                              type="text"
                              name="fillBlankRangeStart"
                              value={formData.fillBlankRangeStart || ''}
                              onChange={handleInputChange}
                              placeholder="Min (e.g. 1.9)"
                              className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-3 text-[15px] font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                            />
                            <span className="text-slate-400 font-bold">to</span>
                            <input 
                              type="text"
                              name="fillBlankRangeEnd"
                              value={formData.fillBlankRangeEnd || ''}
                              onChange={handleInputChange}
                              placeholder="Max (e.g. 2.1)"
                              className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-3 text-[15px] font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                            />
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                </div>
              </div>

            </div>

            {/* RIGHT SIDEBAR: ATTRIBUTES & ACTIONS */}
            <div className="w-80 shrink-0 bg-[#f8fafc] border-l border-slate-200 flex flex-col z-10 relative">
              <div className="p-6 pb-2 flex items-center gap-2">
                <Tag size={16} className="text-indigo-600" />
                <h3 className="text-[13px] font-[900] text-[#111827] uppercase tracking-wider">Question Attributes</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                
                <div className="space-y-1.5">
                  <label className="text-[12px] font-[800] text-[#111827]">Department</label>
                  <div className="relative">
                    <select name="department" value={formData.department} onChange={handleInputChange} className="w-full appearance-none bg-white border border-slate-200 text-slate-500 text-[13px] font-[600] rounded-xl pl-4 pr-10 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:border-slate-300 transition-colors shadow-sm">
                      <option value="">-- No Department --</option>
                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-[800] text-[#111827]">Subject</label>
                  <div className="relative">
                    <select name="subject" value={formData.subject} onChange={handleInputChange} className="w-full appearance-none bg-white border border-slate-200 text-slate-500 text-[13px] font-[600] rounded-xl pl-4 pr-10 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:border-slate-300 transition-colors shadow-sm">
                      <option value="">-- No Subject --</option>
                      {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-[800] text-[#111827]">Topic</label>
                  <div className="relative">
                    <select name="topic" value={formData.topic} onChange={handleInputChange} className="w-full appearance-none bg-white border border-slate-200 text-slate-500 text-[13px] font-[600] rounded-xl pl-4 pr-10 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:border-slate-300 transition-colors shadow-sm">
                      <option value="">-- No Topic --</option>
                      {topics.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-[800] text-[#111827]">Year</label>
                  <div className="relative">
                    <select name="year" value={formData.year} onChange={handleInputChange} className="w-full appearance-none bg-white border border-slate-200 text-slate-500 text-[13px] font-[600] rounded-xl pl-4 pr-10 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:border-slate-300 transition-colors shadow-sm">
                      <option value="">-- No Year --</option>
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-[800] text-[#111827]">Mark</label>
                  <div className="relative">
                    <select name="mark" value={formData.mark} onChange={handleInputChange} className="w-full appearance-none bg-white border border-slate-200 text-slate-500 text-[13px] font-[600] rounded-xl pl-4 pr-10 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:border-slate-300 transition-colors shadow-sm">
                      {marks.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-[800] text-[#111827]">Difficulty Level</label>
                  <div className="relative">
                    <select name="difficultyLevel" value={formData.difficultyLevel} onChange={handleInputChange} className="w-full appearance-none bg-white border border-slate-200 text-slate-500 text-[13px] font-[600] rounded-xl pl-4 pr-10 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:border-slate-300 transition-colors shadow-sm">
                      <option value="">-- No Difficulty Level --</option>
                      {difficulties.map(df => <option key={df} value={df}>{df}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-6 bg-[#f8fafc] space-y-4">
                <button 
                  type="button"
                  onClick={handleSaveAndNext}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-white border border-slate-200 text-[#111827] font-[800] text-[13px] hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm"
                >
                  <ChevronRight size={16} /> Save & Next
                </button>
                <button 
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-[#059669] hover:bg-emerald-700 text-white font-[800] text-[13px] transition-colors shadow-md shadow-emerald-500/20"
                >
                  <Check size={16} /> Save & Close
                </button>
                <button 
                  type="button"
                  onClick={() => setIsCreatorOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-2 text-[12px] font-[800] text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={14} /> Close Creator
                </button>
              </div>

            </div>
          </form>

          {/* SYMBOL PALETTE */}
          {isSymbolPaletteOpen && (
            <div 
              style={{ left: Math.max(0, Math.min(window.innerWidth - 300, palettePos.x)), top: Math.max(0, Math.min(window.innerHeight - 400, palettePos.y)) }}
              className="fixed w-[320px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-[999999] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
            >
              <div 
                className="flex items-center justify-between px-4 py-3 bg-slate-50/80 backdrop-blur-sm border-b border-slate-100 cursor-move"
                onMouseDown={(e) => {
                  setIsDraggingPalette(true);
                  dragRef.current = { startX: e.clientX - palettePos.x, startY: e.clientY - palettePos.y };
                }}
              >
                <div className="flex items-center gap-2 pointer-events-none">
                  <Calculator size={16} className="text-[#5b32ea]" />
                  <div>
                    <h3 className="text-[13px] font-[800] text-slate-800 leading-none mb-0.5">Symbol Palette</h3>
                    <p className="text-[10px] font-[600] text-slate-500 leading-none">Hold & drag title bar to move</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsSymbolPaletteOpen(false)}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              
              <div className="p-4 max-h-[420px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full bg-white">
                {Object.entries(SYMBOL_PALETTE).map(([category, symbols]) => (
                  <div key={category} className="mb-6 last:mb-0">
                    <h4 className="text-[11px] font-[800] text-slate-400 uppercase tracking-widest mb-3">{category}</h4>
                    <div className="flex flex-wrap gap-2">
                      {symbols.map((sym, i) => (
                        <button
                          key={i}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()} // Prevent taking focus away from input
                          onClick={() => insertSymbol(sym)}
                          className="h-10 min-w-[40px] px-2 flex items-center justify-center text-[16px] font-[600] text-slate-800 bg-white hover:bg-[#5b32ea]/10 hover:text-[#5b32ea] rounded-xl transition-all shadow-sm border border-slate-100 hover:border-[#5b32ea]/20 whitespace-nowrap"
                        >
                          {sym}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="py-2 text-center border-t border-slate-50 mt-4">
                  <span className="text-[11px] font-[600] text-slate-400">Scroll for more ↓</span>
                </div>
              </div>
            </div>
          )}

        </div>,
        document.body

      )}

      {/* Toast Notification */}
      {toast.show && createPortal(
        <div className="fixed bottom-6 right-6 z-[999999] animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border ${toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
            {toast.type === 'error' ? <X size={20} className="text-red-500" /> : <CheckCircle2 size={20} className="text-emerald-500" />}
            <span className="text-[14px] font-[800]">{toast.message}</span>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 pb-4">
              <h3 className="text-[18px] font-[900] text-slate-800 mb-2">Delete Question</h3>
              <p className="text-[14px] font-[500] text-slate-500 leading-relaxed">
                Are you sure you want to delete this question? This action cannot be undone.
              </p>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-[13px] font-[800] text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="px-5 py-2 text-[13px] font-[800] bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm shadow-red-500/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
