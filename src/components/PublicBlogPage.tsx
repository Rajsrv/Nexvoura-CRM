import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { blogService, Blog, BlogPost } from '../services/blogService';
import { motion } from 'motion/react';
import { Calendar, User, ArrowRight, Share2, Search } from 'lucide-react';
import { format } from 'date-fns';

export const PublicBlogPage = ({ isWidget = false }: { isWidget?: boolean }) => {
  const { slug } = useParams<{ slug: string }>();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      loadData();
    }
  }, [slug]);

  const loadData = async () => {
    try {
      const currentBlog = await blogService.getBlogBySlug(slug!);
      if (currentBlog) {
        setBlog(currentBlog);
        const postsData = await blogService.getPosts(currentBlog.id, 'published');
        setPosts(postsData);
        
        // Log view event
        blogService.logEvent({
          blogId: currentBlog.id,
          companyId: currentBlog.companyId,
          eventType: 'view',
          source: document.referrer || 'direct'
        });
      }
    } catch (err) {
      console.error('Failed to load blog', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-6 text-center">
        <h1 className="text-4xl font-black italic uppercase mb-4 tracking-tighter">404: Signal Lost</h1>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">The requested publication does not exist on this frequency.</p>
      </div>
    );
  }

  const s = blog.styling;
  const filteredPosts = posts.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div 
      className={`min-h-screen ${s.fontFamily} transition-all`}
      style={{ backgroundColor: s.backgroundColor, color: s.textColor }}
    >
      {/* Navbar */}
      {!isWidget && (
        <nav className="p-8 border-b border-black/5 flex items-center justify-between sticky top-0 bg-opacity-80 backdrop-blur-xl z-50">
          <Link to={`/blog/${blog.slug}`} className="flex items-center space-x-4">
            {blog.logoUrl ? (
              <img src={blog.logoUrl} alt={blog.name} className="h-10 object-contain" referrerPolicy="no-referrer" />
            ) : (
              <h2 className="text-2xl font-black italic uppercase tracking-tighter" style={{ color: s.primaryColor }}>{blog.name}</h2>
            )}
          </Link>
          <div className="flex items-center space-x-6">
            <div className="relative group hidden md:block">
               <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" />
               <input 
                 type="text" 
                 placeholder="Search entries..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="pl-10 pr-4 py-2 rounded-full bg-black/5 border border-transparent focus:bg-white focus:border-indigo-500/20 outline-none transition-all text-xs font-bold w-64" 
               />
            </div>
            <button className="p-3 bg-black/5 hover:bg-black/10 rounded-full transition-all">
              <Share2 size={18} />
            </button>
          </div>
        </nav>
      )}

      {/* Hero */}
      {!isWidget && (
        <header className="px-8 py-24 md:py-32 text-center max-w-4xl mx-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter mb-8 leading-[0.9]"
            style={{ color: s.primaryColor }}
          >
            {blog.name}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl font-bold opacity-60 max-w-2xl mx-auto leading-relaxed"
          >
            {blog.description || 'Welcome to our publication area.'}
          </motion.p>
        </header>
      )}

      {/* Posts Section */}
      <main className={`px-8 pb-32 max-w-7xl mx-auto ${isWidget ? 'py-8' : ''}`}>
        {blog.categories && blog.categories.length > 0 && (
          <div className="flex flex-wrap justify-center gap-3 mb-16 px-4">
            <button 
              onClick={() => setSelectedCategory(null)}
              className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${!selectedCategory ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20' : 'bg-black/5 text-slate-500 hover:bg-black/10'}`}
            >
              All Signals
            </button>
            {blog.categories.map(cat => (
              <button 
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === cat ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20' : 'bg-black/5 text-slate-500 hover:bg-black/10'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {filteredPosts.length === 0 ? (
          <div className="text-center py-24 border-2 border-dashed border-black/5 rounded-[48px]">
            <p className="font-black italic uppercase opacity-20 text-4xl">Scanning: No Results</p>
          </div>
        ) : (
          <div className={`grid gap-12 ${s.layout === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
            {filteredPosts.map((post, idx) => (
              <motion.article 
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group flex flex-col h-full rounded-[40px] overflow-hidden transition-all hover:-translate-y-2"
                style={{ backgroundColor: s.cardColor, boxShadow: '0 20px 40px -20px rgba(0,0,0,0.1)' }}
              >
                {post.coverImage && (
                  <Link to={`/blog/${blog.slug}/${post.slug}`} className="block relative aspect-video overflow-hidden">
                    <img 
                      src={post.coverImage} 
                      alt={post.title} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                )}
                <div className="p-10 flex flex-col flex-1">
                  <div className="flex items-center space-x-4 mb-6 text-[10px] font-black uppercase tracking-widest opacity-40">
                    <span className="flex items-center space-x-1"><User size={12} /><span>{post.authorName}</span></span>
                    <span className="w-1 h-1 bg-current rounded-full" />
                    <span className="flex items-center space-x-1"><Calendar size={12} /><span>{format(post.createdAt.toDate(), 'MMM dd, yyyy')}</span></span>
                  </div>
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-4 leading-none group-hover:text-indigo-600 transition-colors" style={{ color: s.textColor }}>
                    {post.title}
                  </h3>
                  <p className="text-sm font-medium opacity-60 line-clamp-3 mb-8 leading-relaxed">
                    {post.excerpt || post.content.substring(0, 150).replace(/[#*`]/g, '') + '...'}
                  </p>
                  <div className="mt-auto pt-8 border-t border-black/5 flex items-center justify-between">
                    <Link 
                      to={`/blog/${blog.slug}/${post.slug}`}
                      className="flex items-center space-x-3 text-xs font-black uppercase tracking-widest group/btn"
                      style={{ color: s.primaryColor }}
                    >
                      <span>Read Entry</span>
                      <ArrowRight size={14} className="group-hover/btn:translate-x-2 transition-transform" />
                    </Link>
                    <div className="flex items-center space-x-1">
                      {post.tags?.slice(0, 1).map(tag => (
                        <span key={tag} className="px-3 py-1 bg-black/5 rounded-full text-[9px] font-black uppercase">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      {!isWidget && (
        <footer className="p-12 text-center border-t border-black/5 opacity-40">
           <p className="text-[10px] font-black uppercase tracking-[0.2em]">{blog.footerText || `© ${new Date().getFullYear()} ${blog.name}. Powered by Intelligence Engine.`}</p>
        </footer>
      )}
    </div>
  );
};
