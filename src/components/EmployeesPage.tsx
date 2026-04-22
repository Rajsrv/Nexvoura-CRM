import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDocs } from 'firebase/firestore';
import { UserProfile, Invite, AccessRequest, UserRole, Company, Department, EmployeeStatus, Lead } from '../types';
import { Plus, Trash2, Mail, Shield, User as UserIcon, Check, X, Copy, Globe, Edit2, Phone, Briefcase, Calendar as CalendarIcon, DollarSign, TrendingUp, Users, Search, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { logActivity } from '../services/activityService';
import { sendNotification } from '../services/notificationService';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export default function EmployeesPage({ user, company }: { user: UserProfile, company: Company | null }) {
  const navigate = useNavigate();
  const [team, setTeam] = useState<UserProfile[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'members' | 'invites'>('members');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [addMethod, setAddMethod] = useState<'invite' | 'manual'>('invite');
  const [editingMember, setEditingMember] = useState<UserProfile | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('sales');
  
  // Controlled form state for manual entry
  const [manualEntry, setManualEntry] = useState({
    name: '',
    email: '',
    role: 'sales' as UserRole,
    department: 'Sales' as Department,
    phone: '',
    joiningDate: format(new Date(), 'yyyy-MM-dd'),
    shiftId: '',
    salary: 50000
  });

  // Controlled form state for editing
  const [editedValues, setEditedValues] = useState({
    name: '',
    role: 'sales' as UserRole,
    department: 'Sales' as Department,
    phone: '',
    status: 'Active' as EmployeeStatus,
    joiningDate: '',
    shiftId: '',
    salary: 0
  });

  const [loading, setLoading] = useState(false);

  const [viewingMember, setViewingMember] = useState<UserProfile | null>(null);

  const isAdmin = user.role === 'admin';
  const isManager = user.role === 'manager';
  const canManage = isAdmin || isManager;

  const roleHierarchy: Record<UserRole, number> = {
    'admin': 4,
    'manager': 3,
    'team_lead': 2,
    'sales': 1
  };

  useEffect(() => {
    if (!user.companyId) return;

    // Fetch shifts for assignment
    const shiftsQ = query(collection(db, 'shifts'), where('companyId', '==', user.companyId));
    const unsubShifts = onSnapshot(shiftsQ, (snap) => {
      setShifts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    if (user.role === 'sales') {
      // Sales only sees themselves
      const teamQ = query(collection(db, 'users'), where('uid', '==', user.uid));
      const leadsQ = query(collection(db, 'leads'), where('assignedTo', '==', user.uid));
      
      const unsubTeam = onSnapshot(teamQ, (snap) => {
        const userData = snap.docs[0]?.data() as UserProfile | undefined;
        setTeam(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
      });

      const unsubLeads = onSnapshot(leadsQ, (snap) => {
        setLeads(snap.docs.map(d => ({ id: d.id, ...d.data() } as Lead)));
      });

      return () => {
        unsubShifts();
        unsubTeam();
        unsubLeads();
      };
    } else {
      // Admin/Manager sees everyone
      const teamQ = query(collection(db, 'users'), where('companyId', '==', user.companyId));
      const inviteQ = query(collection(db, 'invites'), where('companyId', '==', user.companyId), where('status', '==', 'pending'));
      const requestsQ = query(collection(db, 'accessRequests'), where('companyId', '==', user.companyId), where('status', '==', 'pending'));
      const leadsQ = query(collection(db, 'leads'), where('companyId', '==', user.companyId));

      const unsubTeam = onSnapshot(teamQ, (snap) => {
        setTeam(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
      });

      const unsubInvites = onSnapshot(inviteQ, (snap) => {
        setInvites(snap.docs.map(d => ({ id: d.id, ...d.data() } as Invite)));
      });

      const unsubRequests = onSnapshot(requestsQ, (snap) => {
        setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as AccessRequest)));
      });

      const unsubLeads = onSnapshot(leadsQ, (snap) => {
        setLeads(snap.docs.map(d => ({ id: d.id, ...d.data() } as Lead)));
      });

      return () => {
        unsubShifts();
        unsubTeam();
        unsubInvites();
        unsubRequests();
        unsubLeads();
      };
    }
  }, [user.companyId, user.uid, user.role]);

  useEffect(() => {
    if (editingMember) {
      setEditedValues({
        name: editingMember.name || '',
        role: editingMember.role || 'sales',
        department: editingMember.department || 'Sales',
        phone: editingMember.phone || '',
        status: editingMember.status || 'Active',
        joiningDate: editingMember.joiningDate || '',
        shiftId: editingMember.shiftId || '',
        salary: editingMember.salary || 0
      });
    }
  }, [editingMember]);

  const getStatsForUser = (userId: string) => {
    const userLeads = leads.filter(l => l.assignedTo === userId);
    const converted = userLeads.filter(l => l.status === 'Converted').length;
    const rate = userLeads.length > 0 ? (converted / userLeads.length) * 100 : 0;
    return { count: userLeads.length, rate: Math.round(rate) };
  };

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.companyId || !user.uid) return;
    setLoading(true);
    try {
      const { name, email, role, department, phone, salary, joiningDate, shiftId } = manualEntry;

      // Check if email already exists
      const emailCheck = query(collection(db, 'users'), where('email', '==', email));
      const emailSnap = await getDocs(emailCheck);
      if (!emailSnap.empty) {
        toast.error('Identity already exists in system');
        return;
      }

      const tempId = Math.random().toString(36).substring(2, 9).toUpperCase();
      const memberId = `EMP-${new Date().getFullYear()}-${tempId}`;

      const newUser: Partial<UserProfile> = {
        name,
        email,
        role,
        companyId: user.companyId,
        department,
        phone,
        salary,
        joiningDate,
        shiftId,
        memberId,
        status: isAdmin ? 'Active' : 'Pending Approval',
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'users'), newUser);
      await updateDoc(docRef, { uid: docRef.id });

      logActivity(user, 'EMPLOYEE_EDIT', `Manually created personnel record for ${name} (${isAdmin ? 'Active' : 'Pending Approval'})`, docRef.id, name);
      toast.success(isAdmin ? `Employee ${name} added directly to Nexus` : `Employee ${name} recorded. Awaiting admin approval.`);
      setShowInviteModal(false);
      setManualEntry({
        name: '',
        email: '',
        role: 'sales',
        department: 'Sales',
        phone: '',
        joiningDate: format(new Date(), 'yyyy-MM-dd'),
        shiftId: '',
        salary: 50000
      });
    } catch (error) {
      console.error(error);
      toast.error('Direct entry sequence failed');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48);

      await addDoc(collection(db, 'invites'), {
        companyId: user.companyId,
        email: inviteEmail,
        role: inviteRole,
        token,
        expiresAt: expiresAt.toISOString(),
        status: 'pending'
      });

      logActivity(user, 'EMPLOYEE_EDIT', `Transmitted access invitation to ${inviteEmail}`, undefined, inviteEmail);
      toast.success(`Invite sent to ${inviteEmail}`);
      setShowInviteModal(false);
      setInviteEmail('');
    } catch (error) {
      console.error(error);
      toast.error('Failed to send invite.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (request: AccessRequest, approve: boolean) => {
    try {
      if (approve) {
        await updateDoc(doc(db, 'users', request.userId), {
          role: request.requestedRole
        });
        toast.success(`Role ${request.requestedRole} approved for ${request.userName}`);
        logActivity(user, 'SETTINGS_CHANGE', `Approved role change for ${request.userName} to ${request.requestedRole}`, request.userId, request.userName);
        await sendNotification(
          user.companyId,
          request.userId,
          'Clearance Level Updated',
          `Your access level has been elevated to ${request.requestedRole.replace('_', ' ')}. Identity protocols synchronized.`,
          'admin'
        );
      } else {
        logActivity(user, 'SETTINGS_CHANGE', `Rejected role change for ${request.userName}`, request.userId, request.userName);
        await sendNotification(
          user.companyId,
          request.userId,
          'Clearance Request Status',
          'Your request for account level elevation was not authorized at this time.',
          'admin'
        );
      }
      await updateDoc(doc(db, 'accessRequests', request.id!), {
        status: approve ? 'approved' : 'rejected'
      });
    } catch (error) {
      toast.error('Failed to process request');
    }
  };

  const handleApproveOnboarding = async (employeeId: string, approve: boolean) => {
    try {
      const emp = team.find(t => t.uid === employeeId);
      if (!emp) return;

      if (approve) {
        await updateDoc(doc(db, 'users', employeeId), {
          status: 'Active'
        });
        toast.success(`Onboarding approved for ${emp.name}`);
        logActivity(user, 'EMPLOYEE_EDIT', `Approved onboarding for ${emp.name}`, employeeId, emp.name);
        await sendNotification(
          user.companyId,
          employeeId,
          'Welcome to the System',
          `Your identity has been verified. Welcome to ${company?.name || 'the team'}, ${emp.name}. Reach out to your lead for objectives.`,
          'system'
        );
      } else {
        await deleteDoc(doc(db, 'users', employeeId));
        toast.success(`Onboarding rejected for ${emp.name}. Record purged.`);
        logActivity(user, 'EMPLOYEE_EDIT', `Rejected and purged onboarding record for ${emp.name}`, employeeId, emp.name);
      }
    } catch (error) {
      toast.error('Failed to process onboarding request');
    }
  };

  const handleApproveHike = async (employeeId: string, hikeId: string, approve: boolean) => {
    try {
      const emp = team.find(t => t.uid === employeeId);
      if (!emp || !emp.salaryHistory) return;

      const hikeIndex = emp.salaryHistory.findIndex(h => h.id === hikeId);
      if (hikeIndex === -1) return;

      const hike = emp.salaryHistory[hikeIndex];
      const newHistory = [...emp.salaryHistory];
      newHistory[hikeIndex] = { 
        ...hike, 
        status: approve ? 'approved' : 'rejected', 
        approvedBy: user.uid, 
        approvedByName: user.name 
      };

      const updates: any = { salaryHistory: newHistory };
      if (approve) {
        updates.salary = hike.newSalary;
      }

      await updateDoc(doc(db, 'users', employeeId), updates);
      
      if (approve) {
        toast.success(`Hike approved for ${emp.name}`);
        logActivity(user, 'SALARY_CHANGE', `Approved salary hike of ${company?.currency || '$'}${hike.amount.toLocaleString()} for ${emp.name}`, employeeId, emp.name);
        await sendNotification(
          user.companyId,
          employeeId,
          'Compensation Update',
          `Your projected salary has been increased. New baseline: ${company?.currency || '$'}${hike.newSalary.toLocaleString()}. Details available in profile.`,
          'salary'
        );
      } else {
        toast.success(`Hike rejected for ${emp.name}`);
        logActivity(user, 'SALARY_CHANGE', `Rejected salary hike for ${emp.name}`, employeeId, emp.name);
        await sendNotification(
          user.companyId,
          employeeId,
          'Hike Request Status',
          'Your recent compensation increment proposal was not authorized at this deployment stage.',
          'salary'
        );
      }
    } catch (error) {
      toast.error('Failed to process hike request');
    }
  };

  const activeMembers = team.filter(m => m.status !== 'Pending Approval');
  const pendingOnboarding = team.filter(m => m.status === 'Pending Approval');
  const pendingHikes = team.flatMap(emp => 
    (emp.salaryHistory || [])
      .filter(h => h.status === 'pending')
      .map(h => ({ ...h, employeeId: emp.uid, employeeName: emp.name }))
  );

  const updateMemberDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setLoading(true);
    try {
      const { name, role, department, phone, status, joiningDate, shiftId, salary } = editedValues;

      const updates: any = {
        name,
        role,
        department,
        phone,
        status,
        joiningDate,
        shiftId
      };

      if (isAdmin && salary !== undefined) {
        if (salary !== editingMember.salary) {
          logActivity(user, 'SALARY_CHANGE', `Updated salary for ${editingMember.name} from ${company?.currency || '$'}${editingMember.salary?.toLocaleString()} to ${company?.currency || '$'}${salary.toLocaleString()}`, editingMember.uid, editingMember.name);
        }
        updates.salary = salary;
      }

      await updateDoc(doc(db, 'users', editingMember.uid), updates);
      logActivity(user, 'EMPLOYEE_EDIT', `Updated profile parameters for ${editingMember.name}`, editingMember.uid, editingMember.name);
      toast.success('Employee details updated');
      setEditingMember(null);
    } catch (error) {
      toast.error('Failed to update employee');
    } finally {
      setLoading(false);
    }
  };

  const deleteInvite = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'invites', id));
      toast.success('Invite cancelled');
    } catch (error) {
      toast.error('Failed to cancel invite');
    }
  };

  const handleExportExcel = () => {
    try {
      const exportData = team.map(emp => ({
        'Member ID': emp.memberId || 'N/A',
        'Name': emp.name,
        'Email': emp.email,
        'Role': emp.role,
        'Department': emp.department || 'N/A',
        'Phone': emp.phone || 'N/A',
        'Joining Date': emp.joiningDate || 'N/A',
        'Salary': emp.salary ? `${company?.currency || '$'}${emp.salary.toLocaleString()}` : 'N/A',
        'Status': emp.status || 'Active'
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Employees');
      XLSX.writeFile(wb, `Personnel_Data_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      
      logActivity(user, 'DATA_EXPORT', `Exported personnel data to Excel (${team.length} records)`);
      toast.success('Excel export complete');
    } catch (error) {
      toast.error('Excel export failed');
    }
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(18);
      doc.text(`${company?.name || 'Nexus Agency'} - Personnel Report`, 14, 20);
      doc.setFontSize(10);
      doc.text(`Generated on: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, 14, 26);
      doc.text(`Extracted by: ${user.name}`, 14, 30);

      const tableRows = team.map(emp => [
        emp.memberId || 'N/A',
        emp.name,
        emp.role,
        emp.department || 'N/A',
        emp.joiningDate || 'N/A',
        emp.salary ? `${company?.currency || '$'}${emp.salary.toLocaleString()}` : 'N/A',
        emp.status || 'Active'
      ]);

      (doc as any).autoTable({
        startY: 35,
        head: [['ID', 'Name', 'Role', 'Dept', 'Hired', 'Salary', 'Status']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: '#0F172A', textColor: '#FFFFFF' },
        styles: { fontSize: 8 }
      });

      doc.save(`Personnel_Audit_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      logActivity(user, 'DATA_EXPORT', `Exported personnel report to PDF (${team.length} records)`);
      toast.success('PDF export complete');
    } catch (error) {
      console.error(error);
      toast.error('PDF export failed');
    }
  };

  if (user.role === 'sales') {
    const stats = getStatsForUser(user.uid);
    return (
      <div className="space-y-10">
        <div className="bg-white p-8 rounded-[40px] shadow-xl shadow-slate-200/20 border border-slate-100">
          <div className="flex items-center space-x-6 mb-8">
            <div className="w-20 h-20 rounded-[24px] bg-slate-950 flex items-center justify-center text-white text-2xl font-black">
              {user.name[0]}
            </div>
            <div>
              <h2 className="text-3xl font-black font-display text-slate-950 italic">{user.name}</h2>
              <p className="text-slate-500 font-medium">{user.email}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50/50 p-6 rounded-[32px] border border-blue-100/50">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-600 rounded-2xl text-white">
                  <Briefcase size={20} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Leads</span>
              </div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Assigned Leads</p>
              <h3 className="text-3xl font-black text-slate-950 italic">{stats.count}</h3>
            </div>
            
            <div className="bg-emerald-50/50 p-6 rounded-[32px] border border-emerald-100/50">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-emerald-600 rounded-2xl text-white">
                  <TrendingUp size={20} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Performance</span>
              </div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Conversion Rate</p>
              <h3 className="text-3xl font-black text-slate-950 italic">{stats.rate}%</h3>
            </div>
            
            <div className="bg-indigo-50/50 p-6 rounded-[32px] border border-indigo-100/50">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-indigo-600 rounded-2xl text-white">
                  <CalendarIcon size={20} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Tenure</span>
              </div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Joined Date</p>
              <h3 className="text-xl font-black text-slate-950 italic truncate">
                {user.joiningDate ? new Date(user.joiningDate).toLocaleDateString() : 'Update Profile'}
              </h3>
            </div>
          </div>
          
          <div className="mt-12 pt-12 border-t border-slate-100">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 px-1">Data Export protocols</h4>
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={handleExportExcel}
                className="flex items-center space-x-3 bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-slate-100 hover:border-emerald-100 group"
              >
                <FileSpreadsheet size={18} className="group-hover:scale-110 transition-transform" />
                <span>Export as Excel</span>
              </button>
              <button 
                onClick={handleExportPDF}
                className="flex items-center space-x-3 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-700 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-slate-100 hover:border-rose-100 group"
              >
                <FileText size={18} className="group-hover:scale-110 transition-transform" />
                <span>Export as PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 md:space-y-12">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span>Personnel Management</span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black font-display text-slate-950 tracking-tighter leading-tight italic">
            Employees & Team
          </h2>
        </div>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button 
              onClick={handleExportExcel}
              className="p-3 hover:bg-white text-slate-400 hover:text-emerald-600 rounded-xl transition-all"
              title="Export to Excel"
            >
              <FileSpreadsheet size={20} />
            </button>
            <button 
              onClick={handleExportPDF}
              className="p-3 hover:bg-white text-slate-400 hover:text-rose-600 rounded-xl transition-all"
              title="Export to PDF"
            >
              <FileText size={20} />
            </button>
          </div>
          {canManage && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="group flex items-center justify-center space-x-3 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-950 transition-all shadow-xl shadow-indigo-200 active:scale-95"
              >
                <Plus size={18} />
                <span>Add Employee</span>
              </button>
          )}
        </div>
      </div>

      {isAdmin && requests.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center space-x-2 px-2">
            <Shield size={14} className="text-blue-500" />
            <span>Security Board Requests</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {requests.map((req) => (
              <div key={req.id} className="bg-white border border-slate-100 p-6 rounded-[32px] flex justify-between items-center shadow-lg shadow-slate-200/20">
                <div className="min-w-0">
                  <div className="font-black text-slate-950 text-sm uppercase truncate">{req.userName}</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Requests <span className="text-blue-500">{req.requestedRole}</span></div>
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => handleRequest(req, true)}
                    className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    onClick={() => handleRequest(req, false)}
                    className="p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all border border-rose-100"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex space-x-6 border-b border-slate-100">
        {[
          { id: 'members', label: 'Pulse Members', count: activeMembers.length },
          { id: 'invites', label: 'Pending Access', count: invites.length + requests.length + pendingOnboarding.length + pendingHikes.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-4 px-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${
              activeTab === tab.id ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <span>{tab.label}</span>
            <span className="ml-2 text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md">{tab.count}</span>
            {activeTab === tab.id && (
              <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>
        ))}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'members' ? (
          <div className="table-container">
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Department</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Joining Date</th>
                  {isAdmin && <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Salary</th>}
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {activeMembers.map((member) => {
                  return (
                    <tr 
                      key={member.uid} 
                      className="group hover:bg-indigo-50/30 transition-all cursor-pointer"
                      onClick={() => navigate(`/employees/${member.uid}`)}
                    >
                      <td className="px-8 py-5">
                         <div className="flex items-center space-x-4">
                           <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200 shadow-sm">
                             {member.photoURL ? (
                               <img src={member.photoURL} alt={member.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                             ) : (
                               <span className="text-sm font-black text-slate-400">{member.name[0]}</span>
                             )}
                           </div>
                           <div className="min-w-0">
                             <div className="font-bold text-slate-950 text-sm">{member.name}</div>
                             <div className="text-[10px] text-slate-400 font-medium truncate">{member.email}</div>
                           </div>
                         </div>
                      </td>
                      <td className="px-8 py-5">
                         <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                           member.role === 'admin' ? 'bg-indigo-100 text-indigo-700' :
                           member.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                           'bg-slate-100 text-slate-600'
                         }`}>
                           {member.role.replace('_', ' ')}
                         </span>
                      </td>
                      <td className="px-8 py-5">
                         <div className="flex items-center space-x-2">
                           <span className="text-xs font-semibold text-slate-600">{member.department || '—'}</span>
                         </div>
                      </td>
                      <td className="px-8 py-5">
                         <div className="text-xs font-semibold text-slate-500">
                           {member.joiningDate ? new Date(member.joiningDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                         </div>
                      </td>
                      {isAdmin && (
                        <td className="px-8 py-5">
                           <div className="text-xs font-bold text-slate-950">
                             {member.salary ? `${company?.currency || '$'}${member.salary.toLocaleString()}` : '—'}
                           </div>
                        </td>
                      )}
                      <td className="px-8 py-5">
                         <div className="flex items-center space-x-2">
                           <div className={`w-1.5 h-1.5 rounded-full ${
                              member.status === 'Active' ? 'bg-emerald-500' :
                              member.status === 'On Leave' ? 'bg-amber-500' :
                              'bg-slate-300'
                            }`} />
                            <span className="text-[10px] font-bold text-slate-600">
                              {member.isResigned ? 'Resigned' : (member.status || 'Active')}
                            </span>
                         </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/employees/${member.uid}`);
                            }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all flex items-center space-x-2"
                            title="View Profile"
                          >
                            <Search size={16} />
                            {!isAdmin && <span className="text-[10px] font-bold uppercase hidden md:inline">View Profile</span>}
                          </button>
                          
                          {isAdmin && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingMember(member);
                              }}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                              title="Edit Member"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-12">
            {/* New Onboarding Approval */}
            {pendingOnboarding.length > 0 && (
              <div className="space-y-6">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center space-x-2">
                  <Plus size={14} className="text-blue-500" />
                  <span>Personnel Onboarding Requests</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {pendingOnboarding.map((emp) => (
                    <div key={emp.uid} className="bg-white border border-slate-100 p-6 rounded-[32px] flex justify-between items-center shadow-lg shadow-slate-200/20 group">
                      <div className="flex items-center space-x-4 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-slate-950 flex items-center justify-center text-white shrink-0">
                          <UserIcon size={20} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-black text-slate-950 text-sm uppercase truncate">{emp.name}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                            {emp.role} • {emp.department}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleApproveOnboarding(emp.uid, true)}
                          className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100"
                          title="Approve Hiring"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={() => handleApproveOnboarding(emp.uid, false)}
                          className="p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all border border-rose-100"
                          title="Reject Record"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Role Change Approval */}
            {requests.length > 0 && (
              <div className="space-y-6">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center space-x-2">
                  <Shield size={14} className="text-indigo-500" />
                  <span>Clearance Level Requests</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {requests.map((req) => (
                    <div key={req.id} className="bg-white border border-slate-100 p-6 rounded-[32px] flex justify-between items-center shadow-lg shadow-slate-200/20">
                      <div className="flex items-center space-x-4 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shrink-0">
                          <Shield size={20} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-black text-slate-950 text-sm uppercase truncate">{req.userName}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                            Grant <span className="text-indigo-600 font-black">{req.requestedRole}</span> access
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleRequest(req, true)}
                          className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={() => handleRequest(req, false)}
                          className="p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all border border-rose-100"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Salary Hike Approval */}
            {pendingHikes.length > 0 && (
              <div className="space-y-6">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center space-x-2">
                  <TrendingUp size={14} className="text-emerald-500" />
                  <span>Compensation Increment Proposals</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {pendingHikes.map((hike) => (
                    <div key={hike.id} className="bg-white border border-slate-100 p-6 rounded-[32px] flex justify-between items-center shadow-lg shadow-slate-200/20">
                      <div className="flex items-center space-x-4 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shrink-0">
                          <TrendingUp size={20} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-black text-slate-950 text-sm uppercase truncate">{hike.employeeName}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                            Increment: <span className="text-emerald-600">+{company?.currency || '$'}{hike.amount.toLocaleString()}</span>
                          </div>
                          <div className="text-[8px] text-slate-400 italic truncate mt-0.5">"{hike.reason}"</div>
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleApproveHike(hike.employeeId, hike.id, true)}
                          className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={() => handleApproveHike(hike.employeeId, hike.id, false)}
                          className="p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all border border-rose-100"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Invitations */}
            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center space-x-2">
                <Mail size={14} className="text-amber-500" />
                <span>External Access Invitations</span>
              </h3>
              <div className="grid-auto-fit">
                {invites.length > 0 ? (
                  invites.map((invite) => (
                <div key={invite.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-lg shadow-slate-200/10 space-y-6 hover:border-blue-100 hover:shadow-2xl transition-all duration-500 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-bl-[60px] -z-10 group-hover:scale-110 transition-transform" />
                  <div className="flex justify-between items-start">
                    <div className="w-14 h-14 bg-slate-950 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200">
                      <Mail size={24} />
                    </div>
                    <button
                      onClick={() => deleteInvite(invite.id)}
                      className="p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all border border-rose-100"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div>
                    <div className="font-black text-slate-950 uppercase tracking-tight text-lg truncate">{invite.email}</div>
                    <div className="inline-flex mt-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-100">
                      Access Requested: {invite.role}
                    </div>
                  </div>
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <code className="text-[10px] font-mono font-bold text-slate-500 truncate mr-4">{invite.token}</code>
                      <button 
                         onClick={() => {
                           navigator.clipboard.writeText(invite.token);
                           toast.success('Passkey copied to neural link');
                         }}
                         className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 text-slate-400 hover:text-blue-600 transition-all"
                      >
                         <Copy size={16} />
                      </button>
                    </div>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/join/${invite.token}`);
                        toast.success('Access override URL copied');
                      }}
                      className="w-full flex items-center justify-center space-x-3 py-4 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 transition-all font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20"
                    >
                      <Globe size={16} />
                      <span>Copy Direct Link</span>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="lg:col-span-3 text-center py-32 bg-slate-50/50 rounded-[40px] border-4 border-dashed border-slate-100">
                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-200 shadow-sm">
                  <Users size={40} />
                </div>
                <h4 className="text-slate-950 font-black font-display italic text-xl">No Transmissions Pending</h4>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 opacity-60">All team invite protocols are currently static.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )}

      <AnimatePresence>
        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[40px] p-10 max-w-2xl w-full shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-bl-[80px] -z-10" />
              <button 
                onClick={() => setShowInviteModal(false)}
                className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-950 transition-colors"
              >
                <X size={24} />
              </button>

              <h3 className="text-3xl font-black text-slate-950 mb-4 font-display italic leading-none">Add Employee</h3>
              
              <div className="flex space-x-4 mb-8 p-1 bg-slate-100 rounded-2xl w-fit">
                <button
                   onClick={() => setAddMethod('invite')}
                   className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${addMethod === 'invite' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                   Secure Invitation
                </button>
                <button
                   onClick={() => setAddMethod('manual')}
                   className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${addMethod === 'manual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                   Direct Entry
                </button>
              </div>

              {addMethod === 'invite' ? (
                <form onSubmit={handleInvite} className="space-y-8">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">Network Identity (Email)</label>
                    <input
                      type="email"
                      required
                      className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-200 transition-all text-sm font-bold uppercase tracking-tight placeholder:text-slate-300"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="alias@nexvoura.sh"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">System Clearance (Role)</label>
                    <div className="relative">
                      <select
                        className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-200 transition-all text-sm font-black uppercase tracking-widest appearance-none"
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as any)}
                      >
                        <option value="sales">Sales (Field Unit)</option>
                        <option value="team_lead">Team Lead (Support)</option>
                        <option value="manager">Manager (Ops)</option>
                        <option value="admin">Admin (System Root)</option>
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <Shield size={18} />
                      </div>
                    </div>
                  </div>
                  <button
                    disabled={loading}
                    className="w-full bg-slate-950 text-white p-5 rounded-[24px] font-black text-xs uppercase tracking-[0.3em] hover:bg-indigo-600 transition-all disabled:opacity-50 shadow-2xl shadow-slate-950/20 active:scale-95"
                  >
                    {loading ? 'Initializing...' : 'Authorize Invite'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleAddManual} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Full Name</label>
                      <input 
                        value={manualEntry.name}
                        onChange={(e) => setManualEntry({ ...manualEntry, name: e.target.value })}
                        type="text" 
                        required 
                        placeholder="John Doe" 
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white text-sm font-bold uppercase tracking-tight" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Email Address</label>
                      <input 
                        value={manualEntry.email}
                        onChange={(e) => setManualEntry({ ...manualEntry, email: e.target.value })}
                        type="email" 
                        required 
                        placeholder="john@company.com" 
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white text-sm font-bold" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Clearance Level</label>
                      <select 
                        value={manualEntry.role}
                        onChange={(e) => setManualEntry({ ...manualEntry, role: e.target.value as UserRole })}
                        required 
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white text-sm font-black uppercase tracking-widest appearance-none"
                      >
                        <option value="sales">Sales</option>
                        <option value="team_lead">Team Lead</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Department</label>
                      <select 
                        value={manualEntry.department}
                        onChange={(e) => setManualEntry({ ...manualEntry, department: e.target.value as Department })}
                        required 
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white text-sm font-black uppercase tracking-widest appearance-none"
                      >
                        <option value="Sales">Sales</option>
                        <option value="Dev">Development</option>
                        <option value="Support">Support</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Phone Number</label>
                      <input 
                        value={manualEntry.phone}
                        onChange={(e) => setManualEntry({ ...manualEntry, phone: e.target.value })}
                        type="tel" 
                        placeholder="+1 555-0123" 
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white text-sm font-bold" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Joining Date</label>
                      <input 
                        value={manualEntry.joiningDate}
                        onChange={(e) => setManualEntry({ ...manualEntry, joiningDate: e.target.value })}
                        type="date" 
                        required 
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white text-sm font-bold" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Work Shift</label>
                      <select 
                        value={manualEntry.shiftId}
                        onChange={(e) => setManualEntry({ ...manualEntry, shiftId: e.target.value })}
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white text-sm font-black uppercase tracking-widest appearance-none"
                      >
                        <option value="">No Shift</option>
                        {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2 px-1">Annual Salary ($)</label>
                      <input 
                        value={manualEntry.salary}
                        onChange={(e) => setManualEntry({ ...manualEntry, salary: Number(e.target.value) })}
                        type="number" 
                        className="w-full p-4 bg-slate-50 border border-indigo-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white text-sm font-black" 
                      />
                    </div>
                  </div>
                  <button
                    disabled={loading}
                    className="w-full bg-slate-950 text-white p-5 rounded-[24px] font-black text-xs uppercase tracking-[0.3em] hover:bg-indigo-600 transition-all disabled:opacity-50 shadow-2xl shadow-slate-950/20 active:scale-95 mt-4"
                  >
                    {loading ? 'Processing...' : 'Deploy Direct Account'}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}

        {editingMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[40px] p-10 max-w-2xl w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-bl-[80px] -z-10" />
              <button 
                onClick={() => setEditingMember(null)}
                className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-950 transition-colors"
              >
                <X size={24} />
              </button>

              <h3 className="text-3xl font-black text-slate-950 mb-8 font-display italic leading-none uppercase tracking-tight">Personnel Configuration</h3>
              
              <form onSubmit={updateMemberDetails}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Full Identity Name</label>
                    <input
                      name="name"
                      type="text"
                      required
                      value={editedValues.name}
                      onChange={(e) => setEditedValues({ ...editedValues, name: e.target.value })}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white text-sm font-bold uppercase tracking-tight"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Clearance Level</label>
                    <select
                      name="role"
                      value={editedValues.role}
                      onChange={(e) => setEditedValues({ ...editedValues, role: e.target.value as UserRole })}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white text-sm font-black uppercase tracking-widest appearance-none"
                    >
                      <option value="sales">Sales</option>
                      <option value="team_lead">Team Lead</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Department</label>
                    <select
                      name="department"
                      value={editedValues.department}
                      onChange={(e) => setEditedValues({ ...editedValues, department: e.target.value as Department })}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white text-sm font-black uppercase tracking-widest appearance-none"
                    >
                      <option value="Sales">Sales (Outreach)</option>
                      <option value="Dev">Development (Build)</option>
                      <option value="Support">Support (Nexus)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Communication Line</label>
                    <input
                      name="phone"
                      type="tel"
                      value={editedValues.phone}
                      onChange={(e) => setEditedValues({ ...editedValues, phone: e.target.value })}
                      placeholder="+1 (555) 000-0000"
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white text-sm font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Current Status</label>
                    <select
                      name="status"
                      value={editedValues.status}
                      onChange={(e) => setEditedValues({ ...editedValues, status: e.target.value as EmployeeStatus })}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white text-sm font-black uppercase tracking-widest appearance-none"
                    >
                      <option value="Active">Active Duty</option>
                      <option value="On Leave">Authorized Leave</option>
                      <option value="Left">Offboarded</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Joining Date</label>
                    <input
                      name="joiningDate"
                      type="date"
                      value={editedValues.joiningDate}
                      onChange={(e) => setEditedValues({ ...editedValues, joiningDate: e.target.value })}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white text-sm font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Work Shift</label>
                    <select
                      name="shiftId"
                      value={editedValues.shiftId}
                      onChange={(e) => setEditedValues({ ...editedValues, shiftId: e.target.value })}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white text-sm font-black uppercase tracking-widest appearance-none"
                    >
                      <option value="">No Specific Shift</option>
                      {shifts.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.startTime}-{s.endTime})</option>
                      ))}
                    </select>
                  </div>

                  {isAdmin && (
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2 px-1">Compensation (Salary / Year)</label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</div>
                        <input
                          name="salary"
                          type="number"
                          value={editedValues.salary}
                          onChange={(e) => setEditedValues({ ...editedValues, salary: Number(e.target.value) })}
                          className="w-full p-4 pl-8 bg-slate-50 border border-indigo-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white text-sm font-black text-slate-950"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex space-x-4 mt-10">
                  <button
                    type="button"
                    onClick={() => setEditingMember(null)}
                    className="flex-1 p-5 rounded-3xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100"
                  >
                    Discard Changes
                  </button>
                  <button
                    disabled={loading}
                    className="flex-1 bg-indigo-600 text-white p-5 rounded-3xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-2xl shadow-indigo-950/20"
                  >
                    {loading ? 'Processing...' : 'Apply Overrides'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {viewingMember && (
          <EmployeeProfileModal 
            member={viewingMember} 
            stats={getStatsForUser(viewingMember.uid)}
            user={user}
            company={company}
            onClose={() => setViewingMember(null)}
          />
        )}
      </AnimatePresence>
    </div>
  </div>
);
}

function EmployeeProfileModal({ member, stats, user, company, onClose }: { member: UserProfile, stats: any, user: UserProfile, company: Company | null, onClose: () => void }) {
  const isAuthorizedToSeeSalary = user.role === 'admin' || member.uid === user.uid;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white rounded-[40px] max-w-2xl w-full shadow-2xl overflow-hidden relative"
      >
        <div className="h-40 bg-indigo-600 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-white rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-400 rounded-full blur-3xl" />
          </div>
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-white/10 text-white hover:bg-white/20 rounded-full backdrop-blur-sm transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-10 pb-10 -mt-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div className="flex items-end space-x-6">
              <div className="w-32 h-32 rounded-[32px] bg-white p-1 border-4 border-white shadow-2xl overflow-hidden shadow-indigo-200">
                <div className="w-full h-full rounded-[24px] bg-slate-100 flex items-center justify-center overflow-hidden">
                  {member.photoURL ? (
                    <img src={member.photoURL} alt={member.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-4xl font-black text-slate-300">{member.name[0]}</span>
                  )}
                </div>
              </div>
              <div className="pb-2">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none italic">{member.name}</h2>
                <div className="flex items-center space-x-3 mt-3">
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                    {member.role.replace('_', ' ')}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{member.department || 'Operative'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 group hover:border-indigo-100 transition-all">
              <div className="p-3 bg-white rounded-2xl w-fit mb-4 shadow-sm text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <Briefcase size={20} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Leads Handled</p>
              <h4 className="text-3xl font-black text-slate-900 italic">{stats.count}</h4>
            </div>
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 group hover:border-emerald-100 transition-all">
              <div className="p-3 bg-white rounded-2xl w-fit mb-4 shadow-sm text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                <TrendingUp size={20} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Conversion Rate</p>
              <h4 className="text-3xl font-black text-slate-900 italic">{stats.rate}%</h4>
            </div>
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 group hover:border-blue-100 transition-all">
              <div className="p-3 bg-white rounded-2xl w-fit mb-4 shadow-sm text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <CalendarIcon size={20} />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nexus Tenure</p>
              <h4 className="text-xl font-black text-slate-900 italic">
                {member.joiningDate ? new Date(member.joiningDate).toLocaleDateString() : 'Pending'}
              </h4>
            </div>
          </div>

          <div className="space-y-4">
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Identity Details</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                <div className="p-2 bg-white rounded-xl text-slate-400">
                   <Mail size={16} />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Network Secure ID</p>
                  <p className="text-xs font-bold text-slate-900 truncate">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                <div className="p-2 bg-white rounded-xl text-slate-400">
                   <Phone size={16} />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cellular Decryption</p>
                  <p className="text-xs font-bold text-slate-900">{member.phone || '—'}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                <div className="p-2 bg-white rounded-xl text-slate-400">
                   <Globe size={16} />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nexus Location</p>
                  <p className="text-xs font-bold text-slate-900">{member.department || 'Field Ops'}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                <div className="p-2 bg-white rounded-xl text-indigo-600 shadow-sm border border-indigo-50">
                   <Shield size={16} />
                </div>
                <div>
                  <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Security Clearance</p>
                  <p className="text-xs font-black text-indigo-700 uppercase tracking-tight">{member.role.replace('_', ' ')}</p>
                </div>
              </div>

              {isAuthorizedToSeeSalary && (
                <div className="flex items-center space-x-4 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                  <div className="p-2 bg-white rounded-xl text-emerald-600 shadow-sm border border-emerald-50">
                     <DollarSign size={16} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Annual Compensation</p>
                    <p className="text-xs font-black text-emerald-700">
                      {member.salary ? `${company?.currency || '$'}${member.salary.toLocaleString()}` : 'Not Disclosed'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
