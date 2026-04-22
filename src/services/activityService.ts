import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ActivityLog, UserProfile } from '../types';

export const logActivity = async (
  user: UserProfile,
  action: ActivityLog['action'],
  details: string,
  targetId?: string,
  targetName?: string,
  metadata?: Record<string, any>
) => {
  try {
    const logData: any = {
      companyId: user.companyId,
      actorId: user.uid,
      actorName: user.name,
      action,
      details,
      createdAt: new Date().toISOString()
    };

    if (targetId) logData.targetId = targetId;
    if (targetName) logData.targetName = targetName;
    if (metadata) logData.metadata = metadata;

    await addDoc(collection(db, 'activityLogs'), logData);
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};
