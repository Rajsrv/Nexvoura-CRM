import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { updatePassword, updateProfile, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { UserProfile } from '../types';
import { useNotifications } from '../contexts/NotificationContext';
import { toast } from 'sonner';
import { Camera, Lock, User as UserIcon, Shield, ChevronRight, Mail, Key, Copy, Sun, Moon, Layout, CheckSquare, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { useTheme } from '../contexts/ThemeContext';

interface ProfilePageProps {
  user: UserProfile;
}

export default function ProfilePage({ user }: ProfilePageProps) {
  const { sendNotification } = useNotifications();
  const { theme, setTheme } = useTheme();
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

      await sendNotification({
        userId: user.uid,
        type: 'profile_update',
        title: 'Identity record Synchronized',
        message: 'Your operative profile has been updated in the Nexvoura central database.',
        link: '/profile'
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
      
      await sendNotification({
        userId: user.uid,
        type: 'admin_alert',
        title: 'Security Protocol Updated',
        message: 'Your account access credentials were changed successfully. If you did not authorize this, contact an administrator.',
      });

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
    <div className="max-w-6xl mx-auto space-y-12 pb-20 animate-in fade-in duration-700">
      <div className="space-y-4">
        <h2 className="text-4xl md:text-6xl font-black font-display italic text-slate-900 dark:text-white tracking-tighter leading-none transition-colors">
          Personal Settings
        </h2>
        <p className="text-slate-500 dark:text-dark-text-muted font-medium ml-1 max-w-2xl">
          Supervise and adjust your professional identity parameters. NEX-directive requires accurate personnel data for optimal synchronization.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-8 space-y-8">
          <section className="bg-white dark:bg-dark-surface p-6 sm:p-10 rounded-[40px] border border-slate-200 dark:border-dark-border shadow-sm space-y-10 relative overflow-hidden transition-colors">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl text-indigo-600">
                <UserIcon size={24} />
              </div>
              <h3 className="text-2xl font-black font-display italic text-slate-900 dark:text-white uppercase tracking-tight">Account Identity</h3>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-8">
              <div className="flex flex-col md:flex-row items-start gap-10">
                <div className="relative group mx-auto md:mx-0">
                  <div className="w-32 h-32 rounded-[32px] bg-slate-900 dark:bg-dark-bg flex items-center justify-center overflow-hidden border-4 border-white dark:border-dark-surface shadow-2xl transition-transform hover:scale-105">
                    {photoUrl ? (
                      <img src={photoUrl} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-5xl font-black text-white">{name[0]}</span>
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 p-3 bg-blue-600 text-white rounded-2xl shadow-xl border-2 border-white dark:border-dark-surface transform transition-transform group-hover:scale-110">
                    <Camera size={16} />
                  </div>
                </div>
                
                <div className="flex-1 w-full space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-dark-text-muted uppercase tracking-[0.2em] mb-3 ml-2">Member ID</label>
                    <div className="flex items-center space-x-3">
                       <code className="bg-slate-950 px-6 py-3 rounded-2xl text-indigo-400 font-bold text-sm tracking-tight border border-slate-800 transition-colors shadow-inner flex-1 md:flex-none md:w-64">
                         {user.memberId}
                       </code>
                       <button 
                         type="button"
                         onClick={() => {
                           navigator.clipboard.writeText(user.memberId);
                           toast.success('Member ID copied');
                         }}
                         className="p-3 bg-slate-100 dark:bg-dark-bg text-slate-400 dark:text-dark-text-muted hover:text-indigo-600 dark:hover:text-indigo-400 rounded-2xl transition-all hover:bg-white dark:hover:bg-dark-surface border border-transparent hover:border-slate-200 dark:hover:border-dark-border"
                       >
                         <Copy size={18} />
                       </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-dark-text-muted uppercase tracking-[0.2em] mb-3 ml-2">Profile Picture URL</label>
                    <input
                      type="url"
                      value={photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                      className="w-full p-5 bg-white dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-[24px] focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-300"
                      placeholder="https://images.unsplash.com/..."
                    />
                    <p className="text-[10px] text-slate-400 dark:text-dark-text-muted mt-3 italic font-medium ml-2">Use a direct image link from Unsplash or Google.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 dark:text-dark-text-muted uppercase tracking-[0.2em] ml-2">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-5 bg-white dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-[24px] focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-sm font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 dark:text-dark-text-muted uppercase tracking-[0.2em] ml-2">Email Address</label>
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full p-5 bg-slate-100/50 dark:bg-dark-bg/50 border border-slate-200 dark:border-dark-border rounded-[24px] text-slate-500 dark:text-dark-text-muted outline-none cursor-not-allowed text-sm font-bold shadow-inner"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-6">
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="bg-indigo-600 text-white px-10 py-4 rounded-[20px] font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-950 dark:hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
                >
                  {isUpdatingProfile ? 'Saving...' : 'Update Profile'}
                </button>
              </div>
            </form>
          </section>

          {/* Security Section */}
          <section className="bg-white dark:bg-dark-surface p-6 sm:p-10 rounded-[40px] border border-slate-200 dark:border-dark-border shadow-sm space-y-10 transition-colors">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl text-emerald-600">
                <Shield size={24} />
              </div>
              <h3 className="text-2xl font-black font-display italic text-slate-900 dark:text-white uppercase tracking-tight">Security & Privacy</h3>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-slate-100/30 dark:bg-dark-bg/50 border border-slate-200 dark:border-dark-border rounded-[32px] gap-4">
                <div className="flex items-center space-x-5">
                  <div className="p-4 bg-white dark:bg-dark-surface rounded-2xl text-slate-500 shadow-sm border border-slate-100 dark:border-dark-border">
                    <Key size={22} />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Account Password</h4>
                    <p className="text-xs font-medium text-slate-500 dark:text-dark-text-muted mt-1">Regularly update your credentials to stay secure.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPasswordDialog(true)}
                  className="flex items-center justify-center space-x-2 bg-slate-900 dark:bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black dark:hover:bg-indigo-700 transition-all shadow-xl active:scale-95"
                >
                  <span>Update Password</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-slate-100/30 dark:bg-dark-bg/50 border border-slate-200 dark:border-dark-border rounded-[32px] gap-4">
                <div className="flex items-center space-x-5">
                  <div className="p-4 bg-white dark:bg-dark-surface rounded-2xl text-slate-500 shadow-sm border border-slate-100 dark:border-dark-border">
                    <Mail size={22} />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Email Verification</h4>
                    <p className="text-xs font-medium text-slate-500 dark:text-dark-text-muted mt-1">Your primary access email is verified and secured.</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 px-6 py-3 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 font-black text-[10px] uppercase tracking-widest leading-none">
                  <span>Verified Identity</span>
                  <ShieldCheck size={14} />
                </div>
              </div>
            </div>
          </section>

          {/* Theme Settings */}
          <section className="bg-white dark:bg-dark-surface p-6 sm:p-10 rounded-[40px] border border-slate-200 dark:border-dark-border shadow-sm space-y-10 transition-colors">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-500/10 rounded-2xl text-amber-600">
                <Layout size={24} />
              </div>
              <h3 className="text-2xl font-black font-display italic text-slate-900 dark:text-white uppercase tracking-tight">Visual Profile</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <button
                onClick={() => setTheme('light')}
                className={`group flex items-center justify-between p-6 rounded-[32px] border-2 transition-all ${
                  theme === 'light' 
                    ? 'bg-slate-50 dark:bg-indigo-900/30 border-slate-900 shadow-xl' 
                    : 'bg-white dark:bg-dark-bg border-slate-200 dark:border-dark-border hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-5">
                  <div className={`p-4 rounded-2xl transition-colors ${theme === 'light' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-slate-200'}`}>
                    <Sun size={24} />
                  </div>
                  <div className="text-left">
                    <h4 className={`text-base font-black uppercase tracking-tight leading-none ${theme === 'light' ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>Daylink</h4>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Standard Interface</p>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-4 flex items-center justify-center transition-all ${theme === 'light' ? 'border-slate-900 bg-white' : 'border-slate-200 bg-transparent'}`}>
                  {theme === 'light' && <div className="w-2.5 h-2.5 rounded-full bg-slate-900" />}
                </div>
              </button>

              <button
                onClick={() => setTheme('dark')}
                className={`group flex items-center justify-between p-6 rounded-[32px] border-2 transition-all ${
                  theme === 'dark' 
                    ? 'bg-slate-950 border-indigo-500 shadow-xl' 
                    : 'bg-white dark:bg-dark-bg border-slate-200 dark:border-dark-border hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-5">
                  <div className={`p-4 rounded-2xl transition-colors ${theme === 'dark' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-slate-200'}`}>
                    <Moon size={24} />
                  </div>
                  <div className="text-left">
                    <h4 className={`text-base font-black uppercase tracking-tight leading-none ${theme === 'dark' ? 'text-white' : 'text-slate-400'}`}>Omnidark</h4>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Advanced Interface</p>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-4 flex items-center justify-center transition-all ${theme === 'dark' ? 'border-indigo-600 bg-white' : 'border-slate-200 bg-transparent'}`}>
                  {theme === 'dark' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                </div>
              </button>
            </div>
          </section>
        </div>

        {/* Sidebar Info */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-[#0f1117] dark:bg-dark-surface p-10 rounded-[40px] text-white shadow-2xl border border-slate-800">
            <h4 className="text-[12px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-8 italic">Account Metadata</h4>
            <div className="space-y-10">
              <div className="flex justify-between items-end border-b border-white/5 pb-4">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Joined</span>
                <span className="text-sm font-black font-display italic tracking-tight">{new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between items-end border-b border-white/5 pb-4">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Access Role</span>
                <span className="px-5 py-2 bg-indigo-500/10 text-indigo-400 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-indigo-500/20">{user.role}</span>
              </div>
              <div className="flex flex-col space-y-3">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Corporate Entity ID</span>
                <div className="bg-[#0a0c10] dark:bg-dark-bg p-5 rounded-[24px] border border-white/5 flex items-start gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-indigo-500 animate-pulse shrink-0" />
                  <code className="font-mono text-[11px] text-indigo-300 break-all leading-relaxed">{user.companyId}</code>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 bg-indigo-600 rounded-[40px] text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden group">
            <div className="relative z-10 space-y-4">
              <h4 className="text-lg font-black font-display italic uppercase tracking-tight">Nexvoura Intelligence</h4>
              <p className="text-xs font-medium text-white/80 leading-relaxed">Your professional parameters are currently synchronized with the Nexvoura global directive protocols.</p>
              <div className="pt-2">
                <div className="inline-flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
                  <ShieldCheck size={14} />
                  <span>Secure Connection Active</span>
                </div>
              </div>
            </div>
            <ShieldCheck size={120} className="absolute -bottom-10 -right-10 text-white/5 transform group-hover:scale-110 transition-transform duration-700" />
          </div>
        </div>
      </div>


      {/* Password Modal */}
      {showPasswordDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-dark-surface rounded-[2rem] p-8 max-w-md w-full shadow-2xl space-y-6 border dark:border-dark-border"
          >
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">Update Password</h3>
              <p className="text-slate-500 dark:text-dark-text-muted text-sm font-medium">Please enter your current and new passwords.</p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-dark-text-muted uppercase tracking-[0.2em] mb-2">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full p-4 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white"
                />
              </div>
              <div className="pt-2">
                <label className="block text-[10px] font-black text-slate-400 dark:text-dark-text-muted uppercase tracking-[0.2em] mb-2">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-4 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-dark-text-muted uppercase tracking-[0.2em] mb-2">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-4 bg-slate-50 dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPasswordDialog(false)}
                  className="flex-1 px-6 py-4 bg-slate-100 dark:bg-dark-bg text-slate-600 dark:text-dark-text-muted rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-dark-surface transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="flex-1 px-6 py-4 bg-blue-600 dark:bg-indigo-600 text-white rounded-2xl font-bold hover:bg-blue-500 dark:hover:bg-indigo-700 transition-all shadow-lg shadow-blue-200 dark:shadow-indigo-500/20 disabled:opacity-50"
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
