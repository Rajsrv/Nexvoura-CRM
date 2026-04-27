import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Layout, 
  List, 
  Settings, 
  Eye, 
  FileText, 
  MoreVertical, 
  Trash2, 
  ExternalLink,
  ChevronRight,
  Globe,
  Palette,
  Type,
  Code,
  BarChart3,
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { blogService, Blog, BlogStyling } from '../services/blogService';
import { useAuth } from '../App';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useNavigate, Link } from 'react-router-dom';
import { hasPermission } from '../lib/permissions';

const DEFAULT_STYLING: BlogStyling = {
  primaryColor: '#6366f1',
  backgroundColor: '#f8fafc',
  cardColor: '#ffffff',
  textColor: '#0f172a',
  fontFamily: 'font-sans',
  layout: 'grid'
};

export const BlogsPage = () => {
  const { user, company } = useAuth();
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBlog, setNewBlog] = useState({
    name: '',
    slug: '',
    description: '',
    styling: DEFAULT_STYLING
  });

  const canManage = user && hasPermission(user, company, 'blog:manage');

  useEffect(() => {
    if (user?.companyId) {
      loadBlogs();
    }
  }, [user?.companyId]);

  const loadBlogs = async () => {
    try {
      const data = await blogService.getBlogs(user!.companyId);
      setBlogs(data);
    } catch (err) {
      toast.error('Failed to load blogs');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) {
      toast.error('Insufficient clearance for content engine initialization');
      return;
    }
    if (!newBlog.name || !newBlog.slug) {
      toast.error('Name and slug are required');
      return;
    }

    try {
      await blogService.createBlog({
        ...newBlog,
        companyId: user!.companyId
      });
      toast.success('Blog created successfully');
      setShowCreateModal(false);
      setNewBlog({
        name: '',
        slug: '',
        description: '',
        styling: DEFAULT_STYLING
      });
      loadBlogs();
    } catch (err) {
      toast.error('Failed to create blog');
    }
  };

  const handleDeleteBlog = async (id: string) => {
    if (!canManage) {
      toast.error('Insufficient clearance for terminal publication deletion');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this blog? All posts will remain but will be orphaned. ')) return;
    try {
      await blogService.deleteBlog(id);
      toast.success('Blog deleted successfully');
      loadBlogs();
    } catch (err) {
      toast.error('Failed to delete blog');
    }
  };

  if (user && !hasPermission(user, company, 'blog:view')) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Shield size={64} className="text-rose-500 mb-6 opacity-20" />
        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white mb-2">Access Denied</h2>
        <p className="text-slate-400 font-medium">Your current clearance level does not allow access to the Content Network.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tight text-white mb-2">Blog Systems</h1>
          <p className="text-slate-400 font-medium tracking-wide">Manage company publications and content delivery.</p>
        </div>
        {canManage && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-indigo-500/20 flex items-center space-x-3 rounded-2xl group"
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform" />
            <span>Initialize Publication</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-slate-900/50 rounded-[32px] animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : blogs.length === 0 ? (
        <div className="bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-[48px] p-24 text-center">
          <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-8">
            <Globe size={40} className="text-slate-600" />
          </div>
          <h2 className="text-2xl font-black italic text-white uppercase mb-4 tracking-tight">No Publications Found</h2>
          <p className="text-slate-500 max-w-md mx-auto mb-10 font-medium">Your company hasn't initialized any blog publications yet.</p>
          {canManage && (
            <button 
              onClick={() => setShowCreateModal(true)}
              className="text-indigo-400 font-black uppercase tracking-widest text-[10px] hover:text-indigo-300 transition-colors flex items-center justify-center mx-auto space-x-2"
            >
              <span>Start Your First Blog</span>
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogs.map((blog) => (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={blog.id} 
              className="group bg-slate-900 border border-slate-800 rounded-[32px] overflow-hidden hover:border-indigo-500/50 transition-all flex flex-col shadow-2xl relative overflow-hidden"
            >
              {/* Decorative accent */}
              <div 
                className="absolute top-0 right-0 w-32 h-32 opacity-10 blur-3xl -mr-10 -mt-10 transition-colors group-hover:opacity-30"
                style={{ backgroundColor: blog.styling.primaryColor }}
              />

              <div className="p-8 flex-1">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-indigo-400">
                    <FileText size={24} />
                  </div>
                  <div className="flex items-center space-x-2">
                    {canManage && (
                      <>
                        <button 
                          onClick={() => navigate(`/blogs/${blog.id}/settings`)}
                          className="p-3 bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all"
                        >
                          <Settings size={18} />
                        </button>
                        <button 
                          onClick={() => navigate(`/blogs/${blog.id}/analytics`)}
                          className="p-3 bg-slate-800/50 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400 rounded-xl transition-all"
                        >
                          <BarChart3 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteBlog(blog.id)}
                          className="p-3 bg-slate-800/50 hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 rounded-xl transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <h3 className="text-xl font-black italic uppercase tracking-tight text-white mb-2 group-hover:text-indigo-400 transition-colors">{blog.name}</h3>
                <p className="text-slate-500 text-sm font-medium line-clamp-2 mb-6">
                  {blog.description || 'No description provided for this publication.'}
                </p>

                <div className="flex items-center space-x-4 mb-8">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase text-slate-600 tracking-widest">Protocol Slug</span>
                    <span className="text-xs font-mono text-indigo-500">/{blog.slug}</span>
                  </div>
                  <div className="h-4 w-px bg-slate-800" />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase text-slate-600 tracking-widest">Created</span>
                    <span className="text-xs font-bold text-slate-400">{format(blog.createdAt.toDate(), 'MMM dd, yyyy')}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-950 border-t border-slate-800 flex items-center gap-3">
                <Link 
                  to={`/blogs/${blog.id}/posts`}
                  className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white font-black uppercase tracking-widest text-[10px] text-center rounded-2xl transition-all"
                >
                  Manage Posts
                </Link>
                <a 
                  href={`/blog/${blog.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl transition-all"
                >
                  <Eye size={18} />
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" 
              onClick={() => setShowCreateModal(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-[48px] shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleCreateBlog}>
                <div className="p-10 border-b border-slate-800">
                  <h2 className="text-3xl font-black italic text-white uppercase tracking-tight mb-2">New Publication</h2>
                  <p className="text-slate-500 font-medium">Initialize a new content engine for your company.</p>
                </div>

                <div className="p-10 space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Publication Name</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Corporate Engineering Blog"
                      value={newBlog.name}
                      onChange={(e) => setNewBlog({ ...newBlog, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-2xl p-5 outline-none focus:border-indigo-600 transition-all font-bold"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Public URL Slug</label>
                    <div className="relative">
                      <span className="absolute left-5 top-5 text-slate-600 font-mono">/blog/</span>
                      <input 
                        type="text"
                        required
                        placeholder="engineering"
                        value={newBlog.slug}
                        onChange={(e) => setNewBlog({ ...newBlog, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-2xl p-5 pl-16 outline-none focus:border-indigo-600 transition-all font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Description</label>
                    <textarea 
                      placeholder="What is this blog about?"
                      value={newBlog.description}
                      onChange={(e) => setNewBlog({ ...newBlog, description: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-2xl p-5 outline-none focus:border-indigo-600 transition-all font-bold min-h-[120px] resize-none"
                    />
                  </div>
                </div>

                <div className="p-10 bg-slate-950 flex items-center space-x-4">
                  <button 
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-5 bg-slate-800 hover:bg-slate-700 text-slate-400 font-black uppercase tracking-widest text-xs rounded-2xl transition-all"
                  >
                    Abort
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-xs rounded-2xl transition-all shadow-xl shadow-indigo-500/20"
                  >
                    Confirm & Start
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
