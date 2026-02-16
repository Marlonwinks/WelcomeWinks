import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { createFirestoreConverter, createFirestoreError } from '../utils/firestore';
import { CHAIN_NAMES } from './prioritization.service';

export interface Notification {
  id: string;
  userId: string;
  type: 'new_business' | 'score_update' | 'achievement' | 'community_activity' | 'system' | 'nearby_rating';
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
  readAt?: Date;
  actionUrl?: string;
  actionLabel?: string;
}

export interface NotificationPreferences {
  newBusinessesNearby: boolean;
  scoreUpdates: boolean;
  communityActivity: boolean;
  achievements: boolean;
  systemUpdates: boolean;
}

export class NotificationService {
  private static instance: NotificationService;
  private permissionStatus: NotificationPermission = 'default';
  private permissionRequested: boolean = false;

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  constructor() {
    this.initializeNotificationPermission();
  }

  /**
   * Initialize notification permission
   */
  private async initializeNotificationPermission() {
    if ('Notification' in window) {
      this.permissionStatus = Notification.permission;
    }
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (this.permissionStatus === 'granted') {
      return true;
    }

    // Prevent multiple permission requests
    if (this.permissionRequested) {
      console.log('Permission already requested, skipping duplicate request');
      return this.permissionStatus === 'granted';
    }

    try {
      this.permissionRequested = true;
      const permission = await Notification.requestPermission();
      this.permissionStatus = permission;
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Check if notifications are supported and permitted
   */
  isNotificationSupported(): boolean {
    return 'Notification' in window && this.permissionStatus === 'granted';
  }

  /**
   * Create a new notification
   */
  async createNotification(
    userId: string,
    type: Notification['type'],
    title: string,
    message: string,
    data?: Record<string, any>,
    actionUrl?: string,
    actionLabel?: string
  ): Promise<string> {
    try {
      // Debug logging
      console.log('🔍 Debug notification service:');
      console.log('User ID:', userId);
      console.log('User ID type:', typeof userId);
      console.log('User ID length:', userId?.length);
      console.log('Is valid cookie ID:', userId?.startsWith('cookie_'));
      console.log('Auth state:', auth.currentUser);

      const notification: Omit<Notification, 'id'> = {
        userId,
        type,
        title,
        message,
        data: data || {},
        read: false,
        createdAt: new Date(),
        actionUrl,
        actionLabel
      };

      console.log('Notification data:', notification);

      // Convert Date to Firestore Timestamp manually
      const firestoreNotification = {
        ...notification,
        createdAt: Timestamp.fromDate(notification.createdAt),
        readAt: notification.readAt ? Timestamp.fromDate(notification.readAt) : null
      };

      console.log('Firestore notification data:', firestoreNotification);

      const docRef = await addDoc(
        collection(db, 'notifications'),
        firestoreNotification
      );

      // Send browser notification if supported and permitted
      if (this.isNotificationSupported()) {
        await this.showBrowserNotification(title, message, actionUrl);
      }

      return docRef.id;
    } catch (error) {
      throw createFirestoreError('createNotification', error, { userId, type, title });
    }
  }

  /**
   * Get notifications for a user (optimized for performance)
   */
  async getUserNotifications(
    userId: string,
    limitCount: number = 20
  ): Promise<Notification[]> {
    try {
      const notificationsRef = collection(db, 'notifications');
      // Optimized query with smaller default limit
      const q = query(
        notificationsRef,
        where('userId', '==', userId),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q.withConverter(createFirestoreConverter<Notification>()));
      const notifications = querySnapshot.docs.map(doc => doc.data());

      // Sort by createdAt in descending order (newest first)
      return notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      // If it's a permission error, return empty array
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        console.warn('Firestore permissions not configured, returning empty notifications');
        return [];
      }
      throw createFirestoreError('getUserNotifications', error, { userId });
    }
  }


  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        read: true,
        readAt: serverTimestamp()
      });
    } catch (error) {
      // If it's a permission error, just log it
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        console.warn('Cannot mark notification as read due to permission error:', notificationId);
        return;
      }
      throw createFirestoreError('markAsRead', error, { notificationId });
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const notifications = await this.getUserNotifications(userId, 1000);
      const unreadNotifications = notifications.filter(n => !n.read);

      // Skip if no unread notifications
      if (unreadNotifications.length === 0) {
        return;
      }

      const batch = writeBatch(db);
      unreadNotifications.forEach(notification => {
        const notificationRef = doc(db, 'notifications', notification.id);
        batch.update(notificationRef, {
          read: true,
          readAt: serverTimestamp()
        });
      });

      await batch.commit();
    } catch (error) {
      // If it's a permission error, just log it
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        console.warn('Cannot mark all notifications as read due to permission error');
        return;
      }
      throw createFirestoreError('markAllAsRead', error, { userId });
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await deleteDoc(notificationRef);
    } catch (error) {
      // If it's a permission error, just log it
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        console.warn('Cannot delete notification due to permission error');
        return;
      }
      throw createFirestoreError('deleteNotification', error, { notificationId });
    }
  }

  /**
   * Delete all notifications for a user
   */
  async deleteAllNotifications(userId: string): Promise<void> {
    try {
      const notifications = await this.getUserNotifications(userId, 1000);

      // Skip if no notifications
      if (notifications.length === 0) {
        return;
      }

      const batch = writeBatch(db);
      notifications.forEach(notification => {
        const notificationRef = doc(db, 'notifications', notification.id);
        batch.delete(notificationRef);
      });

      await batch.commit();
    } catch (error) {
      // If it's a permission error, just log it
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        console.warn('Cannot delete all notifications due to permission error');
        return;
      }
      throw createFirestoreError('deleteAllNotifications', error, { userId });
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const notifications = await this.getUserNotifications(userId, 1000);
      return notifications.filter(n => !n.read).length;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Subscribe to real-time notifications for a user (optimized for performance)
   */
  subscribeToNotifications(
    userId: string,
    callback: (notifications: Notification[]) => void,
    errorCallback?: (error: Error) => void
  ): () => void {
    const notificationsRef = collection(db, 'notifications');
    // Optimized query with smaller limit and no sorting
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      limit(20) // Reduced from 50 to 20 for better performance
    );

    return onSnapshot(
      q.withConverter(createFirestoreConverter<Notification>()),
      (querySnapshot) => {
        const notifications = querySnapshot.docs.map(doc => doc.data());
        // Sort by createdAt in descending order (newest first) - only when needed
        const sortedNotifications = notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        callback(sortedNotifications);
      },
      (error) => {
        console.error('Error in notification subscription:', error);

        // If it's a permission error, return empty array
        if (error.message.includes('Missing or insufficient permissions')) {
          console.warn('Firestore permissions not configured, returning empty notifications');
          callback([]);
        } else if (errorCallback) {
          errorCallback(error);
        }
      }
    );
  }

  /**
   * Show browser notification using Service Worker API
   */
  private async showBrowserNotification(
    title: string,
    message: string,
    actionUrl?: string
  ): Promise<void> {
    if (!this.isNotificationSupported()) return;

    try {
      // Check if service worker is available
      if ('serviceWorker' in navigator && 'Notification' in window) {
        const registration = await navigator.serviceWorker.ready;

        // Use Service Worker API for notifications
        await registration.showNotification(title, {
          body: message,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'welcome-winks-notification',
          requireInteraction: false,
          silent: false,
          data: {
            url: actionUrl || window.location.href
          }
        });
      } else {
        // Fallback to direct Notification API (deprecated but still works)
        const notification = new Notification(title, {
          body: message,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'welcome-winks-notification',
          requireInteraction: false,
          silent: false
        });

        notification.onclick = () => {
          window.focus();
          if (actionUrl) {
            window.location.href = actionUrl;
          }
          notification.close();
        };

        // Auto-close after 5 seconds
        setTimeout(() => {
          notification.close();
        }, 5000);
      }
    } catch (error) {
      console.error('Failed to show browser notification:', error);
      // Fallback to console log
      console.log(`🔔 Notification: ${title} - ${message}`);
    }
  }

  /**
   * Trigger notification for new business nearby
   */
  async notifyNewBusinessNearby(
    userId: string,
    businessName: string,
    businessId: string,
    distance: number
  ): Promise<void> {
    // Filter out large chains
    if (CHAIN_NAMES.some(name => businessName.toLowerCase().includes(name))) {
      console.log(`Skipping new business notification for chain: ${businessName}`);
      return;
    }

    await this.createNotification(
      userId,
      'new_business',
      'New Business Nearby!',
      `${businessName} has been added ${distance.toFixed(1)} miles from you`,
      { businessId, businessName, distance },
      `/business/${businessId}`,
      'View Business'
    );
  }

  /**
   * Trigger notification for score update
   */
  async notifyScoreUpdate(
    userId: string,
    businessName: string,
    businessId: string,
    oldScore: number,
    newScore: number
  ): Promise<void> {
    const scoreChange = newScore - oldScore;
    const changeText = scoreChange > 0 ? 'increased' : 'decreased';

    await this.createNotification(
      userId,
      'score_update',
      'Score Updated!',
      `${businessName}'s Welcome Winks score ${changeText} from ${oldScore.toFixed(1)} to ${newScore.toFixed(1)}`,
      { businessId, businessName, oldScore, newScore },
      `/business/${businessId}`,
      'View Business'
    );
  }

  /**
   * Trigger notification for achievement
   */
  async notifyAchievement(
    userId: string,
    achievementName: string,
    description: string
  ): Promise<void> {
    await this.createNotification(
      userId,
      'achievement',
      'Achievement Unlocked!',
      `You earned the "${achievementName}" achievement: ${description}`,
      { achievementName, description },
      '/profile',
      'View Profile'
    );
  }

  /**
   * Trigger notification for community activity
   */
  async notifyCommunityActivity(
    userId: string,
    activityType: string,
    message: string,
    actionUrl?: string
  ): Promise<void> {
    await this.createNotification(
      userId,
      'community_activity',
      'Community Activity',
      message,
      { activityType },
      actionUrl,
      'View Activity'
    );
  }

  /**
   * Trigger system notification
   */
  async notifySystemUpdate(
    userId: string,
    title: string,
    message: string,
    actionUrl?: string
  ): Promise<void> {
    await this.createNotification(
      userId,
      'system',
      title,
      message,
      {},
      actionUrl,
      'Learn More'
    );
  }

  /**
   * Trigger notification for nearby rating activity
   */
  async notifyNearbyRating(
    userId: string,
    businessName: string,
    businessId: string,
    ratingScore: number,
    distance: number
  ): Promise<void> {
    // Filter out large chains
    if (CHAIN_NAMES.some(name => businessName.toLowerCase().includes(name))) {
      console.log(`Skipping rating notification for chain: ${businessName}`);
      return;
    }

    const welcomingLevel = this.getWelcomingLevelFromScore(ratingScore);

    await this.createNotification(
      userId,
      'nearby_rating',
      'New Rating Nearby!',
      `Someone just rated ${businessName} as ${welcomingLevel} (${ratingScore.toFixed(1)}/5.0) - ${distance.toFixed(1)} miles away`,
      { businessId, businessName, ratingScore, distance, welcomingLevel },
      `/business/${businessId}`,
      'View Business'
    );
  }

  /**
   * Helper method to get welcoming level from score
   */
  private getWelcomingLevelFromScore(score: number): string {
    const maxScore = 5.0;
    const highThreshold = maxScore * 0.7; // 3.57
    const lowThreshold = maxScore * 0.3;  // 1.53

    if (score >= highThreshold) return 'Very Welcoming';
    if (score >= lowThreshold) return 'Moderately Welcoming';
    return 'Not Very Welcoming';
  }
}

export const notificationService = NotificationService.getInstance();
