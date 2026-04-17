import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { UserProfile, Invite, AccessRequest, UserRole } from '../types';
import { Plus, Trash2, Mail, Shield, User as UserIcon, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

export default function TeamPage({ user }: { user: UserProfile }) {
  const [team, setTeam] = useState<UserProfile[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
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
      setInvites(snap.docs.map(d => ({ id: d.id, ...d.data() } as Invite)));
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
      const token = crypto.randomUUID();
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

  const updateMemberRole = async (memberId: string, newRole: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', memberId), { role: newRole });
      toast.success('Role updated successfully');
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  return (
    <div className="space-y-8">
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
            <span>Invite Member</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
            <UserIcon size={20} />
            <span>Active Members</span>
          </h3>
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Role</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {team.map((member) => (
                  <tr key={member.uid}>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{member.name}</div>
                      <div className="text-sm text-slate-500">{member.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      {user.role === 'admin' && member.uid !== user.uid ? (
                        <select
                          className="px-2 py-1 rounded-lg text-xs font-bold uppercase bg-slate-100 border-none outline-none focus:ring-1 focus:ring-slate-300"
                          value={member.role}
                          onChange={(e) => updateMemberRole(member.uid, e.target.value as UserRole)}
                        >
                          <option value="sales">Sales</option>
                          <option value="team_lead">Team Lead</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                          member.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                          member.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                          member.role === 'team_lead' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {member.role.replace('_', ' ')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(member.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
            <Mail size={20} />
            <span>Pending Invites</span>
          </h3>
          <div className="space-y-4">
            {invites.map((invite) => (
              <div key={invite.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center">
                <div>
                  <div className="font-medium text-slate-900">{invite.email}</div>
                  <div className="text-xs text-slate-500 uppercase font-bold mt-1">{invite.role}</div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/join/${invite.token}`);
                      toast.success('Invite link copied');
                    }}
                    className="text-[10px] text-blue-600 font-bold hover:underline mt-2 flex items-center space-x-1"
                  >
                    <span>Copy Invite Link</span>
                  </button>
                </div>
                <button
                  onClick={() => deleteInvite(invite.id)}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            {invites.length === 0 && (
              <div className="text-center py-8 text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No pending invites
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Invite Team Member</h3>
              <form onSubmit={handleInvite} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    required
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@agency.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Role</label>
                  <select
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                  >
                    <option value="sales">Sales</option>
                    <option value="team_lead">Team Lead</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 p-4 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={loading}
                    className="flex-1 bg-slate-900 text-white p-4 rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Sending...' : 'Send Invite'}
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
