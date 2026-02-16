import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { notificationService, Notification as ServiceNotification, NotificationPreferences } from '@/services/notification.service';
import { placesService } from '@/services/places.service';
import { useAuth } from './AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from './LocationProvider';
import { usePreferences } from './PreferencesProvider';

interface NotificationContextType {
  notifications: ServiceNotification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  requestPermission: () => Promise<boolean>;
  isNotificationSupported: boolean;
  preferences: NotificationPreferences | null;
  updatePreferences: (preferences: Partial<NotificationPreferences>) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const DEFAULT_PREFERENCES: NotificationPreferences = {
  newBusinessesNearby: true,
  scoreUpdates: true,
  communityActivity: false,
  achievements: true,
  systemUpdates: true
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<ServiceNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

  // Load notifications and set up subscription when user profile changes
  useEffect(() => {
    if (!userProfile?.userId) {
      setNotifications([]);
      setUnreadCount(0);
      setPreferences(null);
      return;
    }

    // Load initial notifications
    loadNotifications();
    loadPreferences();

    // Set up real-time subscription with debouncing
    let timeoutId: NodeJS.Timeout;
    const unsubscribe = notificationService.subscribeToNotifications(
      userProfile.userId,
      (newNotifications) => {
        // Debounce updates to prevent excessive re-renders
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          setNotifications(newNotifications);
          setUnreadCount(newNotifications.filter(n => !n.read).length);
        }, 100);
      },
      (error) => {
        console.error('Notification subscription error:', error);
        if (error.message.includes('Missing or insufficient permissions')) {
          setError('Notification permissions not configured. Please contact support.');
        }
      }
    );

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [userProfile?.userId]);

  const loadNotifications = async () => {
    if (!userProfile?.userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const userNotifications = await notificationService.getUserNotifications(userProfile.userId);
      setNotifications(userNotifications);
      setUnreadCount(userNotifications.filter(n => !n.read).length);
    } catch (err) {
      console.error('Failed to load notifications:', err);

      // Check if it's a permission error
      if (err instanceof Error && err.message.includes('Missing or insufficient permissions')) {
        setError('Notification permissions not configured. Please contact support to enable notifications.');
        // Set empty notifications
        setNotifications([]);
        setUnreadCount(0);
      } else {
        setError('Failed to load notifications');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadPreferences = async () => {
    if (!userProfile?.userId) {
      setPreferences(DEFAULT_PREFERENCES);
      return;
    }

    try {
      // For now, use default preferences
      // In a real app, you'd load from user profile or separate preferences service
      setPreferences(DEFAULT_PREFERENCES);
    } catch (err) {
      console.error('Failed to load notification preferences:', err);
      setPreferences(DEFAULT_PREFERENCES);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);

      // Update local state
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, read: true, readAt: new Date() } : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive"
      });
    }
  };

  const markAllAsRead = async () => {
    if (!userProfile?.userId) return;

    try {
      await notificationService.markAllAsRead(userProfile.userId);

      // Update local state
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true, readAt: new Date() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive"
      });
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!userProfile?.userId) return;

    try {
      await notificationService.deleteNotification(notificationId);

      // Update local state
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      setUnreadCount(prev => Math.max(0, prev - 1));

      toast({
        title: "Notification Deleted",
        description: "The notification has been deleted",
      });
    } catch (err) {
      console.error('Failed to delete notification:', err);
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive"
      });
    }
  };

  const deleteAllNotifications = async () => {
    if (!userProfile?.userId) return;

    try {
      await notificationService.deleteAllNotifications(userProfile.userId);

      // Update local state
      setNotifications([]);
      setUnreadCount(0);

      toast({
        title: "All Notifications Deleted",
        description: "All notifications have been deleted",
      });
    } catch (err) {
      console.error('Failed to delete all notifications:', err);
      toast({
        title: "Error",
        description: "Failed to delete all notifications",
        variant: "destructive"
      });
    }
  };

  const refreshNotifications = async () => {
    await loadNotifications();
  };

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const granted = await notificationService.requestPermission();
      if (granted) {
        toast({
          title: "Notifications Enabled",
          description: "You'll now receive notifications about new businesses and updates",
        });
      } else {
        toast({
          title: "Notifications Disabled",
          description: "You can enable notifications in your browser settings",
          variant: "destructive"
        });
      }
      return granted;
    } catch (err) {
      console.error('Failed to request notification permission:', err);
      toast({
        title: "Error",
        description: "Failed to request notification permission",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  // Background notification logic
  const { location } = useLocation();
  const { preferences: userPreferences } = usePreferences();
  const isNotificationAvailable = typeof window !== 'undefined' && 'Notification' in window;

  // Helper: Haversine distance in km
  const getDistanceFromHome = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  };

  useEffect(() => {
    if (!isNotificationAvailable) {
      return;
    }

    const browserNotification = window.Notification;

    // Request permission immediately on mount
    if (browserNotification.permission === 'default') {
      browserNotification.requestPermission();
    }

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        const lastNotif = localStorage.getItem('last_smart_notification');
        const now = Date.now();
        // 3 hours throttle (3 * 60 * 60 * 1000 = 10800000)
        if (lastNotif && now - parseInt(lastNotif) < 10800000) {
          console.log('⏳ Notification throttled. Last sent less than 3 hours ago.');
          return;
        }

        console.log('👀 App backgrounded, analyzing context for notification...');

        // Wait a moment to ensure user has really left/switched
        setTimeout(async () => {
          if (browserNotification.permission === 'granted' && location?.latitude && location?.longitude) {

            // Check if user is away from home (if home address is set)
            // We use homeCoordinates from userPreferences.location
            let isAway = true;

            if (userPreferences?.location?.homeCoordinates) {
              const dist = getDistanceFromHome(
                location.latitude,
                location.longitude,
                userPreferences.location.homeCoordinates.latitude,
                userPreferences.location.homeCoordinates.longitude
              );
              // If less than 0.8km (0.5 miles), assume at home
              if (dist < 0.8) {
                console.log('🏠 User is at home, skipping notification.');
                isAway = false;
              }
            }

            if (!isAway) return;

            // Fetch actual nearby places
            try {
              const results = await placesService.searchNearbyPlaces({
                latitude: location.latitude,
                longitude: location.longitude,
                radius: 1000, // 1km walking distance
                types: ['restaurant', 'cafe', 'bar']
              });

              if (results.places && results.places.length > 0) {
                // Pick a random place from top 5
                const topPlaces = results.places.slice(0, 5);
                const place = topPlaces[Math.floor(Math.random() * topPlaces.length)];

                // Check preferences to customize message
                const position = (userProfile as any)?.politicalPosition?.toLowerCase() || 'moderate';
                const isConservative = position.includes('conservative') || position.includes('republican');
                const isLiberal = position.includes('liberal') || position.includes('democrat');
                const welcomeScore = isConservative ? 'Highly Welcoming' : (isLiberal ? 'Very Inclusive' : 'Welcoming');

                // Create a notification
                const notif = new browserNotification(`Review: ${place.name}`, {
                  body: `We found a ${welcomeScore} place nearby! Tap to check it out.`,
                  icon: '/favicon.ico',
                  tag: 'nearby-recommendation'
                });

                notif.onclick = () => {
                  window.focus();
                  window.location.href = `/business/${place.place_id}`;
                };

                // Update timestamp
                localStorage.setItem('last_smart_notification', now.toString());
              }
            } catch (err) {
              console.error('Failed to find nearby places for notification:', err);
            }
          }
        }, 5000); // 5 seconds after close/switch
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isNotificationAvailable, location, userPreferences]);

  const updatePreferences = async (newPreferences: Partial<NotificationPreferences>) => {
    if (!preferences) return;

    try {
      const updatedPreferences = { ...preferences, ...newPreferences };
      setPreferences(updatedPreferences);

      toast({
        title: "Preferences Updated",
        description: "Your notification preferences have been saved",
      });
    } catch (err) {
      console.error('Failed to update notification preferences:', err);
      toast({
        title: "Error",
        description: "Failed to update notification preferences",
        variant: "destructive"
      });
    }
  };

  const isNotificationSupported = notificationService.isNotificationSupported();

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    refreshNotifications,
    requestPermission,
    isNotificationSupported,
    preferences,
    updatePreferences
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
