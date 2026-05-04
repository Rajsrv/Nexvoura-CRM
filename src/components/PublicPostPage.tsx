import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { blogService, Blog, BlogPost, BlogComment } from '../services/blogService';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, User, ArrowLeft, Share2, MessageCircle, Send, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

import NexvouraLoader from './NexvouraLoader';

export const CommentSection = ({ blog, post }: { blog: Blog; post: BlogPost }) => {
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    loadComments();
  }, [post.id]);

  const loadComments = async () => {
    try {
      // Only get approved comments for public view
      const data = await blogService.getComments(post.id, 'approved');
      setComments(data);
    } catch (err) {
      console.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !authorName.trim() || !authorEmail.trim()) {
      toast.error('All fields are required for transmission');
      return;
    }

    try {
      await blogService.createComment({
        blogId: blog.id,
        postId: post.id,
        companyId: blog.companyId,
        authorName,
        authorEmail,
        content: newComment,
        status: 'pending'
      });
      setSubmitted(true);
      setNewComment('');
      toast.success('Signal buffered for moderation');
    } catch (err) {
      toast.error('Transmission failed');
    }
  };

  if (loading) return null;

  return (
    <section className="mt-32 pt-24 border-t border-black/5">
      <div className="flex items-center space-x-4 mb-12">
        <div className="p-3 bg-black/5 rounded-2xl">
          <MessageCircle size={24} className="opacity-40" />
        </div>
        <div>
          <h2 className="text-2xl font-black italic uppercase tracking-tight">Public Commentary</h2>
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic">{comments.length} Signals Captured</p>
        </div>
      </div>

      {!submitted ? (
        <form onSubmit={handleSubmit} className="bg-black/5 rounded-[32px] sm:rounded-[48px] p-6 sm:p-10 mb-16 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">Identity Tag</label>
              <input 
                type="text"
                placeholder="Name or Alias"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full bg-white/50 border border-black/5 rounded-2xl p-5 outline-none focus:border-indigo-500 transition-all font-bold"
                required
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">Contact Protocol (Private)</label>
              <input 
                type="email"
                placeholder="email@node.com"
                value={authorEmail}
                onChange={(e) => setAuthorEmail(e.target.value)}
                className="w-full bg-white/50 border border-black/5 rounded-2xl p-5 outline-none focus:border-indigo-500 transition-all font-bold"
                required
              />
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest opacity-40 px-1">Signal Content</label>
            <textarea 
              placeholder="Inject thoughts into the stream..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="w-full bg-white/50 border border-black/5 rounded-2xl p-5 outline-none focus:border-indigo-500 transition-all font-medium h-48 resize-none"
              required
            />
          </div>
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center space-x-3 text-slate-400">
               <ShieldAlert size={14} />
               <span className="text-[9px] font-black uppercase tracking-widest">Awaiting Moderation Protocol</span>
            </div>
            <button 
              type="submit"
              className="px-10 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl shadow-indigo-500/20 flex items-center space-x-3"
            >
              <Send size={14} />
              <span>Broadcast Signal</span>
            </button>
          </div>
        </form>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-50 border border-emerald-100 rounded-[32px] sm:rounded-[48px] p-6 sm:p-12 mb-16 text-center space-y-4"
        >
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle2 size={40} />
          </div>
          <h3 className="text-2xl font-black italic uppercase tracking-tight text-emerald-900">Transmission Cached</h3>
          <p className="text-sm font-medium text-emerald-600 italic">Your message is securely stored and awaiting moderator verification.</p>
          <button 
            onClick={() => setSubmitted(false)}
            className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 transition-colors pt-4 block w-full"
          >
            Transmit Another Signal
          </button>
        </motion.div>
      )}

      <div className="space-y-12">
        {comments.map((comment, index) => (
          <motion.div 
            key={comment.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start space-x-6"
          >
            <div className="w-14 h-14 bg-black/5 rounded-2xl flex items-center justify-center text-xl font-black italic text-slate-400">
              {comment.authorName[0].toUpperCase()}
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-lg font-black italic uppercase tracking-tight">{comment.authorName}</span>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-30">{format(comment.createdAt.toDate(), 'MMM dd, yyyy')}</span>
              </div>
              <p className="text-slate-600 font-medium leading-relaxed bg-black/5 p-6 rounded-3xl rounded-tl-none">{comment.content}</p>
            </div>
          </motion.div>
        ))}
        {comments.length === 0 && !loading && (
          <div className="py-24 text-center border-2 border-dashed border-black/5 rounded-[48px] opacity-20 italic font-black uppercase tracking-[0.2em]">Zero Signals Detected</div>
        )}
      </div>
    </section>
  );
};

export const PublicPostPage = () => {
  const { slug, postSlug } = useParams<{ slug: string; postSlug: string }>();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (slug && postSlug) {
      loadData();
    }
  }, [slug, postSlug]);

  useEffect(() => {
    return () => {
      // Log read time on unmount
      if (blog && post) {
        const readTime = Math.floor((Date.now() - startTime) / 1000);
        if (readTime > 5) { // Only log if they stayed for more than 5 seconds
          blogService.logEvent({
            blogId: blog.id,
            postId: post.id,
            companyId: blog.companyId,
            eventType: 'read_time',
            value: readTime
          });
        }
      }
    };
  }, [blog, post, startTime]);

  const loadData = async () => {
    try {
      const currentBlog = await blogService.getBlogBySlug(slug!);
      if (currentBlog) {
        setBlog(currentBlog);
        const postData = await blogService.getPostBySlug(currentBlog.id, postSlug!);
        setPost(postData);

        if (postData) {
          // Log view event
          blogService.logEvent({
            blogId: currentBlog.id,
            postId: postData.id,
            companyId: currentBlog.companyId,
            eventType: 'view',
            source: document.referrer || 'direct'
          });
        }
      }
    } catch (err) {
      console.error('Failed to load post', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <NexvouraLoader label="Decrypting Transmission" size="lg" />
      </div>
    );
  }

  if (!blog || !post) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-6 text-center">
        <h1 className="text-4xl font-black italic uppercase mb-4 tracking-tighter">404: Node Missing</h1>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-8">This content node has been decommissioned or moved.</p>
        <Link to={`/blog/${slug}`} className="px-8 py-4 bg-indigo-600 rounded-2xl font-black uppercase tracking-widest text-[10px]">Return to Source</Link>
      </div>
    );
  }

  const s = blog.styling;

  return (
    <div 
      className={`min-h-screen ${s.fontFamily} transition-all`}
      style={{ backgroundColor: s.backgroundColor, color: s.textColor }}
    >
      <nav className="p-8 border-b border-black/5 flex items-center justify-between sticky top-0 bg-opacity-80 backdrop-blur-xl z-50">
        <Link to={`/blog/${blog.slug}`} className="flex items-center space-x-3 text-xs font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity">
          <ArrowLeft size={16} />
          <span>Exit to Feed</span>
        </Link>
        <Link to={`/blog/${blog.slug}`} className="absolute left-1/2 -translate-x-1/2">
          {blog.logoUrl ? (
            <img src={blog.logoUrl} alt={blog.name} className="h-8 object-contain" referrerPolicy="no-referrer" />
          ) : (
            <span className="text-lg font-black italic uppercase tracking-tighter" style={{ color: s.primaryColor }}>{blog.name}</span>
          )}
        </Link>
        <button className="p-3 bg-black/5 rounded-full hover:bg-black/10 transition-all">
          <Share2 size={18} />
        </button>
      </nav>

      <article className="max-w-4xl mx-auto px-8 pt-24 pb-48">
        <header className="mb-16">
          {post.coverImage && (
            <motion.div 
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              className="aspect-video w-full rounded-[48px] overflow-hidden mb-16 shadow-2xl relative"
            >
              <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </motion.div>
          )}

          <div className="flex items-center space-x-4 mb-8 text-[11px] font-black uppercase tracking-[0.2em] opacity-40">
            <span className="px-4 py-1.5 bg-black/5 rounded-full" style={{ color: s.primaryColor }}>Transmission Active</span>
            <span>{format(post.createdAt.toDate(), 'MMMM dd, p')}</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter mb-8 leading-[0.95]" style={{ color: s.textColor }}>
            {post.title}
          </h1>

          <div className="flex items-center space-x-6 pt-8 border-t border-black/5">
             <div className="w-12 h-12 bg-black/5 rounded-2xl flex items-center justify-center">
                <User size={20} className="opacity-40" />
             </div>
             <div>
                <span className="block text-[10px] font-black uppercase tracking-widest opacity-30 mb-1">Author Signal</span>
                <span className="text-lg font-black italic uppercase tracking-tight">{post.authorName}</span>
             </div>
          </div>
        </header>

        <div className="prose prose-slate prose-xl max-w-none markdown-body">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>

        <div className="mt-24 pt-12 border-t border-black/5 flex flex-col md:flex-row md:items-center justify-between gap-8">
           <div className="flex items-center space-x-3">
             {post.category && (
               <span className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest">{post.category}</span>
             )}
             {post.tags?.map(tag => (
               <span key={tag} className="px-4 py-2 bg-black/5 rounded-xl text-[10px] font-black uppercase tracking-widest opacity-60">#{tag}</span>
             ))}
           </div>
        </div>

        <CommentSection blog={blog} post={post} />
      </article>

      <footer className="p-12 text-center border-t border-black/5 opacity-40">
         <p className="text-[10px] font-black uppercase tracking-[0.2em]">{blog.footerText || `© ${new Date().getFullYear()} ${blog.name}. Powered by Intelligence Engine.`}</p>
      </footer>
    </div>
  );
};
