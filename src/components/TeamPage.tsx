import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { UserProfile, Invite, AccessRequest, UserRole, Company } from '../types';
import { Plus, Trash2, Mail, Shield, User as UserIcon, Check, X, Copy, Globe, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

export default function TeamPage({ user, company }: { user: UserProfile, company: Company | null }) {
  const [team, setTeam] = useState<UserProfile[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'members' | 'invites'>('members');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingMember, setEditingMember] = useState<UserProfile | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('sales');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const teamQ = query(collection(db, 'users'), where('companyId', '==', user.companyId));
    const inviteQ = query(collection(db, 'invites'), where('companyId', '==', user.companyId), where('status', '==', 'pending'));
    const requestsQ = query(collection(db, 'accessRequests'), where('companyId', '==', user.companyId), where('status', '==', 'pending'));

    const unsubTeam = onSnapshot(teamQ, (snap) => {
      setTeam(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
    });

    const unsubInvites = onSnapshot(inviteQ, (snap) => {
      console.log(`[TeamPage] Found ${snap.size} pending invites for company ${user.companyId}`);
      setInvites(snap.docs.map(d => ({ id: d.id, ...d.data() } as Invite)));
    }, (err) => {
      console.error('[TeamPage] Invites listener error:', err);
      toast.error('Failed to load invites. Please check permissions.');
    });

    const unsubRequests = onSnapshot(requestsQ, (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as AccessRequest)));
    });

    return () => {
      unsubTeam();
      unsubInvites();
      unsubRequests();
    };
  }, [user.companyId]);

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

  const deleteInvite = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'invites', id));
      toast.success('Invite cancelled');
    } catch (error) {
      toast.error('Failed to cancel invite');
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

  const updateMemberRole = async (memberUserId: string, newRole: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', memberUserId), { role: newRole });
      toast.success('Role updated successfully');
    } catch (error) {
      toast.error('Failed to update role');
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

      await updateDoc(doc(db, 'users', editingMember.uid), {
        name,
        role
      });
      toast.success('Member details updated');
      setEditingMember(null);
    } catch (error) {
      toast.error('Failed to update member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {user.role === 'admin' && company && (
        <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center space-y-6 md:space-y-0">
            <div>
              <h3 className="text-xl font-black tracking-tight mb-1">Workspace Invite Link</h3>
              <p className="text-slate-400 text-sm">Anyone with this link can request to join {company.name}</p>
            </div>
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full md:w-auto">
              <div className="bg-white/10 backdrop-blur-md border border-white/10 px-4 py-3 rounded-2xl flex items-center justify-between min-w-[200px]">
                <code className="font-mono text-sm font-bold tracking-widest">{company.inviteCode}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(company.inviteCode || '');
                    toast.success('Workspace code copied');
                  }}
                  className="ml-4 p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Copy size={16} />
                </button>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/join/${company.inviteCode}`);
                  toast.success('Full invite link copied');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center space-x-2"
              >
                <Globe size={18} />
                <span>Copy Invite Link</span>
              </button>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        </div>
      )}

      {user.role === 'admin' && requests.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
            <Shield size={20} className="text-blue-500" />
            <span>Access Requests</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {requests.map((req) => (
              <div key={req.id} className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex justify-between items-center shadow-sm">
                <div>
                  <div className="font-bold text-slate-900">{req.userName}</div>
                  <div className="text-xs text-slate-600">Requests <span className="text-blue-600 font-bold uppercase">{req.requestedRole}</span></div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleRequest(req, true)}
                    className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    onClick={() => handleRequest(req, false)}
                    className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Team Management</h2>
          <p className="text-slate-500">Manage your company members and roles</p>
        </div>
        {user.role === 'admin' && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-slate-800 transition-colors"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Invite Member</span>
          </button>
        )}
      </div>

      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('members')}
          className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${
            activeTab === 'members' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Active Members ({team.length})
        </button>
        <button
          onClick={() => setActiveTab('invites')}
          className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${
            activeTab === 'invites' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Pending Invites ({invites.length})
        </button>
      </div>

      {activeTab === 'members' ? (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Member</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Role</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Joined</th>
                    {user.role === 'admin' && <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {team.map((member) => (
                    <tr key={member.uid}>
                      <td className="px-6 py-4">
                         <code className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                           {member.memberId || 'PENDING'}
                         </code>
                      </td>
                      <td className="px-6 py-4">
                         <div className="flex items-center space-x-3">
                           <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                             {member.photoURL ? (
                               <img src={member.photoURL} alt={member.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                             ) : (
                               <span className="text-xs font-bold text-slate-400">{member.name[0]}</span>
                             )}
                           </div>
                           <div className="min-w-0">
                             <div className="font-medium text-slate-900 truncate">{member.name}</div>
                             <div className="text-xs text-slate-500 truncate">{member.email}</div>
                           </div>
                         </div>
                      </td>
                      <td className="px-6 py-4">
                         <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                           member.role === 'admin' ? 'bg-rose-100 text-rose-700' :
                           member.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                           member.role === 'team_lead' ? 'bg-emerald-100 text-emerald-700' :
                           'bg-slate-100 text-slate-700'
                         }`}>
                           {member.role.replace('_', ' ')}
                         </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {new Date(member.createdAt).toLocaleDateString()}
                      </td>
                      {user.role === 'admin' && (
                        <td className="px-6 py-4 text-right">
                          {member.uid !== user.uid && (
                            <button
                              onClick={() => setEditingMember(member)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              title="Edit Member"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {invites.length > 0 ? (
            invites.map((invite) => (
              <div key={invite.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 hover:border-blue-100 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600">
                    <Mail size={20} />
                  </div>
                  <button
                    onClick={() => deleteInvite(invite.id)}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <div>
                  <div className="font-bold text-slate-900 truncate">{invite.email}</div>
                  <div className="text-xs font-black text-blue-600 uppercase tracking-widest mt-1">{invite.role}</div>
                </div>
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <code className="text-[10px] font-mono text-slate-500 truncate mr-2">{invite.token}</code>
                    <button 
                       onClick={() => {
                         navigator.clipboard.writeText(invite.token);
                         toast.success('Invite code copied');
                       }}
                       className="p-1.5 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 text-slate-400 hover:text-blue-600 transition-all"
                       title="Copy Code"
                    >
                       <Copy size={14} />
                    </button>
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/join/${invite.token}`);
                      toast.success('Invite link copied');
                    }}
                    className="w-full text-xs text-blue-600 font-black flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-blue-50/50 hover:bg-blue-100 transition-all uppercase tracking-wider"
                  >
                    <Globe size={14} />
                    <span>Copy Link</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="md:col-span-2 xl:col-span-3 text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
                <Mail size={32} />
              </div>
              <h4 className="text-slate-900 font-bold">No Pending Invites</h4>
              <p className="text-slate-500 text-sm mt-1">New invites you send will appear here.</p>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-6 font-sans tracking-tight">Invite Team Member</h3>
              <form onSubmit={handleInvite} className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Email Address</label>
                  <input
                    type="email"
                    required
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@agency.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Assign Role</label>
                  <select
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-sm font-bold"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                  >
                    <option value="sales">Sales</option>
                    <option value="team_lead">Team Lead</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex space-x-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 p-4 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={loading}
                    className="flex-1 bg-slate-900 text-white p-4 rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50 shadow-lg shadow-slate-200 text-sm"
                  >
                    {loading ? 'Sending...' : 'Send Invite'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {editingMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-6 font-sans tracking-tight">Edit Member</h3>
              <form onSubmit={updateMemberDetails} className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Member ID</label>
                  <div className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 font-mono text-xs font-bold">
                    {editingMember.memberId}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Full Name</label>
                  <input
                    name="name"
                    type="text"
                    required
                    defaultValue={editingMember.name}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Access Level (Role)</label>
                  <select
                    name="role"
                    defaultValue={editingMember.role}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-sm font-bold"
                  >
                    <option value="sales">Sales</option>
                    <option value="team_lead">Team Lead</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex space-x-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingMember(null)}
                    className="flex-1 p-4 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white p-4 rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-100 text-sm"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
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
