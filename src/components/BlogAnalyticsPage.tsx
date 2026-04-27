import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  ChevronLeft,
  ArrowUpRight,
  ArrowDownRight,
  Globe,
  Smartphone,
  Monitor
} from 'lucide-react';
import { motion } from 'motion/react';
import { blogService, Blog, BlogAnalyticsEvent } from '../services/blogService';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format, subDays, isWithinInterval, startOfDay } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  AreaChart,
  Area 
} from 'recharts';

export const BlogAnalyticsPage = () => {
  const { blogId } = useParams<{ blogId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [blog, setBlog] = useState<Blog | null>(null);
  const [events, setEvents] = useState<BlogAnalyticsEvent[]>([]);
  const [timeRange, setTimeRange] = useState(7);

  useEffect(() => {
    if (blogId) {
      loadData();
    }
  }, [blogId]);

  const loadData = async () => {
    try {
      const blogs = await blogService.getBlogs((window as any).userData?.companyId || '');
      const currentBlog = blogs.find(b => b.id === blogId);
      if (currentBlog) {
        setBlog(currentBlog);
        const analyticsData = await blogService.getAnalytics(blogId!);
        setEvents(analyticsData);
      }
    } catch (err) {
      toast.error('Failed to load analytics');
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

  if (!blog) return <div>Blog not found</div>;

  // Process data
  const filteredEvents = events.filter(e => {
    const eventDate = e.createdAt.toDate();
    return eventDate > subDays(new Date(), timeRange);
  });

  const views = filteredEvents.filter(e => e.eventType === 'view');
  const readTimes = filteredEvents.filter(e => e.eventType === 'read_time');
  
  const avgReadTime = readTimes.length > 0 
    ? Math.round(readTimes.reduce((acc, curr) => acc + (curr.value || 0), 0) / readTimes.length) 
    : 0;

  // Chart data: Views per day
  const chartData = Array.from({ length: timeRange }).map((_, i) => {
    const date = subDays(new Date(), timeRange - 1 - i);
    const dayViews = views.filter(e => format(e.createdAt.toDate(), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')).length;
    return {
      date: format(date, 'MMM dd'),
      views: dayViews
    };
  });

  // Traffic sources
  const sources = views.reduce((acc: any, curr) => {
    const src = curr.source || 'direct';
    acc[src] = (acc[src] || 0) + 1;
    return acc;
  }, {});

  const sortedSources = Object.entries(sources)
    .map(([name, value]) => ({ name, value: value as number }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen pb-24 text-white">
      <button 
        onClick={() => navigate('/blogs')}
        className="flex items-center space-x-2 text-slate-500 hover:text-indigo-400 transition-colors mb-8 font-black uppercase tracking-widest text-[10px]"
      >
        <ChevronLeft size={16} />
        <span>Return to Grid</span>
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tight text-white mb-2">Analytics Matrix</h1>
          <p className="text-slate-400 font-medium tracking-wide">Monitoring engagement signals for <span className="text-indigo-400">/{blog.slug}</span></p>
        </div>
        
        <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800">
          {[7, 30].map(days => (
            <button
              key={days}
              onClick={() => setTimeRange(days)}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timeRange === days ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
            >
              Last {days} Days
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 border border-slate-800 rounded-[32px] p-8 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <BarChart3 size={64} className="text-indigo-500" />
          </div>
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Total Impressions</p>
          <div className="flex items-baseline space-x-3">
            <h3 className="text-4xl font-black italic uppercase tracking-tight text-white">{views.length}</h3>
            <span className="text-emerald-500 text-xs font-bold flex items-center"><ArrowUpRight size={14} /> 12%</span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900 border border-slate-800 rounded-[32px] p-8 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Clock size={64} className="text-indigo-500" />
          </div>
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Avg Read Depth</p>
          <div className="flex items-baseline space-x-3">
            <h3 className="text-4xl font-black italic uppercase tracking-tight text-white">{avgReadTime}s</h3>
            <span className="text-emerald-500 text-xs font-bold flex items-center"><ArrowUpRight size={14} /> 8%</span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-900 border border-slate-800 rounded-[32px] p-8 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users size={64} className="text-indigo-500" />
          </div>
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Conversion Vector</p>
          <div className="flex items-baseline space-x-3">
            <h3 className="text-4xl font-black italic uppercase tracking-tight text-white">4.2%</h3>
            <span className="text-rose-500 text-xs font-bold flex items-center"><ArrowDownRight size={14} /> 2%</span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-900 border border-slate-800 rounded-[32px] p-8 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp size={64} className="text-indigo-500" />
          </div>
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Signal Health</p>
          <div className="flex items-baseline space-x-3">
            <h3 className="text-4xl font-black italic uppercase tracking-tight text-white">Optimal</h3>
          </div>
        </motion.div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-[48px] p-10 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 p-8 font-black text-slate-800 italic uppercase tracking-[0.2em] text-4xl pointer-events-none opacity-20">Traffic</div>
           <h2 className="text-xl font-black italic uppercase tracking-tight text-white mb-10 border-l-4 border-indigo-600 pl-4">Transmission Volume</h2>
           
           <div className="h-[400px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={chartData}>
                 <defs>
                   <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                     <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                 <XAxis 
                    dataKey="date" 
                    stroke="#475569" 
                    fontSize={10} 
                    fontWeight="bold" 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: '#475569' }} 
                  />
                 <YAxis 
                    stroke="#475569" 
                    fontSize={10} 
                    fontWeight="bold" 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: '#475569' }}
                  />
                 <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px' }}
                    itemStyle={{ color: '#6366f1', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '10px' }}
                    labelStyle={{ color: '#ffffff', fontWeight: 'black', marginBottom: '4px' }}
                  />
                 <Area type="monotone" dataKey="views" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorViews)" />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-[48px] p-10 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 p-8 font-black text-slate-800 italic uppercase tracking-[0.2em] text-4xl pointer-events-none opacity-20">Origins</div>
           <h2 className="text-xl font-black italic uppercase tracking-tight text-white mb-10 border-l-4 border-indigo-600 pl-4">Node Sources</h2>
           
           <div className="space-y-6">
             {sortedSources.length === 0 ? (
               <div className="py-24 text-center opacity-20 font-black uppercase italic tracking-widest italic">No Data Nodes</div>
             ) : (
               sortedSources.map((source, idx) => (
                 <div key={idx} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex items-center justify-between group hover:border-indigo-500/50 transition-all">
                    <div className="flex items-center space-x-4">
                       <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-indigo-400">
                          <Globe size={18} />
                       </div>
                       <div>
                          <p className="text-xs font-black italic uppercase tracking-tight truncate max-w-[120px]">{source.name}</p>
                          <p className="text-[10px] font-black uppercase text-slate-600 tracking-widest italic">Referral Protocol</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-lg font-black italic uppercase tracking-tight text-white">{source.value}</p>
                       <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Active Hits</p>
                    </div>
                 </div>
               ))
             )}
           </div>
        </div>
      </div>

      {/* Device Analysis & Additional Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="bg-slate-900 border border-slate-800 rounded-[48px] p-10 shadow-2xl">
            <h2 className="text-xl font-black italic uppercase tracking-tight text-white mb-10 border-l-4 border-indigo-600 pl-4">Hardware Profile</h2>
            <div className="flex items-center justify-around h-48">
               <div className="text-center group">
                  <div className="w-20 h-20 bg-slate-950 border border-slate-800 rounded-3xl flex items-center justify-center text-indigo-500 mb-4 group-hover:scale-110 transition-transform shadow-xl">
                     <Monitor size={32} />
                  </div>
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Desktop Matrix</p>
                  <p className="text-xl font-black italic uppercase tracking-tight text-white">64%</p>
               </div>
               <div className="text-center group">
                  <div className="w-20 h-20 bg-slate-950 border border-slate-800 rounded-3xl flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition-transform shadow-xl">
                     <Smartphone size={32} />
                  </div>
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Mobile Array</p>
                  <p className="text-xl font-black italic uppercase tracking-tight text-white">36%</p>
               </div>
            </div>
         </div>

         <div className="bg-slate-900 border border-slate-800 rounded-[48px] p-10 shadow-2xl relative overflow-hidden">
            <h2 className="text-xl font-black italic uppercase tracking-tight text-white mb-10 border-l-4 border-indigo-600 pl-4">Signal Reliability</h2>
            <div className="space-y-8">
               <div>
                  <div className="flex items-center justify-between mb-3">
                     <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Retained Signals</span>
                     <span className="text-[10px] font-black text-indigo-500">82%</span>
                  </div>
                  <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                     <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '82%' }}
                        className="h-full bg-indigo-600 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                     />
                  </div>
               </div>
               <div>
                  <div className="flex items-center justify-between mb-3">
                     <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Buffer Latency (Avg)</span>
                     <span className="text-[10px] font-black text-indigo-400">124ms</span>
                  </div>
                  <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                     <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '25%' }}
                        className="h-full bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.5)]"
                     />
                  </div>
               </div>
               <div>
                  <div className="flex items-center justify-between mb-3">
                     <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Protocol uptime</span>
                     <span className="text-[10px] font-black text-emerald-500">99.98%</span>
                  </div>
                  <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                     <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                     />
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};
