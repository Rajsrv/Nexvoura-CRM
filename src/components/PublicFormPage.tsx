import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { formService, DynamicForm, FormField } from '../services/formService';
import { motion, AnimatePresence } from 'motion/react';
import NexvouraLoader from './NexvouraLoader';
import { 
  Send, 
  CheckCircle, 
  AlertCircle, 
  ShieldCheck,
  Globe,
  Sparkles,
  Layout,
  Star,
  Sliders,
  Loader2,
  Check, 
  ArrowRight, 
  ArrowRightCircle, 
  Upload, 
  Zap, 
  Activity,
  ChevronRight,
  Shield,
  Lock,
  Mail,
  User,
  Phone,
  FileText
} from 'lucide-react';

const ICON_MAP: Record<string, React.ReactNode> = {
  Send: <Send size={24} />,
  Check: <Check size={24} />,
  CheckCircle: <CheckCircle size={24} />,
  ArrowRight: <ArrowRight size={24} />,
  ArrowRightCircle: <ArrowRightCircle size={24} />,
  Upload: <Upload size={24} />,
  Zap: <Zap size={24} />,
  Activity: <Activity size={24} />,
  ChevronRight: <ChevronRight size={24} />,
  Shield: <Shield size={24} />,
  Lock: <Lock size={24} />,
  Mail: <Mail size={24} />,
  User: <User size={24} />,
  Phone: <Phone size={24} />,
  FileText: <FileText size={24} />
};

export const PublicFormPage = () => {
  const { formId } = useParams<{ formId: string }>();
  const [form, setForm] = useState<DynamicForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchForm = async () => {
      if (!formId) return;
      try {
        const data = await formService.getFormById(formId);
        if (data && data.isActive) {
          setForm(data);
        } else {
          setError('Communication channel is closed or does not exist.');
        }
      } catch (err: any) {
        let msg = 'Signal lost. Failed to connect to server.';
        if (err?.message) {
          try {
            const parsed = JSON.parse(err.message);
            if (parsed.error) msg = `Protocol Error: ${parsed.error}`;
          } catch {
            // Not a JSON error
          }
        }
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchForm();
  }, [formId]);

  const getVisibleFields = () => {
    if (!form) return [];
    return form.fields.filter(field => {
      if (!field.logic) return true;
      const targetVal = formData[field.logic.showIfFieldId];
      
      switch (field.logic.operator) {
        case 'equals': return targetVal === field.logic.value;
        case 'not_equals': return targetVal !== field.logic.value;
        case 'contains': return String(targetVal || '').includes(field.logic.value || '');
        case 'not_empty': return !!targetVal;
        default: return true;
      }
    });
  };

  const visibleFields = getVisibleFields();

  const validate = () => {
    if (!form) return false;
    const newErrors: Record<string, string> = {};
    visibleFields.forEach(field => {
      const val = formData[field.id];
      if (field.required && (!val || (Array.isArray(val) && val.length === 0))) {
        newErrors[field.id] = `${field.label} is required`;
      } else if (val && field.validation) {
        if (field.type === 'number') {
          const num = Number(val);
          if (field.validation.min !== undefined && num < field.validation.min) {
            newErrors[field.id] = `Must be at least ${field.validation.min}`;
          }
          if (field.validation.max !== undefined && num > field.validation.max) {
            newErrors[field.id] = `Must be at most ${field.validation.max}`;
          }
        }
        if (field.validation.minLength !== undefined && String(val).length < field.validation.minLength) {
          newErrors[field.id] = `Min ${field.validation.minLength} characters`;
        }
        if (field.validation.maxLength !== undefined && String(val).length > field.validation.maxLength) {
          newErrors[field.id] = `Max ${field.validation.maxLength} characters`;
        }
        if (field.validation.pattern && !new RegExp(field.validation.pattern).test(val)) {
          newErrors[field.id] = field.validation.customError || 'Invalid format';
        }
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (!validate()) return;

    setSubmitting(true);
    try {
      await formService.submitForm(form.companyId, form.id!, form.name, formData);
      setSubmitted(true);
      if (form.redirect?.url) {
        setTimeout(() => {
          window.location.href = form.redirect!.url;
        }, form.redirect!.delay || 2000);
      }
    } catch (err: any) {
      console.error('Submission failed:', err);
      setError('Transmission intercepted. Failed to save signal.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  useEffect(() => {
    // Set default values
    if (form?.fields) {
      const defaults: Record<string, any> = {};
      form.fields.forEach(field => {
        if (field.defaultValue !== undefined && field.defaultValue !== '') {
          defaults[field.id] = field.defaultValue;
        }
      });
      setFormData(prev => ({ ...defaults, ...prev }));
    }
  }, [form]);

  const isEmbedded = window.self !== window.top;
  const styling = form?.styling;

  const shadowMap = {
    none: 'shadow-none',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
    '2xl': 'shadow-2xl'
  };

  const alignMap = {
    flex: 'items-start',
    center: 'items-center',
    right: 'items-end'
  };

  const textAlignMap = {
    flex: 'text-left',
    center: 'text-center',
    right: 'text-right'
  };

  const spacingMap = {
    compact: 'gap-y-6',
    comfortable: 'gap-y-12',
    spacious: 'gap-y-20'
  };

  const heightMap = {
    auto: 'min-h-full',
    screen: 'min-h-screen',
    tall: 'min-h-[1200px]'
  };

  const ctaIcon = ICON_MAP[styling?.ctaIcon || 'Send'] || <Send size={24} />;

  if (loading) return <NexvouraLoader />;

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-slate-900 border border-white/5 p-12 rounded-[48px] text-center shadow-2xl"
        >
          <div className="w-20 h-20 bg-rose-500/20 rounded-3xl flex items-center justify-center text-rose-500 mx-auto mb-8">
            <AlertCircle size={40} />
          </div>
          <h2 className="text-2xl font-black text-white italic uppercase mb-4">Channel Error</h2>
          <p className="text-slate-400 font-medium leading-relaxed">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-10 w-full py-4 px-8 bg-white text-slate-950 rounded-2xl font-black text-[12px] uppercase tracking-widest hover:scale-105 transition-all"
          >
            Retry Connection
          </button>
        </motion.div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg w-full text-center"
        >
          <div className="w-24 h-24 bg-emerald-500 rounded-[32px] flex items-center justify-center text-white mx-auto mb-10 shadow-3xl shadow-emerald-500/20 animate-bounce">
            <CheckCircle size={48} />
          </div>
          <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-4 leading-none">{form?.redirect?.message || 'Signal Transmitted'}</h2>
          <p className="text-slate-400 font-medium text-lg opacity-60">Your data has been successfully ingested into the protocol stream.</p>
          
          <div className="mt-16 flex items-center justify-center space-x-4 opacity-30 grayscale hover:grayscale-0 transition-all cursor-default">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Neural Link Stable</span>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50" />
            <span className="text-[11px] font-black text-slate-900 uppercase italic">Nexvoura Strategy Systems</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div 
      className={`min-h-screen flex flex-col lg:flex-row relative ${isEmbedded ? 'bg-transparent' : 'bg-slate-950 overflow-x-hidden'}`}
      style={{
        backgroundColor: !isEmbedded ? (styling?.backgroundColor || '#020617') : 'transparent',
        backgroundImage: !isEmbedded && styling?.backgroundImageUrl ? `url(${styling.backgroundImageUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        fontFamily: styling?.fontFamily ? `var(--${styling.fontFamily})` : 'inherit'
      }}
    >
      {/* Visual Identity Component */}
      {!isEmbedded && (
        <div className="w-full lg:w-[450px] bg-slate-900/40 border-r border-white/5 p-12 lg:p-20 relative flex flex-col justify-between overflow-hidden">
           {/* Cyber Background elements */}
           <div className="absolute top-0 right-0 w-full h-full pointer-events-none opacity-10">
              <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-indigo-500 blur-[120px] rounded-full" />
              <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-brand-primary blur-[120px] rounded-full" />
           </div>

           <div className="relative z-10 flex flex-col flex-1">
              <div className="mb-20">
                <img src="/nexvoura-logo.svg" alt="Nexvoura" className="h-10 w-auto invert opacity-90" />
              </div>
              
              <motion.div 
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex-1"
              >
                <div className="w-14 h-14 bg-white/10 rounded-3xl flex items-center justify-center text-white mb-8 border border-white/10 shadow-lg">
                  <Sparkles size={28} />
                </div>
                <h2 className="text-4xl font-black text-white italic uppercase mb-4 leading-tight tracking-tighter">{form?.name}</h2>
                <p className="text-base font-medium text-slate-400 leading-relaxed opacity-70 italic">{form?.description || 'Global directive processing initiated. Please provide the required data nodes.'}</p>
              </motion.div>
              
              <div className="flex items-center space-x-5">
                <ShieldCheck size={20} className="text-emerald-500 shrink-0" />
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em]">ECC-521 Bit Encrypted Connection</span>
              </div>
           </div>

           <div className="relative z-10 flex items-center space-x-5 opacity-40 mt-12">
             <Globe size={18} className="text-slate-500" />
             <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Platform OS v3.2.0-LTS</span>
           </div>
        </div>
      )}

      {/* Form Side */}
      <div className={`flex-1 overflow-y-auto relative z-10 ${heightMap[styling?.formHeight || 'auto']} ${isEmbedded ? 'p-0' : 'px-4 py-16 lg:py-32 flex flex-col items-center justify-start'}`}>
        
        {styling?.bannerUrl && !isEmbedded && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-4xl h-48 sm:h-[400px] rounded-[64px] overflow-hidden mb-16 shadow-2xl relative border-8 border-white/5"
          >
            <img src={styling.bannerUrl} alt="Banner" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          </motion.div>
        )}

        <motion.div 
          initial={styling?.animationType === 'fade' ? { opacity: 0 } : styling?.animationType === 'slide' ? { opacity: 0, y: 40 } : styling?.animationType === 'zoom' ? { opacity: 0, scale: 0.95 } : {}}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className={`w-full border border-white/5 shadow-2xl transition-all overflow-hidden flex flex-col ${shadowMap[styling?.shadowSize || 'md']} ${
            styling?.formWidth === 'full' ? 'max-w-none' : styling?.formWidth === 'narrow' ? 'max-w-xl' : 'max-w-4xl'
          }`} 
          style={{ 
            backgroundColor: styling?.cardBlur ? `${styling.cardColor}${Math.round((styling.cardOpacity || 100) * 2.55).toString(16).padStart(2, '0')}` : (styling?.cardColor || '#ffffff'),
            backdropFilter: styling?.cardBlur ? 'blur(20px)' : 'none',
            borderRadius: styling?.borderRadius || '48px' 
          }}
        >
           {/* Header Area */}
           <div className={`p-10 sm:p-20 pb-0 flex flex-col ${alignMap[styling?.headerAlignment || 'center']} ${textAlignMap[styling?.headerAlignment || 'center']}`}>
              {styling?.logoUrl && (isEmbedded || !isEmbedded) && (
                <img src={styling.logoUrl} alt="Logo" className="h-14 w-auto mb-10 object-contain" referrerPolicy="no-referrer" />
              )}
              <h1 className={`text-4xl sm:text-6xl font-black italic uppercase tracking-tighter mb-4 leading-tight`} style={styling ? { color: styling.textColor } : { color: isEmbedded ? 'inherit' : 'white' }}>{form?.name}</h1>
              <p className="text-[12px] text-slate-500 font-black uppercase tracking-[0.4em] italic mb-10 opacity-70">Intake Directive Protocol</p>
              <div className="w-24 h-1.5" style={{ backgroundColor: styling?.primaryColor || '#6366f1' }} />
           </div>

           <form onSubmit={handleSubmit} className={`p-10 sm:p-20 pt-16 grid grid-cols-2 gap-x-12 ${spacingMap[styling?.fieldSpacing || 'comfortable']}`}>
             {visibleFields.map((field, index) => {
                const isFullWidth = styling?.fieldLayout === 'list' || field.width !== 'half';
                return (
                  <motion.div 
                      key={field.id}
                      initial={styling?.animationType === 'stagger' ? { opacity: 0, x: -10 } : {}}
                      animate={styling?.animationType === 'stagger' ? { opacity: 1, x: 0 } : {}}
                      transition={{ delay: index * 0.1 }}
                      className={`space-y-5 ${isFullWidth ? 'col-span-2' : 'col-span-1'}`}
                  >
                    <div className="space-y-2">
                      <label className="flex items-center justify-between px-2">
                          <span className={`text-[12px] font-black uppercase tracking-[0.25em] italic`} style={styling ? { color: styling.labelColor || styling.textColor } : { color: '#64748b' }}>
                          {field.label} {field.required && <span className="text-rose-500 ml-1">*</span>}
                          </span>
                      </label>
                      {field.helpText && (
                          <p className="text-[10px] font-medium opacity-50 px-2 italic" style={styling ? { color: styling.textColor } : { color: '#94a3b8' }}>{field.helpText}</p>
                      )}
                    </div>
                   
                    {field.type === 'switch' ? (
                      <div className="flex items-center pt-2">
                        <button
                          type="button"
                          onClick={() => handleInputChange(field.id, !formData[field.id])}
                          className={`w-14 h-7 rounded-full transition-all flex items-center px-1.5 ${formData[field.id] ? 'bg-indigo-600' : 'bg-slate-200'}`}
                          style={{ backgroundColor: formData[field.id] ? (styling?.primaryColor || '#6366f1') : undefined }}
                        >
                          <motion.div
                            animate={{ x: formData[field.id] ? 28 : 0 }}
                            className="w-4 h-4 bg-white rounded-full shadow-sm"
                          />
                        </button>
                      </div>
                    ) : field.type === 'range' ? (
                      <div className="space-y-4 pt-2">
                        <input
                          type="range"
                          min={field.validation?.min || 0}
                          max={field.validation?.max || 100}
                          value={formData[field.id] || field.validation?.min || 0}
                          onChange={(e) => handleInputChange(field.id, parseInt(e.target.value))}
                          className="w-full accent-indigo-600"
                          style={{ accentColor: styling?.primaryColor || '#6366f1' }}
                        />
                        <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase italic">
                          <span>{field.validation?.min || 0}</span>
                          <span style={{ color: styling?.primaryColor || '#6366f1' }}>{formData[field.id] || field.validation?.min || 0}</span>
                          <span>{field.validation?.max || 100}</span>
                        </div>
                      </div>
                    ) : field.type === 'rating' ? (
                      <div className="flex items-center space-x-3 pt-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onMouseEnter={() => !formData[field.id] && setFormData(prev => ({ ...prev, [`hover_${field.id}`]: star }))}
                            onMouseLeave={() => setFormData(prev => ({ ...prev, [`hover_${field.id}`]: null }))}
                            onClick={() => handleInputChange(field.id, star)}
                            className="transition-all hover:scale-125"
                            style={{ color: (formData[field.id] || formData[`hover_${field.id}`] || 0) >= star ? (styling?.primaryColor || '#6366f1') : '#cbd5e1' }}
                          >
                            <Star size={32} fill={(formData[field.id] || formData[`hover_${field.id}`] || 0) >= star ? (styling?.primaryColor || '#6366f1') : 'transparent'} />
                          </button>
                        ))}
                      </div>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        className={`w-full p-6 text-sm font-medium transition-all outline-none focus:ring-4 focus:ring-opacity-20 min-h-[160px] resize-none ${
                          styling?.inputStyle === 'underlined' ? 'border-b-2 border-t-0 border-x-0 rounded-none bg-transparent px-0' : 'border'
                        }`}
                        style={{ 
                          borderRadius: styling?.inputStyle === 'underlined' ? '0px' : `calc(${styling?.borderRadius || '24px'} * 0.4)`,
                          borderColor: errors[field.id] ? '#f43f5e' : (styling ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)'),
                          backgroundColor: styling?.inputStyle === 'filled' ? `${styling.primaryColor}08` : styling?.inputStyle === 'underlined' ? 'transparent' : (styling?.cardColor || '#ffffff'),
                          color: styling?.textColor || (isEmbedded ? 'inherit' : 'white')
                        }}
                      />
                    ) : field.type === 'select' ? (
                      <div className="relative">
                        <select
                          value={formData[field.id] || ''}
                          onChange={(e) => handleInputChange(field.id, e.target.value)}
                          className={`w-full p-6 text-sm font-medium transition-all outline-none appearance-none ${
                            styling?.inputStyle === 'underlined' ? 'border-b-2 border-t-0 border-x-0 rounded-none bg-transparent px-0' : 'border'
                          }`}
                          style={{ 
                            borderRadius: styling?.inputStyle === 'underlined' ? '0px' : `calc(${styling?.borderRadius || '24px'} * 0.4)`,
                            borderColor: errors[field.id] ? '#f43f5e' : (styling ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)'),
                            backgroundColor: styling?.inputStyle === 'filled' ? `${styling.primaryColor}08` : styling?.inputStyle === 'underlined' ? 'transparent' : (styling?.cardColor || '#ffffff'),
                            color: styling?.textColor || (isEmbedded ? 'inherit' : 'white')
                          }}
                        >
                          <option value="" disabled>{field.placeholder || `Select ${field.label}...`}</option>
                          {field.options?.map((opt, i) => (
                            <option key={i} value={opt} className="bg-slate-900 text-white">{opt}</option>
                          ))}
                        </select>
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                          <Sliders size={14} style={{ color: styling?.textColor }} />
                        </div>
                      </div>
                    ) : field.type === 'checkbox' || field.type === 'radio' ? (
                      <div className="flex flex-wrap gap-8 pt-3">
                        {field.options?.map((opt, i) => {
                          const isSelected = field.type === 'checkbox' 
                            ? (formData[field.id] || []).includes(opt)
                            : formData[field.id] === opt;
                          
                          return (
                            <label key={i} className="flex items-center space-x-3 cursor-pointer group">
                              <input 
                                type={field.type === 'checkbox' ? 'checkbox' : 'radio'}
                                className="hidden"
                                checked={isSelected}
                                onChange={() => {
                                  if (field.type === 'checkbox') {
                                    const current = formData[field.id] || [];
                                    const updated = current.includes(opt) 
                                      ? current.filter((o: string) => o !== opt)
                                      : [...current, opt];
                                    handleInputChange(field.id, updated);
                                  } else {
                                    handleInputChange(field.id, opt);
                                  }
                                }}
                              />
                              <div 
                                className={`flex items-center justify-center transition-all ${field.type === 'radio' ? 'w-6 h-6 rounded-full' : 'w-6 h-6 rounded-lg'} border-2`}
                                style={{ 
                                  borderColor: isSelected ? (styling?.primaryColor || '#6366f1') : 'rgba(255,255,255,0.1)',
                                  backgroundColor: isSelected ? `${styling?.primaryColor || '#6366f1'}15` : 'transparent'
                                }}
                              >
                                {isSelected && (
                                  <motion.div 
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className={field.type === 'radio' ? 'w-3 h-3 rounded-full' : 'w-3 h-3 rounded-sm'}
                                    style={{ backgroundColor: styling?.primaryColor || '#6366f1' }}
                                  />
                                )}
                              </div>
                              <span className="text-xs font-black uppercase tracking-tight" style={styling ? { color: styling.textColor } : { color: isEmbedded ? 'inherit' : 'white' }}>{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : field.type === 'file' ? (
                      <div 
                        className="relative p-10 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center space-y-4 group transition-all"
                        style={{ 
                          borderColor: errors[field.id] ? '#f43f5e' : (styling ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)'),
                          backgroundColor: styling ? `${styling.primaryColor}05` : 'rgba(255,255,255,0.02)'
                        }}
                      >
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform border border-white/5">
                          <Layout size={20} style={{ color: styling?.primaryColor || '#6366f1' }} />
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-black uppercase italic" style={styling ? { color: styling.textColor } : { color: isEmbedded ? 'inherit' : 'white' }}>
                            {formData[field.id] ? (formData[field.id] as File).name : 'Ingest Document Node'}
                          </p>
                          <p className="text-[10px] font-medium opacity-50 uppercase tracking-widest mt-1">Maximum 5GB per Signal</p>
                        </div>
                        <input 
                          type="file" 
                          className="absolute inset-0 opacity-0 cursor-pointer" 
                          onChange={(e) => handleInputChange(field.id, e.target.files?.[0])}
                        />
                      </div>
                    ) : (
                      <input
                        type={field.type}
                        placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        className={`w-full p-6 text-sm font-medium transition-all outline-none ${
                          styling?.inputStyle === 'underlined' ? 'border-b-2 border-t-0 border-x-0 rounded-none bg-transparent px-0' : 'border'
                        }`}
                        style={{ 
                          borderRadius: styling?.inputStyle === 'underlined' ? '0px' : `calc(${styling?.borderRadius || '24px'} * 0.4)`,
                          borderColor: errors[field.id] ? '#f43f5e' : (styling ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)'),
                          backgroundColor: styling?.inputStyle === 'filled' ? `${styling.primaryColor}08` : styling?.inputStyle === 'underlined' ? 'transparent' : (styling?.cardColor || '#ffffff'),
                          color: styling?.textColor || (isEmbedded ? 'inherit' : 'white')
                        }}
                      />
                    )}
                   {errors[field.id] && (
                     <p className="text-[10px] font-black text-rose-500 uppercase italic px-2 animate-in slide-in-from-top-1">
                       {errors[field.id]}
                     </p>
                   )}
                  </motion.div>
                );
             })}

             <div className="col-span-2 pt-16">
               <motion.button
                 whileHover={{ scale: 1.01 }}
                 whileTap={{ scale: 0.98 }}
                 type="submit"
                 disabled={submitting}
                 className={`w-full py-8 font-black text-[16px] uppercase tracking-[0.5em] italic shadow-2xl flex items-center justify-center space-x-6 transform transition-all disabled:opacity-50 relative overflow-hidden group ${styling?.buttonStyle === 'glow' ? 'animate-pulse' : ''}`}
                 style={{ 
                   backgroundColor: styling ? (styling.buttonStyle === 'filled' || styling.buttonStyle === 'glow' ? styling.primaryColor : 'transparent') : '#4f46e5',
                   color: styling ? (styling.buttonStyle === 'filled' || styling.buttonStyle === 'glow' ? styling.buttonText : styling.primaryColor) : 'white',
                   border: styling?.buttonStyle === 'outline' ? `2.5px solid ${styling.primaryColor}` : 'none',
                   borderRadius: styling?.borderRadius || '32px',
                   boxShadow: (styling?.buttonStyle === 'filled' || styling?.buttonStyle === 'glow') ? `0 30px 60px -12px ${styling.primaryColor}50` : 'none'
                 }}
               >
                 {styling?.buttonStyle === 'glow' && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                 )}
                 {submitting ? (
                   <>
                     <Loader2 size={28} className="animate-spin" />
                     <span>Processing Signal...</span>
                   </>
                 ) : (
                   <>
                     <span>{styling?.ctaText || 'Transmit Directive'}</span>
                     <div className="group-hover:translate-x-3 transition-transform duration-500">
                        {ctaIcon}
                     </div>
                   </>
                 )}
               </motion.button>
             </div>
           </form>

           {styling?.footerText && (
             <div className="p-12 border-t border-black/5 bg-black/5 flex flex-col items-center justify-center space-y-4">
                <p className="text-[12px] text-slate-500 font-bold uppercase tracking-[0.3em] italic text-center max-w-xl leading-relaxed opacity-60">
                  {styling.footerText}
                </p>
                <div className="w-12 h-0.5 bg-slate-300/30" />
                <div className="flex items-center space-x-3">
                    <ShieldCheck size={14} className="text-emerald-500" />
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">Protocol Secure Influx</p>
                </div>
             </div>
           )}

           {!isEmbedded && (
            <div className="p-10 border-t border-black/5 flex items-center justify-center space-x-4 opacity-50 grayscale hover:grayscale-0 transition-all cursor-default">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Neural Link Stable</span>
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50" />
              <span className="text-[11px] font-black text-slate-900 uppercase italic">Nexvoura Strategy Systems</span>
            </div>
           )}
        </motion.div>
      </div>
    </div>
  );
};

export default PublicFormPage;
