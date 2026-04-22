import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { UserProfile, Company } from '../types';
import { toast } from 'sonner';
import { Bell, Clock, Globe, Copy, Check, Layout, Plus, Trash2, GripVertical, Edit3, User as UserIcon, Mail, ShieldCheck, DollarSign, FileCheck, X, CheckSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserRole, Permission } from '../types';

const ALL_PERMISSIONS: { id: Permission; label: string; category: string }[] = [
  { id: 'leads:view', label: 'View Leads', category: 'Leads' },
  { id: 'leads:edit', label: 'Edit Leads', category: 'Leads' },
  { id: 'leads:delete', label: 'Delete Leads', category: 'Leads' },
  { id: 'leads:assign', label: 'Assign Leads', category: 'Leads' },
  { id: 'tasks:view', label: 'View Tasks', category: 'Tasks' },
  { id: 'tasks:edit', label: 'Edit Tasks', category: 'Tasks' },
  { id: 'tasks:delete', label: 'Delete Tasks', category: 'Tasks' },
  { id: 'tasks:assign', label: 'Assign Tasks', category: 'Tasks' },
  { id: 'team:view', label: 'View Team', category: 'Team' },
  { id: 'team:manage', label: 'Manage Team', category: 'Team' },
  { id: 'team:invite', label: 'Invite Members', category: 'Team' },
  { id: 'finance:view', label: 'View Finance', category: 'Finance' },
  { id: 'finance:manage', label: 'Manage Finance', category: 'Finance' },
  { id: 'settings:company', label: 'Company Settings', category: 'Settings' },
  { id: 'settings:security', label: 'Security Settings', category: 'Settings' },
];

const ROLES: UserRole[] = ['admin', 'manager', 'team_lead', 'sales'];

export default function SettingsPage({ user }: { user: UserProfile }) {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeRoleTab, setActiveRoleTab] = useState<UserRole>('admin');
  const [newPolicy, setNewPolicy] = useState('');

  useEffect(() => {
    if (user.role !== 'admin' && user.role !== 'manager') return;
    const unsub = onSnapshot(doc(db, 'companies', user.companyId), (snap) => {
      if (snap.exists()) {
        setCompany({ id: snap.id, ...snap.data() } as Company);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [user.companyId]);

  const updateSettings = async (updates: Partial<Company['notificationSettings']>) => {
    if (!company) return;
    try {
      const currentSettings = company.notificationSettings || { enabled: true, dueSoonHours: 24 };
      await updateDoc(doc(db, 'companies', company.id), {
        notificationSettings: {
          ...currentSettings,
          ...updates
        }
      });
      toast.success('Settings updated');
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  const updateStatuses = async (newStatuses: string[]) => {
    if (!company) return;
    try {
      await updateDoc(doc(db, 'companies', company.id), {
        taskStatuses: newStatuses
      });
      toast.success('Task statuses updated');
    } catch (error) {
      toast.error('Failed to update statuses');
    }
  };

  const addStatus = () => {
    const defaultStatuses = company?.taskStatuses || ['Todo', 'In Progress', 'Done'];
    const newStatus = prompt('Enter new status name:');
    if (newStatus && !defaultStatuses.includes(newStatus)) {
      updateStatuses([...defaultStatuses, newStatus]);
    } else if (newStatus) {
      toast.error('Status already exists or invalid');
    }
  };

  const removeStatus = (status: string) => {
    const currentStatuses = company?.taskStatuses || ['Todo', 'In Progress', 'Done'];
    if (currentStatuses.length <= 1) {
      toast.error('Must have at least one status');
      return;
    }
    if (confirm(`Removing "${status}" will affect tasks assigned to this status. Continue?`)) {
      updateStatuses(currentStatuses.filter(s => s !== status));
    }
  };

  const renameStatus = (oldStatus: string) => {
    const currentStatuses = company?.taskStatuses || ['Todo', 'In Progress', 'Done'];
    const newName = prompt(`Rename "${oldStatus}" to:`, oldStatus);
    if (newName && newName !== oldStatus && !currentStatuses.includes(newName)) {
      updateStatuses(currentStatuses.map(s => s === oldStatus ? newName : s));
    } else if (newName && newName !== oldStatus) {
      toast.error('Status name already exists or invalid');
    }
  };

  const copyUrl = () => {
    const url = `${window.location.origin}/submit-lead/${user.companyId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('URL copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const updateCompanyInfo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!company) return;
    const formData = new FormData(e.currentTarget);
    const updates = {
      name: formData.get('name') as string,
      website: formData.get('website') as string,
      phone: formData.get('phone') as string,
      industry: formData.get('industry') as string,
      address: formData.get('address') as string,
      logoUrl: formData.get('logoUrl') as string,
      description: formData.get('description') as string,
      currency: formData.get('currency') as string,
    };

    try {
      await updateDoc(doc(db, 'companies', company.id), updates);
      toast.success('Company information updated');
    } catch (error) {
      toast.error('Failed to update company info');
    }
  };

  const togglePermission = async (role: UserRole, permission: Permission) => {
    if (!company) return;
    const currentPerms = company.rolePermissions || ({} as Record<UserRole, Permission[]>);
    const rolePerms = currentPerms[role] || [];
    
    let updatedRolePerms: Permission[];
    if (rolePerms.includes(permission)) {
      updatedRolePerms = rolePerms.filter(p => p !== permission);
    } else {
      updatedRolePerms = [...rolePerms, permission];
    }

    try {
      await updateDoc(doc(db, 'companies', company.id), {
        [`rolePermissions.${role}`]: updatedRolePerms
      });
      toast.success(`${permission} status updated for ${role}`);
    } catch (error) {
      toast.error('Failed to update permissions');
    }
  };

  const addPolicy = async () => {
    if (!company || !newPolicy.trim()) return;
    const currentPolicies = company.policies || [];
    if (currentPolicies.includes(newPolicy.trim())) {
      toast.error('Policy already exists');
      return;
    }

    try {
      await updateDoc(doc(db, 'companies', company.id), {
        policies: [...currentPolicies, newPolicy.trim()]
      });
      setNewPolicy('');
      toast.success('Policy added');
    } catch (error) {
      toast.error('Failed to add policy');
    }
  };

  const removePolicy = async (policy: string) => {
    if (!company) return;
    try {
      await updateDoc(doc(db, 'companies', company.id), {
        policies: (company.policies || []).filter(p => p !== policy)
      });
      toast.success('Policy removed');
    } catch (error) {
      toast.error('Failed to remove policy');
    }
  };

  if (user.role !== 'admin' && user.role !== 'manager') {
    return (
      <div className="p-8 text-center text-slate-500">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  if (loading) return <div className="p-8 text-center text-slate-500">Loading settings...</div>;

  return (
    <div className="space-y-8 max-w-4xl pb-20">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
        <p className="text-slate-500">Manage your agency preferences and integrations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Company Information */}
        <section className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6 md:col-span-2">
          <div className="flex items-center space-x-3 text-slate-900 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <UserIcon size={20} />
            </div>
            <h3 className="text-lg font-bold">Company Profile</h3>
          </div>
          
          <div className="mb-8 p-6 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
              <Mail size={120} />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h4 className="text-blue-400 font-black text-xs uppercase tracking-[0.2em] mb-1">General Workspace Invite</h4>
                <p className="text-slate-400 text-sm leading-relaxed max-w-md">
                  Share this master code to let team members join as <span className="text-blue-300 font-bold">'Sales'</span> automatically.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="px-6 py-3 bg-slate-800 text-white font-mono font-black text-xl rounded-xl border border-slate-700 tracking-[0.3em] shadow-inner select-all">
                  {company?.inviteCode || 'N/A'}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (company?.inviteCode) {
                      navigator.clipboard.writeText(company.inviteCode);
                      toast.success('Invite code copied to clipboard');
                    }
                  }}
                  className="p-3.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                  title="Copy Code"
                >
                  <Copy size={20} />
                </button>
              </div>
            </div>
          </div>

          <form onSubmit={updateCompanyInfo} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Company Name</label>
              <input
                name="name"
                defaultValue={company?.name}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
                placeholder="Nexvoura Solutions"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Website</label>
              <input
                name="website"
                defaultValue={company?.website}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
                placeholder="https://nexvoura.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Phone Number</label>
              <input
                name="phone"
                defaultValue={company?.phone}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
                placeholder="+1 234 567 890"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Industry</label>
              <input
                name="industry"
                defaultValue={company?.industry}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
                placeholder="e.g. Marketing, SaaS"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Office Address</label>
              <input
                name="address"
                defaultValue={company?.address}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
                placeholder="123 business St, City"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Company Logo URL</label>
              <input
                name="logoUrl"
                defaultValue={company?.logoUrl}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
                placeholder="https://example.com/logo.png"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bio / Description</label>
              <textarea
                name="description"
                defaultValue={company?.description}
                rows={3}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium resize-none"
                placeholder="Briefly describe your agency..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Currency Symbol</label>
              <input
                name="currency"
                defaultValue={company?.currency || '$'}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
                placeholder="$"
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
              >
                Save Profile
              </button>
            </div>
          </form>
        </section>

        {/* Role & Permission Management */}
        <section className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6 md:col-span-2">
          <div className="flex items-center space-x-3 text-slate-900 mb-2">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <ShieldCheck size={20} />
            </div>
            <h3 className="text-lg font-bold">Role & Permissions</h3>
          </div>
          <p className="text-sm text-slate-500">
            Define what each operative level can access and modify within the workspace.
          </p>

          <div className="flex space-x-1 p-1 bg-slate-100 rounded-xl mb-6 overflow-x-auto">
            {ROLES.map((role) => (
              <button
                key={role}
                onClick={() => setActiveRoleTab(role)}
                className={`px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  activeRoleTab === role
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {role.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from(new Set(ALL_PERMISSIONS.map(p => p.category))).map(category => (
              <div key={category} className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{category}</h4>
                <div className="space-y-2">
                  {ALL_PERMISSIONS.filter(p => p.category === category).map(permission => {
                    const isGranted = (company?.rolePermissions?.[activeRoleTab] || []).includes(permission.id);
                    return (
                      <button
                        key={permission.id}
                        onClick={() => togglePermission(activeRoleTab, permission.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                          isGranted 
                            ? 'bg-indigo-50 border-indigo-100 text-indigo-700' 
                            : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-xs font-bold">{permission.label}</span>
                        {isGranted ? <CheckSquare size={16} /> : <X size={16} className="opacity-30" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Company Policies */}
        <section className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6 md:col-span-2">
          <div className="flex items-center space-x-3 text-slate-900 mb-2">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <FileCheck size={20} />
            </div>
            <h3 className="text-lg font-bold">Company Policies</h3>
          </div>
          <p className="text-sm text-slate-500">
            Internal rules and guidelines for your agency. These will be visible to all members.
          </p>

          <div className="flex gap-2">
            <input
              value={newPolicy}
              onChange={(e) => setNewPolicy(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addPolicy()}
              className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm font-medium"
              placeholder="e.g. Leave must be filed 3 days in advance"
            />
            <button
              onClick={addPolicy}
              className="px-6 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20"
            >
              Add Policy
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <AnimatePresence>
              {(company?.policies || []).map((policy) => (
                <motion.div
                  key={policy}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center justify-between p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl group"
                >
                  <p className="text-sm font-medium text-slate-700">{policy}</p>
                  <button
                    onClick={() => removePolicy(policy)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            {(!company?.policies || company.policies.length === 0) && (
              <div className="md:col-span-2 py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-sm text-slate-400 italic">No policies active yet.</p>
              </div>
            )}
          </div>
        </section>

        {/* Task Board Configuration */}
        <section className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3 text-slate-900">
              <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                <Layout size={20} />
              </div>
              <h3 className="text-lg font-bold">Task Board Columns</h3>
            </div>
            <button
              onClick={addStatus}
              className="p-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all shadow-md shadow-slate-200"
            >
              <Plus size={16} />
            </button>
          </div>
          <p className="text-sm text-slate-500">
            Customize the workflow of your project board. Add, remove, or rename columns.
          </p>
          
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {(company?.taskStatuses || ['Todo', 'In Progress', 'Done']).map((status, index) => (
                <motion.div
                  key={status}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl group"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-5 h-5 flex items-center justify-center bg-slate-200 text-slate-500 text-[10px] font-bold rounded-md">
                      {index + 1}
                    </span>
                    <span className="text-sm font-bold text-slate-700">{status}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => renameStatus(status)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => removeStatus(status)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>

        {/* Public Lead Lead Form */}
        <section className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center space-x-3 text-slate-900 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Globe size={20} />
            </div>
            <h3 className="text-lg font-bold">Public Lead Form</h3>
          </div>
          <p className="text-sm text-slate-500">
            Share this URL with clients or embed it in your website to receive leads directly in Nexvoura.
          </p>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between group">
            <code className="text-blue-600 font-mono text-xs truncate mr-4">
              {window.location.origin}/submit-lead/{user.companyId}
            </code>
            <button
              onClick={copyUrl}
              className="flex-shrink-0 p-2 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-slate-900 border border-transparent hover:border-slate-200"
            >
              {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
            </button>
          </div>
        </section>

        {/* Task Notification Settings */}
        <section className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center space-x-3 text-slate-900 mb-2">
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Bell size={20} />
            </div>
            <h3 className="text-lg font-bold">Task Notifications</h3>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div>
              <p className="font-bold text-slate-800">Email Alerts</p>
              <p className="text-xs text-slate-500">Receive an email when a task is due soon.</p>
            </div>
            <button
              onClick={() => updateSettings({ enabled: !(company?.notificationSettings?.enabled ?? true) })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                (company?.notificationSettings?.enabled ?? true) ? 'bg-blue-600' : 'bg-slate-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  (company?.notificationSettings?.enabled ?? true) ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm font-bold text-slate-700">
                <Clock size={16} />
                <span>Notify me before</span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="1"
                  max="168"
                  className="w-16 p-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                  value={company?.notificationSettings?.dueSoonHours ?? 24}
                  onChange={(e) => updateSettings({ dueSoonHours: parseInt(e.target.value) || 24 })}
                  disabled={!(company?.notificationSettings?.enabled ?? true)}
                />
                <span className="text-sm font-medium text-slate-500">hours</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400">
              Set how many hours before the deadline you want to be notified. Max 168h (1 week).
            </p>
          </div>
        </section>
      </div>

      <section className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl overflow-hidden relative">
        <div className="relative z-10">
          <h3 className="text-xl font-bold mb-2">Agency Branding</h3>
          <p className="text-slate-400 mb-6 text-sm max-w-lg">
            Nexvoura for Agencies is built for scale. Customize your workspace, add team members, and automate lead follow-ups.
          </p>
          <div className="flex items-center space-x-4">
             <div className="px-4 py-2 bg-white/10 rounded-lg text-xs font-bold border border-white/10">Plan: Enterprise</div>
             <div className="px-4 py-2 bg-white/10 rounded-lg text-xs font-bold border border-white/10">Users: Unlimited</div>
          </div>
        </div>
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Globe size={160} />
        </div>
      </section>
    </div>
  );
}
