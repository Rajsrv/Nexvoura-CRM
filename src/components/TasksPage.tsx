import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, writeBatch, getDocs, getDoc } from 'firebase/firestore';
import { UserProfile, Task, Lead, TaskTemplate, Company, Attachment, AppNotification } from '../types';
import { useNotifications } from '../contexts/NotificationContext';
import { Plus, Trash2, CheckCircle2, Circle, Clock, Calendar, Filter, User as UserIcon, MessageSquare, Flag, CheckSquare, Square, UserPlus, X, RefreshCcw, ChevronDown, Download, Search, Info, Bell, BellOff, Edit2, PlayCircle, CheckCircle, Save, Copy, Paperclip, Link as LinkIcon, ExternalLink, File as FileIcon, AlertCircle, Star } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { isPast, parseISO } from 'date-fns';
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
import { AddTaskModal } from './AddTaskModal';
import { TaskDetailModal } from './TaskDetailModal';

function DraggableTaskCard({ user, task, leads, team, deleteTask, toggleStatus, isSelected, onToggleSelect, updateSubtasks, onOpenDetail }: { 
  user: UserProfile;
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

  const canDelete = user.role === 'admin' || user.role === 'manager' || user.role === 'team_lead';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onOpenDetail(task)}
      className={`bg-white dark:bg-dark-surface p-5 rounded-2xl border transition-all group relative cursor-pointer active:cursor-grabbing hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none ${
        isSelected ? 'border-brand-primary ring-4 ring-brand-primary/5 shadow-xl shadow-brand-primary/10' : 'border-slate-100 dark:border-dark-border shadow-sm'
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-start space-x-2.5">
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onToggleSelect(task.id); }}
            className={`mt-1 transition-colors ${isSelected ? 'text-brand-primary' : 'text-slate-300 dark:text-slate-600 hover:text-slate-400'}`}
          >
            {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
          </button>
          <div className="min-w-0">
            <h4 className="font-bold text-slate-900 dark:text-white leading-tight text-[15px] group-hover:text-brand-primary transition-colors truncate">
              {task.title}
            </h4>
            <div className="flex items-center space-x-2 mt-1">
               {task.reminderEnabled && <Bell size={10} className="text-brand-primary" />}
               <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                 task.priority === 'High' ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-500' :
                 task.priority === 'Medium' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-500' :
                 'bg-blue-50 dark:bg-blue-500/10 text-blue-500'
               }`}>
                 {task.priority || 'Normal'}
               </span>
            </div>
          </div>
        </div>
        {canDelete && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
            className="text-slate-300 dark:text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-1"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      
      <p className="text-[13px] text-slate-500 dark:text-dark-text-muted line-clamp-2 mb-4 font-medium leading-relaxed">
        {task.description}
      </p>
      
      {/* Subtasks Summary */}
      {totalSubtasks > 0 && (
        <div className="mb-4 bg-slate-50 dark:bg-dark-bg/50 p-2.5 rounded-xl border border-slate-100/50 dark:border-dark-border">
           <div className="flex justify-between items-center mb-1.5">
             <div className="flex items-center space-x-1.5">
                <CheckCircle2 size={12} className="text-emerald-500" />
                <span className="text-[10px] font-bold text-slate-400 dark:text-dark-text-muted uppercase tracking-widest">Progress</span>
             </div>
             <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black text-slate-900 dark:text-white bg-white dark:bg-dark-surface px-1.5 py-0.5 rounded border border-slate-100 dark:border-dark-border shadow-sm">
                  {Math.round((completedSubtasks / totalSubtasks) * 100)}%
                </span>
                <span className="text-[10px] font-bold text-slate-400 dark:text-dark-text-muted">{completedSubtasks}/{totalSubtasks}</span>
             </div>
           </div>
           <div className="w-full bg-slate-200/50 dark:bg-dark-border h-1 rounded-full overflow-hidden">
             <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(completedSubtasks/totalSubtasks)*100}%` }}
                className="h-full bg-brand-primary rounded-full transition-all duration-500"
             />
           </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-slate-50 dark:border-dark-border">
        <div className="flex -space-x-1.5">
          {task.assignedTo ? (
            <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-dark-bg border-2 border-white dark:border-dark-surface flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-dark-text-muted shadow-sm" title={team.find(m => m.uid === task.assignedTo)?.name}>
              {team.find(m => m.uid === task.assignedTo)?.name[0]}
            </div>
          ) : (
            <div className="w-7 h-7 rounded-full bg-slate-50 dark:bg-dark-bg border-2 border-white dark:border-dark-surface flex items-center justify-center text-[10px] font-bold text-slate-300 dark:text-slate-700 italic">
               ?
            </div>
          )}
        </div>
        
        {task.dueDate && (
          <div className="flex items-center space-x-1 text-[11px] font-bold text-slate-400 dark:text-dark-text-muted">
            <Clock size={11} />
            <span>{new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function DroppableColumn({ status, children, count }: { status: string, children: React.ReactNode, count: number }) {
  const { setNodeRef, isOver } = useDroppable({
    id: status
  });

  const getStatusColor = (s: string) => {
    switch(s) {
      case 'Todo': return 'from-slate-400 to-slate-500';
      case 'In Progress': return 'from-blue-500 to-indigo-600';
      case 'Review': return 'from-amber-400 to-amber-500';
      case 'Done': return 'from-emerald-400 to-emerald-500';
      default: return 'from-slate-400 to-slate-500';
    }
  };

  return (
    <div 
      ref={setNodeRef}
      className={`flex flex-col h-full min-h-[500px] rounded-[24px] p-5 transition-all duration-300 bg-slate-50/50 dark:bg-dark-bg/30 border border-slate-100 dark:border-dark-border ${
        isOver ? 'bg-brand-primary/5 dark:bg-brand-primary/10 border-brand-primary border-dashed scale-[0.99]' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-6 px-1">
        <div className="flex items-center space-x-3">
          <div className={`w-2 h-2 rounded-full bg-gradient-to-br ${getStatusColor(status)} shadow-sm`} />
          <h3 className="font-bold text-slate-900 dark:text-white tracking-tight text-sm uppercase tracking-wider">{status}</h3>
          <span className="bg-white dark:bg-dark-surface px-2 py-0.5 rounded-lg text-[10px] font-bold text-slate-400 dark:text-dark-text-muted border border-slate-200 dark:border-dark-border shadow-sm">
            {count}
          </span>
        </div>
        <button className="p-1.5 text-slate-400 dark:text-dark-text-muted hover:text-brand-primary hover:bg-white dark:hover:bg-dark-surface rounded-lg transition-all shadow-sm">
          <Plus size={16} />
        </button>
      </div>
      <div className="space-y-4 flex-1 h-full overflow-y-auto no-scrollbar pb-10">
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
  const [quickTaskTitle, setQuickTaskTitle] = useState('');

  const taskStatuses = company?.taskStatuses?.length ? company.taskStatuses : ['Todo', 'In Progress', 'Done'];
  const lastStatus = taskStatuses[taskStatuses.length - 1];

  useEffect(() => {
    if (taskStatuses.length > 0 && (!activeMobileColumn || !taskStatuses.includes(activeMobileColumn))) {
      setActiveMobileColumn(taskStatuses[0]);
    }
  }, [taskStatuses, activeMobileColumn]);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { sendNotification } = useNotifications();

  useEffect(() => {
    let tasksQ = query(collection(db, 'tasks'), where('companyId', '==', user.companyId));
    let leadsQ = query(collection(db, 'leads'), where('companyId', '==', user.companyId));

    if (user.role === 'sales' || user.role === 'team_lead') {
      tasksQ = query(
        collection(db, 'tasks'),
        where('companyId', '==', user.companyId),
        where('assignedTo', '==', user.uid)
      );
      leadsQ = query(
        collection(db, 'leads'),
        where('companyId', '==', user.companyId),
        where('assignedTo', '==', user.uid)
      );
    }
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

  const handleAddTask = async (taskData: any) => {
    try {
      const docRef = await addDoc(collection(db, 'tasks'), {
        ...taskData,
        companyId: user.companyId,
        notificationSent: true,
        createdAt: new Date().toISOString()
      });

      if (taskData.assignedTo && taskData.assignedTo !== user.uid) {
        await sendNotification({
          userId: taskData.assignedTo,
          type: 'task_assigned',
          title: 'New Mission Directive',
          message: `You have been assigned to: ${taskData.title}. Status: High Priority.`,
          link: '/tasks'
        });
      }

      toast.success('Task created successfully');
      setShowAddModal(false);
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;
    
    await handleAddTask({
      title: quickTaskTitle.trim(),
      description: '',
      status: taskStatuses[0],
      priority: 'Medium',
      subtasks: [],
      assignedTo: '',
      dueDate: null
    });
    setQuickTaskTitle('');
  };

  const handleSaveTemplateUI = async (taskData: any) => {
    if (!taskData.title) {
      toast.error('Please enter at least a task title');
      return;
    }
    const templateName = prompt('Enter a name for this template:');
    if (!templateName) return;

    try {
      await addDoc(collection(db, 'taskTemplates'), {
        name: templateName,
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority,
        subtasks: taskData.subtasks.map((s: any) => ({ title: s.title })),
        companyId: user.companyId,
        createdAt: new Date().toISOString()
      });
      toast.success('Template saved successfully');
    } catch (error) {
      toast.error('Failed to save template');
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
      const taskRef = doc(db, 'tasks', taskId);
      
      if (updates.assignedTo) {
        const taskSnap = await getDoc(taskRef);
        const oldTask = taskSnap.data() as Task;
        
        if (updates.assignedTo !== oldTask.assignedTo && updates.assignedTo !== user.uid) {
          await sendNotification({
            userId: updates.assignedTo,
            type: 'task_assigned',
            title: 'Mission Reassignment',
            message: `Priority objective "${updates.title || oldTask.title}" has been assigned to your queue.`,
            link: '/tasks'
          });
        }
      }

      await updateDoc(taskRef, updates);
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
    <div className="p-4 md:p-8 pt-6 max-w-[1600px] mx-auto space-y-8 min-h-screen bg-white dark:bg-dark-bg transition-colors duration-300">
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

      {/* Header Dashboard Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-slate-100 dark:border-dark-border">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Task Management</h1>
          <p className="text-slate-500 dark:text-dark-text-muted font-medium">Coordinate your team's tactical execution</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2 mr-4">
             {team.slice(0, 5).map(m => (
               <div key={m.uid} className="w-9 h-9 rounded-full border-2 border-white dark:border-dark-border bg-slate-100 dark:bg-dark-surface flex items-center justify-center text-xs font-bold text-slate-600 dark:text-dark-text-muted shadow-sm" title={m.name}>
                 {m.name[0]}
               </div>
             ))}
             {team.length > 5 && (
               <div className="w-9 h-9 rounded-full border-2 border-white dark:border-dark-border bg-slate-900 dark:bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                 +{team.length - 5}
               </div>
             )}
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="saas-button-primary px-6 py-3 shadow-xl shadow-brand-primary/20 flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-[#fcfcfc] dark:bg-dark-surface border border-slate-100 dark:border-dark-border rounded-3xl p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600" />
            <input
              type="text"
              placeholder="Filter by title or objective..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="saas-input pl-12 bg-white dark:bg-dark-bg border-slate-100 dark:border-dark-border"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center space-x-2 bg-white dark:bg-dark-bg px-4 py-2 rounded-2xl border border-slate-100 dark:border-dark-border shadow-sm flex-1 md:flex-none">
              <Filter size={14} className="text-slate-400 dark:text-slate-600" />
              <select
                value={filterAssignee}
                onChange={(e) => setFilterAssignee(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-600 dark:text-dark-text outline-none border-none focus:ring-0 cursor-pointer"
              >
                <option value="All">All Operatives</option>
                <option value="Unassigned">Unassigned</option>
                {team.map(m => <option key={m.uid} value={m.uid}>{m.name}</option>)}
              </select>
            </div>

            <div className="flex items-center space-x-2 bg-white dark:bg-dark-bg px-4 py-2 rounded-2xl border border-slate-100 dark:border-dark-border shadow-sm flex-1 md:flex-none">
              <Flag size={14} className="text-slate-400 dark:text-slate-600" />
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-600 dark:text-dark-text outline-none border-none focus:ring-0 cursor-pointer"
              >
                <option value="All">All Priority</option>
                <option value="High">High Clearance</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <button 
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="p-2.5 bg-white dark:bg-dark-bg text-slate-600 dark:text-dark-text rounded-2xl border border-slate-100 dark:border-dark-border shadow-sm hover:text-brand-primary transition-all"
            >
              <RefreshCcw size={18} className={sortOrder === 'asc' ? 'rotate-180' : ''} />
            </button>
            
            <button
              onClick={exportTasksToCSV}
              className="saas-button-secondary px-4 py-2 text-xs"
            >
              <Download size={16} className="mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Board Area */}
        <div className="flex-1 min-w-0">
          <div className="flex lg:hidden overflow-x-auto no-scrollbar gap-2 mb-4 bg-slate-50 dark:bg-dark-bg/50 p-1.5 rounded-2xl border border-slate-100 dark:border-dark-border">
            {taskStatuses.map((status) => (
              <button
                key={status}
                onClick={() => setActiveMobileColumn(status)}
                className={`flex-1 min-w-[120px] py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                  activeMobileColumn === status 
                    ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-lg' 
                    : 'text-slate-400 dark:text-dark-text-muted hover:bg-white dark:hover:bg-dark-surface'
                }`}
              >
                {status} ({filteredTasks.filter(t => t.status === status).length})
              </button>
            ))}
          </div>

          <DndContext 
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragEnd={handleDragEnd}
          >
            <div className="flex flex-col lg:flex-row gap-6 lg:items-start overflow-x-auto pb-8 no-scrollbar">
              {taskStatuses.map((status) => (
                <div key={status} className={`flex-1 min-w-[320px] max-w-[400px] ${activeMobileColumn === status ? 'block' : 'hidden lg:block'}`}>
                  <DroppableColumn 
                    status={status} 
                    count={filteredTasks.filter(t => t.status === status).length}
                  >
                    <div className="flex flex-col gap-4">
                      {filteredTasks.filter(t => t.status === status).map((task) => (
                        <DraggableTaskCard 
                          key={task.id} 
                          user={user}
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
                        <div className="text-center py-16 border border-dashed border-slate-200 dark:border-dark-border rounded-2xl bg-slate-50/50 dark:bg-dark-bg/20">
                          <Info size={24} className="mx-auto text-slate-200 dark:text-slate-700 mb-2" />
                          <p className="text-slate-400 dark:text-dark-text-muted text-xs font-bold uppercase tracking-widest">Zone Clear</p>
                        </div>
                      )}

                      {status === taskStatuses[0] && (
                        <div className="mt-2">
                          <form onSubmit={handleQuickAdd} className="relative group">
                            <input
                              type="text"
                              placeholder="Quick add (Enter)..."
                              value={quickTaskTitle}
                              onChange={(e) => setQuickTaskTitle(e.target.value)}
                              className="w-full bg-white dark:bg-dark-surface border border-slate-100 dark:border-dark-border rounded-xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-primary outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 shadow-sm"
                            />
                            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 hover:text-brand-primary transition-colors">
                              <Plus size={14} />
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  </DroppableColumn>
                </div>
              ))}
            </div>
          </DndContext>
        </div>

        {/* Action/Detail Sidebar (Right Side) */}
        <div className="hidden xl:block w-80 space-y-6 shrink-0">
          <div className="bg-[#fcfcfc] dark:bg-dark-surface border border-slate-100 dark:border-dark-border rounded-3xl p-6 shadow-sm">
             <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-brand-primary/10 text-brand-primary rounded-xl flex items-center justify-center">
                  <Clock size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-dark-text">Task velocity</h3>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-dark-text-muted uppercase tracking-widest">Team Performance</p>
                </div>
             </div>
             
             <div className="space-y-4">
                <div className="p-4 bg-white dark:bg-dark-bg rounded-2xl border border-slate-100 dark:border-dark-border shadow-sm">
                   <p className="text-[10px] font-bold text-slate-400 dark:text-dark-text-muted uppercase tracking-widest mb-1">Total Operations</p>
                   <p className="text-2xl font-bold text-slate-900 dark:text-dark-text">{tasks.length}</p>
                </div>
                <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 shadow-sm">
                   <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Completed</p>
                   <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-500">{tasks.filter(t => t.status === lastStatus).length}</p>
                </div>
                <div className="p-4 bg-rose-50 dark:bg-rose-500/10 rounded-2xl border border-rose-100 dark:border-rose-500/20 shadow-sm">
                   <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-1">Overdue High-Value</p>
                   <p className="text-2xl font-bold text-rose-700 dark:text-rose-500">
                     {tasks.filter(t => t.priority === 'High' && t.dueDate && isPast(parseISO(t.dueDate)) && t.status !== lastStatus).length}
                   </p>
                </div>
             </div>
          </div>
          
          <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl overflow-hidden relative">
             <div className="relative z-10">
               <h4 className="text-white font-bold mb-2">Operational Insight</h4>
               <p className="text-slate-400 text-xs leading-relaxed">
                 Coordinate cross-functional tasks with real-time sync across all team members. Use bulk actions to accelerate throughput.
               </p>
               <button 
                 onClick={refreshTeam}
                 className="mt-4 flex items-center space-x-2 text-brand-primary text-xs font-bold hover:underline"
               >
                 <RefreshCcw size={14} className={refreshingTeam ? 'animate-spin' : ''} />
                 <span>Sync Personnel</span>
               </button>
             </div>
             <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/10 rounded-full blur-3xl" />
          </div>
        </div>
      </div>

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
                <span className="bg-brand-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                  {selectedTaskIds.length}
                </span>
                <span className="text-sm font-bold whitespace-nowrap text-white">Selected</span>
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
          <AddTaskModal 
            user={user}
            team={team}
            leads={leads}
            templates={templates}
            taskStatuses={taskStatuses}
            onClose={() => setShowAddModal(false)}
            onAdd={handleAddTask}
            onSaveTemplate={handleSaveTemplateUI}
            deleteTemplate={async (id) => {
              if (!confirm('Delete template?')) return;
              await deleteDoc(doc(db, 'taskTemplates', id));
              toast.success('Template removed');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
