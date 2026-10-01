import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native'
import React from 'react'
import { useBookingData, Booking } from '../hooks/useBookingData'

interface RecentActivityBookingsProps {
  shopId?: string | null;
  refreshKey?: number;
  limit?: number;
  onBookingPress?: (booking: Booking) => void;
  filterByActivity?: 'all' | 'received' | 'cancelled' | 'rescheduled' | 'completed' | 'confirmed';
}

export default function RecentActivityBookings({ 
  shopId, 
  refreshKey,
  limit = 5,
  onBookingPress,
  filterByActivity = 'all'
}: RecentActivityBookingsProps) {
  const { bookings, loading, error, refetch } = useBookingData(shopId);

  React.useEffect(() => {
    if (refreshKey === undefined) return;
    refetch();
  }, [refreshKey, refetch]);

  // Get recent bookings (filtered by activity type and limited by limit prop)
  const recentBookings = bookings
    .filter(booking => {
      if (filterByActivity === 'all') return true;
      const activity = getActivityType(booking);
      return activity.type === filterByActivity;
    })
    .sort((a, b) => new Date(b.created_at || b.pickup_date || b.booking_date).getTime() - new Date(a.created_at || a.pickup_date || a.booking_date).getTime())
    .slice(0, limit);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return '#28a745';
      case 'pending': return '#ffc107';
      case 'cancelled': return '#dc3545';
      case 'confirmed': return '#17a2b8';
      default: return '#6c757d';
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getScheduledDate = (booking: Booking) => {
    const isPickup = ['pick up', 'pickup'].includes((booking.booking_type || '').toLowerCase());
    return (isPickup ? booking.pickup_date : booking.booking_date) || booking.booking_date || booking.pickup_date || '';
  };

  const getActivityType = (booking: Booking) => {
    const status = booking.booking_status.toLowerCase();
    const bookingDate = new Date(booking.created_at || getScheduledDate(booking));
    const now = new Date();
    const timeDiff = now.getTime() - bookingDate.getTime();
    const hoursDiff = timeDiff / (1000 * 3600);

    // If booking is very recent (within 2 hours) and status is pending/confirmed
    if (hoursDiff <= 2 && (status === 'pending' || status === 'confirmed')) {
      return {
        type: 'received',
        label: 'Booking Received',
        icon: '📩',
        color: '#28a745'
      };
    }
    if (status === 'cancelled') {
      return {
        type: 'cancelled',
        label: 'Booking Cancelled',
        icon: '❌',
        color: '#dc3545'
      };
    }
    if (booking.booking_type && booking.booking_type.toLowerCase().includes('reschedule')) {
      return {
        type: 'rescheduled',
        label: 'Booking Rescheduled',
        icon: '📅',
        color: '#ffc107'
      };
    }
    if (status === 'completed') {
      return {
        type: 'completed',
        label: 'Booking Completed',
        icon: '✅',
        color: '#28a745'
      };
    }
    if (status === 'confirmed') {
      return {
        type: 'confirmed',
        label: 'Booking Confirmed',
        icon: '✓',
        color: '#17a2b8'
      };
    }
    return {
      type: 'received',
      label: 'Booking Received',
      icon: '📩',
      color: '#6c757d'
    };
  };

  if (loading) {
    return (
      <View style={styles.statusContainer}>
        <ActivityIndicator size="large" color="#6baea5" />
        <Text style={styles.statusText}>Loading recent bookings...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.statusContainer}>
        <Text style={[styles.statusText, {color: '#dc3545'}]}>Error loading bookings</Text>
        <Text style={styles.statusSubtext}>{error}</Text>
      </View>
    );
  }

  if (recentBookings.length === 0) {
    return (
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>No recent bookings found</Text>
        <Text style={styles.statusSubtext}>New bookings will appear here</Text>
      </View>
    );
  }

  // Vertical scroll for bookings
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 8, paddingHorizontal: 12 }}
      showsVerticalScrollIndicator={false}
    >
      {recentBookings.map((booking, idx) => {
        const activity = getActivityType(booking);
        return (
          <TouchableOpacity
            key={`${booking.booking_id}-${idx}`}
            style={styles.bookingCard}
            onPress={() => onBookingPress?.(booking)}
            activeOpacity={0.7}
          >
            {/* Customer Profile Picture with Activity Badge */}
            <View style={styles.profileContainer}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>
                  {getInitials(booking.customer_first_name, booking.customer_last_name)}
                </Text>
              </View>
              <View style={[styles.activityBadge, { backgroundColor: activity.color }]}> 
                <Text style={styles.activityBadgeIcon}>{activity.icon}</Text>
              </View>
            </View>
            <View style={styles.bookingInfo}>
              <View style={styles.bookingHeader}>
                <Text style={styles.activityLabel}>
                  {activity.label} - #{booking.booking_id}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.booking_status) }]}> 
                  <Text style={styles.badgeStatusText}>{booking.booking_status}</Text>
                </View>
              </View>
              <Text style={styles.bookingDetails}>
                {`${booking.customer_first_name} ${booking.customer_last_name} - ${booking.booking_type} - ${formatDate(getScheduledDate(booking))}`}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    flex: 1,
    minHeight: 260,
  },
  statusContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minHeight: 260,
    backgroundColor: '#fff',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  statusSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  bookingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 0,
    marginBottom: 12,
    width: '100%',
    alignSelf: 'stretch',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profileContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatarContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#6baea5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  activityBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fff',
  },
  activityBadgeIcon: {
    fontSize: 7,
  },
  activityIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  activityIcon: {
    fontSize: 20,
  },
  bookingInfo: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  bookingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  activityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
    flex: 1,
    letterSpacing: 0.1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
    minWidth: 48,
    alignItems: 'center',
  },
  badgeStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 1,
    letterSpacing: 0.05,
  },
  bookingDetails: {
    fontSize: 13,
    color: '#555',
    marginBottom: 1,
    fontWeight: '400',
  },
  bookingDate: {
    fontSize: 11,
    color: '#aaa',
    fontWeight: '400',
    marginTop: 1,
  },
})