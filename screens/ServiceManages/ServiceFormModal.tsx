import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Switch, ToastAndroid, ScrollView } from 'react-native';
import { api, API_ENDPOINTS } from '../../config/api';

export type ServiceFormMode = 'add' | 'edit';

export type ServiceItem = {
  service_id?: number;
  shop_id?: string | number;
  offers: string;
  description: string;
  price: number | string;
  quantity: number | string;
  package?: string;
  status?: number | string; // 1|0 or 'Active'|'Inactive'
};

type Props = {
  visible: boolean;
  onClose: () => void;
  mode: ServiceFormMode;
  initial?: Partial<ServiceItem> | null;
  shopId: string | null;
  onSaved?: () => void;
};

const ServiceFormModal: React.FC<Props> = ({ visible, onClose, mode, initial, shopId, onSaved }) => {
  const [offers, setOffers] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [packageName, setPackageName] = useState('');
  const [status, setStatus] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && initial) {
      setOffers(String(initial.offers || ''));
      setDescription(String(initial.description || ''));
      setPrice(initial.price !== undefined ? String(initial.price) : '');
      setQuantity(initial.quantity !== undefined ? String(initial.quantity) : '');
      setPackageName(String((initial as any).package || ''));
      const s = initial.status;
      if (typeof s === 'string') {
        setStatus(s.toLowerCase() === 'active');
      } else if (typeof s === 'number') {
        setStatus(s === 1);
      } else {
        setStatus(true);
      }
    } else if (!visible) {
      // when hidden, keep as is
    } else {
      // reset on open for add
      setOffers('');
      setDescription('');
      setPrice('');
      setQuantity('');
      setPackageName('');
      setStatus(true);
    }
  }, [mode, initial, visible]);

  const handleSubmit = async () => {
    if (!offers || !description || !price || !quantity || !packageName) {
      ToastAndroid.show('Please fill all fields', ToastAndroid.SHORT);
      return;
    }

    try {
      setSubmitting(true);
      if (mode === 'add') {
        if (!shopId) {
          ToastAndroid.show('Shop not found', ToastAndroid.SHORT);
          return;
        }
        await api.post(API_ENDPOINTS.SERVICE.BASE, {
          shop_id: shopId,
          offers,
          description,
          price: parseFloat(price),
          quantity: parseInt(quantity, 10),
          package: packageName,
          status: status ? 'Active' : 'Inactive',
        });
        ToastAndroid.show('Service added successfully', ToastAndroid.SHORT);
      } else {
        const id = (initial && (initial.service_id as number)) || 0;
        await api.put(`${API_ENDPOINTS.SERVICE.BASE}/${id}`, {
          offers,
          description,
          price: parseFloat(price),
          quantity: parseInt(quantity, 10),
          package: packageName,
          status: status ? 'Active' : 'Inactive',
        });
        ToastAndroid.show('Service updated', ToastAndroid.SHORT);
      }
      onClose();
      if (onSaved) onSaved();
    } catch (e) {
      console.error('Service submit failed', e);
      ToastAndroid.show('Operation failed', ToastAndroid.SHORT);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{mode === 'add' ? 'Add New Service' : 'Edit Service'}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Service Name</Text>
            <TextInput style={styles.input} value={offers} onChangeText={setOffers} placeholder="Enter service name" />

            <Text style={styles.label}>Description</Text>
            <TextInput style={[styles.input, { height: 80 }]} value={description} onChangeText={setDescription} placeholder="Enter description" multiline />

            <Text style={styles.label}>Price</Text>
            <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="Enter price" keyboardType="numeric" />

            <Text style={styles.label}>Quantity</Text>
            <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} placeholder="Enter quantity" keyboardType="numeric" />

            <Text style={styles.label}>Package</Text>
            <TextInput style={styles.input} value={packageName} onChangeText={setPackageName} placeholder="Enter package name" />

            <View style={styles.toggleRow}>
              <Text style={styles.label}>Status: {status ? 'Active' : 'Inactive'}</Text>
              <Switch value={status} onValueChange={setStatus} thumbColor={status ? '#4CAF50' : '#F44336'} />
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={onClose} disabled={submitting}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.submitBtn]} onPress={handleSubmit} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : (
                  <Text style={styles.submitText}>{mode === 'add' ? 'Add Service' : 'Save Changes'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  card: { width: '100%', maxWidth: 520, backgroundColor: '#fff', borderRadius: 18, padding: 20 },
  title: { fontSize: 20, fontWeight: '800', color: '#2c3e50', marginBottom: 10 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 6, color: '#34495e' },
  input: { borderWidth: 1, borderColor: '#dfe6e9', borderRadius: 12, padding: 12, fontSize: 15, backgroundColor: '#fff', color: '#2c3e50' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingVertical: 6, borderTopWidth: 1, borderColor: '#ecf0f1' },
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  btn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 },
  cancelBtn: { backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e0e0e0' },
  submitBtn: { backgroundColor: '#3498db' },
  cancelText: { color: '#424242', fontWeight: '700' },
  submitText: { color: '#fff', fontWeight: '700' },
});

export default ServiceFormModal;
