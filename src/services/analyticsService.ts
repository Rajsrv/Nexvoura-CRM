import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';

export enum EventCategory {
  NAVIGATION = 'navigation',
  INTERACTION = 'interaction',
  FORM = 'form',
  SYSTEM = 'system',
}

export interface TrackEventParams {
  userId: string;
  companyId?: string;
  eventName: string;
  category: EventCategory;
  metadata?: Record<string, any>;
  path?: string;
}

class AnalyticsService {
  private static instance: AnalyticsService;

  private constructor() {}

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  public async trackEvent(params: TrackEventParams) {
    const { userId, companyId, eventName, category, metadata, path } = params;

    // Log to console for development visibility
    console.debug(`[Analytics] ${category}:${eventName}`, { userId, path, ...metadata });

    try {
      await addDoc(collection(db, 'analyticsEvents'), {
        userId,
        companyId: companyId || 'guest',
        eventName,
        category,
        metadata: metadata || {},
        path: path || window.location.pathname,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'analyticsEvents');
    }
  }

  // Helper for tracking clicks
  public trackClick(userId: string, companyId: string | undefined, label: string, metadata?: Record<string, any>) {
    this.trackEvent({
      userId,
      companyId,
      eventName: `click_${label.toLowerCase().replace(/\s+/g, '_')}`,
      category: EventCategory.INTERACTION,
      metadata,
    });
  }

  // Helper for tracking form submissions
  public trackFormSubmit(userId: string, companyId: string | undefined, formId: string, metadata?: Record<string, any>) {
    this.trackEvent({
      userId,
      companyId,
      eventName: `submit_${formId.toLowerCase().replace(/\s+/g, '_')}`,
      category: EventCategory.FORM,
      metadata,
    });
  }
}

export const analyticsService = AnalyticsService.getInstance();
