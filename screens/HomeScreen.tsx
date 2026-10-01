// HomeScreen.tsx
import { 
  StyleSheet, Text, View, TouchableOpacity, 
  ScrollView, Image, Animated, Dimensions, BackHandler, ToastAndroid, 
  Alert, RefreshControl
} from 'react-native'
import React, { useState, useRef, useCallback, useEffect } from 'react'
import LinearGradient from 'react-native-linear-gradient'
import { Eye, EyeOff } from 'lucide-react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/Navigator'
import Header from '../components/Header'
import SideMenu from '../components/SideMenu'
import RecentActivityBookings from '../components/RecentActivityBookings'
import CustomAlertModal from '../components/CustomAlertModal'
import { useAdminData } from '../hooks/useAdminData'
import { Booking } from '../hooks/useBookingData'
import socketService from '../services/socketService'
import { useNotificationContext } from '../context/NotificationContext'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_CONFIG } from '../config/api'
import { getShopTotalSales } from '../services/paymentService'

const { width } = Dimensions.get('window')

// --- Creative Bubble Background ---
const BubbleBackground = () => {
  const { width, height } = Dimensions.get('window');
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Large top-left bubble */}
      <View style={[
        bubbleStyles.bubble,
        {
          backgroundColor: 'rgba(135,206,250,0.22)',
          width: width * 0.8,
          height: width * 0.8,
          borderRadius: width * 0.4,
          top: -width * 0.25,
          left: -width * 0.25,
        },
      ]} />
      {/* Small bottom-right bubble */}
      <View style={[
        bubbleStyles.bubble,
        {
          backgroundColor: 'rgba(255,182,193,0.18)',
          width: width * 0.35,
          height: width * 0.35,
          borderRadius: width * 0.175,
          bottom: -width * 0.1,
          right: -width * 0.1,
        },
      ]} />
      {/* Middle accent bubble */}
      <View style={[
        bubbleStyles.bubble,
        {
          backgroundColor: 'rgba(144,238,144,0.13)',
          width: width * 0.22,
          height: width * 0.22,
          borderRadius: width * 0.11,
          top: height * 0.38,
          left: width * 0.62,
        },
      ]} />
    </View>
  );
};

const bubbleStyles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    opacity: 1,
  },
});

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [menuOpen, setMenuOpen] = useState(false)
  const slideAnim = useRef(new Animated.Value(-width)).current
  const backPressRef = useRef<number>(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [approvalModalType, setApprovalModalType] = useState<'pending' | 'success' | null>(null)
  const previousShopStatusRef = useRef<string | null>(null)
  const approvalAlertShownRef = useRef(false)

  const { adminName, shopName, shopId, shopLogo, shopStatus, refreshData } = useAdminData();
  const { refreshNotifications } = useNotificationContext();
  // Fetch bookings for this shop
  const { bookings, loading: bookingsLoading, refetch } = require('../hooks/useBookingData').useBookingData(shopId);

  // Compute booking stats
  const totalBookings = bookings
    ? bookings.filter((booking: Booking) => {
        const status = (booking.booking_status || '').toLowerCase();
        return status !== 'cancelled' && status !== 'rejected';
      }).length
    : 0;
  const pendingBookings = bookings
    ? bookings.filter((booking: Booking) => {
        const status = (booking.booking_status || '').toLowerCase();
        return [
          'pending',
          'confirmed',
          'processing',
          'in progress',
          'ready',
          'in_transit',
          'in transit',
          'out_for_delivery',
        ].includes(status);
      }).length
    : 0;
  const completedBookings = bookings ? bookings.filter((b: Booking) => (b.booking_status || '').toLowerCase() === 'completed').length : 0;
  // Total Sales: now based on paid payments (via backend aggregation)
  const [totalSales, setTotalSales] = useState<number>(0);
  const [showSales, setShowSales] = useState(true);
  const computeFallbackSales = () => {
    return bookings
      ? bookings
          .filter((b: Booking) => {
            const ps = (b.payment_status || '').toLowerCase();
            const bookingStatus = (b.booking_status || '').toLowerCase();
            return (
              (ps === 'paid' || ps === 'success' || ps === 'completed' || ps === 'succeeded') &&
              bookingStatus !== 'cancelled' &&
              bookingStatus !== 'canceled' &&
              bookingStatus !== 'rejected'
            );
          })
          .reduce((sum: number, b: Booking) => sum + (Number(b.total_amount) || 0), 0)
      : 0;
  };
  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!shopId) return;
      try {
        const total = await getShopTotalSales(shopId);
        if (isMounted) setTotalSales(total);
      } catch (e) {
        if (isMounted) setTotalSales(computeFallbackSales());
      }
    })();
    return () => { isMounted = false; };
  }, [shopId, bookings]);
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount || 0);
  // You can add more status counts as needed

  const pieData = [
    { name: 'Completed', population: completedBookings, color: '#73bbb2', legendFontColor: '#333', legendFontSize: 12 },
    { name: 'Pending', population: pendingBookings, color: '#f7b267', legendFontColor: '#333', legendFontSize: 12 },
  { name: 'Cancelled', population: bookings ? bookings.filter((b: Booking) => (b.booking_status || '').toLowerCase() === 'cancelled').length : 0, color: '#f25f5c', legendFontColor: '#333', legendFontSize: 12 },
  ];

  // 🔹 Toggle Menu
  const toggleMenu = () => {
    if (menuOpen) {
      Animated.timing(slideAnim, { toValue: -width, duration: 100, useNativeDriver: false }).start(() => setMenuOpen(false))
    } else {
      setMenuOpen(true)
      Animated.timing(slideAnim, { toValue: 0, duration: 100, useNativeDriver: false }).start()
    }
  }

  // 🔹 Navigation Actions
  const handleChat = () => navigation.navigate('Chat')
  const handleNotifs = () => navigation.navigate('Notifs')

  // 🔹 Realtime updates: listen to booking events and refetch when this shop changes
  useEffect(() => {
    if (!shopId) return;

    const handleChange = (evt?: { shopId?: string | number }) => {
      try {
        // The socket is joined to this admin's room, so events without shopId
        // are still relevant to this dashboard.
        if (!evt?.shopId || String(evt.shopId) === String(shopId)) {
          refetch();
          setDashboardRefreshKey(previous => previous + 1);
          refreshNotifications();
        }
      } catch (e) {
        // no-op
      }
    };

    socketService.onBookingCreated(handleChange);
    socketService.onBookingUpdated(handleChange);
    socketService.onBookingDeleted(handleChange);

    return () => {
      socketService.offBookingCreated(handleChange);
      socketService.offBookingUpdated(handleChange);
      socketService.offBookingDeleted(handleChange);
    };
  }, [refreshNotifications, refetch, shopId]);

  useEffect(() => {
    if (!shopId) return;

    const handleShopStatusUpdated = (event: { shopId?: string | number; status?: string }) => {
      if (!event.shopId || String(event.shopId) !== String(shopId)) return;

      refreshData();
      refreshNotifications();
    };

    socketService.onShopStatusUpdated(handleShopStatusUpdated);

    return () => {
      socketService.offShopStatusUpdated(handleShopStatusUpdated);
    };
  }, [refreshData, refreshNotifications, shopId]);

  // Keep the shop status current even if the socket briefly disconnects.
  useEffect(() => {
    if (!shopId) return;

    const statusRefreshInterval = setInterval(() => {
      refreshData();
    }, 5000);

    return () => clearInterval(statusRefreshInterval);
  }, [refreshData, shopId]);

  // 🔹 Handle double back press to exit and refresh data on focus
  useFocusEffect(
    useCallback(() => {
      // Refresh shop data and sales when screen comes into focus
      refreshData();
      refreshNotifications();
      (async () => {
        try {
          if (shopId) {
            const total = await getShopTotalSales(shopId);
            setTotalSales(total);
          }
        } catch (e) {
          setTotalSales(computeFallbackSales());
        }
      })();

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
    }, [menuOpen, refreshNotifications, shopId])
  );

  // 🔹 Handle booking press
  const handleBookingPress = (booking: Booking) => {
    // Navigate to booking details screen
    try {
      navigation.navigate('BookingDetails', { bookingId: booking.booking_id });
    } catch (error) {
      console.log('Navigation error:', error);
      // Fallback - you can implement a modal or other handling here
      Alert.alert('Info', `Booking #${booking.booking_id} details will be shown here`);
    }
  };

  const isPending = shopStatus === 'pending';
  const isRejected = shopStatus === 'rejected';
  const isLoading = bookingsLoading || !shopId;

  useEffect(() => {
    const previousStatus = previousShopStatusRef.current;

    const checkPendingModalFlag = async () => {
      try {
        const shouldShowPendingModal = await AsyncStorage.getItem('showShopPendingApprovalModal');

        if (shopStatus === 'pending' && shouldShowPendingModal === 'true') {
          setApprovalModalType('pending');
          setShowApprovalModal(true);
          await AsyncStorage.setItem('showShopPendingApprovalModal', 'false');
          return;
        }
      } catch (error) {
        console.log('Error checking pending approval modal flag:', error);
      }
    };

    checkPendingModalFlag();

    if (
      previousStatus === 'pending' &&
      shopStatus === 'active' &&
      !approvalAlertShownRef.current
    ) {
      approvalAlertShownRef.current = true;
      setApprovalModalType('success');
      setShowApprovalModal(true);
    }

    previousShopStatusRef.current = shopStatus;
  }, [shopStatus]);

  const closeApprovalModal = () => {
    setShowApprovalModal(false);
    setApprovalModalType(null);
  };

  const handleRefreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      refreshData();
      await refetch();
      if (shopId) {
        const total = await getShopTotalSales(shopId);
        setTotalSales(total);
      }
      ToastAndroid.show('Refreshing dashboard…', ToastAndroid.SHORT);
    } catch (e) {
      setTotalSales(computeFallbackSales());
      Alert.alert('Refresh', 'Could not refresh dashboard data right now.');
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch, refreshData, shopId]);

  const handleRefreshStatus = () => {
    try {
      refreshData();
      ToastAndroid.show('Refreshing status…', ToastAndroid.SHORT);
    } catch (e) {
      Alert.alert('Refresh', 'Checking latest status.');
    }
  };

  const renderStatCardSkeleton = () => (
    <View style={styles.creativeStatCard}>
      <View style={[styles.statCardGradient, styles.skeletonCard]}>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonValue} />
        <View style={styles.skeletonLine} />
      </View>
    </View>
  );

  const renderRecentActivitySkeleton = () => (
    <View style={styles.skeletonListContainer}>
      {[0, 1, 2].map((item) => (
        <View key={item} style={styles.skeletonListItem}>
          <View style={styles.skeletonAvatar} />
          <View style={{ flex: 1 }}>
            <View style={styles.skeletonRow} />
            <View style={[styles.skeletonRow, { width: '70%', marginTop: 8 }]} />
          </View>
        </View>
      ))}
    </View>
  );

  return (
        <LinearGradient 
            colors={['#71c5b4', '#6fa8dc']}
            start={{ x: 0, y: 0 }} 
            end={{ x: 1, y: 0 }} 
            style={styles.container}
        >
        {/* --- Creative Bubble Background --- */}
        <BubbleBackground />
  {/* Header */}
  <Header shopName={shopName} toggleMenu={toggleMenu} shopLogo={shopLogo || undefined} />

        {/* Content */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefreshData}
              tintColor="#ffffff"
              colors={['#ffffff']}
            />
          }
        >
          <View style={styles.statusRow}>
            <Text style={styles.sectionTitle1}>Dashboard</Text>
            {!!shopStatus && (
              <View style={[styles.statusPill, { borderColor: shopStatus === 'active' ? '#10b981' : shopStatus === 'pending' ? '#f59e0b' : '#ef4444' }] }>
                <View style={[styles.statusDot, { backgroundColor: shopStatus === 'active' ? '#10b981' : shopStatus === 'pending' ? '#f59e0b' : '#ef4444' }]} />
                <Text style={styles.statusText}>
                  {shopStatus === 'active'
                    ? 'Active'
                    : shopStatus === 'pending'
                      ? 'Pending approval'
                      : shopStatus === 'rejected'
                        ? 'Rejected'
                        : 'Inactive'}
                </Text>
              </View>
            )}
          </View>

          {/* Simple pending notice */}
          {isPending && (
            <View style={styles.pendingNotice}>
              <Text style={styles.pendingNoticeText}>Your shop is pending approval.</Text>
              <TouchableOpacity onPress={handleRefreshStatus} style={styles.pendingNoticeBtn}>
                <Text style={styles.pendingNoticeBtnText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          )}
          {isRejected && (
            <View style={styles.rejectedNotice}>
              <Text style={styles.rejectedNoticeTitle}>Shop request rejected</Text>
              <Text style={styles.rejectedNoticeText}>
                Review the rejection reason, update your shop information, and resubmit your request.
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('ShopInfo')}
                style={styles.rejectedNoticeBtn}
              >
                <Text style={styles.rejectedNoticeBtnText}>Edit and Resubmit</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.shopBanner}>
            {shopLogo ? (
              <Image 
                source={{ uri: shopLogo.startsWith('http') ? shopLogo : `${API_CONFIG.BASE_ORIGIN}${shopLogo}` }} 
                style={styles.shopBannerImage}
                resizeMode="cover"
              />
            ) : (
              <>
                <Text style={styles.shopBannerTextFallback}>Welcome to</Text>
                <Text style={styles.shopNameTextFallback}>{shopName || 'Your Shop'}</Text>
              </>
            )}
          </View>
          {/* 🔹 Stats Cards (simple, always shown) */}
          <View style={styles.statsGrid}>
            {isLoading ? (
              <>
                {renderStatCardSkeleton()}
                {renderStatCardSkeleton()}
                {renderStatCardSkeleton()}
                {renderStatCardSkeleton()}
              </>
            ) : (
              <>
                <View style={styles.creativeStatCard}>
                  <LinearGradient colors={["#6dd5ed", "#2193b0"]} style={styles.statCardGradient}>
                    <View style={styles.statCardShape1} />
                    <View style={styles.statCardShape2} />
                    <TouchableOpacity
                      style={styles.salesToggle}
                      onPress={() => setShowSales((prev) => !prev)}
                      activeOpacity={0.8}
                    >
                      {showSales ? <Eye size={20} color="#ffffff" /> : <EyeOff size={18} color="#ffffff" />}
                    </TouchableOpacity>
                    <Text style={styles.creativeCardTitle}>Total Sales</Text>
                    <Text style={styles.creativeCardValue}>
                      {showSales ? formatCurrency(totalSales) : '------'}
                    </Text>
                    <View style={styles.underline} />
                  </LinearGradient>
                </View>
                <View style={styles.creativeStatCard}>
                  <LinearGradient colors={["#43e97b", "#38f9d7"]} style={styles.statCardGradient}>
                    <View style={styles.statCardShape1} />
                    <View style={styles.statCardShape2} />
                    <Text style={styles.creativeCardTitle}>Completed</Text>
                    <Text style={styles.creativeCardValue}>{completedBookings}</Text>
                    <View style={styles.underline} />
                  </LinearGradient>
                </View>
                <View style={styles.creativeStatCard}>
                  <LinearGradient colors={["#a18cd1", "#fbc2eb"]} style={styles.statCardGradient}>
                    <View style={styles.statCardShape1} />
                    <View style={styles.statCardShape2} />
                    <Text style={styles.creativeCardTitle}>Pending</Text>
                    <Text style={styles.creativeCardValue}>{pendingBookings}</Text>
                    <View style={styles.underline} />
                  </LinearGradient>
                </View>
                <View style={styles.creativeStatCard}>
                  <LinearGradient colors={["#b2fefa", "#0ed2f7"]} style={styles.statCardGradient}>
                    <View style={styles.statCardShape1} />
                    <View style={styles.statCardShape2} />
                    <Text style={styles.creativeCardTitle}>Total Bookings</Text>
                    <Text style={styles.creativeCardValue}>{totalBookings}</Text>
                    <View style={styles.underline} />
                  </LinearGradient>
                </View>
              </>
            )}
          </View>
          {/* 🔹 Recent Activity Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity for Laundry Bookings</Text>
          </View>
          <View style={styles.fullWidthContainer}>
            {isLoading ? (
              renderRecentActivitySkeleton()
            ) : (
              <RecentActivityBookings 
                shopId={shopId}
                refreshKey={dashboardRefreshKey}
                limit={7}
                onBookingPress={handleBookingPress}
              />
            )}
          </View>
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

        <CustomAlertModal
          visible={showApprovalModal}
          title={approvalModalType === 'pending' ? 'Your shop is pending approval' : 'Shop Approved'}
          message={
            approvalModalType === 'pending'
              ? 'We are currently reviewing your shop documents and registration. Please wait for approval before you can fully manage your shop.'
              : 'Your shop has been successfully approved. You can now manage your shop and access all available features.'
          }
          buttonText="Okay"
          colorScheme={approvalModalType === 'pending' ? 'info' : 'success'}
          onButtonPress={closeApprovalModal}
          onRequestClose={closeApprovalModal}
        />
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  shopBanner: {
    backgroundColor: '#ffffffcc', height: 150, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 4,
    overflow: 'hidden', // Add this to ensure image stays within border radius
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(47, 111, 143, 0.48)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  pendingBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  pendingBadgeIcon: { fontSize: 18, color: '#fff' },
  pendingTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  pendingSubtitle: { color: '#eef7fb', fontSize: 12, textAlign: 'center', marginTop: 4 },
  pendingActionsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  pendingBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  pendingBtnText: { fontWeight: '700', fontSize: 12 },
  shopBannerImage: {
    width: '100%',
    height: '100%',
  },
  shopBannerTextFallback: { 
    fontSize: 16, 
    fontWeight: '500', 
    color: '#777', // Original color for fallback without image
    marginBottom: 8,
  },
  shopNameTextFallback: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2e2e2e', // Original color for fallback without image
    textAlign: 'center',
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pendingCard: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  pendingCardTitle: { fontSize: 16, fontWeight: '800', color: '#2f6f8f' },
  pendingCardText: { fontSize: 13, color: '#3a3a3a', marginTop: 6 },
  lockedStat: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  lockedIcon: { fontSize: 16, marginBottom: 4 },
  lockedTitle: { fontWeight: '700', color: '#4b5563' },
  creativeStatCard: {
    width: '48%',
    borderRadius: 20,
    marginBottom: 18,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.13,
    shadowRadius: 8,
    backgroundColor: 'transparent',
  },
  statCardGradient: {
    padding: 24,
    borderRadius: 20,
    minHeight: 110,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  statCardShape1: {
    position: 'absolute',
    top: -18,
    right: -18,
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 24,
    zIndex: 0,
  },
  statCardShape2: {
    position: 'absolute',
    bottom: -12,
    left: -12,
    width: 32,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16,
    zIndex: 0,
  },
  creativeCardTitle: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 8,
    zIndex: 1,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.13)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  salesToggle: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 2,
    padding: 4,
  },
  creativeCardValue: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    zIndex: 1,
    marginBottom: 6,
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.18)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  underline: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.07)',
    borderRadius: 2,
    marginTop: 4,
    alignSelf: 'center',
    zIndex: 1,
  },
  scrollContent: { padding: 16, paddingBottom: 60 },
  cardTitle: { fontSize: 14, color: '#555', marginBottom: 6 },
  cardValue: { fontSize: 20, fontWeight: '700', color: '#333' },

  // 🔹 Section Styles
  sectionHeader1: { marginTop: 1, marginBottom: 16, marginLeft: 6 },
  sectionTitle1: { fontSize: 20, fontWeight: '700', color: '#fff' },
  statusRow: { marginTop: 1, marginBottom: 16, marginLeft: 6, marginRight: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { color: '#fff', fontWeight: '600' },
  pendingNotice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff7e6', borderColor: '#f59e0b', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginHorizontal: 6, marginBottom: 10 },
  pendingNoticeText: { color: '#92400e', fontSize: 13, fontWeight: '600' },
  pendingNoticeBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#f59e0b', borderRadius: 6 },
  pendingNoticeBtnText: { color: '#fff', fontWeight: '700' },
  rejectedNotice: { backgroundColor: '#fff1f2', borderColor: '#fb7185', borderWidth: 1, borderRadius: 10, padding: 14, marginHorizontal: 6, marginBottom: 10 },
  rejectedNoticeTitle: { color: '#be123c', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  rejectedNoticeText: { color: '#881337', fontSize: 13, lineHeight: 18, marginBottom: 10 },
  rejectedNoticeBtn: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#e11d48', borderRadius: 7 },
  rejectedNoticeBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  sectionHeader: { marginTop: 10, marginBottom: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  pendingInfoBox: { backgroundColor: 'rgba(255,255,255,0.92)', padding: 16, borderRadius: 12 },
  pendingInfoTitle: { fontSize: 15, fontWeight: '800', color: '#2f6f8f' },
  pendingInfoText: { fontSize: 13, color: '#374151', marginTop: 6 },
  pendingRefreshBtn: { alignSelf: 'flex-start', backgroundColor: '#2f6f8f', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginTop: 10 },
  pendingRefreshText: { color: '#fff', fontWeight: '700' },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 15,
  },
  fullWidthContainer: {
    marginLeft: -16,
    marginRight: -16,
    width: width,
    alignSelf: 'center',
    backgroundColor: '#fff',
    minHeight: 260,
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
  skeletonCard: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    minHeight: 110,
  },
  skeletonTitle: {
    width: 90,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginBottom: 10,
  },
  skeletonValue: {
    width: 70,
    height: 24,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.45)',
    marginBottom: 10,
  },
  skeletonLine: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  skeletonListContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  skeletonListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  skeletonAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginRight: 12,
  },
  skeletonRow: {
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
});
