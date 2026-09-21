import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Plus, Edit2, Trash2, X, Image as ImageIcon, Check, FileText } from 'lucide-react';

export default function BlogManager() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBlog, setEditingBlog] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    author: 'Admin',
    category: '',
    imageUrl: ''
  });

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'blogs'));
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by creation time if available
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setBlogs(data);
    } catch (error) {
      console.error("Error fetching blogs:", error);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingBlog(null);
    setFormData({
      title: '',
      excerpt: '',
      content: '',
      author: sessionStorage.getItem('auth_name') || 'Admin',
      category: '',
      imageUrl: ''
    });
    setShowModal(true);
  };

  const openEditModal = (blog) => {
    setEditingBlog(blog);
    setFormData({
      title: blog.title || '',
      excerpt: blog.excerpt || '',
      content: blog.content || '',
      author: blog.author || '',
      category: blog.category || '',
      imageUrl: blog.imageUrl || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this blog post?")) return;
    try {
      await deleteDoc(doc(db, 'blogs', id));
      setBlogs(blogs.filter(b => b.id !== id));
    } catch (error) {
      console.error("Error deleting blog:", error);
      alert("Failed to delete blog post.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.content) return alert("Title and Content are required.");
    
    try {
      if (editingBlog) {
        const blogRef = doc(db, 'blogs', editingBlog.id);
        await updateDoc(blogRef, {
          ...formData,
          updatedAt: serverTimestamp()
        });
        setBlogs(blogs.map(b => b.id === editingBlog.id ? { ...b, ...formData } : b));
      } else {
        const docRef = await addDoc(collection(db, 'blogs'), {
          ...formData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        setBlogs([{ id: docRef.id, ...formData, createdAt: { seconds: Date.now() / 1000 } }, ...blogs]);
      }
      setShowModal(false);
    } catch (error) {
      console.error("Error saving blog:", error);
      alert("Failed to save blog post.");
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-6xl mx-auto pb-12 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Blog Manager</h2>
          <p className="text-slate-500 font-medium mt-1">Create, edit, and publish posts to the main website.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={18} /> New Post
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 font-bold bg-white rounded-3xl border border-slate-200">
          Loading blogs...
        </div>
      ) : blogs.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
          <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">No Blog Posts Yet</h3>
          <p className="text-slate-500 mb-6">Create your first blog post to share updates and news.</p>
          <button 
            onClick={openAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 mx-auto transition-colors"
          >
            <Plus size={18} /> Create Post
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogs.map(blog => (
            <div key={blog.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col">
              {blog.imageUrl ? (
                <div className="h-48 w-full overflow-hidden bg-slate-100 relative">
                  <img src={blog.imageUrl} alt={blog.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  {blog.category && (
                    <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-md text-xs font-bold text-slate-800 shadow-sm">
                      {blog.category}
                    </span>
                  )}
                </div>
              ) : (
                <div className="h-32 w-full bg-slate-50 flex items-center justify-center border-b border-slate-100 relative">
                  <ImageIcon size={32} className="text-slate-300" />
                  {blog.category && (
                    <span className="absolute top-3 left-3 bg-white border border-slate-200 px-2.5 py-1 rounded-md text-xs font-bold text-slate-600">
                      {blog.category}
                    </span>
                  )}
                </div>
              )}
              
              <div className="p-5 flex flex-col flex-grow">
                <h3 className="font-bold text-lg text-slate-900 leading-tight mb-2 line-clamp-2">{blog.title}</h3>
                <p className="text-slate-500 text-sm mb-4 line-clamp-3">{blog.excerpt || blog.content.substring(0, 100) + '...'}</p>
                
                <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <span>{blog.author}</span>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => openEditModal(blog)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(blog.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <h3 className="text-xl font-black text-slate-800">
                {editingBlog ? 'Edit Blog Post' : 'Create New Post'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/50">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Post Title *</label>
                <input 
                  type="text" 
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all font-medium text-slate-800"
                  placeholder="Enter an engaging title..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Category</label>
                  <input 
                    type="text" 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm font-medium"
                    placeholder="e.g. Updates, Tips, News..."
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Author</label>
                  <input 
                    type="text" 
                    value={formData.author}
                    onChange={(e) => setFormData({...formData, author: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Featured Image URL</label>
                <input 
                  type="url" 
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm font-medium"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Short Excerpt (Optional)</label>
                <textarea 
                  rows={2}
                  value={formData.excerpt}
                  onChange={(e) => setFormData({...formData, excerpt: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm font-medium resize-none"
                  placeholder="A brief summary for the blog card..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Main Content *</label>
                <textarea 
                  required
                  rows={10}
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all font-medium resize-y font-mono text-sm"
                  placeholder="Write your full blog post here (HTML allowed)..."
                />
              </div>
            </form>
            
            <div className="p-5 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
              <button 
                type="button"
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmit}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md transition-colors flex items-center gap-2"
              >
                <Check size={18} /> {editingBlog ? 'Update Post' : 'Publish Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
