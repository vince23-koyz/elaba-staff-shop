import { UnreadConversationMessage } from './unreadConversationState';

// Lazy-require AsyncStorage at runtime to avoid importing native module during Jest static analysis
const getAsyncStorage = () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@react-native-async-storage/async-storage');
  } catch (e) {
    return null;
  }
};

export interface MessageReadStateOverride {
  hasUnreadMessages: boolean;
  unreadCount: number;
}

type UnreadStateListener = () => void;
const unreadStateListeners = new Set<UnreadStateListener>();

export const subscribeToUnreadStateChanges = (listener: UnreadStateListener) => {
  unreadStateListeners.add(listener);
  return () => {
    unreadStateListeners.delete(listener);
  };
};

export const notifyUnreadStateChanged = () => {
  unreadStateListeners.forEach((listener) => listener());
};

export interface MessageReadStateInput {
  serverHasUnreadMessages: boolean;
  serverUnreadCount: number;
  override?: MessageReadStateOverride | null;
}

export const resolveEffectiveUnreadState = ({
  serverHasUnreadMessages,
  serverUnreadCount,
  override,
}: MessageReadStateInput) => {
  if (override) {
    return {
      hasUnreadMessages: override.hasUnreadMessages,
      unreadCount: override.unreadCount,
    };
  }

  return {
    hasUnreadMessages: serverHasUnreadMessages,
    unreadCount: serverUnreadCount,
  };
};

export const applyReadOverridesToUnreadMessages = <T extends UnreadConversationMessage>(
  unreadMessages: T[],
  overrides?: Record<string, MessageReadStateOverride> | null,
) => {
  const normalizedOverrides = overrides || {};

  return unreadMessages.filter((message) => {
    const senderId = message.sender_id?.toString();
    const override = senderId ? normalizedOverrides[senderId] : undefined;

    if (override) {
      return override.hasUnreadMessages;
    }

    return true;
  });
};

const storageKeyForAdmin = (adminId: string) => `staff_read_overrides_${adminId}`;

export const getReadOverrides = async (adminId: string): Promise<Record<string, MessageReadStateOverride>> => {
  try {
    const AsyncStorage = getAsyncStorage();
    if (!AsyncStorage) return {};
    const raw = await AsyncStorage.getItem(storageKeyForAdmin(adminId));
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.log('Error reading read overrides:', e);
    return {};
  }
};

export const setReadOverride = async (adminId: string, customerId: string, override: MessageReadStateOverride) => {
  try {
    const AsyncStorage = getAsyncStorage();
    if (!AsyncStorage) return;
    const cur = await getReadOverrides(adminId);
    cur[customerId] = override;
    await AsyncStorage.setItem(storageKeyForAdmin(adminId), JSON.stringify(cur));
  } catch (e) {
    console.log('Error saving read override:', e);
  }
};

export const clearReadOverride = async (adminId: string, customerId: string) => {
  try {
    const AsyncStorage = getAsyncStorage();
    if (!AsyncStorage) return;
    const cur = await getReadOverrides(adminId);
    delete cur[customerId];
    await AsyncStorage.setItem(storageKeyForAdmin(adminId), JSON.stringify(cur));
  } catch (e) {
    console.log('Error clearing read override:', e);
  }
};
