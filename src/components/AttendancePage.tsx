import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit, addDoc, updateDoc, doc } from 'firebase/firestore';
import { UserProfile, Attendance } from '../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { 
  Calendar as CalendarIcon, Clock, CheckCircle, AlertCircle, 
  MapPin, ChevronLeft, ChevronRight, User as UserIcon, Filter, Search, Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { parseISO } from 'date-fns';

interface AttendancePageProps {
  user: UserProfile;
}

export default function AttendancePage({ user }: AttendancePageProps) {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'personal' | 'admin'>(user.role === 'admin' || user.role === 'manager' || user.role === 'team_lead' ? 'admin' : 'personal');
  const [searchQuery, setSearchQuery] = useState('');
  const [isClocking, setIsClocking] = useState(false);

  const isAdmin = user.role === 'admin' || user.role === 'manager';
  const isTeamLead = isAdmin || user.role === 'team_lead';

  useEffect(() => {
    // Fetch Employees if Team Lead+
    if (isTeamLead) {
      const unsubEmp = onSnapshot(query(collection(db, 'users'), where('companyId', '==', user.companyId)), (snap) => {
        setEmployees(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
      });
      return unsubEmp;
    }
  }, [isTeamLead, user.companyId]);

  useEffect(() => {
    const start = startOfMonth(selectedMonth).toISOString();
    const end = endOfMonth(selectedMonth).toISOString();

    let q;
    if (viewMode === 'personal') {
      q = query(
        collection(db, 'attendance'),
        where('employeeId', '==', user.uid),
        where('date', '>=', format(startOfMonth(selectedMonth), 'yyyy-MM-dd')),
        where('date', '<=', format(endOfMonth(selectedMonth), 'yyyy-MM-dd')),
        orderBy('date', 'desc')
      );
    } else {
      q = query(
        collection(db, 'attendance'),
        where('companyId', '==', user.companyId),
        where('date', '>=', format(startOfMonth(selectedMonth), 'yyyy-MM-dd')),
        where('date', '<=', format(endOfMonth(selectedMonth), 'yyyy-MM-dd')),
        orderBy('date', 'desc')
      );
    }

    const unsub = onSnapshot(q, (snap) => {
      setAttendance(snap.docs.map(d => ({ id: d.id, ...d.data() } as Attendance)));
    }, (error) => {
      console.error("Attendance fetch error:", error);
      toast.error("Failed to sync attendance logs.");
    });

    return unsub;
  }, [viewMode, selectedMonth, user.uid, user.companyId]);

  const handleClockIn = async () => {
    setIsClocking(true);
    try {
      const now = new Date().toISOString();
      const todayDate = format(new Date(), 'yyyy-MM-dd');
      
      const existing = attendance.find(a => a.date === todayDate && a.employeeId === user.uid);
      if (existing) {
        toast.error("Already checked in for today.");
        return;
      }

      await addDoc(collection(db, 'attendance'), {
        companyId: user.companyId,
        employeeId: user.uid,
        employeeName: user.name,
        date: todayDate,
        checkIn: now,
        status: 'On-time',
        createdAt: now
      });
      toast.success("Clock-in successful. Welcome!");
    } catch (error) {
      toast.error("Process interrupted. Try again.");
    } finally {
      setIsClocking(false);
    }
  };

  const handleClockOut = async (id: string) => {
    setIsClocking(true);
    try {
      await updateDoc(doc(db, 'attendance', id), {
        checkOut: new Date().toISOString()
      });
      toast.success("Clock-out successful. See you tomorrow!");
    } catch (error) {
      toast.error("Process interrupted.");
    } finally {
      setIsClocking(false);
    }
  };

  const updateAttendanceStatus = async (id: string, status: 'On-time' | 'Late' | 'Absent') => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'attendance', id), { status });
      toast.success(`Marked as ${status}`);
    } catch (error) {
      toast.error("Update failed.");
    }
  };

  const filteredAttendance = attendance.filter(a => 
    a.employeeName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const todayRecord = attendance.find(a => a.date === format(new Date(), 'yyyy-MM-dd') && a.employeeId === user.uid);

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-950 tracking-tighter italic">Attendance Pulse</h2>
          <p className="text-slate-500 font-medium text-sm md:text-base">Real-time attendance & shift logging</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white p-2 md:p-3 rounded-3xl border border-slate-100 shadow-sm w-full sm:w-auto">
          {isAdmin && (
            <div className="flex p-1 bg-slate-50 rounded-2xl w-full sm:w-auto">
              <button 
                onClick={() => setViewMode('personal')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'personal' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
              >
                Personal
              </button>
              <button 
                onClick={() => setViewMode('admin')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'admin' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
              >
                Nexus Control
              </button>
            </div>
          )}
          <div className="flex items-center justify-between flex-1 sm:flex-none bg-slate-50 sm:bg-transparent rounded-2xl sm:rounded-none px-2 sm:px-0">
            <button 
              onClick={() => setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-[10px] md:text-xs font-black uppercase tracking-widest px-2 md:px-4 whitespace-nowrap">{format(selectedMonth, 'MMMM yyyy')}</span>
            <button 
              onClick={() => setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10">
        {/* Quick Action Widget */}
        <div className="lg:col-span-1 space-y-8 md:space-y-10">
           <section className="bg-slate-950 p-6 md:p-10 rounded-[40px] text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-bl-[100px] -z-10 group-hover:scale-110 transition-transform" />
              <div className="relative z-10 space-y-6 md:space-y-8">
                <div>
                  <h3 className="text-lg md:text-xl font-black italic tracking-tight">Shift Control</h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Current Active Session</p>
                </div>

                <div className="space-y-4">
                  {todayRecord ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                        <div className="flex items-center space-x-3 text-indigo-400">
                          <Clock size={16} />
                          <span className="text-xs font-black uppercase tracking-widest">InBound</span>
                        </div>
                        <span className="text-sm font-black italic">{format(new Date(todayRecord.checkIn), 'hh:mm a')}</span>
                      </div>
                      {todayRecord.checkOut ? (
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 opacity-60">
                          <div className="flex items-center space-x-3 text-rose-400">
                            <Clock size={16} />
                            <span className="text-xs font-black uppercase tracking-widest">OutBound</span>
                          </div>
                          <span className="text-sm font-black italic">{format(new Date(todayRecord.checkOut), 'hh:mm a')}</span>
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleClockOut(todayRecord.id)}
                          disabled={isClocking}
                          className="w-full bg-rose-500 hover:bg-rose-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-rose-500/20 transition-all active:scale-95"
                        >
                          {isClocking ? 'Processing...' : 'Terminate Shift'}
                        </button>
                      )}
                    </div>
                  ) : (
                    <button 
                      onClick={handleClockIn}
                      disabled={isClocking}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-indigo-600/30 transition-all active:scale-95"
                    >
                      {isClocking ? 'Initiating...' : 'Initialize Pulse'}
                    </button>
                  )}
                </div>

                <div className="pt-4 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 border-t border-white/5">
                   <span>Safety Protocol</span>
                   <Shield size={14} className="text-indigo-600" />
                </div>
              </div>
           </section>

           <section className="bg-white p-6 md:p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">Calendar Insights</h4>
              <div className="grid grid-cols-7 gap-1 md:gap-2">
                {['M','T','W','T','F','S','S'].map((d, i) => (
                  <div key={i} className="text-center text-[8px] md:text-[10px] font-black text-slate-300">{d}</div>
                ))}
                {(() => {
                  const daysInMonth = eachDayOfInterval({
                    start: startOfMonth(selectedMonth),
                    end: endOfMonth(selectedMonth)
                  });
                  return daysInMonth.map((day, i) => {
                    const hasAtt = attendance.some(a => a.employeeId === user.uid && isSameDay(parseISO(a.date), day));
                    return (
                      <div key={i} title={format(day, 'MMM dd, yyyy')} className={`aspect-square rounded-lg flex items-center justify-center text-[8px] md:text-[10px] font-bold transition-colors ${hasAtt ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                        {format(day, 'd')}
                      </div>
                    );
                  });
                })()}
              </div>
           </section>
        </div>

        {/* Logs Table */}
        <div className="lg:col-span-2 space-y-8">
           <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-xl shadow-slate-200/20">
              <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
                 <h3 className="font-black text-slate-950 uppercase tracking-tight italic">Pulse Inventory</h3>
                 
                 {viewMode === 'admin' && (
                   <div className="relative w-full md:w-64">
                      <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Filter by operative..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-slate-100 transition-all border border-transparent focus:border-slate-100"
                      />
                   </div>
                 )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Operative</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Window</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                      {isAdmin && <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Overrides</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                     {filteredAttendance.length > 0 ? (
                       filteredAttendance.map(log => (
                         <tr key={log.id} className="group hover:bg-slate-50/30 transition-colors">
                           <td className="px-8 py-6">
                              <p className="text-xs font-black text-slate-900 uppercase tracking-tight italic">{format(parseISO(log.date), 'MMM dd, yyyy')}</p>
                           </td>
                           <td className="px-8 py-6">
                              <div className="flex items-center space-x-3">
                                 <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-black border border-indigo-100">
                                   {log.employeeName[0]}
                                 </div>
                                 <span className="text-xs font-black text-slate-950 uppercase tracking-tight">{log.employeeName}</span>
                              </div>
                           </td>
                           <td className="px-8 py-6">
                              <div className="flex items-center space-x-1 font-mono text-[10px] text-slate-500 font-bold bg-slate-50 px-2 py-1 rounded-md border border-slate-100 w-fit">
                                 <span>{log.checkIn ? format(new Date(log.checkIn), 'HH:mm') : '—'}</span>
                                 <ChevronRight size={10} />
                                 <span>{log.checkOut ? format(new Date(log.checkOut), 'HH:mm') : '—'}</span>
                              </div>
                           </td>
                           <td className="px-8 py-6">
                              <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${
                                log.status === 'On-time' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                log.status === 'Late' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                'bg-rose-50 text-rose-600 border-rose-100'
                              }`}>
                                {log.status}
                              </span>
                           </td>
                           {isAdmin && (
                             <td className="px-8 py-6 text-right">
                               <div className="flex justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {(['On-time', 'Late', 'Absent'] as const).map(s => (
                                    <button 
                                      key={s}
                                      onClick={() => updateAttendanceStatus(log.id, s)}
                                      className={`px-2 py-1 rounded-md text-[8px] font-black uppercase transition-all ${log.status === s ? 'hidden' : 'bg-slate-100 text-slate-400 hover:bg-slate-900 hover:text-white'}`}
                                    >
                                      {s}
                                    </button>
                                  ))}
                               </div>
                             </td>
                           )}
                         </tr>
                       ))
                     ) : (
                       <tr>
                         <td colSpan={5} className="py-20 text-center">
                            <AlertCircle size={32} className="mx-auto text-slate-200 mb-4" />
                            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No pulse logs found for this period.</p>
                         </td>
                       </tr>
                     )}
                  </tbody>
                </table>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
