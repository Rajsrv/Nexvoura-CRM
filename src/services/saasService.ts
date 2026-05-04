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
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { 
  Company, 
  SaasPlan, 
  Subscription, 
  SaasPayment, 
  DiscountCode,
  UserProfile,
  SystemSettings
} from '../types';

export const saasService = {
  // Company Management
  async getAllCompanies(): Promise<Company[]> {
    try {
      const q = query(collection(db, 'companies'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'companies');
      return []; // unreachable but keeps TS happy
    }
  },

  async updateCompany(companyId: string, data: Partial<Company>) {
    try {
      const ref = doc(db, 'companies', companyId);
      await updateDoc(ref, { 
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `companies/${companyId}`);
    }
  },

  // Plan Management
  async getPlans(): Promise<SaasPlan[]> {
    try {
      const q = query(collection(db, 'plans'), orderBy('price', 'asc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SaasPlan));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'plans');
      return [];
    }
  },

  async createPlan(plan: Omit<SaasPlan, 'id'>) {
    try {
      return await addDoc(collection(db, 'plans'), {
        ...plan,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'plans');
    }
  },

  async updatePlan(planId: string, data: Partial<SaasPlan>) {
    try {
      const ref = doc(db, 'plans', planId);
      await updateDoc(ref, data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `plans/${planId}`);
    }
  },

  // Subscriptions
  async getAllSubscriptions(): Promise<Subscription[]> {
    try {
      const snapshot = await getDocs(collection(db, 'subscriptions'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subscription));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'subscriptions');
      return [];
    }
  },

  async getCompanySubscription(companyId: string): Promise<Subscription | null> {
    try {
      const q = query(collection(db, 'subscriptions'), where('companyId', '==', companyId));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Subscription;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `subscriptions/company/${companyId}`);
      return null;
    }
  },

  // Payments
  async getAllPayments(): Promise<SaasPayment[]> {
    try {
      const q = query(collection(db, 'saas_payments'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SaasPayment));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'saas_payments');
      return [];
    }
  },

  async getCompanyPayments(companyId: string): Promise<SaasPayment[]> {
    try {
      const q = query(
        collection(db, 'saas_payments'), 
        where('companyId', '==', companyId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SaasPayment));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `saas_payments/company/${companyId}`);
      return [];
    }
  },

  async updateSubscription(subscriptionId: string, data: Partial<Subscription>) {
    try {
      const ref = doc(db, 'subscriptions', subscriptionId);
      await setDoc(ref, {
        ...data,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `subscriptions/${subscriptionId}`);
    }
  },

  async extendTrial(companyId: string, days: number) {
    try {
      const ref = doc(db, 'companies', companyId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const currentEnds = snap.data().trialEndsAt ? new Date(snap.data().trialEndsAt).getTime() : Date.now();
        const newEnds = new Date(currentEnds + days * 24 * 60 * 60 * 1000).toISOString();
        await updateDoc(ref, { trialEndsAt: newEnds });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `companies/${companyId}/trial`);
    }
  },

  async createPayment(payment: Omit<SaasPayment, 'id'>) {
    try {
      return await addDoc(collection(db, 'saas_payments'), {
        ...payment,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'saas_payments');
    }
  },

  async recordDiscountRedemption(discountId: string) {
    try {
      const ref = doc(db, 'discounts', discountId);
      const discount = await getDoc(ref);
      if (discount.exists()) {
        const data = discount.data();
        await updateDoc(ref, {
          redemptionCount: (data.redemptionCount || 0) + 1
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `discounts/${discountId}`);
    }
  },

  // Discounts
  async getDiscounts(): Promise<DiscountCode[]> {
    try {
      const snapshot = await getDocs(collection(db, 'discounts'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DiscountCode));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'discounts');
      return [];
    }
  },

  async createDiscount(discount: Omit<DiscountCode, 'id'>) {
    try {
      return await addDoc(collection(db, 'discounts'), discount);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'discounts');
    }
  },

  async updateDiscount(discountId: string, data: Partial<DiscountCode>) {
    try {
      const ref = doc(db, 'discounts', discountId);
      await updateDoc(ref, data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `discounts/${discountId}`);
    }
  },

  async deleteDiscount(discountId: string) {
    try {
      const ref = doc(db, 'discounts', discountId);
      await deleteDoc(ref);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `discounts/${discountId}`);
    }
  },

  // Super Admin Management
  async getSuperAdmins(): Promise<UserProfile[]> {
    try {
      const q = query(collection(db, 'users'), where('isSuperAdmin', '==', true));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users/superadmins');
      return [];
    }
  },

  async setSuperAdminStatus(userId: string, status: boolean) {
    try {
      const ref = doc(db, 'users', userId);
      await updateDoc(ref, { isSuperAdmin: status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}/superadmin`);
    }
  },
  
  async deleteUser(userId: string) {
    try {
      const ref = doc(db, 'users', userId);
      await deleteDoc(ref);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
    }
  },

  async getCompanyUsers(companyId: string): Promise<UserProfile[]> {
    try {
      const q = query(collection(db, 'users'), where('companyId', '==', companyId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `users/company/${companyId}`);
      return [];
    }
  },

  async getAllUsers(): Promise<UserProfile[]> {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
      return [];
    }
  },

  // System Settings
  async getSystemSettings(): Promise<SystemSettings | null> {
    try {
      const ref = doc(db, 'system', 'settings');
      const snapshot = await getDoc(ref);
      if (!snapshot.exists()) return null;
      return { id: snapshot.id, ...snapshot.data() } as SystemSettings;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'system/settings');
      return null;
    }
  },

  async updateSystemSettings(data: any) {
    try {
      const ref = doc(db, 'system', 'settings');
      await setDoc(ref, {
        ...data,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'system/settings');
    }
  }
};
