import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/Navigator';
import { API_CONFIG } from '../../config/api';

export default function PickupDeliverySettings() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    loadShopSetting();
  }, []);

  const loadShopSetting = async () => {
    try {
      setLoading(true);
      const userDataStr = await AsyncStorage.getItem('userData');
      if (!userDataStr) {
        Alert.alert('Error', 'User session not found');
        return;
      }

      const userData = JSON.parse(userDataStr);
      const shopId = userData.shop_id || userData.shopId;
      const adminId = userData.admin_id || userData.adminId;

      let shopData: any = null;
      if (shopId && !isNaN(Number(shopId))) {
        const response = await fetch(`${API_CONFIG.BASE_URL}/shop/${shopId}`);
        if (response.ok) {
          shopData = await response.json();
        }
      }

      if (!shopData && adminId && !isNaN(Number(adminId))) {
        const response = await fetch(`${API_CONFIG.BASE_URL}/shop/admin/${adminId}`);
        if (response.ok) {
          const payload = await response.json();
          shopData = payload.shop;
        }
      }

      if (!shopData) {
        Alert.alert('Error', 'Shop data not found.');
        return;
      }

      const isEnabled = !!shopData.pickup_delivery_enabled && String(shopData.pickup_delivery_enabled) !== '0';
      setEnabled(isEnabled);
    } catch (error: any) {
      console.error('Failed to load shop pickup setting:', error);
      Alert.alert('Error', 'Failed to load pickup setting.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (nextValue: boolean) => {
    if (saving) {
      return;
    }

    try {
      setSaving(true);
      setEnabled(nextValue);

      const userDataStr = await AsyncStorage.getItem('userData');
      if (!userDataStr) {
        Alert.alert('Error', 'User session not found');
        return;
      }

      const userData = JSON.parse(userDataStr);
      const shopId = userData.shop_id || userData.shopId;
      const adminId = userData.admin_id || userData.adminId;
      const idToUse = shopId && !isNaN(Number(shopId)) ? shopId : adminId;

      if (!idToUse) {
        Alert.alert('Error', 'No shop ID found.');
        return;
      }

      const formData = new FormData();
      formData.append('pickup_delivery_enabled', nextValue ? '1' : '0');

      const res = await fetch(`${API_CONFIG.BASE_URL}/shop/${idToUse}`, {
        method: 'PUT',
        body: formData,
        headers: { Accept: 'application/json' },
      });

      const responseData = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(responseData?.message || 'Failed to update pickup setting');
      }

      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Failed to save pickup setting:', error);
      setEnabled(!nextValue);
      Alert.alert('Error', error.message || 'Failed to update pickup setting.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <LinearGradient
      colors={['#71c5b4', '#6fa8dc']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Image source={require('../../assets/img/back.png')} style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pickup & Delivery</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.title}>Pickup Service</Text>
          <Text style={styles.subtitle}>Turn pickup booking on or off for your customers.</Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4f46e5" />
            </View>
          ) : (
            <>
              <View style={styles.toggleRow}>
                <View style={styles.toggleTextWrap}>
                  <Text style={styles.toggleLabel}>Enable pickup ordering</Text>
                  <Text style={styles.toggleHint}>Customers can choose pickup when booking services.</Text>
                </View>
                <Switch
                  value={enabled}
                  onValueChange={(value) => handleSave(value)}
                  disabled={saving}
                  trackColor={{ false: '#d1d5db', true: '#2bb673' }}
                  thumbColor="#fff"
                  ios_backgroundColor="#d1d5db"
                />
              </View>

              <View style={styles.toggleSaveHintWrap}>
                <Text style={styles.toggleSaveHint}>Changes save automatically</Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <Modal
        transparent
        visible={showSuccessModal}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successCard}>
            <View style={styles.checkCircle}>
              <Text style={styles.checkMark}>✓</Text>
            </View>
            <Text style={styles.successTitle}>Done</Text>
            <Text style={styles.successMessage}>
              {enabled ? 'Pickup service is now enabled.' : 'Pickup service is now disabled.'}
            </Text>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    width: 25,
    height: 25,
    tintColor: '#fff',
    resizeMode: 'contain',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  placeholder: {
    width: 50,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 22,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  toggleTextWrap: {
    flex: 1,
    marginRight: 16,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  toggleHint: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  toggleSaveHintWrap: {
    marginTop: 8,
    alignItems: 'center',
  },
  toggleSaveHint: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  successCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#e8fff2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkMark: {
    fontSize: 34,
    color: '#1ea96a',
    fontWeight: '800',
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 15,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  doneButton: {
    width: '100%',
    backgroundColor: '#1c7c54',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
