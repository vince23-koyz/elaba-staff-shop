import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  ToastAndroid,
  Alert,
  Modal,
  TextInput
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/Navigator';
import { api, API_ENDPOINTS, API_CONFIG } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from '../services/socketService';
import { useAdminData } from '../hooks/useAdminData';

type Props = NativeStackScreenProps<RootStackParamList, 'BookingDetails'>;

interface BookingDetailData {
  booking_id: number;
  booking_type: string;
  booking_date: string;
  pickup_date?: string;
  created_at?: string;
  booking_status: string;
  delivery_status?: string;
  total_amount: string;
  shop_name: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_id?: number;
  payment_id?: number;
  payment_method?: string;
  payment_status?: string;
  date?: string;
  service_id?: number;
  service_name?: string;
  service_description?: string;
}

const declineReasons = [
  'Fully booked',
  'Service unavailable',
  'Pickup unavailable',
  'Shop unavailable',
  'Other',
];

export default function BookingDetails({ navigation, route }: Props) {
  const { bookingId } = route.params;
  const [booking, setBooking] = useState<BookingDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isConfirming, setIsConfirming] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [declineMessage, setDeclineMessage] = useState('');
  const [isDeclining, setIsDeclining] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [isUpdatingDelivery, setIsUpdatingDelivery] = useState(false);
  useAdminData();

  // Update current time every minute for real-time relative date display
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Fetch booking details
  useEffect(() => {
    fetchBookingDetails();
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch booking data from your actual API
    const response = await api.get(API_ENDPOINTS.BOOKINGS.BY_ID(bookingId));
      
      if (response.data) {
        setBooking(response.data);
      } else {
        setError('Booking not found');
      }
    } catch (err) {
      console.error('Error fetching booking details:', err);
      if (err instanceof Error) {
        setError(`Failed to load booking details: ${err.message}`);
      } else {
        setError('Failed to load booking details. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return { backgroundColor: '#28a745', color: '#fff' };
      case 'paid':
        return { backgroundColor: '#28a745', color: '#fff' };
      case 'pending':
        return { backgroundColor: '#dcb035', color: '#fff' };
      case 'in progress':
        return { backgroundColor: '#ffc107', color: '#000' };
      case 'cancelled':
      case 'declined':
        return { backgroundColor: '#6c757d', color: '#fff' };
      default:
        return { backgroundColor: '#17a2b8', color: '#fff' };
    }
  };

  const formatAmount = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `₱${num.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) return '-';
      return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getCustomerFullName = (booking: BookingDetailData) => {
    return `${booking.customer_first_name} ${booking.customer_last_name}`;
  };

  const handleMessageCustomer = async () => {
    if (!booking || !booking.customer_id) {
      Alert.alert('Messaging', 'No customer profile is linked to this booking yet.');
      return;
    }

    try {
      const userData = await AsyncStorage.getItem('userData');
      const parsedUserData = userData ? JSON.parse(userData) : {};
      const adminId = parsedUserData.admin_id ?? parsedUserData.adminId;
      const shopId = parsedUserData.shop_id ?? parsedUserData.shopId;

      if (!adminId || !shopId) {
        Alert.alert('Messaging', 'Unable to open chat because shop/admin data is missing.');
        return;
      }

      navigation.navigate('Convo', {
        customerId: String(booking.customer_id),
        customerName: getCustomerFullName(booking),
        shopId: String(shopId),
        adminId: String(adminId),
      });
    } catch (error) {
      console.error('Error opening customer chat:', error);
      Alert.alert('Messaging', 'Unable to open the customer chat right now.');
    }
  };

  const getScheduledDate = (booking: BookingDetailData) => {
    const isPickup = (booking.booking_type || '').toLowerCase().includes('pick');
    return isPickup ? booking.pickup_date : booking.booking_date;
  };

  const getRelativeDate = (dateString: string) => {
    try {
      const bookingDate = new Date(dateString);
      const now = currentTime; // Use the state for real-time updates
      
      const diffTime = now.getTime() - bookingDate.getTime();
      const diffMinutes = Math.floor(diffTime / (1000 * 60));
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const diffWeeks = Math.floor(diffDays / 7);
      const diffMonths = Math.floor(diffDays / 30);
      const diffYears = Math.floor(diffDays / 365);
      
      // Real-time calculations
      if (diffMinutes < 1) {
        return 'Just now';
      } else if (diffMinutes < 60) {
        return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
      } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
      } else if (diffWeeks < 4) {
        return `${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`;
      } else if (diffMonths < 12) {
        return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
      } else {
        return `${diffYears} year${diffYears === 1 ? '' : 's'} ago`;
      }
    } catch {
      return 'Unknown date';
    }
  };

  const confirmBookingNow = async () => {
    if (!booking) return;
    setIsConfirming(true);
    try {
      // 1. Update booking status to confirmed
      const updateResponse = await api.patch(
        API_ENDPOINTS.BOOKINGS.STATUS(booking.booking_id),
        { status: 'confirmed' }
      );

      if (updateResponse.status === 200) {
        // Update local state
        setBooking(prev => prev ? { ...prev, booking_status: 'confirmed' } : null);

        // Notifications handled by backend on status update

        ToastAndroid.show('Booking confirmed successfully! Customer has been notified.', ToastAndroid.LONG);
        setShowConfirmModal(false);
        //Go back after a short delay
        setTimeout(() => {
          navigation.goBack();
        }, 1200);
      }
    } catch (error: any) {
      console.error('❌ Error confirming booking:', error);
      let errorMessage = 'Failed to confirm booking. Please try again.';
      if (error?.response?.data?.message) errorMessage = error.response.data.message;
      Alert.alert('Error', errorMessage, [{ text: 'OK' }]);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleConfirmBooking = () => {
    if (!booking) return;
    setShowConfirmModal(true);
  };

  const handleDeclineBooking = async () => {
    if (!booking || !declineReason) {
      Alert.alert('Decline Booking', 'Please select a reason for declining this booking.');
      return;
    }

    setIsDeclining(true);
    try {
      await api.patch(API_ENDPOINTS.BOOKINGS.STATUS(booking.booking_id), {
        status: 'declined',
        decline_reason: declineReason,
        decline_message: declineMessage.trim() || undefined,
      });
      setBooking(prev => prev ? { ...prev, booking_status: 'declined' } : null);
      setShowDeclineModal(false);
      ToastAndroid.show('Booking declined. Customer has been notified.', ToastAndroid.LONG);
      setTimeout(() => navigation.goBack(), 1200);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to decline booking. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsDeclining(false);
    }
  };

  const openDeclineModal = () => {
    setDeclineReason('');
    setDeclineMessage('');
    setShowDeclineModal(true);
  };

  const selectDeclineReason = (reason: string) => {
    setDeclineReason(reason);
    if (reason !== 'Other') {
      setDeclineMessage('');
    }
  };

  // Find delivery by booking id (if any)
  const fetchDeliveryForBooking = async (bookingId: number): Promise<number | null> => {
    try {
      const res = await api.get(API_ENDPOINTS.DELIVERY.BASE, {
        params: { booking_id: bookingId }
      });
      const rows = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];
      if (rows && rows[0] && rows[0].delivery_id) return rows[0].delivery_id;
      return null;
    } catch (e) {
      console.warn('⚠️ Failed to fetch delivery by booking:', e);
      return null;
    }
  };

  const updateDeliveryStatus = async (deliveryId: number, status: string) => {
    await api.patch(API_ENDPOINTS.DELIVERY.STATUS(deliveryId), { status });
    setBooking(prev => prev ? { ...prev, delivery_status: status } : prev);
  };

  const getNextPickupStatus = (status?: string) => {
    const transitions: Record<string, { status: string; label: string }> = {
      pending: { status: 'out_for_pickup', label: 'Dispatch for Pickup' },
      out_for_pickup: { status: 'picked_up', label: 'Mark Picked Up' },
      // Normalize legacy records to the current dispatch step first.
      pickup_scheduled: { status: 'out_for_pickup', label: 'Dispatch for Pickup' },
      picked_up: { status: 'at_shop', label: 'Mark At Shop' },
      ready_for_delivery: { status: 'out_for_delivery', label: 'Dispatch for Delivery' },
      out_for_delivery: { status: 'delivered', label: 'Mark Delivered' },
    };
    return transitions[(status || 'pending').toLowerCase()];
  };

  const handlePickupProgress = async () => {
    if (!booking) return;
    const next = getNextPickupStatus(booking.delivery_status);
    if (!next) return;
    setIsUpdatingDelivery(true);
    try {
      const deliveryId = await fetchDeliveryForBooking(booking.booking_id);
      if (!deliveryId) {
        Alert.alert('Pickup & Delivery', 'No delivery record found for this pickup booking.');
        return;
      }
      await updateDeliveryStatus(deliveryId, next.status);
      ToastAndroid.show(`${next.label} done`, ToastAndroid.SHORT);
    } catch (e) {
      Alert.alert('Error', 'Failed to update pickup and delivery progress');
    } finally {
      setIsUpdatingDelivery(false);
    }
  };

  const handleMarkReady = async () => {
    if (!booking) return;
    try {
      // Update booking status
  await api.patch(API_ENDPOINTS.BOOKINGS.STATUS(booking.booking_id), { status: 'processing' });
      // Update local state
      setBooking({ ...booking, booking_status: 'processing' });
      ToastAndroid.show('Started processing', ToastAndroid.SHORT);
    } catch (e) {
      Alert.alert('Error', 'Failed to mark as ready');
    }
  };

  const handleMarkReadyForDelivery = async () => {
    if (!booking || booking.booking_status?.toLowerCase() !== 'processing' || booking.delivery_status?.toLowerCase() !== 'at_shop') return;
    setIsUpdatingDelivery(true);
    try {
      const deliveryId = await fetchDeliveryForBooking(booking.booking_id);
      if (!deliveryId) {
        Alert.alert('Pickup & Delivery', 'No delivery record found for this pickup booking.');
        return;
      }
      await updateDeliveryStatus(deliveryId, 'ready_for_delivery');
      ToastAndroid.show('Ready for delivery', ToastAndroid.SHORT);
    } catch (e) {
      Alert.alert('Error', 'Failed to mark laundry ready for delivery');
    } finally {
      setIsUpdatingDelivery(false);
    }
  };

  const handleMarkCompleted = async () => {
    if (!booking) return;
    try {
  await api.patch(API_ENDPOINTS.BOOKINGS.STATUS(booking.booking_id), { status: 'completed' });
      setBooking({ ...booking, booking_status: 'completed' });
      ToastAndroid.show('Booking completed. Customer notified.', ToastAndroid.SHORT);
    } catch (e) {
      Alert.alert('Error', 'Failed to complete booking');
    }
  };

  const handleMarkAsPaid = async () => {
    if (!booking || !booking.payment_id) {
      Alert.alert('Payment', 'No payment record found for this booking.');
      return;
    }
    try {
      setIsMarkingPaid(true);
      // Update payment status to paid; backend will create/link a transaction
      await api.put(API_ENDPOINTS.PAYMENTS.STATUS(booking.payment_id), { status: 'paid' });
      setBooking(prev => prev ? { ...prev, payment_status: 'paid' } : prev);
      ToastAndroid.show('Payment marked as paid. Transaction recorded.', ToastAndroid.SHORT);
    } catch (e) {
      Alert.alert('Error', 'Failed to mark payment as paid');
    } finally {
      setIsMarkingPaid(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#4facfe', '#00d4e0']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backWrapper}>
            <Image source={require('../assets/img/back.png')} style={styles.backButton}/>
          </TouchableOpacity>
          <Text style={styles.headerText}>Booking Details</Text>
          <TouchableOpacity
            style={[styles.headerActionButton, !booking?.customer_id && styles.headerActionButtonDisabled]}
            onPress={handleMessageCustomer}
            disabled={!booking?.customer_id}
            activeOpacity={0.8}
          >
            <Image source={require('../assets/img/chats.png')} style={styles.headerActionIcon} />
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4facfe" />
          <Text style={styles.loadingText}>Loading booking details...</Text>
        </View>
      </View>
    );
  }

  if (error || !booking) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#71c5b4', '#6fa8dc']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backWrapper}>
            <Image source={require('../assets/img/back.png')} style={styles.backButton}/>
          </TouchableOpacity>
          <Text style={styles.headerText}>Booking Details</Text>
          <TouchableOpacity
            style={[styles.headerActionButton, !booking?.customer_id && styles.headerActionButtonDisabled]}
            onPress={handleMessageCustomer}
            disabled={!booking?.customer_id}
            activeOpacity={0.8}
          >
            <Image source={require('../assets/img/chats.png')} style={styles.headerActionIcon} />
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error || 'Booking not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchBookingDetails}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#71c5b4', '#6fa8dc']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backWrapper}>
          <Image source={require('../assets/img/back.png')} style={styles.backButton}/>
        </TouchableOpacity>
        <Text style={styles.headerText}>Booking Details</Text>
        <TouchableOpacity
          style={[styles.headerActionButton, !booking?.customer_id && styles.headerActionButtonDisabled]}
          onPress={handleMessageCustomer}
          disabled={!booking?.customer_id}
          activeOpacity={0.8}
        >
          <Image source={require('../assets/img/chats.png')} style={styles.headerActionIcon} />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Confirm Booking Modal */}
        <Modal
          visible={showConfirmModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowConfirmModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalIconCircle}>
                <Image source={require('../assets/img/notifications.png')} style={styles.modalIcon} />
              </View>
              <Text style={styles.modalTitle}>Confirm Booking</Text>
              <Text style={styles.modalMessage}>
                Are you sure you want to confirm this booking
                {booking ? ` for ${getCustomerFullName(booking)}?` : '?'}
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalCancel]}
                  onPress={() => setShowConfirmModal(false)}
                  disabled={isConfirming}
                >
                  <Text style={[styles.modalBtnText, styles.modalCancelText]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalConfirm]}
                  onPress={confirmBookingNow}
                  disabled={isConfirming}
                >
                  {isConfirming ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalConfirmText}>Confirm</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        <Modal
          visible={showDeclineModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDeclineModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Decline Booking</Text>
              <Text style={styles.modalMessage}>Why are you declining this booking?</Text>

              <View style={styles.reasonList}>
                {declineReasons.map(reason => (
                  <TouchableOpacity
                    key={reason}
                    style={styles.reasonOption}
                    onPress={() => selectDeclineReason(reason)}
                    disabled={isDeclining}
                  >
                    <View style={[styles.radioOuter, declineReason === reason && styles.radioOuterSelected]}>
                      {declineReason === reason && <View style={styles.radioInner} />}
                    </View>
                    <Text style={styles.reasonText}>{reason}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {declineReason === 'Other' && (
                <TextInput
                  style={styles.declineInput}
                  placeholder="Optional message..."
                  placeholderTextColor="#9ca3af"
                  value={declineMessage}
                  onChangeText={setDeclineMessage}
                  multiline
                  maxLength={300}
                  editable={!isDeclining}
                />
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalCancel]}
                  onPress={() => setShowDeclineModal(false)}
                  disabled={isDeclining}
                >
                  <Text style={[styles.modalBtnText, styles.modalCancelText]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalDecline]}
                  onPress={handleDeclineBooking}
                  disabled={isDeclining}
                >
                  {isDeclining ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalConfirmText}>Submit</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        {/* Dynamic Date Section */}
        <Text style={styles.dateHeader}>{getRelativeDate(booking.pickup_date || booking.booking_date)}</Text>

        {/* Main Booking Card */}
        <View style={styles.bookingCard}>
          {/* Header with booking ID and date */}
          <View style={styles.cardHeader}>
            <Text style={styles.bookingId}>#{`A${booking.booking_id.toString().padStart(4, '0')}`}</Text>
            <Text style={styles.requestDate}>Request Date: {formatDate(getScheduledDate(booking) || '')}</Text>
          </View>

          {/* Customer Name */}
          <Text style={styles.customerName}>{getCustomerFullName(booking)}</Text>

          {/* Service and Total */}
          <View style={styles.serviceRow}>
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceLabel}>Service:</Text>
              <Text style={styles.serviceValue}>{booking.service_name || booking.booking_type}</Text>
            </View>
            <View style={styles.totalInfo}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>{formatAmount(booking.total_amount)}</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>

            
            {booking.booking_status?.toLowerCase() === 'pending' ? (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={handleConfirmBooking}
                  disabled={isConfirming || isDeclining}
                >
                  {isConfirming ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.acceptButtonText}>Accept</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.declineButton]}
                  onPress={openDeclineModal}
                  disabled={isConfirming || isDeclining}
                >
                  <Text style={styles.declineButtonText}>Decline</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>

          {/* Pickup-specific actions */}
          {booking.booking_type?.toLowerCase().includes('pick') && (
            <>
              <View style={[styles.actionButtons, { marginTop: 8 }]}> 
                {['confirmed', 'processing'].includes((booking.booking_status || '').toLowerCase()) && getNextPickupStatus(booking.delivery_status) && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton]}
                    onPress={handlePickupProgress}
                    disabled={isUpdatingDelivery}
                  >
                    {isUpdatingDelivery ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.acceptButtonText}>{getNextPickupStatus(booking.delivery_status)?.label}</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {/* Booking progress remains independent from delivery progress. */}
              <View style={[styles.actionButtons, { marginTop: 8 }]}> 
                {booking.booking_status?.toLowerCase() === 'confirmed' && booking.delivery_status?.toLowerCase() === 'at_shop' && (
                  <TouchableOpacity style={[styles.actionButton, styles.acceptButton]} onPress={handleMarkReady}>
                    <Text style={styles.acceptButtonText}>Start Processing</Text>
                  </TouchableOpacity>
                )}
                {booking.booking_status?.toLowerCase() === 'processing' && booking.delivery_status?.toLowerCase() === 'at_shop' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton]}
                    onPress={handleMarkReadyForDelivery}
                    disabled={isUpdatingDelivery}
                  >
                    {isUpdatingDelivery ? <ActivityIndicator size="small" color="#fff" /> : (
                      <Text style={styles.acceptButtonText}>Ready for Delivery</Text>
                    )}
                  </TouchableOpacity>
                )}
                {booking.booking_status?.toLowerCase() === 'processing' && booking.delivery_status?.toLowerCase() === 'delivered' && (
                  <TouchableOpacity style={[styles.actionButton, styles.acceptButton]} onPress={handleMarkCompleted}>
                    <Text style={styles.acceptButtonText}>Mark Completed</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}

          {/* Walk-in processing actions */}
          {booking.booking_type?.toLowerCase() === 'walk in' && (
            <View style={[styles.actionButtons, { marginTop: 8 }]}> 
              {booking.booking_status?.toLowerCase() === 'confirmed' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={async () => {
                    try {
                      await api.patch(API_ENDPOINTS.BOOKINGS.STATUS(booking.booking_id), { status: 'processing' });
                      setBooking({ ...booking, booking_status: 'processing' });
                      ToastAndroid.show('Started processing (walk-in)', ToastAndroid.SHORT);
                    } catch (e) {
                      Alert.alert('Error', 'Failed to start processing');
                    }
                  }}
                >
                  <Text style={styles.acceptButtonText}>Start Processing</Text>
                </TouchableOpacity>
              )}
              {booking.booking_status?.toLowerCase() === 'processing' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={handleMarkCompleted}
                >
                  <Text style={styles.acceptButtonText}>Mark Completed</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Pickup payment is available only after delivery; preserve walk-in payment timing. */}
          {booking.payment_id &&
           (booking.payment_status || 'pending').toLowerCase() !== 'paid' &&
           (
             booking.booking_type?.toLowerCase().includes('pick')
               ? booking.delivery_status?.toLowerCase() === 'delivered'
               : ['processing', 'completed'].includes((booking.booking_status || '').toLowerCase())
           ) && (
            <View style={[styles.actionButtons, { marginTop: 8 }]}> 
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={handleMarkAsPaid}
                disabled={isMarkingPaid}
              >
                {isMarkingPaid ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.acceptButtonText}>Mark as Paid</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
          
        </View>

        {/* Additional Details Section */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Additional Information</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Booking Status:</Text>
            <View style={[styles.statusBadge, getStatusStyle(booking.booking_status)]}>
              <Text style={[styles.statusText, { color: getStatusStyle(booking.booking_status).color }]}>
                {booking.booking_status.toUpperCase()}
              </Text>
            </View>
          </View>

          {booking.booking_type?.toLowerCase().includes('pick') && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Pickup & Delivery Status:</Text>
              <View style={[styles.statusBadge, getStatusStyle(booking.delivery_status || 'pending')]}> 
                <Text style={[styles.statusText, { color: getStatusStyle(booking.delivery_status || 'pending').color }]}> 
                  {(booking.delivery_status || 'pending').replace(/_/g, ' ').toUpperCase()}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment Status:</Text>
            <View style={[styles.statusBadge, getStatusStyle(booking.payment_status || 'pending')]}>
              <Text style={[styles.statusText, { color: getStatusStyle(booking.payment_status || 'pending').color }]}>
                {(booking.payment_status || 'PENDING').toUpperCase()}
              </Text>
            </View>
          </View>

          {booking.payment_method && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment Method:</Text>
              <Text style={styles.detailValue}>{booking.payment_method}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Booking Date:</Text>
            <Text style={styles.detailValue}>{formatDate(booking.pickup_date || booking.booking_date)}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Booking Type:</Text>
            <Text style={styles.detailValue}>{booking.booking_type}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    alignItems: 'center',
  },
  modalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e8f7ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalIcon: {
    width: 34,
    height: 34,
    tintColor: '#4facfe',
    resizeMode: 'contain',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    minWidth: 120,
    alignItems: 'center',
  },
  modalCancel: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  modalConfirm: {
    backgroundColor: '#28a745',
  },
  modalDecline: {
    backgroundColor: '#dc3545',
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalCancelText: {
    color: '#374151',
  },
  modalConfirmText: {
    color: '#fff',
  },
  reasonList: {
    width: '100%',
    marginBottom: 12,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#9ca3af',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioOuterSelected: {
    borderColor: '#dc3545',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#dc3545',
  },
  reasonText: {
    fontSize: 14,
    color: '#374151',
  },
  declineInput: {
    width: '100%',
    minHeight: 76,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1f2937',
    textAlignVertical: 'top',
    marginBottom: 16,
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
  headerActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerActionButtonDisabled: {
    opacity: 0.5,
  },
  headerActionIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
    tintColor: '#fff',
  },
  headerLogo: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.2)'
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
  dateHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
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
    marginBottom: 16,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  serviceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalInfo: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  dismissButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dismissButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  viewDetailsButton: {
    backgroundColor: '#4facfe',
  },
  viewDetailsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  acceptButton: {
    backgroundColor: '#28a745',
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',  
  },
  declineButton: {
    backgroundColor: '#dc3545',
  },
  declineButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  detailsSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  notesRow: {
    paddingVertical: 12,
    borderBottomWidth: 0,
  },
  notesValue: {
    fontSize: 14,
    color: '#333',
    marginTop: 8,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorIcon: {
    fontSize: 50,
    opacity: 0.7,
    marginBottom: 16,
  },
  errorText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4facfe',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
