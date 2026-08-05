import React, { useState, useEffect } from 'react';
import Loader from '../Loader';
import { Plus, Edit2, Trash2, ChevronDown, Search, MoreHorizontal, CheckCircle2, Bookmark, LayoutList, Trophy, Star, Clock, Landmark, FileText } from 'lucide-react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';

const attributeTypes = [
  { id: 'department', name: 'Department', childOf: null, icon: Landmark, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
  { id: 'subject', name: 'Subject', childOf: 'department', icon: Bookmark, iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
  { id: 'topic', name: 'Topic', childOf: 'subject', icon: FileText, iconBg: 'bg-orange-100', iconColor: 'text-orange-500' },
  { id: 'mark', name: 'Mark', childOf: null, icon: Trophy, iconBg: 'bg-green-100', iconColor: 'text-green-500' },
  { id: 'difficulty', name: 'Difficulty Level', childOf: null, icon: Star, iconBg: 'bg-pink-100', iconColor: 'text-pink-500' },
];

export default function AttributesManager() {
  const [activeTab, setActiveTab] = useState('department');
  const [newValue, setNewValue] = useState('');
  const [newParent, setNewParent] = useState('');
  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [editingAttr, setEditingAttr] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchAttributes = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'question_attributes'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAttributes(data);
    } catch (error) {
      console.error("Error fetching attributes:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAttributes();
  }, []);
  const handleAdd = async (customName = null, customParent = null) => {
    const nameToAdd = (customName !== null ? customName : newValue).trim();
    const parentToAdd = customParent !== null ? customParent : newParent;
    if (!nameToAdd) return;
    
    try {
      await addDoc(collection(db, 'question_attributes'), {
        type: activeTab,
        name: nameToAdd,
        parentId: parentToAdd || null,
        createdAt: new Date().toISOString()
      });
      setNewValue('');
      setNewParent('');
      fetchAttributes();
    } catch (error) {
      console.error("Error adding attribute:", error);
    }
  };
  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteDoc(doc(db, 'question_attributes', deletingId));
      fetchAttributes();
    } catch (error) {
      console.error("Error deleting attribute:", error);
    }
    setDeletingId(null);
  };

  const confirmEdit = async (e) => {
    e.preventDefault();
    if (!editingAttr || !editingAttr.name.trim()) return;
    try {
      await updateDoc(doc(db, 'question_attributes', editingAttr.id), {
        name: editingAttr.name.trim()
      });
      fetchAttributes();
    } catch (error) {
      console.error("Error updating attribute:", error);
    }
    setEditingAttr(null);
  };

  const activeAttribute = attributeTypes.find(a => a.id === activeTab);
  const currentValues = attributes.filter(a => a.type === activeTab);
  
  const parentOptions = activeAttribute.childOf 
    ? attributes.filter(a => a.type === activeAttribute.childOf)
    : [];

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
          {attributeTypes.map(attr => {
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
              <h2 className="text-[28px] font-[800] text-[#0F172A] leading-none tracking-tight">
                {activeAttribute.name} Configuration
              </h2>
              <div className="flex flex-col gap-1 mt-1">
                <p className="text-[14px] font-[500] text-[#64748B]">
                  Manage system-wide options for {activeAttribute.name}.
                </p>
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

        {/* Add Department Horizontal Section */}
        <div className="px-8 py-6">
          <div className="flex flex-col md:flex-row items-center gap-4 w-full">
            <div className="flex-1 w-full relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search size={20} className="text-[#94A3B8]" />
              </div>
              <input 
                type="text"
                placeholder={`Type new ${activeAttribute.name.toLowerCase()}...`}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="w-full h-[52px] pl-12 pr-4 bg-white border border-[#EEF2F7] rounded-[12px] text-[15px] font-[500] text-[#0F172A] placeholder-[#94A3B8] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 outline-none transition-all shadow-sm"
              />
            </div>
            
            {activeAttribute.childOf && (
              <div className="w-full md:w-[240px] relative shrink-0">
                <select 
                  value={newParent}
                  onChange={(e) => setNewParent(e.target.value)}
                  className="w-full h-[52px] pl-4 pr-10 appearance-none bg-white border border-[#EEF2F7] rounded-[12px] text-[14px] font-[500] text-[#0F172A] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 outline-none transition-all shadow-sm cursor-pointer"
                >
                  <option value="" disabled>Select parent...</option>
                  {parentOptions.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
              </div>
            )}

            <button 
              onClick={() => {
                if (!newValue.trim() || (activeAttribute.childOf && !newParent)) {
                  setEditingAttr({ id: 'NEW', name: newValue });
                } else {
                  handleAdd();
                }
              }}
              className="relative overflow-hidden w-full md:w-auto h-[52px] px-6 text-[#2563EB] border-2 border-[#2563EB] rounded-[34px] font-[600] text-[15px] bg-transparent transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-white hover:scale-105 hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-100 shrink-0 flex items-center justify-center gap-2 group z-[1]"
            >
              <span className="absolute inset-0 m-auto w-[50px] h-[50px] rounded-[inherit] scale-0 -z-10 bg-[#2563EB] transition-transform duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[10]"></span>
              <Plus size={20} strokeWidth={2.5} className="z-10" /> 
              <span className="z-10">Add {activeAttribute.name}</span>
            </button>
          </div>
        </div>

        {/* Content Grid */}
        <div className="px-8 pb-8 flex-1 overflow-y-auto">
          <h3 className="text-[18px] font-[800] text-[#0F172A] mb-4 tracking-tight">Current Values</h3>
          
          {loading ? (
            <div className="h-[200px] flex items-center justify-center">
              <Loader />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5">
              
              {/* Value Cards */}
              {currentValues.filter(val => val.name.toLowerCase().includes(searchQuery.toLowerCase())).map((val, index) => {
                const parentName = val.parentId 
                  ? attributes.find(a => a.id === val.parentId)?.name 
                  : null;
                const childText = getChildCountText(val.id, activeAttribute.id);
                const styles = getInitialsStyles(index);

                return (
                  <div 
                    key={val.id} 
                    className="relative flex flex-col p-5 bg-[#FFFFFF] border border-[#EEF2F7] rounded-[16px] shadow-[0_2px_10px_rgba(15,23,42,0.02)] transition-all duration-300 group hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(15,23,42,0.06)] hover:border-[#2563EB]/40 min-h-[160px]"
                  >
                    {/* Top Row: Icon + Menu */}
                    <div className="flex justify-between items-start w-full">
                      <div className="flex gap-4">
                        <div className={`w-[54px] h-[54px] rounded-full ${styles.bg} ${styles.text} ${styles.shadow} flex items-center justify-center font-[800] text-[18px] tracking-wide`}>
                          {getInitials(val.name)}
                        </div>
                        <div className="flex flex-col pt-1">
                          <h3 className="text-[18px] font-[800] text-[#0F172A] leading-tight truncate">
                            {val.name}
                          </h3>
                          {parentName && (
                            <span className="text-[12px] font-[600] text-[#64748B] mt-1">
                              Parent: {parentName}
                            </span>
                          )}
                          {childText && (
                            <span className="text-[13px] font-[600] text-[#2563EB] mt-1.5">
                              {childText}
                            </span>
                          )}
                        </div>
                      </div>
                      <button className="w-8 h-8 flex items-center justify-center text-[#94A3B8] transition-colors hover:text-[#0F172A]">
                        <MoreHorizontal size={20} />
                      </button>
                    </div>

                    {/* Bottom Row */}
                    <div className="flex items-end justify-between mt-auto pt-4">
                      <span className="text-[12px] font-[500] text-[#64748B]">
                        {getRelativeTime(val.createdAt)}
                      </span>
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setEditingAttr({ id: val.id, name: val.name })}
                          className="w-[36px] h-[36px] flex items-center justify-center rounded-[8px] bg-white text-[#3B82F6] shadow-sm transition-colors border border-[#EEF2F7] hover:border-[#3B82F6] hover:bg-blue-50"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => setDeletingId(val.id)}
                          className="w-[36px] h-[36px] flex items-center justify-center rounded-[8px] bg-white text-[#EF4444] shadow-sm transition-colors border border-[#EEF2F7] hover:border-[#EF4444] hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
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
                handleAdd(editingAttr.name, newParent);
                setEditingAttr(null);
              } else {
                confirmEdit(e);
              }
            }}>
              <div className="space-y-5 mb-8">
                <div className="space-y-2">
                  <label className="text-[13px] font-[600] text-[#0F172A] ml-1">Attribute Name</label>
                  <input 
                    type="text"
                    value={editingAttr.name}
                    onChange={(e) => setEditingAttr({ ...editingAttr, name: e.target.value })}
                    placeholder={`E.g. ${activeAttribute.name === 'Department' ? 'Computer Science' : 'Physics'}`}
                    className="w-full h-[52px] px-5 bg-white border border-[#EEF2F7] rounded-[12px] text-[15px] font-[500] text-[#0F172A] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 outline-none transition-all placeholder-[#94A3B8] shadow-sm"
                    autoFocus
                  />
                </div>

                {editingAttr.id === 'NEW' && activeAttribute.childOf && (
                  <div className="space-y-2">
                    <label className="text-[13px] font-[600] text-[#0F172A] ml-1">Parent {attributeTypes.find(a => a.id === activeAttribute.childOf)?.name}</label>
                    <div className="relative">
                      <select 
                        value={newParent}
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
                  disabled={!editingAttr.name.trim() || (editingAttr.id === 'NEW' && activeAttribute.childOf && !newParent)}
                  className="px-7 py-2.5 rounded-full font-[600] text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-slate-300 transition-all text-[14px]"
                >
                  {editingAttr.id === 'NEW' ? 'Create' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
