export type NotificationLike = {
  id?: string | number | null;
  account_type?: string | null;
  account_id?: string | number | null;
  booking_id?: string | number | null;
  title?: string | null;
  message?: string | null;
  read?: boolean | null;
};

const normalize = (value: string | number | null | undefined) =>
  String(value ?? '').trim().toLowerCase();

export function dedupeNotifications<T extends NotificationLike>(notifications: T[]): T[] {
  const seen = new Set<string>();

  return notifications.filter((notification) => {
    const title = normalize(notification.title);
    const message = normalize(notification.message);
    const accountType = normalize(notification.account_type);
    const accountId = normalize(notification.account_id);
    const bookingId = normalize(notification.booking_id);
    const isRejectionNotification = title.includes('rejected') || message.includes('rejected');

    const dedupeKey = [
      'admin',
      accountType,
      accountId,
      bookingId,
      title,
      isRejectionNotification ? '' : message,
    ].join('|');

    if (seen.has(dedupeKey)) {
      return false;
    }

    seen.add(dedupeKey);
    return true;
  });
}
