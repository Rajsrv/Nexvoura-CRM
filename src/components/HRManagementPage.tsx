import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp 
} from 'firebase/firestore';
import { 
  UserProfile, Company, Shift, Holiday, EmployeeDocument, ExitRecord 
} from '../types';
import { 
  Clock, Calendar as CalendarIcon, FileText, LogOut, CheckCircle, AlertCircle, Plus, 
  Trash2, Download, Search, Filter, Shield, Briefcase, ChevronRight, 
  Moon, Sun, Globe, Smartphone, User, FilePlus, ExternalLink, HardDrive,
  MapPin, UserCheck, Star, ThumbsUp, TrendingUp as TrendingUpIcon, Award,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';

type HRTab = 'shifts' | 'holidays' | 'documents' | 'exits' | 'attendance' | 'leave' | 'performance';

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
  const isManagement = isAdmin || user.role === 'manager';
  const isTeamLead = isManagement || user.role === 'team_lead';

  useEffect(() => {
    if (!user.companyId) return;

    // Queries that everyone in the company can view
    const shiftsQ = query(collection(db, 'shifts'), where('companyId', '==', user.companyId));
    const holidaysQ = query(collection(db, 'holidays'), where('companyId', '==', user.companyId));
    
    // Team visibility: Team Lead+ sees all, others see themselves
    const teamQ = isTeamLead
      ? query(collection(db, 'users'), where('companyId', '==', user.companyId))
      : query(collection(db, 'users'), where('companyId', '==', user.companyId), where('uid', '==', user.uid));
    
    // Leave Requests visibility: Team Lead+ sees all, others see theirs
    const leaveQ = isTeamLead
      ? query(collection(db, 'leaveRequests'), where('companyId', '==', user.companyId))
      : query(collection(db, 'leaveRequests'), where('companyId', '==', user.companyId), where('employeeId', '==', user.uid));
    
    // Attendance visibility: Team Lead+ sees all, others see theirs
    const attendanceQ = isTeamLead 
      ? query(collection(db, 'attendance'), where('companyId', '==', user.companyId))
      : query(collection(db, 'attendance'), where('companyId', '==', user.companyId), where('employeeId', '==', user.uid));

    // Sensitive data: Admin/Manager sees all, others see their own (Team Leads see theirs too)
    const docsQ = isManagement
      ? query(collection(db, 'employeeDocuments'), where('companyId', '==', user.companyId))
      : query(collection(db, 'employeeDocuments'), where('companyId', '==', user.companyId), where('employeeId', '==', user.uid));

    const exitsQ = isManagement
      ? query(collection(db, 'exitRecords'), where('companyId', '==', user.companyId))
      : query(collection(db, 'exitRecords'), where('companyId', '==', user.companyId), where('employeeId', '==', user.uid));

    const perfQ = isManagement
      ? query(collection(db, 'performanceReviews'), where('companyId', '==', user.companyId))
      : query(collection(db, 'performanceReviews'), where('companyId', '==', user.companyId), where('employeeId', '==', user.uid));

    const unsubShifts = onSnapshot(shiftsQ, (snap) => {
      setShifts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Shift)));
    }, (error) => console.error("Shifts read error:", error));

    const unsubHolidays = onSnapshot(holidaysQ, (snap) => {
      setHolidays(snap.docs.map(d => ({ id: d.id, ...d.data() } as Holiday)));
    }, (error) => console.error("Holidays read error:", error));

    const unsubTeam = onSnapshot(teamQ, (snap) => {
      setTeam(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
    }, (error) => console.error("Team read error:", error));
    const unsubDocs = onSnapshot(docsQ, (snap) => {
      setDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() } as EmployeeDocument)));
    }, (error) => console.error("Docs read error:", error));

    const unsubExits = onSnapshot(exitsQ, (snap) => {
      setExits(snap.docs.map(d => ({ id: d.id, ...d.data() } as ExitRecord)));
    }, (error) => console.error("Exits read error:", error));

    const unsubAttendance = onSnapshot(attendanceQ, (snap) => {
      setAttendance(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
    }, (error) => console.error("Attendance read error:", error));

    const unsubLeave = onSnapshot(leaveQ, (snap) => {
      setLeaveRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
    }, (error) => console.error("Leave read error:", error));

    const unsubPerf = onSnapshot(perfQ, (snap) => {
      setPerformanceReviews(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
    }, (error) => console.error("Perf read error:", error));

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
  }, [user.companyId, user.uid, isManagement]);

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
              <h1 className="text-4xl md:text-5xl font-black font-display text-slate-950 italic tracking-tighter leading-none">
                HR <span className="text-blue-600">Workforce</span>
              </h1>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Strategic Talent Operations Center</p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="bg-white p-1.5 rounded-2xl border border-slate-100 flex shadow-sm overflow-x-auto custom-scrollbar no-scrollbar">
          {[
            { id: 'attendance', label: 'Attendance', icon: UserCheck },
            { id: 'leave', label: 'Leaves', icon: AlertCircle },
            { id: 'shifts', label: 'Shifts', icon: Clock },
            { id: 'holidays', label: 'Holidays', icon: CalendarIcon },
            { id: 'performance', label: 'Growth', icon: Award },
            { id: 'documents', label: 'Docs', icon: FileText },
            { id: 'exits', label: 'Exits', icon: LogOut },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as HRTab)}
              className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/20' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
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
          {activeTab === 'documents' && <DocumentTab documents={documents} team={team} companyId={user.companyId} isAdmin={isAdmin} />}
          {activeTab === 'exits' && <ExitTab exits={exits} team={team} companyId={user.companyId} isAdmin={isAdmin} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// --- TAB COMPONENTS ---

function AttendanceTab({ attendance, user, companyId, isAdmin, team }: { attendance: any[], user: UserProfile, companyId: string, isAdmin: boolean, team: UserProfile[] }) {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayRecord = attendance.find(a => a.employeeId === user.uid && a.date === today);

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
          <div className="bg-slate-950 p-10 rounded-[40px] text-white overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Clock size={120} />
            </div>
            <div className="relative z-10">
               <h3 className="text-3xl font-black italic mb-2 tracking-tighter">My Presence</h3>
               <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-8">Personal Timekeeping</p>
               
               <div className="space-y-4 mb-10">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                     <span className="text-[10px] font-black uppercase text-slate-500">Current Date</span>
                     <span className="text-sm font-bold italic">{format(new Date(), 'MMMM dd, yyyy')}</span>
                  </div>
                  {todayRecord?.checkIn && (
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                      <span className="text-[10px] font-black uppercase text-slate-500">Check-in</span>
                      <span className="text-sm font-bold italic text-blue-400">{format(parseISO(todayRecord.checkIn), 'HH:mm:ss')}</span>
                    </div>
                  )}
                  {todayRecord?.location && (
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                      <span className="text-[10px] font-black uppercase text-slate-500">Location Auth</span>
                      <span className="text-[10px] font-mono text-slate-400">{todayRecord.location.lat.toFixed(4)}, {todayRecord.location.lng.toFixed(4)}</span>
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

          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
             <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Daily Snapshot ({format(parseISO(selectedDate), 'MMM dd')})</h4>
             <div className="grid grid-cols-3 gap-4">
                <div className="bg-emerald-50 p-4 rounded-2xl text-center">
                   <p className="text-[8px] font-black text-emerald-600 uppercase mb-1">Present</p>
                   <p className="text-xl font-black text-emerald-700 leading-none">{presentCount}</p>
                </div>
                <div className="bg-amber-50 p-4 rounded-2xl text-center">
                   <p className="text-[8px] font-black text-amber-600 uppercase mb-1">Late</p>
                   <p className="text-xl font-black text-amber-700 leading-none">{lateCount}</p>
                </div>
                <div className="bg-rose-50 p-4 rounded-2xl text-center">
                   <p className="text-[8px] font-black text-rose-600 uppercase mb-1">Absent</p>
                   <p className="text-xl font-black text-rose-700 leading-none">{absentCount}</p>
                </div>
             </div>
          </div>
        </div>

        <div className="xl:col-span-2 space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
               <h3 className="text-3xl font-black italic text-slate-950 tracking-tighter uppercase leading-none">Management Log</h3>
               <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Enterprise Resource Monitoring</p>
            </div>
            <div className="flex items-center space-x-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
               <CalendarIcon size={16} className="text-slate-400 ml-2" />
               <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none font-black text-[10px] uppercase outline-none px-2 py-1"
               />
            </div>
          </div>

          <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-sm">
             <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <tr>
                    <th className="px-8 py-5">Personnel</th>
                    <th className="px-8 py-5">Check In/Out</th>
                    <th className="px-8 py-5">Audit Status</th>
                    {isAdmin && <th className="px-8 py-5 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {team.map(member => {
                    const record = filteredAttendance.find(a => a.employeeId === member.uid);
                    return (
                      <tr key={member.uid} className="hover:bg-slate-50/30 transition-colors group">
                         <td className="px-8 py-6">
                            <div className="flex items-center space-x-3">
                               <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center border border-white overflow-hidden shadow-sm">
                                 {member.photoURL ? <img src={member.photoURL} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" /> : <span className="text-[10px] font-black text-slate-400">{member.name[0]}</span>}
                               </div>
                               <div>
                                  <p className="text-xs font-black text-slate-950 uppercase leading-none mb-1">{member.name}</p>
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{member.department || 'General'}</p>
                               </div>
                            </div>
                         </td>
                         <td className="px-8 py-6 font-mono text-[10px] font-bold">
                            {record?.checkIn ? (
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                  <span className="text-blue-600">IN: {format(parseISO(record.checkIn), 'HH:mm')}</span>
                                  {record.location && <MapPin size={10} className="text-slate-300" />}
                                </div>
                                <span className={record.checkOut ? 'text-emerald-600' : 'text-slate-300'}>
                                  OUT: {record.checkOut ? format(parseISO(record.checkOut), 'HH:mm') : '--:--'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-300">NO ACTIVE SESSION</span>
                            )}
                         </td>
                         <td className="px-8 py-6">
                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                              record?.status === 'On-time' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                              record?.status === 'Late' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                              record?.status === 'Absent' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                              'bg-slate-50 text-slate-400 border-slate-100'
                            }`}>
                              {record?.status || 'Pending'}
                            </span>
                         </td>
                         {isAdmin && (
                           <td className="px-8 py-6 text-right">
                              <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => markStatus(member.uid, 'Late')}
                                  className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-all"
                                  title="Mark as Late"
                                >
                                  <Clock size={14} />
                                </button>
                                <button 
                                  onClick={() => markStatus(member.uid, 'Absent')}
                                  className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-all"
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
      await updateDoc(doc(db, 'leaveRequests', id), { status });
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
         <button onClick={() => setShowApply(true)} className="bg-slate-950 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-950/20 flex items-center space-x-2">
            <Plus size={16} />
            <span>Request Break</span>
         </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {requests.sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(req => {
          const requester = team.find(t => t.uid === req.employeeId);
          return (
            <div key={req.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-md transition-all">
               <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center space-x-4">
                     <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 overflow-hidden">
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

               <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-6 flex justify-between items-center">
                  <div className="text-center flex-1">
                     <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Depart</p>
                     <p className="font-black italic text-slate-950 text-sm uppercase">{format(parseISO(req.startDate), 'MMM dd')}</p>
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div className="text-center flex-1">
                     <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Return</p>
                     <p className="font-black italic text-slate-950 text-sm uppercase">{format(parseISO(req.endDate), 'MMM dd')}</p>
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
          <div className="lg:col-span-2 py-40 text-center bg-slate-50/50 border-2 border-dashed border-slate-100 rounded-[40px]">
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
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-md rounded-[40px] p-6 md:p-10 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="mb-6 md:mb-8">
                <h3 className="text-2xl md:text-3xl font-black italic tracking-tighter text-slate-950">Request Break</h3>
                <p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-widest mt-1">Resource Redirection Protocol</p>
              </div>

              <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2 pb-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Type</label>
                  <select value={newRequest.type} onChange={e => setNewRequest({...newRequest, type: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-black text-xs outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Annual</option>
                    <option>Sick</option>
                    <option>Work From Home</option>
                    <option>Other</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">From</label>
                    <input type="date" value={newRequest.startDate} onChange={e => setNewRequest({...newRequest, startDate: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-black text-xs outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">To</label>
                    <input type="date" value={newRequest.endDate} onChange={e => setNewRequest({...newRequest, endDate: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-black text-xs outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Business Justification</label>
                  <textarea value={newRequest.reason} onChange={e => setNewRequest({...newRequest, reason: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-black text-xs outline-none focus:ring-2 focus:ring-blue-500 h-24" placeholder="Brief explanation..." />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-50">
                <button onClick={handleApply} className="w-full bg-slate-950 text-white p-5 rounded-3xl font-black hover:bg-black transition-all shadow-xl shadow-slate-950/20 active:scale-95">
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
            <h3 className="text-3xl font-black italic text-slate-950 tracking-tighter">Growth Strategy</h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mt-1">High-Performance Optimization</p>
         </div>
         {isAdmin && (
           <button onClick={() => setShowAdd(true)} className="bg-amber-500 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-amber-500/20 flex items-center space-x-2 hover:bg-amber-600 transition-all">
              <Plus size={16} />
              <span>New Review</span>
           </button>
         )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         {reviews.sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(review => {
           const evaluee = team.find(t => t.uid === review.employeeId);
           const reviewer = team.find(t => t.uid === review.reviewerId);
           return (
             <div key={review.id} className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm group hover:shadow-xl transition-all relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
                   <Award size={140} />
                </div>
                
                <div className="flex justify-between items-start mb-10 relative z-10">
                   <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 overflow-hidden shadow-inner">
                         {evaluee?.photoURL ? <img src={evaluee.photoURL} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" /> : <User className="text-slate-200" />}
                      </div>
                      <div>
                         <h4 className="font-black text-slate-950 uppercase text-lg leading-none mb-1">{evaluee?.name || 'Unknown'}</h4>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{review.period}</p>
                      </div>
                   </div>
                   <div className="flex space-x-1">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={14} className={s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-100'} />
                      ))}
                   </div>
                </div>

                <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 mb-8 relative z-10">
                   <div className="flex items-center space-x-2 mb-4 text-blue-600 font-black italic text-xs uppercase underline underline-offset-4 tracking-[0.2em]">
                      <Briefcase size={12} />
                      <span>Executive Feedback</span>
                   </div>
                   <p className="text-sm font-medium text-slate-600 leading-relaxed italic">"{review.feedback}"</p>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-8 relative z-10">
                   {review.kpis?.map((kpi: any, i: number) => (
                     <div key={i} className="bg-white border border-slate-100 p-4 rounded-2xl text-center">
                        <p className="text-[8px] font-black text-slate-400 uppercase mb-1 truncate">{kpi.name}</p>
                        <p className="text-xs font-black text-blue-600 italic leading-none">{kpi.achieved}</p>
                     </div>
                   ))}
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-slate-50 relative z-10">
                   <div className="flex items-center space-x-2">
                      <span className="text-[8px] font-black uppercase text-slate-300">Reviewed by</span>
                      <span className="text-[10px] font-black text-slate-950 uppercase">{reviewer?.name || 'System'}</span>
                   </div>
                   <button onClick={() => deleteDoc(doc(db, 'performanceReviews', review.id))} className="text-slate-200 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={16} />
                   </button>
                </div>
             </div>
           )
         })}
         {reviews.length === 0 && (
           <div className="col-span-full py-40 text-center bg-slate-50/50 border-2 border-dashed border-slate-100 rounded-[40px]">
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
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-lg rounded-[40px] p-6 md:p-10 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="mb-6 md:mb-8 text-center shrink-0">
                <Award size={48} className="mx-auto text-amber-500 mb-4" />
                <h3 className="text-2xl md:text-3xl font-black italic tracking-tighter text-slate-950 uppercase">Performance Audit</h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1 italic">Strategizing Human Capital Enhancement</p>
              </div>

              <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2 pb-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Personnel Selection</label>
                  <select value={newReview.employeeId} onChange={e => setNewReview({...newReview, employeeId: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-black text-xs outline-none shadow-inner">
                    <option value="">Select Target Personnel</option>
                    {team.map(m => <option key={m.uid} value={m.uid}>{m.name}</option>)}
                  </select>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Review Period</label>
                    <input value={newReview.period} onChange={e => setNewReview({...newReview, period: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-black text-[10px] uppercase outline-none shadow-inner" placeholder="e.g. Q1 2026" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Strategic Rating (1-5)</label>
                    <select value={newReview.rating} onChange={e => setNewReview({...newReview, rating: Number(e.target.value)})} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-black text-[10px] outline-none shadow-inner">
                      {[1,2,3,4,5].map(r => <option key={r} value={r}>{r} / 5</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Diagnostic Feedback</label>
                  <textarea value={newReview.feedback} onChange={e => setNewReview({...newReview, feedback: e.target.value})} className="w-full p-5 bg-slate-50 rounded-[32px] border border-slate-100 font-black text-[10px] uppercase outline-none min-h-[120px] shadow-inner" placeholder="Detail the tactical observations..." />
                </div>
              </div>

              <div className="pt-4 shrink-0 border-t border-slate-50">
                <button onClick={handleAdd} className="w-full bg-slate-950 text-white p-6 rounded-[32px] font-black italic text-sm tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-950/20 active:scale-95 uppercase">
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
              <h3 className="text-2xl font-black italic text-slate-950">Active Shifts</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Defining working thresholds</p>
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
            <div key={shift.id} className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isAdmin && (
                    <button onClick={() => deleteDoc(doc(db, 'shifts', shift.id))} className="text-slate-300 hover:text-rose-600 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  )}
               </div>
               <div className="flex items-center space-x-4 mb-6">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    shift.type === 'Night' ? 'bg-indigo-50 text-indigo-600' : 
                    shift.type === 'Remote' ? 'bg-emerald-50 text-emerald-600' :
                    shift.type === 'Hybrid' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {shift.type === 'Night' ? <Moon size={24} /> : 
                     shift.type === 'Remote' ? <Globe size={24} /> :
                     shift.type === 'Hybrid' ? <Smartphone size={24} /> : <Sun size={24} />}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-950 uppercase text-lg tracking-tight">{shift.name}</h4>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{shift.type}</p>
                  </div>
               </div>
               <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex justify-between items-center mb-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hours</p>
                    <p className="font-black italic text-slate-950">{shift.startTime} — {shift.endTime}</p>
                  </div>
                  <Clock className="text-slate-200" size={24} />
               </div>
               <div className="flex flex-wrap gap-2">
                  {['S','M','T','W','T','F','S'].map((day, i) => (
                    <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black border transition-colors ${
                      shift.workDays.includes(i) ? 'bg-slate-950 text-white border-slate-950' : 'bg-white text-slate-300 border-slate-100'
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
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-md rounded-[40px] p-6 md:p-10 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="mb-6 md:mb-8 shrink-0">
                <h3 className="text-2xl md:text-3xl font-black italic tracking-tighter text-slate-950">Define Shift</h3>
                <p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-widest mt-1">Strategic boundary definition</p>
              </div>

              <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2 pb-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Shift Name</label>
                  <input value={newShift.name} onChange={e => setNewShift({...newShift, name: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-black text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all uppercase" placeholder="e.g. Standard 9-6" />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Start Time</label>
                    <input type="time" value={newShift.startTime} onChange={e => setNewShift({...newShift, startTime: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-black text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">End Time</label>
                    <input type="time" value={newShift.endTime} onChange={e => setNewShift({...newShift, endTime: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-black text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Shift Type</label>
                  <select value={newShift.type} onChange={e => setNewShift({...newShift, type: e.target.value as any})} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-black text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer">
                    <option>Full-time</option>
                    <option>Night</option>
                    <option>Remote</option>
                    <option>Hybrid</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Working Days</label>
                  <div className="flex flex-wrap gap-2">
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
                          newShift.workDays.includes(i) ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-300 border-slate-100'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 shrink-0 border-t border-slate-50">
                <button onClick={handleAdd} className="w-full bg-slate-950 text-white p-5 rounded-3xl font-black hover:bg-black transition-all shadow-xl shadow-slate-950/20">
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
              <h3 className="text-2xl font-black italic text-slate-950">Company Calendar</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Observed non-working days</p>
           </div>
           {isAdmin && (
             <button onClick={() => setShowAdd(true)} className="bg-slate-950 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center space-x-2">
               <Plus size={16} />
               <span>Add Holiday</span>
             </button>
           )}
        </div>

        <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-sm">
           <table className="w-full text-left">
              <thead className="bg-slate-50/50">
                 <tr>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Holiday Name</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Type</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Action</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                 {sortedHolidays.map(h => (
                   <tr key={h.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center space-x-3">
                           <div className="w-10 h-10 bg-slate-100 rounded-xl flex flex-col items-center justify-center text-slate-500">
                              <span className="text-[8px] font-black uppercase">{format(parseISO(h.date), 'MMM')}</span>
                              <span className="text-xs font-black">{format(parseISO(h.date), 'dd')}</span>
                           </div>
                           <span className="text-xs font-black text-slate-950 uppercase">{format(parseISO(h.date), 'EEEE')}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-sm font-black text-slate-900 uppercase">{h.name}</div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          h.type === 'Public' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                          h.type === 'Company' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-slate-50 text-slate-400 border border-slate-100'
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
                      {format(parseISO(h.date), 'dd')}
                   </div>
                   <div>
                      <p className="text-sm font-bold uppercase tracking-tight">{h.name}</p>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{h.type} Break</p>
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
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-md rounded-[40px] p-6 md:p-10 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="mb-6 md:mb-8 shrink-0">
                <h3 className="text-2xl md:text-3xl font-black italic tracking-tighter text-slate-950">Add Holiday</h3>
                <p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-widest mt-1">Calendar Event Configuration</p>
              </div>

              <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2 pb-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Holiday Name</label>
                  <input value={newHoliday.name} onChange={e => setNewHoliday({...newHoliday, name: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-black text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all uppercase" placeholder="e.g. Annual Summit" />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Date</label>
                  <input type="date" value={newHoliday.date} onChange={e => setNewHoliday({...newHoliday, date: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-black text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Type</label>
                  <select value={newHoliday.type} onChange={e => setNewHoliday({...newHoliday, type: e.target.value as any})} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-black text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer">
                    <option>Public</option>
                    <option>Company</option>
                    <option>Optional</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 shrink-0 border-t border-slate-50">
                <button onClick={handleAdd} className="w-full bg-slate-950 text-white p-5 rounded-3xl font-black hover:bg-black transition-all shadow-xl shadow-slate-950/20">
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
           <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 mb-2 block">Filter by Employee</label>
           <select 
            value={filterEmployee}
            onChange={e => setFilterEmployee(e.target.value)}
            className="w-full p-4 bg-white border border-slate-100 rounded-2xl font-black text-xs outline-none shadow-sm focus:ring-2 focus:ring-blue-500"
           >
              <option value="">All Personnel</option>
              {team.map(m => <option key={m.uid} value={m.uid}>{m.name}</option>)}
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
             <div key={entry.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-lg transition-all group">
                <div className="flex justify-between items-start mb-6">
                   <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-all">
                      <FileText size={24} />
                   </div>
                   <div className="flex items-center space-x-1">
                      <a href={entry.fileUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-300 hover:text-blue-600 transition-colors">
                        <ExternalLink size={16} />
                      </a>
                      {isAdmin && (
                        <button onClick={() => deleteDoc(doc(db, 'employeeDocuments', entry.id))} className="p-2 text-slate-300 hover:text-rose-600 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      )}
                   </div>
                </div>
                <h4 className="font-black text-slate-950 uppercase text-sm tracking-tight mb-1 truncate">{entry.name}</h4>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">{entry.type}</p>
                <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                   <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-black border border-white">
                        {owner?.name?.[0] || '?'}
                      </div>
                      <span className="text-[10px] font-bold text-slate-600 truncate max-w-[100px]">{owner?.name || 'Unknown'}</span>
                   </div>
                   <p className="text-[8px] font-black text-slate-300 uppercase">{format(parseISO(entry.uploadedAt), 'MMM dd, yyyy')}</p>
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
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-md rounded-[40px] p-6 md:p-10 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="mb-6 md:mb-8 shrink-0">
                <h3 className="text-2xl md:text-3xl font-black italic tracking-tighter text-slate-950">Store Document</h3>
                <p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-widest mt-1">Institutional Memory Archive</p>
              </div>

              <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2 pb-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Document Name</label>
                  <input value={newDoc.name} onChange={e => setNewDoc({...newDoc, name: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-black text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all uppercase" placeholder="e.g. Contract Amendment v2" />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Employee</label>
                  <select value={newDoc.employeeId} onChange={e => setNewDoc({...newDoc, employeeId: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-black text-xs outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select Personnel</option>
                    {team.map(m => <option key={m.uid} value={m.uid}>{m.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Category</label>
                  <select value={newDoc.type} onChange={e => setNewDoc({...newDoc, type: e.target.value as any})} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-black text-xs outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Offer Letter</option>
                    <option>ID Proof</option>
                    <option>Contract</option>
                    <option>Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">External File URL</label>
                  <div className="relative">
                     <Globe size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                     <input value={newDoc.fileUrl} onChange={e => setNewDoc({...newDoc, fileUrl: e.target.value})} className="w-full pl-10 pr-4 py-4 bg-slate-50 rounded-2xl border border-slate-100 font-black text-[10px] outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://drive.google.com/..." />
                  </div>
                </div>
              </div>

              <div className="pt-4 shrink-0 border-t border-slate-50">
                <button onClick={handleAdd} className="w-full bg-slate-950 text-white p-5 rounded-3xl font-black hover:bg-black transition-all shadow-xl shadow-slate-950/20">
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
            <h3 className="text-2xl font-black italic text-slate-950">Exit Management</h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Offboarding & Strategic Deprovisioning</p>
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
             <div key={record.id} className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden flex flex-col md:flex-row">
                <div className="p-8 md:w-1/2 space-y-6">
                   <div className="flex items-center space-x-4 mb-2">
                      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 overflow-hidden">
                         {owner?.photoURL ? (
                           <img src={owner.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                         ) : <User className="text-slate-300" />}
                      </div>
                      <div>
                         <h4 className="font-black text-slate-950 uppercase text-lg leading-tight">{owner?.name || 'Unknown'}</h4>
                         <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{owner?.department} • ID: {owner?.memberId}</p>
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                         <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Resigned</p>
                         <p className="text-[10px] font-black text-slate-950 uppercase">{format(parseISO(record.resignationDate), 'MMM dd, yyyy')}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                         <p className="text-[8px] font-black uppercase text-slate-400 mb-1">LWD</p>
                         <p className="text-[10px] font-black text-blue-600 uppercase">{format(parseISO(record.lastWorkingDay), 'MMM dd, yyyy')}</p>
                      </div>
                   </div>
                   <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                      <p className="text-[8px] font-black uppercase text-slate-400 mb-2">Primary Reason</p>
                      <p className="text-xs font-medium text-slate-600 h-16 overflow-y-auto italic">"{record.reason}"</p>
                   </div>
                   <div className="flex items-center justify-between">
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border ${
                        record.status === 'Settled' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                      }`}>{record.status}</span>
                      {isAdmin && (
                        <button onClick={() => deleteDoc(doc(db, 'exitRecords', record.id))} className="text-slate-200 hover:text-rose-600 transition-colors">
                           <Trash2 size={16} />
                        </button>
                      )}
                   </div>
                </div>

                <div className="bg-slate-50 p-8 md:w-1/2 border-l border-slate-100">
                   <div className="flex items-center justify-between mb-6">
                      <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Exit Checklist</h5>
                      <span className="text-[10px] font-black text-slate-950">{completedCount}/{record.checklist.length}</span>
                   </div>
                   <div className="space-y-3">
                      {record.checklist.map((item, idx) => (
                        <button 
                          key={idx}
                          onClick={() => isAdmin && updateChecklist(record.id, idx, !item.completed)}
                          className={`w-full flex items-center space-x-3 p-4 rounded-2xl border transition-all ${
                            item.completed ? 'bg-white border-emerald-100 text-slate-400' : 'bg-white border-slate-100 text-slate-950 hover:border-blue-200'
                          }`}
                        >
                           <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                             item.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200'
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
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-lg rounded-[40px] p-6 md:p-10 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="mb-6 md:mb-8 shrink-0">
                <h3 className="text-2xl md:text-3xl font-black italic tracking-tighter text-slate-950">Initiate Exit</h3>
                <p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-widest mt-1">Offboarding Protocol Activation</p>
              </div>

              <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2 pb-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Choose Personnel</label>
                  <select value={newExit.employeeId} onChange={e => setNewExit({...newExit, employeeId: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-black text-xs outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select Employee</option>
                    {team.filter(t => !t.isResigned).map(m => <option key={m.uid} value={m.uid}>{m.name}</option>)}
                  </select>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Resignation Date</label>
                    <input type="date" value={newExit.resignationDate} onChange={e => setNewExit({...newExit, resignationDate: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-black text-xs outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Last Working Day</label>
                    <input type="date" value={newExit.lastWorkingDay} onChange={e => setNewExit({...newExit, lastWorkingDay: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-black text-xs outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Reason for Exit</label>
                  <textarea value={newExit.reason} onChange={e => setNewExit({...newExit, reason: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-black text-xs outline-none focus:ring-2 focus:ring-blue-500 h-24" placeholder="Brief explanation..." />
                </div>
              </div>

              <div className="pt-4 shrink-0 border-t border-slate-50">
                <button onClick={handleAdd} className="w-full bg-rose-600 text-white p-5 rounded-3xl font-black hover:bg-rose-700 transition-all shadow-xl shadow-rose-950/20">
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
