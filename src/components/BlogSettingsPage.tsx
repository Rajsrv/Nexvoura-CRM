import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  Save, 
  Layout, 
  Palette, 
  Type, 
  Globe, 
  Image as ImageIcon,
  Copy,
  ExternalLink,
  Code,
  Tag,
  Plus,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { blogService, Blog, BlogStyling } from '../services/blogService';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { toast } from 'sonner';
import { hasPermission } from '../lib/permissions';
import { Shield } from 'lucide-react';

export const BlogSettingsPage = () => {
  const { blogId } = useParams<{ blogId: string }>();
  const navigate = useNavigate();
  const { user, company } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [blog, setBlog] = useState<Blog | null>(null);

  const canManage = user && hasPermission(user, company, 'blog:manage');

  useEffect(() => {
    if (blogId && user?.companyId) {
      loadBlog();
    }
  }, [blogId, user?.companyId]);

  const loadBlog = async () => {
    try {
      const blogs = await blogService.getBlogs(user!.companyId);
      const currentBlog = blogs.find(b => b.id === blogId);
      if (currentBlog) {
        setBlog(currentBlog);
      }
    } catch (err) {
      toast.error('Failed to load blog settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) {
      toast.error('Insufficient clearance for configuration synchronization');
      return;
    }
    if (!blog) return;

    setSaving(true);
    try {
      await blogService.updateBlog(blogId!, blog);
      toast.success('Configuration synchronized');
      navigate('/blogs');
    } catch (err) {
      toast.error('Failed to update configuration');
    } finally {
      setSaving(false);
    }
  };

  const copyWidgetCode = () => {
    const code = `<!-- Blog Widget Embed -->
<iframe 
  src="${window.location.origin}/blog/${blog?.slug}/widget" 
  width="100%" 
  height="600" 
  frameborder="0"
></iframe>`;
    navigator.clipboard.writeText(code);
    toast.success('Widget protocol copied to clipboard');
  };

  const [newCategory, setNewCategory] = useState('');

  const addCategory = () => {
    if (!canManage) {
      toast.error('Insufficient clearance for taxonomy modification');
      return;
    }
    if (!newCategory.trim() || !blog) return;
    if (blog.categories?.includes(newCategory.trim())) {
      toast.error('Category already exists');
      return;
    }
    const updatedCategories = [...(blog.categories || []), newCategory.trim()];
    setBlog({ ...blog, categories: updatedCategories });
    setNewCategory('');
  };

  const removeCategory = (cat: string) => {
    if (!canManage) {
      toast.error('Insufficient clearance for taxonomy node removal');
      return;
    }
    if (!blog) return;
    setBlog({ ...blog, categories: blog.categories.filter(c => c !== cat) });
  };

  if (loading) return null;

  if (user && !hasPermission(user, company, 'blog:manage')) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-screen text-center bg-slate-950">
        <Shield size={64} className="text-rose-500 mb-6 opacity-20" />
        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white mb-2">Access Denied</h2>
        <p className="text-slate-400 font-medium">Your current clearance level does not allow modification of publication parameters.</p>
        <button 
          onClick={() => navigate('/blogs')}
          className="mt-8 px-6 py-3 bg-slate-800 text-white font-black uppercase tracking-widest text-[10px] rounded-xl"
        >
          Return to Grid
        </button>
      </div>
    );
  }

  if (!blog) return <div>Blog not found</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto min-h-screen pb-24 text-white">
      <button 
        onClick={() => navigate('/blogs')}
        className="flex items-center space-x-2 text-slate-500 hover:text-indigo-400 transition-colors mb-8 font-black uppercase tracking-widest text-[10px]"
      >
        <ChevronLeft size={16} />
        <span>Return to Grid</span>
      </button>

      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tight mb-2">Configure Engine</h1>
          <p className="text-slate-400 font-medium tracking-wide">Customize visual parameters and delivery endpoints.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-12">
        {/* Core Identity */}
        <section className="bg-slate-900 border border-slate-800 rounded-[48px] p-10 space-y-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 font-black text-slate-800 italic uppercase tracking-[0.2em] text-4xl pointer-events-none opacity-20">Identity</div>
          <h2 className="text-xl font-black italic uppercase tracking-tight text-white mb-8 border-l-4 border-indigo-600 pl-4">Core Metadata</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Publisher Name</label>
              <input 
                type="text"
                value={blog.name}
                onChange={(e) => setBlog({ ...blog, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-2xl p-5 outline-none focus:border-indigo-600 transition-all font-bold"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Footer Protocol</label>
              <input 
                type="text"
                placeholder="© 2026 Authorized Personnel"
                value={blog.footerText || ''}
                onChange={(e) => setBlog({ ...blog, footerText: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-2xl p-5 outline-none focus:border-indigo-600 transition-all font-bold"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Logo Logic (URL)</label>
            <input 
              type="text"
              placeholder="https://..."
              value={blog.logoUrl || ''}
              onChange={(e) => setBlog({ ...blog, logoUrl: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-2xl p-5 outline-none focus:border-indigo-600 transition-all font-mono text-sm"
            />
          </div>
        </section>

        {/* Categories Architecture */}
        <section className="bg-slate-900 border border-slate-800 rounded-[48px] p-10 space-y-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 font-black text-slate-800 italic uppercase tracking-[0.2em] text-4xl pointer-events-none opacity-20">Taxonomy</div>
          <h2 className="text-xl font-black italic uppercase tracking-tight text-white mb-8 border-l-4 border-indigo-600 pl-4">Post Categories</h2>
          
          <div className="space-y-6">
            <div className="flex gap-4">
              <input 
                type="text"
                placeholder="Add new category endpoint..."
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                className="flex-1 bg-slate-950 border border-slate-800 text-white rounded-2xl p-5 outline-none focus:border-indigo-600 transition-all font-bold"
              />
              <button 
                type="button"
                onClick={addCategory}
                className="bg-indigo-600 hover:bg-indigo-500 text-white p-5 rounded-2xl transition-all shadow-lg"
              >
                <Plus size={24} />
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              <AnimatePresence>
                {blog.categories?.map((cat) => (
                  <motion.div 
                    key={cat}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-5 py-3 flex items-center space-x-3 group hover:border-indigo-500/50 transition-all"
                  >
                    <Tag size={12} className="text-indigo-400" />
                    <span className="text-xs font-black uppercase tracking-widest">{cat}</span>
                    <button 
                      type="button"
                      onClick={() => removeCategory(cat)}
                      className="text-slate-600 hover:text-rose-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {(!blog.categories || blog.categories.length === 0) && (
                <div className="w-full py-10 text-center border-2 border-dashed border-slate-800 rounded-3xl opacity-20 italic font-black uppercase tracking-widest text-sm">
                  No Taxonomy Nodes Defined
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Visual Matrix */}
        <section className="bg-slate-900 border border-slate-800 rounded-[48px] p-10 space-y-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 font-black text-slate-800 italic uppercase tracking-[0.2em] text-4xl pointer-events-none opacity-20">Aesthetic</div>
          <h2 className="text-xl font-black italic uppercase tracking-tight text-white mb-8 border-l-4 border-indigo-600 pl-4">Visual Matrix</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { label: 'Primary Focus', key: 'primaryColor' },
              { label: 'Back Layer', key: 'backgroundColor' },
              { label: 'Surface Shell', key: 'cardColor' },
              { label: 'Text Nodes', key: 'textColor' },
            ].map((item) => (
              <div key={item.key} className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">{item.label}</label>
                <div className="flex items-center space-x-3 bg-slate-950 border border-slate-800 rounded-2xl p-3">
                   <input 
                    type="color"
                    value={(blog.styling as any)[item.key]}
                    onChange={(e) => setBlog({ 
                      ...blog, 
                      styling: { ...blog.styling, [item.key]: e.target.value } 
                    })}
                    className="w-10 h-10 rounded-xl cursor-pointer border-none"
                  />
                  <input 
                    type="text"
                    value={(blog.styling as any)[item.key]}
                    className="flex-1 bg-transparent text-xs font-mono text-slate-400 outline-none"
                    readOnly
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Grid Architecture</label>
                <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800">
                  <button 
                    type="button"
                    onClick={() => setBlog({ ...blog, styling: { ...blog.styling, layout: 'grid' } })}
                    className={`flex-1 py-4 flex items-center justify-center space-x-2 rounded-xl transition-all ${blog.styling.layout === 'grid' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                  >
                    <Layout size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Grid Vector</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setBlog({ ...blog, styling: { ...blog.styling, layout: 'list' } })}
                    className={`flex-1 py-4 flex items-center justify-center space-x-2 rounded-xl transition-all ${blog.styling.layout === 'list' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                  >
                    <Palette size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">List Array</span>
                  </button>
                </div>
             </div>

             <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Typography Engine</label>
                <select 
                  value={blog.styling.fontFamily}
                  onChange={(e) => setBlog({ ...blog, styling: { ...blog.styling, fontFamily: e.target.value } })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-2xl p-5 outline-none focus:border-indigo-600 transition-all font-bold appearance-none"
                >
                  <option value="font-sans">Protocol: Sans (Inter)</option>
                  <option value="font-serif">Protocol: Editorial (Serif)</option>
                  <option value="font-mono">Protocol: Technical (Mono)</option>
                </select>
             </div>
          </div>
        </section>

        {/* Integration Hub */}
        <section className="bg-slate-900 border border-slate-800 rounded-[48px] p-10 space-y-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 font-black text-slate-800 italic uppercase tracking-[0.2em] text-4xl pointer-events-none opacity-20">Bridge</div>
          <h2 className="text-xl font-black italic uppercase tracking-tight text-white mb-8 border-l-4 border-indigo-600 pl-4">Transmission Protocols</h2>
          
          <div className="p-8 bg-slate-950 border border-slate-800 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center space-x-6">
              <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center text-indigo-400">
                <Code size={32} />
              </div>
              <div>
                <h3 className="text-lg font-black italic uppercase tracking-tight text-white">Embeddable Widget</h3>
                <p className="text-xs font-medium text-slate-500">Inject this publication into any external web structure.</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={copyWidgetCode}
              className="px-8 py-5 bg-slate-800 hover:bg-slate-700 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all shadow-xl flex items-center space-x-3"
            >
              <Copy size={16} />
              <span>Copy Protocol</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="p-8 bg-slate-950 border border-slate-800 rounded-3xl group cursor-pointer hover:border-indigo-500/30 transition-all">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="p-3 bg-slate-900 rounded-xl text-slate-400"><Globe size={20} /></div>
                  <h4 className="font-black italic uppercase tracking-tight text-white">Public Surface</h4>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-indigo-500">/blog/{blog.slug}</span>
                  <ExternalLink size={14} className="text-slate-600 group-hover:text-indigo-400" />
                </div>
             </div>

             <div className="p-8 bg-slate-950 border border-slate-800 rounded-3xl group cursor-pointer hover:border-indigo-500/30 transition-all">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="p-3 bg-slate-900 rounded-xl text-slate-400"><Layout size={20} /></div>
                  <h4 className="font-black italic uppercase tracking-tight text-white">Widget Feed</h4>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-indigo-500">/blog/{blog.slug}/widget</span>
                  <ExternalLink size={14} className="text-slate-600 group-hover:text-indigo-400" />
                </div>
             </div>
          </div>
        </section>

        <div className="flex items-center justify-end">
          <button 
            type="submit"
            disabled={saving}
            className="px-12 py-6 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-xs rounded-[24px] transition-all shadow-2xl shadow-indigo-500/40 flex items-center space-x-4"
          >
            <Save size={20} />
            <span>{saving ? 'Synchronizing...' : 'Commit Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
