import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  doc, onSnapshot, updateDoc, collection, query, where, addDoc, serverTimestamp 
} from 'firebase/firestore';
import { 
  User, Mail, Phone, Calendar, Briefcase, MapPin, 
  CreditCard, ShieldCheck, TrendingUp, FileText, 
  Upload, ChevronLeft, Save, Plus, Trash2, Download,
  ExternalLink, Lock, X, FileSpreadsheet
} from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../App';
import { UserProfile, BankDetails, GovernmentId, SalaryHike, EmployeeDocument } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { logActivity } from '../services/activityService';
import { useNotifications } from '../contexts/NotificationContext';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function EmployeeProfilePage() {
  const { employeeId } = useParams();
  const { user, company } = useAuth();
  const { sendNotification } = useNotifications();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<UserProfile | null>(null);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'sensitive' | 'salary' | 'docs'>('profile');
  const [showEditSensitive, setShowEditSensitive] = useState(false);
  const [showHikeModal, setShowHikeModal] = useState(false);
  const [hikeForm, setHikeForm] = useState({
    amount: 0,
    reason: ''
  });
  const [editData, setEditData] = useState({
    bankDetails: {
      accountName: '',
      accountNumber: '',
      bankName: '',
      ifscCode: '',
      branchName: ''
    },
    governmentId: {
      type: 'Aadhar' as any,
      number: ''
    }
  });

  // Permissions
  const canManage = user?.role === 'admin' || user?.role === 'manager';
  const isOwnProfile = user?.uid === employeeId;
  const canSeeSensitive = canManage || isOwnProfile;

  useEffect(() => {
    if (!employeeId) return;

    const unsubEmployee = onSnapshot(doc(db, 'users', employeeId), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        setEmployee({ uid: snap.id, ...data } as UserProfile);
        setEditData({
          bankDetails: data.bankDetails || {
            accountName: '',
            accountNumber: '',
            bankName: '',
            ifscCode: '',
            branchName: ''
          },
          governmentId: data.governmentId || {
            type: 'Aadhar',
            number: ''
          }
        });
      }
      setLoading(false);
    });

    let unsubDocs = () => {};
    if (canSeeSensitive) {
      const docsQ = query(
        collection(db, 'employeeDocuments'),
        where('employeeId', '==', employeeId)
      );

      unsubDocs = onSnapshot(docsQ, (snap) => {
        setDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() } as EmployeeDocument)));
      });
    }

    return () => {
      unsubEmployee();
      unsubDocs();
    };
  }, [employeeId]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!employeeId) return;
    try {
      await updateDoc(doc(db, 'users', employeeId), updates);
      
      await sendNotification({
        userId: employeeId,
        type: 'profile_update',
        title: 'Registry Updated',
        message: 'Your personal security profile has been updated in the Nexus database.',
        link: `/profile/${employeeId}`
      });

      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handleSaveSensitive = async () => {
    await updateProfile({
      bankDetails: editData.bankDetails,
      governmentId: editData.governmentId
    });
    setShowEditSensitive(false);
  };

  const handleAddHike = async () => {
    if (!employee || !user || !canManage) return;
    
    const amount = hikeForm.amount;
    const reason = hikeForm.reason || 'Annual Appraisal';
    
    if (amount <= 0) {
      toast.error('Invalid increment amount');
      return;
    }

    const previousSalary = employee.salary || 0;
    const newSalary = previousSalary + amount;
    
    const isAutoApproved = user.role === 'admin';

    const hike: SalaryHike = {
      id: Math.random().toString(36).substring(2, 10),
      amount,
      date: new Date().toISOString(),
      reason,
      previousSalary,
      newSalary,
      status: isAutoApproved ? 'approved' : 'pending',
      proposedBy: user.uid,
      proposedByName: user.name,
      createdAt: new Date().toISOString()
    };

    if (isAutoApproved) {
      hike.approvedBy = user.uid;
      hike.approvedByName = user.name;
    }
    
    try {
      const updates: any = {
        salaryHistory: [hike, ...(employee.salaryHistory || [])]
      };

      if (isAutoApproved) {
        updates.salary = newSalary;
      }

      await updateDoc(doc(db, 'users', employee.uid), updates);
      
      if (isAutoApproved) {
        logActivity(user, 'SALARY_CHANGE', `Applied salary hike of ${company?.currency || '$'}${amount.toLocaleString()} for ${employee.name}`, employee.uid, employee.name);
        await sendNotification({
          userId: employee.uid,
          type: 'salary_update',
          title: 'Compensation Adjusted',
          message: `Your operational stipend has been increased by ${company?.currency || '$'}${amount.toLocaleString()}. Effective immediately.`,
          link: '/profile'
        });
        toast.success('Salary hike applied successfully');
      } else {
        logActivity(user, 'SALARY_CHANGE', `Proposed salary hike of ${company?.currency || '$'}${amount.toLocaleString()} for ${employee.name}. Awaiting approval.`, employee.uid, employee.name);
        
        // Notify admins about the proposal
        await sendNotification({
          userId: company?.id || '', // Notify company node (admin notification logic)
          type: 'admin_alert',
          title: 'Hike Authorization Required',
          message: `A salary adjustment of ${company?.currency || '$'}${amount.toLocaleString()} has been proposed for ${employee.name}.`,
          link: `/employees/${employee.uid}`
        });

        toast.success('Hike proposal submitted for admin review');
      }
      
      setShowHikeModal(false);
      setHikeForm({ amount: 0, reason: '' });
    } catch (error) {
      console.error('Error adding hike:', error);
      toast.error('Failed to submit hike request');
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !employeeId || !user) return;
    const file = e.target.files[0];
    
    // In a real app, you'd upload to Firebase Storage
    // For this demo, we'll simulate a URL
    const simulatedUrl = `https://generated-doc-url.com/${file.name}`;
    
    try {
      await addDoc(collection(db, 'employeeDocuments'), {
        companyId: user.companyId,
        employeeId: employeeId,
        name: file.name,
        type: 'Other',
        fileUrl: simulatedUrl,
        uploadedAt: new Date().toISOString()
      });
      toast.success('Document uploaded');
    } catch (error) {
      console.error('Error uploading doc:', error);
      toast.error('Upload failed');
    }
  };

  const handleExportExcel = () => {
    if (!employee) return;
    try {
      const exportData = [{
        'Member ID': employee.memberId || 'N/A',
        'Name': employee.name,
        'Email': employee.email,
        'Role': employee.role,
        'Department': employee.department || 'N/A',
        'Phone': employee.phone || 'N/A',
        'Joining Date': employee.joiningDate || 'N/A',
        'Salary': canSeeSensitive && employee.salary ? `${company?.currency || '$'}${employee.salary.toLocaleString()}` : 'REDACTED',
        'Status': employee.status || 'Active'
      }];

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Employee_Profile');
      XLSX.writeFile(wb, `Profile_${employee.name.replace(/\s+/g, '_')}.xlsx`);
      
      logActivity(user!, 'DATA_EXPORT', `Exported individual profile for ${employee.name} to Excel`);
      toast.success('Profile exported to Excel');
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const handleExportPDF = () => {
    if (!employee) return;
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text('Employee Profile Report', 14, 25);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Nexus Internal Document - Generated: ${format(new Date(), 'PPP p')}`, 14, 32);
      
      const basicData = [
        ['Full Name', employee.name],
        ['Member ID', employee.memberId || 'N/A'],
        ['Email Address', employee.email],
        ['Role / Clearance', employee.role.toUpperCase()],
        ['Department', employee.department || 'N/A'],
        ['Joining Date', employee.joiningDate || 'N/A'],
        ['Contact Phone', employee.phone || 'N/A'],
        ['Current Status', employee.status || 'Active'],
      ];

      if (canSeeSensitive && employee.salary) {
        basicData.push(['Annual Salary', `${company?.currency || '$'}${employee.salary.toLocaleString()}`]);
      }

      (doc as any).autoTable({
        startY: 40,
        head: [['Field', 'Information']],
        body: basicData,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: 255 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 }, 1: { cellWidth: 'auto' } }
      });

      if (canSeeSensitive && employee.bankDetails?.accountNumber) {
        doc.setFontSize(12);
        doc.text('Confidential Payment Vectors (Redacted)', 14, (doc as any).lastAutoTable.finalY + 15);
        
        const bankData = [
          ['Account Name', employee.bankDetails.accountName],
          ['Bank Name', employee.bankDetails.bankName],
          ['IFSC Code', employee.bankDetails.ifscCode],
          ['Account Number', '****' + employee.bankDetails.accountNumber.slice(-4)]
        ];

        (doc as any).autoTable({
          startY: (doc as any).lastAutoTable.finalY + 20,
          head: [['Vector', 'Configuration']],
          body: bankData,
          theme: 'plain',
          headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] }
        });
      }

      doc.save(`Profile_${employee.name.replace(/\s+/g, '_')}.pdf`);
      logActivity(user!, 'DATA_EXPORT', `Exported individual profile for ${employee.name} to PDF`);
      toast.success('Profile exported to PDF');
    } catch (error) {
      console.error(error);
      toast.error('PDF export failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-slate-900">Employee not found</h2>
        <button onClick={() => navigate('/employees')} className="mt-4 text-brand-primary hover:underline">
          Back to list
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-6xl mx-auto dark:bg-dark-bg transition-colors">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/employees')}
            className="p-2 text-slate-500 dark:text-dark-text-muted hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-surface rounded-xl transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black font-display tracking-tight text-slate-900 dark:text-white">
              Employee Profile
            </h1>
            <p className="text-slate-500 dark:text-dark-text-muted text-sm">Managing details for {employee.name}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex bg-slate-100 dark:bg-dark-surface p-1 rounded-2xl border border-slate-200 dark:border-dark-border shadow-sm">
            <button 
              onClick={handleExportExcel}
              className="p-2.5 hover:bg-white dark:hover:bg-dark-bg text-slate-400 dark:text-dark-text-muted hover:text-emerald-600 rounded-xl transition-all group"
              title="Extract Dossier to Excel"
            >
              <FileSpreadsheet size={18} className="group-hover:scale-110 transition-all" />
            </button>
            <button 
              onClick={handleExportPDF}
              className="p-2.5 hover:bg-white dark:hover:bg-dark-bg text-slate-400 dark:text-dark-text-muted hover:text-rose-600 rounded-xl transition-all group"
              title="Extract Dossier to PDF"
            >
              <FileText size={18} className="group-hover:scale-110 transition-all" />
            </button>
          </div>

          <button
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center space-x-2 ${
              activeTab === 'profile' ? 'bg-slate-950 dark:bg-indigo-600 text-white shadow-xl shadow-slate-200 dark:shadow-none transition-all' : 'bg-white dark:bg-dark-surface text-slate-400 dark:text-dark-text-muted border border-slate-100 dark:border-dark-border hover:bg-slate-50 dark:hover:bg-dark-bg'
            }`}
          >
            <User size={14} />
            <span className="hidden sm:inline">Active Dossier</span>
          </button>
        </div>
      </div>

      {/* Main Info Card */}
      <div className="bg-white dark:bg-dark-surface rounded-3xl border border-slate-200/60 dark:border-dark-border shadow-sm overflow-hidden transition-colors">
        <div className="p-6 md:p-8 bg-slate-50 dark:bg-dark-bg/50 border-b border-slate-200/60 dark:border-dark-border">
          <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-8">
            <div className="relative group">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-brand-primary/10 dark:bg-indigo-500/10 flex items-center justify-center overflow-hidden border-4 border-white dark:border-dark-surface shadow-xl">
                {employee.photoURL ? (
                  <img src={employee.photoURL} alt={employee.name} className="w-full h-full object-cover" />
                ) : (
                  <User size={48} className="text-brand-primary dark:text-indigo-400" />
                )}
              </div>
              {canManage && (
                <button className="absolute -bottom-2 -right-2 p-2 bg-white dark:bg-dark-bg rounded-xl border border-slate-200 dark:border-dark-border shadow-lg text-slate-500 dark:text-dark-text-muted hover:text-brand-primary dark:hover:text-indigo-400 transition-colors">
                  <Upload size={16} />
                </button>
              )}
            </div>
            <div className="text-center md:text-left flex-1">
              <h2 className="text-3xl font-black font-display text-slate-900 dark:text-white leading-tight">
                {employee.name}
              </h2>
              <p className="text-brand-primary dark:text-indigo-400 font-bold text-sm tracking-widest uppercase mt-1">
                {employee.role.replace('_', ' ')} • {employee.department}
              </p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4">
                <span className={`px-4 py-1.5 rounded-full text-xs font-bold leading-none ${
                  employee.status === 'Active' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' :
                  employee.status === 'On Leave' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600' :
                  'bg-slate-100 dark:bg-dark-bg text-slate-600 dark:text-dark-text-muted'
                }`}>
                  {employee.status}
                </span>
                <span className="flex items-center text-slate-500 dark:text-dark-text-muted text-sm">
                  <Calendar size={14} className="mr-1.5" />
                  Joined {employee.joiningDate ? format(new Date(employee.joiningDate), 'MMM yyyy') : 'N/A'}
                </span>
                <span className="flex items-center text-slate-500 dark:text-dark-text-muted text-sm">
                  <Briefcase size={14} className="mr-1.5" />
                  ID: {employee.memberId}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-slate-200/60 dark:border-dark-border px-4 pt-4 bg-white dark:bg-dark-surface scrollbar-hide transition-colors">
          <TabHeader active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} label="General" icon={User} />
          {canSeeSensitive && (
            <TabHeader active={activeTab === 'sensitive'} onClick={() => setActiveTab('sensitive')} label="Sensitive Details" icon={ShieldCheck} />
          )}
          {canSeeSensitive && (
            <TabHeader active={activeTab === 'salary'} onClick={() => setActiveTab('salary')} label="Salary History" icon={TrendingUp} />
          )}
          <TabHeader active={activeTab === 'docs'} onClick={() => setActiveTab('docs')} label="Documents" icon={FileText} />
        </div>

        <div className="p-6 md:p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8"
              >
                <div className="space-y-6">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center">
                    <Mail size={18} className="mr-2 text-brand-primary dark:text-indigo-400" /> Contact Information
                  </h3>
                  <div className="space-y-4">
                    <InfoField label="Email Address" value={employee.email} />
                    <InfoField label="Phone Number" value={employee.phone || 'Not provided'} />
                    <InfoField label="Residential Address" value={employee.address || 'Not provided'} />
                  </div>
                </div>
                <div className="space-y-6">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center">
                    <User size={18} className="mr-2 text-brand-primary dark:text-indigo-400" /> Emergency Contact
                  </h3>
                  <div className="space-y-4 p-4 bg-slate-50 dark:bg-dark-bg/50 rounded-2xl border border-slate-200/60 dark:border-dark-border">
                    <InfoField label="Name" value={employee.emergencyContact?.name || 'N/A'} />
                    <InfoField label="Relation" value={employee.emergencyContact?.relation || 'N/A'} />
                    <InfoField label="Phone" value={employee.emergencyContact?.phone || 'N/A'} />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'sensitive' && canSeeSensitive && (
              <motion.div
                key="sensitive"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8"
              >
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center">
                      <CreditCard size={18} className="mr-2 text-brand-primary dark:text-indigo-400" /> Bank Details
                    </h3>
                    {canManage && (
                      <button 
                        onClick={() => setShowEditSensitive(true)}
                        className="text-xs font-bold text-brand-primary dark:text-indigo-400 hover:underline"
                      >
                        Edit Details
                      </button>
                    )}
                  </div>
                  <div className="space-y-4 p-4 bg-slate-50 dark:bg-dark-bg/50 rounded-2xl border border-slate-200/60 dark:border-dark-border relative">
                    {!isOwnProfile && !canManage && (
                      <div className="absolute inset-0 bg-slate-50/80 dark:bg-dark-bg/80 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-2xl z-10">
                        <Lock size={24} className="text-slate-400 dark:text-dark-text-muted mb-2" />
                        <p className="text-xs font-bold text-slate-500 dark:text-dark-text-muted">Restricted Access</p>
                      </div>
                    )}
                    <InfoField label="Account Holder" value={employee.bankDetails?.accountName || 'N/A'} />
                    <InfoField label="Bank Name" value={employee.bankDetails?.bankName || 'N/A'} />
                    <InfoField label="Account Number" value={employee.bankDetails?.accountNumber || '••••••••••••'} />
                    <InfoField label="IFSC Code" value={employee.bankDetails?.ifscCode || 'N/A'} />
                  </div>
                </div>
                <div className="space-y-6">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center">
                    <ShieldCheck size={18} className="mr-2 text-brand-primary dark:text-indigo-400" /> Identification
                  </h3>
                  <div className="space-y-4 p-4 bg-slate-50 dark:bg-dark-bg/50 rounded-2xl border border-slate-200/60 dark:border-dark-border">
                    <InfoField label="ID Type" value={employee.governmentId?.type || 'N/A'} />
                    <InfoField label="ID Number" value={employee.governmentId?.number || '••••••••••••'} />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'salary' && canSeeSensitive && (
              <motion.div
                key="salary"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center">
                    <TrendingUp size={18} className="mr-2 text-brand-primary dark:text-indigo-400" /> Salary History & Proposals
                  </h3>
                  {canManage && (
                    <button 
                      onClick={() => setShowHikeModal(true)}
                      className="flex items-center space-x-2 text-sm font-bold bg-slate-950 dark:bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-brand-primary transition-all shadow-lg shadow-slate-200 dark:shadow-indigo-500/10"
                    >
                      <Plus size={16} />
                      <span>Propose Hike</span>
                    </button>
                  )}
                </div>
                <div className="border border-slate-200/60 dark:border-dark-border rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-dark-bg/50 border-b border-slate-200/60 dark:border-dark-border text-[10px] font-bold text-slate-400 dark:text-dark-text-muted uppercase tracking-widest">
                      <tr>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Effective Date</th>
                        <th className="px-6 py-4">Justification</th>
                        <th className="px-6 py-4">Previous</th>
                        <th className="px-6 py-4">Increment</th>
                        <th className="px-6 py-4 text-brand-primary dark:text-indigo-400">Projected</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-dark-border">
                      {(employee.salaryHistory || []).length > 0 ? (
                        employee.salaryHistory?.map((hike) => (
                          <tr key={hike.id} className="hover:bg-slate-50 dark:hover:bg-dark-bg transition-colors group">
                            <td className="px-6 py-4">
                              <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded inline-block ${
                                hike.status === 'pending' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' : 
                                hike.status === 'rejected' ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400' : 
                                'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                              }`}>
                                {hike.status || 'Approved'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-900 dark:text-white font-medium">
                              {format(new Date(hike.date), 'dd MMM yyyy')}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-dark-text-muted max-w-xs">{hike.reason}</td>
                            <td className="px-6 py-4 text-sm text-slate-400 dark:text-dark-text-muted line-through">
                              {company?.currency || '$'}{hike.previousSalary.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-sm text-emerald-600 dark:text-emerald-400 font-black">
                              +{company?.currency || '$'}{hike.amount.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-950 dark:text-white font-black">
                              {company?.currency || '$'}{hike.newSalary.toLocaleString()}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-slate-400 dark:text-dark-text-muted italic font-medium">
                            No compensation evolution recorded for this operative.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'docs' && (
              <motion.div
                key="docs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center">
                    <FileText size={18} className="mr-2 text-brand-primary dark:text-indigo-400" /> Employee Documents
                  </h3>
                  {canSeeSensitive && (
                    <label className="flex items-center space-x-2 text-sm font-bold bg-brand-primary dark:bg-indigo-600 text-white px-4 py-2 rounded-xl hover:shadow-lg hover:scale-[1.02] cursor-pointer transition-all active:scale-[0.98]">
                      <Upload size={16} />
                      <span>Upload Document</span>
                      <input type="file" className="hidden" onChange={handleDocumentUpload} />
                    </label>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {documents.length > 0 ? (
                    documents.map((doc) => (
                      <div key={doc.id} className="p-4 bg-white dark:bg-dark-surface border border-slate-200/60 dark:border-dark-border rounded-2xl flex items-center justify-between hover:shadow-md transition-all group">
                        <div className="flex items-center space-x-3">
                          <div className="p-2.5 bg-brand-primary/10 dark:bg-indigo-500/10 rounded-xl transition-colors">
                            <FileText size={20} className="text-brand-primary dark:text-indigo-400" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-sm truncate max-w-[150px]">{doc.name}</p>
                            <p className="text-[10px] text-slate-400 dark:text-dark-text-muted uppercase tracking-widest">{doc.type}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 text-slate-400 dark:text-dark-text-muted hover:text-brand-primary dark:hover:text-indigo-400 rounded-lg hover:bg-brand-primary/5">
                            <Download size={16} />
                          </button>
                          {canManage && (
                            <button className="p-2 text-slate-400 dark:text-dark-text-muted hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400 dark:text-dark-text-muted border-2 border-dashed border-slate-100 dark:border-dark-border rounded-3xl">
                      <FileText size={48} className="mb-4 opacity-20" />
                      <p className="text-sm">No documents uploaded yet.</p>
                      <p className="text-xs mt-1">Upload ID proofs, contracts, or offer letters.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Edit Sensitive Data Modal */}
      <AnimatePresence>
        {showEditSensitive && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditSensitive(false)}
              className="absolute inset-0 bg-slate-900/60 dark:bg-dark-bg/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-dark-surface rounded-[32px] shadow-2xl overflow-hidden transition-colors"
            >
              <div className="p-8 border-b border-slate-100 dark:border-dark-border flex justify-between items-center bg-slate-50/50 dark:bg-dark-bg/50">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">Edit Sensitive Data</h2>
                  <p className="text-slate-500 dark:text-dark-text-muted text-sm">Update banking and identification records</p>
                </div>
                <button onClick={() => setShowEditSensitive(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-dark-bg rounded-xl transition-colors">
                  <X size={20} className="text-slate-400 dark:text-dark-text-muted" />
                </button>
              </div>
              
              <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-8">
                {/* Bank Details Section */}
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-brand-primary dark:text-indigo-400 uppercase tracking-[0.2em] mb-4">Bank Information</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-dark-text-muted uppercase tracking-widest ml-1">Account Holder Name</label>
                      <input
                        type="text"
                        className="saas-input"
                        value={editData.bankDetails.accountName}
                        onChange={(e) => setEditData({ ...editData, bankDetails: { ...editData.bankDetails, accountName: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-dark-text-muted uppercase tracking-widest ml-1">Bank Name</label>
                      <input
                        type="text"
                        className="saas-input"
                        value={editData.bankDetails.bankName}
                        onChange={(e) => setEditData({ ...editData, bankDetails: { ...editData.bankDetails, bankName: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-dark-text-muted uppercase tracking-widest ml-1">Account Number</label>
                      <input
                        type="text"
                        className="saas-input"
                        value={editData.bankDetails.accountNumber}
                        onChange={(e) => setEditData({ ...editData, bankDetails: { ...editData.bankDetails, accountNumber: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-dark-text-muted uppercase tracking-widest ml-1">IFSC Code</label>
                      <input
                        type="text"
                        className="saas-input"
                        value={editData.bankDetails.ifscCode}
                        onChange={(e) => setEditData({ ...editData, bankDetails: { ...editData.bankDetails, ifscCode: e.target.value } })}
                      />
                    </div>
                  </div>
                </div>

                {/* Gov ID Section */}
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-brand-primary dark:text-indigo-400 uppercase tracking-[0.2em] mb-4">Identification</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-dark-text-muted uppercase tracking-widest ml-1">ID Type</label>
                      <select 
                        className="saas-input pr-10"
                        value={editData.governmentId.type}
                        onChange={(e) => setEditData({ ...editData, governmentId: { ...editData.governmentId, type: e.target.value as any } })}
                      >
                        <option value="Aadhar" className="dark:bg-dark-surface">Aadhar</option>
                        <option value="PAN" className="dark:bg-dark-surface">PAN</option>
                        <option value="Passport" className="dark:bg-dark-surface">Passport</option>
                        <option value="Voter ID" className="dark:bg-dark-surface">Voter ID</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-dark-text-muted uppercase tracking-widest ml-1">ID Number</label>
                      <input
                        type="text"
                        className="saas-input"
                        value={editData.governmentId.number}
                        onChange={(e) => setEditData({ ...editData, governmentId: { ...editData.governmentId, number: e.target.value } })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-slate-100 dark:border-dark-border flex justify-end space-x-3 bg-slate-50/50 dark:bg-dark-bg/50">
                <button
                  onClick={() => setShowEditSensitive(false)}
                  className="px-6 py-2 text-sm font-bold text-slate-500 dark:text-dark-text-muted hover:text-slate-700 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSensitive}
                  className="saas-button-primary px-8 py-2 text-sm"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hike Proposal Modal */}
      <AnimatePresence>
        {showHikeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHikeModal(false)}
              className="absolute inset-0 bg-slate-900/60 dark:bg-dark-bg/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-dark-surface rounded-[40px] shadow-2xl overflow-hidden p-10 transition-colors"
            >
              <div className="mb-8">
                <h3 className="text-3xl font-black text-slate-950 dark:text-white font-display italic leading-none mb-2">Propose Adjustment</h3>
                <p className="text-slate-500 dark:text-dark-text-muted text-sm">Compensation vectors for {employee?.name}</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-dark-text-muted uppercase tracking-[0.2em] mb-3 px-1">Increment Amount ({company?.currency || '$'})</label>
                  <input
                    type="number"
                    className="w-full p-5 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-3xl outline-none focus:ring-4 focus:ring-brand-primary/10 dark:focus:ring-indigo-500/10 transition-all font-black text-slate-900 dark:text-white"
                    value={hikeForm.amount}
                    onChange={(e) => setHikeForm({ ...hikeForm, amount: Number(e.target.value) })}
                    placeholder="e.g. 5000"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-dark-text-muted uppercase tracking-[0.2em] mb-3 px-1">Justification Reason</label>
                  <textarea
                    className="w-full p-5 bg-slate-50 dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-3xl outline-none focus:ring-4 focus:ring-brand-primary/10 dark:focus:ring-indigo-500/10 transition-all text-sm font-medium h-32 resize-none text-slate-900 dark:text-white"
                    value={hikeForm.reason}
                    onChange={(e) => setHikeForm({ ...hikeForm, reason: e.target.value })}
                    placeholder="Describe performance merits..."
                  />
                </div>
                
                <div className="flex bg-blue-50 dark:bg-blue-500/10 p-6 rounded-3xl border border-blue-100 dark:border-blue-500/20 items-center space-x-4">
                  <div className="p-3 bg-blue-500 rounded-2xl text-white">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">New Projected Salary</p>
                    <p className="text-2xl font-black text-slate-950 dark:text-white italic">
                      {company?.currency || '$'}{((employee?.salary || 0) + hikeForm.amount).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <button
                    onClick={() => setShowHikeModal(false)}
                    className="py-5 rounded-3xl font-black text-xs uppercase tracking-widest text-slate-500 dark:text-dark-text-muted hover:text-slate-950 dark:hover:text-white transition-all"
                  >
                    Abort
                  </button>
                  <button
                    onClick={handleAddHike}
                    className="bg-slate-950 dark:bg-indigo-600 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-brand-primary dark:hover:bg-indigo-700 transition-all shadow-xl shadow-slate-200 dark:shadow-none"
                  >
                    Submit Proposal
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabHeader({ active, onClick, label, icon: Icon }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-2 px-6 py-4 border-b-2 transition-all whitespace-nowrap ${
        active 
          ? 'border-brand-primary text-brand-primary dark:text-indigo-400 font-bold' 
          : 'border-transparent text-slate-400 dark:text-dark-text-muted hover:text-slate-600 dark:hover:text-white font-medium'
      }`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 dark:text-dark-text-muted uppercase tracking-widest mb-1">{label}</p>
      <p className="text-slate-900 dark:text-white font-medium truncate">{value}</p>
    </div>
  );
}
