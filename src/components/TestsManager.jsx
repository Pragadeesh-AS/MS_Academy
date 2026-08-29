import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc, serverTimestamp, query, where } from 'firebase/firestore';
import { Plus, Trash2, Calendar, Clock, BookOpen, Layers, Check, FileText, ChevronRight, X, AlertCircle, Info, Award, CheckCircle2, ChevronLeft, Landmark, Edit2 } from 'lucide-react';

export default function TestsManager({ department = '', isTeacher = false }) {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [attributes, setAttributes] = useState([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [editBundleTest, setEditBundleTest] = useState(null);
  const [editBundleValue, setEditBundleValue] = useState('');

  // Wizard Step State
  const [step, setStep] = useState(1); // 1: Specs, 2: Hierarchy, 3: Allocations

  // Wizard Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(180);
  const [targetMarks, setTargetMarks] = useState(100);
  const [total1Mark, setTotal1Mark] = useState(30);
  const [total2Mark, setTotal2Mark] = useState(35);
  const [scheduledTime, setScheduledTime] = useState('');
  const [bundleId, setBundleId] = useState(''); // '' means dept level, 'free' means free, 'specific_id' means exclusive
  const [bundles, setBundles] = useState([]);

  const [selectedDept, setSelectedDept] = useState(department || '');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTopics, setSelectedTopics] = useState([]); // Array support for multiple topics
  const [allocations, setAllocations] = useState({}); // { topicName: { q1: count, q2: count } }

  // Department mapping for pills
  const deptMapping = {
    'ECE': 'Electronics (ECE)',
    'CSE': 'Computer Science (CSE)',
    'ME': 'Mechanical (ME)',
    'CE': 'Civil (CE)',
    'EE': 'Electrical (EE)',
    'DS': 'Data Science (DS)'
  };

  const departmentsList = ['ECE', 'CSE', 'ME', 'CE', 'EE', 'DS'];

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

  // Cascading lists helper
  const selectedDeptObj = attributes.find(a => a.type === 'department' && a.name === selectedDept);
  const selectedSubjectObj = attributes.find(a => a.type === 'subject' && a.name === selectedSubject);

  const subjectsList = attributes
    .filter(a => a.type === 'subject' && (!selectedDeptObj || a.parentId === selectedDeptObj.id))
    .map(a => a.name);

  const topicsList = attributes
    .filter(a => a.type === 'topic' && (!selectedSubjectObj || a.parentId === selectedSubjectObj.id))
    .map(a => a.name);

  // Helper to count available questions per topic (robust trimming & case-insensitive matching)
  const getTopicCounts = (topicName) => {
    const pool = questions.filter(q => 
      (q.department || '').trim().toLowerCase() === (selectedDept || '').trim().toLowerCase() &&
      (q.subject || '').trim().toLowerCase() === (selectedSubject || '').trim().toLowerCase() &&
      (q.topic || '').trim().toLowerCase() === (topicName || '').trim().toLowerCase()
    );
    const q1 = pool.filter(q => (q.mark || '').toLowerCase().includes('1')).length;
    const q2 = pool.filter(q => (q.mark || '').toLowerCase().includes('2')).length;
    return { q1, q2 };
  };

  // Filtered pool of questions based on Step 2 Hierarchy (combines selected topics, case-insensitive)
  const availablePool = questions.filter(q => {
    if (selectedDept && (q.department || '').trim().toLowerCase() !== selectedDept.trim().toLowerCase()) return false;
    if (selectedSubject && (q.subject || '').trim().toLowerCase() !== selectedSubject.trim().toLowerCase()) return false;
    if (selectedTopics.length > 0) {
      const qTopic = (q.topic || '').trim().toLowerCase();
      const match = selectedTopics.some(t => t.trim().toLowerCase() === qTopic);
      if (!match) return false;
    }
    return true;
  });

  // Calculate available marks question count in database (flexible mark matching)
  const available1MarkQ = availablePool.filter(q => (q.mark || '').toLowerCase().includes('1'));
  const available2MarkQ = availablePool.filter(q => (q.mark || '').toLowerCase().includes('2'));

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
    return null;
  };

  const getStep2Warning = () => {
    if (!selectedDept) return "Please select a target department";
    if (!selectedSubject) return "Please select a subject";
    if (selectedTopics.length === 0) return "Please select at least one topic";
    return null;
  };

  const getStep3Warning = () => {
    if (!scheduledTime.trim()) return "Please enter a valid schedule time/date";
    
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
    } catch (err) {
      console.error("Failed to delete test:", err);
    }
    setDeleteConfirmId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (getStep1Warning() || getStep2Warning() || getStep3Warning()) {
      alert("Please resolve all warnings before saving.");
      return;
    }

    let finalQuestionIds = [];

    // Auto-pick matching questions topic-by-topic
    selectedTopics.forEach(topic => {
      const alloc = allocations[topic] || { q1: 0, q2: 0 };
      
      const topicPool = questions.filter(q => 
        (q.department || '').trim().toLowerCase() === (selectedDept || '').trim().toLowerCase() &&
        (q.subject || '').trim().toLowerCase() === (selectedSubject || '').trim().toLowerCase() &&
        (q.topic || '').trim().toLowerCase() === topic.trim().toLowerCase()
      );

      // Pick 1-mark questions randomly
      const pool1MarkIds = topicPool
        .filter(q => (q.mark || '').toLowerCase().includes('1'))
        .map(q => q.id);
      const pick1MarkCount = Math.min(alloc.q1, pool1MarkIds.length);
      const shuffled1Mark = [...pool1MarkIds].sort(() => 0.5 - Math.random());
      const final1MarkIds = shuffled1Mark.slice(0, pick1MarkCount);

      // Pick 2-mark questions randomly
      const pool2MarkIds = topicPool
        .filter(q => (q.mark || '').toLowerCase().includes('2'))
        .map(q => q.id);
      const pick2MarkCount = Math.min(alloc.q2, pool2MarkIds.length);
      const shuffled2Mark = [...pool2MarkIds].sort(() => 0.5 - Math.random());
      const final2MarkIds = shuffled2Mark.slice(0, pick2MarkCount);

      finalQuestionIds.push(...final1MarkIds, ...final2MarkIds);
    });

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
      scheduledTime,
      department: selectedDept,
      subject: selectedSubject || 'General',
      topic: selectedTopics.join(', ') || 'All Topics',
      status: 'active',
      questions: finalQuestionIds,
      allocations,
      bundleId: isTeacher ? '' : bundleId,
      createdBy: localStorage.getItem('auth_name') || (isTeacher ? 'Teacher' : 'Admin'),
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'tests'), testPayload);
      setIsCreatorOpen(false);
      resetForm();
      fetchTests();
    } catch (err) {
      console.error("Failed to save test template:", err);
      alert("Error saving test template. Please try again.");
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDuration(180);
    setTargetMarks(100);
    setTotal1Mark(30);
    setTotal2Mark(35);
    setScheduledTime('');
    setSelectedDept(department || '');
    setSelectedSubject('');
    setSelectedTopics([]);
    setAllocations({});
    setBundleId('');
    setStep(1);
  };

  const handleSaveBundle = async () => {
    if (!editBundleTest) return;
    try {
      await updateDoc(doc(db, 'tests', editBundleTest.id), { bundleId: editBundleValue });
      setTests(prev => prev.map(t => t.id === editBundleTest.id ? { ...t, bundleId: editBundleValue } : t));
      setEditBundleTest(null);
    } catch (err) {
      console.error('Failed to update bundle:', err);
      alert('Failed to update access control. Please try again.');
    }
  };

  const getBundleLabel = (test) => {
    if (test.bundleId === 'free') return { text: 'Free', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    if (test.bundleId && test.bundleId !== '') {
      const b = bundles.find(b => b.id === test.bundleId);
      return { text: b ? b.name : 'Paid Bundle', color: 'bg-amber-100 text-amber-700 border-amber-200' };
    }
    return { text: 'Dept Bundle', color: 'bg-slate-100 text-slate-600 border-slate-200' };
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-[900] text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="text-blue-600 animate-pulse" size={28} />
            Test Templates
          </h2>
          <p className="text-slate-500 font-semibold mt-1">Configure spec blueprints and schedule tests from subtopics.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsCreatorOpen(true); }}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-[0_4px_14px_rgba(37,99,235,0.25)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] flex items-center gap-2 text-sm"
        >
          <Plus size={18} strokeWidth={2.5} /> Create Test Template
        </button>
      </div>

      {/* Tests Table Card */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-20 text-center flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 font-semibold">Loading test templates...</p>
          </div>
        ) : tests.length === 0 ? (
          <div className="text-center p-20 flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6">
              <FileText size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">No Test Blueprints Found</h3>
            <p className="text-slate-500 max-w-md font-medium">Create a test module template and schedule it for your students to take directly from their dashboard.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-[800] uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-4">Template Title</th>
                  <th className="px-6 py-4">Target Audience</th>
                  <th className="px-6 py-4">Subtopic Blueprint</th>
                  <th className="px-6 py-4">Marks & Duration</th>
                  {!isTeacher && <th className="px-6 py-4">Access</th>}
                  <th className="px-6 py-4">Scheduled Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[14px]">
                {tests.map((test) => (
                  <tr key={test.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-5">
                      <div className="font-[800] text-slate-800">{test.title}</div>
                      <div className="text-[12px] text-slate-400 font-semibold mt-0.5">{test.description || 'No description provided'}</div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="font-bold text-slate-700">{test.department}</div>
                      <div className="text-[12px] text-slate-500 font-semibold mt-0.5">by {test.createdBy}</div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="px-2.5 py-1 text-xs font-[800] bg-slate-100 text-slate-600 rounded-lg max-w-xs truncate inline-block">
                        {test.subject} • {test.topic}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-1 text-slate-700 font-bold">
                        <Award size={14} className="text-slate-400" />
                        {test.targetMarks || 100} Marks
                      </div>
                      <div className="flex items-center gap-1 text-slate-500 text-[12px] mt-0.5 font-medium">
                        <Clock size={14} className="text-slate-400" />
                        {test.duration} mins ({test.questions?.length || 0} Qs)
                      </div>
                    </td>
                    {!isTeacher && (
                      <td className="px-6 py-5">
                        {(() => { const lbl = getBundleLabel(test); return (
                          <span className={`px-2.5 py-1 text-[11px] font-[800] rounded-lg border ${lbl.color}`}>{lbl.text}</span>
                        ); })()}
                      </td>
                    )}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-1.5 text-blue-600 font-bold text-[13px]">
                        <Calendar size={14} />
                        {test.scheduledTime}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!isTeacher && (
                          <button 
                            onClick={() => { setEditBundleTest(test); setEditBundleValue(test.bundleId || ''); }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors inline-flex"
                            title="Edit Access Control"
                          >
                            <Edit2 size={18} />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDelete(test.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors inline-flex"
                          title="Delete Test"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3-Step Wizard Modal */}
      {isCreatorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto font-sans">
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col my-8 max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-[900] text-slate-900 leading-tight">Create Test Template (Step {step} of 3)</h2>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">
                    {step === 1 && "Configure template title, total time duration, target marks, and question count targets."}
                    {step === 2 && "Configure structural course hierarchy and audience alignment."}
                    {step === 3 && "Allocate 1-mark and 2-mark question counts for each selected topic with live availability checks."}
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
                <span className={step === 3 ? 'text-indigo-600' : ''}>Allocations</span>
              </div>
            </div>

            {/* Scrollable Content Workspace */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              
              {/* STEP 1: Specs */}
              {step === 1 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  
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
                  <div className="grid grid-cols-2 gap-4">
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
                  <div className="grid grid-cols-2 gap-4">
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
                      {departmentsList.map(code => {
                        const fullName = deptMapping[code];
                        const isSelected = selectedDept === fullName;
                        return (
                          <button
                            key={code}
                            type="button"
                            disabled={isTeacher && department && department !== fullName}
                            onClick={() => { setSelectedDept(fullName); setSelectedSubject(''); setSelectedTopics([]); }}
                            className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                              isSelected 
                                ? 'bg-[#F59E0B] border-transparent text-white shadow-md shadow-amber-500/20' 
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40'
                            }`}
                          >
                            {code}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Select Subjects */}
                  {selectedDept && (
                    <div className="space-y-2.5 border-t border-slate-100 pt-4 animate-in fade-in duration-300">
                      <label className="text-[13px] font-[900] text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                        <BookOpen className="text-blue-500" size={16} /> 2. Select Subjects
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {subjectsList.map(subName => {
                          const isSelected = selectedSubject === subName;
                          return (
                            <button
                              key={subName}
                              type="button"
                              onClick={() => { setSelectedSubject(subName); setSelectedTopics([]); }}
                              className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition-all ${
                                isSelected 
                                  ? 'bg-[#2563EB] border-transparent text-white shadow-md shadow-blue-500/25' 
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {subName}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Select Topics */}
                  {selectedSubject && (
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

              {/* STEP 3: Allocations (Dynamic per-topic counts matching mockup) */}
              {step === 3 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                  
                  {/* Schedule date input */}
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-[800] text-slate-800">Schedule Date & Time</label>
                    <input 
                      type="text" 
                      value={scheduledTime} 
                      onChange={e => setScheduledTime(e.target.value)}
                      placeholder="e.g. Tomorrow, 10:00 AM"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-[14px] font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm"
                    />
                  </div>

                  {/* Scrollable list of topics allocation cards */}
                  <div className="space-y-4 max-h-[36vh] overflow-y-auto pr-1">
                    {selectedTopics.map(topic => {
                      const counts = getTopicCounts(topic);
                      const alloc = allocations[topic] || { q1: 0, q2: 0 };
                      
                      return (
                        <div key={topic} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                          
                          {/* Card Header */}
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="text-[10px] font-[900] text-slate-400 uppercase tracking-wider">{selectedSubject}</div>
                              <h4 className="text-[15px] font-[800] text-slate-850">{topic}</h4>
                            </div>
                            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-xl text-xs font-[800] border border-blue-100/50">
                              Available: {counts.q1} (1M) / {counts.q2} (2M)
                            </span>
                          </div>

                          {/* Inputs Row */}
                          <div className="grid grid-cols-2 gap-4">
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
                  </div>

                </div>
              )}

            </div>

            {/* Validation warning block at bottom */}
            {((step === 1 && getStep1Warning()) || (step === 2 && getStep2Warning()) || (step === 3 && getStep3Warning())) && (
              <div className="mx-6 mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-700 flex items-center gap-2">
                <Info size={16} />
                <span>
                  {step === 1 && getStep1Warning()}
                  {step === 2 && getStep2Warning()}
                  {step === 3 && getStep3Warning()}
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
              {step < 3 ? (
                <button 
                  type="button"
                  disabled={(step === 1 && !!getStep1Warning()) || (step === 2 && !!getStep2Warning())}
                  onClick={() => setStep(prev => prev + 1)}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 disabled:pointer-events-none text-white font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 text-sm"
                >
                  Next: {step === 1 ? "Hierarchy" : "Allocations"} <ChevronRight size={16} />
                </button>
              ) : (
                <button 
                  type="submit"
                  disabled={!!getStep3Warning()}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-[#7C3AED] disabled:opacity-30 disabled:pointer-events-none text-white font-bold rounded-xl transition-all shadow-md text-sm"
                >
                  Save Test Template Blueprint
                </button>
              )}

            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center font-sans text-black">
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
