import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp 
} from 'firebase/firestore';
import { 
  UserProfile, Company, Shift, Holiday, EmployeeDocument, ExitRecord, NotificationType
} from '../types';
import { useNotifications } from '../contexts/NotificationContext';
import { 
  Clock, Calendar as CalendarIcon, FileText, LogOut, CheckCircle, AlertCircle, Plus, 
  Trash2, Download, Search, Filter, Shield, Briefcase, ChevronRight, 
  Moon, Sun, Globe, Smartphone, User, FilePlus, ExternalLink, HardDrive,
  MapPin, UserCheck, Star, ThumbsUp, TrendingUp as TrendingUpIcon, Award,
  Check, Bell
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { logActivity } from '../services/activityService';

type HRTab = 'shifts' | 'holidays' | 'documents' | 'exits' | 'attendance' | 'leave' | 'performance' | 'comms';

export default function HRManagementPage({ user, company }: { user: UserProfile, company: Company | null }) {
  const [activeTab, setActiveTab] = useState<HRTab>('shifts');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [team, setTeam] = useState<UserProfile[]>([]);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [exits, setExits] = useState<ExitRecord[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [performanceReviews, setPerformanceReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = user.role === 'admin';

  useEffect(() => {
    if (!user.companyId) return;

    const shiftsQ = query(collection(db, 'shifts'), where('companyId', '==', user.companyId));
    const holidaysQ = query(collection(db, 'holidays'), where('companyId', '==', user.companyId));
    const teamQ = query(collection(db, 'users'), where('companyId', '==', user.companyId));
    const docsQ = query(collection(db, 'employeeDocuments'), where('companyId', '==', user.companyId));
    const exitsQ = query(collection(db, 'exitRecords'), where('companyId', '==', user.companyId));
    const attendanceQ = query(collection(db, 'attendance'), where('companyId', '==', user.companyId));
    const leaveQ = query(collection(db, 'leaveRequests'), where('companyId', '==', user.companyId));
    const perfQ = query(collection(db, 'performanceReviews'), where('companyId', '==', user.companyId));

    const unsubShifts = onSnapshot(shiftsQ, (snap) => {
      setShifts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Shift)));
    });
    const unsubHolidays = onSnapshot(holidaysQ, (snap) => {
      setHolidays(snap.docs.map(d => ({ id: d.id, ...d.data() } as Holiday)));
    });
    const unsubTeam = onSnapshot(teamQ, (snap) => {
      setTeam(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
    });
    const unsubDocs = onSnapshot(docsQ, (snap) => {
      setDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() } as EmployeeDocument)));
    });
    const unsubExits = onSnapshot(exitsQ, (snap) => {
      setExits(snap.docs.map(d => ({ id: d.id, ...d.data() } as ExitRecord)));
    });
    const unsubAttendance = onSnapshot(attendanceQ, (snap) => {
      setAttendance(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
    });
    const unsubLeave = onSnapshot(leaveQ, (snap) => {
      setLeaveRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
    });
    const unsubPerf = onSnapshot(perfQ, (snap) => {
      setPerformanceReviews(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
    });

    setLoading(false);

    return () => {
      unsubShifts();
      unsubHolidays();
      unsubTeam();
      unsubDocs();
      unsubExits();
      unsubAttendance();
      unsubLeave();
      unsubPerf();
    };
  }, [user.companyId]);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Briefcase size={24} />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black font-display text-slate-950 dark:text-white italic tracking-tighter leading-none">
                HR <span className="text-blue-600 dark:text-indigo-400">Workforce</span>
              </h1>
              <p className="text-slate-400 dark:text-dark-text-muted text-[10px] font-black uppercase tracking-[0.2em] mt-1">Strategic Talent Operations Center</p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="bg-white dark:bg-dark-surface p-1.5 rounded-2xl border border-slate-100 dark:border-dark-border flex shadow-sm overflow-x-auto custom-scrollbar no-scrollbar transition-colors">
          {[
            { id: 'attendance', label: 'Attendance', icon: UserCheck },
            { id: 'leave', label: 'Leaves', icon: AlertCircle },
            { id: 'shifts', label: 'Shifts', icon: Clock },
            { id: 'holidays', label: 'Holidays', icon: CalendarIcon },
            { id: 'performance', label: 'Growth', icon: Award },
            { id: 'comms', label: 'Comms', icon: Bell, privileged: true },
            { id: 'documents', label: 'Docs', icon: FileText },
            { id: 'exits', label: 'Exits', icon: LogOut },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as HRTab)}
              className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-slate-950 dark:bg-indigo-600 text-white shadow-lg shadow-slate-950/20 dark:shadow-indigo-500/20' 
                  : 'text-slate-400 dark:text-dark-text-muted hover:text-slate-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-dark-bg'
              }`}
            >
              <tab.icon size={14} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'attendance' && <AttendanceTab attendance={attendance} user={user} companyId={user.companyId} isAdmin={isAdmin} team={team} />}
          {activeTab === 'leave' && <LeaveTab requests={leaveRequests} user={user} companyId={user.companyId} isAdmin={isAdmin} team={team} />}
          {activeTab === 'shifts' && <ShiftTab shifts={shifts} companyId={user.companyId} isAdmin={isAdmin} />}
          {activeTab === 'holidays' && <HolidayTab holidays={holidays} companyId={user.companyId} isAdmin={isAdmin} />}
          {activeTab === 'performance' && <PerformanceTab reviews={performanceReviews} team={team} companyId={user.companyId} isAdmin={isAdmin} user={user} />}
          {activeTab === 'comms' && isAdmin && <CommsTab team={team} user={user} />}
          {activeTab === 'documents' && <DocumentTab documents={documents} team={team} companyId={user.companyId} isAdmin={isAdmin} />}
          {activeTab === 'exits' && <ExitTab exits={exits} team={team} companyId={user.companyId} isAdmin={isAdmin} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// --- TAB COMPONENTS ---

function CommsTab({ team, user }: { team: UserProfile[], user: UserProfile }) {
  const { sendNotification } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [broadcast, setBroadcast] = useState({
    target: 'all', // 'all', role, or specific user uid
    type: 'admin_alert' as NotificationType,
    title: '',
    message: ''
  });

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcast.title || !broadcast.message) return toast.error('Full tactical brief required');
    setLoading(true);
    try {
      let targets: string[] = [];
      if (broadcast.target === 'all') {
        targets = team.map(m => m.uid);
      } else if (['admin', 'manager', 'team_lead', 'sales'].includes(broadcast.target)) {
        targets = team.filter(m => m.role === broadcast.target).map(m => m.uid);
      } else {
        targets = [broadcast.target];
      }

      const promises = targets.map(targetUid => 
        sendNotification({
          userId: targetUid,
          type: broadcast.type,
          title: broadcast.title,
          message: broadcast.message,
          link: '/'
        })
      );

      await Promise.all(promises);
      toast.success(`Directive synchronized to ${targets.length} units`);
      setBroadcast({ ...broadcast, title: '', message: '' });
      logActivity(user, 'SETTINGS_CHANGE', `Broadcasted ${broadcast.type} to ${broadcast.target}`, undefined, broadcast.target);
    } catch (e) {
      toast.error('Transmission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white mx-auto shadow-2xl shadow-blue-500/20">
          <Bell size={32} className="animate-pulse" />
        </div>
        <div>
          <h3 className="text-4xl font-black italic tracking-tighter text-slate-950 dark:text-white uppercase">Broadcast Center</h3>
          <p className="text-slate-400 dark:text-dark-text-muted text-[10px] font-black uppercase tracking-[0.3em] mt-2 italic">Syncing Directives Across the Taskforce</p>
        </div>
      </div>

      <form onSubmit={handleBroadcast} className="bg-white dark:bg-dark-surface p-12 rounded-[48px] border border-slate-100 dark:border-dark-border shadow-2xl dark:shadow-none space-y-8 relative overflow-hidden transition-colors">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none text-slate-900 dark:text-white">
          <Globe size={180} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Target Phalanx</label>
            <select 
              value={broadcast.target} 
              onChange={e => setBroadcast({...broadcast, target: e.target.value})}
              className="w-full p-5 bg-slate-50 dark:bg-dark-bg rounded-3xl border border-slate-100 dark:border-dark-border font-black text-xs uppercase outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-indigo-500/20 transition-all shadow-inner text-slate-900 dark:text-white"
            >
              <option value="all" className="dark:bg-dark-surface">Entire Workforce (All)</option>
              <optgroup label="Role-Based Commands" className="dark:bg-dark-surface">
                <option value="admin">Administrators Only</option>
                <option value="manager">Managers Only</option>
                <option value="team_lead">Team Leads Only</option>
                <option value="sales">Sales Agents Only</option>
              </optgroup>
              <optgroup label="Individual Operatives" className="dark:bg-dark-surface">
                {team.map(m => <option key={m.uid} value={m.uid}>{m.name} ({m.memberId})</option>)}
              </optgroup>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Transmission Priority</label>
            <select 
              value={broadcast.type} 
              onChange={e => setBroadcast({...broadcast, type: e.target.value as NotificationType})}
              className="w-full p-5 bg-slate-50 dark:bg-dark-bg rounded-3xl border border-slate-100 dark:border-dark-border font-black text-xs uppercase outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-indigo-500/20 transition-all shadow-inner text-slate-900 dark:text-white"
            >
              <option value="admin_alert" className="dark:bg-dark-surface">Critical Alert (High)</option>
              <option value="profile_update" className="dark:bg-dark-surface">Status Update (Med)</option>
              <option value="salary_update" className="dark:bg-dark-surface">Compensation Log (Med)</option>
              <option value="task_assigned" className="dark:bg-dark-surface">Operational Brief (Low)</option>
            </select>
          </div>
        </div>

        <div className="space-y-2 relative z-10">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Directive Objective (Title)</label>
          <input 
            type="text" 
            value={broadcast.title}
            onChange={e => setBroadcast({...broadcast, title: e.target.value})}
            placeholder="SYSTEM COMMAND / EMERGENCY PROTOCOL..."
            className="w-full p-5 bg-slate-50 dark:bg-dark-bg rounded-3xl border border-slate-100 dark:border-dark-border font-black text-sm italic outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-indigo-500/20 transition-all shadow-inner text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
          />
        </div>

        <div className="space-y-2 relative z-10">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Tactical Brief (Message)</label>
          <textarea 
            value={broadcast.message}
            onChange={e => setBroadcast({...broadcast, message: e.target.value})}
            placeholder="Detailed instructions for the taskforce..."
            className="w-full p-6 bg-slate-50 dark:bg-dark-bg rounded-[32px] border border-slate-100 dark:border-dark-border font-medium text-slate-600 dark:text-dark-text-muted italic text-sm outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-indigo-500/20 transition-all min-h-[160px] shadow-inner"
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-slate-950 dark:bg-indigo-600 text-white p-6 rounded-[32px] font-black italic text-lg tracking-[0.2em] shadow-2xl shadow-slate-950/20 dark:shadow-indigo-500/20 hover:bg-black dark:hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 relative z-10"
        >
          {loading ? 'TRANSMITTING...' : 'INITIATE BROADCAST'}
        </button>
      </form>
    </div>
  );
}

function AttendanceTab({ attendance, user, companyId, isAdmin, team }: { attendance: any[], user: UserProfile, companyId: string, isAdmin: boolean, team: UserProfile[] }) {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayRecord = attendance.find(a => a.employeeId === user.uid && a.date === today);

  const parseDate = (val: any) => {
    if (!val) return new Date();
    if (typeof val.toDate === 'function') return val.toDate();
    if (typeof val === 'string') {
      const d = parseISO(val);
      return isNaN(d.getTime()) ? new Date() : d;
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const getCurrentLocation = (): Promise<{ lat: number, lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 5000 }
      );
    });
  };

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      const location = await getCurrentLocation();
      await addDoc(collection(db, 'attendance'), {
        companyId,
        employeeId: user.uid,
        date: today,
        checkIn: new Date().toISOString(),
        status: 'On-time',
        location,
        createdAt: serverTimestamp()
      });
      toast.success('Shift started. Location captured.');
    } catch (e) {
      toast.error('Check-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!todayRecord) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'attendance', todayRecord.id), {
        checkOut: new Date().toISOString()
      });
      toast.success('Shift completed. Rest well.');
    } catch (e) {
      toast.error('Check-out failed');
    } finally {
      setLoading(false);
    }
  };

  const markStatus = async (employeeId: string, status: 'Late' | 'Absent') => {
    try {
      const existingRecord = attendance.find(a => a.employeeId === employeeId && a.date === selectedDate);
      if (existingRecord) {
        await updateDoc(doc(db, 'attendance', existingRecord.id), { status });
      } else {
        await addDoc(collection(db, 'attendance'), {
          companyId,
          employeeId,
          date: selectedDate,
          checkIn: status === 'Absent' ? null : new Date().toISOString(),
          status,
          createdAt: serverTimestamp()
        });
      }
      toast.success(`Employee marked as ${status}`);
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

  const filteredAttendance = attendance.filter(a => a.date === selectedDate);
  const presentCount = filteredAttendance.filter(a => a.status !== 'Absent').length;
  const lateCount = filteredAttendance.filter(a => a.status === 'Late').length;
  const absentCount = team.length - presentCount;

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-slate-950 p-10 rounded-[40px] text-white overflow-hidden relative group shadow-2xl">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Clock size={120} />
            </div>
            <div className="relative z-10">
               <h3 className="text-3xl font-black italic mb-2 tracking-tighter">My Presence</h3>
               <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-8">Personal Timekeeping</p>
               
               <div className="space-y-4 mb-10">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                     <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">Current Date</span>
                     <span className="text-sm font-bold italic">{format(new Date(), 'MMMM dd, yyyy')}</span>
                  </div>
                  {todayRecord?.checkIn && (
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                      <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">Check-in</span>
                      <span className="text-sm font-bold italic text-blue-400 dark:text-indigo-400">{format(parseDate(todayRecord.checkIn), 'HH:mm:ss')}</span>
                    </div>
                  )}
                  {todayRecord?.location && (
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                      <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">Location Auth</span>
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{todayRecord.location.lat.toFixed(4)}, {todayRecord.location.lng.toFixed(4)}</span>
                    </div>
                  )}
               </div>

               {!todayRecord ? (
                 <button 
                  disabled={loading}
                  onClick={handleCheckIn} 
                  className="w-full bg-blue-600 hover:bg-blue-700 p-6 rounded-3xl font-black italic text-lg transition-all shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50"
                 >
                   {loading ? 'SYNCING...' : 'START SHIFT'}
                 </button>
               ) : !todayRecord.checkOut ? (
                 <button 
                  disabled={loading}
                  onClick={handleCheckOut} 
                  className="w-full bg-rose-600 hover:bg-rose-700 p-6 rounded-3xl font-black italic text-lg transition-all shadow-xl shadow-rose-500/20 active:scale-95 disabled:opacity-50"
                 >
                   {loading ? 'SYNCING...' : 'END SHIFT'}
                 </button>
               ) : (
                 <div className="w-full bg-emerald-500/20 text-emerald-400 p-6 rounded-3xl font-black italic text-center border border-emerald-500/30">
                   SHIFTS COMPLETED
                 </div>
               )}
            </div>
          </div>

          <div className="bg-white dark:bg-dark-surface p-8 rounded-[40px] border border-slate-100 dark:border-dark-border shadow-sm transition-colors">
             <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Daily Snapshot ({format(parseDate(selectedDate), 'MMM dd')})</h4>
             <div className="grid grid-cols-3 gap-4">
                <div className="bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-2xl text-center">
                   <p className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase mb-1">Present</p>
                   <p className="text-xl font-black text-emerald-700 dark:text-emerald-500 leading-none">{presentCount}</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-500/10 p-4 rounded-2xl text-center">
                   <p className="text-[8px] font-black text-amber-600 dark:text-amber-400 uppercase mb-1">Late</p>
                   <p className="text-xl font-black text-amber-700 dark:text-amber-500 leading-none">{lateCount}</p>
                </div>
                <div className="bg-rose-50 dark:bg-rose-500/10 p-4 rounded-2xl text-center">
                   <p className="text-[8px] font-black text-rose-600 dark:text-rose-400 uppercase mb-1">Absent</p>
                   <p className="text-xl font-black text-rose-700 dark:text-rose-500 leading-none">{absentCount}</p>
                </div>
             </div>
          </div>
        </div>

        <div className="xl:col-span-2 space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
               <h3 className="text-3xl font-black italic text-slate-950 dark:text-white tracking-tighter uppercase leading-none">Management Log</h3>
               <p className="text-slate-400 dark:text-dark-text-muted text-[10px] font-black uppercase tracking-[0.2em] mt-2">Enterprise Resource Monitoring</p>
            </div>
            <div className="flex items-center space-x-3 bg-white dark:bg-dark-surface p-2 rounded-2xl border border-slate-100 dark:border-dark-border shadow-sm transition-colors">
               <CalendarIcon size={16} className="text-slate-400 dark:text-dark-text-muted ml-2" />
               <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none font-black text-[10px] uppercase outline-none px-2 py-1 text-slate-900 dark:text-white"
               />
            </div>
          </div>

          <div className="table-container">
             <table className="w-full text-left">
                <thead className="bg-slate-50/50 dark:bg-dark-bg/50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b dark:border-dark-border">
                  <tr>
                    <th className="px-8 py-5">Personnel</th>
                    <th className="px-8 py-5">Check In/Out</th>
                    <th className="px-8 py-5">Audit Status</th>
                    {isAdmin && <th className="px-8 py-5 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-dark-border">
                  {team.map(member => {
                    const record = filteredAttendance.find(a => a.employeeId === member.uid);
                    return (
                      <tr key={member.uid} className="hover:bg-slate-50/30 dark:hover:bg-white/5 transition-colors group">
                         <td className="px-8 py-6">
                            <div className="flex items-center space-x-3">
                               <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-dark-bg flex items-center justify-center border border-white dark:border-dark-border overflow-hidden shadow-sm">
                                 {member.photoURL ? <img src={member.photoURL} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" /> : <span className="text-[10px] font-black text-slate-400 dark:text-dark-text-muted">{member.name[0]}</span>}
                               </div>
                               <div>
                                  <p className="text-xs font-black text-slate-950 dark:text-white uppercase leading-none mb-1">{member.name}</p>
                                  <p className="text-[8px] font-black text-slate-400 dark:text-dark-text-muted uppercase tracking-widest">{member.department || 'General'}</p>
                               </div>
                            </div>
                         </td>
                         <td className="px-8 py-6 font-mono text-[10px] font-bold">
                            {record?.checkIn ? (
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                  <span className="text-blue-600 dark:text-indigo-400">IN: {format(parseDate(record.checkIn), 'HH:mm')}</span>
                                  {record.location && <MapPin size={10} className="text-slate-300 dark:text-slate-600" />}
                                </div>
                                <span className={record.checkOut ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-700'}>
                                  OUT: {record.checkOut ? format(parseDate(record.checkOut), 'HH:mm') : '--:--'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-700">NO ACTIVE SESSION</span>
                            )}
                         </td>
                         <td className="px-8 py-6">
                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                              record?.status === 'On-time' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20' : 
                              record?.status === 'Late' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20' :
                              record?.status === 'Absent' ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-500/20' :
                              'bg-slate-50 dark:bg-dark-bg text-slate-400 dark:text-dark-text-muted border-slate-100 dark:border-dark-border'
                            }`}>
                              {record?.status || 'Pending'}
                            </span>
                         </td>
                         {isAdmin && (
                           <td className="px-8 py-6 text-right">
                              <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => markStatus(member.uid, 'Late')}
                                  className="p-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all"
                                  title="Mark as Late"
                                >
                                  <Clock size={14} />
                                </button>
                                <button 
                                  onClick={() => markStatus(member.uid, 'Absent')}
                                  className="p-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all"
                                  title="Mark as Absent"
                                >
                                  <LogOut size={14} />
                                </button>
                              </div>
                           </td>
                         )}
                      </tr>
                    );
                  })}
                </tbody>
             </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeaveTab({ requests, user, companyId, isAdmin, team }: { requests: any[], user: UserProfile, companyId: string, isAdmin: boolean, team: UserProfile[] }) {
  const [showApply, setShowApply] = useState(false);
  const [newRequest, setNewRequest] = useState({
    type: 'Annual',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    reason: ''
  });

  const parseDate = (val: any) => {
    if (!val) return new Date();
    if (typeof val.toDate === 'function') return val.toDate();
    if (typeof val === 'string') {
      const d = parseISO(val);
      return isNaN(d.getTime()) ? new Date() : d;
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const handleApply = async () => {
    if (!newRequest.reason) return toast.error('Reason is required');
    try {
      await addDoc(collection(db, 'leaveRequests'), {
        ...newRequest,
        employeeId: user.uid,
        companyId,
        status: 'Pending',
        createdAt: new Date().toISOString()
      });
      toast.success('Leave request submitted for analysis');
      setShowApply(false);
    } catch (e) {
      toast.error('Submission failed');
    }
  };

  const updateStatus = async (id: string, status: 'Approved' | 'Rejected') => {
    try {
      const req = requests.find(r => r.id === id);
      const requester = team.find(t => t.uid === req?.employeeId);
      await updateDoc(doc(db, 'leaveRequests', id), { status });
      logActivity(user, 'SETTINGS_CHANGE', `Leave request ${status.toLowerCase()} for ${requester?.name || 'Personnel'}`, requester?.uid, requester?.name);
      toast.success(`Request ${status.toLowerCase()}`);
    } catch (e) {
      toast.error('Operation failed');
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-end">
         <div>
            <h3 className="text-3xl font-black italic text-slate-950 tracking-tighter">Time Off Management</h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mt-1">Resource Availability Pipeline</p>
         </div>
         <button onClick={() => setShowApply(true)} className="bg-slate-950 dark:bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-950/20 dark:shadow-none flex items-center space-x-2">
            <Plus size={16} />
            <span>Request Break</span>
         </button>
      </div>

      <div className="grid-auto-fit">
        {requests.sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(req => {
          const requester = team.find(t => t.uid === req.employeeId);
          return (
            <div key={req.id} className="bg-white dark:bg-dark-surface p-8 rounded-[40px] border border-slate-100 dark:border-dark-border shadow-sm hover:shadow-md transition-all transition-colors">
               <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center space-x-4">
                     <div className="w-12 h-12 bg-slate-50 dark:bg-dark-bg rounded-2xl flex items-center justify-center border border-slate-100 dark:border-dark-border overflow-hidden">
                        {requester?.photoURL ? <img src={requester.photoURL} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" /> : <User className="text-slate-300" />}
                     </div>
                     <div>
                        <h4 className="font-black text-slate-950 uppercase tracking-tight">{requester?.name || 'Unknown'}</h4>
                        <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest">{req.type} Strategy</p>
                     </div>
                  </div>
                  <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] ${
                    req.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                    req.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                  }`}>
                    {req.status}
                  </span>
               </div>

               <div className="bg-slate-50 dark:bg-dark-bg p-6 rounded-3xl border border-slate-100 dark:border-dark-border mb-6 flex justify-between items-center transition-colors">
                  <div className="text-center flex-1">
                     <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Depart</p>
                     <p className="font-black italic text-slate-950 dark:text-white text-sm uppercase">{format(parseDate(req.startDate), 'MMM dd')}</p>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div className="text-center flex-1">
                     <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Return</p>
                     <p className="font-black italic text-slate-950 dark:text-white text-sm uppercase">{format(parseDate(req.endDate), 'MMM dd')}</p>
                  </div>
               </div>

               <p className="text-slate-600 text-xs font-medium italic mb-8 h-12 overflow-y-auto">"{req.reason}"</p>

               {req.status === 'Pending' && isAdmin && (
                 <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => updateStatus(req.id, 'Approved')} className="bg-emerald-500 text-white p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20">Authorize</button>
                    <button onClick={() => updateStatus(req.id, 'Rejected')} className="bg-white text-slate-950 border border-slate-100 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">Reject</button>
                 </div>
               )}
            </div>
          )
        })}
        {requests.length === 0 && (
          <div className="lg:col-span-2 py-40 text-center bg-slate-50/50 dark:bg-dark-bg/50 border-2 border-dashed border-slate-100 dark:border-dark-border rounded-[40px] transition-colors">
             <CheckCircle size={48} className="mx-auto text-emerald-100 mb-4" />
             <p className="text-slate-300 font-bold uppercase text-xs tracking-widest">No active requests. Operational capacity at 100%.</p>
          </div>
        )}
      </div>

      {/* Apply Modal */}
      <AnimatePresence>
        {showApply && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowApply(false)} className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white dark:bg-dark-surface w-full max-w-md rounded-[40px] p-10 overflow-hidden shadow-2xl border dark:border-dark-border">
              <div className="mb-8">
                <h3 className="text-3xl font-black italic tracking-tighter text-slate-950 dark:text-white">Request Break</h3>
                <p className="text-slate-400 dark:text-dark-text-muted text-xs font-bold uppercase tracking-widest mt-1">Resource Redirection Protocol</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-text-muted px-1">Type</label>
                  <select value={newRequest.type} onChange={e => setNewRequest({...newRequest, type: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-dark-bg rounded-2xl border border-slate-100 dark:border-dark-border font-black text-xs outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-colors">
                    <option className="dark:bg-dark-surface">Annual</option>
                    <option className="dark:bg-dark-surface">Sick</option>
                    <option className="dark:bg-dark-surface">Work From Home</option>
                    <option className="dark:bg-dark-surface">Other</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-text-muted px-1">From</label>
                    <input type="date" value={newRequest.startDate} onChange={e => setNewRequest({...newRequest, startDate: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-dark-bg rounded-2xl border border-slate-100 dark:border-dark-border font-black text-xs outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-colors" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-text-muted px-1">To</label>
                    <input type="date" value={newRequest.endDate} onChange={e => setNewRequest({...newRequest, endDate: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-dark-bg rounded-2xl border border-slate-100 dark:border-dark-border font-black text-xs outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-colors" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-text-muted px-1">Business Justification</label>
                  <textarea value={newRequest.reason} onChange={e => setNewRequest({...newRequest, reason: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-dark-bg rounded-2xl border border-slate-100 dark:border-dark-border font-black text-xs outline-none focus:ring-2 focus:ring-blue-500 h-24 text-slate-900 dark:text-white transition-colors Placeholder:text-slate-400 dark:placeholder:text-slate-600" placeholder="Brief explanation..." />
                </div>

                <button onClick={handleApply} className="w-full bg-slate-950 dark:bg-indigo-600 text-white p-5 rounded-3xl font-black mt-4 hover:bg-black dark:hover:bg-indigo-700 transition-all shadow-xl shadow-slate-950/20 dark:shadow-indigo-500/20">
                  Transmit Request
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PerformanceTab({ reviews, team, companyId, isAdmin, user }: { reviews: any[], team: UserProfile[], companyId: string, isAdmin: boolean, user: UserProfile }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newReview, setNewReview] = useState({
    employeeId: '',
    period: format(new Date(), 'MMMM yyyy'),
    rating: 5,
    feedback: '',
    kpis: [{ name: 'Efficiency', target: '90%', achieved: '95%' }]
  });

  const handleAdd = async () => {
    if (!newReview.employeeId || !newReview.feedback) return toast.error('Required fields missing');
    try {
      await addDoc(collection(db, 'performanceReviews'), {
        ...newReview,
        companyId,
        reviewerId: user.uid,
        createdAt: new Date().toISOString()
      });
      const evaluee = team.find(t => t.uid === newReview.employeeId);
      logActivity(user, 'EMPLOYEE_EDIT', `Archived performance review for ${evaluee?.name || 'Personnel'}`, evaluee?.uid, evaluee?.name);
      toast.success('Performance evaluation archived');
      setShowAdd(false);
    } catch (e) {
      toast.error('Failed to save review');
    }
  };

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-end">
         <div>
            <h3 className="text-3xl font-black italic text-slate-950 dark:text-white tracking-tighter">Growth Strategy</h3>
            <p className="text-slate-400 dark:text-dark-text-muted text-xs font-bold uppercase tracking-[0.2em] mt-1">High-Performance Optimization</p>
         </div>
         {isAdmin && (
           <button onClick={() => setShowAdd(true)} className="bg-amber-500 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-amber-500/20 flex items-center space-x-2 hover:bg-amber-600 transition-all">
              <Plus size={16} />
              <span>New Review</span>
           </button>
         )}
      </div>

      <div className="grid-auto-fit">
         {reviews.sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(review => {
           const evaluee = team.find(t => t.uid === review.employeeId);
           const reviewer = team.find(t => t.uid === review.reviewerId);
           return (
             <div key={review.id} className="bg-white dark:bg-dark-surface p-10 rounded-[48px] border border-slate-100 dark:border-dark-border shadow-sm group hover:shadow-xl transition-all relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity text-slate-900 dark:text-white">
                   <Award size={140} />
                </div>
                
                <div className="flex justify-between items-start mb-10 relative z-10">
                   <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 bg-slate-50 dark:bg-dark-bg rounded-2xl flex items-center justify-center border border-slate-100 dark:border-dark-border overflow-hidden shadow-inner">
                         {evaluee?.photoURL ? <img src={evaluee.photoURL} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" /> : <User className="text-slate-200 dark:text-slate-700" />}
                      </div>
                      <div>
                         <h4 className="font-black text-slate-950 dark:text-white uppercase text-lg leading-none mb-1">{evaluee?.name || 'Unknown'}</h4>
                         <p className="text-[10px] font-black text-slate-400 dark:text-dark-text-muted uppercase tracking-widest">{review.period}</p>
                      </div>
                   </div>
                   <div className="flex space-x-1">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={14} className={s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-100 dark:text-slate-800'} />
                      ))}
                   </div>
                </div>

                <div className="bg-slate-50 dark:bg-dark-bg p-8 rounded-[32px] border border-slate-100 dark:border-dark-border mb-8 relative z-10 transition-colors">
                   <div className="flex items-center space-x-2 mb-4 text-blue-600 dark:text-indigo-400 font-black italic text-xs uppercase underline underline-offset-4 tracking-[0.2em]">
                      <Briefcase size={12} />
                      <span>Executive Feedback</span>
                   </div>
                   <p className="text-sm font-medium text-slate-600 dark:text-dark-text-muted leading-relaxed italic">"{review.feedback}"</p>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-8 relative z-10">
                   {review.kpis?.map((kpi: any, i: number) => (
                     <div key={i} className="bg-white dark:bg-dark-surface border border-slate-100 dark:border-dark-border p-4 rounded-2xl text-center shadow-sm">
                        <p className="text-[8px] font-black text-slate-400 dark:text-dark-text-muted uppercase mb-1 truncate">{kpi.name}</p>
                        <p className="text-xs font-black text-blue-600 dark:text-indigo-400 italic leading-none">{kpi.achieved}</p>
                     </div>
                   ))}
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-slate-50 dark:border-dark-border relative z-10">
                   <div className="flex items-center space-x-2">
                      <span className="text-[8px] font-black uppercase text-slate-300 dark:text-slate-700">Reviewed by</span>
                      <span className="text-[10px] font-black text-slate-950 dark:text-white uppercase">{reviewer?.name || 'System'}</span>
                   </div>
                   <button onClick={() => deleteDoc(doc(db, 'performanceReviews', review.id))} className="text-slate-200 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={16} />
                   </button>
                </div>
             </div>
           )
         })}
         {reviews.length === 0 && (
           <div className="col-span-full py-40 text-center bg-slate-50/50 dark:bg-dark-bg/50 border-2 border-dashed border-slate-100 dark:border-dark-border rounded-[40px] transition-colors">
              <TrendingUpIcon size={48} className="mx-auto text-amber-100 mb-4" />
              <p className="text-slate-300 font-bold uppercase text-xs tracking-widest">Growth trajectories initializing. No reviews yet.</p>
           </div>
         )}
      </div>

      {/* Review Modal */}
      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAdd(false)} className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white dark:bg-dark-surface w-full max-w-lg rounded-[40px] p-10 overflow-hidden shadow-2xl border dark:border-dark-border">
              <div className="mb-8 text-center">
                <Award size={48} className="mx-auto text-amber-500 mb-4" />
                <h3 className="text-3xl font-black italic tracking-tighter text-slate-950 dark:text-white uppercase">Performance Audit</h3>
                <p className="text-slate-400 dark:text-dark-text-muted text-[10px] font-black uppercase tracking-[0.2em] mt-1 italic">Strategizing Human Capital Enhancement</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-text-muted px-1">Personnel Selection</label>
                  <select value={newReview.employeeId} onChange={e => setNewReview({...newReview, employeeId: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-dark-bg rounded-2xl border border-slate-100 dark:border-dark-border font-black text-xs outline-none shadow-inner text-slate-900 dark:text-white transition-colors">
                    <option value="" className="dark:bg-dark-surface">Select Target Personnel</option>
                    {team.map(m => <option key={m.uid} value={m.uid} className="dark:bg-dark-surface">{m.name}</option>)}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-text-muted px-1">Review Period</label>
                    <input value={newReview.period} onChange={e => setNewReview({...newReview, period: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-dark-bg rounded-2xl border border-slate-100 dark:border-dark-border font-black text-[10px] uppercase outline-none shadow-inner text-slate-900 dark:text-white transition-colors" placeholder="e.g. Q1 2026" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-text-muted px-1">Strategic Rating (1-5)</label>
                    <select value={newReview.rating} onChange={e => setNewReview({...newReview, rating: Number(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-dark-bg rounded-2xl border border-slate-100 dark:border-dark-border font-black text-[10px] outline-none shadow-inner text-slate-900 dark:text-white transition-colors">
                      {[1,2,3,4,5].map(r => <option key={r} value={r} className="dark:bg-dark-surface">{r} / 5</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-text-muted px-1">Diagnostic Feedback</label>
                  <textarea value={newReview.feedback} onChange={e => setNewReview({...newReview, feedback: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-dark-bg rounded-[32px] border border-slate-100 dark:border-dark-border font-black text-[10px] uppercase outline-none min-h-[120px] shadow-inner text-slate-900 dark:text-white transition-all placeholder:text-slate-400" placeholder="Detail the tactical observations..." />
                </div>

                <button onClick={handleAdd} className="w-full bg-slate-950 dark:bg-indigo-600 text-white p-6 rounded-[32px] font-black italic text-sm tracking-widest hover:bg-black dark:hover:bg-indigo-700 transition-all shadow-xl shadow-slate-950/20 dark:shadow-indigo-500/20 active:scale-95 uppercase">
                  Archive Performance Data
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ShiftTab({ shifts, companyId, isAdmin }: { shifts: Shift[], companyId: string, isAdmin: boolean }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newShift, setNewShift] = useState({
    name: '',
    startTime: '09:00',
    endTime: '18:00',
    type: 'Full-time' as Shift['type'],
    workDays: [1, 2, 3, 4, 5] // Mon-Fri
  });

  const handleAdd = async () => {
    if (!newShift.name) return toast.error('Name is required');
    try {
      await addDoc(collection(db, 'shifts'), {
        ...newShift,
        companyId,
        createdAt: new Date().toISOString()
      });
      toast.success('Shift defined successfully');
      setShowAdd(false);
    } catch (e) {
      toast.error('Failed to add shift');
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
      <div className="xl:col-span-2 space-y-6">
        <div className="flex justify-between items-end mb-4">
           <div>
              <h3 className="text-2xl font-black italic text-slate-950 dark:text-white">Active Shifts</h3>
              <p className="text-slate-400 dark:text-dark-text-muted text-xs font-bold uppercase tracking-widest mt-1">Defining working thresholds</p>
           </div>
           {isAdmin && (
             <button 
              onClick={() => setShowAdd(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center space-x-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
             >
               <Plus size={16} />
               <span>New Shift</span>
             </button>
           )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {shifts.map(shift => (
            <div key={shift.id} className="bg-white dark:bg-dark-surface p-8 rounded-[32px] border border-slate-100 dark:border-dark-border shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isAdmin && (
                    <button onClick={() => deleteDoc(doc(db, 'shifts', shift.id))} className="text-slate-300 dark:text-slate-600 hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  )}
               </div>
               <div className="flex items-center space-x-4 mb-6 relative z-10">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    shift.type === 'Night' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 
                    shift.type === 'Remote' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                    shift.type === 'Hybrid' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                  }`}>
                    {shift.type === 'Night' ? <Moon size={24} /> : 
                     shift.type === 'Remote' ? <Globe size={24} /> :
                     shift.type === 'Hybrid' ? <Smartphone size={24} /> : <Sun size={24} />}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-950 dark:text-white uppercase text-lg tracking-tight">{shift.name}</h4>
                    <p className="text-slate-400 dark:text-dark-text-muted text-[10px] font-black uppercase tracking-widest">{shift.type}</p>
                  </div>
               </div>
               <div className="bg-slate-50 dark:bg-dark-bg p-6 rounded-2xl border border-slate-100 dark:border-dark-border flex justify-between items-center mb-6 relative z-10 transition-colors">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-text-muted">Hours</p>
                    <p className="font-black italic text-slate-950 dark:text-white">{shift.startTime} — {shift.endTime}</p>
                  </div>
                  <Clock className="text-slate-200 dark:text-slate-800" size={24} />
               </div>
               <div className="flex flex-wrap gap-2 relative z-10">
                  {['S','M','T','W','T','F','S'].map((day, i) => (
                    <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black border transition-colors ${
                      shift.workDays.includes(i) ? 'bg-slate-950 dark:bg-indigo-600 text-white border-slate-950 dark:border-indigo-600 shadow-sm' : 'bg-white dark:bg-dark-surface text-slate-300 dark:text-slate-700 border-slate-100 dark:border-dark-border'
                    }`}>
                      {day}
                    </div>
                  ))}
               </div>
            </div>
          ))}
          {shifts.length === 0 && (
            <div className="md:col-span-2 border-2 border-dashed border-slate-200 rounded-[40px] py-20 text-center">
              <Clock size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No shifts defined yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAdd(false)} className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white dark:bg-dark-surface w-full max-w-md rounded-[40px] p-10 overflow-hidden shadow-2xl border dark:border-dark-border">
              <div className="mb-8">
                <h3 className="text-3xl font-black italic tracking-tighter text-slate-950 dark:text-white">Define Shift</h3>
                <p className="text-slate-400 dark:text-dark-text-muted text-xs font-bold uppercase tracking-widest mt-1">Strategic boundary definition</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-text-muted px-1">Shift Name</label>
                  <input value={newShift.name} onChange={e => setNewShift({...newShift, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-dark-bg rounded-2xl border border-slate-100 dark:border-dark-border font-black text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all uppercase text-slate-900 dark:text-white" placeholder="e.g. Standard 9-6" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-text-muted px-1">Start Time</label>
                    <input type="time" value={newShift.startTime} onChange={e => setNewShift({...newShift, startTime: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-dark-bg rounded-2xl border border-slate-100 dark:border-dark-border font-black text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-text-muted px-1">End Time</label>
                    <input type="time" value={newShift.endTime} onChange={e => setNewShift({...newShift, endTime: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-dark-bg rounded-2xl border border-slate-100 dark:border-dark-border font-black text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-text-muted px-1">Shift Type</label>
                  <select value={newShift.type} onChange={e => setNewShift({...newShift, type: e.target.value as any})} className="w-full p-4 bg-slate-50 dark:bg-dark-bg rounded-2xl border border-slate-100 dark:border-dark-border font-black text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer text-slate-900 dark:text-white">
                    <option>Full-time</option>
                    <option>Night</option>
                    <option>Remote</option>
                    <option>Hybrid</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-text-muted px-1">Working Days</label>
                  <div className="flex justify-between">
                    {['S','M','T','W','T','F','S'].map((day, i) => (
                      <button 
                        key={i} 
                        onClick={() => {
                          const days = newShift.workDays.includes(i) 
                            ? newShift.workDays.filter(d => d !== i)
                            : [...newShift.workDays, i];
                          setNewShift({...newShift, workDays: days});
                        }}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black border transition-all ${
                          newShift.workDays.includes(i) ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20' : 'bg-slate-50 dark:bg-dark-bg text-slate-300 dark:text-slate-700 border-slate-100 dark:border-dark-border'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={handleAdd} className="w-full bg-slate-950 dark:bg-indigo-600 text-white p-5 rounded-3xl font-black mt-4 hover:bg-black dark:hover:bg-indigo-700 transition-all shadow-xl shadow-slate-950/20 dark:shadow-indigo-500/20 shadow-indigo-950/20">
                  Save Shift Strategy
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HolidayTab({ holidays, companyId, isAdmin }: { holidays: Holiday[], companyId: string, isAdmin: boolean }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newHoliday, setNewHoliday] = useState({
    name: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 'Public' as Holiday['type']
  });

  const parseDate = (val: any) => {
    if (!val) return new Date();
    if (typeof val.toDate === 'function') return val.toDate();
    if (typeof val === 'string') {
      const d = parseISO(val);
      return isNaN(d.getTime()) ? new Date() : d;
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const handleAdd = async () => {
    if (!newHoliday.name) return toast.error('Name is required');
    try {
      await addDoc(collection(db, 'holidays'), {
        ...newHoliday,
        companyId,
        createdAt: new Date().toISOString()
      });
      toast.success('Holiday added to calendar');
      setShowAdd(false);
    } catch (e) {
      toast.error('Failed to add holiday');
    }
  };

  const sortedHolidays = [...holidays].sort((a,b) => a.date.localeCompare(b.date));
  const currentMonthHolidays = sortedHolidays.filter(h => h.date.startsWith(format(new Date(), 'yyyy-MM')));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
      {/* Calendar Preview */}
      <div className="lg:col-span-2 space-y-8">
        <div className="flex justify-between items-end">
           <div>
              <h3 className="text-2xl font-black italic text-slate-950 dark:text-white">Company Calendar</h3>
              <p className="text-slate-400 dark:text-dark-text-muted text-xs font-bold uppercase tracking-widest mt-1">Observed non-working days</p>
           </div>
           {isAdmin && (
             <button onClick={() => setShowAdd(true)} className="bg-slate-950 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center space-x-2">
               <Plus size={16} />
               <span>Add Holiday</span>
             </button>
           )}
        </div>

        <div className="bg-white dark:bg-dark-surface rounded-[40px] border border-slate-100 dark:border-dark-border overflow-hidden shadow-sm transition-colors">
           <table className="w-full text-left">
              <thead className="bg-slate-50/50 dark:bg-dark-bg/50 border-b dark:border-dark-border">
                 <tr>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-text-muted">Date</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-text-muted">Holiday Name</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-text-muted">Type</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-text-muted text-right">Action</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-dark-border">
                 {sortedHolidays.map(h => (
                   <tr key={h.id} className="hover:bg-slate-50/30 dark:hover:bg-white/5 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center space-x-3">
                           <div className="w-10 h-10 bg-slate-100 dark:bg-dark-bg rounded-xl flex flex-col items-center justify-center text-slate-500 dark:text-dark-text-muted border dark:border-dark-border">
                              <span className="text-[8px] font-black uppercase">{format(parseDate(h.date), 'MMM')}</span>
                              <span className="text-xs font-black">{format(parseDate(h.date), 'dd')}</span>
                           </div>
                           <span className="text-xs font-black text-slate-950 dark:text-white uppercase">{format(parseDate(h.date), 'EEEE')}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-sm font-black text-slate-900 dark:text-white uppercase">{h.name}</div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          h.type === 'Public' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20' :
                          h.type === 'Company' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20' : 'bg-slate-50 dark:bg-dark-bg text-slate-400 dark:text-dark-text-muted border border-slate-100 dark:border-dark-border'
                        }`}>
                          {h.type}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                         {isAdmin && (
                           <button onClick={() => deleteDoc(doc(db, 'holidays', h.id))} className="text-slate-300 hover:text-rose-600 transition-colors p-2">
                             <Trash2 size={16} />
                           </button>
                         )}
                      </td>
                   </tr>
                 ))}
                 {holidays.length === 0 && (
                   <tr>
                     <td colSpan={4} className="py-20 text-center text-slate-300 font-bold uppercase text-xs tracking-widest">No holidays scheduled</td>
                   </tr>
                 )}
              </tbody>
           </table>
        </div>
      </div>

      {/* Summary / Upcoming */}
      <div className="bg-slate-950 p-10 rounded-[40px] text-white">
        <h3 className="text-xl font-black italic mb-6">Upcoming Events</h3>
        <div className="space-y-4">
           {currentMonthHolidays.length > 0 ? currentMonthHolidays.map(h => (
             <div key={h.id} className="bg-white/5 p-5 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all cursor-default">
                <div className="flex items-center space-x-4">
                   <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black italic">
                      {format(parseDate(h.date), 'dd')}
                   </div>
                   <div>
                      <p className="text-sm font-bold uppercase tracking-tight">{h.name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest">{h.type} Break</p>
                   </div>
                </div>
                <CalendarIcon size={16} className="text-slate-700 group-hover:text-blue-400 transition-colors" />
             </div>
           )) : (
             <div className="p-10 text-center border border-white/5 rounded-3xl">
                <Shield className="mx-auto text-slate-800 mb-4" size={32} />
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">All systems operational. No breaks this month.</p>
             </div>
           )}
        </div>
      </div>

      {/* Add Holiday Modal */}
      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAdd(false)} className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white dark:bg-dark-surface w-full max-w-md rounded-[40px] p-10 overflow-hidden shadow-2xl border dark:border-dark-border">
              <div className="mb-8">
                <h3 className="text-3xl font-black italic tracking-tighter text-slate-950 dark:text-white">Add Holiday</h3>
                <p className="text-slate-400 dark:text-dark-text-muted text-xs font-bold uppercase tracking-widest mt-1">Calendar Event Configuration</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-text-muted px-1">Holiday Name</label>
                  <input value={newHoliday.name} onChange={e => setNewHoliday({...newHoliday, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-dark-bg rounded-2xl border border-slate-100 dark:border-dark-border font-black text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all uppercase text-slate-900 dark:text-white" placeholder="e.g. Annual Summit" />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-text-muted px-1">Date</label>
                  <input type="date" value={newHoliday.date} onChange={e => setNewHoliday({...newHoliday, date: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-dark-bg rounded-2xl border border-slate-100 dark:border-dark-border font-black text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-text-muted px-1">Type</label>
                  <select value={newHoliday.type} onChange={e => setNewHoliday({...newHoliday, type: e.target.value as any})} className="w-full p-4 bg-slate-50 dark:bg-dark-bg rounded-2xl border border-slate-100 dark:border-dark-border font-black text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer text-slate-900 dark:text-white">
                    <option className="dark:bg-dark-surface">Public</option>
                    <option className="dark:bg-dark-surface">Company</option>
                    <option className="dark:bg-dark-surface">Optional</option>
                  </select>
                </div>

                <button onClick={handleAdd} className="w-full bg-slate-950 dark:bg-indigo-600 text-white p-5 rounded-3xl font-black mt-4 hover:bg-black dark:hover:bg-indigo-700 transition-all shadow-xl shadow-slate-950/20 dark:shadow-indigo-500/20">
                  Update Roadmap
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DocumentTab({ documents, team, companyId, isAdmin }: { documents: EmployeeDocument[], team: UserProfile[], companyId: string, isAdmin: boolean }) {
  const [showAdd, setShowAdd] = useState(false);
  const [filterEmployee, setFilterEmployee] = useState('');
  const [newDoc, setNewDoc] = useState({
    name: '',
    type: 'Offer Letter' as EmployeeDocument['type'],
    employeeId: '',
    fileUrl: ''
  });

  const handleAdd = async () => {
    if (!newDoc.name || !newDoc.employeeId || !newDoc.fileUrl) return toast.error('All fields are required');
    try {
      await addDoc(collection(db, 'employeeDocuments'), {
        ...newDoc,
        companyId,
        uploadedAt: new Date().toISOString()
      });
      toast.success('Document archived successfully');
      setShowAdd(false);
    } catch (e) {
      toast.error('Failed to store document');
    }
  };

  const filteredDocs = filterEmployee 
    ? documents.filter(d => d.employeeId === filterEmployee)
    : documents;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex-1 max-w-sm">
           <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-text-muted px-1 mb-2 block">Filter by Employee</label>
           <select 
            value={filterEmployee}
            onChange={e => setFilterEmployee(e.target.value)}
            className="w-full p-4 bg-white dark:bg-dark-surface border border-slate-100 dark:border-dark-border rounded-2xl font-black text-xs outline-none shadow-sm focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-colors"
           >
              <option value="" className="dark:bg-dark-surface">All Personnel</option>
              {team.map(m => <option key={m.uid} value={m.uid} className="dark:bg-dark-surface">{m.name}</option>)}
           </select>
        </div>
        {isAdmin && (
          <button onClick={() => setShowAdd(true)} className="bg-slate-950 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center space-x-3 shadow-xl shadow-slate-950/20">
            <FilePlus size={18} />
            <span>Upload Archive</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
         {filteredDocs.map(entry => {
           const owner = team.find(t => t.uid === entry.employeeId);
           return (
             <div key={entry.id} className="bg-white dark:bg-dark-surface p-6 rounded-[32px] border border-slate-100 dark:border-dark-border shadow-sm hover:shadow-lg transition-all group">
                <div className="flex justify-between items-start mb-6">
                   <div className="w-12 h-12 bg-slate-50 dark:bg-dark-bg rounded-2xl flex items-center justify-center text-slate-400 dark:text-dark-text-muted group-hover:bg-blue-50 dark:group-hover:bg-blue-500/20 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-all border dark:border-dark-border">
                      <FileText size={24} />
                   </div>
                   <div className="flex items-center space-x-1">
                      <a href={entry.fileUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-300 dark:text-slate-700 hover:text-blue-600 dark:hover:text-indigo-400 transition-colors">
                        <ExternalLink size={16} />
                      </a>
                      {isAdmin && (
                        <button onClick={() => deleteDoc(doc(db, 'employeeDocuments', entry.id))} className="p-2 text-slate-300 dark:text-slate-700 hover:text-rose-600 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      )}
                   </div>
                </div>
                <h4 className="font-black text-slate-950 dark:text-white uppercase text-sm tracking-tight mb-1 truncate">{entry.name}</h4>
                <p className="text-[9px] font-black text-slate-400 dark:text-dark-text-muted uppercase tracking-widest mb-4">{entry.type}</p>
                <div className="pt-4 border-t border-slate-50 dark:border-dark-border flex items-center justify-between">
                   <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-dark-bg flex items-center justify-center text-[8px] font-black border border-white dark:border-dark-border text-slate-900 dark:text-white">
                        {owner?.name?.[0] || '?'}
                      </div>
                      <span className="text-[10px] font-bold text-slate-600 dark:text-dark-text-muted truncate max-w-[100px]">{owner?.name || 'Unknown'}</span>
                   </div>
                   <p className="text-[8px] font-black text-slate-300 dark:text-slate-700 uppercase">{format(parseISO(entry.uploadedAt), 'MMM dd, yyyy')}</p>
                </div>
             </div>
           );
         })}
         {filteredDocs.length === 0 && (
           <div className="col-span-full py-32 text-center bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-200">
              <HardDrive size={48} className="mx-auto text-slate-100 mb-4" />
              <p className="text-slate-400 font-bold uppercase text-xs tracking-[0.2em]">Archival vault empty.</p>
           </div>
         )}
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAdd(false)} className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white dark:bg-dark-surface w-full max-w-md rounded-[40px] p-10 overflow-hidden shadow-2xl border dark:border-dark-border">
              <div className="mb-8">
                <h3 className="text-3xl font-black italic tracking-tighter text-slate-950 dark:text-white">Store Document</h3>
                <p className="text-slate-400 dark:text-dark-text-muted text-xs font-bold uppercase tracking-widest mt-1">Institutional Memory Archive</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-text-muted px-1">Document Name</label>
                  <input value={newDoc.name} onChange={e => setNewDoc({...newDoc, name: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-dark-bg rounded-2xl border border-slate-100 dark:border-dark-border font-black text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all uppercase text-slate-900 dark:text-white" placeholder="e.g. Contract Amendment v2" />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-text-muted px-1">Employee</label>
                  <select value={newDoc.employeeId} onChange={e => setNewDoc({...newDoc, employeeId: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-dark-bg rounded-2xl border border-slate-100 dark:border-dark-border font-black text-xs outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-colors">
                    <option value="" className="dark:bg-dark-surface">Select Personnel</option>
                    {team.map(m => <option key={m.uid} value={m.uid} className="dark:bg-dark-surface">{m.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-text-muted px-1">Category</label>
                  <select value={newDoc.type} onChange={e => setNewDoc({...newDoc, type: e.target.value as any})} className="w-full p-4 bg-slate-50 dark:bg-dark-bg rounded-2xl border border-slate-100 dark:border-dark-border font-black text-xs outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-colors">
                    <option className="dark:bg-dark-surface">Offer Letter</option>
                    <option className="dark:bg-dark-surface">ID Proof</option>
                    <option className="dark:bg-dark-surface">Contract</option>
                    <option className="dark:bg-dark-surface">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-text-muted px-1">External File URL</label>
                  <div className="relative">
                     <Globe size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-dark-text-muted" />
                     <input value={newDoc.fileUrl} onChange={e => setNewDoc({...newDoc, fileUrl: e.target.value})} className="w-full pl-10 pr-4 py-4 bg-slate-50 dark:bg-dark-bg rounded-2xl border border-slate-100 dark:border-dark-border font-black text-[10px] outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white" placeholder="https://drive.google.com/..." />
                  </div>
                </div>

                <button onClick={handleAdd} className="w-full bg-slate-950 dark:bg-indigo-600 text-white p-5 rounded-3xl font-black mt-4 hover:bg-black dark:hover:bg-indigo-700 transition-all shadow-xl shadow-slate-950/20 dark:shadow-indigo-500/20">
                  Seal Archive
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ExitTab({ exits, team, companyId, isAdmin }: { exits: ExitRecord[], team: UserProfile[], companyId: string, isAdmin: boolean }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newExit, setNewExit] = useState({
    employeeId: '',
    resignationDate: format(new Date(), 'yyyy-MM-dd'),
    lastWorkingDay: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
    reason: '',
    checklist: [
      { task: 'ID Card Returned', completed: false },
      { task: 'Laptop/Hardware Returned', completed: false },
      { task: 'Knowledge Transfer Done', completed: false },
      { task: 'Access Revoked', completed: false }
    ]
  });

  const parseDate = (val: any) => {
    if (!val) return new Date();
    if (typeof val.toDate === 'function') return val.toDate();
    if (typeof val === 'string') {
      const d = parseISO(val);
      return isNaN(d.getTime()) ? new Date() : d;
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const handleAdd = async () => {
    if (!newExit.employeeId || !newExit.reason) return toast.error('All fields are required');
    try {
      await addDoc(collection(db, 'exitRecords'), {
        ...newExit,
        companyId,
        status: 'Pending',
        createdAt: new Date().toISOString()
      });
      // Optionally update user status
      await updateDoc(doc(db, 'users', newExit.employeeId), { isResigned: true });
      toast.success('Exit sequence initiated');
      setShowAdd(false);
    } catch (e) {
      toast.error('Failed to start exit process');
    }
  };

  const updateChecklist = async (exitId: string, index: number, val: boolean) => {
    const exit = exits.find(e => e.id === exitId);
    if (!exit) return;
    const newList = [...exit.checklist];
    newList[index].completed = val;
    await updateDoc(doc(db, 'exitRecords', exitId), { checklist: newList });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
         <div>
            <h3 className="text-2xl font-black italic text-slate-950 dark:text-white">Exit Management</h3>
            <p className="text-slate-400 dark:text-dark-text-muted text-xs font-bold uppercase tracking-widest mt-1">Offboarding & Strategic Deprovisioning</p>
         </div>
         {isAdmin && (
           <button onClick={() => setShowAdd(true)} className="bg-rose-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center space-x-3 shadow-xl shadow-rose-500/20 hover:bg-rose-700 transition-all">
             <LogOut size={18} />
             <span>Initiate Exit</span>
           </button>
         )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {exits.map(record => {
           const owner = team.find(t => t.uid === record.employeeId);
           const completedCount = record.checklist.filter(c => c.completed).length;
           return (
             <div key={record.id} className="bg-white dark:bg-dark-surface rounded-[40px] border border-slate-100 dark:border-dark-border shadow-sm overflow-hidden flex flex-col md:flex-row transition-colors">
                <div className="p-8 md:w-1/2 space-y-6">
                   <div className="flex items-center space-x-4 mb-2">
                      <div className="w-14 h-14 bg-slate-50 dark:bg-dark-bg rounded-2xl flex items-center justify-center border border-slate-100 dark:border-dark-border overflow-hidden">
                         {owner?.photoURL ? (
                           <img src={owner.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                         ) : <User className="text-slate-300 dark:text-dark-text-muted" />}
                      </div>
                      <div>
                         <h4 className="font-black text-slate-950 dark:text-white uppercase text-lg leading-tight">{owner?.name || 'Unknown'}</h4>
                         <p className="text-slate-400 dark:text-dark-text-muted text-[10px] font-black uppercase tracking-widest">{owner?.department} • ID: {owner?.memberId}</p>
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 dark:bg-dark-bg p-4 rounded-2xl border border-slate-100 dark:border-dark-border">
                         <p className="text-[8px] font-black uppercase text-slate-400 dark:text-dark-text-muted mb-1">Resigned</p>
                         <p className="text-[10px] font-black text-slate-950 dark:text-white uppercase">{format(parseDate(record.resignationDate), 'MMM dd, yyyy')}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-dark-bg p-4 rounded-2xl border border-slate-100 dark:border-dark-border">
                         <p className="text-[8px] font-black uppercase text-slate-400 dark:text-dark-text-muted mb-1">LWD</p>
                         <p className="text-[10px] font-black text-blue-600 dark:text-indigo-400 uppercase">{format(parseDate(record.lastWorkingDay), 'MMM dd, yyyy')}</p>
                      </div>
                   </div>
                   <div className="bg-slate-50 dark:bg-dark-bg p-5 rounded-2xl border border-slate-100 dark:border-dark-border">
                      <p className="text-[8px] font-black uppercase text-slate-400 dark:text-dark-text-muted mb-2">Primary Reason</p>
                      <p className="text-xs font-medium text-slate-600 dark:text-dark-text-muted h-16 overflow-y-auto italic">"{record.reason}"</p>
                   </div>
                   <div className="flex items-center justify-between">
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border ${
                        record.status === 'Settled' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-500/20'
                      }`}>{record.status}</span>
                      {isAdmin && (
                        <button onClick={() => deleteDoc(doc(db, 'exitRecords', record.id))} className="text-slate-200 dark:text-slate-800 hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
                           <Trash2 size={16} />
                        </button>
                      )}
                   </div>
                </div>

                <div className="bg-slate-50 dark:bg-dark-bg/50 p-8 md:w-1/2 border-l border-slate-100 dark:border-dark-border">
                   <div className="flex items-center justify-between mb-6">
                      <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-dark-text-muted">Exit Checklist</h5>
                      <span className="text-[10px] font-black text-slate-950 dark:text-white">{completedCount}/{record.checklist.length}</span>
                   </div>
                   <div className="space-y-3">
                      {record.checklist.map((item, idx) => (
                        <button 
                          key={idx}
                          onClick={() => isAdmin && updateChecklist(record.id, idx, !item.completed)}
                          className={`w-full flex items-center space-x-3 p-4 rounded-2xl border transition-all ${
                            item.completed ? 'bg-white dark:bg-dark-surface border-emerald-100 dark:border-emerald-500/20 text-slate-400 dark:text-dark-text-muted' : 'bg-white dark:bg-dark-surface border-slate-100 dark:border-dark-border text-slate-950 dark:text-white hover:border-blue-200 dark:hover:border-indigo-400'
                          }`}
                        >
                           <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                             item.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 dark:border-dark-border'
                           }`}>
                              {item.completed && <Check size={12} />}
                           </div>
                           <span className={`text-[10px] font-bold uppercase tracking-tight text-left flex-1 ${item.completed ? 'line-through' : ''}`}>
                              {item.task}
                           </span>
                        </button>
                      ))}
                   </div>
                   {completedCount === record.checklist.length && record.status !== 'Settled' && isAdmin && (
                     <button 
                      onClick={() => updateDoc(doc(db, 'exitRecords', record.id), { status: 'Settled' })}
                      className="w-full mt-6 bg-slate-950 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-slate-950/20"
                     >
                        Final Settlement Complete
                     </button>
                   )}
                </div>
             </div>
           );
         })}
         {exits.length === 0 && (
            <div className="lg:col-span-2 py-40 text-center border-2 border-dashed border-slate-100 rounded-[40px]">
               <CheckCircle size={48} className="mx-auto text-emerald-100 mb-4" />
               <p className="text-slate-300 font-bold uppercase text-xs tracking-widest">No pending exits. Workforce stabilized.</p>
            </div>
         )}
      </div>

      {/* Initiation Modal */}
      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAdd(false)} className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white dark:bg-dark-surface w-full max-w-lg rounded-[40px] p-10 overflow-hidden shadow-2xl border dark:border-dark-border">
              <div className="mb-8">
                <h3 className="text-3xl font-black italic tracking-tighter text-slate-950 dark:text-white">Initiate Exit</h3>
                <p className="text-slate-400 dark:text-dark-text-muted text-xs font-bold uppercase tracking-widest mt-1">Offboarding Protocol Activation</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-text-muted px-1">Choose Personnel</label>
                  <select value={newExit.employeeId} onChange={e => setNewExit({...newExit, employeeId: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-dark-bg rounded-2xl border border-slate-100 dark:border-dark-border font-black text-xs outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-colors">
                    <option value="" className="dark:bg-dark-surface">Select Employee</option>
                    {team.filter(t => !t.isResigned).map(m => <option key={m.uid} value={m.uid} className="dark:bg-dark-surface">{m.name}</option>)}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-text-muted px-1">Resignation Date</label>
                    <input type="date" value={newExit.resignationDate} onChange={e => setNewExit({...newExit, resignationDate: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-dark-bg rounded-2xl border border-slate-100 dark:border-dark-border font-black text-xs outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-colors" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-text-muted px-1">Last Working Day</label>
                    <input type="date" value={newExit.lastWorkingDay} onChange={e => setNewExit({...newExit, lastWorkingDay: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-dark-bg rounded-2xl border border-slate-100 dark:border-dark-border font-black text-xs outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-colors" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-text-muted px-1">Reason for Exit</label>
                  <textarea value={newExit.reason} onChange={e => setNewExit({...newExit, reason: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-dark-bg rounded-2xl border border-slate-100 dark:border-dark-border font-black text-xs outline-none focus:ring-2 focus:ring-blue-500 h-24 text-slate-900 dark:text-white transition-colors" placeholder="Brief explanation..." />
                </div>

                <button onClick={handleAdd} className="w-full bg-rose-600 text-white p-5 rounded-3xl font-black mt-4 hover:bg-rose-700 transition-all shadow-xl shadow-rose-950/20 dark:shadow-none uppercase">
                  Begin Deprovisioning
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
