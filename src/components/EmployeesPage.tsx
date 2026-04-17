import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDocs } from 'firebase/firestore';
import { UserProfile, Invite, AccessRequest, UserRole, Company, Department, EmployeeStatus, Lead } from '../types';
import { Plus, Trash2, Mail, Shield, User as UserIcon, Check, X, Copy, Globe, Edit2, Phone, Briefcase, Calendar as CalendarIcon, DollarSign, TrendingUp, Users } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

export default function EmployeesPage({ user, company }: { user: UserProfile, company: Company | null }) {
  const [team, setTeam] = useState<UserProfile[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeTab, setActiveTab] = useState<'members' | 'invites'>('members');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingMember, setEditingMember] = useState<UserProfile | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('sales');
  const [loading, setLoading] = useState(false);

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
    if (user.role === 'sales') {
      // Sales only sees themselves
      const teamQ = query(collection(db, 'users'), where('uid', '==', user.uid));
      const leadsQ = query(collection(db, 'leads'), where('assignedTo', '==', user.uid));
      
      const unsubTeam = onSnapshot(teamQ, (snap) => {
        setTeam(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
      });

      const unsubLeads = onSnapshot(leadsQ, (snap) => {
        setLeads(snap.docs.map(d => ({ id: d.id, ...d.data() } as Lead)));
      });

      return () => {
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
        unsubTeam();
        unsubInvites();
        unsubRequests();
        unsubLeads();
      };
    }
  }, [user.companyId, user.uid, user.role]);

  const getStatsForUser = (userId: string) => {
    const userLeads = leads.filter(l => l.assignedTo === userId);
    const converted = userLeads.filter(l => l.status === 'Converted').length;
    const rate = userLeads.length > 0 ? (converted / userLeads.length) * 100 : 0;
    return { count: userLeads.length, rate: Math.round(rate) };
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
      }
      await updateDoc(doc(db, 'accessRequests', request.id!), {
        status: approve ? 'approved' : 'rejected'
      });
    } catch (error) {
      toast.error('Failed to process request');
    }
  };

  const updateMemberDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setLoading(true);
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const name = formData.get('name') as string;
      const role = formData.get('role') as UserRole;
      const department = formData.get('department') as Department;
      const phone = formData.get('phone') as string;
      const status = formData.get('status') as EmployeeStatus;
      const joiningDate = formData.get('joiningDate') as string;
      const salary = formData.get('salary') ? Number(formData.get('salary')) : editingMember.salary;

      const updates: any = {
        name,
        role,
        department,
        phone,
        status,
        joiningDate
      };

      if (isAdmin && salary !== undefined) {
        updates.salary = salary;
      }

      await updateDoc(doc(db, 'users', editingMember.uid), updates);
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
        {canManage && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="group flex items-center justify-center space-x-3 bg-slate-950 text-white px-8 py-4 md:py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
          >
            <Plus size={18} />
            <span>Invite New Member</span>
          </button>
        )}
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
          { id: 'members', label: 'Pulse Members', count: team.length },
          { id: 'invites', label: 'Pending Access', count: invites.length },
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
          <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-xl shadow-slate-200/10">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left min-w-[800px]">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black font-display text-slate-400 uppercase tracking-widest">Employee</th>
                    <th className="px-8 py-5 text-[10px] font-black font-display text-slate-400 uppercase tracking-widest">Department</th>
                    <th className="px-8 py-5 text-[10px] font-black font-display text-slate-400 uppercase tracking-widest">Role</th>
                    <th className="px-8 py-5 text-[10px] font-black font-display text-slate-400 uppercase tracking-widest text-center">Stats</th>
                    <th className="px-8 py-5 text-[10px] font-black font-display text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-5 text-[10px] font-black font-display text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {team.map((member) => {
                    const stats = getStatsForUser(member.uid);
                    return (
                      <tr key={member.uid} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-6">
                           <div className="flex items-center space-x-4">
                             <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 border border-slate-100 shadow-sm">
                               {member.photoURL ? (
                                 <img src={member.photoURL} alt={member.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                               ) : (
                                 <span className="text-sm font-black text-slate-400">{member.name[0]}</span>
                               )}
                             </div>
                             <div className="min-w-0">
                               <div className="font-black text-slate-950 uppercase tracking-tight text-sm font-display tracking-tight">{member.name}</div>
                               <div className="text-[10px] text-slate-400 font-bold truncate">{member.email}</div>
                             </div>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex items-center space-x-2">
                             <Briefcase size={14} className="text-blue-500/50" />
                             <span className="text-xs font-bold text-slate-600 uppercase tracking-tight font-display tracking-widest">{member.department || 'Unassigned'}</span>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                             member.role === 'admin' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                             member.role === 'manager' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                             member.role === 'team_lead' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                             'bg-emerald-50 text-emerald-600 border border-emerald-100'
                           }`}>
                             {member.role.replace('_', ' ')}
                           </span>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex items-center justify-center space-x-4">
                              <div className="text-center">
                                 <div className="text-xs font-black text-slate-950 font-display">{stats.count}</div>
                                 <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Leads</div>
                              </div>
                              <div className="w-px h-6 bg-slate-100" />
                              <div className="text-center">
                                 <div className="text-xs font-black text-blue-600 font-display">{stats.rate}%</div>
                                 <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Rate</div>
                              </div>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${
                                member.status === 'Active' ? 'bg-emerald-500' :
                                member.status === 'On Leave' ? 'bg-amber-500' :
                                'bg-slate-300'
                              } animate-pulse`} />
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 font-display">{member.status || 'Active'}</span>
                           </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex justify-end items-center space-x-2">
                            {member.uid !== user.uid && roleHierarchy[user.role] > roleHierarchy[member.role] && (
                              <>
                                <button
                                  onClick={() => setEditingMember(member)}
                                  className="w-9 h-9 flex items-center justify-center bg-white rounded-xl border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-100 hover:shadow-lg transition-all"
                                  title="Edit Employee"
                                >
                                  <Edit2 size={16} />
                                </button>
                                {isAdmin && (
                                  <button
                                    onClick={() => {/* Handle Delete */}}
                                    className="w-9 h-9 flex items-center justify-center bg-white rounded-xl border border-slate-100 text-slate-400 hover:text-rose-600 hover:border-rose-100 hover:shadow-lg transition-all"
                                    title="Offboard Employee"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
        )}
      </div>

      <AnimatePresence>
        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[40px] p-10 max-w-md w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-bl-[80px] -z-10" />
              <button 
                onClick={() => setShowInviteModal(false)}
                className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-950 transition-colors"
              >
                <X size={24} />
              </button>

              <h3 className="text-3xl font-black text-slate-950 mb-8 font-display italic leading-none">Invite To Nexus</h3>
              <form onSubmit={handleInvite} className="space-y-8">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">Network Identity (Email)</label>
                  <input
                    type="email"
                    required
                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-200 transition-all text-sm font-bold uppercase tracking-tight placeholder:text-slate-300"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="alias@nexvoura.sh"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">System Clearance (Role)</label>
                  <div className="relative">
                    <select
                      className="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-200 transition-all text-sm font-black uppercase tracking-widest appearance-none"
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
                  className="w-full bg-slate-950 text-white p-5 rounded-[24px] font-black text-xs uppercase tracking-[0.3em] hover:bg-blue-600 transition-all disabled:opacity-50 shadow-2xl shadow-slate-950/20 active:scale-95"
                >
                  {loading ? 'Initializing...' : 'Authorize Invite'}
                </button>
              </form>
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
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-bl-[80px] -z-10" />
              <button 
                onClick={() => setEditingMember(null)}
                className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-950 transition-colors"
              >
                <X size={24} />
              </button>

              <h3 className="text-3xl font-black text-slate-950 mb-8 font-display italic leading-none uppercase">Update Personnel Config</h3>
              
              <form onSubmit={updateMemberDetails}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Full Identity Name</label>
                    <input
                      name="name"
                      type="text"
                      required
                      defaultValue={editingMember.name}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white text-sm font-bold uppercase tracking-tight"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Clearance Level</label>
                    <select
                      name="role"
                      defaultValue={editingMember.role}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white text-sm font-black uppercase tracking-widest appearance-none"
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
                      defaultValue={editingMember.department || 'Sales'}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white text-sm font-black uppercase tracking-widest appearance-none"
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
                      defaultValue={editingMember.phone}
                      placeholder="+1 (555) 000-0000"
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white text-sm font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Current Status</label>
                    <select
                      name="status"
                      defaultValue={editingMember.status || 'Active'}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white text-sm font-black uppercase tracking-widest appearance-none"
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
                      defaultValue={editingMember.joiningDate}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white text-sm font-bold"
                    />
                  </div>

                  {isAdmin && (
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2 px-1">Compensation (Salary / Year)</label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</div>
                        <input
                          name="salary"
                          type="number"
                          defaultValue={editingMember.salary}
                          className="w-full p-4 pl-8 bg-slate-50 border border-rose-100 rounded-2xl outline-none focus:ring-4 focus:ring-rose-500/10 focus:bg-white text-sm font-black text-slate-950"
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
                    className="flex-1 bg-slate-950 text-white p-5 rounded-3xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-blue-600 transition-all disabled:opacity-50 shadow-2xl shadow-slate-950/20"
                  >
                    {loading ? 'Processing...' : 'Sync Personnel Data'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
