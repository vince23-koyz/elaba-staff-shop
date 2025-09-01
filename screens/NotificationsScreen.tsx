// NotificationsScreen.tsx
import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, FlatList, 
  TouchableOpacity, Image 
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/navigator';
import Ionicons from 'react-native-vector-icons/Ionicons';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifs'>;

const sampleNotifications = [
  { 
    id: '1', 
    type: 'booking', 
    title: 'New Booking Request', 
    message: 'Juan Dela Cruz booked Wash & Fold service for pickup at 2 PM. Please confirm the request immediately to secure the schedule.', 
    time: '10:30 AM', 
    read: false 
  },
  { 
    id: '2', 
    type: 'payment', 
    title: 'Payment Received', 
    message: 'Maria Santos has paid ₱250 via GCash for Order #1023.', 
    time: '9:45 AM', 
    read: true 
  },
  { 
    id: '3', 
    type: 'service', 
    title: 'Order Ready for Pickup', 
    message: 'Order #1019 (Carlos Reyes) is now ready for pickup.', 
    time: 'Yesterday', 
    read: false 
  },
  { 
    id: '4', 
    type: 'delivery', 
    title: 'Delivery Scheduled', 
    message: 'Order #1018 will be delivered to Ana Cruz at 5 PM today. Please prepare for the delivery and make sure someone is available to receive it.', 
    time: '2 days ago', 
    read: true 
  },
  { 
    id: '5', 
    type: 'booking', 
    title: 'Booking Reminder', 
    message: 'Reminder: John Smith has a scheduled pickup for Wash & Iron service tomorrow at 10 AM.', 
    time: '3 days ago', 
    read: true 
  },
  { 
    id: '6', 
    type: 'payment', 
    title: 'Payment Failed', 
    message: 'Payment for Order #1020 (Liza Gomez) failed. Please follow up with the customer.', 
    time: '4 days ago', 
    read: false 
  },
  { 
    id: '7', 
    type: 'service', 
    title: 'Service Feedback Received', 
    message: 'Customer Pedro Tan left a 5-star review for Order #1017. Check it out!', 
    time: '5 days ago', 
    read: true 
  },
  { 
    id: '8', 
    type: 'delivery', 
    title: 'Delivery Completed', 
    message: 'Order #1016 has been successfully delivered to Maria Lopez.', 
    time: '1 week ago', 
    read: true 
  },
];

const notificationIcons: Record<string, any> = {
  booking: require('../assets/img/booking.png'),
  payment: require('../assets/img/gcash.png'),
  service: require('../assets/img/service.png'),
  delivery: require('../assets/img/delivery.png'),
};

export default function NotificationsScreen({ navigation }: Props) {
  const [activeTab, setActiveTab] = useState<'All' | 'Unread'>('All');
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const filteredNotifications = activeTab === 'All' 
    ? sampleNotifications 
    : sampleNotifications.filter(n => !n.read);

  const renderItem = ({ item }: { item: typeof sampleNotifications[number] }) => {
    const isExpanded = expandedIds.includes(item.id);
    const shouldTruncate = item.message.length > 60; // truncate limit
    const displayMessage = isExpanded
      ? item.message
      : shouldTruncate
        ? item.message.slice(0, 60) + '...'
        : item.message;

    return (
      <TouchableOpacity 
        style={[styles.notificationItem, !item.read && styles.unreadItem]}
        onPress={() => shouldTruncate && toggleExpand(item.id)}
        activeOpacity={0.8}
      >
        <Image source={notificationIcons[item.type]} style={styles.icon} />
        <View style={styles.textContainer}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.message}>{displayMessage}</Text>
          <Text style={styles.time}>{item.time}</Text>
        </View>

        {/* expand/collapse arrow */}
        {shouldTruncate && (
          <Ionicons 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={18} 
            color="#888" 
          />
        )}
      </TouchableOpacity>
    );
  };

return (
  <View style={styles.container}>
    {/* HEADER */}
    <LinearGradient
      colors={['#4facfe', '#00d4e0']}
      style={styles.header}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backWrapper}>
        <Image source={require('../assets/img/back.png')} style={styles.backButton}/>
      </TouchableOpacity>
      <Text style={styles.headerText}>Notifications</Text>
      <View style={{ width: 32 }} /> 
    </LinearGradient>

    {/* TABS */}
    <View style={styles.tabContainer}>
      {['All', 'Unread'].map(tab => (
        <TouchableOpacity 
          key={tab} 
          style={[styles.tabButton, activeTab === tab && styles.activeTab]}
          onPress={() => setActiveTab(tab as 'All' | 'Unread')}
        >
          <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
            {tab}
          </Text>
        </TouchableOpacity>
      ))}
    </View>

    {/* CONTENT */}
    <FlatList
      style={{ flex: 1 }}   // 👈 importante para scroll
      data={filteredNotifications}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        <Text style={styles.emptyText}>No {activeTab.toLowerCase()} notifications</Text>
      }
    />
  </View>
);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 14,
    borderRadius: 0,
    marginHorizontal: 0,
    elevation: 3,
    paddingTop: 50, 
  },
  backWrapper: { padding: 4, borderRadius: 20 },
  backButton: { width: 22, height: 22, resizeMode: 'contain', tintColor: '#fff' },
  headerText: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: '#fff' },

  // TABS
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: '#e6f7ff',
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 16,
    padding: 2,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 14,
    alignItems: 'center',
  },
  activeTab: { backgroundColor: '#4facfe' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#555' },
  activeTabText: { color: '#fff' },

  // LIST
  list: { paddingHorizontal: 12, paddingBottom: 16 },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    alignItems: 'center',
  },
  unreadItem: { borderLeftWidth: 4, borderLeftColor: '#4facfe' },

  // ICON & TEXT
  icon: { width: 28, height: 28, marginRight: 10, resizeMode: 'contain' },
  textContainer: { flex: 1 },
  title: { fontWeight: '600', marginBottom: 2, color: '#333', fontSize: 14 },
  message: { color: '#3b3b3b', fontSize: 12, lineHeight: 16 },
  time: { fontSize: 11, color: '#999', marginTop: 2 },

  // EMPTY
  emptyText: { textAlign: 'center', marginTop: 30, fontSize: 14, color: '#888' },
});
