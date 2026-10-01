import { useMemo } from 'react';
import { FilterPeriod } from '../components/analytics/FilterTabs';
import { Booking } from './useBookingData';
import * as Icons from 'lucide-react-native';

// Types for real analytics data
export interface EarningsData {
  labels: string[];
  data: number[];
  total: number;
}

export interface AnalyticsMetrics {
  totalEarnings: number;
  totalBookings: number;
  averageEarnings: number;
  mostAvailedService: {
    name: string;
    count: number;
    revenue: number;
  };
  paymentMethods: Array<{
    method: string;
    amount: number;
    percentage: number;
    icon: keyof typeof Icons;
    color: string;
  }>;
  periodComparison: {
    current: number;
    previous: number;
    percentageChange: number;
    trend: 'up' | 'down' | 'neutral';
  };
}

export interface BookingAnalytics {
  earnings: EarningsData;
  metrics: AnalyticsMetrics;
}

/**
 * Helper function to safely parse numbers
 */
function safeParseNumber(value: any): number {
  try {
    if (value === null || value === undefined || value === '') return 0;
    
    // Handle string conversion
    let numValue: number;
    if (typeof value === 'string') {
      // Remove all non-numeric characters except decimal point and minus
      const cleaned = value.replace(/[^0-9.-]/g, '');
      numValue = parseFloat(cleaned);
    } else {
      numValue = Number(value);
    }
    
    // Return 0 for any invalid number
    if (!isFinite(numValue) || isNaN(numValue)) return 0;
    
    // Ensure positive numbers only for amounts
    return Math.max(numValue, 0);
  } catch (error) {
    console.warn('Error parsing number:', error, 'Value:', value);
    return 0;
  }
}

/**
 * Helper function to safely parse dates
 */
function safeParseDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value === 'string') {
    const datePart = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
    if (datePart) {
      const [year, month, day] = datePart.split('-').map(Number);
      if (!value.includes('T') && !value.includes(' ')) {
        return new Date(year, month - 1, day);
      }
    }
  }
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Helper function for safe division
 */
function safeDivide(numerator: number, denominator: number): number {
  // Handle edge cases
  if (!isFinite(numerator) || !isFinite(denominator) || denominator === 0) {
    return 0;
  }
  
  const result = numerator / denominator;
  
  // Ensure result is finite and reasonable
  if (!isFinite(result) || isNaN(result)) {
    return 0;
  }
  
  // Cap extremely large results
  return Math.min(result, 999999999);
}

/**
 * Custom hook to process real booking data into analytics
 * Replaces the mock data generator with actual system data
 */
export function useAnalyticsData(
  bookings: Booking[],
  period: FilterPeriod,
  loading: boolean
): BookingAnalytics & { loading: boolean } {
  
  const analyticsData = useMemo(() => {
    try {
      if (!bookings || bookings.length === 0) {
        return getEmptyAnalytics();
      }

      // Earnings represent completed, paid bookings that have not been refunded.
      const paidBookings = bookings.filter(booking => {
        try {
          const bookingStatus = (booking?.booking_status || '').toLowerCase();
          const paymentStatus = (booking?.payment_status || '').toLowerCase();
          const refundStatus = (booking?.refund_status || '').toLowerCase();
          const isPaid = ['paid', 'success', 'completed', 'succeeded'].includes(paymentStatus);
          const hasActiveRefund = ['pending', 'processing', 'succeeded'].includes(refundStatus);
          return bookingStatus === 'completed' && isPaid && !hasActiveRefund;
        } catch {
          return false;
        }
      });

      // Convert to earnings data with proper dates and safe number parsing
      const earningsData = paidBookings.map(booking => ({
        amount: safeParseNumber(booking.total_amount),
        date: safeParseDate(booking.date || booking.booking_date),
        service: booking.service_name || 'Unknown Service',
        paymentMethod: booking.payment_method || 'cash',
      })).filter((item): item is { amount: number; date: Date; service: string; paymentMethod: string } => item.date !== null);

      // Generate time-based earnings breakdown
      const earnings = generateEarningsBreakdown(earningsData, period);
      const periodEarningsData = earningsData.filter(item => isWithinPeriod(item.date, period));

      // Calculate analytics metrics
      const metrics = calculateAnalyticsMetrics(periodEarningsData);

      return { earnings, metrics };
    } catch (error) {
      console.error('Error processing analytics data:', error);
      return getEmptyAnalytics();
    }
  }, [bookings, period]);

  return {
    ...analyticsData,
    loading,
  };
}

/**
 * Generate earnings breakdown based on time period
 */
function generateEarningsBreakdown(
  earningsData: Array<{ amount: number; date: Date; service: string; paymentMethod: string }>,
  period: FilterPeriod
): EarningsData {
  const now = new Date();
  const buckets: Record<string, number> = {};

  if (period === 'day') {
    // Last 24 hours by hour
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000).getHours();
      const key = `${hour.toString().padStart(2, '0')}:00`;
      buckets[key] = 0;
    }

    earningsData.forEach(item => {
      if (isSameDay(item.date, now)) {
        const key = `${item.date.getHours().toString().padStart(2, '0')}:00`;
        if (key in buckets) {
          buckets[key] += isFinite(item.amount) ? item.amount : 0;
        }
      }
    });

    const labels = Object.keys(buckets);
    const data = labels.map(label => {
      const value = buckets[label];
      return isFinite(value) && !isNaN(value) ? Math.max(value, 0) : 0;
    });
    const total = data.reduce((sum, val) => sum + val, 0);

    return { labels, data, total };
  }

  if (period === 'week') {
    // Last 7 days
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = dayNames[date.getDay()];
      buckets[key] = 0;
    }

    earningsData.forEach(item => {
      const diffDays = Math.floor((now.getTime() - item.date.getTime()) / (24 * 60 * 60 * 1000));
      if (diffDays >= 0 && diffDays < 7) {
        const key = dayNames[item.date.getDay()];
        buckets[key] += isFinite(item.amount) ? item.amount : 0;
      }
    });

    const labels = dayNames;
    const data = labels.map(label => {
      const value = buckets[label] || 0;
      return isFinite(value) && !isNaN(value) ? Math.max(value, 0) : 0;
    });
    const total = data.reduce((sum, val) => sum + val, 0);

    return { labels, data, total };
  }

  if (period === 'month') {
    // Current month by day
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      buckets[day.toString()] = 0;
    }

    earningsData.forEach(item => {
      if (item.date.getMonth() === currentMonth && item.date.getFullYear() === currentYear) {
        const key = item.date.getDate().toString();
        buckets[key] += isFinite(item.amount) ? item.amount : 0;
      }
    });

    const labels = Object.keys(buckets);
    const data = labels.map(label => {
      const value = buckets[label];
      return isFinite(value) && !isNaN(value) ? Math.max(value, 0) : 0;
    });
    const total = data.reduce((sum, val) => sum + val, 0);

    return { labels, data, total };
  }

  // Year - last 12 months
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentYear = now.getFullYear();

  monthNames.forEach(month => {
    buckets[month] = 0;
  });

  earningsData.forEach(item => {
    if (item.date.getFullYear() === currentYear) {
      const key = monthNames[item.date.getMonth()];
      buckets[key] += isFinite(item.amount) ? item.amount : 0;
    }
  });

  const labels = monthNames;
  const data = labels.map(label => {
    const value = buckets[label];
    return isFinite(value) && !isNaN(value) ? Math.max(value, 0) : 0;
  });
  const total = data.reduce((sum, val) => sum + val, 0);

  return { labels, data, total };
}

/**
 * Calculate analytics metrics from real booking data
 */
function calculateAnalyticsMetrics(
  earningsData: Array<{ amount: number; date: Date; service: string; paymentMethod: string }>
): AnalyticsMetrics {
  const totalEarnings = earningsData.reduce((sum, item) => sum + (isFinite(item.amount) ? item.amount : 0), 0);
  const totalBookings = earningsData.length;
  const averageEarnings = totalBookings > 0 && totalEarnings > 0 ? safeDivide(totalEarnings, totalBookings) : 0;

  // Calculate most availed service
  const serviceCounts: Record<string, { count: number; revenue: number }> = {};
  earningsData.forEach(item => {
    const service = item.service || 'Unknown Service';
    if (!serviceCounts[service]) {
      serviceCounts[service] = { count: 0, revenue: 0 };
    }
    serviceCounts[service].count++;
    serviceCounts[service].revenue += item.amount;
  });

  const mostAvailedServiceEntry = Object.entries(serviceCounts)
    .sort(([,a], [,b]) => b.count - a.count)[0];
  
  const mostAvailedService = mostAvailedServiceEntry 
    ? {
        name: mostAvailedServiceEntry[0],
        count: mostAvailedServiceEntry[1].count,
        revenue: mostAvailedServiceEntry[1].revenue,
      }
    : { name: 'No services yet', count: 0, revenue: 0 };

  // Calculate payment method breakdown
  const paymentMethodCounts: Record<string, number> = {};
  earningsData.forEach(item => {
    const method = item.paymentMethod.toLowerCase();
    const normalizedMethod = method.includes('gcash') ? 'GCash' : 'Cash';
    paymentMethodCounts[normalizedMethod] = (paymentMethodCounts[normalizedMethod] || 0) + item.amount;
  });

  const paymentMethods = Object.entries(paymentMethodCounts).map(([method, amount]) => {
    const safeAmount = isFinite(amount) ? amount : 0;
    const percentage = totalEarnings > 0 ? safeDivide(safeAmount * 100, totalEarnings) : 0;
    return {
      method,
      amount: safeAmount,
      percentage: Math.min(percentage, 100), // Cap at 100%
      icon: method === 'GCash' ? 'Smartphone' as const : 'Wallet' as const,
      color: method === 'GCash' ? '#3b82f6' : '#10b981',
    };
  });

  const periodComparison = {
    current: totalEarnings,
    previous: 0,
    percentageChange: 0,
    trend: 'neutral' as const,
  };

  return {
    totalEarnings,
    totalBookings,
    averageEarnings,
    mostAvailedService,
    paymentMethods,
    periodComparison,
  };
}

function isWithinPeriod(date: Date, period: FilterPeriod): boolean {
  const now = new Date();
  if (period === 'day') return isSameDay(date, now);
  if (period === 'week') {
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
    return diffDays >= 0 && diffDays < 7;
  }
  if (period === 'month') {
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }
  return date.getFullYear() === now.getFullYear();
}

/**
 * Helper function to check if two dates are on the same day
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return date1.toDateString() === date2.toDateString();
}

/**
 * Return empty analytics when no data is available
 */
function getEmptyAnalytics(): BookingAnalytics {
  return {
    earnings: {
      labels: [],
      data: [],
      total: 0,
    },
    metrics: {
      totalEarnings: 0,
      totalBookings: 0,
      averageEarnings: 0,
      mostAvailedService: {
        name: 'No services yet',
        count: 0,
        revenue: 0,
      },
      paymentMethods: [],
      periodComparison: {
        current: 0,
        previous: 0,
        percentageChange: 0,
        trend: 'neutral',
      },
    },
  };
}