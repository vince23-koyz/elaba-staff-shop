import { dedupeNotifications } from '../utils/notificationDedup';

describe('dedupeNotifications', () => {
  it('removes duplicate shop rejection notifications that share the same identity', () => {
    const notifications = [
      {
        id: '1',
        account_type: 'admin',
        account_id: '42',
        booking_id: null,
        title: 'Shop request rejected',
        message: 'Shop registration rejected for Beauty Hub. Reason: Incomplete docs. Please review and reapply.',
        read: false,
      },
      {
        id: '2',
        account_type: 'admin',
        account_id: '42',
        booking_id: null,
        title: 'Shop request rejected',
        message: 'Shop registration rejected for Beauty Hub. Reason: Incomplete docs. Please review and reapply.',
        read: false,
      },
    ];

    expect(dedupeNotifications(notifications)).toHaveLength(1);
    expect(dedupeNotifications(notifications)[0].id).toBe('1');
  });

  it('dedupes repeated shop rejection notifications even when the rejection reason differs', () => {
    const notifications = [
      {
        id: '1',
        account_type: 'admin',
        account_id: '42',
        booking_id: null,
        title: 'Shop request rejected',
        message: 'Shop registration rejected for Beauty Hub. Reason: Incomplete docs. Please review and reapply.',
        read: false,
      },
      {
        id: '2',
        account_type: 'admin',
        account_id: '42',
        booking_id: null,
        title: 'Shop request rejected',
        message: 'Shop registration rejected for Beauty Hub. Reason: Business permit missing. Please review and reapply.',
        read: false,
      },
    ];

    expect(dedupeNotifications(notifications)).toHaveLength(1);
  });

  it('keeps distinct notifications with different titles or booking context', () => {
    const notifications = [
      {
        id: '1',
        account_type: 'admin',
        account_id: '42',
        booking_id: null,
        title: 'Shop request rejected',
        message: 'Shop registration rejected for Beauty Hub. Reason: Incomplete docs. Please review and reapply.',
        read: false,
      },
      {
        id: '2',
        account_type: 'admin',
        account_id: '42',
        booking_id: '300',
        title: 'Payment received',
        message: 'A payment was successfully captured.',
        read: false,
      },
    ];

    expect(dedupeNotifications(notifications)).toHaveLength(2);
  });
});
