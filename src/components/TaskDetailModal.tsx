import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  X, Trash2, Flag, Bell, BellOff, Calendar, Paperclip, File as FileIcon, Link as LinkIcon, 
  ExternalLink, PlayCircle, CheckCircle, Clock, Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { Task, Lead, UserProfile, Attachment } from '../types';
import { UserSelector } from './UserSelector';

interface TaskDetailModalProps {
  task: Task;
  leads: Lead[];
  team: UserProfile[];
  taskStatuses: string[];
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
}

export function TaskDetailModal({ 
  task, 
  leads, 
  team, 
  taskStatuses,
  onClose, 
  onUpdate 
}: TaskDetailModalProps) {
  const [editedTask, setEditedTask] = useState<Task>(task);
  const [newSubtask, setNewSubtask] = useState('');
  const [newAttachment, setNewAttachment] = useState({ name: '', url: '', type: 'link' as 'file' | 'link' });
  const [showAddAttachment, setShowAddAttachment] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(task.id, editedTask);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    const sub = {
      id: Math.random().toString(36).substr(2, 9),
      title: newSubtask.trim(),
      completed: false
    };
    setEditedTask(prev => ({
      ...prev,
      subtasks: [...(prev.subtasks || []), sub]
    }));
    setNewSubtask('');
  };

  const removeSubtask = (id: string) => {
    setEditedTask(prev => ({
      ...prev,
      subtasks: prev.subtasks?.filter(s => s.id !== id)
    }));
  };

  const toggleSubtask = (id: string) => {
    setEditedTask(prev => ({
      ...prev,
      subtasks: prev.subtasks?.map(s => s.id === id ? { ...s, completed: !s.completed } : s)
    }));
  };

  const addAttachment = () => {
    if (!newAttachment.name.trim() || !newAttachment.url.trim()) {
      toast.error('Please provide both a name and a URL');
      return;
    }
    const attachment: Attachment = {
      id: Math.random().toString(36).substr(2, 9),
      name: newAttachment.name.trim(),
      url: newAttachment.url.startsWith('http') ? newAttachment.url.trim() : `https://${newAttachment.url.trim()}`,
      type: newAttachment.type,
      createdAt: new Date().toISOString()
    };
    setEditedTask(prev => ({
      ...prev,
      attachments: [...(prev.attachments || []), attachment]
    }));
    setNewAttachment({ name: '', url: '', type: 'link' });
    setShowAddAttachment(false);
  };

  const removeAttachment = (id: string) => {
    setEditedTask(prev => ({
      ...prev,
      attachments: prev.attachments?.filter(a => a.id !== id)
    }));
  };

  const lastStatus = taskStatuses[taskStatuses.length - 1];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-4xl bg-white dark:bg-dark-surface rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] transition-colors"
      >
        <div className="p-6 border-b border-slate-100 dark:border-dark-border flex justify-between items-center bg-[#fcfcfc] dark:bg-dark-bg/50">
          <div className="flex items-center space-x-3">
             <div className={`p-2.5 rounded-xl ${
               editedTask.priority === 'High' ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-500' :
               editedTask.priority === 'Medium' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-500' :
               'bg-blue-50 dark:bg-blue-500/10 text-blue-500'
             }`}>
               <Flag size={20} />
             </div>
             <div>
               <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Intelligence Report</h2>
               <p className="text-[10px] font-bold text-slate-400 dark:text-dark-text-muted uppercase tracking-widest">Operation Details & Context</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-dark-bg rounded-full transition-colors text-slate-400 dark:text-dark-text-muted">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Left Column: Brief & Objectives */}
            <div className="space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-dark-text-muted uppercase tracking-widest ml-1">Objective Title</label>
                <input 
                  type="text"
                  value={editedTask.title || ''}
                  onChange={e => setEditedTask({ ...editedTask, title: e.target.value })}
                  className="saas-input text-lg font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-dark-text-muted uppercase tracking-widest ml-1">Tactical Brief</label>
                <textarea 
                  value={editedTask.description || ''}
                  onChange={e => setEditedTask({ ...editedTask, description: e.target.value })}
                  rows={6}
                  className="saas-input h-48 resize-none text-sm font-medium leading-relaxed"
                />
              </div>

              {/* Attachments */}
              <div className="space-y-4 pt-4 border-t border-slate-50 dark:border-dark-border">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Strategic Assets</h4>
                  <button 
                    onClick={() => setShowAddAttachment(!showAddAttachment)}
                    className="text-[10px] font-bold text-brand-primary dark:text-indigo-400 hover:underline uppercase tracking-widest"
                  >
                    {showAddAttachment ? 'Dismiss' : 'Deploy Asset'}
                  </button>
                </div>

                {showAddAttachment && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-slate-50 dark:bg-dark-bg/50 rounded-2xl border border-slate-100 dark:border-dark-border space-y-3"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <input 
                        type="text"
                        placeholder="Asset Name"
                        value={newAttachment.name}
                        onChange={e => setNewAttachment({ ...newAttachment, name: e.target.value })}
                        className="saas-input py-2 text-xs"
                      />
                      <select
                        value={newAttachment.type}
                        onChange={e => setNewAttachment({ ...newAttachment, type: e.target.value as 'file' | 'link' })}
                        className="saas-input py-2 text-xs appearance-none"
                      >
                        <option value="link" className="dark:bg-dark-surface">Link/URL</option>
                        <option value="file" className="dark:bg-dark-surface">File Ref</option>
                      </select>
                    </div>
                    <div className="flex space-x-2">
                      <input 
                        type="text"
                        placeholder="https://..."
                        value={newAttachment.url}
                        onChange={e => setNewAttachment({ ...newAttachment, url: e.target.value })}
                        onKeyDown={e => e.key === 'Enter' && addAttachment()}
                        className="saas-input py-2 text-xs flex-1"
                      />
                      <button 
                        onClick={addAttachment}
                        className="bg-brand-primary text-white p-2 px-4 rounded-xl text-xs font-bold shadow-sm"
                      >
                        Add
                      </button>
                    </div>
                  </motion.div>
                )}

                <div className="grid grid-cols-1 gap-2">
                  {editedTask.attachments?.map(attachment => (
                    <div key={attachment.id} className="flex items-center justify-between p-3 bg-white dark:bg-dark-surface border border-slate-100 dark:border-dark-border rounded-2xl shadow-sm hover:shadow-md transition-all group">
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <div className={`p-2 rounded-lg flex-shrink-0 ${attachment.type === 'file' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-500' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-500'}`}>
                          {attachment.type === 'file' ? <FileIcon size={14} /> : <LinkIcon size={14} />}
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-slate-800 dark:text-dark-text truncate leading-none mb-1">{attachment.name}</p>
                          <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-slate-400 dark:text-dark-text-muted hover:text-brand-primary dark:hover:text-indigo-400 flex items-center space-x-1 font-medium">
                            <span className="truncate max-w-[150px]">{attachment.url}</span>
                            <ExternalLink size={10} />
                          </a>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeAttachment(attachment.id)}
                        className="p-1 px-1.5 text-slate-300 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {(!editedTask.attachments || editedTask.attachments.length === 0) && !showAddAttachment && (
                    <div className="py-6 text-center border-2 border-dashed border-slate-100 dark:border-dark-border rounded-2xl transition-colors">
                       <p className="text-[10px] font-bold text-slate-400 dark:text-dark-text-muted uppercase tracking-widest italic leading-none">No active assets linked</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Operatives & Control */}
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-dark-text-muted uppercase tracking-widest ml-1">Assigned Operative</label>
                  <UserSelector 
                    team={team} 
                    value={editedTask.assignedTo || ''} 
                    onChange={val => setEditedTask({ ...editedTask, assignedTo: val })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-dark-text-muted uppercase tracking-widest ml-1">Strategic Alignment (Lead)</label>
                  <select 
                    value={editedTask.leadId || ''}
                    onChange={e => setEditedTask({ ...editedTask, leadId: e.target.value })}
                    className="saas-input text-xs font-bold appearance-none bg-slate-50 dark:bg-dark-bg border-slate-100 dark:border-dark-border"
                  >
                    <option value="" className="dark:bg-dark-surface">No alignment (Internal)</option>
                    {leads.map(lead => (
                      <option key={lead.id} value={lead.id} className="dark:bg-dark-surface">{lead.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-dark-text-muted uppercase tracking-widest ml-1">Operation Status</label>
                  <select 
                    value={editedTask.status}
                    onChange={e => setEditedTask({ ...editedTask, status: e.target.value })}
                    className="saas-input text-xs font-bold appearance-none"
                  >
                    {taskStatuses.map(s => <option key={s} value={s} className="dark:bg-dark-surface">{s}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-dark-text-muted uppercase tracking-widest ml-1">Priority Level</label>
                  <select 
                    value={editedTask.priority}
                    onChange={e => setEditedTask({ ...editedTask, priority: e.target.value as any })}
                    className="saas-input text-xs font-bold appearance-none"
                  >
                    <option value="Low" className="dark:bg-dark-surface">Low Clearance</option>
                    <option value="Medium" className="dark:bg-dark-surface">Medium Clearance</option>
                    <option value="High" className="dark:bg-dark-surface">High Criticality</option>
                  </select>
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t border-slate-50 dark:border-dark-border">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-dark-text-muted uppercase tracking-widest ml-1">Mission Deadline</label>
                    <input 
                      type="date"
                      value={editedTask.dueDate || ''}
                      onChange={e => setEditedTask({ ...editedTask, dueDate: e.target.value })}
                      className="saas-input text-xs font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-dark-text-muted uppercase tracking-widest ml-1">Alert Protocol</label>
                    <button
                      onClick={() => setEditedTask({ ...editedTask, reminderEnabled: !editedTask.reminderEnabled })}
                      className={`w-full p-2.5 rounded-xl flex items-center justify-between border transition-all ${
                        editedTask.reminderEnabled ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-brand-primary/20' : 'bg-slate-50 dark:bg-dark-bg border-slate-100 dark:border-dark-border text-slate-500 dark:text-dark-text-muted'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                         {editedTask.reminderEnabled ? <Bell size={14} /> : <BellOff size={14} />}
                         <span className="text-[10px] font-bold uppercase tracking-widest">Reminders {editedTask.reminderEnabled ? 'On' : 'Off'}</span>
                      </div>
                      <div className={`w-6 h-3.5 rounded-full relative transition-colors ${editedTask.reminderEnabled ? 'bg-white/20' : 'bg-slate-300 dark:bg-dark-surface'}`}>
                         <div className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-all ${editedTask.reminderEnabled ? 'right-0.5' : 'left-0.5'}`} />
                      </div>
                    </button>
                  </div>
                </div>

                {editedTask.reminderEnabled && (
                  <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-dark-text-muted uppercase tracking-widest ml-1">Email Alert Threshold (Minutes)</label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="number"
                        min="1"
                        className="saas-input py-2.5 text-xs font-bold w-full bg-slate-50 dark:bg-dark-bg border-slate-100 dark:border-dark-border"
                        value={editedTask.reminderMinutes || 30}
                        onChange={(e) => setEditedTask({ ...editedTask, reminderMinutes: parseInt(e.target.value) || 0 })}
                      />
                      <span className="text-[10px] whitespace-nowrap font-bold text-slate-400 dark:text-dark-text-muted uppercase tracking-widest transition-colors">min before</span>
                    </div>
                  </div>
                )}

                {/* Subtasks */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Milestones (Sub-tasks)</h4>
                    <span className="text-[10px] font-black text-brand-primary dark:text-indigo-400 bg-brand-primary/10 dark:bg-indigo-500/10 px-2 py-0.5 rounded-full">
                       {editedTask.subtasks?.filter(s => s.completed).length || 0} / {editedTask.subtasks?.length || 0}
                    </span>
                  </div>
                  
                  <div className="bg-slate-50 dark:bg-dark-bg/50 rounded-2xl p-4 border border-slate-100 dark:border-dark-border space-y-3">
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {editedTask.subtasks?.map(sub => (
                        <div key={sub.id} className="flex items-center justify-between group bg-white dark:bg-dark-surface p-2.5 rounded-xl border border-slate-100 dark:border-dark-border shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-dark-bg">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <button 
                              onClick={() => toggleSubtask(sub.id)}
                              className={`transition-colors ${sub.completed ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600 hover:text-slate-400'}`}
                            >
                              <CheckCircle size={18} className={sub.completed ? 'fill-emerald-500 text-white' : ''} />
                            </button>
                            <span className={`text-xs truncate font-semibold ${sub.completed ? 'text-slate-400 dark:text-slate-600 line-through' : 'text-slate-700 dark:text-dark-text'}`}>
                              {sub.title}
                            </span>
                          </div>
                          <button 
                            onClick={() => removeSubtask(sub.id)}
                            className="p-1 px-1.5 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all font-bold"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                      {(!editedTask.subtasks || editedTask.subtasks.length === 0) && (
                        <div className="text-center py-4 border-2 border-dashed border-slate-200 dark:border-dark-border rounded-xl">
                          <p className="text-[10px] font-bold text-slate-400 dark:text-dark-text-muted uppercase tracking-widest leading-none italic">No milestones set</p>
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2 pt-1">
                      <input 
                        type="text"
                        placeholder="New objective..."
                        value={newSubtask}
                        onChange={e => setNewSubtask(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addSubtask()}
                        className="saas-input py-2 text-xs flex-1"
                      />
                      <button 
                        onClick={addSubtask}
                        className="bg-slate-900 dark:bg-indigo-600 text-white p-2 px-3 rounded-xl hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors shadow-lg shadow-slate-200 dark:shadow-none"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tracking Metrics */}
                <div className="bg-slate-900 dark:bg-dark-bg text-white/90 rounded-2xl p-5 border border-slate-800 dark:border-dark-border grid grid-cols-3 gap-4 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1 text-slate-500">
                       <Clock size={10} />
                       <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Created</span>
                    </div>
                    <p className="text-[10px] font-bold">{new Date(editedTask.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1 text-blue-400">
                       <PlayCircle size={10} />
                       <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Started</span>
                    </div>
                    <p className="text-[10px] font-bold">
                      {editedTask.startedAt ? new Date(editedTask.startedAt).toLocaleDateString() : '--'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1 text-emerald-400">
                       <CheckCircle size={10} />
                       <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Done</span>
                    </div>
                    <p className="text-[10px] font-bold">
                      {editedTask.completedAt ? new Date(editedTask.completedAt).toLocaleDateString() : '--'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-[#fcfcfc] dark:bg-dark-bg/50 border-t border-slate-100 dark:border-dark-border flex space-x-4">
          <button 
            disabled={isSaving}
            onClick={onClose}
            className="flex-1 saas-button-secondary py-3.5"
          >
            DISCARD
          </button>
          <button 
            disabled={isSaving}
            onClick={handleSave}
            className="flex-[2] saas-button-primary py-3.5 text-base"
          >
            {isSaving ? 'UPDATING ARCHIVE...' : 'SYNC CHANGES'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
