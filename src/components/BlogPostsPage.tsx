import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  FileText, 
  Settings, 
  Eye, 
  MoreVertical, 
  Trash2, 
  ChevronLeft,
  Filter,
  Calendar,
  User,
  ExternalLink,
  Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { blogService, Blog, BlogPost } from '../services/blogService';
import { useAuth } from '../App';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useParams, useNavigate, Link } from 'react-router-dom';

export const BlogPostsPage = () => {
  const { blogId } = useParams<{ blogId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  useEffect(() => {
    if (blogId && user?.companyId) {
      loadData();
    }
  }, [blogId, user?.companyId]);

  const loadData = async () => {
    try {
      const blogs = await blogService.getBlogs(user!.companyId);
      const currentBlog = blogs.find(b => b.id === blogId);
      if (currentBlog) {
        setBlog(currentBlog);
        const postsData = await blogService.getPosts(blogId!);
        setPosts(postsData);
      }
    } catch (err) {
      toast.error('Failed to load blog data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await blogService.deletePost(id);
      toast.success('Post deleted successfully');
      loadData();
    } catch (err) {
      toast.error('Failed to delete post');
    }
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!blog) return <div>Blog not found</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen pb-24 text-white">
      {/* Back button */}
      <button 
        onClick={() => navigate('/blogs')}
        className="flex items-center space-x-2 text-slate-500 hover:text-indigo-400 transition-colors mb-8 font-black uppercase tracking-widest text-[10px]"
      >
        <ChevronLeft size={16} />
        <span>Return to Grid</span>
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <h1 className="text-4xl font-black italic uppercase tracking-tight">{blog.name}</h1>
            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase tracking-widest rounded-full border border-indigo-500/20">Active Engine</span>
          </div>
          <p className="text-slate-400 font-medium tracking-wide">Managing publication content for <span className="text-indigo-400">/blog/{blog.slug}</span></p>
        </div>
        <button 
          onClick={() => navigate(`/blogs/${blogId}/posts/new`)}
          className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-indigo-500/20 flex items-center space-x-3 rounded-2xl group"
        >
          <Plus size={18} />
          <span>New Entry</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-6 mb-8 flex flex-col md:flex-row items-center gap-6">
        <div className="relative flex-1 group w-full">
          <Search size={18} className="absolute left-5 top-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
          <input 
            type="text"
            placeholder="Search entries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-white rounded-2xl p-5 pl-14 outline-none focus:border-indigo-600 transition-all font-bold"
          />
        </div>
        
        <div className="flex items-center gap-2 p-1 bg-slate-950 border border-slate-800 rounded-2xl w-full md:w-auto">
          {(['all', 'published', 'draft'] as const).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === f ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
            >
              {f === 'all' ? 'All Signals' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-[32px] p-24 text-center">
            <h3 className="text-xl font-black italic text-slate-600 uppercase tracking-tight">No Entries Matched Filter</h3>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <motion.div 
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              key={post.id}
              className="bg-slate-900 border border-slate-800 rounded-[24px] p-6 hover:border-indigo-500/30 transition-all flex flex-col md:flex-row md:items-center gap-6 group"
            >
              <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:scale-110 transition-transform">
                {post.coverImage ? (
                  <img src={post.coverImage} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <FileText size={24} className="text-slate-600" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-3 mb-1">
                  <h4 className="text-lg font-black italic uppercase tracking-tight truncate">{post.title}</h4>
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${post.status === 'published' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                    {post.status}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] font-black text-slate-500 uppercase tracking-widest italic">
                   <div className="flex items-center space-x-2">
                     <User size={12} />
                     <span>{post.authorName}</span>
                   </div>
                   <div className="flex items-center space-x-2">
                     <Calendar size={12} />
                     <span>{format(post.createdAt.toDate(), 'MMM dd, yyyy')}</span>
                   </div>
                   <div className="flex items-center space-x-2">
                     <Settings size={12} />
                     <span>/{post.slug}</span>
                   </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => navigate(`/blogs/${blogId}/posts/${post.id}`)}
                  className="p-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl transition-all"
                  title="Edit Entry"
                >
                  <Edit2 size={18} />
                </button>
                <a 
                  href={`/blog/${blog.slug}/${post.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-4 bg-slate-800 hover:bg-indigo-600 text-white rounded-2xl transition-all"
                  title="View Live"
                >
                  <Eye size={18} />
                </a>
                <button 
                  onClick={() => handleDeletePost(post.id)}
                  className="p-4 bg-slate-800 hover:bg-rose-500 text-white rounded-2xl transition-all"
                  title="Delete Entry"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
