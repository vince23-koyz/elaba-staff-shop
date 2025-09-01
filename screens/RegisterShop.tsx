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
import { launchImageLibrary } from 'react-native-image-picker';

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
  const [banner, setBanner] = useState<any>(null);

  const pickImage = async () => {
    const result: any = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
    });

    if (result.didCancel) return;

    if (result.assets && result.assets.length > 0) {
      setBanner(result.assets[0]); // save selected image
    }
  };

  const handleNext = async () => {
    if (!shopName || !ownerFullName || !street || !zone || !barangay || !city || !website || !operatingHours) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    const formData = new FormData();
    formData.append('name', shopName);
    formData.append('address', `${street}, ${zone}, ${barangay}, ${city}`);
    formData.append('website', website);
    formData.append('owner_name', ownerFullName);
    formData.append('operation_hours', operatingHours);
    formData.append('admin_id', admin_id);

    if (banner) {
      formData.append('logo', {
        uri: banner.uri,
        type: banner.type,
        name: banner.fileName || 'shop_logo.jpg',
      });
    }

    try {
      const response = await axios.post(
        'http://10.0.2.2:5000/api/shop',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
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
        <Text style={styles.title}>Register Shop</Text>

        {/* Upload Logo */}
        <TouchableOpacity style={styles.bannerPicker} onPress={pickImage} activeOpacity={0.8}>
          {banner ? (
            <View style={{ flex: 1, width: "100%", height: "100%" }}>
              <Image source={{ uri: banner.uri }} style={styles.bannerPreview} resizeMode="cover" />

              {/* Overlay for change picture */}
              <View style={styles.overlay}>
                <Text style={styles.overlayText}>Change Picture</Text>
              </View>
            </View>
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.bannerText}>+ Upload Shop Banner</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.formCard}>
          <TextInput style={styles.input} placeholder="Shop Name" value={shopName} onChangeText={setShopName} placeholderTextColor="#aaa" />
          <TextInput style={styles.input} placeholder="Owner Full Name" value={ownerFullName} onChangeText={setOwnerFullName} placeholderTextColor="#aaa" />
          <TextInput style={styles.input} placeholder="Street" value={street} onChangeText={setStreet} placeholderTextColor="#aaa" />
          <TextInput style={styles.input} placeholder="Zone#" value={zone} onChangeText={setZone} placeholderTextColor="#aaa" />
          <TextInput style={styles.input} placeholder="Barangay" value={barangay} onChangeText={setBarangay} placeholderTextColor="#aaa" />
          <TextInput style={styles.input} placeholder="City" value={city} onChangeText={setCity} placeholderTextColor="#aaa" />
          <TextInput style={styles.input} placeholder="Website / FB Page" value={website} onChangeText={setWebsite} placeholderTextColor="#aaa" />
          <TextInput style={styles.input} placeholder="Operating Hours" value={operatingHours} onChangeText={setOperatingHours} placeholderTextColor="#aaa" />

          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <LinearGradient colors={['#4A90E2', '#357ABD']} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.nextGradient}>
              <Text style={styles.nextText}>Next</Text>
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
  title: { fontSize: 24, fontWeight: '700', color: '#222', alignSelf: 'center', marginVertical: 20 },
  formCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width:0, height:6 }, shadowRadius: 8, elevation: 5 },
  input: { backgroundColor: '#f7f9fc', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 12, fontSize: 16, borderColor: '#e0e0e0', borderWidth: 1, color: '#222' },
  nextButton: { marginTop: 20, borderRadius: 12, overflow: 'hidden' },
  nextGradient: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  nextText: { fontSize: 18, color: '#fff', fontWeight: '700' },
  bannerPicker: {
    alignSelf: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    backgroundColor: '#f7f9fc',
    width: '100%',
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerText: {
    color: '#555',
    fontSize: 16,
  },
  bannerPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingVertical: 8,
    alignItems: 'center',
  },
  overlayText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default RegisterShopScreen;
