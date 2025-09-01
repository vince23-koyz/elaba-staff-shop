// BookingManagement.tsx
import { 
  StyleSheet, Text, View, TouchableOpacity, 
  ScrollView, Dimensions, BackHandler, ToastAndroid, Animated, RefreshControl, ActivityIndicator
} from 'react-native';
import React, { useState, useRef, useCallback } from 'react';
import LinearGradient from 'react-native-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/Navigator';
import Header from '../components/Header';
import SideMenu from '../components/SideMenu';
import { useAdminData } from '../hooks/useAdminData';
import { useBookingData } from '../hooks/useBookingData';

const { width } = Dimensions.get('window');

export default function BookingManagement() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [menuOpen, setMenuOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-width)).current;
  const backPressRef = useRef<number>(0);
  const { adminName, shopName, shopId } = useAdminData();
  const { bookings, loading, error, refetch, updateBookingStatus } = useBookingData(shopId);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [updatingBookings, setUpdatingBookings] = useState<Set<number>>(new Set());

  // Toggle Menu
  const toggleMenu = () => {
    if (menuOpen) {
      Animated.timing(slideAnim, { toValue: -width, duration: 100, useNativeDriver: false }).start(() => setMenuOpen(false));
    } else {
      setMenuOpen(true);
      Animated.timing(slideAnim, { toValue: 0, duration: 100, useNativeDriver: false }).start();
    }
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
      case 'in progress':
      case 'processing':
        return styles.statusInProgress;
      case 'pending':
        return styles.statusPending;
      case 'cancelled':
        return styles.statusCancelled;
      default:
        return styles.statusDefault;
    }
  };

  // Filter bookings based on active filter
  const filteredBookings = bookings.filter(booking => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'pending') return booking.booking_status?.toLowerCase() === 'pending';
    if (activeFilter === 'completed') return booking.booking_status?.toLowerCase() === 'completed';
    return true;
  });

  // Get counts for each status
  const pendingCount = bookings.filter(b => b.booking_status?.toLowerCase() === 'pending').length;
  const completedCount = bookings.filter(b => b.booking_status?.toLowerCase() === 'completed').length;

  // Handle booking status update
  const handleStatusUpdate = async (bookingId: number, newStatus: string) => {
    // Add to updating set to show loading state
    setUpdatingBookings(prev => new Set(prev).add(bookingId));
    
    try {
      const result = await updateBookingStatus(bookingId, newStatus);
      
      if (result?.success) {
        ToastAndroid.show('Booking status updated successfully!', ToastAndroid.SHORT);
      } else {
        ToastAndroid.show(result?.message || 'Failed to update booking status', ToastAndroid.LONG);
      }
    } catch (error) {
      ToastAndroid.show('Error updating booking status', ToastAndroid.LONG);
    } finally {
      // Remove from updating set
      setUpdatingBookings(prev => {
        const newSet = new Set(prev);
        newSet.delete(bookingId);
        return newSet;
      });
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
    }, [menuOpen])
  );

  return (
    <LinearGradient 
      colors={['#6baea5', '#5c7eb0']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      {/* Header */}
      <Header shopName={shopName} toggleMenu={toggleMenu} />

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
        
        {/* Shop Info Card */}
        {shopId && shopName && (
          <View style={styles.shopInfoCard}>
            <Text style={styles.shopInfoTitle}>📋 Booking Details</Text>
            <Text style={styles.shopInfoSubtitle}>Managing bookings for {shopName}</Text>
            
            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{bookings.length}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: '#dc3545' }]}>{pendingCount}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: '#28a745' }]}>{completedCount}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
            </View>
          </View>
        )}

        {/* Filter Toggle Buttons */}
        <View style={styles.filterContainer}>
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
              All ({bookings.length})
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
                // Handle booking details navigation if needed
              }}
            >
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                  <Text style={styles.bookingId}>#BKG-{booking.booking_id.toString().padStart(3, '0')}</Text>
                  <Text style={styles.customerName}>
                    {booking.customer_first_name} {booking.customer_last_name}
                  </Text>
                </View>
                <View style={[styles.statusBadge, getStatusStyle(booking.booking_status)]}>
                  <Text style={styles.statusText}>{booking.booking_status}</Text>
                </View>
              </View>

              {/* Card Content */}
              <View style={styles.cardContent}>
                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>📝 Booking Type</Text>
                    <Text style={styles.infoValue}>{booking.booking_type}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>🏪 Shop</Text>
                    <Text style={styles.infoValue}>{booking.shop_name}</Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>� Booking Date</Text>
                    <Text style={styles.infoValue}>{formatDate(booking.booking_date)}</Text>
                  </View>
                  {booking.payment_method && (
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>� Payment</Text>
                      <Text style={styles.infoValue}>{booking.payment_method}</Text>
                    </View>
                  )}
                </View>

                {booking.payment_status && (
                  <View style={styles.paymentStatusContainer}>
                    <Text style={styles.infoLabel}>Payment Status</Text>
                    <View style={[styles.paymentStatusBadge, 
                      booking.payment_status === 'paid' && styles.paymentPaid,
                      booking.payment_status === 'pending' && styles.paymentPending
                    ]}>
                      <Text style={styles.paymentStatusText}>{booking.payment_status}</Text>
                    </View>
                  </View>
                )}

                <View style={styles.bottomRow}>
                  <View style={styles.totalInfo}>
                    <Text style={styles.infoLabel}>💰 Total Amount</Text>
                    <Text style={styles.totalAmount}>{formatAmount(booking.total_amount)}</Text>
                  </View>
                  
                  {/* Action Buttons */}
                  {booking.booking_status?.toLowerCase() === 'pending' && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity 
                        style={[
                          styles.actionButton, 
                          styles.completeButton,
                          updatingBookings.has(booking.booking_id) && styles.disabledButton
                        ]}
                        onPress={() => handleStatusUpdate(booking.booking_id, 'completed')}
                        disabled={updatingBookings.has(booking.booking_id)}
                      >
                        {updatingBookings.has(booking.booking_id) ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.actionButtonText}>✓ Complete</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
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
  // Enhanced Shop Info Card
  shopInfoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  shopInfoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 4,
  },
  shopInfoSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#7f8c8d',
    textAlign: 'center',
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
    flex: 1,
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 25,
    backgroundColor: '#6c757d',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusCompleted: { 
    backgroundColor: '#28a745',
    shadowColor: '#28a745',
  },
  statusInProgress: { 
    backgroundColor: '#ffc107',
    shadowColor: '#ffc107',
  },
  statusPending: { 
    backgroundColor: '#dc3545',
    shadowColor: '#dc3545',
  },
  statusCancelled: { 
    backgroundColor: '#6c757d',
    shadowColor: '#6c757d',
  },
  statusDefault: { 
    backgroundColor: '#17a2b8',
    shadowColor: '#17a2b8',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#6c757d',
  },
  paymentPaid: { backgroundColor: '#28a745' },
  paymentPending: { backgroundColor: '#ffc107' },
  paymentStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
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
  completeButton: {
    backgroundColor: '#28a745',
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
});
