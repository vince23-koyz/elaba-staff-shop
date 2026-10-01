// BookingManagement.tsx
import { 
  StyleSheet, Text, View, TouchableOpacity, 
  ScrollView, BackHandler, ToastAndroid, RefreshControl, ActivityIndicator
} from 'react-native';
import React, { useState, useRef, useCallback } from 'react';
import LinearGradient from 'react-native-linear-gradient';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/Navigator';
import Header from '../../components/Header';
import SideMenu from '../../components/SideMenu';
import { useAdminData } from '../../hooks/useAdminData';
import { useBookingData } from '../../hooks/useBookingData';
import Icons from '../../components/Icons';
import ManageHeader from '../../components/ManageHeader';
import { api, API_ENDPOINTS } from '../../config/api';

export default function BookingManagement() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<any>();
  const [menuOpen, setMenuOpen] = useState(false);
  const backPressRef = useRef<number>(0);
  const { adminName, shopName, shopId } = useAdminData();
  const { bookings, loading, error, refetch, updateBookingStatus } = useBookingData(shopId);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'confirmed' | 'processing' | 'completed' | 'cancelled'>(
    route.params?.initialFilter || 'all'
  );
  // Removed type toggle state to simplify filters
  const [updatingBookings, setUpdatingBookings] = useState<Set<number>>(new Set());

  // Toggle Menu
  const toggleMenu = () => {
    setMenuOpen(prev => !prev);
  };

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Format amount
  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    return `₱${num.toFixed(2)}`;
  };

  // Get status color
  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return styles.statusCompleted;
      case 'confirmed':
        return styles.statusConfirmed;
      case 'ready':
        return styles.statusReady;
      case 'in progress':
      case 'processing':
        return styles.statusInProgress;
      case 'in_transit':
      case 'in transit':
      case 'out_for_delivery':
        return styles.statusInTransit;
      case 'pending':
        return styles.statusPending;
      case 'cancelled':
        return styles.statusCancelled;
      default:
        return styles.statusDefault;
    }
  };

  // Ensure we only handle bookings for this shop
  const bookingsForShop = shopId
    ? bookings.filter(b => String(b.shop_id) === String(shopId))
    : [];

  // Helper to normalize type into one of inshop | pickup | delivery
  const normalizeType = (bookingType?: string): 'inshop' | 'pickup' | 'delivery' => {
    const t = (bookingType || '').toLowerCase();
    if (t.includes('pick')) return 'pickup';
    if (t.includes('deliver')) return 'delivery';
    return 'inshop';
  };

  // Filter bookings based on active status filter and type filter
  const filteredBookings = bookingsForShop.filter(booking => {
    const matchesStatus =
      activeFilter === 'all' ||
      (activeFilter === 'pending' && booking.booking_status?.toLowerCase() === 'pending') ||
      (activeFilter === 'confirmed' && booking.booking_status?.toLowerCase() === 'confirmed') ||
      (activeFilter === 'processing' && ['processing', 'in progress'].includes(booking.booking_status?.toLowerCase())) ||
      (activeFilter === 'completed' && booking.booking_status?.toLowerCase() === 'completed') ||
      (activeFilter === 'cancelled' && booking.booking_status?.toLowerCase() === 'cancelled');
    return matchesStatus;
  });

  // Get counts for each status
  const pendingCount = bookingsForShop.filter(b => b.booking_status?.toLowerCase() === 'pending').length;
  const confirmedCount = bookingsForShop.filter(b => b.booking_status?.toLowerCase() === 'confirmed').length;
  const processingCount = bookingsForShop.filter(b => ['processing', 'in progress'].includes(b.booking_status?.toLowerCase())).length;
  const completedCount = bookingsForShop.filter(b => b.booking_status?.toLowerCase() === 'completed').length;
  const cancelledCount = bookingsForShop.filter(b => b.booking_status?.toLowerCase() === 'cancelled').length;
  // Removed typeCounts as type filtering UI is removed

  // (old handleStatusUpdate removed in favor of contextual actions)

  // Delivery helpers
  const fetchDeliveryForBooking = async (bookingId: number): Promise<number | null> => {
    try {
      const res = await api.get(API_ENDPOINTS.DELIVERY.BASE, { params: { booking_id: bookingId } });
      const rows = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];
      if (rows && rows[0] && rows[0].delivery_id) return rows[0].delivery_id as number;
      return null;
    } catch (e) {
      console.warn('Failed to fetch delivery by booking:', e);
      return null;
    }
  };

  const handleMarkReady = async (bookingId: number) => {
    setUpdatingBookings(prev => new Set(prev).add(bookingId));
    try {
      const result = await updateBookingStatus(bookingId, 'processing');
      if (result?.success) {
        ToastAndroid.show('Started processing', ToastAndroid.SHORT);
      }
    } catch (e) {
      ToastAndroid.show('Failed to update status', ToastAndroid.LONG);
    } finally {
      setUpdatingBookings(prev => { const ns = new Set(prev); ns.delete(bookingId); return ns; });
    }
  };

  const handleDispatchDelivery = async (bookingId: number) => {
    setUpdatingBookings(prev => new Set(prev).add(bookingId));
    try {
      const deliveryId = await fetchDeliveryForBooking(bookingId);
      if (deliveryId) {
        await api.patch(API_ENDPOINTS.DELIVERY.STATUS(deliveryId), { status: 'out_for_delivery' });
        ToastAndroid.show('Delivery dispatched', ToastAndroid.SHORT);
      } else {
        ToastAndroid.show('No delivery found for booking', ToastAndroid.LONG);
      }
    } catch (e) {
      ToastAndroid.show('Failed to dispatch delivery', ToastAndroid.LONG);
    } finally {
      setUpdatingBookings(prev => { const ns = new Set(prev); ns.delete(bookingId); return ns; });
    }
  };

  const handleUpdatePickupProgress = async (bookingId: number, deliveryStatus?: string) => {
    const nextStatus: Record<string, { status: string; label: string }> = {
      pending: { status: 'out_for_pickup', label: 'Dispatch for Pickup' },
      out_for_pickup: { status: 'picked_up', label: 'Mark Picked Up' },
      pickup_scheduled: { status: 'out_for_pickup', label: 'Dispatch for Pickup' },
      picked_up: { status: 'at_shop', label: 'Mark At Shop' },
      at_shop: { status: 'ready_for_delivery', label: 'Ready for Delivery' },
      ready_for_delivery: { status: 'out_for_delivery', label: 'Dispatch' },
      out_for_delivery: { status: 'delivered', label: 'Mark Delivered' },
    };
    const action = nextStatus[(deliveryStatus || 'pending').toLowerCase()];
    if (!action) return;
    setUpdatingBookings(prev => new Set(prev).add(bookingId));
    try {
      const deliveryId = await fetchDeliveryForBooking(bookingId);
      if (!deliveryId) {
        ToastAndroid.show('No delivery found for booking', ToastAndroid.LONG);
        return;
      }
      await api.patch(API_ENDPOINTS.DELIVERY.STATUS(deliveryId), { status: action.status });
      await refetch();
      ToastAndroid.show(`${action.label} done`, ToastAndroid.SHORT);
    } catch (e) {
      ToastAndroid.show('Failed to update pickup progress', ToastAndroid.LONG);
    } finally {
      setUpdatingBookings(prev => { const ns = new Set(prev); ns.delete(bookingId); return ns; });
    }
  };

  const getPickupProgressAction = (deliveryStatus?: string, bookingStatus?: string) => {
    const labels: Record<string, string> = {
      pending: 'Dispatch for Pickup',
      out_for_pickup: 'Mark Picked Up',
      pickup_scheduled: 'Dispatch for Pickup',
      picked_up: 'Mark At Shop',
      at_shop: bookingStatus?.toLowerCase() === 'processing' ? 'Ready for Delivery' : '',
      ready_for_delivery: 'Dispatch',
      out_for_delivery: 'Mark Delivered',
    };
    return labels[(deliveryStatus || 'pending').toLowerCase()];
  };

  const handleCompleteOrder = async (bookingId: number) => {
    setUpdatingBookings(prev => new Set(prev).add(bookingId));
    try {
      const result = await updateBookingStatus(bookingId, 'completed');
      if (result?.success) {
        ToastAndroid.show('Booking completed', ToastAndroid.SHORT);
      }
    } catch (e) {
      ToastAndroid.show('Failed to complete booking', ToastAndroid.LONG);
    } finally {
      setUpdatingBookings(prev => { const ns = new Set(prev); ns.delete(bookingId); return ns; });
    }
  };

  // Double back press to exit / close menu
  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        if (menuOpen) {
          toggleMenu();
          return true;
        }
        const now = Date.now();
        if (backPressRef.current && now - backPressRef.current < 2000) {
          BackHandler.exitApp();
          return true;
        }
        backPressRef.current = now;
        ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
        return true;
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
      return () => backHandler.remove();
    }, [menuOpen, toggleMenu])
  );

  return (
    <LinearGradient 
      colors={['#71c5b4', '#6fa8dc']}
      start={{ x: 0, y: 0 }} 
      end={{ x: 1, y: 0 }} 
      style={styles.container}
    >
      {/* Header */}
      <Header shopName={shopName} toggleMenu={toggleMenu} />

        {/* Quick manage links (shared) */}
        <ManageHeader active="booking" />

      {/* Content */}
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#fff']}
            tintColor="#fff"
          />
        }
      >
        <Text style={styles.sectionTitle}>Booking Management</Text>
        
        {/* Filters */}
        <View style={styles.filtersCard}>
          {/* Status */}
          <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.filterContainer}>
          <TouchableOpacity 
            style={[
              styles.filterButton, 
              activeFilter === 'all' && styles.filterButtonActive
            ]}
            onPress={() => setActiveFilter('all')}
          >
            <Text style={[
              styles.filterButtonText,
              activeFilter === 'all' && styles.filterButtonTextActive
            ]}>
              All ({bookingsForShop.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'confirmed' && styles.filterButtonActive]}
            onPress={() => setActiveFilter('confirmed')}
          >
            <Text style={[styles.filterButtonText, activeFilter === 'confirmed' && styles.filterButtonTextActive]}>
              Confirmed ({confirmedCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'processing' && styles.filterButtonActive]}
            onPress={() => setActiveFilter('processing')}
          >
            <Text style={[styles.filterButtonText, activeFilter === 'processing' && styles.filterButtonTextActive]}>
              Processing ({processingCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.filterButton, 
              activeFilter === 'pending' && styles.filterButtonActive
            ]}
            onPress={() => setActiveFilter('pending')}
          >
            <Text style={[
              styles.filterButtonText,
              activeFilter === 'pending' && styles.filterButtonTextActive
            ]}>
              Pending ({pendingCount})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.filterButton, 
              activeFilter === 'completed' && styles.filterButtonActive
            ]}
            onPress={() => setActiveFilter('completed')}
          >
            <Text style={[
              styles.filterButtonText,
              activeFilter === 'completed' && styles.filterButtonTextActive
            ]}>
              Completed ({completedCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'cancelled' && styles.filterButtonActive]}
            onPress={() => setActiveFilter('cancelled')}
          >
            <Text style={[styles.filterButtonText, activeFilter === 'cancelled' && styles.filterButtonTextActive]}>
              Cancelled ({cancelledCount})
            </Text>
          </TouchableOpacity>
          </ScrollView>

          {/* Type filter removed as requested */}
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Loading bookings...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={refetch}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : filteredBookings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>📋 No bookings found</Text>
            <Text style={styles.emptySubText}>
              {activeFilter === 'all' 
                ? (shopId 
                    ? `No bookings found for ${shopName}. Bookings will appear here when customers make orders for this shop.`
                    : 'No bookings found. Bookings will appear here when customers make orders.'
                  )
                : `No ${activeFilter} bookings found.`
              }
            </Text>
          </View>
        ) : (
          filteredBookings.map((booking) => (
            <TouchableOpacity 
              style={styles.bookingCard} 
              key={booking.booking_id} 
              activeOpacity={0.8}
              onPress={() => {
                navigation.navigate('BookingDetails', { bookingId: booking.booking_id });
              }}
            >
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                  <Text style={styles.bookingId}>#BKG-{booking.booking_id}</Text>
                  <Text style={styles.customerName}>
                    {booking.customer_first_name} {booking.customer_last_name}
                  </Text>
                </View>
                <View style={[styles.statusBadge, getStatusStyle(booking.booking_status)]}>
                  <Text style={styles.statusText}>{booking.booking_status}</Text>
                </View>
              </View>

              {/* Enhanced Card Content Layout */}
              <View style={[styles.cardContent, {paddingBottom: 10}]}> 
                {/* Booking Type, Service & Date Row */}
                <View style={[styles.infoRow, {marginBottom: 6}]}> 
                  <View style={[styles.infoItem, {flex: 1}]}> 
                    <View style={styles.labelRow}> 
                      <Icons.File size={14} color="#6c757d" /> 
                      <Text style={styles.infoLabel}>Type</Text> 
                    </View> 
                    <Text style={styles.infoValue}>{booking.booking_type}</Text> 
                  </View> 
                  <View style={[styles.infoItem, {flex: 1}]}> 
                    <View style={styles.labelRow}> 
                      <Icons.Calendar size={14} color="#6c757d" /> 
                      <Text style={styles.infoLabel}>Date</Text> 
                    </View> 
                    <Text style={styles.infoValue}>{formatDate(
                      ['pick up', 'pickup'].includes((booking.booking_type || '').toLowerCase())
                        ? booking.pickup_date || booking.booking_date
                        : booking.booking_date
                    )}</Text>
                  </View> 
                </View>


                {/* Payment Method & Status Row */}
                <View style={[styles.infoRow, {marginBottom: 6}]}> 
                  {booking.payment_method && (
                    <View style={[styles.infoItem, {flex: 1}]}> 
                      <View style={styles.labelRow}> 
                        <Icons.Card size={14} color="#6c757d" /> 
                        <Text style={styles.infoLabel}>Payment</Text> 
                      </View> 
                      <Text style={styles.infoValue}>{booking.payment_method}</Text> 
                    </View> 
                  )}
                  {booking.payment_status && (
                    <View style={[styles.infoItem, {flex: 1}]}> 
                      <View style={styles.labelRow}> 
                        <Icons.Wallet size={14} color="#6c757d" /> 
                        <Text style={styles.infoLabel}>Pay Status</Text> 
                      </View> 
                      <View style={[styles.paymentStatusBadge, 
                        booking.payment_status === 'paid' && styles.paymentPaid,
                        booking.payment_status === 'pending' && styles.paymentPending
                      ]}>
                        <Text style={styles.paymentStatusText}>{booking.payment_status}</Text>
                      </View> 
                    </View> 
                  )}
                </View>

                {/* Total & Action Row */}
                <View style={[styles.bottomRow, {marginTop: 0, paddingTop: 8}]}> 
                  <View style={styles.totalInfo}> 
                    <View style={styles.labelRow}> 
                      <Icons.Wallet size={14} color="#6c757d" /> 
                      <Text style={styles.infoLabel}>Total</Text> 
                    </View> 
                    <Text style={styles.totalAmount}>{formatAmount(booking.total_amount)}</Text> 
                  </View> 
                  {/* Action Buttons (contextual for type + status) */}
                  <View style={styles.actionButtons}>
                    {/* Pickup flow */}
                    {normalizeType(booking.booking_type) === 'pickup' && booking.booking_status?.toLowerCase() === 'confirmed' && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.readyButton, updatingBookings.has(booking.booking_id) && styles.disabledButton]}
                        onPress={() => handleMarkReady(booking.booking_id)}
                        disabled={updatingBookings.has(booking.booking_id)}
                      >
                        {updatingBookings.has(booking.booking_id) ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.actionButtonText}>Start Processing</Text>
                        )}
                      </TouchableOpacity>
                    )}
                    {normalizeType(booking.booking_type) === 'pickup' && booking.booking_status?.toLowerCase() === 'processing' && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.completeButton, updatingBookings.has(booking.booking_id) && styles.disabledButton]}
                        onPress={() => handleCompleteOrder(booking.booking_id)}
                        disabled={updatingBookings.has(booking.booking_id)}
                      >
                        {updatingBookings.has(booking.booking_id) ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.actionButtonText}>Complete</Text>
                        )}
                      </TouchableOpacity>
                    )}

                    {/* Pickup & delivery progress is separate from booking status. */}
                    {normalizeType(booking.booking_type) === 'pickup' && ['confirmed', 'processing'].includes((booking.booking_status || '').toLowerCase()) && getPickupProgressAction(booking.delivery_status, booking.booking_status) && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.dispatchButton, updatingBookings.has(booking.booking_id) && styles.disabledButton]}
                        onPress={() => handleUpdatePickupProgress(booking.booking_id, booking.delivery_status)}
                        disabled={updatingBookings.has(booking.booking_id)}
                      >
                        {updatingBookings.has(booking.booking_id) ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.actionButtonText}>
                            {getPickupProgressAction(booking.delivery_status, booking.booking_status)}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}

                    {/* Delivery flow */}
                    {normalizeType(booking.booking_type) === 'delivery' && booking.booking_status?.toLowerCase() === 'confirmed' && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.dispatchButton, updatingBookings.has(booking.booking_id) && styles.disabledButton]}
                        onPress={() => handleDispatchDelivery(booking.booking_id)}
                        disabled={updatingBookings.has(booking.booking_id)}
                      >
                        {updatingBookings.has(booking.booking_id) ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.actionButtonText}>Dispatch</Text>
                        )}
                      </TouchableOpacity>
                    )}
                    {normalizeType(booking.booking_type) === 'delivery' && ['in_transit','in transit','ready'].includes((booking.booking_status || '').toLowerCase()) && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.completeButton, updatingBookings.has(booking.booking_id) && styles.disabledButton]}
                        onPress={() => handleCompleteOrder(booking.booking_id)}
                        disabled={updatingBookings.has(booking.booking_id)}
                      >
                        {updatingBookings.has(booking.booking_id) ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.actionButtonText}>Complete Delivery</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Side Menu Overlay */}
      {menuOpen && (
        <TouchableOpacity style={styles.overlay} onPress={toggleMenu} activeOpacity={1} />
      )}

      {/* Side Menu */}
      <SideMenu
        navigation={navigation}
        menuOpen={menuOpen}
        toggleMenu={toggleMenu}
        adminName={adminName}
      />
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
  scrollContent: { padding: 16, paddingBottom: 60 },
  sectionTitle: { 
    fontSize: 22, 
    fontWeight: '700', 
    color: '#fff', 
    marginBottom: 16,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  // Quick Links (segmented)
  quickLinksSection: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e6edf2',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickLinksTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6c757d',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  segmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4f8fb',
    borderWidth: 1,
    borderColor: '#dbe7f1',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  segmentIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef6ff',
    borderWidth: 1,
    borderColor: '#d6e6ff',
    marginRight: 8,
  },
  segmentText: {
    color: '#2c3e50',
    fontWeight: '700',
    fontSize: 13,
  },
  // Filters Card
  filtersCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e6edf2',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  // Shop Filter Info
  shopFilterInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  shopFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    textAlign: 'center',
  },
  // Compact Shop Info Card
  compactShopInfoCard: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
    flexDirection: 'column',
    alignItems: 'center',
    shadowColor: '#3498db',
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },

  compactStatsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18,
    marginBottom: 4,
  },
  compactStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f4f8fb',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  compactStatNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2c3e50',
    marginLeft: 2,
  },
  compactSummaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#3498db',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 6,
    backgroundColor: '#fff',
  },
  compactSummaryBtnText: {
    color: '#3498db',
    fontWeight: '700',
    fontSize: 13,
  },
  // Stats Section
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7f8c8d',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e9ecef',
  },
  scheduledButton: {
    marginTop: 14,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#3498db',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  scheduledButtonText: { color: '#fff', fontWeight: '700' },
  // Filter Container
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  filterButton: {
    flex: 0,
    minWidth: 98,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 2,
    backgroundColor: 'transparent',
  },
  filterButtonActive: {
    backgroundColor: '#3498db',
    shadowColor: '#3498db',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7f8c8d',
    textAlign: 'center',
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  // Loading States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 12,
    fontWeight: '500',
  },
  // Error States
  errorContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 20,
    marginVertical: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Empty State
  emptyContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 30,
    marginVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Booking Cards
  bookingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f2f5',
    transform: [{ scale: 1 }],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerLeft: {
    flex: 1,
  },
  bookingId: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#2c3e50',
    marginBottom: 2,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34495e',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#f4f6f8',
    borderWidth: 1,
    borderColor: '#d9dee3',
    borderLeftWidth: 3,
    alignSelf: 'flex-start',
  },
  statusCompleted: { 
    borderLeftColor: '#28a745',
  },
  statusConfirmed: {
    borderLeftColor: '#3498db',
  },
  statusReady: {
    borderLeftColor: '#6f42c1',
  },
  statusInProgress: { 
    borderLeftColor: '#d39e00',
  },
  statusInTransit: {
    borderLeftColor: '#fd7e14',
  },
  statusPending: { 
    borderLeftColor: '#dc3545',
  },
  statusCancelled: { 
    borderLeftColor: '#6c757d',
  },
  statusDefault: { 
    borderLeftColor: '#17a2b8',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#34495e',
    textAlign: 'center',
  },
  cardContent: {
    padding: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoItem: {
    flex: 1,
    marginRight: 8,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6c757d',
    textTransform: 'uppercase',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2c3e50',
  },
  // Payment Status
  paymentStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  paymentStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f4f6f8',
    borderWidth: 1,
    borderColor: '#d9dee3',
    borderLeftWidth: 3,
  },
  paymentPaid: { borderLeftColor: '#28a745' },
  paymentPending: { borderLeftColor: '#d39e00' },
  paymentStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#34495e',
    textTransform: 'uppercase',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  totalInfo: {
    flex: 1,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#27ae60',
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: '#27ae60',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  readyButton: {
    backgroundColor: '#ffc107',
  },
  completeButton: {
    backgroundColor: '#28a745',
  },
  dispatchButton: {
    backgroundColor: '#17a2b8',
  },
  disabledButton: {
    backgroundColor: '#95a5a6',
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 15,
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
  scheduledSummaryButton: {
    marginBottom: 18,
    marginTop: 2,
    alignSelf: 'stretch',
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#3498db',
    shadowOpacity: 0.13,
    shadowRadius: 8,
  },
  scheduledSummaryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: 14,
    width: '100%',
  },
  scheduledSummaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.13)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginLeft: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
    marginTop: 2,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: '#f4f8fb',
    borderWidth: 2,
    borderColor: '#3498db',
    marginHorizontal: 2,
    elevation: 2,
    shadowColor: '#3498db',
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  toggleActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  toggleText: {
    fontWeight: '700',
    fontSize: 15,
    marginLeft: 8,
    color: '#fff',
    letterSpacing: 0.3,
  },
});
