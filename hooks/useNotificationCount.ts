import { useNotificationContext } from '../context/NotificationContext';

// Simple hook to get just the unread count for components that only need that
export const useUnreadNotificationCount = (): number => {
  const { unreadCount } = useNotificationContext();
  return unreadCount;
};

// Re-export the full context hook for components that need more functionality
export { useNotificationContext } from '../context/NotificationContext';