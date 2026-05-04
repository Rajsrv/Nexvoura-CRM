import React from 'react';
import { motion } from 'motion/react';
import { DynamicForm, FormField, FormStyling } from '../services/formService';
import { 
  Send, 
  CheckCircle, 
  Star, 
  Sliders, 
  Layers, 
  ArrowRight, 
  ArrowRightCircle, 
  Check, 
  Upload, 
  Zap, 
  Activity,
  ChevronRight,
  Shield,
  Lock,
  Mail,
  User,
  Phone,
  FileText,
  Image as ImageIcon,
  Plus,
  Save,
  MessageSquare,
  Database,
  ShieldCheck,
  Sparkles,
  Cpu
} from 'lucide-react';

interface FormPreviewProps {
  form: Partial<DynamicForm>;
  onTestSubmit?: (data: any) => void;
  isTestMode?: boolean;
}

const DEFAULT_STYLING: FormStyling = {
  primaryColor: '#4f46e5',
  backgroundColor: '#f8fafc',
  cardColor: '#ffffff',
  textColor: '#0f172a',
  buttonText: '#ffffff',
  ctaText: 'Submit Transmission',
  ctaIcon: 'Send',
  borderRadius: '24px',
  fontFamily: 'font-sans',
  buttonStyle: 'filled',
  formWidth: 'boxed',
  formHeight: 'auto',
  fieldLayout: 'list',
  headerAlignment: 'center',
  fieldSpacing: 'comfortable'
};

const ICON_MAP: Record<string, React.ReactNode> = {
  Plus: <Plus size={22} />,
  Save: <Save size={22} />,
  MessageSquare: <MessageSquare size={22} />,
  Database: <Database size={22} />,
  ShieldCheck: <ShieldCheck size={22} />,
  Sparkles: <Sparkles size={22} />,
  Cpu: <Cpu size={22} />,
  Send: <Send size={22} />,
  Check: <Check size={22} />,
  CheckCircle: <CheckCircle size={22} />,
  ArrowRight: <ArrowRight size={22} />,
  ArrowRightCircle: <ArrowRightCircle size={22} />,
  Upload: <Upload size={22} />,
  Zap: <Zap size={22} />,
  Activity: <Activity size={22} />,
  ChevronRight: <ChevronRight size={22} />,
  Shield: <Shield size={22} />,
  Lock: <Lock size={22} />,
  Mail: <Mail size={22} />,
  User: <User size={22} />,
  Phone: <Phone size={22} />,
  FileText: <FileText size={22} />
};

export const FormPreview: React.FC<FormPreviewProps> = ({ form, onTestSubmit, isTestMode }) => {
  const styling = { ...DEFAULT_STYLING, ...form.styling };
  const [formData, setFormData] = React.useState<Record<string, any>>({});
  const [submitted, setSubmitted] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (form.fields) {
      const defaults: Record<string, any> = {};
      form.fields.forEach(field => {
        if (field.defaultValue !== undefined && field.defaultValue !== '') {
          defaults[field.id] = field.defaultValue;
        }
      });
      setFormData(prev => ({ ...defaults, ...prev }));
    }
  }, [form.fields]);

  const spacingMap = {
    compact: 'gap-y-4 gap-x-6',
    comfortable: 'gap-y-8 gap-x-10',
    loose: 'gap-y-12 gap-x-14'
  };

  const shadowMap = {
    none: 'shadow-none',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
    '2xl': 'shadow-2xl'
  };

  const textAlignMap = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
  };

  const alignMap = {
    left: 'items-start',
    center: 'items-center',
    right: 'items-end'
  };

  const heightMap = {
    auto: 'min-h-full',
    screen: 'min-h-screen',
    tall: 'min-h-[1200px]'
  };

  const ctaIcon = ICON_MAP[styling.ctaIcon || 'Send'] || <Send size={22} />;

  const getVisibleFields = () => {
    if (!form.fields) return [];
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      if (isTestMode && onTestSubmit) {
        onTestSubmit(formData);
      }
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-6 animate-in fade-in zoom-in duration-500 min-h-[400px]">
        <div style={{ color: styling.primaryColor }}>
          <CheckCircle size={64} />
        </div>
        <h2 className="text-2xl font-black italic uppercase tracking-tight" style={{ color: styling.textColor }}>
          Transmission Received
        </h2>
        <p className="text-slate-500 text-sm font-medium max-w-xs">
          This is a preview of the success state. Your data nodes have been "processed" in test mode.
        </p>
        <button 
          onClick={() => { setSubmitted(false); setFormData({}); }}
          className="px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
          style={{ 
            backgroundColor: styling.primaryColor, 
            color: styling.buttonText,
            borderRadius: styling.borderRadius
          }}
        >
          Reset Preview
        </button>
      </div>
    );
  }

  return (
    <div 
      className={`w-full ${heightMap[styling.formHeight || 'auto']} transition-all duration-700 overflow-y-auto ${styling.fontFamily} p-0 relative`}
      style={{ 
        backgroundColor: styling.backgroundColor,
        backgroundImage: styling.backgroundImageUrl ? `url(${styling.backgroundImageUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {styling.backgroundGradient && (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{ 
            background: `linear-gradient(${styling.backgroundGradient.direction}, ${styling.backgroundGradient.from}, ${styling.backgroundGradient.to})` 
          }}
        />
      )}

      {styling.bannerUrl && (
        <div className="w-full h-40 sm:h-80 overflow-hidden relative">
           <img src={styling.bannerUrl} alt="Banner" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
           <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        </div>
      )}

      <div className={`w-full py-8 sm:py-24 px-4 sm:px-8 flex flex-col items-center relative z-10 ${styling.bannerUrl ? '-mt-24' : ''}`}>
        <motion.div 
          initial={styling.animationType === 'fade' ? { opacity: 0 } : styling.animationType === 'slide' ? { opacity: 0, y: 30 } : styling.animationType === 'zoom' ? { opacity: 0, scale: 0.9 } : {}}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className={`w-full border border-white/10 overflow-hidden flex flex-col ${shadowMap[styling.shadowSize || 'md']} ${
            styling.formWidth === 'full' ? 'max-w-none' : styling.formWidth === 'narrow' ? 'max-w-xl' : 'max-w-4xl'
          }`}
          style={{ 
            backgroundColor: styling.cardBlur ? `${styling.cardColor}${Math.round((styling.cardOpacity || 100) * 2.55).toString(16).padStart(2, '0')}` : styling.cardColor,
            backdropFilter: styling.cardBlur ? 'blur(16px)' : 'none',
            borderRadius: styling.borderRadius 
          }}
        >
          {/* Header Section */}
          <div className={`p-8 sm:p-14 pb-0 flex flex-col ${alignMap[styling.headerAlignment]} ${textAlignMap[styling.headerAlignment]}`}>
            {styling.logoUrl && (
              <img src={styling.logoUrl} alt="Logo" className="h-14 w-auto mb-10 object-contain" referrerPolicy="no-referrer" />
            )}
            <h1 className="text-3xl sm:text-5xl font-black italic uppercase tracking-tighter mb-5 leading-tight" style={{ color: styling.textColor }}>
              {form.name || 'Untitled Directive'}
            </h1>
            {form.description && (
              <p className="text-sm font-medium opacity-60 leading-relaxed" style={{ color: styling.textColor }}>
                {form.description}
              </p>
            )}
            <div className="w-24 h-1.5 mt-10" style={{ backgroundColor: styling.primaryColor }} />
          </div>

          <form onSubmit={handleSubmit} className={`p-8 sm:p-14 pt-12 grid grid-cols-2 ${spacingMap[styling.fieldSpacing]}`}>
            {visibleFields.map((field, index) => {
              const isFullWidth = styling.fieldLayout === 'list' || field.width !== 'half';
              
              return (
                <motion.div 
                  key={field.id}
                  initial={styling.animationType === 'stagger' ? { opacity: 0, y: 20 } : {}}
                  animate={styling.animationType === 'stagger' ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: index * 0.1 }}
                  className={`flex flex-col space-y-4 ${isFullWidth ? 'col-span-2' : 'col-span-1'}`}
                >
                  <div className="space-y-2">
                    <label className="flex items-center justify-between px-1">
                      <span className="text-[12px] font-black uppercase tracking-[0.2em] italic" style={{ color: styling.labelColor || styling.textColor }}>
                        {field.label} {field.required && <span className="text-rose-500 ml-1">*</span>}
                      </span>
                    </label>
                    {field.helpText && (
                      <p className="text-[10px] font-medium opacity-50 px-1" style={{ color: styling.textColor }}>{field.helpText}</p>
                    )}
                  </div>

                  {field.type === 'switch' ? (
                    <div className="flex items-center pt-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, [field.id]: !formData[field.id] })}
                        className={`w-14 h-7 rounded-full transition-all flex items-center px-1.5 ${formData[field.id] ? 'bg-indigo-600' : 'bg-slate-200'}`}
                        style={{ backgroundColor: formData[field.id] ? styling.primaryColor : undefined }}
                      >
                        <motion.div
                          animate={{ x: formData[field.id] ? 28 : 0 }}
                          className="w-4 h-4 bg-white rounded-full shadow-md"
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
                        onChange={(e) => setFormData({ ...formData, [field.id]: parseInt(e.target.value) })}
                        className="w-full accent-indigo-600"
                        style={{ accentColor: styling.primaryColor }}
                      />
                      <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase italic">
                        <span>{field.validation?.min || 0}</span>
                        <span className="text-indigo-600" style={{ color: styling.primaryColor }}>{formData[field.id] || field.validation?.min || 0}</span>
                        <span>{field.validation?.max || 100}</span>
                      </div>
                    </div>
                  ) : field.type === 'rating' ? (
                    <div className="flex items-center space-x-3 pt-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => !formData[field.id] && setFormData({ ...formData, [`hover_${field.id}`]: star })}
                          onMouseLeave={() => setFormData({ ...formData, [`hover_${field.id}`]: null })}
                          onClick={() => setFormData({ ...formData, [field.id]: star })}
                          className="transition-all hover:scale-125"
                          style={{ color: (formData[field.id] || formData[`hover_${field.id}`] || 0) >= star ? styling.primaryColor : '#cbd5e1' }}
                        >
                          <Star size={32} fill={(formData[field.id] || formData[`hover_${field.id}`] || 0) >= star ? styling.primaryColor : 'transparent'} />
                        </button>
                      ))}
                    </div>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      placeholder={field.placeholder}
                      value={formData[field.id] || ''}
                      onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                      className={`w-full p-6 text-sm font-medium transition-all outline-none focus:ring-4 focus:ring-opacity-20 min-h-[160px] resize-none ${
                          styling.inputStyle === 'underlined' ? 'border-b-2 border-t-0 border-x-0 rounded-none bg-transparent px-0' : 'border'
                      }`}
                      style={{ 
                        borderRadius: styling.inputStyle === 'underlined' ? '0px' : `calc(${styling.borderRadius} * 0.4)`,
                        borderColor: errors[field.id] ? '#f43f5e' : 'rgba(0,0,0,0.1)',
                        backgroundColor: styling.inputStyle === 'filled' ? `${styling.primaryColor}08` : styling.inputStyle === 'underlined' ? 'transparent' : styling.cardColor,
                        color: styling.textColor
                      }}
                    />
                  ) : field.type === 'select' ? (
                    <div className="relative">
                      <select
                        value={formData[field.id] || ''}
                        onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                        className={`w-full p-6 text-sm font-medium transition-all outline-none appearance-none ${
                          styling.inputStyle === 'underlined' ? 'border-b-2 border-t-0 border-x-0 rounded-none bg-transparent px-0' : 'border'
                        }`}
                        style={{ 
                          borderRadius: styling.inputStyle === 'underlined' ? '0px' : `calc(${styling.borderRadius} * 0.4)`,
                          borderColor: errors[field.id] ? '#f43f5e' : 'rgba(0,0,0,0.1)',
                          backgroundColor: styling.inputStyle === 'filled' ? `${styling.primaryColor}08` : styling.inputStyle === 'underlined' ? 'transparent' : styling.cardColor,
                          color: styling.textColor
                        }}
                      >
                        <option value="" disabled>{field.placeholder || 'Select option...'}</option>
                        {field.options?.map((opt, i) => (
                          <option key={i} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                          <Sliders size={14} style={{ color: styling.textColor }} />
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
                                  setFormData({ ...formData, [field.id]: updated });
                                } else {
                                  setFormData({ ...formData, [field.id]: opt });
                                }
                              }}
                            />
                            <div 
                              className={`flex items-center justify-center transition-all ${field.type === 'radio' ? 'w-6 h-6 rounded-full' : 'w-6 h-6 rounded-lg'} border-2`}
                              style={{ 
                                borderColor: isSelected ? styling.primaryColor : 'rgba(0,0,0,0.1)',
                                backgroundColor: isSelected ? `${styling.primaryColor}15` : 'transparent'
                              }}
                            >
                              {isSelected && (
                                  <motion.div 
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className={field.type === 'radio' ? 'w-3 h-3 rounded-full' : 'w-3 h-3 rounded-sm'}
                                      style={{ backgroundColor: styling.primaryColor }}
                                  />
                              )}
                            </div>
                            <span className="text-xs font-black uppercase tracking-tight" style={{ color: styling.textColor }}>{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : field.type === 'file' ? (
                    <div 
                      className="relative p-10 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center space-y-4 group transition-all"
                      style={{ 
                          borderColor: errors[field.id] ? '#f43f5e' : 'rgba(0,0,0,0.1)',
                          backgroundColor: `${styling.primaryColor}05`
                      }}
                    >
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Layers size={20} style={{ color: styling.primaryColor }} />
                      </div>
                      <div className="text-center">
                          <p className="text-xs font-black uppercase italic" style={{ color: styling.textColor }}>
                             {formData[field.id] ? (formData[field.id] as File).name : 'Ingest Document Node'}
                          </p>
                          <p className="text-[10px] font-medium opacity-50 uppercase tracking-widest mt-1">Maximum 5GB per Signal</p>
                      </div>
                      <input 
                          type="file" 
                          className="absolute inset-0 opacity-0 cursor-pointer" 
                          onChange={(e) => setFormData({ ...formData, [field.id]: e.target.files?.[0] })}
                      />
                    </div>
                  ) : field.type === 'media' ? (
                    <div 
                      className="relative p-10 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center space-y-4 group transition-all"
                      style={{ 
                          borderColor: errors[field.id] ? '#f43f5e' : 'rgba(0,0,0,0.1)',
                          backgroundColor: `${styling.primaryColor}05`
                      }}
                    >
                      <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                          <ImageIcon size={28} style={{ color: styling.primaryColor }} />
                      </div>
                      <div className="text-center">
                          <p className="text-xs font-black uppercase italic" style={{ color: styling.textColor }}>
                             {formData[field.id] ? (formData[field.id] as File).name : 'Ingest Visual Media Signal'}
                          </p>
                          <p className="text-[10px] font-medium opacity-50 uppercase tracking-widest mt-1">Images or Videos (Max 100MB)</p>
                      </div>
                      <input 
                          type="file" 
                          accept="image/*,video/*"
                          className="absolute inset-0 opacity-0 cursor-pointer" 
                          onChange={(e) => setFormData({ ...formData, [field.id]: e.target.files?.[0] })}
                      />
                    </div>
                  ) : field.type === 'signature' ? (
                    <div 
                      className="relative h-48 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center group bg-white dark:bg-dark-bg/20"
                      style={{ 
                          borderColor: errors[field.id] ? '#f43f5e' : 'rgba(0,0,0,0.1)'
                      }}
                    >
                      <div className="absolute top-4 left-4">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Digital Seal Area</span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em]">Authorized Signature Required</p>
                      <div className="absolute bottom-4 right-4 text-[10px] font-black text-rose-500 uppercase tracking-widest opacity-50">
                        Secure Encryption Active
                      </div>
                    </div>
                  ) : (
                    <input
                      type={field.type}
                      placeholder={field.placeholder}
                      value={formData[field.id] || ''}
                      onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                      className={`w-full p-6 text-sm font-medium transition-all outline-none ${
                          styling.inputStyle === 'underlined' ? 'border-b-2 border-t-0 border-x-0 rounded-none bg-transparent px-0' : 'border'
                      }`}
                      style={{ 
                        borderRadius: styling.inputStyle === 'underlined' ? '0px' : `calc(${styling.borderRadius} * 0.4)`,
                        borderColor: errors[field.id] ? '#f43f5e' : 'rgba(0,0,0,0.1)',
                        backgroundColor: styling.inputStyle === 'filled' ? `${styling.primaryColor}08` : styling.inputStyle === 'underlined' ? 'transparent' : styling.cardColor,
                        color: styling.textColor
                      }}
                    />
                  )}
                  {errors[field.id] && (
                    <p className="text-[11px] font-black text-rose-500 uppercase italic px-1 animate-in slide-in-from-top-1">
                      {errors[field.id]}
                    </p>
                  )}
                </motion.div>
              );
            })}

            <div className="col-span-2 pt-14 text-center">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className={`w-full py-7 font-black text-[15px] uppercase tracking-[0.4em] italic shadow-2xl transition-all flex items-center justify-center space-x-6 relative overflow-hidden group ${styling.buttonStyle === 'glow' ? 'animate-pulse' : ''}`}
                style={{ 
                  backgroundColor: (styling.buttonStyle === 'filled' || styling.buttonStyle === 'glow') ? styling.primaryColor : 'transparent',
                  color: (styling.buttonStyle === 'filled' || styling.buttonStyle === 'glow') ? styling.buttonText : styling.primaryColor,
                  border: styling.buttonStyle === 'outline' ? `2px solid ${styling.primaryColor}` : 'none',
                  borderRadius: styling.borderRadius,
                  boxShadow: (styling.buttonStyle === 'filled' || styling.buttonStyle === 'glow') ? `0 25px 40px -10px ${styling.primaryColor}40` : 'none'
                }}
              >
                {styling.buttonStyle === 'glow' && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                )}
                <span>{styling.ctaText || 'Initiate Transmission'}</span>
                <div className="group-hover:translate-x-2 transition-transform">
                  {ctaIcon}
                </div>
              </motion.button>
              
              {isTestMode && (
                <p className="mt-4 text-[9px] font-black text-slate-400 uppercase tracking-widest italic opacity-50">
                  Simulation Protocol Active • Data Nodes Volatile
                </p>
              )}
            </div>
          </form>

          {styling.footerText && (
            <div className="p-10 border-t border-black/5 bg-black/5 flex flex-col items-center justify-center space-y-3">
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-[0.2em] text-center max-w-xl leading-relaxed italic opacity-60">
                {styling.footerText}
              </p>
            </div>
          )}

          {!isTestMode && (
            <div className="p-8 border-t border-black/5 flex items-center justify-center space-x-4 opacity-40 grayscale hover:grayscale-0 transition-all cursor-default">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Neural Link Status</span>
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50" />
              <span className="text-[11px] font-black text-slate-900 uppercase italic">Nexvoura Strategy Systems</span>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};
