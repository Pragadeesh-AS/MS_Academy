import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Package, Plus, Trash2, Edit2, Search, X, CheckCircle2, Image as ImageIcon,
  Check, Tag, Zap, Star
} from 'lucide-react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

export default function CourseSetup() {
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  
  const [search, setSearch] = useState('');
  
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    tagline: '',
    price: '',
    discountedPrice: '',
    department: 'CSE',
    status: 'Active',
    imageUrl: '',
    features: ['']
  });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const fetchBundles = async () => {
    setLoading(true);
    try {
      const bSnapshot = await getDocs(collection(db, 'course_bundles'));
      const bData = bSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by creation date descending
      bData.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setBundles(bData);
    } catch (e) {
      console.error("Failed to fetch bundles", e);
      showToast("Failed to load course bundles", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBundles();
  }, []);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 1048576) {
      showToast("Image is too large. Please upload an image under 1MB.", "error");
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, imageUrl: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const openAddCreator = () => {
    setFormData({
      name: '',
      tagline: '',
      price: '',
      discountedPrice: '',
      department: 'CSE',
      status: 'Active',
      imageUrl: '',
      features: ['']
    });
    setCurrentId(null);
    setIsEditing(false);
    setIsCreatorOpen(true);
  };

  const handleEdit = (bundle) => {
    setFormData({
      name: bundle.name || '',
      tagline: bundle.tagline || '',
      price: bundle.price || '',
      discountedPrice: bundle.discountedPrice || '',
      department: bundle.department || 'CSE',
      status: bundle.status || 'Active',
      imageUrl: bundle.imageUrl || '',
      features: bundle.features && bundle.features.length > 0 ? bundle.features : ['']
    });
    setCurrentId(bundle.id);
    setIsEditing(true);
    setIsCreatorOpen(true);
  };

  const handleDelete = (id) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteDoc(doc(db, 'course_bundles', deleteConfirmId));
      setDeleteConfirmId(null);
      showToast("Bundle deleted successfully", "success");
      fetchBundles();
    } catch (e) {
      console.error("Failed to delete bundle", e);
      showToast("Failed to delete bundle", "error");
    }
  };

  const handleFeatureChange = (index, value) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData({ ...formData, features: newFeatures });
  };

  const addFeature = () => {
    setFormData({ ...formData, features: [...formData.features, ''] });
  };

  const removeFeature = (index) => {
    if (formData.features.length > 1) {
      const newFeatures = formData.features.filter((_, i) => i !== index);
      setFormData({ ...formData, features: newFeatures });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clean empty features
    const cleanFeatures = formData.features.filter(f => f.trim() !== '');
    const payload = { 
      ...formData, 
      features: cleanFeatures,
      createdAt: new Date().toISOString() 
    };
    
    setIsCreatorOpen(false);
    
    if (isEditing) {
      setBundles(prev => prev.map(b => b.id === currentId ? { id: currentId, ...payload } : b));
      updateDoc(doc(db, 'course_bundles', currentId), payload).then(() => {
        showToast("Bundle saved successfully", "success");
      }).catch(e => {
        console.error("Failed to update bundle", e);
        showToast("Failed to save. Changes reverted.", "error");
        fetchBundles();
      });
    } else {
      const tempId = 'temp-' + Date.now();
      setBundles(prev => [{ id: tempId, ...payload }, ...prev]);
      addDoc(collection(db, 'course_bundles'), payload).then(docRef => {
        setBundles(prev => prev.map(b => b.id === tempId ? { ...b, id: docRef.id } : b));
        showToast("Bundle saved successfully", "success");
      }).catch(e => {
        console.error("Failed to add bundle", e);
        showToast("Failed to save. Changes reverted.", "error");
        fetchBundles();
      });
    }
  };

  const filteredBundles = bundles.filter(b => 
    b.name.toLowerCase().includes(search.toLowerCase()) || 
    b.tagline.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[32px] font-[900] text-slate-900 tracking-tight leading-none mb-2">Course Bundles</h2>
          <p className="text-slate-500 text-sm font-medium">Create and manage premium course packages and test series.</p>
        </div>

        <button 
          onClick={openAddCreator}
          className="w-fit self-start px-5 py-2.5 bg-[#5b32ea] hover:bg-[#4b26c7] text-white rounded-xl font-bold text-[14px] flex items-center gap-2 transition-all shadow-md shadow-[#5b32ea]/20"
        >
          <Plus size={18} />
          <span>Add New Bundle</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder="Search bundles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-sm font-medium rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-[#5b32ea] focus:ring-1 focus:ring-[#5b32ea] transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-slate-100 border-t-[#5b32ea] rounded-full animate-spin"></div>
        </div>
      ) : filteredBundles.length === 0 ? (
        <div className="bg-white border border-slate-200 border-dashed rounded-3xl py-24 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <Package size={32} className="text-slate-300" />
          </div>
          <h3 className="text-[18px] font-[800] text-slate-800 mb-2">No Bundles Found</h3>
          <p className="text-[14px] font-[500] text-slate-500 max-w-[300px] mb-6">Create your first course bundle to start offering comprehensive packages to students.</p>
          <button 
            onClick={openAddCreator}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-[13px] flex items-center gap-2 transition-colors shadow-md"
          >
            <Plus size={16} /> Add First Bundle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredBundles.map((bundle) => (
            <div key={bundle.id} className="bg-white border border-slate-200 rounded-[24px] overflow-hidden shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300 group flex flex-col">
              
              <div className="relative h-48 bg-slate-100 overflow-hidden">
                {bundle.imageUrl ? (
                  <img src={bundle.imageUrl} alt={bundle.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                    <ImageIcon size={32} className="opacity-50" />
                    <span className="text-[13px] font-[700] tracking-wide uppercase opacity-50">No Cover Image</span>
                  </div>
                )}
                
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="bg-white/90 backdrop-blur-sm text-slate-800 px-3 py-1 rounded-full text-[11px] font-[900] tracking-wider uppercase shadow-sm">
                    {bundle.department}
                  </span>
                  {bundle.status === 'Active' ? (
                    <span className="bg-emerald-500/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-[11px] font-[900] tracking-wider uppercase shadow-sm flex items-center gap-1">
                      <Zap size={10} /> Active
                    </span>
                  ) : (
                    <span className="bg-slate-800/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-[11px] font-[900] tracking-wider uppercase shadow-sm">
                      Draft
                    </span>
                  )}
                </div>

                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleEdit(bundle)}
                    className="w-8 h-8 bg-white text-blue-600 rounded-full flex items-center justify-center shadow-md hover:bg-blue-50 transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => handleDelete(bundle.id)}
                    className="w-8 h-8 bg-white text-red-600 rounded-full flex items-center justify-center shadow-md hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col">
                <div className="mb-4">
                  <h3 className="text-[18px] font-[900] text-slate-900 leading-tight mb-1 line-clamp-2">{bundle.name}</h3>
                  <p className="text-[14px] font-[600] text-slate-500 line-clamp-1">{bundle.tagline}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-end gap-2">
                    <span className="text-[28px] font-[900] text-[#5b32ea] tracking-tight leading-none">₹{bundle.discountedPrice || bundle.price}</span>
                    {bundle.discountedPrice && bundle.discountedPrice !== bundle.price && (
                      <span className="text-[14px] font-[700] text-slate-400 line-through mb-1">₹{bundle.price}</span>
                    )}
                  </div>
                </div>

                <div className="mt-auto pt-5 border-t border-slate-100">
                  <h4 className="text-[11px] font-[900] text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Star size={12} className="text-amber-400" /> Key Features
                  </h4>
                  <ul className="space-y-2">
                    {(bundle.features || []).slice(0, 3).map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px] font-[600] text-slate-700">
                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{f}</span>
                      </li>
                    ))}
                    {(bundle.features || []).length > 3 && (
                      <li className="text-[12px] font-[700] text-[#5b32ea] pt-1 ml-6">
                        + {(bundle.features || []).length - 3} more features
                      </li>
                    )}
                  </ul>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Bundle Creator Modal */}
      {isCreatorOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300">
            
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#5b32ea]/10 rounded-xl flex items-center justify-center">
                  <Package size={20} className="text-[#5b32ea]" />
                </div>
                <div>
                  <h2 className="text-[16px] font-[900] text-slate-800">{isEditing ? 'Edit Bundle Pack' : 'Create Bundle Pack'}</h2>
                  <p className="text-[12px] font-[600] text-slate-500">Configure bundle details and pricing</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCreatorOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[13px] font-[800] text-slate-700 uppercase tracking-wide">Bundle Name <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. GATE 2027 Premium Setup"
                    className="w-full bg-slate-50 border border-slate-200 text-[14px] font-[700] text-slate-900 rounded-xl px-4 py-3 outline-none focus:border-[#5b32ea] focus:ring-1 focus:ring-[#5b32ea] transition-all"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-[13px] font-[800] text-slate-700 uppercase tracking-wide">Tagline / Subtitle <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required
                    value={formData.tagline}
                    onChange={(e) => setFormData({...formData, tagline: e.target.value})}
                    placeholder="e.g. Everything you need to crack GATE."
                    className="w-full bg-slate-50 border border-slate-200 text-[14px] font-[700] text-slate-900 rounded-xl px-4 py-3 outline-none focus:border-[#5b32ea] focus:ring-1 focus:ring-[#5b32ea] transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-[800] text-slate-700 uppercase tracking-wide">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 text-[14px] font-[700] text-slate-900 rounded-xl px-4 py-3 outline-none focus:border-[#5b32ea] focus:ring-1 focus:ring-[#5b32ea] transition-all"
                  >
                    <option value="CSE">Computer Science (CSE)</option>
                    <option value="ECE">Electronics (ECE)</option>
                    <option value="ME">Mechanical (ME)</option>
                    <option value="CE">Civil (CE)</option>
                    <option value="EE">Electrical (EE)</option>
                    <option value="DS">Data Science (DS)</option>
                    <option value="ALL">All Departments</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-[800] text-slate-700 uppercase tracking-wide">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 text-[14px] font-[700] text-slate-900 rounded-xl px-4 py-3 outline-none focus:border-[#5b32ea] focus:ring-1 focus:ring-[#5b32ea] transition-all"
                  >
                    <option value="Active">Active</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-[800] text-slate-700 uppercase tracking-wide">Original Price (₹) <span className="text-red-500">*</span></label>
                  <input 
                    type="number" 
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    placeholder="e.g. 50000"
                    className="w-full bg-slate-50 border border-slate-200 text-[14px] font-[700] text-slate-900 rounded-xl px-4 py-3 outline-none focus:border-[#5b32ea] focus:ring-1 focus:ring-[#5b32ea] transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-[800] text-slate-700 uppercase tracking-wide">Discounted Price (₹)</label>
                  <input 
                    type="number" 
                    value={formData.discountedPrice}
                    onChange={(e) => setFormData({...formData, discountedPrice: e.target.value})}
                    placeholder="e.g. 35000"
                    className="w-full bg-slate-50 border border-slate-200 text-[14px] font-[700] text-slate-900 rounded-xl px-4 py-3 outline-none focus:border-[#5b32ea] focus:ring-1 focus:ring-[#5b32ea] transition-all"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-[13px] font-[800] text-slate-700 uppercase tracking-wide">Cover Image</label>
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col items-center justify-center gap-3 relative overflow-hidden transition-all hover:border-slate-300">
                    {formData.imageUrl ? (
                      <div className="relative w-full h-40 group">
                        <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                          <button 
                            type="button"
                            onClick={() => setFormData({...formData, imageUrl: ''})}
                            className="bg-white text-red-600 px-3 py-1.5 rounded-full text-[12px] font-bold shadow-lg"
                          >
                            Remove Image
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-400">
                          <ImageIcon size={20} />
                        </div>
                        <div className="text-center">
                          <p className="text-[13px] font-[800] text-slate-700">Click to upload cover image</p>
                          <p className="text-[11px] font-[600] text-slate-400 mt-1">JPEG, PNG under 1MB</p>
                        </div>
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-[800] text-slate-700 uppercase tracking-wide flex items-center gap-2">
                      <Star size={14} className="text-amber-500" />
                      Key Features
                    </label>
                    <button 
                      type="button"
                      onClick={addFeature}
                      className="text-[12px] font-[800] text-[#5b32ea] hover:bg-[#5b32ea]/10 px-3 py-1 rounded-full transition-colors flex items-center gap-1"
                    >
                      <Plus size={12} /> Add Feature
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {formData.features.map((feature, index) => (
                      <div key={index} className="flex gap-2">
                        <div className="w-8 h-10 flex items-center justify-center shrink-0">
                          <CheckCircle2 size={16} className="text-slate-300" />
                        </div>
                        <input 
                          type="text" 
                          value={feature}
                          onChange={(e) => handleFeatureChange(index, e.target.value)}
                          placeholder="e.g. 500+ Hours of Live Classes"
                          className="flex-1 bg-white border border-slate-200 text-[14px] font-[600] text-slate-800 rounded-xl px-4 py-2 outline-none focus:border-[#5b32ea] focus:ring-1 focus:ring-[#5b32ea] transition-all shadow-sm"
                        />
                        {formData.features.length > 1 && (
                          <button 
                            type="button"
                            onClick={() => removeFeature(index)}
                            className="w-10 h-10 flex items-center justify-center shrink-0 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsCreatorOpen(false)}
                  className="flex-1 py-3.5 rounded-xl border border-slate-200 text-slate-600 font-[800] text-[14px] hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3.5 rounded-xl bg-[#059669] text-white font-[800] text-[14px] hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  <Check size={18} /> {isEditing ? 'Save Changes' : 'Create Bundle'}
                </button>
              </div>

            </form>
          </div>
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
              <h3 className="text-[18px] font-[900] text-slate-800 mb-2">Delete Bundle</h3>
              <p className="text-[14px] font-[500] text-slate-500 leading-relaxed">
                Are you sure you want to delete this course bundle? This action cannot be undone.
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
