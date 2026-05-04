import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  setDoc,
  serverTimestamp,
  orderBy,
  Timestamp,
  limit
} from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { 
  Attendance, 
  Shift,
  UserProfile
} from '../types';
import { format, parse, isAfter, addMinutes, differenceInHours } from 'date-fns';

export const attendanceService = {
  // Shift Management
  async getShifts(companyId: string): Promise<Shift[]> {
    try {
      const q = query(collection(db, 'shifts'), where('companyId', '==', companyId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shift));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'shifts');
      return [];
    }
  },

  async createShift(shift: Omit<Shift, 'id' | 'createdAt'>) {
    try {
      return await addDoc(collection(db, 'shifts'), {
        ...shift,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'shifts');
    }
  },

  async updateShift(shiftId: string, data: Partial<Shift>) {
    try {
      const ref = doc(db, 'shifts', shiftId);
      await updateDoc(ref, data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `shifts/${shiftId}`);
    }
  },

  async deleteShift(shiftId: string) {
    try {
      await deleteDoc(doc(db, 'shifts', shiftId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `shifts/${shiftId}`);
    }
  },

  // Attendance Logic
  async getTodayAttendance(employeeId: string, companyId: string): Promise<Attendance | null> {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const q = query(
        collection(db, 'attendance'),
        where('employeeId', '==', employeeId),
        where('companyId', '==', companyId),
        where('date', '==', today),
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Attendance;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `attendance/today/${employeeId}`);
      return null;
    }
  },

  async clockIn(user: UserProfile, shift: Shift, location?: { lat: number, lng: number, address?: string }) {
    try {
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      
      // Calculate status
      const shiftStart = parse(shift.startTime, 'HH:mm', now);
      const gracePeriod = addMinutes(shiftStart, shift.bufferMinutes || 0);
      const status = isAfter(now, gracePeriod) ? 'Late' : 'On-time';

      const attendance: Omit<Attendance, 'id'> = {
        companyId: user.companyId,
        employeeId: user.uid,
        employeeName: user.name,
        date: today,
        checkIn: now.toISOString(),
        status,
        shiftId: shift.id,
        location,
        notes: ''
      };

      return await addDoc(collection(db, 'attendance'), attendance);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'attendance/clock-in');
    }
  },

  async clockOut(attendanceId: string, location?: { lat: number, lng: number, address?: string }) {
    try {
      const now = new Date();
      const ref = doc(db, 'attendance', attendanceId);
      const snap = await getDoc(ref);
      
      if (!snap.exists()) throw new Error('Attendance record not found');
      
      const data = snap.data() as Attendance;
      const checkInDate = new Date(data.checkIn);
      const workHours = differenceInHours(now, checkInDate);

      await updateDoc(ref, {
        checkOut: now.toISOString(),
        workHours,
        location: location || data.location
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `attendance/clock-out/${attendanceId}`);
    }
  },

  async getAttendanceRecords(companyId: string, employeeId?: string, month?: string, year?: string): Promise<Attendance[]> {
    try {
      let q = query(collection(db, 'attendance'), where('companyId', '==', companyId));
      
      if (employeeId) {
        q = query(q, where('employeeId', '==', employeeId));
      }

      // Note: For complex filtering (month/year), we might need an index or client-side filtering.
      // Firestore doesn't support 'contains' or regex for dates easily.
      // We will fetch all and filter client side for better UX if the dataset isn't huge.
      const snapshot = await getDocs(q);
      let records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance));

      if (month && year) {
        records = records.filter(r => r.date.startsWith(`${year}-${month}`));
      } else if (year) {
        records = records.filter(r => r.date.startsWith(year));
      }

      return records.sort((a, b) => b.date.localeCompare(a.date));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'attendance/history');
      return [];
    }
  }
};
