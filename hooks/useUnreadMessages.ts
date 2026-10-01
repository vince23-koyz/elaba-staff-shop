import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from '../services/socketService';
import { api, API_ENDPOINTS } from '../config/api';
import { Message } from './useMessaging';
import {
  buildUnreadMessagesForAdmin,
  mergeUnreadMessagesByConversation,
  removeUnreadMessagesForConversation,
} from '../utils/unreadConversationState';
import {
  applyReadOverridesToUnreadMessages,
  clearReadOverride,
  getReadOverrides,
  notifyUnreadStateChanged,
  setReadOverride,
  subscribeToUnreadStateChanges,
} from '../utils/messageReadState';

const useUnreadMessages = (userId: string, userType: 'customer' | 'admin' = 'admin') => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState<Message[]>([]);

  const storageKey = `staff_unreadMessages_${userId}`;
  const storageDataKey = `staff_unreadMessagesData_${userId}`;

  const saveUnreadState = useCallback(async (messages: Message[], count: number, shouldNotify = false) => {
    try {
      await AsyncStorage.setItem(storageKey, count.toString());
      await AsyncStorage.setItem(storageDataKey, JSON.stringify(messages));
      if (shouldNotify) {
        notifyUnreadStateChanged();
      }
    } catch (error) {
      console.log('Error saving staff unread state:', error);
    }
  }, [storageKey, storageDataKey]);

  const syncUnreadStateFromServer = useCallback(async () => {
    if (!userId) return;

    try {
      const userDataStr = await AsyncStorage.getItem('userData');
      if (!userDataStr) return;

      const userData = JSON.parse(userDataStr);
      const currentAdminId = userData.admin_id || userData.adminId;
      const shopId = userData.shop_id || userData.shopId;

      if (!currentAdminId || !shopId) return;

      const response = await api.get(API_ENDPOINTS.MESSAGES.SHOP_ALL(shopId));
      const serverMessages = Array.isArray(response.data) ? response.data : [];
      const serverUnreadMessages = buildUnreadMessagesForAdmin(serverMessages, currentAdminId.toString(), userType);
      const overrides = await getReadOverrides(currentAdminId.toString());
      const nextUnreadMessages = applyReadOverridesToUnreadMessages(serverUnreadMessages, overrides);
      const newCount = nextUnreadMessages.length;

      setUnreadMessages(nextUnreadMessages);
      setUnreadCount(newCount);
      await saveUnreadState(nextUnreadMessages, newCount);
    } catch (err) {
      console.log('Error syncing staff unread state from server:', err);
    }
  }, [saveUnreadState, userId, userType]);

  const loadUnreadState = useCallback(async () => {
    try {
      const savedCount = await AsyncStorage.getItem(storageKey);
      const savedMessages = await AsyncStorage.getItem(storageDataKey);

      if (savedCount) {
        const parsedCount = parseInt(savedCount || '0', 10);
        setUnreadCount(parsedCount);
      } else {
        setUnreadCount(0);
      }

      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages) as Message[];
        setUnreadMessages(parsedMessages);
      } else {
        setUnreadMessages([]);
      }
    } catch (err) {
      console.log('Error loading staff unread state:', err);
    }

    if (userId) {
      await syncUnreadStateFromServer();
    }
  }, [storageKey, storageDataKey, syncUnreadStateFromServer, userId]);

  useEffect(() => {
    if (userId) {
      void loadUnreadState();
    }
  }, [userId, loadUnreadState]);

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToUnreadStateChanges(() => {
      void loadUnreadState();
    });

    return () => {
      unsubscribe();
    };
  }, [loadUnreadState, userId]);

  useEffect(() => {
    if (!userId) return;

    socketService.connect(userId, userType);

    const handleIncomingMessage = (newMessage: Message) => {
      const senderType = newMessage.sender_type?.toString().toLowerCase();
      const receiverType = newMessage.receiver_type?.toString().toLowerCase();
      const receiverId = newMessage.receiver_id?.toString();
      const targetUserType = userType?.toString().toLowerCase();

      const isIncomingForThisAdmin =
        senderType === 'customer' &&
        receiverType === targetUserType &&
        receiverId === userId?.toString();

      if (!isIncomingForThisAdmin) {
        return;
      }

      // Remove any stale "read" override so new incoming messages from this sender can surface immediately.
      if (newMessage.sender_id && userId) {
        void clearReadOverride(userId.toString(), newMessage.sender_id.toString());
      }

      setUnreadMessages(prev => {
        const nextUnreadMessages = mergeUnreadMessagesByConversation(prev, newMessage as any);
        const newCount = nextUnreadMessages.length;

        if (newCount !== prev.length) {
          setUnreadCount(newCount);
          void saveUnreadState(nextUnreadMessages, newCount, true);
        }

        return nextUnreadMessages;
      });
    };

    socketService.onReceiveMessage(handleIncomingMessage);

    return () => {
      socketService.offReceiveMessage(handleIncomingMessage);
    };
  }, [userId, userType, saveUnreadState]);

  const clearUnreadMessages = useCallback(async () => {
    setUnreadCount(0);
    setUnreadMessages([]);
    await saveUnreadState([], 0, true);
  }, [saveUnreadState]);

  const markConversationAsRead = useCallback(async (message: Partial<Message>) => {
    let nextUnreadMessages: Message[] = [];

    setUnreadMessages(prev => {
      nextUnreadMessages = removeUnreadMessagesForConversation(prev as any, message as any) as Message[];
      const newCount = nextUnreadMessages.length;
      setUnreadCount(newCount);
      return nextUnreadMessages;
    });

    await saveUnreadState(nextUnreadMessages, nextUnreadMessages.length, true);
  }, [saveUnreadState]);

  const clearConversationUnreadState = useCallback(async (message: Partial<Message>) => {
    let nextUnreadMessages: Message[] = [];

    setUnreadMessages(prev => {
      nextUnreadMessages = removeUnreadMessagesForConversation(prev as any, message as any) as Message[];
      const newCount = nextUnreadMessages.length;
      setUnreadCount(newCount);
      return nextUnreadMessages;
    });

    if (message.sender_id && userId) {
      try {
        await setReadOverride(userId.toString(), message.sender_id.toString(), {
          hasUnreadMessages: false,
          unreadCount: 0,
        });
      } catch (error) {
        console.log('Error clearing read override for conversation:', error);
      }
    }

    await saveUnreadState(nextUnreadMessages, nextUnreadMessages.length, true);
  }, [saveUnreadState, userId]);

  const consumeLastReadConversationMarker = useCallback(async () => {
    if (!userId) return null;

    const markerKey = `lastReadConversation_${userId}`;
    const markerValue = await AsyncStorage.getItem(markerKey);

    if (!markerValue) return null;

    let parsedMarker: {
      shopId?: string;
      receiverId?: string;
      receiverType?: 'customer' | 'admin';
    } | null = null;

    try {
      const marker = JSON.parse(markerValue) as {
        shopId?: string;
        receiverId?: string;
        receiverType?: 'customer' | 'admin';
      };
      parsedMarker = marker;

      if (marker.shopId && marker.receiverId && marker.receiverType) {
        await clearConversationUnreadState({
          sender_id: marker.receiverId,
          sender_type: marker.receiverType,
          receiver_id: userId,
          receiver_type: userType,
          shop_id: marker.shopId,
        } as any);
      }
    } catch (error) {
      console.log('Error consuming read marker:', error);
    } finally {
      await AsyncStorage.removeItem(markerKey);
    }

    return parsedMarker;
  }, [clearConversationUnreadState, userId, userType]);

  const markMessageAsRead = useCallback(async (messageId: number | string) => {
    let nextUnreadMessages: Message[] = [];

    setUnreadMessages(prev => {
      nextUnreadMessages = prev.filter(msg => msg.id !== messageId);
      const newCount = nextUnreadMessages.length;
      setUnreadCount(newCount);
      return nextUnreadMessages;
    });

    await saveUnreadState(nextUnreadMessages, nextUnreadMessages.length, true);
  }, [saveUnreadState]);

  return {
    unreadCount,
    unreadMessages,
    clearUnreadMessages,
    refreshUnreadMessages: loadUnreadState,
    markConversationAsRead,
    clearConversationUnreadState,
    consumeLastReadConversationMarker,
    markMessageAsRead,
  };
};

export default useUnreadMessages;
