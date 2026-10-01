// PendingServicesScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/Navigator';
import { useBookingData } from '../hooks/useBookingData';
import { useAdminData } from '../hooks/useAdminData';

type Props = NativeStackScreenProps<RootStackParamList, 'PendingServices'>;

export default function PendingServicesScreen({ navigation }: Props) {
  const { shopId } = useAdminData();
  const { bookings, loading, refetch, updateBookingStatus } = useBookingData(shopId);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingBookings, setUpdatingBookings] = useState<Set<number>>(new Set());

  // Filter only pending bookings
  const pendingBookings = bookings.filter(booking => 
    booking.booking_status?.toLowerCase() === 'pending'
  );

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const formatAmount = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `₱${num.toFixed(2)}`;
  };

  const getCustomerFullName = (booking: any) => {
    return `${booking.customer_first_name} ${booking.customer_last_name}`;
  };

  const handleUpdateStatus = async (bookingId: number, newStatus: string) => {
    setUpdatingBookings(prev => new Set([...prev, bookingId]));
    
    try {
      const result = await updateBookingStatus(bookingId, newStatus);
      if (result.success) {
        Alert.alert('Success', `Booking status updated to ${newStatus}`);
      } else {
        Alert.alert('Error', result.message || 'Failed to update booking status');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update booking status');
    } finally {
      setUpdatingBookings(prev => {
        const newSet = new Set(prev);
        newSet.delete(bookingId);
        return newSet;
      });
    }
  };

  const handleViewDetails = (bookingId: number) => {
    navigation.navigate('BookingDetails', { bookingId });
  };

  const getTimePeriod = (dateString: string) => {
    try {
      const bookingDate = new Date(dateString);
      const now = new Date();
      const diffTime = now.getTime() - bookingDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 7) {
        return 'This Week';
      } else if (diffDays < 14) {
        return 'Last Week';
      } else if (diffDays < 30) {
        return 'This Month';
      } else {
        return 'Older';
      }
    } catch {
      return 'Unknown';
    }
  };

  const renderPendingService = (booking: any) => {
    const isUpdating = updatingBookings.has(booking.booking_id);
    
    return (
      <View key={booking.booking_id} style={styles.serviceCard}>
        {/* Time Period Header */}
        <Text style={styles.timePeriod}>{getTimePeriod(
          ['pick up', 'pickup'].includes((booking.booking_type || '').toLowerCase())
            ? booking.pickup_date || booking.booking_date
            : booking.booking_date
        )}</Text>
        
        {/* Card Header with Booking ID and Request Date */}
        <View style={styles.cardHeader}>
          <Text style={styles.bookingId}>#{`A${booking.booking_id.toString().padStart(4, '0')}`}</Text>
          <Text style={styles.requestDate}>Request Date: {formatDate(booking.created_at || booking.booking_date)}</Text>
        </View>

        {/* Customer Name */}
        <Text style={styles.customerName}>{getCustomerFullName(booking)}</Text>

        {/* Service Type */}
        <Text style={styles.serviceType}>Service: {booking.booking_type}</Text>

        {/* Pickup Label */}
        <Text style={styles.pickupLabel}>Pickup:</Text>

        {/* Bottom Row with Total and Status */}
        <View style={styles.bottomRow}>
          <Text style={styles.totalAmount}>Total: {formatAmount(booking.total_amount)}</Text>
          <View style={styles.statusSection}>
            <Text style={styles.statusText}>Status: <Text style={styles.pendingStatus}>Pending</Text></Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.confirmInlineButton, isUpdating && { opacity: 0.6 }]}
            onPress={() => handleUpdateStatus(booking.booking_id, 'confirmed')}
            disabled={isUpdating}
          >
            <Text style={styles.confirmInlineButtonText}>{isUpdating ? 'Updating…' : 'Confirm'}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.viewDetailsButton}
            onPress={() => handleViewDetails(booking.booking_id)}
            disabled={isUpdating}
          >
            <Text style={styles.viewDetailsButtonText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#ff6b35', '#f7931e']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backWrapper}>
            <Image source={require('../assets/img/back.png')} style={styles.backButton}/>
          </TouchableOpacity>
          <Text style={styles.headerText}>Pending Services</Text>
          <View style={{ width: 32 }} />
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff6b35" />
          <Text style={styles.loadingText}>Loading pending services...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#ff6b35', '#f7931e']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backWrapper}>
          <Image source={require('../assets/img/back.png')} style={styles.backButton}/>
        </TouchableOpacity>
        <Text style={styles.headerText}>Pending Services</Text>
        <View style={{ width: 32 }} />
      </LinearGradient>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#ff6b35']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Header */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>📋 Pending Services Summary</Text>
          <Text style={styles.summaryText}>
            You have {pendingBookings.length} pending service{pendingBookings.length !== 1 ? 's' : ''}. 
            Please review and update the status of these orders to ensure timely processing.
          </Text>
        </View>

        {/* Pending Services List */}
        {pendingBookings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyTitle}>No Pending Services</Text>
            <Text style={styles.emptyText}>
              Great! You don't have any pending services at the moment.
            </Text>
          </View>
        ) : (
          <View style={styles.servicesContainer}>
            <Text style={styles.sectionTitle}>Pending Orders</Text>
            {pendingBookings.map(renderPendingService)}
          </View>
        )}
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: 50,
    elevation: 3,
  },
  backWrapper: {
    padding: 8,
    borderRadius: 20,
  },
  backButton: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
    tintColor: '#fff',
  },
  headerText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summaryContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ff6b35',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  servicesContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  timePeriod: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bookingId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  requestDate: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  customerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  serviceType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  pickupLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  statusSection: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  pendingStatus: {
    color: '#ff6b35',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  reschedButton: {
    backgroundColor: '#ff6b35',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reschedButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  confirmInlineButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmInlineButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  viewDetailsButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewDetailsButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },

  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#ff6b35',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // CALENDAR STYLES
  calendar: {
    backgroundColor: '#fff',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  calendarArrow: {
    padding: 8,
    borderRadius: 20,
  },
  calendarArrowText: {
    fontSize: 24,
    color: '#ff6b35',
    fontWeight: '600',
  },
  calendarMonthYear: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  calendarWeekDays: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  calendarWeekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    paddingVertical: 8,
  },
  calendarDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%', // 7 days per week
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedDay: {
    backgroundColor: '#ff6b35',
    borderRadius: 20,
  },
  pastDay: {
    opacity: 0.3,
  },
  calendarDayText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  selectedDayText: {
    color: '#fff',
    fontWeight: '700',
  },
  pastDayText: {
    color: '#ccc',
  },
});