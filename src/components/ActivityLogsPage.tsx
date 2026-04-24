import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { UserProfile, ActivityLog } from '../types';
import { History as HistoryIcon, Filter, Search, Calendar, User as UserIcon, ArrowRight, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO } from 'date-fns';

export default function ActivityLogsPage({ user }: { user: UserProfile }) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'activityLogs'),
      where('companyId', '==', user.companyId),
      orderBy('createdAt', 'desc'),
      limit(200)
    );

    return onSnapshot(q, (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityLog)));
      setLoading(false);
    });
  }, [user.companyId]);

  const filteredLogs = logs.filter(log => {
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    const matchesSearch = log.actorName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (log.targetName?.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesAction && matchesSearch;
  });

  const getActionColor = (action: ActivityLog['action']) => {
    switch (action) {
      case 'LOGIN': return 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400';
      case 'SALARY_CHANGE': return 'bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400';
      case 'EMPLOYEE_EDIT': return 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400';
      case 'DATA_EXPORT': return 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
      case 'SETTINGS_CHANGE': return 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400';
      default: return 'bg-slate-100 dark:bg-dark-bg text-slate-700 dark:text-dark-text-muted';
    }
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-slate-950 dark:bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-950/20 dark:shadow-indigo-500/20 transition-colors">
              <HistoryIcon size={24} />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black font-display text-slate-950 dark:text-white italic tracking-tighter leading-none transition-colors">
                Activity <span className="text-brand-primary dark:text-indigo-500">Audit</span>
              </h1>
              <p className="text-slate-400 dark:text-dark-text-muted text-[10px] font-black uppercase tracking-[0.2em] mt-1">System Operation Monitoring Protocol</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
           <button className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-text-muted hover:text-slate-950 dark:hover:text-white transition-colors group">
            <Download size={16} className="group-hover:-translate-y-1 transition-transform" />
            <span>Export Audit Trail</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-dark-surface p-4 rounded-2xl border border-slate-100 dark:border-dark-border shadow-sm flex items-center space-x-3 focus-within:ring-2 focus-within:ring-brand-primary/20 dark:focus-within:ring-indigo-500/20 transition-all">
          <Search size={18} className="text-slate-400 dark:text-dark-text-muted" />
          <input 
            type="text" 
            placeholder="Search records..." 
            className="saas-input py-2 text-xs font-bold w-full uppercase tracking-tight border-none dark:bg-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="bg-white dark:bg-dark-surface p-4 rounded-2xl border border-slate-100 dark:border-dark-border shadow-sm flex items-center space-x-3 transition-all">
          <Filter size={18} className="text-slate-400 dark:text-dark-text-muted" />
          <select 
            className="bg-transparent border-none outline-none text-xs font-bold w-full uppercase tracking-tight cursor-pointer text-slate-900 dark:text-white"
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
          >
            <option value="all" className="dark:bg-dark-surface">All Operations</option>
            <option value="LOGIN" className="dark:bg-dark-surface">Logins</option>
            <option value="SALARY_CHANGE" className="dark:bg-dark-surface">Salary Changes</option>
            <option value="EMPLOYEE_EDIT" className="dark:bg-dark-surface">Employee Edits</option>
            <option value="DATA_EXPORT" className="dark:bg-dark-surface">Data Exports</option>
            <option value="SETTINGS_CHANGE" className="dark:bg-dark-surface">Settings</option>
          </select>
        </div>

        <div className="bg-white dark:bg-dark-surface p-4 rounded-2xl border border-slate-100 dark:border-dark-border shadow-sm flex items-center justify-between transition-colors">
           <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-text-muted">Records Loaded</p>
           <span className="bg-slate-100 dark:bg-dark-bg px-3 py-1 rounded-lg text-xs font-black text-slate-950 dark:text-white italic">{filteredLogs.length}</span>
        </div>
      </div>

      {/* Audit Table */}
      <div className="table-container">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 dark:bg-dark-bg/50 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-text-muted border-b border-slate-100 dark:border-dark-border transition-colors italic">
            <tr>
              <th className="px-8 py-5">Timestamp</th>
              <th className="px-8 py-5">Operative</th>
              <th className="px-8 py-5">Operation</th>
              <th className="px-8 py-5">Details</th>
              <th className="px-8 py-5 text-right">Reference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-dark-border">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-dark-bg/50 transition-colors group">
                <td className="px-8 py-6">
                   <div className="flex items-center space-x-2 text-slate-400 dark:text-dark-text-muted group-hover:text-slate-600 dark:group-hover:text-white transition-colors">
                      <Calendar size={12} />
                      <span className="text-[10px] font-bold uppercase tracking-tighter">
                        {format(parseISO(log.createdAt), 'MMM dd, HH:mm:ss')}
                      </span>
                   </div>
                </td>
                <td className="px-8 py-6">
                   <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-dark-bg flex items-center justify-center border border-white dark:border-dark-border overflow-hidden shadow-sm">
                         <UserIcon size={14} className="text-slate-400 dark:text-dark-text-muted" />
                      </div>
                      <span className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-tight transition-colors">{log.actorName}</span>
                   </div>
                </td>
                <td className="px-8 py-6">
                   <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-100 dark:border-transparent ${getActionColor(log.action)}`}>
                      {log.action.replace('_', ' ')}
                   </span>
                </td>
                <td className="px-8 py-6">
                   <p className="text-xs font-medium text-slate-600 dark:text-dark-text-muted line-clamp-1 italic transition-colors">"{log.details}"</p>
                </td>
                <td className="px-8 py-6 text-right">
                   {log.targetName ? (
                     <div className="inline-flex items-center space-x-2 text-slate-400 dark:text-dark-text-muted">
                        <span className="text-[9px] font-black uppercase tracking-widest italic">{log.targetName}</span>
                        <ArrowRight size={12} />
                     </div>
                   ) : <span className="text-slate-200 dark:text-dark-bg">—</span>}
                </td>
              </tr>
            ))}
            {!loading && filteredLogs.length === 0 && (
              <tr>
                <td colSpan={5} className="py-40 text-center">
                   <div className="w-20 h-20 bg-slate-50 dark:bg-dark-bg rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-200 dark:text-slate-800 border border-slate-100 dark:border-dark-border transition-colors">
                      <HistoryIcon size={36} />
                   </div>
                   <h4 className="text-slate-950 dark:text-white font-black italic text-xl transition-colors">No Audit Logs Found</h4>
                   <p className="text-slate-400 dark:text-dark-text-muted text-xs font-bold uppercase tracking-widest mt-2">The operational history is currently clear.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
