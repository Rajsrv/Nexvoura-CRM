import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Company } from '../types';
import NexvouraLoader from './NexvouraLoader';
import { Globe, Building2, ArrowRight, ShieldCheck, Mail, MapPin, Phone, LayoutDashboard } from 'lucide-react';
import { motion } from 'motion/react';

export default function PublicPortalPage() {
  const { subdomain } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompany = async () => {
      if (!subdomain) {
        setLoading(false);
        return;
      }

      try {
        const q = query(collection(db, 'companies'), where('subdomain', '==', subdomain));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setCompany({ id: snap.docs[0].id, ...snap.docs[0].data() } as Company);
        }
      } catch (error) {
        console.error('Error fetching company portal:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompany();
  }, [subdomain]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-dark-bg flex items-center justify-center">
        <NexvouraLoader label="Configuring Workspace Portal" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-dark-bg flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-slate-100 dark:bg-dark-surface rounded-3xl flex items-center justify-center mb-6 text-slate-300">
          <Globe size={40} />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Workspace Not Found</h1>
        <p className="text-slate-500 dark:text-dark-text-muted mt-2 max-w-sm">The workspace you are looking for does not exist or has been moved.</p>
        <Link to="/login" className="mt-8 text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Return to Nexvoura</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfbfb] dark:bg-dark-bg transition-colors duration-500">
      <nav className="h-20 border-b border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface px-6 md:px-12 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg overflow-hidden">
            {company.logoUrl ? (
              <img src={company.logoUrl} alt={company.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            ) : (
              <LayoutDashboard size={20} />
            )}
          </div>
          <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{company.name}</span>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate(`/login?tenant=${company.subdomain}`)}
            className="text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            Sign In
          </button>
          <button 
             onClick={() => navigate(`/submit-lead/${company.id}`)}
             className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20"
          >
            Contact Sales
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-16 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
              <ShieldCheck size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Verified Workspace</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.05]">
              Accelerate with <br />
              <span className="text-indigo-600 dark:text-indigo-400">{company.name}.</span>
            </h1>
            
            <p className="text-xl text-slate-500 dark:text-dark-text-muted font-medium leading-relaxed">
              {company.description || `Welcome to the official ${company.name} workspace. We provide industry-leading solutions in ${company.industry || 'multiple sectors'}.`}
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <button 
                onClick={() => navigate(`/submit-lead/${company.id}`)}
                className="px-10 py-4 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-slate-800 dark:hover:bg-indigo-700 transition-all shadow-xl shadow-slate-200 dark:shadow-none flex items-center space-x-3"
              >
                <span>Start Directives</span>
                <ArrowRight size={20} />
              </button>
              {company.website && (
                <a 
                  href={company.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-8 py-4 bg-white dark:bg-dark-surface text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-dark-border rounded-2xl font-bold hover:bg-slate-50 dark:hover:bg-dark-bg transition-all flex items-center space-x-3"
                >
                  <Globe size={20} />
                  <span>Main Website</span>
                </a>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 pt-12 border-t border-slate-100 dark:border-dark-border">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Industry</p>
                <p className="text-sm font-bold text-slate-800 dark:text-white">{company.industry || 'General'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Currency</p>
                <p className="text-sm font-bold text-slate-800 dark:text-white">{company.currency || 'USD'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Member Since</p>
                <p className="text-sm font-bold text-slate-800 dark:text-white">{new Date(company.createdAt).getFullYear()}</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-indigo-500/20 blur-[100px] rounded-full" />
            <div className="relative glass-card border-slate-200/60 dark:border-dark-border/50 rounded-[40px] overflow-hidden shadow-2xl">
              <div className="p-10 space-y-8">
                <div className="space-y-4">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Contact Information</h3>
                  <div className="space-y-4">
                    {company.address && (
                      <div className="flex items-center space-x-4 text-slate-500 dark:text-dark-text-muted">
                        <div className="p-3 bg-slate-50 dark:bg-dark-bg rounded-xl">
                          <MapPin size={20} />
                        </div>
                        <span className="text-sm font-medium">{company.address}</span>
                      </div>
                    )}
                    {company.phone && (
                      <div className="flex items-center space-x-4 text-slate-500 dark:text-dark-text-muted">
                        <div className="p-3 bg-slate-50 dark:bg-dark-bg rounded-xl">
                          <Phone size={20} />
                        </div>
                        <span className="text-sm font-medium">{company.phone}</span>
                      </div>
                    )}
                    {company.website && (
                      <div className="flex items-center space-x-4 text-slate-500 dark:text-dark-text-muted">
                        <div className="p-3 bg-slate-50 dark:bg-dark-bg rounded-xl">
                          <Globe size={20} />
                        </div>
                        <span className="text-sm font-medium">{company.website.replace('https://', '')}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 bg-slate-900 rounded-[28px] text-white">
                  <h4 className="text-sm font-bold mb-2 flex items-center space-x-2">
                    <ShieldCheck size={16} className="text-indigo-400" />
                    <span>Secure Gateway</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed mb-6">
                    Authorized members can access their dashboards through our enterprise-grade security protocol.
                  </p>
                  <button 
                    onClick={() => navigate(`/login?tenant=${company.subdomain}`)}
                    className="w-full py-3 bg-white text-slate-900 rounded-xl font-black text-sm hover:bg-slate-100 transition-all flex items-center justify-center space-x-2"
                  >
                    <span>Member Login</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <footer className="py-12 border-t border-slate-200 dark:border-dark-border text-center">
        <div className="flex items-center justify-center space-x-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
          <span>Powered by</span>
          <span className="text-brand-primary italic">Nexvoura</span>
        </div>
      </footer>
    </div>
  );
}
