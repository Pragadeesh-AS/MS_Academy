import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Loader from '../Loader';
import { BookOpen, Plus, Trash2, Edit2, Search, X, Save, Image as ImageIcon, CheckCircle2, ChevronRight, FileText, Bold, Italic, List, ChevronDown, ListTodo, Calculator, Eraser, Tag, Check, Sparkles, Circle, Bookmark, AlertCircle, AlertTriangle, Layers, Clock, Trophy, Star, Filter, FolderOpen, ArrowLeft, Upload, ClipboardPaste } from 'lucide-react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, writeBatch } from 'firebase/firestore';
import { questionFingerprint, isEmptyQuestion } from '../../utils/questionDuplicates';
import { QUESTION_CATEGORIES, getQuestionCategory, inferQuestionCategory } from '../../utils/questionCategory';
import { markNumberOf, markLabelFor, negativeMarkFor } from '../../utils/marking';
import { sameDepartment } from '../../utils/subjects';
import { answerKeyChanged } from '../../utils/testGrading';
import { regradeAttemptsForQuestion } from '../../utils/regradeAttempts';
import MatchColumns from '../shared/MatchColumns';

// Engineering Mathematics and Aptitude banks are shared by every department.
const isCommonDeptName = (name) => {
  const n = (name || '').trim().toLowerCase();
  return n === 'engineering mathematics' || /ap+titude/.test(n);
};
const toTitleCase = (s) => (s || '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

// A department may be stored as "Mechanical (ME)" or just "ME" - accept both forms.
const deptNameVariants = (name) => {
  if (!name) return [];
  const code = (name.match(/\(([^)]+)\)/) || [])[1];
  return code ? [name, code.trim()] : [name];
};

const stripHtmlAndNormalize = (htmlString) => {
  if (!htmlString) return '';
  // Replace <br/> with a space to prevent words from joining, then strip all tags
  const withSpaces = htmlString.replace(/<br\s*\/?>/gi, ' ').replace(/&nbsp;/g, ' ');
  return withSpaces.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
};

// Searchable Select Component
const SearchableSelect = ({ label, options, value, onChange, placeholder = "Select..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  // Close when clicking outside
  useEffect(() => {
    const handleWindowClick = (e) => {
      if (!e.target.closest(`.select-container-${label.replace(/\s+/g, '-')}`)) {
        setIsOpen(false);
      }
    };
    if (isOpen) window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, [isOpen, label]);

  const filteredOptions = options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className={`relative select-container-${label.replace(/\s+/g, '-')}`}>
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

export default function QuestionBank({ externalFilter = null, isPremiumView = false, initialEditQuestionId = null, onClearEdit = null, lockedDepartment = null }) {
  const userRole = sessionStorage.getItem('auth_role') || 'admin';
  const pairRole = localStorage.getItem('pair_role') || null;
  const pairId = localStorage.getItem('pair_id') || null;
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAction, setBulkAction] = useState(null); // 'delete' | 'premium' | null
  const [isBulkWorking, setIsBulkWorking] = useState(false);
  const [hasOpenedInitial, setHasOpenedInitial] = useState(false);
  
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
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
      const start = activeEl.selectionStart;
      const end = activeEl.selectionEnd;
      const val = activeEl.value;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(activeEl, val.substring(0, start) + symbol + val.substring(end));
      activeEl.dispatchEvent(new Event('input', { bubbles: true }));
      setTimeout(() => {
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
  
  // Admin: a department folder. Teacher (lockedDepartment): their own department's folder or one of
  // the shared Engineering Mathematics / Aptitude folders - null shows the folder picker.
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState(lockedDepartment || 'All');
  const [filterSubject, setFilterSubject] = useState('All');
  const [filterTopic, setFilterTopic] = useState('All');
  const [filterYear, setFilterYear] = useState('All');
  const [filterMark, setFilterMark] = useState('All');
  const [filterDifficulty, setFilterDifficulty] = useState('All');
  const [filterStatus, setFilterStatus] = useState(externalFilter || 'Approved');
  const [filterType, setFilterType] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [goToPage, setGoToPage] = useState('');

  // Go back to page 1 whenever the filters or the page size change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [search, selectedFolder, filterDept, filterSubject, filterTopic, filterYear, filterMark, filterDifficulty, filterStatus, filterType, filterCategory, pageSize]);

  useEffect(() => {
    if (externalFilter !== null) {
      setFilterStatus(externalFilter);
    }
  }, [externalFilter]);

  const [formData, setFormData] = useState({
    questionType: 'Single Choice',
    questionCategory: '', // '' = auto-detect (see utils/questionCategory)
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
    department: lockedDepartment || '',
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

  // Typist / reviewer: every pair this email has been part of (current and earlier ones), so the
  // questions they typed or reviewed stay visible even after a pairing is re-created
  const [myPairIds, setMyPairIds] = useState(() => new Set(pairId ? [pairId] : []));
  useEffect(() => {
    if (userRole !== 'typist') return;
    const email = sessionStorage.getItem('auth_email') || '';
    if (!email) return;
    Promise.all([
      getDocs(query(collection(db, 'invited_typists'), where('typistEmail', '==', email))),
      getDocs(query(collection(db, 'invited_typists'), where('reviewerEmail', '==', email))),
    ]).then(([asTypist, asReviewer]) => {
      setMyPairIds(new Set([...(pairId ? [pairId] : []), ...asTypist.docs.map(d => d.id), ...asReviewer.docs.map(d => d.id)]));
    }).catch(err => console.error('Failed to load your pairs', err));
  }, [userRole, pairId]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const attrSnapshot = await getDocs(collection(db, 'question_attributes'));
      const attrData = attrSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAttributes(attrData);

      // Teachers are locked to their own department (plus the shared Engineering
      // Mathematics / Aptitude banks): scope the query at the Firestore level (not just
      // client-side filtering) so other departments' questions never reach their browser.
      const questionsRef = collection(db, 'question_bank');
      let qSnapshot;
      if (lockedDepartment) {
        const commonNames = attrData.filter(a => a.type === 'department' && isCommonDeptName(a.name)).map(a => a.name);
        const allowed = [...new Set([...deptNameVariants(lockedDepartment), ...commonNames])].slice(0, 30);
        qSnapshot = await getDocs(query(questionsRef, where('department', 'in', allowed)));
      } else {
        qSnapshot = await getDocs(questionsRef);
      }
      let qData = qSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Questions referenced by a test must never be auto-deleted, or that test shows
      // "Question content not found" to students.
      const usedInTests = new Set();
      try {
        const testsSnap = await getDocs(collection(db, 'tests'));
        testsSnap.docs.forEach(t => (t.data().questions || []).forEach(id => usedInTests.add(id)));
      } catch (err) {
        console.error("Failed to load tests for duplicate check - skipping cleanup", err);
        usedInTests.add('__unknown__');
      }
      const testsKnown = !usedInTests.has('__unknown__');

      // Deduplication Logic
      // When copies collide, keep the one a test uses, then the premium one (so a premium
      // import is never lost to an older normal copy), then prefer the Approved one.
      const rank = (q) => (usedInTests.has(q.id) ? 4 : 0) + (q.isPremium === true ? 2 : 0) + (q.status === 'Approved' ? 1 : 0);
      const keeper = new Map();
      const duplicateIds = [];

      qData.forEach(q => {
        // Same text, options and images (ignoring HTML and whitespace differences) = same question.
        // Options are part of it, so two different questions with the same stem are both kept.
        const hash = questionFingerprint(q);

        // If hash is just '_', it means both text and image are empty.
        // We might not want to deduplicate completely empty shells aggressively unless they are truly duplicates.
        // But let's include them in deduplication if there are multiple empty ones.
        const current = keeper.get(hash);
        if (!current) {
          keeper.set(hash, q);
          return;
        }
        const [keep, drop] = rank(q) > rank(current) ? [q, current] : [current, q];
        keeper.set(hash, keep);
        // Leave both copies in place if the "extra" one is used by a test (or tests couldn't be checked)
        if (testsKnown && !usedInTests.has(drop.id)) duplicateIds.push(drop.id);
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

      // Newest first: the latest import (or newly added question) sits at the top. Questions of
      // one import keep their PDF order; ones with no date at all go to the bottom.
      // (createdAt is an ISO string; a few older questions may hold a Firestore Timestamp instead)
      const iso = (v) => (v?.toDate ? v.toDate().toISOString() : String(v || ''));
      const addedAt = (q) => iso(q.importedAt || q.createdAt);
      qData.sort((a, b) =>
        addedAt(b).localeCompare(addedAt(a)) ||
        (a.importOrder ?? 0) - (b.importOrder ?? 0) ||
        iso(a.createdAt).localeCompare(iso(b.createdAt))
      );

      setQuestions(qData);
    } catch (e) {
      console.error("Failed to fetch data", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchQuestions();
  }, [lockedDepartment]);


  useEffect(() => {
    if (initialEditQuestionId && questions.length > 0 && !hasOpenedInitial) {
      const q = questions.find(q => q.id === initialEditQuestionId);
      if (q) {
        handleEdit(q);
        setHasOpenedInitial(true);
        if (onClearEdit) onClearEdit();
      }
    }
  }, [initialEditQuestionId, questions, hasOpenedInitial]);

  // Cascading logic to get parent IDs
  // "Mechanical (ME)" on a teacher/question matches a "Mechanical" department attribute too
  const selectedDeptObj = filterDept !== 'All'
    ? attributes.find(a => a.type === 'department' && sameDepartment(a.name, filterDept))
    : null;
    
  const selectedSubjectObj = filterSubject !== 'All' 
    ? attributes.find(a => a.type === 'subject' && a.name === filterSubject) 
    : null;

  const departments = Array.from(new Set([
    ...attributes.filter(a => a.type === 'department').map(a => a.name),
    ...questions.map(q => q.department).filter(Boolean)
  ]));
  
  const subjects = attributes
    .filter(a => a.type === 'subject' && (!selectedDeptObj || a.parentId === selectedDeptObj.id))
    .map(a => a.name);
    
  const topics = attributes
    .filter(a => a.type === 'topic' && (!selectedSubjectObj || a.parentId === selectedSubjectObj.id))
    .map(a => a.name);
  const currentYear = new Date().getFullYear();
  const years = Array.from({length: currentYear - 1990 + 1}, (_, i) => (currentYear - i).toString()); // 1990 to current year, descending
  const marks = attributes.filter(a => a.type === 'mark').map(a => a.name);
  // One Marks-filter option per mark value (1, 2, ...), whatever text each question stores it as
  const markFilterOptions = [...new Set([
    ...marks.map(markNumberOf),
    ...questions.map(q => markNumberOf(q.mark) || 1),
  ].filter(n => n !== null))].sort((a, b) => a - b).map(n => markLabelFor(n, marks));

  // The Marks pills ("1 Mark (-0.33)") and the Mark attribute dropdown ("1", "2") store
  // different strings, so link them by the mark number and save the attribute's value.
  const markNumber = (value) => {
    const m = String(value || '').match(/\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
  };
  const markOptionFor = (value) => {
    if (marks.includes(value)) return value;
    const n = markNumber(value);
    return n === null ? '' : (marks.find(m => markNumber(m) === n) || '');
  };
  // Same label the list's quick 1M/2M toggle saves, so the row and the editor always agree
  const setMarkNumber = (n) => {
    setFormData(prev => ({ ...prev, mark: markLabelFor(n, marks) }));
  };
  const difficulties = attributes.filter(a => a.type === 'difficulty').map(a => a.name);
  const questionTypes = ['Single Choice', 'Multiple Choice', 'Fill in Blanks', 'Match'];

  const questionTypeShort = (type) => ({
    'Single Choice': 'MCQ',
    'Multiple Choice': 'MSQ',
    'Fill in Blanks': 'NAT',
    'Fill in the Blanks': 'NAT',
    'Match': 'Match'
  }[type] || type);
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

  // Clipboard text is escaped (not inserted as raw HTML) so pasted markup can't inject scripts.
  const escapeHtml = (text) => text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/\n/g, '<br>');

  const handlePasteExplanation = async () => {
    if (!navigator.clipboard) {
      showToast("Clipboard access isn't available in this browser. Use Ctrl+V instead.", "error");
      return;
    }
    try {
      if (navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imageType = item.types.find(t => t.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            if (blob.size > 1048576) {
              showToast("Image is too large. Please paste an image under 1MB.", "error");
              return;
            }
            const reader = new FileReader();
            reader.onloadend = () => setFormData(prev => ({ ...prev, explanationImageUrl: reader.result }));
            reader.readAsDataURL(blob);
            showToast("Image pasted into explanation", "success");
            return;
          }
        }
      }
      const text = await navigator.clipboard.readText();
      if (!text) {
        showToast("Clipboard is empty.", "error");
        return;
      }
      setFormData(prev => ({
        ...prev,
        explanation: prev.explanation ? `${prev.explanation}<br>${escapeHtml(text)}` : escapeHtml(text)
      }));
      showToast("Text pasted into explanation", "success");
    } catch (err) {
      console.error("Paste failed", err);
      showToast("Couldn't read the clipboard. Allow clipboard permission or use Ctrl+V.", "error");
    }
  };

  // A typist/reviewer approving normally has actually looked the question over, so it's
  // marked reviewed. A direct "skip review" import has not been looked at by anyone but
  // the person who typed/extracted it, so it lands in the bank flagged as Not Reviewed.
  const applyReviewFields = (payload, finalStatus, skipReview, authName, prevReviewedBy, prevStatus) => {
    if (finalStatus !== 'Approved') {
      payload.reviewed = false;
      return payload;
    }
    if (skipReview) {
      payload.reviewed = false;
      payload.reviewedBy = '';
    } else {
      payload.reviewed = true;
      if (!prevReviewedBy || prevStatus !== 'Approved') payload.reviewedBy = authName;
    }
    return payload;
  };

  // A corrected answer key (or marks) re-marks every saved attempt of the tests using this question
  const regradeIfKeyChanged = (before, after) => {
    if (!before || !answerKeyChanged(before, after)) return Promise.resolve();
    return regradeAttemptsForQuestion(before, after).then(({ attempts, gained, lost }) => {
      if (attempts > 0) {
        showToast(`Answer key updated - re-graded ${attempts} test attempt${attempts === 1 ? '' : 's'} (${gained} gained, ${lost} lost marks)`, "success");
      }
    }).catch(err => {
      console.error("Failed to re-grade test attempts", err);
      showToast("Saved, but re-grading the test attempts failed. Save the question again to retry.", "error");
    });
  };

  const handleSubmit = async (e, forcedStatus = null, skipReview = false) => {
    e.preventDefault();
    const form = e.target.closest('form');
    if (form && !form.checkValidity()) {
      form.reportValidity();
      return;
    }

    // Duplicate Check (skipped for a question the extracter kept on purpose after comparing it)
    const keptDuplicate = isEditing && questions.find(q => q.id === currentId)?.allowDuplicate === true;
    if (!keptDuplicate && !isEmptyQuestion(formData)) {
      const payloadHash = questionFingerprint(formData);
      const isDuplicate = questions.some(q => {
        if (isEditing && q.id === currentId) return false;
        return questionFingerprint(q) === payloadHash;
      });
      if (isDuplicate) {
        showToast("Duplicate Entry: This question already exists in the question bank.", "error");
        return;
      }
    }

    const finalStatus = forcedStatus || formData.status || 'Approved';
    const authName = sessionStorage.getItem('auth_name') || 'Unknown';
    const nowIso = new Date().toISOString();
    let payload = { ...formData, mark: markOptionFor(formData.mark) || formData.mark, status: finalStatus, updatedAt: nowIso };
    payload.negativeMark = negativeMarkFor(payload);
    // Creation date is stamped once; edits must never overwrite it
    if (formData.createdAt) payload.createdAt = formData.createdAt;
    else if (!isEditing) payload.createdAt = nowIso;
    else delete payload.createdAt;

    // Who typed it is stamped once, on creation - by name for display and by email so the typist can
    // always find it again. An edit (e.g. a reviewer approving it) never changes the owner or the
    // pair it belongs to - a reviewer's own pair id would otherwise hide it from its typist.
    if (!isEditing) {
      payload.typedBy = authName;
      payload.typedByEmail = (sessionStorage.getItem('auth_email') || '').toLowerCase();
      if (pairId) payload.pairId = pairId;
    }
    payload = applyReviewFields(payload, finalStatus, skipReview, authName, formData.reviewedBy, formData.status);

    // Optimistic UI Update & close instantly
    setIsCreatorOpen(false);
    
    if (isEditing) {
      const before = questions.find(q => q.id === currentId);
      // Merge - fields the form doesn't carry (pairId, typedByEmail...) stay on the question
      setQuestions(prev => prev.map(q => q.id === currentId ? { ...q, ...payload, id: currentId } : q));
      updateDoc(doc(db, 'question_bank', currentId), payload).then(() => {
        showToast("Question saved successfully", "success");
        return regradeIfKeyChanged(before, { id: currentId, ...payload });
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

  const handleSaveAndNext = async (e, forcedStatus = null, skipReview = false) => {
    e.preventDefault();
    const form = e.target.closest('form');
    if (form && !form.checkValidity()) {
      form.reportValidity();
      return;
    }
    
    // Duplicate Check (skipped for a question the extracter kept on purpose after comparing it)
    const keptDuplicate = isEditing && questions.find(q => q.id === currentId)?.allowDuplicate === true;
    if (!keptDuplicate && !isEmptyQuestion(formData)) {
      const payloadHash = questionFingerprint(formData);
      const isDuplicate = questions.some(q => {
        if (isEditing && q.id === currentId) return false;
        return questionFingerprint(q) === payloadHash;
      });
      if (isDuplicate) {
        showToast("Duplicate Entry: This question already exists in the question bank.", "error");
        return;
      }
    }
    
    const finalStatus = forcedStatus || formData.status || 'Approved';
    const authName = sessionStorage.getItem('auth_name') || 'Unknown';
    const nowIso = new Date().toISOString();
    let payload = { ...formData, mark: markOptionFor(formData.mark) || formData.mark, status: finalStatus, updatedAt: nowIso };
    payload.negativeMark = negativeMarkFor(payload);
    // Creation date is stamped once; edits must never overwrite it
    if (formData.createdAt) payload.createdAt = formData.createdAt;
    else if (!isEditing) payload.createdAt = nowIso;
    else delete payload.createdAt;
    
    // Who typed it is stamped once, on creation - by name for display and by email so the typist can
    // always find it again. An edit (e.g. a reviewer approving it) never changes the owner or the
    // pair it belongs to - a reviewer's own pair id would otherwise hide it from its typist.
    if (!isEditing) {
      payload.typedBy = authName;
      payload.typedByEmail = (sessionStorage.getItem('auth_email') || '').toLowerCase();
      if (pairId) payload.pairId = pairId;
    }
    payload = applyReviewFields(payload, finalStatus, skipReview, authName, formData.reviewedBy, formData.status);

    // Reset form instantly
    openAddCreator();
    
    if (isEditing) {
      const before = questions.find(q => q.id === currentId);
      // Merge - fields the form doesn't carry (pairId, typedByEmail...) stay on the question
      setQuestions(prev => prev.map(q => q.id === currentId ? { ...q, ...payload, id: currentId } : q));
      updateDoc(doc(db, 'question_bank', currentId), payload).then(() => {
        showToast("Question saved successfully. Add next.", "success");
        return regradeIfKeyChanged(before, { id: currentId, ...payload });
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
      questionCategory: q.questionCategory || '',
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
      reviewedBy: q.reviewedBy || '',
      isPremium: q.isPremium === true,
      createdAt: q.createdAt || ''
    });
    setCurrentId(q.id);
    setIsEditing(true);
    setIsCreatorOpen(true);
  };

  const toggleSelected = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Firestore batches cap at 500 writes, so large selections are split into chunks.
  const runBulk = async (ids, applyToBatch) => {
    for (let i = 0; i < ids.length; i += 450) {
      const batch = writeBatch(db);
      ids.slice(i, i + 450).forEach(id => applyToBatch(batch, doc(db, 'question_bank', id)));
      await batch.commit();
    }
  };

  // --- Quick actions from the list (admin, and the reviewer of a typist pair) ---
  const canQuickEdit = userRole === 'admin' || (userRole === 'typist' && pairRole === 'reviewer');

  // Marks straight from the row: saves the mark label and the matching negative mark
  const handleQuickMark = async (q, n) => {
    if (markNumberOf(q.mark) === n || String(q.id).startsWith('temp-')) return;
    const update = { mark: markLabelFor(n, marks), updatedAt: new Date().toISOString() };
    update.negativeMark = negativeMarkFor({ ...q, ...update });
    setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, ...update } : x));
    try {
      await updateDoc(doc(db, 'question_bank', q.id), update);
      showToast(`Set to ${n} mark${n > 1 ? 's' : ''}${update.negativeMark ? ` (-${update.negativeMark} for a wrong answer)` : ' (no negative marking)'}`, "success");
      regradeIfKeyChanged(q, { ...q, ...update });
    } catch (e) {
      console.error("Failed to update marks", e);
      showToast("Failed to update marks. Changes reverted.", "error");
      fetchQuestions();
    }
  };

  const needsApproval = (q) => q.status !== 'Approved' || q.reviewed === false;
  // Admin and reviewers approve anything they can see; a typist approves the questions they typed
  // or imported themselves (isMyQuestion is declared further down - only called at render time)
  const isPairTypist = userRole === 'typist' && pairRole === 'typist';
  const canApprove = (q) => canQuickEdit || (isPairTypist && isMyQuestion(q));
  const approvalFields = () => ({
    status: 'Approved',
    reviewed: true,
    reviewedBy: sessionStorage.getItem('auth_name') || 'Admin',
    updatedAt: new Date().toISOString()
  });

  const handleQuickApprove = async (q) => {
    if (String(q.id).startsWith('temp-')) return;
    const update = approvalFields();
    setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, ...update } : x));
    try {
      await updateDoc(doc(db, 'question_bank', q.id), update);
      showToast("Question approved", "success");
    } catch (e) {
      console.error("Failed to approve question", e);
      showToast("Failed to approve. Changes reverted.", "error");
      fetchQuestions();
    }
  };

  const confirmBulkAction = async () => {
    // Only act on questions that are still visible under the current filters
    const visibleIds = new Set(filteredQuestions.map(q => q.id));
    const ids = selectedIds.filter(id => visibleIds.has(id) && !id.startsWith('temp-'));
    if (ids.length === 0) { setBulkAction(null); return; }
    setIsBulkWorking(true);
    try {
      if (bulkAction === 'delete') {
        await runBulk(ids, (batch, ref) => batch.delete(ref));
        setQuestions(prev => prev.filter(q => !ids.includes(q.id)));
        showToast(`${ids.length} question${ids.length === 1 ? '' : 's'} deleted`, "success");
      } else if (bulkAction === 'premium') {
        const makePremium = !isPremiumView;
        const updatedAt = new Date().toISOString();
        await runBulk(ids, (batch, ref) => batch.update(ref, { isPremium: makePremium, updatedAt }));
        setQuestions(prev => prev.map(q => ids.includes(q.id) ? { ...q, isPremium: makePremium, updatedAt } : q));
        showToast(`${ids.length} question${ids.length === 1 ? '' : 's'} moved to the ${makePremium ? 'Premium Question Bank' : 'Question Bank'}`, "success");
      } else if (bulkAction === 'approve') {
        // A typist's selection may include shared-bank questions they can't approve - skip those
        const byId = new Map(questions.map(q => [q.id, q]));
        const allowed = ids.filter(id => byId.get(id) && canApprove(byId.get(id)));
        ids.splice(0, ids.length, ...allowed);
        if (ids.length === 0) {
          showToast("You can only approve questions you typed or imported", "error");
          setIsBulkWorking(false);
          setBulkAction(null);
          return;
        }
        const update = approvalFields();
        await runBulk(ids, (batch, ref) => batch.update(ref, update));
        setQuestions(prev => prev.map(q => ids.includes(q.id) ? { ...q, ...update } : q));
        showToast(`${ids.length} question${ids.length === 1 ? '' : 's'} approved`, "success");
      } else if (bulkAction === 'mark1' || bulkAction === 'mark2') {
        const n = bulkAction === 'mark2' ? 2 : 1;
        const mark = markLabelFor(n, marks);
        const updatedAt = new Date().toISOString();
        // Negative mark depends on each question's type (MCQ/Match only), so it's set per question
        const byId = new Map(questions.map(q => [q.id, q]));
        await runBulk(ids, (batch, ref) => batch.update(ref, {
          mark, updatedAt, negativeMark: negativeMarkFor({ ...byId.get(ref.id), mark })
        }));
        setQuestions(prev => prev.map(q => ids.includes(q.id) ? { ...q, mark, updatedAt, negativeMark: negativeMarkFor({ ...q, mark }) } : q));
        showToast(`${ids.length} question${ids.length === 1 ? '' : 's'} set to ${n} mark${n > 1 ? 's' : ''}`, "success");
        // Scores of attempts that include these questions follow the new marks (one question at a time)
        (async () => {
          for (const id of ids) {
            const before = byId.get(id);
            if (before) await regradeIfKeyChanged(before, { ...before, mark });
          }
        })();
      }
      setSelectedIds([]);
    } catch (e) {
      console.error("Bulk action failed", e);
      showToast("Something went wrong. Some questions may not have been updated.", "error");
      fetchQuestions();
    }
    setIsBulkWorking(false);
    setBulkAction(null);
  };

  const openAddCreator = () => {
    setFormData({
      questionType: 'Single Choice',
      questionCategory: '',
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
      department: selectedFolder || '',
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

  // A typist's / reviewer's own question: typed by them (email, or name on older questions saved
  // before emails were stored), made in any of their pairs, or sent to them to review
  const myEmail = (sessionStorage.getItem('auth_email') || '').toLowerCase();
  const myName = (sessionStorage.getItem('auth_name') || '').trim().toLowerCase();
  const isMyQuestion = (q) => (
    (!!q.typedByEmail && q.typedByEmail.toLowerCase() === myEmail)
    || (!q.typedByEmail && !!myName && (q.typedBy || '').trim().toLowerCase() === myName)
    || (!!q.pairId && myPairIds.has(q.pairId))
    || (!!q.reviewerEmail && q.reviewerEmail.toLowerCase() === myEmail)
  );

  // Teacher folders: their own department, and each shared (Maths / Aptitude) bank separately
  const isOwnDeptQuestion = (q) => deptNameVariants(lockedDepartment).includes(q.department);
  const sameFolderName = (a, b) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();

  const openFolder = (name) => {
    setSelectedFolder(name);
    if (lockedDepartment) {
      // Subject / topic filters follow the folder's department
      setFilterDept(name);
      setFilterSubject('All');
      setFilterTopic('All');
    }
  };
  const closeFolder = () => {
    setSelectedFolder(null);
    if (lockedDepartment) {
      setFilterDept(lockedDepartment);
      setFilterSubject('All');
      setFilterTopic('All');
    }
  };

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.questionText?.toLowerCase().includes(search.toLowerCase());
    const matchesDept = lockedDepartment
      ? (!selectedFolder
        ? (isOwnDeptQuestion(q) || isCommonDeptName(q.department))
        : selectedFolder === lockedDepartment
          ? isOwnDeptQuestion(q)
          : sameFolderName(q.department, selectedFolder))
      : selectedFolder
        ? (selectedFolder === 'Uncategorized' ? (!q.department || q.department.trim() === '') : q.department === selectedFolder)
        : (filterDept === 'All' || q.department === filterDept);
    const matchesSubject = filterSubject === 'All' || q.subject === filterSubject;
    const matchesTopic = filterTopic === 'All' || q.topic === filterTopic;
    const matchesYear = filterYear === 'All' || q.year === filterYear;
    // Compare the mark number, not the stored text - the same 1-mark question may be saved as
    // "1 Mark (-0.33)", "1" or "1 Mark", and one with no mark shows (and scores) as 1 mark
    const matchesMark = filterMark === 'All' || (markNumberOf(q.mark) || 1) === markNumberOf(filterMark);
    const matchesDifficulty = filterDifficulty === 'All' || q.difficultyLevel === filterDifficulty;
    const matchesStatus = filterStatus === 'All'
      || (filterStatus === 'Not Reviewed' ? (q.status === 'Approved' && q.reviewed === false) : q.status === filterStatus);
    const matchesType = filterType === 'All' || q.questionType === filterType;
    const matchesCategory = filterCategory === 'All' || getQuestionCategory(q) === filterCategory;

    // Questions still with a reviewer (In Review) or sent back (Draft) belong to the typist/reviewer
    // pair only - nobody else sees them until the reviewer approves them.
    if (userRole !== 'typist' && (q.status === 'In Review' || q.status === 'Draft')) return false;

    // Default Role Filtering Logic
    let roleMatches = true;
    if (userRole === 'typist') {
      roleMatches = isMyQuestion(q)
        // Shared banks are visible in the approved Question Bank tab only - Drafts / Pending Review stay pair-only
        || (externalFilter === 'Approved' && isCommonDeptName(q.department));
    }

    // Premium View Filtering
    let premiumMatches = true;
    if (isPremiumView) {
      premiumMatches = q.isPremium === true;
    } else if (userRole === 'admin') {
      // Admin has a separate Premium bank, so premium questions live only there.
      premiumMatches = q.isPremium !== true;
    }

    return matchesSearch && matchesDept && matchesSubject && matchesTopic && matchesYear && matchesMark && matchesDifficulty && matchesStatus && matchesType && matchesCategory && roleMatches && premiumMatches;
  });


  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const paginatedQuestions = filteredQuestions.slice(pageStart, pageStart + pageSize);
  const pageIds = paginatedQuestions.map(q => q.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.includes(id));
  const togglePageSelection = () => {
    setSelectedIds(prev => allPageSelected
      ? prev.filter(id => !pageIds.includes(id))
      : [...new Set([...prev, ...pageIds])]);
  };
  const canMovePremium = userRole === 'admin' || userRole === 'typist';

  const handleGoToPage = (e) => {
    if (e) e.preventDefault();
    const n = parseInt(goToPage, 10);
    if (Number.isNaN(n)) return;
    setCurrentPage(Math.min(Math.max(n, 1), totalPages));
    setGoToPage('');
  };

  const pageNumbers = (() => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || Math.abs(i - safePage) <= 1) pages.push(i);
      else if (pages[pages.length - 1] !== '...') pages.push('...');
    }
    return pages;
  })();

  const totalQuestions = filteredQuestions.length;
  const mcqQuestions = filteredQuestions.filter(q => q.questionType === 'Single Choice' || q.questionType === 'Multiple Choice').length;
  const mcqPercentage = totalQuestions === 0 ? 0 : Math.round((mcqQuestions / totalQuestions) * 100);
  const totalSubjects = new Set(filteredQuestions.map(q => q.subject).filter(Boolean)).size;
  const pendingReview = filteredQuestions.filter(q => q.status === 'In Review').length;
  const notReviewedCount = filteredQuestions.filter(q => q.status === 'Approved' && q.reviewed === false).length;

  return (
    <>
      <div className="relative flex flex-col xl:flex-row gap-8 w-full min-h-[900px] p-4 sm:p-6 lg:p-8 overflow-x-clip z-0 bg-[#F8FAFC]">

        {/* ==================== MAIN CONTENT PANEL ==================== */}
        <div className="flex-1 flex flex-col gap-6 relative z-10 w-full min-w-0">
          
          {/* Main Header */}
          <div className="flex flex-col gap-4">
            {selectedFolder && (
              <button
                onClick={closeFolder}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-all w-fit font-semibold text-sm group"
              >
                <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm group-hover:border-slate-300 group-hover:shadow group-hover:-translate-x-1 transition-all">
                  <ArrowLeft size={16} strokeWidth={2.5} />
                </div>
                {lockedDepartment ? 'Back to Folders' : 'Back to Departments'}
              </button>
            )}
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-[64px] h-[64px] rounded-[20px] bg-white border border-[#EEF2F7] shadow-sm flex items-center justify-center shrink-0">
                  <BookOpen size={28} className="text-[#2563EB]" strokeWidth={2} />
                </div>
                <div className="flex flex-col gap-1">
                  <h1 className="text-[24px] sm:text-[30px] lg:text-[36px] font-[800] text-[#0F172A] leading-none tracking-tight font-sans">
                    {selectedFolder ? `${lockedDepartment && isCommonDeptName(selectedFolder) ? toTitleCase(selectedFolder) : selectedFolder} Questions` : 'Question Bank'}
                  </h1>
                  <p className="text-[15px] font-[500] text-[#64748B] mt-1">
                    {selectedFolder
                      ? (lockedDepartment && isCommonDeptName(selectedFolder)
                        ? 'Shared question bank - available to every department.'
                        : `Manage practice questions for ${selectedFolder}.`)
                      : lockedDepartment
                        ? 'Your department and the shared Maths / Aptitude banks are kept in separate folders.'
                        : 'Select a department folder to manage practice questions.'}
                  </p>
                </div>
              </div>

            {selectedFolder && (
              <button 
                onClick={openAddCreator}
                className="h-[56px] px-8 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:shadow-[0_8px_20px_rgba(37,99,235,0.25)] hover:-translate-y-1 text-white font-[600] text-[15px] rounded-[16px] transition-all shrink-0 flex items-center justify-center gap-2 group"
              >
                <Plus size={20} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" /> 
                Add Question
              </button>
            )}
          </div>
        </div>

          {!selectedFolder && lockedDepartment ? (
            <div className="mt-4">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
                <span className="text-[13px] font-[700] text-slate-400 uppercase tracking-widest">Folders</span>
                <div className="flex-1 h-px bg-slate-200"></div>
              </div>
              {loading ? (
                <div className="py-12 flex justify-center"><Loader /></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {(() => {
                    // Shared banks, one folder each, named as stored on the questions (first spelling seen)
                    const commonNames = [];
                    filteredQuestions.forEach(q => {
                      if (isCommonDeptName(q.department) && !commonNames.some(n => sameFolderName(n, q.department))) {
                        commonNames.push(q.department.trim());
                      }
                    });
                    const folders = [
                      { name: lockedDepartment, label: lockedDepartment, tag: 'Your department', common: false, count: filteredQuestions.filter(isOwnDeptQuestion).length },
                      ...commonNames.sort((a, b) => a.localeCompare(b)).map(name => ({
                        name, label: toTitleCase(name), tag: 'Shared with all departments', common: true,
                        count: filteredQuestions.filter(q => sameFolderName(q.department, name)).length
                      }))
                    ];
                    return folders.map(f => (
                      <div key={f.name} onClick={() => openFolder(f.name)} className={`bg-white rounded-2xl border p-5 cursor-pointer hover:shadow-lg transition-all duration-200 group flex items-center gap-4 ${f.common ? 'border-violet-200 hover:border-violet-400' : 'border-slate-200 hover:border-blue-300'}`}>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors border ${f.common ? 'bg-violet-50 text-violet-600 border-violet-100 group-hover:bg-violet-600 group-hover:text-white group-hover:border-violet-600' : 'bg-blue-50 text-blue-600 border-blue-100 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600'}`}>
                          <FolderOpen size={22} strokeWidth={2} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <h3 className="font-[700] text-[15px] text-slate-800 truncate" title={f.label}>{f.label}</h3>
                          <span className={`text-[10.5px] font-[800] uppercase tracking-wide mt-0.5 ${f.common ? 'text-violet-500' : 'text-blue-500'}`}>{f.tag}</span>
                          <div className="flex items-center gap-1.5 text-slate-400 font-semibold text-[13px] mt-0.5">
                            <FileText size={12} />
                            {f.count} Questions
                          </div>
                        </div>
                        <div className={`ml-auto text-slate-300 transition-colors ${f.common ? 'group-hover:text-violet-400' : 'group-hover:text-blue-400'}`}>
                          <ArrowLeft size={16} className="rotate-180" />
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
          ) : !selectedFolder ? (
            <div className="mt-4">
              {/* Folder grid header */}
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
                <span className="text-[13px] font-[700] text-slate-400 uppercase tracking-widest">Departments</span>
                <div className="flex-1 h-px bg-slate-200"></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {[
                ...departments.filter(d => d !== 'All Departments').map(dept => ({ name: dept, count: filteredQuestions.filter(q => q.department === dept).length })),
                { name: 'Uncategorized', count: filteredQuestions.filter(q => !q.department || q.department.trim() === '').length }
              ].filter(dept => dept.count > 0).map((dept, i) => (
                  <div key={i} onClick={() => openFolder(dept.name)} className="bg-white rounded-2xl border border-slate-200 p-5 cursor-pointer hover:border-blue-300 hover:shadow-lg transition-all duration-200 group flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors border border-blue-100 group-hover:border-blue-600">
                      <FolderOpen size={22} strokeWidth={2} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <h3 className="font-[700] text-[15px] text-slate-800 truncate" title={dept.name}>{dept.name}</h3>
                      <div className="flex items-center gap-1.5 text-slate-400 font-semibold text-[13px] mt-0.5">
                        <FileText size={12} />
                        {dept.count} Questions
                      </div>
                    </div>
                    <div className="ml-auto text-slate-300 group-hover:text-blue-400 transition-colors">
                      <ArrowLeft size={16} className="rotate-180" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* KPI CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {[
                  { label: 'Total Questions', value: totalQuestions, icon: FileText, color: 'blue' },
                  { label: 'Subjects', value: totalSubjects, icon: Bookmark, color: 'purple' },
                  { label: 'MCQ Questions', value: `${mcqPercentage}%`, icon: CheckCircle2, color: 'green' },
                  userRole === 'typist'
                    ? { label: 'Pending Review', value: pendingReview, icon: AlertCircle, color: 'orange' }
                    : { label: 'Not Reviewed', value: notReviewedCount, icon: AlertCircle, color: 'orange' },
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
                  { label: 'Status', plural: 'Statuses', val: filterStatus, setter: setFilterStatus, icon: Circle, opts: userRole === 'typist' ? ['Draft', 'In Review', 'Approved'] : ['Approved', 'Not Reviewed'] },
                  { label: 'Type', plural: 'Types', val: filterType, setter: setFilterType, icon: Layers, opts: questionTypes },
                  { label: 'Category', plural: 'Categories', val: filterCategory, setter: setFilterCategory, icon: Calculator, opts: QUESTION_CATEGORIES },
                  { label: 'Subject', plural: 'Subjects', val: filterSubject, setter: setFilterSubject, icon: Bookmark, opts: subjects },
                  { label: 'Topic', plural: 'Topics', val: filterTopic, setter: setFilterTopic, icon: FileText, opts: topics },
                  { label: 'Year', plural: 'Years', val: filterYear, setter: setFilterYear, icon: Clock, opts: years },
                  { label: 'Marks', plural: 'Marks', val: filterMark, setter: setFilterMark, icon: Trophy, opts: markFilterOptions },
                  { label: 'Difficulty', plural: 'Difficulties', val: filterDifficulty, setter: setFilterDifficulty, icon: Star, opts: difficulties }
                ].map((f, i) => (
                  <div key={i} className="relative group shrink-0">
                    <select
                      value={f.val}
                      onChange={(e) => f.setter(e.target.value)}
                      className="h-[48px] pl-11 pr-10 appearance-none bg-white border border-[#E5E7EB] rounded-[14px] text-[13px] font-[600] text-[#0F172A] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 outline-none transition-all cursor-pointer min-w-[140px] hover:border-[#CBD5E1]"
                    >
                      <option value="All">All {f.plural}</option>
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
                    setSearch(''); setFilterStatus('All'); setFilterDept('All'); setFilterSubject('All'); setFilterTopic('All'); setFilterYear('All'); setFilterMark('All'); setFilterDifficulty('All'); setFilterType('All'); setFilterCategory('All');
                  }}
                  className="h-[48px] px-6 bg-white border border-[#E5E7EB] hover:border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#0F172A] font-[600] text-[13px] rounded-[14px] transition-all flex items-center gap-2"
                >
                  <X size={16} /> Reset
                </button>
              </div>

          {/* BULK ACTION BAR */}
          {selectedIds.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
              <span className="text-[13px] font-[800] text-blue-800">{selectedIds.length} selected</span>
              <div className="flex flex-wrap items-center gap-2 ml-auto">
                {(canQuickEdit || isPairTypist) && (
                  <button
                    type="button"
                    onClick={() => setBulkAction('approve')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-[800] bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm"
                  >
                    <CheckCircle2 size={15} /> Approve
                  </button>
                )}
                {canQuickEdit && (
                  <>
                    <div className="flex items-center bg-white border border-blue-200 rounded-xl p-0.5">
                      <button type="button" onClick={() => setBulkAction('mark1')} className="px-3 py-1.5 rounded-lg text-[12.5px] font-[800] text-blue-700 hover:bg-blue-50">Set 1 Mark</button>
                      <button type="button" onClick={() => setBulkAction('mark2')} className="px-3 py-1.5 rounded-lg text-[12.5px] font-[800] text-blue-700 hover:bg-blue-50">Set 2 Marks</button>
                    </div>
                  </>
                )}
                {canMovePremium && (
                  <button
                    type="button"
                    onClick={() => setBulkAction('premium')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-[800] bg-amber-500 hover:bg-amber-600 text-white transition-colors shadow-sm"
                  >
                    <Star size={15} /> {isPremiumView ? 'Move back to Question Bank' : 'Move to Premium'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setBulkAction('delete')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-[800] bg-red-600 hover:bg-red-700 text-white transition-colors shadow-sm"
                >
                  <Trash2 size={15} /> Delete
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="px-3 py-2 rounded-xl text-[13px] font-[800] text-slate-500 hover:text-slate-800 hover:bg-white transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* QUESTION TABLE */}
          <div className="bg-white border border-[#EEF2F7] rounded-[24px] shadow-[0_10px_28px_rgba(15,23,42,0.05)] flex flex-col mb-8">
            <div className="w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
                <thead>
                  <tr className="border-b border-[#EEF2F7]">
                    <th className="py-5 pl-4 pr-0 w-[4%]">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        onChange={togglePageSelection}
                        disabled={pageIds.length === 0}
                        title="Select all questions on this page"
                        className="w-4 h-4 accent-blue-600 cursor-pointer align-middle"
                      />
                    </th>
                    <th className="py-5 px-4 text-[12px] font-bold text-[#0B1220] uppercase tracking-wider w-[8%]">ID</th>
                    <th className="py-5 px-4 text-[12px] font-bold text-[#0B1220] uppercase tracking-wider w-[31%]">Question</th>
                    <th className="py-5 px-4 text-[12px] font-bold text-[#0B1220] uppercase tracking-wider w-[15%]">Type</th>
                    <th className="py-5 px-4 text-[12px] font-bold text-[#0B1220] uppercase tracking-wider w-[14%]">Marks</th>
                    <th className="py-5 px-4 text-[12px] font-bold text-[#0B1220] uppercase tracking-wider w-[13%]">Status</th>
                    <th className="py-5 px-4 text-[12px] font-bold text-[#0B1220] uppercase tracking-wider w-[15%] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF2F7]">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center">
                        <Loader />
                      </td>
                    </tr>
                  ) : filteredQuestions.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-[#64748B] font-[500] text-[15px]">
                        No questions found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedQuestions.map((q, index) => (
                      <React.Fragment key={q.id}>
                        <tr 
                          onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                          className={`group transition-colors duration-200 cursor-pointer ${selectedIds.includes(q.id) ? 'bg-blue-50/60 hover:bg-blue-50' : 'hover:bg-[#F8FAFF]'}`}
                        >
                          <td className="py-4 pl-4 pr-0 h-[82px]" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(q.id)}
                              onChange={() => toggleSelected(q.id)}
                              className="w-4 h-4 accent-blue-600 cursor-pointer align-middle"
                            />
                          </td>
                          <td className="py-4 px-4 h-[82px]">
                            <span className="text-[13px] font-[700] text-[#64748B] bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm inline-flex items-center justify-center min-w-[28px]">
                              {pageStart + index + 1}
                            </span>
                          </td>
                          <td className="py-4 px-4 h-[82px] max-w-0">
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col gap-1 w-full max-w-full overflow-hidden">
                              <span className="text-[15px] font-[600] text-[#0F172A] truncate block flex items-center gap-1.5" title={stripHtmlAndNormalize(q.questionText)}>
                                {q.isImported && <Sparkles size={14} className="text-purple-500 shrink-0" />}
                                {(userRole === 'admin' || userRole === 'typist') && q.isPremium && !isPremiumView && (
                                  <span className="shrink-0 flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    <span className="text-amber-500">★</span> Premium
                                  </span>
                                )}
                                <span className="truncate">{stripHtmlAndNormalize(q.questionText) || 'Untitled Question'}</span>
                              </span>
                              <span className="text-[13px] font-[500] text-[#64748B] truncate flex items-center gap-1.5">
                                {isCommonDeptName(q.department) && (
                                  <span className="shrink-0 bg-violet-50 border border-violet-200 text-violet-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    {toTitleCase(q.department)}
                                  </span>
                                )}
                                <span className="truncate">{q.subject || 'No Subject'}</span>
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 h-[82px] max-w-0 overflow-hidden">
                          <div className="flex items-center gap-2">
                            <ChevronDown size={16} className={`shrink-0 text-purple-400 transition-transform duration-200 ${expandedId === q.id ? '' : '-rotate-90'}`} />
                            <span className="inline-flex items-center justify-center min-w-[72px] px-4 py-1.5 rounded-full bg-[#7C3AED] text-white text-[12px] font-[800] tracking-wide shadow-sm" title={q.questionType}>
                              {questionTypeShort(q.questionType)}
                            </span>
                            {getQuestionCategory(q) === 'Numerical' && (
                              <span
                                className="shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-[800] bg-sky-50 text-sky-700 border-sky-200"
                                title={q.questionCategory ? 'Set on this question' : 'Auto-detected'}
                              >
                                NUM
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 h-[82px]" onClick={(e) => e.stopPropagation()}>
                          {(() => {
                            const n = markNumberOf(q.mark) || 1;
                            return (
                              <div className="flex flex-col items-start gap-1">
                                {canQuickEdit ? (
                                  <div className="inline-flex bg-slate-100 p-0.5 rounded-full" role="group" aria-label="Marks">
                                    {[1, 2].map(v => (
                                      <button
                                        key={v}
                                        type="button"
                                        onClick={() => handleQuickMark(q, v)}
                                        title={`${v} mark${v > 1 ? 's' : ''}`}
                                        className={`px-2.5 py-1 rounded-full text-[11.5px] font-[800] transition-colors ${n === v ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                      >
                                        {v}M
                                      </button>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[11.5px] font-[800]">{n}M</span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="py-4 px-4 h-[82px]">
                          {q.status === 'Approved' && q.reviewed === false ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border text-[11px] font-[800] bg-amber-50 text-amber-600 border-amber-100" title="Imported directly into the Question Bank, skipping reviewer approval">
                              <AlertTriangle size={12} /> Not Reviewed
                            </span>
                          ) : (
                            <span className={`inline-flex items-center px-3 py-1 rounded-full border text-[11px] font-[800] ${
                              q.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                              q.status === 'In Review' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                              'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                              {q.status || 'Draft'}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 h-[82px] text-right">
                          <div className="flex items-center justify-end gap-2">
                            {needsApproval(q) && canApprove(q) && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleQuickApprove(q); }}
                                title="Approve this question"
                                className="h-[36px] px-3 flex items-center gap-1.5 rounded-[10px] bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-[800] shadow-sm transition-colors"
                              >
                                <CheckCircle2 size={15} /> Approve
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEdit(q); }}
                              title="Edit question"
                              className="w-[36px] h-[36px] flex items-center justify-center rounded-[10px] bg-white text-[#64748B] hover:text-[#2563EB] hover:bg-blue-50 shadow-[0_2px_8px_rgba(15,23,42,0.05)] transition-colors border border-[#EEF2F7]">
                              <Edit2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedId === q.id && (
                        <tr className="bg-[#F8FAFF] border-b border-[#EEF2F7]">
                          <td colSpan="7" className="px-4 py-6">
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
                              <MatchColumns question={q} className="mb-4" />
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
            
            {/* Pagination */}
            {!loading && filteredQuestions.length > 0 && (
              <div className="p-5 border-t border-[#EEF2F7] flex flex-col lg:flex-row items-center justify-between gap-3 bg-[#F8FAFC]/50">
                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-5">
                  <span className="text-[13px] font-[500] text-[#64748B] text-center sm:text-left">
                    Showing {pageStart + 1} to {Math.min(pageStart + pageSize, filteredQuestions.length)} of {filteredQuestions.length} questions
                  </span>
                  <label className="flex items-center gap-2 text-[13px] font-[500] text-[#64748B]">
                    Per page
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="h-8 rounded-lg border border-[#EEF2F7] bg-white px-2 text-[13px] font-[600] text-[#334155] outline-none focus:border-[#2563EB]"
                    >
                      {[5, 10, 20, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(safePage - 1)}
                    disabled={safePage === 1}
                    className="w-8 h-8 rounded-lg border border-[#EEF2F7] bg-white flex items-center justify-center text-[#64748B] hover:border-[#CBD5E1] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronDown size={16} className="rotate-90" />
                  </button>
                  {pageNumbers.map((n, i) => n === '...' ? (
                    <span key={`gap-${i}`} className="text-[#94A3B8]">...</span>
                  ) : (
                    <button
                      key={n}
                      onClick={() => setCurrentPage(n)}
                      className={n === safePage
                        ? 'w-8 h-8 rounded-lg bg-[#2563EB] text-white font-[600] text-[13px] shadow-sm flex items-center justify-center'
                        : 'w-8 h-8 rounded-lg border border-[#EEF2F7] bg-white flex items-center justify-center text-[#64748B] font-[600] text-[13px] hover:border-[#CBD5E1] transition-colors'}
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(safePage + 1)}
                    disabled={safePage === totalPages}
                    className="w-8 h-8 rounded-lg border border-[#EEF2F7] bg-white flex items-center justify-center text-[#64748B] hover:border-[#CBD5E1] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronDown size={16} className="-rotate-90" />
                  </button>
                  <form onSubmit={handleGoToPage} className="flex items-center gap-2 ml-2 pl-3 border-l border-[#EEF2F7]">
                    <span className="text-[13px] font-[500] text-[#64748B] whitespace-nowrap">Go to</span>
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={goToPage}
                      onChange={(e) => setGoToPage(e.target.value)}
                      placeholder={`1-${totalPages}`}
                      className="w-16 h-8 rounded-lg border border-[#EEF2F7] bg-white px-2 text-[13px] font-[600] text-[#334155] outline-none focus:border-[#2563EB] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button type="submit" className="h-8 px-3 rounded-lg bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-[600] text-[13px] transition-colors">Go</button>
                  </form>
                </div>
              </div>
            )}
          </div>
            </>
          )}
        </div>
      </div>

      {/* FULL-SCREEN STANDALONE QUESTION CREATOR */}
      {isCreatorOpen && createPortal(
        <div className="fixed inset-0 bg-[#f4f7fb] z-[99999] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          {/* TOP BAR */}
          <div className="min-h-[60px] bg-white border-b border-slate-100 px-4 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
              <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-lg">
                <BookOpen size={16} className="text-indigo-600" />
                <span className="font-[800] text-indigo-900 text-[13px] tracking-wide hidden sm:inline">Standalone Question Creator</span>
                <span className="font-[800] text-indigo-900 text-[13px] tracking-wide sm:hidden">Question Creator</span>
              </div>
              <div className="bg-slate-100 px-3 py-1 rounded-full text-[12px] font-[700] text-slate-500">
                1 Saved
              </div>
              <div className="w-px h-5 bg-slate-200 hidden sm:block"></div>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-[900] text-[#111827]">Questions:</span>
                <div className="w-7 h-7 rounded-full bg-[#059669] text-white flex items-center justify-center font-[800] text-[13px] shadow-sm">1</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button type="button" className="flex items-center gap-1.5 text-[#059669] hover:text-emerald-700 font-[800] text-[13px] bg-white hover:bg-emerald-50 px-4 py-2 rounded-full transition-colors border-[1.5px] border-[#059669]">
                <Plus size={16} /> Add Question
              </button>
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

                    {/* Numerical / Theory - used by the test creator's numerical/theory split */}
                    <div className="flex items-center gap-2">
                      <div className="flex bg-slate-100 p-1 rounded-full" role="group" aria-label="Question category">
                        {QUESTION_CATEGORIES.map(cat => {
                          const active = getQuestionCategory(formData) === cat;
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, questionCategory: cat }))}
                              className={`px-3.5 py-1.5 rounded-full text-[12px] font-[800] transition-all ${active
                                ? (cat === 'Numerical' ? 'bg-sky-600 text-white shadow-sm' : 'bg-rose-600 text-white shadow-sm')
                                : 'text-slate-500 hover:text-slate-700'}`}
                            >
                              {cat}
                            </button>
                          );
                        })}
                      </div>
                      {formData.questionCategory ? (
                        formData.questionCategory !== inferQuestionCategory(formData) && (
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, questionCategory: '' }))}
                            className="text-[11px] font-[700] text-slate-400 hover:text-slate-600 underline"
                            title={`Auto-detection would say ${inferQuestionCategory(formData)}`}
                          >
                            Reset to auto
                          </button>
                        )
                      ) : (
                        <span className="text-[11px] font-[700] text-slate-400">Auto-detected</span>
                      )}
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
                    <button type="button" onClick={() => setMarkNumber(1)} className={`whitespace-nowrap px-4 sm:px-5 py-2 text-[13px] font-[800] rounded-full transition-colors ${markNumber(formData.mark) === 1 ? 'border-[1.5px] border-blue-600 text-blue-600 bg-white shadow-sm' : 'text-slate-500'}`}>1 Mark (-0.33)</button>
                    <button type="button" onClick={() => setMarkNumber(2)} className={`whitespace-nowrap px-4 sm:px-5 py-2 text-[13px] font-[800] rounded-full transition-colors ${markNumber(formData.mark) === 2 ? 'border-[1.5px] border-blue-600 text-blue-600 bg-white shadow-sm' : 'text-slate-500'}`}>2 Mark (-0.66)</button>
                    <span className="bg-red-50 border-[1.5px] border-red-200 text-red-600 text-[13px] font-[900] px-3 sm:px-4 py-2 rounded-full flex items-center gap-1.5 sm:gap-2 ml-1 sm:ml-2 shadow-sm whitespace-nowrap">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></div> {negativeMarkFor(formData) ? `Neg: -${negativeMarkFor(formData)}` : 'No negative (MSQ/NAT)'}
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
                              {/* Rich editor, like the question text: items are HTML (maths is KaTeX), so a
                                  plain textarea would show "<span class=katex..." and "&gt;" instead */}
                              <RichTextEditor
                                value={item}
                                onChange={(e) => handleMatchColumn1Change(idx, e.target.value)}
                                placeholder={`Column 1 item ${String.fromCharCode(97 + idx)}`}
                                className={`flex-1 w-full bg-white border-[1.5px] ${idx === 0 ? 'border-indigo-400' : 'border-slate-200'} rounded-[16px] p-4 text-[15px] font-[600] text-[#111827] outline-none focus:border-indigo-400 transition-colors shadow-sm min-h-[100px] max-h-[220px] break-words`}
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
                              <RichTextEditor
                                value={item}
                                onChange={(e) => handleMatchColumn2Change(idx, e.target.value)}
                                placeholder={`Column 2 item ${idx + 1}`}
                                className="flex-1 w-full bg-white border-[1.5px] border-slate-200 rounded-[16px] p-4 text-[15px] font-[600] text-[#111827] outline-none focus:border-indigo-400 transition-colors shadow-sm min-h-[100px] max-h-[220px] break-words"
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
                      <div className="ml-auto flex items-center gap-1">
                         <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={handlePasteExplanation} className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-[800] text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-lg transition-colors" title="Paste copied text or image into the explanation"><ClipboardPaste size={15}/> Paste</button>
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
                                {/* Rich editor: options are HTML (maths is KaTeX) - a plain input showed
                                    "<span class="katex">..." for every extracted formula */}
                                <RichTextEditor
                                  name={`option${opt}`}
                                  value={formData[`option${opt}`]}
                                  onChange={handleInputChange}
                                  placeholder={`Option ${opt}`}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 min-h-[40px] max-h-[160px] text-[15px] font-[700] text-slate-800 outline-none focus:border-slate-300 transition-colors break-words"
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

                      {/* Value Input - the exact value always shows; Numeric Range adds the range under it */}
                      <div className="flex flex-col gap-2">
                          <label className="text-[13px] font-[900] text-slate-800">Exact Answer Value {formData.fillBlankMode === 'Exact Match' && <span className="text-red-500">*</span>}</label>
                          <input 
                            type="text"
                            name="fillBlankAnswer"
                            value={formData.fillBlankAnswer || ''}
                            onChange={handleInputChange}
                            placeholder="e.g. 2"
                            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-[15px] font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                          />
                      </div>
                      {formData.fillBlankMode === 'Numeric Range' && (
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
              <div className="px-5 pt-4 pb-1 flex items-center gap-2">
                <Tag size={16} className="text-indigo-600" />
                <h3 className="text-[13px] font-[900] text-[#111827] uppercase tracking-wider">Question Attributes</h3>
              </div>
              
              <div className="shrink-0 px-5 py-2.5 space-y-2.5">
                
                <div className="space-y-1">
                  <label className="text-[12px] font-[800] text-[#111827]">Department <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select name="department" required value={formData.department} onChange={handleInputChange} className="w-full appearance-none bg-white border border-slate-200 text-slate-500 text-[13px] font-[600] rounded-xl pl-4 pr-10 py-2 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:border-slate-300 transition-colors shadow-sm">
                      <option value="">-- Select Department --</option>
                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-[800] text-[#111827]">Subject <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select name="subject" required value={formData.subject} onChange={handleInputChange} className="w-full appearance-none bg-white border border-slate-200 text-slate-500 text-[13px] font-[600] rounded-xl pl-4 pr-10 py-2 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:border-slate-300 transition-colors shadow-sm">
                      <option value="">-- Select Subject --</option>
                      {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-[800] text-[#111827]">Topic <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select name="topic" required value={formData.topic} onChange={handleInputChange} className="w-full appearance-none bg-white border border-slate-200 text-slate-500 text-[13px] font-[600] rounded-xl pl-4 pr-10 py-2 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:border-slate-300 transition-colors shadow-sm">
                      <option value="">-- Select Topic --</option>
                      {topics.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Year and Mark side by side - keeps the action buttons in view without scrolling */}
                <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1 min-w-0">
                  <label className="text-[12px] font-[800] text-[#111827]">Year <span className="font-[600] text-slate-400">(Opt.)</span></label>
                  <div className="relative">
                    <select name="year" value={formData.year} onChange={handleInputChange} className="w-full appearance-none bg-white border border-slate-200 text-slate-500 text-[13px] font-[600] rounded-xl pl-3 pr-8 py-2 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:border-slate-300 transition-colors shadow-sm">
                      <option value="">No Year</option>
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1 min-w-0">
                  <label className="text-[12px] font-[800] text-[#111827]">Mark <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select name="mark" required value={markOptionFor(formData.mark)} onChange={handleInputChange} className="w-full appearance-none bg-white border border-slate-200 text-slate-500 text-[13px] font-[600] rounded-xl pl-3 pr-8 py-2 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:border-slate-300 transition-colors shadow-sm">
                      <option value="">Select</option>
                      {marks.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] font-[800] text-[#111827]">Difficulty Level <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select name="difficultyLevel" required value={formData.difficultyLevel} onChange={handleInputChange} className="w-full appearance-none bg-white border border-slate-200 text-slate-500 text-[13px] font-[600] rounded-xl pl-4 pr-10 py-2 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:border-slate-300 transition-colors shadow-sm">
                      <option value="">-- Select Difficulty --</option>
                      {difficulties.map(df => <option key={df} value={df}>{df}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex-1 min-h-0 overflow-y-auto px-5 py-3 bg-[#f8fafc] space-y-2 border-t border-slate-200">
                {userRole === 'typist' ? (
                  pairRole === 'reviewer' ? (
                    <>
                      {/* Same compact layout as the typist's: one row, fits without scrolling */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleSubmit(e, 'Approved')}
                          title="Approve - the question goes into the Question Bank"
                          className="flex items-center justify-center gap-1.5 py-2.5 rounded-full bg-[#10B981] hover:bg-[#059669] text-white font-[800] text-[13px] transition-colors shadow-md shadow-emerald-500/20"
                        >
                          <CheckCircle2 size={15} /> Approve
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleSubmit(e, 'Draft')}
                          title="Reject - sends the question back to the typist's Drafts"
                          className="flex items-center justify-center gap-1.5 py-2.5 rounded-full bg-red-500 hover:bg-red-600 text-white font-[800] text-[13px] transition-colors shadow-md shadow-red-500/20"
                        >
                          <X size={15} /> Reject
                        </button>
                      </div>
                      <p className="text-[10.5px] font-[700] text-slate-500 leading-tight">
                        Reject sends it back to the typist's Drafts.
                      </p>
                    </>
                  ) : isEditing && formData.status === 'Approved' ? (
                    // Typist editing a question that is already in the Question Bank: it stays there
                    // (and in any test using it), flagged Not Reviewed until the reviewer / admin approves
                    <>
                      {/* Compact, and the skip-review import looks the same as on a new question */}
                      <button
                        type="button"
                        onClick={(e) => handleSubmit(e, 'Approved', true)}
                        title="Skips your reviewer - the changes go straight into the Question Bank (and tests), flagged as Not Reviewed"
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-[800] text-[13px] transition-colors shadow-md shadow-amber-500/20"
                      >
                        <Upload size={15} /> Save to Question Bank (Skip Review)
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleSubmit(e, 'In Review')}
                        title="Takes it out of the Question Bank (and tests) until the reviewer approves it again"
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full bg-white border border-slate-200 text-[#111827] font-[800] text-[13px] hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm"
                      >
                        <ChevronRight size={15} /> Send to Reviewer
                      </button>
                      <p className="text-[10.5px] font-[700] text-amber-600 flex items-center gap-1 leading-tight">
                        <AlertTriangle size={12} className="shrink-0" /> Skip Review keeps it live as Not Reviewed.
                      </p>
                    </>
                  ) : (
                    <>
                      {/* Compact so every action fits in view without scrolling */}
                      <button
                        type="button"
                        onClick={(e) => handleSubmit(e, 'In Review')}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full bg-[#3b82f6] hover:bg-blue-600 text-white font-[800] text-[13px] transition-colors shadow-md shadow-blue-500/20"
                      >
                        <Check size={16} /> Save & Send to Review
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleSaveAndNext(e, 'In Review')}
                          title="Send this question to review and start the next one"
                          className="flex items-center justify-center gap-1.5 py-2.5 rounded-full bg-white border border-slate-200 text-[#111827] font-[800] text-[12.5px] hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm"
                        >
                          <ChevronRight size={15} /> Save & Next
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleSaveAndNext(e, 'Draft')}
                          className="flex items-center justify-center gap-1.5 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-[800] text-[12.5px] transition-colors shadow-sm"
                        >
                          <Save size={15} /> Draft
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleSubmit(e, 'Approved', true)}
                        title="Skips your reviewer - the question goes straight into the Question Bank, flagged as Not Reviewed"
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-[800] text-[13px] transition-colors shadow-md shadow-amber-500/20"
                      >
                        <Upload size={15} /> Import (Skip Review)
                      </button>
                      <p className="text-[10.5px] font-[700] text-amber-600 flex items-center gap-1 leading-tight">
                        <AlertTriangle size={12} className="shrink-0" /> Import skips your reviewer - saved as Not Reviewed.
                      </p>
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
        <div className="fixed bottom-6 right-4 left-4 sm:left-auto sm:right-6 z-[999999] max-w-sm mx-auto sm:mx-0 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border ${toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
            {toast.type === 'error' ? <X size={20} className="text-red-500" /> : <CheckCircle2 size={20} className="text-emerald-500" />}
            <span className="text-[14px] font-[800]">{toast.message}</span>
          </div>
        </div>,
        document.body
      )}

      {/* Bulk Action Confirmation Modal */}
      {bulkAction && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 pb-4">
              <h3 className="text-[18px] font-[900] text-slate-800 mb-2">
                {bulkAction === 'delete'
                  ? `Delete ${selectedIds.length} Question${selectedIds.length === 1 ? '' : 's'}`
                  : bulkAction === 'approve' ? `Approve ${selectedIds.length} Question${selectedIds.length === 1 ? '' : 's'}`
                    : bulkAction === 'mark1' || bulkAction === 'mark2' ? `Set ${bulkAction === 'mark2' ? '2 Marks' : '1 Mark'}`
                      : isPremiumView ? 'Move back to Question Bank' : 'Move to Premium Question Bank'}
              </h3>
              <p className="text-[14px] font-[500] text-slate-500 leading-relaxed">
                {bulkAction === 'delete'
                  ? `Are you sure you want to delete ${selectedIds.length} selected question${selectedIds.length === 1 ? '' : 's'}? This action cannot be undone.`
                  : bulkAction === 'approve'
                    ? `${selectedIds.length} selected question${selectedIds.length === 1 ? '' : 's'} will be marked Approved and Reviewed by you.`
                    : bulkAction === 'mark1' || bulkAction === 'mark2'
                      ? `${selectedIds.length} selected question${selectedIds.length === 1 ? '' : 's'} will be worth ${bulkAction === 'mark2' ? '2 marks' : '1 mark'}. MCQ and Match questions get ${bulkAction === 'mark2' ? '-0.66' : '-0.33'} for a wrong answer; MSQ and NAT have no negative marking.`
                      : isPremiumView
                        ? `${selectedIds.length} selected question${selectedIds.length === 1 ? '' : 's'} will be removed from the Premium Question Bank and moved to the regular Question Bank.`
                        : `${selectedIds.length} selected question${selectedIds.length === 1 ? '' : 's'} will be moved to the Premium Question Bank.`}
              </p>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setBulkAction(null)}
                disabled={isBulkWorking}
                className="px-4 py-2 text-[13px] font-[800] text-slate-600 hover:text-slate-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmBulkAction}
                disabled={isBulkWorking}
                className={`px-5 py-2 text-[13px] font-[800] text-white rounded-lg transition-colors shadow-sm disabled:opacity-60 ${bulkAction === 'delete' ? 'bg-red-600 hover:bg-red-700' : bulkAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : bulkAction === 'mark1' || bulkAction === 'mark2' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-500 hover:bg-amber-600'}`}
              >
                {isBulkWorking ? 'Working...' : bulkAction === 'delete' ? 'Delete' : bulkAction === 'approve' ? 'Approve' : bulkAction === 'mark1' || bulkAction === 'mark2' ? 'Apply' : 'Move'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </>
  );
}
