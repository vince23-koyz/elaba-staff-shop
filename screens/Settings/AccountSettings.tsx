import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, API_ENDPOINTS } from '../../config/api';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/Navigator';

export default function AccountSettings() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Global
  const [initialLoading, setInitialLoading] = useState(true);
  const [adminId, setAdminId] = useState<number | null>(null);

  // Edit mode control: we only support password changes for now
  const [editing, setEditing] = useState<'none' | 'password'>('none');

  // Phone state
  const [currentPhone, setCurrentPhone] = useState<string>('');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const maskPhoneNumber = (phone: string) => {
    if (!phone) return 'Not set';
    const digits = phone.replace(/\D/g, '');
    if (digits.length <= 8) return digits;
    const start = digits.slice(0, 4);
    const end = digits.slice(-4);
    return `${start} **** ${end}`;
  };

  const validatePassword = (password: string) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasNonalphas = /\W/.test(password);
    if (password.length < minLength) return `Password must be at least ${minLength} characters long`;
    if (!hasUpperCase) return 'Password must contain at least one uppercase letter';
    if (!hasLowerCase) return 'Password must contain at least one lowercase letter';
    if (!hasNumbers) return 'Password must contain at least one number';
    if (!hasNonalphas) return 'Password must contain at least one special character';
    return '';
  };

  const loadData = async () => {
    try {
      setInitialLoading(true);
      const userDataStr = await AsyncStorage.getItem('userData');
      const userData = userDataStr ? JSON.parse(userDataStr) : null;
      const id = userData?.admin_id || userData?.adminId;
      if (!id) {
        Alert.alert('Error', 'Please login again.');
        navigation.navigate('Login');
        return;
      }
      setAdminId(Number(id));
  const res = await api.get(API_ENDPOINTS.ADMIN.BY_ID(id));
      setCurrentPhone(res.data?.phone_number || '');
    } catch (e) {
      const cached = await AsyncStorage.getItem('adminPhone');
      if (cached) setCurrentPhone(cached);
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChangePassword = async () => {
    // Reset errors
    setErrors({ currentPassword: '', newPassword: '', confirmPassword: '' });

    let hasErrors = false;
    const newErrors = { currentPassword: '', newPassword: '', confirmPassword: '' };

    if (!currentPassword.trim()) { newErrors.currentPassword = 'Current password is required'; hasErrors = true; }

    if (!newPassword.trim()) {
      newErrors.newPassword = 'New password is required';
      hasErrors = true;
    } else {
      const passwordError = validatePassword(newPassword);
      if (passwordError) { newErrors.newPassword = passwordError; hasErrors = true; }
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your new password';
      hasErrors = true;
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      hasErrors = true;
    }

    if (currentPassword === newPassword) {
      newErrors.newPassword = 'New password must be different from current password';
      hasErrors = true;
    }

    if (hasErrors) { setErrors(newErrors); return; }

    setSavingPassword(true);
    try {
      if (!adminId) {
        Alert.alert('Error', 'Admin ID not found. Please login again.');
        return;
      }
      const response = await api.post(`${API_ENDPOINTS.ADMIN.BASE}/${adminId}/change-password`, {
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
      });

      if (response.data.success) {
        Alert.alert('Success', 'Password changed successfully', [{ text: 'OK', onPress: () => setEditing('none') }]);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert('Error', response.data.message || 'Failed to change password');
      }
    } catch (error: any) {
      if (error.response?.data?.message === 'Current password is incorrect') {
        setErrors({ currentPassword: 'Current password is incorrect', newPassword: '', confirmPassword: '' });
      } else if (error.message === 'Network Error') {
        Alert.alert('Error', 'Network error. Please check your connection and try again.');
      } else {
        Alert.alert('Error', 'Failed to change password. Please try again.');
      }
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <LinearGradient colors={['#71c5b4', '#6fa8dc']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.container}>
      <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Image source={require('../../assets/img/back.png')} style={styles.backIcon} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Account Settings</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {initialLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingText}>Loading account...</Text>
            </View>
          ) : (
            <View style={styles.formContainer}>
              {/* Phone Section */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Phone Number</Text>
                <View style={styles.rowBetween}>
                  <View style={styles.phoneDisplay}>
                    <Text style={styles.label}>Current</Text>
                    <Text style={styles.value}>{maskPhoneNumber(currentPhone)}</Text>
                  </View>
                </View>
                <Text style={styles.note}>
                  Phone numbers are protected for login and OTP security. Editing this field will be enabled in a future secure update.
                </Text>
              </View>

              {/* Divider */}
              <View style={{ height: 1, opacity: 0.3 }} />

              {/* Password Section */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Password</Text>

                {editing !== 'password' ? (
                  <View style={styles.rowBetween}>
                    <Text style={styles.label}>Maintain a strong password to keep your account secure.</Text>
                    <TouchableOpacity
                      style={styles.editPill}
                      onPress={() => setEditing('password')}
                    >
                      <Text style={styles.editPillText}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    <Text style={styles.label}>Current Password</Text>
                    <View style={styles.passwordFieldContainer}>
                      <TextInput
                        style={[styles.input, styles.passwordInput]}
                        placeholder="Enter current password"
                        placeholderTextColor="#9aa0a6"
                        secureTextEntry={!showCurrentPassword}
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                      />
                      <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                      >
                        <Image
                          source={showCurrentPassword ? require('../../assets/img/visibility.png') : require('../../assets/img/visibility-off.png')}
                          style={styles.eyeIcon}
                        />
                      </TouchableOpacity>
                    </View>
                    {errors.currentPassword ? <Text style={styles.errorText}>{errors.currentPassword}</Text> : null}

                    <Text style={styles.label}>New Password</Text>
                    <View style={styles.passwordFieldContainer}>
                      <TextInput
                        style={[styles.input, styles.passwordInput]}
                        placeholder="Enter new password"
                        placeholderTextColor="#9aa0a6"
                        secureTextEntry={!showNewPassword}
                        value={newPassword}
                        onChangeText={setNewPassword}
                      />
                      <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() => setShowNewPassword(!showNewPassword)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={showNewPassword ? 'Hide new password' : 'Show new password'}
                      >
                        <Image
                          source={showNewPassword ? require('../../assets/img/visibility.png') : require('../../assets/img/visibility-off.png')}
                          style={styles.eyeIcon}
                        />
                      </TouchableOpacity>
                    </View>
                    {errors.newPassword ? <Text style={styles.errorText}>{errors.newPassword}</Text> : null}

                    <Text style={styles.label}>Confirm New Password</Text>
                    <View style={styles.passwordFieldContainer}>
                      <TextInput
                        style={[styles.input, styles.passwordInput]}
                        placeholder="Confirm new password"
                        placeholderTextColor="#9aa0a6"
                        secureTextEntry={!showConfirmPassword}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                      />
                      <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={showConfirmPassword ? 'Hide confirmed password' : 'Show confirmed password'}
                      >
                        <Image
                          source={showConfirmPassword ? require('../../assets/img/visibility.png') : require('../../assets/img/visibility-off.png')}
                          style={styles.eyeIcon}
                        />
                      </TouchableOpacity>
                    </View>
                    {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}

                    <Text style={styles.note}>You can only edit one item at a time.</Text>

                    <View style={styles.rowBetween}>
                      <TouchableOpacity style={[styles.cancelBtn]} onPress={() => setEditing('none')}>
                        <Text style={styles.cancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.saveBtn]} onPress={handleChangePassword} disabled={savingPassword}>
                        {savingPassword ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Change Password</Text>}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50 },
  flex1: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, zIndex: 10,
  },
  backButton: { padding: 8 },
  backIcon: { width: 25, height: 25, tintColor: '#fff', resizeMode: 'contain' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  placeholder: { width: 50 },
  scrollContent: { padding: 16, paddingBottom: 60 },
  formContainer: { flex: 1 },
  loadingContainer: { justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  loadingText: { fontSize: 16, color: '#fff', marginTop: 12, fontWeight: '600' },

  card: {
    backgroundColor: '#ffffffdd',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 14, color: '#333', marginBottom: 8, maxWidth: '70%' },
  phoneDisplay: { flex: 1 },
  value: { fontSize: 16, fontWeight: '700', color: '#2c3e50' },
  input: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#dfe4ea',
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: '#2c3e50', marginBottom: 8,
  },
  passwordFieldContainer: { position: 'relative' },
  passwordInput: { paddingRight: 58 },
  eyeButton: {
    position: 'absolute',
    right: 10,
    top: 2,
    width: 36,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    elevation: 2,
  },
  eyeIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
    tintColor: '#475569',
  },
  note: { fontSize: 12, color: '#7f8c8d', marginBottom: 12 },
  errorText: { color: '#e74c3c', fontSize: 12, marginBottom: 8 },
  editPill: { backgroundColor: '#5c7eb0', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20 },
  disabledPill: { opacity: 0.6 },
  editPillText: { color: '#fff', fontWeight: '700' },
  cancelBtn: { backgroundColor: '#999', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 },
  cancelText: { color: '#fff', fontWeight: '700' },
  saveBtn: { backgroundColor: '#5c7eb0', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 },
  saveText: { color: '#fff', fontWeight: '700' },
});
