// eLaba_staff/components/SideMenu.tsx
import React, { useEffect, useRef, useState } from 'react';
import { 
  Animated, View, Text, TouchableOpacity, Dimensions, StyleSheet, 
  Image, ScrollView, Modal 
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/Navigator';


const { width } = Dimensions.get('window');

// ✅ SideMenu Props
type SideMenuProps = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
  menuOpen: boolean;
  toggleMenu: () => void;
  adminName: string;
};

// ✅ Menu Item type for screens that don't require parameters
type MenuScreens = 'Home' | 'BookingManagement' | 'ServiceManagement' | 'Settings';

type MenuItem = {
  text: string;
  icon: any;
  navigate: MenuScreens;
};

export default function SideMenu({ navigation, menuOpen, toggleMenu, adminName }: SideMenuProps) {
  const slideAnim = useRef(new Animated.Value(-250)).current;
  const [logoutModal, setLogoutModal] = useState(false);

  // Slide animation
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: menuOpen ? 0 : -width,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [menuOpen]);

  // Current screen
  const currentRoute = navigation.getState().routes[navigation.getState().index].name;

  // Menu items
  const menuItems: MenuItem[] = [
    { text: 'Dashboard', icon: require('../assets/img/dashboard.png'), navigate: 'Home' },
    { text: 'Booking Management', icon: require('../assets/img/booking.png'), navigate: 'BookingManagement' },
    { text: 'Service Management', icon: require('../assets/img/service.png'), navigate: 'ServiceManagement' },
    { text: 'Settings', icon: require('../assets/img/settings.png'), navigate: 'Settings' },
  ];

  // Logout handler
  const handleLogout = () => {
    setLogoutModal(false);
    toggleMenu();

    // Fully type-safe reset
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login', params: undefined }],
    });
  };

  return (
    <>
      <Animated.View style={[styles.sideMenu, { left: slideAnim }]}>
        {/* Header */}
        <LinearGradient colors={['#6bd1c5', '#356dc1']} style={styles.header}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarWrapper}>
              <Image source={require('../assets/img/avatar.png')} style={styles.avatar} />
              <View style={styles.onlineIndicator} />
            </View>
          </View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.nameText}>{adminName}</Text>
          <View style={styles.headerDivider} />
        </LinearGradient>

        {/* Menu Items */}
        <ScrollView showsVerticalScrollIndicator={false} style={styles.menuContainer}>
          {menuItems.map((item, index) => {
            const isActive = currentRoute === item.navigate;
            return (
              <TouchableOpacity
                key={item.navigate}
                style={[
                  styles.menuItem, 
                  isActive && styles.activeMenuItem,
                  { marginTop: index === 0 ? 10 : 0 }
                ]}
                onPress={() => {
                  if (currentRoute !== item.navigate) {
                    navigation.navigate(item.navigate);
                    toggleMenu();
                  }
                }}
                activeOpacity={0.8}
              >
                <View style={styles.menuItemContent}>
                  <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
                    <Image 
                      source={item.icon} 
                      style={[styles.menuIcon, isActive && styles.activeMenuIcon]} 
                    />
                  </View>
                  <Text style={[styles.menuText, isActive && styles.activeMenuText]}>
                    {item.text}
                  </Text>
                  {isActive && <View style={styles.activeIndicator} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Logout */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity style={styles.logoutBtn} onPress={() => setLogoutModal(true)}>
            <LinearGradient colors={['#e53935', '#c62828']} style={styles.logoutGradient}>
              <View style={styles.logoutIconContainer}>
                <Image source={require('../assets/img/signout.png')} style={styles.logoutIcon} />
              </View>
              <Text style={styles.logoutText}>Sign out</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Logout Modal */}
      <Modal
        visible={logoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconContainer}>
                <Image source={require('../assets/img/signout.png')} style={styles.modalIcon} />
              </View>
              <Text style={styles.modalTitle}>Confirm Logout</Text>
            </View>
            <Text style={styles.modalMessage}>Are you sure you want to log out of your account?</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.cancelBtn]} 
                onPress={() => setLogoutModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.confirmBtn]} 
                onPress={handleLogout}
              >
                <Text style={styles.confirmBtnText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

// Enhanced Modern Styles
const styles = StyleSheet.create({
  sideMenu: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: width * 0.80,
    backgroundColor: '#ffffff',
    zIndex: 20,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    borderTopRightRadius: 25,
    borderBottomRightRadius: 25,
    overflow: 'hidden'
  },

  // Header Styles
  header: { 
    paddingTop: 50, 
    paddingBottom: 25, 
    alignItems: 'center',
    position: 'relative'
  },
  avatarContainer: {
    marginBottom: 15,
    alignItems: 'center'
  },
  avatarWrapper: { 
    width: 85, 
    height: 85, 
    borderRadius: 45, 
    borderWidth: 3, 
    borderColor: '#ffffff', 
    marginBottom: 12, 
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  },
  avatar: { 
    width: '100%', 
    height: '100%' 
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#ffffff'
  },
  welcomeText: { 
    fontSize: 15, 
    color: '#e8eaf6',
    fontWeight: '400',
    marginBottom: 4
  },
  nameText: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 15
  },
  headerDivider: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)'
  },

  // Menu Container
  menuContainer: { 
    paddingHorizontal: 20, 
    paddingVertical: 20,
    flex: 1
  },

  // Menu Items
  menuItem: { 
    paddingVertical: 16, 
    paddingHorizontal: 16, 
    borderRadius: 15, 
    marginBottom: 8,
    backgroundColor: 'transparent'
  },
  activeMenuItem: { 
    backgroundColor: '#e5ecf5',
    shadowColor: '#2745b0',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#1fa0a2'
  },
  menuItemContent: { 
    flexDirection: 'row', 
    alignItems: 'center',
    position: 'relative'
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  activeIconContainer: {
    backgroundColor: '#bed8e7',
    shadowColor: '#1fa0a2',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3
  },
  menuIcon: { 
    width: 24, 
    height: 24, 
    resizeMode: 'contain', 
    tintColor: '#666666'
  },
  activeMenuIcon: { 
    tintColor: '#1fa0a2'
  },
  menuText: { 
    fontSize: 16, 
    color: '#424242',
    fontWeight: '500',
    flex: 1
  },
  activeMenuText: { 
    color: '#1fa0a2', 
    fontWeight: '700'
  },
  activeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1fa0a2',
    marginLeft: 10
  },

  // Logout Section
  logoutContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 10
  },
  logoutBtn: { 
    borderRadius: 15, 
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#d32f2f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  logoutGradient: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 16, 
    paddingHorizontal: 20, 
    justifyContent: 'center'
  },
  logoutIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  logoutIcon: {
    width: 18,
    height: 18,
    tintColor: '#ffffff',
    resizeMode: 'contain'
  },
  logoutText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#ffffff'
  },

  // Modal Styles
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 20
  },
  modalBox: { 
    width: '90%', 
    maxWidth: 340,
    backgroundColor: '#ffffff', 
    borderRadius: 20, 
    padding: 24, 
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20
  },
  modalIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffebee',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15
  },
  modalIcon: {
    width: 28,
    height: 28,
    tintColor: '#d32f2f',
    resizeMode: 'contain'
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#212121',
    textAlign: 'center'
  },
  modalMessage: { 
    fontSize: 16, 
    color: '#666666', 
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 22
  },
  modalActions: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    gap: 12
  },
  modalBtn: { 
    flex: 1,
    paddingVertical: 14, 
    paddingHorizontal: 20, 
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelBtn: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  confirmBtn: {
    backgroundColor: '#d32f2f',
    elevation: 2,
    shadowColor: '#d32f2f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4
  },
  cancelBtnText: {
    fontSize: 15, 
    fontWeight: '600', 
    color: '#424242'
  },
  confirmBtnText: {
    fontSize: 15, 
    fontWeight: '600', 
    color: '#ffffff'
  }
});
