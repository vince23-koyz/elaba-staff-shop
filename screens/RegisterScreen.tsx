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

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [adminId, setAdminId] = useState<number | null>(null);

  const handleRegister = async () => {
    if (!firstName || !lastName || !street || !barangay || !city || !phoneNumber || !password) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
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
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
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
            <TextInput style={[styles.input, styles.halfInput]} placeholder="Last Name" placeholderTextColor="#aaa" value={lastName} onChangeText={setLastName} />
            <TextInput style={[styles.input, styles.halfInput, { marginLeft: 12 }]} placeholder="First Name" placeholderTextColor="#aaa" value={firstName} onChangeText={setFirstName} />
          </View>

          {/* Address */}
          <Text style={styles.label}>ADDRESS</Text>
          <View style={styles.row}>
            <TextInput style={[styles.input, styles.halfInput]} placeholder="Street" placeholderTextColor="#aaa" value={street} onChangeText={setStreet} />
            <TextInput style={[styles.input, styles.halfInput, { marginLeft: 12 }]} placeholder="Zone#" placeholderTextColor="#aaa" value={zone} onChangeText={setZone} />
          </View>
          <TextInput style={styles.input} placeholder="Barangay" placeholderTextColor="#aaa" value={barangay} onChangeText={setBarangay} />
          <TextInput style={styles.input} placeholder="City" placeholderTextColor="#aaa" value={city} onChangeText={setCity} />

          {/* Phone & Password */}
          <Text style={styles.label}>PHONE NUMBER</Text>
          <TextInput style={styles.input} placeholder="+63" keyboardType="phone-pad" placeholderTextColor="#aaa" value={phoneNumber} onChangeText={setPhoneNumber} />

          <Text style={styles.label}>PASSWORD</Text>
          <View style={styles.passwordRow}>
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Password" secureTextEntry={!showPasswords} placeholderTextColor="#aaa" value={password} onChangeText={setPassword} />
          </View>

          <Text style={styles.label}>CONFIRM PASSWORD</Text>
          <View style={styles.passwordRow}>
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Confirm Password" secureTextEntry={!showPasswords} placeholderTextColor="#aaa" value={confirmPassword} onChangeText={setConfirmPassword} />
            <TouchableOpacity style={styles.showButton} onPress={() => setShowPasswords(!showPasswords)}>
              <Text style={styles.showText}>{showPasswords ? "Hide" : "Show"}</Text>
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
  halfInput: { flex: 1, minWidth: 0 },
  passwordRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  showButton: { marginLeft: 10, paddingVertical: 12, paddingHorizontal: 8 },
  showText: { color: '#4A90E2', fontWeight: '600' },
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
});

export default RegisterScreen;
