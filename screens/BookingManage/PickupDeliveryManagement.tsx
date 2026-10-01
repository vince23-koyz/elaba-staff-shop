import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, ToastAndroid, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/Navigator';
import Header from '../../components/Header';
import ManageHeader from '../../components/ManageHeader';
import SideMenu from '../../components/SideMenu';
import Icons from '../../components/Icons';
import { api, API_ENDPOINTS } from '../../config/api';
import { useAdminData } from '../../hooks/useAdminData';

interface DeliveryItem {
  delivery_id: number;
  booking_id: number;
  customer_id: number;
  shop_id: number;
  service_id: number;
  pickup_address: string;
  delivery_address: string;
  delivery_time: string;
  status: string;
  // joined
  booking_type?: string;
  booking_status?: string;
  booking_date?: string;
  total_amount?: string;
  customer_first_name?: string;
  customer_last_name?: string;
  shop_name?: string;
  service_name?: string;
}

type FilterStatus = 'all' | 'pending' | 'out_for_pickup' | 'picked_up' | 'at_shop' | 'ready_for_delivery' | 'out_for_delivery' | 'delivered';
type TypeFilter = 'all' | 'pickup' | 'delivery';

export default function PickupDeliveryManagement() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { adminName, shopName, shopId } = useAdminData();

  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [working, setWorking] = useState<Set<number>>(new Set());

  const toggleMenu = () => setMenuOpen(prev => !prev);

  const normalizeType = (t?: string): TypeFilter => {
    const v = (t || '').toLowerCase();
    if (v.includes('pick')) return 'pickup';
    if (v.includes('deliver')) return 'delivery';
    return 'pickup'; // default to pickup for laundry scenario if ambiguous
  };

  const fetchDeliveries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (!shopId) { setDeliveries([]); return; }
      const res = await api.get(API_ENDPOINTS.DELIVERY.BASE, { params: { shop_id: shopId } });
      const rows: DeliveryItem[] = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];
      setDeliveries(rows);
    } catch (e) {
      console.error('Error loading deliveries', e);
      setError('Failed to load pickup/delivery');
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDeliveries();
    setRefreshing(false);
  }, [fetchDeliveries]);

  useEffect(() => { fetchDeliveries(); }, [fetchDeliveries]);

  const counts = useMemo(() => {
    const c: Record<FilterStatus, number> = { all: 0, pending: 0, out_for_pickup: 0, picked_up: 0, at_shop: 0, ready_for_delivery: 0, out_for_delivery: 0, delivered: 0 };
    for (const d of deliveries) {
      c.all += 1;
      const s = (d.status || '').toLowerCase() as FilterStatus;
      if (c[s] !== undefined) c[s] += 1;
    }
    return c;
  }, [deliveries]);

  const filtered = useMemo(() => {
    return deliveries.filter(d => {
      const statusOk = statusFilter === 'all' || (d.status || '').toLowerCase() === statusFilter;
      return statusOk;
    });
  }, [deliveries, statusFilter]);

  const formatAmount = (amount?: string) => {
    if (!amount) return '₱0.00';
    const num = parseFloat(amount);
    return `₱${isNaN(num) ? '0.00' : num.toFixed(2)}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return dateString; }
  };

  const statusStyle = (status?: string) => {
    switch ((status || '').toLowerCase()) {
      case 'pending': return styles.statusPending;
      case 'out_for_pickup':
      case 'pickup_scheduled':
      case 'picked_up':
      case 'at_shop': return styles.statusConfirmed;
      case 'ready_for_delivery': return styles.statusReady;
      case 'out_for_delivery': return styles.statusOut;
      case 'delivered': return styles.statusCompleted;
      default: return styles.statusDefault;
    }
  };

  const withWorking = (id: number, fn: () => Promise<void>) => async () => {
    setWorking(prev => new Set(prev).add(id));
    try { await fn(); } finally {
      setWorking(prev => { const ns = new Set(prev); ns.delete(id); return ns; });
    }
  };

  const updateDeliveryStatus = async (deliveryId: number, status: FilterStatus) => {
    await api.patch(API_ENDPOINTS.DELIVERY.STATUS(deliveryId), { status });
    // optimistic update
    setDeliveries(prev => prev.map(d => d.delivery_id === deliveryId ? { ...d, status } : d));
  };

  // Choose a single, context-aware primary action to reduce clutter
  type CTAStyle = 'accept' | 'ready' | 'dispatch' | 'complete';
  const getPrimaryAction = (d: DeliveryItem): { label: string; next: FilterStatus; style: CTAStyle } | null => {
    const status = (d.status || '').toLowerCase();
    const t = normalizeType(d.booking_type);
    if ((d.booking_status || '').toLowerCase() === 'pending') return null;
    if (status === 'pending') return { label: 'Dispatch for Pickup', next: 'out_for_pickup', style: 'accept' };
    if (t === 'pickup') {
      if (status === 'out_for_pickup') return { label: 'Mark Picked Up', next: 'picked_up', style: 'ready' };
      if (status === 'pickup_scheduled') return { label: 'Dispatch for Pickup', next: 'out_for_pickup', style: 'accept' };
      if (status === 'picked_up') return { label: 'Mark At Shop', next: 'at_shop', style: 'ready' };
      if (status === 'at_shop' && (d.booking_status || '').toLowerCase() === 'processing') return { label: 'Ready for Delivery', next: 'ready_for_delivery', style: 'ready' };
      if (status === 'ready_for_delivery') return { label: 'Dispatch', next: 'out_for_delivery', style: 'dispatch' };
      if (status === 'out_for_delivery') return { label: 'Mark Delivered', next: 'delivered', style: 'complete' };
    }
    if (t === 'delivery') {
      if (status === 'confirmed') return { label: 'Dispatch', next: 'out_for_delivery', style: 'dispatch' };
      if (status === 'out_for_delivery') return { label: 'Mark Delivered', next: 'delivered', style: 'complete' };
    }
    return null;
  };

  return (
    <LinearGradient 
      colors={['#71c5b4', '#6fa8dc']}
      start={{ x: 0, y: 0 }} 
      end={{ x: 1, y: 0 }} 
      style={styles.container}
    >
      <Header shopName={shopName} toggleMenu={toggleMenu} />
      <ManageHeader active="delivery" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#fff']} tintColor="#fff" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Filter */}
        <View style={styles.filterRow}>
          {(['all','pending','out_for_pickup','picked_up','at_shop','ready_for_delivery','out_for_delivery','delivered'] as FilterStatus[]).map(s => (
            <TouchableOpacity key={s} style={[styles.filterBtn, statusFilter===s && styles.filterBtnActive]} onPress={() => setStatusFilter(s)}>
              <Text style={[styles.filterText, statusFilter===s && styles.filterTextActive]}>
                {s.replace(/_/g,' ')} ({counts[s]})
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading && !refreshing ? (
          <View style={styles.loading}> 
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchDeliveries}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No records found</Text>
          </View>
        ) : (
          filtered.map(d => (
            <TouchableOpacity
              key={d.delivery_id}
              style={styles.card}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('BookingDetails', { bookingId: d.booking_id })}
            >
              <View style={styles.cardHeader}>
                <View style={{flex:1}}>
                  <Text style={styles.cardId}>#DLV-{d.delivery_id}</Text>
                  <Text style={styles.customer}>{d.customer_first_name} {d.customer_last_name}</Text>
                </View>
                <View style={[styles.badge, statusStyle(d.status)]}><Text style={styles.badgeText}>{(d.status||'').replace(/_/g,' ')}</Text></View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.row}> 
                  <View style={styles.col}> 
                    <View style={styles.labelRow}><Icons.File size={14} color="#6c757d" /><Text style={styles.label}>Type</Text></View>
                    <Text style={styles.value}>{d.booking_type}</Text>
                  </View>
                  <View style={styles.col}> 
                    <View style={styles.labelRow}><Icons.Calendar size={14} color="#6c757d" /><Text style={styles.label}>Schedule</Text></View>
                    <Text style={styles.value}>{formatDate(d.delivery_time)}</Text>
                  </View>
                </View>

                <View style={styles.addressRow}>
                  <View style={styles.labelRow}>
                    <Icons.Home size={14} color="#6c757d" />
                    <Text style={styles.label}>{normalizeType(d.booking_type) === 'delivery' ? 'Delivery address' : 'Pickup address'}</Text>
                  </View>
                  <Text style={styles.addressValue} numberOfLines={3}>
                    {normalizeType(d.booking_type) === 'delivery'
                      ? d.delivery_address || d.pickup_address || 'Not specified'
                      : d.pickup_address || d.delivery_address || 'Not specified'}
                  </Text>
                </View>

                <View style={styles.row}> 
                  <View style={styles.col}> 
                    <View style={styles.labelRow}><Icons.Wallet size={14} color="#6c757d" /><Text style={styles.label}>Total</Text></View>
                    <Text style={styles.total}>{formatAmount(d.total_amount)}</Text>
                  </View>
                </View>

                {/* Actions (simplified) */}
                <View style={[styles.actionsBar]}> 
                  {(() => {
                    const act = getPrimaryAction(d);
                    if (!act) return <View style={{ flex: 1 }} />;
                    return (
                      <TouchableOpacity
                        style={[styles.cta, styles[act.style]]}
                        onPress={withWorking(d.delivery_id, async () => {
                          await updateDeliveryStatus(d.delivery_id, act.next);
                          ToastAndroid.show(`${act.label} done`, ToastAndroid.SHORT);
                        })}
                        disabled={working.has(d.delivery_id)}
                      >
                        {working.has(d.delivery_id)
                          ? <ActivityIndicator size="small" color="#fff" />
                          : <Text style={styles.ctaText}>{act.label}</Text>}
                      </TouchableOpacity>
                    );
                  })()}

                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {menuOpen && (<TouchableOpacity style={styles.overlay} onPress={toggleMenu} activeOpacity={1} />)}
      <SideMenu navigation={navigation} menuOpen={menuOpen} toggleMenu={toggleMenu} adminName={adminName} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  scroll: { padding: 16, paddingBottom: 60 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 16, textAlign: 'center' },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
    elevation: 2,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  filterBtnActive: { backgroundColor: '#3498db', elevation: 3 },
  filterText: { fontSize: 12, fontWeight: '600', color: '#7f8c8d' },
  filterTextActive: { color: '#fff', fontWeight: '700' },

  loading: { alignItems: 'center', paddingVertical: 40 },
  loadingText: { color: '#fff', fontSize: 16, marginTop: 12 },
  errorBox: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 12, padding: 20, marginVertical: 20, alignItems: 'center' },
  errorText: { color: '#e74c3c', fontSize: 16, fontWeight: '600' },
  retryBtn: { backgroundColor: '#3498db', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, marginTop: 10 },
  retryText: { color: '#fff', fontWeight: '700' },
  emptyBox: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 16, padding: 30, marginVertical: 20, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#7f8c8d' },

  card: { backgroundColor: '#fff', borderRadius: 20, marginBottom: 16, elevation: 6, borderWidth: 1, borderColor: '#f0f2f5', overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8f9fa', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e9ecef' },
  cardId: { fontSize: 14, fontWeight: '700', color: '#2c3e50', marginBottom: 2 },
  customer: { fontSize: 14, fontWeight: '600', color: '#34495e' },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 18 },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  statusPending: { backgroundColor: '#dc3545' },
  statusConfirmed: { backgroundColor: '#3498db' },
  statusReady: { backgroundColor: '#6f42c1' },
  statusOut: { backgroundColor: '#fd7e14' },
  statusCompleted: { backgroundColor: '#28a745' },
  statusDefault: { backgroundColor: '#6c757d' },

  cardBody: { padding: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  col: { flex: 1, marginRight: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 11, fontWeight: '600', color: '#6c757d', textTransform: 'uppercase', marginBottom: 2 },
  value: { fontSize: 13, fontWeight: '500', color: '#2c3e50' },
  addressRow: { marginBottom: 10, paddingTop: 2 },
  addressValue: { marginTop: 4, color: '#2c3e50', fontSize: 13, fontWeight: '500', lineHeight: 18 },
  total: { fontSize: 18, fontWeight: '700', color: '#27ae60', backgroundColor: '#e8f5e8', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, alignSelf: 'flex-start', marginTop: 4 },

  actionsBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  cta: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22, elevation: 2, minWidth: 140, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 0.2 },
  accept: { backgroundColor: '#3498db' },
  ready: { backgroundColor: '#ffc107' },
  dispatch: { backgroundColor: '#17a2b8' },
  complete: { backgroundColor: '#28a745' },
  ghostBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: '#d0d7de', backgroundColor: '#fff' },
  ghostText: { color: '#34495e', fontWeight: '700', fontSize: 12 },

  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 15 },
});
