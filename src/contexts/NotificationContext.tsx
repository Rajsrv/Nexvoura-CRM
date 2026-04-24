import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, orderBy, limit, writeBatch, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { AppNotification, NotificationType } from '../types';
import { useAuth } from '../App';
import { toast } from 'sonner';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  sendNotification: (params: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    metadata?: Record<string, any>;
  }) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotification: (notificationId: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('companyId', '==', user.companyId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
      setNotifications(docs);
      setLoading(false);
    }, (error) => {
      console.error("Notification snapshot error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const sendNotification = async (params: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    metadata?: Record<string, any>;
  }) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'notifications'), {
        ...params,
        companyId: user.companyId,
        read: false,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        where('read', '==', false)
      );
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach(d => {
        batch.update(d.ref, { read: true });
      });
      await batch.commit();
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const clearNotification = async (notificationId: string) => {
    // We could either delete or just hide from UI
    // Here we'll just not implement delete for now, but mark as read is often enough
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      loading, 
      sendNotification, 
      markAsRead, 
      markAllAsRead,
      clearNotification
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
