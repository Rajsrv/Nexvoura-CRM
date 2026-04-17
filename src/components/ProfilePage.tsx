import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { updatePassword, updateProfile, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { UserProfile } from '../types';
import { toast } from 'sonner';
import { Camera, Lock, User as UserIcon, Shield, ChevronRight, Mail, Key, Copy } from 'lucide-react';
import { motion } from 'motion/react';

interface ProfilePageProps {
  user: UserProfile;
}

export default function ProfilePage({ user }: ProfilePageProps) {
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  
  // Profile State
  const [photoUrl, setPhotoUrl] = useState(user.photoURL || '');
  const [name, setName] = useState(user.name);

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setIsUpdatingProfile(true);
    try {
      // Update Auth Profile
      await updateProfile(auth.currentUser, {
        displayName: name,
        photoURL: photoUrl
      });

      // Update Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        name,
        photoURL: photoUrl
      });

      toast.success('Profile updated successfully');
    } catch (error: any) {
      console.error('Update profile error:', error);
      toast.error('Failed to update profile: ' + error.message);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(auth.currentUser.email!, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Update password
      await updatePassword(auth.currentUser, newPassword);
      
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordDialog(false);
    } catch (error: any) {
      console.error('Password change error:', error);
      toast.error('Failed to change password: ' + (error.code === 'auth/wrong-password' ? 'Incorrect current password' : error.message));
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Personal Settings</h2>
        <p className="text-slate-500 font-medium">Manage your account identity and security</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-8 relative overflow-hidden">
            <div className="flex items-center space-x-4 mb-2">
              <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                <UserIcon size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Account Identity</h3>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="flex flex-col md:flex-row items-center gap-8 py-4">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-3xl bg-slate-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-xl">
                    {photoUrl ? (
                      <img src={photoUrl} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-3xl font-black text-slate-400">{name[0]}</span>
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 p-2 bg-blue-600 text-white rounded-xl shadow-lg border-2 border-white">
                    <Camera size={14} />
                  </div>
                </div>
                
                <div className="flex-1 w-full space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Member ID</label>
                    <div className="flex items-center space-x-2">
                       <code className="bg-slate-100 px-4 py-2 rounded-xl text-blue-600 font-bold text-sm border border-slate-200">
                         {user.memberId}
                       </code>
                       <button 
                         onClick={() => {
                           navigator.clipboard.writeText(user.memberId);
                           toast.success('Member ID copied');
                         }}
                         className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                       >
                         <Copy size={16} />
                       </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Profile Picture URL</label>
                    <input
                      type="url"
                      value={photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
                      placeholder="https://images.unsplash.com/..."
                    />
                    <p className="text-[10px] text-slate-400 mt-2 italic font-medium">Use a direct image link from Unsplash or Google.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Email Address</label>
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full p-4 bg-slate-100 border border-slate-200 rounded-xl text-slate-400 outline-none cursor-not-allowed text-sm font-medium"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
                >
                  {isUpdatingProfile ? 'Saving...' : 'Update Profile'}
                </button>
              </div>
            </form>
          </section>

          {/* Security Section */}
          <section className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center space-x-4 mb-2">
              <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                <Shield size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Security & Privacy</h3>
            </div>

            <div className="divide-y divide-slate-100">
              <div className="py-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
                    <Key size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Account Password</p>
                    <p className="text-xs text-slate-400">Regularly update your password to stay secure.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPasswordDialog(true)}
                  className="flex items-center space-x-2 text-blue-600 font-bold text-sm hover:translate-x-1 transition-transform"
                >
                  <span>Change Password</span>
                  <ChevronRight size={16} />
                </button>
              </div>
              <div className="py-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
                    <Mail size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Email Verification</p>
                    <p className="text-xs text-slate-400">Your email is verified and secured.</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-emerald-500 font-bold text-xs uppercase tracking-widest">
                  <span>Verified</span>
                  <Shield size={12} />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-xl shadow-slate-200">
            <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-4">Account Metadata</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Joined</span>
                <span className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Role</span>
                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-md font-bold uppercase tracking-tighter">{user.role}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Company ID</span>
                <span className="font-mono text-[10px] bg-slate-800 px-2 py-1 rounded">{user.companyId}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-900">Update Password</h3>
              <p className="text-slate-500 text-sm font-medium">Please enter your current and new passwords.</p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div className="pt-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPasswordDialog(false)}
                  className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
                >
                  {isUpdatingPassword ? 'Updating...' : 'Change'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
