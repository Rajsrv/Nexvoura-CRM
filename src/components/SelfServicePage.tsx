import React, { useState, useEffect } from 'react';
import { 
  User, 
  FileText, 
  Calendar, 
  DollarSign, 
  Upload, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ChevronRight,
  ShieldCheck,
  Send,
  X,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../App';
import { requestService, SystemRequest, RequestType } from '../services/requestService';
import { doc, updateDoc, query, collection, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';

const SelfServicePage = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<SystemRequest[]>([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestType, setRequestType] = useState<RequestType>('LEAVE');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    interests: user?.interests || ''
  });

  const [formData, setFormData] = useState({
    reason: '',
    startDate: '',
    endDate: '',
    month: '',
    documentType: ''
  });

  const [activeTab, setActiveTab] = useState<'requests' | 'documents'>('requests');
  const [employeeDocs, setEmployeeDocs] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsub = requestService.getUserRequests(user.uid, setRequests);
    
    // Fetch official documents
    const docQ = query(collection(db, 'employeeDocuments'), where('employeeId', '==', user.uid));
    const unsubDocs = onSnapshot(docQ, (snap) => {
      setEmployeeDocs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsub();
      unsubDocs();
    };
  }, [user]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await requestService.submitRequest({
        userId: user.uid,
        userName: user.name,
        companyId: user.companyId,
        type: requestType,
        details: { ...formData }
      });
      toast.success(`${requestType.replace('_', ' ')} request transmitted successfully`);
      setShowRequestModal(false);
      setFormData({ reason: '', startDate: '', endDate: '', month: '', documentType: '' });
    } catch (err) {
      toast.error('Failed to transmit request');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        ...profileForm
      });
      toast.success('Professional profile updated');
      setIsUpdatingProfile(false);
    } catch (err) {
      toast.error('Failed to update identity parameters');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20';
      case 'REJECTED': return 'text-rose-500 bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20';
      case 'PROCESSING': return 'text-amber-500 bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20';
      default: return 'text-blue-500 bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20';
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="space-y-2">
        <div className="inline-flex items-center space-x-2 text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-500/20 mb-2">
          <ShieldCheck size={14} />
          <span>Secured Employee Portal</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black font-display italic tracking-tighter text-slate-950 dark:text-white leading-none">
          Self-Service Hub
        </h1>
        <p className="text-slate-500 dark:text-dark-text-muted font-medium">Manage your professional identity and administrative requirements.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="saas-card lg:col-span-1 p-8 space-y-8 flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black font-display italic text-slate-900 dark:text-white uppercase tracking-tight">Identity</h3>
            <button 
              onClick={() => setIsUpdatingProfile(!isUpdatingProfile)}
              className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
            >
              {isUpdatingProfile ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>

          <div className="flex flex-col items-center space-y-6">
            <div className="relative group">
              <div className="w-32 h-32 rounded-[40px] bg-slate-200 dark:bg-indigo-500/10 text-indigo-600 flex items-center justify-center border-4 border-white dark:border-dark-surface shadow-xl overflow-hidden">
                {user?.pfp ? (
                  <img src={user.pfp} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <User size={48} />
                )}
              </div>
              <button className="absolute bottom-0 right-0 p-3 bg-indigo-600 text-white rounded-2xl shadow-lg hover:scale-110 transition-transform border-4 border-white dark:border-dark-surface">
                <Upload size={16} />
              </button>
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-none mb-2 italic tracking-tighter">{user?.name}</h2>
              <p className="text-[10px] font-black text-slate-500 dark:text-dark-text-muted uppercase tracking-widest">{user?.role?.replace('_', ' ')} Strategy</p>
            </div>
          </div>

          {!isUpdatingProfile ? (
            <div className="space-y-6 pt-6 border-t border-slate-200 dark:border-dark-border/50">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Phone</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{user?.phone || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ID Reference</span>
                <span className="text-xs font-mono font-bold text-slate-700 dark:text-white bg-slate-100 dark:bg-dark-bg px-2 py-1 rounded-lg border border-slate-200 dark:border-dark-border">{user?.memberId || 'N/A'}</span>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Core Interests</span>
                <p className="text-sm font-medium text-slate-700 dark:text-dark-text leading-relaxed italic">
                  {user?.interests || 'Initialize your professional interests profile.'}
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpdateProfile} className="space-y-4 pt-6 border-t border-slate-200 dark:border-dark-border/50 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 italic">Display Name</label>
                <input 
                  type="text" 
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                  className="saas-input py-3 border-slate-200"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 italic">Contact Link (Phone)</label>
                <input 
                  type="text" 
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                  className="saas-input py-3 border-slate-200"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 italic">Professional Summary</label>
                <textarea 
                  rows={3}
                  value={profileForm.interests}
                  onChange={(e) => setProfileForm({...profileForm, interests: e.target.value})}
                  className="saas-input py-3 text-xs border-slate-200"
                />
              </div>
              <button 
                type="submit"
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-950 transition-all shadow-lg active:scale-95"
              >
                Sync Identity
              </button>
            </form>
          )}

          <div className="mt-auto pt-8">
            <div className="p-4 bg-slate-50 dark:bg-dark-bg/50 rounded-2xl border border-slate-100 dark:border-dark-border/50">
              <div className="flex items-center space-x-3 text-emerald-600 mb-2">
                <ShieldCheck size={18} />
                <span className="text-xs font-black uppercase tracking-widest">Compliance Status</span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                Your professional profile satisfies all current organizational compliance requirements.
              </p>
            </div>
          </div>
        </div>

        {/* Requests & Documents Dashboard */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center space-x-4 mb-2">
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'requests' 
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg' 
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-dark-bg'
              }`}
            >
              My Transmissions
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'documents' 
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg' 
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-dark-bg'
              }`}
            >
              Document Archive
            </button>
          </div>

          <div className="table-container p-8 shadow-xl shadow-slate-200/50 dark:shadow-none min-h-[400px]">
            {activeTab === 'requests' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black font-display italic text-slate-900 dark:text-white uppercase tracking-tight">Active Transactions</h3>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{requests.length} Requests</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                  {[
                    { type: 'LEAVE', icon: Calendar, label: 'Leave', color: 'bg-indigo-500' },
                    { type: 'SALARY_SLIP', icon: DollarSign, label: 'Salary Slip', color: 'bg-emerald-500' },
                    { type: 'PROFILE_CHANGE', icon: User, label: 'Profile Opt', color: 'bg-amber-500' },
                    { type: 'DOCUMENT', icon: FileText, label: 'Document', color: 'bg-rose-500' },
                  ].map((btn) => (
                    <button
                      key={btn.type}
                      onClick={() => { setRequestType(btn.type as RequestType); setShowRequestModal(true); }}
                      className="group saas-card p-6 flex flex-col items-center justify-center space-y-3 hover:border-brand-primary/50"
                    >
                      <div className={`w-10 h-10 rounded-2xl ${btn.color} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                        <btn.icon size={18} />
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-dark-text-muted">{btn.label}</span>
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  <AnimatePresence mode='popLayout'>
                    {requests.length === 0 ? (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="py-20 text-center space-y-4"
                      >
                        <div className="w-16 h-16 bg-slate-100 dark:bg-dark-bg/50 rounded-[24px] flex items-center justify-center mx-auto text-slate-400 border border-slate-200/50">
                          <Clock size={32} />
                        </div>
                        <p className="text-sm font-black text-slate-500 uppercase tracking-widest italic opacity-60">No active transmissions</p>
                      </motion.div>
                    ) : (
                      requests.map((req) => (
                        <motion.div
                          layout
                          key={req.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="group flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-slate-50/50 dark:bg-dark-bg/40 border border-slate-200 dark:border-dark-border/50 rounded-2xl hover:bg-white dark:hover:bg-dark-surface hover:shadow-xl transition-all"
                        >
                          <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getStatusColor(req.status)} border shadow-sm`}>
                              {req.type === 'LEAVE' && <Calendar size={20} />}
                              {req.type === 'SALARY_SLIP' && <DollarSign size={20} />}
                              {req.type === 'PROFILE_CHANGE' && <User size={20} />}
                              {req.type === 'DOCUMENT' && <Upload size={20} />}
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{req.type.replace('_', ' ')}</h4>
                              <div className="flex items-center space-x-4 mt-1">
                                <p className="text-[10px] font-black text-slate-500 flex items-center">
                                  <Clock size={12} className="mr-1" />
                                  {req.createdAt?.toDate().toLocaleDateString()}
                                </p>
                                <p className="text-[10px] font-black text-slate-500 italic truncate max-w-[200px]">
                                    {req.details.reason ? req.details.reason : (req.details.month || req.details.documentType)}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end sm:space-x-4">
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(req.status)}`}>
                              {req.status}
                            </span>
                            <ChevronRight size={16} className="text-slate-400 hidden sm:block group-hover:translate-x-1 transition-transform" />
                          </div>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black font-display italic text-slate-900 dark:text-white uppercase tracking-tight">Secured Data Archive</h3>
                  <div className="flex items-center space-x-2">
                    <ShieldCheck size={18} className="text-indigo-500" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ECC Encrypted</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {employeeDocs.length === 0 ? (
                    <div className="col-span-2 py-20 text-center space-y-4">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-dark-bg/50 rounded-[24px] flex items-center justify-center mx-auto text-slate-400 border border-slate-200/50">
                        <FileText size={32} />
                      </div>
                      <p className="text-sm font-black text-slate-500 uppercase tracking-widest italic opacity-60">No archived documents</p>
                    </div>
                  ) : (
                    employeeDocs.map((doc) => (
                      <div key={doc.id} className="p-6 bg-slate-50/50 dark:bg-dark-bg/40 border border-slate-200 dark:border-dark-border/50 rounded-2xl flex items-center justify-between group hover:bg-white dark:hover:bg-dark-surface transition-all">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-white dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                            <FileText size={20} />
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">{doc.name}</p>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mt-0.5">{doc.type}</p>
                          </div>
                        </div>
                        <a 
                          href={doc.fileUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-2.5 bg-white dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl text-slate-400 hover:text-indigo-600 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Upload className="rotate-180" size={16} />
                        </a>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-8 p-6 bg-brand-primary/5 dark:bg-indigo-500/5 border border-brand-primary/10 dark:border-indigo-500/10 rounded-[32px]">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-brand-primary/10 dark:bg-indigo-500/10 text-brand-primary dark:text-indigo-400 rounded-2xl flex items-center justify-center shrink-0">
                      <AlertCircle size={24} />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-brand-primary dark:text-indigo-400 uppercase tracking-widest leading-none mb-1">Document Protocol</h4>
                      <p className="text-[10px] text-slate-500 dark:text-dark-text-muted font-medium leading-relaxed">
                        To add new credentials to your archive, initiate a <span className="text-indigo-600 dark:text-indigo-400 font-black">DOCUMENT REQUEST</span> via the transmissions dashboard.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Request Modal */}
      <AnimatePresence>
        {showRequestModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRequestModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white dark:bg-dark-surface w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleSubmitRequest} className="p-10 space-y-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl text-indigo-600">
                      <Send size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black font-display italic text-slate-900 dark:text-white uppercase tracking-tight">Initiate Transaction</h2>
                      <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">{requestType.replace('_', ' ')} REQUEST</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setShowRequestModal(false)} className="p-2 hover:bg-slate-50 dark:hover:bg-dark-bg rounded-xl text-slate-400 transition-all">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  {requestType === 'LEAVE' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 italic">Start Transmission</label>
                        <input 
                          type="date" 
                          required
                          value={formData.startDate}
                          onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                          className="saas-input border-slate-200" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 italic">End Transmission</label>
                        <input 
                          type="date" 
                          required
                          value={formData.endDate}
                          onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                          className="saas-input border-slate-200" 
                        />
                      </div>
                    </div>
                  )}

                  {requestType === 'SALARY_SLIP' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 italic">Financial Period (Month/Year)</label>
                      <input 
                        type="month" 
                        required
                        value={formData.month}
                        onChange={(e) => setFormData({...formData, month: e.target.value})}
                        className="saas-input py-4 text-sm border-slate-200" 
                      />
                    </div>
                  )}

                  {requestType === 'DOCUMENT' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 italic">Document Architecture</label>
                      <select 
                        required
                        value={formData.documentType}
                        onChange={(e) => setFormData({...formData, documentType: e.target.value})}
                        className="saas-input py-4 text-sm font-bold uppercase tracking-widest border-slate-200"
                      >
                        <option value="">Select Document Type</option>
                        <option value="ID_CARD">Replacement ID Card</option>
                        <option value="EXPERIENCE_CERT">Experience Certificate</option>
                        <option value="ADDRESS_PROOF">Corporate Address Verification</option>
                        <option value="TAX_FORM">Annual Tax Statement</option>
                      </select>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 italic">Detailed Justification</label>
                    <textarea 
                      required
                      placeholder="Synthesize the requirements for this request..."
                      rows={5}
                      value={formData.reason}
                      onChange={(e) => setFormData({...formData, reason: e.target.value})}
                      className="saas-input py-5 text-sm leading-relaxed border-slate-200 placeholder:text-slate-400" 
                    />
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button 
                    type="button"
                    onClick={() => setShowRequestModal(false)}
                    className="flex-1 py-5 rounded-3xl font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-dark-bg transition-colors"
                  >
                    Abort
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] py-5 bg-indigo-600 text-white rounded-3xl font-black text-xs uppercase tracking-[0.3em] hover:bg-slate-950 shadow-xl shadow-indigo-500/20 transition-all active:scale-95"
                  >
                    Verify & Submit
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SelfServicePage;
