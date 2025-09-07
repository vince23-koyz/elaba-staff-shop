// screens/LoginScreen.tsx
import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, Image, 
  TouchableOpacity, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/Navigator';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phoneNumber || !password) {
      Alert.alert('Error', 'Please enter phone number and password.');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Login admin
      const loginResponse = await axios.post(
        'http://10.0.2.2:5000/api/admin/login',
        { phone_number: phoneNumber, password },
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      if (loginResponse.data.success) {
        const adminId = loginResponse.data.admin_id;
        console.log('Admin login successful, ID:', adminId);

        // Step 2: Get shop by admin_id
        try {
          console.log('🔍 Fetching shop for admin_id:', adminId);
          const shopResponse = await axios.get(`http://10.0.2.2:5000/api/shop/admin/${adminId}`);
          console.log('📦 Shop response:', shopResponse.data);
          
          const shop = shopResponse.data.shop;
          
          if (shop) {
            // Store complete user data
            const userData = {
              admin_id: adminId,
              adminId: adminId, // Both versions for compatibility
              shop_id: shop.shop_id,
              shopId: shop.shop_id, // Both versions for compatibility
              shop_name: shop.name,
              shop_address: shop.address
            };
            
            await AsyncStorage.setItem('userData', JSON.stringify(userData));
            console.log('✅ Complete user data saved:', userData);

            Alert.alert('Success', 'Login successful!');
            navigation.replace('Home');
          } else {
            console.log('❌ No shop found in response');
            Alert.alert('Error', 'No shop found for this admin. Please contact support.');
          }
        } catch (shopError: any) {
          console.error('❌ Error fetching shop:', shopError);
          console.error('❌ Shop error response:', shopError.response?.data);
          console.error('❌ Shop error status:', shopError.response?.status);
          Alert.alert('Error', `Failed to load shop information. Error: ${shopError.response?.data?.message || shopError.message}`);
        }
      } else {
        Alert.alert('Error', loginResponse.data.message || 'Login failed.');
      }
    } catch (error: any) {
      console.log('Login Error:', error.response?.data || error.message || error);
      Alert.alert('Error', error.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToRegister = () => {
    navigation.navigate('Register');
  };

  return (
    <LinearGradient
      colors={['#a9e5df', '#8baef3']}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerText}>eLABA Staff & Shop Portal</Text>
        </View>

        {/* Logo & Title */}
        <View style={styles.centerContent}>
          <Image
            source={require('../assets/img/elaba_icon.png')}
            style={styles.image}
          />
          <Text style={styles.title}>Login</Text>
          <Text style={styles.subtitle}>Admin Portal</Text>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          <Text style={styles.label}>PHONE NUMBER</Text>
          <TextInput
            style={styles.input}
            placeholder="+63"
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholderTextColor="#aaa"
          />

          <Text style={styles.label}>PASSWORD</Text>
          <TextInput
            style={styles.input}
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholderTextColor="#aaa"
          />

          <TouchableOpacity onPress={handleLogin} style={styles.button} disabled={loading}>
            <LinearGradient
              colors={['#4A90E2', '#357ABD']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Login</Text>
              )}
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
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { paddingBottom: 50 },
  header: { marginTop: 50, alignItems: 'center', marginBottom: 15 },
  headerText: { fontWeight: 'bold', fontSize: 20, color: '#fff', letterSpacing: 1 },
  centerContent: { alignItems: 'center', marginBottom: 18 },
  image: { width: 110, height: 110, marginBottom: 10, resizeMode: 'contain', borderRadius: 100 },
  title: { fontWeight: 'bold', fontSize: 26, color: '#222' },
  subtitle: { fontSize: 16, color: '#555', marginTop: 4 },
  formCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 22,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 8,
    elevation: 5,
  },
  label: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 6, marginTop: 12, letterSpacing: 1 },
  input: { backgroundColor: '#f7f9fc', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 12, fontSize: 16, borderColor: '#e0e0e0', borderWidth: 1, color: '#222' },
  button: { marginTop: 20, borderRadius: 12, overflow: 'hidden', elevation: 3 },
  buttonGradient: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  buttonText: { fontSize: 18, color: '#fff', fontWeight: '700' },
  signupContainer: { flexDirection: 'row', marginTop: 20, justifyContent: 'center' },
  signupText: { color: '#333' },
  signupLink: { color: '#2b7ecb', fontWeight: 'bold' },
});

export default LoginScreen;
