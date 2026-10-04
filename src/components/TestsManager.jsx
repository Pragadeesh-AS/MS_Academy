import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc, serverTimestamp, query, where, Timestamp } from 'firebase/firestore';
import { Plus, Trash2, Calendar, Clock, BookOpen, Layers, Check, FileText, ChevronRight, X, AlertCircle, Info, Award, CheckCircle2, ChevronLeft, Landmark, Edit2, Lock, Unlock, Timer, Settings2, FolderOpen, ArrowLeft } from 'lucide-react';

import { isNumericalQuestion, getQuestionCategory } from '../utils/questionCategory';
import { markNumberOf } from '../utils/marking';
import {
  RELEASE_MODES, releaseMode, releaseAtMillis, testEndMillis, areSolutionsVisible,
  formatReleaseTime, releaseStatusLabel, solutionsEmail
} from '../utils/solutionRelease';

import TestScheduleCalendar from './tests/TestScheduleCalendar';
import { sameDepartment, canonicalDepartment } from '../utils/subjects';
import { TEST_TEMPLATES, templateByKey, templateMarks, templateQuestions, templateNumerical, subjectGroup, distributeAllocations, templateKeyOf, templateFoldersFor, folderName } from '../utils/testTemplates';
import { formatTestTime, testStartMillis } from '../utils/testSchedule';
import { QUESTION_TYPES, TYPE_KEYS, TYPE_PRESETS, presetLabel, questionTypeKey, typeCountsOf, sumCounts, pctOf, cellsCanSupply, planTypeMix, buildTypeSplit, defaultTypeSplit } from '../utils/questionTypeSplit';

import tkModule from '@axelixlabs/react-timepicker';
const TimeKeeper = tkModule.default || tkModule;

// Marks of a question as a number, whatever text it's stored as ("1 Mark (-0.33)", "1", "1 Mark").
// A question with no mark counts as 1 - that's how the Question Bank shows it and how tests score it.
const markValue = (q) => markNumberOf(q.mark) || 1;
const markText = (n) => `${n} Mark${n === 1 ? '' : 's'}`;

const TYPE_META = {
  MCQ: { label: 'MCQ', chip: 'bg-blue-50/70 border-blue-100 text-blue-700', dot: 'bg-blue-500', bar: 'bg-blue-500' },
  MSQ: { label: 'MSQ', chip: 'bg-indigo-50/70 border-indigo-100 text-indigo-700', dot: 'bg-indigo-500', bar: 'bg-indigo-500' },
  NAT: { label: 'NAT', chip: 'bg-amber-50/70 border-amber-100 text-amber-700', dot: 'bg-amber-500', bar: 'bg-amber-500' },
  Match: { label: 'Match', chip: 'bg-emerald-50/70 border-emerald-100 text-emerald-700', dot: 'bg-emerald-500', bar: 'bg-emerald-500' }
};

const shortType = (type) => ({
  'Single Choice': 'MCQ',
  'Multiple Choice': 'MSQ',
  'Fill in Blanks': 'NAT',
  'Fill in the Blanks': 'NAT',
  'Match': 'Match'
}[type] || type);

export default function TestsManager({ department = '', isTeacher = false, onEditQuestion = null }) {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [attributes, setAttributes] = useState([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [editingTestId, setEditingTestId] = useState(null);
  const [openFolder, setOpenFolder] = useState(null); // department folder (admin)
  const [openTemplateFolder, setOpenTemplateFolder] = useState(null); // 'topic' | 'subject' | 'full' | 'other'
  const [editBundleTest, setEditBundleTest] = useState(null);
  const [editBundleValue, setEditBundleValue] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  // Wizard Step State
  const [step, setStep] = useState(1); // 1: Specs, 2: Hierarchy, 3: Topic Marks (allocations), 4: Question Types
  // Built-in blueprint the test was started from ('' = custom) - see utils/testTemplates
  const [templateKey, setTemplateKey] = useState('');
  const [templateShortages, setTemplateShortages] = useState([]);

  // Wizard Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(180);
  const [targetMarks, setTargetMarks] = useState(100);
  const [total1Mark, setTotal1Mark] = useState(30);
  const [total2Mark, setTotal2Mark] = useState(35);
  // Optional split of the test's questions into numerical / theory ('' = no split, pick any)
  const [numericalCount, setNumericalCount] = useState('');
  const [theoryCount, setTheoryCount] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [closesAt, setClosesAt] = useState(''); // optional - no new starts after this (see utils/testSchedule)
  const [view, setView] = useState('templates'); // 'templates' | 'schedule' (calendar)
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [bundleId, setBundleId] = useState(''); // '' means dept level, 'free' means free, 'specific_id' means exclusive
  const [bundles, setBundles] = useState([]);

  const [selectedDept, setSelectedDept] = useState(department || '');
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState([]); // Array support for multiple topics
  const [allocations, setAllocations] = useState({}); // { topicName: { q1: count, q2: count } }
  const [selectionMode, setSelectionMode] = useState('auto'); // 'auto' | 'manual' | 'both'
  const [manualSelectedIds, setManualSelectedIds] = useState([]);
  const [manualFilters, setManualFilters] = useState({ type: 'All', difficulty: 'All', mark: 'All', topic: 'All', category: 'All' });
  // Step 4 MCQ / MSQ / NAT / Match mix: { mode, autoAdjusted, fromDefault, pct: { MCQ: '25', ... }, count: { MCQ: 16, ... } }
  const [typeSplit, setTypeSplit] = useState(null);


  useEffect(() => {
    fetchTests();
    fetchAttributes();
    fetchQuestions();
    if (!isTeacher) {
      fetchBundles();
    }
  }, [department]);

  const fetchBundles = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'course_bundles'));
      setBundles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Error fetching bundles:", err);
    }
  };

  // Always pull the latest counts from database when the creator modal opens or step changes
  useEffect(() => {
    if (isCreatorOpen) {
      fetchQuestions();
      fetchAttributes();
    }
  }, [isCreatorOpen, step]);

  // Sync allocations when selected topics change
  useEffect(() => {
    setAllocations(prev => {
      const next = {};
      selectedTopics.forEach(topic => {
        next[topic] = prev[topic] || { q1: 0, q2: 0 };
      });
      return next;
    });
  }, [selectedTopics]);

  const fetchTests = async () => {
    setLoading(true);
    try {
      let q = collection(db, 'tests');
      if (isTeacher && department) {
        q = query(collection(db, 'tests'), where('department', '==', department));
      }
      const snapshot = await getDocs(q);
      const testsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTests(testsList);
    } catch (err) {
      console.error("Error fetching tests:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttributes = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'question_attributes'));
      setAttributes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Error fetching attributes:", err);
    }
  };

  const fetchQuestions = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'question_bank'));
      setQuestions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(q => q.status === 'Approved' || !q.status));
    } catch (err) {
      console.error("Error fetching questions:", err);
    }
  };

  // The pills use full names like "Computer Science (CSE)", but department attributes and
  // question records store the short code ("CSE"), so accept either form.
  // ("Chemical Engineering (CH)" also matches "CHEMICAL ENGINEERING" / "Chemical Engineering")
  const matchesSelectedDept = (value) => sameDepartment(value, selectedDept);

  // Cascading lists helper
  const selectedDeptObj = selectedDept ? attributes.find(a => a.type === 'department' && matchesSelectedDept(a.name)) : null;

  // Engineering Mathematics and Aptitude subjects are common to every department, so they're
  // offered alongside the selected department's own subjects.
  const isCommonDeptName = (name) => {
    const n = (name || '').trim().toLowerCase();
    return n === 'engineering mathematics' || /ap+titude/.test(n);
  };
  const toTitleCase = (s) => (s || '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  const commonDeptObjs = attributes.filter(a => a.type === 'department' && isCommonDeptName(a.name) && a.id !== selectedDeptObj?.id);

  // Target department buttons: the departments set up in the Attributes tab (not the shared
  // Maths / Aptitude banks), labelled as the admin named them. A test is saved under the matching
  // student-side name ("CHEMICAL ENGINEERING" -> "Chemical Engineering (CH)") so it reaches the
  // students of that department.
  const targetDepartments = attributes
    .filter(a => a.type === 'department' && !isCommonDeptName(a.name))
    .map(a => ({ id: a.id, label: a.name, value: canonicalDepartment(a.name) }))
    .filter((d, i, all) => all.findIndex(x => sameDepartment(x.value, d.value)) === i)
    .sort((a, b) => a.label.localeCompare(b.label));

  // Every department attribute that is this department (e.g. "Chemical" and "CHEMICAL ENGINEERING")
  const selectedDeptIds = new Set(attributes.filter(a => a.type === 'department' && !isCommonDeptName(a.name) && matchesSelectedDept(a.name)).map(a => a.id));
  const deptSubjectAttrs = attributes.filter(a => a.type === 'subject' && (selectedDept ? selectedDeptIds.has(a.parentId) : true));

  const subjectsList = [
    ...deptSubjectAttrs.map(a => ({ name: a.name, label: a.name, attr: a, commonDept: null })),
    ...(selectedDept ? commonDeptObjs.flatMap(dept =>
      attributes
        .filter(a => a.type === 'subject' && a.parentId === dept.id)
        .map(a => ({ name: a.name, label: `${toTitleCase(dept.name)} : ${a.name}`, attr: a, commonDept: dept }))
    ) : [])
  ];

    // New question dept matcher that supports multiple subjects
  const questionDeptMatches = (qDept, qSubject) => {
    const subEntry = subjectsList.find(s => (s.name || '').trim().toLowerCase() === (qSubject || '').trim().toLowerCase());
    if (subEntry && subEntry.commonDept) {
      return (qDept || '').trim().toLowerCase() === (subEntry.commonDept.name || '').trim().toLowerCase() || matchesSelectedDept(qDept);
    }
    return matchesSelectedDept(qDept);
  };

    const topicsList = attributes
    .filter(a => a.type === 'topic' && (selectedSubjects.length === 0 || selectedSubjects.some(subName => {
      const subEntry = subjectsList.find(s => s.name === subName);
      return subEntry && a.parentId === subEntry.attr.id;
    })))
    .map(a => a.name);

  // Helper to count available questions per topic (robust trimming & case-insensitive matching)
  const getTopicCounts = (topicName) => {
    const pool = questions.filter(q => 
      questionDeptMatches(q.department, q.subject) && selectedSubjects.some(sub => (q.subject || '').trim().toLowerCase() === sub.toLowerCase()) &&
      (q.topic || '').trim().toLowerCase() === (topicName || '').trim().toLowerCase()
    );
    const pool1 = pool.filter(q => markValue(q) === 1);
    const pool2 = pool.filter(q => markValue(q) === 2);
    const n1 = pool1.filter(isNumericalQuestion).length;
    const n2 = pool2.filter(isNumericalQuestion).length;
    return { q1: pool1.length, q2: pool2.length, n1, n2, t1: pool1.length - n1, t2: pool2.length - n2 };
  };

  // Numerical/theory split: both boxes empty = no split
  const hasCategorySplit = numericalCount !== '' || theoryCount !== '';
  const totalQuestionTarget = (parseInt(total1Mark) || 0) + (parseInt(total2Mark) || 0);
  const numericalTarget = parseInt(numericalCount) || 0;
  const theoryTarget = parseInt(theoryCount) || 0;

  const handleNumericalCountChange = (value) => {
    const n = value === '' ? '' : Math.max(0, parseInt(value) || 0);
    setNumericalCount(n);
    // Fill the other box so the two always add up to the question total
    setTheoryCount(n === '' ? '' : Math.max(0, totalQuestionTarget - n));
  };
  const handleTheoryCountChange = (value) => {
    const t = value === '' ? '' : Math.max(0, parseInt(value) || 0);
    setTheoryCount(t);
    setNumericalCount(t === '' ? '' : Math.max(0, totalQuestionTarget - t));
  };

  // Every topic x mark allocation can take between `lo` and `hi` numerical questions (the rest are
  // theory), limited by how many of each the bank has. Returns the achievable numerical range.
  const numericalRangeFor = (cells) => cells.reduce((r, c) => ({
    min: r.min + Math.max(0, c.count - c.theory),
    max: r.max + Math.min(c.count, c.numerical)
  }), { min: 0, max: 0 });

  const allocationCells = () => selectedTopics.flatMap(topic => {
    const counts = getTopicCounts(topic);
    const alloc = allocations[topic] || {};
    return [
      { count: Math.min(parseInt(alloc.q1) || 0, counts.q1), numerical: counts.n1, theory: counts.t1 },
      { count: Math.min(parseInt(alloc.q2) || 0, counts.q2), numerical: counts.n2, theory: counts.t2 }
    ];
  });

  // ---- Test templates
  const applyTemplate = (key, { fresh = false } = {}) => {
    const t = templateByKey(key);
    setTemplateShortages([]);
    if (!t) { setTemplateKey(''); return; }
    const previous = templateByKey(templateKey);
    setTemplateKey(key);
    // Keep a title the admin typed; replace an empty one or the previous template's default name
    if (fresh || !title.trim() || (previous && title === previous.name)) setTitle(t.name);
    setDuration(t.duration);
    setTargetMarks(templateMarks(t));
    setTotal1Mark(t.q1);
    setTotal2Mark(t.q2);
    setNumericalCount(templateNumerical(t));
    setTheoryCount(templateQuestions(t) - templateNumerical(t));
  };

  // Full-length papers fill General Aptitude / Mathematics / Core from the matching topics
  const topicGroupOf = (topicName) => {
    const key = (topicName || '').trim().toLowerCase();
    const topicAttr = attributes.find(a => a.type === 'topic' && (a.name || '').trim().toLowerCase() === key
      && subjectsList.some(sub => selectedSubjects.includes(sub.name) && sub.attr.id === a.parentId));
    const sub = topicAttr ? subjectsList.find(x => x.attr.id === topicAttr.parentId) : null;
    return sub ? subjectGroup(sub.name, sub.commonDept?.name) : 'core';
  };

  const autoFillAllocations = () => {
    const t = templateByKey(templateKey);
    if (!t) return;
    const availability = Object.fromEntries(selectedTopics.map(topic => [topic, getTopicCounts(topic)]));
    const { allocations: next, shortages } = distributeAllocations(t, selectedTopics, availability, topicGroupOf);
    setAllocations(next);
    setTemplateShortages(shortages);
  };

  const goToNextStep = () => {
    // Entering Allocations from a template with nothing allocated yet -> fill it in automatically
    if (step === 2 && templateKey && !editingTestId) {
      const allocated = selectedTopics.some(t => (parseInt(allocations[t]?.q1) || 0) + (parseInt(allocations[t]?.q2) || 0) > 0);
      if (!allocated) autoFillAllocations();
    }
    // Entering Question Types: (re)apply the default rule or the chosen preset to the current
    // allocations; a split the admin typed in themselves is kept as it is
    if (step === 3 && usesTypeMix && typeSplit?.mode !== 'custom') {
      const { total, pool, fits } = typeMixContext();
      setTypeSplit(!typeSplit || typeSplit.fromDefault
        ? defaultTypeSplit(total, pool, fits)
        : buildTypeSplit(typeSplit.mode, total, pool, fits));
    }
    setStep(prev => prev + 1);
  };

  // Filtered pool of questions based on Step 2 Hierarchy (combines selected topics, case-insensitive)
  const availablePool = questions.filter(q => {
    if (selectedDept && !questionDeptMatches(q.department, q.subject)) return false;
      if (selectedSubjects.length > 0 && !selectedSubjects.some(sub => (q.subject || '').trim().toLowerCase() === sub.toLowerCase())) return false;
    if (selectedTopics.length > 0) {
      const qTopic = (q.topic || '').trim().toLowerCase();
      const match = selectedTopics.some(t => t.trim().toLowerCase() === qTopic);
      if (!match) return false;
    }
    return true;
  });

  // One cell per topic x mark allocation (Step 3) with the questions it can draw from
  const autoCells = (excludeIds = new Set()) => selectedTopics.flatMap(topic => {
    const alloc = allocations[topic] || {};
    const topicPool = questions.filter(q =>
      questionDeptMatches(q.department, q.subject) && selectedSubjects.some(sub => (q.subject || '').trim().toLowerCase() === sub.toLowerCase()) &&
      (q.topic || '').trim().toLowerCase() === topic.trim().toLowerCase() &&
      !excludeIds.has(q.id)
    );
    return [[1, alloc.q1], [2, alloc.q2]].map(([mark, wanted]) => {
      const pool = topicPool.filter(q => markValue(q) === mark);
      return { count: Math.min(parseInt(wanted) || 0, pool.length), questions: pool };
    });
  });

  // ---- Question-type mix (Step 4). It shapes the auto-selected questions; in "Both" mode the
  // manual picks are added as they are, and in "Manual" mode the picks themselves are the mix.
  const usesTypeMix = selectionMode !== 'manual';
  const typeMixContext = () => {
    const cells = autoCells(selectionMode === 'both' ? new Set(manualSelectedIds) : new Set());
    return {
      cells,
      total: cells.reduce((a, c) => a + c.count, 0),
      pool: typeCountsOf(availablePool),
      fits: (counts) => cellsCanSupply(cells, counts),
    };
  };

  const applyTypePreset = (preset) => {
    const { total, pool, fits } = typeMixContext();
    setTypeSplit(buildTypeSplit(preset, total, pool, fits));
  };

  // Editing a row turns the split into a custom one; % and question count stay in step
  const handleTypePctChange = (key, value, total) => setTypeSplit(prev => ({
    mode: 'custom',
    pct: { ...(prev?.pct || {}), [key]: value },
    count: { ...(prev?.count || {}), [key]: Math.max(0, Math.round(total * (parseFloat(value) || 0) / 100)) },
  }));
  const handleTypeCountChange = (key, value, total) => {
    const count = value === '' ? '' : Math.max(0, parseInt(value) || 0);
    setTypeSplit(prev => ({
      mode: 'custom',
      pct: { ...(prev?.pct || {}), [key]: pctOf(count, total) },
      count: { ...(prev?.count || {}), [key]: count },
    }));
  };

  // Calculate available marks question count in database (flexible mark matching)
  const available1MarkQ = availablePool.filter(q => markValue(q) === 1);
  const available2MarkQ = availablePool.filter(q => markValue(q) === 2);

  // Calculate allocation totals
  const sum1Mark = selectedTopics.reduce((acc, t) => acc + (allocations[t]?.q1 || 0), 0);
  const sum2Mark = selectedTopics.reduce((acc, t) => acc + (allocations[t]?.q2 || 0), 0);

  const is1MarkMatch = sum1Mark === total1Mark;
  const is2MarkMatch = sum2Mark === total2Mark;

  // Formula validation
  const calculatedSum = (parseInt(total1Mark) || 0) * 1 + (parseInt(total2Mark) || 0) * 2;
  const isFormulaValid = calculatedSum === (parseInt(targetMarks) || 0);

  // Bottom warnings calculation
  const getStep1Warning = () => {
    if (!title.trim()) return "Please enter a template title";
    if (!duration || duration <= 0) return "Please enter a valid time duration";
    if (!targetMarks || targetMarks <= 0) return "Please enter target total marks";
    if (!isFormulaValid) return "Formula sum does not match Target Total Marks";
    if (hasCategorySplit && numericalTarget + theoryTarget !== totalQuestionTarget) {
      return `Numerical (${numericalTarget}) + Theory (${theoryTarget}) must equal the total questions (${totalQuestionTarget})`;
    }
    return null;
  };

  const getStep2Warning = () => {
    if (!selectedDept) return "Please select a target department";
    if (selectedSubjects.length === 0) return 'Please select at least one subject';
    if (selectedTopics.length === 0) return "Please select at least one topic";
    return null;
  };

  const getStep3Warning = () => {
    if (!scheduledTime.trim()) return "Please enter a valid schedule time/date";
    if (closesAt && new Date(closesAt).getTime() <= new Date(scheduledTime).getTime()) {
      return "The closing time must be after the scheduled start time";
    }

    if (selectionMode === 'manual') {
      if (manualSelectedIds.length === 0) return "Please manually select at least one question.";
      return null;
    }

    if (selectionMode === 'both') {
      if (manualSelectedIds.length === 0 && sum1Mark === 0 && sum2Mark === 0) {
        return "Please select questions manually or set auto allocations.";
      }
      return null;
    }

    // Check if sums match target counts
    if (!is1MarkMatch) return `1-Mark sum (${sum1Mark}) does not match target (${total1Mark})`;
    if (!is2MarkMatch) return `2-Mark sum (${sum2Mark}) does not match target (${total2Mark})`;

    // Check database limit availability warning
    let exceeds = false;
    selectedTopics.forEach(t => {
      const counts = getTopicCounts(t);
      if ((allocations[t]?.q1 || 0) > counts.q1 || (allocations[t]?.q2 || 0) > counts.q2) {
        exceeds = true;
      }
    });
    if (exceeds) return "Some allocations exceed the available questions in database";

    if (hasCategorySplit) {
      const range = numericalRangeFor(allocationCells());
      if (numericalTarget < range.min || numericalTarget > range.max) {
        return range.min === range.max
          ? `These topic allocations allow exactly ${range.min} numerical question(s), not ${numericalTarget} - change the allocations or the numerical/theory split`
          : `These topic allocations allow ${range.min}-${range.max} numerical questions, not ${numericalTarget} - change the allocations or the numerical/theory split`;
      }
    }

    return null;
  };

  const getStep4Warning = () => {
    if (!usesTypeMix) return null;
    const { cells, total, pool } = typeMixContext();
    if (total === 0) return null; // "Both" mode with only manual picks
    if (!typeSplit) return "Please choose a question type split";
    const pctSum = TYPE_KEYS.reduce((a, k) => a + (parseFloat(typeSplit.pct?.[k]) || 0), 0);
    if (Math.abs(pctSum - 100) > 0.5) return `Weightage percentage sum (${Math.round(pctSum * 10) / 10}%) must equal 100%`;
    const countSum = sumCounts(typeSplit.count);
    if (countSum !== total) return `Contributed questions (${countSum}) must equal the ${total} questions allocated in Topic Marks`;
    const over = QUESTION_TYPES.find(t => (parseInt(typeSplit.count?.[t.key]) || 0) > pool[t.key]);
    if (over) return `${over.label}: ${parseInt(typeSplit.count[over.key])} requested but the repository pool has only ${pool[over.key]}`;
    if (!cellsCanSupply(cells, typeSplit.count)) return "The topic allocations can't supply this mix - try Next Best Equal Split or adjust the counts";
    return null;
  };

  const handleAllocationChange = (topic, type, val) => {
    setAllocations(prev => ({
      ...prev,
      [topic]: {
        ...prev[topic],
        [type]: val === '' ? '' : Math.max(0, parseInt(val) || 0)
      }
    }));
  };

  const handleToggleTopic = (topicName) => {
    if (selectedTopics.includes(topicName)) {
      setSelectedTopics(prev => prev.filter(t => t !== topicName));
    } else {
      setSelectedTopics(prev => [...prev, topicName]);
    }
  };

  const handleDelete = async (id) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteDoc(doc(db, 'tests', deleteConfirmId));
      fetchTests();
      showToast("Test deleted successfully", "success");
    } catch (err) {
      console.error("Failed to delete test:", err);
      showToast("Failed to delete test.", "error");
    }
    setDeleteConfirmId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step !== 4) return; // only the Step 4 Save button saves
    if (getStep1Warning() || getStep2Warning() || getStep3Warning() || getStep4Warning()) {
      showToast("Please resolve all warnings before saving.", "error");
      return;
    }

    let finalQuestionIds = [];
    let manualIdsSet = new Set();

    if (selectionMode === 'manual' || selectionMode === 'both') {
      finalQuestionIds = [...manualSelectedIds];
      manualIdsSet = new Set(manualSelectedIds);
      if (selectionMode === 'manual' && finalQuestionIds.length === 0) {
        showToast("Please select at least one question manually.", "error");
        return;
      }
    }

    if (selectionMode === 'auto' || selectionMode === 'both') {
      const shuffle = (arr) => [...arr].sort(() => 0.5 - Math.random());

      // One cell per topic x mark allocation (manually selected questions excluded), split by
      // question type so the picks follow the Step 4 mix
      const allocCells = autoCells(manualIdsSet);
      let units = allocCells;
      if (allocCells.some(c => c.count > 0)) {
        const plan = planTypeMix(allocCells, typeSplit?.count || {});
        if (!plan) {
          showToast("The question type mix can't be met with these topic allocations.", "error");
          return;
        }
        units = allocCells.flatMap((c, i) => TYPE_KEYS.map((key, j) => ({
          count: plan[i][j],
          questions: c.questions.filter(q => questionTypeKey(q) === key)
        })));
      }

      // ...each with its numerical and theory pools
      const cells = units.filter(u => u.count > 0).map(u => ({
        count: u.count,
        numericalPool: u.questions.filter(isNumericalQuestion).map(q => q.id),
        theoryPool: u.questions.filter(q => !isNumericalQuestion(q)).map(q => q.id),
        allIds: u.questions.map(q => q.id)
      }));

      if (!hasCategorySplit) {
        cells.forEach(c => finalQuestionIds.push(...shuffle(c.allIds).slice(0, c.count)));
      } else {
        // Numerical questions still needed from auto-pick (manual picks already count in "Both" mode)
        const manualNumerical = questions.filter(q => manualIdsSet.has(q.id) && isNumericalQuestion(q)).length;
        const lo = cells.map(c => Math.max(0, c.count - c.theoryPool.length));
        const hi = cells.map(c => Math.min(c.count, c.numericalPool.length));
        const minSum = lo.reduce((a, b) => a + b, 0);
        const maxSum = hi.reduce((a, b) => a + b, 0);
        let remaining = Math.min(maxSum, Math.max(minSum, numericalTarget - manualNumerical)) - minSum;

        // Start every cell at its minimum, then hand out the remaining numerical picks round-robin
        // in random order so they spread across topics instead of piling into the first one
        const numericalPerCell = [...lo];
        const order = shuffle(cells.map((_, i) => i));
        while (remaining > 0) {
          for (const i of order) {
            if (remaining > 0 && numericalPerCell[i] < hi[i]) {
              numericalPerCell[i] += 1;
              remaining -= 1;
            }
          }
        }

        cells.forEach((c, i) => {
          const n = numericalPerCell[i];
          finalQuestionIds.push(
            ...shuffle(c.numericalPool).slice(0, n),
            ...shuffle(c.theoryPool).slice(0, c.count - n)
          );
        });
      }
    }

    if (finalQuestionIds.length === 0) {
      alert("No matching questions found in the database. Please add questions under this subject/topic first.");
      return;
    }

    const testPayload = {
      title,
      description,
      duration: parseInt(duration),
      targetMarks: parseInt(targetMarks),
      total1Mark: parseInt(total1Mark),
      total2Mark: parseInt(total2Mark),
      numericalCount: hasCategorySplit ? numericalTarget : null,
      theoryCount: hasCategorySplit ? theoryTarget : null,
      scheduledTime,
      closesAt: closesAt || '',
      department: selectedDept,
      subject: selectedSubjects.join(', ') || 'General',
      topic: selectedTopics.join(', ') || 'All Topics',
      questions: finalQuestionIds,
      allocations,
      templateKey: templateKey || '',
      typeSplit: typeSplit ? {
        mode: typeSplit.mode,
        autoAdjusted: !!typeSplit.autoAdjusted,
        fromDefault: !!typeSplit.fromDefault,
        pct: Object.fromEntries(TYPE_KEYS.map(k => [k, parseFloat(typeSplit.pct?.[k]) || 0])),
        count: Object.fromEntries(TYPE_KEYS.map(k => [k, parseInt(typeSplit.count?.[k]) || 0]))
      } : null,
      bundleId: isTeacher ? '' : bundleId
    };

    try {
      if (editingTestId) {
        // Preserve status/solutionsUnlocked/createdBy/createdAt - editing only touches the spec fields above.
        // A pending "N hours after the test ends" release moves with the test's new time/duration.
        const existing = tests.find(t => t.id === editingTestId);
        if (existing?.solutionsReleasePending && typeof existing.solutionsReleaseAfterHours === 'number') {
          const newEnd = testEndMillis(testPayload);
          if (newEnd !== null) {
            testPayload.solutionsReleaseAt = Timestamp.fromMillis(newEnd + existing.solutionsReleaseAfterHours * 60 * 60 * 1000);
          }
        }
        await updateDoc(doc(db, 'tests', editingTestId), testPayload);
        showToast("Test template updated successfully!", "success");
      } else {
        await addDoc(collection(db, 'tests'), {
          ...testPayload,
          status: 'active',
          solutionsUnlocked: false,
          createdBy: sessionStorage.getItem('auth_name') || (isTeacher ? 'Teacher' : 'Admin'),
          createdAt: serverTimestamp()
        });
        showToast("Test template created successfully!", "success");
      }
      setIsCreatorOpen(false);
      resetForm();
      fetchTests();
    } catch (err) {
      console.error("Failed to save test template:", err);
      showToast("Error saving test template. Please try again.", "error");
    }
  };

  const resetForm = () => {
    setEditingTestId(null);
    setTemplateKey('');
    setTemplateShortages([]);
    setTitle('');
    setDescription('');
    setDuration(180);
    setTargetMarks(100);
    setTotal1Mark(30);
    setTotal2Mark(35);
    setNumericalCount('');
    setTheoryCount('');
    setScheduledTime('');
    setClosesAt('');
    setSelectedDept(department || '');
    setSelectedSubjects([]);
    setSelectedTopics([]);
    setAllocations({});
    setSelectionMode('auto');
    setManualSelectedIds([]);
    setManualFilters({ type: 'All', difficulty: 'All', mark: 'All', topic: 'All', category: 'All' });
    setTypeSplit(null);
    setBundleId('');
    setStep(1);
  };

  // Reopen an existing test for editing: preload every wizard field from the saved
  // document and drop straight into manual mode on Step 3 so the admin lands on the
  // selected-questions list (view / remove / add) rather than re-walking the hierarchy.
  const handleEditTest = (test) => {
    setEditingTestId(test.id);
    setTemplateKey(test.templateKey || '');
    setTemplateShortages([]);
    setTitle(test.title || '');
    setDescription(test.description || '');
    setDuration(test.duration || 180);
    setTargetMarks(test.targetMarks || 100);
    setTotal1Mark(test.total1Mark ?? 30);
    setTotal2Mark(test.total2Mark ?? 35);
    setNumericalCount(test.numericalCount ?? '');
    setTheoryCount(test.theoryCount ?? '');
    setScheduledTime(test.scheduledTime || '');
    setClosesAt(test.closesAt || '');
    setBundleId(test.bundleId || '');
    setSelectedDept(test.department || department || '');
    setSelectedSubjects(test.subject && test.subject !== 'General' ? test.subject.split(',').map(s => s.trim()).filter(Boolean) : []);
    setSelectedTopics(
      test.topic && test.topic !== 'All Topics'
        ? test.topic.split(',').map(t => t.trim()).filter(Boolean)
        : []
    );
    setAllocations(test.allocations || {});
    setSelectionMode('manual');
    setManualSelectedIds(test.questions || []);
    setManualFilters({ type: 'All', difficulty: 'All', mark: 'All', topic: 'All', category: 'All' });
    setTypeSplit(test.typeSplit || null);
    setStep(3);
    setIsCreatorOpen(true);
  };

  const handleEditQuestionFromTest = (questionId) => {
    if (!onEditQuestion) return;
    const proceed = window.confirm("This opens the question in Question Bank to edit it. Any unsaved changes to this test will be lost. Continue?");
    if (!proceed) return;
    onEditQuestion(questionId);
  };

  const handleSaveBundle = async () => {
    if (!editBundleTest) return;
    try {
      await updateDoc(doc(db, 'tests', editBundleTest.id), { bundleId: editBundleValue });
      setTests(prev => prev.map(t => t.id === editBundleTest.id ? { ...t, bundleId: editBundleValue } : t));
      setEditBundleTest(null);
      showToast("Access control updated successfully!", "success");
    } catch (err) {
      console.error('Failed to update bundle:', err);
      showToast('Failed to update access control. Please try again.', 'error');
    }
  };

  // Calendar: (re)schedule one test. A pending "N hours after the test ends" answer release moves
  // with it, the same as when the time is changed in the full editor.
  const handleScheduleTest = async (test, { scheduledTime: newTime, closesAt: newClose }) => {
    const update = { scheduledTime: newTime, closesAt: newClose || '' };
    if (test.solutionsReleasePending && typeof test.solutionsReleaseAfterHours === 'number') {
      const newEnd = testEndMillis({ ...test, ...update });
      if (newEnd !== null) {
        update.solutionsReleaseAt = Timestamp.fromMillis(newEnd + test.solutionsReleaseAfterHours * 60 * 60 * 1000);
      }
    }
    try {
      await updateDoc(doc(db, 'tests', test.id), update);
      setTests(prev => prev.map(t => (t.id === test.id ? { ...t, ...update } : t)));
      showToast(`"${test.title}" scheduled for ${formatTestTime(testStartMillis(update))}`, 'success');
      return true;
    } catch (err) {
      console.error('Failed to schedule test:', err);
      showToast('Failed to save the schedule. Please try again.', 'error');
      return false;
    }
  };

  // Calendar: "Create a new test on this day" - opens the normal wizard with the date filled in
  const createTestOnDate = (date) => {
    resetForm();
    if (!isTeacher && openFolder && openFolder !== 'Uncategorized') setSelectedDept(openFolder);
    setScheduledTime(`${date}T10:00`);
    setIsCreatorOpen(true);
  };

  // Emails every student who has attempted the test that its solutions are out. Used by the manual
  // unlock; scheduled releases are emailed by the releaseScheduledSolutions Cloud Function instead.
  const emailSolutionsReleased = async (test) => {
    const attemptsSnapshot = await getDocs(query(collection(db, 'test_attempts'), where('testId', '==', test.id)));
    const uniqueEmails = [...new Set(attemptsSnapshot.docs.map(d => d.data().studentEmail).filter(Boolean))];
    if (uniqueEmails.length === 0) return 0;

    const webhookUrl = import.meta.env.VITE_GAS_WEBHOOK_URL;
    if (!webhookUrl) {
      console.warn("VITE_GAS_WEBHOOK_URL is not set. Skipping email.");
      return uniqueEmails.length;
    }
    const { subject, html } = solutionsEmail(test.title);
    // Send individual emails to protect student privacy (no group CCs)
    uniqueEmails.forEach(email => {
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ to_email: email, subject, message_html: html })
      }).catch(e => console.error("Email fetch failed for", email, e));
    });
    return uniqueEmails.length;
  };

  // Answer Release dialog: which option is picked and its inputs
  const [releaseTest, setReleaseTest] = useState(null);
  const [releaseForm, setReleaseForm] = useState({ choice: 'locked', scheduleType: 'afterHours', hours: 2, dateTime: '' });
  const [isSavingRelease, setIsSavingRelease] = useState(false);

  const toDateTimeLocal = (ms) => {
    const d = new Date(ms);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const openReleaseDialog = (test) => {
    const mode = releaseMode(test);
    const at = releaseAtMillis(test);
    const hasHours = typeof test.solutionsReleaseAfterHours === 'number';
    setReleaseForm({
      choice: test.solutionsUnlocked ? 'unlocked'
        : mode === RELEASE_MODES.IMMEDIATE ? 'immediate'
          : mode === RELEASE_MODES.SCHEDULED ? 'scheduled'
            : 'locked',
      scheduleType: mode === RELEASE_MODES.SCHEDULED && !hasHours ? 'dateTime' : 'afterHours',
      hours: hasHours ? test.solutionsReleaseAfterHours : 2,
      dateTime: at ? toDateTimeLocal(at) : ''
    });
    setReleaseTest(test);
  };

  // The release time the dialog would save, or an error message
  const plannedReleaseAt = (test, form) => {
    if (form.scheduleType === 'afterHours') {
      const end = testEndMillis(test);
      if (end === null) return { error: 'This test has no schedule time, so "after the test ends" cannot be worked out. Pick a date & time instead.' };
      const hours = parseFloat(form.hours);
      if (!(hours >= 0)) return { error: 'Enter the number of hours.' };
      return { at: end + hours * 60 * 60 * 1000 };
    }
    const at = new Date(form.dateTime).getTime();
    if (!form.dateTime || Number.isNaN(at)) return { error: 'Pick the date & time to release the answers.' };
    return { at };
  };

  const saveReleaseSettings = async () => {
    const test = releaseTest;
    if (!test) return;
    const base = { solutionsReleasePending: false, solutionsReleaseAt: null, solutionsReleaseAfterHours: null };
    let update;
    let sendEmailsNow = false;

    if (releaseForm.choice === 'locked') {
      update = { ...base, solutionsReleaseMode: RELEASE_MODES.MANUAL, solutionsUnlocked: false };
    } else if (releaseForm.choice === 'unlocked') {
      update = { ...base, solutionsReleaseMode: RELEASE_MODES.MANUAL, solutionsUnlocked: true };
      sendEmailsNow = !test.solutionsUnlocked;
    } else if (releaseForm.choice === 'immediate') {
      update = { ...base, solutionsReleaseMode: RELEASE_MODES.IMMEDIATE, solutionsUnlocked: false };
    } else {
      const { at, error } = plannedReleaseAt(test, releaseForm);
      if (error) { showToast(error, 'error'); return; }
      if (at <= Date.now()) { showToast('That time has already passed. Pick a future time, or choose "Unlocked now".', 'error'); return; }
      update = {
        solutionsReleaseMode: RELEASE_MODES.SCHEDULED,
        solutionsUnlocked: false,
        solutionsReleasePending: true,
        solutionsReleaseAt: Timestamp.fromMillis(at),
        solutionsReleaseAfterHours: releaseForm.scheduleType === 'afterHours' ? parseFloat(releaseForm.hours) : null
      };
    }

    setIsSavingRelease(true);
    try {
      await updateDoc(doc(db, 'tests', test.id), update);
      setTests(prev => prev.map(t => t.id === test.id ? { ...t, ...update } : t));
      setReleaseTest(null);

      if (sendEmailsNow) {
        try {
          const emailed = await emailSolutionsReleased({ ...test, ...update });
          showToast(emailed > 0 ? `Solutions unlocked & emailed ${emailed} students!` : 'Solutions unlocked (no students attempted yet).', 'success');
        } catch (emailErr) {
          console.error("Failed to process unlock emails:", emailErr);
          showToast('Solutions unlocked, but failed to send emails.', 'error');
        }
      } else if (update.solutionsReleaseMode === RELEASE_MODES.SCHEDULED) {
        showToast(`Answers will be released on ${formatReleaseTime(releaseAtMillis(update))} and students emailed.`, 'success');
      } else if (update.solutionsReleaseMode === RELEASE_MODES.IMMEDIATE) {
        showToast('Students will see the answers right after they submit.', 'success');
      } else {
        showToast(update.solutionsUnlocked ? 'Solutions unlocked.' : 'Solutions locked successfully.', 'success');
      }
    } catch (err) {
      console.error("Failed to save answer release settings", err);
      showToast("Failed to update answer release settings.", "error");
    } finally {
      setIsSavingRelease(false);
    }
  };

  // Derive card statistics from the questions a test actually contains
  const getTestStats = (test) => {
    const ids = test.questions || [];
    const byId = new Map(questions.map(q => [q.id, q]));
    const found = ids.map(id => byId.get(id)).filter(Boolean);

    const typeCounts = { MCQ: 0, MSQ: 0, NAT: 0, Match: 0 };
    found.forEach(q => {
      const t = shortType(q.questionType);
      if (t in typeCounts) typeCounts[t] += 1;
    });
    const typedTotal = Object.values(typeCounts).reduce((a, b) => a + b, 0);

    // Prefer the saved allocations for the split; fall back to the question data
    const allocs = test.allocations || {};
    const allocTopics = Object.keys(allocs);
    const q1 = allocTopics.length ? allocTopics.reduce((a, t) => a + (allocs[t]?.q1 || 0), 0) : found.filter(q => markValue(q) === 1).length;
    const q2 = allocTopics.length ? allocTopics.reduce((a, t) => a + (allocs[t]?.q2 || 0), 0) : found.filter(q => markValue(q) === 2).length;

    const allFound = ids.length > 0 && found.length === ids.length;
    const totalMarks = allFound ? found.reduce((a, q) => a + markValue(q), 0) : (test.targetMarks || 0);

    const topics = allocTopics.length
      ? allocTopics.map(t => ({ name: t, q1: allocs[t]?.q1 || 0, q2: allocs[t]?.q2 || 0 }))
      : (test.topic && test.topic !== 'All Topics' ? test.topic.split(',').map(t => ({ name: t.trim() })) : []);

    return { typeCounts, typedTotal, q1, q2, totalMarks, totalQs: ids.length, topics };
  };

  const formatScheduled = (t) => (t?.includes?.('T')
    ? new Date(t).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
    : t);

  const getBundleLabel = (test) => {
    if (test.bundleId === 'free') return { text: 'Free', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    if (test.bundleId && test.bundleId !== '') {
      const b = bundles.find(b => b.id === test.bundleId);
      return { text: b ? b.name : 'Paid Bundle', color: 'bg-amber-100 text-amber-700 border-amber-200' };
    }
    return { text: 'Dept Bundle', color: 'bg-slate-100 text-slate-600 border-slate-200' };
  };

  // Admin sees tests grouped into department folders; teachers are already scoped to one department.
  const showFolders = !isTeacher && !openFolder;
  const folderOf = (t) => (t.department || '').trim() || 'Uncategorized';
  // Inside a department (or a teacher's own list): one folder per test template
  const deptTests = isTeacher ? tests : tests.filter(t => folderOf(t) === openFolder);
  const templateFolders = templateFoldersFor(deptTests);
  const showTemplateFolders = !showFolders && !openTemplateFolder;
  const folders = Object.entries(tests.reduce((acc, t) => {
    const k = folderOf(t);
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {})).map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
  const visibleTests = openTemplateFolder ? deptTests.filter(t => templateKeyOf(t) === openTemplateFolder) : deptTests;

  useEffect(() => {
    if (openFolder && !loading && !tests.some(t => folderOf(t) === openFolder)) setOpenFolder(null);
  }, [tests, loading, openFolder]);
  // A new department starts at its template folders; an emptied "Other Tests" folder closes
  useEffect(() => { setOpenTemplateFolder(null); }, [openFolder]);
  useEffect(() => {
    if (openTemplateFolder === 'other' && !loading && !deptTests.some(t => templateKeyOf(t) === 'other')) setOpenTemplateFolder(null);
  }, [tests, loading, openTemplateFolder]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans relative">
      
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 right-4 left-4 sm:left-auto max-w-full sm:max-w-md z-[999] px-6 py-3 rounded-xl shadow-lg border text-sm font-bold flex items-center gap-2 animate-in slide-in-from-top-4 fade-in duration-300 ${
          toast.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }`}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          {toast.message}
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4 min-w-0">
          {(openTemplateFolder || (!isTeacher && openFolder)) && (
            <button
              onClick={() => (openTemplateFolder ? setOpenTemplateFolder(null) : setOpenFolder(null))}
              className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors shrink-0"
              title="Back to folders"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="min-w-0">
            <h2 className="text-2xl font-[900] text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="text-blue-600 animate-pulse" size={28} />
              <span className="truncate">
                {[!isTeacher && openFolder ? openFolder : null, openTemplateFolder ? folderName(openTemplateFolder) : null].filter(Boolean).join(' › ')
                  || 'Test Templates'}
              </span>
            </h2>
            <p className="text-slate-500 font-semibold mt-1">
              {!isTeacher && !openFolder ? 'Select a department folder to manage its tests.'
                : !openTemplateFolder ? 'Tests are grouped by the template they were made from.'
                : 'Configure spec blueprints and schedule tests from subtopics.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          {[
            { key: 'templates', label: 'Templates', icon: FileText },
            { key: 'schedule', label: 'Schedule', icon: Calendar },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === key ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            resetForm();
            if (!isTeacher && openFolder && openFolder !== 'Uncategorized') setSelectedDept(openFolder);
            if (templateByKey(openTemplateFolder)) applyTemplate(openTemplateFolder, { fresh: true });
            setIsCreatorOpen(true);
          }}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-[0_4px_14px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] flex items-center gap-2 text-sm"
        >
          <Plus size={18} strokeWidth={2.5} /> Create Test Template
        </button>
        </div>
      </div>

      {/* Test Template Cards / Schedule calendar */}
      {view === 'schedule' && !loading ? (
        <TestScheduleCalendar
          tests={!isTeacher && !openFolder ? tests : visibleTests}
          showDepartment={!isTeacher && !openFolder}
          onSchedule={handleScheduleTest}
          onCreateOnDate={createTestOnDate}
          onEditTest={handleEditTest}
        />
      ) : loading ? (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-20 text-center flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-semibold">Loading test templates...</p>
        </div>
      ) : tests.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm text-center p-20 flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6">
            <FileText size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">No Test Blueprints Found</h3>
          <p className="text-slate-500 max-w-md font-medium">Create a test module template and schedule it for your students to take directly from their dashboard.</p>
        </div>
      ) : showFolders ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {folders.map(folder => (
            <div key={folder.name} onClick={() => setOpenFolder(folder.name)} className="bg-white rounded-2xl border border-slate-200 p-5 cursor-pointer hover:border-blue-300 hover:shadow-lg transition-all duration-200 group flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors border border-blue-100 group-hover:border-blue-600">
                <FolderOpen size={22} strokeWidth={2} />
              </div>
              <div className="flex flex-col min-w-0">
                <h3 className="font-[700] text-[15px] text-slate-800 truncate" title={folder.name}>{folder.name}</h3>
                <div className="flex items-center gap-1.5 text-slate-400 font-semibold text-[13px] mt-0.5">
                  <FileText size={12} />
                  {folder.count} {folder.count === 1 ? 'Test' : 'Tests'}
                </div>
              </div>
              <div className="ml-auto text-slate-300 group-hover:text-blue-400 transition-colors">
                <ArrowLeft size={16} className="rotate-180" />
              </div>
            </div>
          ))}
        </div>
      ) : showTemplateFolders ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {templateFolders.map(folder => (
            <div key={folder.key} onClick={() => setOpenTemplateFolder(folder.key)} className="bg-white rounded-2xl border border-slate-200 p-5 cursor-pointer hover:border-blue-300 hover:shadow-lg transition-all duration-200 group flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors border ${folder.template ? 'bg-indigo-50 text-indigo-600 border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600' : 'bg-slate-100 text-slate-500 border-slate-200 group-hover:bg-slate-600 group-hover:text-white'}`}>
                <FolderOpen size={22} strokeWidth={2} />
              </div>
              <div className="flex flex-col min-w-0">
                <h3 className="font-[700] text-[15px] text-slate-800 truncate" title={folder.name}>{folder.name}</h3>
                <div className="flex items-center gap-1.5 text-slate-400 font-semibold text-[13px] mt-0.5">
                  <FileText size={12} />
                  {folder.count} {folder.count === 1 ? 'Test' : 'Tests'}
                </div>
                {folder.template && (
                  <div className="text-[11px] font-semibold text-slate-400 mt-0.5 truncate">
                    {folder.template.duration} mins · {templateMarks(folder.template)} marks
                  </div>
                )}
              </div>
              <div className="ml-auto text-slate-300 group-hover:text-blue-400 transition-colors">
                <ArrowLeft size={16} className="rotate-180" />
              </div>
            </div>
          ))}
        </div>
      ) : visibleTests.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-3xl text-center p-14 flex flex-col items-center justify-center">
          <FolderOpen size={36} className="text-slate-300 mb-3" />
          <h3 className="text-lg font-bold text-slate-700">No {folderName(openTemplateFolder)} yet</h3>
          <p className="text-slate-500 font-medium mt-1">Use "Create Test Template" - the {templateByKey(openTemplateFolder)?.name || 'template'} is selected for you.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6 items-start">
          {visibleTests.map((test) => {
            const st = getTestStats(test);
            const lbl = getBundleLabel(test);
            const typeKinds = Object.values(st.typeCounts).filter(Boolean).length;
            return (
              <div key={test.id} className="bg-white border border-[#EEF2F7] rounded-[28px] shadow-[0_12px_35px_rgba(15,23,42,0.06)] hover:shadow-[0_16px_40px_rgba(37,99,235,0.12)] hover:border-blue-200 transition-all duration-300 overflow-hidden flex flex-col">

                {/* Header */}
                <div className="px-6 pt-6 pb-5 bg-gradient-to-b from-blue-50/70 to-white border-b border-[#EEF2F7]">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="px-3 py-1 rounded-full bg-blue-100/70 border border-blue-200/60 text-blue-800 text-[11px] font-[800] uppercase tracking-wider truncate max-w-[220px]">
                        {test.department || 'General'}
                      </span>
                      {!isTeacher && (
                        <span className={`px-2.5 py-1 text-[10px] font-[800] rounded-full border ${lbl.color}`}>{lbl.text}</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(test.id)}
                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                      title="Delete Test"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <h3 className="text-[19px] font-[800] text-[#0F172A] leading-snug tracking-tight line-clamp-2">{test.title}</h3>
                  <p className="text-[13px] text-slate-500 font-semibold mt-1.5 truncate">
                    {test.description || [test.subject, test.topic].filter(Boolean).join(' • ') || 'No description provided'}
                  </p>
                </div>

                <div className="px-6 py-5 space-y-5">

                  {/* Stat tiles */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white border border-[#EEF2F7] rounded-2xl py-3 px-2 text-center shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
                      <div className="text-[10px] font-[800] uppercase tracking-wider text-slate-400">Duration</div>
                      <div className="mt-1 flex items-center justify-center gap-1.5 text-[15px] font-[800] text-blue-700"><Timer size={15} />{test.duration || 0}m</div>
                    </div>
                    <div className="bg-white border border-[#EEF2F7] rounded-2xl py-3 px-2 text-center shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
                      <div className="text-[10px] font-[800] uppercase tracking-wider text-slate-400">Total Marks</div>
                      <div className="mt-1 flex items-center justify-center gap-1.5 text-[15px] font-[800] text-indigo-700"><Award size={15} />{Number(st.totalMarks).toFixed(2)}M</div>
                    </div>
                    <div className="bg-white border border-[#EEF2F7] rounded-2xl py-3 px-2 text-center shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
                      <div className="text-[10px] font-[800] uppercase tracking-wider text-slate-400">Total Qs</div>
                      <div className="mt-1 flex items-center justify-center gap-1.5 text-[15px] font-[800] text-emerald-700"><Layers size={15} />{st.totalQs} Qs</div>
                    </div>
                  </div>

                  {/* Marks split */}
                  <div className="flex items-center justify-between gap-3 bg-blue-50/50 border border-blue-100/70 rounded-2xl px-4 py-2.5 text-[12.5px]">
                    <span className="font-[800] text-slate-700">Marks Split:</span>
                    <span className="font-[800] text-blue-700 whitespace-nowrap">
                      {st.q1} × 1-Mark <span className="text-slate-300 mx-1">•</span> {st.q2} × 2-Mark
                    </span>
                  </div>

                  {/* Question type composition */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-[800] uppercase tracking-wider text-slate-500">Question Type Composition</span>
                      <span className="text-[11px] font-[800] text-blue-600">
                        {st.typedTotal === 0 ? 'No data' : `${typeKinds} type${typeKinds === 1 ? '' : 's'}`}
                      </span>
                    </div>
                    <div className="flex h-2 rounded-full overflow-hidden bg-slate-100">
                      {st.typedTotal > 0 && Object.entries(st.typeCounts).map(([type, count]) => count > 0 && (
                        <div key={type} className={TYPE_META[type].bar} style={{ width: `${(count / st.typedTotal) * 100}%` }} />
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 mt-3">
                      {Object.entries(TYPE_META).map(([type, meta]) => {
                        const count = st.typeCounts[type];
                        const pct = st.typedTotal ? Math.round((count / st.typedTotal) * 100) : 0;
                        return (
                          <div key={type} className={`flex items-center justify-between gap-2 border rounded-2xl px-3 py-2 text-[12px] font-[800] ${meta.chip}`}>
                            <span className="flex items-center gap-1.5"><span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`}></span>{meta.label}</span>
                            <span className="opacity-80 whitespace-nowrap">{pct}% ({count} Qs)</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Topics */}
                  <div>
                    <div className="text-[11px] font-[800] uppercase tracking-wider text-slate-500 mb-2">Topics ({st.topics.length})</div>
                    {st.topics.length === 0 ? (
                      <p className="text-[12px] text-slate-400 font-semibold">{test.subject ? `${test.subject} • all topics` : 'All topics'}</p>
                    ) : (
                      <div className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:thin]">
                        {st.topics.map(t => (
                          <div key={t.name} className="flex items-center gap-2 bg-slate-50 border border-[#EEF2F7] rounded-xl px-3 py-2 shrink-0 max-w-[260px]">
                            <span className="text-[12px] font-[700] text-slate-700 truncate">{t.name}</span>
                            {t.q1 !== undefined && (
                              <span className="text-[10px] font-[800] text-blue-600 bg-blue-50 border border-blue-100 rounded-md px-1.5 py-0.5 whitespace-nowrap">{t.q1}×1M • {t.q2}×2M</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-auto px-6 py-4 border-t border-[#EEF2F7] bg-slate-50/50 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-blue-600 font-bold text-[12.5px] min-w-0">
                      <Calendar size={14} className="shrink-0" />
                      <span className="truncate">{formatScheduled(test.scheduledTime) || 'Not scheduled'}</span>
                    </div>
                    <div className={`text-[11px] font-[700] mt-0.5 truncate ${areSolutionsVisible(test) ? 'text-green-600' : releaseMode(test) === RELEASE_MODES.MANUAL ? 'text-amber-600' : 'text-indigo-600'}`}>
                      {releaseStatusLabel(test)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleEditTest(test)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors inline-flex"
                      title="Edit Test"
                    >
                      <Edit2 size={17} />
                    </button>
                    <button
                      onClick={() => openReleaseDialog(test)}
                      className={`p-2 rounded-xl transition-colors inline-flex ${
                        areSolutionsVisible(test)
                          ? 'text-green-600 bg-green-50 hover:bg-green-100'
                          : releaseMode(test) === RELEASE_MODES.MANUAL
                            ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
                            : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                      }`}
                      title={`Answer release: ${releaseStatusLabel(test)}`}
                    >
                      {areSolutionsVisible(test) ? <Unlock size={17} /> : releaseMode(test) === RELEASE_MODES.MANUAL ? <Lock size={17} /> : <Timer size={17} />}
                    </button>
                    {!isTeacher && (
                      <button
                        onClick={() => { setEditBundleTest(test); setEditBundleValue(test.bundleId || ''); }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors inline-flex"
                        title="Edit Access Control"
                      >
                        <Settings2 size={17} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4-Step Wizard Modal */}
      {isCreatorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto font-sans">
          <form onSubmit={e => e.preventDefault()} className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col my-8 max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-[900] text-slate-900 leading-tight">{editingTestId ? 'Edit Test Template' : 'Create Test Template'} (Step {step} of 4)</h2>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">
                    {step === 1 && "Configure template title, total time duration, target marks, and question count targets."}
                    {step === 2 && "Configure structural course hierarchy and audience alignment."}
                    {step === 3 && (editingTestId ? "View, remove or add questions. Edit a question's content directly in the Question Bank." : "Allocate 1-mark and 2-mark question counts for each selected topic with live availability checks.")}
                    {step === 4 && "Configure target question type distribution matrix (MCQ, MSQ, NAT, Match) with smart presets."}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setIsCreatorOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Step Wizard Indicator bar */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs font-[800] tracking-tight text-slate-400 select-none">
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${step === 1 ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-slate-200 text-slate-500'}`}>1</span>
                <span className={step === 1 ? 'text-indigo-600' : ''}>Specs</span>
              </div>
              <div className="h-0.5 bg-slate-200 flex-1 mx-4"></div>
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${step === 2 ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-slate-200 text-slate-500'}`}>2</span>
                <span className={step === 2 ? 'text-indigo-600' : ''}>Hierarchy</span>
              </div>
              <div className="h-0.5 bg-slate-200 flex-1 mx-4"></div>
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${step === 3 ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-slate-200 text-slate-500'}`}>3</span>
                <span className={step === 3 ? 'text-indigo-600' : ''}>Topic Marks</span>
              </div>
              <div className="h-0.5 bg-slate-200 flex-1 mx-4"></div>
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${step === 4 ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-slate-200 text-slate-500'}`}>4</span>
                <span className={step === 4 ? 'text-indigo-600' : ''}>Question Types</span>
              </div>
            </div>

            {/* Scrollable Content Workspace */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              
              {/* STEP 1: Specs */}
              {step === 1 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">

                  {/* Built-in templates - fill every spec below in one click */}
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-[800] text-slate-800">Start from a template</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      {TEST_TEMPLATES.map(t => {
                        const active = templateKey === t.key;
                        return (
                          <button
                            key={t.key}
                            type="button"
                            onClick={() => applyTemplate(t.key)}
                            className={`text-left rounded-xl border p-3 transition-all ${active ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100' : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50'}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-[13px] font-[900] ${active ? 'text-indigo-700' : 'text-slate-800'}`}>{t.name}</span>
                              {active && <CheckCircle2 size={16} className="text-indigo-600 shrink-0" />}
                            </div>
                            <div className="mt-1 text-[11.5px] font-bold text-slate-500">
                              {t.duration} mins · {templateMarks(t)} marks · {templateQuestions(t)} Qs
                            </div>
                            <div className="text-[11px] font-semibold text-slate-400">
                              {t.q1} × 1M + {t.q2} × 2M · {templateNumerical(t)} numerical / {templateQuestions(t) - templateNumerical(t)} theory
                            </div>
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => applyTemplate('')}
                        className={`text-left rounded-xl border p-3 transition-all ${!templateKey ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100' : 'border-dashed border-slate-300 bg-white hover:border-indigo-300 hover:bg-slate-50'}`}
                      >
                        <span className={`text-[13px] font-[900] ${!templateKey ? 'text-indigo-700' : 'text-slate-800'}`}>Custom</span>
                        <div className="mt-1 text-[11.5px] font-bold text-slate-500">Set everything yourself</div>
                      </button>
                    </div>
                    {templateByKey(templateKey)?.sections && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {templateByKey(templateKey).sections.map(sec => (
                          <span key={sec.group} className="px-2.5 py-1 rounded-lg bg-slate-100 text-[11.5px] font-bold text-slate-600">
                            {sec.section} · {sec.name}: {sec.q1} × 1M + {sec.q2} × 2M = {sec.q1 + sec.q2 * 2} marks
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Template Title */}
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-[800] text-slate-800">Template Title</label>
                    <input 
                      type="text" 
                      value={title} 
                      onChange={e => setTitle(e.target.value)}
                      placeholder="e.g. GATE Mechanical Full Mock Test 1"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-[14px] font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-[800] text-slate-800">Description (Optional)</label>
                    <input 
                      type="text" 
                      value={description} 
                      onChange={e => setDescription(e.target.value)}
                      placeholder="e.g. Standard mock blueprint for Mechanical Engineering 2026"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-[14px] font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm"
                    />
                  </div>

                  {/* Duration & Target total Marks */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-[800] text-slate-800">Duration (Minutes)</label>
                      <input 
                        type="number" 
                        value={duration === '' ? '' : duration} 
                        onChange={e => setDuration(e.target.value === '' ? '' : parseInt(e.target.value))}
                        placeholder="180"
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-[14px] font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-[800] text-slate-800">Target Total Marks</label>
                      <input 
                        type="number" 
                        value={targetMarks === '' ? '' : targetMarks} 
                        onChange={e => setTargetMarks(e.target.value === '' ? '' : parseInt(e.target.value))}
                        placeholder="100"
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-[14px] font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Access Control (Admin Only) */}
                  {!isTeacher && (
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-[900] text-slate-800 uppercase tracking-wide">Access Control (Admin Only)</label>
                      <select 
                        value={bundleId} 
                        onChange={e => setBundleId(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-[14px] font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm bg-white"
                      >
                        <option value="">Requires Department Bundle (Default)</option>
                        <option value="free">Free for Everyone</option>
                        {bundles.map(b => (
                          <option key={b.id} value={b.id}>Require Specific Bundle: {b.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Total 1-Mark and 2-Mark questions count */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 bg-blue-50/35 border border-blue-100 rounded-2xl p-4">
                      <label className="text-[12px] font-[900] text-blue-800 uppercase tracking-wide">Total 1-Mark Questions</label>
                      <input 
                        type="number" 
                        value={total1Mark === '' ? '' : total1Mark} 
                        onChange={e => setTotal1Mark(e.target.value === '' ? '' : parseInt(e.target.value))}
                        placeholder="30"
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-[14px] font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm mt-1"
                      />
                    </div>
                    <div className="space-y-1.5 bg-purple-50/35 border border-purple-100 rounded-2xl p-4">
                      <label className="text-[12px] font-[900] text-purple-800 uppercase tracking-wide">Total 2-Mark Questions</label>
                      <input 
                        type="number" 
                        value={total2Mark === '' ? '' : total2Mark} 
                        onChange={e => setTotal2Mark(e.target.value === '' ? '' : parseInt(e.target.value))}
                        placeholder="35"
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-[14px] font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm mt-1"
                      />
                    </div>
                  </div>

                  {/* Numerical / Theory split (optional) */}
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <label className="text-[12px] font-[900] text-slate-800 uppercase tracking-wide">Numerical / Theory Split</label>
                      <span className="text-[11px] font-semibold text-slate-400">Optional - leave empty to mix freely</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5 bg-sky-50/40 border border-sky-100 rounded-2xl p-4">
                        <label className="text-[12px] font-[900] text-sky-800 uppercase tracking-wide">Numerical Questions</label>
                        <input
                          type="number"
                          min="0"
                          value={numericalCount}
                          onChange={e => handleNumericalCountChange(e.target.value)}
                          placeholder="Any"
                          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-[14px] font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm mt-1"
                        />
                      </div>
                      <div className="space-y-1.5 bg-rose-50/40 border border-rose-100 rounded-2xl p-4">
                        <label className="text-[12px] font-[900] text-rose-800 uppercase tracking-wide">Theory Questions</label>
                        <input
                          type="number"
                          min="0"
                          value={theoryCount}
                          onChange={e => handleTheoryCountChange(e.target.value)}
                          placeholder="Any"
                          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-[14px] font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm mt-1"
                        />
                      </div>
                    </div>
                    {hasCategorySplit && (
                      <div className={`text-[11px] font-[800] ${numericalTarget + theoryTarget === totalQuestionTarget ? 'text-emerald-600' : 'text-red-500'}`}>
                        {numericalTarget} numerical + {theoryTarget} theory = {numericalTarget + theoryTarget} of {totalQuestionTarget} questions
                      </div>
                    )}
                  </div>

                  {/* Formula Verification Block */}
                  <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-[800] tracking-wide ${isFormulaValid ? 'bg-emerald-50 border-emerald-250 text-emerald-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
                    <div className="flex items-center gap-2">
                      {isFormulaValid ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                      <span>Formula: ({total1Mark} × 1) + ({total2Mark} × 2) = {calculatedSum} Marks</span>
                    </div>
                    <div>Target: {targetMarks}</div>
                  </div>

                </div>
              )}

              {/* STEP 2: Hierarchy (Pill selector matches mockup) */}
              {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  
                  {/* Target Department */}
                  <div className="space-y-2.5">
                    <label className="text-[13px] font-[900] text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <Landmark className="text-amber-500" size={16} /> 1. Select Target Department
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {targetDepartments.map(({ id, label, value }) => {
                        const isSelected = sameDepartment(selectedDept, value);
                        return (
                          <button
                            key={id}
                            type="button"
                            disabled={isTeacher && department && !sameDepartment(department, value)}
                            onClick={() => { setSelectedDept(value); setSelectedSubjects([]); setSelectedTopics([]); }}
                            title={value}
                            className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                              isSelected
                                ? 'bg-[#F59E0B] border-transparent text-white shadow-md shadow-amber-500/20'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                      {targetDepartments.length === 0 && (
                        <div className="text-slate-400 text-xs font-semibold py-2">No departments yet - add them in the Attributes tab.</div>
                      )}
                    </div>
                  </div>

                  {/* Select Subjects */}
                  {selectedDept && (
                    <div className="space-y-2.5 border-t border-slate-100 pt-4 animate-in fade-in duration-300">
                      <label className="text-[13px] font-[900] text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                        <BookOpen className="text-blue-500" size={16} /> 2. Select Subjects
                      </label>
                      {subjectsList.length === 0 && (
                        <div className="text-slate-400 text-xs font-semibold py-2">No subjects are set up for this department yet. Add them in the Attributes tab.</div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {subjectsList.map(sub => {
                            const isSelected = selectedSubjects.includes(sub.name);
                            return (
                              <button
                                key={sub.attr.id}
                                type="button"
                                onClick={() => { 
                                  setSelectedSubjects(prev => {
                                    if (prev.includes(sub.name)) {
                                      return prev.filter(s => s !== sub.name);
                                    } else {
                                      return [...prev, sub.name];
                                    }
                                  });
                                }}
                                className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition-all ${
                                isSelected
                                  ? 'bg-[#2563EB] border-transparent text-white shadow-md shadow-blue-500/25'
                                  : sub.commonDept
                                    ? 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {sub.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Select Topics */}
                  {selectedSubjects.length > 0 && (
                    <div className="space-y-2.5 border-t border-slate-100 pt-4 animate-in fade-in duration-300">
                      <label className="text-[13px] font-[900] text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                        <Layers className="text-purple-500" size={16} /> 3. Select Topics (Showing Available Questions in DB)
                      </label>
                      
                      {topicsList.length === 0 ? (
                        <div className="text-slate-400 text-xs font-semibold py-4">No topics found in the attributes bank under this subject.</div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {topicsList.map(topicName => {
                            const isSelected = selectedTopics.includes(topicName);
                            const counts = getTopicCounts(topicName);

                            return (
                              <button
                                key={topicName}
                                type="button"
                                onClick={() => handleToggleTopic(topicName)}
                                className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-2 ${
                                  isSelected 
                                    ? 'bg-[#8B5CF6] border-transparent text-white shadow-md shadow-purple-500/25' 
                                    : 'bg-white border-purple-200 text-purple-700 hover:bg-purple-50/50'
                                }`}
                              >
                                <span>{topicName}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold font-mono ${
                                  isSelected ? 'bg-purple-700/50 text-purple-100' : 'bg-purple-100 text-purple-700'
                                }`}>
                                  {counts.q1} (1M) • {counts.q2} (2M)
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}

              {/* STEP 3: Allocations & Selection Mode */}
              {step === 3 && (() => {
                
                // --- MANUAL MODE LOGIC ---
                const topicPool = questions.filter(q =>
                  questionDeptMatches(q.department, q.subject) && selectedSubjects.some(sub => (q.subject || '').trim().toLowerCase() === sub.toLowerCase()) &&
                  selectedTopics.map(t => t.toLowerCase()).includes((q.topic || '').trim().toLowerCase())
                );
                
                const filteredPool = topicPool.filter(q => {
                  if (manualFilters.topic !== 'All' && q.topic !== manualFilters.topic) return false;
                  if (manualFilters.type !== 'All' && q.questionType !== manualFilters.type) return false;
                  if (manualFilters.difficulty !== 'All' && q.difficultyLevel !== manualFilters.difficulty) return false;
                  if (manualFilters.mark !== 'All' && markValue(q) !== Number(manualFilters.mark)) return false;
                  if ((manualFilters.category || 'All') !== 'All' && getQuestionCategory(q) !== manualFilters.category) return false;
                  return true;
                });
                
                // Pulled from the full question pool (not topicPool) so a question stays visible
                // here even if it no longer matches the currently selected hierarchy filters -
                // otherwise it would silently vanish from view while still being part of the test.
                const manuallySelectedQuestions = questions.filter(q => manualSelectedIds.includes(q.id));
                const manualNumericalCount = manuallySelectedQuestions.filter(isNumericalQuestion).length;
                const manualTheoryCount = manuallySelectedQuestions.length - manualNumericalCount;
                const categoryBadge = (q, size) => {
                  const isNum = getQuestionCategory(q) === 'Numerical';
                  return (
                    <span className={`${size} font-bold uppercase rounded border ${isNum ? 'bg-sky-50 text-sky-700 border-sky-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                      {isNum ? 'Numerical' : 'Theory'}
                    </span>
                  );
                };
                const currentManualMarks = manuallySelectedQuestions.reduce((sum, q) => sum + markValue(q), 0);

                const marksCap = parseInt(targetMarks) || 0;
                const questionMarks = markValue;
                // Adding is blocked once it would push the total past the test's target marks;
                // removing and editing stay available regardless.
                const wouldExceedCap = (q) => marksCap > 0 && currentManualMarks + questionMarks(q) > marksCap;

                const handleToggleQuestion = (id) => {
                  if (manualSelectedIds.includes(id)) {
                    setManualSelectedIds(manualSelectedIds.filter(x => x !== id));
                  } else {
                    const q = questions.find(x => x.id === id);
                    if (q && wouldExceedCap(q)) {
                      showToast(`Marks limit reached (${currentManualMarks} / ${marksCap}). Remove a question to add this one.`, 'error');
                      return;
                    }
                    setManualSelectedIds([...manualSelectedIds, id]);
                  }
                };
                
                const uniqueTypes = [...new Set(topicPool.map(q => q.questionType).filter(Boolean))];
                const uniqueDifficulties = [...new Set(topicPool.map(q => q.difficultyLevel).filter(Boolean))];
                // One option per mark value, not per stored label ("1" and "1 Mark (-0.33)" are the same)
                const uniqueMarks = [...new Set(topicPool.map(markValue))].sort((a, b) => a - b);

                return (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col">
                  
                  <div className="flex flex-col sm:flex-row gap-4 sm:items-end shrink-0">
                    {/* Schedule date input */}
                    <div className="space-y-1.5 flex-1">
                      <label className="text-[13px] font-[800] text-slate-800">Opens at (Schedule)</label>
                      <input
                        type="datetime-local"
                        value={scheduledTime}
                        onChange={e => setScheduledTime(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-[14px] font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm"
                      />
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <label className="text-[13px] font-[800] text-slate-800">Closes at <span className="text-slate-400 font-semibold">(optional)</span></label>
                      <div className="flex items-center gap-2">
                        <input
                          type="datetime-local"
                          value={closesAt}
                          min={scheduledTime || undefined}
                          onChange={e => setClosesAt(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-[14px] font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm"
                        />
                        {closesAt && (
                          <button type="button" onClick={() => setClosesAt('')} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg" title="No closing time">
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <label className="text-[13px] font-[800] text-slate-800">Selection Mode</label>
                      <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button type="button" onClick={() => setSelectionMode('auto')} className={`flex-1 py-2 text-[13px] font-[800] rounded-lg transition-all ${selectionMode === 'auto' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>Auto-Select</button>
                        <button type="button" onClick={() => setSelectionMode('manual')} className={`flex-1 py-2 text-[13px] font-[800] rounded-lg transition-all ${selectionMode === 'manual' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>Manual Select</button>
                        <button type="button" onClick={() => setSelectionMode('both')} className={`flex-1 py-2 text-[13px] font-[800] rounded-lg transition-all ${selectionMode === 'both' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>Both</button>
                      </div>
                    </div>
                  </div>

                  {(selectionMode === 'auto' || selectionMode === 'both') && templateKey && (
                    <div className="space-y-2 shrink-0">
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5">
                        <span className="text-[12.5px] font-[800] text-indigo-800">
                          {templateByKey(templateKey)?.name}: question counts are spread over your topics automatically
                          {templateByKey(templateKey)?.sections ? ' (Aptitude / Mathematics / Core topics fill their own section)' : ''}.
                        </span>
                        <button
                          type="button"
                          onClick={autoFillAllocations}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-[800] shadow-sm"
                        >
                          Re-distribute
                        </button>
                      </div>
                      {templateShortages.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-[12px] font-bold text-amber-800 space-y-0.5">
                          {templateShortages.map((sh, i) => (
                            <div key={i} className="flex items-start gap-1.5">
                              <AlertCircle size={14} className="shrink-0 mt-0.5" />
                              {sh.noTopics
                                ? <span>{sh.name}: no topic selected - go back to Hierarchy and pick a {sh.name} subject/topic ({sh.missing} × {sh.mark}-mark needed).</span>
                                : <span>{sh.name}: {sh.missing} more {sh.mark}-mark question{sh.missing === 1 ? '' : 's'} needed than the selected topics have - add topics or questions.</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {(selectionMode === 'auto' || selectionMode === 'both') && (
                    <>
                    <div className="space-y-4 overflow-y-auto pr-1 flex-1">
                      {selectedTopics.map(topic => {
                      const counts = getTopicCounts(topic);
                      const alloc = allocations[topic] || { q1: 0, q2: 0 };
                      
                      return (
                        <div key={topic} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                          
                          {/* Card Header */}
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="text-[10px] font-[900] text-slate-400 uppercase tracking-wider">{selectedSubjects.join(", ")}</div>
                              <h4 className="text-[15px] font-[800] text-slate-850">{topic}</h4>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-xl text-xs font-[800] border border-blue-100/50">
                                Available: {counts.q1} (1M) / {counts.q2} (2M)
                              </span>
                              <span className="text-[10.5px] font-[800] text-slate-500">
                                <span className="text-sky-700">Numerical {counts.n1} / {counts.n2}</span>
                                <span className="text-slate-300 mx-1.5">•</span>
                                <span className="text-rose-700">Theory {counts.t1} / {counts.t2}</span>
                              </span>
                            </div>
                          </div>

                          {/* Inputs Row */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-[800] text-slate-500">1-Mark Questions</label>
                              <input 
                                type="number" 
                                min="0"
                                value={alloc.q1} 
                                onChange={e => handleAllocationChange(topic, 'q1', e.target.value)}
                                className="w-full border border-slate-150 rounded-xl px-3 py-2 text-[13px] font-bold text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-[800] text-slate-500">2-Mark Questions</label>
                              <input 
                                type="number" 
                                min="0"
                                value={alloc.q2} 
                                onChange={e => handleAllocationChange(topic, 'q2', e.target.value)}
                                className="w-full border border-slate-150 rounded-xl px-3 py-2 text-[13px] font-bold text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                              />
                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </div>

                  {/* Summary Block Compare Target vs Sums */}
                  <div className="border border-slate-200 bg-slate-50/50 p-4 rounded-2xl space-y-3 text-xs text-slate-600 font-bold">
                    <div className="flex items-center justify-between">
                      <span>1-Mark Sum: <span className="font-mono">{sum1Mark} / {total1Mark}</span></span>
                      <span className={`text-[11px] font-[800] uppercase ${is1MarkMatch ? 'text-emerald-600' : 'text-red-500'}`}>
                        {is1MarkMatch ? "Match" : "Mismatch"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span>2-Mark Sum: <span className="font-mono">{sum2Mark} / {total2Mark}</span></span>
                      <span className={`text-[11px] font-[800] uppercase ${is2MarkMatch ? 'text-emerald-600' : 'text-red-500'}`}>
                        {is2MarkMatch ? "Match" : "Mismatch"}
                      </span>
                    </div>
                    {hasCategorySplit && (() => {
                      const range = numericalRangeFor(allocationCells());
                      const ok = numericalTarget >= range.min && numericalTarget <= range.max;
                      return (
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <span>
                            Numerical / Theory: <span className="font-mono">{numericalTarget} / {theoryTarget}</span>
                            <span className="text-slate-400 font-semibold"> (these allocations allow {range.min === range.max ? range.min : `${range.min}-${range.max}`} numerical)</span>
                          </span>
                          <span className={`text-[11px] font-[800] uppercase ${ok ? 'text-emerald-600' : 'text-red-500'}`}>
                            {ok ? "Possible" : "Not Possible"}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                  </>
                  )}

                  {(selectionMode === 'manual' || selectionMode === 'both') && (
                    <div className="flex flex-col space-y-4">

                      {/* Selected Questions - view / remove / edit-in-question-bank */}
                      {manuallySelectedQuestions.length > 0 && (
                        <div className="border border-indigo-200 bg-indigo-50/40 rounded-2xl p-4 shrink-0 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] font-[900] text-indigo-700 uppercase tracking-wide">
                              Selected Questions ({manuallySelectedQuestions.length})
                            </span>
                          </div>
                          <div className="space-y-2">
                            {manuallySelectedQuestions.map(q => (
                              <div key={q.id} className="flex items-start gap-3 bg-white border border-indigo-100 rounded-xl p-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{q.topic}</span>
                                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">{q.questionType}</span>
                                    {categoryBadge(q, 'text-[9px] px-1.5 py-0.5')}
                                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100">{markText(markValue(q))}</span>
                                  </div>
                                  <div className="text-[12.5px] text-slate-700 font-medium break-words" dangerouslySetInnerHTML={{ __html: q.questionText || '<i>No text provided</i>' }} />
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {onEditQuestion && (
                                    <button
                                      type="button"
                                      onClick={() => handleEditQuestionFromTest(q.id)}
                                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                      title="Edit this question in Question Bank"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setManualSelectedIds(prev => prev.filter(id => id !== q.id))}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Remove from this test"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Manual Mode Filters */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 shrink-0 flex flex-wrap gap-3">
                        <select className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold outline-none text-slate-700" value={manualFilters.topic} onChange={e => setManualFilters({...manualFilters, topic: e.target.value})}>
                          <option value="All">All Topics</option>
                          {selectedTopics.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <select className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold outline-none text-slate-700" value={manualFilters.type} onChange={e => setManualFilters({...manualFilters, type: e.target.value})}>
                          <option value="All">All Types</option>
                          {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <select className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold outline-none text-slate-700" value={manualFilters.difficulty} onChange={e => setManualFilters({...manualFilters, difficulty: e.target.value})}>
                          <option value="All">All Difficulties</option>
                          {uniqueDifficulties.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <select className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold outline-none text-slate-700" value={manualFilters.mark} onChange={e => setManualFilters({...manualFilters, mark: e.target.value})}>
                          <option value="All">All Marks</option>
                          {uniqueMarks.map(n => <option key={n} value={String(n)}>{markText(n)}</option>)}
                        </select>
                        <select className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold outline-none text-slate-700" value={manualFilters.category || 'All'} onChange={e => setManualFilters({...manualFilters, category: e.target.value})}>
                          <option value="All">Numerical & Theory</option>
                          <option value="Numerical">Numerical</option>
                          <option value="Theory">Theory</option>
                        </select>

                        <div className="ml-auto flex items-center gap-3">
                           <div className="text-xs font-bold text-slate-500">
                             Numerical: <span className="text-sky-700">{manualNumericalCount}{hasCategorySplit ? ` / ${numericalTarget}` : ''}</span>
                             <span className="mx-1 text-slate-300">•</span>
                             Theory: <span className="text-rose-700">{manualTheoryCount}{hasCategorySplit ? ` / ${theoryTarget}` : ''}</span>
                           </div>
                           <div className="text-xs font-bold text-slate-500">Selected: <span className="text-indigo-600">{manualSelectedIds.length}</span></div>
                           <div className="text-xs font-bold text-slate-500">Marks: <span className={`${currentManualMarks === parseInt(targetMarks) ? 'text-green-600' : currentManualMarks > parseInt(targetMarks) ? 'text-red-500' : 'text-amber-500'}`}>{currentManualMarks} / {targetMarks}</span></div>
                        </div>
                      </div>
                      
                      {/* Question List */}
                      <div className="space-y-3 pb-4">
                        {filteredPool.length === 0 ? (
                          <div className="text-center py-8 text-slate-400 font-medium text-sm">No questions match the current filters.</div>
                        ) : (
                          filteredPool.map(q => {
                            const isSelected = manualSelectedIds.includes(q.id);
                            const isBlocked = !isSelected && wouldExceedCap(q);
                            return (
                              <div key={q.id} onClick={() => handleToggleQuestion(q.id)} title={isBlocked ? 'Marks limit reached - remove a selected question to add this one' : undefined} className={`border rounded-xl p-4 transition-all flex gap-4 ${isBlocked ? 'cursor-not-allowed opacity-50 border-slate-200 bg-slate-50' : 'cursor-pointer'} ${isSelected ? 'border-indigo-500 bg-indigo-50/30 shadow-sm' : !isBlocked ? 'border-slate-200 bg-white hover:border-slate-300' : ''}`}>
                                <div className="mt-1">
                                  <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                                    {isSelected && <Check size={14} strokeWidth={3} />}
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap gap-2 mb-2">
                                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-500">{q.topic}</span>
                                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">{q.questionType}</span>
                                    {categoryBadge(q, 'text-[10px] px-2 py-0.5')}
                                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-100">{q.difficultyLevel || 'Easy'}</span>
                                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100">{markText(markValue(q))}</span>
                                  </div>
                                  <div className="text-[13px] text-slate-700 font-medium line-clamp-3 break-words" dangerouslySetInnerHTML={{ __html: q.questionText || '<i>No text provided</i>' }} />
                                </div>
                                {onEditQuestion && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleEditQuestionFromTest(q.id); }}
                                    className="self-start p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shrink-0"
                                    title="Edit this question in Question Bank"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>

                    </div>
                  )}
                  
                </div>
                );
              })()}

              {/* STEP 4: Question Types */}
              {step === 4 && (() => {
                const inputCls = "w-24 border rounded-xl px-3 py-2 text-[14px] font-[800] text-slate-800 text-center focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm disabled:bg-slate-50";
                const pool = typeCountsOf(availablePool);
                const poolTotal = sumCounts(pool);

                // Manual Select: the picks themselves are the mix - show it read-only
                if (!usesTypeMix) {
                  const picked = questions.filter(q => manualSelectedIds.includes(q.id));
                  const pickedCounts = typeCountsOf(picked);
                  return (
                    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="bg-blue-50/60 border border-blue-100 rounded-2xl px-4 py-3 text-[12.5px] font-semibold text-slate-600">
                        <span className="font-[800] text-slate-700">Manual Select:</span> the question type mix is whatever you pick in Topic Marks. Switch to <i>Auto-Select</i> or <i>Both</i> there to plan a mix with presets.
                      </div>
                      <div className="border border-slate-200 rounded-2xl overflow-x-auto">
                        <table className="w-full text-left min-w-[560px]">
                          <thead className="bg-slate-50 text-[11px] font-[900] text-slate-500 uppercase tracking-wide">
                            <tr>
                              <th className="px-4 py-3">Question Type</th>
                              <th className="px-4 py-3 text-center">Repository Pool Available</th>
                              <th className="px-4 py-3 text-center">Share (%)</th>
                              <th className="px-4 py-3 text-center">Selected Qs</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {QUESTION_TYPES.map(t => (
                              <tr key={t.key}>
                                <td className="px-4 py-3 text-[13px] font-[800] text-slate-800">{t.label}</td>
                                <td className="px-4 py-3 text-center"><span className={`px-2.5 py-1 rounded-full border text-[11.5px] font-[800] ${TYPE_META[t.key].chip}`}>{pool[t.key]} Qs</span></td>
                                <td className="px-4 py-3 text-center text-[13px] font-[800] text-slate-700">{pctOf(pickedCounts[t.key], picked.length)}%</td>
                                <td className="px-4 py-3 text-center text-[13px] font-[800] text-slate-700">{pickedCounts[t.key]}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                }

                const { total } = typeMixContext();
                const split = typeSplit || { mode: 'custom', pct: {}, count: {} };
                const pctSum = Math.round(TYPE_KEYS.reduce((a, k) => a + (parseFloat(split.pct?.[k]) || 0), 0) * 10) / 10;
                const countSum = sumCounts(split.count);
                const pctOk = Math.abs(pctSum - 100) <= 0.5;
                const countOk = countSum === total;

                return (
                  <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">

                    {/* Presets */}
                    <div className="border border-slate-200 rounded-2xl p-4 space-y-3">
                      {(split.autoAdjusted || split.mode === 'custom') && (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[12px] font-[800] text-white ${split.autoAdjusted ? 'bg-amber-600' : 'bg-slate-500'}`}>
                          {split.autoAdjusted ? `⚡ Auto-Adjusted: ${presetLabel(split.mode)}` : '✏️ Custom Split'}
                        </span>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {TYPE_PRESETS.map(p => {
                          const active = split.mode === p.key;
                          return (
                            <button
                              key={p.key}
                              type="button"
                              onClick={() => applyTypePreset(p.key)}
                              className={`px-4 py-2 rounded-xl border text-[13px] font-[800] transition-all ${active ? 'bg-indigo-500 border-transparent text-white shadow-md shadow-indigo-500/25' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                            >
                              {p.icon} {p.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-blue-50/60 border border-blue-100 rounded-2xl px-4 py-3 text-[12.5px] font-semibold text-slate-500">
                      <span className="font-[800] text-slate-700">Default Ratio Rule:</span> Percentages default to 25% for each question type. If the selected topics can't supply 25% of any type, it automatically falls back to <i>Next Best Equal Split</i>.
                      {selectionMode === 'both' && <> The mix applies to the {total} auto-picked questions; your {manualSelectedIds.length} manual pick{manualSelectedIds.length === 1 ? '' : 's'} are added as they are.</>}
                    </div>

                    {/* Distribution matrix */}
                    <div className="border border-slate-200 rounded-2xl overflow-x-auto">
                      <table className="w-full text-left min-w-[560px]">
                        <thead className="bg-slate-50 text-[11px] font-[900] text-slate-500 uppercase tracking-wide">
                          <tr>
                            <th className="px-4 py-3">Question Type</th>
                            <th className="px-4 py-3 text-center">Repository Pool Available</th>
                            <th className="px-4 py-3 text-center">Weightage (%)</th>
                            <th className="px-4 py-3 text-center">Contributed Qs</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {QUESTION_TYPES.map(t => {
                            const count = split.count?.[t.key] ?? '';
                            const tooMany = (parseInt(count) || 0) > pool[t.key];
                            return (
                              <tr key={t.key}>
                                <td className="px-4 py-3 text-[13px] font-[800] text-slate-800">{t.label}</td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`px-2.5 py-1 rounded-full border text-[11.5px] font-[800] ${TYPE_META[t.key].chip}`}>{pool[t.key]} Qs</span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.1"
                                      value={split.pct?.[t.key] ?? ''}
                                      disabled={total === 0}
                                      onChange={e => handleTypePctChange(t.key, e.target.value, total)}
                                      className={`${inputCls} border-slate-200`}
                                    />
                                    <span className="text-[13px] font-bold text-slate-400">%</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    value={count}
                                    disabled={total === 0}
                                    onChange={e => handleTypeCountChange(t.key, e.target.value, total)}
                                    title={tooMany ? `Only ${pool[t.key]} in the repository pool` : undefined}
                                    className={`${inputCls} ${tooMany ? 'border-red-300 bg-red-50 text-red-600' : 'border-slate-200'}`}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-slate-50 border-t border-slate-200">
                          <tr>
                            <td className="px-4 py-3 text-[11px] font-[900] text-slate-500 uppercase tracking-wide">Total Summary</td>
                            <td className="px-4 py-3 text-center text-[13px] font-[800] text-slate-700">{poolTotal} Pool Total</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1 rounded-md text-[12px] font-[800] ${pctOk ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>{pctSum}%</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1 rounded-md text-[12px] font-[800] ${countOk ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>{countSum} / {total} Qs</span>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {total === 0 && (
                      <div className="text-[12px] font-semibold text-slate-400">No questions are auto-picked (only your manual picks), so there is no mix to plan.</div>
                    )}
                  </div>
                );
              })()}

            </div>

            {/* Validation warning block at bottom */}
            {((step === 1 && getStep1Warning()) || (step === 2 && getStep2Warning()) || (step === 3 && getStep3Warning()) || (step === 4 && getStep4Warning())) && (
              <div className="mx-6 mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-700 flex items-center gap-2">
                <Info size={16} />
                <span>
                  {step === 1 && getStep1Warning()}
                  {step === 2 && getStep2Warning()}
                  {step === 3 && getStep3Warning()}
                  {step === 4 && getStep4Warning()}
                </span>
              </div>
            )}

            {/* Wizard Modal Footer Actions */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              
              {/* Back navigation buttons */}
              {step > 1 ? (
                <button 
                  type="button"
                  onClick={() => setStep(prev => prev - 1)}
                  className="px-5 py-2.5 font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all flex items-center gap-1 text-sm"
                >
                  <ChevronLeft size={16} /> Back
                </button>
              ) : (
                <button 
                  type="button"
                  onClick={() => setIsCreatorOpen(false)}
                  className="px-5 py-2.5 font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-150 rounded-xl transition-colors text-sm"
                >
                  Cancel
                </button>
              )}

              {/* Next/Finish button */}
              {step < 4 ? (
                <button 
                  key="next"
                  type="button"
                  disabled={(step === 1 && !!getStep1Warning()) || (step === 2 && !!getStep2Warning()) || (step === 3 && !!getStep3Warning())}
                  onClick={goToNextStep}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 disabled:pointer-events-none text-white font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 text-sm"
                >
                  Next: {step === 1 ? "Hierarchy" : step === 2 ? "Topic Marks" : "Question Types"} <ChevronRight size={16} />
                </button>
              ) : (
                <button 
                  key="save"
                  type="button"
                  onClick={handleSubmit}
                  disabled={!!getStep3Warning() || !!getStep4Warning()}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-[#7C3AED] disabled:opacity-30 disabled:pointer-events-none text-white font-bold rounded-xl transition-all shadow-md text-sm"
                >
                  {editingTestId ? 'Save Changes' : 'Save Test Template Blueprint'}
                </button>
              )}

            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center font-sans text-black p-4">
          <div className="bg-white rounded-md shadow-xl w-full max-w-sm overflow-hidden">
            <div className="bg-red-600 text-white px-4 py-3 font-bold text-lg border-b">Delete Test</div>
            <div className="p-6">
              <p className="text-gray-800 text-base mb-6">Are you sure you want to delete this test? This action cannot be undone.</p>
              
              <div className="flex justify-end gap-3">
                <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 border border-gray-300 rounded text-gray-700 font-bold hover:bg-gray-100 transition">Cancel</button>
                <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700 transition">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Access Control Modal */}
      {releaseTest && (() => {
        const planned = releaseForm.choice === 'scheduled' ? plannedReleaseAt(releaseTest, releaseForm) : null;
        const testEnd = testEndMillis(releaseTest);
        const option = (value, title, description) => (
          <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${releaseForm.choice === value ? 'border-indigo-400 bg-indigo-50/60' : 'border-slate-200 hover:border-slate-300'}`}>
            <input
              type="radio"
              name="releaseChoice"
              checked={releaseForm.choice === value}
              onChange={() => setReleaseForm(f => ({ ...f, choice: value }))}
              className="mt-1 accent-indigo-600"
            />
            <span>
              <span className="block text-[13.5px] font-[800] text-slate-800">{title}</span>
              <span className="block text-[12px] font-medium text-slate-500 mt-0.5">{description}</span>
            </span>
          </label>
        );
        return (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-[900] text-slate-900">Answer Release</h3>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">{releaseTest.title}</p>
                </div>
                <button onClick={() => setReleaseTest(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-2.5">
                {option('locked', 'Locked', 'Students only see their score. You unlock the answers yourself later.')}
                {option('unlocked', 'Unlocked now', 'Answers are visible right away. Students who took the test are emailed.')}
                {option('immediate', 'Right after each student submits', 'Every student sees the answers and solutions as soon as they finish the test.')}
                {option('scheduled', 'Automatically at a set time', 'Answers unlock by themselves at the time you set, and students who took the test are emailed.')}

                {releaseForm.choice === 'scheduled' && (
                  <div className="ml-7 mt-1 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex bg-white border border-slate-200 p-1 rounded-lg">
                      {[['afterHours', 'Hours after the test ends'], ['dateTime', 'Specific date & time']].map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setReleaseForm(f => ({ ...f, scheduleType: value }))}
                          className={`flex-1 py-1.5 text-[12px] font-[800] rounded-md transition-all ${releaseForm.scheduleType === value ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {releaseForm.scheduleType === 'afterHours' ? (
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-[800] text-slate-600">Release after (hours)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={releaseForm.hours}
                          onChange={e => setReleaseForm(f => ({ ...f, hours: e.target.value }))}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[14px] font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />
                        <p className="text-[11.5px] font-medium text-slate-500">
                          {testEnd !== null
                            ? `The test ends ${formatReleaseTime(testEnd)} (start time + ${releaseTest.duration || 0} min).`
                            : 'This test has no schedule time - use a specific date & time instead.'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-[800] text-slate-600">Release on</label>
                        <input
                          type="datetime-local"
                          value={releaseForm.dateTime}
                          onChange={e => setReleaseForm(f => ({ ...f, dateTime: e.target.value }))}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[14px] font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />
                      </div>
                    )}

                    {planned?.error ? (
                      <p className="text-[12px] font-[700] text-red-600">{planned.error}</p>
                    ) : planned?.at && (
                      <p className={`text-[12px] font-[800] ${planned.at > Date.now() ? 'text-indigo-700' : 'text-red-600'}`}>
                        {planned.at > Date.now()
                          ? `Answers will be released on ${formatReleaseTime(planned.at)}`
                          : `${formatReleaseTime(planned.at)} has already passed - pick a later time.`}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  onClick={() => setReleaseTest(null)}
                  className="px-4 py-2 text-[13px] font-[800] text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveReleaseSettings}
                  disabled={isSavingRelease}
                  className="px-5 py-2 text-[13px] font-[800] text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm disabled:opacity-60"
                >
                  {isSavingRelease ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {editBundleTest && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-[900] text-slate-900">Edit Access Control</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">{editBundleTest.title}</p>
              </div>
              <button onClick={() => setEditBundleTest(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[12px] font-[900] text-slate-800 uppercase tracking-wide">Access Control</label>
                <select 
                  value={editBundleValue} 
                  onChange={e => setEditBundleValue(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-[14px] font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm bg-white"
                >
                  <option value="">Requires Department Bundle (Default)</option>
                  <option value="free">Free for Everyone</option>
                  {bundles.map(b => (
                    <option key={b.id} value={b.id}>Require Specific Bundle: {b.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setEditBundleTest(null)} className="px-5 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors text-sm">Cancel</button>
                <button onClick={handleSaveBundle} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md text-sm">Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
