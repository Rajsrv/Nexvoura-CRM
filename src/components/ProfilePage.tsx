import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { updatePassword, updateProfile, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, updateDoc, collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { UserProfile, Attendance, LeaveRequest, PerformanceReview } from '../types';
import { toast } from 'sonner';
import { 
  Camera, Lock, User as UserIcon, Shield, ChevronRight, Mail, Key, Copy, 
  Download, Briefcase, Calendar as CalendarIcon, DollarSign, Award, Clock, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface ProfilePageProps {
  user: UserProfile;
}

export default function ProfilePage({ user }: ProfilePageProps) {
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  
  // Data States
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [performance, setPerformance] = useState<PerformanceReview[]>([]);
  
  // Profile State
  const [photoUrl, setPhotoUrl] = useState(user.photoURL || '');
  const [name, setName] = useState(user.name);

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!user.uid) return;

    const attQ = query(
      collection(db, 'attendance'),
      where('employeeId', '==', user.uid),
      orderBy('date', 'desc'),
      limit(5)
    );
    const leaveQ = query(
      collection(db, 'leaveRequests'),
      where('employeeId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    const perfQ = query(
      collection(db, 'performanceReviews'),
      where('employeeId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(3)
    );

    const unsubAtt = onSnapshot(attQ, (snap) => {
      setAttendance(snap.docs.map(d => ({ id: d.id, ...d.data() } as Attendance)));
    }, (err) => console.error("Attendance fetch error:", err));

    const unsubLeave = onSnapshot(leaveQ, (snap) => {
      setLeaveRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as LeaveRequest)));
    }, (err) => console.error("Leave fetch error:", err));

    const unsubPerf = onSnapshot(perfQ, (snap) => {
      setPerformance(snap.docs.map(d => ({ id: d.id, ...d.data() } as PerformanceReview)));
    }, (err) => console.error("Performance fetch error:", err));

    return () => {
      unsubAtt();
      unsubLeave();
      unsubPerf();
    };
  }, [user.uid]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setIsUpdatingProfile(true);
    try {
      await updateProfile(auth.currentUser, {
        displayName: name,
        photoURL: photoUrl
      });

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

  const exportPersonalData = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Nexvoura Personnel Record', 20, 25);
    
    doc.setFontSize(10);
    doc.text(`Generated on ${new Date().toLocaleString()}`, 140, 25);

    // Profile Section
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(16);
    doc.text('Employee Overview', 20, 55);
    
    const profileData = [
      ['Name', user.name],
      ['Email', user.email],
      ['Member ID', user.memberId || 'N/A'],
      ['Role', user.role.toUpperCase()],
      ['Department', user.department || 'N/A'],
      ['Joining Date', user.joiningDate || 'N/A'],
      ['Salary', user.salary ? `$${user.salary.toLocaleString()}` : 'Locked']
    ];

    (doc as any).autoTable({
      startY: 65,
      head: [['Field', 'Details']],
      body: profileData,
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] }, // indigo-500
    });

    // Attendance
    if (attendance.length > 0) {
      doc.text('Recent Attendance', 20, (doc as any).lastAutoTable.finalY + 15);
      (doc as any).autoTable({
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Date', 'Check In', 'Check Out', 'Status']],
        body: attendance.map(a => [
          a.date,
          a.checkIn ? new Date(a.checkIn).toLocaleTimeString() : '—',
          a.checkOut ? new Date(a.checkOut).toLocaleTimeString() : '—',
          a.status
        ]),
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] }, // blue-500
      });
    }

    // Performance
    if (performance.length > 0) {
      doc.text('Performance Reviews', 20, (doc as any).lastAutoTable.finalY + 15);
      (doc as any).autoTable({
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Period', 'Rating', 'Feedback']],
        body: performance.map(p => [
          p.period || 'N/A',
          `${p.rating}/5`,
          p.feedback || '—'
        ]),
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] }, // emerald-500
      });
    }

    doc.save(`Nexvoura_Profile_${user.name.replace(/\s+/g, '_')}.pdf`);
    toast.success('Data exported to neural storage (PDF)');
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
      const credential = EmailAuthProvider.credential(auth.currentUser.email!, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
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
    <div className="max-w-6xl mx-auto space-y-12 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic">Personal Dashboard</h2>
          <p className="text-slate-500 font-medium mt-1">Personnel Command & Control for {user.name}</p>
        </div>
        <button 
          onClick={exportPersonalData}
          className="flex items-center space-x-3 bg-slate-950 text-white px-8 py-4 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-brand-primary transition-all shadow-2xl shadow-slate-200 active:scale-95"
        >
          <Download size={18} />
          <span>Export Data to PDF</span>
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        {/* Profile Card */}
        <div className="xl:col-span-2 space-y-10">
          <section className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/20 space-y-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-50/50 rounded-bl-[120px] -z-10" />
            
            <div className="flex items-center space-x-4 mb-2">
              <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200">
                <UserIcon size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight">Identity Configuration</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Base profile data</p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-8">
              <div className="flex flex-col md:flex-row items-center gap-10 py-4">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-[32px] bg-slate-100 flex items-center justify-center overflow-hidden border-8 border-white shadow-2xl">
                    {photoUrl ? (
                      <img src={photoUrl} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-4xl font-black text-slate-300">{name[0]}</span>
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 p-3 bg-blue-600 text-white rounded-2xl shadow-xl border-4 border-white cursor-pointer hover:bg-blue-700 transition-colors">
                    <Camera size={18} />
                  </div>
                </div>
                
                <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Member ID</label>
                    <div className="flex items-center space-x-2">
                       <code className="bg-slate-900 px-5 py-3 rounded-2xl text-blue-400 font-mono font-bold text-sm flex-1">
                         {user.memberId}
                       </code>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Clearance Level</label>
                    <div className="bg-slate-100 px-5 py-3 rounded-2xl text-slate-600 font-black text-xs uppercase tracking-widest border border-slate-200">
                      {user.role.replace('_', ' ')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">Display Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-200 outline-none transition-all text-sm font-bold uppercase tracking-tight"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">Comm Channel (Email)</label>
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full p-5 bg-slate-100 border border-slate-100 rounded-2xl text-slate-400 outline-none cursor-not-allowed text-sm font-bold"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">Profile Photo Stream URL</label>
                  <input
                    type="url"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-200 outline-none transition-all text-sm font-medium"
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-blue-200 disabled:opacity-50"
                >
                  {isUpdatingProfile ? 'Syncing...' : 'Update Network Avatar'}
                </button>
              </div>
            </form>
          </section>

          {/* Activity Logs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
             {/* Attendance Snapshot */}
             <section className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/10 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                      <Clock size={18} />
                    </div>
                    <h3 className="font-black text-slate-950 uppercase tracking-tight text-sm">Recent Pulse</h3>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Attendance</span>
                </div>
                
                <div className="space-y-4">
                  {attendance.length > 0 ? (
                    attendance.map(record => (
                      <div key={record.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                        <div>
                          <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{record.date}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${
                          record.status === 'On-time' ? 'bg-emerald-100 text-emerald-700' :
                          record.status === 'Late' ? 'bg-amber-100 text-amber-700' :
                          'bg-rose-100 text-rose-700'
                        }`}>
                          {record.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-slate-300 italic text-xs">No pulse logs found.</div>
                  )}
                </div>
             </section>

             {/* Performance Snapshot */}
             <section className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/10 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                      <Award size={18} />
                    </div>
                    <h3 className="font-black text-slate-950 uppercase tracking-tight text-sm">Performance</h3>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Feedback</span>
                </div>
                
                <div className="space-y-4">
                  {performance.length > 0 ? (
                    performance.map(review => (
                      <div key={review.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100/50 space-y-2">
                        <div className="flex justify-between items-center">
                          <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{review.period}</p>
                          <div className="flex space-x-0.5">
                            {[...Array(5)].map((_, i) => (
                              <div key={i} className={`w-2 h-2 rounded-full ${i < review.rating ? 'bg-amber-400' : 'bg-slate-200'}`} />
                            ))}
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-500 line-clamp-2 italic leading-relaxed">"{review.feedback}"</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-slate-300 italic text-xs">No evaluations indexed.</div>
                  )}
                </div>
             </section>
          </div>
        </div>

        {/* Info & Security Sidebar */}
        <div className="space-y-10">
          <section className="bg-slate-950 p-10 rounded-[40px] text-white shadow-2xl shadow-indigo-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 rounded-bl-[80px] -z-10 group-hover:scale-110 transition-transform" />
            
            <h4 className="text-[10px] font-black text-brand-primary uppercase tracking-[0.3em] mb-8">Employment Matrix</h4>
            
            <div className="space-y-6">
              <div className="space-y-1.5 p-5 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                <div className="flex items-center space-x-2 text-slate-400 mb-1">
                  <Briefcase size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Department</span>
                </div>
                <p className="text-lg font-black italic tracking-tight">{user.department || 'Unassigned'}</p>
              </div>

              <div className="space-y-1.5 p-5 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                <div className="flex items-center space-x-2 text-slate-400 mb-1">
                  <CalendarIcon size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Commissioned On</span>
                </div>
                <p className="text-lg font-black italic tracking-tight">
                  {user.joiningDate ? new Date(user.joiningDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Pending...'}
                </p>
              </div>

              <div className="space-y-1.5 p-5 bg-brand-primary/10 rounded-2xl border border-brand-primary/20 hover:bg-brand-primary/20 transition-colors group/salary">
                <div className="flex items-center justify-between mb-1">
                   <div className="flex items-center space-x-2 text-brand-primary">
                    <DollarSign size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Annual Compensation</span>
                  </div>
                  <Shield size={12} className="text-brand-primary animate-pulse" />
                </div>
                <p className="text-2xl font-black italic tracking-tighter text-brand-primary">
                  {user.salary ? `$${user.salary.toLocaleString()}` : '•••••'}
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/10 space-y-8">
            <div className="flex items-center space-x-4 mb-2 px-2">
              <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                <Shield size={20} />
              </div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Security Vault</h3>
            </div>

            <div className="divide-y divide-slate-50">
              <button
                onClick={() => setShowPasswordDialog(true)}
                className="w-full py-5 flex items-center justify-between group px-2 rounded-2xl hover:bg-slate-50 transition-all"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-slate-100 rounded-xl text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <Key size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-slate-900 uppercase tracking-tighter">Access Passkey</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Encrypted Auth Layer</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </button>

              <div className="py-5 flex items-center justify-between group px-2">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-slate-100 rounded-xl text-emerald-500">
                    <Mail size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-slate-900 uppercase tracking-tighter">Neural Verified</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Email Identity Active</p>
                  </div>
                </div>
                <Shield size={12} className="text-emerald-500" />
              </div>
            </div>
          </section>
        </div>
      </div>

      <AnimatePresence>
        {showPasswordDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[40px] p-10 max-w-md w-full shadow-2xl space-y-8 relative"
            >
              <button 
                onClick={() => setShowPasswordDialog(false)}
                className="absolute top-6 right-6 text-slate-300 hover:text-slate-950 transition-colors"
              >
                <X size={24} />
              </button>

              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-blue-100">
                  <Lock size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-950 uppercase tracking-tighter italic">Re-initialize Passkey</h3>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Security sequence required</p>
                </div>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Current Secret</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">New Neural Key</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Confirm Sequence</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white outline-none transition-all"
                  />
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="submit"
                    disabled={isUpdatingPassword}
                    className="flex-1 bg-blue-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-950 transition-all shadow-xl shadow-blue-200 disabled:opacity-50 active:scale-95"
                  >
                    {isUpdatingPassword ? 'Syncing...' : 'Inject Key'}
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
