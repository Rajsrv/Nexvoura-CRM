import React, { useEffect, useState } from 'react';
import { useAuth } from '../App';
import { saasService } from '../services/saasService';
import { SaasPlan, Subscription, SaasPayment, DiscountCode, SystemSettings } from '../types';
import NexvouraLoader from './NexvouraLoader';
import { 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  ShieldCheck, 
  Zap, 
  Star, 
  FileText, 
  Download, 
  AlertCircle,
  Package,
  Calendar,
  DollarSign,
  Ticket,
  Percent,
  Receipt
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function SubscriptionPage() {
  const { user, company } = useAuth();
  const [plans, setPlans] = useState<SaasPlan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<SaasPayment[]>([]);
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPlans, setShowPlans] = useState(false);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<SaasPlan | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountCode | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!company) return;
      setLoading(true);
      try {
        const [allPlans, currentSub, companyPayments, allDiscounts, settings] = await Promise.all([
          saasService.getPlans(),
          saasService.getCompanySubscription(company.id),
          saasService.getCompanyPayments(company.id),
          saasService.getDiscounts(),
          saasService.getSystemSettings()
        ]);

        setPlans(allPlans);
        setSubscription(currentSub);
        setPayments(companyPayments);
        setDiscounts(allDiscounts);
        setSystemSettings(settings);
      } catch (error) {
        console.error('Error loading subscription data:', error);
        toast.error('Failed to load subscription details');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [company]);

  const currentPlan = plans.find(p => p.id === subscription?.planId);

  const handleApplyCoupon = () => {
    if (!couponCode) return;
    setIsValidatingCoupon(true);
    
    // Artificial delay for UI feedback
    setTimeout(() => {
      const discount = discounts.find(d => 
        d.code.toUpperCase() === couponCode.toUpperCase() && 
        d.isActive && 
        (d.maxRedemptions ? d.redemptionCount < d.maxRedemptions : true)
      );

      if (discount) {
        setAppliedDiscount(discount);
        toast.success(`Coupon applied: ${discount.code}`);
      } else {
        setAppliedDiscount(null);
        toast.error('Invalid or expired coupon code');
      }
      setIsValidatingCoupon(false);
    }, 800);
  };

  const calculateTotals = (plan: SaasPlan) => {
    const subtotal = plan.price;
    let discountAmount = 0;
    
    if (appliedDiscount) {
      if (appliedDiscount.discountType === 'percentage') {
        discountAmount = (subtotal * appliedDiscount.value) / 100;
      } else {
        discountAmount = appliedDiscount.value;
      }
    }
    
    const afterDiscount = Math.max(0, subtotal - discountAmount);
    const taxRate = systemSettings?.taxRate || 0;
    const taxInclusive = systemSettings?.taxInclusive || false;
    
    let taxAmount = 0;
    let finalTotal = 0;
    
    if (taxInclusive) {
      // Tax is included in price, extract it
      const basePrice = afterDiscount / (1 + taxRate / 100);
      taxAmount = afterDiscount - basePrice;
      finalTotal = afterDiscount;
    } else {
      // Tax is added on top
      taxAmount = (afterDiscount * taxRate) / 100;
      finalTotal = afterDiscount + taxAmount;
    }
    
    return { subtotal, discountAmount, taxAmount, total: finalTotal, taxRate, taxInclusive };
  };

  const handleConfirmUpgrade = async () => {
    if (!company || !selectedPlanForCheckout) return;
    
    try {
      const planId = selectedPlanForCheckout.id;
      const { total, discountAmount, taxAmount } = calculateTotals(selectedPlanForCheckout);

      toast.loading('Processing billing protocol...', { id: 'upgrade' });
      
      const newPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      if (subscription) {
        await saasService.updateSubscription(subscription.id, {
          planId: planId,
          status: 'active',
          currentPeriodStart: new Date().toISOString(),
          currentPeriodEnd: newPeriodEnd
        });
      } else {
        await saasService.updateSubscription(company.id, {
          id: company.id,
          companyId: company.id,
          planId: planId,
          status: 'active',
          startDate: new Date().toISOString(),
          currentPeriodStart: new Date().toISOString(),
          currentPeriodEnd: newPeriodEnd,
          cancelAtPeriodEnd: false
        });
      }

      // Record theoretical payment
      await saasService.createPayment({
        companyId: company.id,
        planId: planId,
        amount: total,
        currency: selectedPlanForCheckout.currency,
        status: 'succeeded',
        billingReason: subscription ? 'subscription_update' : 'subscription_create',
        billingPeriod: selectedPlanForCheckout.interval,
        discountApplied: appliedDiscount ? {
          code: appliedDiscount.code,
          amount: discountAmount
        } : undefined,
        taxAmount: taxAmount,
        createdAt: new Date().toISOString()
      });

      // Record discount redemption if used
      if (appliedDiscount) {
        await saasService.recordDiscountRedemption(appliedDiscount.id);
      }
      
      toast.success(`${selectedPlanForCheckout.name} tier fully initialized`, { id: 'upgrade' });
      
      // Refresh local state
      const [newSub, companyPayments, allDiscounts] = await Promise.all([
        saasService.getCompanySubscription(company.id),
        saasService.getCompanyPayments(company.id),
        saasService.getDiscounts()
      ]);
      
      setSubscription(newSub);
      setPayments(companyPayments);
      setDiscounts(allDiscounts);
      setShowPlans(false);
      setSelectedPlanForCheckout(null);
      setAppliedDiscount(null);
      setCouponCode('');
    } catch (error) {
      console.error('Upgrade failure:', error);
      toast.error('System failure during tier transition', { id: 'upgrade' });
    }
  };

  const handleInitiateUpgrade = (plan: SaasPlan) => {
    setSelectedPlanForCheckout(plan);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <NexvouraLoader label="Synchronizing Billing Infrastructure" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      {/* Header */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 dark:bg-brand-primary/10 rounded-2xl">
              <CreditCard className="text-brand-primary" size={24} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Billing Protocol</h1>
              <p className="text-xs font-bold text-slate-400 dark:text-dark-text-muted uppercase tracking-widest">Manage your enterprise subscription and assets</p>
            </div>
          </div>

          {company?.trialEndsAt && !subscription && (
            <div className={`px-6 py-3 rounded-2xl border flex items-center gap-4 ${
              new Date(company.trialEndsAt) < new Date() 
              ? 'bg-rose-50 border-rose-100 text-rose-600 animate-pulse' 
              : 'bg-indigo-50 border-indigo-100 text-indigo-600'
            }`}>
              <Clock size={20} />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest leading-tight">
                  {new Date(company.trialEndsAt) < new Date() ? 'Operational Window Closed' : 'Trial Active Duty'}
                </p>
                <p className="text-[9px] font-bold opacity-70 uppercase tracking-widest">
                  {new Date(company.trialEndsAt) < new Date() 
                    ? 'Trial expired on ' + format(new Date(company.trialEndsAt), 'MMM dd, yyyy')
                    : Math.ceil((new Date(company.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) + ' Days remaining'}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Subscription Summary */}
        <section className="lg:col-span-2 space-y-8">
          <div className="glass-card p-10 border-slate-200/60 dark:border-dark-border/50 rounded-[40px] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 blur-[80px] -mr-32 -mt-32" />
            
            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 bg-brand-primary text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                    Active Plan
                  </div>
                  {subscription?.status === 'active' && (
                    <div className="flex items-center gap-1.5 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                      <CheckCircle2 size={14} />
                      Verified
                    </div>
                  )}
                </div>
                
                <div className="space-y-1">
                  <h2 className="text-5xl font-black text-slate-900 dark:text-white tracking-tight">{currentPlan?.name || 'Standard Portal'}</h2>
                  <p className="text-slate-500 dark:text-dark-text-muted font-bold text-lg uppercase tracking-widest">
                    {currentPlan?.price === 0 ? 'Complimentary' : `${currentPlan?.currency === 'EUR' ? '€' : currentPlan?.currency === 'GBP' ? '£' : currentPlan?.currency === 'INR' ? '₹' : currentPlan?.currency === 'JPY' ? '¥' : '$'}${currentPlan?.price}/${currentPlan?.interval}`}
                  </p>
                </div>

                <div className="flex flex-wrap gap-6 pt-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Renew Date</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                       <Calendar size={14} className="text-slate-400" />
                       {subscription?.currentPeriodEnd ? format(new Date(subscription.currentPeriodEnd), 'MMMM dd, yyyy') : 'N/A'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">User Capacity</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                       <Package size={14} className="text-slate-400" />
                       {currentPlan?.limits.maxUsers || '∞'} Seats
                    </p>
                  </div>
                </div>
              </div>

              <div className="shrink-0 space-y-4">
                <button 
                  onClick={() => setShowPlans(true)}
                  className="w-full px-8 py-4 bg-slate-900 dark:bg-brand-primary text-white rounded-2xl font-black text-sm hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3"
                >
                  <Zap size={18} />
                  Change Plan
                </button>
                <button className="w-full px-8 py-4 bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border text-slate-600 dark:text-slate-300 rounded-2xl font-black text-sm hover:bg-slate-50 dark:hover:bg-dark-bg transition-all">
                  Cancel Auto-Renew
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 pt-12 border-t border-slate-100 dark:border-dark-border/50">
               {[
                 { label: 'Intelligence AI', active: currentPlan?.limits.hasIntelligence, icon: Star },
                 { label: 'Agency Blogs', active: currentPlan?.limits.hasBlogs, icon: FileText },
                 { label: 'Asset Storage', value: currentPlan?.limits.maxStorage ? `${currentPlan.limits.maxStorage}MB` : 'Unlimited', icon: ShieldCheck }
               ].map((feature, i) => (
                 <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50/50 dark:bg-dark-bg/30 border border-slate-100 dark:border-dark-border/50">
                    <feature.icon className={feature.active !== false ? 'text-brand-primary' : 'text-slate-300'} size={18} />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{feature.label}</p>
                      <p className={`text-xs font-bold ${feature.active === false ? 'text-slate-300 line-through' : 'text-slate-700 dark:text-white'}`}>
                        {feature.value || (feature.active !== false ? 'Enabled' : 'Disabled')}
                      </p>
                    </div>
                 </div>
               ))}
            </div>
          </div>

          {/* Billing History */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 dark:text-white">Transaction Registry</h3>
              <button className="text-[10px] font-black uppercase tracking-widest text-brand-primary hover:underline">Download All (CSV)</button>
            </div>
            
            <div className="glass-card border-slate-200/60 dark:border-dark-border/50 rounded-[32px] overflow-hidden">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-slate-50/50 dark:bg-dark-bg/20 border-b border-slate-100 dark:border-dark-border/50">
                     <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                     <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Reference</th>
                     <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Data Point</th>
                     <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Magnitude</th>
                     <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 w-16"></th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50 dark:divide-dark-border/30">
                   {payments.map((payment) => (
                     <tr key={payment.id} className="group hover:bg-slate-50/50 dark:hover:bg-dark-bg/10 transition-colors">
                       <td className="px-8 py-5">
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                            payment.status === 'succeeded' 
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 border border-emerald-100 dark:border-emerald-500/20' 
                            : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 border border-rose-100 dark:border-rose-500/20'
                          }`}>
                            {payment.status === 'succeeded' ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                            {payment.status}
                          </div>
                       </td>
                       <td className="px-8 py-5">
                          <p className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tighter">INV-{(payment.id || '').substring(0, 8).toUpperCase()}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{format(new Date(payment.createdAt), 'MMM dd, yyyy')}</p>
                       </td>
                       <td className="px-8 py-5">
                          <p className="text-[10px] font-black text-slate-500 dark:text-dark-text-muted uppercase tracking-widest">
                            {plans.find(p => p.id === payment.planId)?.name || 'Legacy Plan'}
                          </p>
                          <p className="text-[9px] text-slate-400 italic">Periodic Cycle</p>
                       </td>
                       <td className="px-8 py-5 text-right">
                          <p className="text-sm font-black text-slate-900 dark:text-white tracking-tighter">${payment.amount.toFixed(2)}</p>
                       </td>
                       <td className="px-8 py-5 text-right">
                          <button className="p-2 text-slate-400 hover:text-brand-primary transition-colors">
                            <Download size={16} />
                          </button>
                       </td>
                     </tr>
                   ))}
                   {payments.length === 0 && (
                     <tr>
                       <td colSpan={5} className="px-8 py-20 text-center">
                         <Clock size={40} className="mx-auto text-slate-200 mb-4" />
                         <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No transaction history detected</p>
                       </td>
                     </tr>
                   )}
                 </tbody>
               </table>
            </div>
          </div>
        </section>

        {/* Support & Configuration */}
        <section className="space-y-8">
           <div className="glass-card p-8 border-slate-200/60 dark:border-dark-border/50 rounded-[32px] bg-slate-900 dark:bg-brand-primary text-white">
              <h3 className="text-xl font-black uppercase italic tracking-tighter mb-4">Secure Gateway</h3>
              <p className="text-xs font-bold text-slate-400 dark:text-white/60 mb-8 leading-relaxed">
                Our payment infrastructure uses military-grade encryption. Your credentials never touch our servers.
              </p>
              
              <div className="space-y-4">
                 <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10">
                    <ShieldCheck className="text-brand-primary dark:text-white" size={20} />
                    <span className="text-[10px] font-black uppercase tracking-widest">PCI DSS Compliant</span>
                 </div>
                 <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10">
                    <Zap className="text-brand-primary dark:text-white" size={20} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Instant Activation</span>
                 </div>
              </div>
           </div>

           <div className="glass-card p-8 border-slate-200/60 dark:border-dark-border/50 rounded-[32px] space-y-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Assistance Required?</h3>
              <p className="text-[11px] text-slate-500 dark:text-dark-text-muted leading-relaxed">
                Facing issues with your portal tier? Our support operatives are available for direct frequency communication.
              </p>
              <button className="w-full py-4 border-2 border-slate-100 dark:border-dark-border text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-50 dark:hover:bg-dark-bg transition-all">
                Contact Protocol Support
              </button>
           </div>
        </section>
      </div>

      {/* Plan Selection Modal */}
      <AnimatePresence>
        {showPlans && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPlans(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl bg-white dark:bg-dark-surface rounded-[40px] border border-slate-200 dark:border-dark-border shadow-2xl overflow-hidden"
            >
              <div className="p-10 border-b border-slate-100 dark:border-dark-border text-center">
                 <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">
                   {selectedPlanForCheckout ? 'Billing Extraction' : 'Tier Optimization'}
                 </h2>
                 <p className="text-[10px] font-black text-slate-400 dark:text-dark-text-muted uppercase tracking-[0.3em] mt-2">
                   {selectedPlanForCheckout ? 'Finalize billing deployment' : 'Select your operational capacity'}
                 </p>
              </div>

              <div className="p-10">
                <AnimatePresence mode="wait">
                  {!selectedPlanForCheckout ? (
                    <motion.div 
                      key="plans"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="grid grid-cols-1 md:grid-cols-3 gap-6"
                    >
                       {plans.map((plan) => {
                         const isCurrent = plan.id === subscription?.planId;
                         const currencySymbol = plan.currency === 'EUR' ? '€' : plan.currency === 'GBP' ? '£' : plan.currency === 'INR' ? '₹' : plan.currency === 'JPY' ? '¥' : '$';
                         return (
                           <div key={plan.id} className={`p-8 rounded-[32px] border-2 transition-all relative ${
                             isCurrent 
                             ? 'border-brand-primary bg-brand-primary/5' 
                             : 'border-slate-100 dark:border-dark-border hover:border-slate-200 dark:hover:border-slate-700'
                           }`}>
                              {plan.isPopular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-slate-900 dark:bg-brand-primary text-white text-[8px] font-black uppercase tracking-widest rounded-full">
                                  Popular Choice
                                </div>
                              )}

                              <div className="space-y-6">
                                 <div>
                                   <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{plan.name}</h4>
                                   <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                                     {currencySymbol}{plan.price}
                                     <span className="text-xs font-bold text-slate-400">/{plan.interval}</span>
                                   </p>
                                 </div>

                                 <ul className="space-y-4">
                                   {plan.features.map((feature, i) => (
                                     <li key={i} className="flex items-center gap-3 text-xs font-bold text-slate-500 dark:text-dark-text-muted">
                                       <CheckCircle2 size={16} className="text-brand-primary shrink-0" />
                                       {feature}
                                     </li>
                                   ))}
                                 </ul>

                                 <button 
                                   disabled={isCurrent}
                                   onClick={() => handleInitiateUpgrade(plan)}
                                   className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                     isCurrent
                                     ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 border border-emerald-200 dark:border-emerald-500/20 cursor-default'
                                     : 'bg-slate-900 dark:bg-brand-primary text-white hover:shadow-lg'
                                   }`}
                                 >
                                   {isCurrent ? 'Active Directive' : 'Engage Tier'}
                                 </button>
                              </div>
                           </div>
                         );
                       })}
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="checkout"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-12"
                    >
                      <div className="space-y-8">
                        <div className="space-y-4">
                          <h4 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">Billing Breakdown</h4>
                          <div className="bg-slate-50 dark:bg-dark-bg/30 p-8 rounded-3xl space-y-4 border border-slate-100 dark:border-dark-border">
                            {(() => {
                              const { subtotal, discountAmount, taxAmount, total, taxRate, taxInclusive } = calculateTotals(selectedPlanForCheckout);
                              const symbol = selectedPlanForCheckout.currency === 'EUR' ? '€' : selectedPlanForCheckout.currency === 'GBP' ? '£' : selectedPlanForCheckout.currency === 'INR' ? '₹' : selectedPlanForCheckout.currency === 'JPY' ? '¥' : '$';
                              return (
                                <>
                                  <div className="flex justify-between items-center text-sm font-bold">
                                    <span className="text-slate-400 uppercase tracking-widest text-[10px]">Base Protocol Fee</span>
                                    <span className="text-slate-900 dark:text-white">{symbol}{subtotal.toFixed(2)}</span>
                                  </div>
                                  {appliedDiscount && (
                                    <div className="flex justify-between items-center text-sm font-bold text-emerald-500">
                                      <span className="uppercase tracking-widest text-[10px] flex items-center gap-2">
                                         <Ticket size={12} /> Coupon: {appliedDiscount.code}
                                      </span>
                                      <span>-{symbol}{discountAmount.toFixed(2)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between items-center text-sm font-bold border-t border-slate-200 dark:border-dark-border pt-4">
                                    <span className="text-slate-400 uppercase tracking-widest text-[10px] flex items-center gap-2">
                                       <Receipt size={12} /> {taxInclusive ? 'Included' : ''} Regional Tax ({taxRate}%)
                                    </span>
                                    <span className="text-slate-900 dark:text-white">{taxInclusive ? '' : '+'}{symbol}{taxAmount.toFixed(2)}</span>
                                  </div>
                                  {taxInclusive && (
                                    <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50/50 dark:bg-indigo-500/10 rounded-xl">
                                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                      <p className="text-[8px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                                        Tax is already included in the base plan magnitude
                                      </p>
                                    </div>
                                  )}
                                  <div className="flex justify-between items-center pt-4 border-t-2 border-slate-200 dark:border-dark-border">
                                    <span className="text-sm font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">Final Commitment</span>
                                    <span className="text-3xl font-black text-brand-primary">{symbol}{total.toFixed(2)}</span>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Apply Discount Coupon</h4>
                            {appliedDiscount && (
                              <button 
                                onClick={() => { setAppliedDiscount(null); setCouponCode(''); }}
                                className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          <div className="relative">
                            <input 
                              type="text"
                              value={couponCode}
                              onChange={(e) => setCouponCode(e.target.value)}
                              placeholder="ENTER_VOUCHER_CODE"
                              disabled={!!appliedDiscount || isValidatingCoupon}
                              className="w-full bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-2xl px-6 py-4 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all uppercase placeholder:opacity-30"
                            />
                            <button 
                              onClick={handleApplyCoupon}
                              disabled={!couponCode || !!appliedDiscount || isValidatingCoupon}
                              className="absolute right-2 top-2 bottom-2 px-6 bg-slate-900 dark:bg-brand-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl disabled:opacity-50"
                            >
                              {isValidatingCoupon ? <Clock size={14} className="animate-spin" /> : 'Validate'}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-8 flex flex-col justify-center">
                        <div className="p-8 rounded-[32px] bg-indigo-50/50 dark:bg-brand-primary/5 border border-indigo-100 dark:border-brand-primary/20">
                           <div className="flex items-center gap-4 mb-4">
                              <div className="p-3 bg-white dark:bg-dark-surface rounded-2xl shadow-xl">
                                 <ShieldCheck className="text-brand-primary" size={24} />
                              </div>
                              <div>
                                 <h4 className="text-sm font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">Verified Checkout</h4>
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Secured by Portal 128-bit Protocol</p>
                              </div>
                           </div>
                           <p className="text-xs text-slate-500 dark:text-dark-text-muted leading-relaxed font-medium">
                             By proceeding, you authorize Nexvoura to initiate the billing cycle for the <strong>{selectedPlanForCheckout.name}</strong>. Your account will be upgraded immediately upon successful authorization.
                           </p>
                        </div>

                        <div className="flex gap-4">
                          <button 
                            onClick={() => setSelectedPlanForCheckout(null)}
                            className="flex-1 py-4 bg-slate-100 dark:bg-dark-bg text-slate-600 dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                          >
                            Return to Plans
                          </button>
                          <button 
                            onClick={handleConfirmUpgrade}
                            className="flex-[2] py-4 bg-slate-900 dark:bg-brand-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:shadow-2xl hover:shadow-brand-primary/20 transition-all flex items-center justify-center gap-2"
                          >
                            Confirm & Engage Layer
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-dark-bg/30 border-t border-slate-100 dark:border-dark-border flex items-center justify-center gap-6">
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <ShieldCheck size={14} />
                    Secured by Nexvoura Encryption
                  </div>
                  <button onClick={() => setShowPlans(false)} className="text-[10px] font-black text-slate-900 dark:text-white uppercase hover:underline">Close Terminal</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
