import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, API_ENDPOINTS } from '../config/api';
import socketService from '../services/socketService';
import messaging from '@react-native-firebase/messaging';
import { updateDeviceToken } from '../services/notificationService';
import { dedupeNotifications } from '../utils/notificationDedup';

interface Notification {
  id: string;
  type: string;
  account_type: string;
  account_id: string;
  booking_id?: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  created_at: string;
  updated_at?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  fetchNotifications: (silent?: boolean) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => void;
  initializeForUser: () => void;
  disconnectUser: () => void;
  dismissPendingReminder: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchInProgressRef = useRef(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bookingSyncHandlerRef = useRef<(() => void) | null>(null);
  const PENDING_REMINDER_HOURS = 2;

  // Calculate unread count for the header badge.
  // Exclude auto-generated pending reminders so the badge only appears for actual unread notifications.
  const unreadCount = notifications.filter(n => !n.read && n.type !== 'pending_reminder').length;

  const handleNewNotification = useCallback((newNotification: any) => {
    const transformedNotification: Notification = {
      id: String(newNotification.notification_id),
      type: determineNotificationType(newNotification.title, newNotification.message),
      title: newNotification.title || 'New Notification',
      message: newNotification.message || 'You have a new notification',
      time: formatTime(newNotification.created_at || new Date().toISOString()),
      read: false,
      booking_id: newNotification.booking_id,
      account_type: newNotification.account_type,
      account_id: newNotification.account_id,
      created_at: newNotification.created_at || new Date().toISOString()
    };

    setNotifications(prev => {
      const candidateList = [transformedNotification, ...prev];
      const deduped = dedupeNotifications(candidateList);

      const existingIndex = prev.findIndex(notif => notif.id === transformedNotification.id);
      if (existingIndex !== -1) {
        const updatedNotifications = [...prev];
        updatedNotifications[existingIndex] = transformedNotification;
        const finalList = dedupeNotifications(updatedNotifications);
        return finalList;
      }

      return deduped;
    });
  }, []);

  const fetchNotifications = useCallback(async (silent = false) => {
    if (fetchInProgressRef.current) {
      return;
    }

    try {
      fetchInProgressRef.current = true;
      if (!silent) {
        setLoading(true);
      }
      setError(null);

      // Get admin/shop info from AsyncStorage
      const userDataStr = await AsyncStorage.getItem('userData');
      if (!userDataStr) {
        // User is not logged in - this is normal, just set empty state
        setNotifications([]);
        if (!silent) {
          setLoading(false);
        }
        return;
      }

      const userData = JSON.parse(userDataStr);
      const adminId = userData.admin_id || userData.adminId;
      const shopId = userData.shop_id || userData.shopId;

      if (!adminId) {
        // User data exists but no admin ID - this could be a data integrity issue
        console.warn('User data found but no admin ID - user may need to re-login');
        setNotifications([]);
        if (!silent) {
          setLoading(false);
        }
        return;
      }

      // Fetch regular notifications for this admin
      const notificationsResponse = await api.get(API_ENDPOINTS.NOTIFICATIONS.LIST, {
        params: {
          accountId: adminId,
          accountType: 'admin',
          ...(shopId ? { shopId: String(shopId) } : {})
        }
      });

      // Fetch pending services/bookings for pending services reminder
      let pendingBookings: any[] = [];
      if (shopId) {
        try {
          const bookingsResponse = await api.get(`${API_ENDPOINTS.BOOKINGS.BASE}?shop_id=${shopId}&status=pending`);
          const bookings = Array.isArray(bookingsResponse.data) ? bookingsResponse.data : [];
          pendingBookings = bookings.filter(booking =>
            String(booking.booking_status || booking.status || '').toLowerCase() === 'pending'
          );
        } catch (bookingErr) {
          console.warn('Could not fetch pending bookings:', bookingErr);
        }
      }

      let allNotifications: Notification[] = [];

      // Add a reminder only when at least one pending booking is two hours old.
      if (pendingBookings.length > 0) {
        const oldPendingBookings = pendingBookings.filter(booking => {
          const createdAt = new Date(booking.created_at).getTime();
          if (!Number.isFinite(createdAt)) {
            return false;
          }

          const hoursSinceCreation = (Date.now() - createdAt) / (1000 * 60 * 60);
          return hoursSinceCreation >= PENDING_REMINDER_HOURS;
        });

        if (oldPendingBookings.length > 0) {
          // Check if reminder was recently dismissed (within last 2 hours)
          const lastDismissed = await AsyncStorage.getItem('pendingReminderDismissed');
          const shouldShowReminder = !lastDismissed || 
            (Date.now() - parseInt(lastDismissed)) > (2 * 60 * 60 * 1000); // 2 hours

          if (shouldShowReminder) {
            const pendingReminder: Notification = {
              id: 'pending-services-reminder',
              type: 'pending_reminder',
              title: 'Pending Services Reminder',
              message: `You have ${oldPendingBookings.length} pending service(s) that have been waiting for at least ${PENDING_REMINDER_HOURS} hours. Please review and update the status of these orders.`,
              time: 'Now',
              read: false,
              account_type: 'admin',
              account_id: adminId,
              created_at: new Date().toISOString(),
              booking_id: oldPendingBookings[0]?.booking_id?.toString() // Use first old pending booking for navigation
            };
            allNotifications.push(pendingReminder);
          }
        }
      }

      // Transform regular notifications
      if (notificationsResponse.data) {
        const transformedNotifications = notificationsResponse.data.map((notif: any, index: number) => ({
          id: notif.notification_id ? String(notif.notification_id) : `temp-${index}-${Date.now()}`,
          type: determineNotificationType(notif.title, notif.message),
          title: notif.title || 'Notification',
          message: notif.message || 'No message available',
          time: formatTime(notif.created_at),
          read: notif.is_read === 1 || notif.is_read === true,
          booking_id: notif.booking_id,
          account_type: notif.account_type,
          account_id: notif.account_id,
          created_at: notif.created_at
        }));

        allNotifications = [...allNotifications, ...transformedNotifications];
      }

      const uniqueNotifications = dedupeNotifications(allNotifications);

      // The database response is authoritative. Do not retain socket-only or
      // locally cached records that are no longer returned by the API.
      setNotifications(uniqueNotifications);
    } catch (err: any) {
      // Only set error for actual errors, not missing user data
      if (err.message === 'User data not found' || err.message === 'Admin ID not found') {
        // These are expected when user is not logged in - don't show as errors
        setNotifications([]);
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to fetch notifications');
      }
    } finally {
      fetchInProgressRef.current = false;
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  const ensureNotificationSocket = useCallback(async () => {
    try {
      const userDataStr = await AsyncStorage.getItem('userData');
      if (!userDataStr) {
        return;
      }

      const userData = JSON.parse(userDataStr);
      const adminId = userData.admin_id || userData.adminId;

      if (!adminId) {
        return;
      }

      if (!socketService.isConnected()) {
        socketService.connect(adminId, 'admin');
      }

      const syncNotifications = () => {
        void fetchNotifications(true);
      };

      if (bookingSyncHandlerRef.current) {
        socketService.offBookingUpdated(bookingSyncHandlerRef.current as any);
        socketService.offBookingDeleted(bookingSyncHandlerRef.current as any);
      }
      socketService.onNewNotification(handleNewNotification);

      // Don't sync on bookingCreated since we already get it via newNotification event
      socketService.onBookingUpdated(syncNotifications);
      socketService.onBookingDeleted(syncNotifications);
      bookingSyncHandlerRef.current = syncNotifications;
    } catch (error) {
      console.error('❌ Failed to attach notification socket:', error);
    }
  }, [fetchNotifications, handleNewNotification]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      // Optimistic update - update UI immediately for better UX
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );

      // Then update the database
      await api.put(API_ENDPOINTS.NOTIFICATIONS.READ(notificationId));
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      
      // Revert optimistic update on failure
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, read: false } : notif
        )
      );
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const userDataStr = await AsyncStorage.getItem('userData');
      if (!userDataStr) {
        console.warn('Cannot mark notifications as read - user not logged in');
        return;
      }

      const userData = JSON.parse(userDataStr);
      const adminId = userData.admin_id || userData.adminId;

      if (!adminId) {
        console.warn('Cannot mark notifications as read - admin ID not found');
        return;
      }

      // Optimistic update - mark all as read immediately
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );

      // Then update the database
      await api.put(API_ENDPOINTS.NOTIFICATIONS.READ_ALL, {
        accountId: adminId,
        accountType: 'admin'
      });
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
      // Revert optimistic update on failure
      fetchNotifications();
    }
  }, [fetchNotifications]);

  const dismissPendingReminder = useCallback(async () => {
    try {
      // Store dismissal timestamp
      await AsyncStorage.setItem('pendingReminderDismissed', Date.now().toString());

      // Remove the pending reminder from notifications
      setNotifications(prev =>
        prev.filter(notif => notif.id !== 'pending-services-reminder')
      );
    } catch (error) {
      console.error('❌ Error dismissing pending reminder:', error);
    }
  }, []);

  const refreshNotifications = useCallback(() => {
    fetchNotifications(true);
  }, [fetchNotifications]);

  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      return;
    }

    pollIntervalRef.current = setInterval(() => {
      void fetchNotifications(true);
    }, 15000);
  }, [fetchNotifications]);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Method to be called after successful login to refresh notifications
  const initializeForUser = useCallback(async () => {
    try {
      // Just refresh notifications - socket should already be connected
      await ensureNotificationSocket();
      fetchNotifications();
      startPolling();

      // Also ensure FCM token is registered for this admin and subscribe for refresh
      const userDataStr = await AsyncStorage.getItem('userData');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        const adminId = userData.admin_id || userData.adminId;
        const shopId = userData.shop_id || userData.shopId || null;
        if (adminId) {
          try {
            const token = await messaging().getToken();
            await AsyncStorage.setItem('fcmToken', token);
            await updateDeviceToken({ accountId: adminId, accountType: 'admin', token, shopId });
          } catch (e) {
            console.warn('[STAFF FCM] Failed to get/register token', e);
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to initialize notifications after login:', error);
    }
  }, [ensureNotificationSocket, fetchNotifications, startPolling]);

  // Handle real-time notification updates
  useEffect(() => {
    void ensureNotificationSocket();

    startPolling();

    // Cleanup listeners on unmount
    return () => {
      socketService.offNewNotification(handleNewNotification);
      if (bookingSyncHandlerRef.current) {
        socketService.offBookingUpdated(bookingSyncHandlerRef.current as any);
        socketService.offBookingDeleted(bookingSyncHandlerRef.current as any);
        bookingSyncHandlerRef.current = null;
      }
      stopPolling();
    };
  }, [ensureNotificationSocket, handleNewNotification, startPolling, stopPolling]);

  // Initial fetch - only if user data is available
  useEffect(() => {
    const checkAndFetchNotifications = async () => {
      const userDataStr = await AsyncStorage.getItem('userData');
      if (userDataStr) {
        // User is logged in, fetch notifications
        fetchNotifications();
        startPolling();
      } else {
        // User not logged in, just stop loading
        setLoading(false);
      }
    };
    
    checkAndFetchNotifications();
  }, [fetchNotifications, startPolling]);

  // Method to be called when user logs out to disconnect socket and clear data
  const tokenRefreshUnsubRef = useRef<null | (() => void)>(null);

  // Subscribe to token refresh when logged in; keep one active subscriber
  useEffect(() => {
    let cancelled = false;
    const setup = async () => {
      const userDataStr = await AsyncStorage.getItem('userData');
      if (!userDataStr) return;
      const userData = JSON.parse(userDataStr);
      const adminId = userData.admin_id || userData.adminId;
      const shopId = userData.shop_id || userData.shopId || null;
      if (!adminId) return;
      if (tokenRefreshUnsubRef.current) return; // already subscribed
      tokenRefreshUnsubRef.current = messaging().onTokenRefresh(async (token) => {
        try {
          await AsyncStorage.setItem('fcmToken', token);
          await updateDeviceToken({ accountId: adminId, accountType: 'admin', token, shopId });
        } catch (e) {
          console.warn('[STAFF FCM] Failed to update refreshed token', e);
        }
      });
    };
    setup();
    return () => {
      if (cancelled) return;
    };
  }, []);

  const disconnectUser = useCallback(() => {
    console.log('🔌 Disconnecting socket and clearing notifications...');
    socketService.disconnect();
    stopPolling();
    setNotifications([]);
    setLoading(false);
    setError(null);
    if (tokenRefreshUnsubRef.current) {
      try { tokenRefreshUnsubRef.current(); } catch {}
      tokenRefreshUnsubRef.current = null;
    }
  }, [stopPolling]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
    initializeForUser,
    disconnectUser,
    dismissPendingReminder
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};

// Helper functions
const determineNotificationType = (title: string, message: string): string => {
  const titleLower = title.toLowerCase();
  const messageLower = message.toLowerCase();
  
  if (titleLower.includes('pending') && (titleLower.includes('reminder') || messageLower.includes('reminder'))) {
    return 'pending_reminder';
  } else if (titleLower.includes('booking') || messageLower.includes('booking') || messageLower.includes('booked')) {
    return 'booking';
  } else if (titleLower.includes('payment') || messageLower.includes('payment') || messageLower.includes('paid')) {
    return 'payment';
  } else if (titleLower.includes('delivery') || messageLower.includes('delivery') || messageLower.includes('pickup')) {
    return 'delivery';
  } else if (titleLower.includes('service') || messageLower.includes('order') || messageLower.includes('ready')) {
    return 'service';
  } else {
    return 'service';
  }
};

const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = diffInMs / (1000 * 60 * 60);
  const diffInDays = diffInHours / 24;

  if (diffInHours < 1) {
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    return `${diffInMinutes} min${diffInMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffInHours < 24) {
    const hours = Math.floor(diffInHours);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else if (diffInDays < 2) {
    return 'Yesterday';
  } else if (diffInDays < 7) {
    const days = Math.floor(diffInDays);
    return `${days} days ago`;
  } else if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
};