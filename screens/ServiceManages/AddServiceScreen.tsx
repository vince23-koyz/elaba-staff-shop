import React, { useState } from 'react'
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ToastAndroid, ActivityIndicator, Switch 
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../navigation/Navigator'
import axios from 'axios'
import { useAdminData } from '../../hooks/useAdminData'

type NavigationProp = NativeStackNavigationProp<RootStackParamList>

export default function AddServiceScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { shopId } = useAdminData()

  const [offers, setOffers] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [packageName, setPackageName] = useState('')
  const [status, setStatus] = useState(false) // Switch: true = Active
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!offers || !description || !price || !quantity || !packageName) {
      ToastAndroid.show('Please fill all fields', ToastAndroid.SHORT)
      return
    }
    if (!shopId) {
      ToastAndroid.show('Shop not found', ToastAndroid.SHORT)
      return
    }
    setLoading(true)
    try {
      await axios.post('http://10.0.2.2:5000/api/service', {
        shop_id: shopId,
        offers,
        description,
        price: parseFloat(price),
        quantity: parseInt(quantity, 10),
        package: packageName,
        status: status ? 'Active' : 'Inactive'
      })
      ToastAndroid.show('Service added successfully!', ToastAndroid.SHORT)
      navigation.goBack()
    } catch (error) {
      console.log(error)
      ToastAndroid.show('Failed to add service', ToastAndroid.SHORT)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Add New Service</Text>

        <Text style={styles.label}>Service Name</Text>
        <TextInput style={styles.input} value={offers} onChangeText={setOffers} placeholder="Enter service name" />

        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, { height: 80 }]} value={description} onChangeText={setDescription} placeholder="Enter description" multiline />

        <Text style={styles.label}>Price</Text>
        <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="Enter price" keyboardType="numeric" />

        <Text style={styles.label}>Stock</Text>
        <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} placeholder="Enter quantity" keyboardType="numeric" />

        <Text style={styles.label}>Package</Text>
        <TextInput style={styles.input} value={packageName} onChangeText={setPackageName} placeholder="Enter package name" />

        <View style={styles.toggleRow}>
          <Text style={styles.label}>Active Status: {status ? 'Active' : 'Inactive'}</Text>
          <Switch
            value={status}
            onValueChange={setStatus}
            thumbColor={status ? "#4CAF50" : "#F44336"}
          />
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Add Service</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#f4f6f9' },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 22, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 20, color: '#2c3e50' },
  label: { fontSize: 15, fontWeight: '600', marginTop: 14, marginBottom: 6, color: '#34495e' },
  input: { borderWidth: 1, borderColor: '#dfe6e9', borderRadius: 12, padding: 12, fontSize: 15, backgroundColor: '#fff', marginBottom: 10, color: '#2c3e50' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 12, paddingVertical: 8, borderTopWidth: 1, borderColor: '#ecf0f1' },
  submitBtn: { backgroundColor: '#3498db', paddingVertical: 15, borderRadius: 14, marginTop: 28, alignItems: 'center', elevation: 3 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 }
})
