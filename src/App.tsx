import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signOut, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, onSnapshot, addDoc, getDocs, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { handleFirestoreError, OperationType } from './lib/firestore';
import { UserProfile, Company, Invite, Lead, Task, AccessRequest, UserRole } from './types';
import { 
  LayoutDashboard, 
  Users, 
  MessageSquare, 
  Settings, 
  LogOut, 
  Plus, 
  Search, 
  Filter, 
  Menu, 
  X, 
  CheckSquare, 
  CheckCircle,
  Bell, 
  AlertCircle, 
  Clock,
  Calendar,
  Download, 
  Mail, 
  Lock, 
  User as UserIcon, 
  ArrowRight, 
  ShieldCheck, 
  ShieldAlert, 
  Globe, 
  Copy,
  BarChart as BarChartIcon,
  RefreshCcw,
  ChevronDown,
  Building2,
  Link as LinkIcon,
  Wallet,
  Shield,
  Briefcase
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { format, isPast, isToday, isBefore, addDays, parseISO } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ReChartsTooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';

import EmployeesPage from './components/EmployeesPage';
import PayrollPage from './components/PayrollPage';
import LeadForm from './components/LeadForm';
import TasksPage from './components/TasksPage';
import SettingsPage from './components/SettingsPage';
import ProfilePage from './components/ProfilePage';

// Helper to generate member ID
const generateMemberId = (companyName: string = 'NEX') => {
  const prefix = companyName.substring(0, 3).toUpperCase().padEnd(3, 'X');
  const timestamp = Date.now().toString().slice(-4);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${timestamp}${random}`;
};

// --- Components ---

const Sidebar = ({ user, isOpen, setIsOpen }: { user: UserProfile; isOpen: boolean; setIsOpen: (val: boolean) => void }) => {
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Leads', path: '/leads', icon: MessageSquare },
    { name: 'Tasks', path: '/tasks', icon: CheckSquare },
    { name: 'Profile', path: '/profile', icon: UserIcon },
    { name: 'Settings', path: '/settings', icon: Settings, roles: ['admin', 'manager'] },
  ];

  const trackingItems = [
    { name: 'Employees', path: '/employees', icon: Users },
    { name: 'Payroll', path: '/payroll', icon: Wallet, roles: ['admin'] },
  ];

  const filteredNavItems = navItems.filter(item => !item.roles || item.roles.includes(user.role));
  const filteredTrackingItems = trackingItems.filter(item => !item.roles || item.roles.includes(user.role));
  const location = useLocation();

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={`w-80 lg:w-[380px] bg-slate-950 text-white h-screen fixed left-0 top-0 flex flex-col z-50 transition-all duration-500 ease-in-out transform ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Visual Brand Layer */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <img 
            src="https://picsum.photos/seed/crm-bg/800/1200?blur=10" 
            alt="" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950/80 to-slate-950" />
        </div>

        <div className="relative flex flex-col h-full z-10">
          <div className="p-8 border-b border-white/5 flex items-center justify-between">
            <h1 className="text-3xl font-black font-display tracking-tight flex items-center space-x-2">
              <span className="bg-gradient-to-tr from-blue-500 to-indigo-400 bg-clip-text text-transparent italic">Nex</span>
              <span>voura</span>
            </h1>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-2 text-white/40 hover:text-white rounded-xl hover:bg-white/5 lg:hidden transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="px-8 pt-8">
             <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/5 border border-white/5 rounded-3xl p-6 mb-8 overflow-hidden relative group">
                <div className="relative z-10">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-2">Modern CRM Solution</p>
                  <h3 className="text-xl font-bold font-display leading-tight mb-2">Empower your sales with AI.</h3>
                  <div className="flex -space-x-2 mt-4">
                    {[1,2,3].map(i => (
                      <img 
                        key={i}
                        src={`https://picsum.photos/seed/user${i}/40/40`} 
                        className="w-8 h-8 rounded-full border-2 border-slate-950 object-cover"
                        referrerPolicy="no-referrer"
                        alt="User"
                      />
                    ))}
                    <div className="w-8 h-8 rounded-full border-2 border-slate-950 bg-blue-600 flex items-center justify-center text-[10px] font-bold">+12</div>
                  </div>
                </div>
                <Globe className="absolute -bottom-4 -right-4 w-24 h-24 text-blue-500/10 group-hover:scale-110 transition-transform duration-700" />
             </div>
          </div>

          <nav className="flex-1 px-4 space-y-8 overflow-y-auto custom-scrollbar">
            <div className="space-y-1">
              {filteredNavItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center space-x-4 p-4 rounded-2xl transition-all group relative overflow-hidden ${
                      isActive 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                        : 'text-slate-500 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <item.icon size={20} className={`${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
                    <span className={`font-bold tracking-tight ${isActive ? '' : 'group-hover:translate-x-1'} transition-transform duration-300`}>
                      {item.name}
                    </span>
                    {isActive && (
                      <motion.div 
                        layoutId="activeTabIndicator"
                        className="absolute left-0 top-0 bottom-0 w-1 bg-white"
                      />
                    )}
                  </Link>
                );
              })}
            </div>

            <div className="space-y-4">
              <p className="px-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">What You Should Track</p>
              <div className="space-y-1">
                {filteredTrackingItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center space-x-4 p-4 rounded-2xl transition-all group relative overflow-hidden ${
                        isActive 
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                          : 'text-slate-500 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <item.icon size={20} className={`${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
                      <span className={`font-bold tracking-tight ${isActive ? '' : 'group-hover:translate-x-1'} transition-transform duration-300`}>
                        {item.name}
                      </span>
                      {isActive && (
                        <motion.div 
                          layoutId="activeTabIndicatorTrack"
                          className="absolute left-0 top-0 bottom-0 w-1 bg-white"
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>

          <div className="p-6 border-t border-white/5 space-y-4">
            <div className="flex items-center space-x-4 p-3 bg-white/5 rounded-2xl border border-white/5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-black text-white shadow-xl shadow-blue-500/10 overflow-hidden shrink-0">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  user.name[0]
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate leading-tight">{user.name}</p>
                <p className="text-[10px] font-black text-blue-400/80 uppercase tracking-widest mt-1">{user.role}</p>
              </div>
              <button 
                onClick={() => signOut(auth)}
                className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                title="Sign Out"
              >
                <LogOut size={18} />
              </button>
            </div>
            
            {user.role !== 'admin' && (
              <button
                onClick={async () => {
                  /* Request Access Logic */
                }}
                className="w-full py-3 bg-white/5 border border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5 text-slate-400 hover:text-blue-400 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Request Elevated Access
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

const NotificationCenter = ({ user }: { user: UserProfile }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'tasks'),
      where('companyId', '==', user.companyId),
      where('status', '!=', 'Done')
    );
    return onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    });
  }, [user.companyId]);

  const reminders = tasks.filter(task => {
    if (!task.dueDate) return false;
    const due = parseISO(task.dueDate);
    // Overdue or due within 24 hours
    return isPast(due) || isBefore(due, addDays(new Date(), 1));
  }).sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime());

  const overdueCount = reminders.filter(t => isPast(parseISO(t.dueDate)) && !isToday(parseISO(t.dueDate))).length;
  const dueSoonCount = reminders.length - overdueCount;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-all relative"
      >
        <Bell size={20} />
        {reminders.length > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
            {reminders.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">Task Reminders</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {reminders.length} Pending
                </span>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {reminders.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <CheckSquare size={32} className="mx-auto mb-2 opacity-20" />
                    <p className="text-sm">All caught up!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {reminders.map((task) => {
                      const isOverdue = isPast(parseISO(task.dueDate)) && !isToday(parseISO(task.dueDate));
                      return (
                        <div key={task.id} className="p-4 hover:bg-slate-50 transition-colors">
                          <div className="flex items-start space-x-3">
                            <div className={`mt-1 p-1.5 rounded-lg ${isOverdue ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                              {isOverdue ? <AlertCircle size={14} /> : <Clock size={14} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-900 truncate">{task.title}</p>
                              <p className={`text-[10px] font-bold uppercase ${isOverdue ? 'text-rose-500' : 'text-amber-500'}`}>
                                {isOverdue ? 'Overdue' : 'Due Soon'} • {format(parseISO(task.dueDate), 'MMM d, yyyy')}
                              </p>
                              <Link 
                                to="/tasks" 
                                onClick={() => setIsOpen(false)}
                                className="text-[10px] text-blue-600 font-bold hover:underline mt-1 inline-block"
                              >
                                View Task
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const Header = ({ user, company, onToggleSidebar }: { user: UserProfile; company: Company | null; onToggleSidebar: () => void }) => (
  <header className="h-20 flex items-center justify-between px-8 bg-brand-surface border-b border-slate-100">
    <div className="flex items-center space-x-4">
      <button 
        onClick={onToggleSidebar}
        className="p-2.5 text-slate-600 hover:bg-slate-200/50 rounded-xl lg:hidden transition-all"
      >
        <Menu size={24} />
      </button>
      <div>
        <h2 className="text-xl font-bold font-display text-slate-900 tracking-tight">
          {company?.name || 'Nexvoura CRM'}
        </h2>
        <div className="flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {user.role.replace('_', ' ')} Portal
          </p>
        </div>
      </div>
    </div>
    <div className="flex items-center space-x-6">
      <div className="hidden md:flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5">
        <Search size={16} className="text-slate-400 mr-2" />
        <input 
          type="text" 
          placeholder="Global search..." 
          className="bg-transparent border-none outline-none text-xs w-48 font-medium" 
        />
      </div>
      <NotificationCenter user={user} />
      <div className="w-px h-6 bg-slate-200" />
      <Link to="/profile" className="flex items-center space-x-3 group">
        <div className="text-right hidden sm:block">
          <p className="text-xs font-bold text-slate-900 leading-none group-hover:text-blue-600 transition-colors uppercase tracking-tight">{user.name}</p>
          <p className="text-[10px] font-medium text-slate-400 lowercase">@{user.name.split(' ')[0].toLowerCase()}</p>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 p-0.5 shadow-sm group-hover:border-blue-400 transition-all">
          <div className="w-full h-full rounded-[14px] bg-slate-100 flex items-center justify-center overflow-hidden">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="font-bold text-slate-500 uppercase">{user.name[0]}</span>
            )}
          </div>
        </div>
      </Link>
    </div>
  </header>
);

// --- Pages ---

const Dashboard = ({ user }: { user: UserProfile }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, new: 0, converted: 0 });
  const [reminders, setReminders] = useState<Task[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    let leadsQ = query(collection(db, 'leads'), where('companyId', '==', user.companyId));
    let tasksQ = query(
      collection(db, 'tasks'),
      where('companyId', '==', user.companyId),
      where('status', '!=', 'Done')
    );

    // Sales can only see their own assignments
    if (user.role === 'sales') {
      leadsQ = query(
        collection(db, 'leads'), 
        where('companyId', '==', user.companyId),
        where('assignedTo', '==', user.uid)
      );
      tasksQ = query(
        collection(db, 'tasks'),
        where('companyId', '==', user.companyId),
        where('assignedTo', '==', user.uid),
        where('status', '!=', 'Done')
      );
    }

    const unsubLeads = onSnapshot(leadsQ, (snapshot) => {
      const leadsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
      setLeads(leadsData);
      setStats({
        total: leadsData.length,
        new: leadsData.filter(l => l.status === 'New').length,
        converted: leadsData.filter(l => l.status === 'Converted').length
      });
    });

    const unsubTasks = onSnapshot(tasksQ, (snapshot) => {
      const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      const filtered = tasks.filter(task => {
        if (!task.dueDate) return false;
        const due = parseISO(task.dueDate);
        return isPast(due) || isBefore(due, addDays(new Date(), 1));
      }).sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime());
      setReminders(filtered);
    });

    return () => {
      unsubLeads();
      unsubTasks();
    };
  }, [user.companyId]);

  const services = ['WordPress', 'Shopify', 'Custom Development'];
  const analyticsData = services.map(service => ({
    name: service,
    value: leads.filter(l => l.service === service).length
  }));

  const statusData = [
    { name: 'New', value: stats.new, color: '#3b82f6' },
    { name: 'Contacted', value: leads.filter(l => l.status === 'Contacted').length, color: '#f59e0b' },
    { name: 'Converted', value: stats.converted, color: '#10b981' },
  ];

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899'];

  return (
    <div className="flex flex-col lg:flex-row gap-12 min-h-screen relative pb-28 animate-in fade-in duration-700">
      {/* Sidebar Intel */}
      <div className="w-full lg:w-1/4 space-y-8 shrink-0">
        <div className="relative group">
           <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/5 to-indigo-600/5 rounded-[40px] blur-2xl group-hover:blur-3xl transition-all duration-700 opacity-0 group-hover:opacity-100" />
           <div className="relative bg-white border border-slate-100 p-8 rounded-[40px] shadow-sm overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-bl-[80px] -z-10" />
              <div className="w-16 h-16 bg-slate-950 text-white rounded-[24px] flex items-center justify-center mb-6 shadow-xl shadow-slate-200">
                <LayoutDashboard size={32} className="text-blue-500" />
              </div>
              <h1 className="text-4xl font-black text-slate-950 tracking-tighter leading-[0.9] font-display mb-4 italic">
                System <br /><span className="text-blue-600 italic">Pulse.</span>
              </h1>
              <p className="text-slate-500 font-medium text-sm leading-relaxed mb-8 opacity-80">
                Nexus Engine is monitoring <b>{stats.total}</b> global leads with high-fidelity analytics.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                   <div className="flex items-center space-x-3">
                      <Clock size={16} className="text-blue-600" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Uptime</span>
                   </div>
                   <span className="text-xs font-black text-slate-900">99.9%</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                   <div className="flex items-center space-x-3">
                      <CheckCircle size={16} className="text-emerald-600" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Health</span>
                   </div>
                   <span className="text-xs font-black text-emerald-600">Optimal</span>
                </div>
              </div>
           </div>
        </div>

        <div className="bg-slate-950 rounded-[40px] p-8 text-white relative overflow-hidden group shadow-xl shadow-slate-900/20">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <BarChartIcon size={120} />
           </div>
           <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-4 px-1">Agency Performance</p>
           <h3 className="text-2xl font-bold font-display leading-tight mb-6 text-white">Nexvoura <br />Intelligence</h3>
           <p className="text-xs text-slate-400 font-medium italic leading-relaxed">Leverage data-driven decision making to accelerate your agency's pipeline and conversion velocity.</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 space-y-10 min-w-0">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
               <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
               <span>Nexus Live Stats</span>
            </div>
            <h2 className="text-5xl font-black font-display text-slate-950 tracking-tighter leading-tight italic">
              Global Overview
            </h2>
          </div>
          <div className="flex items-center space-x-3 text-sm font-bold text-slate-600 bg-white px-5 py-4 rounded-[24px] border border-slate-100 shadow-xl shadow-slate-200/20">
            <Calendar size={18} className="text-blue-500" />
            <span className="font-display tracking-tight text-slate-900">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { label: 'Total Leads', value: stats.total, color: 'bg-blue-600', icon: MessageSquare, textColor: 'text-blue-600', labelColor: 'bg-blue-50' },
            { label: 'New Leads', value: stats.new, color: 'bg-emerald-600', icon: Clock, textColor: 'text-emerald-600', labelColor: 'bg-emerald-50' },
            { label: 'Converted', value: stats.converted, color: 'bg-indigo-600', icon: CheckCircle, textColor: 'text-indigo-600', labelColor: 'bg-indigo-50' },
          ].map((stat, i) => (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              key={stat.label}
              className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 group hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`w-14 h-14 rounded-2xl ${stat.color} bg-opacity-10 ${stat.textColor} flex items-center justify-center group-hover:rotate-12 transition-transform`}>
                  <stat.icon size={26} />
                </div>
                <div className={`px-3 py-1 rounded-full ${stat.labelColor} ${stat.textColor} text-[9px] font-black uppercase tracking-widest`}>
                  Analytics
                </div>
              </div>
              <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mb-1">{stat.label}</p>
              <h3 className="text-5xl font-black font-display text-slate-950 tracking-tighter leading-none italic">{stat.value}</h3>
              
              <div className={`absolute bottom-0 left-0 h-1.5 transition-all duration-700 ${stat.color} w-0 group-hover:w-full opacity-60`} />
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Charts Section */}
          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/20">
             <div className="flex justify-between items-center mb-10">
               <div>
                 <h3 className="text-xl font-black text-slate-950 font-display italic">Lead Segment Map</h3>
                 <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">Cross-Platform Distribution</p>
               </div>
               <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                 <BarChartIcon size={20} />
               </div>
             </div>
             <div className="h-[280px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={analyticsData}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                   <XAxis dataKey="name" fontSize={10} fontWeight={800} axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                   <YAxis axisLine={false} tickLine={false} fontSize={10} fontWeight={800} tick={{fill: '#94a3b8'}} />
                   <ReChartsTooltip 
                      cursor={{fill: '#f8fafc', radius: 10}}
                      contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '16px' }}
                   />
                   <Bar dataKey="value" radius={[12, 12, 0, 0]} barSize={40}>
                      {analyticsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.8} />
                      ))}
                   </Bar>
                 </BarChart>
               </ResponsiveContainer>
             </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/20">
             <div className="flex justify-between items-center mb-10">
               <div>
                 <h3 className="text-xl font-black text-slate-950 font-display italic">Lead Lifecycle</h3>
                 <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">Pipeline Stage Analysis</p>
               </div>
               <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                 <RefreshCcw size={20} />
               </div>
             </div>
             <div className="h-[280px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={statusData}
                     cx="50%"
                     cy="50%"
                     innerRadius={65}
                     outerRadius={90}
                     paddingAngle={10}
                     dataKey="value"
                     stroke="none"
                   >
                     {statusData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                     ))}
                   </Pie>
                   <ReChartsTooltip 
                      contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '16px' }}
                   />
                   <Legend 
                     verticalAlign="bottom" 
                     height={40} 
                     iconType="circle"
                     formatter={(value) => <span className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">{value}</span>}
                   />
                 </PieChart>
               </ResponsiveContainer>
             </div>
          </div>

          <div className="bg-white p-10 rounded-[40px] shadow-xl shadow-slate-200/20 border border-slate-100">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-950 font-display italic">Operations Alert</h3>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">Critical Time-Sensitive Tasks</p>
              </div>
              {reminders.length > 0 && (
                <div className="flex items-center space-x-2 bg-rose-50 text-rose-600 px-4 py-2 rounded-full border border-rose-100">
                  <AlertCircle size={14} className="animate-bounce" />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {reminders.length} High Priority
                  </span>
                </div>
              )}
            </div>
            
            {reminders.length > 0 ? (
              <div className="space-y-4">
                {reminders.map((task, i) => {
                  const isOverdue = isPast(parseISO(task.dueDate)) && !isToday(parseISO(task.dueDate));
                  return (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      key={task.id} 
                      className="group flex items-center justify-between p-5 bg-slate-50/50 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 rounded-3xl border border-transparent hover:border-slate-100 transition-all duration-300"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isOverdue ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                          {isOverdue ? <AlertCircle size={20} /> : <Clock size={20} />}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-950 leading-tight group-hover:text-blue-600 transition-colors uppercase tracking-tight">{task.title}</p>
                          <div className="flex items-center space-x-2 mt-1">
                             <div className={`text-[9px] font-black uppercase tracking-widest ${isOverdue ? 'text-rose-500' : 'text-amber-500'}`}>
                                {isOverdue ? 'Overdue Protocol' : 'Upcoming Directive'} 
                             </div>
                             <span className="text-slate-300 text-[10px]">•</span>
                             <p className="text-[10px] font-bold text-slate-400 uppercase">
                               {format(parseISO(task.dueDate), 'MMM d, yyyy')}
                             </p>
                          </div>
                        </div>
                      </div>
                      <Link 
                        to="/tasks" 
                        className="w-10 h-10 flex items-center justify-center bg-white rounded-xl border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-100 hover:shadow-lg transition-all"
                      >
                        <ArrowRight size={18} />
                      </Link>
                    </motion.div>
                  );
                })}
                <Link 
                  to="/tasks" 
                  className="w-full flex items-center justify-center p-4 border-2 border-dashed border-slate-100 rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-100 transition-all"
                >
                  Enter Nexus Workspace
                </Link>
              </div>
            ) : (
              <div className="text-center py-20 bg-slate-50/50 rounded-[40px] border border-dashed border-slate-100">
                <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-sm">
                  <CheckSquare size={32} className="text-slate-200" />
                </div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest italic">All Operations Synchronized</p>
              </div>
            )}
          </div>
          
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[40px] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
            <div className="relative bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 h-full flex flex-col justify-center">
              <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-blue-500/20 text-white">
                <Globe size={32} />
              </div>
              <h4 className="text-2xl font-black font-display text-slate-950 italic mb-4">Neural Network Integration</h4>
              <p className="text-slate-500 font-medium text-sm leading-relaxed mb-8 opacity-80">Your Nexvoura workspace is connected to the Nexus Neural Link for automated directive optimization.</p>
              <button 
                onClick={() => navigate('/tasks')}
                className="group flex items-center justify-between bg-slate-950 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all"
              >
                <span>Synchronize Commands</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LeadsPage = ({ user }: { user: UserProfile }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [team, setTeam] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [serviceFilter, setServiceFilter] = useState('All');
  const [newLead, setNewLead] = useState({ 
    name: '', 
    email: '', 
    phone: '',
    message: '',
    service: 'WordPress' as any 
  });

  useEffect(() => {
    let leadsQ = query(collection(db, 'leads'), where('companyId', '==', user.companyId));
    const teamQ = query(collection(db, 'users'), where('companyId', '==', user.companyId));

    if (user.role === 'sales') {
      leadsQ = query(
        collection(db, 'leads'), 
        where('companyId', '==', user.companyId),
        where('assignedTo', '==', user.uid)
      );
    }

    const unsubLeads = onSnapshot(leadsQ, (snapshot) => {
      setLeads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead)));
      setLoading(false);
    });

    const unsubTeam = onSnapshot(teamQ, (snapshot) => {
      setTeam(snapshot.docs.map(doc => doc.data() as UserProfile));
    });

    return () => {
      unsubLeads();
      unsubTeam();
    };
  }, [user.companyId, user.role, user.uid]);

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'leads'), {
        ...newLead,
        companyId: user.companyId,
        status: 'New',
        createdAt: new Date().toISOString()
      });
      toast.success('Lead added successfully');
      setShowAddModal(false);
      setNewLead({ name: '', email: '', phone: '', message: '', service: 'WordPress' });
    } catch (error) {
      toast.error('Failed to add lead');
    }
  };

  const handleAssignLead = async (leadId: string, userId: string) => {
    try {
      await updateDoc(doc(db, 'leads', leadId), { assignedTo: userId });
      toast.success('Lead assigned successfully');
    } catch (error) {
      toast.error('Failed to assign lead');
    }
  };

  const exportLeadsToCSV = () => {
    if (leads.length === 0) {
      toast.error('No leads to export');
      return;
    }
    const headers = ['Name', 'Email', 'Service', 'Status', 'Assigned To', 'Created At'];
    const rows = leads.map(lead => [
      lead.name,
      lead.email,
      lead.service,
      lead.status,
      team.find(m => m.uid === lead.assignedTo)?.name || 'Unassigned',
      lead.createdAt
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `nexvoura_leads_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Leads exported successfully');
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || lead.status === statusFilter;
    const matchesService = serviceFilter === 'All' || lead.service === serviceFilter;
    return matchesSearch && matchesStatus && matchesService;
  });

  return (
    <div className="space-y-8 md:space-y-12">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div className="space-y-4">
          <div className="inline-flex items-center space-x-2 text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span>Demand & Inquiry Pipeline</span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black font-display text-slate-950 tracking-tight leading-[0.85] italic">
            Prospect <br /><span className="text-blue-600">Inventory</span>
          </h2>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full xl:w-auto">
          <div className="relative flex-1 sm:w-64">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
             <input 
                type="text"
                placeholder="Search Identity..."
                value={searchQuery || ''}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl text-xs font-bold text-slate-600 outline-none focus:border-blue-500/20 focus:ring-4 focus:ring-blue-600/5 transition-all shadow-sm"
              />
          </div>
          <div className="flex gap-4">
            <div className="relative flex-1 sm:w-40">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 outline-none appearance-none hover:border-slate-300 transition-colors"
                  >
                    <option value="All">All Stages</option>
                    <option value="New">New Discovery</option>
                    <option value="Contacted">Active Outreach</option>
                    <option value="Converted">Locked Partnership</option>
                  </select>
              </div>
              <div className="relative flex-1 sm:w-40">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                  <select 
                      value={serviceFilter}
                      onChange={(e) => setServiceFilter(e.target.value)}
                      className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 outline-none appearance-none hover:border-slate-300 transition-colors"
                    >
                      <option value="All">All Solutions</option>
                      <option value="WordPress">WordPress</option>
                      <option value="Shopify">Shopify</option>
                      <option value="Custom Development">Custom Forge</option>
                    </select>
              </div>
          </div>
          <div className="flex gap-2">
            {(user.role === 'admin' || user.role === 'manager') && (
              <button 
                onClick={exportLeadsToCSV}
                className="p-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all active:scale-95"
                title="Export Signal Data"
              >
                <Download size={20} />
              </button>
            )}
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-blue-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95 whitespace-nowrap"
            >
              <Plus size={18} />
              <span>Register Lead</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[40px] shadow-xl shadow-slate-200/5 border border-slate-100 overflow-hidden relative">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Client Identity</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Service Inquiry</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pipeline Stage</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned Specialist</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Engagement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredLeads.map((lead) => (
              <tr key={lead.id} className="hover:bg-blue-50/30 transition-all group">
                <td className="px-8 py-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500 font-black font-display group-hover:from-blue-100 group-hover:to-blue-200 group-hover:text-blue-600 transition-all">
                      {lead.name[0]}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 font-display text-base leading-tight">{lead.name}</div>
                      <div className="text-xs font-medium text-slate-400 mt-0.5">{lead.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                   <div className="flex items-center space-x-2">
                     <div className="w-2 h-2 rounded-full bg-blue-400" />
                     <span className="text-sm font-bold text-slate-600">{lead.service}</span>
                   </div>
                </td>
                <td className="px-8 py-6">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    lead.status === 'Converted' ? 'bg-emerald-100 text-emerald-700' :
                    lead.status === 'Contacted' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {lead.status}
                  </span>
                </td>
                <td className="px-8 py-6">
                  {(user.role === 'admin' || user.role === 'manager') ? (
                    <div className="relative inline-block w-full">
                      <select
                        className="w-full text-sm bg-transparent border-none focus:ring-0 text-slate-600 font-bold cursor-pointer hover:text-blue-600 transition-colors appearance-none"
                        value={lead.assignedTo || ''}
                        onChange={(e) => handleAssignLead(lead.id, e.target.value)}
                      >
                        <option value="">Public Queue</option>
                        {team.map(member => (
                          <option key={member.uid} value={member.uid}>{member.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-blue-500 transition-colors" />
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                        {(team.find(m => m.uid === lead.assignedTo)?.name || 'U')[0]}
                      </div>
                      <span className="text-sm text-slate-600 font-bold">
                        {team.find(m => m.uid === lead.assignedTo)?.name || 'Unassigned'}
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-8 py-6 text-right">
                  <button className="text-blue-600 hover:text-blue-700 text-xs font-black uppercase tracking-widest p-2 hover:bg-blue-100/50 rounded-xl transition-all">
                    Intel Analysis
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {leads.length === 0 && !loading && (
          <div className="p-20 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-slate-50 text-slate-300 mb-4">
              <Search size={32} />
            </div>
            <p className="text-slate-400 font-bold font-display text-xl">No entities found in this sector</p>
            <p className="text-slate-400 text-sm mt-1">Adjust your filters or add a new lead to populate the nexus.</p>
          </div>
        )}
      </div></div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[40px] p-10 max-w-xl w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
              
              <h3 className="text-3xl font-black font-display text-slate-950 mb-2">Lead Integration</h3>
              <p className="text-slate-500 font-medium mb-8">Register a new inquiry into the Nexvoura system.</p>
              
              <form onSubmit={handleAddLead} className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Full Identity</label>
                    <input
                      type="text"
                      required
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 transition-all font-medium"
                      value={newLead.name || ''}
                      onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                      placeholder="e.g. Alex Rivera"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Comm Protocol (Email)</label>
                    <input
                      type="email"
                      required
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 transition-all font-medium"
                      value={newLead.email || ''}
                      onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                      placeholder="alex@nexus.com"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Phone Nexus</label>
                    <input
                      type="tel"
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 transition-all font-medium"
                      value={newLead.phone || ''}
                      onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Core Service</label>
                    <div className="relative">
                      <select
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-700 appearance-none"
                        value={newLead.service || 'WordPress'}
                        onChange={(e) => setNewLead({ ...newLead, service: e.target.value as any })}
                      >
                        <option>WordPress</option>
                        <option>Shopify</option>
                        <option>Custom Development</option>
                      </select>
                      <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Inquiry Specs</label>
                  <textarea
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 transition-all font-medium resize-none min-h-[120px]"
                    value={newLead.message || ''}
                    onChange={(e) => setNewLead({ ...newLead, message: e.target.value })}
                    placeholder="Provide context for this lead..."
                  />
                </div>
                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 p-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all border border-slate-100"
                  >
                    Discard
                  </button>
                  <button
                    className="flex-1 bg-slate-950 text-white p-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-slate-200"
                  >
                    Integrate Lead
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

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const user = result.user;
        
        // Update profile with the name immediately
        await updateProfile(user, { displayName: name });
        
        // The App component's onSnapshot will handle the state and redirect to /setup-company
        // but we navigate just as secondary safeguard
        navigate('/setup-company', { state: { name } });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        // App component handles redirects based on profile existence
        navigate('/');
      }
    } catch (error: any) {
      console.error('Auth Error:', error);
      toast.error(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, googleProvider);
      navigate('/');
    } catch (error: any) {
      console.error('Google Login Error:', error);
      if (error.code === 'auth/popup-blocked') {
        toast.error('Popup blocked. Please allow popups for this site.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        // Just ignore
      } else {
        toast.error('Google Login failed. Check if Authorized Domains are configured in Firebase.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans overflow-hidden">
      {/* Brand Column */}
      <div className="hidden lg:flex lg:w-3/5 relative overflow-hidden bg-slate-950 p-20 flex-col justify-between">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://picsum.photos/seed/agency/1920/1080?blur=4" 
            alt="Agency Context" 
            className="w-full h-full object-cover opacity-40 mix-blend-overlay"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-transparent to-indigo-950/60" />
        </div>
        
        <div className="relative z-10 flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-black text-white shadow-2xl shadow-blue-500/20">N</div>
          <span className="text-3xl font-black text-white tracking-tighter font-display italic">Nexvoura</span>
        </div>

        <div className="relative z-10 space-y-8 max-w-2xl translate-y-20">
          <motion.h2 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="text-7xl font-black text-white tracking-tight leading-[0.9] font-display"
          >
            Smarter Leads. <br />
            <span className="text-blue-500">Faster Closure.</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl text-slate-400 font-medium leading-relaxed"
          >
            The next generation of agency management. Centralize your pipeline, coordinate your team, and scale your operations with Nexvoura's intelligence-driven workspace.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-center space-x-8 pt-4"
          >
            <div className="flex -space-x-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="w-12 h-12 rounded-full border-4 border-slate-950 overflow-hidden ring-1 ring-white/10 shadow-xl">
                  <img src={`https://i.pravatar.cc/150?u=${i}`} alt="user" />
                </div>
              ))}
            </div>
            <p className="text-sm font-bold text-slate-300">Join 500+ elite agencies scaling with precision.</p>
          </motion.div>
        </div>

        <div className="relative z-10 flex items-center space-x-6 text-slate-500 text-xs font-black uppercase tracking-widest">
          <span>v2.0 Nexus Engine</span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
          <span>Privacy Secured</span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
          <span>ISO 27001</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center p-8 lg:p-16 xl:p-24 bg-white overflow-y-auto custom-scrollbar">
        <div className="max-w-md w-full mx-auto space-y-10 md:space-y-12">
          <div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-950 tracking-tighter font-display italic">
              {isSignUp ? 'Empower Your Team' : 'Welcome Back'}
            </h1>
            <p className="text-slate-500 font-medium mt-3 text-base md:text-lg opacity-80 leading-relaxed">
              {isSignUp 
                ? 'Join Nexvoura and transform your client acquisition cycle.' 
                : 'Access your specialized workspace and active pipelines.'
              }
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            {isSignUp && (
              <div className="space-y-2 group">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Full Identity</label>
                <div className="relative">
                  <UserIcon size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-[24px] outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600/20 focus:bg-white transition-all font-bold text-slate-900 placeholder:text-slate-300"
                    value={name || ''}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-2 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Email Port</label>
              <div className="relative">
                <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="email"
                  required
                  placeholder="agent@agency.com"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-[24px] outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600/20 focus:bg-white transition-all font-bold text-slate-900 placeholder:text-slate-300"
                  value={email || ''}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Security Key</label>
              <div className="relative">
                <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-[24px] outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600/20 focus:bg-white transition-all font-bold text-slate-900 placeholder:text-slate-300"
                  value={password || ''}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-950 text-white p-5 rounded-[24px] font-black hover:bg-slate-900 hover:shadow-2xl hover:shadow-slate-300/50 hover:-translate-y-1 transition-all flex items-center justify-center space-x-3 text-lg shadow-xl shadow-slate-200"
            >
              <span>{loading ? 'Processing Protocol...' : isSignUp ? 'Initialize Account' : 'Authenticate'}</span>
              {!loading && <ArrowRight size={22} />}
            </button>
          </form>

          <div className="flex flex-col space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
                <span className="bg-white px-4 text-slate-400">Cross-Cloud Sign In</span>
              </div>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-3 bg-white border-2 border-slate-100 py-4 rounded-[24px] hover:bg-slate-50 hover:border-slate-200 transition-all font-black text-slate-900 shadow-sm"
            >
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5 grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all" alt="Google" />
              <span>Continue with Google</span>
            </button>
          </div>

          <div className="text-center pt-8 border-t border-slate-50">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm font-black text-blue-600 hover:text-blue-700 underline underline-offset-8 decoration-2 decoration-blue-200 hover:decoration-blue-500 transition-all"
            >
              {isSignUp ? 'Existing Operative? Authenticate Here' : "New Agent? Initialize Access"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const JoinWorkspace = ({ user }: { user: any }) => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  // If not logged in, we save the token and redirect to login
  useEffect(() => {
    if (!user && !loading) {
      sessionStorage.setItem('pendingInviteToken', token || '');
      // We don't redirect automatically here to allow showing an "Invite valid" message first
    }
  }, [user, token, loading]);

  useEffect(() => {
    const validateToken = async () => {
      try {
        if (!token) {
          navigate('/login');
          return;
        }

        // First try specific invite token
        const q = query(collection(db, 'invites'), where('token', '==', token), where('status', '==', 'pending'));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          const inviteData = { id: snap.docs[0].id, ...snap.docs[0].data() } as Invite;
          setInvite(inviteData);
          const compSnap = await getDoc(doc(db, 'companies', inviteData.companyId));
          if (compSnap.exists()) {
            setCompany({ id: compSnap.id, ...compSnap.data() } as Company);
          }
          setLoading(false);
          return;
        }

        // If not found, try general company invite code
        const companyQ = query(collection(db, 'companies'), where('inviteCode', '==', token));
        const companySnap = await getDocs(companyQ);

        if (!companySnap.empty) {
          const compData = { id: companySnap.docs[0].id, ...companySnap.docs[0].data() } as Company;
          setCompany(compData);
          // Create a "virtual" invite for the join process
          setInvite({
            id: 'general',
            companyId: compData.id,
            email: user?.email || '',
            role: 'sales', // Default role for general code
            token: token || '',
            expiresAt: '',
            status: 'pending'
          });
          setLoading(false);
          return;
        }

        toast.error('Invalid or expired invite code.');
        navigate('/login');
      } catch (error) {
        console.error(error);
        toast.error('Error validating invite.');
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    validateToken();
  }, [token, navigate, user?.email]);

  const handleJoin = async () => {
    if (!user) {
      sessionStorage.setItem('pendingInviteToken', token || '');
      navigate('/login');
      return;
    }
    if (!invite || !company) return;
    setJoining(true);
    try {
      // Check if user already has a profile
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        toast.error('You already belong to a workspace.');
        navigate('/');
        return;
      }

      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        memberId: generateMemberId(company.name),
        name: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        email: user.email,
        companyId: company.id,
        role: invite.role,
        createdAt: new Date().toISOString()
      });
      
      if (invite.id !== 'general') {
        await updateDoc(doc(db, 'invites', invite.id), { status: 'accepted' });
      }
      
      toast.success(`Welcome to ${company.name}!`);
      sessionStorage.removeItem('pendingInviteToken');
      setTimeout(() => navigate('/'), 1000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    } finally {
      setJoining(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 space-y-8 text-center"
      >
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Users size={32} />
        </div>
        <h2 className="text-3xl font-black text-slate-900">Join Workspace</h2>
        <p className="text-slate-500">
          You've been invited to join <span className="font-bold text-slate-900">{company?.name}</span> as a <span className="font-bold text-blue-600 uppercase">{invite?.role}</span>.
        </p>
        <button
          onClick={handleJoin}
          disabled={joining}
          className="w-full bg-slate-900 text-white p-4 rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
        >
          {joining ? 'Joining...' : user ? `Join ${company?.name}` : 'Login to Join'}
        </button>
        <button
          onClick={() => navigate('/login')}
          className="w-full text-slate-500 text-sm font-medium hover:underline"
        >
          Back to Login
        </button>
      </motion.div>
    </div>
  );
};

const SetupCompany = ({ user }: { user: any }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');
  const [industry, setIndustry] = useState('');
  const [address, setAddress] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const companyId = crypto.randomUUID?.() || Math.random().toString(36).substring(2);
      const batch = writeBatch(db);

      const companyRef = doc(db, 'companies', companyId);
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      batch.set(companyRef, {
        id: companyId,
        name: name.trim(),
        website: website.trim(),
        phone: phone.trim(),
        industry: industry.trim(),
        address: address.trim(),
        logoUrl: logoUrl.trim(),
        description: description.trim(),
        inviteCode,
        createdAt: new Date().toISOString(),
        notificationSettings: {
          enabled: true,
          dueSoonHours: 24
        }
      });

      const userRef = doc(db, 'users', user.uid);
      batch.set(userRef, {
        uid: user.uid,
        memberId: generateMemberId(name),
        name: (location.state as any)?.name || user.displayName || user.email?.split('@')[0] || 'Anonymous',
        email: user.email,
        companyId,
        role: 'admin',
        createdAt: new Date().toISOString()
      });

      await batch.commit();
      
      setSuccess(true);
      toast.success('Company setup complete!');
      
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 1500);
    } catch (error) {
      console.error("Setup Error:", error);
      handleFirestoreError(error, OperationType.WRITE, `setup-company`);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-[40px] shadow-2xl p-12 space-y-8 text-center border-2 border-slate-50"
        >
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner ring-4 ring-emerald-500/5">
            <Plus size={40} className="animate-pulse" />
          </div>
          <h2 className="text-4xl font-black text-slate-950 font-display italic">Nexus Initialized</h2>
          <p className="text-slate-500 font-medium">Your company workspace <span className="font-black text-blue-600 underline underline-offset-4 decoration-2 decoration-blue-100">{name}</span> is ready for deployment.</p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-slate-950 text-white p-5 rounded-[24px] font-black hover:bg-slate-900 transition-all shadow-xl shadow-slate-200"
          >
            Enter Workspace
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 md:p-12 lg:p-20 font-sans overflow-x-hidden relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
      
      <div className="max-w-[1400px] w-full grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-32 items-center">
        <div className="space-y-12 animate-in fade-in slide-in-from-left-8 duration-700">
          <div className="inline-flex items-center space-x-3 bg-slate-50 px-5 py-2.5 rounded-full border border-slate-100 shadow-sm">
             <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Workspace Initialization</span>
          </div>
          
          <div className="space-y-6">
            <h2 className="text-6xl md:text-8xl font-black text-slate-950 tracking-tighter leading-[0.85] font-display italic">Setup Your <br /><span className="text-blue-600 italic">Command Center.</span></h2>
            <p className="text-xl md:text-2xl text-slate-500 font-medium leading-relaxed max-w-xl">Scale your agency operations with Nexvoura's high-performance ecosystem.</p>
          </div>
          
          <div className="space-y-10 pt-4">
            {[
              { icon: Building2, label: 'Centralize Data', desc: 'Every lead, task, and team metric in one low-latency hub.' },
              { icon: Shield, label: 'Secure Framework', desc: 'Encryption and role-based access for complete data sovereignty.' },
            ].map((item, i) => (
              <div key={i} className="flex items-start space-x-6 group">
                <div className="p-4 bg-blue-50 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                  <item.icon size={28} />
                </div>
                <div>
                  <p className="font-black text-slate-900 text-xl font-display tracking-tight uppercase">{item.label}</p>
                  <p className="text-base text-slate-400 font-medium">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border-2 border-slate-100 shadow-2xl shadow-slate-200/50 rounded-[64px] p-10 md:p-16 relative overflow-hidden animate-in fade-in slide-in-from-right-8 duration-700">
          <div className="absolute top-0 right-0 w-48 h-48 bg-slate-50 rounded-bl-full -z-10" />
          
          <form onSubmit={handleSubmit} className="space-y-10">
            <div className="space-y-2 group">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Entity Name *</label>
              <input
                type="text"
                required
                value={name || ''}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-6 bg-slate-50 border-2 border-transparent rounded-[32px] outline-none focus:ring-8 focus:ring-blue-600/5 focus:border-blue-600/20 focus:bg-white transition-all font-bold text-slate-900 placeholder:text-slate-300 text-lg font-display"
                placeholder="e.g. Nexvoura Solutions"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2 group">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Industry</label>
                <input
                  type="text"
                  value={industry || ''}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full p-6 bg-slate-50 border-2 border-transparent rounded-[32px] outline-none focus:ring-8 focus:ring-blue-600/5 focus:border-blue-600/20 focus:bg-white transition-all font-bold text-slate-900 placeholder:text-slate-300 text-base font-display"
                  placeholder="e.g. SaaS"
                />
              </div>
              <div className="space-y-2 group">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Phone</label>
                <input
                  type="tel"
                  value={phone || ''}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-6 bg-slate-50 border-2 border-transparent rounded-[32px] outline-none focus:ring-8 focus:ring-blue-600/5 focus:border-blue-600/20 focus:bg-white transition-all font-bold text-slate-900 placeholder:text-slate-300 text-base font-display"
                  placeholder="+1 234..."
                />
              </div>
            </div>

            <div className="space-y-2 group">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">External Domain (Optional)</label>
              <div className="relative">
                 <LinkIcon size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                 <input
                  type="url"
                  value={website || ''}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full pl-14 pr-6 py-6 bg-slate-50 border-2 border-transparent rounded-[32px] outline-none focus:ring-8 focus:ring-blue-600/5 focus:border-blue-600/20 focus:bg-white transition-all font-bold text-slate-900 placeholder:text-slate-300 text-base font-display"
                  placeholder="https://your-domain.com"
                />
              </div>
            </div>

            <div className="space-y-2 group">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Primary HQ</label>
              <input
                type="text"
                value={address || ''}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-6 bg-slate-50 border-2 border-transparent rounded-[32px] outline-none focus:ring-8 focus:ring-blue-600/5 focus:border-blue-600/20 focus:bg-white transition-all font-bold text-slate-900 placeholder:text-slate-300 text-base font-display"
                placeholder="City, Country"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-950 text-white p-6 rounded-[32px] font-black hover:bg-slate-900 hover:shadow-2xl hover:shadow-slate-300/50 hover:-translate-y-1 transition-all flex items-center justify-center space-x-3 text-xl shadow-xl shadow-slate-200 mt-10 font-display italic tracking-tight"
            >
              <span>{loading ? 'Processing Workspace...' : 'Initialize Workspace'}</span>
              {!loading && <ArrowRight size={28} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

const AuthenticatedLayout = ({ user }: { user: UserProfile }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'companies', user.companyId), (snap) => {
      if (snap.exists()) {
        setCompany({ id: snap.id, ...snap.data() } as Company);
      }
    });
    return () => unsub();
  }, [user.companyId]);

  return (
    <div className="flex h-screen bg-brand-surface overflow-hidden font-sans">
      <Sidebar user={user} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      <main className="flex-1 lg:ml-[380px] h-screen overflow-hidden flex flex-col relative w-full">
        <Header user={user} company={company} onToggleSidebar={() => setIsSidebarOpen(true)} />
        
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 xl:px-12 md:py-10 custom-scrollbar relative z-10 scroll-smooth">
          <Routes>
            <Route path="/" element={<Dashboard user={user} />} />
            <Route path="/leads" element={<LeadsPage user={user} />} />
            <Route path="/tasks" element={<TasksPage user={user} />} />
            <Route path="/profile" element={<ProfilePage user={user} />} />
            <Route path="/employees" element={<EmployeesPage user={user} company={company} />} />
            <Route path="/payroll" element={<PayrollPage user={user} company={company} />} />
            <Route path="/settings" element={<SettingsPage user={user} />} />
          </Routes>
        </div>

        {/* Dynamic Decorative Graphic */}
        <div className="fixed bottom-0 right-0 w-[60vh] h-[60vh] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none -z-0 translate-x-1/3 translate-y-1/3" />
      </main>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (u) {
        try {
          const docRef = doc(db, 'users', u.uid);
          // Use onSnapshot for real-time profile updates (e.g. after setup or role change)
          unsubscribeProfile = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as UserProfile;
              if (!data.memberId) {
                // Auto-generate missing Member ID for existing users
                const mid = generateMemberId();
                updateDoc(docRef, { memberId: mid });
              }
              setProfile(data);
            } else {
              setProfile(null);
            }
            setLoading(false);
          }, (error) => {
            handleFirestoreError(error, OperationType.GET, `users/${u.uid}`);
            setLoading(false);
          });
        } catch (error) {
          console.error("Error setting up profile listener:", error);
          setProfile(null);
          setLoading(false);
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  return (
    <Router>
      <Toaster position="top-right" richColors />
      <MainContent user={user} profile={profile} loading={loading} />
    </Router>
  );
}

function MainContent({ user, profile, loading }: { user: any, profile: UserProfile | null, loading: boolean }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !profile && !loading && window.location.pathname === '/') {
      const pendingToken = sessionStorage.getItem('pendingInviteToken');
      if (pendingToken) {
        navigate(`/join/${pendingToken}`);
      }
    }
  }, [user, profile, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
      <Route path="/setup-company" element={user && !profile ? <SetupCompany user={user} /> : <Navigate to="/" />} />
      <Route path="/join/:token" element={<JoinWorkspace user={user} />} />
      <Route path="/submit-lead/:companyId" element={
        <div className="min-h-screen bg-slate-50 py-20 px-4">
          <LeadForm companyId={window.location.pathname.split('/').pop() || ''} />
        </div>
      } />
      
      <Route
        path="/*"
        element={
          user ? (
            profile ? (
              <AuthenticatedLayout user={profile} />
            ) : (
              <Navigate to="/setup-company" />
            )
          ) : (
            <Navigate to="/login" />
          )
        }
      />
    </Routes>
  );
}
