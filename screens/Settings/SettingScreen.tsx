//ads
import { 
  StyleSheet, Text, View, TouchableOpacity, 
  ScrollView, Image, Animated, Dimensions, BackHandler, ToastAndroid, Switch, ActivityIndicator
} from 'react-native'
import React, { useState, useRef, useCallback, useEffect } from 'react'
import LinearGradient from 'react-native-linear-gradient'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../navigation/Navigator'

import SideMenu from '../../components/SideMenu'
import Header from '../../components/Header'
import { useAdminData } from '../../hooks/useAdminData'
import { api } from '../../config/api'

const { width } = Dimensions.get('window')

export default function SettingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [menuOpen, setMenuOpen] = useState(false)
  const [shopOpen, setShopOpen] = useState(false)
  const [updatingShopStatus, setUpdatingShopStatus] = useState(false)
  const slideAnim = useRef(new Animated.Value(-width)).current
  const backPressRef = useRef<number>(0)

  const { adminName, shopName, refreshData, shopId, shopStatus } = useAdminData();

  useEffect(() => {
    setShopOpen(shopStatus === 'active');
  }, [shopStatus]);

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

  const handleShopAvailabilityToggle = async (value: boolean) => {
    if (!shopId) {
      ToastAndroid.show('Shop information is not available yet.', ToastAndroid.SHORT);
      return;
    }

    const nextStatus = value ? 'active' : 'inactive';
    setUpdatingShopStatus(true);

    try {
      await api.put(`/shop/${shopId}`, { status: nextStatus });
      setShopOpen(value);
      refreshData();
      ToastAndroid.show(
        value ? 'Shop is now open for bookings.' : 'Shop is now closed for bookings.',
        ToastAndroid.SHORT,
      );
    } catch (error: any) {
      console.log('Failed to update shop availability:', error?.response?.data || error?.message || error);
      ToastAndroid.show(
        error?.response?.data?.message || 'Unable to update shop status right now.',
        ToastAndroid.SHORT,
      );
    } finally {
      setUpdatingShopStatus(false);
    }
  };

  // 🔹 Handle double back press to exit and refresh data on focus
  useFocusEffect(
    useCallback(() => {
      // Refresh shop data when screen comes into focus
      refreshData();
      
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
          colors={['#71c5b4', '#6fa8dc']}
          start={{ x: 0, y: 0 }} 
          end={{ x: 1, y: 0 }} 
          style={styles.container}
      >
      {/* Header */}
      <Header shopName={shopName} toggleMenu={toggleMenu} />

      {/* Content */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shop Availability</Text>
          <View style={styles.availabilityCard}>
            <View style={styles.settingContent}>
              <Image source={require('../../assets/img/service.png')} style={styles.settingIcon} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>{shopOpen ? 'Open for bookings' : 'Closed for bookings'}</Text>
                <Text style={styles.settingSubtitle}>Customers can see your shop as {shopOpen ? 'open' : 'closed'}.</Text>
              </View>
            </View>

            {updatingShopStatus ? (
              <ActivityIndicator size="small" color="#2f6fed" />
            ) : (
              <Switch
                value={shopOpen}
                onValueChange={handleShopAvailabilityToggle}
                trackColor={{ false: '#d1d5db', true: '#4ade80' }}
                thumbColor={shopOpen ? '#ffffff' : '#f3f4f6'}
              />
            )}
          </View>
        </View>

        {/* Shop Management Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shop Management</Text>
          
          <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('ShopInfo')}>
            <View style={styles.settingContent}>
              <Image source={require('../../assets/img/service.png')} style={styles.settingIcon} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Shop Information</Text>
                <Text style={styles.settingSubtitle}>Edit shop details and images</Text>
              </View>
            </View>
            <Image source={require('../../assets/img/back.png')} style={styles.arrow} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('VerificationDocuments')}>
            <View style={styles.settingContent}>
              <Image source={require('../../assets/img/booking.png')} style={styles.settingIcon} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Verification Documents</Text>
                <Text style={styles.settingSubtitle}>Upload required shop verification files</Text>
              </View>
            </View>
            <Image source={require('../../assets/img/back.png')} style={styles.arrow} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('PickupDeliverySettings')}>
            <View style={styles.settingContent}>
              <Image source={require('../../assets/img/booking.png')} style={styles.settingIcon} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Pickup & Delivery Settings</Text>
                <Text style={styles.settingSubtitle}>Enable or disable pickup orders</Text>
              </View>
            </View>
            <Image source={require('../../assets/img/back.png')} style={styles.arrow} />
          </TouchableOpacity>
        </View>

        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Settings</Text>
          
          <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('EditProfile')}>
            <View style={styles.settingContent}>
              <Image source={require('../../assets/img/avatar.png')} style={styles.settingIcon} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Edit Profile</Text>
                <Text style={styles.settingSubtitle}>Update your personal information</Text>
              </View>
            </View>
            <Image source={require('../../assets/img/back.png')} style={styles.arrow} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('AccountSettings')}>
            <View style={styles.settingContent}>
              <Image source={require('../../assets/img/settings.png')} style={styles.settingIcon} />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Account Settings</Text>
                <Text style={styles.settingSubtitle}>Change password or phone number</Text>
              </View>
            </View>
            <Image source={require('../../assets/img/back.png')} style={styles.arrow} />
          </TouchableOpacity>
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
  icon: { width: 30, height: 30, resizeMode: 'contain', tintColor: '#fff' },
  scrollContent: { padding: 16, paddingBottom: 60 },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 15,
  },
  
  // Settings Styles
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
    marginLeft: 4,
  },
  availabilityCard: {
    backgroundColor: '#ffffffdd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  settingItem: {
    backgroundColor: '#ffffffdd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 24,
    height: 24,
    marginRight: 16,
    tintColor: '#666',
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  arrow: {
    width: 18,
    height: 18,
    tintColor: '#999',
    marginLeft: 8,
    transform: [{ rotate: '180deg' }],
  },
});
