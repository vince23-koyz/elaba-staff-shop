import React, { useEffect, useMemo, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  TouchableOpacity,
  StatusBar,
  Alert 
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/Navigator';
import { useNavigation } from '@react-navigation/native';
import { useAdminData } from '../hooks/useAdminData';
import Header from '../components/Header';
import SideMenu from '../components/SideMenu';

// Enhanced Analytics Components
import MetricCard from '../components/analytics/MetricCard';
import ChartContainer from '../components/analytics/ChartContainer';
import FilterTabs, { FilterPeriod } from '../components/analytics/FilterTabs';
import PaymentMethodBreakdown from '../components/analytics/PaymentMethodBreakdown';

// Real Analytics hook (replaces mock data)
import { useAnalyticsData } from '../hooks/useAnalyticsData';

// Safe formatting functions to handle errors
const safeCurrency = (amount: any): string => {
  try {
    // Handle null, undefined, empty string
    if (amount === null || amount === undefined || amount === '') return '₱0';
    
    // Handle string conversion safely
    let numValue: number;
    if (typeof amount === 'string') {
      // Remove currency symbols and non-numeric characters except decimal point and minus
      const cleaned = amount.replace(/[^0-9.-]/g, '');
      numValue = parseFloat(cleaned);
    } else {
      numValue = Number(amount);
    }
    
    // Validate the number
    if (!isFinite(numValue) || isNaN(numValue)) return '₱0';
    
    // Ensure positive and round to avoid decimal issues
    const rounded = Math.round(Math.max(numValue, 0));
    
    // Use safer number formatting
    if (rounded === 0) return '₱0';
    if (rounded < 1000) return `₱${rounded}`;
    
    // For larger numbers, format manually to avoid locale issues
    return `₱${rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  } catch (error) {
    console.warn('Error formatting currency:', error, 'Amount:', amount);
    return '₱0';
  }
};

const safePercentage = (value: any): string => {
  try {
    // Handle null, undefined, empty string
    if (value === null || value === undefined || value === '') return '0%';
    
    // Handle string conversion safely
    let numValue: number;
    if (typeof value === 'string') {
      // Remove percentage symbol and non-numeric characters except decimal point and minus
      const cleaned = value.replace(/[^0-9.-]/g, '');
      numValue = parseFloat(cleaned);
    } else {
      numValue = Number(value);
    }
    
    // Validate the number
    if (!isFinite(numValue) || isNaN(numValue)) return '0%';
    
    // Round to 1 decimal place
    const rounded = Math.round(numValue * 10) / 10;
    
    // Add sign for positive numbers
    const sign = rounded > 0 ? '+' : '';
    
    // Format safely
    return `${sign}${rounded}%`;
  } catch (error) {
    console.warn('Error formatting percentage:', error, 'Value:', value);
    return '0%';
  }
};

// Booking data hook for real data integration
import { useBookingData } from '../hooks/useBookingData';

/**
 * Enhanced Earnings Screen with Professional Dashboard UI
 * 
 * Features:
 * - Real-time analytics metrics (Total Earnings, Bookings, Average, etc.)
 * - Interactive charts with period filtering (Day/Week/Month/Year)
 * - Payment method breakdown with visual indicators
 * - Professional Stripe/Shopify-like design
 * - Responsive layout with proper spacing
 * - Robust error handling and number formatting protection
 * 
 * Integration Notes:
 * - Replace AnalyticsDataGenerator with real API calls in useAnalyticsData hook
 * - Use existing useBookingData hook structure as reference
 * - Maintain the same data interface for seamless backend integration
 */
export default function EarningsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { adminName, shopName, shopId, shopLogo } = useAdminData();
  
  // State management
  const [activePeriod, setActivePeriod] = useState<FilterPeriod>('week');
  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Get real booking data from your system with error handling
  const bookingResult = useBookingData(shopId);
  const { bookings, loading, refetch, error: bookingError } = bookingResult || { 
    bookings: [], 
    loading: false, 
    refetch: async () => {}, 
    error: null 
  };

  // Check for booking errors
  useEffect(() => {
    if (bookingError) {
      setHasError(true);
      console.error('Booking data error:', bookingError);
    }
  }, [bookingError]);

  // Process real booking data into analytics (replaces mock data)
  const analyticsResult = useAnalyticsData(
    bookings || [], 
    activePeriod,
    loading
  );
  
  // Helper function to safely validate numeric values
  const safeMakeNumber = (value: any, defaultValue: number = 0): number => {
    try {
      if (value === null || value === undefined || value === '') return defaultValue;
      
      let numValue: number;
      if (typeof value === 'string') {
        const cleaned = value.replace(/[^0-9.-]/g, '');
        numValue = parseFloat(cleaned);
      } else {
        numValue = Number(value);
      }
      
      if (!isFinite(numValue) || isNaN(numValue)) return defaultValue;
      return Math.max(numValue, 0);
    } catch {
      return defaultValue;
    }
  };

  // Validate analytics data with extra safety to prevent number formatting errors
  const { earnings, metrics } = useMemo(() => {
    try {
      if (!analyticsResult) {
        throw new Error('Analytics result is undefined');
      }

      const { earnings: rawEarnings, metrics: rawMetrics } = analyticsResult;
      
      // Safely validate earnings data
      const safeEarnings = {
        labels: (rawEarnings?.labels || []).filter(label => typeof label === 'string'),
        data: (rawEarnings?.data || []).map(val => safeMakeNumber(val)),
        total: safeMakeNumber(rawEarnings?.total)
      };
      
      // Safely validate metrics
      const safeMetrics = {
        totalEarnings: safeMakeNumber(rawMetrics?.totalEarnings),
        averageEarnings: safeMakeNumber(rawMetrics?.averageEarnings),
        totalBookings: safeMakeNumber(rawMetrics?.totalBookings),
        mostAvailedService: {
          name: rawMetrics?.mostAvailedService?.name || 'No services yet',
          count: safeMakeNumber(rawMetrics?.mostAvailedService?.count),
          revenue: safeMakeNumber(rawMetrics?.mostAvailedService?.revenue)
        },
        paymentMethods: (rawMetrics?.paymentMethods || []).map(pm => ({
          method: pm?.method || 'Unknown',
          amount: safeMakeNumber(pm?.amount),
          percentage: Math.max(Math.min(safeMakeNumber(pm?.percentage), 100), 0),
          icon: pm?.icon || 'CreditCard',
          color: pm?.color || '#666'
        })),
        periodComparison: {
          current: safeMakeNumber(rawMetrics?.periodComparison?.current),
          previous: safeMakeNumber(rawMetrics?.periodComparison?.previous),
          percentageChange: safeMakeNumber(rawMetrics?.periodComparison?.percentageChange),
          trend: ['up', 'down', 'neutral'].includes(rawMetrics?.periodComparison?.trend) 
            ? rawMetrics.periodComparison.trend as 'up' | 'down' | 'neutral'
            : 'neutral' as const
        }
      };
      
      return { earnings: safeEarnings, metrics: safeMetrics };
    } catch (error) {
      console.error('Error validating analytics data:', error);
      Alert.alert('Data Error', 'There was an issue loading your earnings data. Please try refreshing.');
      return {
        earnings: { labels: [], data: [], total: 0 },
        metrics: {
          totalEarnings: 0,
          averageEarnings: 0,
          totalBookings: 0,
          mostAvailedService: { name: 'No services yet', count: 0, revenue: 0 },
          paymentMethods: [],
          periodComparison: { current: 0, previous: 0, percentageChange: 0, trend: 'neutral' as const }
        }
      };
    }
  }, [analyticsResult]);
  
  const { loading: analyticsLoading } = analyticsResult;

  // Tooltip state for chart interactions
  const [chartTooltip, setChartTooltip] = useState<{
    x: number;
    y: number;
    value: number;
    label: string;
  } | null>(null);

  // Handle chart point/bar clicks
  const handleChartDataClick = (data: { index: number; value: number; x: number; y: number }) => {
    const label = earnings.labels[data.index] || '';
    setChartTooltip({
      x: data.x,
      y: data.y,
      value: data.value,
      label: label,
    });

    // Auto-hide tooltip after 2 seconds
    setTimeout(() => setChartTooltip(null), 2000);
  };

  // Handle refresh action with better error handling
  const handleRefresh = async () => {
    setRefreshing(true);
    setHasError(false);
    try {
      // Reset any previous errors
      setHasError(false);
      
      // Refresh real booking data
      if (refetch) {
        await refetch();
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      setHasError(true);
      Alert.alert(
        'Refresh Error', 
        'Failed to refresh earnings data. Please check your connection and try again.',
        [
          { text: 'OK', style: 'default' },
          { text: 'Retry', onPress: () => handleRefresh(), style: 'default' }
        ]
      );
    } finally {
      setRefreshing(false);
    }
  };

  // Toggle side menu
  const toggleMenu = () => setMenuOpen(prev => !prev);

  // Get period description for UI
  const getPeriodDescription = (period: FilterPeriod): string => {
    switch (period) {
      case 'day': return 'Last 24 hours';
      case 'week': return 'Last 7 days';
      case 'month': return 'Current month';
      case 'year': return 'Last 12 months';
      default: return '';
    }
  };
  return (
    <>
      <StatusBar backgroundColor="#71c5b4" barStyle="light-content" />
      <LinearGradient 
        colors={['#71c5b4', '#6fa8dc']} 
        start={{ x: 0, y: 0 }} 
        end={{ x: 1, y: 0 }} 
        style={styles.container}
      >
        <Header 
          shopName={shopName} 
          toggleMenu={toggleMenu} 
          shopLogo={shopLogo || undefined} 
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing || analyticsLoading} 
              onRefresh={handleRefresh}
              tintColor="#ffffff"
              colors={['#1fa0a2']}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={styles.headerSection}>
            <Text style={styles.pageTitle}>Earnings Dashboard</Text>
            <Text style={styles.pageSubtitle}>
              {getPeriodDescription(activePeriod)} • {shopName}
            </Text>
          </View>

          {/* Filter Tabs */}
          <FilterTabs
            activeFilter={activePeriod}
            onFilterChange={setActivePeriod}
            style={styles.filterTabs}
          />

          {/* Error Boundary */}
          {hasError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>Unable to Load Data</Text>
              <Text style={styles.errorMessage}>
                There was an issue loading your earnings data. This might be due to a network problem or data formatting issue.
              </Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={() => {
                  setHasError(false);
                  handleRefresh();
                }}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : analyticsLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading earnings data...</Text>
            </View>
          ) : (
            <View style={styles.metricsGrid}>
              <View style={styles.metricRow}>
                <MetricCard
                title="Total Earnings"
                value={safeCurrency(metrics?.totalEarnings)}
                subtitle={`${getPeriodDescription(activePeriod)} • ${metrics?.totalBookings || 0} bookings`}
                icon="Wallet"
                trend={metrics?.periodComparison?.trend || 'neutral'}
                trendValue={safePercentage(metrics?.periodComparison?.percentageChange)}
                  style={styles.metricCardLarge}
                />
              </View>

              <View style={styles.metricRow}>
                <MetricCard
                title="Total Bookings"
                value={(metrics?.totalBookings || 0).toLocaleString()}
                subtitle="Completed bookings"
                icon="CalendarCheck"
                  iconColor="#10b981"
                  style={styles.metricCardSmall}
                />
                <MetricCard
                title="Average Booking"
                value={safeCurrency(metrics?.averageEarnings)}
                subtitle="Per transaction"
                icon="BarChart3"
                  iconColor="#8b5cf6"
                  style={styles.metricCardSmall}
                />
              </View>

              <View style={styles.metricRow}>
                <MetricCard
                title="Top Service"
                value={metrics?.mostAvailedService?.name || 'No services yet'}
                subtitle={`${metrics?.mostAvailedService?.count || 0} bookings • ${safeCurrency(metrics?.mostAvailedService?.revenue)}`}
                  icon="Star"
                  iconColor="#f59e0b"
                  style={styles.metricCardLarge}
                />
              </View>
            </View>
          )}

          {/* Earnings Chart */}
          {Array.isArray(earnings?.data) && earnings.data.length > 0 ? (
            <ChartContainer
              title="Earnings Trend"
              subtitle={`${safeCurrency(earnings?.total)} total for ${getPeriodDescription(activePeriod).toLowerCase()}`}
              data={{
                labels: Array.isArray(earnings?.labels) ? earnings.labels : [],
                datasets: [{ data: earnings.data }],
              }}
              type={activePeriod === 'day' || activePeriod === 'week' ? 'line' : 'bar'}
              period={activePeriod}
              onDataPointClick={handleChartDataClick}
              currencyFormat={true}
              height={260}
            />
          ) : (
            <View style={[styles.breakdownSection, { marginTop: 0 }]}> 
              <Text style={styles.sectionTitle}>Earnings Trend</Text>
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>No chart data</Text>
                <Text style={styles.emptyStateMessage}>
                  {analyticsLoading
                    ? 'Loading your shop\'s earnings data...'
                    : 'No earnings available for the selected period'}
                </Text>
              </View>
            </View>
          )}

          {/* Payment Methods Breakdown */}
          {!analyticsLoading && metrics?.paymentMethods?.length > 0 && (
            <PaymentMethodBreakdown
              title="Payment Methods"
              data={metrics.paymentMethods}
              currencyFormatter={safeCurrency}
            />
          )}

          {/* Detailed Breakdown Section */}
          <View style={styles.breakdownSection}>
            <Text style={styles.sectionTitle}>Detailed Breakdown</Text>
            
            {earnings?.labels?.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>No earnings data</Text>
                <Text style={styles.emptyStateMessage}>
                  {analyticsLoading 
                    ? 'Loading your shop\'s earnings data...'
                    : bookings && bookings.length > 0 
                    ? 'No completed bookings found for this period'
                    : 'No bookings found for your shop yet'
                  }
                </Text>
              </View>
            ) : (
              <View style={styles.breakdownList}>
                {earnings?.labels?.map((label, index) => (
                  <View key={`${label}-${index}`} style={styles.breakdownItem}>
                    <Text style={styles.breakdownLabel}>{label}</Text>
                    <Text style={styles.breakdownValue}>
                      {safeCurrency(earnings?.data?.[index] || 0)}
                    </Text>
                  </View>
                )) || null}
              </View>
            )}
          </View>

          {/* Chart Tooltip Overlay */}
          {chartTooltip && (
            <View 
              style={[
                styles.chartTooltip, 
                { 
                  left: Math.max(16, chartTooltip.x - 60), 
                  top: Math.max(16, chartTooltip.y - 50) 
                }
              ]}
              pointerEvents="none"
            >
              <Text style={styles.tooltipLabel}>{chartTooltip.label}</Text>
              <Text style={styles.tooltipValue}>
                {safeCurrency(chartTooltip.value)}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Side Menu Overlay */}
        {menuOpen && (
          <TouchableOpacity 
            style={styles.menuOverlay} 
            onPress={toggleMenu} 
            activeOpacity={1} 
          />
        )}

        {/* Side Menu */}
        <SideMenu
          navigation={navigation}
          menuOpen={menuOpen}
          toggleMenu={toggleMenu}
          adminName={adminName}
        />
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  headerSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  filterTabs: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  loadingContainer: {
    paddingHorizontal: 20,
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  metricsGrid: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  metricCardLarge: {
    flex: 1,
  },
  metricCardSmall: {
    flex: 1,
  },
  breakdownSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  breakdownList: {
    gap: 2,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  breakdownLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },
  breakdownValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
  chartTooltip: {
    position: 'absolute',
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 1000,
  },
  tooltipLabel: {
    fontSize: 12,
    color: '#d1d5db',
    fontWeight: '600',
    marginBottom: 2,
  },
  tooltipValue: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '800',
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 15,
  },
  errorContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#dc2626',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#71c5b4',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    elevation: 1,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

/**
 * ✅ REAL DATA INTEGRATION COMPLETE
 * 
 * This EarningsScreen now uses real data from your eLaba system:
 * 
 * 🔗 Data Sources:
 * - useBookingData(): Fetches real bookings from your API
 * - useAnalyticsData(): Processes real bookings into analytics
 * - API endpoint: GET /api/bookings?shop_id={shopId}
 * 
 * 📊 Real Analytics Calculated:
 * - Total Earnings: Sum of all paid bookings
 * - Total Bookings: Count of completed/paid bookings  
 * - Average Earnings: Total earnings ÷ Total bookings
 * - Most Availed Service: Based on actual service_name from bookings
 * - Payment Methods: Real cash vs GCash breakdown from payment_method
 * - Time-based Charts: Real booking_date/date analysis
 * 
 * 🔄 Real-time Features:
 * - Pull-to-refresh fetches latest bookings
 * - Auto-updates when new bookings are made
 * - Filters by actual shop_id from admin data
 * - Handles different payment_status values (paid, success, completed, succeeded)
 * 
 * 💡 Next Enhancements:
 * - Add period-over-period comparison with historical data
 * - Implement caching for better performance
 * - Add more detailed service analytics
 * - Export functionality for reports
 */
