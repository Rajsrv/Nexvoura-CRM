import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signOut, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, onSnapshot, addDoc, getDocs, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { handleFirestoreError, OperationType } from './lib/firestore';
import { UserProfile, Company, Invite, Lead, Task, AccessRequest, UserRole, Attendance } from './types';
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
  Briefcase,
  Check,
  Loader2
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
import HRManagementPage from './components/HRManagementPage';
import AttendancePage from './components/AttendancePage';
import LeadForm from './components/LeadForm';
import TasksPage from './components/TasksPage';
import SettingsPage from './components/SettingsPage';
import ProfilePage from './components/ProfilePage';
import { PermissionsPage } from './components/PermissionsPage';

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
    { name: 'HR Management', path: '/hr', icon: Briefcase, roles: ['admin', 'manager'] },
    { name: 'Attendance', path: '/attendance', icon: Clock },
    { name: 'Payroll', path: '/payroll', icon: Wallet, roles: ['admin'] },
    { name: 'Permissions', path: '/permissions', icon: Shield },
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

      <aside className={`w-80 bg-white border-r border-slate-200/60 h-screen fixed left-0 top-0 flex flex-col z-50 transition-all duration-300 ease-in-out transform ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="relative flex flex-col h-full z-10">
          <div className="p-6 flex items-center justify-between">
            <h1 className="text-2xl font-black font-display tracking-tight flex items-center space-x-2">
              <span className="text-brand-primary italic">Nex</span>
              <span className="text-slate-900">voura</span>
            </h1>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-2 text-slate-400 hover:text-slate-900 rounded-xl hover:bg-slate-100 lg:hidden transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="flex-1 px-3 space-y-6 overflow-y-auto custom-scrollbar pt-2">
            <div className="space-y-1">
              <p className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Main Menu</p>
              {filteredNavItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-xl transition-all group relative ${
                      isActive 
                        ? 'bg-brand-primary/5 text-brand-primary' 
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <item.icon size={18} className={`${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
                    <span className="text-sm font-semibold tracking-tight">
                      {item.name}
                    </span>
                    {isActive && (
                      <motion.div 
                        layoutId="activeTabIndicator"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-brand-primary rounded-r-full"
                      />
                    )}
                  </Link>
                );
              })}
            </div>

            <div className="space-y-1">
              <p className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Operations</p>
              <div className="space-y-1">
                {filteredTrackingItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center space-x-3 px-3 py-2 rounded-xl transition-all group relative ${
                        isActive 
                          ? 'bg-brand-primary/5 text-brand-primary' 
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <item.icon size={18} className={`${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
                      <span className="text-sm font-semibold tracking-tight">
                        {item.name}
                      </span>
                      {isActive && (
                        <motion.div 
                          layoutId="activeTabIndicatorTrack"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-brand-primary rounded-r-full"
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>

          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center space-x-3 p-2 group cursor-pointer hover:bg-white hover:shadow-soft hover:border-slate-200 border border-transparent rounded-2xl transition-all">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-600 border border-slate-200 overflow-hidden shrink-0">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  user.name[0]
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 truncate leading-tight">{user.name}</p>
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">{user.role}</p>
              </div>
              <button 
                onClick={() => signOut(auth)}
                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                title="Sign Out"
              >
                <LogOut size={16} />
              </button>
            </div>
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
  <header className="h-20 flex items-center justify-between px-6 lg:px-10 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 sticky top-0 z-40 transition-all">
    <div className="flex items-center space-x-6">
      <button 
        onClick={onToggleSidebar}
        className="p-3 text-slate-500 hover:bg-slate-100 rounded-2xl lg:hidden transition-all active:scale-95 border border-transparent hover:border-slate-200"
      >
        <Menu size={20} />
      </button>
      <div className="hidden sm:flex items-center space-x-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
           <LayoutDashboard size={20} />
        </div>
        <div>
          <h2 className="text-sm font-black text-slate-900 tracking-tight leading-none">
            {company?.name || 'Nexvoura'}
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Command Center</p>
        </div>
      </div>
    </div>
    
    <div className="flex items-center space-x-4 sm:space-x-8">
      <div className="hidden lg:flex items-center bg-slate-100/50 border border-slate-200/60 rounded-2xl px-4 py-2 hover:bg-white hover:shadow-xl hover:shadow-slate-200/20 focus-within:bg-white focus-within:shadow-xl focus-within:shadow-indigo-100 focus-within:border-indigo-200 transition-all group">
        <Search size={16} className="text-slate-400 mr-3 group-focus-within:text-indigo-600 transition-colors" />
        <input 
          type="text" 
          placeholder="Search transmissions..." 
          className="bg-transparent border-none outline-none text-xs w-64 lg:w-80 font-semibold text-slate-900 placeholder:text-slate-400" 
        />
        <div className="text-[10px] font-black text-slate-300 ml-2 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">⌘K</div>
      </div>

      <div className="flex items-center space-x-4">
        <NotificationCenter user={user} />
        <div className="w-px h-6 bg-slate-200/60 hidden sm:block" />
        
        <Link to="/profile" className="flex items-center space-x-4 group">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-black text-slate-900 leading-none group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{user.name}</p>
            <div className="flex items-center justify-end space-x-1 mt-1">
               <Shield size={10} className="text-indigo-500" />
               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{user.role}</p>
            </div>
          </div>
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 p-0.5 shadow-sm group-hover:border-indigo-400 group-hover:shadow-lg group-hover:shadow-indigo-100 transition-all overflow-hidden">
               <div className="w-full h-full rounded-[14px] bg-slate-50 flex items-center justify-center overflow-hidden">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-sm font-black text-slate-400">{user.name[0]}</span>
                )}
               </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
          </div>
        </Link>
      </div>
    </div>
  </header>
);

// --- Pages ---

const Dashboard = ({ user }: { user: UserProfile }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, new: 0, converted: 0 });
  const [reminders, setReminders] = useState<Task[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isClocking, setIsClocking] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);

  useEffect(() => {
    let leadsQ = query(collection(db, 'leads'), where('companyId', '==', user.companyId));
    let tasksQ = query(
      collection(db, 'tasks'),
      where('companyId', '==', user.companyId),
      where('status', '!=', 'Done')
    );

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

    const today = format(new Date(), 'yyyy-MM-dd');
    const attQ = query(
      collection(db, 'attendance'),
      where('employeeId', '==', user.uid),
      where('date', '==', today)
    );
    const unsubAtt = onSnapshot(attQ, (snap) => {
      setTodayAttendance(snap.docs[0] ? { id: snap.docs[0].id, ...snap.docs[0].data() } as Attendance : null);
    });

    return () => {
      unsubLeads();
      unsubTasks();
      unsubAtt();
    };
  }, [user.companyId, user.role, user.uid]);

  const handleClockAction = async () => {
    setIsClocking(true);
    try {
      const now = new Date().toISOString();
      const today = format(new Date(), 'yyyy-MM-dd');

      if (!todayAttendance) {
        // Clock In
        await addDoc(collection(db, 'attendance'), {
          companyId: user.companyId,
          employeeId: user.uid,
          employeeName: user.name,
          date: today,
          checkIn: now,
          status: 'On-time',
          createdAt: now
        });
        toast.success('Shift started. Good luck out there!');
      } else if (!todayAttendance.checkOut) {
        // Clock Out
        await updateDoc(doc(db, 'attendance', todayAttendance.id), {
          checkOut: now
        });
        toast.success('Shift ended. Rest up!');
      }
    } catch (error) {
      toast.error('Sync failed with neural link.');
    } finally {
      setIsClocking(false);
    }
  };

  const analyticsData = [
    { name: 'Wordpress', value: leads.filter(l => l.service === 'WordPress').length },
    { name: 'Shopify', value: leads.filter(l => l.service === 'Shopify').length },
    { name: 'Custom Dev', value: leads.filter(l => l.service === 'Custom Development').length },
  ];

  const statusData = [
    { name: 'New', value: stats.new, color: '#6366f1' },
    { name: 'Contacted', value: leads.filter(l => l.status === 'Contacted').length, color: '#f59e0b' },
    { name: 'Converted', value: stats.converted, color: '#10b981' },
  ];

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899'];

  return (
    <div className="max-w-[1600px] mx-auto space-y-12 animate-in fade-in duration-500">
      {/* Welcome & Quick Action */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-white p-10 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-bl-[160px] -z-10" />
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-black text-slate-950 tracking-tighter italic">
            Welcome, <span className="text-indigo-600 underline decoration-indigo-200 underline-offset-8 decoration-4">{user.name.split(' ')[0]}</span>
          </h1>
          <p className="text-slate-500 font-medium">Neural systems operational. {reminders.length} tasks require focus.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button 
            onClick={handleClockAction}
            disabled={isClocking || (!!todayAttendance && !!todayAttendance.checkOut)}
            className={`group flex items-center space-x-3 px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95 disabled:opacity-50 ${
              !todayAttendance 
                ? 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-slate-950' 
                : !todayAttendance.checkOut 
                  ? 'bg-rose-500 text-white shadow-rose-200 hover:bg-rose-600'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
            }`}
          >
            <Clock size={18} className={!todayAttendance || !todayAttendance.checkOut ? 'animate-pulse' : ''} />
            <span>
              {!todayAttendance ? 'Initialize Shift (Clock In)' : !todayAttendance.checkOut ? 'Terminate Shift (Clock Out)' : 'Shift Logged'}
            </span>
          </button>
          
          <button
            onClick={() => navigate('/tasks')}
            className="group flex items-center space-x-3 bg-slate-950 text-white px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 active:scale-95"
          >
            <LayoutDashboard size={18} />
            <span>Process Queue</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { label: 'Total Leads', value: stats.total, color: 'text-brand-primary', bg: 'bg-brand-primary/5', icon: MessageSquare },
          { label: 'New Opportunities', value: stats.new, color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
          { label: 'Successful Conversions', value: stats.converted, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
        ].map((stat) => (
          <div key={stat.label} className="saas-card saas-card-hover p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                <stat.icon size={20} />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Growth</span>
            </div>
            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="saas-card p-6">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold text-slate-900">Leads by Service</h3>
            <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
              <BarChartIcon size={18} />
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsData}>
                <XAxis dataKey="name" fontSize={11} fontWeight={600} axisLine={false} tickLine={false} tick={{fill: '#64748b'}} dy={10} />
                <YAxis hide />
                <ReChartsTooltip 
                  cursor={{fill: '#f1f5f9', radius: 8}}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={32}>
                  {analyticsData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="saas-card p-6">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold text-slate-900">Pipeline Status</h3>
            <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
              <RefreshCcw size={18} />
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ReChartsTooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px' }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  iconType="circle"
                  formatter={(value) => <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 saas-card p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-900">Critical Tasks</h3>
            {reminders.length > 0 && (
              <span className="px-3 py-1 bg-brand-danger/5 text-brand-danger text-[10px] font-bold uppercase rounded-full border border-brand-danger/10">
                Action Required
              </span>
            )}
          </div>
          
          {reminders.length > 0 ? (
            <div className="space-y-3">
              {reminders.map((task) => {
                const isOverdue = isPast(parseISO(task.dueDate)) && !isToday(parseISO(task.dueDate));
                return (
                  <div key={task.id} className="group flex items-center justify-between p-4 bg-slate-50/50 hover:bg-white rounded-2xl border border-transparent hover:border-slate-200 hover:shadow-soft transition-all duration-300">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isOverdue ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                        {isOverdue ? <AlertCircle size={18} /> : <Clock size={18} />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 group-hover:text-brand-primary transition-colors">{task.title}</p>
                        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mt-0.5">
                          {isOverdue ? 'Overdue' : 'Due'} • {format(parseISO(task.dueDate), 'MMM d')}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => navigate('/tasks')} className="p-2 text-slate-400 hover:text-brand-primary">
                      <ArrowRight size={18} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <CheckCircle size={40} className="mb-4 opacity-10" />
              <p className="text-sm font-medium">All tasks are up to date.</p>
            </div>
          )}
        </div>

        <div className="bg-brand-primary p-8 rounded-[24px] text-white overflow-hidden relative group">
          <div className="relative z-10 h-full flex flex-col">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6">
              <ShieldCheck size={28} />
            </div>
            <h3 className="text-xl font-bold font-display mb-3">Enterprise Security</h3>
            <p className="text-sm text-brand-primary-foreground/70 font-medium mb-8 flex-1">Your data is secured with banking-grade encryption and real-time monitoring.</p>
            <button 
              onClick={() => navigate('/settings')}
              className="w-full py-3 bg-white text-brand-primary rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
            >
              Review Security
            </button>
          </div>
          <Globe className="absolute -bottom-10 -right-10 w-48 h-48 text-white/5 group-hover:scale-110 transition-transform duration-1000" />
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
    <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Leads</h2>
          <p className="text-sm text-slate-500 mt-1">Manage and track your agency's incoming opportunities.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="saas-input pl-10 w-64"
            />
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="saas-button-primary flex items-center space-x-2"
          >
            <Plus size={18} />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      <div className="saas-card overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</span>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none"
            >
              <option value="All">All Stages</option>
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Converted">Converted</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Service</span>
            <select 
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none"
            >
              <option value="All">All Services</option>
              <option value="WordPress">WordPress</option>
              <option value="Shopify">Shopify</option>
              <option value="Custom Development">Custom Forge</option>
            </select>
          </div>
          {(user.role === 'admin' || user.role === 'manager') && (
            <button 
              onClick={exportLeadsToCSV}
              className="ml-auto text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center space-x-1"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Service</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assignee</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold group-hover:bg-brand-primary/10 group-hover:text-brand-primary transition-all">
                        {lead.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{lead.name}</p>
                        <p className="text-xs text-slate-500">{lead.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-slate-600 px-2 py-1 bg-slate-100 rounded-lg">{lead.service}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${
                      lead.status === 'Converted' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                      lead.status === 'Contacted' ? 'bg-indigo-50 text-brand-primary border border-brand-primary/10' :
                      'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {(user.role === 'admin' || user.role === 'manager') ? (
                      <select
                        className="text-sm bg-transparent border-none focus:ring-0 text-slate-600 font-semibold cursor-pointer hover:text-brand-primary transition-colors appearance-none"
                        value={lead.assignedTo || ''}
                        onChange={(e) => handleAssignLead(lead.id, e.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {team.map(member => (
                          <option key={member.uid} value={member.uid}>{member.name}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm font-medium text-slate-600">
                        {team.find(m => m.uid === lead.assignedTo)?.name || 'Unassigned'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-slate-400 hover:text-brand-primary transition-colors">
                      <ArrowRight size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {leads.length === 0 && !loading && (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-200">
                <Search size={32} />
              </div>
              <p className="text-slate-500 font-bold">No leads found</p>
              <p className="text-sm text-slate-400 mt-1">Try adjusting your filters or search query.</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-[24px] p-8 max-w-lg w-full shadow-2xl border border-slate-100"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Add New Lead</h3>
                  <p className="text-sm text-slate-500 mt-1">Register a new opportunity in the system.</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-2 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-50">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleAddLead} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Name</label>
                    <input
                      type="text"
                      required
                      className="saas-input"
                      value={newLead.name}
                      onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email</label>
                    <input
                      type="email"
                      required
                      className="saas-input"
                      value={newLead.email}
                      onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Phone</label>
                    <input
                      type="tel"
                      className="saas-input"
                      value={newLead.phone}
                      onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Service</label>
                    <select
                      className="saas-input"
                      value={newLead.service}
                      onChange={(e) => setNewLead({ ...newLead, service: e.target.value as any })}
                    >
                      <option value="WordPress">WordPress</option>
                      <option value="Shopify">Shopify</option>
                      <option value="Custom Development">Custom Forge</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Message</label>
                  <textarea
                    className="saas-input min-h-[100px] resize-none"
                    value={newLead.message}
                    onChange={(e) => setNewLead({ ...newLead, message: e.target.value })}
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-5 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-all border border-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 saas-button-primary"
                  >
                    Create Lead
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
        await updateProfile(user, { displayName: name });
        navigate('/setup-company', { state: { name } });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
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
      } else {
        toast.error('Google Login failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbfbfb] flex items-center justify-center p-6 sm:p-10 font-sans">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 bg-white rounded-[32px] overflow-hidden shadow-soft border border-slate-200/60 min-h-[640px]">
        {/* Decorative Column */}
        <div className="hidden lg:flex relative bg-slate-900 overflow-hidden flex-col justify-end p-12 text-white">
          <div className="absolute inset-0 z-0">
            <img 
              src="https://picsum.photos/seed/nexa/1200/800?blur=4" 
              alt="Context" 
              className="w-full h-full object-cover opacity-30 mix-blend-overlay"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
          </div>
          
          <div className="relative z-10 space-y-6">
            <div className="flex items-center space-x-2 mb-8">
              <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center font-black text-white shadow-lg shadow-brand-primary/20 italic">N</div>
              <span className="text-2xl font-black tracking-tighter italic">Nexvoura</span>
            </div>
            
            <h2 className="text-5xl font-bold leading-[1.1] tracking-tight">Smarter teams. <br/><span className="text-brand-primary">Better clients.</span></h2>
            <p className="text-slate-400 text-lg leading-relaxed font-medium">The comprehensive agency management suite for modern digital operations.</p>
            
            <div className="flex items-center space-x-8 pt-6">
              <div className="flex -space-x-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-950 overflow-hidden shadow-lg">
                    <img src={`https://i.pravatar.cc/150?u=${i}`} alt="user" referrerPolicy="no-referrer" />
                  </div>
                ))}
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Join 500+ top agencies</p>
            </div>
          </div>
        </div>

        {/* Form Column */}
        <div className="flex flex-col justify-center p-8 sm:p-16 lg:p-20 bg-white">
          <div className="max-w-sm w-full mx-auto space-y-8">
            <div className="flex justify-between items-center lg:hidden absolute top-10 left-10 right-10">
               <h1 className="text-xl font-black italic text-brand-primary">Nexvoura</h1>
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight">{isSignUp ? 'Create account' : 'Welcome back'}</h1>
              <p className="text-slate-500 font-medium leading-relaxed">
                {isSignUp ? 'Start your agency journey with the next-gen CRM.' : 'Access your pipelines and team workspace.'}
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-5">
              {isSignUp && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    className="saas-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email address</label>
                <input
                  type="email"
                  required
                  placeholder="john@example.com"
                  className="saas-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Password</label>
                  {!isSignUp && <button type="button" className="text-[10px] font-bold text-brand-primary hover:underline uppercase tracking-widest">Forgot?</button>}
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="saas-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full saas-button-primary mt-2 py-3 flex items-center justify-center space-x-2"
              >
                {loading && <Loader2 className="animate-spin" size={18} />}
                <span>{isSignUp ? 'Create account' : 'Sign in'}</span>
              </button>
            </form>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
              <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest bg-white px-4 text-slate-400">Or continue with</div>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-12 flex items-center justify-center space-x-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-95 px-6 group"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="text-sm font-bold text-slate-700">Google Workspace</span>
            </button>

            <p className="text-center text-sm font-medium text-slate-500">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button 
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-brand-primary font-bold hover:underline"
              >
                {isSignUp ? 'Sign in' : 'Create one'}
              </button>
            </p>
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
      <div className="min-h-screen bg-[#fbfbfb] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-[32px] shadow-soft p-12 text-center border border-slate-100"
        >
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <Check size={40} />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Workspace Ready</h2>
          <p className="text-slate-500 font-medium mt-2">Your agency workspace <span className="font-bold text-brand-primary">{name}</span> has been initialized.</p>
          <button
            onClick={() => navigate('/')}
            className="w-full saas-button-primary py-4 mt-8"
          >
            Enter Workspace
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfbfb] flex items-center justify-center p-6 md:p-12 lg:p-20 font-sans relative">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
        <div className="space-y-10 animate-in fade-in slide-in-from-left-8 duration-700">
          <div className="flex items-center space-x-2 text-brand-primary">
            <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center font-black italic text-brand-primary text-sm">N</div>
            <span className="text-sm font-bold uppercase tracking-widest">Nexvoura Setup</span>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-5xl md:text-6xl font-bold text-slate-900 tracking-tight leading-[1.1]">Initialize your <br /><span className="text-brand-primary">operations hub.</span></h2>
            <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-md">Every great agency starts with a solid foundation. Let's configure your workspace.</p>
          </div>
          
          <div className="space-y-8">
            {[
              { icon: Building2, label: 'Centralized Assets', desc: 'Securely manage leads, documents, and payroll in one place.' },
              { icon: Users, label: 'Team Collaboration', desc: 'Coordinate with your specialists through a unified dashboard.' },
            ].map((item, i) => (
              <div key={i} className="flex items-start space-x-5">
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-brand-primary">
                  <item.icon size={24} />
                </div>
                <div>
                  <p className="font-bold text-slate-900"> {item.label}</p>
                  <p className="text-sm text-slate-500 font-medium">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200/60 shadow-soft rounded-[40px] p-8 md:p-12 relative animate-in fade-in slide-in-from-right-8 duration-700">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Agency Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="saas-input text-lg font-semibold"
                placeholder="e.g. Design Foundry"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Industry</label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="saas-input"
                  placeholder="e.g. Creative Media"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="saas-input"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Company Website</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="saas-input"
                placeholder="https://youragency.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full saas-button-primary py-4 font-bold text-lg flex items-center justify-center space-x-2 shadow-lg shadow-brand-primary/20"
            >
              <span>{loading ? 'Initializing Hub...' : 'Create My Workspace'}</span>
              {!loading && <ArrowRight size={20} />}
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
    <div className="flex bg-slate-50 min-h-screen relative overflow-x-hidden">
      <Sidebar user={user} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      <main className="flex-1 lg:ml-80 min-h-screen flex flex-col relative w-full overflow-hidden">
        <Header user={user} company={company} onToggleSidebar={() => setIsSidebarOpen(true)} />
        
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 xl:px-10 md:py-8 lg:py-10 relative z-10 scroll-smooth">
          <Routes>
            <Route path="/" element={<Dashboard user={user} />} />
            <Route path="/leads" element={<LeadsPage user={user} />} />
            <Route path="/tasks" element={<TasksPage user={user} />} />
            <Route path="/profile" element={<ProfilePage user={user} />} />
            <Route path="/employees" element={<EmployeesPage user={user} company={company} />} />
            <Route path="/hr" element={<HRManagementPage user={user} company={company} />} />
            <Route path="/attendance" element={company ? <AttendancePage user={user} /> : <Navigate to="/settings" />} />
            <Route path="/payroll" element={<PayrollPage user={user} company={company} />} />
            <Route path="/permissions" element={<PermissionsPage user={user} />} />
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
