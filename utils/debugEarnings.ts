/**
 * Debug utilities for EarningsScreen development
 * Remove this file in production
 */

export const debugBookingData = (bookings: any[]) => {
  try {
    console.log('=== EARNINGS DEBUG ===');
    console.log('Total bookings received:', bookings?.length || 0);
    
    if (bookings && bookings.length > 0) {
      const sampleBooking = bookings[0];
      console.log('Sample booking structure:', {
        booking_id: sampleBooking.booking_id,
        total_amount: sampleBooking.total_amount,
        payment_status: sampleBooking.payment_status,
        service_name: sampleBooking.service_name,
        payment_method: sampleBooking.payment_method,
        booking_date: sampleBooking.booking_date || sampleBooking.date,
      });

      const paidBookings = bookings.filter(b => {
        const status = (b.payment_status || '').toLowerCase();
        return status === 'paid' || status === 'success' || status === 'completed' || status === 'succeeded';
      });
      
      console.log('Paid bookings:', paidBookings.length);
      console.log('Payment statuses found:', [...new Set(bookings.map(b => b.payment_status).filter(Boolean))]);
      console.log('Services found:', [...new Set(bookings.map(b => b.service_name).filter(Boolean))]);
      console.log('Payment methods found:', [...new Set(bookings.map(b => b.payment_method).filter(Boolean))]);
      
      const totalEarnings = paidBookings.reduce((sum, b) => {
        const amount = Number(b.total_amount);
        return sum + (isFinite(amount) ? amount : 0);
      }, 0);
      console.log('Total earnings calculated:', totalEarnings);
    }
    
    console.log('=== END DEBUG ===');
  } catch (error) {
    console.log('Debug error:', error);
  }
};