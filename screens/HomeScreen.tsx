// HomeScreen.tsx
import { 
  StyleSheet, Text, View, TouchableOpacity, 
  ScrollView, Image, Animated, Dimensions, BackHandler, ToastAndroid 
} from 'react-native'
import React, { useState, useRef, useCallback } from 'react'
import LinearGradient from 'react-native-linear-gradient'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/Navigator'
import Header from '../components/Header'
import SideMenu from '../components/SideMenu'
import { useAdminData } from '../hooks/useAdminData'

const { width } = Dimensions.get('window')

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [menuOpen, setMenuOpen] = useState(false)
  const slideAnim = useRef(new Animated.Value(-width)).current
  const backPressRef = useRef<number>(0)

  const { adminName, shopName } = useAdminData();
  
  const pieData = [
    { name: 'Completed', population: 89, color: '#73bbb2', legendFontColor: '#333', legendFontSize: 12 },
    { name: 'Pending', population: 5, color: '#f7b267', legendFontColor: '#333', legendFontSize: 12 },
    { name: 'Cancelled', population: 2, color: '#f25f5c', legendFontColor: '#333', legendFontSize: 12 },
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

  // 🔹 Handle double back press to exit
  useFocusEffect(
    useCallback(() => {
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
    }, [menuOpen])
  );

  // 🔹 Sample Data for Recent Bookings
  const recentBookings = [
    {
      id: '#24221001',
      name: 'Juan Dela Cruz',
      service: 'Wash & Fold',
      date: 'Aug 22, 2025 - 10:00 AM',
      profile: 'https://i.pravatar.cc/100?img=1'
    },
    {
      id: 'BKG-1002',
      name: 'Maria Santos',
      service: 'Dry Clean',
      date: 'Aug 22, 2025 - 2:30 PM',
      profile: 'https://i.pravatar.cc/100?img=2'
    },
    {
      id: 'BKG-1003',
      name: 'Pedro Reyes',
      service: 'Iron Only',
      date: 'Aug 23, 2025 - 9:00 AM',
      profile: 'https://i.pravatar.cc/100?img=3'
    }
  ];

  return (
    <LinearGradient 
      colors={['#73bbb2', '#6388c0']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
        {/* Header */}
        <Header shopName={shopName} toggleMenu={toggleMenu} />

        {/* Content */}
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.shopBanner}>
            <Text style={styles.shopBannerText}>Welcome to</Text>
            <Text style={styles.shopNameText}>{shopName || 'Your Shop'}</Text>
          </View>

          {/* 🔹 Stats Cards */}
          <View style={styles.statsGrid}>
            {[
              { title: 'Total Sales', value: '₱12,450' },
              { title: 'Completed', value: '89' },
              { title: 'Pending', value: '5' },
              { title: 'Total Bookings', value: '94' },
            ].map((stat, index) => (
              <View style={styles.statCard} key={index}>
                <Text style={styles.cardTitle}>{stat.title}</Text>
                <Text style={styles.cardValue}>{stat.value}</Text>
              </View>
            ))}
          </View>

        {/* 🔹 Circle Diagram Placeholder */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Bookings Status</Text>
        </View>
        <View style={styles.circleGrid}>
          {[
            { label: 'Completed', value: '89' },
            { label: 'Pending', value: '5' },
            { label: 'Cancelled', value: '2' },
          ].map((item, idx) => (
            <View key={idx} style={styles.circleCard}>
              <View style={styles.circle}>
                <Text style={styles.circleValue}>{item.value}</Text>
              </View>
              <Text style={styles.circleLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

          {/* 🔹 Quick Actions */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>
          <View style={styles.quickActionsGrid}>
            {['New Booking', 'Manage Services', 'Customers', 'Payments'].map((action, idx) => (
              <TouchableOpacity key={idx} style={styles.quickCard}>
                <Text style={styles.quickText}>{action}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 🔹 Chart / Analytics (placeholder) */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Analytics Overview</Text>
          </View>
          <View style={styles.chartCard}>
            <Text style={{ fontSize: 14, color: '#555' }}>[Sample Chart Placeholder]</Text>
          </View>

          {/* 🔹 Recent Activity Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity Bookings</Text>
          </View>
          {recentBookings.map((booking, idx) => (
            <View key={idx} style={styles.bookingCard}>
              <Image source={{ uri: booking.profile }} style={styles.profileImage} />
              <View style={{ flex: 1 }}>
                <Text style={styles.bookingTitle}>Booking Received - {booking.id}</Text>
                <Text style={styles.bookingDetails}>
                  {booking.name} - {booking.service}
                </Text>
                <Text style={styles.bookingDate}>{booking.date}</Text>
              </View>
            </View>
          ))}
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
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  shopBanner: {
    backgroundColor: '#ffffffcc', height: 150, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 4,
  },
  shopBannerText: { 
    fontSize: 16, 
    fontWeight: '500', 
    color: '#777',
    marginBottom: 8,
  },
  shopNameText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: {
    backgroundColor: '#ddffc1dd', width: '48%', borderRadius: 16,
    padding: 30, marginBottom: 16, shadowColor: '#000',
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 4,
  },
  circleGrid: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  circleCard: { alignItems: 'center' },
  circle: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 8, borderColor: '#91aef0',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  circleValue: { fontSize: 18, fontWeight: '700', color: '#333' },
  circleLabel: { marginTop: 6, fontSize: 13, fontWeight: '500', color: '#444' },

  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
  quickCard: {
    backgroundColor: '#f1d2ffdd', width: '48%', borderRadius: 16,
    padding: 20, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
    justifyContent: 'center', alignItems: 'center'
  },
  quickText: { fontSize: 14, fontWeight: '600', color: '#333' },

  chartCard: {
    backgroundColor: '#ffffffdd', borderRadius: 16,
    height: 160, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
    marginBottom: 16
  },

  scrollContent: { padding: 16, paddingBottom: 60 },
  cardTitle: { fontSize: 14, color: '#555', marginBottom: 6 },
  cardValue: { fontSize: 20, fontWeight: '700', color: '#333' },

  // 🔹 Recent Activity Styles
  sectionHeader: { marginTop: 10, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  bookingCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffffffcc', padding: 12,
    borderRadius: 12, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 2
  },
  profileImage: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  bookingTitle: { fontSize: 14, fontWeight: '600', color: '#333' },
  bookingDetails: { fontSize: 13, color: '#555' },
  bookingDate: { fontSize: 12, color: '#777', marginTop: 2 },

  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 15,
  },
});
