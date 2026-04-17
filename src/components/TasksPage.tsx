import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, writeBatch, getDocs } from 'firebase/firestore';
import { UserProfile, Task, Lead, TaskTemplate, Company, Attachment } from '../types';
import { Plus, Trash2, CheckCircle2, Circle, Clock, Calendar, User as UserIcon, MessageSquare, Flag, CheckSquare, Square, UserPlus, X, RefreshCcw, ChevronDown, Download, Search, Info, Bell, BellOff, Edit2, PlayCircle, CheckCircle, Save, Copy, Paperclip, Link as LinkIcon, ExternalLink, File as FileIcon } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  useDraggable,
  useDroppable
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

function UserSelector({ 
  team, 
  value, 
  onChange, 
  placeholder = "Select Member" 
}: { 
  team: UserProfile[]; 
  value: string; 
  onChange: (uid: string) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const selectedUser = team.find(m => m.uid === value);

  const filteredTeam = team.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between hover:border-slate-300 transition-colors focus:ring-2 focus:ring-blue-500/20 outline-none"
      >
        <div className="flex items-center space-x-2">
          {selectedUser ? (
            <>
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">
                {selectedUser.name[0]}
              </div>
              <span className="text-sm font-medium text-slate-900 truncate max-w-[150px]">{selectedUser.name}</span>
            </>
          ) : (
            <span className="text-sm text-slate-400">{placeholder}</span>
          )}
        </div>
        <ChevronDown size={16} className={`text-slate-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => { setIsOpen(false); setSearchTerm(''); }} />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-50 mt-2 w-full bg-white rounded-xl shadow-xl border border-slate-100 py-2 max-h-72 flex flex-col"
            >
              <div className="px-3 pb-2 border-b border-slate-50">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search team..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              <div className="overflow-y-auto flex-1 h-full min-h-0">
                <button
                  type="button"
                  onClick={() => { onChange(''); setIsOpen(false); setSearchTerm(''); }}
                  className="w-full px-4 py-2 text-left text-xs text-slate-500 hover:bg-slate-50 font-medium"
                >
                  Unassigned
                </button>
                {filteredTeam.length > 0 ? (
                  filteredTeam.map(member => (
                    <button
                      key={member.uid}
                      type="button"
                      onClick={() => { onChange(member.uid); setIsOpen(false); setSearchTerm(''); }}
                      className="w-full px-4 py-2 flex items-center space-x-3 hover:bg-blue-50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                        {member.name[0]}
                      </div>
                      <div className="text-left overflow-hidden">
                        <p className="text-sm font-bold text-slate-900 leading-none truncate">{member.name}</p>
                        <p className="text-[10px] text-slate-400 mt-1 uppercase truncate">{member.role}</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-slate-400 text-xs">
                    No members found
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function DraggableTaskCard({ task, leads, team, deleteTask, toggleStatus, isSelected, onToggleSelect, updateSubtasks, onOpenDetail }: { 
  task: Task; 
  leads: Lead[]; 
  team: UserProfile[]; 
  deleteTask: (id: string) => void; 
  toggleStatus: (task: Task) => void;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  updateSubtasks: (taskId: string, subtasks: any[]) => Promise<void>;
  onOpenDetail: (task: Task) => void;
  key?: React.Key;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task }
  });

  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const completedSubtasks = task.subtasks?.filter(s => s.completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    const newSubtask = {
      id: Math.random().toString(36).substr(2, 9),
      title: newSubtaskTitle.trim(),
      completed: false
    };
    updateSubtasks(task.id, [...(task.subtasks || []), newSubtask]);
    setNewSubtaskTitle('');
  };

  const toggleSubtask = (subId: string) => {
    const updatedSubtasks = task.subtasks?.map(s => 
      s.id === subId ? { ...s, completed: !s.completed } : s
    );
    updateSubtasks(task.id, updatedSubtasks || []);
  };

  const deleteSubtask = (subId: string) => {
    const updatedSubtasks = task.subtasks?.filter(s => s.id !== subId);
    updateSubtasks(task.id, updatedSubtasks || []);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onOpenDetail(task)}
      className={`bg-white p-4 rounded-xl border transition-all group relative cursor-pointer active:cursor-grabbing hover:translate-y-[-2px] ${
        isSelected ? 'border-blue-500 ring-2 ring-blue-100 shadow-md' : 'border-slate-100 shadow-sm hover:shadow-lg'
      }`}
    >
      {/* Priority Border Accent */}
      <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full ${
        task.priority === 'High' ? 'bg-rose-500' :
        task.priority === 'Medium' ? 'bg-amber-500' :
        'bg-blue-500'
      }`} />
      
      <div className="flex justify-between items-start mb-2 ml-1">
        <div className="flex items-start space-x-2">
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onToggleSelect(task.id); }}
            className={`mt-1 transition-colors ${isSelected ? 'text-blue-600' : 'text-slate-300 hover:text-slate-400'}`}
          >
            {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
          </button>
          <div className="min-w-0">
            <h4 className="font-bold text-slate-900 leading-tight truncate">{task.title}</h4>
            <div className="flex items-center space-x-1 mt-0.5">
               {task.reminderEnabled && <Bell size={10} className="text-blue-500" />}
               {task.status === 'In Progress' && <PlayCircle size={10} className="text-amber-500" />}
               {task.status === 'Done' && <CheckCircle size={10} className="text-emerald-500" />}
            </div>
          </div>
        </div>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
          className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
        >
          <Trash2 size={16} />
        </button>
      </div>
      <p className="text-sm text-slate-500 line-clamp-2 mb-3 ml-1">{task.description}</p>
      
      {/* Subtasks Summary */}
      {totalSubtasks > 0 && (
        <div className="mb-3 ml-1">
           <div className="flex justify-between items-center mb-1">
             <span className="text-[10px] font-bold text-slate-400 uppercase">Progress</span>
             <span className="text-[10px] font-bold text-slate-600">{Math.round((completedSubtasks/totalSubtasks)*100)}%</span>
           </div>
           <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: `${(completedSubtasks/totalSubtasks)*100}%` }}
               className="h-full bg-blue-500 rounded-full"
             />
           </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4 ml-1">
        <div className={`flex items-center space-x-1 text-[10px] font-bold px-2 py-1 rounded-md ${
          task.priority === 'High' ? 'text-rose-600 bg-rose-50' :
          task.priority === 'Medium' ? 'text-amber-600 bg-amber-50' :
          'text-blue-600 bg-blue-50'
        }`}>
          <Flag size={10} />
          <span>{task.priority}</span>
        </div>
        {task.leadId && (
          <div className="flex items-center space-x-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
            <MessageSquare size={10} />
            <span>{leads.find(l => l.id === task.leadId)?.name || 'Lead'}</span>
          </div>
        )}
        {task.dueDate && (
          <div className="flex items-center space-x-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
            <Calendar size={10} />
            <span>{new Date(task.dueDate).toLocaleDateString()}</span>
          </div>
        )}
        {task.attachments && task.attachments.length > 0 && (
          <div className="flex items-center space-x-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
            <Paperclip size={10} />
            <span>{task.attachments.length}</span>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-slate-50">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
            {team.find(m => m.uid === task.assignedTo)?.name[0] || '?'}
          </div>
          <span className="text-xs text-slate-500 truncate max-w-[80px]">
            {team.find(m => m.uid === task.assignedTo)?.name || 'Unassigned'}
          </span>
        </div>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); toggleStatus(task); }}
          className={`p-1.5 rounded-lg transition-colors ${
            task.status === 'Done' ? 'text-emerald-500 bg-emerald-50' : 'text-slate-400 bg-slate-50 hover:text-blue-500'
          }`}
        >
          {task.status === 'Done' ? <CheckCircle2 size={18} /> : <Circle size={18} />}
        </button>
      </div>
    </div>
  );
}

function TaskDetailModal({ 
  task, 
  leads, 
  team, 
  taskStatuses,
  onClose, 
  onUpdate 
}: { 
  task: Task; 
  leads: Lead[]; 
  team: UserProfile[]; 
  taskStatuses: string[];
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
}) {
  const [editedTask, setEditedTask] = useState<Task>(task);
  const [newSubtask, setNewSubtask] = useState('');
  const [newAttachment, setNewAttachment] = useState({ name: '', url: '', type: 'link' as 'file' | 'link' });
  const [showAddAttachment, setShowAddAttachment] = useState(false);

  const handleSave = async () => {
    await onUpdate(task.id, editedTask);
    onClose();
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
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center space-x-3">
             <div className={`p-2 rounded-xl ${
               editedTask.priority === 'High' ? 'bg-rose-100 text-rose-600' :
               editedTask.priority === 'Medium' ? 'bg-amber-100 text-amber-600' :
               'bg-blue-100 text-blue-600'
             }`}>
               <Flag size={20} />
             </div>
             <div>
               <h2 className="text-xl font-bold text-slate-900">Task Details</h2>
               <p className="text-xs text-slate-500">Manage and update task information</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Main Info */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block px-1">Task Title</label>
              <input 
                type="text"
                value={editedTask.title || ''}
                onChange={e => setEditedTask({ ...editedTask, title: e.target.value })}
                className="w-full text-lg font-bold p-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block px-1">Description</label>
              <textarea 
                value={editedTask.description || ''}
                onChange={e => setEditedTask({ ...editedTask, description: e.target.value })}
                rows={4}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none text-sm text-slate-600"
              />
            </div>
          </div>

          {/* Attachments Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Attachments</label>
                <p className="text-[10px] text-slate-500">Links to documents, assets, or references</p>
              </div>
              <button 
                onClick={() => setShowAddAttachment(!showAddAttachment)}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl transition-colors flex items-center space-x-1"
              >
                <Paperclip size={12} />
                <span>{showAddAttachment ? 'Close' : 'Add Attachment'}</span>
              </button>
            </div>

            {showAddAttachment && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Name</label>
                    <input 
                      type="text"
                      placeholder="e.g. Design Spec"
                      value={newAttachment.name || ''}
                      onChange={e => setNewAttachment({ ...newAttachment, name: e.target.value })}
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Type</label>
                    <select
                      value={newAttachment.type}
                      onChange={e => setNewAttachment({ ...newAttachment, type: e.target.value as 'file' | 'link' })}
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white outline-none"
                    >
                      <option value="link">Link</option>
                      <option value="file">File (Metadata)</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase px-1">URL / Link</label>
                  <div className="flex space-x-2">
                    <input 
                      type="text"
                      placeholder="https://..."
                      value={newAttachment.url || ''}
                      onChange={e => setNewAttachment({ ...newAttachment, url: e.target.value })}
                      onKeyDown={e => e.key === 'Enter' && addAttachment()}
                      className="flex-1 p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                    <button 
                      onClick={addAttachment}
                      className="bg-blue-600 text-white px-4 rounded-xl text-xs font-bold hover:bg-blue-500"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {editedTask.attachments?.map(attachment => (
                <div key={attachment.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all group">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${attachment.type === 'file' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                      {attachment.type === 'file' ? <FileIcon size={16} /> : <LinkIcon size={16} />}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-slate-800 truncate leading-tight mb-0.5">{attachment.name}</p>
                      <a 
                        href={attachment.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[10px] text-slate-400 hover:text-blue-500 flex items-center space-x-1"
                      >
                        <span className="truncate max-w-[120px]">{attachment.url}</span>
                        <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeAttachment(attachment.id)}
                    className="p-1 px-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all font-bold"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {(!editedTask.attachments || editedTask.attachments.length === 0) && !showAddAttachment && (
                <div className="sm:col-span-2 py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-2 text-slate-300 shadow-sm border border-slate-100">
                    <Paperclip size={18} />
                  </div>
                  <p className="text-xs font-medium text-slate-400 italic">No files or links attached</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block px-1">Assignee</label>
                <UserSelector 
                  team={team} 
                  value={editedTask.assignedTo || ''} 
                  onChange={val => setEditedTask({ ...editedTask, assignedTo: val })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block px-1">Related Lead</label>
                <select 
                  value={editedTask.leadId || ''}
                  onChange={e => setEditedTask({ ...editedTask, leadId: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">No Lead</option>
                  {leads.map(lead => (
                    <option key={lead.id} value={lead.id}>{lead.name} ({lead.service})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block px-1">Status & Priority</label>
                <div className="grid grid-cols-2 gap-3">
                  <select 
                    value={editedTask.status}
                    onChange={e => setEditedTask({ ...editedTask, status: e.target.value })}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                  >
                    {taskStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select 
                    value={editedTask.priority}
                    onChange={e => setEditedTask({ ...editedTask, priority: e.target.value as any })}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block px-1">Due Date & Reminders</label>
                <div className="space-y-3">
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="date"
                      value={editedTask.dueDate || ''}
                      onChange={e => setEditedTask({ ...editedTask, dueDate: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <button
                    onClick={() => setEditedTask({ ...editedTask, reminderEnabled: !editedTask.reminderEnabled })}
                    className={`w-full p-3 rounded-xl flex items-center justify-between border transition-all ${
                      editedTask.reminderEnabled ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                       {editedTask.reminderEnabled ? <Bell size={16} /> : <BellOff size={16} />}
                       <span className="text-sm font-medium">Due Date Reminder</span>
                    </div>
                    <div className={`w-8 h-4 rounded-full relative transition-colors ${editedTask.reminderEnabled ? 'bg-blue-500' : 'bg-slate-300'}`}>
                       <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${editedTask.reminderEnabled ? 'right-0.5' : 'left-0.5'}`} />
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block px-1">Tracking Dates</label>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2 text-slate-500">
                      <Clock size={14} />
                      <span className="text-xs font-medium">Created</span>
                    </div>
                    <span className="text-xs font-bold text-slate-700">{new Date(editedTask.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2 text-amber-600">
                      <PlayCircle size={14} />
                      <span className="text-xs font-medium">Started</span>
                    </div>
                    <span className="text-xs font-bold text-slate-700">
                      {editedTask.startedAt ? new Date(editedTask.startedAt).toLocaleDateString() : 'Not started'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2 text-emerald-600">
                      <CheckCircle size={14} />
                      <span className="text-xs font-medium">Completed</span>
                    </div>
                    <span className="text-xs font-bold text-slate-700">
                      {editedTask.completedAt ? new Date(editedTask.completedAt).toLocaleDateString() : '--'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Subtasks Section */}
          <div>
            <div className="flex justify-between items-end mb-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block px-1">Subtasks</label>
                <p className="text-[10px] text-slate-500 px-1">Break down this task into smaller steps</p>
              </div>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                {editedTask.subtasks?.filter(s => s.completed).length || 0} / {editedTask.subtasks?.length || 0} Complete
              </span>
            </div>
            
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
              <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {editedTask.subtasks?.map(sub => (
                  <div key={sub.id} className="flex items-center justify-between group bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <button 
                        onClick={() => toggleSubtask(sub.id)}
                        className={`transition-colors ${sub.completed ? 'text-emerald-500' : 'text-slate-300 hover:text-slate-400'}`}
                      >
                        {sub.completed ? <CheckSquare size={20} /> : <Square size={20} />}
                      </button>
                      <span className={`text-sm truncate ${sub.completed ? 'text-slate-400 line-through' : 'text-slate-700 font-medium'}`}>
                        {sub.title}
                      </span>
                    </div>
                    <button 
                      onClick={() => removeSubtask(sub.id)}
                      className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                {(!editedTask.subtasks || editedTask.subtasks.length === 0) && (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 bg-slate-200/50 rounded-full flex items-center justify-center mx-auto mb-2 text-slate-400">
                      <CheckSquare size={20} />
                    </div>
                    <p className="text-xs text-slate-400">No subtasks yet</p>
                  </div>
                )}
              </div>
              <div className="flex space-x-2 pt-2 border-t border-slate-200">
                <input 
                  type="text"
                  placeholder="New subtask title..."
                  value={newSubtask || ''}
                  onChange={e => setNewSubtask(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addSubtask()}
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <button 
                  onClick={addSubtask}
                  className="bg-slate-900 text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex space-x-3">
          <button 
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all font-sans uppercase tracking-widest"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all font-sans uppercase tracking-widest"
          >
            Save Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function DroppableColumn({ status, children, count }: { status: string; children: React.ReactNode; count: number; key?: React.Key }) {
  const { isOver, setNodeRef } = useDroppable({
    id: status,
  });

  return (
    <div 
      ref={setNodeRef}
      className={`space-y-4 min-h-[500px] p-2 rounded-2xl transition-colors ${isOver ? 'bg-blue-50/50 ring-2 ring-blue-200 ring-dashed' : ''}`}
    >
      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-2 px-2">
        <span>{status}</span>
        <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px]">
          {count}
        </span>
      </h3>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}

export default function TasksPage({ user }: { user: UserProfile }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [team, setTeam] = useState<UserProfile[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshingTeam, setRefreshingTeam] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('All');
  const [filterAssignee, setFilterAssignee] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [activeMobileColumn, setActiveMobileColumn] = useState<string>('');
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [bulkAssignUserId, setBulkAssignUserId] = useState<string>('');

  const taskStatuses = company?.taskStatuses?.length ? company.taskStatuses : ['Todo', 'In Progress', 'Done'];
  const lastStatus = taskStatuses[taskStatuses.length - 1];

  useEffect(() => {
    if (taskStatuses.length > 0 && (!activeMobileColumn || !taskStatuses.includes(activeMobileColumn))) {
      setActiveMobileColumn(taskStatuses[0]);
    }
  }, [taskStatuses, activeMobileColumn]);

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    dueDate: '',
    status: '',
    priority: 'Medium' as const,
    assignedTo: '',
    leadId: '',
    reminderEnabled: false,
    subtasks: [] as any[]
  });

  useEffect(() => {
    if (!newTask.status && taskStatuses.length > 0) {
      setNewTask(prev => ({ ...prev, status: taskStatuses[0] }));
    }
  }, [taskStatuses, newTask.status]);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    const tasksQ = query(collection(db, 'tasks'), where('companyId', '==', user.companyId));
    const leadsQ = query(collection(db, 'leads'), where('companyId', '==', user.companyId));
    const teamQ = query(collection(db, 'users'), where('companyId', '==', user.companyId));
    const templatesQ = query(collection(db, 'taskTemplates'), where('companyId', '==', user.companyId));
    const companyRef = doc(db, 'companies', user.companyId);

    const unsubTasks = onSnapshot(tasksQ, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
      setLoading(false);
    });

    const unsubLeads = onSnapshot(leadsQ, (snap) => {
      setLeads(snap.docs.map(d => ({ id: d.id, ...d.data() } as Lead)));
    });

    const unsubTeam = onSnapshot(teamQ, (snap) => {
      setTeam(snap.docs.map(d => d.data() as UserProfile));
    });

    const unsubTemplates = onSnapshot(templatesQ, (snap) => {
      setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() } as TaskTemplate)));
    });

    const unsubCompany = onSnapshot(companyRef, (snap) => {
      if (snap.exists()) {
        setCompany({ id: snap.id, ...snap.data() } as Company);
      }
    });

    return () => {
      unsubTasks();
      unsubLeads();
      unsubTeam();
      unsubTemplates();
      unsubCompany();
    };
  }, [user.companyId]);

  const refreshTeam = async () => {
    setRefreshingTeam(true);
    try {
      const teamQ = query(collection(db, 'users'), where('companyId', '==', user.companyId));
      const snap = await getDocs(teamQ);
      setTeam(snap.docs.map(d => d.data() as UserProfile));
      toast.success('Team list refreshed');
    } catch (error) {
      toast.error('Failed to refresh team');
    } finally {
      setRefreshingTeam(false);
    }
  };

  const exportTasksToCSV = () => {
    if (tasks.length === 0) {
      toast.error('No tasks to export');
      return;
    }
    const headers = ['Title', 'Description', 'Status', 'Priority', 'Assigned To', 'Related Lead', 'Due Date', 'Created At'];
    const rows = tasks.map(task => [
      task.title,
      task.description,
      task.status,
      task.priority,
      team.find(m => m.uid === task.assignedTo)?.name || 'Unassigned',
      leads.find(l => l.id === task.leadId)?.name || 'None',
      task.dueDate || 'N/A',
      task.createdAt
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `nexus_tasks_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Tasks exported successfully');
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'tasks'), {
        ...newTask,
        status: newTask.status || taskStatuses[0],
        companyId: user.companyId,
        notificationSent: false,
        createdAt: new Date().toISOString()
      });
      toast.success('Task created successfully');
      setShowAddModal(false);
      setNewTask({ title: '', description: '', dueDate: '', status: taskStatuses[0], priority: 'Medium', assignedTo: '', leadId: '', reminderEnabled: false, subtasks: [] });
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  const handleSaveTemplate = async () => {
    if (!newTask.title) {
      toast.error('Please enter at least a task title');
      return;
    }
    const templateName = prompt('Enter a name for this template:');
    if (!templateName) return;

    try {
      await addDoc(collection(db, 'taskTemplates'), {
        name: templateName,
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        subtasks: newTask.subtasks.map(s => ({ title: s.title })),
        companyId: user.companyId,
        createdAt: new Date().toISOString()
      });
      toast.success('Template saved successfully');
    } catch (error) {
      toast.error('Failed to save template');
    }
  };

  const applyTemplate = (template: TaskTemplate) => {
    setNewTask(prev => ({
      ...prev,
      title: template.title,
      description: template.description,
      priority: template.priority,
      subtasks: template.subtasks.map(s => ({
        id: Math.random().toString(36).substr(2, 9),
        title: s.title,
        completed: false
      }))
    }));
    toast.success('Template applied');
  };

  const deleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await deleteDoc(doc(db, 'taskTemplates', templateId));
      toast.success('Template deleted');
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };

  const toggleStatus = async (task: Task) => {
    const currentIndex = taskStatuses.indexOf(task.status);
    const nextIndex = (currentIndex + 1) % taskStatuses.length;
    const nextStatus = taskStatuses[nextIndex];
    
    const updates: any = { status: nextStatus };
    
    // Auto tracking dates based on context (In-Progress usually means 2nd column)
    if (nextStatus === taskStatuses[1] && !task.startedAt) {
      updates.startedAt = new Date().toISOString();
    }
    if (nextStatus === lastStatus) {
      updates.completedAt = new Date().toISOString();
    } else {
      updates.completedAt = null;
    }

    try {
      await updateDoc(doc(db, 'tasks', task.id), updates);
      if (selectedTask?.id === task.id) {
        setSelectedTask(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', id));
      toast.success('Task deleted');
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), updates);
      toast.success('Task updated');
      if (selectedTask?.id === taskId) {
        setSelectedTask(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const updateSubtasks = async (taskId: string, subtasks: any[]) => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), { subtasks });
    } catch (error) {
      toast.error('Failed to update subtasks');
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const task = active.data.current?.task as Task;
      const newStatus = over.id as Task['status'];
      
      if (task.status !== newStatus) {
        try {
          await updateDoc(doc(db, 'tasks', task.id), { status: newStatus });
          toast.success(`Task moved to ${newStatus}`);
        } catch (error) {
          toast.error('Failed to move task');
        }
      }
    }
  };

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const handleBulkStatusUpdate = async (status: Task['status']) => {
    if (selectedTaskIds.length === 0) return;
    const batch = writeBatch(db);
    selectedTaskIds.forEach(id => {
      batch.update(doc(db, 'tasks', id), { status });
    });
    try {
      await batch.commit();
      toast.success(`Updated ${selectedTaskIds.length} tasks to ${status}`);
      setSelectedTaskIds([]);
    } catch (error) {
      toast.error('Failed to update tasks');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTaskIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedTaskIds.length} tasks?`)) return;
    const batch = writeBatch(db);
    selectedTaskIds.forEach(id => {
      batch.delete(doc(db, 'tasks', id));
    });
    try {
      await batch.commit();
      toast.success(`Deleted ${selectedTaskIds.length} tasks`);
      setSelectedTaskIds([]);
    } catch (error) {
      toast.error('Failed to delete tasks');
    }
  };

  const handleBulkAssign = async (userId: string) => {
    if (selectedTaskIds.length === 0 || !userId) return;
    const batch = writeBatch(db);
    selectedTaskIds.forEach(id => {
      batch.update(doc(db, 'tasks', id), { assignedTo: userId });
    });
    try {
      await batch.commit();
      const userName = team.find(m => m.uid === userId)?.name || 'user';
      toast.success(`Assigned ${selectedTaskIds.length} tasks to ${userName}`);
      setSelectedTaskIds([]);
      setBulkAssignUserId('');
    } catch (error) {
      toast.error('Failed to assign tasks');
    }
  };

  const filteredTasks = tasks
    .filter(task => 
      (task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
       task.description.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (filterPriority === 'All' || task.priority === filterPriority) &&
      (filterAssignee === 'All' || task.assignedTo === filterAssignee)
    )
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'dueDate') {
        const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
        const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
        comparison = dateA - dateB;
      } else if (sortBy === 'priority') {
        const levels: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
        comparison = (levels[a.priority] || 0) - (levels[b.priority] || 0);
      } else {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        comparison = dateA - dateB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  return (
    <div className="space-y-6 md:space-y-8 relative pb-28 min-h-screen">
      {/* Task Detail Modal */}
      <AnimatePresence>
        {selectedTask && (
          <TaskDetailModal 
            task={selectedTask}
            leads={leads}
            team={team}
            taskStatuses={taskStatuses}
            onClose={() => setSelectedTask(null)}
            onUpdate={updateTask}
          />
        )}
      </AnimatePresence>
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Project Board</h2>
          <p className="text-slate-500 text-sm mt-1">Manage tasks, deadlines, and team assignments</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={exportTasksToCSV}
            className="flex-1 sm:flex-none justify-center bg-white text-slate-600 border border-slate-200 px-4 py-2.5 rounded-xl flex items-center space-x-2 hover:bg-slate-50 hover:border-slate-300 transition-all text-sm font-semibold shadow-sm"
          >
            <Download size={18} />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button
            onClick={refreshTeam}
            disabled={refreshingTeam}
            className={`p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100 ${refreshingTeam ? 'animate-spin text-blue-600' : ''}`}
            title="Refresh Team List"
          >
            <RefreshCcw size={20} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-none justify-center bg-slate-900 text-white px-5 py-2.5 rounded-xl flex items-center space-x-2 hover:bg-slate-800 transition-all text-sm font-semibold shadow-xl shadow-slate-200"
          >
            <Plus size={20} />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Filters & Search Row */}
      <div className="bg-white p-3 md:p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center gap-4">
          <div className="flex-1 relative group w-full">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Search by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <div className="flex-1 min-w-[140px] flex items-center space-x-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase ml-2 hidden sm:inline">Assignee</span>
              <select
                value={filterAssignee}
                onChange={(e) => setFilterAssignee(e.target.value)}
                className="bg-transparent text-xs sm:text-sm font-semibold text-slate-700 outline-none border-none py-1 focus:ring-0 cursor-pointer w-full"
              >
                <option value="All font-bold">All Team</option>
                {team.map(m => <option key={m.uid} value={m.uid}>{m.name}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[140px] flex items-center space-x-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase ml-2 hidden sm:inline">Priority</span>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="bg-transparent text-xs sm:text-sm font-semibold text-slate-700 outline-none border-none py-1 focus:ring-0 cursor-pointer w-full"
              >
                <option value="All">All Levels</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div className="flex-1 min-w-[180px] flex items-center space-x-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase ml-2 hidden sm:inline">Sort</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-xs sm:text-sm font-semibold text-slate-700 outline-none border-none py-1 focus:ring-0 cursor-pointer flex-1"
              >
                <option value="createdAt">Date Created</option>
                <option value="dueDate">Due Date</option>
                <option value="priority">Priority Level</option>
              </select>
              <button 
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="p-1 px-2 text-slate-400 hover:text-blue-600 transition-colors border-l border-slate-200"
                title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              >
                {sortOrder === 'asc' ? <Flag size={14} className="rotate-180" /> : <Flag size={14} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Column Tabs */}
      <div className="flex lg:hidden bg-white p-1 rounded-2xl border border-slate-100 shadow-sm mb-4 sticky top-20 z-10 overflow-x-auto no-scrollbar">
        {taskStatuses.map((status) => (
          <button
            key={status}
            onClick={() => setActiveMobileColumn(status)}
            className={`flex-1 min-w-[100px] py-2.5 rounded-xl text-sm font-bold transition-all relative ${
              activeMobileColumn === status 
                ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            {status}
            <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${
              activeMobileColumn === status ? 'bg-white/20' : 'bg-slate-100'
            }`}>
              {filteredTasks.filter(t => t.status === status).length}
            </span>
          </button>
        ))}
      </div>

      <DndContext 
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col lg:flex-row gap-8 overflow-x-auto pb-6 custom-scrollbar lg:items-start">
          {taskStatuses.map((status) => (
            <div key={status} className={`lg:min-w-[340px] lg:max-w-[400px] lg:flex-1 ${activeMobileColumn === status ? 'block' : 'hidden lg:block'}`}>
              <DroppableColumn 
                status={status} 
                count={filteredTasks.filter(t => t.status === status).length}
              >
                {filteredTasks.filter(t => t.status === status).map((task) => (
                  <DraggableTaskCard 
                    key={task.id} 
                    task={task} 
                    leads={leads} 
                    team={team}
                    deleteTask={deleteTask}
                    toggleStatus={toggleStatus}
                    isSelected={selectedTaskIds.includes(task.id)}
                    onToggleSelect={toggleTaskSelection}
                    updateSubtasks={updateSubtasks}
                    onOpenDetail={(t) => setSelectedTask(t)}
                  />
                ))}
                {filteredTasks.filter(t => t.status === status).length === 0 && (
                  <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl">
                    <p className="text-slate-400 text-sm">No tasks here</p>
                  </div>
                )}
              </DroppableColumn>
            </div>
          ))}
        </div>
      </DndContext>

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selectedTaskIds.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-3 md:px-6 md:py-4 rounded-2xl md:rounded-3xl shadow-2xl flex flex-col md:flex-row items-center gap-4 md:gap-6 border border-slate-700 w-[95%] md:w-auto overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
          >
            <div className="flex items-center justify-between w-full md:w-auto md:border-r border-slate-700 md:pr-6">
              <div className="flex items-center space-x-3">
                <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                  {selectedTaskIds.length}
                </span>
                <span className="text-sm font-bold whitespace-nowrap">Selected</span>
              </div>
              <button 
                onClick={() => setSelectedTaskIds([])}
                className="md:ml-2 text-slate-400 hover:text-white transition-colors p-1"
                title="Clear Selection"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center justify-between w-full md:w-auto gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
              <button
                onClick={() => handleBulkStatusUpdate(lastStatus)}
                className="flex items-center space-x-2 px-3 py-2 rounded-xl hover:bg-slate-800 transition-colors text-xs sm:text-sm font-bold text-emerald-400 whitespace-nowrap"
              >
                <CheckCircle2 size={18} className="shrink-0" />
                <span>Mark Done</span>
              </button>

              <div className="flex items-center space-x-2 group relative min-w-[140px] flex-1 md:flex-none">
                <UserPlus size={16} className="text-blue-400 absolute left-3 z-10 pointer-events-none" />
                <select
                  className="w-full bg-slate-800 text-white text-[10px] sm:text-xs font-bold py-2.5 pl-9 pr-6 rounded-xl border-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none truncate"
                  value={bulkAssignUserId}
                  onChange={(e) => handleBulkAssign(e.target.value)}
                >
                  <option value="" className="bg-slate-900">Assign...</option>
                  {team.map(m => (
                    <option key={m.uid} value={m.uid} className="bg-slate-900">{m.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="text-slate-500 absolute right-3 z-10 pointer-events-none" />
              </div>

              <button
                onClick={handleBulkDelete}
                className="flex items-center space-x-2 px-3 py-2 rounded-xl hover:bg-red-500/10 text-red-500 hover:text-red-400 transition-all text-xs sm:text-sm font-bold whitespace-nowrap"
              >
                <Trash2 size={18} className="shrink-0" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-slate-900">Create New Task</h3>
                <button 
                   type="button"
                   onClick={() => setShowAddModal(false)}
                   className="p-2 hover:bg-slate-100 rounded-full text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              {templates.length > 0 && (
                <div className="mb-6 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <label className="block text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2">Use Template</label>
                  <div className="flex flex-wrap gap-2">
                    {templates.map(tmpl => (
                      <div key={tmpl.id} className="group relative flex items-center">
                        <button
                          type="button"
                          onClick={() => applyTemplate(tmpl)}
                          className="px-3 py-1.5 bg-white border border-blue-200 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                        >
                          {tmpl.name}
                        </button>
                        <button 
                          type="button" 
                          onClick={() => deleteTemplate(tmpl.id)}
                          className="p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleAddTask} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Task Title</label>
                  <input
                    type="text"
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    value={newTask.title || ''}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="e.g. Follow up with client"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Description</label>
                  <textarea
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    value={newTask.description || ''}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    placeholder="Task details..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Due Date</label>
                    <input
                      type="date"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      value={newTask.dueDate || ''}
                      onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    />
                  </div>
                  <div className="flex items-end pb-1">
                    <button
                      type="button"
                      onClick={() => setNewTask({ ...newTask, reminderEnabled: !newTask.reminderEnabled })}
                      className={`w-full p-3 rounded-xl flex items-center justify-between border transition-all ${
                        newTask.reminderEnabled ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                         {newTask.reminderEnabled ? <Bell size={16} /> : <BellOff size={16} />}
                         <span className="text-xs font-bold uppercase tracking-wider">Reminder</span>
                      </div>
                      <div className={`w-6 h-3 rounded-full relative transition-colors ${newTask.reminderEnabled ? 'bg-blue-500' : 'bg-slate-300'}`}>
                         <div className={`absolute top-0.5 w-2 h-2 bg-white rounded-full transition-all ${newTask.reminderEnabled ? 'right-0.5' : 'left-0.5'}`} />
                      </div>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Assign To</label>
                  <UserSelector 
                    team={team}
                    value={newTask.assignedTo || ''}
                    onChange={(uid) => setNewTask({ ...newTask, assignedTo: uid })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Priority</label>
                    <select
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                      value={newTask.priority || 'Medium'}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Related Lead</label>
                    <select
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-sm"
                      value={newTask.leadId || ''}
                      onChange={(e) => setNewTask({ ...newTask, leadId: e.target.value })}
                    >
                      <option value="">None</option>
                      {leads.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5 flex justify-between">
                    <span>Subtasks</span>
                    <button 
                      type="button"
                      onClick={() => {
                        const title = prompt('Enter subtask:');
                        if (title) {
                          setNewTask({
                            ...newTask,
                            subtasks: [...newTask.subtasks, { id: Math.random().toString(36).substr(2, 9), title, completed: false }]
                          });
                        }
                      }}
                      className="text-blue-600 hover:text-blue-700 text-xs flex items-center gap-1"
                    >
                      <Plus size={12} /> Add
                    </button>
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto px-1">
                    {newTask.subtasks.map((sub, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-xs text-slate-600 truncate">{sub.title}</span>
                        <button 
                          type="button"
                          onClick={() => setNewTask({ ...newTask, subtasks: newTask.subtasks.filter((_, i) => i !== idx) })}
                          className="text-slate-300 hover:text-rose-500 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    {newTask.subtasks.length === 0 && (
                      <p className="text-[10px] text-slate-400 italic">No subtasks added yet</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 p-3 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all border border-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveTemplate}
                    className="flex-1 p-3 rounded-xl font-bold text-blue-600 border border-blue-200 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={18} />
                    <span>Template</span>
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] bg-slate-900 text-white p-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                  >
                    Create Task
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
