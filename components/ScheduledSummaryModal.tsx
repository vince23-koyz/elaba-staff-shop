import React, { useMemo } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import Icons from './Icons';

export interface BookingItem {
  booking_id: number;
  booking_date: string;
  booking_type?: string;
  pickup_date?: string | null;
  booking_status?: string;
  shop_name?: string;
  shop_id?: number | string;
}

interface ScheduledSummaryModalProps {
  visible: boolean;
  onClose: () => void;
  bookings: BookingItem[];
}

const { width, height } = Dimensions.get('window');

const startOfDay = (d: Date) => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const formatDate = (dateString: string) => {
  const date = parseCalendarDate(dateString);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const parseCalendarDate = (value: string) => {
  const datePart = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (datePart) {
    const [year, month, day] = datePart.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value);
};

const getScheduleDate = (booking: BookingItem) => {
  const type = (booking.booking_type || '').toLowerCase();
  const dateCandidates = ['pick up', 'pickup'].includes(type)
    ? [booking.pickup_date, booking.booking_date]
    : [booking.booking_date];

  for (const candidate of dateCandidates) {
    if (!candidate) continue;

    const date = parseCalendarDate(candidate);
    if (!isNaN(date.getTime())) return date;
  }

  return null;
};

const ScheduledSummaryModal: React.FC<ScheduledSummaryModalProps> = ({ visible, onClose, bookings }) => {
  const upcomingByDate = useMemo(() => {
    const map = new Map<string, { date: string; count: number; pending: number }>();
    const today = startOfDay(new Date());

    bookings.forEach(booking => {
      const status = (booking.booking_status || '').toLowerCase();
      if (['completed', 'cancelled', 'declined'].includes(status)) return;

      const scheduleDate = getScheduleDate(booking);
      if (!scheduleDate) return;

      const date = startOfDay(scheduleDate);
      if (date < today) return;

      const key = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
      ].join('-');
      const entry = map.get(key) || { date: key, count: 0, pending: 0 };
      entry.count += 1;
      if (status === 'pending') entry.pending += 1;
      map.set(key, entry);
    });

    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [bookings]);

  const totalUpcoming = upcomingByDate.reduce((sum, x) => sum + x.count, 0);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icons.Calendar size={20} />
              <Text style={styles.title}>Scheduled Summary</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Icons.Info size={18} color="#2c3e50" />
              <Text style={styles.summaryLabel}>Upcoming</Text>
              <Text style={styles.summaryValue}>{totalUpcoming}</Text>
            </View>
          </View>

          <ScrollView style={{ maxHeight: height * 0.45 }}>
            {upcomingByDate.length === 0 ? (
              <View style={{ alignItems: 'center', padding: 16 }}>
                <Text style={{ color: '#6c757d' }}>No upcoming scheduled bookings.</Text>
              </View>
            ) : (
              upcomingByDate.map(item => (
                <View key={item.date} style={styles.row}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Icons.Calendar size={16} color="#6c757d" />
                    <Text style={styles.rowDate}>{formatDate(item.date)}</Text>
                  </View>
                  <View style={styles.counters}>
                    <View style={[styles.badge, { backgroundColor: '#3498db' }]}>
                      <Text style={styles.badgeText}>Total {item.count}</Text>
                    </View>
                    {!!item.pending && (
                      <View style={[styles.badge, { backgroundColor: '#dc3545' }]}>
                        <Text style={styles.badgeText}>Pending {item.pending}</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  card: { width: width * 0.9, backgroundColor: '#fff', borderRadius: 16, padding: 16, elevation: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { marginLeft: 8, fontSize: 18, fontWeight: '700', color: '#2c3e50' },
  closeBtn: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#e9ecef', borderRadius: 8 },
  closeText: { color: '#2c3e50', fontWeight: '600' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  summaryItem: { alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: '#6c757d', marginTop: 4 },
  summaryValue: { fontSize: 22, fontWeight: '700', color: '#2c3e50' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f3f5' },
  rowDate: { marginLeft: 8, color: '#2c3e50', fontWeight: '600' },
  counters: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});

export default ScheduledSummaryModal;
