// screens/RegisterScreen.tsx
import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, Image, 
  TouchableOpacity, ScrollView, Alert, Modal 
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/Navigator';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

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
  
  // Phone verification states
  const [verificationModalVisible, setVerificationModalVisible] = useState(false);
  const [smsCode, setSmsCode] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);

  // Error states for validation
  const [errors, setErrors] = useState({
    firstName: false,
    lastName: false,
    street: false,
    barangay: false,
    city: false,
    phoneNumber: false,
    password: false,
    confirmPassword: false,
  });

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [adminId, setAdminId] = useState<number | null>(null);

  const handleVerifyPhone = () => {
    if (!phoneNumber) {
      Alert.alert('Error', 'Please enter a phone number first.');
      return;
    }
    setVerificationModalVisible(true);
  };

  const handleConfirmCode = () => {
    if (smsCode === '1234') { // sample OTP - in real app, verify with backend
      setPhoneVerified(true);
      setVerificationModalVisible(false);
      Alert.alert('Success', 'Phone number verified successfully!');
    } else {
      Alert.alert('Error', 'Incorrect OTP. Try again.');
    }
  };

  const handleRegister = async () => {
    // Reset errors
    setErrors({
      firstName: false,
      lastName: false,
      street: false,
      barangay: false,
      city: false,
      phoneNumber: false,
      password: false,
      confirmPassword: false,
    });

    // Check for empty required fields
    const newErrors = {
      firstName: !firstName,
      lastName: !lastName,
      street: !street,
      barangay: !barangay,
      city: !city,
      phoneNumber: !phoneNumber,
      password: !password,
      confirmPassword: !confirmPassword,
    };

    if (!firstName || !lastName || !street || !barangay || !city || !phoneNumber || !password) {
      setErrors(newErrors);
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }
    if (!phoneVerified) {
      setErrors({...newErrors, phoneNumber: true});
      Alert.alert('Error', 'Please verify your phone number first.');
      return;
    }
    if (password !== confirmPassword) {
      setErrors({...newErrors, password: true, confirmPassword: true});
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        'http://10.0.2.2:5000/api/admin/register',
        { first_name: firstName, last_name: lastName, street, zone, barangay, city, phone_number: phoneNumber, password },
        { headers: { 'Content-Type': 'application/json' } }
      );

      // After successful registration
      if (response.data.message) {
        const id = response.data.admin_id;
        setAdminId(id);

        // Save admin_id to AsyncStorage
        await AsyncStorage.setItem('admin_id', id.toString());

        // Open modal for shop registration
        setModalVisible(true);
      }else {
        Alert.alert('Error', 'Registration failed. Try again.');
      }
    } catch (error: any) {
      console.log('Register Error:', error.response?.data || error.message || error);
      Alert.alert('Error', error.response?.data?.message || 'Registration failed.');
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
          <Image source={require('../assets/img/elaba_icon.png')} style={styles.image} />
          <Text style={styles.title}>Create an Account</Text>
          <Text style={styles.subtitle}>Admin Registration</Text>
        </View>

        <View style={styles.formCard}>
          {/* Full Name */}
          <Text style={styles.label}>FULL NAME</Text>
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
              style={[styles.input, styles.halfInput, { marginLeft: 12 }]} 
              placeholder="Zone#" 
              placeholderTextColor="#aaa" 
              value={zone} 
              onChangeText={setZone} 
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

          {/* Phone & Password */}
          <Text style={styles.label}>PHONE NUMBER</Text>
          <View style={styles.phoneRow}>
            <TextInput 
              style={[
                styles.phoneInput, 
                phoneVerified && styles.phoneInputLocked,
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
              editable={!phoneVerified}
            />
            <TouchableOpacity 
              style={[styles.verifyButton, { backgroundColor: phoneVerified ? '#4CAF50' : '#4A90E2' }]} 
              onPress={handleVerifyPhone}
              disabled={phoneVerified}
            >
              <Text style={styles.verifyButtonText}>
                {phoneVerified ? 'Verified' : 'Verify'}
              </Text>
            </TouchableOpacity>
          </View>

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
                source={showPasswords ? require('../assets/img/visibility-off.png') : require('../assets/img/visibility.png')} 
                style={styles.visibilityIcon} 
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>CONFIRM PASSWORD</Text>
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
                source={showPasswords ? require('../assets/img/visibility-off.png') : require('../assets/img/visibility.png')} 
                style={styles.visibilityIcon} 
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleRegister}>
            <LinearGradient colors={['#4A90E2', '#357ABD']} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.buttonGradient}>
              <Text style={styles.buttonText}>{loading ? 'Registering...' : 'Register'}</Text>
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

      {/* Phone Verification Modal */}
      <Modal visible={verificationModalVisible} transparent animationType="fade">
        <View style={styles.modalWrapper}>
          <View style={styles.verificationModalContent}>
            <Text style={styles.modalTitle}>SMS Verification</Text>
            <Text style={styles.modalSubtext}>Enter the code sent to {phoneNumber}</Text>
            <TextInput
              style={styles.verificationInput}
              placeholder="Enter verification code"
              placeholderTextColor="#aaa"
              keyboardType="number-pad"
              value={smsCode}
              onChangeText={setSmsCode}
              autoFocus
            />
            <View style={styles.verificationButtons}>
              <TouchableOpacity 
                style={styles.resendButton} 
                onPress={() => Alert.alert('Info', 'Verification code resent!')}
              >
                <Text style={styles.resendButtonText}>Resend Code</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmCode}>
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => setVerificationModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  subtitle: { fontSize: 16, color: '#555', marginTop: 4 },
  formCard: { backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 20, padding: 22, shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 6 }, shadowRadius: 8, elevation: 5 },
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
  phoneInputLocked: { backgroundColor: '#f0f0f0', color: '#888', borderColor: '#d0d0d0' },
  verifyButton: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, minWidth: 80 },
  verifyButtonText: { color: '#fff', fontWeight: '600', fontSize: 14, textAlign: 'center' },
  button: { marginTop: 20, borderRadius: 12, overflow: 'hidden', elevation: 3 },
  buttonGradient: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  buttonText: { fontSize: 18, color: '#fff', fontWeight: '700' },
  modalWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  modalContent: { width: '80%', backgroundColor: '#fff', borderRadius: 15, padding: 20, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
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
