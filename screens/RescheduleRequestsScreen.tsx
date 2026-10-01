import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api, API_ENDPOINTS } from '../config/api';
import { RootStackParamList } from '../navigation/Navigator';
import { useAdminData } from '../hooks/useAdminData';
import type { RescheduleRequest } from '../hooks/useBookingData';

type Props = NativeStackScreenProps<RootStackParamList, 'RescheduleRequests'>;

export default function RescheduleRequestsScreen({ route, navigation }: Props) {
  const bookingId = route.params?.bookingId;
  const { shopId } = useAdminData();
  const [request, setRequest] = useState<RescheduleRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewingId, setReviewingId] = useState<number | null>(null);

  const loadRequests = useCallback(async (showLoading = true) => {
    if (!shopId) {
      setRequest(null);
      setLoading(false);
      return;
    }
    try {
      if (showLoading) setLoading(true);
      const response = await api.get(`${API_ENDPOINTS.BOOKINGS.RESCHEDULES}?shop_id=${shopId}&booking_id=${bookingId}`);
      setRequest(response.data?.[0] || null);
    } catch (error) {
      Alert.alert('Error', 'Failed to load reschedule requests.');
    } finally {
      setLoading(false);
    }
  }, [bookingId, shopId]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const reviewRequest = async (request: RescheduleRequest, action: 'approve' | 'reject') => {
    if (!shopId || reviewingId !== null) return;
    setReviewingId(request.reschedule_id);
    try {
      const endpoint = action === 'approve'
        ? API_ENDPOINTS.BOOKINGS.APPROVE_RESCHEDULE(request.reschedule_id)
        : API_ENDPOINTS.BOOKINGS.REJECT_RESCHEDULE(request.reschedule_id);
      await api.patch(endpoint, { shop_id: shopId });
      Alert.alert('Success', action === 'approve' ? 'Reschedule request approved.' : 'Reschedule request rejected.');
      await loadRequests(false);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to review reschedule request.');
    } finally {
      setReviewingId(null);
    }
  };

  const formatDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRequests(false);
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#6bd0d7', '#2d79d1']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Image source={require('../assets/img/back.png')} style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reschedule Request</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#2d79d1" /><Text style={styles.muted}>Loading requests...</Text></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2d79d1']} />}
        >
          <View style={styles.summary}>
            <Text style={styles.title}>Booking Reschedule Request</Text>
            <Text style={styles.subtitle}>{request?.status || 'No request selected'}</Text>
          </View>

          {!request ? (
            <View style={styles.empty}><Text style={styles.emptyTitle}>No reschedule requests</Text><Text style={styles.muted}>New customer requests will appear here.</Text></View>
          ) : (() => {
            const isReviewing = reviewingId === request.reschedule_id;
            return (
              <View style={styles.requestCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.bookingId}>Booking #{request.booking_id}</Text>
                  <Text style={[styles.status, request.status === 'Pending' ? styles.pending : request.status === 'Approved' ? styles.approved : styles.rejected]}>{request.status}</Text>
                </View>
                <Text style={styles.customer}>{request.customer_first_name} {request.customer_last_name}</Text>
                {request.service_name ? <Text style={styles.detail}>Service: {request.service_name}</Text> : null}
                <Text style={styles.detail}>Current date: {formatDate(request.booking_date)}</Text>
                <Text style={styles.detail}>Requested date: {formatDate(request.requested_date)}</Text>
                {request.reason ? <Text style={styles.detail}>Reason: {request.reason}</Text> : null}
                {request.status === 'Pending' && (
                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.approveButton} onPress={() => reviewRequest(request, 'approve')} disabled={reviewingId !== null}>
                      <Text style={styles.actionText}>{isReviewing ? 'Processing...' : 'Approve'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.rejectButton} onPress={() => reviewRequest(request, 'reject')} disabled={reviewingId !== null}>
                      <Text style={styles.actionText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })()}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 14 },
  backButton: { padding: 8 },
  backIcon: { width: 20, height: 20, tintColor: '#fff', resizeMode: 'contain' },
  headerTitle: { flex: 1, textAlign: 'center', color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSpacer: { width: 36 },
  content: { padding: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: '#64748b', marginTop: 8 },
  summary: { backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 14 },
  title: { color: '#1e293b', fontSize: 18, fontWeight: '700' },
  subtitle: { color: '#64748b', marginTop: 5 },
  requestCard: { backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bookingId: { color: '#1e293b', fontWeight: '700' },
  status: { fontWeight: '700', fontSize: 12 },
  pending: { color: '#c2410c' },
  approved: { color: '#15803d' },
  rejected: { color: '#b91c1c' },
  customer: { color: '#334155', fontSize: 16, fontWeight: '700', marginTop: 12 },
  detail: { color: '#64748b', marginTop: 6 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  approveButton: { flex: 1, backgroundColor: '#16a34a', borderRadius: 8, padding: 11, alignItems: 'center' },
  rejectButton: { flex: 1, backgroundColor: '#dc2626', borderRadius: 8, padding: 11, alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: '700' },
  empty: { alignItems: 'center', padding: 32, backgroundColor: '#fff', borderRadius: 10 },
  emptyTitle: { color: '#334155', fontSize: 16, fontWeight: '700' },
});
