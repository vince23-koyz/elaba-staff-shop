import { useEffect, useState, useCallback } from 'react';
import { PermissionsAndroid } from 'react-native';
import messaging from "@react-native-firebase/messaging";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, API_ENDPOINTS } from '../config/api';

interface Notification {
  id: string;
  type: string; // notification type for icon
  account_type: string;
  account_id: string;
  booking_id?: string;
  title: string;
  message: string;
  time: string; // formatted time string
  read: boolean; // processed read status
  created_at: string;
  updated_at?: string;
}

const requestNotificationPermission = async () => {
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        return null;
    }
    return granted;
}

const getToken = async () => {
    try {
        const token = await messaging().getToken();
        return token;
    } catch (error) {
        console.warn("Failed to get FCM token:", error);
        return null;
    }
}

export const useNotifications = () => {
    useEffect(() => {
        requestNotificationPermission();
        getToken()
    }, []);
}

// Keep this for backward compatibility, but recommend using NotificationContext instead
export const useShopNotifications = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchNotifications = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Get admin/shop info from AsyncStorage
            const userDataStr = await AsyncStorage.getItem('userData');
            if (!userDataStr) {
                // User is not logged in - this is normal, just set empty state
                setNotifications([]);
                setLoading(false);
                return;
            }

            const userData = JSON.parse(userDataStr);
            const adminId = userData.admin_id || userData.adminId;
            const shopId = userData.shop_id || userData.shopId;

            if (!adminId) {
                // User data exists but no admin ID - this could be a data integrity issue
                console.warn('User data found but no admin ID - user may need to re-login');
                setNotifications([]);
                setLoading(false);
                return;
            }

            console.log('Fetching notifications for adminId:', adminId, 'shopId:', shopId);

            // Fetch notifications for this admin (notifications sent to the shop's admin)
            const response = await api.get(API_ENDPOINTS.NOTIFICATIONS.LIST, {
                params: {
                    accountId: adminId, // Use adminId to get notifications sent to this admin
                    accountType: 'admin' // Notifications sent to admin (saved as account_type: 'admin')
                }
            });

            console.log('Notifications response:', response.data);

            if (response.data) {
                // Transform the data to match our component format
                const transformedNotifications = response.data.map((notif: any, index: number) => ({
                    id: notif.id ? String(notif.id) : `temp-${index}-${Date.now()}`,
                    type: determineNotificationType(notif.title, notif.message),
                    title: notif.title || 'Notification',
                    message: notif.message || 'No message available',
                    time: formatTime(notif.created_at),
                    read: notif.is_read === 1 || notif.is_read === true,
                    booking_id: notif.booking_id,
                    created_at: notif.created_at
                }));

                // Remove any potential duplicates based on ID
                const uniqueNotifications = transformedNotifications.filter((notif: Notification, index: number, self: Notification[]) => 
                    index === self.findIndex((n: Notification) => n.id === notif.id)
                );

                setNotifications(uniqueNotifications);
            }
        } catch (err: any) {
            console.error('Error fetching notifications:', err);
            
            // Only set error for actual errors, not missing user data
            if (err.message === 'User data not found' || err.message === 'Admin ID not found') {
                // These are expected when user is not logged in - don't show as errors
                setNotifications([]);
            } else {
                setError(err.response?.data?.message || err.message || 'Failed to fetch notifications');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const refreshNotifications = useCallback(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    return {
        notifications,
        loading,
        error,
        refreshNotifications
    };
};

// Helper function to determine notification type based on title/message content
const determineNotificationType = (title: string, message: string): string => {
    const titleLower = title.toLowerCase();
    const messageLower = message.toLowerCase();
    
    if (titleLower.includes('booking') || messageLower.includes('booking') || messageLower.includes('booked')) {
        return 'booking';
    } else if (titleLower.includes('payment') || messageLower.includes('payment') || messageLower.includes('paid')) {
        return 'payment';
    } else if (titleLower.includes('delivery') || messageLower.includes('delivery') || messageLower.includes('pickup')) {
        return 'delivery';
    } else if (titleLower.includes('service') || messageLower.includes('order') || messageLower.includes('ready')) {
        return 'service';
    } else {
        return 'service'; // default fallback
    }
};

// Helper function to format time
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