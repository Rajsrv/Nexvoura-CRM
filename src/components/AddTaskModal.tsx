import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Plus, Trash2, Calendar, Flag, Bell, BellOff, Save, Link as LinkIcon, Star, CheckCircle2 
} from 'lucide-react';
import { toast } from 'sonner';
import { UserProfile, Lead, TaskTemplate, TaskStatus } from '../types';
import { UserSelector } from './UserSelector';

interface AddTaskModalProps {
  user: UserProfile;
  team: UserProfile[];
  leads: Lead[];
  templates: TaskTemplate[];
  taskStatuses: string[];
  onClose: () => void;
  onAdd: (task: any) => Promise<void>;
  onSaveTemplate: (task: any) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
}

export function AddTaskModal({
  user,
  team,
  leads,
  templates,
  taskStatuses,
  onClose,
  onAdd,
  onSaveTemplate,
  deleteTemplate
}: AddTaskModalProps) {
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    dueDate: '',
    status: taskStatuses[0] as TaskStatus,
    priority: 'Medium' as 'Low' | 'Medium' | 'High',
    assignedTo: '',
    leadId: '',
    reminderEnabled: false,
    reminderMinutes: 30,
    subtasks: [] as { id: string; title: string; completed: boolean }[]
  });
  const [newSubtask, setNewSubtask] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApplyTemplate = (tmpl: TaskTemplate) => {
    setNewTask(prev => ({
      ...prev,
      title: tmpl.title,
      description: tmpl.description,
      priority: tmpl.priority,
      subtasks: tmpl.subtasks.map(s => ({
        id: Math.random().toString(36).substr(2, 9),
        title: s.title,
        completed: false
      }))
    }));
    toast.success('Template applied');
  };

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    setNewTask(prev => ({
      ...prev,
      subtasks: [
        ...prev.subtasks,
        { id: Math.random().toString(36).substr(2, 9), title: newSubtask.trim(), completed: false }
      ]
    }));
    setNewSubtask('');
  };

  const removeSubtask = (id: string) => {
    setNewTask(prev => ({
      ...prev,
      subtasks: prev.subtasks.filter(s => s.id !== id)
    }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTask.title.trim()) {
      toast.error('Mission objective title is required');
      return;
    }
    setIsSubmitting(true);
    try {
      await onAdd(newTask);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
        className="relative w-full max-w-4xl bg-white dark:bg-dark-surface rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors"
      >
        {/* Modern Header */}
        <div className="p-8 border-b border-slate-200 dark:border-dark-border flex justify-between items-center bg-white dark:bg-dark-bg/50">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-brand-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-primary/20">
              <Plus size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Initiate Task</h3>
              <p className="text-slate-400 dark:text-dark-text-muted text-[10px] font-bold uppercase tracking-widest mt-0.5">Define objectives & strategic alignment</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-3 hover:bg-slate-100 dark:hover:bg-dark-bg rounded-2xl text-slate-400 dark:text-dark-text-muted transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {/* Templates Section */}
          {templates.length > 0 && (
            <div className="bg-slate-100/30 dark:bg-dark-bg/50 p-6 rounded-3xl border border-slate-200 dark:border-dark-border shadow-sm">
               <div className="flex items-center space-x-2 mb-4">
                  <Star size={14} className="text-brand-primary fill-brand-primary" />
                  <label className="text-[10px] font-bold text-slate-500 dark:text-dark-text-muted uppercase tracking-widest">Rapid Templates</label>
               </div>
               <div className="flex flex-wrap gap-2">
                 {templates.map(tmpl => (
                   <div key={tmpl.id} className="group relative">
                     <button
                       type="button"
                       onClick={() => handleApplyTemplate(tmpl)}
                       className="px-4 py-2 bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border text-slate-700 dark:text-dark-text text-xs font-bold rounded-xl hover:bg-brand-primary hover:text-white hover:border-brand-primary transition-all shadow-sm dark:shadow-none flex items-center space-x-2"
                     >
                       <span>{tmpl.name}</span>
                     </button>
                     <button 
                       type="button" 
                       onClick={() => deleteTemplate(tmpl.id)}
                       className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                     >
                       <X size={10} />
                     </button>
                   </div>
                 ))}
               </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Column 1: Core Details */}
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-dark-text-muted uppercase tracking-widest ml-1">Task Objective</label>
                <input
                  type="text"
                  required
                  autoFocus
                  className="saas-input text-lg font-semibold"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="e.g. Design System Audit"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-dark-text-muted uppercase tracking-widest ml-1">Strategic Brief</label>
                <textarea
                  className="saas-input h-32 resize-none text-sm font-medium leading-relaxed"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Outline the critical success factors..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-dark-text-muted uppercase tracking-widest ml-1">Assignee</label>
                <UserSelector 
                  team={team}
                  value={newTask.assignedTo}
                  onChange={(uid) => setNewTask({ ...newTask, assignedTo: uid })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-dark-text-muted uppercase tracking-widest ml-1">Related Pipeline (Lead)</label>
                <div className="relative">
                  <select
                    className="saas-input appearance-none"
                    value={newTask.leadId}
                    onChange={(e) => setNewTask({ ...newTask, leadId: e.target.value })}
                  >
                    <option value="" className="dark:bg-dark-surface">No context (Internal Task)</option>
                    {leads.map(lead => (
                      <option key={lead.id} value={lead.id} className="dark:bg-dark-surface">{lead.name} — {lead.service}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-dark-text-muted">
                    <LinkIcon size={14} />
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Controls & Subtasks */}
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-dark-text-muted uppercase tracking-widest ml-1">Deadline</label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-dark-text-muted" />
                    <input
                      type="date"
                      className="saas-input pl-10 text-xs font-bold"
                      value={newTask.dueDate}
                      onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-dark-text-muted uppercase tracking-widest ml-1">Priority</label>
                  <div className="relative">
                    <Flag size={14} className={`absolute left-4 top-1/2 -translate-y-1/2 ${
                      newTask.priority === 'High' ? 'text-rose-500' :
                      newTask.priority === 'Medium' ? 'text-amber-500' : 'text-blue-500'
                    }`} />
                    <select
                      className="saas-input pl-10 text-xs font-bold appearance-none"
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                    >
                      <option value="Low" className="dark:bg-dark-surface">Low Priority</option>
                      <option value="Medium" className="dark:bg-dark-surface">Medium Priority</option>
                      <option value="High" className="dark:bg-dark-surface">High Priority</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-dark-text-muted uppercase tracking-widest ml-1">Notification Protocol</label>
                <button
                  type="button"
                  onClick={() => setNewTask(prev => ({ ...prev, reminderEnabled: !prev.reminderEnabled }))}
                  className={`w-full p-4 rounded-2xl flex items-center justify-between border transition-all duration-300 ${
                    newTask.reminderEnabled 
                      ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-brand-primary/20' 
                      : 'bg-white dark:bg-dark-bg border-slate-100 dark:border-dark-border text-slate-500 dark:text-dark-text-muted'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                     {newTask.reminderEnabled ? <Bell size={18} className="animate-bounce" /> : <BellOff size={18} />}
                     <span className="text-xs font-bold uppercase tracking-widest">
                       {newTask.reminderEnabled ? 'Arrival Alert Active' : 'Enable Due Date Alert'}
                     </span>
                  </div>
                  <div className={`w-8 h-4 rounded-full relative transition-colors ${newTask.reminderEnabled ? 'bg-white/20' : 'bg-slate-200 dark:bg-dark-surface'}`}>
                     <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm ${newTask.reminderEnabled ? 'right-0.5' : 'left-0.5'}`} />
                  </div>
                </button>
              </div>

              {newTask.reminderEnabled && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-dark-text-muted uppercase tracking-widest ml-1">Email Alert Threshold (Minutes Before)</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="number"
                      min="1"
                      className="saas-input py-3 text-xs font-bold w-32"
                      value={newTask.reminderMinutes}
                      onChange={(e) => setNewTask({ ...newTask, reminderMinutes: parseInt(e.target.value) || 0 })}
                    />
                    <span className="text-xs font-bold text-slate-400 dark:text-dark-text-muted">min before deadline</span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 dark:text-dark-text-muted uppercase tracking-widest ml-1">Sub-Task Breakdown</label>
                <div className="bg-slate-50 dark:bg-dark-bg/50 rounded-[24px] p-6 border border-slate-100 dark:border-dark-border space-y-4">
                  <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {newTask.subtasks.map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between bg-white dark:bg-dark-surface p-3 rounded-xl border border-slate-100 dark:border-dark-border group shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-dark-bg">
                        <div className="flex items-center space-x-3 overflow-hidden">
                           <CheckCircle2 size={14} className="text-slate-300 dark:text-slate-600 flex-shrink-0" />
                           <span className="text-[11px] font-semibold text-slate-600 dark:text-dark-text-muted truncate">{sub.title}</span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => removeSubtask(sub.id)}
                          className="text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 shadow-sm"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    {newTask.subtasks.length === 0 && (
                      <div className="text-center py-6 border-2 border-dashed border-slate-200 dark:border-dark-border rounded-2xl">
                         <p className="text-[10px] font-bold text-slate-400 dark:text-dark-text-muted uppercase tracking-widest">No milestones defined</p>
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <input 
                      type="text"
                      placeholder="Add sub-task..."
                      value={newSubtask}
                      onChange={e => setNewSubtask(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSubtask())}
                      className="saas-input py-2 text-xs"
                    />
                    <button 
                      type="button"
                      onClick={addSubtask}
                      className="bg-slate-900 dark:bg-indigo-600 text-white w-10 h-10 rounded-xl flex items-center justify-center hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors shrink-0 shadow-lg shadow-slate-200 dark:shadow-none"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-8 bg-white dark:bg-dark-bg/50 border-t border-slate-200 dark:border-dark-border flex flex-col sm:flex-row gap-4">
          <button
            type="button"
            onClick={() => onSaveTemplate(newTask)}
            className="flex-1 saas-button-secondary py-4"
          >
            <Save size={16} className="mr-2" />
            <span>Save as Template</span>
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSubmitting}
            className="flex-[2] saas-button-primary py-4 text-lg"
          >
            {isSubmitting ? 'Initializing...' : 'Initiate Operation'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
