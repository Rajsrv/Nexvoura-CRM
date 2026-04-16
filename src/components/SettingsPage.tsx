import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { UserProfile, Company } from '../types';
import { toast } from 'sonner';
import { Bell, Clock, Globe, Copy, Check, Layout, Plus, Trash2, GripVertical, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function SettingsPage({ user }: { user: UserProfile }) {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
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

  if (loading) return <div className="p-8 text-center text-slate-500">Loading settings...</div>;

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
        <p className="text-slate-500">Manage your agency preferences and integrations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
            Share this URL with clients or embed it in your website to receive leads directly in NexusCRM.
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
            NexusCRM for Agencies is built for scale. Customize your workspace, add team members, and automate lead follow-ups.
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
