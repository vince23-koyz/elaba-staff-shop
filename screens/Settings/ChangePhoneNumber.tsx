import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, API_ENDPOINTS } from '../../config/api';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/Navigator';

export default function ChangePhoneNumber() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [currentPhone, setCurrentPhone] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [newPhone, setNewPhone] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const maskPhoneNumber = (phone: string) => {
    if (!phone) return 'Not set';
    const digits = phone.replace(/\D/g, '');
    if (digits.length <= 8) return digits;
    const start = digits.slice(0, 4);
    const end = digits.slice(-4);
    return `${start} **** ${end}`;
  };

  const loadCurrentPhone = async () => {
    try {
      setLoading(true);
      const userDataStr = await AsyncStorage.getItem('userData');
      const userData = userDataStr ? JSON.parse(userDataStr) : null;
      const adminId = userData?.admin_id || userData?.adminId;
      if (!adminId) {
        Alert.alert('Error', 'Please login again.');
        navigation.navigate('Login');
        return;
      }
  const res = await api.get(API_ENDPOINTS.ADMIN.BY_ID(adminId));
      if (res.data?.phone_number) {
        setCurrentPhone(res.data.phone_number);
      }
    } catch (e) {
      // fallback to storage
      const cached = await AsyncStorage.getItem('adminPhone');
      if (cached) setCurrentPhone(cached);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurrentPhone();
  }, []);

  const onSubmit = async () => {
    Alert.alert(
      'Phone Change Restricted',
      'For your security, changing your phone number requires verification. This flow will be enabled in a future update.',
      [{ text: 'OK' }]
    );
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
        <Text style={styles.headerTitle}>Phone Number</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Current</Text>
          <View style={styles.readonlyRow}>
            <Text style={styles.readonlyValue}>{maskPhoneNumber(currentPhone)}</Text>
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 18 }]}>New Phone Number</Text>
          <TextInput
            style={styles.input}
            keyboardType="phone-pad"
            placeholder="09xxxxxxxxx"
            placeholderTextColor="#9aa0a6"
            value={newPhone}
            onChangeText={setNewPhone}
          />

          <Text style={styles.note}>
            Your phone number is used for login and account recovery. We'll require an OTP verification to apply any changes.
          </Text>

          <TouchableOpacity style={styles.submitButton} onPress={onSubmit} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
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
  placeholder: { width: 25 },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffffdd',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  readonlyRow: {
    backgroundColor: '#f4f6f8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e6ee',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  readonlyValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dfe4ea',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2c3e50',
  },
  note: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 8,
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#5c7eb0',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
