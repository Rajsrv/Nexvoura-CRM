import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore';
import { toast } from 'sonner';
import { motion } from 'motion/react';

export default function LeadForm({ companyId }: { companyId: string }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    service: 'WordPress',
    message: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'leads'), {
        ...formData,
        companyId,
        status: 'New',
        createdAt: new Date().toISOString()
      });
      toast.success('Thank you! We will contact you soon.');
      setFormData({ name: '', email: '', phone: '', service: 'WordPress', message: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'leads');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-xl mx-auto bg-white p-6 md:p-10 rounded-[40px] shadow-2xl border border-slate-100 flex flex-col"
    >
      <div className="mb-8">
        <h2 className="text-3xl md:text-4xl font-black text-slate-950 italic tracking-tighter uppercase mb-2">Get a Free Audit</h2>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest italic">Precision Diagnostic Protocol Initiation</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Full Name</label>
            <input
              type="text"
              required
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-900"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Email Address</label>
            <input
              type="email"
              required
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-900"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Phone Number</label>
            <input
              type="tel"
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-900"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Service Required</label>
            <select
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer font-bold text-slate-900"
              value={formData.service}
              onChange={(e) => setFormData({ ...formData, service: e.target.value })}
            >
              <option>WordPress</option>
              <option>Shopify</option>
              <option>Custom Development</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Project Details</label>
          <textarea
            rows={4}
            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-900 resize-none"
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            placeholder="Outline your strategic requirements..."
          />
        </div>

        <button
          disabled={loading}
          className="w-full bg-slate-950 text-white p-5 rounded-[32px] font-black italic text-sm tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-950/20 active:scale-95 uppercase"
        >
          {loading ? 'Processing...' : 'Initialize Analysis'}
        </button>
      </form>
    </motion.div>
  );
}
