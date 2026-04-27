import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Save, 
  Settings, 
  FileText, 
  ChevronRight, 
  MoreVertical,
  Layers,
  CheckCircle,
  Eye,
  ExternalLink,
  Copy,
  Clock,
  Filter,
  Users,
  Layout,
  Type,
  List,
  CheckSquare,
  Hash,
  Mail,
  Phone,
  AlignLeft,
  X,
  PlusCircle,
  Trash,
  MoveUp,
  MoveDown,
  ToggleLeft,
  ToggleRight,
  MessageSquare,
  GripVertical,
  Palette,
  EyeOff,
  Calendar,
  CircleDot,
  ShieldCheck,
  Star,
  Sliders
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuth } from '../App';
import { formService, DynamicForm, FormField, FormSubmission, FormStyling, FormRedirect } from '../services/formService';
import { FormPreview } from './FormPreview';
import { Timestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { format } from 'date-fns';

const FIELD_TYPES = [
  { value: 'text', label: 'Short Text', icon: Type },
  { value: 'textarea', label: 'Long Text', icon: AlignLeft },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'tel', label: 'Phone', icon: Phone },
  { value: 'number', label: 'Number', icon: Hash },
  { value: 'select', label: 'Dropdown', icon: List },
  { value: 'checkbox', label: 'Checkbox Group', icon: CheckSquare },
  { value: 'radio', label: 'Radio Selection', icon: CircleDot },
  { value: 'date', label: 'Date Picker', icon: Calendar },
  { value: 'switch', label: 'Toggle Switch', icon: ToggleRight },
  { value: 'range', label: 'Range Slider', icon: Sliders },
  { value: 'rating', label: 'Star Rating', icon: Star },
];

const DEFAULT_STYLING: FormStyling = {
  primaryColor: '#4f46e5', // INDIGO-600
  backgroundColor: '#f8fafc', // SLATE-50
  cardColor: '#ffffff',
  textColor: '#0f172a', // SLATE-900
  labelColor: '#64748b', // SLATE-500
  buttonText: '#ffffff',
  borderRadius: '24px',
  fontFamily: 'font-sans',
  buttonStyle: 'filled',
  formWidth: 'boxed',
  headerAlignment: 'center',
  fieldSpacing: 'comfortable'
};

const DEFAULT_REDIRECT: FormRedirect = {
  url: '',
  delay: 3,
  enabled: false
};

interface SortableFieldItemProps {
  field: FormField;
  index: number;
  onUpdate: (id: string, updates: Partial<FormField>) => void;
  onRemove: (id: string) => void;
}

const SortableFieldItem: React.FC<SortableFieldItemProps> = ({ 
  field, 
  index, 
  onUpdate, 
  onRemove 
}) => {
  const [localOptionsText, setLocalOptionsText] = useState(field.options?.join(', ') || '');

  useEffect(() => {
    // Only update local text if the field options change from outside (e.g. initial load or undo/redo if implemented)
    // and if it's actually different from what we have to avoid jumping cursor
    const currentJoined = field.options?.join(', ') || '';
    if (currentJoined !== localOptionsText && !localOptionsText.endsWith(',') && !localOptionsText.endsWith(', ')) {
      setLocalOptionsText(currentJoined);
    }
  }, [field.options]);

  const handleOptionsChange = (text: string) => {
    setLocalOptionsText(text);
    // Sync with parent state
    const optionsArray = text.split(',').map(s => s.trim()).filter(s => s);
    onUpdate(field.id, { options: optionsArray });
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 1,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-8 bg-slate-50 dark:bg-dark-bg/40 border border-slate-200 dark:border-dark-border rounded-[32px] space-y-6 relative group transition-shadow ${isDragging ? 'shadow-2xl' : 'hover:shadow-lg'}`}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <button 
            {...attributes} 
            {...listeners}
            className="p-2 text-slate-300 hover:text-slate-600 dark:hover:text-slate-100 cursor-grab active:cursor-grabbing transition-colors"
          >
            <GripVertical size={18} />
          </button>
          <span className="w-8 h-8 bg-slate-950 dark:bg-indigo-600 text-white text-[10px] font-black rounded-lg flex items-center justify-center italic">
            #{index + 1}
          </span>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">{field.type} Node</span>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => onUpdate(field.id, { width: field.width === 'half' ? 'full' : 'half' })}
            className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all"
          >
            {field.width === 'half' ? 'Half Width' : 'Full Width'}
          </button>
          <button 
            onClick={() => onUpdate(field.id, { required: !field.required })}
            className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
              field.required 
                ? 'bg-rose-50 text-rose-600 border-rose-100' 
                : 'bg-white dark:bg-dark-surface text-slate-400 border-slate-200 dark:border-dark-border'
            }`}
          >
            {field.required ? 'Mandatory' : 'Optional'}
          </button>
          <button 
            onClick={() => onRemove(field.id)}
            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-white dark:hover:bg-dark-surface rounded-xl transition-all"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Label</label>
          <input
            type="text"
            value={field.label}
            onChange={(e) => onUpdate(field.id, { label: e.target.value })}
            placeholder="Question Label"
            className="w-full bg-transparent border-b border-slate-200 dark:border-dark-border py-2 text-sm font-black text-slate-950 dark:text-white outline-none focus:border-indigo-500 uppercase italic placeholder:text-slate-300"
          />
        </div>
        <div className="space-y-4">
          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Placeholder</label>
          <input
            type="text"
            value={field.placeholder || ''}
            onChange={(e) => onUpdate(field.id, { placeholder: e.target.value })}
            placeholder="Input Instruction..."
            className="w-full bg-transparent border-b border-slate-200 dark:border-dark-border py-2 text-sm font-medium text-slate-600 dark:text-dark-text-muted outline-none focus:border-indigo-500 italic placeholder:text-slate-300"
          />
        </div>
      </div>
      
      {(field.type === 'select' || field.type === 'checkbox' || field.type === 'radio') && (
        <div className="space-y-3 pt-2">
          <label className="block text-[9px] font-black text-slate-400 uppercase italic px-1">Options (Comma Separated)</label>
          <textarea
            value={localOptionsText}
            onChange={(e) => handleOptionsChange(e.target.value)}
            placeholder="Option 1, Option 2, Option 3"
            className="w-full p-4 bg-white dark:bg-dark-surface border border-slate-100 dark:border-dark-border rounded-2xl text-[11px] font-bold outline-none focus:border-indigo-400 resize-none h-20"
          />
        </div>
      )}

      {(field.type === 'number' || field.type === 'range') && (
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1">Min Value</label>
            <input
              type="number"
              value={field.validation?.min || 0}
              onChange={(e) => onUpdate(field.id, { validation: { ...field.validation, min: parseInt(e.target.value) } })}
              className="w-full bg-white dark:bg-dark-surface border border-slate-100 dark:border-dark-border rounded-xl p-3 text-xs outline-none focus:border-indigo-400"
            />
          </div>
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1">Max Value</label>
            <input
              type="number"
              value={field.validation?.max || 100}
              onChange={(e) => onUpdate(field.id, { validation: { ...field.validation, max: parseInt(e.target.value) } })}
              className="w-full bg-white dark:bg-dark-surface border border-slate-100 dark:border-dark-border rounded-xl p-3 text-xs outline-none focus:border-indigo-400"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export const FormsPage = () => {
  const { user } = useAuth();
  const [forms, setForms] = useState<DynamicForm[]>([]);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [activeTab, setActiveTab] = useState<'forms' | 'submissions'>('forms');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [selectedForm, setSelectedForm] = useState<DynamicForm | null>(null);

  const getEmbedCode = (formId: string) => {
    const url = `${window.location.origin}/form/${formId}`;
    return {
      iframe: `<iframe src="${url}" width="100%" height="800px" frameborder="0" style="border:none; border-radius: 40px; overflow: hidden; background: transparent;"></iframe>`,
      script: `<div id="nexvoura-form-${formId}"></div>\n<script>\n  (function() {\n    const container = document.getElementById('nexvoura-form-${formId}');\n    const iframe = document.createElement('iframe');\n    iframe.src = '${url}';\n    iframe.style.width = '100%';\n    iframe.style.height = '800px';\n    iframe.style.border = 'none';\n    iframe.style.borderRadius = '40px';\n    iframe.style.overflow = 'hidden';\n    iframe.style.background = 'transparent';\n    container.appendChild(iframe);\n  })();\n</script>`
    };
  };

  const copyToClipboard = (text: string, msg: string) => {
    navigator.clipboard.writeText(text);
    toast.success(msg);
  };

  // Form Builder State
  const [loading, setLoading] = useState(false);
  const [editingForm, setEditingForm] = useState<DynamicForm | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [fields, setFields] = useState<FormField[]>([]);
  const [styling, setStyling] = useState<FormStyling>(DEFAULT_STYLING);
  const [redirect, setRedirect] = useState<FormRedirect>(DEFAULT_REDIRECT);
  const [builderTab, setBuilderTab] = useState<'blueprint' | 'styling' | 'settings' | 'preview'>('blueprint');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setFields((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  useEffect(() => {
    if (!user) return;
    const unsubForms = formService.getCompanyForms(user.companyId, setForms);
    const unsubSubs = formService.getFormSubmissions(user.companyId, setSubmissions);
    return () => {
      unsubForms();
      unsubSubs();
    };
  }, [user]);

  const handleAddField = (type: FormField['type']) => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      label: 'New Question',
      type,
      required: false,
      placeholder: '',
      options: type === 'select' ? ['Option 1'] : undefined
    };
    setFields([...fields, newField]);
  };

  const handleUpdateField = (id: string, updates: Partial<FormField>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const handleRemoveField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const handleSaveForm = async () => {
    if (!user) return;
    if (!formName.trim()) return toast.error('Form name required');
    if (fields.length === 0) return toast.error('Add at least one field');

    setLoading(true);
    try {
      const cleanedFields = fields.map(field => {
        const f = { ...field };
        if (f.options?.length === 0) delete f.options;
        if (!f.placeholder) delete f.placeholder;
        if (f.validation && Object.keys(f.validation).length === 0) delete f.validation;
        return f;
      });

      const formData: Omit<DynamicForm, 'id'> = {
        companyId: user.companyId,
        name: formName,
        description: formDesc || '',
        fields: cleanedFields,
        isActive: true,
        createdBy: user.uid,
        createdAt: Timestamp.now(),
        styling,
        redirect
      };

      if (editingForm?.id) {
        await formService.updateForm(editingForm.id, formData);
        toast.success('Strategy updated');
      } else {
        await formService.createForm(formData);
        toast.success('New transmission protocol established');
      }
      setShowFormModal(false);
      resetFormBuilder();
    } catch (error) {
      console.error('Operation failed:', error);
      let message = 'Sync failed';
      if (error instanceof Error) {
        try {
          const parsed = JSON.parse(error.message);
          if (parsed.error) message = `Protocol Error: ${parsed.error}`;
        } catch {
          message = error.message;
        }
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const resetFormBuilder = () => {
    setEditingForm(null);
    setFormName('');
    setFormDesc('');
    setFields([]);
    setStyling(DEFAULT_STYLING);
    setRedirect(DEFAULT_REDIRECT);
    setBuilderTab('blueprint');
  };

  const handleEdit = (form: DynamicForm) => {
    setEditingForm(form);
    setFormName(form.name);
    setFormDesc(form.description || '');
    setFields(form.fields);
    setStyling(form.styling || DEFAULT_STYLING);
    setRedirect(form.redirect || DEFAULT_REDIRECT);
    setBuilderTab('blueprint');
    setShowFormModal(true);
  };

  const handleToggleStatus = async (form: DynamicForm) => {
    try {
      await formService.updateForm(form.id!, { isActive: !form.isActive });
      toast.success(form.isActive ? 'Form deactivated' : 'Form activated');
    } catch (error) {
      console.error('Status toggle failed:', error);
      toast.error('Directive override failed');
    }
  };

  const copyFormLink = (id: string) => {
    const url = `${window.location.origin}/form/${id}`;
    navigator.clipboard.writeText(url);
    toast.success('Form link copied to clipboard');
  };

  const filteredForms = forms.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black font-display tracking-tight flex items-center space-x-3 italic uppercase">
            <Layout className="text-brand-primary" />
            <span className="text-slate-950 dark:text-white">Form Architect</span>
          </h1>
          <p className="text-[10px] font-black text-slate-400 dark:text-dark-text-muted mt-2 uppercase tracking-[0.2em] italic">Dynamic Data Acquisition Protocols</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex bg-slate-100 dark:bg-dark-bg p-1 rounded-2xl border border-slate-200 dark:border-dark-border">
            <button
              onClick={() => setActiveTab('forms')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'forms' ? 'bg-white dark:bg-dark-surface shadow-lg text-slate-900 dark:text-white' : 'text-slate-500'
              }`}
            >
              Blueprints
            </button>
            <button
              onClick={() => setActiveTab('submissions')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'submissions' ? 'bg-white dark:bg-dark-surface shadow-lg text-slate-900 dark:text-white' : 'text-slate-500'
              }`}
            >
              Intercepts
            </button>
          </div>
          <button 
            onClick={() => { resetFormBuilder(); setShowFormModal(true); }}
            className="px-8 py-3 bg-slate-950 dark:bg-indigo-600 text-white rounded-[24px] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-slate-950/20 dark:shadow-indigo-500/20 flex items-center space-x-3 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <PlusCircle size={18} />
            <span>Initiate New Blueprint</span>
          </button>
        </div>
      </div>

      {activeTab === 'forms' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredForms.map((form) => (
            <motion.div
              layout
              key={form.id}
              className="saas-card overflow-hidden group hover:border-indigo-400/50 transition-all shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-dark-surface/50 p-8 flex flex-col min-h-[300px]"
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                  form.isActive 
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                    : 'bg-rose-50 text-rose-600 border-rose-100'
                }`}>
                  {form.isActive ? 'Operational' : 'Halted'}
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => copyFormLink(form.id!)}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all"
                    title="Copy Public Link"
                  >
                    <Copy size={16} />
                  </button>
                  <button 
                    onClick={() => { setSelectedForm(form); setShowEmbedModal(true); }}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all"
                    title="Embed Form"
                  >
                    <ExternalLink size={16} />
                  </button>
                  <button 
                    onClick={() => handleEdit(form)}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all"
                  >
                    <Settings size={16} />
                  </button>
                </div>
              </div>

              <div className="flex-1">
                <h3 className="text-xl font-black text-slate-950 dark:text-white uppercase tracking-tight italic mb-2 line-clamp-1">{form.name}</h3>
                <p className="text-xs font-medium text-slate-500 dark:text-dark-text-muted line-clamp-2 leading-relaxed">{form.description || 'No directive description provided.'}</p>
              </div>

              <div className="mt-8 pt-8 border-t border-slate-100 dark:border-dark-border flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Data Nodes</span>
                    <span className="text-sm font-black text-slate-950 dark:text-white">{form.fields.length}</span>
                  </div>
                  <div className="w-px h-8 bg-slate-100 dark:bg-dark-border" />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Created</span>
                    <span className="text-xs font-bold text-slate-600">{format(form.createdAt.toDate(), 'MMM dd')}</span>
                  </div>
                </div>
                <button 
                  onClick={() => handleToggleStatus(form)}
                  className={`p-3 rounded-2xl transition-all ${
                    form.isActive ? 'text-rose-500 hover:bg-rose-50' : 'text-emerald-500 hover:bg-emerald-50'
                  }`}
                >
                  {form.isActive ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                </button>
              </div>
            </motion.div>
          ))}

          {filteredForms.length === 0 && (
            <div className="col-span-full py-32 text-center saas-card bg-slate-50 dark:bg-dark-bg/50 border-dashed border-2">
              <div className="w-16 h-16 bg-white dark:bg-dark-surface rounded-[24px] shadow-sm flex items-center justify-center mx-auto mb-6 text-slate-300">
                <Layout size={32} />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase italic">Zero Blueprints Found</h3>
              <p className="text-xs font-medium text-slate-400 mt-2">Initialize your first dynamic data acquisition protocol.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="table-container shadow-2xl shadow-slate-200/50 dark:shadow-none min-h-[600px]">
          <div className="px-10 py-8 border-b border-slate-100 dark:border-dark-border flex justify-between items-center bg-slate-50/50 dark:bg-dark-bg/20">
            <div>
              <h3 className="text-xl font-black text-slate-950 dark:text-white uppercase tracking-tight italic">Intercepted Streams</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Real-time Lead Capture Ingestion</p>
            </div>
            <div className="bg-indigo-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20">
              {submissions.length} Total Signals
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-slate-100 dark:border-dark-border">
                  <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol Source</th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Signal Data</th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-dark-border">
                {submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-dark-bg/40 transition-colors group">
                    <td className="px-10 py-8">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-dark-bg rounded-xl flex items-center justify-center text-indigo-600 font-black">
                          {sub.formName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-950 dark:text-white uppercase italic">{sub.formName}</p>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">ID: {sub.formId.slice(-6)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex flex-col space-y-1 max-w-[300px]">
                        {Object.entries(sub.data).slice(0, 3).map(([key, val]) => (
                          <p key={key} className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate">
                            <span className="font-black text-slate-400 uppercase text-[9px] mr-2">{key.split('_').pop()}:</span>
                            {val}
                          </p>
                        ))}
                        {Object.keys(sub.data).length > 3 && (
                          <p className="text-[9px] font-bold text-indigo-500 uppercase">+{Object.keys(sub.data).length - 3} more nodes</p>
                        )}
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-950 dark:text-white">{format(sub.submittedAt.toDate(), 'HH:mm:ss')}</span>
                        <span className="text-[9px] font-black text-slate-400 uppercase mt-1">{format(sub.submittedAt.toDate(), 'MMM dd, yyyy')}</span>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <select 
                        value={sub.status}
                        onChange={(e) => formService.updateSubmissionStatus(sub.id!, e.target.value as any)}
                        className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border outline-none cursor-pointer transition-all ${
                          sub.status === 'New' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                          sub.status === 'Read' ? 'bg-slate-50 text-slate-500 border-slate-100' :
                          'bg-emerald-50 text-emerald-600 border-emerald-100'
                        }`}
                      >
                        <option value="New">Unread</option>
                        <option value="Read">Processed</option>
                        <option value="Converted">Target Recruited</option>
                      </select>
                    </td>
                    <td className="px-10 py-8 text-right">
                       <button 
                        onClick={() => {
                          // View full submission logic
                          toast.info('Ingesting Signal: Full view under construction');
                        }}
                        className="p-3 bg-white dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-2xl text-slate-400 hover:text-indigo-600 shadow-sm transition-all"
                       >
                         <Eye size={18} />
                       </button>
                    </td>
                  </tr>
                ))}

                {submissions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-32 text-center">
                       <div className="w-16 h-16 bg-slate-50 dark:bg-dark-bg rounded-[24px] flex items-center justify-center mx-auto mb-6 text-slate-200">
                         <MessageSquare size={32} />
                       </div>
                       <h3 className="text-lg font-black text-slate-400 uppercase italic">No Signals Intercepted</h3>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form Builder Modal */}
      <AnimatePresence>
        {showFormModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFormModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-6xl bg-white dark:bg-dark-surface rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-100 dark:border-dark-border flex justify-between items-center bg-slate-50 dark:bg-dark-bg/20">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
                      <Layout size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-950 dark:text-white uppercase italic tracking-tight leading-none">{editingForm ? 'Modify Blueprint' : 'Architect New Protocol'}</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Schema Definition Terminal</p>
                    </div>
                  </div>

                  <div className="h-8 w-px bg-slate-200 dark:bg-dark-border mx-2" />

                  <div className="flex bg-slate-100 dark:bg-dark-bg p-1 rounded-2xl border border-slate-200 dark:border-dark-border">
                    <button
                      onClick={() => setBuilderTab('blueprint')}
                      className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center space-x-2 ${
                        builderTab === 'blueprint' ? 'bg-white dark:bg-dark-surface shadow-lg text-slate-900 dark:text-white' : 'text-slate-500'
                      }`}
                    >
                      <Layers size={14} />
                      <span>Blueprint</span>
                    </button>
                    <button
                      onClick={() => setBuilderTab('styling')}
                      className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center space-x-2 ${
                        builderTab === 'styling' ? 'bg-white dark:bg-dark-surface shadow-lg text-slate-900 dark:text-white' : 'text-slate-500'
                      }`}
                    >
                      <Palette size={14} />
                      <span>Styling</span>
                    </button>
                    <button
                      onClick={() => setBuilderTab('settings')}
                      className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center space-x-2 ${
                        builderTab === 'settings' ? 'bg-white dark:bg-dark-surface shadow-lg text-slate-900 dark:text-white' : 'text-slate-500'
                      }`}
                    >
                      <Settings size={14} />
                      <span>Settings</span>
                    </button>
                    <button
                      onClick={() => setBuilderTab('preview')}
                      className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center space-x-2 ${
                        builderTab === 'preview' ? 'bg-white dark:bg-dark-surface shadow-lg text-slate-900 dark:text-white' : 'text-slate-500'
                      }`}
                    >
                      <Eye size={14} />
                      <span>Live Preview</span>
                    </button>
                  </div>
                </div>
                <button 
                  onClick={() => setShowFormModal(false)}
                  className="p-3 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-dark-surface rounded-2xl transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                {builderTab === 'blueprint' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Structure Section */}
                    <div className="space-y-10">
                      <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] italic border-l-4 border-indigo-600 pl-4">Metastructure Identity</h4>
                        <div className="space-y-6">
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Protocol Name</label>
                            <input
                              type="text"
                              value={formName}
                              onChange={(e) => setFormName(e.target.value)}
                              placeholder="e.g. Website Lead Intercept"
                              className="w-full p-6 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white dark:focus:bg-dark-surface text-slate-950 dark:text-white text-base font-black italic shadow-inner"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Transmission Directive</label>
                            <textarea
                              value={formDesc}
                              onChange={(e) => setFormDesc(e.target.value)}
                              placeholder="Define the purpose of this interface..."
                              className="w-full p-6 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white dark:focus:bg-dark-surface text-slate-950 dark:text-white text-sm font-medium h-32 resize-none shadow-inner"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] italic border-l-4 border-indigo-600 pl-4">Modular Ingestion Nodes</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          {FIELD_TYPES.map((type) => (
                            <button
                              key={type.value}
                              onClick={() => handleAddField(type.value as any)}
                              className="p-6 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-[24px] hover:border-indigo-400 hover:shadow-xl hover:bg-white dark:hover:bg-dark-surface transition-all flex flex-col items-center justify-center space-y-3 group"
                            >
                              <div className="w-10 h-10 bg-white dark:bg-dark-surface rounded-xl flex items-center justify-center text-slate-400 group-hover:text-indigo-600 shadow-sm transition-all">
                                <type.icon size={20} />
                              </div>
                              <span className="text-[9px] font-black uppercase text-slate-500 dark:text-dark-text-muted tracking-widest leading-none text-center">{type.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Logic Section */}
                    <div className="space-y-6">
                      <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] italic border-l-4 border-emerald-600 pl-4">Blueprint Logic (JSON Schema)</h4>
                      <div className="space-y-4">
                        {fields.length === 0 ? (
                          <div className="py-20 text-center border-2 border-dashed border-slate-200 dark:border-dark-border rounded-[40px] bg-slate-50 dark:bg-dark-bg/20">
                            <Type size={32} className="mx-auto text-slate-200 mb-4" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Awaiting Modular Input</p>
                          </div>
                        ) : (
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                          >
                            <SortableContext
                              items={fields.map(f => f.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              {fields.map((field, index) => (
                                <SortableFieldItem
                                  key={field.id}
                                  field={field}
                                  index={index}
                                  onUpdate={handleUpdateField}
                                  onRemove={handleRemoveField}
                                />
                              ))}
                            </SortableContext>
                          </DndContext>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {builderTab === 'styling' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="space-y-10">
                      <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] italic border-l-4 border-indigo-600 pl-4">Color Palette</h4>
                        <div className="grid grid-cols-2 gap-6">
                          {[
                            { label: 'Primary Brand Color', key: 'primaryColor' },
                            { label: 'Background Layer', key: 'backgroundColor' },
                            { label: 'Card Surface', key: 'cardColor' },
                            { label: 'Text Nodes', key: 'textColor' },
                            { label: 'Label Nodes', key: 'labelColor' },
                            { label: 'Button Typography', key: 'buttonText' },
                          ].map((item) => (
                            <div key={item.key}>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">{item.label}</label>
                              <div className="flex items-center space-x-3 bg-slate-50 dark:bg-dark-bg p-3 rounded-2xl border border-slate-100 dark:border-dark-border">
                                <input
                                  type="color"
                                  value={styling[item.key as keyof FormStyling] as string}
                                  onChange={(e) => setStyling({ ...styling, [item.key]: e.target.value })}
                                  className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none"
                                />
                                <input
                                  type="text"
                                  value={styling[item.key as keyof FormStyling] as string}
                                  onChange={(e) => setStyling({ ...styling, [item.key]: e.target.value })}
                                  className="flex-1 bg-transparent text-[10px] font-mono text-slate-600 dark:text-dark-text-muted outline-none"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] italic border-l-4 border-indigo-600 pl-4">Branding & Assets</h4>
                        <div className="space-y-6">
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Logo Assets</label>
                            <div className="space-y-4">
                              <div className="flex items-center space-x-4">
                                <input
                                  type="text"
                                  value={styling.logoUrl || ''}
                                  onChange={(e) => setStyling({ ...styling, logoUrl: e.target.value })}
                                  placeholder="https://example.com/logo.png"
                                  className="flex-1 p-4 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-[20px] text-xs font-medium outline-none focus:ring-4 focus:ring-indigo-500/10"
                                />
                                <div className="relative">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                          setStyling({ ...styling, logoUrl: reader.result as string });
                                        };
                                        reader.readAsDataURL(file);
                                      }
                                    }}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                  />
                                  <button className="px-6 py-4 bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-[20px] text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center space-x-2">
                                    <Plus size={14} />
                                    <span>Upload</span>
                                  </button>
                                </div>
                              </div>
                              {styling.logoUrl && (
                                <div className="p-6 bg-white dark:bg-dark-surface rounded-2xl border border-slate-100 dark:border-dark-border flex items-center justify-center relative group">
                                  <img src={styling.logoUrl} alt="Logo Preview" className="h-16 object-contain" referrerPolicy="no-referrer" />
                                  <button 
                                    onClick={() => setStyling({ ...styling, logoUrl: '' })}
                                    className="absolute top-2 right-2 p-2 bg-rose-50 text-rose-500 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Banner Image URL</label>
                            <div className="space-y-3">
                              <input
                                type="text"
                                value={styling.bannerUrl || ''}
                                onChange={(e) => setStyling({ ...styling, bannerUrl: e.target.value })}
                                placeholder="https://example.com/banner.jpg"
                                className="w-full p-4 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-[20px] text-xs font-medium outline-none focus:ring-4 focus:ring-indigo-500/10"
                              />
                              {styling.bannerUrl && (
                                <div className="aspect-video w-full rounded-2xl overflow-hidden border border-slate-100 dark:border-dark-border">
                                  <img src={styling.bannerUrl} alt="Banner Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                </div>
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Footer Legal/Text</label>
                            <textarea
                              value={styling.footerText || ''}
                              onChange={(e) => setStyling({ ...styling, footerText: e.target.value })}
                              placeholder="e.g. Copyright 2026 Nexusvoura Analytics"
                              className="w-full p-4 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-[20px] text-xs font-medium h-24 outline-none focus:ring-4 focus:ring-indigo-500/10"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] italic border-l-4 border-indigo-600 pl-4">Geometry & Typography</h4>
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Form Width</label>
                            <select
                              value={styling.formWidth}
                              onChange={(e) => setStyling({ ...styling, formWidth: e.target.value as any })}
                              className="w-full p-4 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-[20px] text-xs font-black uppercase outline-none"
                            >
                              <option value="boxed">Boxed (Max Width)</option>
                              <option value="full">Edge-to-Edge (Full)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Corner Radius</label>
                            <select
                              value={styling.borderRadius}
                              onChange={(e) => setStyling({ ...styling, borderRadius: e.target.value })}
                              className="w-full p-4 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-[20px] text-xs font-black uppercase outline-none"
                            >
                              <option value="0px">Sharp (0px)</option>
                              <option value="8px">Soft (8px)</option>
                              <option value="16px">Rounded (16px)</option>
                              <option value="24px">Curved (24px)</option>
                              <option value="40px">Circular (40px)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Field Spacing</label>
                            <select
                              value={styling.fieldSpacing}
                              onChange={(e) => setStyling({ ...styling, fieldSpacing: e.target.value as any })}
                              className="w-full p-4 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-[20px] text-xs font-black uppercase outline-none"
                            >
                              <option value="compact">Compact</option>
                              <option value="comfortable">Comfortable</option>
                              <option value="loose">Loose</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Header Align</label>
                            <select
                              value={styling.headerAlignment}
                              onChange={(e) => setStyling({ ...styling, headerAlignment: e.target.value as any })}
                              className="w-full p-4 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-[20px] text-xs font-black uppercase outline-none"
                            >
                              <option value="left">Left</option>
                              <option value="center">Center</option>
                              <option value="right">Right</option>
                            </select>
                          </div>
                          <div className="col-span-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Font Architecture</label>
                            <select
                              value={styling.fontFamily}
                              onChange={(e) => setStyling({ ...styling, fontFamily: e.target.value })}
                              className="w-full p-4 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-[20px] text-xs font-black uppercase outline-none"
                            >
                              <option value="font-sans">Standard Modern (Sans)</option>
                              <option value="font-serif">Classic Editorial (Serif)</option>
                              <option value="font-mono">Technical Protocol (Mono)</option>
                              <option value="font-display">Experimental Bold (Display)</option>
                            </select>
                          </div>
                          <div className="col-span-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Button Aesthetic</label>
                            <div className="flex bg-slate-100 dark:bg-dark-bg p-1 rounded-2xl border border-slate-200 dark:border-dark-border">
                              {['filled', 'outline', 'ghost'].map((style) => (
                                <button
                                  key={style}
                                  onClick={() => setStyling({ ...styling, buttonStyle: style as any })}
                                  className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                    styling.buttonStyle === style ? 'bg-white dark:bg-dark-surface shadow-sm text-indigo-600' : 'text-slate-500'
                                  }`}
                                >
                                  {style}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-dark-bg/20 rounded-[40px] border border-slate-200 dark:border-dark-border p-8 h-fit sticky top-0">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic mb-6 text-center">Style Preview (Interactive)</h4>
                       <div className="max-h-[600px] overflow-y-auto rounded-[32px] shadow-2xl border border-slate-200 dark:border-dark-border">
                          <FormPreview form={{ name: formName, description: formDesc, fields: fields.slice(0, 2), styling }} />
                       </div>
                    </div>
                  </div>
                )}

                {builderTab === 'settings' && (
                  <div className="max-w-3xl mx-auto space-y-12">
                    <div className="space-y-6">
                      <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] italic border-l-4 border-indigo-600 pl-4">Post-Submission Protocols</h4>
                      <div className="p-8 bg-slate-50 dark:bg-dark-bg/40 border border-slate-200 dark:border-dark-border rounded-[32px] space-y-8">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <h5 className="text-sm font-black text-slate-900 dark:text-white uppercase italic">Automated Redirect</h5>
                            <p className="text-xs text-slate-400 font-medium">Forward users to a custom URL after successful ingest.</p>
                          </div>
                          <button
                            onClick={() => setRedirect({ ...redirect, enabled: !redirect.enabled })}
                            className={`w-14 h-8 rounded-full transition-all flex items-center px-1 ${redirect.enabled ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-dark-border'}`}
                          >
                            <motion.div
                              animate={{ x: redirect.enabled ? 24 : 0 }}
                              className="w-6 h-6 bg-white rounded-full shadow-md"
                            />
                          </button>
                        </div>

                        {redirect.enabled && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6 pt-6 border-t border-slate-200 dark:border-dark-border"
                          >
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Destination URL</label>
                              <input
                                type="url"
                                value={redirect.url}
                                onChange={(e) => setRedirect({ ...redirect, url: e.target.value })}
                                placeholder="https://your-success-page.com"
                                className="w-full p-5 bg-white dark:bg-dark-surface border border-slate-100 dark:border-dark-border rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/10 text-sm font-medium"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Transmission Delay (Seconds)</label>
                              <div className="flex items-center space-x-6">
                                <input
                                  type="range"
                                  min="0"
                                  max="30"
                                  value={redirect.delay}
                                  onChange={(e) => setRedirect({ ...redirect, delay: parseInt(e.target.value) })}
                                  className="flex-1 accent-indigo-600"
                                />
                                <span className="w-16 text-center py-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl font-black italic text-sm border border-indigo-100 dark:border-indigo-900">
                                  {redirect.delay}s
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>

                    <div className="p-8 bg-indigo-50 dark:bg-indigo-900/20 rounded-[32px] border border-indigo-100 dark:border-indigo-900/40 flex items-start space-x-6">
                       <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shrink-0">
                          <ShieldCheck size={24} />
                       </div>
                       <div>
                          <h5 className="text-sm font-black text-indigo-900 dark:text-indigo-100 uppercase italic mb-1">Security Enforcement</h5>
                          <p className="text-xs text-indigo-700/60 dark:text-indigo-400/60 font-medium leading-relaxed">
                            Redirects are strictly validated. Ensure your destination URL supports secure transmission (HTTPS). 
                            Delay protocols allow users to read success confirmations before channel termination.
                          </p>
                       </div>
                    </div>
                  </div>
                )}

                {builderTab === 'preview' && (
                  <div className="max-w-4xl mx-auto rounded-[48px] overflow-hidden shadow-2xl bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border h-[700px] relative">
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 px-6 py-2 bg-slate-950/20 backdrop-blur-md border border-white/20 rounded-full">
                       <span className="text-[9px] font-black text-white uppercase tracking-widest flex items-center space-x-2">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                          <span>Simulation Mode Active</span>
                       </span>
                    </div>
                    <FormPreview 
                      form={{ name: formName, description: formDesc, fields, styling }} 
                      isTestMode 
                      onTestSubmit={(data) => {
                        console.log('Simulation Data Captured:', data);
                        toast.success('Simulation Successful');
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="p-10 border-t border-slate-100 dark:border-dark-border bg-slate-50 dark:bg-dark-bg/50 flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="flex -space-x-3">
                    {[1,2,3].map(i => (
                      <div key={i} className="w-10 h-10 rounded-xl bg-white dark:bg-dark-surface border-2 border-slate-50 dark:border-dark-bg flex items-center justify-center text-slate-300 shadow-sm">
                        <Users size={16} />
                      </div>
                    ))}
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic tracking-[0.2em]">Broadcast Ready</span>
                </div>
                <div className="flex items-center space-x-6">
                  <button
                    onClick={() => setShowFormModal(false)}
                    className="px-10 py-5 rounded-[24px] text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 transition-all border border-slate-200 dark:border-dark-border"
                  >
                    Discard Changes
                  </button>
                  <button
                    onClick={handleSaveForm}
                    disabled={loading || !formName || fields.length === 0}
                    className="px-12 py-5 bg-slate-950 dark:bg-indigo-600 text-white rounded-[24px] font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Transmitting Data...' : (editingForm ? 'Commit Updates' : 'Launch Protocol')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Embed Modal */}
      <AnimatePresence>
        {showEmbedModal && selectedForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEmbedModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-dark-surface rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 dark:border-dark-border flex justify-between items-center bg-slate-50 dark:bg-dark-bg/20">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
                    <ExternalLink size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-950 dark:text-white uppercase italic tracking-tight leading-none">Embed Protocol</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">External Website Integration</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowEmbedModal(false)}
                  className="p-3 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-dark-surface rounded-2xl transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">IFrame Embed Code</label>
                    <button 
                      onClick={() => copyToClipboard(getEmbedCode(selectedForm.id!).iframe, 'IFrame code copied')}
                      className="text-[9px] font-black text-indigo-600 uppercase tracking-widest flex items-center space-x-2"
                    >
                      <Copy size={12} />
                      <span>Copy</span>
                    </button>
                  </div>
                  <pre className="p-6 bg-slate-900 rounded-3xl text-indigo-400 text-[10px] font-mono overflow-x-auto whitespace-pre-wrap border border-white/5">
                    {getEmbedCode(selectedForm.id!).iframe}
                  </pre>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Dynamic Script Embed</label>
                    <button 
                      onClick={() => copyToClipboard(getEmbedCode(selectedForm.id!).script, 'Script code copied')}
                      className="text-[9px] font-black text-indigo-600 uppercase tracking-widest flex items-center space-x-2"
                    >
                      <Copy size={12} />
                      <span>Copy</span>
                    </button>
                  </div>
                  <pre className="p-6 bg-slate-900 rounded-3xl text-emerald-400 text-[10px] font-mono overflow-x-auto whitespace-pre-wrap border border-white/5">
                    {getEmbedCode(selectedForm.id!).script}
                  </pre>
                </div>

                <div className="p-6 bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/20 rounded-3xl">
                  <p className="text-[10px] font-medium text-amber-700 dark:text-amber-400 leading-relaxed italic">
                    <span className="font-black uppercase mr-2 tracking-widest">Note:</span>
                    Ensure your external website allows iframes and scripts from <span className="font-black">{window.location.origin}</span>. Security protocols are active.
                  </p>
                </div>
              </div>

              <div className="p-8 border-t border-slate-100 dark:border-dark-border bg-slate-50 dark:bg-dark-bg/20">
                <button
                  onClick={() => setShowEmbedModal(false)}
                  className="w-full py-4 bg-slate-950 dark:bg-indigo-600 text-white rounded-[24px] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-[1.01] transition-all"
                >
                  Close Terminal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FormsPage;
