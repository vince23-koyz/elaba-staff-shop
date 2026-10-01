import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Header from '../../components/Header';
import SideMenu from '../../components/SideMenu';
import Icons from '../../components/Icons';
import ManageHeader from '../../components/ManageHeader';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/Navigator';
import { useAdminData } from '../../hooks/useAdminData';
import { useBookingData, type Booking } from '../../hooks/useBookingData';
import socketService from '../../services/socketService';

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

const getScheduleDate = (booking: Booking) => {
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

export default function ScheduledSummary() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { shopName, shopId, adminName } = useAdminData();
  const { bookings, refetch } = useBookingData(shopId);
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(prev => !prev);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  useEffect(() => {
    if (!shopId) return;

    const handleBookingChange = (event?: { shopId?: string | number }) => {
      if (!event?.shopId || String(event.shopId) === String(shopId)) {
        refetch();
      }
    };

    socketService.onBookingCreated(handleBookingChange);
    socketService.onBookingUpdated(handleBookingChange);
    socketService.onBookingDeleted(handleBookingChange);

    return () => {
      socketService.offBookingCreated(handleBookingChange);
      socketService.offBookingUpdated(handleBookingChange);
      socketService.offBookingDeleted(handleBookingChange);
    };
  }, [refetch, shopId]);

  const upcomingByDate = useMemo(() => {
    const map = new Map<string, { date: string; count: number; pending: number; completed: number }>();
    const today = startOfDay(new Date());
    const bookingsForShop = shopId
      ? bookings.filter(booking => String(booking.shop_id) === String(shopId))
      : [];

    bookingsForShop.forEach(booking => {
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
      const entry = map.get(key) || { date: key, count: 0, pending: 0, completed: 0 };
      entry.count += 1;
      if (status === 'pending') entry.pending += 1;
      map.set(key, entry);
    });
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [bookings, shopId]);

  const totalUpcoming = upcomingByDate.reduce((sum, x) => sum + x.count, 0);

  return (
    <LinearGradient colors={['#71c5b4', '#6fa8dc']} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.container}>
      <Header shopName={shopName} toggleMenu={toggleMenu} />
      {/* Shared Manage header */}
      <ManageHeader active="scheduled" />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#fff']} tintColor="#fff" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Enhanced summary header */}
        <View style={styles.enhancedHeaderCard}>
          <View style={styles.shopRow}>
            <Icons.Store size={22} color="#3498db" />
              <View style={styles.shopTextBlock}>
                <Text style={styles.shopCaption}>SHOP</Text>
                <Text style={styles.shopName} numberOfLines={1}>{shopName || 'Your Shop'}</Text>
              </View>
          </View>
          <View style={styles.summaryBlock}>
              <View style={styles.summaryIconWrap}>
                <Icons.Info size={17} color="#3498db" />
              </View>
              <View>
                <Text style={styles.summaryLabel}>Upcoming bookings</Text>
                <Text style={styles.summaryValue}>{totalUpcoming}</Text>
              </View>
          </View>
        </View>

        {/* Section: Upcoming bookings by date */}
        {upcomingByDate.length === 0 ? (
          <View style={styles.emptyStateCard}>
            <Icons.Calendar size={32} color="#b0bec5" />
            <Text style={styles.emptyText}>No upcoming scheduled bookings.</Text>
          </View>
        ) : (
          upcomingByDate.map(item => (
            <View key={item.date} style={styles.dateCard}>
              <View style={styles.dateHeader}>
                <Icons.Calendar size={18} color="#3498db" />
                <Text style={styles.dateHeaderText}>{formatDate(item.date)}</Text>
              </View>
              <View style={styles.badgeRow}>
                <View style={[styles.badge, styles.totalBadge]}>
                  <Icons.Info size={14} color="#fff" />
                  <Text style={styles.badgeText}>Total {item.count}</Text>
                </View>
                {!!item.pending && (
                  <View style={[styles.badge, styles.pendingBadge]}>
                    <Icons.Alert size={14} color="#fff" />
                    <Text style={styles.badgeText}>Pending {item.pending}</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {menuOpen && (<TouchableOpacity style={styles.overlay} onPress={toggleMenu} activeOpacity={1} />)}
      <SideMenu navigation={navigation} menuOpen={menuOpen} toggleMenu={toggleMenu} adminName={adminName} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  navRowBetter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    marginTop: 2,
    width: '100%',
  },
  navButtonWrapper: {
    flex: 1,
    maxWidth: 320,
    alignSelf: 'center',
    paddingHorizontal: 8,
  },
  enhancedNavLink: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#3498db',
    shadowOpacity: 0.13,
    shadowRadius: 8,
    marginHorizontal: 2,
  },
  enhancedNavGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    width: '100%',
  },
  enhancedNavText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    marginLeft: 10,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.13)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  container: { flex: 1, paddingTop: 50 },
  content: { padding: 16, paddingBottom: 60 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#ecf0f1', textAlign: 'center', marginTop: 4, marginBottom: 16 },
  enhancedHeaderCard: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    padding: 18,
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 18,
    shadowColor: '#3498db',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 5,
  },
  shopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, minWidth: 150 },
  shopTextBlock: { flexShrink: 1 },
  shopCaption: { fontSize: 10, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.8, marginBottom: 2 },
  shopName: { fontSize: 16, fontWeight: '700', color: '#3498db', flexShrink: 1 },
  summaryBlock: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingLeft: 12, paddingVertical: 4, borderLeftWidth: 1, borderLeftColor: '#e2e8f0' },
  summaryIconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e3f2fd' },
  summaryLabel: { fontSize: 11, color: '#6c757d', marginBottom: 1 },
  summaryValue: { fontSize: 24, fontWeight: '800', color: '#2c3e50' },
  emptyStateCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    alignItems: 'center',
    padding: 32,
    marginVertical: 18,
    shadowColor: '#b0bec5',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyText: { color: '#6c757d', fontSize: 16, fontWeight: '600', marginTop: 10 },
  dateCard: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 16,
    marginBottom: 16,
    padding: 14,
    shadowColor: '#3498db',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  dateHeaderText: { fontSize: 15, fontWeight: '700', color: '#3498db' },
  badgeRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 2,
    elevation: 2,
  },
  totalBadge: { backgroundColor: '#3498db' },
  pendingBadge: { backgroundColor: '#dc3545' },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 13, marginLeft: 2 },
  backButton: { marginTop: 16, alignSelf: 'center', backgroundColor: '#3498db', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { color: '#fff', fontWeight: '700' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 15 },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
    marginTop: 2,
  },
  // Simple top navigation link (non-toggle)
  navRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 2,
  },
  navLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  navLinkText: {
    marginLeft: 6,
    color: '#3498db',
    fontWeight: '700',
  },
});
