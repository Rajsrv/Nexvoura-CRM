import React from 'react';
import { motion } from 'motion/react';
import { DynamicForm, FormField, FormStyling } from '../services/formService';
import { Send, CheckCircle, Star, Sliders } from 'lucide-react';

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
  borderRadius: '24px',
  fontFamily: 'font-sans',
  buttonStyle: 'filled',
  formWidth: 'boxed',
  headerAlignment: 'center',
  fieldSpacing: 'comfortable'
};

export const FormPreview: React.FC<FormPreviewProps> = ({ form, onTestSubmit, isTestMode }) => {
  const styling = { ...DEFAULT_STYLING, ...form.styling };
  const [formData, setFormData] = React.useState<Record<string, any>>({});
  const [submitted, setSubmitted] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const spacingMap = {
    compact: 'gap-y-4',
    comfortable: 'gap-y-8',
    loose: 'gap-y-12'
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

  const validate = () => {
    const newErrors: Record<string, string> = {};
    form.fields?.forEach(field => {
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
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-6 animate-in fade-in zoom-in duration-500">
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
      className={`w-full min-h-full transition-colors duration-500 overflow-y-auto ${styling.fontFamily} p-0`}
      style={{ backgroundColor: styling.backgroundColor }}
    >
      {styling.bannerUrl && (
        <div className="w-full h-40 sm:h-64 overflow-hidden relative">
           <img src={styling.bannerUrl} alt="Banner" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
           <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
      )}

      <div className={`w-full py-8 sm:py-20 px-4 sm:px-8 flex flex-col items-center ${styling.bannerUrl ? '-mt-20 relative z-10' : ''}`}>
        <div 
          className={`w-full shadow-2xl border border-black/5 overflow-hidden flex flex-col ${styling.formWidth === 'full' ? 'max-w-none' : 'max-w-3xl'}`}
          style={{ 
            backgroundColor: styling.cardColor, 
            borderRadius: styling.borderRadius 
          }}
        >
          {/* Header Section */}
          <div className={`p-8 sm:p-12 pb-0 flex flex-col ${alignMap[styling.headerAlignment]} ${textAlignMap[styling.headerAlignment]}`}>
            {styling.logoUrl && (
              <img src={styling.logoUrl} alt="Logo" className="h-12 w-auto mb-8 object-contain" referrerPolicy="no-referrer" />
            )}
            <h1 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tight mb-4" style={{ color: styling.textColor }}>
              {form.name || 'Untitled Directive'}
            </h1>
            {form.description && (
              <p className="text-sm font-medium text-slate-500 opacity-70 max-w-xl">
                {form.description}
              </p>
            )}
            <div className="w-20 h-1 mt-8" style={{ backgroundColor: styling.primaryColor }} />
          </div>

          <form onSubmit={handleSubmit} className={`p-8 sm:p-12 pt-10 grid grid-cols-2 gap-x-8 ${spacingMap[styling.fieldSpacing]}`}>
            {form.fields?.map((field) => (
              <div 
                key={field.id} 
                className={`flex flex-col space-y-3 ${field.width === 'half' ? 'col-span-1' : 'col-span-2'}`}
              >
                <label className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-black uppercase tracking-[0.15em] italic" style={{ color: styling.labelColor || styling.textColor }}>
                    {field.label} {field.required && <span className="text-rose-500 ml-1">*</span>}
                  </span>
                </label>

                {field.type === 'switch' ? (
                  <div className="flex items-center pt-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, [field.id]: !formData[field.id] })}
                      className={`w-12 h-6 rounded-full transition-all flex items-center px-1 ${formData[field.id] ? 'bg-indigo-600' : 'bg-slate-200'}`}
                      style={{ backgroundColor: formData[field.id] ? styling.primaryColor : undefined }}
                    >
                      <motion.div
                        animate={{ x: formData[field.id] ? 24 : 0 }}
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
                  <div className="flex items-center space-x-2 pt-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFormData({ ...formData, [field.id]: star })}
                        className="transition-all hover:scale-110"
                        style={{ color: (formData[field.id] || 0) >= star ? styling.primaryColor : '#cbd5e1' }}
                      >
                        <Star size={24} fill={(formData[field.id] || 0) >= star ? styling.primaryColor : 'transparent'} />
                      </button>
                    ))}
                  </div>
                ) : field.type === 'textarea' ? (
                  <textarea
                    placeholder={field.placeholder}
                    value={formData[field.id] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                    className="w-full p-5 text-sm font-medium border transition-all outline-none focus:ring-4 focus:ring-opacity-20 min-h-[140px] resize-none"
                    style={{ 
                      borderRadius: `calc(${styling.borderRadius} * 0.4)`,
                      borderColor: errors[field.id] ? '#f43f5e' : 'rgba(0,0,0,0.1)',
                      backgroundColor: styling.backgroundColor === styling.cardColor ? 'rgba(0,0,0,0.02)' : styling.backgroundColor,
                      color: styling.textColor
                    }}
                  />
                ) : field.type === 'select' ? (
                  <select
                    value={formData[field.id] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                    className="w-full p-5 text-sm font-medium border transition-all outline-none appearance-none"
                    style={{ 
                      borderRadius: `calc(${styling.borderRadius} * 0.4)`,
                      borderColor: errors[field.id] ? '#f43f5e' : 'rgba(0,0,0,0.1)',
                      backgroundColor: styling.backgroundColor === styling.cardColor ? 'rgba(0,0,0,0.02)' : styling.backgroundColor,
                      color: styling.textColor
                    }}
                  >
                    <option value="" disabled>{field.placeholder || 'Select option...'}</option>
                    {field.options?.map((opt, i) => (
                      <option key={i} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : field.type === 'checkbox' ? (
                  <div className="flex flex-wrap gap-6 pt-2">
                    {field.options?.map((opt, i) => (
                      <label key={i} className="flex items-center space-x-3 cursor-pointer group">
                        <div 
                          className={`w-6 h-6 border flex items-center justify-center transition-all ${formData[field.id]?.includes(opt) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}
                          style={{ 
                            borderRadius: '8px',
                            backgroundColor: formData[field.id]?.includes(opt) ? styling.primaryColor : 'transparent',
                            borderColor: formData[field.id]?.includes(opt) ? styling.primaryColor : 'rgba(0,0,0,0.1)'
                          }}
                          onClick={() => {
                            const current = formData[field.id] || [];
                            const updated = current.includes(opt) 
                              ? current.filter((o: string) => o !== opt)
                              : [...current, opt];
                            setFormData({ ...formData, [field.id]: updated });
                          }}
                        >
                          {formData[field.id]?.includes(opt) && <CheckCircle size={14} className="text-white" />}
                        </div>
                        <span className="text-xs font-bold uppercase tracking-tight" style={{ color: styling.textColor }}>{opt}</span>
                      </label>
                    ))}
                  </div>
                ) : field.type === 'radio' ? (
                  <div className="flex flex-wrap gap-6 pt-2">
                    {field.options?.map((opt, i) => (
                      <label key={i} className="flex items-center space-x-3 cursor-pointer group" onClick={() => setFormData({ ...formData, [field.id]: opt })}>
                        <div 
                          className="w-6 h-6 rounded-full border flex items-center justify-center transition-all"
                          style={{ 
                            borderColor: formData[field.id] === opt ? styling.primaryColor : 'rgba(0,0,0,0.1)',
                            backgroundColor: formData[field.id] === opt ? `${styling.primaryColor}20` : 'transparent'
                          }}
                        >
                          {formData[field.id] === opt && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: styling.primaryColor }} />}
                        </div>
                        <span className="text-xs font-bold uppercase tracking-tight" style={{ color: styling.textColor }}>{opt}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    value={formData[field.id] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                    className="w-full p-5 text-sm font-medium border transition-all outline-none"
                    style={{ 
                      borderRadius: `calc(${styling.borderRadius} * 0.4)`,
                      borderColor: errors[field.id] ? '#f43f5e' : 'rgba(0,0,0,0.1)',
                      backgroundColor: styling.backgroundColor === styling.cardColor ? 'rgba(0,0,0,0.02)' : styling.backgroundColor,
                      color: styling.textColor
                    }}
                  />
                )}
                {errors[field.id] && (
                  <p className="text-[10px] font-black text-rose-500 uppercase italic px-1 animate-in slide-in-from-top-1">
                    {errors[field.id]}
                  </p>
                )}
              </div>
            ))}

            <div className="col-span-2 pt-10">
              <button
                type="submit"
                className="w-full py-6 font-black text-[13px] uppercase tracking-[0.3em] italic shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center space-x-4"
                style={{ 
                  backgroundColor: styling.buttonStyle === 'filled' ? styling.primaryColor : 'transparent',
                  color: styling.buttonStyle === 'filled' ? styling.buttonText : styling.primaryColor,
                  border: styling.buttonStyle === 'outline' ? `2px solid ${styling.primaryColor}` : 'none',
                  borderRadius: styling.borderRadius,
                  boxShadow: styling.buttonStyle === 'filled' ? `0 20px 25px -5px ${styling.primaryColor}30` : 'none'
                }}
              >
                <span>Initiate Transmission</span>
                <Send size={18} />
              </button>
            </div>
          </form>

          {styling.footerText && (
            <div className="p-8 border-t border-black/5 bg-slate-50/50 flex flex-col items-center justify-center space-y-2">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center max-w-md">
                {styling.footerText}
              </p>
            </div>
          )}

          {!isTestMode && (
            <div className="p-6 border-t border-black/5 flex items-center justify-center space-x-3 opacity-30 grayscale">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Powered by</span>
              <span className="text-[10px] font-black text-slate-900 uppercase italic">Nexvoura Strategy Systems</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
