import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Building2, 
  CreditCard, 
  ShieldCheck, 
  Plus, 
  Settings, 
  CheckCircle2, 
  XCircle,
  TrendingUp,
  BarChart3,
  Search,
  Package,
  Tags,
  DollarSign,
  Calendar,
  Lock,
  Eye,
  Edit2,
  Trash2,
  MoreVertical,
  Clock,
  ShieldAlert,
  PlusCircle
} from 'lucide-react';
import { saasService } from '../services/saasService';
import NexvouraLoader from './NexvouraLoader';
import { Company, SaasPlan, Subscription, SaasPayment, DiscountCode, UserProfile, SystemSettings } from '../types';
import { format } from 'date-fns';
import { useAuth } from '../App';
import { toast } from 'sonner';
import { analyticsService, EventCategory } from '../services/analyticsService';

type Tab = 'overview' | 'companies' | 'plans' | 'discounts' | 'payments' | 'settings' | 'superadmins';

export const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  
  // Data state
  const [companies, setCompanies] = useState<Company[]>([]);
  const [plans, setPlans] = useState<SaasPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<SaasPayment[]>([]);
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Modals state
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SaasPlan | null>(null);
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<DiscountCode | null>(null);
  const [isSavingDiscount, setIsSavingDiscount] = useState(false);

  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [isSavingSub, setIsSavingSub] = useState(false);
  const [subForm, setSubForm] = useState({
    planId: '',
    status: 'active' as Subscription['status'],
    currentPeriodEnd: ''
  });

  // Search/Filter state
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [planForm, setPlanForm] = useState<Omit<SaasPlan, 'id'>>({
    name: '',
    price: 0,
    currency: 'USD',
    interval: 'monthly',
    features: [],
    limits: {
      maxUsers: 5,
      maxLeads: 100,
      maxStorage: 1024,
      hasIntelligence: false,
      hasBlogs: false
    },
    isActive: true,
    isPopular: false,
    isScalable: false,
    scalingMetric: 'users',
    scalingPrice: 0,
    upsellPlanId: '',
    downsellPlanId: ''
  });

  const [discountForm, setDiscountForm] = useState<Omit<DiscountCode, 'id'>>({
    code: '',
    discountType: 'percentage',
    value: 0,
    maxRedemptions: 0,
    redemptionCount: 0,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isActive: true
  });

  const [settingsForm, setSettingsForm] = useState<SystemSettings['paymentGateway']>({
    provider: 'none',
    stripePublicKey: '',
    stripeSecretKey: '',
    razorpayKeyId: '',
    razorpayKeySecret: '',
    cashfreeAppId: '',
    cashfreeSecretKey: '',
    phonepeMerchantId: '',
    phonepeSaltKey: '',
    phonepeSaltIndex: '',
    mode: 'test',
    enabled: false
  });

  const [taxRate, setTaxRate] = useState(0);
  const [taxInclusive, setTaxInclusive] = useState(false);

  const [featureInput, setFeatureInput] = useState('');

  const [superAdmins, setSuperAdmins] = useState<UserProfile[]>([]);
  const [companyUsers, setCompanyUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isProcessingUser, setIsProcessingUser] = useState<string | null>(null);

  const handleToggleSuperAdmin = async (targetUser: UserProfile) => {
    if (targetUser.uid === user?.uid) {
      toast.error('Cannot modify your own super clearance level');
      return;
    }
    
    setIsProcessingUser(targetUser.uid);
    try {
      const newStatus = !targetUser.isSuperAdmin;
      await saasService.setSuperAdminStatus(targetUser.uid, newStatus);
      toast.success(`Clearance ${newStatus ? 'elevated' : 'revoked'} for ${targetUser.name}`);
      // Refresh local data
      setCompanyUsers(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, isSuperAdmin: newStatus } : u));
      setAllUsers(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, isSuperAdmin: newStatus } : u));
      setSuperAdmins(prev => {
        if (newStatus) return [...prev, { ...targetUser, isSuperAdmin: true }];
        return prev.filter(u => u.uid !== targetUser.uid);
      });
    } catch (error) {
      toast.error('Failed to update clearance level');
    } finally {
      setIsProcessingUser(null);
    }
  };

  const handleDeleteUser = async (targetUser: UserProfile) => {
    if (targetUser.uid === user?.uid) {
      toast.error('Self-termination protocol restricted');
      return;
    }

    if (!window.confirm(`AVERTING: This will permanently purge ${targetUser.name} from the Nexvoura network. Proceed?`)) return;

    setIsProcessingUser(targetUser.uid);
    try {
      // Note: deleting a user should ideally remove their firestore doc and potentially auth (if using admin SDK)
      // Since we don't have Admin SDK, we'll just remove the Firestore doc. 
      // The user will still be able to log in but will have no profile.
      await saasService.deleteUser(targetUser.uid);
      toast.success(`Operative ${targetUser.name} purged from grid`);
      setCompanyUsers(prev => prev.filter(u => u.uid !== targetUser.uid));
      setAllUsers(prev => prev.filter(u => u.uid !== targetUser.uid));
      setSuperAdmins(prev => prev.filter(u => u.uid !== targetUser.uid));
    } catch (error) {
      toast.error('Purge sequence failed');
    } finally {
      setIsProcessingUser(null);
    }
  };

  const handleOpenPlanModal = (plan?: SaasPlan) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanForm({
        name: plan.name,
        price: plan.price,
        currency: plan.currency,
        interval: plan.interval,
        features: plan.features,
        limits: plan.limits,
        isActive: plan.isActive,
        isPopular: plan.isPopular || false,
        isScalable: plan.isScalable || false,
        scalingMetric: plan.scalingMetric || 'users',
        scalingPrice: plan.scalingPrice || 0,
        upsellPlanId: plan.upsellPlanId || '',
        downsellPlanId: plan.downsellPlanId || ''
      });
    } else {
      setEditingPlan(null);
      setPlanForm({
        name: '',
        price: 0,
        currency: 'USD',
        interval: 'monthly',
        features: [],
        limits: {
          maxUsers: 5,
          maxLeads: 100,
          maxStorage: 1024,
          hasIntelligence: false,
          hasBlogs: false
        },
        isActive: true,
        isPopular: false,
        isScalable: false,
        scalingMetric: 'users',
        scalingPrice: 0,
        upsellPlanId: '',
        downsellPlanId: ''
      });
    }
    setShowPlanModal(true);
  };

  const handleOpenDiscountModal = (discount?: DiscountCode) => {
    if (discount) {
      setEditingDiscount(discount);
      setDiscountForm({
        code: discount.code,
        discountType: discount.discountType,
        value: discount.value,
        maxRedemptions: discount.maxRedemptions || 0,
        redemptionCount: discount.redemptionCount || 0,
        expiresAt: discount.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isActive: discount.isActive
      });
    } else {
      setEditingDiscount(null);
      setDiscountForm({
        code: '',
        discountType: 'percentage',
        value: 0,
        maxRedemptions: 0,
        redemptionCount: 0,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isActive: true
      });
    }
    setShowDiscountModal(true);
  };

  const handleOpenSubModal = (company: Company, sub: Subscription | null) => {
    setSelectedCompany(company);
    setSelectedSub(sub);
    
    if (sub) {
      setSubForm({
        planId: sub.planId,
        status: sub.status,
        currentPeriodEnd: sub.currentPeriodEnd ? sub.currentPeriodEnd.split('T')[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    } else {
      // Default values for new subscription
      setSubForm({
        planId: plans[0]?.id || '',
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    }
    setShowSubscriptionModal(true);
  };

  const handleUpdateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    setIsSavingSub(true);
    try {
      // Use company.id as sub ID if sub doesn't exist, or sub.id if it does
      const subId = selectedSub?.id || selectedCompany.id;
      
      const subData: any = {
        ...subForm,
        companyId: selectedCompany.id,
        currentPeriodEnd: new Date(subForm.currentPeriodEnd).toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      if (!selectedSub) {
        subData.id = selectedCompany.id;
        subData.startDate = new Date().toISOString();
        subData.currentPeriodStart = new Date().toISOString();
        subData.cancelAtPeriodEnd = false;
      }

      await saasService.updateSubscription(subId, subData);
      toast.success('Subscription architecture updated.');
      setShowSubscriptionModal(false);
      loadAllData();
    } catch (error) {
      toast.error('Subscription update failed.');
    } finally {
      setIsSavingSub(false);
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPlan(true);
    try {
      if (editingPlan) {
        await saasService.updatePlan(editingPlan.id, planForm);
        toast.success('System configuration updated successfully.');
      } else {
        await saasService.createPlan(planForm);
        toast.success('New Global Tier initialized.');
      }
      setShowPlanModal(false);
      loadAllData();
    } catch (error) {
      toast.error('Strategic update failed.');
    } finally {
      setIsSavingPlan(false);
    }
  };

  const removeFeature = (index: number) => {
    setPlanForm(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const handleSaveDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDiscount(true);
    try {
      if (editingDiscount) {
        await saasService.updateDiscount(editingDiscount.id, discountForm);
        toast.success('Discount vector recalibrated.');
      } else {
        await saasService.createDiscount(discountForm);
        toast.success('New discount code deployed to portal.');
      }
      setShowDiscountModal(false);
      loadAllData();
    } catch (error) {
      toast.error('Discount initialization failed.');
    } finally {
      setIsSavingDiscount(false);
    }
  };

  const addFeature = () => {
    if (featureInput.trim()) {
      setPlanForm(prev => ({
        ...prev,
        features: [...prev.features, featureInput.trim()]
      }));
      setFeatureInput('');
    }
  };

  const handleImpersonate = (targetUser: UserProfile) => {
    localStorage.setItem('impersonating_uid', targetUser.uid);
    toast.success(`Switching to ${targetUser.name}'s perspective...`);
    // Reload to re-initialize the app with the impersonated profile
    setTimeout(() => window.location.reload(), 1000);
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await saasService.updateSystemSettings({
        paymentGateway: settingsForm,
        taxRate,
        taxInclusive
      });
      toast.success('System infrastructure updated');
      const sett = await saasService.getSystemSettings();
      setSystemSettings(sett);
    } catch (error) {
      console.error('Settings update failure:', error);
      toast.error('System failure during deployment');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const openUserManagement = async (company: Company) => {
    setSelectedCompany(company);
    setLoadingUsers(true);
    try {
      const users = await saasService.getCompanyUsers(company.id);
      setCompanyUsers(users);
    } catch (error) {
      toast.error('Failed to load company users');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [comps, pls, subs, pays, discs, users, admins, sett] = await Promise.all([
        saasService.getAllCompanies(),
        saasService.getPlans(),
        saasService.getAllSubscriptions(),
        saasService.getAllPayments(),
        saasService.getDiscounts(),
        saasService.getAllUsers(),
        saasService.getSuperAdmins(),
        saasService.getSystemSettings()
      ]);
      setCompanies(comps);
      setPlans(pls);
      setSubscriptions(subs);
      setPayments(pays);
      setDiscounts(discs);
      setAllUsers(users);
      setSuperAdmins(admins);
      setSystemSettings(sett);

      if (sett) {
        setSettingsForm(sett.paymentGateway);
        setTaxRate(sett.taxRate || 0);
        setTaxInclusive(sett.taxInclusive || false);
      }
    } catch (error) {
      console.error('Failed to load super admin data:', error);
      toast.error('Data sync failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    analyticsService.trackEvent({
      userId: user?.uid || 'anonymous',
      eventName: 'superadmin_tab_switch',
      category: EventCategory.NAVIGATION,
      metadata: { tab }
    });
  };

  useEffect(() => {
    if (searchTerm.length > 2) {
      const timeout = setTimeout(() => {
        analyticsService.trackEvent({
          userId: user?.uid || 'anonymous',
          eventName: 'superadmin_search',
          category: EventCategory.INTERACTION,
          metadata: { term: searchTerm, tab: activeTab }
        });
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [searchTerm, activeTab]);

  if (!user?.isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-8 bg-white dark:bg-dark-surface rounded-2xl shadow-xl max-w-md">
          <Lock className="mx-auto text-rose-500 mb-4" size={48} />
          <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white mb-2">Restricted Access</h2>
          <p className="text-slate-500 dark:text-dark-text-muted">This high-level command center requires terminal-level clearance.</p>
        </div>
      </div>
    );
  }

  const stats = {
    mrr: payments
      .filter(p => p.status === 'succeeded' && p.billingReason === 'subscription_cycle')
      .reduce((acc, p) => acc + p.amount, 0),
    totalCompanies: companies.length,
    activeSubs: subscriptions.filter(s => s.status === 'active').length,
    growth: 12.5 // Mock growth
  };

  const handleExtendTrial = async (companyId: string) => {
    if (!window.confirm('Extend trial by 7 days?')) return;
    try {
      await saasService.extendTrial(companyId, 7);
      toast.success('Trial extended by 7 days.');
      loadAllData();
    } catch (error) {
      toast.error('Failed to extend trial.');
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white flex items-center gap-3">
            <ShieldCheck className="text-brand-primary" size={32} />
            Nexvoura Core <span className="hidden sm:inline text-slate-400 font-light px-2 py-1 rounded bg-slate-100 dark:bg-dark-bg text-sm uppercase tracking-widest not-italic">Super Admin</span>
          </h1>
          <p className="text-slate-500 dark:text-dark-text-muted mt-2 font-medium text-sm sm:text-base">Global SaaS orchestration and management system.</p>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3 bg-white dark:bg-dark-surface p-1 rounded-2xl border border-slate-200 dark:border-dark-border overflow-x-auto no-scrollbar">
          {(['overview', 'companies', 'plans', 'discounts', 'payments', 'settings', 'superadmins'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                activeTab === tab 
                ? 'bg-slate-900 text-white dark:bg-brand-primary dark:text-white shadow-lg' 
                : 'text-slate-400 hover:text-slate-600 dark:text-dark-text-muted dark:hover:text-white'
              }`}
            >
              {tab === 'superadmins' ? 'Super Admins' : tab}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center p-20"
          >
            <NexvouraLoader label="Syncing Global Data Grid" />
          </motion.div>
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            {activeTab === 'overview' && (
              <OverviewSection stats={stats} payments={payments} />
            )}
            {activeTab === 'companies' && (
              <CompaniesSection 
                companies={companies} 
                subscriptions={subscriptions} 
                plans={plans}
                users={allUsers}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                onManageUsers={openUserManagement}
                onEditSubscription={handleOpenSubModal}
                onExtendTrial={handleExtendTrial}
              />
            )}
            {activeTab === 'plans' && (
              <PlansSection 
                plans={plans} 
                onEdit={handleOpenPlanModal}
                onCreate={() => handleOpenPlanModal()}
              />
            )}
            {activeTab === 'discounts' && (
              <DiscountsSection 
                discounts={discounts} 
                onEdit={handleOpenDiscountModal}
                onCreate={() => handleOpenDiscountModal()}
              />
            )}
            {activeTab === 'payments' && (
              <PaymentsSection payments={payments} companies={companies} />
            )}
            {activeTab === 'settings' && (
              <SettingsSection 
                form={settingsForm} 
                onChange={(data) => setSettingsForm(prev => ({ ...prev, ...data }))}
                onSave={handleSaveSettings}
                isSaving={isSavingSettings}
                taxRate={taxRate}
                onTaxRateChange={setTaxRate}
                taxInclusive={taxInclusive}
                onTaxInclusiveChange={setTaxInclusive}
              />
            )}
            {activeTab === 'superadmins' && (
              <SuperAdminsSection 
                admins={superAdmins} 
                allUsers={allUsers}
                onToggleStatus={handleToggleSuperAdmin}
                onDelete={handleDeleteUser}
                isProcessing={isProcessingUser}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedCompany && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCompany(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-dark-surface rounded-[24px] sm:rounded-[32px] border border-slate-200 dark:border-dark-border shadow-2xl flex flex-col max-h-[calc(100vh-4rem)] my-auto overflow-hidden"
            >
              <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-dark-border flex items-center justify-between flex-shrink-0">
                <div>
                  <h3 className="text-lg sm:text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">User Infrastructure</h3>
                  <p className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-dark-text-muted mt-1 uppercase tracking-widest">{selectedCompany.name}</p>
                </div>
                <button 
                  onClick={() => setSelectedCompany(null)}
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all rounded-xl"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <div className="p-6 sm:p-8 overflow-y-auto flex-1 custom-scrollbar">
                {loadingUsers ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <NexvouraLoader label="Fetching Personnel Records" size="sm" />
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {companyUsers.map((u) => (
                      <div key={u.uid} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 dark:bg-dark-bg/50 rounded-2xl border border-slate-100 dark:border-dark-border group hover:border-brand-primary/30 transition-all gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white dark:bg-dark-surface flex items-center justify-center text-lg font-black text-slate-400 border border-slate-200 dark:border-dark-border overflow-hidden flex-shrink-0 relative">
                            {u.isSuperAdmin && (
                              <div className="absolute top-0 right-0 w-3 h-3 bg-brand-primary border-2 border-white rounded-full z-10" />
                            )}
                            {u.photoURL ? (
                              <img src={u.photoURL} alt={u.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              u.name[0]
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm sm:text-base">
                              {u.name}
                              <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 text-[8px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-500/20">
                                {u.role}
                              </span>
                            </p>
                            <p className="text-[10px] text-slate-400 italic mt-0.5 line-clamp-1">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <button
                            onClick={() => handleToggleSuperAdmin(u)}
                            disabled={isProcessingUser === u.uid}
                            className={`flex-1 sm:flex-none px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${
                              u.isSuperAdmin 
                                ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20' 
                                : 'bg-brand-primary/10 text-brand-primary border-brand-primary/20 hover:bg-brand-primary/20'
                            }`}
                          >
                            {u.isSuperAdmin ? <Lock size={12} /> : <ShieldCheck size={12} />}
                            {u.isSuperAdmin ? 'Revoke Super' : 'Grant Super'}
                          </button>
                          <button
                            onClick={() => handleImpersonate(u)}
                            className="flex-1 sm:flex-none px-3 py-2 bg-slate-900 dark:bg-dark-surface text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2"
                          >
                            <Eye size={12} />
                            Impersonate
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={isProcessingUser === u.uid}
                            className="p-2 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all border border-rose-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {companyUsers.length === 0 && (
                      <div className="text-center py-12 text-slate-400">
                        <Users size={48} className="mx-auto opacity-10 mb-4" />
                        <p className="text-sm font-bold uppercase tracking-widest">No operatives found</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="p-6 bg-slate-50 dark:bg-dark-bg/30 border-t border-slate-100 dark:border-dark-border text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Authorized Super Admin Command Only</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSubscriptionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSavingSub && setShowSubscriptionModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-dark-surface rounded-[24px] sm:rounded-[32px] border border-slate-200 dark:border-dark-border shadow-2xl flex flex-col max-h-[calc(100vh-4rem)] my-auto overflow-hidden"
            >
              <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-dark-border flex items-center justify-between flex-shrink-0">
                <div>
                  <h3 className="text-lg sm:text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">
                    Modulate Subscription
                  </h3>
                  <p className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-dark-text-muted mt-1 uppercase tracking-widest">
                    Manual override for {selectedCompany?.name}
                  </p>
                </div>
                <button 
                  onClick={() => !isSavingSub && setShowSubscriptionModal(false)}
                  className="p-2 text-slate-400 hover:text-rose-500 transition-all"
                  disabled={isSavingSub}
                >
                  <XCircle size={24} />
                </button>
              </div>

              <form onSubmit={handleUpdateSubscription} className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Plan Alignment</label>
                    <select
                      value={subForm.planId}
                      onChange={(e) => setSubForm({...subForm, planId: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-bold text-sm"
                    >
                      {plans.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (${p.price}/{p.interval})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Status Vector</label>
                    <select
                      value={subForm.status}
                      onChange={(e) => setSubForm({...subForm, status: e.target.value as any})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-bold text-sm"
                    >
                      <option value="active">Active</option>
                      <option value="past_due">Past Due</option>
                      <option value="canceled">Canceled</option>
                      <option value="trialing">Trialing</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Grid Expiration</label>
                    <input 
                      type="date"
                      value={subForm.currentPeriodEnd}
                      onChange={(e) => setSubForm({...subForm, currentPeriodEnd: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-bold text-sm"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isSavingSub}
                  className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase tracking-widest text-[9px] rounded-2xl shadow-xl shadow-slate-900/10 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSavingSub ? 'Reconfiguring Matrix...' : 'Commit Subscription Override'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDiscountModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSavingDiscount && setShowDiscountModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-dark-surface rounded-[24px] sm:rounded-[32px] border border-slate-200 dark:border-dark-border shadow-2xl flex flex-col max-h-[calc(100vh-4rem)] my-auto overflow-hidden"
            >
              <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-dark-border flex items-center justify-between flex-shrink-0">
                <div>
                  <h3 className="text-lg sm:text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">
                    {editingDiscount ? 'Calibrate Discount Logic' : 'Synthesize Discount Code'}
                  </h3>
                  <p className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-dark-text-muted mt-1 uppercase tracking-widest">
                    Define promotional parameters for the platform
                  </p>
                </div>
                <button 
                  onClick={() => !isSavingDiscount && setShowDiscountModal(false)}
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all rounded-xl"
                  disabled={isSavingDiscount}
                >
                  <XCircle size={24} />
                </button>
              </div>

              <form onSubmit={handleSaveDiscount} className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Promotional Code</label>
                    <input 
                      type="text"
                      required
                      value={discountForm.code}
                      onChange={(e) => setDiscountForm({...discountForm, code: e.target.value.toUpperCase()})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-black text-sm tracking-widest"
                      placeholder="e.g. ALPHA2026"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Vector Type</label>
                      <select
                        value={discountForm.discountType}
                        onChange={(e) => setDiscountForm({...discountForm, discountType: e.target.value as 'percentage' | 'fixed'})}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-bold text-sm h-[46px]"
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount ($)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Intensity Value</label>
                      <input 
                        type="number"
                        required
                        value={discountForm.value}
                        onChange={(e) => setDiscountForm({...discountForm, value: parseFloat(e.target.value) || 0})}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-bold text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Impact Limit (Redemptions)</label>
                      <input 
                        type="number"
                        required
                        value={discountForm.maxRedemptions}
                        onChange={(e) => setDiscountForm({...discountForm, maxRedemptions: parseInt(e.target.value) || 0})}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-bold text-sm"
                        placeholder="0 for unlimited"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Expiration Grid</label>
                      <input 
                        type="date"
                        value={discountForm.expiresAt}
                        onChange={(e) => setDiscountForm({...discountForm, expiresAt: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-bold text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 py-2">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-10 h-5 rounded-full transition-all relative ${discountForm.isActive ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-dark-bg'}`}>
                         <input 
                          type="checkbox"
                          className="hidden"
                          checked={discountForm.isActive}
                          onChange={(e) => setDiscountForm({...discountForm, isActive: e.target.checked})}
                        />
                        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${discountForm.isActive ? 'left-6' : 'left-1'}`} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-dark-text-muted">Active Pulse</span>
                    </label>
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    disabled={isSavingDiscount}
                    className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase tracking-widest text-[9px] rounded-2xl shadow-xl shadow-slate-900/10 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isSavingDiscount ? 'Synchronizing Discount Matrix...' : editingDiscount ? 'Confirm Recalibration' : 'Initialize Promotional Vector'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPlanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSavingPlan && setShowPlanModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-white dark:bg-dark-surface rounded-[24px] sm:rounded-[32px] border border-slate-200 dark:border-dark-border shadow-2xl flex flex-col max-h-[calc(100vh-4rem)] my-auto overflow-hidden"
            >
              <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-dark-border flex items-center justify-between flex-shrink-0">
                <div>
                  <h3 className="text-lg sm:text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">
                    {editingPlan ? 'Refine Tier Architecture' : 'Design New Global Plan'}
                  </h3>
                  <p className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-dark-text-muted mt-1 uppercase tracking-widest">
                    Configure pricing and resource limits for the ecosystem
                  </p>
                </div>
                <button 
                  onClick={() => !isSavingPlan && setShowPlanModal(false)}
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all rounded-xl"
                  disabled={isSavingPlan}
                >
                  <XCircle size={24} />
                </button>
              </div>

              <form onSubmit={handleSavePlan} className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tier Name</label>
                    <input 
                      type="text"
                      required
                      value={planForm.name}
                      onChange={(e) => setPlanForm({...planForm, name: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-bold text-sm"
                      placeholder="e.g. Enterprise Pulse"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Plan Cost</label>
                    <div className="flex flex-row gap-2">
                      <select
                        value={planForm.currency}
                        onChange={(e) => setPlanForm({...planForm, currency: e.target.value})}
                        className="w-[100px] px-3 py-3 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-bold text-sm"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="INR">INR (₹)</option>
                        <option value="JPY">JPY (¥)</option>
                      </select>
                      <div className="relative flex-1">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                          type="number"
                          required
                          value={planForm.price}
                          onChange={(e) => setPlanForm({...planForm, price: parseFloat(e.target.value) || 0})}
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-bold text-sm"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Max Operatives</label>
                    <input 
                      type="number"
                      required
                      value={planForm.limits.maxUsers}
                      onChange={(e) => setPlanForm({
                        ...planForm, 
                        limits: {...planForm.limits, maxUsers: parseInt(e.target.value) || 0}
                      })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-bold text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Lead Capacity</label>
                    <input 
                      type="number"
                      required
                      value={planForm.limits.maxLeads}
                      onChange={(e) => setPlanForm({
                        ...planForm, 
                        limits: {...planForm.limits, maxLeads: parseInt(e.target.value) || 0}
                      })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-bold text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Cloud Storage (MB)</label>
                    <input 
                      type="number"
                      required
                      value={planForm.limits.maxStorage}
                      onChange={(e) => setPlanForm({
                        ...planForm, 
                        limits: {...planForm.limits, maxStorage: parseInt(e.target.value) || 0}
                      })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-bold text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-10 h-5 rounded-full transition-all relative ${planForm.limits.hasIntelligence ? 'bg-brand-primary' : 'bg-slate-200 dark:bg-dark-bg'}`}>
                       <input 
                        type="checkbox"
                        className="hidden"
                        checked={planForm.limits.hasIntelligence}
                        onChange={(e) => setPlanForm({
                          ...planForm,
                          limits: {...planForm.limits, hasIntelligence: e.target.checked}
                        })}
                      />
                      <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${planForm.limits.hasIntelligence ? 'left-6' : 'left-1'}`} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-dark-text-muted">AI Intelligence</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-10 h-5 rounded-full transition-all relative ${planForm.limits.hasBlogs ? 'bg-brand-primary' : 'bg-slate-200 dark:bg-dark-bg'}`}>
                       <input 
                        type="checkbox"
                        className="hidden"
                        checked={planForm.limits.hasBlogs}
                        onChange={(e) => setPlanForm({
                          ...planForm,
                          limits: {...planForm.limits, hasBlogs: e.target.checked}
                        })}
                      />
                      <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${planForm.limits.hasBlogs ? 'left-6' : 'left-1'}`} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-dark-text-muted">Global Blogs</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-10 h-5 rounded-full transition-all relative ${planForm.isPopular ? 'bg-amber-500' : 'bg-slate-200 dark:bg-dark-bg'}`}>
                       <input 
                        type="checkbox"
                        className="hidden"
                        checked={planForm.isPopular}
                        onChange={(e) => setPlanForm({...planForm, isPopular: e.target.checked})}
                      />
                      <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${planForm.isPopular ? 'left-6' : 'left-1'}`} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Popular Badge</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-10 h-5 rounded-full transition-all relative ${planForm.isScalable ? 'bg-brand-primary' : 'bg-slate-200 dark:bg-dark-bg'}`}>
                       <input 
                        type="checkbox"
                        className="hidden"
                        checked={planForm.isScalable}
                        onChange={(e) => setPlanForm({...planForm, isScalable: e.target.checked})}
                      />
                      <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${planForm.isScalable ? 'left-6' : 'left-1'}`} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Scalable Plan</span>
                  </label>
                </div>
                
                <AnimatePresence>
                  {planForm.isScalable && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-dark-bg p-4 rounded-2xl border border-slate-200 dark:border-dark-border"
                    >
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Scaling Metric</label>
                        <select
                          value={planForm.scalingMetric}
                          onChange={(e) => setPlanForm({...planForm, scalingMetric: e.target.value as any})}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-bold text-sm"
                        >
                          <option value="users">Per Extra User</option>
                          <option value="storage">Per Extra GB Storage</option>
                          <option value="leads">Per 100 Extra Leads</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Scaling Price ({planForm.currency})</label>
                        <div className="relative">
                          <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input 
                            type="number"
                            required
                            value={planForm.scalingPrice}
                            onChange={(e) => setPlanForm({...planForm, scalingPrice: parseFloat(e.target.value) || 0})}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-bold text-sm"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Upsell Opportunity</label>
                    <select
                      value={planForm.upsellPlanId}
                      onChange={(e) => setPlanForm({...planForm, upsellPlanId: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-bold text-sm h-[46px]"
                    >
                      <option value="">No Upsell Path</option>
                      {plans.filter(p => (editingPlan ? p.id !== editingPlan.id : true)).map(p => (
                        <option key={p.id} value={p.id}>{p.name} (${p.price})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Downsell Safety Net</label>
                    <select
                      value={planForm.downsellPlanId}
                      onChange={(e) => setPlanForm({...planForm, downsellPlanId: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-bold text-sm h-[46px]"
                    >
                      <option value="">No Downsell Path</option>
                      {plans.filter(p => (editingPlan ? p.id !== editingPlan.id : true)).map(p => (
                        <option key={p.id} value={p.id}>{p.name} (${p.price})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Included Attributes</label>
                   <div className="flex gap-2">
                     <input 
                        type="text"
                        value={featureInput}
                        onChange={(e) => setFeatureInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                        className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-bold text-sm"
                        placeholder="e.g. 24/7 Priority Support"
                      />
                      <button 
                        type="button"
                        onClick={addFeature}
                        className="p-3 bg-brand-primary text-white rounded-xl hover:scale-105 active:scale-95 transition-all"
                      >
                        <Plus size={20} />
                      </button>
                   </div>
                   <div className="flex flex-wrap gap-2 min-h-[40px] p-4 bg-slate-50 dark:bg-dark-bg rounded-2xl border border-slate-200 dark:border-dark-border">
                     {planForm.features.map((feature, idx) => (
                       <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-lg group hover:border-brand-primary/50 transition-all">
                         <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-dark-text-muted">{feature}</span>
                         <button 
                          type="button" 
                          onClick={() => removeFeature(idx)} 
                          className="opacity-0 group-hover:opacity-100 text-rose-500 hover:scale-110 transition-all"
                         >
                           <XCircle size={12} />
                         </button>
                       </div>
                     ))}
                     {planForm.features.length === 0 && (
                       <p className="text-[9px] font-bold text-slate-400 italic">No features defined...</p>
                     )}
                   </div>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    disabled={isSavingPlan}
                    className="w-full py-4 bg-brand-primary text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isSavingPlan ? 'Synchronizing Data Grid...' : editingPlan ? 'Confirm Architecture Update' : 'Initialize Plan Identity'}
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

const OverviewSection = ({ stats, payments }: { stats: any, payments: SaasPayment[] }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
    <div className="bg-white dark:bg-dark-surface p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-dark-border shadow-xl relative overflow-hidden group">
      <div className="relative z-10">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Monthly Recurring Revenue</p>
        <h3 className="text-3xl sm:text-4xl font-black italic tracking-tighter text-slate-900 dark:text-white font-display">
          ${stats.mrr.toLocaleString()}
        </h3>
        <div className="flex items-center gap-2 mt-4 text-emerald-500 font-bold text-xs">
          <TrendingUp size={14} />
          <span>+{stats.growth}% Growth</span>
        </div>
      </div>
      <DollarSign className="absolute -right-4 -bottom-4 text-slate-100 dark:text-dark-bg group-hover:scale-110 transition-transform opacity-50 sm:opacity-100" size={100} />
    </div>

    <div className="bg-white dark:bg-dark-surface p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-dark-border shadow-xl relative overflow-hidden group">
      <div className="relative z-10">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Companies</p>
        <h3 className="text-3xl sm:text-4xl font-black italic tracking-tighter text-slate-900 dark:text-white font-display">
          {stats.totalCompanies}
        </h3>
        <p className="text-xs text-slate-500 mt-4 font-medium italic underline">View global landscape</p>
      </div>
      <Building2 className="absolute -right-4 -bottom-4 text-slate-100 dark:text-dark-bg group-hover:scale-110 transition-transform opacity-50 sm:opacity-100" size={100} />
    </div>

    <div className="bg-white dark:bg-dark-surface p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-dark-border shadow-xl relative overflow-hidden group">
      <div className="relative z-10">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Active Subscriptions</p>
        <h3 className="text-3xl sm:text-4xl font-black italic tracking-tighter text-slate-900 dark:text-white font-display">
          {stats.activeSubs}
        </h3>
        <p className="text-xs text-slate-500 mt-4 font-medium">{((stats.activeSubs / (stats.totalCompanies || 1)) * 100).toFixed(1)}% Conversion Rate</p>
      </div>
      <CheckCircle2 className="absolute -right-4 -bottom-4 text-slate-100 dark:text-dark-bg group-hover:scale-110 transition-transform opacity-50 sm:opacity-100" size={100} />
    </div>

    <div className="bg-white dark:bg-dark-surface p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-dark-border shadow-xl relative overflow-hidden group">
      <div className="relative z-10">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Platform Health</p>
        <h3 className="text-3xl sm:text-4xl font-black italic tracking-tighter text-emerald-500 font-display uppercase">
          Stable
        </h3>
        <p className="text-xs text-slate-500 mt-4 font-medium italic underline underline-offset-4">Check server clusters</p>
      </div>
      <ShieldCheck className="absolute -right-4 -bottom-4 text-slate-100 dark:text-dark-bg group-hover:scale-110 transition-transform opacity-50 sm:opacity-100" size={100} />
    </div>
  </div>
);

const CompaniesSection = ({ companies, subscriptions, plans, users, searchTerm, setSearchTerm, onManageUsers, onEditSubscription, onExtendTrial }: any) => {
  const filtered = companies.filter((c: Company) => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-dark-surface rounded-3xl border border-slate-200 dark:border-dark-border shadow-2xl overflow-hidden">
      <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-dark-border flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <h2 className="text-xl sm:text-2xl font-black uppercase italic tracking-tighter">Global Ecosystem</h2>
        <div className="relative w-full lg:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={18} />
          <input 
            type="text"
            placeholder="Search organizations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-medium text-sm"
          />
        </div>
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-dark-bg/50 border-b border-slate-200 dark:border-dark-border">
              <th className="px-6 sm:px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Company Identity</th>
              <th className="px-6 sm:px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Personnel</th>
              <th className="px-6 sm:px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Plan Status</th>
              <th className="px-6 sm:px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Financials</th>
              <th className="px-6 sm:px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Infrastructure</th>
              <th className="px-6 sm:px-8 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-dark-border">
            {filtered.map((company: Company) => {
              const sub = subscriptions.find((s: any) => s.companyId === company.id);
              const plan = plans.find((p: any) => p.id === sub?.planId);
              const companyEmployees = users.filter((u: any) => u.companyId === company.id);
              
              return (
                <tr key={company.id} className="hover:bg-slate-50 dark:hover:bg-dark-bg/30 transition-colors group">
                  <td className="px-6 sm:px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-display font-black text-lg sm:text-xl">
                        {company.name[0]}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">{company.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[9px] sm:text-[10px] text-slate-400 dark:text-dark-text-muted uppercase tracking-widest">ID: {company.id.slice(0, 8)}</p>
                          {company.trialEndsAt && !sub && (
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                              new Date(company.trialEndsAt) < new Date() 
                              ? 'bg-rose-50 text-rose-500 border border-rose-100' 
                              : 'bg-indigo-50 text-indigo-500 border border-indigo-100'
                            }`}>
                              {new Date(company.trialEndsAt) < new Date() ? 'Trial Expired' : 'Trialing'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 sm:px-8 py-6">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-brand-primary" />
                        <span className="font-display font-black text-slate-900 dark:text-white text-lg">
                          {companyEmployees.length}
                        </span>
                      </div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Personnel</p>
                    </div>
                  </td>
                  <td className="px-6 sm:px-8 py-6">
                    {sub ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 border border-emerald-100 dark:border-emerald-500/20">
                            {plan?.name || 'Custom Plan'}
                          </span>
                          {plan?.isScalable && (
                            <span className="p-1 rounded-md bg-amber-50 dark:bg-amber-500/10 text-amber-500" title="Scalable Architecture">
                              <TrendingUp size={10} />
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 italic tracking-tight">
                          {sub.status} • {plan?.interval}
                        </p>
                        <p className="text-[9px] text-slate-400 tracking-tight">Ends: {format(new Date(sub.currentPeriodEnd), 'MMM d, yyyy')}</p>
                      </div>
                    ) : (
                      <span className="inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-rose-50 dark:bg-rose-500/10 text-rose-500 border border-rose-100 dark:border-rose-500/20">
                        No Subscription
                      </span>
                    )}
                  </td>
                  <td className="px-6 sm:px-8 py-6">
                    <p className="font-display font-black text-slate-900 dark:text-white">
                      {plan ? `$${plan.price}/mo` : 'N/A'}
                    </p>
                  </td>
                  <td className="px-6 sm:px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-xl border ${company.logoUrl ? 'border-indigo-100 dark:border-indigo-500/20 text-indigo-500' : 'border-slate-100 dark:border-dark-border text-slate-300'}`}>
                        <Eye size={14} />
                      </div>
                      <div className="p-2 rounded-xl border border-slate-100 dark:border-dark-border text-slate-300">
                        <Calendar size={14} />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 sm:px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                       {company.trialEndsAt && !sub && (
                         <button 
                          onClick={() => onExtendTrial(company.id)}
                          className="p-2 sm:p-3 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-2xl transition-all text-slate-400 hover:text-emerald-500"
                          title="Extend Trial"
                        >
                          <Clock size={18} />
                        </button>
                       )}
                       <button 
                        onClick={() => onEditSubscription(company, sub)}
                        className="p-2 sm:p-3 hover:bg-brand-primary/10 rounded-2xl transition-all text-slate-400 hover:text-brand-primary"
                        title="Override Subscription"
                      >
                        <ShieldCheck size={18} />
                      </button>
                      <button 
                        onClick={() => onManageUsers(company)}
                        className="p-2 sm:p-3 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-2xl transition-all text-slate-400 hover:text-brand-primary"
                        title="Manage Users & Impersonate"
                      >
                        <Users size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const PlansSection = ({ plans, onEdit, onCreate }: { plans: SaasPlan[], onEdit: (p: SaasPlan) => void, onCreate: () => void }) => {
  const findPlanName = (id?: string) => plans.find(p => p.id === id)?.name || 'N/A';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
      {plans.map(plan => (
        <div 
          key={plan.id}
          className={`bg-white dark:bg-dark-surface p-8 sm:p-10 rounded-3xl border shadow-xl relative overflow-hidden transition-all hover:-translate-y-2 ${
            plan.isPopular ? 'border-brand-primary ring-4 ring-brand-primary/10' : 'border-slate-200 dark:border-dark-border'
          }`}
        >
          <div className="absolute top-6 right-6 flex flex-col gap-2 items-end">
            {plan.isPopular && (
              <div className="px-3 py-1 bg-brand-primary text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg">
                Recommended
              </div>
            )}
            {plan.isScalable && (
              <div className="px-3 py-1 bg-indigo-500 text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg">
                Scalable
              </div>
            )}
          </div>

          <div className="mb-8">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
              {plan.interval} 
              {plan.isScalable && (
                <span className="ml-2 text-indigo-500">
                  (+ {plan.currency === 'EUR' ? '€' : plan.currency === 'GBP' ? '£' : plan.currency === 'INR' ? '₹' : plan.currency === 'JPY' ? '¥' : '$'}
                  {plan.scalingPrice} / {plan.scalingMetric})
                </span>
              )}
            </p>
            <h3 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white mb-2">{plan.name}</h3>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-black italic tracking-tighter text-brand-primary font-display">
                {plan.currency === 'EUR' ? '€' : plan.currency === 'GBP' ? '£' : plan.currency === 'INR' ? '₹' : plan.currency === 'JPY' ? '¥' : '$'}
                {plan.price}
              </span>
              <span className="text-xs font-bold text-slate-400 lowercase">/{plan.interval.replace('ly', '')}</span>
            </div>
          </div>

          <ul className="space-y-4 mb-8">
            {plan.features.map((feature, idx) => (
              <li key={idx} className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-dark-text-muted">
                <div className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <CheckCircle2 size={12} />
                </div>
                {feature}
              </li>
            ))}
            <li className="flex items-center gap-3 text-xs font-bold text-slate-600 dark:text-dark-text-muted">
              <Package size={14} className="text-brand-secondary" />
              Max {plan.limits.maxUsers} Users
            </li>
          </ul>

          <div className="space-y-3 mb-8 pt-6 border-t border-slate-100 dark:border-dark-border">
            <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-slate-400">
              <span className="flex items-center gap-1"><TrendingUp size={10} /> Upsell Path</span>
              <span className="text-brand-primary italic">{findPlanName(plan.upsellPlanId)}</span>
            </div>
            <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-slate-400">
              <span className="flex items-center gap-1 font-black opacity-50"><XCircle size={10} /> Downsell Path</span>
              <span className="text-rose-500 italic">{findPlanName(plan.downsellPlanId)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <button 
              onClick={() => onEdit(plan)}
              className="flex-1 py-3 sm:py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase tracking-widest text-[9px] rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
            <Edit2 size={12} />
            Edit
          </button>
          <button className="flex-1 py-3 sm:py-4 bg-rose-50 dark:bg-rose-500/10 text-rose-500 font-black uppercase tracking-widest text-[9px] rounded-2xl hover:bg-rose-100 transition-all flex items-center justify-center gap-2">
            <Trash2 size={12} />
            Archive
          </button>
        </div>
      </div>
    ))}

    <button 
      onClick={onCreate}
      className="group bg-slate-50 dark:bg-dark-bg/30 border-2 border-dashed border-slate-200 dark:border-dark-border rounded-3xl p-8 sm:p-10 flex flex-col items-center justify-center gap-4 transition-all hover:bg-white dark:hover:bg-dark-surface hover:border-brand-primary min-h-[300px]"
    >
      <div className="p-4 rounded-2xl bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border text-slate-400 group-hover:bg-brand-primary group-hover:text-white group-hover:border-transparent transition-all shadow-xl">
        <Plus size={32} />
      </div>
      <div className="text-center">
        <p className="text-sm font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">Design New Plan</p>
        <p className="text-[10px] font-bold text-slate-400 dark:text-dark-text-muted mt-1">Configure global pricing tier</p>
      </div>
    </button>
  </div>
  );
};

const DiscountsSection = ({ discounts, onEdit, onCreate }: { discounts: DiscountCode[], onEdit: (d: DiscountCode) => void, onCreate: () => void }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-black uppercase italic tracking-tighter">Promotional Arsenal</h2>
      <button 
        onClick={onCreate}
        className="px-8 py-4 bg-brand-primary text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-brand-primary/20 flex items-center gap-2"
      >
        <Tags size={18} />
        Initialize Pulse Code
      </button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {discounts.map(disc => (
        <div key={disc.id} className="bg-white dark:bg-dark-surface p-8 rounded-3xl border border-slate-200 dark:border-dark-border flex flex-col shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Code Pattern</p>
              <h3 className="text-2xl font-black italic tracking-tighter text-slate-900 dark:text-white font-display mb-1">{disc.code}</h3>
              <p className="text-xs font-bold text-emerald-500">
                {disc.discountType === 'percentage' ? `${disc.value}% OFF` : `$${disc.value} FLAT OFF`}
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${disc.isActive ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
              {disc.isActive ? 'Ready' : 'Offline'}
            </div>
          </div>
          
          <div className="space-y-4 mb-8">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Impact Radius</p>
              <p className="text-sm font-black italic text-slate-900 dark:text-white">
                {disc.redemptionCount}<span className="text-xs text-slate-400 not-italic font-medium">/{disc.maxRedemptions || '∞'}</span>
              </p>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100 dark:bg-dark-bg overflow-hidden w-full">
              <div 
                className="h-full bg-brand-primary transition-all duration-500 shadow-[0_0_8px_rgba(var(--brand-primary-rgb),0.5)]" 
                style={{ width: disc.maxRedemptions && disc.maxRedemptions > 0 ? `${Math.min(((disc.redemptionCount || 0) / disc.maxRedemptions) * 100, 100)}%` : '0%' }} 
              />
            </div>
          </div>

          <button 
            onClick={() => onEdit(disc)}
            className="w-full py-4 bg-slate-50 dark:bg-dark-bg hover:bg-slate-100 dark:hover:bg-dark-border text-slate-900 dark:text-white font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all border border-slate-100 dark:border-dark-border"
          >
            Refine Vector
          </button>
        </div>
      ))}
    </div>
  </div>
);

const PaymentsSection = ({ payments, companies }: { payments: SaasPayment[], companies: Company[] }) => (
  <div className="bg-white dark:bg-dark-surface rounded-3xl border border-slate-200 dark:border-dark-border shadow-2xl overflow-hidden">
    <div className="p-8 border-b border-slate-100 dark:border-dark-border">
       <h2 className="text-2xl font-black uppercase italic tracking-tighter">Transaction Audit Trail</h2>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50 dark:bg-dark-bg/50 border-b border-slate-200 dark:border-dark-border">
            <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Financial Flow</th>
            <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Origin</th>
            <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Intent</th>
            <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Terminal Status</th>
            <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Timestamp</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-dark-border">
          {payments.map(payment => {
            const company = companies.find(c => c.id === payment.companyId);
            return (
              <tr key={payment.id} className="hover:bg-slate-50 dark:hover:bg-dark-bg/30 transition-colors">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500">
                      <DollarSign size={18} />
                    </div>
                    <span className="font-display font-black text-slate-900 dark:text-white italic tracking-tighter text-xl">
                      +${payment.amount.toLocaleString()}
                    </span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{company?.name || 'Unknown Entity'}</p>
                </td>
                <td className="px-8 py-6">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {payment.billingReason.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2">
                    {payment.status === 'succeeded' ? (
                      <CheckCircle2 className="text-emerald-500" size={16} />
                    ) : (
                      <XCircle className="text-rose-500" size={16} />
                    )}
                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                      payment.status === 'succeeded' ? 'text-emerald-500' : 'text-rose-500'
                    }`}>
                      {payment.status}
                    </span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                    {format(new Date(payment.createdAt), 'yyyy.MM.dd / HH:mm')}
                  </p>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

const SettingsSection = ({ 
  form, 
  onChange, 
  onSave, 
  isSaving,
  taxRate,
  onTaxRateChange,
  taxInclusive,
  onTaxInclusiveChange
}: { 
  form: SystemSettings['paymentGateway'], 
  onChange: (data: Partial<SystemSettings['paymentGateway']>) => void, 
  onSave: () => void,
  isSaving: boolean,
  taxRate: number,
  onTaxRateChange: (rate: number) => void,
  taxInclusive: boolean,
  onTaxInclusiveChange: (val: boolean) => void
}) => {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black uppercase italic tracking-tighter">Global System Infrastructure</h2>
        <button 
          onClick={onSave}
          disabled={isSaving}
          className="px-8 py-4 bg-brand-primary text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-brand-primary/20 flex items-center gap-2 disabled:opacity-50"
        >
          {isSaving ? <Plus className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
          Deploy Architecture
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Payment Gateway Integration */}
        <div className="bg-white dark:bg-dark-surface p-8 rounded-3xl border border-slate-200 dark:border-dark-border shadow-2xl space-y-8">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-border pb-6">
            <h3 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3">
              <CreditCard className="text-brand-primary" /> Payment Gateway Deployment
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Integration Status</span>
              <button 
                onClick={() => onChange({ enabled: !form.enabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${form.enabled ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-dark-bg'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Tax Rate (%)</label>
                <input 
                  type="number"
                  value={taxRate}
                  onChange={(e) => onTaxRateChange(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-2xl px-6 py-4 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-mono"
                  placeholder="18"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Tax Mode</label>
                <div className="flex items-center gap-3 h-[46px] mt-1 bg-slate-50 dark:bg-dark-bg p-2 rounded-2xl border border-slate-200 dark:border-dark-border">
                  <button
                    onClick={() => onTaxInclusiveChange(false)}
                    className={`flex-1 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${!taxInclusive ? 'bg-white dark:bg-dark-surface text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}
                  >
                    Add-on
                  </button>
                  <button
                    onClick={() => onTaxInclusiveChange(true)}
                    className={`flex-1 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${taxInclusive ? 'bg-white dark:bg-dark-surface text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}
                  >
                    Inclusive
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Provider</label>
                <select 
                  value={form.provider}
                  onChange={(e) => onChange({ provider: e.target.value as any })}
                  className="w-full bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-2xl px-6 py-4 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all uppercase"
                >
                  <option value="none">None</option>
                  <option value="stripe">Stripe</option>
                  <option value="razorpay">Razorpay</option>
                  <option value="paypal">PayPal</option>
                  <option value="cashfree">Cashfree</option>
                  <option value="phonepe">PhonePe</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Operational Mode</label>
              <select 
                value={form.mode}
                onChange={(e) => onChange({ mode: e.target.value as any })}
                className="w-full bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-2xl px-6 py-4 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all uppercase"
              >
                <option value="test">Simulator (Test Mode)</option>
                <option value="live">Mainnet (Live Mode)</option>
              </select>
            </div>

            <AnimatePresence mode="wait">
              {form.provider === 'stripe' && (
                <motion.div 
                  key="stripe"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-6 pt-4 overflow-hidden"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Stripe Public Key</label>
                    <input 
                      type="text"
                      value={form.stripePublicKey || ''}
                      onChange={(e) => onChange({ stripePublicKey: e.target.value })}
                      placeholder="pk_test_..."
                      className="w-full bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-2xl px-6 py-4 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Stripe Secret Key</label>
                    <input 
                      type="password"
                      value={form.stripeSecretKey || ''}
                      onChange={(e) => onChange({ stripeSecretKey: e.target.value })}
                      placeholder="sk_test_..."
                      className="w-full bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-2xl px-6 py-4 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                    />
                  </div>
                </motion.div>
              )}

              {form.provider === 'razorpay' && (
                <motion.div 
                  key="razorpay"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-6 pt-4 overflow-hidden"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Razorpay Key ID</label>
                    <input 
                      type="text"
                      value={form.razorpayKeyId || ''}
                      onChange={(e) => onChange({ razorpayKeyId: e.target.value })}
                      placeholder="rzp_test_..."
                      className="w-full bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-2xl px-6 py-4 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Razorpay Key Secret</label>
                    <input 
                      type="password"
                      value={form.razorpayKeySecret || ''}
                      onChange={(e) => onChange({ razorpayKeySecret: e.target.value })}
                      placeholder="..."
                      className="w-full bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-2xl px-6 py-4 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                    />
                  </div>
                </motion.div>
              )}

              {form.provider === 'cashfree' && (
                <motion.div 
                  key="cashfree"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-6 pt-4 overflow-hidden"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Cashfree App ID</label>
                    <input 
                      type="text"
                      value={form.cashfreeAppId || ''}
                      onChange={(e) => onChange({ cashfreeAppId: e.target.value })}
                      placeholder="e.g. 123456"
                      className="w-full bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-2xl px-6 py-4 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Cashfree Secret Key</label>
                    <input 
                      type="password"
                      value={form.cashfreeSecretKey || ''}
                      onChange={(e) => onChange({ cashfreeSecretKey: e.target.value })}
                      placeholder="..."
                      className="w-full bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-2xl px-6 py-4 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                    />
                  </div>
                </motion.div>
              )}

              {form.provider === 'phonepe' && (
                <motion.div 
                  key="phonepe"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-6 pt-4 overflow-hidden"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">PhonePe Merchant ID</label>
                    <input 
                      type="text"
                      value={form.phonepeMerchantId || ''}
                      onChange={(e) => onChange({ phonepeMerchantId: e.target.value })}
                      placeholder="e.g. M123456789"
                      className="w-full bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-2xl px-6 py-4 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Salt Key</label>
                      <input 
                        type="password"
                        value={form.phonepeSaltKey || ''}
                        onChange={(e) => onChange({ phonepeSaltKey: e.target.value })}
                        placeholder="..."
                        className="w-full bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-2xl px-6 py-4 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Salt Index</label>
                      <input 
                        type="text"
                        value={form.phonepeSaltIndex || ''}
                        onChange={(e) => onChange({ phonepeSaltIndex: e.target.value })}
                        placeholder="1"
                        className="w-full bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-2xl px-6 py-4 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Other System Info */}
        <div className="space-y-8">
           <div className="bg-slate-50 dark:bg-dark-bg/30 p-8 rounded-3xl border border-dashed border-slate-200 dark:border-dark-border">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-2xl bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border text-brand-secondary">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">Revenue Operations</h4>
                  <p className="text-[10px] font-bold text-slate-400">Manage global pricing flow</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-dark-text-muted leading-relaxed">
                Configure your payment gateway integration variables here. These credentials will be used to authorize transactions across the entire platform. Ensure secrecy when handling API keys.
              </p>
           </div>

           <div className="bg-blue-50/50 dark:bg-blue-500/5 p-8 rounded-3xl border border-blue-100 dark:border-blue-500/10">
              <h4 className="text-sm font-black uppercase italic tracking-tighter text-blue-900 dark:text-blue-100 mb-2">Operational Integrity</h4>
              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mb-4 uppercase tracking-widest">Security Audit Required</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-400">
                  <CheckCircle2 size={12} /> SSL Protocol Enabled
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-400">
                  <CheckCircle2 size={12} /> Database Encryption Active
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-400">
                  <CheckCircle2 size={12} /> Multi-Region Storage Layer
                </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const SuperAdminsSection = ({ admins, allUsers, onToggleStatus, onDelete, isProcessing }: any) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredUsers = searchTerm.trim() ? allUsers.filter((u: any) => 
    (u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     u.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
    !u.isSuperAdmin
  ).slice(0, 5) : [];

  return (
    <div className="space-y-8">
      {/* Promotion Tool */}
      <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-8 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
          <ShieldCheck size={120} className="text-brand-primary" />
        </div>
        <div className="relative z-10 max-w-xl">
           <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Elevate Operative Clearance</h2>
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 mb-8">Identify personnel for promotion to the Core Command Council</p>
           
           <div className="relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text"
                placeholder="Search global directory (Name or System Email)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-5 pl-16 pr-8 text-sm text-white placeholder:text-slate-600 outline-none focus:ring-4 focus:ring-brand-primary/20 focus:border-brand-primary transition-all shadow-inner"
              />
           </div>

           {filteredUsers.length > 0 && (
             <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="mt-4 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl divide-y divide-slate-900"
             >
                {filteredUsers.map((u: any) => (
                  <div key={u.uid} className="p-4 flex items-center justify-between hover:bg-slate-900 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 font-black text-xs uppercase italic overflow-hidden">
                        {u.photoURL ? <img src={u.photoURL} alt={u.name} className="w-full h-full object-contain" /> : u.name[0]}
                      </div>
                      <div>
                        <p className="text-xs font-black text-white uppercase italic">{u.name}</p>
                        <p className="text-[9px] text-slate-500 font-medium tracking-tight mt-0.5">{u.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        onToggleStatus(u);
                        setSearchTerm('');
                      }}
                      className="px-6 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-brand-primary/20 flex items-center gap-2"
                    >
                      <PlusCircle size={14} />
                      Grant Clearance
                    </button>
                  </div>
                ))}
             </motion.div>
           )}
        </div>
      </div>

      {/* Current Council */}
      <div className="bg-white dark:bg-dark-surface rounded-3xl border border-slate-200 dark:border-dark-border shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-dark-border flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter">Global Command Council</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">High-level operative clearance directory</p>
          </div>
          <div className="px-5 py-2 bg-slate-100 dark:bg-dark-bg rounded-xl border border-slate-200 dark:border-dark-border">
            <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase italic tracking-widest">{admins.length} Total Operatives</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-dark-bg/50 border-b border-slate-200 dark:border-dark-border">
                <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Operative</th>
                <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Clearance Level</th>
                <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Identity</th>
                <th className="px-8 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-dark-border">
              {admins.map((u: UserProfile) => (
                <tr key={u.uid} className="hover:bg-slate-50 dark:hover:bg-dark-bg/30 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary font-black text-xl border border-brand-primary/20 overflow-hidden relative">
                        <ShieldCheck className="absolute top-1 right-1 text-brand-primary" size={12} />
                        {u.photoURL ? (
                          <img src={u.photoURL} alt={u.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          u.name[0]
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{u.name}</p>
                        <p className="text-[10px] text-slate-400 italic">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 bg-brand-primary text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-brand-primary/20">
                      Super Admin
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">UID: {u.uid.slice(0, 8)}...</p>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => onToggleStatus(u)}
                        disabled={isProcessing === u.uid}
                        className="p-3 bg-white dark:bg-dark-bg text-rose-500 rounded-2xl border border-slate-100 dark:border-dark-border hover:bg-rose-50 transition-all font-black uppercase text-[9px] tracking-widest flex items-center gap-2"
                        title="Demote to standard operative"
                      >
                        <Lock size={14} />
                        Revoke
                      </button>
                      <button 
                        onClick={() => onDelete(u)}
                        disabled={isProcessing === u.uid}
                        className="p-3 bg-white dark:bg-dark-bg text-slate-400 rounded-2xl border border-slate-100 dark:border-dark-border hover:bg-rose-500 hover:text-white transition-all font-black uppercase text-[9px] tracking-widest flex items-center gap-2"
                        title="Purge profile"
                      >
                        <Trash2 size={16} />
                        Purge
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {admins.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-dark-bg rounded-3xl flex items-center justify-center mx-auto mb-4 opacity-20">
                       <ShieldAlert size={48} />
                    </div>
                    <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Command Council Vacant</p>
                    <p className="text-[10px] text-slate-400 mt-1 italic">No super admins currently deployed.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
