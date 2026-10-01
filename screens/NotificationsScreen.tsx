// NotificationsScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Image, RefreshControl,
  Animated, Easing
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/navigator';
import { useNotificationContext } from '../context/NotificationContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifs'>;

const notificationIcons: Record<string, any> = {
  booking: require('../assets/img/notifications.png'),
  payment: require('../assets/img/gcash.png'),
  service: require('../assets/img/service.png'),
  delivery: require('../assets/img/delivery.png'),
  pending_reminder: require('../assets/img/pending.png'), // Clock icon for pending reminders
};

export default function NotificationsScreen({ navigation }: Props) {
  const [activeTab, setActiveTab] = useState<'All' | 'Unread'>('All');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const shimmerAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  
  // Use the notification context
  const { notifications, loading, error, refreshNotifications, markAsRead } = useNotificationContext();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    if (!loading) {
      shimmerAnimation.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.timing(shimmerAnimation, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    animation.start();
    return () => animation.stop();
  }, [loading, shimmerAnimation]);

  useFocusEffect(
    React.useCallback(() => {
      setExpandedIndex(null);
    }, [])
  );

  const handleRefresh = () => {
    setExpandedIndex(null);
    refreshNotifications();
  };

  const handleViewNotification = (item: any) => {
    setExpandedIndex(null);

    // Mark notification as read when viewing (except for pending reminder which should stay unread)
    if (item.type !== 'pending_reminder') {
      markAsRead(item.id);
    }
    
    const title = String(item.title || '').toLowerCase();
    const message = String(item.message || '').toLowerCase();
    const isRescheduleRequest = title.includes('reschedule request')
      || message.includes('requested to reschedule');
    const isShopRejection = title.includes('shop request rejected')
      || title.includes('shop registration rejected')
      || (message.includes('shop request for') && message.includes('was rejected'))
      || (message.includes('shop registration rejected for'));
    const isDocumentRejection = title.includes('document rejected')
      || title.includes('verification document rejected')
      || message.includes('uploaded documents were rejected')
      || message.includes('document rejected');

    if (isShopRejection) {
      navigation.navigate('ShopInfo');
      return;
    }

    if (isDocumentRejection) {
      navigation.navigate('VerificationDocuments');
      return;
    }

    // Reschedule requests are handled in their dedicated staff screen.
    if (isRescheduleRequest) {
      const rescheduleBookingId = item.booking_id ? Number(item.booking_id) : NaN;
      if (Number.isFinite(rescheduleBookingId)) {
        navigation.navigate('RescheduleRequests', { bookingId: rescheduleBookingId });
      }
      return;
    } else if (item.type === 'pending_reminder') {
      console.log('Navigating to dedicated Pending Services screen');
      navigation.navigate('PendingServices');
      return;
    } else if (item.booking_id) {
      const bookingId = Number(item.booking_id);
      if (Number.isFinite(bookingId)) {
        console.log('Navigating to booking details:', bookingId);
        navigation.navigate('BookingDetails', { bookingId });
        return;
      }
    }

    console.log('Notification is not tied to a valid booking or action:', item.title, item.booking_id);
    // Some notifications are informational only and should not open a booking screen.
  };

  const filteredNotifications = activeTab === 'All'
    ? notifications
    : notifications.filter((n: any) => !n.read);

  const unreadCount = filteredNotifications.filter((n: any) => !n.read).length;

  const renderSkeletonItem = (index: number) => {
    const translateX = shimmerAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [-120, 220],
    });

    return (
      <View key={`skeleton-${index}`} style={styles.skeletonItem}>
        <View style={styles.skeletonIcon} />
        <View style={styles.skeletonTextBlock}>
          <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
          <View style={[styles.skeletonLine, styles.skeletonLineMedium]} />
          <View style={[styles.skeletonLine, styles.skeletonLineLong]} />
        </View>
        <Animated.View style={[styles.skeletonShimmer, { transform: [{ translateX }] }]}>
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.75)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
    );
  };

  const toggleExpand = (index: number) => {
    setExpandedIndex(prev => (prev === index ? null : index));
  };

  const renderItem = (item: any, index: number) => {
    const isExpanded = expandedIndex === index;
    const title = typeof item.title === 'string' && item.title.trim()
      ? item.title
      : 'Notification';
    const message = typeof item.message === 'string' && item.message.trim()
      ? item.message
      : 'No message available';
    const isNewShopRejectionFormat = String(message).toLowerCase().startsWith('shop registration rejected for');
    const rejectionMatch = isNewShopRejectionFormat
      ? null
      : message.match(/^(.*?)(?:\s+|\n+)+Reason:\s*(.*)$/is);
    const isShopRejection = String(title).toLowerCase().includes('shop request rejected')
      || (String(message).toLowerCase().includes('shop request for')
        && String(message).toLowerCase().includes('was rejected'));
    const isDocumentRejection = String(title).toLowerCase().includes('verification document rejected')
      || String(title).toLowerCase().includes('document rejected')
      || String(message).toLowerCase().includes('uploaded documents were rejected')
      || String(message).toLowerCase().includes('document rejected');
    const isRejectionNotification = isShopRejection || isDocumentRejection;
    const rejectionSummary = rejectionMatch?.[1]?.trim() || message;
    const rejectionReason = rejectionMatch?.[2]?.trim() || '';
    const time = typeof item.time === 'string' && item.time.trim()
      ? item.time
      : 'Just now';
    const shouldTruncate = !isRejectionNotification && message.length > 80;
    const displayMessage = isExpanded
      ? message
      : shouldTruncate
        ? message.slice(0, 60) + '...'
        : message;
    
    const isPendingReminder = item.type === 'pending_reminder';
    const isRescheduleRequest = String(item.title || '').toLowerCase().includes('reschedule request')
      || String(item.message || '').toLowerCase().includes('requested to reschedule');

    return (
      <View
        key={`notif-${item.id}`}
        style={[
          styles.notificationItem,
          !item.read && styles.unreadItem,
          isPendingReminder && styles.pendingReminderItem,
          isRejectionNotification && styles.rejectionNotificationItem,
        ]}
      >
        <View style={styles.notificationContent}>
          <TouchableOpacity
            style={styles.notificationMain}
            onPress={() => {
              if (isPendingReminder) {
                handleViewNotification(item);
              } else if (shouldTruncate) {
                toggleExpand(index);
              } else {
                handleViewNotification(item);
              }
            }}
            activeOpacity={0.88}
          >
            <Image source={notificationIcons[item.type] || notificationIcons.service} style={styles.icon} />
            <View style={styles.textContainer}>
              <Text style={[styles.title, isPendingReminder && styles.pendingReminderTitle]}>
                {title}
              </Text>
              {isRejectionNotification ? (
                <View>
                  <Text style={[styles.message, styles.rejectionNotificationMessage]}>{rejectionSummary}</Text>
                  {rejectionReason ? (
                    <Text style={styles.rejectionReason}>Reason: {rejectionReason}</Text>
                  ) : null}
                </View>
              ) : (
                <Text style={[styles.message, isPendingReminder && styles.pendingReminderMessage]}>
                  {displayMessage}
                </Text>
              )}
              <Text style={styles.time}>{time}</Text>
            </View>

            {shouldTruncate && !isPendingReminder && !isShopRejection && (
              <Text style={styles.expandIcon}>{isExpanded ? '▲' : '▼'}</Text>
            )}
          </TouchableOpacity>

        {(isExpanded || isPendingReminder) && !isShopRejection && (
          <View>
            <TouchableOpacity
              style={[styles.viewButton, isPendingReminder && styles.pendingViewButton]}
              onPress={() => { handleViewNotification(item); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.viewButtonText, isPendingReminder && styles.pendingViewButtonText]}>
                {isPendingReminder || isRescheduleRequest ? 'View' : 'View Details'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#71c5b4', '#6fa8dc']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backWrapper}>
          <Image source={require('../assets/img/back.png')} style={styles.backButton} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerText}>Notifications</Text>
          <Text style={styles.headerSubText}>{unreadCount} unread</Text>
        </View>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <View style={styles.tabContainer}>
        {['All', 'Unread'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab as 'All' | 'Unread')}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refreshNotifications}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            style={styles.flatList}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={handleRefresh}
                colors={['#4facfe', '#00d4e0']}
                tintColor="#4facfe"
                progressBackgroundColor="#fff"
              />
            }
          >
            {loading ? (
              <View style={styles.skeletonContainer}>
                {Array.from({ length: 4 }).map((_, index) => renderSkeletonItem(index))}
              </View>
            ) : filteredNotifications.length > 0 ? (
              filteredNotifications.map(renderItem)
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🔔</Text>
                <Text style={styles.emptyText}>No {activeTab.toLowerCase()} notifications</Text>
                <Text style={styles.emptySubText}>New updates will appear here instantly.</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fb' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    paddingTop: 48,
  },
  backWrapper: {
    padding: 4,
    borderRadius: 20,
  },
  backButton: { width: 22, height: 22, resizeMode: 'contain', tintColor: '#fff' },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  headerSpacer: { width: 32 },
  headerText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSubText: { fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: '#eaf5ff',
    marginHorizontal: 12,
    marginVertical: 10,
    borderRadius: 16,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 13,
    alignItems: 'center',
  },
  activeTab: { backgroundColor: '#4facfe' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6d7681' },
  activeTabText: { color: '#fff' },
  safeArea: { flex: 1 },
  flatList: { flex: 1 },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  notificationItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  notificationCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ececec',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4facfe',
    backgroundColor: '#f9fcff',
  },
  unreadDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ff3b30',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardIcon: {
    width: 36,
    height: 36,
    marginRight: 10,
    resizeMode: 'contain',
  },
  headerContent: {
    flex: 1,
    marginRight: 6,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#20252b',
    marginBottom: 1,
  },
  unreadTitle: {
    fontWeight: '700',
    color: '#000',
  },
  timeStamp: {
    fontSize: 11,
    color: '#8d95a0',
    fontWeight: '500',
  },
  expandButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#f2f2f7',
  },
  notificationContent: {
    padding: 12,
  },
  notificationMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadItem: { borderLeftWidth: 4, borderLeftColor: '#4facfe', backgroundColor: '#f9fcff' },
  rejectionNotificationItem: {
    backgroundColor: '#fffaf5',
    borderWidth: 1,
    borderColor: '#f5d7b5',
  },
  icon: { width: 34, height: 34, marginRight: 10, resizeMode: 'contain' },
  textContainer: { flex: 1 },
  title: { fontWeight: '700', marginBottom: 2, color: '#20252b', fontSize: 14 },
  message: { color: '#4e5968', fontSize: 12.5, lineHeight: 18 },
  rejectionNotificationMessage: { color: '#7a4a1e', fontWeight: '600' },
  rejectionReason: { color: '#8a5a34', fontSize: 12.5, lineHeight: 18, marginTop: 8, fontWeight: '700' },
  time: { fontSize: 11, color: '#8d95a0', marginTop: 4 },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#4facfe',
    alignSelf: 'flex-end',
    marginRight: 4,
  },
  viewButtonText: { color: '#4facfe', fontSize: 12.5, fontWeight: '700' },
  expandIcon: { fontSize: 15, color: '#8d95a0', marginLeft: 8 },
  messageContainer: { marginBottom: 8 },
  messageText: { fontSize: 13, lineHeight: 18, color: '#48484a' },
  expandedText: { lineHeight: 20 },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 96,
  },
  primaryButton: { backgroundColor: '#4facfe' },
  primaryButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  pendingActionButton: { backgroundColor: '#fff7f2', borderWidth: 1, borderColor: '#ff7a2b' },
  pendingActionText: { color: '#ff7a2b' },
  skeletonContainer: { paddingTop: 8, paddingBottom: 16 },
  skeletonItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  skeletonIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#e8eef4', marginRight: 10 },
  skeletonTextBlock: { flex: 1 },
  skeletonLine: { height: 10, borderRadius: 6, backgroundColor: '#e8eef4', marginBottom: 8 },
  skeletonLineShort: { width: '45%' },
  skeletonLineMedium: { width: '80%' },
  skeletonLineLong: { width: '60%', marginBottom: 0 },
  skeletonShimmer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 56 },
  emptyText: { textAlign: 'center', marginTop: 12, fontSize: 14, color: '#6b7280', fontWeight: '600' },
  emptySubText: { textAlign: 'center', marginTop: 4, fontSize: 12.5, color: '#9aa4af' },
  emptyIcon: { fontSize: 46, opacity: 0.25 },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  errorIcon: { fontSize: 48, opacity: 0.7 },
  errorText: { textAlign: 'center', fontSize: 15, color: '#666', marginTop: 12, marginBottom: 18 },
  retryButton: { backgroundColor: '#4facfe', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  pendingReminderItem: { backgroundColor: '#fff7f2', borderLeftWidth: 4, borderLeftColor: '#ff7a2b' },
  pendingReminderTitle: { color: '#2b2d30', fontWeight: '700' },
  pendingReminderMessage: { color: '#5f6368' },
  pendingViewButton: { backgroundColor: '#fff7f2', borderColor: '#ff7a2b' },
  pendingViewButtonText: { color: '#ff7a2b' },
});
