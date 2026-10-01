// screens/RegisterScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, Image, 
  TouchableOpacity, ScrollView, Alert, Modal 
} from 'react-native';
import CustomAlertModal from '../../components/CustomAlertModal';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/Navigator';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthService } from '../../services/authService';

const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Step-based registration (align with customer app): details -> otp -> password
  const [step, setStep] = useState<'details' | 'otp' | 'password'>('details');

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [street, setStreet] = useState('');
  const [zone, setZone] = useState('');
  const [barangay, setBarangay] = useState('');
  const [city, setCity] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);

  // OTP states
  const [smsCode, setSmsCode] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const otpRefs = useRef<Array<TextInput | null>>([]);
  const otpClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const timerRef = useRef<number | null>(null);

  // Error states for validation
  const [errors, setErrors] = useState({
    firstName: false,
    lastName: false,
    street: false,
    zone: false,
    barangay: false,
    city: false,
    phoneNumber: false,
    password: false,
    confirmPassword: false,
  });

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [adminId, setAdminId] = useState<number | null>(null);

  // Custom error modal for invalid phone number
  const [showInvalidPhoneModal, setShowInvalidPhoneModal] = useState(false);
  const [showEmptyFieldsModal, setShowEmptyFieldsModal] = useState(false);
  const [showOtpSentModal, setShowOtpSentModal] = useState(false);
  // Confirm details modal
  const [confirmVisible, setConfirmVisible] = useState(false);

  const formatPhoneForDisplay = (raw: string) => {
    const digits = (raw || '').replace(/[^0-9+]/g, '');
    let normalized = digits;
    if (/^09\d{9}$/.test(digits)) {
      normalized = `+63${digits.slice(1)}`;
    } else if (/^63\d{10}$/.test(digits)) {
      normalized = `+${digits}`;
    } else if (/^\+63\d{10}$/.test(digits)) {
      normalized = digits;
    }
    return normalized.replace(/^\+63/, '+63 ');
  };

  const composeDetailsSummary = () => {
    const name = `${toTitleCase(firstName)} ${toTitleCase(lastName)}`.trim();
    const addrParts = [street, zone, barangay, city].filter(Boolean).map(toTitleCase);
    const addr = addrParts.join(', ');
    const prettyPhone = formatPhoneForDisplay(phoneNumber);
    return (
      `Please confirm your details:\n\n` +
      `Name: ${name || '—'}\n` +
      `Address: ${addr || '—'}\n` +
      `Phone: ${prettyPhone || '—'}\n\n` +
      `We'll send an OTP to this phone. This number will also be used as your login.`
    );
  };

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = setInterval(() => {
      setResendCooldown((s) => (s > 0 ? s - 1 : 0));
    }, 1000) as unknown as number;
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [resendCooldown]);

  useEffect(() => {
    return () => {
      if (otpClearTimerRef.current) {
        clearTimeout(otpClearTimerRef.current);
      }
    };
  }, []);

  const toTitleCase = (str: string) =>
    (str || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b([a-z])/g, (m) => m.toUpperCase());

  const phMobileRegex = /^(?:\+63|63|0)9\d{9}$/;

  const validateDetails = () => {
    const requiredFields = {
      firstName: !firstName.trim(),
      lastName: !lastName.trim(),
      street: !street.trim(),
      zone: !zone.trim(),
      barangay: !barangay.trim(),
      city: !city.trim(),
      phoneNumber: !phoneNumber.trim(),
    };

    if (Object.values(requiredFields).some(Boolean)) {
      setErrors((current) => ({ ...current, ...requiredFields }));
      setShowEmptyFieldsModal(true);
      return false;
    }
    if (!phMobileRegex.test(phoneNumber)) {
      setShowInvalidPhoneModal(true);
      return false;
    }
    return true;
  };

  const showInvalidOtpError = () => {
    setOtpError('The code is incorrect or expired. Please try again or request a new code.');
    otpRefs.current[0]?.focus();
    if (otpClearTimerRef.current) clearTimeout(otpClearTimerRef.current);
    otpClearTimerRef.current = setTimeout(() => {
      setSmsCode(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
      otpClearTimerRef.current = null;
    }, 2000);
  };

  const handleOtpChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;
    if (otpError) setOtpError('');
    if (otpClearTimerRef.current) {
      clearTimeout(otpClearTimerRef.current);
      otpClearTimerRef.current = null;
    }

    const digits = value.slice(0, 6).split('');
    const nextCode = [...smsCode];
    if (digits.length > 1) {
      digits.forEach((digit, offset) => {
        if (index + offset < nextCode.length) nextCode[index + offset] = digit;
      });
      setSmsCode(nextCode);
      otpRefs.current[Math.min(index + digits.length, 5)]?.focus();
      return;
    }

    nextCode[index] = value;
    setSmsCode(nextCode);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyPress = (event: any, index: number) => {
    if (event.nativeEvent.key === 'Backspace' && !smsCode[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Primary button handler per step
  const onPrimaryAction = async () => {
    try {
      if (step === 'details') {
        // Reset errors
        setErrors({
          firstName: false,
          lastName: false,
          street: false,
          zone: false,
          barangay: false,
          city: false,
          phoneNumber: false,
          password: false,
          confirmPassword: false,
        });

        if (!validateDetails()) return;
        // Show confirmation before sending OTP
        setConfirmVisible(true);
      } else if (step === 'otp') {
        const otpCode = smsCode.join('');
        if (otpCode.length !== 6) {
          setOtpError('Please enter all 6 digits of the verification code.');
          return;
        }
        setLoading(true);
        const res = await AuthService.verifyOtp(phoneNumber, otpCode);
        if (res?.success) {
          setStep('password');
          setPassword('');
          setConfirmPassword('');
          setShowPasswords(false);
        } else {
          showInvalidOtpError();
        }
      } else if (step === 'password') {
        // Validate passwords
        const newErrors = {
          firstName: !firstName.trim(),
          lastName: !lastName.trim(),
          street: !street.trim(),
          zone: !zone.trim(),
          barangay: !barangay.trim(),
          city: !city.trim(),
          phoneNumber: !phoneNumber.trim(),
          password: !password,
          confirmPassword: !confirmPassword,
        };
        if (!password || !confirmPassword) {
          setErrors(newErrors);
          setShowEmptyFieldsModal(true);
          return;
        }
        if (password.length < 6) {
          Alert.alert('Error', 'Password must be at least 6 characters.');
          return;
        }
        if (password !== confirmPassword) {
          setErrors({ ...newErrors, password: true, confirmPassword: true });
          Alert.alert('Error', 'Passwords do not match.');
          return;
        }
        setLoading(true);
        const response = await AuthService.registerAdmin({
          first_name: toTitleCase(firstName),
          last_name: toTitleCase(lastName),
          street: toTitleCase(street),
          zone: toTitleCase(zone),
          barangay: toTitleCase(barangay),
          city: toTitleCase(city),
          phone_number: phoneNumber,
          password,
        });

        if (response && (response.admin_id || response.success)) {
          const id = response.admin_id;
          setAdminId(id);
          await AsyncStorage.setItem('userData', JSON.stringify({
            admin_id: id,
            adminId: id,
          }));
          await AsyncStorage.setItem('admin_id', String(id));
          await AsyncStorage.setItem('adminId', String(id));
          await AsyncStorage.setItem('adminName', toTitleCase(firstName) || 'Admin');
          await AsyncStorage.setItem('isLoggedIn', 'true');
          setModalVisible(true); // Ask to register shop now or later
        } else {
          Alert.alert('Error', response?.message || 'Registration failed.');
        }
      }
    } catch (error: any) {
      console.log('Register/OTP Error:', error.response?.data || error.message || error);
      if (step === 'otp') {
        showInvalidOtpError();
      } else {
        Alert.alert('Error', error.response?.data?.message || 'Request failed. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      if (resendCooldown > 0) return;
      setLoading(true);
      const res = await AuthService.requestOtp(phoneNumber);
      if (res?.success) {
        setShowOtpSentModal(true);
        setResendCooldown(60);
      } else {
        Alert.alert('Error', res?.message || 'Failed to resend OTP.');
      }
    } catch (error: any) {
      console.log('Resend OTP Error:', error.response?.data || error.message || error);
      Alert.alert('Error', 'Could not resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleModalOption = (option: 'shop' | 'later') => {
    setModalVisible(false);
    if (option === 'shop' && adminId) {
      // Pass admin_id to RegisterShop
      navigation.navigate('RegisterShop', { admin_id: adminId });
    } else {
      navigation.replace('Login'); // go to Login if later
    }
  };

  return (
    <LinearGradient colors={['#a9e5df', '#8baef3']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={true}>
        <View style={styles.header}>
          <Text style={styles.headerText}>eLABA Staff & Shop Portal</Text>
        </View>

        <View style={styles.centerContent}>
          <Image source={require('../../assets/img/elaba_icon.png')} style={styles.image} />
          <Text style={styles.title}>Create an Account</Text>
          <Text style={styles.subtitle}>Admin</Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.stepIndicator}>
            {(['details', 'otp', 'password'] as const).map((stepName, index) => {
              const currentStepIndex = ['details', 'otp', 'password'].indexOf(step);
              return (
                <View
                  key={stepName}
                  style={[styles.stepLine, index <= currentStepIndex && styles.stepLineActive]}
                />
              );
            })}
          </View>

          {step === 'details' && <>
          {/* Name */}
          <Text style={styles.label}>NAME</Text>
          <View style={styles.row}>
            <TextInput 
              style={[styles.input, styles.halfInput, errors.lastName && styles.inputError]} 
              placeholder="Last Name" 
              placeholderTextColor="#aaa" 
              value={lastName} 
              onChangeText={(text) => {
                setLastName(text);
                if (errors.lastName) setErrors({...errors, lastName: false});
              }} 
            />
            <TextInput 
              style={[styles.input, styles.halfInput, { marginLeft: 12 }, errors.firstName && styles.inputError]} 
              placeholder="First Name" 
              placeholderTextColor="#aaa" 
              value={firstName} 
              onChangeText={(text) => {
                setFirstName(text);
                if (errors.firstName) setErrors({...errors, firstName: false});
              }} 
            />
          </View>

          {/* Address */}
          <Text style={styles.label}>ADDRESS</Text>
          <View style={styles.row}>
            <TextInput 
              style={[styles.input, styles.halfInput, errors.street && styles.inputError]} 
              placeholder="Street" 
              placeholderTextColor="#aaa" 
              value={street} 
              onChangeText={(text) => {
                setStreet(text);
                if (errors.street) setErrors({...errors, street: false});
              }} 
            />
            <TextInput 
              style={[styles.input, styles.halfInput, { marginLeft: 12 }, errors.zone && styles.inputError]} 
              placeholder="Zone#" 
              placeholderTextColor="#aaa" 
              value={zone} 
              onChangeText={(text) => {
                setZone(text);
                if (errors.zone) setErrors({...errors, zone: false});
              }} 
            />
          </View>
          <TextInput 
            style={[styles.input, errors.barangay && styles.inputError]} 
            placeholder="Barangay" 
            placeholderTextColor="#aaa" 
            value={barangay} 
            onChangeText={(text) => {
              setBarangay(text);
              if (errors.barangay) setErrors({...errors, barangay: false});
            }} 
          />
          <TextInput 
            style={[styles.input, errors.city && styles.inputError]} 
            placeholder="City" 
            placeholderTextColor="#aaa" 
            value={city} 
            onChangeText={(text) => {
              setCity(text);
              if (errors.city) setErrors({...errors, city: false});
            }} 
          />

          {/* Phone Number */}
          <Text style={styles.label}>PHONE NUMBER</Text>
          <View style={styles.phoneRow}>
            <TextInput 
              style={[
                styles.phoneInput,
                errors.phoneNumber && styles.inputError
              ]} 
              placeholder="+63" 
              keyboardType="phone-pad" 
              placeholderTextColor="#aaa" 
              value={phoneNumber} 
              onChangeText={(text) => {
                setPhoneNumber(text);
                if (errors.phoneNumber) setErrors({...errors, phoneNumber: false});
              }}
              editable={step === 'details'}
            />
          </View>
          <Text style={styles.phoneNote}>Note: This phone number will be used as your login. Make sure it’s correct.</Text>
          </>}

          {/* OTP Step */}
          {step === 'otp' && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.label}>ENTER OTP</Text>
              <View style={styles.otpContainer}>
                {smsCode.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => {
                      otpRefs.current[index] = ref;
                    }}
                    style={[styles.otpBox, otpError ? styles.otpBoxError : null]}
                    placeholder="-"
                    placeholderTextColor="#ccc"
                    keyboardType="number-pad"
                    value={digit}
                    onChangeText={(value) => handleOtpChange(value, index)}
                    onKeyPress={(event) => handleOtpKeyPress(event, index)}
                    maxLength={1}
                    textAlign="center"
                    editable={!loading}
                  />
                ))}
              </View>
              {otpError ? <Text style={styles.otpErrorText}>{otpError}</Text> : null}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                <TouchableOpacity onPress={handleResend} disabled={loading || resendCooldown > 0}>
                  <Text style={{ color: loading || resendCooldown > 0 ? '#999' : '#2b7ecb', fontWeight: '600' }}>
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setStep('details')} disabled={loading}>
                  <Text style={{ color: '#444' }}>Change number</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Password Step */}
          {step === 'password' && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.label}>PASSWORD</Text>
              <View style={styles.passwordContainer}>
                <TextInput 
                  style={[styles.passwordInput, errors.password && styles.inputError]} 
                  placeholder="Password" 
                  secureTextEntry={!showPasswords} 
                  placeholderTextColor="#aaa" 
                  value={password} 
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) setErrors({...errors, password: false});
                  }} 
                />
                <TouchableOpacity style={styles.visibilityButton} onPress={() => setShowPasswords(!showPasswords)}>
                  <Image 
                    source={showPasswords ? require('../../assets/img/visibility-off.png') : require('../../assets/img/visibility.png')} 
                    style={styles.visibilityIcon} 
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.passwordContainer}>
                <TextInput 
                  style={[styles.passwordInput, errors.confirmPassword && styles.inputError]} 
                  placeholder="Confirm Password" 
                  secureTextEntry={!showPasswords} 
                  placeholderTextColor="#aaa" 
                  value={confirmPassword} 
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (errors.confirmPassword) setErrors({...errors, confirmPassword: false});
                  }} 
                />
                <TouchableOpacity style={styles.visibilityButton} onPress={() => setShowPasswords(!showPasswords)}>
                  <Image 
                    source={showPasswords ? require('../../assets/img/visibility-off.png') : require('../../assets/img/visibility.png')} 
                    style={styles.visibilityIcon} 
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Primary action */}
          <TouchableOpacity style={styles.button} onPress={onPrimaryAction} disabled={loading}>
            <LinearGradient colors={['#4A90E2', '#357ABD']} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.buttonGradient}>
              <Text style={styles.buttonText}>
                {step === 'details' ? (loading ? 'Sending OTP...' : 'Submit') : step === 'otp' ? (loading ? 'Verifying...' : 'Verify OTP') : (loading ? 'Registering...' : 'Register')}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Login button */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 15 }}>
            <Text style={{ color: '#555', marginRight: 4 }}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={{ color: '#2b7ecb', fontWeight: 'bold' }}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Success Modal (unchanged) */}

      {/* Success Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalWrapper}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Registration Successful!</Text>
            <Text style={styles.modalSubtext}>Do you want to register your shop now or later?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButton} onPress={() => handleModalOption('shop')}>
                <Text style={styles.modalButtonText}>Register Shop</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#ccc' }]} onPress={() => handleModalOption('later')}>
                <Text style={[styles.modalButtonText, { color: '#000' }]}>Later</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirm Details Modal */}
      <Modal visible={confirmVisible} transparent animationType="fade" onRequestClose={() => setConfirmVisible(false)}>
        <View style={styles.modalWrapper}>
          <View style={styles.confirmCard}>
            <LinearGradient colors={['#4A90E2', '#357ABD']} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.confirmHeader}>
              <Text style={styles.confirmTitle}>Review your details</Text>
            </LinearGradient>
            <View style={styles.confirmBody}>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Name</Text>
                <Text style={styles.confirmValue}>{`${toTitleCase(firstName)} ${toTitleCase(lastName)}`.trim() || '—'}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Address</Text>
                <Text style={styles.confirmValue}>{[street, zone, barangay, city].filter(Boolean).map(toTitleCase).join(', ') || '—'}</Text>
              </View>
              <View style={[styles.confirmRow, { marginBottom: 2 }]}>
                <Text style={styles.confirmLabel}>Phone</Text>
                <Text style={[styles.confirmValue, styles.confirmPhone]}>{formatPhoneForDisplay(phoneNumber) || '—'}</Text>
              </View>
              <Text style={styles.confirmNote}>We’ll send an OTP to this phone. This number will also be used as your login.</Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={() => setConfirmVisible(false)}>
                  <Text style={[styles.actionButtonText, styles.editButtonText]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={async () => {
                    setConfirmVisible(false);
                    setLoading(true);
                    try {
                      const res = await AuthService.requestOtp(phoneNumber);
                      if (res?.success) {
                        setShowOtpSentModal(true);
                        setStep('otp');
                        setResendCooldown(60);
                      } else {
                        Alert.alert('Error', res?.message || 'Failed to send OTP.');
                      }
                    } catch (err: any) {
                      console.log('Request OTP Error:', err?.response?.data || err?.message || err);
                      Alert.alert('Error', 'Failed to send OTP. Please try again.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  activeOpacity={0.9}
                >
                  <LinearGradient colors={['#4A90E2', '#357ABD']} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.actionGradient}>
                    <Text style={styles.actionButtonText}>Confirm & send code</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

    {/* Custom Alert Modal for invalid phone number */}
    <CustomAlertModal
      visible={showInvalidPhoneModal}
      title="Invalid Phone Number"
      message="Enter a valid Philippine mobile number (+63)."
      buttonText="OK"
      colorScheme="error"
      onButtonPress={() => setShowInvalidPhoneModal(false)}
      onRequestClose={() => setShowInvalidPhoneModal(false)}
    />
    <CustomAlertModal
      visible={showEmptyFieldsModal}
      title="Incomplete Information"
      message="Please fill in all required fields before continuing."
      buttonText="OK"
      colorScheme="error"
      onButtonPress={() => setShowEmptyFieldsModal(false)}
      onRequestClose={() => setShowEmptyFieldsModal(false)}
    />
    <CustomAlertModal
      visible={showOtpSentModal}
      title="OTP Sent"
      message="We sent a verification code to your phone. Please enter it to continue."
      buttonText="OK"
      colorScheme="success"
      onButtonPress={() => setShowOtpSentModal(false)}
      onRequestClose={() => setShowOtpSentModal(false)}
    />
    </LinearGradient>
  );
};

// --- Styles (same as your existing code)
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { paddingBottom: 50 },
  header: { marginTop: 50, alignItems: 'center', marginBottom: 15 },
  headerText: { fontWeight: 'bold', fontSize: 20, color: '#fff', letterSpacing: 1 },
  centerContent: { alignItems: 'center', marginBottom: 18 },
  image: { width: 110, height: 110, marginBottom: 10, resizeMode: 'contain', borderRadius: 100 },
  title: { fontWeight: 'bold', fontSize: 26, color: '#222' },
  subtitle: { fontSize: 16, color: '#1e1e1e', marginTop: 4, fontWeight: 400 },
  formCard: { backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 20, padding: 22, shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 6 }, shadowRadius: 8, elevation: 5 },
  stepIndicator: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  stepLine: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#d1d5db' },
  stepLineActive: { backgroundColor: '#357ABD' },
  label: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 6, marginTop: 12, letterSpacing: 1 },
  row: { flexDirection: 'row', marginBottom: 8 },
  input: { backgroundColor: '#f7f9fc', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 12, fontSize: 16, borderColor: '#e0e0e0', borderWidth: 1, color: '#222' },
  inputError: { borderColor: '#ff4444', borderWidth: 2 },
  halfInput: { flex: 1, minWidth: 0 },
  passwordContainer: { position: 'relative', marginBottom: 12 },
  passwordInput: { backgroundColor: '#f7f9fc', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, paddingRight: 50, fontSize: 16, borderColor: '#e0e0e0', borderWidth: 1, color: '#222' },
  visibilityButton: { position: 'absolute', right: 16, top: 14, padding: 4 },
  visibilityIcon: { width: 20, height: 20, tintColor: '#666' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  phoneInput: { flex: 1, backgroundColor: '#f7f9fc', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, borderColor: '#e0e0e0', borderWidth: 1, color: '#222', marginRight: 12 },
  phoneNote: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  otpContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 6, marginBottom: 10, gap: 8 },
  otpBox: { flex: 1, height: 50, backgroundColor: '#f7f9fc', borderRadius: 12, borderWidth: 1, borderColor: '#e0e0e0', fontSize: 18, fontWeight: '600', color: '#222', textAlign: 'center' },
  otpBoxError: { borderColor: '#dc3545' },
  otpErrorText: { color: '#dc3545', fontSize: 13, fontWeight: '600', marginTop: -4, marginBottom: 8 },
  phoneInputLocked: { backgroundColor: '#f0f0f0', color: '#888', borderColor: '#d0d0d0' },
  verifyButton: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, minWidth: 80 },
  verifyButtonText: { color: '#fff', fontWeight: '600', fontSize: 14, textAlign: 'center' },
  button: { marginTop: 20, borderRadius: 12, overflow: 'hidden', elevation: 3 },
  buttonGradient: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  buttonText: { fontSize: 18, color: '#fff', fontWeight: '700' },
  modalWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  modalContent: { width: '80%', backgroundColor: '#fff', borderRadius: 15, padding: 20, alignItems: 'center' },
  confirmCard: { width: '85%', backgroundColor: '#fff', borderRadius: 15, overflow: 'hidden' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  confirmMessage: { color: '#374151', fontSize: 14, lineHeight: 20, marginBottom: 16 },
  confirmHeader: { paddingVertical: 12, paddingHorizontal: 16 },
  confirmTitle: { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  confirmBody: { padding: 16 },
  confirmRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  confirmLabel: { width: 80, color: '#6b7280', fontWeight: '700', fontSize: 13 },
  confirmValue: { flex: 1, color: '#111827', fontSize: 14 },
  confirmPhone: { fontWeight: '700', color: '#1f2937' },
  confirmNote: { fontSize: 12, color: '#6b7280', marginTop: 6, marginBottom: 10 },
  actionButton: { flex: 1, borderRadius: 10, overflow: 'hidden' },
  actionGradient: { paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  actionButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  editButton: { backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10 },
  editButtonText: { color: '#111827', fontWeight: '700', fontSize: 14 },
  modalSubtext: { textAlign: 'center', color: '#555', marginBottom: 20 },
  modalButtons: { flexDirection: 'row', gap: 10 },
  modalButton: { flex: 1, backgroundColor: '#2b7ecb', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  modalButtonText: { color: '#fff', fontWeight: '700' },
  verificationModalContent: { width: '85%', backgroundColor: '#fff', borderRadius: 15, padding: 25, alignItems: 'center' },
  verificationInput: { width: '100%', backgroundColor: '#f7f9fc', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, borderColor: '#e0e0e0', borderWidth: 1, color: '#222', marginBottom: 20, textAlign: 'center' },
  verificationButtons: { flexDirection: 'row', gap: 12, marginBottom: 15 },
  resendButton: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#ccc', borderRadius: 10 },
  resendButtonText: { color: '#333', fontWeight: '600' },
  confirmButton: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#4A90E2', borderRadius: 10 },
  confirmButtonText: { color: '#fff', fontWeight: '600' },
  cancelButton: { paddingVertical: 8, paddingHorizontal: 16 },
  cancelButtonText: { color: '#666', fontWeight: '500' },
});

export default RegisterScreen;
