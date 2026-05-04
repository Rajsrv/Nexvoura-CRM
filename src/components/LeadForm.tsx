import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore';
import { toast } from 'sonner';
import { motion } from 'motion/react';

import { analyticsService } from '../services/analyticsService';

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
      analyticsService.trackFormSubmit('public_user', companyId, 'lead_form', { service: formData.service });
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
      className="max-w-xl mx-auto bg-white dark:bg-dark-surface p-8 rounded-3xl shadow-2xl border border-slate-100 dark:border-dark-border transition-colors"
    >
      <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Get a Free Audit</h2>
      <p className="text-slate-500 dark:text-dark-text-muted mb-8">Tell us about your project and we'll get back to you within 24 hours.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-dark-text mb-2">Full Name</label>
            <input
              type="text"
              required
              className="w-full p-4 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-dark-text mb-2">Email Address</label>
            <input
              type="email"
              required
              className="w-full p-4 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-dark-text mb-2">Phone Number</label>
            <input
              type="tel"
              className="w-full p-4 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-dark-text mb-2">Service Required</label>
            <select
              className="w-full p-4 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none text-slate-900 dark:text-white"
              value={formData.service}
              onChange={(e) => setFormData({ ...formData, service: e.target.value })}
            >
              <option className="dark:bg-dark-surface">WordPress</option>
              <option className="dark:bg-dark-surface">Shopify</option>
              <option className="dark:bg-dark-surface">Custom Development</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-dark-text mb-2">Project Details</label>
          <textarea
            rows={4}
            className="w-full p-4 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          />
        </div>

        <button
          disabled={loading}
          className="w-full bg-blue-600 dark:bg-indigo-600 text-white p-4 rounded-xl font-bold text-lg hover:bg-blue-700 dark:hover:bg-indigo-700 hover:shadow-lg hover:shadow-blue-200 dark:hover:shadow-indigo-500/20 transition-all disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Send Request'}
        </button>
      </form>
    </motion.div>
  );
}
