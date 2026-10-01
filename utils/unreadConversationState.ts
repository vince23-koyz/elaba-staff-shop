export interface UnreadConversationMessage {
  id?: number | string;
  sender_id: string;
  sender_type: 'customer' | 'admin';
  receiver_id?: string;
  receiver_type?: 'customer' | 'admin';
  shop_id?: string;
  message_text?: string;
  created_at?: string;
  is_read?: number | boolean;
}

export const getConversationKey = (message: UnreadConversationMessage) => {
  const senderId = message.sender_id?.toString() || '';
  const receiverId = message.receiver_id?.toString() || '';
  const shopId = message.shop_id?.toString() || '';
  const senderType = message.sender_type || '';
  const receiverType = message.receiver_type || '';

  return `${senderType}:${senderId}:${receiverType}:${receiverId}:${shopId}`;
};

export const mergeUnreadMessagesByConversation = <T extends UnreadConversationMessage>(
  existingMessages: T[],
  incomingMessage: T,
) => {
  const key = getConversationKey(incomingMessage);
  const alreadyTracked = existingMessages.some((message) => getConversationKey(message) === key);

  if (alreadyTracked) {
    return existingMessages;
  }

  return [...existingMessages, incomingMessage];  
};

export const removeUnreadMessagesForConversation = <T extends UnreadConversationMessage>(
  existingMessages: T[],
  message: Partial<UnreadConversationMessage>,
) => {
  const key = getConversationKey(message as UnreadConversationMessage);
  return existingMessages.filter((item) => getConversationKey(item) !== key);
};

export const buildUnreadMessagesForAdmin = <T extends UnreadConversationMessage>(
  messages: T[],
  adminId: string,
  userType: 'customer' | 'admin' = 'admin',
) => {
  if (!adminId) return [] as T[];

  const targetId = adminId.toString();
  const unreadMessages = messages.filter((message) => {
    const receiverId = message.receiver_id?.toString();
    const receiverType = message.receiver_type;
    const isUnread = typeof message.is_read === 'boolean'
      ? !message.is_read
      : Number(message.is_read ?? 0) === 0;

    return (
      receiverType === userType &&
      receiverId === targetId &&
      message.sender_type === 'customer' &&
      isUnread
    );
  });

  const uniqueByConversation = new Map<string, T>();
  unreadMessages.forEach((message) => {
    const key = getConversationKey(message);
    if (!uniqueByConversation.has(key)) {
      uniqueByConversation.set(key, message);
    }
  });

  return Array.from(uniqueByConversation.values());
};
