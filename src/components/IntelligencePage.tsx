import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  TrendingUp, 
  Rss, 
  Target, 
  Filter, 
  Search, 
  Plus, 
  Check, 
  ChevronRight, 
  ExternalLink,
  Clock,
  Zap,
  Globe,
  Tag,
  MessageSquare,
  Shield,
  Loader2,
  X
} from 'lucide-react';
import { UserProfile, Company, IntelligencePost } from '../types';
import { getIntelligencePosts, postIntelligence, fetchGlobalIntelligence } from '../services/intelligenceService';
import { conductIntelligenceSearch } from '../services/aiIntelligenceService';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

const TOPICS = [
  'Technology', 'Economy', 'Policy', 'Success Stories', 
  'Compliance', 'Security', 'Health', 'Finance', 'Events'
];

export default function IntelligencePage({ user, company }: { user: UserProfile; company: Company | null }) {
  const [activeTab, setActiveTab] = useState<'internal' | 'global'>('internal');
  const [internalPosts, setInternalPosts] = useState<IntelligencePost[]>([]);
  const [globalSignals, setGlobalSignals] = useState<IntelligencePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(user.interests || []);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(user.role === 'admin' || user.role === 'manager');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<IntelligencePost[]>([]);

  // Add post state
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    topic: 'Policy',
    source: company?.name || 'Company Internal',
    imageUrl: ''
  });

  useEffect(() => {
    setLoading(true);
    const unsub = getIntelligencePosts(user.companyId, 'Internal', (posts) => {
      setInternalPosts(posts);
      if (activeTab === 'internal') setLoading(false);
    });

    return () => unsub();
  }, [user.companyId, activeTab]);

  useEffect(() => {
    const fetchGlobal = async () => {
      if (activeTab === 'global') {
        setLoading(true);
        const signals = await fetchGlobalIntelligence(selectedInterests) as IntelligencePost[];
        setGlobalSignals(signals);
        setLoading(false);
      }
    };
    fetchGlobal();
  }, [activeTab, selectedInterests]);

  const handleUpdateInterests = async () => {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        interests: selectedInterests
      });
      setShowInterestModal(false);
      toast.success('Intelligence preferences updated.');
    } catch (error) {
      toast.error('Failed to update preferences.');
    }
  };

  const handlePostNews = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await postIntelligence({
        ...newPost,
        type: 'Internal',
        companyId: user.companyId,
        authorId: user.uid,
        relevance: 100
      });
      setShowAddModal(false);
      setNewPost({ title: '', content: '', topic: 'Policy', source: company?.name || 'Company', imageUrl: '' });
      toast.success('Internal directive published.');
    } catch (error) {
      toast.error('Failed to publish news.');
    }
  };

  const toggleInterest = (topic: string) => {
    setSelectedInterests(prev => 
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setLoading(true);
    try {
      const results = await conductIntelligenceSearch(searchQuery);
      setSearchResults(results);
      setActiveTab('global'); // Switch to global to show results
      toast.success(`Retrieved ${results.length} real-time signals.`);
    } catch (error) {
      toast.error('Failed to retrieve real-time intelligence.');
    } finally {
      setIsSearching(false);
      setLoading(false);
    }
  };

  const safeDate = (dateVal: any) => {
    if (!dateVal) return new Date();
    if (typeof dateVal.toDate === 'function') return dateVal.toDate();
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 p-3 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-500/20 dark:shadow-none">
              <Sparkles size={24} className="animate-pulse" />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black font-display italic tracking-tighter text-slate-950 dark:text-white leading-none">
              Intelligence Hub
            </h1>
          </div>
          <p className="text-slate-500 dark:text-dark-text-muted font-medium flex items-center space-x-2 text-sm sm:text-base">
            <Globe size={16} className="text-brand-primary" />
            <span>Market-shifting signals and internal directives.</span>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:flex items-center gap-4 w-full xl:w-auto">
          <form onSubmit={handleSearch} className="relative w-full xl:w-80 sm:col-span-2 xl:col-span-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search global intelligence..."
              className="w-full pl-12 pr-4 py-4 bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border text-slate-900 dark:text-white rounded-[24px] font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
            />
            {isSearching && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-600 animate-spin" size={18} />
            )}
          </form>

          <button 
            onClick={() => setShowInterestModal(true)}
            className="w-full xl:w-auto px-6 py-4 bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border text-slate-900 dark:text-white rounded-[24px] font-black text-xs uppercase tracking-widest flex items-center justify-center space-x-2 hover:shadow-xl hover:shadow-slate-200 transition-all active:scale-95 shadow-sm"
          >
            <Filter size={18} className="text-brand-primary" />
            <span>Personalize Feed</span>
          </button>
          
          {isAdmin && (
            <button 
              onClick={() => setShowAddModal(true)}
              className="w-full xl:w-auto px-6 py-4 bg-slate-950 dark:bg-indigo-600 text-white rounded-[24px] font-black text-xs uppercase tracking-widest flex items-center justify-center space-x-2 hover:bg-slate-900 dark:hover:bg-indigo-700 transition-all shadow-xl shadow-slate-200 dark:shadow-none active:scale-95"
            >
              <Plus size={18} />
              <span>Broadcast News</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center p-1.5 bg-slate-100/50 dark:bg-dark-bg/50 rounded-[28px] border border-slate-200/50 dark:border-dark-border w-full sm:w-fit overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('internal')}
          className={`flex-1 sm:flex-none px-6 sm:px-10 py-4 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest flex items-center justify-center space-x-2 transition-all whitespace-nowrap ${
            activeTab === 'internal' ? 'bg-white dark:bg-dark-surface text-brand-primary shadow-xl shadow-indigo-500/10 dark:shadow-none' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <Rss size={16} />
          <span>Internal Directives</span>
        </button>
        <button
          onClick={() => setActiveTab('global')}
          className={`flex-1 sm:flex-none px-6 sm:px-10 py-4 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest flex items-center justify-center space-x-2 transition-all whitespace-nowrap ${
            activeTab === 'global' ? 'bg-white dark:bg-dark-surface text-brand-primary shadow-xl shadow-indigo-500/10 dark:shadow-none' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <Globe size={16} />
          <span>Global Signals</span>
        </button>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-8">
          {loading ? (
            <div className="py-40 flex flex-col items-center justify-center space-y-4">
              <Loader2 size={48} className="animate-spin text-brand-primary opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{isSearching ? 'Scouring Global Networks...' : 'Synthesizing Signals...'}</p>
            </div>
          ) : (activeTab === 'internal' ? internalPosts : (searchResults.length > 0 && activeTab === 'global' ? searchResults : globalSignals)).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
              {searchResults.length > 0 && activeTab === 'global' && (
                <div className="flex items-center justify-between px-8 py-4 bg-indigo-50 dark:bg-indigo-500/5 rounded-3xl border border-indigo-100 dark:border-indigo-500/20">
                  <div className="flex items-center space-x-3">
                    <Zap size={16} className="text-indigo-600" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Real-Time Search Results for "{searchQuery}"</span>
                  </div>
                  <button 
                    onClick={() => {
                      setSearchResults([]);
                      setSearchQuery('');
                    }}
                    className="text-[10px] font-black uppercase text-indigo-600 hover:underline"
                  >
                    Clear Results
                  </button>
                </div>
              )}
              {(activeTab === 'internal' ? internalPosts : (searchResults.length > 0 && activeTab === 'global' ? searchResults : globalSignals)).map((post, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={post.id}
                  className="group bg-white dark:bg-dark-surface rounded-[40px] border border-slate-100 dark:border-dark-border overflow-hidden hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-500 flex flex-col md:flex-row h-full md:max-h-[300px]"
                >
                  {post.imageUrl && (
                    <div className="md:w-1/3 overflow-hidden relative">
                      <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      <div className="absolute top-6 left-6 px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-xl text-[10px] font-black uppercase text-brand-primary border border-white">
                        {post.topic}
                      </div>
                    </div>
                  )}
                  <div className={`p-8 flex-1 flex flex-col justify-between ${!post.imageUrl ? 'md:w-full' : ''}`}>
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center space-x-2">
                            <span>{post.source}</span>
                            <span className="w-1 h-1 bg-slate-200 rounded-full" />
                            <span>{formatDistanceToNow(safeDate(post.createdAt))} ago</span>
                          </p>
                          <h3 className="text-2xl font-black font-display tracking-tight text-slate-900 dark:text-white leading-tight group-hover:text-brand-primary transition-colors italic">
                            {post.title}
                          </h3>
                        </div>
                        {post.relevance && post.relevance > 90 && (
                          <div className="p-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 rounded-full animate-pulse">
                            <Zap size={16} />
                          </div>
                        )}
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-3 leading-relaxed">
                        {post.content}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between pt-6 border-t border-slate-50 dark:border-dark-border">
                      <div className="flex -space-x-2">
                        {[1,2,3].map(i => (
                          <div key={i} className="w-6 h-6 rounded-full border-2 border-white dark:border-dark-surface bg-slate-100 flex items-center justify-center text-[8px] font-bold">
                            U{i}
                          </div>
                        ))}
                        <div className="pl-4 text-[10px] font-bold text-slate-400">12 others read this</div>
                      </div>
                      
                      {post.link && post.link !== '#' ? (
                        <a 
                          href={post.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-[0.2em] text-brand-primary hover:translate-x-1 transition-transform"
                        >
                          <span>Intelligence Report</span>
                          <ExternalLink size={12} />
                        </a>
                      ) : (
                        <button className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-[0.2em] text-brand-primary hover:translate-x-1 transition-transform">
                          <span>Read More</span>
                          <ChevronRight size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="py-40 text-center space-y-6 bg-slate-50 dark:bg-dark-bg/20 rounded-[40px] border-2 border-dashed border-slate-200 dark:border-dark-border">
              <div className="w-20 h-20 bg-white dark:bg-dark-surface rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                <Target size={40} className="text-slate-200" />
              </div>
              <div>
                <p className="text-lg font-black text-slate-900 dark:text-white">No signals matching your profile.</p>
                <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">Try updating your interest filters to uncover hidden intelligence.</p>
              </div>
              <button 
                onClick={() => setShowInterestModal(true)}
                className="saas-button-primary px-8"
              >
                Refine Interests
              </button>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-8">
          {/* Trending Signals */}
          <div className="bg-slate-950 p-8 rounded-[40px] text-white space-y-6 shadow-2xl shadow-indigo-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp size={20} className="text-blue-400" />
                <h3 className="text-xl font-black italic">Trending Signals</h3>
              </div>
              <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping" />
            </div>
            
            <div className="space-y-6">
              {[
                { title: 'Market Cap volatility in SaaS', change: '+12%', topic: 'Finance' },
                { title: 'EU Data Sovereignty Law', change: 'Major', topic: 'Compliance' },
                { title: 'Remote Work Tax Relief', change: 'New', topic: 'Policy' }
              ].map((item, idx) => (
                <div key={idx} className="group cursor-pointer">
                  <div className="flex justify-between items-start">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.topic}</p>
                    <span className="text-[10px] font-bold text-blue-400">{item.change}</span>
                  </div>
                  <h4 className="mt-1 font-bold group-hover:text-blue-400 transition-colors">{item.title}</h4>
                </div>
              ))}
            </div>
            
            <button className="w-full py-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest transition-all">
              Comprehensive Analysis
            </button>
          </div>

          {/* Quick Topics */}
          <div className="bg-white dark:bg-dark-surface p-8 rounded-[40px] border border-slate-100 dark:border-dark-border space-y-6">
             <div className="flex flex-wrap gap-2">
                {['AI Industry News', 'Competitor Trends', 'Market Analysis', 'Regulatory Updates'].map(query => (
                  <button 
                    key={query}
                    onClick={() => {
                      setSearchQuery(query);
                      const event = { preventDefault: () => {} } as React.FormEvent;
                      handleSearch(event);
                    }}
                    className="px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all"
                  >
                    {query}
                  </button>
                ))}
             </div>

             <div className="flex items-center space-x-2 pt-4 border-t border-slate-50 dark:border-dark-border">
                <Tag size={20} className="text-brand-primary" />
                <h3 className="text-xl font-black text-slate-900 dark:text-white italic">Intelligence Map</h3>
             </div>
             
             <div className="flex flex-wrap gap-2">
                {TOPICS.slice(0, 8).map(topic => (
                  <button 
                    key={topic}
                    onClick={() => toggleInterest(topic)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      selectedInterests.includes(topic) ? 'bg-brand-primary text-white' : 'bg-slate-50 dark:bg-dark-bg text-slate-400'
                    }`}
                  >
                    {topic}
                  </button>
                ))}
             </div>
          </div>
        </div>
      </div>

      {/* Interest Selector Modal */}
      <AnimatePresence>
        {showInterestModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInterestModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white dark:bg-dark-surface w-full max-w-2xl rounded-[40px] sm:rounded-[48px] shadow-2xl border border-slate-100 dark:border-dark-border overflow-hidden"
            >
              <div className="p-6 sm:p-10 text-center space-y-6 sm:space-y-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
                 <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-50 dark:bg-indigo-500/10 rounded-[24px] sm:rounded-[32px] flex items-center justify-center mx-auto text-indigo-600">
                    <Target size={32} className="sm:w-10 sm:h-10" />
                 </div>
                 
                 <div className="space-y-2">
                    <h2 className="text-2xl sm:text-3xl font-black font-display italic tracking-tight text-slate-950 dark:text-white leading-tight">Curate your Feed</h2>
                    <p className="text-slate-400 font-medium text-sm">Select common market patterns to prioritize in your global signal stream.</p>
                 </div>

                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                    {TOPICS.map(topic => {
                      const isSelected = selectedInterests.includes(topic);
                      return (
                        <button
                          key={topic}
                          onClick={() => toggleInterest(topic)}
                          className={`p-3 sm:p-4 rounded-2xl sm:rounded-3xl border-2 transition-all flex flex-col items-center space-y-2 ${
                            isSelected 
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-200 dark:shadow-none' 
                              : 'bg-slate-50 dark:bg-dark-bg border-transparent text-slate-400 hover:border-slate-200 dark:hover:border-dark-border'
                          }`}
                        >
                          <Check size={14} className={isSelected ? 'opacity-100' : 'opacity-0'} />
                          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">{topic}</span>
                        </button>
                      );
                    })}
                 </div>

                 <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 pt-4">
                    <button 
                      onClick={() => setShowInterestModal(false)}
                      className="w-full sm:flex-1 py-4 sm:py-5 rounded-2xl sm:rounded-3xl font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-dark-bg transition-colors text-xs"
                    >
                      Dismiss
                    </button>
                    <button 
                      onClick={handleUpdateInterests}
                      className="w-full sm:flex-2 py-4 sm:py-5 bg-slate-950 dark:bg-indigo-600 text-white rounded-2xl sm:rounded-3xl font-black uppercase tracking-widest hover:bg-slate-900 dark:hover:bg-indigo-700 shadow-xl shadow-slate-200 dark:shadow-none transition-all text-xs"
                    >
                      Update Configuration
                    </button>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Broadcast News Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setShowAddModal(false)}
               className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" 
             />
             <motion.div
               initial={{ opacity: 0, y: 50, scale: 0.95 }}
               animate={{ opacity: 1, y: 0, scale: 1 }}
               exit={{ opacity: 0, y: 50, scale: 0.95 }}
               className="relative bg-white dark:bg-dark-surface w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden"
             >
                <form onSubmit={handlePostNews} className="p-6 sm:p-10 space-y-6 sm:space-y-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
                   <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                         <div className="p-2 sm:p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl text-indigo-600">
                           <Rss size={20} className="sm:w-6 sm:h-6" />
                         </div>
                         <h2 className="text-xl sm:text-2xl font-black font-display italic text-slate-900 dark:text-white uppercase tracking-tight">Internal Broadcast</h2>
                      </div>
                      <button type="button" onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-50 dark:hover:bg-dark-bg rounded-xl text-slate-400">
                        <X size={20} />
                      </button>
                   </div>

                   <div className="space-y-4 sm:space-y-6">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">Directive Headline</label>
                         <input 
                           value={newPost.title}
                           onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                           required
                           className="w-full p-4 sm:p-5 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-[24px] outline-none focus:ring-4 focus:ring-brand-primary/10 text-sm font-bold italic"
                           placeholder="Enter compelling headline..."
                         />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">Primary Topic</label>
                          <select 
                            value={newPost.topic}
                            onChange={(e) => setNewPost({...newPost, topic: e.target.value})}
                            className="w-full p-4 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-2xl outline-none text-[10px] font-black uppercase tracking-widest appearance-none"
                          >
                            {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">Visual Asset URL</label>
                          <input 
                            value={newPost.imageUrl}
                            onChange={(e) => setNewPost({...newPost, imageUrl: e.target.value})}
                            className="w-full p-4 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-2xl outline-none text-[10px] font-bold"
                            placeholder="https://..."
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">Transmission Content</label>
                         <textarea 
                           value={newPost.content}
                           onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                           required
                           rows={4}
                           className="w-full p-4 sm:p-5 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-[24px] outline-none focus:ring-4 focus:ring-brand-primary/10 text-xs font-medium leading-relaxed"
                           placeholder="Synthesizing directives..."
                         />
                      </div>
                   </div>

                   <button 
                     type="submit"
                     className="w-full bg-slate-950 dark:bg-indigo-600 text-white py-5 sm:py-6 rounded-[24px] font-black text-xs uppercase tracking-[0.3em] hover:bg-brand-primary dark:hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 dark:shadow-none active:scale-95"
                   >
                     Initialize Broadcast
                   </button>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
