import { db } from '../firebase';
import { collection, addDoc, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { AppNotification } from '../types';

export const sendNotification = async (
  companyId: string,
  userId: string,
  title: string,
  message: string,
  type: AppNotification['type'],
  link?: string
) => {
  try {
    const notificationData: Omit<AppNotification, 'id'> = {
      companyId,
      userId,
      title,
      message,
      type,
      read: false,
      link,
      createdAt: new Date().toISOString()
    };

    await addDoc(collection(db, 'notifications'), notificationData);
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
};

export const markAsRead = async (notificationId: string) => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, { read: true });
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
  }
};

export const markAllAsRead = async (notifications: AppNotification[]) => {
  try {
    const batch = writeBatch(db);
    let count = 0;
    notifications.forEach(n => {
      if (!n.read) {
        const ref = doc(db, 'notifications', n.id);
        batch.update(ref, { read: true });
        count++;
      }
    });
    if (count > 0) {
      await batch.commit();
    }
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
  }
};
