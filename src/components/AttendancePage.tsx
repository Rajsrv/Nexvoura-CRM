import React, { useState, useEffect } from 'react';
import { UserProfile, Attendance, Shift, Company } from '../types';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { attendanceService } from '../services/attendanceService';
import { 
  Clock, 
  Calendar as CalendarIcon, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Settings, 
  History, 
  Users,
  Search,
  Filter,
  Download,
  Info
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, startOfYear, endOfYear, subMonths, addMonths, isAfter, isBefore, differenceInDays, startOfDay, endOfDay } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export default function AttendancePage({ user, company }: { user: UserProfile, company: Company | null }) {
  const [activeTab, setActiveTab] = useState<'mark' | 'history' | 'hr' | 'settings' | 'dashboard'>('mark');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [records, setRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [totalEmployees, setTotalEmployees] = useState(0);
  
  // HR View States
  const [allRecords, setAllRecords] = useState<Attendance[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: new Date()
  });

  const isAdmin = user.role === 'admin' || user.role === 'manager';
  const isHR = isAdmin || user.permissions?.includes('finance:manage');

  useEffect(() => {
    fetchData();
  }, [user.companyId, user.uid]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [fetchedShifts, today] = await Promise.all([
        attendanceService.getShifts(user.companyId),
        attendanceService.getTodayAttendance(user.uid, user.companyId)
      ]);
      setShifts(fetchedShifts);
      setTodayAttendance(today);
      
      const history = await attendanceService.getAttendanceRecords(user.companyId, user.uid);
      setRecords(history);

      if (isHR) {
        // Fetch all attendance records
        const all = await attendanceService.getAttendanceRecords(user.companyId);
        setAllRecords(all);
        
        // Fetch total employees count for analytics
        const q = query(collection(db, 'users'), where('companyId', '==', user.companyId), where('status', '==', 'Active'));
        const snap = await getDocs(q);
        setTotalEmployees(snap.size);
      }
    } catch (error) {
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = (): Promise<{ lat: number; lng: number; address?: string } | undefined> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(undefined);
        return;
      }

      // HR preference for high accuracy and fresh data
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude: lat, longitude: lng } = position.coords;
          let address = 'Geolocation captured';
          
          try {
            // Using reverse geocoding with user-agent for reliability
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
              headers: { 'Accept-Language': 'en', 'User-Agent': 'HR-Management-App' }
            });
            const data = await response.json();
            if (data.display_name) {
              address = data.display_name;
            }
          } catch (e) {
            console.error('Reverse geocoding failed', e);
          }
          
          resolve({ lat, lng, address });
        },
        (error) => {
          console.warn('Geolocation error:', error.message);
          resolve(undefined);
        },
        { 
          enableHighAccuracy: true, 
          timeout: 15000,
          maximumAge: 0 
        }
      );
    });
  };

  const handleClockIn = async () => {
    if (!user.shiftId) {
      toast.error('No shift assigned to you. Contact admin.');
      return;
    }
    const shift = shifts.find(s => s.id === user.shiftId);
    if (!shift) {
      toast.error('Shift details not found');
      return;
    }

    setLoading(true);
    try {
      const location = await getCurrentLocation();
      await attendanceService.clockIn(user, shift, location);
      toast.success('Clocked in successfully' + (location ? ' with location' : ''));
      fetchData();
    } catch (error) {
      toast.error('Clock in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!todayAttendance) return;
    setLoading(true);
    try {
      const location = await getCurrentLocation();
      await attendanceService.clockOut(todayAttendance.id, location);
      toast.success('Clocked out successfully');
      fetchData();
    } catch (error) {
      toast.error('Clock out failed');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (allRecords.length === 0) {
      toast.error('No records to export');
      return;
    }

    const headers = ['Employee Name', 'Employee ID', 'Date', 'Check In', 'Check Out', 'Work Hours', 'Status', 'Notes'];
    const csvContent = [
      headers.join(','),
      ...allRecords.map(r => [
        `"${r.employeeName}"`,
        r.employeeId,
        r.date,
        r.checkIn ? format(parseISO(r.checkIn), 'HH:mm:ss') : '-',
        r.checkOut ? format(parseISO(r.checkOut), 'HH:mm:ss') : '-',
        r.workHours || 0,
        r.status,
        `"${r.notes || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_report_${format(new Date(), 'yyyy_MM_dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report downloaded successfully');
  };

  const currentShift = shifts.find(s => s.id === user.shiftId);

  return (
    <div className="space-y-8 max-w-7xl pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white italic">Attendance Hub</h2>
          <p className="text-slate-500 dark:text-dark-text-muted font-medium tracking-tight">Track your time and workspace presence</p>
        </div>
        
        <div className="flex items-center space-x-1 p-1 bg-slate-100 dark:bg-dark-bg rounded-2xl border border-slate-200 dark:border-dark-border">
          <button 
            onClick={() => setActiveTab('mark')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'mark' ? 'bg-white dark:bg-dark-surface text-brand-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Mark
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-white dark:bg-dark-surface text-brand-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            History
          </button>
          {isHR && (
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'dashboard' ? 'bg-white dark:bg-dark-surface text-brand-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Dashboard
            </button>
          )}
          {isHR && (
            <button 
              onClick={() => setActiveTab('hr')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'hr' ? 'bg-white dark:bg-dark-surface text-brand-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Reports
            </button>
          )}
          {isAdmin && (
            <button 
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'settings' ? 'bg-white dark:bg-dark-surface text-brand-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Settings
            </button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'mark' && (
          <motion.div 
            key="mark"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Clock Widget */}
            <div className="lg:col-span-2 saas-card p-12 flex flex-col items-center justify-center space-y-8 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                 <Clock size={300} />
               </div>
               
               <div className="text-center space-y-2">
                 <p className="text-[10px] font-black text-brand-primary uppercase tracking-[0.3em]">Current Session</p>
                 <h3 className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter">
                   {format(new Date(), 'hh:mm a')}
                 </h3>
                 <p className="text-slate-400 font-bold">{format(new Date(), 'EEEE, MMMM do, yyyy')}</p>
               </div>

               <div className="flex items-center space-x-8">
                 <div className="text-center">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Check In</p>
                   <p className="text-lg font-black text-slate-900 dark:text-white italic">
                     {todayAttendance?.checkIn ? format(parseISO(todayAttendance.checkIn), 'hh:mm a') : '--:--'}
                   </p>
                 </div>
                 <div className="w-px h-10 bg-slate-100 dark:bg-dark-border" />
                 <div className="text-center">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Check Out</p>
                   <p className="text-lg font-black text-slate-900 dark:text-white italic">
                     {todayAttendance?.checkOut ? format(parseISO(todayAttendance.checkOut), 'hh:mm a') : '--:--'}
                   </p>
                 </div>
               </div>

               <div className="flex flex-col items-center gap-6 pt-4 w-full max-w-sm">
                 <div className="flex items-center gap-4 w-full">
                   <button 
                     onClick={handleClockIn}
                     disabled={!!todayAttendance || !currentShift || loading}
                     className="flex-1 saas-button-primary py-4 px-6 rounded-2xl text-sm shadow-xl shadow-blue-500/10 active:scale-95 disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed transition-all font-black uppercase tracking-widest"
                   >
                     Clock In
                   </button>
                   
                   <button 
                     onClick={handleClockOut}
                     disabled={!todayAttendance || !!todayAttendance.checkOut || loading}
                     className="flex-1 bg-slate-900 dark:bg-emerald-600 text-white hover:bg-slate-800 dark:hover:bg-emerald-700 disabled:bg-slate-100 dark:disabled:bg-dark-bg disabled:text-slate-400 dark:disabled:text-dark-text-muted py-4 px-6 rounded-2xl text-sm shadow-lg active:scale-95 transition-all font-black uppercase tracking-widest border border-slate-700 dark:border-dark-border"
                   >
                     Clock Out
                   </button>
                 </div>
                 
                 {todayAttendance?.checkOut && (
                   <motion.div 
                     initial={{ opacity: 0, scale: 0.9 }}
                     animate={{ opacity: 1, scale: 1 }}
                     className="flex items-center space-x-3 px-8 py-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-500/20 font-bold italic text-xs"
                   >
                     <CheckCircle2 size={16} />
                     <span>Workday Completed</span>
                   </motion.div>
                 )}
                 
                 {todayAttendance && !todayAttendance.checkOut && (
                   <div className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border animate-pulse ${
                     todayAttendance.status === 'On-time' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                     todayAttendance.status === 'Late' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                     'bg-slate-50 text-slate-600 border-slate-100'
                   }`}>
                     Session Live: {todayAttendance.status}
                   </div>
                 )}
               </div>
            </div>

            {/* Shift Info */}
            <div className="space-y-6">
              <div className="saas-card p-8">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary">
                    <Info size={18} />
                  </div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Your Schedule</h4>
                </div>
                
                {currentShift ? (
                  <div className="space-y-6">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Active Shift</p>
                      <div className="p-5 bg-slate-50 dark:bg-dark-bg rounded-2xl border border-slate-100 dark:border-dark-border">
                        <p className="text-sm font-black text-slate-900 dark:text-white italic mb-1">{currentShift.name}</p>
                        <p className="text-[11px] font-bold text-slate-500 dark:text-dark-text-muted uppercase mb-3">
                          {currentShift.startTime} - {currentShift.endTime}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, d) => (
                            <div key={d} className={`w-6 h-6 flex items-center justify-center rounded-lg text-[8px] font-black ${
                              currentShift.workDays.includes(d) 
                                ? 'bg-brand-primary text-white' 
                                : 'bg-slate-200 dark:bg-dark-surface text-slate-400'
                            }`}>
                              {day}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-100 dark:border-blue-500/20">
                         <p className="text-[8px] font-black text-blue-500 uppercase mb-1">Buffer</p>
                         <p className="text-sm font-black text-blue-700 dark:text-blue-400 italic">{currentShift.bufferMinutes} Mins</p>
                      </div>
                      <div className="p-4 bg-purple-50 dark:bg-purple-500/10 rounded-xl border border-purple-100 dark:border-purple-500/20">
                         <p className="text-[8px] font-black text-purple-500 uppercase mb-1">Type</p>
                         <p className="text-sm font-black text-purple-700 dark:text-purple-400 italic">{currentShift.type}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="mx-auto text-slate-300 mb-2" />
                    <p className="text-xs text-slate-400 italic">No shift assigned yet.</p>
                  </div>
                )}
              </div>

              <div className="saas-card p-8 bg-slate-900 text-white relative h-[320px] overflow-hidden">
                 <div className="relative z-10 space-y-6">
                   <h4 className="text-sm font-black uppercase tracking-widest text-indigo-400 italic">Quick Insights</h4>
                   <div className="space-y-4">
                     <div className="flex justify-between items-end border-b border-white/5 pb-3">
                       <span className="text-[10px] font-bold text-slate-400 uppercase">Late Days this month</span>
                       <span className="text-2xl font-black italic">{records.filter(r => r.status === 'Late' && r.date.startsWith(format(new Date(), 'yyyy-MM'))).length}</span>
                     </div>
                     <div className="flex justify-between items-end border-b border-white/5 pb-3">
                       <span className="text-[10px] font-bold text-slate-400 uppercase">Average Work Hours</span>
                       <span className="text-2xl font-black italic">
                         {records.length > 0 
                           ? (records.reduce((acc, r) => acc + (r.workHours || 0), 0) / records.length).toFixed(1) 
                           : '0'}h
                       </span>
                     </div>
                     <div className="flex justify-between items-end border-b border-white/5 pb-3">
                       <span className="text-[10px] font-bold text-slate-400 uppercase">On-time rate</span>
                       <span className="text-2xl font-black italic text-brand-primary">
                         {records.length > 0 
                           ? Math.round((records.filter(r => r.status === 'On-time').length / records.length) * 100)
                           : '0'}%
                       </span>
                     </div>
                   </div>
                 </div>
                 <div className="absolute -bottom-10 -left-10 opacity-10 blur-3xl w-60 h-60 bg-brand-primary rounded-full" />
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div 
            key="history"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="saas-card p-0 overflow-hidden"
          >
            <div className="p-8 border-b dark:border-dark-border flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-slate-100 dark:bg-dark-bg rounded-lg text-slate-600 dark:text-dark-text-muted">
                  <CalendarIcon size={18} />
                </div>
                <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest italic">Attendance Record</h4>
              </div>
              
              <div className="flex items-center space-x-4">
                <button onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))} className="p-2 hover:bg-slate-50 dark:hover:bg-dark-bg rounded-lg transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-black text-slate-900 dark:text-white min-w-[120px] text-center italic">
                  {format(selectedMonth, 'MMMM yyyy')}
                </span>
                <button onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))} className="p-2 hover:bg-slate-50 dark:hover:bg-dark-bg rounded-lg transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-dark-bg border-b dark:border-dark-border">
                        <td className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</td>
                        <td className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Clock In</td>
                        <td className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Clock Out</td>
                        <td className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hours</td>
                        <td className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</td>
                        <td className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</td>
                        <td className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Notes</td>
                      </tr>
                    </thead>
                <tbody>
                  {eachDayOfInterval({ 
                    start: startOfMonth(selectedMonth), 
                    end: endOfMonth(selectedMonth) 
                  }).reverse().map(day => {
                    const record = records.find(r => isSameDay(parseISO(r.date), day));
                    const isFuture = isAfter(day, new Date()) && !isSameDay(day, new Date());
                    
                    return (
                      <tr key={day.toISOString()} className="border-b last:border-0 dark:border-dark-border/50 hover:bg-slate-50 dark:hover:bg-dark-bg/20 transition-colors">
                        <td className="px-8 py-5">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-900 dark:text-white italic">{format(day, 'dd')}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{format(day, 'EEE')}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-sm font-bold text-slate-700 dark:text-slate-300 italic">
                          {record?.checkIn ? format(parseISO(record.checkIn), 'hh:mm a') : isFuture ? '-' : <span className="text-slate-300 dark:text-slate-700">Missed</span>}
                        </td>
                        <td className="px-8 py-5 text-sm font-bold text-slate-700 dark:text-slate-300 italic">
                          {record?.checkOut ? format(parseISO(record.checkOut), 'hh:mm a') : '-'}
                        </td>
                        <td className="px-8 py-5">
                          <span className="px-2 py-1 bg-slate-100 dark:bg-dark-bg rounded-lg text-[10px] font-black text-slate-600 dark:text-dark-text-muted italic">
                            {record?.workHours ? `${record.workHours}h` : '-'}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          {record ? (
                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
                              record.status === 'On-time' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20 shadow-sm' :
                              record.status === 'Late' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20 shadow-sm' :
                              'bg-slate-50 dark:bg-dark-bg text-slate-500 dark:text-dark-text-muted border-slate-200 dark:border-dark-border'
                            }`}>
                              {record.status}
                            </span>
                          ) : isFuture ? (
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Upcoming</span>
                          ) : (
                            <span className="px-2.5 py-1 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest">Absent</span>
                          )}
                        </td>
                        <td className="px-8 py-5">
                          {record?.location ? (
                            <div className="flex items-center space-x-2" title={record.location.address || `${record.location.lat}, ${record.location.lng}`}>
                               <MapPin size={12} className="text-brand-primary" />
                               <span className="text-[10px] text-slate-400 font-bold truncate max-w-[100px]">
                                 {record.location.address || "Captured"}
                               </span>
                            </div>
                          ) : '-'}
                        </td>
                        <td className="px-8 py-5 text-xs text-slate-400 italic">
                          {record?.notes || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'dashboard' && isHR && (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-6 saas-card bg-slate-900 border-none shadow-2xl">
               <div className="flex items-center space-x-4">
                 <div className="p-3 bg-brand-primary/20 rounded-2xl text-brand-primary">
                    <History size={24} />
                 </div>
                 <div>
                   <h3 className="text-xl font-black text-white italic">Workforce Analytics</h3>
                   <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Real-time team performance metrics</p>
                 </div>
               </div>

               <div className="flex items-center space-x-3 bg-white/5 p-2 rounded-2xl border border-white/10">
                 <input 
                   type="date"
                   value={format(dateRange.start, 'yyyy-MM-dd')}
                   onChange={(e) => setDateRange({ ...dateRange, start: new Date(e.target.value) })}
                   className="bg-transparent text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 border-none focus:ring-0 cursor-pointer"
                 />
                 <div className="w-px h-4 bg-white/10" />
                 <input 
                   type="date"
                   value={format(dateRange.end, 'yyyy-MM-dd')}
                   onChange={(e) => setDateRange({ ...dateRange, end: new Date(e.target.value) })}
                   className="bg-transparent text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 border-none focus:ring-0 cursor-pointer"
                 />
               </div>
            </div>

            <TeamAnalytics 
              records={allRecords} 
              dateRange={dateRange} 
              totalEmployees={totalEmployees} 
            />
          </motion.div>
        )}

        {activeTab === 'hr' && (
          <motion.div 
            key="hr"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  placeholder="Search employee..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="saas-input py-3.5 pl-12 font-bold"
                />
              </div>
              <div className="flex items-center space-x-3">
                 <button className="flex items-center space-x-2 px-4 py-3 bg-white dark:bg-dark-bg border border-slate-200 dark:border-dark-border rounded-xl text-sm font-bold text-slate-700 dark:text-white hover:bg-slate-50 transition-all">
                    <Filter size={16} />
                    <span>Filter</span>
                 </button>
                 <button 
                   onClick={handleExport}
                   className="flex items-center space-x-2 px-4 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
                 >
                    <Download size={16} />
                    <span>Export</span>
                 </button>
              </div>
            </div>

            <div className="saas-card p-0 overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead>
                     <tr className="bg-slate-50 dark:bg-dark-bg border-b dark:border-dark-border">
                       <td className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee</td>
                       <td className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</td>
                       <td className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Time</td>
                       <td className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</td>
                       <td className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</td>
                       <td className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Work Hours</td>
                       <td className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</td>
                     </tr>
                   </thead>
                   <tbody>
                     {allRecords
                       .filter(r => r.employeeName.toLowerCase().includes(searchQuery.toLowerCase()))
                       .map(record => (
                       <tr key={record.id} className="border-b last:border-0 dark:border-dark-border/50 hover:bg-slate-50 dark:hover:bg-dark-bg/20 transition-colors">
                         <td className="px-8 py-5">
                            <div className="font-black text-slate-900 dark:text-white text-sm italic">{record.employeeName}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">ID: {record.employeeId.substring(0, 8)}</div>
                         </td>
                         <td className="px-8 py-5 text-sm font-bold text-slate-700 dark:text-slate-300 h-full align-middle">
                            {format(parseISO(record.date), 'MMM dd, yyyy')}
                         </td>
                         <td className="px-8 py-5">
                            <div className="flex flex-col">
                               <span className="text-xs font-bold text-slate-700 dark:text-slate-300 italic">In: {format(parseISO(record.checkIn), 'hh:mm a')}</span>
                               {record.checkOut && <span className="text-xs font-bold text-slate-400 italic">Out: {format(parseISO(record.checkOut), 'hh:mm a')}</span>}
                            </div>
                         </td>
                         <td className="px-8 py-5">
                             <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
                               record.status === 'On-time' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                               record.status === 'Late' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                               'bg-slate-50 text-slate-600 border-slate-100'
                             }`}>
                               {record.status}
                             </span>
                         </td>
                         <td className="px-8 py-5 text-sm font-black text-slate-900 dark:text-white italic">
                            {record.workHours ? `${record.workHours}h` : '--'}
                         </td>
                         <td className="px-8 py-5">
                            <button className="p-2 text-slate-400 hover:text-brand-primary transition-colors">
                               <Info size={18} />
                            </button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'settings' && isAdmin && (
          <motion.div 
            key="settings"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <ShiftSettings company={company} shifts={shifts} onUpdate={fetchData} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TeamAnalytics({ records, dateRange, totalEmployees }: { records: Attendance[], dateRange: { start: Date, end: Date }, totalEmployees: number }) {
  const filtered = records.filter(r => {
    const d = parseISO(r.date);
    return (d >= startOfDay(dateRange.start) && d <= endOfDay(dateRange.end));
  });

  const avgHours = filtered.length > 0
    ? filtered.reduce((acc, r) => acc + (r.workHours || 0), 0) / filtered.length
    : 0;

  const lateCount = filtered.filter(r => r.status === 'Late').length;
  
  // Absence calculation
  const totalDays = differenceInDays(endOfDay(dateRange.end), startOfDay(dateRange.start)) + 1;
  const maxPossibleAttendance = totalEmployees * totalDays;
  const absenceRate = maxPossibleAttendance > 0
    ? Math.max(0, 100 - ((filtered.length / maxPossibleAttendance) * 100))
    : 0;

  // Chart data
  const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
  const chartData = days.map(d => {
    const dayStr = format(d, 'yyyy-MM-dd');
    const dayRecords = records.filter(r => r.date === dayStr);
    return {
      date: format(d, 'MMM dd'),
      present: dayRecords.length,
      absent: totalEmployees - dayRecords.length,
      late: dayRecords.filter(r => r.status === 'Late').length
    };
  });

  const COLORS = ['#3B82F6', '#EF4444', '#F59E0B', '#10B981'];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="saas-card p-8 group hover:scale-[1.02] transition-all bg-indigo-600 text-white">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-2">Avg Daily Hours</p>
          <h3 className="text-4xl font-black italic">{avgHours.toFixed(1)}h</h3>
          <div className="mt-4 flex items-center space-x-2 text-indigo-200">
            <Clock size={14} />
            <span className="text-[10px] font-bold uppercase tracking-tight">Across team</span>
          </div>
        </div>

        <div className="saas-card p-8 group hover:scale-[1.02] transition-all bg-amber-500 text-white shadow-amber-500/10">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-100 mb-2">Late Arrivals</p>
          <h3 className="text-4xl font-black italic">{lateCount}</h3>
          <div className="mt-4 flex items-center space-x-2 text-amber-100">
            <AlertCircle size={14} />
            <span className="text-[10px] font-bold uppercase tracking-tight">Requires review</span>
          </div>
        </div>

        <div className="saas-card p-8 group hover:scale-[1.02] transition-all bg-rose-600 text-white shadow-rose-600/10">
          <p className="text-[10px] font-black uppercase tracking-widest text-rose-100 mb-2">Absence Rate</p>
          <h3 className="text-4xl font-black italic">{absenceRate.toFixed(1)}%</h3>
          <div className="mt-4 flex items-center space-x-2 text-rose-100">
             <div className="w-full bg-rose-400/30 h-1.5 rounded-full overflow-hidden">
               <div className="bg-white h-full" style={{ width: `${absenceRate}%` }} />
             </div>
          </div>
        </div>

        <div className="saas-card p-8 group hover:scale-[1.02] transition-all bg-emerald-600 text-white shadow-emerald-600/10">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100 mb-2">Present Today</p>
          <h3 className="text-4xl font-black italic">
            {records.filter(r => r.date === format(new Date(), 'yyyy-MM-dd')).length} / {totalEmployees}
          </h3>
          <div className="mt-4 flex items-center space-x-2 text-emerald-100">
             <CheckCircle2 size={14} />
             <span className="text-[10px] font-bold uppercase tracking-widest">Active Units</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="saas-card p-8 h-[450px] flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Attendance Trends</h4>
            <div className="flex space-x-4">
               <div className="flex items-center space-x-2">
                 <div className="w-2 h-2 rounded-full bg-blue-500" />
                 <span className="text-[10px] font-bold uppercase text-slate-400 tracking-tight">Present</span>
               </div>
               <div className="flex items-center space-x-2">
                 <div className="w-2 h-2 rounded-full bg-amber-500" />
                 <span className="text-[10px] font-bold uppercase text-slate-400 tracking-tight">Late</span>
               </div>
            </div>
          </div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748B', fontWeight: 700 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748B', fontWeight: 700 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0F172A', 
                    borderRadius: '16px', 
                    border: 'none', 
                    padding: '12px',
                    color: '#fff',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                  }} 
                  itemStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 900, letterSpacing: '0.05em' }}
                  labelStyle={{ display: 'none' }}
                />
                <Area type="monotone" dataKey="present" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorPresent)" />
                <Area type="monotone" dataKey="late" stroke="#F59E0B" strokeWidth={3} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="saas-card p-10 flex flex-col md:flex-row items-center justify-between gap-12 bg-white dark:bg-dark-surface relative overflow-hidden">
           <div className="relative z-10 max-w-xs space-y-6">
              <h4 className="text-2xl font-black text-slate-900 dark:text-white italic tracking-tighter leading-8 uppercase">Deployment Distribution</h4>
              <p className="text-slate-500 font-medium tracking-tight">Segmented breakdown of your workforce status across the selected lifecycle.</p>
              
              <div className="space-y-3 pt-4">
                {[
                  { label: 'Punctual Operations', val: Math.round(((filtered.length - lateCount) / (filtered.length || 1)) * 100), color: 'bg-emerald-500' },
                  { label: 'Logistics Delay', val: Math.round((lateCount / (filtered.length || 1)) * 100), color: 'bg-amber-500' },
                  { label: 'Personnel Absence', val: Math.round(absenceRate), color: 'bg-rose-500' }
                ].map((stat, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <span>{stat.label}</span>
                      <span>{stat.val}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-dark-bg h-1 rounded-full">
                      <div className={`${stat.color} h-full rounded-full transition-all duration-1000`} style={{ width: `${stat.val}%` }} />
                    </div>
                  </div>
                ))}
              </div>
           </div>
           
           <div className="relative z-10 w-full md:w-64 h-64">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={[
                     { name: 'On-time', value: filtered.length - lateCount },
                     { name: 'Late', value: lateCount },
                     { name: 'Absent', value: maxPossibleAttendance - filtered.length }
                   ]}
                   cx="50%"
                   cy="50%"
                   innerRadius={60}
                   outerRadius={80}
                   paddingAngle={10}
                   dataKey="value"
                 >
                   {[
                     { name: 'On-time', value: filtered.length - lateCount },
                     { name: 'Late', value: lateCount },
                     { name: 'Absent', value: maxPossibleAttendance - filtered.length }
                   ].map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Pie>
                 <Tooltip 
                   contentStyle={{ 
                     backgroundColor: '#0F172A', 
                     borderRadius: '16px', 
                     border: 'none', 
                     color: '#fff',
                     boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' 
                   }}
                 />
               </PieChart>
             </ResponsiveContainer>
           </div>
           
           <div className="absolute -top-10 -right-10 w-60 h-60 bg-blue-50 dark:bg-blue-500/5 rounded-full blur-3xl" />
        </div>
      </div>
    </div>
  );
}

function ShiftSettings({ company, shifts, onUpdate }: { company: Company | null, shifts: Shift[], onUpdate: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newShift, setNewShift] = useState<Partial<Shift>>({
    name: '',
    startTime: '09:00',
    endTime: '18:00',
    bufferMinutes: 15,
    type: 'Full-time',
    workDays: [1, 2, 3, 4, 5]
  });

  const handleAddShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    try {
      await attendanceService.createShift({
        companyId: company.id,
        name: newShift.name!,
        startTime: newShift.startTime!,
        endTime: newShift.endTime!,
        bufferMinutes: newShift.bufferMinutes!,
        type: newShift.type as any,
        workDays: newShift.workDays!
      });
      toast.success('Shift created');
      setShowAdd(false);
      onUpdate();
    } catch (error) {
      toast.error('Failed to create shift');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shift?')) return;
    try {
      await attendanceService.deleteShift(id);
      toast.success('Shift deleted');
      onUpdate();
    } catch (error) {
      toast.error('Failed to delete shift');
    }
  };

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic">Shift Configurations</h3>
        <button 
          onClick={() => setShowAdd(true)}
          className="saas-button-primary flex items-center space-x-2 py-2.5 px-6 !w-auto"
        >
          <Plus size={18} />
          <span>New Shift</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {shifts.map(shift => (
          <div key={shift.id} className="saas-card p-8 group relative">
             <button 
               onClick={() => handleDelete(shift.id)}
               className="absolute top-6 right-6 p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
              >
               <Settings size={16} />
             </button>
             
             <div className="flex items-center space-x-4 mb-6">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400">
                  <Clock size={20} />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900 dark:text-white italic">{shift.name}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{shift.type}</p>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Time Range</p>
                  <p className="text-sm font-black text-slate-700 dark:text-slate-200 italic">{shift.startTime} - {shift.endTime}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Buffer Zone</p>
                  <p className="text-sm font-black text-slate-700 dark:text-slate-200 italic">{shift.bufferMinutes} Minutes</p>
                </div>
             </div>

             <div className="flex flex-wrap gap-1.5">
               {days.map((day, d) => (
                 <div key={day} className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest ${
                   shift.workDays.includes(d) 
                     ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20' 
                     : 'bg-slate-50 dark:bg-dark-bg text-slate-300 dark:text-slate-700 border border-slate-100 dark:border-dark-border'
                 }`}>
                   {day}
                 </div>
               ))}
             </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="saas-card p-10 max-w-lg w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setShowAdd(false)}
                className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <ChevronLeft size={24} className="rotate-45" />
              </button>

              <h3 className="text-2xl font-black text-slate-900 dark:text-white italic mb-8 uppercase tracking-widest">Configure Shift</h3>
              
              <form onSubmit={handleAddShift} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Shift Name</label>
                  <input 
                    required
                    value={newShift.name}
                    onChange={e => setNewShift({...newShift, name: e.target.value})}
                    placeholder="General Office Shift"
                    className="saas-input py-4 font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Start Time</label>
                    <input 
                      type="time"
                      required
                      value={newShift.startTime}
                      onChange={e => setNewShift({...newShift, startTime: e.target.value})}
                      className="saas-input py-4 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">End Time</label>
                    <input 
                      type="time"
                      required
                      value={newShift.endTime}
                      onChange={e => setNewShift({...newShift, endTime: e.target.value})}
                      className="saas-input py-4 font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Buffer Zone (Minutes)</label>
                  <input 
                    type="number"
                    required
                    value={newShift.bufferMinutes}
                    onChange={e => setNewShift({...newShift, bufferMinutes: parseInt(e.target.value) || 0})}
                    className="saas-input py-4 font-bold"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowAdd(false)}
                    className="flex-1 px-8 py-4 bg-slate-100 dark:bg-dark-bg text-slate-600 dark:text-white rounded-2xl font-bold hover:bg-slate-200 transition-all uppercase tracking-widest text-[10px]"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 saas-button-primary px-8 py-4 !w-auto"
                  >
                    Forge Shift
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
