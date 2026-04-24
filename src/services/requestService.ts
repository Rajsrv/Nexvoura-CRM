import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp, 
  orderBy,
  updateDoc,
  doc
} from 'firebase/firestore';
import { db } from '../firebase';

export type RequestType = 'LEAVE' | 'SALARY_SLIP' | 'PROFILE_CHANGE' | 'DOCUMENT';

export interface SystemRequest {
  id?: string;
  userId: string;
  userName: string;
  companyId: string;
  type: RequestType;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSING';
  details: {
    reason?: string;
    startDate?: string;
    endDate?: string;
    month?: string; // For salary slips
    fields?: Record<string, any>; // For profile change requests
    documentType?: string;
  };
  createdAt: any;
  updatedAt: any;
}

export const requestService = {
  submitRequest: async (request: Omit<SystemRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
    return await addDoc(collection(db, 'serviceRequests'), {
      ...request,
      status: 'PENDING',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  },

  getUserRequests: (userId: string, callback: (requests: SystemRequest[]) => void) => {
    const q = query(
      collection(db, 'serviceRequests'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SystemRequest));
      callback(requests);
    });
  },

  getCompanyRequests: (companyId: string, callback: (requests: SystemRequest[]) => void) => {
    const q = query(
      collection(db, 'serviceRequests'),
      where('companyId', '==', companyId),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SystemRequest));
      callback(requests);
    });
  },

  updateRequestStatus: async (requestId: string, status: SystemRequest['status']) => {
    const docRef = doc(db, 'serviceRequests', requestId);
    return await updateDoc(docRef, {
      status,
      updatedAt: serverTimestamp()
    });
  }
};
