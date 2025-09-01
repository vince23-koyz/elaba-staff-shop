import { 
  StyleSheet, Text, View, TouchableOpacity, 
  ScrollView, Animated, Dimensions, BackHandler, ToastAndroid, ActivityIndicator 
} from 'react-native'
import React, { useState, useRef, useCallback } from 'react'
import LinearGradient from 'react-native-linear-gradient'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../navigation/Navigator'

import SideMenu from '../../components/SideMenu'
import Header from '../../components/Header'

import { useAdminData } from '../../hooks/useAdminData'
import { useShopServices } from '../../hooks/useShopServices'

const { width } = Dimensions.get('window')

export default function ServiceManagement() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const [menuOpen, setMenuOpen] = useState(false)
  const slideAnim = useRef(new Animated.Value(-width)).current
  const backPressRef = useRef<number>(0)

  const { adminName, shopName, shopId } = useAdminData()
  const { services, loading, refetch } = useShopServices(shopId)

  // 🔹 Toggle Side Menu
  const toggleMenu = () => {
    if (menuOpen) {
      Animated.timing(slideAnim, { toValue: -width, duration: 100, useNativeDriver: false }).start(() => setMenuOpen(false))
    } else {
      setMenuOpen(true)
      Animated.timing(slideAnim, { toValue: 0, duration: 100, useNativeDriver: false }).start()
    }
  }

  // 🔹 Handle back button
  useFocusEffect(
    useCallback(() => {
      if (shopId) refetch()

      const backAction = () => {
        if (menuOpen) {
          toggleMenu()
          return true
        }
        const now = Date.now()
        if (backPressRef.current && now - backPressRef.current < 2000) {
          BackHandler.exitApp()
          return true
        }
        backPressRef.current = now
        ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT)
        return true
      }

      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction)
      return () => backHandler.remove()
    }, [menuOpen, shopId])
  )

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
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Services</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('AddService', { shopId })}
          >
            <Text style={styles.addBtnText}>+ Add Service</Text>
          </TouchableOpacity>
        </View>

        {/* Services List */}
        {loading ? (
          <ActivityIndicator size="large" color="#fff" style={{ marginTop: 50 }} />
        ) : services.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No services found for this shop.</Text>
          </View>
        ) : (
          <View style={styles.cardsBackground}>
            {services.map((service) => (
              <TouchableOpacity
                key={service.service_id}
                style={styles.serviceCard}
                activeOpacity={0.9}
                onPress={() => navigation.navigate('ServiceDetails', { serviceId: service.service_id, shopId })}
              >
                {/* Left Status Badge */}
                <View
                  style={[
                    styles.statusBadge,
                    service.status === 'Active' || service.status === 1
                      ? { backgroundColor: '#45d549' }
                      : { backgroundColor: '#e1382c' }
                  ]}
                >
                  <Text style={styles.statusText}>
                    {service.status === 1 || service.status === "Active" ? "Active" : "Inactive"}
                  </Text>
                </View>

                {/* Card Content */}
                <View style={styles.cardContent}>
                  <Text style={styles.serviceName}>{service.offers}</Text>
                  <Text numberOfLines={2} style={styles.serviceDetail}>{service.description}</Text>
                  <View style={styles.cardFooter}>
                    <Text style={styles.price}>₱{service.price}</Text>
                    <Text style={styles.quantity}>Available: {service.quantity}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
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
  scrollContent: { padding: 16, paddingBottom: 60 },

  sectionHeader: { marginBottom: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },

  addBtn: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 14,
    elevation: 3,
  },
  addBtnText: { color: '#5c7eb0', fontWeight: '700', fontSize: 14 },

  serviceCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    overflow: 'hidden',
    marginBottom: 14,
  },
  statusBadge: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    minWidth: 70,
  },
  statusText: { color: '#fff', fontWeight: '600', fontSize: 12, textTransform: 'uppercase' },

  cardContent: { flex: 1, padding: 14 },
  serviceName: { fontSize: 16, fontWeight: '700', color: '#2c3e50', marginBottom: 6 },
  serviceDetail: { fontSize: 13, color: '#7f8c8d', marginBottom: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  price: { fontWeight: '700', color: '#34495e', fontSize: 14 },
  quantity: { color: '#666', fontSize: 13 },

  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 15 },

  emptyContainer: { marginTop: 50, alignItems: 'center' },
  emptyText: { color: '#fff', fontSize: 16, opacity: 0.9 },

  cardsBackground: {
    backgroundColor: '#e5e5e5', 
    borderRadius: 16,
    padding: 12,
    marginBottom: 20,
  },
})
