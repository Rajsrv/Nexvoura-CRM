import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { UserProfile, Company } from '../types';
import { toast } from 'sonner';
import { Bell, Clock, Globe, Copy, Check, Layout, Plus, Trash2, GripVertical, Edit3, User as UserIcon, Mail, ShieldCheck, DollarSign, FileCheck, X, CheckSquare, Sun, Moon, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserRole, Permission } from '../types';
import { useTheme } from '../contexts/ThemeContext';

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

function AppearanceSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <section className="saas-card p-10 space-y-6 lg:col-span-2">
      <div className="flex items-center space-x-3 text-slate-900 dark:text-white mb-2">
        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
          <Layout size={20} />
        </div>
        <h3 className="text-xl font-bold">Appearance</h3>
      </div>
      <p className="text-sm text-slate-500 dark:text-dark-text-muted">
        Customize how Nexvoura looks on your device. This preference is saved locally.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        <button
          onClick={() => setTheme('light')}
          className={`flex items-center justify-between p-6 rounded-2xl border transition-all ${
            theme === 'light' 
              ? 'bg-slate-50 dark:bg-slate-800 border-indigo-200 dark:border-indigo-500/50 ring-4 ring-indigo-500/5' 
              : 'bg-white dark:bg-dark-bg border-slate-100 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-xl ${theme === 'light' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
              <Sun size={20} />
            </div>
            <div className="text-left">
              <span className={`block text-sm font-bold ${theme === 'light' ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-dark-text-muted'}`}>Light Mode</span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Standard workspace view</span>
            </div>
          </div>
          {theme === 'light' && <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white scale-110 shadow-lg shadow-indigo-500/20 transition-all"><Check size={14} /></div>}
        </button>

        <button
          onClick={() => setTheme('dark')}
          className={`flex items-center justify-between p-6 rounded-2xl border transition-all ${
            theme === 'dark' 
              ? 'bg-slate-900 border-indigo-500/50 ring-4 ring-indigo-500/5' 
              : 'bg-white dark:bg-dark-bg border-slate-100 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
              <Moon size={20} />
            </div>
            <div className="text-left">
              <span className={`block text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-600 dark:text-dark-text-muted'}`}>Dark Mode</span>
              <span className="text-[10px] text-slate-500 mt-0.5 block">Better for night operations</span>
            </div>
          </div>
          {theme === 'dark' && <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white scale-110 shadow-lg shadow-indigo-500/20 transition-all"><Check size={14} /></div>}
        </button>
      </div>
    </section>
  );
}

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
      subdomain: (formData.get('subdomain') as string)?.toLowerCase().replace(/[^a-z0-9-]/g, ''),
      website: formData.get('website') as string,
      phone: formData.get('phone') as string,
      industry: formData.get('industry') as string,
      address: formData.get('address') as string,
      logoUrl: formData.get('logoUrl') as string,
      description: formData.get('description') as string,
      currency: formData.get('currency') as string,
    };

    try {
      // Basic check for subdomain format
      if (updates.subdomain && updates.subdomain.length < 3) {
        toast.error('Subdomain must be at least 3 characters');
        return;
      }
      
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
      <div className="p-8 text-center text-slate-500 dark:text-dark-text-muted">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  if (loading) return <div className="p-8 text-center text-slate-500 dark:text-dark-text-muted flex items-center justify-center h-40">Loading settings...</div>;

  return (
    <div className="space-y-8 max-w-4xl pb-20">
      <div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Settings</h2>
        <p className="text-slate-500 dark:text-dark-text-muted">Manage your agency preferences and integrations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Company Information */}
        <section className="saas-card p-10 space-y-8 md:col-span-2">
          <div className="flex items-center space-x-3 text-slate-900 dark:text-white mb-2">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
              <UserIcon size={20} />
            </div>
            <h3 className="text-xl font-bold">Company Profile</h3>
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

          <form onSubmit={updateCompanyInfo} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 dark:text-dark-text-muted uppercase tracking-widest px-1">Company Name</label>
              <input
                name="name"
                defaultValue={company?.name}
                className="saas-input py-4 font-bold"
                placeholder="Nexvoura Solutions"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 dark:text-dark-text-muted uppercase tracking-widest px-1">Workspace Subdomain</label>
              <div className="relative">
                <input
                  name="subdomain"
                  defaultValue={company?.subdomain}
                  className="saas-input py-4 pr-32 font-bold"
                  placeholder="acme-corp"
                  pattern="[a-z0-9-]+"
                  minLength={3}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase pointer-events-none">
                  .nexvoura.com
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 dark:text-dark-text-muted uppercase tracking-widest px-1">Website</label>
              <input
                name="website"
                defaultValue={company?.website}
                className="saas-input py-4 font-bold"
                placeholder="https://nexvoura.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-dark-text-muted uppercase tracking-wider mb-2">Phone Number</label>
              <input
                name="phone"
                defaultValue={company?.phone}
                className="w-full p-4 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium text-slate-900 dark:text-white"
                placeholder="+1 234 567 890"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-dark-text-muted uppercase tracking-wider mb-2">Industry</label>
              <input
                name="industry"
                defaultValue={company?.industry}
                className="w-full p-4 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium text-slate-900 dark:text-white"
                placeholder="e.g. Marketing, SaaS"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 dark:text-dark-text-muted uppercase tracking-wider mb-2">Office Address</label>
              <input
                name="address"
                defaultValue={company?.address}
                className="w-full p-4 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium text-slate-900 dark:text-white"
                placeholder="123 business St, City"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 dark:text-dark-text-muted uppercase tracking-wider mb-2">Company Logo URL</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-slate-100 dark:bg-dark-bg rounded-xl flex items-center justify-center border border-slate-200 dark:border-dark-border overflow-hidden shrink-0">
                  {company?.logoUrl ? (
                    <img src={company.logoUrl} alt="Logo preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  ) : (
                    <Building2 size={24} className="text-slate-300" />
                  )}
                </div>
                <input
                  name="logoUrl"
                  defaultValue={company?.logoUrl}
                  className="w-full p-4 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium text-slate-900 dark:text-white"
                  placeholder="https://example.com/logo.png"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 dark:text-dark-text-muted uppercase tracking-wider mb-2">Bio / Description</label>
              <textarea
                name="description"
                defaultValue={company?.description}
                rows={3}
                className="w-full p-4 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium resize-none text-slate-900 dark:text-white"
                placeholder="Briefly describe your agency..."
              />
            </div>
            <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-100 dark:border-dark-border">
              <label className="block text-[10px] font-black text-slate-400 dark:text-dark-text-muted uppercase tracking-widest px-1">Fiscal Configuration</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-dark-text-muted uppercase tracking-wider mb-2">Currency Symbol</label>
                  <select
                    name="currency"
                    defaultValue={company?.currency || '$'}
                    className="w-full p-4 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium text-slate-900 dark:text-white"
                  >
                    <option value="$">$ (USD/CAD/AUD)</option>
                    <option value="€">€ (EUR)</option>
                    <option value="£">£ (GBP)</option>
                    <option value="₹">₹ (INR)</option>
                    <option value="¥">¥ (JPY/CNY)</option>
                    <option value="AED">AED (UAE Dirham)</option>
                    <option value="SAR">SAR (Saudi Riyal)</option>
                    <option value="Rs">Rs (PKR/LKR)</option>
                    <option value="฿">฿ (THB)</option>
                    <option value="₩">₩ (KRW)</option>
                    <option value="Custom">Custom Symbol</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 dark:text-dark-text-muted uppercase tracking-wider mb-2">Currency Description</label>
                  <p className="text-xs text-slate-400 dark:text-dark-text-muted italic mt-2">
                    This symbol will be used across all financial interfaces including payroll, slips, and audits.
                  </p>
                </div>
              </div>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                className="bg-slate-950 dark:bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 dark:shadow-indigo-500/10"
              >
                Save Profile
              </button>
            </div>
          </form>
        </section>

        {/* Role & Permission Management */}
        <section className="saas-card p-10 space-y-8 md:col-span-2">
          <div className="flex items-center space-x-3 text-slate-900 dark:text-white mb-2">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
              <ShieldCheck size={20} />
            </div>
            <h3 className="text-xl font-bold">Role & Permissions</h3>
          </div>
          <p className="text-sm text-slate-500 dark:text-dark-text-muted">
            Define what each operative level can access and modify within the workspace.
          </p>

          <div className="flex space-x-1 p-1 bg-slate-100 dark:bg-dark-bg rounded-2xl mb-6 overflow-x-auto">
            {ROLES.map((role) => (
              <button
                key={role}
                onClick={() => setActiveRoleTab(role)}
                className={`px-8 py-3 rounded-[14px] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  activeRoleTab === role
                    ? 'bg-white dark:bg-dark-surface text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {role.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from(new Set(ALL_PERMISSIONS.map(p => p.category))).map(category => (
              <div key={category} className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 dark:text-dark-text-muted uppercase tracking-[0.2em]">{category}</h4>
                <div className="space-y-2">
                  {ALL_PERMISSIONS.filter(p => p.category === category).map(permission => {
                    const isGranted = (company?.rolePermissions?.[activeRoleTab] || []).includes(permission.id);
                    return (
                      <button
                        key={permission.id}
                        onClick={() => togglePermission(activeRoleTab, permission.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                          isGranted 
                            ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400' 
                            : 'bg-slate-50 dark:bg-dark-bg border-slate-100 dark:border-dark-border text-slate-500 dark:text-dark-text-muted hover:bg-slate-100 dark:hover:bg-dark-surface'
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
        <section className="saas-card p-10 space-y-8 md:col-span-2">
          <div className="flex items-center space-x-3 text-slate-900 dark:text-white mb-2">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
              <FileCheck size={20} />
            </div>
            <h3 className="text-xl font-bold">Company Policies</h3>
          </div>
          <p className="text-sm text-slate-500 dark:text-dark-text-muted">
            Internal rules and guidelines for your agency. These will be visible to all members.
          </p>

          <div className="flex gap-4">
            <input
              value={newPolicy}
              onChange={(e) => setNewPolicy(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addPolicy()}
              className="saas-input py-4 font-medium"
              placeholder="e.g. Leave must be filed 3 days in advance"
            />
            <button
              onClick={addPolicy}
              className="saas-button-primary"
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
                  className="flex items-center justify-between p-4 bg-emerald-50/50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-xl group"
                >
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{policy}</p>
                  <button
                    onClick={() => removePolicy(policy)}
                    className="p-1.5 text-slate-400 dark:text-dark-text-muted hover:text-rose-500 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
            {(!company?.policies || company.policies.length === 0) && (
              <div className="md:col-span-2 py-8 text-center bg-slate-50 dark:bg-dark-bg rounded-2xl border border-dashed border-slate-200 dark:border-dark-border">
                <p className="text-sm text-slate-400 dark:text-dark-text-muted italic">No policies active yet.</p>
              </div>
            )}
          </div>
        </section>

        {/* Task Board Configuration */}
        <section className="saas-card p-10 space-y-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3 text-slate-900 dark:text-white">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                <Layout size={20} />
              </div>
              <h3 className="text-xl font-bold">Workflow</h3>
            </div>
            <button
              onClick={addStatus}
              className="saas-button-primary p-2 flex items-center justify-center !w-10 !h-10"
            >
              <Plus size={20} />
            </button>
          </div>
          <p className="text-sm text-slate-500 dark:text-dark-text-muted">
            Customize the workflow of your project board. Add, remove, or rename columns.
          </p>
          
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {(company?.taskStatuses || ['Todo', 'In Progress', 'Done']).map((status, index) => (
                <motion.div
                  key={status}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center justify-between p-4 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-[18px] group"
                >
                  <div className="flex items-center space-x-4">
                    <span className="w-6 h-6 flex items-center justify-center bg-white dark:bg-dark-surface text-slate-500 dark:text-dark-text-muted text-[10px] font-black rounded-lg shadow-sm border border-slate-100 dark:border-dark-border">
                      {index + 1}
                    </span>
                    <span className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">{status}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => renameStatus(status)}
                      className="p-1.5 text-slate-400 dark:text-dark-text-muted hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-dark-surface rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => removeStatus(status)}
                      className="p-1.5 text-slate-400 dark:text-dark-text-muted hover:text-rose-500 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-dark-surface rounded-lg transition-all opacity-0 group-hover:opacity-100"
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
        <section className="saas-card p-10 space-y-8">
          <div className="flex items-center space-x-3 text-slate-900 dark:text-white mb-2">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
              <Globe size={20} />
            </div>
            <h3 className="text-xl font-bold">Lead Pipeline</h3>
          </div>
          <p className="text-sm text-slate-500 dark:text-dark-text-muted">
            Share this URL with clients or embed it in your website to receive leads directly in Nexvoura.
          </p>
          <div className="bg-slate-50 dark:bg-dark-bg p-5 rounded-2xl border border-slate-200 dark:border-dark-border flex items-center justify-between group">
            <code className="text-blue-600 dark:text-blue-400 font-mono text-xs truncate mr-4">
              {window.location.origin}/submit-lead/{user.companyId}
            </code>
            <button
              onClick={copyUrl}
              className="flex-shrink-0 p-2.5 hover:bg-white dark:hover:bg-dark-surface rounded-xl transition-all text-slate-400 hover:text-slate-900 dark:hover:text-white border border-transparent hover:border-slate-200 dark:hover:border-dark-border"
            >
              {copied ? <Check size={20} className="text-emerald-500" /> : <Copy size={20} />}
            </button>
          </div>
        </section>

        {/* Global Key Component: Theme Toggle */}
        <AppearanceSettings />

        {/* Task Notification Settings */}
        <section className="bg-white dark:bg-dark-surface p-8 rounded-2xl border border-slate-100 dark:border-dark-border shadow-sm space-y-6 transition-colors">
          <div className="flex items-center space-x-3 text-slate-900 dark:text-white mb-2">
            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400">
              <Bell size={20} />
            </div>
            <h3 className="text-lg font-bold">Task Notifications</h3>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-dark-bg rounded-xl border border-slate-100 dark:border-dark-border transition-colors">
            <div>
              <p className="font-bold text-slate-800 dark:text-white">Email Alerts</p>
              <p className="text-xs text-slate-500 dark:text-dark-text-muted">Receive an email when a task is due soon.</p>
            </div>
            <button
              onClick={() => updateSettings({ enabled: !(company?.notificationSettings?.enabled ?? true) })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                (company?.notificationSettings?.enabled ?? true) ? 'bg-blue-600 dark:bg-indigo-600' : 'bg-slate-200 dark:bg-dark-border'
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
              <div className="flex items-center space-x-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                <Clock size={16} />
                <span>Notify me before</span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="1"
                  max={(company?.notificationSettings?.dueSoonUnit ?? 'hours') === 'minutes' ? 10080 : 168}
                  className="w-20 p-2 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-lg text-center font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  value={company?.notificationSettings?.dueSoonHours ?? 24}
                  onChange={(e) => updateSettings({ dueSoonHours: parseInt(e.target.value) || 1 })}
                  disabled={!(company?.notificationSettings?.enabled ?? true)}
                />
                <select
                  value={company?.notificationSettings?.dueSoonUnit ?? 'hours'}
                  onChange={(e) => updateSettings({ dueSoonUnit: e.target.value as 'hours' | 'minutes' })}
                  disabled={!(company?.notificationSettings?.enabled ?? true)}
                  className="bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-lg px-2 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="hours" className="dark:bg-dark-surface">hours</option>
                  <option value="minutes" className="dark:bg-dark-surface">minutes</option>
                </select>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-dark-text-muted">
              Set how much time before the deadline you want to be notified. Max 168h or 10080m (1 week).
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
