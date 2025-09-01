//ads
import { 
  StyleSheet, Text, View, TouchableOpacity, 
  ScrollView, Image, Animated, Dimensions, BackHandler, ToastAndroid 
} from 'react-native'
import React, { useState, useRef, useCallback } from 'react'
import LinearGradient from 'react-native-linear-gradient'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/Navigator'

import SideMenu from '../components/SideMenu'
import Header from '../components/Header'
import { useAdminData } from '../hooks/useAdminData'

const { width } = Dimensions.get('window')

export default function SettingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [menuOpen, setMenuOpen] = useState(false)
  const slideAnim = useRef(new Animated.Value(-width)).current
  const backPressRef = useRef<number>(0)

  const { adminName, shopName } = useAdminData();

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

  return (
    <LinearGradient 
      colors={['#6baea5', '#5c7eb0']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      {/* Header */}
      <Header shopName={shopName} toggleMenu={toggleMenu} />

      {/* Content */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.shopBanner}>
          <Text style={styles.shopBannerText}>[Shop Image Here]</Text>
        </View>

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
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, zIndex: 10,
  },
  shopName: { fontSize: 20, fontWeight: '700', color: '#fff' },
  rightIcons: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { marginLeft: 12 },
  shopBanner: {
    backgroundColor: '#ffffffcc', height: 150, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 4,
  },
  shopBannerText: { fontSize: 16, fontWeight: '600', color: '#777' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: {
    backgroundColor: '#ffffffdd', width: '48%', borderRadius: 16,
    padding: 18, marginBottom: 16, shadowColor: '#000',
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 4,
  },
  icon: { width: 30, height: 30, resizeMode: 'contain', tintColor: '#fff' },
  scrollContent: { padding: 16, paddingBottom: 60 },
  cardTitle: { fontSize: 14, color: '#555', marginBottom: 6 },
  cardValue: { fontSize: 20, fontWeight: '700', color: '#333' },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 15,
  },
});
