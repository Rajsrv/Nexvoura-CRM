import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { UserProfile, Permission, PermissionRequest, UserRole } from '../types';
import { Shield, Check, X, Clock, AlertCircle, Info, ChevronRight, Lock, Unlock, Zap, User as UserIcon, Settings, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

const AVAILABLE_PERMISSIONS: { id: Permission; label: string; description: string; category: string }[] = [
  { id: 'leads:view', label: 'View Leads', description: 'Access to read lead data', category: 'CRM' },
  { id: 'leads:edit', label: 'Edit Leads', description: 'Modify lead contact info and status', category: 'CRM' },
  { id: 'leads:delete', label: 'Delete Leads', description: 'Remove lead records from system', category: 'CRM' },
  { id: 'leads:assign', label: 'Assign Leads', description: 'Distribute leads to operatives', category: 'CRM' },
  { id: 'tasks:view', label: 'View Tasks', description: 'Access to task board and lists', category: 'Operations' },
  { id: 'tasks:edit', label: 'Edit Tasks', description: 'Modify task details and timelines', category: 'Operations' },
  { id: 'tasks:delete', label: 'Delete Tasks', description: 'Purge task assignments', category: 'Operations' },
  { id: 'tasks:assign', label: 'Assign Tasks', description: 'Allocate tasks to team members', category: 'Operations' },
  { id: 'team:view', label: 'View Team', description: 'Access to employee directory', category: 'Organization' },
  { id: 'team:manage', label: 'Manage Personnel', description: 'Hire, fire, and edit employee details', category: 'Organization' },
  { id: 'team:invite', label: 'Invite Members', description: 'Send secure network invites', category: 'Organization' },
  { id: 'finance:view', label: 'View Finance', description: 'Access to payroll and salary data', category: 'Admin' },
  { id: 'finance:manage', label: 'Manage Finance', description: 'Process payments and modify budgets', category: 'Admin' },
  { id: 'settings:company', label: 'Company Settings', description: 'Modify branding and global configs', category: 'Admin' },
  { id: 'settings:security', label: 'Security Config', description: 'Manage system-wide RBAC and auth', category: 'Admin' },
];

const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: AVAILABLE_PERMISSIONS.map(p => p.id),
  manager: ['leads:view', 'leads:edit', 'leads:assign', 'tasks:view', 'tasks:edit', 'tasks:assign', 'team:view', 'team:invite'],
  team_lead: ['leads:view', 'leads:edit', 'tasks:view', 'tasks:edit', 'tasks:assign', 'team:view'],
  sales: ['leads:view', 'leads:edit', 'tasks:view', 'tasks:edit'],
};

export function PermissionsPage({ user }: { user: UserProfile }) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [requests, setRequests] = useState<PermissionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestData, setRequestData] = useState({ permission: '' as Permission, reason: '' });

  const isAdmin = user.role === 'admin';
  const isManager = user.role === 'manager';

  useEffect(() => {
    if (!user.companyId) return;

    // Fetch all users in company
    const usersQuery = query(collection(db, 'users'), where('companyId', '==', user.companyId));
    const unsubscribeUsers = onSnapshot(usersQuery, (snap) => {
      setUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
      setLoading(false);
    });

    // Fetch permission requests
    const requestsQuery = query(
      collection(db, 'permissionRequests'), 
      where('companyId', '==', user.companyId),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeRequests = onSnapshot(requestsQuery, (snap) => {
      setRequests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PermissionRequest)));
    });

    return () => {
      unsubscribeUsers();
      unsubscribeRequests();
    };
  }, [user.companyId]);

  const togglePermission = async (targetUser: UserProfile, permission: Permission) => {
    if (!isAdmin && !isManager) return;
    
    // Check hierarchy: managers can't edit other managers or admins
    if (isManager && (targetUser.role === 'admin' || targetUser.role === 'manager')) {
      toast.error('Insufficient clearance for this personnel');
      return;
    }

    const currentPermissions = targetUser.permissions || DEFAULT_ROLE_PERMISSIONS[targetUser.role] || [];
    let newPermissions: Permission[];

    if (currentPermissions.includes(permission)) {
      newPermissions = currentPermissions.filter(p => p !== permission);
    } else {
      newPermissions = [...currentPermissions, permission];
    }

    try {
      await updateDoc(doc(db, 'users', targetUser.uid), { permissions: newPermissions });
      toast.success('Clearance updated');
      if (selectedUser?.uid === targetUser.uid) {
        setSelectedUser({ ...targetUser, permissions: newPermissions });
      }
    } catch (error) {
      toast.error('Failed to update clearance');
    }
  };

  const handleResolveRequest = async (request: PermissionRequest, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'permissionRequests', request.id), {
        status,
        resolvedBy: user.uid,
        resolvedAt: new Date().toISOString()
      });

      if (status === 'approved') {
        const targetUser = users.find(u => u.uid === request.userId);
        if (targetUser) {
          const currentPermissions = targetUser.permissions || DEFAULT_ROLE_PERMISSIONS[targetUser.role] || [];
          if (!currentPermissions.includes(request.requestedPermission)) {
            await updateDoc(doc(db, 'users', request.userId), {
              permissions: [...currentPermissions, request.requestedPermission]
            });
          }
        }
      }

      toast.success(`Request ${status}`);
    } catch (error) {
      toast.error('Resolution failed');
    }
  };

  const submitRequest = async () => {
    if (!requestData.permission || !requestData.reason) {
      toast.error('Complete all fields');
      return;
    }

    try {
      await addDoc(collection(db, 'permissionRequests'), {
        userId: user.uid,
        userName: user.name,
        companyId: user.companyId,
        requestedPermission: requestData.permission,
        reason: requestData.reason,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      toast.success('Access request submitted');
      setShowRequestModal(false);
      setRequestData({ permission: '' as Permission, reason: '' });
    } catch (error) {
      toast.error('Submission failed');
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 pt-6 max-w-7xl mx-auto space-y-10 min-h-screen bg-white dark:bg-dark-bg">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-100 dark:border-dark-border">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 mb-1">
             <Shield size={18} />
             <span className="text-[10px] font-black uppercase tracking-widest">Security Nexus</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white font-display italic leading-none">Access Control</h1>
          <p className="text-slate-500 dark:text-dark-text-muted font-medium">Manage hierarchical permissions and operative clearance</p>
        </div>
        
        {!isAdmin && (
          <button 
            onClick={() => setShowRequestModal(true)}
            className="saas-button-primary px-6 py-3 shadow-xl shadow-indigo-500/20 dark:shadow-none flex items-center space-x-2 group"
          >
            <Zap size={18} className="group-hover:animate-pulse" />
            <span>Request Access</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        {/* User List */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-[#fcfcfc] dark:bg-dark-surface border border-slate-100 dark:border-dark-border rounded-[32px] p-6 shadow-sm overflow-hidden">
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 dark:text-dark-text-muted">Personnel Directory</h3>
                <div className="relative w-64">
                   <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600" />
                   <input 
                     type="text" 
                     placeholder="Search agents..." 
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full pl-9 pr-4 py-2 bg-white dark:bg-dark-bg border border-slate-100 dark:border-dark-border rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all text-slate-950 dark:text-dark-text"
                   />
                </div>
             </div>

             <div className="space-y-2">
                {filteredUsers.map(u => (
                  <button
                    key={u.uid}
                    onClick={() => setSelectedUser(u)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
                      selectedUser?.uid === u.uid 
                        ? 'bg-slate-900 text-white shadow-xl dark:bg-indigo-600' 
                        : 'bg-white dark:bg-dark-bg border border-slate-100 dark:border-dark-border hover:border-indigo-200 dark:hover:border-indigo-500/30'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                        selectedUser?.uid === u.uid ? 'bg-indigo-600 text-white dark:bg-white dark:text-indigo-600' : 'bg-slate-100 dark:bg-dark-surface text-slate-400 dark:text-dark-text-muted'
                      }`}>
                        {u.name[0]}
                      </div>
                      <div className="text-left">
                         <p className={`text-sm font-bold truncate max-w-[150px] ${selectedUser?.uid === u.uid ? 'text-white' : 'text-slate-950 dark:text-dark-text'}`}>{u.name}</p>
                         <p className={`text-[10px] uppercase font-black tracking-widest ${selectedUser?.uid === u.uid ? 'text-indigo-300/80 dark:text-indigo-100' : 'text-slate-400 dark:text-dark-text-muted'}`}>
                           {u.role}
                         </p>
                      </div>
                    </div>
                    <ChevronRight size={16} className={selectedUser?.uid === u.uid ? 'text-indigo-400' : 'text-slate-200 dark:text-slate-700'} />
                  </button>
                ))}
             </div>
          </div>

          {/* User Permission Grid */}
          <AnimatePresence mode="wait">
            {selectedUser ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-white dark:bg-dark-surface border border-slate-100 dark:border-dark-border rounded-[40px] p-8 shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-bl-full -z-10" />
                
                <div className="flex justify-between items-start mb-10">
                   <div>
                      <h2 className="text-2xl font-black text-slate-950 dark:text-dark-text mb-1">{selectedUser.name}</h2>
                      <p className="text-xs font-bold text-slate-400 dark:text-dark-text-muted uppercase tracking-widest">{selectedUser.role} clearance profile</p>
                   </div>
                   <div className="flex items-center space-x-2 bg-slate-950 dark:bg-white text-white dark:text-indigo-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
                      <Shield size={14} className="text-indigo-400 dark:text-indigo-600" />
                      <span>Level {selectedUser.role === 'admin' ? '4' : selectedUser.role === 'manager' ? '3' : '2'}</span>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {AVAILABLE_PERMISSIONS.map(perm => {
                     const isGranted = (selectedUser.permissions || DEFAULT_ROLE_PERMISSIONS[selectedUser.role] || []).includes(perm.id);
                     const canEdit = isAdmin || (isManager && selectedUser.role !== 'admin' && selectedUser.role !== 'manager');
                     
                     return (
                       <div 
                         key={perm.id} 
                         onClick={() => canEdit && togglePermission(selectedUser, perm.id)}
                         className={`p-4 rounded-3xl border transition-all flex items-center justify-between group ${
                           isGranted 
                            ? 'bg-indigo-50/30 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/30' 
                            : 'bg-slate-50 dark:bg-dark-bg border-slate-100 dark:border-dark-border'
                         } ${canEdit ? 'cursor-pointer hover:shadow-lg' : 'cursor-default opacity-80'}`}
                       >
                          <div className="flex items-center space-x-4">
                             <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isGranted ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-200 dark:bg-dark-surface text-slate-400 dark:text-dark-text-muted'}`}>
                                {isGranted ? <Shield size={18} /> : <Lock size={18} />}
                             </div>
                             <div>
                                <p className="text-xs font-black uppercase tracking-widest text-slate-950 dark:text-dark-text">{perm.label}</p>
                                <p className="text-[10px] text-slate-500 dark:text-dark-text-muted font-medium">{perm.description}</p>
                             </div>
                          </div>
                          {isGranted && <Check size={20} className="text-indigo-600 dark:text-indigo-400" />}
                       </div>
                     );
                   })}
                </div>
              </motion.div>
            ) : (
              <div className="py-20 text-center border-2 border-dashed border-slate-100 dark:border-dark-border rounded-[40px] bg-slate-50/30 dark:bg-dark-surface/30">
                 <div className="w-16 h-16 bg-white dark:bg-dark-surface border border-slate-100 dark:border-dark-border rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300 dark:text-dark-text-muted shadow-sm">
                    <UserIcon size={24} />
                 </div>
                 <p className="text-slate-400 dark:text-dark-text-muted font-bold uppercase tracking-widest text-[10px]">Select personnel to manage clearance</p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar: Requests */}
        <div className="space-y-6">
           <div className="bg-slate-950 rounded-[32px] p-6 text-white overflow-hidden relative shadow-2xl">
              <div className="relative z-10 flex items-center space-x-3 mb-6">
                 <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center">
                    <Clock size={20} />
                 </div>
                 <div>
                    <h3 className="font-bold text-sm">System Logs</h3>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Clearance Requests</p>
                 </div>
              </div>

              <div className="relative z-10 space-y-4">
                 {requests.length === 0 ? (
                   <div className="text-center py-10 opacity-40">
                      <p className="text-xs font-bold uppercase tracking-widest">No Active Logs</p>
                   </div>
                 ) : (
                   requests.map(req => (
                     <div key={req.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center space-x-2">
                              <Shield size={12} className="text-indigo-400" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">{req.requestedPermission}</span>
                           </div>
                           <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                             req.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                             req.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                             'bg-rose-500/20 text-rose-400'
                           }`}>
                             {req.status}
                           </span>
                        </div>
                        <p className="text-xs font-bold">{req.userName}</p>
                        <p className="text-[10px] text-slate-400 italic">"{req.reason}"</p>
                        
                        {req.status === 'pending' && (isAdmin || isManager) && (
                          <div className="flex gap-2 pt-2">
                             <button 
                               onClick={() => handleResolveRequest(req, 'approved')}
                               className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] font-black uppercase py-2 rounded-lg transition-colors"
                             >
                               Grant
                             </button>
                             <button
                               onClick={() => handleResolveRequest(req, 'rejected')}
                               className="flex-1 bg-white/10 hover:bg-white/20 text-white text-[9px] font-black uppercase py-2 rounded-lg transition-colors"
                             >
                               Deny
                             </button>
                          </div>
                        )}
                     </div>
                   ))
                 )}
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 rounded-full blur-[80px] -z-0" />
           </div>

           <div className="bg-white dark:bg-dark-surface border border-slate-100 dark:border-dark-border rounded-[32px] p-6 shadow-sm">
              <div className="flex items-center space-x-3 mb-6">
                 <Info size={18} className="text-slate-400 dark:text-dark-text-muted" />
                 <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-dark-text-muted">Hierarchy Guide</h3>
              </div>
              <div className="space-y-4">
                 <div className="flex items-start space-x-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5" />
                    <p className="text-[11px] text-slate-500 dark:text-dark-text-muted leading-relaxed"><span className="font-bold text-slate-700 dark:text-dark-text uppercase">Admins</span> have total operative authority over all system nodes.</p>
                 </div>
                 <div className="flex items-start space-x-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5" />
                    <p className="text-[11px] text-slate-500 dark:text-dark-text-muted leading-relaxed"><span className="font-bold text-slate-700 dark:text-dark-text uppercase">Managers</span> can override clearance for Sales and Team Leads.</p>
                 </div>
                 <div className="flex items-start space-x-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5" />
                    <p className="text-[11px] text-slate-500 dark:text-dark-text-muted leading-relaxed"><span className="font-bold text-slate-700 dark:text-dark-text uppercase">Requests</span> must be approved by a superior operative for activation.</p>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Access Request Modal */}
      <AnimatePresence>
        {showRequestModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-dark-surface rounded-[40px] p-10 max-w-md w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-bl-[80px] -z-10" />
              <button 
                onClick={() => setShowRequestModal(false)}
                className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-950 dark:hover:text-white transition-colors"
              >
                <X size={24} />
              </button>

              <div className="flex items-center space-x-3 mb-6">
                 <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none">
                    <Shield size={24} />
                 </div>
                 <div>
                    <h3 className="text-2xl font-black text-slate-950 dark:text-dark-text font-display italic leading-none">Security Request</h3>
                    <p className="text-[10px] font-black text-slate-400 dark:text-dark-text-muted uppercase tracking-widest">Escalation of Clearance</p>
                 </div>
              </div>

              <div className="space-y-6">
                 <div>
                   <label className="block text-[10px] font-black text-slate-400 dark:text-dark-text-muted uppercase tracking-widest mb-3 px-1">Requested Module</label>
                   <select 
                     className="saas-input appearance-none bg-slate-50 dark:bg-dark-bg text-slate-950 dark:text-dark-text"
                     value={requestData.permission}
                     onChange={(e) => setRequestData({ ...requestData, permission: e.target.value as Permission })}
                   >
                     <option value="">Select clearance...</option>
                     {AVAILABLE_PERMISSIONS.map(p => (
                       <option key={p.id} value={p.id}>{p.label}</option>
                     ))}
                   </select>
                 </div>
                 <div>
                   <label className="block text-[10px] font-black text-slate-400 dark:text-dark-text-muted uppercase tracking-widest mb-3 px-1">Justification</label>
                   <textarea 
                     className="saas-input min-h-[120px] bg-slate-50 dark:bg-dark-bg resize-none py-4 text-slate-950 dark:text-dark-text"
                     placeholder="State the objective for this access level..."
                     value={requestData.reason}
                     onChange={(e) => setRequestData({ ...requestData, reason: e.target.value })}
                   />
                 </div>
                 <button 
                   onClick={submitRequest}
                   className="w-full saas-button-primary py-4 shadow-2xl shadow-indigo-200 dark:shadow-none"
                 >
                    Submit Authorization Log
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
