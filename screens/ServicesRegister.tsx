// screens/ServiceRegister.tsx
import React, { useState } from 'react'; 
import { 
  View, Text, StyleSheet, TextInput, 
  TouchableOpacity, ScrollView, FlatList, Alert 
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/Navigator';
import axios from 'axios';

type ServiceItem = {
  id: string;
  name: string;
  quantity: string;
  description: string;
  price: string;
  package: string;
};

const ServiceRegister: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<any>();
  
  const { shop_id, shopName } = route.params;

  const [serviceName, setServiceName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [packageName, setPackageName] = useState('');
  const [services, setServices] = useState<ServiceItem[]>([]);

  const handleAddService = () => {
    if (!serviceName || !quantity || !description || !price || !packageName) {
      Alert.alert('Error', 'Please fill in all service fields.');
      return;
    }

    const newService: ServiceItem = {
      id: Math.random().toString(),
      name: serviceName,
      quantity,
      description,
      price,
      package: packageName,
    };

    setServices([...services, newService]);
    setServiceName('');
    setQuantity('');
    setDescription('');
    setPrice('');
    setPackageName('');
  };

  const handleSubmitServices = async () => {
    if (services.length === 0) {
      Alert.alert('Error', 'Please add at least one service.');
      return;
    }

    try {
      for (const s of services) {
        await axios.post('http://10.0.2.2:5000/api/service', {
          shop_id, // link to shop
          offers: s.name,
          quantity: parseInt(s.quantity),
          description: s.description,
          price: parseFloat(s.price),
          package: s.package,
        });
      }

      Alert.alert('Success', 'Services added successfully!');
      navigation.replace('Home'); // Use replace to refresh Home
    } catch (error: any) {
      console.log('Submit Error:', error.response?.data || error.message);
      Alert.alert('Error', 'Failed to register services.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Add Services for {shopName}</Text>

      <View style={styles.formCard}>
        <Text style={styles.label}>Service Offers</Text>
        <TextInput style={styles.input} placeholder="Service Name" value={serviceName} onChangeText={setServiceName} placeholderTextColor="#aaa" />

        <Text style={styles.label}>Quantity</Text>
        <TextInput style={styles.input} placeholder="Quantity" value={quantity} onChangeText={setQuantity} placeholderTextColor="#aaa" keyboardType="numeric" />

        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, { height: 80 }]} placeholder="Description" value={description} onChangeText={setDescription} placeholderTextColor="#aaa" multiline />

        <Text style={styles.label}>Price</Text>
        <TextInput style={styles.input} placeholder="Price" value={price} onChangeText={setPrice} placeholderTextColor="#aaa" keyboardType="numeric" />

        <Text style={styles.label}>Package</Text>
        <TextInput style={styles.input} placeholder="Package Name" value={packageName} onChangeText={setPackageName} placeholderTextColor="#aaa" />

        <TouchableOpacity style={styles.addButton} onPress={handleAddService}>
          <LinearGradient colors={['#4A90E2', '#357ABD']} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.addGradient}>
            <Text style={styles.addText}>Add Service</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {services.length > 0 && (
        <View style={styles.servicesList}>
          <Text style={styles.subtitle}>Added Services</Text>
          <FlatList
            data={services}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.serviceItem}>
                <Text style={styles.serviceText}>• {item.name} ({item.package}) - {item.quantity} pcs - ₱{item.price}</Text>
                <Text style={styles.serviceDesc}>{item.description}</Text>
              </View>
            )}
          />
        </View>
      )}

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmitServices}>
        <LinearGradient colors={['#2b7ecb', '#1e5fa8']} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.submitGradient}>
          <Text style={styles.submitText}>Submit All Services</Text>
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 50, backgroundColor: '#f0f4f8' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 20, color: '#222' },
  formCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width:0, height:6 }, shadowRadius: 8, elevation: 5 },
  label: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#f7f9fc', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 12, fontSize: 16, borderColor: '#e0e0e0', borderWidth: 1, color: '#222' },
  addButton: { marginTop: 10, borderRadius: 12, overflow: 'hidden' },
  addGradient: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  addText: { fontSize: 16, color: '#fff', fontWeight: '700' },
  servicesList: { marginBottom: 20 },
  subtitle: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  serviceItem: { backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 10 },
  serviceText: { fontWeight: '600', color: '#222', fontSize: 14 },
  serviceDesc: { color: '#555', fontSize: 13, marginTop: 4 },
  submitButton: { marginBottom: 30, borderRadius: 12, overflow: 'hidden' },
  submitGradient: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  submitText: { fontSize: 16, color: '#fff', fontWeight: '700' },
});

export default ServiceRegister;
