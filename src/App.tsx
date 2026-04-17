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
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Globe, 
  Copy,
  BarChart as BarChartIcon,
  RefreshCcw
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

import TeamPage from './components/TeamPage';
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
    { name: 'Team', path: '/team', icon: Users, roles: ['admin', 'manager', 'team_lead'] },
    { name: 'Profile', path: '/profile', icon: UserIcon },
    { name: 'Settings', path: '/settings', icon: Settings, roles: ['admin'] },
  ];

  const filteredNavItems = navItems.filter(item => !item.roles || item.roles.includes(user.role));

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <div className={`w-72 bg-slate-900 text-white h-screen fixed left-0 top-0 flex flex-col z-50 transition-transform duration-300 ease-in-out transform ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h1 className="text-2xl font-black bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent tracking-tight">
            Nexvoura
          </h1>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 lg:hidden transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-2 mt-4">
          {filteredNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 p-3.5 rounded-xl hover:bg-slate-800 transition-all group font-medium text-slate-400 hover:text-white"
            >
              <item.icon size={20} className="group-hover:scale-110 transition-transform" />
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>
        <div className="p-6 border-t border-slate-800 space-y-4">
          <div className="flex items-center space-x-3 px-1">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center font-black text-white shadow-lg shadow-blue-500/20 overflow-hidden border border-slate-700">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                user.name[0]
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{user.name}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{user.role}</p>
            </div>
            <div className="hidden lg:flex items-center space-x-4">
              {user.role !== 'admin' && (
                <button
                  onClick={async () => {
                    try {
                      const q = query(
                        collection(db, 'accessRequests'),
                        where('userId', '==', user.uid),
                        where('status', '==', 'pending')
                      );
                      const snap = await getDocs(q);
                      if (!snap.empty) {
                        toast.error('You already have a pending request');
                        return;
                      }
                      
                      const role = prompt('Request which role? (manager/team_lead/admin)');
                      if (role && ['manager', 'team_lead', 'admin'].includes(role)) {
                        await addDoc(collection(db, 'accessRequests'), {
                          companyId: user.companyId,
                          userId: user.uid,
                          userName: user.name,
                          requestedRole: role,
                          status: 'pending',
                          createdAt: new Date().toISOString()
                        });
                        toast.success('Access request raised successfully');
                      }
                    } catch (e) {
                      toast.error('Failed to raise request');
                    }
                  }}
                  className="px-4 py-2 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-xl text-xs font-bold hover:bg-blue-600/20 transition-all"
                >
                  Raise Access Request
                </button>
              )}
            </div>
          </div>
          <button
            onClick={() => signOut(auth)}
            className="flex items-center space-x-3 p-3.5 w-full rounded-xl hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 transition-all font-bold text-sm"
          >
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
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
  <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30">
    <div className="flex items-center space-x-4">
      <button 
        onClick={onToggleSidebar}
        className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-xl lg:hidden transition-all"
      >
        <Menu size={24} />
      </button>
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center overflow-hidden shadow-lg shadow-slate-200">
           {company?.logoUrl ? (
             <img src={company.logoUrl} alt={company.name} className="w-full h-full object-contain p-1.5" referrerPolicy="no-referrer" />
           ) : (
             <Globe size={20} className="text-white" />
           )}
        </div>
        <div className="hidden sm:block">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">{company?.name || 'NexusVoura'}</h2>
          <p className="text-[10px] font-black text-slate-400 flex items-center gap-1 uppercase tracking-widest">
            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
            {user.role} Portal
          </p>
        </div>
      </div>
    </div>
    <div className="flex items-center space-x-2 md:space-x-4">
      <NotificationCenter user={user} />
      <div className="h-8 w-px bg-slate-100 mx-2 hidden md:block" />
      <Link to="/profile" className="flex items-center space-x-2 md:space-x-3 group transition-all">
        <div className="hidden md:block text-right">
          <p className="text-xs font-black text-slate-900 leading-none mb-0.5 group-hover:text-blue-600 transition-colors">{user.name}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">My Account</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-black shadow-inner overflow-hidden border border-slate-200 group-hover:border-blue-200 transition-all">
          {user.photoURL ? (
            <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            user.name[0]
          )}
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
    const leadsQ = query(collection(db, 'leads'), where('companyId', '==', user.companyId));
    const tasksQ = query(
      collection(db, 'tasks'),
      where('companyId', '==', user.companyId),
      where('status', '!=', 'Done')
    );

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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">System Dashboard</h2>
          <p className="text-slate-500 font-medium">Insights and actions for your workspace</p>
        </div>
        <div className="flex items-center space-x-2 text-sm font-bold text-slate-500 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
          <Calendar size={16} className="text-blue-500" />
          <span>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Leads', value: stats.total, color: 'bg-blue-500', icon: MessageSquare, textColor: 'text-blue-600' },
          { label: 'New Leads', value: stats.new, color: 'bg-emerald-500', icon: Clock, textColor: 'text-emerald-600' },
          { label: 'Converted', value: stats.converted, color: 'bg-indigo-500', icon: CheckCircle, textColor: 'text-indigo-600' },
        ].map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 rounded-xl ${stat.color} bg-opacity-10 ${stat.textColor}`}>
                <stat.icon size={20} />
              </div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Live Status
              </div>
            </div>
            <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-2">{stat.value}</h3>
            <div className={`h-1 w-12 mt-4 rounded-full ${stat.color} opacity-30 group-hover:opacity-100 transition-opacity`} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Charts Section */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
           <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-bold text-slate-900">Leads by Service</h3>
             <BarChartIcon size={20} className="text-slate-400" />
           </div>
           <div className="h-[250px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={analyticsData}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="name" fontSize={10} fontWeight={600} axisLine={false} tickLine={false} />
                 <YAxis axisLine={false} tickLine={false} fontSize={10} />
                 <ReChartsTooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                 />
                 <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                    {analyticsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
           <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-bold text-slate-900">Lead Pipeline</h3>
             <RefreshCcw size={20} className="text-slate-400" />
           </div>
           <div className="h-[250px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={statusData}
                   cx="50%"
                   cy="50%"
                   innerRadius={50}
                   outerRadius={70}
                   paddingAngle={8}
                   dataKey="value"
                 >
                   {statusData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={entry.color} />
                   ))}
                 </Pie>
                 <ReChartsTooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                 />
                 <Legend verticalAlign="bottom" height={36} wrapperStyle={{fontSize: '10px'}} />
               </PieChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-900">Active Reminders</h3>
            {reminders.length > 0 && (
              <span className="bg-rose-100 text-rose-600 px-3 py-1 rounded-full text-xs font-bold">
                {reminders.length} Action Items
              </span>
            )}
          </div>
          
          {reminders.length > 0 ? (
            <div className="space-y-4">
              {reminders.map((task) => {
                const isOverdue = isPast(parseISO(task.dueDate)) && !isToday(parseISO(task.dueDate));
                return (
                  <div key={task.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                    <div className="flex items-start space-x-3">
                      <div className={`mt-1 p-2 rounded-lg ${isOverdue ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                        {isOverdue ? <AlertCircle size={16} /> : <Clock size={16} />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{task.title}</p>
                        <p className={`text-[10px] font-bold uppercase ${isOverdue ? 'text-rose-500' : 'text-amber-500'}`}>
                          {isOverdue ? 'Overdue' : 'Due Soon'} • {format(parseISO(task.dueDate), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <Link 
                      to="/tasks" 
                      className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      Handle
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckSquare size={32} className="text-slate-300" />
              </div>
              <p className="text-slate-500 italic">No urgent tasks at the moment.</p>
            </div>
          )}
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-900">Quick Tools</h3>
          </div>
          <div className="space-y-4">
            <button 
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/submit-lead/${user.companyId}`);
                toast.success('Lead submission URL copied');
              }}
              className="w-full flex items-center justify-between p-4 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors font-bold text-sm"
            >
              <div className="flex items-center space-x-3">
                <Plus size={20} />
                <span>Copy Lead Submission URL</span>
              </div>
              <Search size={16} />
            </button>
            <Link
              to="/leads"
              className="w-full flex items-center justify-between p-4 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-colors font-bold text-sm"
            >
              <div className="flex items-center space-x-3">
                <Users size={20} />
                <span>Go to Leads Management</span>
              </div>
              <Filter size={16} />
            </Link>
            <button 
              onClick={() => {
                navigate('/team');
                toast.info('Head to Team page to generate a specific invite token');
              }}
              className="w-full flex items-center justify-between p-4 bg-purple-50 text-purple-700 rounded-xl hover:bg-purple-100 transition-colors font-bold text-sm"
            >
              <div className="flex items-center space-x-3">
                <Mail size={20} />
                <span>Manage Team Invites</span>
              </div>
              <ArrowRight size={16} />
            </button>
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
    const leadsQ = query(collection(db, 'leads'), where('companyId', '==', user.companyId));
    const teamQ = query(collection(db, 'users'), where('companyId', '==', user.companyId));

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
  }, [user.companyId]);

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
    link.setAttribute("download", `nexus_leads_${new Date().toISOString().split('T')[0]}.csv`);
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Leads Management</h2>
          <p className="text-slate-500">Track and convert your agency's inquiries</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={exportLeadsToCSV}
            className="flex items-center space-x-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Download size={18} />
            <span>Export CSV</span>
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
          >
            <Plus size={18} />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery || ''}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 md:flex-none p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Converted">Converted</option>
          </select>
          <select 
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="flex-1 md:flex-none p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 outline-none"
          >
            <option value="All">All Services</option>
            <option value="WordPress">WordPress</option>
            <option value="Shopify">Shopify</option>
            <option value="Custom Development">Custom Development</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Service</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned To</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.map((lead) => (
              <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-900">{lead.name}</div>
                  <div className="text-sm text-slate-500">{lead.email}</div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{lead.service}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    lead.status === 'Converted' ? 'bg-emerald-100 text-emerald-700' :
                    lead.status === 'Contacted' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {lead.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <select
                    className="text-sm bg-transparent border-none focus:ring-0 text-slate-600 font-medium cursor-pointer hover:text-blue-600 transition-colors"
                    value={lead.assignedTo || ''}
                    onChange={(e) => handleAssignLead(lead.id, e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {team.map(member => (
                      <option key={member.uid} value={member.uid}>{member.name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4">
                  <button className="text-blue-600 hover:underline text-sm font-medium">View Details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {leads.length === 0 && !loading && (
          <div className="p-12 text-center text-slate-500">No leads found.</div>
        )}
      </div></div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Add New Lead</h3>
              <form onSubmit={handleAddLead} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Lead Name</label>
                    <input
                      type="text"
                      required
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      value={newLead.name || ''}
                      onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Email</label>
                    <input
                      type="email"
                      required
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      value={newLead.email || ''}
                      onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                      placeholder="john@example.com"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Phone Number</label>
                    <input
                      type="tel"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      value={newLead.phone || ''}
                      onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                      placeholder="+1 234 567 890"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Service</label>
                    <select
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                      value={newLead.service || 'WordPress'}
                      onChange={(e) => setNewLead({ ...newLead, service: e.target.value as any })}
                    >
                      <option>WordPress</option>
                      <option>Shopify</option>
                      <option>Custom Development</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Message / Notes</label>
                  <textarea
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 resize-none font-sans"
                    rows={3}
                    value={newLead.message || ''}
                    onChange={(e) => setNewLead({ ...newLead, message: e.target.value })}
                    placeholder="Brief description of requirements..."
                  />
                </div>
                <div className="flex space-x-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 p-3 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all border border-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    className="flex-1 bg-slate-900 text-white p-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                  >
                    Add Lead
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 space-y-6"
      >
        <div className="text-center">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Nexvoura</h1>
          <p className="text-slate-500 mt-2 text-sm italic font-medium">Internal Agency Portal for Staff & Admins</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase px-1">Full Name</label>
              <div className="relative">
                <UserIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  value={name || ''}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase px-1">Email Address</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={email || ''}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase px-1">Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={password || ''}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white p-4 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center space-x-2"
          >
            <span>{loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}</span>
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-slate-400">Or continue with</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center space-x-3 bg-white border border-slate-200 p-3.5 rounded-xl hover:bg-slate-50 transition-all font-medium text-slate-700 shadow-sm"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            <span>Google</span>
          </button>
        </div>

        <div className="text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm font-bold text-blue-600 hover:underline"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>

        <p className="text-center text-[10px] text-slate-400 leading-relaxed">
          By continuing, you agree to our <span className="underline cursor-pointer">Terms of Service</span> and <span className="underline cursor-pointer">Privacy Policy</span>.
        </p>
      </motion.div>
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
      
      // Force a small delay to ensure Firestore propagation before navigation
      setTimeout(() => {
        navigate('/', { replace: true });
        // Optional: window.location.reload() if still stuck, but replace:true should help
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
          className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 space-y-8 text-center"
        >
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Plus size={32} />
          </div>
          <h2 className="text-3xl font-black text-slate-900">Workspace Ready!</h2>
          <p className="text-slate-500">Your company workspace <span className="font-bold text-slate-900">{name}</span> has been created successfully.</p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold hover:bg-blue-700 transition-all"
          >
            Enter Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-12">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl p-10 space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900">Setup Your Company</h2>
          <p className="text-slate-500 mt-2">Create your tenant workspace</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">Company Name *</label>
              <input
                type="text"
                required
                value={name || ''}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="e.g. Nexvoura Solutions"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Website</label>
              <input
                type="url"
                value={website || ''}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="https://nexvoura.com"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Phone</label>
              <input
                type="tel"
                value={phone || ''}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="+1 234 567 890"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Industry</label>
              <input
                type="text"
                value={industry || ''}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="e.g. SaaS, Marketing"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">Office Address</label>
              <input
                type="text"
                value={address || ''}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="123 Street, City, Country"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">Company Logo URL</label>
              <input
                type="url"
                value={logoUrl || ''}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="https://example.com/logo.png"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">Bio / Description</label>
              <textarea
                value={description || ''}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                placeholder="Briefly describe your agency..."
              />
            </div>
          </div>
          <button
            disabled={loading}
            className="w-full bg-slate-900 text-white p-4 rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Workspace'}
          </button>
        </form>
        <div className="text-center">
          <p className="text-sm text-slate-500">Have an invite code? <button onClick={() => {
            const code = prompt('Enter invite code:');
            if (code) navigate(`/join/${code}`);
          }} className="text-blue-600 font-bold hover:underline">Join Workspace</button></p>
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
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar user={user} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className="flex-1 lg:ml-72 min-w-0 transition-all duration-300">
        <Header user={user} company={company} onToggleSidebar={() => setIsSidebarOpen(true)} />
        <main className="p-4 md:p-8 max-w-7xl mx-auto">
          <Routes>
            <Route path="/" element={<Dashboard user={user} />} />
            <Route path="/leads" element={<LeadsPage user={user} />} />
            <Route path="/tasks" element={<TasksPage user={user} />} />
            <Route path="/profile" element={<ProfilePage user={user} />} />
            <Route path="/team" element={<TeamPage user={user} company={company} />} />
            <Route path="/settings" element={<SettingsPage user={user} />} />
          </Routes>
        </main>
      </div>
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
