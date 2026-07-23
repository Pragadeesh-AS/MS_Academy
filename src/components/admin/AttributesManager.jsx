import React, { useState, useEffect } from 'react';
import { Tags, Plus, Edit2, Trash2, Folder, ChevronDown } from 'lucide-react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';

const attributeTypes = [
  { id: 'department', name: 'Department', childOf: null },
  { id: 'subject', name: 'Subject', childOf: 'department' },
  { id: 'topic', name: 'Topic', childOf: 'subject' },
  { id: 'year', name: 'Year', childOf: null },
  { id: 'mark', name: 'Mark', childOf: null },
  { id: 'difficulty', name: 'Difficulty Level', childOf: null },
];

export default function AttributesManager() {
  const [activeTab, setActiveTab] = useState('department');
  const [newValue, setNewValue] = useState('');
  const [newParent, setNewParent] = useState('');
  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const handleAdd = async () => {
    if (!newValue.trim()) return;
    
    try {
      await addDoc(collection(db, 'question_attributes'), {
        type: activeTab,
        name: newValue.trim(),
        parentId: newParent || null,
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
  
  // Get parent options if this attribute has a parent
  const parentOptions = activeAttribute.childOf 
    ? attributes.filter(a => a.type === activeAttribute.childOf)
    : [];

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      
      {/* LEFT SIDEBAR: ATTRIBUTE FIELDS */}
      <div className="w-full lg:w-80 shrink-0 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-fit">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
          <h3 className="text-lg font-[900] text-slate-800 tracking-tight">Attribute Fields</h3>
        </div>
        
        <div className="p-4 flex flex-col gap-2 overflow-y-auto max-h-[60vh] lg:max-h-none">
          {attributeTypes.map(attr => {
            const count = attributes.filter(a => a.type === attr.id).length;
            return (
              <button
                key={attr.id}
                onClick={() => {
                  setActiveTab(attr.id);
                  setNewValue('');
                  setNewParent('');
                }}
                className={`flex items-center justify-between p-4 rounded-2xl transition-all border-2 ${
                  activeTab === attr.id 
                  ? 'bg-blue-50 border-blue-500 shadow-sm' 
                  : 'bg-white border-transparent hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-3">
                    <Tags size={18} className={activeTab === attr.id ? 'text-blue-600' : 'text-slate-400'} />
                    <span className={`font-bold ${activeTab === attr.id ? 'text-blue-900' : 'text-slate-700'}`}>
                      {attr.name}
                    </span>
                  </div>
                  {attr.childOf && (
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-8">
                      Child of {attributeTypes.find(a => a.id === attr.childOf)?.name}
                    </span>
                  )}
                </div>
                <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                  activeTab === attr.id ? 'bg-blue-200 text-blue-800' : 'bg-slate-100 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-slate-100 bg-gradient-to-r from-blue-50/50 to-transparent">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner">
              <Tags size={20} />
            </div>
            <h2 className="text-2xl font-[900] text-slate-800 tracking-tight">{activeAttribute.name} Configuration</h2>
          </div>
          <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-2xl">
            Manage system-wide options for <span className="font-bold text-slate-700">{activeAttribute.name}</span>. Add new values or organize existing ones to keep the platform structured.
          </p>
        </div>

        <div className="p-6 md:p-8 flex-1 overflow-y-auto space-y-8 bg-slate-50/30">
          
          {/* Add Option Form - Sleek Inline Row */}
          <div className="bg-white rounded-2xl p-2 md:p-3 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-2 md:gap-4 w-full transition-all hover:border-blue-300 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10">
            
            <div className="flex items-center gap-3 px-3 w-full flex-1">
              <Plus size={20} className="text-blue-500 shrink-0" />
              <input 
                type="text"
                placeholder={`Type new ${activeAttribute.name.toLowerCase()}...`}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="w-full bg-transparent text-[15px] font-bold text-slate-800 outline-none placeholder:text-slate-400 placeholder:font-medium py-2"
              />
            </div>

            {activeAttribute.childOf && (
              <>
                <div className="hidden md:block w-px h-8 bg-slate-200"></div>
                <div className="relative w-full md:w-64 shrink-0 px-2 md:px-0">
                  <select 
                    value={newParent}
                    onChange={(e) => setNewParent(e.target.value)}
                    className="w-full appearance-none bg-slate-50 md:bg-transparent text-slate-700 text-[14px] font-bold pl-3 pr-10 py-2.5 rounded-xl md:rounded-none outline-none cursor-pointer border md:border-transparent border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    <option value="">Assign to {attributeTypes.find(a => a.id === activeAttribute.childOf)?.name}...</option>
                    {parentOptions.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-4 md:right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </>
            )}

            <button 
              onClick={handleAdd}
              disabled={!newValue.trim()}
              className="w-full md:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-sm transition-all shrink-0"
            >
              Add {activeAttribute.name}
            </button>
          </div>

          {/* Current Values Grid */}
          <div>
            <h4 className="font-[900] text-slate-800 mb-4">Current Values</h4>
            
            {loading ? (
              <div className="p-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : currentValues.length === 0 ? (
              <div className="p-8 border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center text-slate-400 font-medium">
                No values added yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentValues.map((val) => {
                  const parentName = val.parentId 
                    ? attributes.find(a => a.id === val.parentId)?.name 
                    : null;

                  return (
                    <div key={val.id} className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between group hover:border-blue-400 hover:shadow-md transition-all hover:-translate-y-0.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center font-bold text-slate-400 uppercase text-xs">
                          {val.name.substring(0, 2)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-[15px]">{val.name}</span>
                          {parentName && (
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                              Parent: {parentName}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setEditingAttr({ id: val.id, name: val.name })}
                          className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => setDeletingId(val.id)}
                          className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* MODALS */}
      
      {/* Delete Modal */}
      {deletingId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-[900] text-slate-800 mb-2">Delete Attribute</h3>
            <p className="text-slate-500 text-sm mb-8 font-medium">Are you sure you want to delete this attribute? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeletingId(null)}
                className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="px-5 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-500/20 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingAttr && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-[900] text-slate-800 mb-6">Edit Attribute</h3>
            <form onSubmit={confirmEdit}>
              <div className="space-y-2 mb-8">
                <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Attribute Name</label>
                <input 
                  type="text"
                  value={editingAttr.name}
                  onChange={(e) => setEditingAttr({ ...editingAttr, name: e.target.value })}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setEditingAttr(null)}
                  className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!editingAttr.name.trim()}
                  className="px-5 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 disabled:bg-slate-300 disabled:shadow-none transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
