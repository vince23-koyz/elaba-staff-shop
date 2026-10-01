import { buildUnreadMessagesForAdmin } from '../utils/unreadConversationState';

describe('buildUnreadMessagesForAdmin', () => {
  it('surfaces one unread entry per conversation even when multiple messages arrive in the same thread', () => {
    const messages = [
      {
        id: 1,
        sender_type: 'customer' as const,
        sender_id: '10',
        receiver_type: 'admin' as const,
        receiver_id: '42',
        shop_id: '7',
        message_text: 'Hello',
        is_read: 0,
      },
      {
        id: 2,
        sender_type: 'customer' as const,
        sender_id: '10',
        receiver_type: 'admin' as const,
        receiver_id: '42',
        shop_id: '7',
        message_text: 'Second message',
        is_read: 0,
      },
      {
        id: 3,
        sender_type: 'admin' as const,
        sender_id: '42',
        receiver_type: 'customer' as const,
        receiver_id: '10',
        shop_id: '7',
        message_text: 'Reply',
        is_read: 1,
      },
    ];

    const unreadMessages = buildUnreadMessagesForAdmin(messages, '42', 'admin');

    expect(unreadMessages).toHaveLength(1);
    expect(unreadMessages[0].sender_id).toBe('10');
    expect(unreadMessages[0].message_text).toBe('Hello');
  });

  it('counts multiple unread conversations separately', () => {
    const messages = [
      {
        id: 1,
        sender_type: 'customer' as const,
        sender_id: '10',
        receiver_type: 'admin' as const,
        receiver_id: '42',
        shop_id: '7',
        message_text: 'Hello',
        is_read: 0,
      },
      {
        id: 2,
        sender_type: 'customer' as const,
        sender_id: '11',
        receiver_type: 'admin' as const,
        receiver_id: '42',
        shop_id: '7',
        message_text: 'Hi there',
        is_read: 0,
      },
    ];

    const unreadMessages = buildUnreadMessagesForAdmin(messages, '42', 'admin');

    expect(unreadMessages).toHaveLength(2);
    expect(unreadMessages.map((item) => item.sender_id)).toEqual(['10', '11']);
  });
});
