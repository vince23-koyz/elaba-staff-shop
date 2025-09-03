// screens/RegisterShop.tsx
import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, 
  TouchableOpacity, ScrollView, Alert, Image 
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/Navigator';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RegisterShopScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<any>();
  const { admin_id } = route.params;

  const [shopName, setShopName] = useState('');
  const [ownerFullName, setOwnerFullName] = useState('');
  const [street, setStreet] = useState('');
  const [zone, setZone] = useState('');
  const [barangay, setBarangay] = useState('');
  const [city, setCity] = useState('');
  const [website, setWebsite] = useState('');
  const [operatingHours, setOperatingHours] = useState('');

  const handleNext = async () => {
    if (!shopName || !ownerFullName || !street || !zone || !barangay || !city || !website || !operatingHours) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    const shopData = {
      name: shopName,
      address: `${street}, ${zone}, ${barangay}, ${city}`,
      website: website,
      owner_name: ownerFullName,
      operation_hours: operatingHours,
      admin_id: admin_id,
    };

    try {
      const response = await axios.post(
        'http://10.0.2.2:5000/api/shop',
        shopData,
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (response.data.success) {
        const shopId = response.data.shop_id;
        await AsyncStorage.setItem('shop_id', shopId.toString());

        navigation.navigate('ServicesRegister', { shop_id: shopId, shopName });
      } else {
        Alert.alert('Error', response.data.message || 'Failed to register shop');
      }
    } catch (error: any) {
      console.log('Shop Register Error:', error.response?.data || error.message || error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to register shop');
    }
  };

  return (
    <LinearGradient colors={['#a9e5df', '#8baef3']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.headerText}>eLABA Staff Portal</Text>
          <View style={styles.titleContainer}>
            <Image source={require('../assets/img/elaba_icon.png')} style={styles.icon} />
            <Text style={styles.title}>Register Your Shop</Text>
            <Text style={styles.subtitle}>Set up your laundry business profile</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          {/* Shop Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SHOP INFORMATION</Text>
            <View style={styles.inputGroup}>
              <TextInput 
                style={styles.input} 
                placeholder="Shop Name" 
                value={shopName} 
                onChangeText={setShopName} 
                placeholderTextColor="#aaa" 
              />
              <TextInput 
                style={styles.input} 
                placeholder="Owner Full Name" 
                value={ownerFullName} 
                onChangeText={setOwnerFullName} 
                placeholderTextColor="#aaa" 
              />
            </View>
          </View>

          {/* Address Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ADDRESS</Text>
            <View style={styles.inputGroup}>
              <View style={styles.row}>
                <TextInput 
                  style={[styles.input, styles.halfInput]} 
                  placeholder="Street" 
                  value={street} 
                  onChangeText={setStreet} 
                  placeholderTextColor="#aaa" 
                />
                <TextInput 
                  style={[styles.input, styles.halfInput, { marginLeft: 12 }]} 
                  placeholder="Zone#" 
                  value={zone} 
                  onChangeText={setZone} 
                  placeholderTextColor="#aaa" 
                />
              </View>
              <TextInput 
                style={styles.input} 
                placeholder="Barangay" 
                value={barangay} 
                onChangeText={setBarangay} 
                placeholderTextColor="#aaa" 
              />
              <TextInput 
                style={styles.input} 
                placeholder="City" 
                value={city} 
                onChangeText={setCity} 
                placeholderTextColor="#aaa" 
              />
            </View>
          </View>

          {/* Business Details Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>BUSINESS DETAILS</Text>
            <View style={styles.inputGroup}>
              <TextInput 
                style={styles.input} 
                placeholder="Website / Facebook Page" 
                value={website} 
                onChangeText={setWebsite} 
                placeholderTextColor="#aaa" 
              />
              <TextInput 
                style={styles.input} 
                placeholder="Operating Hours (e.g., 8:00 AM - 6:00 PM)" 
                value={operatingHours} 
                onChangeText={setOperatingHours} 
                placeholderTextColor="#aaa" 
              />
            </View>
          </View>

          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <LinearGradient colors={['#4A90E2', '#357ABD']} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.nextGradient}>
              <Text style={styles.nextText}>Continue Setup</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { paddingBottom: 50, paddingHorizontal: 20 },
  
  // Header styles
  header: { alignItems: 'center', marginTop: 40, marginBottom: 20 },
  headerText: { fontSize: 16, fontWeight: '600', color: '#fff', letterSpacing: 1, marginBottom: 15 },
  titleContainer: { alignItems: 'center' },
  icon: { width: 80, height: 80, marginBottom: 12, borderRadius: 40 },
  title: { fontSize: 28, fontWeight: '700', color: '#222', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#555', textAlign: 'center', marginBottom: 8 },
  
  // Form card
  formCard: { 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    padding: 24, 
    shadowColor: '#000', 
    shadowOpacity: 0.1, 
    shadowOffset: { width: 0, height: 8 }, 
    shadowRadius: 12, 
    elevation: 8 
  },
  
  // Section styles
  section: { marginBottom: 24 },
  sectionLabel: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: '#555', 
    marginBottom: 12, 
    letterSpacing: 1 
  },
  inputGroup: { gap: 8 },
  
  // Input styles
  row: { flexDirection: 'row', marginBottom: 8 },
  input: { 
    backgroundColor: '#f7f9fc', 
    borderRadius: 12, 
    paddingHorizontal: 16, 
    paddingVertical: 16, 
    marginBottom: 12, 
    fontSize: 14, 
    borderColor: '#e0e0e0', 
    borderWidth: 1, 
    color: '#222' 
  },
  halfInput: { flex: 1, minWidth: 0 },
  
  // Button styles
  nextButton: { 
    marginTop: 24, 
    borderRadius: 12, 
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#4A90E2',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  nextGradient: { 
    paddingVertical: 16, 
    borderRadius: 12, 
    alignItems: 'center' 
  },
  nextText: { 
    fontSize: 18, 
    color: '#fff', 
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default RegisterShopScreen;
