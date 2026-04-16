import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useParams } from 'react-router-dom';
import { onAuthStateChanged, signOut, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, onSnapshot, addDoc, getDocs, updateDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { UserProfile, Company, Invite, Lead, Task } from './types';
import { LayoutDashboard, Users, MessageSquare, Settings, LogOut, Plus, Search, Filter, Menu, X, CheckSquare, Bell, AlertCircle, Clock as ClockIcon, Download } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { format, isPast, isToday, isBefore, addDays, parseISO } from 'date-fns';

import TeamPage from './components/TeamPage';
import LeadForm from './components/LeadForm';
import TasksPage from './components/TasksPage';
import SettingsPage from './components/SettingsPage';

// --- Components ---

const Sidebar = ({ user, isOpen, setIsOpen }: { user: UserProfile; isOpen: boolean; setIsOpen: (val: boolean) => void }) => {
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Leads', path: '/leads', icon: MessageSquare },
    { name: 'Tasks', path: '/tasks', icon: CheckSquare },
    { name: 'Team', path: '/team', icon: Users },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

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
            NexusCRM
          </h1>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 lg:hidden transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-2 mt-4">
          {navItems.map((item) => (
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
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center font-black text-white shadow-lg shadow-blue-500/20">
              {user.name[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{user.name}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{user.role}</p>
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
                              {isOverdue ? <AlertCircle size={14} /> : <ClockIcon size={14} />}
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

const Header = ({ user, onToggleSidebar }: { user: UserProfile; onToggleSidebar: () => void }) => (
  <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30">
    <div className="flex items-center space-x-4">
      <button 
        onClick={onToggleSidebar}
        className="p-2.5 text-slate-600 hover:bg-slate-100 rounded-xl lg:hidden transition-all"
      >
        <Menu size={24} />
      </button>
      <div className="hidden sm:block">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Bonjour, {user.name.split(' ')[0]}</h2>
        <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {user.role} Account
        </p>
      </div>
      <h1 className="text-xl font-black bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent sm:hidden">
        Nexus
      </h1>
    </div>
    <div className="flex items-center space-x-2 md:space-x-4">
      <NotificationCenter user={user} />
      <div className="h-8 w-px bg-slate-100 mx-2 hidden md:block" />
      <div className="flex items-center space-x-2 md:space-x-3">
        <div className="hidden md:block text-right">
          <p className="text-xs font-black text-slate-900 leading-none mb-0.5">{user.name}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Agency Admin</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-black shadow-inner">
          {user.name[0]}
        </div>
      </div>
    </div>
  </header>
);

// --- Pages ---

const Dashboard = ({ user }: { user: UserProfile }) => {
  const [stats, setStats] = useState({ total: 0, new: 0, converted: 0 });
  const [reminders, setReminders] = useState<Task[]>([]);

  useEffect(() => {
    const leadsQ = query(collection(db, 'leads'), where('companyId', '==', user.companyId));
    const tasksQ = query(
      collection(db, 'tasks'),
      where('companyId', '==', user.companyId),
      where('status', '!=', 'Done')
    );

    const unsubLeads = onSnapshot(leadsQ, (snapshot) => {
      const leads = snapshot.docs.map(doc => doc.data());
      setStats({
        total: leads.length,
        new: leads.filter(l => l.status === 'New').length,
        converted: leads.filter(l => l.status === 'Converted').length
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

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Leads', value: stats.total, color: 'bg-blue-500' },
          { label: 'New Leads', value: stats.new, color: 'bg-emerald-500' },
          { label: 'Converted', value: stats.converted, color: 'bg-indigo-500' },
        ].map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
          >
            <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-2">{stat.value}</h3>
            <div className={`h-1 w-12 mt-4 rounded-full ${stat.color}`} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                        {isOverdue ? <AlertCircle size={16} /> : <ClockIcon size={16} />}
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
  const [newLead, setNewLead] = useState({ name: '', email: '', service: 'WordPress' as any });

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
      setNewLead({ name: '', email: '', service: 'WordPress' });
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Leads Management</h2>
        <div className="flex items-center space-x-3">
          <button
            onClick={exportLeadsToCSV}
            className="bg-white text-slate-600 border border-slate-200 px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-slate-50 transition-colors"
          >
            <Download size={20} />
            <span>Export CSV</span>
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Service</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned To</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.map((lead) => (
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
      </div>

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
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Lead Name</label>
                  <input
                    type="text"
                    required
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    value={newLead.name}
                    onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
                  <input
                    type="email"
                    required
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    value={newLead.email}
                    onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Service</label>
                  <select
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                    value={newLead.service}
                    onChange={(e) => setNewLead({ ...newLead, service: e.target.value as any })}
                  >
                    <option>WordPress</option>
                    <option>Shopify</option>
                    <option>Custom Development</option>
                  </select>
                </div>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 p-4 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    className="flex-1 bg-blue-600 text-white p-4 rounded-xl font-bold hover:bg-blue-700 transition-all"
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

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        // New user - need to setup company
        navigate('/setup-company');
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error(error);
      toast.error('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 space-y-8"
      >
        <div className="text-center">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">NexusCRM</h1>
          <p className="text-slate-500 mt-2">The ultimate CRM for web agencies</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center space-x-3 bg-white border border-slate-200 p-4 rounded-xl hover:bg-slate-50 transition-all font-medium text-slate-700 shadow-sm"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            <span>{loading ? 'Connecting...' : 'Continue with Google'}</span>
          </button>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400">Or</span>
            </div>
          </div>

          <button
            onClick={() => {
              const code = prompt('Enter invite code:');
              if (code) navigate(`/join/${code}`);
            }}
            className="w-full flex items-center justify-center space-x-3 bg-slate-50 border border-slate-100 p-4 rounded-xl hover:bg-slate-100 transition-all font-medium text-slate-600 shadow-sm"
          >
            <Users size={20} />
            <span>Join Existing Workspace</span>
          </button>
        </div>

        <p className="text-center text-xs text-slate-400">
          By continuing, you agree to our Terms of Service and Privacy Policy.
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

  useEffect(() => {
    const validateToken = async () => {
      try {
        const q = query(collection(db, 'invites'), where('token', '==', token), where('status', '==', 'pending'));
        const snap = await getDocs(q);
        if (snap.empty) {
          toast.error('Invalid or expired invite token.');
          navigate('/login');
          return;
        }
        const inviteData = { id: snap.docs[0].id, ...snap.docs[0].data() } as Invite;
        setInvite(inviteData);

        const compSnap = await getDoc(doc(db, 'companies', inviteData.companyId));
        if (compSnap.exists()) {
          setCompany({ id: compSnap.id, ...compSnap.data() } as Company);
        }
      } catch (error) {
        console.error(error);
        toast.error('Error validating invite.');
      } finally {
        setLoading(false);
      }
    };
    validateToken();
  }, [token, navigate]);

  const handleJoin = async () => {
    if (!invite || !user) return;
    setJoining(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        companyId: invite.companyId,
        role: invite.role,
        createdAt: new Date().toISOString()
      });
      await updateDoc(doc(db, 'invites', invite.id), { status: 'accepted' });
      toast.success(`Welcome to ${company?.name}!`);
      window.location.href = '/'; // Force reload to refresh profile
    } catch (error) {
      console.error(error);
      toast.error('Failed to join workspace.');
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
          {joining ? 'Joining...' : `Join ${company?.name}`}
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
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setLoading(true);
    try {
      const companyId = crypto.randomUUID();
      await setDoc(doc(db, 'companies', companyId), {
        name,
        createdAt: new Date().toISOString(),
        notificationSettings: {
          enabled: true,
          dueSoonHours: 24
        }
      });
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        companyId,
        role: 'admin',
        createdAt: new Date().toISOString()
      });
      setSuccess(true);
      toast.success('Company setup complete!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to setup company.');
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
            onClick={() => window.location.href = '/'}
            className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold hover:bg-blue-700 transition-all"
          >
            Enter Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900">Setup Your Company</h2>
          <p className="text-slate-500 mt-2">Create your tenant workspace</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Company Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="e.g. Acme Web Solutions"
            />
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
  const { pathname } = useParams(); // Using useLocation might be better but let's stick to what's available

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar user={user} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className="flex-1 lg:ml-72 min-w-0 transition-all duration-300">
        <Header user={user} onToggleSidebar={() => setIsSidebarOpen(true)} />
        <main className="p-4 md:p-8 max-w-7xl mx-auto">
          <Routes>
            <Route path="/" element={<Dashboard user={user} />} />
            <Route path="/leads" element={<LeadsPage user={user} />} />
            <Route path="/tasks" element={<TasksPage user={user} />} />
            <Route path="/team" element={<TeamPage user={user} />} />
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
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const docRef = doc(db, 'users', u.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            setProfile(null);
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/setup-company" element={user && !profile ? <SetupCompany user={user} /> : <Navigate to="/" />} />
        <Route path="/join/:token" element={user ? <JoinWorkspace user={user} /> : <Navigate to="/login" />} />
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
    </Router>
  );
}
