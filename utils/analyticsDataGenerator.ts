import { FilterPeriod } from '../components/analytics/FilterTabs';
import * as Icons from 'lucide-react-native';

// Types for analytics data
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

// Mock data generator for different periods
export class AnalyticsDataGenerator {
  
  /**
   * Generate mock analytics data for the specified period
   * This structure makes it easy to replace with real API data later
   */
  static generateMockData(period: FilterPeriod): BookingAnalytics {
    const now = new Date();
    
    switch (period) {
      case 'day':
        return this.generateDayData(now);
      case 'week':
        return this.generateWeekData(now);
      case 'month':
        return this.generateMonthData(now);
      case 'year':
        return this.generateYearData(now);
      default:
        return this.generateDayData(now);
    }
  }

  private static generateDayData(now: Date): BookingAnalytics {
    // Generate hourly data for the last 24 hours
    const labels: string[] = [];
    const data: number[] = [];
    const hoursBack = 24;

    for (let i = hoursBack - 1; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000).getHours();
      labels.push(`${hour.toString().padStart(2, '0')}:00`);
      
      // Mock data: higher earnings during business hours (9 AM - 9 PM)
      const isBusinessHour = hour >= 9 && hour <= 21;
      const baseAmount = isBusinessHour ? Math.random() * 2000 + 500 : Math.random() * 500;
      data.push(Math.round(baseAmount));
    }

    const total = data.reduce((sum, val) => sum + val, 0);
    
    return {
      earnings: { labels, data, total },
      metrics: this.generateMetrics(total, 'day'),
    };
  }

  private static generateWeekData(now: Date): BookingAnalytics {
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const data: number[] = [];

    // Generate data for last 7 days
    for (let i = 6; i >= 0; i--) {
      const dayOfWeek = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).getDay();
      // Higher earnings on weekends and middle of week
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isMidWeek = dayOfWeek >= 2 && dayOfWeek <= 4;
      
      let multiplier = 1;
      if (isWeekend) multiplier = 1.3;
      else if (isMidWeek) multiplier = 1.1;
      
      data.push(Math.round((Math.random() * 5000 + 2000) * multiplier));
    }

    const total = data.reduce((sum, val) => sum + val, 0);
    
    return {
      earnings: { labels, data, total },
      metrics: this.generateMetrics(total, 'week'),
    };
  }

  private static generateMonthData(now: Date): BookingAnalytics {
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const labels: string[] = [];
    const data: number[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      labels.push(day.toString());
      
      // Higher earnings on weekends and paydays (15th and end of month)
      const date = new Date(now.getFullYear(), now.getMonth(), day);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const isPayday = day === 15 || day >= 28;
      
      let multiplier = 1;
      if (isPayday) multiplier = 1.5;
      else if (isWeekend) multiplier = 1.2;
      
      data.push(Math.round((Math.random() * 3000 + 1000) * multiplier));
    }

    const total = data.reduce((sum, val) => sum + val, 0);
    
    return {
      earnings: { labels, data, total },
      metrics: this.generateMetrics(total, 'month'),
    };
  }

  private static generateYearData(now: Date): BookingAnalytics {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const labels: string[] = [];
    const data: number[] = [];

    for (let month = 0; month < 12; month++) {
      labels.push(monthNames[month]);
      
      // Higher earnings during holiday seasons and summer months
      const isHolidaySeason = month === 11 || month === 0; // Dec, Jan
      const isSummer = month >= 2 && month <= 4; // Mar-May
      const isChristmas = month === 11;
      
      let multiplier = 1;
      if (isChristmas) multiplier = 2;
      else if (isHolidaySeason) multiplier = 1.5;
      else if (isSummer) multiplier = 1.3;
      
      data.push(Math.round((Math.random() * 50000 + 30000) * multiplier));
    }

    const total = data.reduce((sum, val) => sum + val, 0);
    
    return {
      earnings: { labels, data, total },
      metrics: this.generateMetrics(total, 'year'),
    };
  }

  private static generateMetrics(totalEarnings: number, period: FilterPeriod): AnalyticsMetrics {
    // Generate realistic booking counts based on earnings
    const avgBookingValue = 800; // Average booking value in PHP
    const totalBookings = Math.round(totalEarnings / avgBookingValue);
    const averageEarnings = totalBookings > 0 ? totalEarnings / totalBookings : 0;

    // Mock most availed services
    const services = [
      'Hair Cut & Style', 'Manicure & Pedicure', 'Facial Treatment', 
      'Hair Coloring', 'Eyebrow Threading', 'Hair Rebonding',
      'Foot Spa', 'Hair Treatment', 'Makeup Service'
    ];
    const randomService = services[Math.floor(Math.random() * services.length)];
    const serviceCount = Math.round(totalBookings * (0.2 + Math.random() * 0.3)); // 20-50% of bookings

    // Payment method breakdown
    const cashPercentage = 40 + Math.random() * 30; // 40-70%
    const gcashPercentage = 100 - cashPercentage;
    
    const cashAmount = Math.round(totalEarnings * (cashPercentage / 100));
    const gcashAmount = totalEarnings - cashAmount;

    // Previous period comparison (mock)
    const previousTotal = totalEarnings * (0.8 + Math.random() * 0.4); // ±20% variation
    const percentageChange = previousTotal > 0 
      ? ((totalEarnings - previousTotal) / previousTotal) * 100 
      : 0;
    
    const trend: 'up' | 'down' | 'neutral' = 
      percentageChange > 5 ? 'up' : 
      percentageChange < -5 ? 'down' : 'neutral';

    return {
      totalEarnings,
      totalBookings,
      averageEarnings,
      mostAvailedService: {
        name: randomService,
        count: serviceCount,
        revenue: Math.round(serviceCount * avgBookingValue),
      },
      paymentMethods: [
        {
          method: 'Cash',
          amount: cashAmount,
          percentage: cashPercentage,
          icon: 'Wallet' as const,
          color: '#10b981',
        },
        {
          method: 'GCash',
          amount: gcashAmount,
          percentage: gcashPercentage,
          icon: 'Smartphone' as const,
          color: '#3b82f6',
        },
      ],
      periodComparison: {
        current: totalEarnings,
        previous: Math.round(previousTotal),
        percentageChange,
        trend,
      },
    };
  }
}

// Utility function for currency formatting with error handling
export const formatCurrency = (amount: number): string => {
  // Handle invalid numbers
  if (!isFinite(amount) || isNaN(amount)) {
    return '₱0';
  }
  
  // Clamp extremely large numbers to prevent formatting errors
  const clampedAmount = Math.min(Math.max(amount || 0, 0), 999999999);
  
  try {
    // Simple fallback formatting to avoid Intl issues
    const formatted = Math.round(clampedAmount).toLocaleString('en-US');
    return `₱${formatted}`;
  } catch (error) {
    // Most basic fallback
    return `₱${Math.round(clampedAmount)}`;
  }
};

// Utility function for percentage formatting with error handling
export const formatPercentage = (value: number): string => {
  // Handle invalid numbers
  if (!isFinite(value) || isNaN(value)) {
    return '0.0%';
  }
  
  // Clamp extreme percentages
  const clampedValue = Math.min(Math.max(value, -999), 999);
  const sign = clampedValue > 0 ? '+' : '';
  
  try {
    // Use simple formatting to avoid locale issues
    const rounded = Math.round(clampedValue * 10) / 10; // Round to 1 decimal
    return `${sign}${rounded}%`;
  } catch (error) {
    return '0.0%';
  }
};