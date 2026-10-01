import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
  service: any | null;
  onEdit?: (service: any) => void;
};

const ServiceDetailsModal: React.FC<Props> = ({ visible, onClose, service, onEdit }) => {
  if (!service) return null;
  const isActive = service.status === 1 || service.status === 'Active';
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Service Details</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.badgeRow}>
              <View style={[styles.statusBadge, { backgroundColor: isActive ? '#4CAF50' : '#F44336' }]}>
                <Text style={styles.statusText}>{isActive ? 'Active' : 'Inactive'}</Text>
              </View>
            </View>

            <Text style={styles.label}>Service</Text>
            <Text style={styles.value}>{service.offers || '-'}</Text>

            <Text style={styles.label}>Description</Text>
            <Text style={styles.value}>{service.description || '-'}</Text>

            <Text style={styles.label}>Price</Text>
            <Text style={styles.value}>₱{service.price}</Text>

            <Text style={styles.label}>Quantity</Text>
            <Text style={styles.value}>{service.quantity}</Text>

            {'package' in service && (
              <>
                <Text style={styles.label}>Package</Text>
                <Text style={styles.value}>{service.package || '-'}</Text>
              </>
            )}

            <View style={styles.actionsRow}>
              {onEdit && (
                <TouchableOpacity
                  style={[styles.btn, styles.primaryBtn]}
                  onPress={() => onEdit(service)}
                >
                  <Text style={styles.primaryText}>Edit Service</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.btn, styles.secondaryBtn]} onPress={onClose}>
                <Text style={styles.secondaryText}>Close</Text>
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
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  title: { fontSize: 20, fontWeight: '800', color: '#2c3e50' },
  closeBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#f1f1f1', borderRadius: 8 },
  closeText: { color: '#374151', fontWeight: '800' },
  badgeRow: { marginVertical: 10 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 },
  statusText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  label: { fontSize: 13, color: '#637381', marginTop: 12, marginBottom: 2, fontWeight: '700' },
  value: { fontSize: 15, color: '#1f2937', fontWeight: '600' },
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  btn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 },
  primaryBtn: { backgroundColor: '#1976D2' },
  primaryText: { color: '#fff', fontWeight: '700' },
  secondaryBtn: { backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e0e0e0' },
  secondaryText: { color: '#374151', fontWeight: '700' },
});

export default ServiceDetailsModal;
