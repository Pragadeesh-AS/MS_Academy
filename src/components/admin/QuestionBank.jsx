import { Eye, LayoutList, Bookmark, Clock, AlertCircle, Trophy, Star, Layers } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import Loader from '../Loader';
import { createPortal } from 'react-dom';
import { BookOpen, Plus, Trash2, Edit2, Search, Filter, X, Save, Image as ImageIcon, CheckCircle2, ChevronRight, FileText, Settings, AlignLeft, Bold, Italic, List, Type, MousePointerClick, ChevronDown, ListTodo, Paperclip, Calculator, Eraser, Tag, Check, Sparkles, Circle } from 'lucide-react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

const stripHtmlAndNormalize = (html) => {
  if (!html) return '';
  // Strip HTML tags and replace multiple spaces/newlines with a single space
  return html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
};

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

const RichTextEditor = ({ value, onChange, name, className, placeholder }) => {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = (e) => {
    if (onChange) {
      onChange({ target: { name, value: e.currentTarget.innerHTML } });
    }
  };

  return (
    <div
      ref={editorRef}
      contentEditable
      onInput={handleInput}
      className={className + " overflow-y-auto cursor-text empty:before:content-[attr(data-placeholder)] empty:before:text-slate-300"}
      data-placeholder={placeholder}
      suppressContentEditableWarning={true}
    />
  );
};

export default function QuestionBank({ externalFilter = null, isPremiumView = false }) {
  const userRole = localStorage.getItem('auth_role') || 'admin';
  const pairRole = localStorage.getItem('pair_role') || null;
  const pairId = localStorage.getItem('pair_id') || null;
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
    } else if (activeEl && activeEl.isContentEditable) {
      document.execCommand('insertText', false, symbol);
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
  const [filterStatus, setFilterStatus] = useState(externalFilter || 'Approved');

  useEffect(() => {
    if (externalFilter !== null) {
      setFilterStatus(externalFilter);
    }
  }, [externalFilter]);

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
    difficultyLevel: '',
    status: 'Approved', // Default for Admin/Teacher. Typists will override this.
    typedBy: '',
    reviewedBy: ''
  });

  const [attributes, setAttributes] = useState([]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const qSnapshot = await getDocs(collection(db, 'question_bank'));
      let qData = qSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Deduplication Logic
      const seen = new Set();
      const duplicateIds = [];

      qData.forEach(q => {
        // Create a unique hash for the question based on text and image, ignoring HTML and whitespace differences
        const hash = `${stripHtmlAndNormalize(q.questionText)}_${q.questionImageUrl || ''}`;
        
        // If hash is just '_', it means both text and image are empty. 
        // We might not want to deduplicate completely empty shells aggressively unless they are truly duplicates.
        // But let's include them in deduplication if there are multiple empty ones.
        if (seen.has(hash)) {
          duplicateIds.push(q.id);
        } else {
          seen.add(hash);
        }
      });

      if (duplicateIds.length > 0) {
        console.log(`Found ${duplicateIds.length} duplicate questions. Deleting...`);
        // Delete duplicates from Firestore
        for (const id of duplicateIds) {
          try {
            await deleteDoc(doc(db, 'question_bank', id));
          } catch (err) {
            console.error("Failed to delete duplicate doc", id, err);
          }
        }
        // Remove duplicates from local state
        qData = qData.filter(q => !duplicateIds.includes(q.id));
      }

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

  const departments = [
    'Computer Science (CSE)',
    'Electronics (ECE)',
    'Mechanical (ME)',
    'Civil (CE)',
    'Electrical (EE)',
    'Data Science (DS)',
    'All Departments'
  ];
  
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

  const handleSubmit = async (e, forcedStatus = null) => {
    e.preventDefault();
    const form = e.target.closest('form');
    if (form && !form.checkValidity()) {
      form.reportValidity();
      return;
    }
    
    // Duplicate Check
    const payloadHash = `${stripHtmlAndNormalize(formData.questionText)}_${formData.questionImageUrl || ''}`;
    if (payloadHash !== '_') {
      const isDuplicate = questions.some(q => {
        if (isEditing && q.id === currentId) return false;
        const qHash = `${stripHtmlAndNormalize(q.questionText)}_${q.questionImageUrl || ''}`;
        return qHash === payloadHash;
      });
      if (isDuplicate) {
        showToast("Duplicate Entry: This question already exists in the question bank.", "error");
        return;
      }
    }
    
    const finalStatus = forcedStatus || formData.status || 'Approved';
    const authName = localStorage.getItem('auth_name') || 'Unknown';
    let payload = { ...formData, status: finalStatus, createdAt: formData.createdAt || new Date().toISOString() };
    
    if (!isEditing) payload.typedBy = authName;
    if (finalStatus === 'Approved' && (!formData.reviewedBy || formData.status !== 'Approved')) payload.reviewedBy = authName;
    if (pairId) payload.pairId = pairId;
    
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

  const handleSaveAndNext = async (e, forcedStatus = null) => {
    e.preventDefault();
    const form = e.target.closest('form');
    if (form && !form.checkValidity()) {
      form.reportValidity();
      return;
    }
    
    // Duplicate Check
    const payloadHash = `${stripHtmlAndNormalize(formData.questionText)}_${formData.questionImageUrl || ''}`;
    if (payloadHash !== '_') {
      const isDuplicate = questions.some(q => {
        if (isEditing && q.id === currentId) return false;
        const qHash = `${stripHtmlAndNormalize(q.questionText)}_${q.questionImageUrl || ''}`;
        return qHash === payloadHash;
      });
      if (isDuplicate) {
        showToast("Duplicate Entry: This question already exists in the question bank.", "error");
        return;
      }
    }
    
    const finalStatus = forcedStatus || formData.status || 'Approved';
    const authName = localStorage.getItem('auth_name') || 'Unknown';
    let payload = { ...formData, status: finalStatus, createdAt: formData.createdAt || new Date().toISOString() };
    
    if (!isEditing) payload.typedBy = authName;
    if (finalStatus === 'Approved' && (!formData.reviewedBy || formData.status !== 'Approved')) payload.reviewedBy = authName;
    if (pairId) payload.pairId = pairId;
    
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
      difficultyLevel: q.difficultyLevel || '',
      status: q.status || 'Approved',
      typedBy: q.typedBy || '',
      reviewedBy: q.reviewedBy || ''
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
      difficultyLevel: '',
      isPremium: false
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
    const matchesStatus = filterStatus === 'All' || q.status === filterStatus;
    
    // Default Role Filtering Logic
    let roleMatches = true;
    if (userRole === 'typist') {
      roleMatches = q.pairId === pairId;
    }

    // Premium View Filtering
    let premiumMatches = true;
    if (isPremiumView) {
      premiumMatches = q.isPremium === true;
    }

    return matchesSearch && matchesDept && matchesSubject && matchesTopic && matchesYear && matchesMark && matchesDifficulty && matchesStatus && roleMatches && premiumMatches;
  });


  const totalQuestions = questions.length;
  const mcqQuestions = questions.filter(q => q.questionType === 'Single Choice' || q.questionType === 'Multiple Choice').length;
  const mcqPercentage = totalQuestions === 0 ? 0 : Math.round((mcqQuestions / totalQuestions) * 100);
  const totalSubjects = new Set(questions.map(q => q.subject).filter(Boolean)).size;
  const numericalQuestions = questions.filter(q => q.questionType === 'Numerical').length;
  const pendingReview = 14; // Mocked as per requirement

  const relativeTime = (isoString) => {
    if (!isoString) return 'Yesterday';
    const date = new Date(isoString);
    const diff = Math.floor((new Date() - date) / 1000);
    if (diff < 86400) return 'Today';
    if (diff < 172800) return 'Yesterday';
    return `${Math.floor(diff/86400)} days ago`;
  };

  return (
    <>
      <style>
        {`
          .qb-canvas {
            background-color: #F8FAFC;
            background-image: radial-gradient(#CBD5E1 1px, transparent 1px);
            background-size: 24px 24px;
          }
        `}
      </style>
      
      <div className="qb-canvas relative flex flex-col xl:flex-row gap-8 w-full h-full min-h-[900px] p-8 overflow-hidden z-0">
        
        {/* Soft Radial Gradients */}
        <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-blue-200/40 rounded-full blur-[100px] pointer-events-none -z-10"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-100/30 rounded-full blur-[100px] pointer-events-none -z-10"></div>

        {/* ==================== MAIN CONTENT PANEL ==================== */}
        <div className="flex-1 flex flex-col gap-6 relative z-10 w-full min-w-0">
          
          {/* Main Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-[64px] h-[64px] rounded-[20px] bg-white border border-[#EEF2F7] shadow-sm flex items-center justify-center shrink-0">
                <BookOpen size={28} className="text-[#2563EB]" strokeWidth={2} />
              </div>
              <div className="flex flex-col gap-1">
                <h1 className="text-[36px] font-[800] text-[#0F172A] leading-none tracking-tight font-sans">
                  Question Bank
                </h1>
                <p className="text-[15px] font-[500] text-[#64748B] mt-1">
                  Manage practice questions for students across all departments.
                </p>
              </div>
            </div>

            <button 
              onClick={openAddCreator}
              className="h-[56px] px-8 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:shadow-[0_8px_20px_rgba(37,99,235,0.25)] hover:-translate-y-1 text-white font-[600] text-[15px] rounded-[16px] transition-all shrink-0 flex items-center justify-center gap-2 group"
            >
              <Plus size={20} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /> 
              Add Question
            </button>
          </div>

          {/* KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {[
              { label: 'Total Questions', value: totalQuestions, icon: FileText, color: 'blue' },
              { label: 'Subjects', value: totalSubjects, icon: Bookmark, color: 'purple' },
              { label: 'MCQ Questions', value: `${mcqPercentage}%`, icon: CheckCircle2, color: 'green' },
              { label: 'Pending Review', value: pendingReview, icon: AlertCircle, color: 'orange' },
            ].map((stat, i) => (
              <div key={i} className="bg-white rounded-[20px] border border-[#EEF2F7] p-5 shadow-[0_8px_24px_rgba(15,23,42,0.03)] flex items-center gap-5 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(15,23,42,0.06)] transition-all duration-300">
                <div className={`w-[54px] h-[54px] rounded-full bg-${stat.color}-50 flex items-center justify-center shrink-0 border border-${stat.color}-100`}>
                  <stat.icon size={24} className={`text-${stat.color}-500`} strokeWidth={2} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[28px] font-[800] text-[#0F172A] leading-none">{stat.value}</span>
                  <span className="text-[14px] font-[600] text-[#64748B] mt-1.5">{stat.label}</span>
                </div>
              </div>
            ))}
          </div>

          {/* SEARCH BAR */}
          <div className="relative w-full shadow-[0_4px_16px_rgba(15,23,42,0.02)]">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <Search size={22} className="text-[#94A3B8]" />
            </div>
            <input 
              type="text"
              placeholder="Search questions by text..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-[58px] pl-14 pr-6 bg-white border border-[#EEF2F7] rounded-[18px] text-[16px] font-[500] text-[#0F172A] placeholder-[#94A3B8] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 outline-none transition-all"
            />
          </div>

          {/* FILTERS */}
          <div className="flex flex-wrap items-center gap-3">
            {[
              { label: 'Status', val: filterStatus, setter: setFilterStatus, icon: Circle, opts: ['Draft', 'In Review', 'Approved'] },
              { label: 'Department', val: filterDept, setter: setFilterDept, icon: Layers, opts: departments },
              { label: 'Subject', val: filterSubject, setter: setFilterSubject, icon: Bookmark, opts: subjects },
              { label: 'Topic', val: filterTopic, setter: setFilterTopic, icon: FileText, opts: topics },
              { label: 'Year', val: filterYear, setter: setFilterYear, icon: Clock, opts: years },
              { label: 'Marks', val: filterMark, setter: setFilterMark, icon: Trophy, opts: marks },
              { label: 'Difficulty', val: filterDifficulty, setter: setFilterDifficulty, icon: Star, opts: difficulties }
            ].map((f, i) => (
              <div key={i} className="relative group shrink-0">
                <select 
                  value={f.val}
                  onChange={(e) => f.setter(e.target.value)}
                  className="h-[48px] pl-11 pr-10 appearance-none bg-white border border-[#E5E7EB] rounded-[14px] text-[13px] font-[600] text-[#0F172A] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 outline-none transition-all cursor-pointer min-w-[140px] hover:border-[#CBD5E1]"
                >
                  <option value="All">All {f.label}s</option>
                  {f.opts.map((opt, idx) => (
                    <option key={idx} value={opt}>{opt}</option>
                  ))}
                </select>
                <f.icon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2563EB]" />
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none group-hover:text-[#64748B] transition-colors" />
              </div>
            ))}
            
            <button 
              onClick={() => {
                setSearch(''); setFilterStatus('All'); setFilterDept('All'); setFilterSubject('All'); setFilterTopic('All'); setFilterYear('All'); setFilterMark('All'); setFilterDifficulty('All');
              }}
              className="h-[48px] px-6 bg-white border border-[#E5E7EB] hover:border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#0F172A] font-[600] text-[13px] rounded-[14px] transition-all flex items-center gap-2"
            >
              <X size={16} /> Reset
            </button>
          </div>

          {/* QUESTION TABLE */}
          <div className="bg-white border border-[#EEF2F7] rounded-[24px] shadow-[0_10px_28px_rgba(15,23,42,0.05)] flex flex-col overflow-hidden mb-8">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="border-b border-[#EEF2F7]">
                    <th className="py-5 px-6 text-[12px] font-[700] text-[#64748B] uppercase tracking-wider w-[100px]">ID</th>
                    <th className="py-5 px-6 text-[12px] font-[700] text-[#64748B] uppercase tracking-wider">Question</th>
                    <th className="py-5 px-6 text-[12px] font-[700] text-[#64748B] uppercase tracking-wider w-[140px]">Type</th>
                    <th className="py-5 px-6 text-[12px] font-[700] text-[#64748B] uppercase tracking-wider w-[120px]">Status</th>
                    <th className="py-5 px-6 text-[12px] font-[700] text-[#64748B] uppercase tracking-wider w-[120px]">Marks</th>
                    <th className="py-5 px-6 text-[12px] font-[700] text-[#64748B] uppercase tracking-wider w-[120px]">Difficulty</th>
                    <th className="py-5 px-6 text-[12px] font-[700] text-[#64748B] uppercase tracking-wider w-[160px]">Department</th>
                    <th className="py-5 px-6 text-[12px] font-[700] text-[#64748B] uppercase tracking-wider w-[140px]">Updated</th>
                    <th className="py-5 px-6 text-[12px] font-[700] text-[#64748B] uppercase tracking-wider w-[140px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF2F7]">
                  {loading ? (
                    <tr>
                      <td colSpan="9" className="py-12 text-center">
                        <Loader />
                      </td>
                    </tr>
                  ) : filteredQuestions.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="py-12 text-center text-[#64748B] font-[500] text-[15px]">
                        No questions found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredQuestions.map((q, index) => (
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
                                {(userRole === 'admin' || userRole === 'typist') && q.isPremium && (
                                  <span className="shrink-0 flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    <span className="text-amber-500">★</span> Premium
                                  </span>
                                )}
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
                          <span className={`inline-flex items-center px-3 py-1 rounded-full border text-[11px] font-[800] ${
                            q.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            q.status === 'In Review' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                            'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {q.status || 'Draft'}
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
                        <td className="py-4 px-6 h-[82px] text-right">
                          <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleEdit(q); }}
                              className="w-[36px] h-[36px] flex items-center justify-center rounded-[10px] bg-white text-[#64748B] hover:text-[#2563EB] hover:bg-blue-50 shadow-[0_2px_8px_rgba(15,23,42,0.05)] transition-colors border border-[#EEF2F7]">
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDelete(q.id); }}
                              className="w-[36px] h-[36px] flex items-center justify-center rounded-[10px] bg-white text-[#64748B] hover:text-[#EF4444] hover:bg-red-50 shadow-[0_2px_8px_rgba(15,23,42,0.05)] transition-colors border border-[#EEF2F7]">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedId === q.id && (
                        <tr className="bg-[#F8FAFF] border-b border-[#EEF2F7]">
                          <td colSpan="9" className="px-6 py-6">
                            <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm relative cursor-default" onClick={(e) => e.stopPropagation()}>
                              <h4 className="text-[16px] font-bold text-slate-800 mb-4 flex items-start gap-2">
                                {q.isImported && <Sparkles size={16} className="text-purple-600 mt-1 flex-shrink-0" title="AI Imported" />}
                                <span dangerouslySetInnerHTML={{ __html: q.questionText || 'Untitled Question' }} />
                              </h4>
                              {q.questionImageUrl && (
                                <div className="mb-4">
                                  <img src={q.questionImageUrl} alt="Question" className="max-h-40 rounded-xl border border-slate-200 shadow-sm" />
                                </div>
                              )}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                {['A', 'B', 'C', 'D'].map(opt => {
                                  const text = q[`option${opt}`];
                                  const image = q[`option${opt}Image`];
                                  if (!text && !image) return null;
                                  const isCorrect = q.questionType === 'Multiple Choice' ? (q.correctAnswers || []).includes(opt) : q.correctAnswer === opt;
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
                              {(q.explanation || q.explanationImageUrl) && (
                                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 mt-4">
                                  <span className="text-[12px] font-bold text-blue-600 uppercase tracking-wider mb-2 block">Explanation</span>
                                  {q.explanation && <p className="text-[14px] text-slate-700 mb-2" dangerouslySetInnerHTML={{ __html: q.explanation }} />}
                                  {q.explanationImageUrl && (
                                    <img src={q.explanationImageUrl} alt="Explanation" className="max-h-40 rounded-xl border border-blue-200 shadow-sm mt-2" />
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Placeholder */}
            {!loading && filteredQuestions.length > 0 && (
              <div className="p-5 border-t border-[#EEF2F7] flex items-center justify-between bg-[#F8FAFC]/50">
                <span className="text-[13px] font-[500] text-[#64748B]">
                  Showing 1 to {filteredQuestions.length} of {filteredQuestions.length} questions
                </span>
                <div className="flex items-center gap-2">
                  <button className="w-8 h-8 rounded-lg border border-[#EEF2F7] bg-white flex items-center justify-center text-[#94A3B8] hover:border-[#CBD5E1] transition-colors">
                    <ChevronDown size={16} className="rotate-90" />
                  </button>
                  <button className="w-8 h-8 rounded-lg bg-[#2563EB] text-white font-[600] text-[13px] shadow-sm flex items-center justify-center">1</button>
                  <button className="w-8 h-8 rounded-lg border border-[#EEF2F7] bg-white flex items-center justify-center text-[#64748B] font-[600] text-[13px] hover:border-[#CBD5E1] transition-colors">2</button>
                  <button className="w-8 h-8 rounded-lg border border-[#EEF2F7] bg-white flex items-center justify-center text-[#64748B] font-[600] text-[13px] hover:border-[#CBD5E1] transition-colors">3</button>
                  <span className="text-[#94A3B8]">...</span>
                  <button className="w-8 h-8 rounded-lg border border-[#EEF2F7] bg-white flex items-center justify-center text-[#94A3B8] hover:border-[#CBD5E1] transition-colors">
                    <ChevronDown size={16} className="-rotate-90" />
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
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
                  <div className="flex items-center gap-4">
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

                    {(userRole === 'admin' || userRole === 'typist') && (
                      <label className="flex items-center gap-2 cursor-pointer bg-amber-50/50 hover:bg-amber-50 border border-amber-200/50 px-3 py-1.5 rounded-full transition-colors">
                        <div className="relative">
                          <input type="checkbox" name="isPremium" checked={formData.isPremium || false} onChange={(e) => setFormData({...formData, isPremium: e.target.checked})} className="sr-only" />
                          <div className={`block w-8 h-4.5 rounded-full transition-colors ${formData.isPremium ? 'bg-amber-500' : 'bg-slate-300'}`}></div>
                          <div className={`absolute left-0.5 top-0.5 bg-white w-3.5 h-3.5 rounded-full transition-transform ${formData.isPremium ? 'transform translate-x-3.5' : ''}`}></div>
                        </div>
                        <span className="text-[12px] font-[800] text-amber-700 flex items-center gap-1">
                          <span className="text-amber-500 text-[14px]">★</span> Premium
                        </span>
                      </label>
                    )}
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

                {/* Meta info (Typed By / Reviewed By) */}
                {(formData.typedBy || formData.reviewedBy) && (
                  <div className="flex flex-wrap gap-4 px-1 pt-2">
                    {formData.typedBy && (
                      <div className="text-[12px] font-[700] text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                        <span className="text-slate-400">Typed by:</span> <span className="text-slate-700">{formData.typedBy}</span>
                      </div>
                    )}
                    {formData.reviewedBy && (
                      <div className="text-[12px] font-[700] text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-emerald-100">
                        <span className="text-emerald-500/70">Reviewed by:</span> <span className="text-emerald-700">{formData.reviewedBy}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Question Text Editor */}
                <div className="flex flex-col gap-3">
                  <label className="text-[15px] font-[900] text-[#111827]">Question Text <span className="text-red-500">*</span></label>
                  <div className="bg-white border-[1.5px] border-slate-200 rounded-[20px] overflow-hidden flex flex-col shadow-sm">
                    {/* Rich text toolbar */}
                    <div className="h-14 border-b border-slate-100 flex items-center px-4 gap-2">
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => document.execCommand('bold', false, null)} className="p-2 text-[#111827] hover:bg-slate-50 rounded-lg" title="Bold"><Bold size={16}/></button>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => document.execCommand('italic', false, null)} className="p-2 text-[#111827] hover:bg-slate-50 rounded-lg" title="Italic"><Italic size={16}/></button>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => document.execCommand('insertText', false, 'x²')} className="p-2 text-[#111827] hover:bg-slate-50 rounded-lg font-serif text-[15px] font-bold" title="Insert x²">x²</button>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => document.execCommand('insertText', false, 'x₂')} className="p-2 text-[#111827] hover:bg-slate-50 rounded-lg font-serif text-[15px] font-bold" title="Insert x₂">x₂</button>
                      <div className="w-px h-5 bg-slate-200 mx-2"></div>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => document.execCommand('insertUnorderedList', false, null)} className="p-2 text-[#111827] hover:bg-slate-50 rounded-lg" title="Bullet List"><List size={16}/></button>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => document.execCommand('insertOrderedList', false, null)} className="p-2 text-[#111827] hover:bg-slate-50 rounded-lg" title="Numbered List"><ListTodo size={16}/></button>
                      <div className="ml-auto flex">
                         <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => document.execCommand('removeFormat', false, null)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg" title="Clear Formatting"><Eraser size={16}/></button>
                      </div>
                    </div>
                    <RichTextEditor 
                      name="questionText"
                      value={formData.questionText}
                      onChange={handleInputChange}
                      className="w-full p-6 h-48 outline-none text-[16px] font-[500] text-[#111827]"
                      placeholder="Match the following:"
                    />
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
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => document.execCommand('bold', false, null)} className="p-2 text-[#111827] hover:bg-slate-50 rounded-lg" title="Bold"><Bold size={16}/></button>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => document.execCommand('italic', false, null)} className="p-2 text-[#111827] hover:bg-slate-50 rounded-lg" title="Italic"><Italic size={16}/></button>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => document.execCommand('insertText', false, 'x²')} className="p-2 text-[#111827] hover:bg-slate-50 rounded-lg font-serif text-[15px] font-bold" title="Insert x²">x²</button>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => document.execCommand('insertText', false, 'x₂')} className="p-2 text-[#111827] hover:bg-slate-50 rounded-lg font-serif text-[15px] font-bold" title="Insert x₂">x₂</button>
                      <div className="w-px h-5 bg-slate-200 mx-2"></div>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => document.execCommand('insertUnorderedList', false, null)} className="p-2 text-[#111827] hover:bg-slate-50 rounded-lg" title="Bullet List"><List size={16}/></button>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => document.execCommand('insertOrderedList', false, null)} className="p-2 text-[#111827] hover:bg-slate-50 rounded-lg" title="Numbered List"><ListTodo size={16}/></button>
                      <div className="ml-auto flex">
                         <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => document.execCommand('removeFormat', false, null)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg" title="Clear Formatting"><Eraser size={16}/></button>
                      </div>
                    </div>
                    <RichTextEditor 
                      name="explanation"
                      value={formData.explanation}
                      onChange={handleInputChange}
                      className="w-full p-6 h-32 outline-none text-[16px] font-[500] text-[#111827]"
                    />
                  </div>
                  {formData.explanationImageUrl ? (
                    <div className="relative group mt-3">
                      <img src={formData.explanationImageUrl} alt="Explanation" className="max-h-60 rounded-xl border border-slate-200 shadow-sm" />
                      <button type="button" onClick={() => setFormData({...formData, explanationImageUrl: ''})} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <label className="border-[1.5px] border-dashed border-slate-300 hover:border-blue-400 bg-white rounded-xl py-3 mt-3 flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm group">
                      <ImageIcon size={16} className="text-[#111827]" />
                      <span className="text-[13px] font-[900] text-[#111827]">Add Explanation Image</span>
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'explanationImageUrl')} />
                    </label>
                  )}
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
                  <label className="text-[12px] font-[800] text-[#111827]">Department <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select name="department" required value={formData.department} onChange={handleInputChange} className="w-full appearance-none bg-white border border-slate-200 text-slate-500 text-[13px] font-[600] rounded-xl pl-4 pr-10 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:border-slate-300 transition-colors shadow-sm">
                      <option value="">-- Select Department --</option>
                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-[800] text-[#111827]">Subject <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select name="subject" required value={formData.subject} onChange={handleInputChange} className="w-full appearance-none bg-white border border-slate-200 text-slate-500 text-[13px] font-[600] rounded-xl pl-4 pr-10 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:border-slate-300 transition-colors shadow-sm">
                      <option value="">-- Select Subject --</option>
                      {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-[800] text-[#111827]">Topic <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select name="topic" required value={formData.topic} onChange={handleInputChange} className="w-full appearance-none bg-white border border-slate-200 text-slate-500 text-[13px] font-[600] rounded-xl pl-4 pr-10 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:border-slate-300 transition-colors shadow-sm">
                      <option value="">-- Select Topic --</option>
                      {topics.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-[800] text-[#111827]">Year <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select name="year" required value={formData.year} onChange={handleInputChange} className="w-full appearance-none bg-white border border-slate-200 text-slate-500 text-[13px] font-[600] rounded-xl pl-4 pr-10 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:border-slate-300 transition-colors shadow-sm">
                      <option value="">-- Select Year --</option>
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-[800] text-[#111827]">Mark <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select name="mark" required value={formData.mark} onChange={handleInputChange} className="w-full appearance-none bg-white border border-slate-200 text-slate-500 text-[13px] font-[600] rounded-xl pl-4 pr-10 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:border-slate-300 transition-colors shadow-sm">
                      <option value="">-- Select Mark --</option>
                      {marks.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[12px] font-[800] text-[#111827]">Difficulty Level <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select name="difficultyLevel" required value={formData.difficultyLevel} onChange={handleInputChange} className="w-full appearance-none bg-white border border-slate-200 text-slate-500 text-[13px] font-[600] rounded-xl pl-4 pr-10 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:border-slate-300 transition-colors shadow-sm">
                      <option value="">-- Select Difficulty --</option>
                      {difficulties.map(df => <option key={df} value={df}>{df}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-6 bg-[#f8fafc] space-y-4">
                {userRole === 'typist' ? (
                  pairRole === 'reviewer' ? (
                    <>
                      <button 
                        type="button"
                        onClick={(e) => handleSubmit(e, 'Approved')}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-[#10B981] hover:bg-[#059669] text-white font-[800] text-[13px] transition-colors shadow-md shadow-emerald-500/20"
                      >
                        <CheckCircle2 size={16} /> Approve Question
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => handleSubmit(e, 'Draft')}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-red-500 hover:bg-red-600 text-white font-[800] text-[13px] transition-colors shadow-md shadow-red-500/20"
                      >
                        <X size={16} /> Reject (Send to Draft)
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        type="button"
                        onClick={(e) => handleSaveAndNext(e, 'In Review')}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-white border border-slate-200 text-[#111827] font-[800] text-[13px] hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm"
                      >
                        <ChevronRight size={16} /> Save & Next
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => handleSubmit(e, 'In Review')}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-[#3b82f6] hover:bg-blue-600 text-white font-[800] text-[13px] transition-colors shadow-md shadow-blue-500/20"
                      >
                        <Check size={16} /> Save & Close (Send to Review)
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => handleSaveAndNext(e, 'Draft')}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-[800] text-[13px] transition-colors shadow-sm"
                      >
                        <Save size={16} /> Save to Draft
                      </button>
                    </>
                  )
                ) : (
                  <>
                    <button 
                      type="button"
                      onClick={(e) => handleSaveAndNext(e, 'Approved')}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-white border border-slate-200 text-[#111827] font-[800] text-[13px] hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm"
                    >
                      <ChevronRight size={16} /> Save & Next
                    </button>
                    <button 
                      type="submit"
                      onClick={(e) => handleSubmit(e, 'Approved')}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-[#059669] hover:bg-emerald-700 text-white font-[800] text-[13px] transition-colors shadow-md shadow-emerald-500/20"
                    >
                      <Check size={16} /> Save & Close
                    </button>
                  </>
                )}
                
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

    </>
  );
}
