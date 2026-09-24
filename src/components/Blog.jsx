import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Calendar, User, FileText, Sparkles } from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

const formatDate = (ts) => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function Blog() {
  const { id } = useParams();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const snap = await getDocs(collection(db, 'blogs'));
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setBlogs(data);
      } catch (err) {
        console.error('Failed to load blogs:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchBlogs();
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [id]);

  if (loading) {
    return (
      <div className="w-full max-w-[1200px] mx-auto px-6 py-24 text-center text-slate-400 font-bold">
        Loading blog posts...
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-[1200px] mx-auto px-6 py-24 text-center">
        <h2 className="text-2xl font-black text-slate-800 mb-2">Couldn't load the blog</h2>
        <p className="text-slate-500">Please try again in a little while.</p>
      </div>
    );
  }

  // ---------- Single post ----------
  if (id) {
    const post = blogs.find(b => b.id === id);
    if (!post) {
      return (
        <div className="w-full max-w-[800px] mx-auto px-6 py-24 text-center">
          <h2 className="text-2xl font-black text-slate-800 mb-2">Post not found</h2>
          <p className="text-slate-500 mb-6">This blog post may have been removed.</p>
          <Link to="/blog" className="inline-flex items-center gap-2 text-[#1d4ed8] font-bold hover:underline">
            <ArrowLeft size={16} /> Back to all posts
          </Link>
        </div>
      );
    }
    return (
      <motion.article
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[800px] mx-auto px-6 pt-4 pb-20"
      >
        <Link to="/blog" className="inline-flex items-center gap-2 text-slate-500 hover:text-[#1d4ed8] font-semibold text-sm mb-6 transition-colors">
          <ArrowLeft size={16} /> All posts
        </Link>
        {post.category && (
          <span className="inline-block px-3 py-1 rounded-full bg-blue-50 text-[#1d4ed8] text-xs font-bold border border-blue-100 mb-4">
            {post.category}
          </span>
        )}
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-5">{post.title}</h1>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-slate-500 mb-8">
          {post.author && <span className="flex items-center gap-1.5"><User size={15} /> {post.author}</span>}
          {formatDate(post.createdAt) && <span className="flex items-center gap-1.5"><Calendar size={15} /> {formatDate(post.createdAt)}</span>}
        </div>
        {post.imageUrl && (
          <img src={post.imageUrl} alt={post.title} className="w-full max-h-[460px] object-cover rounded-3xl mb-10 shadow-sm border border-slate-100" />
        )}
        <div className="text-[17px] leading-8 text-slate-700 whitespace-pre-line break-words">{post.content}</div>
      </motion.article>
    );
  }

  // ---------- Post list ----------
  return (
    <div className="w-full max-w-[1200px] mx-auto px-6 pt-4 pb-20">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-[#1d4ed8] font-semibold text-sm border border-blue-100 mb-5">
          <Sparkles size={16} /> <span>MS Academy Blog</span>
        </div>
        <h1 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-4">Latest News & Insights</h1>
        <p className="text-lg text-slate-500">Updates, tips and stories from MS Academy.</p>
      </div>

      {blogs.length === 0 ? (
        <div className="text-center bg-white border border-slate-200 rounded-3xl p-16 shadow-sm">
          <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-1">No posts yet</h3>
          <p className="text-slate-500">Check back soon for new articles.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogs.map((blog, i) => (
            <motion.div
              key={blog.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 8) * 0.05 }}
            >
              <Link
                to={`/blog/${blog.id}`}
                className="group h-full bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
              >
                <div className="h-52 w-full bg-gradient-to-br from-blue-50 to-slate-100 overflow-hidden relative">
                  {blog.imageUrl ? (
                    <img src={blog.imageUrl} alt={blog.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-blue-300"><FileText size={48} /></div>
                  )}
                  {blog.category && (
                    <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-md text-xs font-bold text-slate-800 shadow-sm">
                      {blog.category}
                    </span>
                  )}
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-400 mb-3">
                    {formatDate(blog.createdAt) && <span className="flex items-center gap-1.5"><Calendar size={13} /> {formatDate(blog.createdAt)}</span>}
                    {blog.author && <span className="flex items-center gap-1.5"><User size={13} /> {blog.author}</span>}
                  </div>
                  <h3 className="text-xl font-black text-slate-900 leading-snug mb-2 line-clamp-2 group-hover:text-[#1d4ed8] transition-colors">{blog.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed line-clamp-3 mb-5">
                    {blog.excerpt || (blog.content || '').substring(0, 140) + '...'}
                  </p>
                  <span className="mt-auto inline-flex items-center gap-1.5 text-[#1d4ed8] font-bold text-sm">
                    Read more <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
