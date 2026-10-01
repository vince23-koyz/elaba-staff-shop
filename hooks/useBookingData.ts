// hooks/useBookingData.ts
import { useCallback, useEffect, useState } from 'react';
import { api, API_ENDPOINTS } from '../config/api';

export interface Booking {
  booking_id: number;
  booking_type: string;
  booking_date: string;
  pickup_date?: string;
  created_at?: string;
  delivery_status?: string;
  booking_status: string;
  total_amount: string;
  shop_id?: number;
  shop_name: string;
  customer_first_name: string;
  customer_last_name: string;
  payment_id?: number;
  payment_method?: string;
  payment_status?: string;
  refund_status?: string;
  date?: string;
  service_name?: string;
}

export interface RescheduleRequest {
  reschedule_id: number;
  booking_id: number;
  requested_date: string;
  reason?: string | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  booking_date: string;
  booking_status: string;
  customer_first_name: string;
  customer_last_name: string;
  service_name?: string;
}

export function useBookingData(shopId?: string | null) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rescheduleRequests, setRescheduleRequests] = useState<RescheduleRequest[]>([]);
  
  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // If no shopId yet, do not fetch global bookings. Keep it empty for safety.
      if (!shopId) {
        setBookings([]);
        return;
      }

      // Build the API URL with shop_id filter
      const apiUrl = `${API_ENDPOINTS.BOOKINGS.BASE}?shop_id=${shopId}`;

      const response = await api.get(apiUrl);

      // Data is already filtered by backend, no need for additional filtering
      setBookings(response.data);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  const updateBookingStatus = async (bookingId: number, newStatus: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await api.patch(API_ENDPOINTS.BOOKINGS.STATUS(bookingId), {
        status: newStatus
      });

      if (response.status === 200) {
        // Update local state immediately for better UX
        setBookings(prev => 
          prev.map(booking => 
            booking.booking_id === bookingId 
              ? { ...booking, booking_status: newStatus }
              : booking
          )
        );
        
        // Optionally refetch to ensure data consistency
        // await fetchBookings();
        
        return { success: true, message: 'Booking status updated successfully' };
      }
      
      return { success: false, message: 'Failed to update booking status' };
    } catch (err) {
      console.error('Error updating booking status:', err);
      return { 
        success: false, 
        message: 'Failed to update booking status. Please try again.' 
      };
    }
  };

  const fetchRescheduleRequests = useCallback(async () => {
    if (!shopId) {
      setRescheduleRequests([]);
      return;
    }
    try {
      const response = await api.get(`${API_ENDPOINTS.BOOKINGS.RESCHEDULES}?shop_id=${shopId}`);
      setRescheduleRequests(response.data || []);
    } catch (err) {
      console.error('Error fetching reschedule requests:', err);
    }
  }, [shopId]);

  const reviewReschedule = async (requestId: number, action: 'approve' | 'reject') => {
    if (!shopId) return { success: false, message: 'Shop is not available' };
    try {
      const endpoint = action === 'approve'
        ? API_ENDPOINTS.BOOKINGS.APPROVE_RESCHEDULE(requestId)
        : API_ENDPOINTS.BOOKINGS.REJECT_RESCHEDULE(requestId);
      await api.patch(endpoint, { shop_id: shopId });
      await Promise.all([fetchRescheduleRequests(), fetchBookings()]);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err?.response?.data?.message || 'Failed to review reschedule request' };
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  return {
    bookings,
    loading,
    error,
    refetch: fetchBookings,
    updateBookingStatus,
    rescheduleRequests,
    reviewReschedule,
  };
}