import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { formService, DynamicForm, FormField } from '../services/formService';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  ShieldCheck,
  Globe,
  Sparkles,
  Layout,
  Star,
  Sliders
} from 'lucide-react';

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

  const validate = () => {
    if (!form) return false;
    const newErrors: Record<string, string> = {};
    form.fields.forEach(field => {
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

  const [countdown, setCountdown] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !formId) return;
    if (!validate()) return;

    setSubmitting(true);
    try {
      await formService.submitForm(
        form.companyId,
        formId,
        form.name,
        formData
      );
      setSubmitted(true);

      // Handle Redirect
      if (form.redirect?.enabled && form.redirect.url) {
        let delay = form.redirect.delay || 0;
        if (delay > 0) {
          setCountdown(delay);
          const interval = setInterval(() => {
            setCountdown(prev => {
              if (prev !== null && prev <= 1) {
                clearInterval(interval);
                window.location.href = form.redirect!.url;
                return 0;
              }
              return (prev || 1) - 1;
            });
          }, 1000);
        } else {
          window.location.href = form.redirect.url;
        }
      }
    } catch (err: any) {
      let msg = 'Transmission failed. Emergency shutdown initiated.';
      if (err?.message) {
        try {
          const parsed = JSON.parse(err.message);
          if (parsed.error) msg = `Transmission Error: ${parsed.error}`;
        } catch {
          // Not a JSON error
        }
      }
      setError(msg);
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

  const isEmbedded = window.self !== window.top;
  const styling = form?.styling;

  if (loading) {
    return (
      <div className={`min-h-screen ${isEmbedded ? 'bg-transparent' : 'bg-slate-950'} flex flex-col items-center justify-center space-y-4`}>
        <Loader2 size={40} className="text-indigo-500 animate-spin" />
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic">Scanning Communication Channel...</p>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className={`min-h-screen ${isEmbedded ? 'bg-transparent' : 'bg-slate-950'} flex flex-col items-center justify-center p-6 text-center`}>
        <div className="w-20 h-20 bg-rose-500/10 rounded-[32px] flex items-center justify-center text-rose-500 mb-8 border border-rose-500/20 shadow-2xl shadow-rose-500/10">
          <AlertCircle size={40} />
        </div>
        <h1 className={`text-2xl font-black ${isEmbedded ? 'text-slate-900 dark:text-white' : 'text-white'} italic uppercase tracking-tight mb-4`}>Connection Failed</h1>
        <p className="text-slate-400 max-w-sm text-sm font-medium leading-relaxed">{error || 'Directive not found.'}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-10 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className={`min-h-screen ${isEmbedded ? 'bg-transparent' : (styling?.backgroundColor || 'bg-slate-950')} flex flex-col items-center justify-center p-6 text-center transition-colors duration-500`} style={styling ? { backgroundColor: styling.backgroundColor } : {}}>
        <motion.div
           initial={{ scale: 0.8, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           className="w-24 h-24 bg-emerald-500/20 rounded-[40px] flex items-center justify-center text-emerald-500 mb-10 border border-emerald-500/20 shadow-2xl shadow-emerald-500/20"
           style={styling ? { color: styling.primaryColor, borderColor: `${styling.primaryColor}30`, backgroundColor: `${styling.primaryColor}15` } : {}}
        >
          <CheckCircle size={48} />
        </motion.div>
        <h1 className={`text-3xl font-black italic uppercase tracking-tight mb-4`} style={styling ? { color: styling.textColor } : { color: isEmbedded ? 'inherit' : 'white' }}>Transmission Successful</h1>
        <p className="text-slate-400 max-w-sm text-base font-medium leading-relaxed">Directive <span className="font-black italic" style={styling ? { color: styling.primaryColor } : { color: '#34d399' }}>{form.name}</span> has been securely ingested into the central database.</p>
        
        {countdown !== null && (
          <div className="mt-12 space-y-4">
             <div className="flex items-center justify-center space-x-3 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] italic">
               <Loader2 size={14} className="animate-spin" />
               <span>Forwarding to destination in {countdown}s</span>
             </div>
             <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden mx-auto">
               <motion.div 
                 initial={{ width: '100%' }}
                 animate={{ width: '0%' }}
                 transition={{ duration: form.redirect?.delay || 3, ease: 'linear' }}
                 className="h-full bg-emerald-500"
               />
             </div>
          </div>
        )}
      </div>
    );
  }

  const spacingMap = {
    compact: 'gap-y-6',
    comfortable: 'gap-y-10',
    loose: 'gap-y-16'
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

  return (
    <div className={`min-h-screen ${isEmbedded ? 'bg-transparent' : (styling?.backgroundColor || 'bg-slate-950')} flex flex-col lg:flex-row transition-colors duration-500 ${styling?.fontFamily || ''}`} style={styling ? { backgroundColor: styling.backgroundColor } : {}}>
      {/* Visual Side - Hidden if embedded */}
      {!isEmbedded && (
        <div className="hidden lg:flex w-1/3 bg-slate-900 border-r border-white/5 flex-col justify-between p-12 relative overflow-hidden" style={styling ? { backgroundColor: styling.primaryColor + '10' } : {}}>
          <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
             <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] rounded-full blur-[100px]" style={{ backgroundColor: styling?.primaryColor || '#6366f1' }} />
             <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] rounded-full blur-[100px]" style={{ backgroundColor: styling?.primaryColor || '#10b981' }} />
          </div>

          <div className="relative z-10">
            {styling?.logoUrl ? (
              <img src={styling.logoUrl} alt="Logo" className="h-10 w-auto object-contain" referrerPolicy="no-referrer" />
            ) : (
              <>
                <h1 className="text-3xl font-black font-display tracking-tight flex items-center space-x-2 italic">
                  <span style={{ color: styling?.primaryColor || '#6366f1' }}>Nex</span>
                  <span className="text-white">voura</span>
                </h1>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-2 italic">Secure Intake Terminal</p>
              </>
            )}
          </div>

          <div className="relative z-10 space-y-6">
             <div className="p-10 bg-white/5 border border-white/10 rounded-[40px] backdrop-blur-md">
               <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white mb-6">
                 <Sparkles size={24} />
               </div>
               <h2 className="text-2xl font-black text-white italic uppercase mb-2 leading-tight">{form.name}</h2>
               <p className="text-sm font-medium text-slate-400 leading-relaxed opacity-80">{form.description || 'Global directive processing initiated. Please provide the required data nodes.'}</p>
             </div>
             
             <div className="flex items-center space-x-4 px-6">
               <ShieldCheck size={18} className="text-emerald-500" />
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ECC-521 Bit Encrypted Connection</span>
             </div>
          </div>

          <div className="relative z-10 flex items-center space-x-4 opacity-40">
            <Globe size={16} className="text-slate-500" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Platform OS v2.4.0</span>
          </div>
        </div>
      )}

      {/* Form Side */}
      <div className={`flex-1 overflow-y-auto ${isEmbedded ? 'p-0' : 'px-4 py-12 lg:p-24 flex flex-col items-center justify-start'}`}>
        
        {styling?.bannerUrl && !isEmbedded && (
          <div className="w-full max-w-4xl h-48 sm:h-72 rounded-[48px] overflow-hidden mb-12 shadow-2xl relative">
            <img src={styling.bannerUrl} alt="Banner" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
        )}

        <div 
          className={`w-full bg-white dark:bg-dark-surface shadow-2xl border border-black/5 transition-all overflow-hidden flex flex-col ${styling?.formWidth === 'full' ? 'max-w-none' : 'max-w-3xl'}`} 
          style={styling ? { backgroundColor: styling.cardColor, borderRadius: styling.borderRadius } : { borderRadius: '40px' }}
        >
           {/* Header Area */}
           <div className={`p-8 sm:p-12 pb-0 flex flex-col ${alignMap[styling?.headerAlignment || 'center']} ${textAlignMap[styling?.headerAlignment || 'center']}`}>
              {styling?.logoUrl && isEmbedded && (
                <img src={styling.logoUrl} alt="Logo" className="h-10 w-auto mb-6 object-contain" referrerPolicy="no-referrer" />
              )}
              <h1 className={`text-3xl sm:text-4xl font-black italic uppercase tracking-tight mb-3`} style={styling ? { color: styling.textColor } : { color: isEmbedded ? 'inherit' : 'white' }}>{form.name}</h1>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] italic mb-6">Intake Directive Protocol</p>
              <div className="w-20 h-1" style={{ backgroundColor: styling?.primaryColor || '#6366f1' }} />
           </div>

           <form onSubmit={handleSubmit} className={`p-8 sm:p-12 pt-10 grid grid-cols-2 gap-x-8 ${spacingMap[styling?.fieldSpacing || 'comfortable']}`}>
             {form.fields.map((field) => (
               <div key={field.id} className={`space-y-3 ${field.width === 'half' ? 'col-span-1' : 'col-span-2'}`}>
                 <label className="flex items-center justify-between px-2">
                   <span className={`text-[11px] font-black uppercase tracking-[0.15em] italic`} style={styling ? { color: styling.labelColor || styling.textColor } : { color: '#64748b' }}>
                     {field.label} {field.required && <span className="text-rose-500 ml-1">*</span>}
                   </span>
                 </label>
                 
                 {field.type === 'switch' ? (
                   <div className="flex items-center pt-2">
                     <button
                       type="button"
                       onClick={() => handleInputChange(field.id, !formData[field.id])}
                       className={`w-12 h-6 rounded-full transition-all flex items-center px-1 ${formData[field.id] ? 'bg-indigo-600' : 'bg-slate-200'}`}
                       style={{ backgroundColor: formData[field.id] ? (styling?.primaryColor || '#6366f1') : undefined }}
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
                   <div className="flex items-center space-x-2 pt-2">
                     {[1, 2, 3, 4, 5].map((star) => (
                       <button
                         key={star}
                         type="button"
                         onClick={() => handleInputChange(field.id, star)}
                         className="transition-all hover:scale-110"
                         style={{ color: (formData[field.id] || 0) >= star ? (styling?.primaryColor || '#6366f1') : '#cbd5e1' }}
                       >
                         <Star size={24} fill={(formData[field.id] || 0) >= star ? (styling?.primaryColor || '#6366f1') : 'transparent'} />
                       </button>
                     ))}
                   </div>
                 ) : field.type === 'textarea' ? (
                   <textarea
                     placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                     value={formData[field.id] || ''}
                     onChange={(e) => handleInputChange(field.id, e.target.value)}
                     className="w-full p-5 text-base font-medium border transition-all outline-none focus:ring-4 min-h-[140px] resize-none"
                     style={{ 
                       borderRadius: styling ? `calc(${styling.borderRadius} * 0.4)` : '24px',
                       borderColor: errors[field.id] ? '#f43f5e' : (styling ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'),
                       backgroundColor: styling ? (styling.backgroundColor === styling.cardColor ? 'rgba(0,0,0,0.02)' : styling.backgroundColor) : 'rgba(255,255,255,0.05)',
                       color: styling?.textColor || (isEmbedded ? 'inherit' : 'white')
                     }}
                   />
                 ) : field.type === 'select' ? (
                   <select
                     value={formData[field.id] || ''}
                     onChange={(e) => handleInputChange(field.id, e.target.value)}
                     className="w-full p-5 text-base font-medium border transition-all outline-none appearance-none"
                     style={{ 
                       borderRadius: styling ? `calc(${styling.borderRadius} * 0.4)` : '24px',
                       borderColor: errors[field.id] ? '#f43f5e' : (styling ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'),
                       backgroundColor: styling ? (styling.backgroundColor === styling.cardColor ? 'rgba(0,0,0,0.02)' : styling.backgroundColor) : 'rgba(255,255,255,0.05)',
                       color: styling?.textColor || (isEmbedded ? 'inherit' : 'white')
                     }}
                   >
                     <option value="" disabled>{field.placeholder || `Select ${field.label}...`}</option>
                     {field.options?.map((opt, i) => (
                       <option key={i} value={opt} className="bg-white text-slate-900">{opt}</option>
                     ))}
                   </select>
                 ) : field.type === 'checkbox' ? (
                    <div className="flex flex-wrap gap-6 pt-2">
                      {field.options?.map((opt, i) => (
                        <label key={i} className="flex items-center space-x-4 cursor-pointer group" onClick={() => {
                          const current = formData[field.id] || [];
                          const updated = current.includes(opt) 
                            ? current.filter((o: string) => o !== opt)
                            : [...current, opt];
                          handleInputChange(field.id, updated);
                        }}>
                          <div 
                            className={`w-6 h-6 border flex items-center justify-center transition-all ${formData[field.id]?.includes(opt) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}
                            style={{ 
                              borderRadius: '8px', 
                              backgroundColor: formData[field.id]?.includes(opt) ? (styling?.primaryColor || '#6366f1') : 'transparent',
                              borderColor: formData[field.id]?.includes(opt) ? (styling?.primaryColor || '#6366f1') : 'rgba(0,0,0,0.1)' 
                            }}
                          >
                            {formData[field.id]?.includes(opt) && <CheckCircle size={14} className="text-white" />}
                          </div>
                          <span className="text-sm font-bold uppercase tracking-tight" style={styling ? { color: styling.textColor } : { color: isEmbedded ? 'inherit' : 'white' }}>{opt}</span>
                        </label>
                      ))}
                    </div>
                  ) : field.type === 'radio' ? (
                    <div className="flex flex-wrap gap-6 pt-2">
                       {field.options?.map((opt, i) => (
                        <label key={i} className="flex items-center space-x-4 cursor-pointer group" onClick={() => handleInputChange(field.id, opt)}>
                          <div 
                            className="w-6 h-6 rounded-full border flex items-center justify-center transition-all"
                            style={{ 
                              borderColor: formData[field.id] === opt ? (styling?.primaryColor || '#6366f1') : 'rgba(0,0,0,0.1)',
                              backgroundColor: formData[field.id] === opt ? `${styling?.primaryColor || '#6366f1'}20` : 'transparent'
                            }}
                          >
                            {formData[field.id] === opt && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: styling?.primaryColor || '#6366f1' }} />}
                          </div>
                          <span className="text-sm font-bold uppercase tracking-tight" style={styling ? { color: styling.textColor } : { color: isEmbedded ? 'inherit' : 'white' }}>{opt}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                   <input
                     type={field.type}
                     placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                     value={formData[field.id] || ''}
                     onChange={(e) => handleInputChange(field.id, e.target.value)}
                     className="w-full p-5 text-base font-medium border transition-all outline-none"
                     style={{ 
                       borderRadius: styling ? `calc(${styling.borderRadius} * 0.4)` : '24px',
                       borderColor: errors[field.id] ? '#f43f5e' : (styling ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'),
                       backgroundColor: styling ? (styling.backgroundColor === styling.cardColor ? 'rgba(0,0,0,0.02)' : styling.backgroundColor) : 'rgba(255,255,255,0.05)',
                       color: styling?.textColor || (isEmbedded ? 'inherit' : 'white')
                     }}
                   />
                 )}
                 {errors[field.id] && (
                   <p className="text-[10px] font-black text-rose-500 uppercase italic px-2 animate-in slide-in-from-top-1">
                     {errors[field.id]}
                   </p>
                 )}
               </div>
             ))}

             <div className="col-span-2 pt-12">
               <button
                 type="submit"
                 disabled={submitting}
                 className="w-full py-6 font-black text-[13px] uppercase tracking-[0.3em] italic shadow-xl flex items-center justify-center space-x-5 transform transition-all active:scale-95 disabled:opacity-50"
                 style={{ 
                   backgroundColor: styling ? (styling.buttonStyle === 'filled' ? styling.primaryColor : 'transparent') : '#4f46e5',
                   color: styling ? (styling.buttonStyle === 'filled' ? styling.buttonText : styling.primaryColor) : 'white',
                   border: styling?.buttonStyle === 'outline' ? `2px solid ${styling.primaryColor}` : 'none',
                   borderRadius: styling?.borderRadius || '28px',
                   boxShadow: styling ? `0 20px 25px -5px ${styling.primaryColor}30` : '0 20px 25px -5px rgba(79, 70, 229, 0.3)'
                 }}
               >
                 {submitting ? (
                   <>
                     <Loader2 size={24} className="animate-spin" />
                     <span>Ingesting Node Data...</span>
                   </>
                 ) : (
                   <>
                     <span>Transmit Signal</span>
                     <Send size={22} className="rotate-[-10deg]" />
                   </>
                 )}
               </button>
             </div>
           </form>

           {styling?.footerText && (
             <div className="p-8 border-t border-black/5 bg-slate-50/5 flex flex-col items-center justify-center space-y-3">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] italic text-center max-w-md">
                  {styling.footerText}
                </p>
                <div className="w-8 h-px bg-slate-200" />
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.3em]">Protocol Secure</p>
             </div>
           )}

           {!isEmbedded && (
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

export default PublicFormPage;
