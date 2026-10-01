// screens/LoginScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, Image, 
  TouchableOpacity, ScrollView, Alert, Dimensions, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/Navigator';
import { api, API_ENDPOINTS } from '../../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import { useNotificationContext } from '../../context/NotificationContext';
import LoadingOverlay from '../../components/LoadingOverlay';
import SuccessOverlay from '../../components/SuccessOverlay';
import CustomAlertModal from '../../components/CustomAlertModal';
import { updateDeviceToken } from '../../services/notificationService';

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { initializeForUser } = useNotificationContext();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [phoneValidated, setPhoneValidated] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const debounceTimeoutRef = useRef<number | null>(null);

  // Custom alert modal state
  const [showShopModal, setShowShopModal] = useState(false);
  const [pendingAdminId, setPendingAdminId] = useState<string | null>(null);

  // Custom error modals
  const [showPhoneErrorModal, setShowPhoneErrorModal] = useState(false);
  const [showCredentialsErrorModal, setShowCredentialsErrorModal] = useState(false);
  const [showRateLimitModal, setShowRateLimitModal] = useState(false);
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Validate Philippine phone number format
  const validatePhoneFormat = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const patterns = [
      /^63\d{10}$/, // +63 format (63XXXXXXXXXX)
      /^09\d{9}$/, // 09 format (09XXXXXXXXX)
      /^9\d{9}$/, // 9 format (9XXXXXXXXX)
    ];
    return patterns.some(pattern => pattern.test(cleanPhone));
  };

  // Function to validate phone number format only
  const validatePhoneNumber = (phone: string) => {
    if (!phone.trim()) {
      setPhoneError('');
      setPhoneValidated(false);
      return false;
    }

    if (!validatePhoneFormat(phone)) {
      setPhoneValidated(false);
      setPhoneError('Please enter a valid Philippine phone number (e.g., +63 9XX XXX XXXX, 09XX XXX XXXX)');
      return false;
    }

    setPhoneValidated(true);
    setPhoneError('');
    return true;
  };

  // Handle phone number input change with validation
  const handlePhoneNumberChange = (text: string) => {
    setPhoneNumber(text);
    setPhoneError('');
    setPhoneValidated(false);

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
  };

  const handleLogin = async () => {
    const isPhoneEmpty = !phoneNumber.trim();
    const isPasswordEmpty = !password.trim();

    if (isPhoneEmpty || isPasswordEmpty) {
      setPhoneError(isPhoneEmpty ? 'Please enter your phone number.' : '');
      setPasswordError(isPasswordEmpty ? 'Please enter your password.' : '');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      return;
    }

    setLoading(true);

    try {
      // Step 1: Login admin
      const loginResponse = await api.post(
        `${API_ENDPOINTS.ADMIN.BASE}/login`,
        { phone_number: phoneNumber, password },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (loginResponse.data.success) {
        const adminId = loginResponse.data.admin_id;
        console.log('Admin login successful, ID:', adminId);

        // Step 2: Get shop by admin_id
    const shopResponse = await api.get(API_ENDPOINTS.SHOP.BY_ADMIN(adminId));
        const shop = shopResponse.data.shop;

        if (shop) {
          // Store complete user data
          const userData = {
            admin_id: adminId,
            adminId: adminId,
            shop_id: shop.shop_id,
            shopId: shop.shop_id,
            shop_name: shop.name,
            shop_address: shop.address
          };
          await AsyncStorage.setItem('userData', JSON.stringify(userData));
          console.log('✅ Complete user data saved:', userData);

          // Also store individual admin_id for backward compatibility (if any other code needs it)
          await AsyncStorage.setItem('admin_id', String(adminId));
          await AsyncStorage.setItem('adminId', String(adminId));
          await AsyncStorage.setItem('adminName', loginResponse.data.admin_name || 'Admin');
          await AsyncStorage.setItem('isLoggedIn', 'true');

          // Step 3: Get FCM token
          const fcmToken = await messaging().getToken();
          console.log('📲 FCM Token:', fcmToken);
          await AsyncStorage.setItem('fcmToken', fcmToken);

          // Step 4: Save token to backend (deduped server-side)
          try {
            await updateDeviceToken({
              accountId: adminId,
              accountType: 'admin',
              shopId: shop.shop_id,
              token: fcmToken,
            });
            console.log('✅ Device token saved to backend');
          } catch (tokenError: any) {
            console.error('❌ Failed to save token:', tokenError.response?.data || tokenError.message);
          }

          // Fancy success UI then navigate
          setSuccessVisible(true);
          setTimeout(() => {
            setSuccessVisible(false);
            // Initialize notifications for the logged-in user
            initializeForUser();
            navigation.replace('Home');
          }, 900);
        } else {
          // No shop found - redirect to register shop
          console.log('❌ No shop found for admin ID:', adminId);

          // Store admin_id for the register shop flow
          await AsyncStorage.setItem('userData', JSON.stringify({
            admin_id: adminId,
            adminId: adminId,
          }));
          await AsyncStorage.setItem('admin_id', String(adminId));
          await AsyncStorage.setItem('adminId', String(adminId));
          await AsyncStorage.setItem('adminName', loginResponse.data.admin_name || 'Admin');
          await AsyncStorage.setItem('isLoggedIn', 'true');

          // Show success quick then custom modal for shop setup
          setSuccessVisible(true);
          setPendingAdminId(String(adminId));
          setTimeout(() => {
            setSuccessVisible(false);
            setShowShopModal(true);
          }, 800);
        }
      } else {
        setPassword('');
        const responseCode = loginResponse.data.code;
        if (responseCode === 'TOO_MANY_ATTEMPTS') {
          setShowRateLimitModal(true);
        } else {
          setShowCredentialsErrorModal(true);
        }
      }
    } catch (error: any) {
      console.log('Login Error:', error.response?.data || error.message || error);

      const responseData = error.response?.data || {};
      const responseCode = responseData.code;

      // Clear password field for security when login fails
      setPassword('');

      if (responseCode === 'TOO_MANY_ATTEMPTS') {
        setShowRateLimitModal(true);
      } else {
        setShowCredentialsErrorModal(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoToRegister = () => {
    navigation.navigate('Register');
  };


return (
  <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['#a9e5df', '#8baef3']}
        style={styles.container}
      >
        <KeyboardAvoidingView
          style={styles.flex1}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
        >
          <ScrollView 
            contentContainerStyle={[styles.scrollContainer, { flexGrow: 1 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentInsetAdjustmentBehavior="automatic"
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerText}>eLABA Staff & Shop Portal</Text>
            </View>

            {/* Logo & Title */}
            <View style={styles.centerContent}>
              <Image
                source={require('../../assets/img/elaba_icon.png')}
                style={styles.image}
              />
              <Text style={styles.title}>Login</Text>
              <Text style={styles.subtitle}>Admin Portal</Text>
            </View>

            {/* Form Card */}
            <View style={styles.formCard}>
              <Text style={styles.label}>PHONE NUMBER</Text>
              <TextInput
                style={[
                  styles.input,
                  phoneError ? styles.inputError : null
                ]}
                placeholder="+63"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={handlePhoneNumberChange}
                placeholderTextColor="#aaa"
              />
              {phoneError ? (
                <Text style={styles.errorText}>{phoneError}</Text>
              ) : null}

              <Text style={styles.label}>PASSWORD</Text>
              <View style={[styles.passwordContainer, passwordError ? styles.inputError : null]}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter your password"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setPasswordError('');
                  }}
                  placeholderTextColor="#aaa"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((prev) => !prev)}
                  style={styles.visibilityButton}
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Image
                    source={showPassword ? require('../../assets/img/visibility.png') : require('../../assets/img/visibility-off.png')}
                    style={styles.visibilityIcon}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </View>
              {passwordError ? (
                <Text style={styles.errorText}>{passwordError}</Text>
              ) : null}

              <TouchableOpacity onPress={() => navigation.navigate('PasswordRecovery')}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={handleLogin} 
                style={[
                  styles.button, 
                  (loading || phoneError) && styles.buttonDisabled
                ]} 
                disabled={loading || !!phoneError}
              >
                <LinearGradient
                  colors={
                    (loading || phoneError) 
                      ? ['#ccc', '#999'] 
                      : ['#4A90E2', '#357ABD']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>Login</Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.signupContainer}>
                <Text style={styles.signupText}>Don't have an account? </Text>
                <TouchableOpacity onPress={handleGoToRegister}>
                  <Text style={styles.signupLink}>Register</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
      <LoadingOverlay visible={loading} title="Signing you in" subtitle="Preparing your dashboard..." />
      <SuccessOverlay visible={successVisible} title="Login successful!" subtitle="Welcome" />
      {/* Custom Alert Modal for shop registration */}
      <CustomAlertModal
        visible={showShopModal}
        title="Welcome to eLaba!"
        message={"You haven't registered a shop yet. Let's set up your shop profile to get started!"}
        buttonText="Set Up My Shop"
        colorScheme="info"
        onButtonPress={() => {
          setShowShopModal(false);
          if (pendingAdminId) {
            navigation.replace('RegisterShop', { admin_id: Number(pendingAdminId) });
          }
        }}
        onRequestClose={() => setShowShopModal(false)}
      />
      {/* Custom Alert Modal for phone not registered error */}
      <CustomAlertModal
        visible={showPhoneErrorModal}
        title="Login Failed"
        message="The phone number or password you entered is incorrect. Please check your credentials and try again."
        buttonText="OK"
        colorScheme="error"
        onButtonPress={() => {
          setShowPhoneErrorModal(false);
          setPhoneNumber('');
        }}
        onRequestClose={() => setShowPhoneErrorModal(false)}
      />
      <CustomAlertModal
        visible={showCredentialsErrorModal}
        title="Login Failed"
        message="The phone number or password you entered is incorrect. Please check your credentials and try again."
        buttonText="OK"
        colorScheme="error"
        onButtonPress={() => setShowCredentialsErrorModal(false)}
        onRequestClose={() => setShowCredentialsErrorModal(false)}
      />
      <CustomAlertModal
        visible={showRateLimitModal}
        title="Too Many Attempts"
        message="Too many unsuccessful login attempts. Please wait a few minutes before trying again."
        buttonText="OK"
        colorScheme="error"
        onButtonPress={() => setShowRateLimitModal(false)}
        onRequestClose={() => setShowRateLimitModal(false)}
      />
    </View>
  </TouchableWithoutFeedback>
);

};


const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isTablet = SCREEN_WIDTH >= 768;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: SCREEN_HEIGHT * 0.06,
  },
  header: { marginTop: SCREEN_HEIGHT * 0.10, alignItems: 'center', marginBottom: SCREEN_HEIGHT * 0.04 },
  headerText: { fontWeight: 'bold', fontSize: SCREEN_WIDTH * 0.052, color: '#ffffff', letterSpacing: 1 },
  centerContent: { alignItems: 'center', marginBottom: SCREEN_HEIGHT * 0.04 },
  image: { width: SCREEN_WIDTH * 0.28, height: SCREEN_WIDTH * 0.28, marginBottom: 10, resizeMode: 'contain', borderRadius: 100 },
  title: { fontWeight: 'bold', fontSize: SCREEN_WIDTH * 0.065, color: '#222' },
  subtitle: { fontSize: SCREEN_WIDTH * 0.04, color: '#1e1e1e', marginTop: 4, fontWeight: '400' },
  formCard: {
    backgroundColor: '#fff',
    marginHorizontal: SCREEN_WIDTH * 0.05,
    borderRadius: 20,
    padding: SCREEN_WIDTH * 0.055,
    marginTop: SCREEN_HEIGHT * 0.01,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 8,
    elevation: 5,
  },
  label: { fontSize: SCREEN_WIDTH * 0.033, fontWeight: '700', color: '#555', marginBottom: 6, marginTop: 12, letterSpacing: 1 },
  input: { backgroundColor: '#f7f9fc', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 12, fontSize: SCREEN_WIDTH * 0.04, borderColor: '#e0e0e0', borderWidth: 1, color: '#222' },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f9fc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingLeft: 16,
    paddingRight: 10,
    marginBottom: 12,
    minHeight: 50,
  },
  passwordInput: {
    flex: 1,
    fontSize: SCREEN_WIDTH * 0.04,
    color: '#222',
    paddingVertical: 14,
  },
  visibilityButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  visibilityIcon: {
    width: 20,
    height: 20,
    tintColor: '#4A90E2',
  },
  forgotText: { alignSelf: 'center', color: '#2b7ecb', marginBottom: 20, fontSize: SCREEN_WIDTH * 0.036 },
  button: { marginTop: 20, borderRadius: 12, overflow: 'hidden', elevation: 3 },
  buttonDisabled: { opacity: 0.6 },
  buttonGradient: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  buttonText: { fontSize: SCREEN_WIDTH * 0.045, color: '#fff', fontWeight: '700' },
  signupContainer: { flexDirection: 'row', marginTop: 20, justifyContent: 'center' },
  signupText: { color: '#333' },
  signupLink: { color: '#2b7ecb', fontWeight: 'bold' },
  inputContainer: { position: 'relative' },
  inputSuccess: { borderColor: '#28a745', borderWidth: 2 },
  inputError: { borderColor: '#dc3545', borderWidth: 2 },
  validationIndicator: { 
    position: 'absolute', 
    right: 12, 
    top: 14, 
    width: 20, 
    height: 20, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  validationSuccess: { color: '#28a745', fontSize: 16, fontWeight: 'bold' },
  validationError: { color: '#dc3545', fontSize: 16, fontWeight: 'bold' },
  errorText: { color: '#dc3545', fontSize: 12, marginTop: 4, marginLeft: 4 },
  successText: { color: '#28a745', fontSize: 12, marginTop: 4, marginLeft: 4 },
});

export default LoginScreen;
