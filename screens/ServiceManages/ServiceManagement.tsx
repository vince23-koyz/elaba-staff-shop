import { 
  StyleSheet, Text, View, TouchableOpacity, 
  ScrollView, Animated, Dimensions, BackHandler, ToastAndroid, ActivityIndicator} from 'react-native'
import React, { useState, useRef, useCallback } from 'react'
import LinearGradient from 'react-native-linear-gradient'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../navigation/Navigator'

import SideMenu from '../../components/SideMenu'
import Header from '../../components/Header'

import { useAdminData } from '../../hooks/useAdminData'
import { useShopServices } from '../../hooks/useShopServices'
import ServiceFormModal from './ServiceFormModal'
import ServiceDetailsModal from './ServiceDetailsModal'

const { width } = Dimensions.get('window')

export default function ServiceManagement() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const [menuOpen, setMenuOpen] = useState(false)
  const slideAnim = useRef(new Animated.Value(-width)).current
  const backPressRef = useRef<number>(0)

  const { adminName, shopName, shopId } = useAdminData()
  const { services, loading, refetch } = useShopServices(shopId)
  const hScrollRef = useRef<any>(null)
  const [formVisible, setFormVisible] = useState(false)
  const [formMode, setFormMode] = useState<'add'|'edit'>('add')
  const [selectedService, setSelectedService] = useState<any | null>(null)
  const [detailsVisible, setDetailsVisible] = useState(false)

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
      colors={['#71c5b4', '#6fa8dc']}
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
            onPress={() => {
              setSelectedService(null)
              setFormMode('add')
              setFormVisible(true)
            }}
            activeOpacity={0.8}
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
          <View style={styles.tableWrapper}>
            <ScrollView
              ref={hScrollRef}
              horizontal
              showsHorizontalScrollIndicator
            >
              <View style={styles.tableContainer}>
                
                {/* Header Row */}
                <View style={[styles.tableRow, styles.tableHeader]}>
                  <View style={[styles.cell, styles.colStatus]}>
                    <Text style={[styles.headerText, { textAlign: 'center' }]}>Status</Text>
                  </View>
                  <View style={[styles.cell, styles.colService]}>
                    <Text style={[styles.headerText, { textAlign: 'left' }]}>Service</Text>
                  </View>
                  <View style={[styles.cell, styles.colDesc]}>
                    <Text style={[styles.headerText, { textAlign: 'left' }]}>Description</Text>
                  </View>
                  <View style={[styles.cell, styles.colPrice]}>
                    <Text style={[styles.headerText, { textAlign: 'right' }]}>Price</Text>
                  </View>
                  <View style={[styles.cell, styles.colActions]}>
                    <Text style={[styles.headerText, { textAlign: 'center' }]}>Actions</Text>
                  </View>
                </View>

                {/* Data Rows */}
                {services.map((service, index) => (
                  <TouchableOpacity
                    key={service.service_id}
                    activeOpacity={0.85}
                    style={[styles.tableRow, index % 2 === 0 ? styles.zebraEven : styles.zebraOdd, {borderRadius: 8, marginBottom: 2, borderBottomWidth: 1, borderBottomColor: '#e0e4ea'}]}
                    onPress={() => {
                      setSelectedService(service)
                      setDetailsVisible(true)
                    }}
                  >
                    {/* Status */}
                    <View style={[styles.cell, styles.colStatus]}>
                      <View style={{
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 16,
                        backgroundColor: service.status === 1 || service.status === 'Active' ? '#4CAF50' : '#F44336',
                        minWidth: 70,
                      }}>
                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12, textAlign: 'center' }}>
                          {service.status === 1 || service.status === 'Active' ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>

                    {/* Service */}
                    <View style={[styles.cell, styles.colService]}>
                      <Text style={{ color: '#222', fontWeight: '600', fontSize: 15 }} numberOfLines={1}>
                        {service.offers && service.offers.length > 18
                          ? service.offers.substring(0, 15) + ' ...'
                          : service.offers}
                      </Text>
                    </View>

                    {/* Description */}
                    <View style={[styles.cell, styles.colDesc]}>
                      <Text style={{ color: '#666', fontSize: 13 }} numberOfLines={1}>
                        {service.description.length > 16 ? '...' : service.description}
                      </Text>
                    </View>

                    {/* Price */}
                    <View style={[styles.cell, styles.colPrice]}>
                      <Text style={{ color: '#388E3C', fontWeight: 'bold', fontSize: 15, textAlign: 'right' }}>
                        ₱{service.price}
                      </Text>
                    </View>

                    {/* Actions */}
                    <View style={[styles.cell, styles.colActions]}>
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedService(service)
                          setFormMode('edit')
                          setFormVisible(true)
                        }}
                        style={{backgroundColor: '#1976D2', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6}}
                      >
                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>Edit</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
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

      {/* Service Form Modal (Add/Edit) */}
      <ServiceFormModal
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        mode={formMode}
        initial={selectedService}
        shopId={shopId}
        onSaved={refetch}
      />

      {/* Service Details Modal */}
      <ServiceDetailsModal
        visible={detailsVisible}
        onClose={() => setDetailsVisible(false)}
        service={selectedService}
        onEdit={(svc) => {
          setDetailsVisible(false)
          setSelectedService(svc)
          setFormMode('edit')
          setFormVisible(true)
        }}
      />
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  scrollContent: { padding: 0, paddingBottom: 60 },

  sectionHeader: {
    marginBottom: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
    marginRight: 12,
  },
  addBtn: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  addBtnText: {
    color: '#5c7eb0',
    fontWeight: '700',
    fontSize: 15,
  },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 15 },

  emptyContainer: { marginTop: 50, alignItems: 'center' },
  emptyText: { color: '#fff', fontSize: 16, opacity: 0.9 },

  // Table styles
  tableWrapper: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e4ea',
    overflow: 'hidden',
  },
  tableContainer: {
    minWidth: 720,
  },
  tableHeader: {
    backgroundColor: '#f6f9fc',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e4ea',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eef1f5',
    minHeight: 44,
    height: 52,
  },
  cell: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: '#eef1f5',
    justifyContent: 'center',
  },
  headerText: {
    fontWeight: '700',
    color: '#2c3e50',
    fontSize: 14,
  },
  colStatus: { width: 110, alignItems: 'center' },
  colService: { width: 160, alignItems: 'flex-start' },
  colDesc: { width: 260, alignItems: 'flex-start' },
  colPrice: { width: 100, alignItems: 'flex-end' },
  colActions: { width: 100, alignItems: 'center', borderRightWidth: 0 },
  zebraEven: { backgroundColor: '#fff' },
  zebraOdd: { backgroundColor: '#fbfdff' },
})
