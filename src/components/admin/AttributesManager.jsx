import React, { useState, useEffect, useMemo } from 'react';
import { sameDepartment, STUDENT_DEPARTMENTS } from '../../utils/subjects';
import { clearAttributesCache } from '../../utils/questionBankCache';
import Loader from '../Loader';

export const WEBSITE_DEPARTMENTS = [
  ...STUDENT_DEPARTMENTS,
  'Engineering Mathematics',
  'General Aptitude',
];
import { Plus, Edit2, Trash2, ChevronDown, Search, MoreHorizontal, CheckCircle2, Bookmark, LayoutList, Trophy, Star, Clock, Landmark, FileText, X, ArrowRight, BookOpen } from 'lucide-react';
import { db } from '../../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, updateDoc, doc, getDocs, query, where, writeBatch } from 'firebase/firestore';

const attributeTypes = [
  { id: 'department', name: 'Department', childOf: null, icon: Landmark, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
  { id: 'subject', name: 'Subject', childOf: 'department', icon: Bookmark, iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
  { id: 'topic', name: 'Topic', childOf: 'subject', icon: FileText, iconBg: 'bg-orange-100', iconColor: 'text-orange-500' },
  { id: 'mark', name: 'Mark', childOf: null, icon: Trophy, iconBg: 'bg-green-100', iconColor: 'text-green-500' },
  { id: 'difficulty', name: 'Difficulty Level', childOf: null, icon: Star, iconBg: 'bg-pink-100', iconColor: 'text-pink-500' },
];

// `lockedDepartment` (teachers): only that department's subjects and topics are shown and editable -
// no Department / Mark / Difficulty tabs, and new subjects always go under their department.
export default function AttributesManager({ lockedDepartment = null }) {
  const [activeTab, setActiveTab] = useState(lockedDepartment ? 'subject' : 'department');
  const [newValue, setNewValue] = useState('');
  const [newParent, setNewParent] = useState('');
  const [allAttributes, setAllAttributes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedParentFilter, setSelectedParentFilter] = useState('');
  const [inspectingSubject, setInspectingSubject] = useState(null);
  const [inspectingDepartment, setInspectingDepartment] = useState(null);
  const [inspectingDeptSearch, setInspectingDeptSearch] = useState('');
  const [newSubjectForDept, setNewSubjectForDept] = useState('');
  const [inspectingTopicSearch, setInspectingTopicSearch] = useState('');
  const [newTopicForSubject, setNewTopicForSubject] = useState('');

  // Modal states
  const [editingAttr, setEditingAttr] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Shared by the admin, typist and reviewer dashboards - listen live so a change made in
  // one of them shows up in the others without a reload.
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'question_attributes'), (snapshot) => {
      setAllAttributes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching attributes:", error);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // The teacher's own department attribute ("CSE" and "Computer Science (CSE)" both match)
  const ownDept = lockedDepartment
    ? allAttributes.find(a => a.type === 'department' && sameDepartment(a.name, lockedDepartment))
    : null;
  // What this user can see and manage: everything, or for a teacher their department's subtree
  const attributes = useMemo(() => {
    if (!lockedDepartment) return allAttributes;
    if (!ownDept) return [];
    const subjects = allAttributes.filter(a => a.type === 'subject' && a.parentId === ownDept.id);
    const subjectIds = new Set(subjects.map(s => s.id));
    return [ownDept, ...subjects, ...allAttributes.filter(a => a.type === 'topic' && subjectIds.has(a.parentId))];
  }, [allAttributes, lockedDepartment, ownDept]);
  const visibleTypes = lockedDepartment ? attributeTypes.filter(t => t.id === 'subject' || t.id === 'topic') : attributeTypes;
  // A teacher's new subject always goes under their own department
  const lockedParent = lockedDepartment && activeTab === 'subject' ? (ownDept?.id || '') : null;
  const parentValue = lockedParent ?? newParent;

  const handleAddSubjectDirectly = async (subjectName, deptId) => {
    const name = subjectName.trim();
    if (!name || !deptId) return;
    try {
      await addDoc(collection(db, 'question_attributes'), {
        type: 'subject',
        name,
        parentId: deptId,
        createdAt: new Date().toISOString()
      });
      clearAttributesCache();
      setNotice(`Added subject "${name}".`);
      setTimeout(() => setNotice(''), 4000);
    } catch (err) {
      console.error("Error adding subject directly:", err);
    }
  };

  const handleAddTopicDirectly = async (topicName, subjectId) => {
    const name = topicName.trim();
    if (!name || !subjectId) return;
    try {
      await addDoc(collection(db, 'question_attributes'), {
        type: 'topic',
        name,
        parentId: subjectId,
        createdAt: new Date().toISOString()
      });
      clearAttributesCache();
      setNotice(`Added topic "${name}".`);
      setTimeout(() => setNotice(''), 4000);
    } catch (err) {
      console.error("Error adding topic directly:", err);
    }
  };

  const handleAdd = async (customName = null, customParent = null) => {
    const nameToAdd = (customName !== null ? customName : newValue).trim();
    const parentToAdd = lockedParent ?? (customParent !== null ? customParent : newParent);
    if (!nameToAdd) return;

    if (activeTab === 'department') {
      const exists = allAttributes.some(a => a.type === 'department' && (sameDepartment(a.name, nameToAdd) || a.name.trim().toLowerCase() === nameToAdd.toLowerCase()));
      if (exists) {
        setNotice(`"${nameToAdd}" is already added as a department.`);
        setTimeout(() => setNotice(''), 4000);
        return;
      }
    }
    
    try {
      await addDoc(collection(db, 'question_attributes'), {
        type: activeTab,
        name: nameToAdd,
        parentId: parentToAdd || null,
        createdAt: new Date().toISOString()
      });
      clearAttributesCache();
      setNewValue('');
      setNewParent('');
    } catch (error) {
      console.error("Error adding attribute:", error);
    }
  };
  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteDoc(doc(db, 'question_attributes', deletingId));
      clearAttributesCache();
    } catch (error) {
      console.error("Error deleting attribute:", error);
    }
    setDeletingId(null);
  };

  // Questions and tests store their department / subject / topic / difficulty as text, not as a link
  // to the attribute - so a rename is carried over to them, or they'd be left under the old name
  const RENAME_TARGETS = {
    department: [['question_bank', 'department', 'question'], ['tests', 'department', 'test']],
    subject: [['question_bank', 'subject', 'question']],
    topic: [['question_bank', 'topic', 'question']],
    difficulty: [['question_bank', 'difficultyLevel', 'question']],
  };
  const [renaming, setRenaming] = useState(false);
  const [notice, setNotice] = useState('');

  const confirmEdit = async (e) => {
    e.preventDefault();
    if (!editingAttr || !editingAttr.name.trim() || renaming) return;
    const original = allAttributes.find(a => a.id === editingAttr.id);
    const oldName = (original?.name || '').trim();
    const newName = editingAttr.name.trim();
    setRenaming(true);
    try {
      await updateDoc(doc(db, 'question_attributes', editingAttr.id), { name: newName });
      clearAttributesCache();

      // The same subject / topic name can exist under two departments / subjects - only rename the
      // questions that belong to this one
      const parentName = allAttributes.find(a => a.id === original?.parentId)?.name || '';
      const belongsHere = (data) => {
        if (original?.type === 'subject' && parentName) return sameDepartment(data.department, parentName);
        if (original?.type === 'topic' && parentName) return (data.subject || '').trim() === parentName.trim();
        return true;
      };

      const counts = {};
      if (oldName && oldName !== newName) {
        for (const [coll, field, label] of RENAME_TARGETS[original.type] || []) {
          const snap = await getDocs(query(collection(db, coll), where(field, '==', oldName)));
          const docs = snap.docs.filter(d => belongsHere(d.data()));
          for (let i = 0; i < docs.length; i += 450) {
            const batch = writeBatch(db);
            docs.slice(i, i + 450).forEach(d => batch.update(d.ref, { [field]: newName }));
            await batch.commit();
          }
          counts[label] = (counts[label] || 0) + docs.length;
        }
      }
      const moved = Object.entries(counts).filter(([, n]) => n > 0).map(([label, n]) => `${n} ${label}${n === 1 ? '' : 's'}`);
      setNotice(oldName !== newName
        ? `Renamed "${oldName}" to "${newName}"${moved.length ? ` and updated ${moved.join(' and ')}` : ''}.`
        : 'Saved.');
      setTimeout(() => setNotice(''), 6000);
    } catch (error) {
      console.error("Error updating attribute:", error);
      setNotice('Renaming failed part-way - please try again (it is safe to repeat).');
    }
    setRenaming(false);
    setEditingAttr(null);
  };

  const activeAttribute = attributeTypes.find(a => a.id === activeTab);
  const currentValues = attributes.filter(a => a.type === activeTab);
  
  const parentOptions = activeAttribute.childOf 
    ? attributes.filter(a => a.type === activeAttribute.childOf)
    : [];

  const filteredValues = useMemo(() => {
    let list = currentValues;
    if (selectedParentFilter) {
      list = list.filter(val => val.parentId === selectedParentFilter || val.parentId === attributes.find(a => a.id === selectedParentFilter)?.name);
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(val => {
      const matchName = val.name?.toLowerCase().includes(q);
      const parentName = val.parentId 
        ? attributes.find(a => a.id === val.parentId)?.name?.toLowerCase() 
        : '';
      return matchName || parentName?.includes(q);
    });
  }, [currentValues, searchQuery, selectedParentFilter, attributes]);

  const getInitials = (name) => {
    if (!name) return 'EC';
    const words = name.split(' ');
    if (words.length > 1) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getRelativeTime = (isoString) => {
    if (!isoString) return 'Updated today';
    const date = new Date(isoString);
    const diff = Math.floor((new Date() - date) / 1000); 
    if (diff < 86400) return 'Updated today';
    if (diff < 172800) return 'Updated yesterday';
    return `Updated ${Math.floor(diff/86400)} days ago`;
  };

  const getChildCountText = (attrId, attrType) => {
    const childType = attributeTypes.find(t => t.childOf === attrType)?.id;
    if (!childType) return null;
    const childCount = attributes.filter(a => a.parentId === attrId && a.type === childType).length;
    return `${childCount} ${attributeTypes.find(t => t.id === childType)?.name}s`;
  };

  // Generate color styles for initials badges
  const getInitialsStyles = (index) => {
    const colors = [
      { text: 'text-blue-600', bg: 'bg-blue-50', shadow: 'shadow-[0_0_15px_rgba(37,99,235,0.15)]' },
      { text: 'text-purple-600', bg: 'bg-purple-50', shadow: 'shadow-[0_0_15px_rgba(147,51,234,0.15)]' },
      { text: 'text-green-600', bg: 'bg-green-50', shadow: 'shadow-[0_0_15px_rgba(22,163,74,0.15)]' },
      { text: 'text-orange-500', bg: 'bg-orange-50', shadow: 'shadow-[0_0_15px_rgba(249,115,22,0.15)]' },
      { text: 'text-pink-500', bg: 'bg-pink-50', shadow: 'shadow-[0_0_15px_rgba(236,72,153,0.15)]' },
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 w-full h-full min-h-[800px] px-6 pb-6 pt-0 lg:px-8 lg:pb-8 lg:pt-0 bg-[#F8FAFC]">
      
      {/* ==================== LEFT SIDEBAR ==================== */}
      <div className="w-full xl:w-[280px] shrink-0 bg-[#FFFFFF] border border-[#F1F5F9] rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col h-fit overflow-hidden">
        
        {/* Sidebar Header */}
        <div className="p-6 pb-4 flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></div>
          <h3 className="text-[15px] font-[700] text-[#0F172A]">Attribute Fields</h3>
        </div>
        
        {/* Sidebar Items */}
        <div className="p-4 pt-0 flex flex-col gap-1">
          {visibleTypes.map(attr => {
            const count = attributes.filter(a => a.type === attr.id).length;
            const isActive = activeTab === attr.id;
            const Icon = attr.icon;

            return (
              <button
                key={attr.id}
                onClick={() => {
                  setActiveTab(attr.id);
                  setNewValue('');
                  setNewParent('');
                  setSearchQuery('');
                  setSelectedParentFilter('');
                  setInspectingSubject(null);
                  setInspectingDepartment(null);
                }}
                className={`relative flex items-center justify-between p-3 rounded-[16px] transition-all duration-200 ${
                  isActive 
                  ? 'bg-[#2563EB] shadow-[0_4px_12px_rgba(37,99,235,0.25)]' 
                  : 'hover:bg-slate-50 bg-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                    isActive 
                    ? 'bg-white text-[#2563EB]' 
                    : `${attr.iconBg} ${attr.iconColor} shadow-[0_0_10px_rgba(0,0,0,0.03)]`
                  }`}>
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <div className="flex flex-col items-start text-left">
                    <span className={`font-[700] text-[15px] ${isActive ? 'text-white' : 'text-[#0F172A]'}`}>
                      {attr.name}
                    </span>
                    {attr.childOf && (
                      <span className={`text-[10px] font-[600] uppercase tracking-wider mt-0.5 ${isActive ? 'text-blue-100' : 'text-[#94A3B8]'}`}>
                        Child of {attributeTypes.find(a => a.id === attr.childOf)?.name}
                      </span>
                    )}
                  </div>
                </div>
                
                <span className={`text-[12px] font-[700] min-w-[24px] h-[24px] flex items-center justify-center rounded-full ${
                  isActive 
                  ? 'bg-white/20 text-white' 
                  : 'bg-[#F1F5F9] text-[#64748B]'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ==================== MAIN CONTENT PANEL ==================== */}
      <div className="flex-1 bg-[#FFFFFF] border border-[#F1F5F9] rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col overflow-hidden min-h-[700px]">
        
        {/* Content Header */}
        <div className="p-8 pb-6 border-b border-[#F1F5F9] flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-[60px] h-[60px] rounded-[16px] bg-[#2563EB] flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(37,99,235,0.2)]">
              <activeAttribute.icon size={30} className="text-white" strokeWidth={2} />
            </div>
            <div className="flex flex-col gap-1.5 pt-1">
              <h2 className="text-[22px] sm:text-[28px] font-[800] text-[#0F172A] leading-none tracking-tight">
                {activeAttribute.name} Configuration
              </h2>
              <div className="flex flex-col gap-1 mt-1">
                <p className="text-[14px] font-[500] text-[#64748B]">
                  {lockedDepartment
                    ? `Manage the ${activeAttribute.name.toLowerCase()}s of your department${ownDept ? ` (${ownDept.name})` : ''}.`
                    : `Manage system-wide options for ${activeAttribute.name}.`}
                </p>
                {lockedDepartment && !loading && !ownDept && (
                  <p className="text-[13px] font-[600] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-1">
                    Your department isn&apos;t set up in Attributes yet - ask the admin to add it, then you can add subjects here.
                  </p>
                )}
                <p className="text-[14px] font-[500] text-[#64748B]">
                  Add new values or organize existing ones to keep the platform structured.
                </p>
              </div>
            </div>
          </div>

          {/* Mini Statistics Card */}
          <div className="flex flex-col bg-[#FFFFFF] border border-[#EEF2F7] rounded-[16px] p-4 shadow-sm min-w-[180px]">
            <div className="flex items-center gap-4 pb-3 border-b border-[#F1F5F9]">
              <activeAttribute.icon size={22} className="text-[#2563EB]" strokeWidth={2} />
              <div className="flex flex-col">
                <span className="text-[20px] font-[800] text-[#0F172A] leading-none">{currentValues.length}</span>
                <span className="text-[12px] font-[600] text-[#64748B] mt-1">{activeAttribute.name}s</span>
              </div>
            </div>
            <div className="pt-3 flex items-center gap-2">
              <Clock size={14} className="text-[#2563EB]" />
              <span className="text-[12px] font-[500] text-[#64748B]">
                Updated today
              </span>
            </div>
          </div>
        </div>

        {/* Unified Action Header with ONE Single Search Bar */}
        <div className="px-6 sm:px-8 py-4 border-b border-[#F1F5F9] bg-slate-50/50">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
            {/* Left: Values count & Parent Filter on the exact same row */}
            <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-2 whitespace-nowrap">
                <h3 className="text-[17px] font-[800] text-[#0F172A] tracking-tight">Current Values</h3>
                <span className="text-[12px] font-[700] px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200/60 shadow-xs">
                  {filteredValues.length} {filteredValues.length === 1 ? activeAttribute.name : `${activeAttribute.name}s`}
                  {(searchQuery.trim() || selectedParentFilter) && ` (filtered)`}
                </span>
              </div>

              {/* If childOf: Parent Filter dropdown aligned directly next to Current Values */}
              {activeAttribute.childOf && parentOptions.length > 0 && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="relative">
                    <select
                      value={selectedParentFilter}
                      onChange={(e) => setSelectedParentFilter(e.target.value)}
                      className="h-[40px] pl-3 pr-8 appearance-none bg-white border border-[#EEF2F7] rounded-[11px] text-[12.5px] font-[600] text-slate-700 hover:border-blue-300 focus:border-[#2563EB] outline-none shadow-xs cursor-pointer max-w-[210px] truncate"
                    >
                      <option value="">All {attributeTypes.find(a => a.id === activeAttribute.childOf)?.name}s ({parentOptions.length})</option>
                      {parentOptions.map(p => {
                        const count = attributes.filter(a => a.parentId === p.id && a.type === activeAttribute.id).length;
                        return (
                          <option key={p.id} value={p.id}>{p.name} ({count})</option>
                        );
                      })}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                  {selectedParentFilter && (
                    <button
                      type="button"
                      onClick={() => setSelectedParentFilter('')}
                      className="text-[11.5px] font-bold text-blue-600 hover:underline px-1 whitespace-nowrap"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right: The ONLY Search Bar + Add Button matching 40px height */}
            <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end">
              <div className="relative flex-1 sm:w-[280px] md:w-[320px]">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${activeAttribute.name.toLowerCase()}s by name or parent...`}
                  className="w-full h-[40px] pl-10 pr-9 bg-white border border-[#EEF2F7] focus:border-[#2563EB] rounded-[11px] text-[13px] font-[500] text-[#0F172A] placeholder-[#94A3B8] outline-none transition-all focus:ring-4 focus:ring-[#2563EB]/10 shadow-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    title="Clear search"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingAttr({ id: 'NEW', name: '' });
                  if (selectedParentFilter) setNewParent(selectedParentFilter);
                }}
                className="h-[40px] px-5 rounded-[11px] bg-[#2563EB] hover:bg-blue-700 text-white font-[700] text-[13px] flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/20 shrink-0 whitespace-nowrap"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>Add {activeAttribute.name}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="px-8 py-6 flex-1 overflow-y-auto">
          {notice && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[13px] font-[700] text-emerald-800">{notice}</div>
          )}
          
          {loading ? (
            <div className="h-[200px] flex items-center justify-center">
              <Loader />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5">
              
              {/* Empty Search Results */}
              {searchQuery.trim() && filteredValues.length === 0 && (
                <div className="col-span-full py-12 flex flex-col items-center justify-center text-center bg-white border border-dashed border-slate-200 rounded-[16px]">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                    <Search size={22} />
                  </div>
                  <p className="text-[15px] font-bold text-slate-700">No {activeAttribute.name.toLowerCase()}s found</p>
                  <p className="text-[13px] font-medium text-slate-400 mt-1">
                    No results matching &ldquo;{searchQuery}&rdquo;
                  </p>
                  <button 
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="mt-3 px-4 py-1.5 text-[12px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    Clear search
                  </button>
                </div>
              )}

              {/* Value Cards */}
              {filteredValues.map((val, index) => {
                const parentName = val.parentId 
                  ? attributes.find(a => a.id === val.parentId)?.name 
                  : null;
                const childText = getChildCountText(val.id, activeAttribute.id);
                const styles = getInitialsStyles(index);

                const isDeptCard = activeTab === 'department';
                const isSubjectCard = activeTab === 'subject';
                
                // Department child calculations (subjects & topics)
                const deptSubjects = isDeptCard ? attributes.filter(a => a.type === 'subject' && (a.parentId === val.id || a.parentId === val.name)) : [];
                const deptSubjectIds = new Set(deptSubjects.map(s => s.id));
                const deptTopics = isDeptCard ? attributes.filter(a => a.type === 'topic' && (deptSubjectIds.has(a.parentId) || deptSubjects.some(s => s.name === a.parentId))) : [];

                // Subject child calculations (topics)
                const subjectTopics = isSubjectCard ? attributes.filter(a => a.type === 'topic' && (a.parentId === val.id || a.parentId === val.name)) : [];

                const isClickable = isDeptCard || isSubjectCard;

                return (
                  <div 
                    key={val.id} 
                    onClick={() => {
                      if (isDeptCard) setInspectingDepartment(val);
                      else if (isSubjectCard) setInspectingSubject(val);
                    }}
                    className={`relative flex flex-col justify-between p-5 bg-[#FFFFFF] border border-[#EEF2F7] rounded-[18px] shadow-[0_2px_10px_rgba(15,23,42,0.02)] transition-all duration-300 group hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)] min-h-[170px] ${
                      isClickable ? 'cursor-pointer hover:border-[#2563EB] ring-0 hover:ring-2 hover:ring-blue-100' : 'hover:border-[#2563EB]/40'
                    }`}
                  >
                    {/* Top Row: Squircle Avatar + Name & Parent + Action Buttons */}
                    <div className="flex items-start justify-between gap-3 w-full">
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        {/* Modern squircle avatar (replaces the circle) */}
                        <div className={`w-11 h-11 rounded-xl ${styles.bg} ${styles.text} flex items-center justify-center font-extrabold text-[15px] shrink-0 border border-slate-100 shadow-2xs`}>
                          {getInitials(val.name)}
                        </div>
                        <div className="flex flex-col min-w-0 pt-0.5">
                          <h3 className="text-[16px] font-[800] text-[#0F172A] leading-snug truncate" title={val.name}>
                            {val.name}
                          </h3>
                          {parentName && (
                            <span className="text-[12px] font-[500] text-[#64748B] truncate mt-0.5" title={`Parent: ${parentName}`}>
                              Parent: {parentName}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Edit & Delete Action Buttons */}
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button 
                          type="button"
                          onClick={() => setEditingAttr({ id: val.id, name: val.name })}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit attribute"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          type="button"
                          onClick={() => setDeletingId(val.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete attribute"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Bottom Row: Informative Pill + Timestamp */}
                    {isDeptCard ? (
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectingDepartment(val);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-[12px] transition-all border border-purple-200/60 shadow-2xs group/btn"
                        >
                          <Bookmark size={13} className="text-purple-600 shrink-0" />
                          <span className="whitespace-nowrap">{deptSubjects.length} Subjects</span>
                          {deptTopics.length > 0 && (
                            <span className="text-purple-500 font-medium whitespace-nowrap">• {deptTopics.length} Topics</span>
                          )}
                          <span className="text-purple-400 group-hover/btn:translate-x-0.5 transition-transform text-[11px]">→</span>
                        </button>
                        <span className="text-[11.5px] font-medium text-slate-400 truncate">
                          {getRelativeTime(val.createdAt)}
                        </span>
                      </div>
                    ) : isSubjectCard ? (
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectingSubject(val);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[12px] transition-all border border-blue-200/60 shadow-2xs group/btn"
                        >
                          <BookOpen size={13} className="text-blue-600 shrink-0" />
                          <span className="whitespace-nowrap">{subjectTopics.length} Topics</span>
                          <span className="text-blue-400 group-hover/btn:translate-x-0.5 transition-transform text-[11px]">→</span>
                        </button>
                        <span className="text-[11.5px] font-medium text-slate-400 truncate">
                          {getRelativeTime(val.createdAt)}
                        </span>
                      </div>
                    ) : (
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11.5px] font-medium text-slate-400 truncate">
                          {getRelativeTime(val.createdAt)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* "Add New" Empty State Card */}
              <button 
                onClick={() => {
                  setNewValue('');
                  setEditingAttr({ id: 'NEW', name: '' });
                }}
                className="flex flex-col items-center justify-center p-6 bg-transparent border-2 border-dashed border-[#2563EB]/40 rounded-[16px] hover:border-[#2563EB] hover:bg-blue-50/20 transition-all duration-300 group min-h-[160px]"
              >
                <div className="w-[42px] h-[42px] rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-[#2563EB] group-hover:scale-110 transition-all duration-300">
                  <Plus size={22} strokeWidth={2.5} className="text-[#2563EB] group-hover:text-white transition-colors" />
                </div>
                <div className="flex flex-col items-center mt-3">
                  <span className="text-[15px] font-[700] text-[#2563EB]">
                    Add New {activeAttribute.name}
                  </span>
                  <span className="text-[12px] font-[500] text-[#64748B] mt-0.5">
                    Click to create a new {activeAttribute.name.toLowerCase()}
                  </span>
                </div>
              </button>

            </div>
          )}
        </div>
      </div>

      {/* ==================== MODALS ==================== */}
      
      {/* Delete Modal */}
      {deletingId && (
        <div className="fixed inset-0 bg-[#0F172A]/20 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] p-8 max-w-sm w-full shadow-[0_20px_40px_rgba(0,0,0,0.1)] border border-[#EEF2F7]">
            <h3 className="text-[20px] font-[700] text-[#0F172A] mb-2">Delete Attribute</h3>
            <p className="text-[#64748B] text-[14px] mb-8 font-[500] leading-relaxed">
              Are you sure you want to delete this attribute? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeletingId(null)}
                className="px-5 py-2.5 rounded-full font-[600] text-[#64748B] hover:bg-slate-100 transition-colors text-[14px]"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="px-6 py-2.5 rounded-full font-[600] text-white bg-[#EF4444] hover:bg-red-600 transition-all text-[14px]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspecting Department Subjects Modal */}
      {inspectingDepartment && (() => {
        const allSubjectsForDept = attributes.filter(a => a.type === 'subject' && (a.parentId === inspectingDepartment.id || a.parentId === inspectingDepartment.name));
        const subIds = new Set(allSubjectsForDept.map(s => s.id));
        const allTopicsForDept = attributes.filter(a => a.type === 'topic' && (subIds.has(a.parentId) || allSubjectsForDept.some(s => s.name === a.parentId)));

        const filteredSubjects = allSubjectsForDept.filter(s => {
          if (!inspectingDeptSearch.trim()) return true;
          return s.name.toLowerCase().includes(inspectingDeptSearch.trim().toLowerCase());
        });

        return (
          <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-[24px] max-w-2xl w-full max-h-[85vh] flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-[#EEF2F7] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              
              {/* Modal Header */}
              <div className="p-6 border-b border-[#F1F5F9] flex items-start justify-between gap-4 bg-slate-50/70">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-[#2563EB] text-white flex items-center justify-center font-extrabold text-[18px] shadow-md shadow-blue-500/20 shrink-0">
                    <Landmark size={22} />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-[20px] font-extrabold text-[#0F172A] leading-tight">
                        {inspectingDepartment.name}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold text-[11.5px]">
                        {allSubjectsForDept.length} Subjects
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold text-[11.5px]">
                        {allTopicsForDept.length} Topics
                      </span>
                    </div>
                    <span className="text-[12px] font-medium text-[#64748B] mt-0.5">
                      Department Configuration & Academic Structure
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setInspectingDepartment(null);
                    setInspectingDeptSearch('');
                    setNewSubjectForDept('');
                  }}
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Quick Search & Quick Add inside Department Modal */}
              <div className="p-5 border-b border-[#F1F5F9] bg-white flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={inspectingDeptSearch}
                    onChange={(e) => setInspectingDeptSearch(e.target.value)}
                    placeholder={`Search subjects in ${inspectingDepartment.name}...`}
                    className="w-full h-[40px] pl-9 pr-8 bg-slate-50 focus:bg-white border border-[#EEF2F7] focus:border-blue-500 rounded-xl text-[13px] outline-none transition-all"
                  />
                  {inspectingDeptSearch && (
                    <button
                      type="button"
                      onClick={() => setInspectingDeptSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    value={newSubjectForDept}
                    onChange={(e) => setNewSubjectForDept(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newSubjectForDept.trim()) {
                          handleAddSubjectDirectly(newSubjectForDept, inspectingDepartment.id);
                          setNewSubjectForDept('');
                        }
                      }
                    }}
                    placeholder="New subject name..."
                    className="h-[40px] px-3.5 bg-slate-50 focus:bg-white border border-[#EEF2F7] focus:border-blue-500 rounded-xl text-[13px] outline-none transition-all flex-1 sm:w-[180px]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newSubjectForDept.trim()) {
                        handleAddSubjectDirectly(newSubjectForDept, inspectingDepartment.id);
                        setNewSubjectForDept('');
                      }
                    }}
                    disabled={!newSubjectForDept.trim()}
                    className="h-[40px] px-4 rounded-xl bg-[#2563EB] hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-[12.5px] transition-colors shrink-0 flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus size={15} strokeWidth={2.5} />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Subjects List Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-2.5">
                {filteredSubjects.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-2.5">
                      <Bookmark size={24} />
                    </div>
                    <p className="font-bold text-slate-700 text-[15px]">
                      {inspectingDeptSearch ? 'No matching subjects found' : `No subjects yet in ${inspectingDepartment.name}`}
                    </p>
                    <p className="text-[12.5px] text-slate-400 mt-0.5">
                      {inspectingDeptSearch
                        ? 'Try searching with different keywords.'
                        : 'Use the quick add bar above to add your first subject to this department.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {filteredSubjects.map((sub, idx) => {
                      const topicCount = attributes.filter(a => a.type === 'topic' && (a.parentId === sub.id || a.parentId === sub.name)).length;
                      return (
                        <div
                          key={sub.id}
                          className="p-3.5 rounded-xl border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/20 bg-white transition-all flex items-center justify-between gap-3 group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 font-bold text-[11px] flex items-center justify-center shrink-0 border border-blue-100">
                              {idx + 1}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-slate-800 text-[13px] truncate" title={sub.name}>
                                {sub.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setInspectingDepartment(null);
                                  setInspectingSubject(sub);
                                }}
                                className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1 mt-0.5 text-left"
                              >
                                <span>{topicCount} Topics</span>
                                <ArrowRight size={11} />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => setEditingAttr({ id: sub.id, name: sub.name, type: 'subject' })}
                              className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Edit subject"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingId(sub.id)}
                              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete subject"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 px-6 border-t border-[#F1F5F9] bg-slate-50 flex items-center justify-between gap-3">
                <span className="text-[12px] font-medium text-slate-500">
                  Showing {filteredSubjects.length} of {allSubjectsForDept.length} subjects
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedParentFilter(inspectingDepartment.id);
                      setActiveTab('subject');
                      setInspectingDepartment(null);
                      setInspectingDeptSearch('');
                    }}
                    className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:border-blue-300 text-blue-700 font-bold text-[12.5px] transition-all flex items-center gap-1.5 shadow-xs"
                  >
                    <span>Manage in Subjects Tab</span>
                    <ArrowRight size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInspectingDepartment(null);
                      setInspectingDeptSearch('');
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[12.5px] transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Inspecting Subject Topics Modal */}
      {inspectingSubject && (() => {
        const parentDept = attributes.find(a => a.id === inspectingSubject.parentId);
        const parentDeptName = parentDept?.name;
        const allTopicsForSub = attributes.filter(a => a.type === 'topic' && (a.parentId === inspectingSubject.id || a.parentId === inspectingSubject.name));
        const filteredTopics = allTopicsForSub.filter(t => {
          if (!inspectingTopicSearch.trim()) return true;
          return t.name.toLowerCase().includes(inspectingTopicSearch.trim().toLowerCase());
        });

        return (
          <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-[24px] max-w-2xl w-full max-h-[85vh] flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-[#EEF2F7] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              
              {/* Modal Header */}
              <div className="p-6 border-b border-[#F1F5F9] flex items-start justify-between gap-4 bg-slate-50/70">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-[#2563EB] text-white flex items-center justify-center font-extrabold text-[18px] shadow-md shadow-blue-500/20 shrink-0">
                    <Bookmark size={22} />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-[20px] font-extrabold text-[#0F172A] leading-tight">
                        {inspectingSubject.name}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold text-[11.5px]">
                        {allTopicsForSub.length} Topics
                      </span>
                    </div>
                    {parentDeptName && (
                      <span className="text-[12px] font-medium text-[#64748B] mt-0.5">
                        Department: <strong className="text-slate-700 font-semibold">{parentDeptName}</strong>
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setInspectingSubject(null);
                    setInspectingTopicSearch('');
                    setNewTopicForSubject('');
                  }}
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Quick Search & Quick Add inside Modal */}
              <div className="p-5 border-b border-[#F1F5F9] bg-white flex flex-col sm:flex-row items-center gap-3">
                {/* Search in this subject */}
                <div className="relative flex-1 w-full">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={inspectingTopicSearch}
                    onChange={(e) => setInspectingTopicSearch(e.target.value)}
                    placeholder={`Search topics in ${inspectingSubject.name}...`}
                    className="w-full h-[40px] pl-9 pr-8 bg-slate-50 focus:bg-white border border-[#EEF2F7] focus:border-blue-500 rounded-xl text-[13px] outline-none transition-all"
                  />
                  {inspectingTopicSearch && (
                    <button
                      type="button"
                      onClick={() => setInspectingTopicSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Quick Add Topic to this subject */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    value={newTopicForSubject}
                    onChange={(e) => setNewTopicForSubject(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newTopicForSubject.trim()) {
                          handleAddTopicDirectly(newTopicForSubject, inspectingSubject.id);
                          setNewTopicForSubject('');
                        }
                      }
                    }}
                    placeholder="New topic name..."
                    className="h-[40px] px-3.5 bg-slate-50 focus:bg-white border border-[#EEF2F7] focus:border-blue-500 rounded-xl text-[13px] outline-none transition-all flex-1 sm:w-[180px]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newTopicForSubject.trim()) {
                        handleAddTopicDirectly(newTopicForSubject, inspectingSubject.id);
                        setNewTopicForSubject('');
                      }
                    }}
                    disabled={!newTopicForSubject.trim()}
                    className="h-[40px] px-4 rounded-xl bg-[#2563EB] hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-[12.5px] transition-colors shrink-0 flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus size={15} strokeWidth={2.5} />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Topics List Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-2.5">
                {filteredTopics.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-2.5">
                      <FileText size={24} />
                    </div>
                    <p className="font-bold text-slate-700 text-[15px]">
                      {inspectingTopicSearch ? 'No matching topics found' : `No topics yet in ${inspectingSubject.name}`}
                    </p>
                    <p className="text-[12.5px] text-slate-400 mt-0.5">
                      {inspectingTopicSearch
                        ? 'Try searching with different keywords.'
                        : 'Use the quick add bar above to add your first topic to this subject.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {filteredTopics.map((top, idx) => (
                      <div
                        key={top.id}
                        className="p-3.5 rounded-xl border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/20 bg-white transition-all flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 font-bold text-[11px] flex items-center justify-center shrink-0 border border-orange-100">
                            {idx + 1}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-slate-800 text-[13px] truncate" title={top.name}>
                              {top.name}
                            </span>
                            <span className="text-[10.5px] text-slate-400">
                              {getRelativeTime(top.createdAt)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => setEditingAttr({ id: top.id, name: top.name, type: 'topic' })}
                            className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit topic"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(top.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete topic"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 px-6 border-t border-[#F1F5F9] bg-slate-50 flex items-center justify-between gap-3">
                <span className="text-[12px] font-medium text-slate-500">
                  Showing {filteredTopics.length} of {allTopicsForSub.length} topics
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedParentFilter(inspectingSubject.id);
                      setActiveTab('topic');
                      setInspectingSubject(null);
                      setInspectingTopicSearch('');
                    }}
                    className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:border-blue-300 text-blue-700 font-bold text-[12.5px] transition-all flex items-center gap-1.5 shadow-xs"
                  >
                    <span>Manage in Topics View</span>
                    <ArrowRight size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInspectingSubject(null);
                      setInspectingTopicSearch('');
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[12.5px] transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Add / Edit Modal */}
      {editingAttr && (
        <div className="fixed inset-0 bg-[#0F172A]/20 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] p-8 max-w-md w-full shadow-[0_20px_40px_rgba(0,0,0,0.1)] border border-[#EEF2F7]">
            <h3 className="text-[20px] font-[700] text-[#0F172A] mb-6">
              {editingAttr.id === 'NEW' ? `Add New ${activeAttribute.name}` : 'Edit Attribute'}
            </h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (editingAttr.id === 'NEW') {
                handleAdd(editingAttr.name, parentValue);
                setEditingAttr(null);
              } else {
                confirmEdit(e);
              }
            }}>
              <div className="space-y-5 mb-8">
                <div className="space-y-2">
                  <label className="text-[13px] font-[600] text-[#0F172A] ml-1">
                    {activeAttribute.id === 'department' ? 'Select Department' : 'Attribute Name'}
                  </label>
                  {activeAttribute.id === 'department' ? (
                    <div className="relative">
                      <select
                        value={editingAttr.name}
                        onChange={(e) => setEditingAttr({ ...editingAttr, name: e.target.value })}
                        className="w-full h-[52px] pl-4 pr-10 appearance-none bg-white border border-[#EEF2F7] rounded-[12px] text-[15px] font-[500] text-[#0F172A] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 outline-none transition-all cursor-pointer shadow-sm"
                        required
                        autoFocus
                      >
                        <option value="" disabled>Select department from website...</option>
                        {editingAttr.name && !WEBSITE_DEPARTMENTS.includes(editingAttr.name) && (
                          <option value={editingAttr.name}>{editingAttr.name} (Current)</option>
                        )}
                        {WEBSITE_DEPARTMENTS.map(dept => {
                          const isCurrent = editingAttr.name === dept;
                          const alreadyAdded = !isCurrent && currentValues.some(v => sameDepartment(v.name, dept) || v.name.trim().toLowerCase() === dept.trim().toLowerCase());
                          return (
                            <option key={dept} value={dept} disabled={alreadyAdded}>
                              {dept} {alreadyAdded ? '(Already Added)' : ''}
                            </option>
                          );
                        })}
                      </select>
                      <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                    </div>
                  ) : (
                    <input 
                      type="text"
                      value={editingAttr.name}
                      onChange={(e) => setEditingAttr({ ...editingAttr, name: e.target.value })}
                      placeholder={`E.g. ${activeAttribute.name === 'Department' ? 'Computer Science' : 'Physics'}`}
                      className="w-full h-[52px] px-5 bg-white border border-[#EEF2F7] rounded-[12px] text-[15px] font-[500] text-[#0F172A] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 outline-none transition-all placeholder-[#94A3B8] shadow-sm"
                      autoFocus
                    />
                  )}
                </div>

                {editingAttr.id === 'NEW' && activeAttribute.childOf && (
                  <div className="space-y-2">
                    <label className="text-[13px] font-[600] text-[#0F172A] ml-1">Parent {attributeTypes.find(a => a.id === activeAttribute.childOf)?.name}</label>
                    <div className="relative">
                      <select 
                        value={parentValue}
                        disabled={lockedParent !== null}
                        onChange={(e) => setNewParent(e.target.value)}
                        className="w-full h-[52px] pl-5 pr-12 appearance-none bg-white border border-[#EEF2F7] rounded-[12px] text-[15px] font-[500] text-[#0F172A] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 outline-none transition-all cursor-pointer shadow-sm"
                        required
                      >
                        <option value="" disabled>Select parent...</option>
                        {parentOptions.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setEditingAttr(null)}
                  className="px-6 py-2.5 rounded-full font-[600] text-[#64748B] hover:bg-slate-100 transition-colors text-[14px]"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={renaming || !editingAttr.name.trim() || (editingAttr.id === 'NEW' && activeAttribute.childOf && !parentValue)}
                  className="px-7 py-2.5 rounded-full font-[600] text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-slate-300 transition-all text-[14px]"
                >
                  {editingAttr.id === 'NEW' ? 'Create' : renaming ? 'Renaming...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
