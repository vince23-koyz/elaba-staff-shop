// hooks/useBookingData.ts
import { useEffect, useState } from 'react';
import axios from 'axios';

export interface Booking {
  booking_id: number;
  booking_type: string;
  booking_date: string;
  booking_status: string;
  total_amount: string;
  shop_id?: number;
  shop_name: string;
  customer_first_name: string;
  customer_last_name: string;
  payment_id?: number;
  payment_method?: string;
  payment_status?: string;
  date?: string;
}

export function useBookingData(shopId?: string | null) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build the API URL with shop_id filter if provided
      let apiUrl = 'http://10.0.2.2:5000/api/bookings';
      if (shopId) {
        apiUrl += `?shop_id=${shopId}`;
      }
      
      const response = await axios.get(apiUrl);
      
      // Data is already filtered by backend, no need for additional filtering
      setBookings(response.data);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: number, newStatus: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await axios.patch(`http://10.0.2.2:5000/api/bookings/${bookingId}/status`, {
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

  useEffect(() => {
    fetchBookings();
  }, [shopId]);

  return {
    bookings,
    loading,
    error,
    refetch: fetchBookings,
    updateBookingStatus
  };
}