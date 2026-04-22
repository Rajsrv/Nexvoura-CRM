import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { UserProfile, PayrollRecord, Company } from '../types';
import { Plus, Check, X, DollarSign, Calendar, Filter, Download, ArrowRight, Wallet, AlertCircle, Clock, Trash2, Shield, Eye, TrendingUp, BarChart3, ChevronRight, PieChart } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { logActivity } from '../services/activityService';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const calculateTax = (grossAmount: number) => {
  // Simple progressive tax simulation
  if (grossAmount <= 15000) return 0;
  if (grossAmount <= 30000) return Math.round((grossAmount - 15000) * 0.05);
  if (grossAmount <= 60000) return Math.round(750 + (grossAmount - 30000) * 0.1);
  return Math.round(3750 + (grossAmount - 60000) * 0.2);
};

export default function PayrollPage({ user, company }: { user: UserProfile, company: Company | null }) {
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [showAddModal, setShowAddModal] = useState(false);
  const [adjustingRecord, setAdjustingRecord] = useState<PayrollRecord | null>(null);
  const [showBreakdown, setShowBreakdown] = useState<string | null>(null); // employeeId for yearly breakdown
  const [viewingPayslip, setViewingPayslip] = useState<PayrollRecord | null>(null);

  const canViewPayroll = user.role === 'admin' || user.role === 'manager';

  useEffect(() => {
    if (!canViewPayroll) return;

    const employeesQ = query(collection(db, 'users'), where('companyId', '==', user.companyId));
    
    let payrollQ;
    if (viewMode === 'monthly') {
      payrollQ = query(
        collection(db, 'payroll'), 
        where('companyId', '==', user.companyId), 
        where('month', '==', selectedMonth)
      );
    } else {
      payrollQ = query(
        collection(db, 'payroll'), 
        where('companyId', '==', user.companyId), 
        where('month', '>=', `${selectedYear}-01`),
        where('month', '<=', `${selectedYear}-12`)
      );
    }

    const unsubEmployees = onSnapshot(employeesQ, (snap) => {
      setEmployees(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
    });

    const unsubPayroll = onSnapshot(payrollQ, (snap) => {
      setPayroll(snap.docs.map(d => ({ id: d.id, ...d.data() } as PayrollRecord)));
    });

    return () => {
      unsubEmployees();
      unsubPayroll();
    };
  }, [user.companyId, selectedMonth, selectedYear, viewMode, canViewPayroll]);

  const handleGeneratePayroll = async () => {
    setLoading(true);
    try {
      const existingIds = new Set(payroll.map(p => p.employeeId));
      const newRecords = [];

      for (const emp of employees) {
        if (!existingIds.has(emp.uid) && emp.salary) {
          const baseSalary = Math.round(emp.salary / 12);
          const taxAmount = calculateTax(baseSalary);
          const netSalary = baseSalary - taxAmount;
          
          newRecords.push({
            companyId: user.companyId,
            employeeId: emp.uid,
            employeeName: emp.name,
            month: selectedMonth,
            baseSalary,
            bonus: 0,
            deductions: 0,
            taxAmount,
            netSalary,
            totalAmount: baseSalary, // Keep totalAmount for backward compatibility or as gross
            status: 'Pending',
            createdAt: new Date().toISOString()
          });
        }
      }

      if (newRecords.length === 0) {
        toast.info('No new payroll records to generate for this month.');
      } else {
        await Promise.all(newRecords.map(rec => addDoc(collection(db, 'payroll'), rec)));
        logActivity(user, 'DATA_EXPORT', `Bulk payroll generated for ${selectedMonth}`, undefined, selectedMonth);
        toast.success(`Generated ${newRecords.length} payroll records`);
      }
    } catch (error) {
      toast.error('Failed to generate payroll.');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: 'Paid' | 'Pending') => {
    try {
      await updateDoc(doc(db, 'payroll', id), {
        status,
        paidAt: status === 'Paid' ? new Date().toISOString() : null
      });
      toast.success(`Marked as ${status}`);
    } catch (error) {
      toast.error('Failed to update status.');
    }
  };

  const updateAmount = async (id: string, type: 'bonus' | 'deduction', amount: number, reason?: string) => {
    const record = payroll.find(p => p.id === id);
    if (!record) return;

    const bonus = type === 'bonus' ? amount : (record.bonus || 0);
    const bonusReason = type === 'bonus' ? reason : (record.bonusReason || '');
    const deductions = type === 'deduction' ? amount : (record.deductions || record.deduction || 0);
    const deductionReason = type === 'deduction' ? reason : (record.deductionReason || '');
    
    const gross = record.baseSalary + bonus;
    const taxAmount = calculateTax(gross);
    const netSalary = gross - deductions - taxAmount;

    try {
      await updateDoc(doc(db, 'payroll', id), {
        bonus,
        bonusReason,
        deductions,
        deductionReason,
        taxAmount,
        netSalary,
        totalAmount: gross // Updating totalAmount to be gross for consistency
      });
      toast.success('Record updated with adjustments and tax calculation');
    } catch (error) {
      toast.error('Failed to update amounts.');
    }
  };

  const deleteRecord = async (id: string) => {
    try {
       await deleteDoc(doc(db, 'payroll', id));
       toast.success('Record deleted');
    } catch (error) {
       toast.error('Delete failed');
    }
  };

  if (!canViewPayroll) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-rose-500">
             <Shield size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-950 uppercase italic">Access Restricted</h2>
          <p className="text-slate-500 text-sm mt-2">Neural clearance required for payroll operations.</p>
        </div>
      </div>
    );
  }

  const totalBudget = payroll.reduce((sum, p) => sum + p.totalAmount, 0);
  const paidCount = payroll.filter(p => p.status === 'Paid').length;

  // Aggregate yearly data per employee
  const yearlyData = useMemo(() => {
    if (viewMode !== 'yearly') return [];
    
    const aggregation: Record<string, {
      employeeId: string;
      employeeName: string;
      totalBase: number;
      totalBonus: number;
      totalDeduction: number;
      totalTax: number;
      totalNet: number;
      months: string[];
    }> = {};

    payroll.forEach(rec => {
      if (!aggregation[rec.employeeId]) {
        aggregation[rec.employeeId] = {
          employeeId: rec.employeeId,
          employeeName: rec.employeeName,
          totalBase: 0,
          totalBonus: 0,
          totalDeduction: 0,
          totalTax: 0,
          totalNet: 0,
          months: []
        };
      }
      aggregation[rec.employeeId].totalBase += rec.baseSalary;
      aggregation[rec.employeeId].totalBonus += rec.bonus || 0;
      aggregation[rec.employeeId].totalDeduction += rec.deductions || rec.deduction || 0;
      aggregation[rec.employeeId].totalTax += rec.taxAmount || 0;
      aggregation[rec.employeeId].totalNet += rec.netSalary || rec.totalAmount;
      aggregation[rec.employeeId].months.push(rec.month);
    });

    return Object.values(aggregation).sort((a, b) => b.totalNet - a.totalNet);
  }, [payroll, viewMode]);

  return (
    <div className="flex flex-col xl:flex-row gap-10">
      {/* Sidebar: Summary & Selection */}
      <div className="w-full xl:w-[380px] space-y-8 min-w-[320px]">
        <div className="bg-slate-950 p-10 rounded-[40px] text-white overflow-hidden relative shadow-2xl">
          <div className="relative z-10">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-8 flex items-center space-x-2">
               <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
               <span>Financial Nexus</span>
            </div>
            
            <div className="space-y-6">
              <div>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">
                  {viewMode === 'monthly' ? 'Total Monthly Budget' : `Annual Spend (${selectedYear})`}
                </p>
                <h3 className="text-4xl font-black font-display italic tracking-tighter text-blue-400">
                  ${totalBudget.toLocaleString()}
                </h3>
              </div>

              <div className="bg-white/5 p-1 rounded-2xl border border-white/10 flex">
                <button 
                  onClick={() => setViewMode('monthly')}
                  className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    viewMode === 'monthly' ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Calendar size={14} />
                  <span>Monthly</span>
                </button>
                <button 
                  onClick={() => setViewMode('yearly')}
                  className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    viewMode === 'yearly' ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <TrendingUp size={14} />
                  <span>Yearly</span>
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest mb-1">Efficiency</p>
                  <p className="text-sm font-black italic">{viewMode === 'monthly' ? `${paidCount}/${payroll.length} Paid` : `${payroll.length} Records`}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest mb-1">Cycle</p>
                  <p className="text-sm font-black italic uppercase tracking-tighter">{viewMode === 'monthly' ? selectedMonth : selectedYear}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl" />
        </div>

        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Parameter Selection</h4>
          {viewMode === 'monthly' ? (
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-xs uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          ) : (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-xs uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y.toString()}>{y} Strategy</option>
              ))}
            </select>
          )}

          {viewMode === 'monthly' && (
            <button 
              disabled={loading}
              onClick={handleGeneratePayroll}
              className="w-full group flex items-center justify-between bg-slate-100 text-slate-950 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm"
            >
              <span>Auto-Gen Records</span>
              <Plus size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content: Payroll Records */}
      <div className="flex-1 space-y-8 min-w-0">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span>{viewMode === 'monthly' ? 'Monthly Operational' : 'Annual Strategic'} View</span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black font-display text-slate-950 italic tracking-tighter leading-none">
              Payroll <span className="text-blue-600">Overview</span>
            </h2>
          </div>
          <button 
            onClick={() => {
              logActivity(user, 'DATA_EXPORT', `Generated financial report for ${viewMode === 'monthly' ? selectedMonth : selectedYear}`);
              toast.success('Report generation initiated');
            }}
            className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-950 transition-colors w-fit group"
          >
            <Download size={16} className="group-hover:-translate-y-1 transition-transform" />
            <span>Generate Report</span>
          </button>
        </div>

        <div className="table-container">
          {(viewMode === 'monthly' ? payroll : yearlyData).length > 0 ? (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="bg-slate-50/80 border-b border-slate-100 italic">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black font-display text-slate-400 uppercase tracking-widest uppercase">Employee</th>
                    <th className="px-8 py-5 text-[10px] font-black font-display text-slate-400 uppercase tracking-widest uppercase">{viewMode === 'monthly' ? 'Salary Profile' : 'Yearly Base'}</th>
                    <th className="px-8 py-5 text-[10px] font-black font-display text-slate-400 uppercase tracking-widest uppercase">Adjustments</th>
                    <th className="px-8 py-5 text-[10px] font-black font-display text-slate-400 uppercase tracking-widest uppercase">{viewMode === 'monthly' ? 'Tax' : 'Net Total'}</th>
                    <th className="px-8 py-5 text-[10px] font-black font-display text-slate-400 uppercase tracking-widest uppercase">{viewMode === 'monthly' ? 'Net Payable' : 'Cycles'}</th>
                    <th className="px-8 py-5 text-[10px] font-black font-display text-slate-400 uppercase tracking-widest uppercase">Status</th>
                    <th className="px-8 py-5 text-[10px] font-black font-display text-slate-400 uppercase tracking-widest uppercase text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {viewMode === 'monthly' ? (
                    payroll.map((rec) => (
                      <tr key={rec.id} className="group hover:bg-slate-50/30 transition-colors">
                        <td className="px-8 py-6">
                          <div className="font-black text-slate-950 uppercase text-xs tracking-tight">{rec.employeeName}</div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="text-xs font-bold text-slate-500">{company?.currency || '$'}{rec.baseSalary.toLocaleString()}</div>
                        </td>
                        <td className="px-8 py-6">
                          <button 
                            onClick={() => setAdjustingRecord(rec)}
                            className="flex items-center space-x-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                          >
                             <span>{company?.currency || '$'}{((rec.bonus || 0) - (rec.deductions || rec.deduction || 0)).toLocaleString()} Adjust.</span>
                          </button>
                        </td>
                        <td className="px-8 py-6">
                          <div className="text-xs font-bold text-rose-500 italic">-{company?.currency || '$'}{(rec.taxAmount || 0).toLocaleString()}</div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="text-xs font-black text-slate-950">{company?.currency || '$'}{(rec.netSalary || rec.totalAmount).toLocaleString()}</div>
                        </td>
                        <td className="px-8 py-6">
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                            rec.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                          }`}>
                            {rec.status}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right whitespace-nowrap">
                          <div className="flex justify-end items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button
                               onClick={() => setViewingPayslip(rec)}
                               className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all border border-blue-100"
                               title="View Payslip"
                             >
                                <Eye size={16} />
                             </button>
                             <button 
                               onClick={() => updateStatus(rec.id, rec.status === 'Paid' ? 'Pending' : 'Paid')}
                               className={`p-2 rounded-xl border transition-all ${
                                 rec.status === 'Paid' ? 'bg-slate-50 border-slate-100 text-slate-400' : 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                               }`}
                               title={rec.status === 'Paid' ? 'Revoke Payment' : 'Mark as Paid'}
                             >
                                {rec.status === 'Paid' ? <X size={16} /> : <Check size={16} />}
                             </button>
                             <button 
                               onClick={() => deleteRecord(rec.id)}
                               className="p-2 bg-white border border-slate-100 text-slate-300 hover:text-rose-600 hover:border-rose-100 rounded-xl transition-all"
                             >
                                <Trash2 size={16} />
                             </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    yearlyData.map((data) => (
                      <tr key={data.employeeId} className="group hover:bg-slate-50/30 transition-colors">
                        <td className="px-8 py-6">
                          <div className="font-black text-slate-950 uppercase text-xs tracking-tight">{data.employeeName}</div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="text-xs font-bold text-slate-500">{company?.currency || '$'}{data.totalBase.toLocaleString()}</div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="inline-flex items-center space-x-2 px-3 py-1.5 bg-slate-100 rounded-lg text-[10px] font-black uppercase tracking-widest">
                             <span>{company?.currency || '$'}{(data.totalBonus - data.totalDeduction).toLocaleString()} Net Adj.</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="text-xs font-black text-slate-950">{company?.currency || '$'}{data.totalNet.toLocaleString()}</div>
                        </td>
                        <td className="px-8 py-6 text-xs text-slate-400 font-bold uppercase tracking-widest">
                          {data.months.length} Months
                        </td>
                        <td className="px-8 py-6 text-right whitespace-nowrap">
                          <button 
                            onClick={() => setShowBreakdown(data.employeeId)}
                            className="bg-slate-950 text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2.5 rounded-xl hover:bg-blue-600 transition-all flex items-center space-x-2 ml-auto"
                          >
                             <span>Breakdown</span>
                             <BarChart3 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-40">
               <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-200 border border-slate-100">
                  <Wallet size={36} />
               </div>
               <h4 className="text-slate-950 font-black italic text-xl">No Records Initialized</h4>
               <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">
                 {viewMode === 'monthly' ? 'Use Auto-Gen to create monthly payroll cycles.' : `No data found for the year ${selectedYear}.`}
               </p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {adjustingRecord && (
          <DetailAdjustmentModal 
            record={adjustingRecord} 
            company={company}
            onClose={() => setAdjustingRecord(null)} 
            onSave={async (bonus, deduction, bonusReason, deductionReason) => {
              const gross = adjustingRecord.baseSalary + bonus;
              const taxAmount = calculateTax(gross);
              const netSalary = gross - deduction - taxAmount;
              try {
                await updateDoc(doc(db, 'payroll', adjustingRecord.id), {
                  bonus,
                  bonusReason,
                  deductions: deduction,
                  deductionReason,
                  taxAmount,
                  netSalary,
                  totalAmount: gross
                });
                toast.success('Payroll adjustments applied');
                setAdjustingRecord(null);
              } catch (error) {
                toast.error('Failed to save adjustments');
              }
            }}
          />
        )}
        
        {viewingPayslip && (
          <PayslipModal
            record={viewingPayslip}
            company={company}
            onClose={() => setViewingPayslip(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function PayslipModal({ record, company, onClose }: { record: PayrollRecord, company: Company | null, onClose: () => void }) {
  const payslipRef = React.useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const downloadPDF = async () => {
    if (!payslipRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(payslipRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`payslip-${record.employeeName.replace(/\s+/g, '-').toLowerCase()}-${record.month}.pdf`);
      toast.success('Payslip downloaded');
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 40 }}
        className="relative bg-white w-full max-w-2xl max-h-[90vh] rounded-[40px] shadow-2xl overflow-hidden border border-slate-200 flex flex-col"
      >
        <div className="p-10 overflow-y-auto custom-scrollbar flex-1">
          {/* Document Content to Capture */}
          <div ref={payslipRef} className="p-8 bg-white text-slate-950">
            <div className="flex justify-between items-start border-b-4 border-slate-950 pb-8 mb-8">
              <div>
                <h1 className="text-2xl font-black italic uppercase tracking-tighter text-blue-600">{company?.name || 'Nexus Agency'}</h1>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest shrink-0">Corporate Financial Document</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black italic uppercase tracking-tighter">Payslip</p>
                <p className="text-xs font-bold text-slate-500">{format(parseISO(record.month + '-01'), 'MMMM yyyy')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-10 mb-12">
              <div className="space-y-4">
                <div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Employee Name</p>
                   <p className="text-sm font-black uppercase italic">{record.employeeName}</p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Employee ID</p>
                   <p className="text-sm font-black italic">{record.employeeId.slice(-8).toUpperCase()}</p>
                </div>
              </div>
              <div className="space-y-4 text-right">
                <div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Payment Date</p>
                   <p className="text-sm font-black italic">{record.paidAt ? format(new Date(record.paidAt), 'dd MMM yyyy') : 'Pending'}</p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Reference No</p>
                   <p className="text-sm font-black italic">{record.id.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-10">
                <div className="space-y-4">
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 pb-2">Earnings</p>
                   <div className="flex justify-between text-xs font-bold">
                     <span>Basic Salary</span>
                     <span>{company?.currency || '$'}{record.baseSalary.toLocaleString()}</span>
                   </div>
                   {record.bonus && (
                     <div className="flex justify-between text-xs font-bold text-emerald-600">
                       <span className="flex flex-col">
                         <span>Bonus</span>
                         {record.bonusReason && <span className="text-[8px] text-slate-400 uppercase">{record.bonusReason}</span>}
                       </span>
                       <span>+{company?.currency || '$'}{record.bonus.toLocaleString()}</span>
                     </div>
                   )}
                </div>
                <div className="space-y-4">
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 pb-2">Deductions</p>
                   {record.taxAmount ? (
                     <div className="flex justify-between text-xs font-bold text-rose-500">
                       <span>Income Tax</span>
                       <span>-{company?.currency || '$'}{record.taxAmount.toLocaleString()}</span>
                     </div>
                   ) : null}
                   {(record.deductions || record.deduction) ? (
                     <div className="flex justify-between text-xs font-bold text-rose-500">
                       <span className="flex flex-col">
                         <span>Other Deductions</span>
                         {record.deductionReason && <span className="text-[8px] text-slate-400 uppercase">{record.deductionReason}</span>}
                       </span>
                       <span>-{company?.currency || '$'}{(record.deductions || record.deduction || 0).toLocaleString()}</span>
                     </div>
                   ) : null}
                </div>
              </div>

              <div className="pt-8 border-t-2 border-slate-100 mt-10">
                 <div className="bg-slate-50 p-6 rounded-2xl flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Net Payable</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase mt-1 italic">Electronically Verified Document</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black italic tracking-tighter text-blue-600">{company?.currency || '$'}{(record.netSalary || record.totalAmount).toLocaleString()}</p>
                    </div>
                 </div>
              </div>
            </div>

            <div className="mt-20 pt-10 border-t border-slate-100 flex justify-between">
               <div className="text-center w-32 border-t border-slate-200 pt-2">
                 <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Employee Sign</p>
               </div>
               <div className="text-center w-32 border-t border-slate-200 pt-2">
                 <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Authority Sign</p>
               </div>
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-slate-100 flex justify-end space-x-3 bg-slate-50/50">
          <button 
            onClick={onClose}
            className="px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
          >
            Close
          </button>
          <button 
            disabled={downloading}
            onClick={downloadPDF}
            className="saas-button-primary flex items-center space-x-2 px-8 py-3 text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-500/20"
          >
            {downloading ? (
              <Clock className="animate-spin" size={16} />
            ) : (
              <Download size={16} />
            )}
            <span>{downloading ? 'Processing...' : 'Download PDF Payslip'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function YearlyBreakdownModal({ employeeId, employeeName, year, records, company, onClose }: {
  employeeId: string,
  employeeName: string,
  year: string,
  records: PayrollRecord[],
  company: Company | null,
  onClose: () => void
}) {
  const sortedRecords = [...records].sort((a, b) => a.month.localeCompare(b.month));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 40 }}
        className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-[40px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col"
      >
        <div className="p-10 flex-shrink-0 border-b border-slate-50">
          <div className="flex justify-between items-start">
            <div>
              <div className="inline-flex items-center space-x-2 text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100 mb-2">
                Annual Breakdown
              </div>
              <h2 className="text-4xl font-black font-display italic tracking-tight text-slate-950">{employeeName}</h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Fiscal Performance Strategy • {year}</p>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400 transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-10 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/30">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <PieChart size={20} className="text-blue-500 mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Salary</p>
              <p className="text-2xl font-black font-display text-slate-950">{company?.currency || '$'}{records.reduce((s, r) => s+r.baseSalary, 0).toLocaleString()}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <TrendingUp size={20} className="text-emerald-500 mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Bonuses</p>
              <p className="text-2xl font-black font-display text-emerald-600">{company?.currency || '$'}{records.reduce((s, r) => s+(r.bonus || 0), 0).toLocaleString()}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <BarChart3 size={20} className="text-rose-500 mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Deductions</p>
              <p className="text-2xl font-black font-display text-rose-600">-{company?.currency || '$'}{records.reduce((s, r) => s+(r.deduction || 0), 0).toLocaleString()}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <Shield size={20} className="text-orange-500 mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Tax</p>
              <p className="text-2xl font-black font-display text-orange-600">-{company?.currency || '$'}{records.reduce((s, r) => s+(r.taxAmount || 0), 0).toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Month</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Gross</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Bonus</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Tax</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Net Payable</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sortedRecords.map((r) => (
                  <tr key={r.id}>
                    <td className="px-6 py-4 text-xs font-black text-slate-950 uppercase">{format(parseISO(r.month + '-01'), 'MMMM')}</td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-900">{company?.currency || '$'}{r.baseSalary.toLocaleString()}</td>
                    <td className="px-6 py-4 text-xs font-bold text-emerald-600">+{company?.currency || '$'}{(r.bonus || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-xs font-bold text-orange-600">-{company?.currency || '$'}{(r.taxAmount || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-xs font-black text-blue-600">{company?.currency || '$'}{(r.netSalary || r.totalAmount).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-black uppercase tracking-widest ${r.status === 'Paid' ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function DetailAdjustmentModal({ record, company, onClose, onSave }: { 
  record: PayrollRecord, 
  company: Company | null,
  onClose: () => void, 
  onSave: (bonus: number, deduction: number, bonusReason?: string, deductionReason?: string) => void 
}) {
  const [bonus, setBonus] = useState(record.bonus || 0);
  const [bonusReason, setBonusReason] = useState(record.bonusReason || '');
  const [deduction, setDeduction] = useState(record.deductions || record.deduction || 0);
  const [deductionReason, setDeductionReason] = useState(record.deductionReason || '');

  const gross = record.baseSalary + bonus;
  const tax = calculateTax(gross);
  const total = gross - deduction - tax;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden border border-slate-100"
      >
        <div className="p-10">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-3xl font-black font-display italic tracking-tight text-slate-950">Adjust Payroll</h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">{record.employeeName} • {record.month}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-8">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Base Salary</span>
              <span className="text-xl font-black text-slate-900 font-display">{company?.currency || '$'}{record.baseSalary.toLocaleString()}</span>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Performance Bonus</label>
                <div className="relative">
                  <DollarSign size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" />
                  <input 
                    type="number"
                    value={bonus}
                    onChange={(e) => setBonus(Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-4 bg-emerald-50/50 border-2 border-transparent focus:border-emerald-200 outline-none rounded-2xl font-black text-sm text-emerald-700 transition-all"
                    placeholder="0"
                  />
                </div>
                <input 
                  type="text"
                  value={bonusReason}
                  onChange={(e) => setBonusReason(e.target.value)}
                  placeholder="Reason (e.g. Sales Commission)"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-medium outline-none mt-2"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Deductions</label>
                <div className="relative">
                  <DollarSign size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-500" />
                  <input 
                    type="number"
                    value={deduction}
                    onChange={(e) => setDeduction(Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-4 bg-rose-50/50 border-2 border-transparent focus:border-rose-200 outline-none rounded-2xl font-black text-sm text-rose-700 transition-all"
                    placeholder="0"
                  />
                </div>
                <input 
                  type="text"
                  value={deductionReason}
                  onChange={(e) => setDeductionReason(e.target.value)}
                  placeholder="Reason (e.g. Unpaid Leave)"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-medium outline-none mt-2"
                />
              </div>
            </div>

            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex justify-between items-center text-blue-600">
               <div>
                 <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Projected Income Tax</p>
                 <p className="text-xl font-black italic">-{company?.currency || '$'}{tax.toLocaleString()}</p>
               </div>
               <Shield size={24} className="opacity-40" />
            </div>

            <div className="bg-slate-950 p-8 rounded-[32px] text-white flex justify-between items-center shadow-xl shadow-blue-500/10">
              <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Net Payable</p>
                <h3 className="text-3xl font-black font-display italic tracking-tighter text-blue-400">{company?.currency || '$'}{total.toLocaleString()}</h3>
              </div>
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-blue-400">
                <Wallet size={24} />
              </div>
            </div>

            <button 
              onClick={() => onSave(bonus, deduction, bonusReason, deductionReason)}
              className="w-full bg-slate-950 text-white p-5 rounded-[24px] font-black hover:bg-slate-900 transition-all flex items-center justify-center space-x-3 text-lg"
            >
              <span>Apply Adjustments</span>
              <Check size={20} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
