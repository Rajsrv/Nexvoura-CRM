import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  Save, 
  Eye, 
  FileText, 
  Send,
  Image as ImageIcon,
  Link as LinkIcon,
  Bold,
  Italic,
  List,
  Heading1,
  Heading2,
  Code,
  Tag,
  Plus,
  X,
  Upload,
  Search,
  Grid
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { blogService, BlogPost, Blog, MediaAsset } from '../services/blogService';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { toast } from 'sonner';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';

export const BlogPostEditor = () => {
  const { blogId, postId } = useParams<{ blogId: string; postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [blog, setBlog] = useState<Blog | null>(null);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [tagInput, setTagInput] = useState('');
  
  const [post, setPost] = useState<Partial<BlogPost>>({
    title: '',
    content: '',
    slug: '',
    status: 'draft',
    coverImage: '',
    tags: [],
    category: ''
  });

  useEffect(() => {
    if (user?.companyId) {
      loadBlogAndPost();
    }
  }, [blogId, postId, user?.companyId]);

  const loadBlogAndPost = async () => {
    try {
      const blogs = await blogService.getBlogs(user!.companyId);
      const currentBlog = blogs.find(b => b.id === blogId);
      if (currentBlog) {
        setBlog(currentBlog);
      }

      if (postId && postId !== 'new') {
        const posts = await blogService.getPosts(blogId!);
        const currentPost = posts.find(p => p.id === postId);
        if (currentPost) {
          setPost(currentPost);
        }
      }
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadMedia = async () => {
    setLoadingMedia(true);
    try {
      const assets = await blogService.getMedia(user!.companyId);
      setMediaAssets(assets);
    } catch (err) {
      toast.error('Failed to load media');
    } finally {
      setLoadingMedia(false);
    }
  };

  useEffect(() => {
    if (showMediaLibrary) {
      loadMedia();
    }
  }, [showMediaLibrary]);

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!post.tags?.includes(tagInput.trim())) {
        setPost({ ...post, tags: [...(post.tags || []), tagInput.trim()] });
      }
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setPost({ ...post, tags: post.tags?.filter(t => t !== tag) });
  };

  const handleSave = async (statusOverride?: 'draft' | 'published') => {
    if (!post.title || !post.content || !post.slug) {
      toast.error('Title, content, and slug are required');
      return;
    }

    setSaving(true);
    try {
      const finalStatus = statusOverride || post.status || 'draft';
      const data = { ...post, status: finalStatus, blogId, companyId: user?.companyId };

      if (postId === 'new') {
        await blogService.createPost(data);
        toast.success('Post initialized successfully');
      } else {
        await blogService.updatePost(postId!, data);
        toast.success('Post synchronization complete');
      }
      navigate(`/blogs/${blogId}/posts`);
    } catch (err) {
      toast.error('Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  const insertMarkdown = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('content-editor') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = post.content || '';
    const selectedText = text.substring(start, end);
    const newText = text.substring(0, start) + prefix + selectedText + suffix + text.substring(end);
    
    setPost({ ...post, content: newText });
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 0);
  };

  if (loading) return null;

  return (
    <div className="h-screen bg-slate-950 flex flex-col">
      {/* Top Bar */}
      <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-xl">
        <div className="flex items-center space-x-6">
          <button 
            onClick={() => navigate(`/blogs/${blogId}/posts`)}
            className="p-3 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
             <h1 className="text-xl font-black italic uppercase tracking-tight text-white line-clamp-1">
               {postId === 'new' ? 'Initialize Content' : post.title}
             </h1>
             <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic group">
               Protocol: <span className="text-indigo-400">/blogPosts/{postId}</span>
             </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex bg-slate-800 p-1 rounded-xl mr-4">
             <button 
               onClick={() => setPreviewMode(false)}
               className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${!previewMode ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
             >
               Editor
             </button>
             <button 
               onClick={() => setPreviewMode(true)}
               className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${previewMode ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
             >
               Scanner
             </button>
          </div>

          <button 
            onClick={() => handleSave('draft')}
            disabled={saving}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-black uppercase tracking-widest text-[10px] rounded-xl transition-all"
          >
            Save Draft
          </button>
          <button 
            onClick={() => handleSave('published')}
            disabled={saving}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[10px] rounded-xl transition-all shadow-xl shadow-indigo-500/20 flex items-center space-x-2"
          >
            <Send size={14} />
            <span>Transmit</span>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Settings Sidebar */}
        <div className="w-80 border-r border-slate-800 bg-slate-900/30 overflow-y-auto p-8 space-y-10 hidden lg:block">
           <div className="space-y-4">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Taxonomy Hub</label>
             <select 
               value={post.category || ''}
               onChange={(e) => setPost({ ...post, category: e.target.value })}
               className="w-full bg-slate-950 border border-slate-800 text-white rounded-2xl p-4 outline-none focus:border-indigo-600 transition-all font-bold text-xs appearance-none"
             >
               <option value="">No Category Node</option>
               {blog?.categories?.map(cat => (
                 <option key={cat} value={cat}>{cat}</option>
               ))}
             </select>
           </div>

           <div className="space-y-4">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Entry Title</label>
             <textarea 
               placeholder="Signal Header..."
               value={post.title}
               onChange={(e) => setPost({ ...post, title: e.target.value })}
               className="w-full bg-slate-950 border border-slate-800 text-white rounded-2xl p-4 outline-none focus:border-indigo-600 transition-all font-bold resize-none h-24"
             />
           </div>

           <div className="space-y-4">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Signal Keywords (Tags)</label>
             <input 
               type="text"
               placeholder="Press Enter to add..."
               value={tagInput}
               onChange={(e) => setTagInput(e.target.value)}
               onKeyDown={handleAddTag}
               className="w-full bg-slate-950 border border-slate-800 text-white rounded-2xl p-4 outline-none focus:border-indigo-600 transition-all font-bold text-xs mb-3"
             />
             <div className="flex flex-wrap gap-2">
               {post.tags?.map(tag => (
                 <span key={tag} className="bg-slate-800 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg flex items-center space-x-2">
                   <span>{tag}</span>
                   <button onClick={() => removeTag(tag)} className="text-slate-500 hover:text-rose-500"><X size={10} /></button>
                 </span>
               ))}
             </div>
           </div>

           <div className="space-y-4">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">URL Slug</label>
             <input 
               type="text"
               placeholder="signal-alpha-01"
               value={post.slug}
               onChange={(e) => setPost({ ...post, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
               className="w-full bg-slate-950 border border-slate-800 text-white rounded-2xl p-4 outline-none focus:border-indigo-600 transition-all font-mono text-xs"
             />
           </div>

           <div className="space-y-4">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Cover Image Source</label>
             <div className="flex gap-2 mb-3">
               <input 
                 type="text"
                 placeholder="https://..."
                 value={post.coverImage || ''}
                 onChange={(e) => setPost({ ...post, coverImage: e.target.value })}
                 className="flex-1 bg-slate-950 border border-slate-800 text-white rounded-2xl p-4 outline-none focus:border-indigo-600 transition-all font-mono text-xs"
               />
               <button 
                 type="button"
                 onClick={() => setShowMediaLibrary(true)}
                 className="p-4 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-xl transition-all"
                 title="Open Media Library"
               >
                 <Grid size={18} />
               </button>
             </div>
             {post.coverImage && (
               <div className="aspect-video w-full rounded-2xl overflow-hidden border border-slate-800">
                 <img src={post.coverImage} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
               </div>
             )}
           </div>

           <div className="space-y-4">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Excerpt Protocol</label>
             <textarea 
               placeholder="Brief summary for indexing..."
               value={post.excerpt}
               onChange={(e) => setPost({ ...post, excerpt: e.target.value })}
               className="w-full bg-slate-950 border border-slate-800 text-white rounded-2xl p-4 outline-none focus:border-indigo-600 transition-all font-medium text-xs resize-none h-32"
             />
           </div>
        </div>

        {/* Media Library Modal */}
        <AnimatePresence>
          {showMediaLibrary && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/80 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900 border border-slate-800 w-full max-w-4xl max-h-[80vh] rounded-[48px] overflow-hidden flex flex-col shadow-2xl"
              >
                <div className="p-8 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black italic uppercase tracking-tight text-white mb-1">Media Repository</h2>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest italic">Protocol: /mediaAssets</p>
                  </div>
                  <button 
                    onClick={() => setShowMediaLibrary(false)}
                    className="p-4 hover:bg-slate-800 text-slate-400 hover:text-white rounded-2xl transition-all"
                  >
                    <X size={24} />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-8">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <button 
                      className="aspect-square bg-slate-950 border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-3xl flex flex-col items-center justify-center space-y-4 group transition-all"
                      onClick={() => {
                        const url = prompt('Enter Image URL:');
                        if (url) {
                          blogService.addMedia({
                            name: 'Uploaded Asset',
                            url,
                            type: 'image',
                            companyId: user!.companyId,
                            size: 0,
                            tags: []
                          }).then(() => loadMedia());
                        }
                      }}
                    >
                      <div className="p-4 bg-slate-900 rounded-2xl text-indigo-400 group-hover:scale-110 transition-transform"><Upload size={24} /></div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-white">Transmit External</span>
                    </button>

                    {mediaAssets.map(asset => (
                      <div 
                        key={asset.id} 
                        className="aspect-square bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden group relative cursor-pointer"
                        onClick={() => {
                          setPost({ ...post, coverImage: asset.url });
                          setShowMediaLibrary(false);
                        }}
                      >
                        <img src={asset.url} alt={asset.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-indigo-600/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-[10px] font-black uppercase text-white tracking-widest bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">Deploy Asset</span>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            blogService.deleteMedia(asset.id).then(() => loadMedia());
                          }}
                          className="absolute top-2 right-2 p-2 bg-black/60 text-white rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-500 transition-all shadow-xl"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    
                    {(!loadingMedia && mediaAssets.length === 0) && (
                      <div className="col-span-full py-24 text-center opacity-20 font-black uppercase italic tracking-[0.2em]">Repository Empty</div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Main Editor */}
        <div className="flex-1 flex flex-col bg-slate-950 relative">
          {!previewMode ? (
            <>
              {/* Toolbar */}
              <div className="p-4 border-b border-slate-800 flex items-center space-x-1 overflow-x-auto no-scrollbar">
                <button onClick={() => insertMarkdown('# ', '')} className="p-3 text-slate-500 hover:text-indigo-400 hover:bg-slate-900 rounded-xl transition-all" title="H1"><Heading1 size={18} /></button>
                <button onClick={() => insertMarkdown('## ', '')} className="p-3 text-slate-500 hover:text-indigo-400 hover:bg-slate-900 rounded-xl transition-all" title="H2"><Heading2 size={18} /></button>
                <div className="w-px h-6 bg-slate-800 mx-2" />
                <button onClick={() => insertMarkdown('**', '**')} className="p-3 text-slate-500 hover:text-indigo-400 hover:bg-slate-900 rounded-xl transition-all" title="Bold"><Bold size={18} /></button>
                <button onClick={() => insertMarkdown('*', '*')} className="p-3 text-slate-500 hover:text-indigo-400 hover:bg-slate-900 rounded-xl transition-all" title="Italic"><Italic size={18} /></button>
                <div className="w-px h-6 bg-slate-800 mx-2" />
                <button onClick={() => insertMarkdown('- ', '')} className="p-3 text-slate-500 hover:text-indigo-400 hover:bg-slate-900 rounded-xl transition-all" title="List"><List size={18} /></button>
                <button onClick={() => insertMarkdown('```\n', '\n```')} className="p-3 text-slate-500 hover:text-indigo-400 hover:bg-slate-900 rounded-xl transition-all" title="Code"><Code size={18} /></button>
                <div className="w-px h-6 bg-slate-800 mx-2" />
                <button onClick={() => insertMarkdown('![Image Description](', ')')} className="p-3 text-slate-500 hover:text-indigo-400 hover:bg-slate-900 rounded-xl transition-all" title="Image"><ImageIcon size={18} /></button>
                <button onClick={() => insertMarkdown('[Label](', ')')} className="p-3 text-slate-500 hover:text-indigo-400 hover:bg-slate-900 rounded-xl transition-all" title="Link"><LinkIcon size={18} /></button>
              </div>
              <textarea 
                id="content-editor"
                placeholder="Begin data transmission... (Markdown supported)"
                value={post.content}
                onChange={(e) => setPost({ ...post, content: e.target.value })}
                className="flex-1 w-full bg-transparent text-slate-300 p-12 outline-none font-mono text-base leading-relaxed resize-none"
              />
            </>
          ) : (
            <div className="flex-1 overflow-y-auto p-12 lg:p-24 bg-white text-slate-900">
               <div className="max-w-3xl mx-auto prose prose-slate prose-lg">
                 {post.coverImage && <img src={post.coverImage} alt="" className="w-full aspect-video object-cover rounded-3xl mb-12 shadow-2xl" />}
                 <h1 className="text-5xl font-black italic uppercase tracking-tight mb-8 leading-tight">{post.title || 'Untitled Signal'}</h1>
                 <div className="flex items-center space-x-4 mb-12 text-slate-400 text-sm font-bold uppercase tracking-widest border-y border-slate-100 py-6">
                    <span>By {user?.name || 'Authorized Personnel'}</span>
                    <span className="w-2 h-2 bg-slate-200 rounded-full" />
                    <span>{format(new Date(), 'MMMM dd, yyyy')}</span>
                 </div>
                 <div className="markdown-body">
                   <ReactMarkdown>{post.content || ''}</ReactMarkdown>
                 </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
