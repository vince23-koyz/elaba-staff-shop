import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
  View, Text, StyleSheet, FlatList, ListRenderItem, 
  TouchableOpacity, TextInput, Image, RefreshControl 
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useIsFocused } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/navigator';
import useMessaging, { CustomerConversation } from '../../hooks/useMessaging';
import useUnreadMessages from '../../hooks/useUnreadMessages';
import AsyncStorage from '@react-native-async-storage/async-storage';
import socketService from '../../services/socketService';
import { api, API_ENDPOINTS, API_CONFIG } from '../../config/api';
import {
  resolveEffectiveUnreadState,
  getReadOverrides,
  setReadOverride,
  MessageReadStateOverride,
} from '../../utils/messageReadState';

// Normalize customer profile picture into a full URL
const toCustomerAvatarUrl = (pp?: string | null): string | null => {
  if (!pp) return null;
  const val = pp.trim();
  if (!val) return null;
  if (val.startsWith('http')) return val;
  if (val.startsWith('/uploads/') || val.startsWith('uploads/')) {
    return `${API_CONFIG.BASE_ORIGIN}${val.startsWith('/') ? '' : '/'}${val}`;
  }
  return `${API_CONFIG.BASE_ORIGIN}/uploads/customer-profile/${val}`;
};

type ChatScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Chat'>;

export default function ChatScreen({ navigation }: { navigation: ChatScreenNavigationProp }) {
  const [filter, setFilter] = useState<'All' | 'Unread' | 'Spam'>('All');
  const [search, setSearch] = useState('');
  const [adminId, setAdminId] = useState<string>('');
  const [shopId, setShopId] = useState<string>('');
  const [lastMessageUpdate, setLastMessageUpdate] = useState<number>(Date.now());
  const [failedAvatars, setFailedAvatars] = useState<Record<string, boolean>>({});
  const [clearingCustomerId, setClearingCustomerId] = useState<string | null>(null);
  const [readOverrides, setReadOverrides] = useState<Record<string, MessageReadStateOverride>>({});
  const readStateOverridesRef = useRef<Record<string, MessageReadStateOverride>>({});
  const isFocused = useIsFocused(); // Hook to detect when screen is focused

  const {
    conversations, 
    loading, 
    loadCustomerConversations 
  } = useMessaging(adminId, 'admin', shopId);

  // Hook for tracking unread messages across the app (persisted)
  const { consumeLastReadConversationMarker } = useUnreadMessages(adminId || '', 'admin');

  // Stable reference to avoid infinite loops
  const loadCustomerConversationsRef = useRef(loadCustomerConversations);
  
  useEffect(() => {
    loadCustomerConversationsRef.current = loadCustomerConversations;
  }, [loadCustomerConversations]);

  useEffect(() => {
    const loadAdminData = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        
        if (userData) {
          const parsedData = JSON.parse(userData);
          
          const currentAdminId = parsedData.adminId?.toString() || parsedData.admin_id?.toString();
          const currentShopId = parsedData.shopId?.toString() || parsedData.shop_id?.toString();
          
          setAdminId(currentAdminId);
          setShopId(currentShopId);

          // load persisted read overrides for this admin
          try {
            const persisted = await getReadOverrides(currentAdminId);
            readStateOverridesRef.current = persisted || {};
            setReadOverrides(persisted || {});
          } catch (e) {
            console.log('Error loading read overrides for admin:', e);
          }
        }
      } catch (error) {
        console.error('Error loading admin data:', error);
      }
    };

    loadAdminData();
  }, []);

  useEffect(() => {
    if (!adminId) return;

    const refreshOverrides = async () => {
      try {
        const persisted = await getReadOverrides(adminId);
        readStateOverridesRef.current = persisted || {};
        setReadOverrides(persisted || {});
      } catch (e) {
        console.log('Error refreshing read overrides for admin:', e);
      }
    };

    void refreshOverrides();
  }, [adminId, isFocused]);

  useEffect(() => {
    if (adminId && shopId) {
      loadCustomerConversationsRef.current(adminId, shopId);
    }
  }, [adminId, shopId]);

  // Real-time message updates for MessagingScreen
  useEffect(() => {
    if (adminId && shopId) {
      console.log('🔄 [STAFF] Setting up real-time message listener for MessagingScreen');
      
      // Ensure socket connection
      socketService.connect(adminId, 'admin');
      
      // Listen for incoming messages to update conversation list
      const handleNewMessage = (newMessage: any) => {
        console.log('📩 [STAFF] MessagingScreen received new message:', newMessage);
        
        // Check if this message belongs to current admin's shop
        const isForThisShop = newMessage.shop_id === shopId;
        const isFromCustomer = newMessage.sender_type === 'customer';
        const isToThisAdmin = newMessage.receiver_id === adminId && newMessage.receiver_type === 'admin';
        
        if (isForThisShop && (isFromCustomer || isToThisAdmin)) {
          console.log('✅ [STAFF] Message is for this shop, refreshing conversations');
          // Immediately refresh conversations for instant updates
          loadCustomerConversationsRef.current(adminId, shopId);
          // Also trigger lastMessageUpdate for any additional logic
          setLastMessageUpdate(Date.now());
        } else {
          console.log('🚫 [STAFF] Message not for this shop, ignoring');
        }
      };
      
      socketService.onReceiveMessage(handleNewMessage);
      
      // Cleanup function
      return () => {
        console.log('🧹 [STAFF] Cleaning up MessagingScreen message listener');
        socketService.offReceiveMessage(handleNewMessage);
      };
    }
  }, [adminId, shopId]);

  // Auto-refresh conversations when lastMessageUpdate changes
  useEffect(() => {
    if (adminId && shopId && lastMessageUpdate > 0) {
      console.log('🔄 [STAFF] Auto-refreshing conversations due to new message');
      loadCustomerConversationsRef.current(adminId, shopId);
    }
  }, [lastMessageUpdate, adminId, shopId]);

  // Refresh conversations when screen comes into focus (e.g., returning from Convo screen)
  useEffect(() => {
    if (isFocused && adminId && shopId) {
      console.log('🔄 [STAFF] Screen focused - refreshing conversations to show latest messages');
      loadCustomerConversationsRef.current(adminId, shopId);
      if (clearingCustomerId) {
        const nextOverrides = {
          ...readStateOverridesRef.current,
          [clearingCustomerId]: { hasUnreadMessages: false, unreadCount: 0 },
        };
        readStateOverridesRef.current = nextOverrides;
        setReadOverrides(nextOverrides);
        setClearingCustomerId(null);
      }
      // consume any read markers set by ConvoScreen to clear unread state
      (async () => {
        try {
          if (consumeLastReadConversationMarker) {
            const marker = await consumeLastReadConversationMarker();
            if (marker && marker.receiverId) {
              // mark that conversation as read locally
              const nextOverrides = {
                ...readStateOverridesRef.current,
                [marker.receiverId]: { hasUnreadMessages: false, unreadCount: 0 },
              };
              readStateOverridesRef.current = nextOverrides;
              setReadOverrides(nextOverrides);
            }
          }
        } catch (e) {
          console.log('Error consuming last read marker:', e);
        }
      })();
    }
  }, [isFocused, adminId, shopId, clearingCustomerId]);

  const handleRefresh = useCallback(() => {
    if (adminId && shopId) {
      loadCustomerConversationsRef.current(adminId, shopId);
    }
  }, [adminId, shopId]);

  const filteredChats = useMemo(() => {
    let data = conversations.map((c: CustomerConversation) => ({
      ...c,
      // compute effective unread using any local override
      __effectiveUnread: resolveEffectiveUnreadState({
        serverHasUnreadMessages: Boolean(c.unread),
        serverUnreadCount: c.unreadCount || 0,
        override: readStateOverridesRef.current[c.customer_id?.toString() || ''],
      }),
    }));

    if (filter === 'Unread') {
      data = data.filter((c: any) => c.__effectiveUnread?.hasUnreadMessages);
    } else if (filter === 'Spam') {
      data = []; // No spam implementation yet
    }

    if (search.trim()) {
      data = data.filter(
        (c: any) =>
          c.customer_name.toLowerCase().includes(search.toLowerCase()) ||
          (c.lastMessage && c.lastMessage.toLowerCase().includes(search.toLowerCase()))
      );
    }

    // strip helper property before returning
    return data.map((c: any) => {
      const { __effectiveUnread, ...rest } = c;
      return rest as CustomerConversation;
    });
  }, [filter, search, conversations, readOverrides]);

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const clearUnreadForConversation = async (customerId?: string | null) => {
    const targetId = customerId?.toString();
    if (!targetId) return;

    const nextOverrides = {
      ...readStateOverridesRef.current,
      [targetId]: { hasUnreadMessages: false, unreadCount: 0 },
    };
    readStateOverridesRef.current = nextOverrides;
    setReadOverrides(nextOverrides);

    // persist override for this admin so other components/screens can read it
    try {
      if (adminId) {
        await setReadOverride(adminId, targetId, { hasUnreadMessages: false, unreadCount: 0 });
      }
    } catch (e) {
      console.log('Error persisting read override:', e);
    }
  };

  const handleChatPress = (conversation: CustomerConversation) => {
    const customerId = conversation.customer_id?.toString();
    setClearingCustomerId(customerId || null);
    clearUnreadForConversation(customerId);

    // Optimistically mark messages as read on tap, then navigate
    try {
      if (adminId && shopId) {
        api.put(API_ENDPOINTS.MESSAGES.MARK_READ, {
          senderId: conversation.customer_id,
          receiverId: adminId,
          shopId: shopId,
          senderType: 'customer',
          receiverType: 'admin',
        })
          .then(() => {
            // Refresh conversations to reflect cleared unread
            loadCustomerConversationsRef.current(adminId, shopId);
            setLastMessageUpdate(Date.now());
          })
          .catch((e: any) => {
            console.log('Failed to mark read (staff list):', e?.message || e);
          });
      }
    } catch (e: any) {
      console.log('Error in handleChatPress mark-read:', e?.message || e);
    } finally {
      // Navigate to ConvoScreen
      navigation.navigate('Convo', {
        customerId: conversation.customer_id,
        customerName: conversation.customer_name,
        shopId: conversation.shop_id,
        adminId: adminId,
      });
    }
  };

  const renderItem: ListRenderItem<CustomerConversation> = ({ item }) => {
    const candidateUrl = toCustomerAvatarUrl(item.profile_picture || null);
    const showImage = !!candidateUrl && !failedAvatars[item.customer_id];
    const avatarUri = candidateUrl || '';
    const override = readOverrides[item.customer_id?.toString() || ''];
    const effectiveUnread = resolveEffectiveUnreadState({
      serverHasUnreadMessages: Boolean(item.unread),
      serverUnreadCount: item.unreadCount || 0,
      override,
    });
    const hasUnread = effectiveUnread?.hasUnreadMessages;
    return (
    <TouchableOpacity 
      style={[
        styles.chatItem, 
        hasUnread && styles.unreadItem
      ]}
      onPress={() => handleChatPress(item)}
    >
      {showImage ? (
        <Image
          source={{ uri: avatarUri }}
          style={styles.avatarImage}
          onError={() => setFailedAvatars(prev => ({ ...prev, [item.customer_id]: true }))}
        />
      ) : (
        <View style={[styles.avatar, hasUnread && styles.unreadAvatar]}>
          <Text style={[styles.avatarText, hasUnread && styles.unreadAvatarText]}>
            {item.customer_name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      <View style={styles.chatDetails}>
        <View style={styles.row}>
          <Text style={[styles.name, hasUnread && styles.unreadName]}>
            {item.customer_name}
          </Text>
          <Text style={[styles.time, hasUnread && styles.unreadTime]}>
            {formatTime(item.lastMessageTime)}
          </Text>
        </View>
        <Text
          style={[styles.message, hasUnread && styles.unreadMessage]}
          numberOfLines={1}
        >
          {item.lastMessage || 'No messages yet'}
        </Text>
      </View>

      <View style={styles.statusContainer}>
        {hasUnread && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{effectiveUnread.unreadCount && effectiveUnread.unreadCount > 9 ? '9+' : effectiveUnread.unreadCount || 1}</Text>
          </View>
        )}
        <View style={[
          styles.unreadDot, 
          hasUnread ? styles.unreadDotActive : styles.unreadDotInactive
        ]} />
      </View>
    </TouchableOpacity>
  );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#71c5b4', '#6fa8dc']}
        style={styles.header}
        start={{ x: 0, y: 0 }} 
        end={{ x: 1, y: 0 }} 
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backWrapper}>
            <Image source={require('../../assets/img/back.png')} style={styles.backButton} />
          </TouchableOpacity>
          <Text style={styles.headerText}>Messages</Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.backWrapper}>
            <Text style={styles.refreshText}>
              {lastMessageUpdate !== Date.now() ? '🔄' : '↻'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchWrapper}>
          <TextInput
            placeholder="   Search..."
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {['All', 'Unread', 'Spam'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, filter === tab && styles.activeTab]}
              onPress={() => setFilter(tab as typeof filter)}
            >
              <Text style={[styles.tabText, filter === tab && styles.activeTabText]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {/* Chat list */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredChats}
          renderItem={renderItem}
          keyExtractor={(item) => item.customer_id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={handleRefresh}
              colors={['#4facfe']}
              tintColor="#4facfe"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.empty}>No customer conversations found.</Text>
              <Text style={styles.emptySubtext}>
                Customer messages for this shop will appear here when they send messages.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },

  header: {
    paddingTop: 40,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  backWrapper: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    width: 24,
    height: 24,
    tintColor: '#fff',
    resizeMode: 'contain',
  },
  headerText: { fontSize: 22, fontWeight: '700', color: '#fff', textAlign: 'center', flex: 1 },

  searchWrapper: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    justifyContent: 'center',
    elevation: 3,
  },
  searchInput: { fontSize: 14, color: '#333' },

  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    marginHorizontal: 16,
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  activeTab: { backgroundColor: '#fff' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#fff' },
  activeTabText: { color: '#4facfe', fontWeight: '700' },

  list: { padding: 16, paddingTop: 8 },

  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 2,
  },
  unreadItem: { 
    backgroundColor: '#f0f8ff', // Light blue background for unread
    borderLeftWidth: 4,
    borderLeftColor: '#4facfe', // Blue accent border
    elevation: 4, // Higher elevation for unread items
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4facfe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  unreadAvatar: {
    backgroundColor: '#2196F3', // Darker blue for unread avatars
    elevation: 3,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: '#eee',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  unreadAvatarText: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: '900', // Extra bold for unread
  },

  chatDetails: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  name: { fontSize: 16, fontWeight: '600', color: '#222' },
  unreadName: { fontWeight: '800', color: '#2196F3' }, // Blue and extra bold for unread

  message: { fontSize: 14, color: '#666', marginTop: 2 },
  unreadMessage: { fontWeight: '600', color: '#000' }, // Bold and darker for unread

  time: { fontSize: 12, color: '#999' },
  unreadTime: { 
    fontSize: 12, 
    fontWeight: '600', 
    color: '#2196F3' // Blue and bold for unread
  },

  statusContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 60,
  },

  unreadBadge: {
    backgroundColor: '#e74c3c',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 4,
    elevation: 2,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },

  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 8,
  },
  unreadDotActive: {
    backgroundColor: '#4facfe',
    elevation: 2,
  },
  unreadDotInactive: {
    backgroundColor: '#4CAF50',
  },

  empty: { textAlign: 'center', marginTop: 40, fontSize: 14, color: '#999' },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  emptySubtext: {
    textAlign: 'center',
    fontSize: 14,
    color: '#999',
    marginTop: 10,
    lineHeight: 20,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  
  refreshText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
});
