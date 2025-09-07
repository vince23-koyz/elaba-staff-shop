import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
  View, Text, StyleSheet, FlatList, ListRenderItem, 
  TouchableOpacity, TextInput, Image, RefreshControl 
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/navigator';
import useMessaging, { CustomerConversation } from '../../hooks/useMessaging';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ChatScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Chat'>;

export default function ChatScreen({ navigation }: { navigation: ChatScreenNavigationProp }) {
  const [filter, setFilter] = useState<'All' | 'Unread' | 'Spam'>('All');
  const [search, setSearch] = useState('');
  const [adminId, setAdminId] = useState<string>('');
  const [shopId, setShopId] = useState<string>('');

  const { 
    conversations, 
    loading, 
    loadCustomerConversations 
  } = useMessaging(adminId, 'admin', shopId);

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
        }
      } catch (error) {
        console.error('Error loading admin data:', error);
      }
    };

    loadAdminData();
  }, []);

  useEffect(() => {
    if (adminId && shopId) {
      loadCustomerConversationsRef.current(adminId, shopId);
    }
  }, [adminId, shopId]);

  const handleRefresh = useCallback(() => {
    if (adminId && shopId) {
      loadCustomerConversationsRef.current(adminId, shopId);
    }
  }, [adminId, shopId]);

  const filteredChats = useMemo(() => {
    let data = conversations;

    if (filter === 'Unread') {
      data = data.filter((c: CustomerConversation) => c.unread);
    } else if (filter === 'Spam') {
      data = []; // No spam implementation yet
    }

    if (search.trim()) {
      data = data.filter(
        (c: CustomerConversation) =>
          c.customer_name.toLowerCase().includes(search.toLowerCase()) ||
          (c.lastMessage && c.lastMessage.toLowerCase().includes(search.toLowerCase()))
      );
    }

    return data;
  }, [filter, search, conversations]);

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleChatPress = (conversation: CustomerConversation) => {
    // Navigate to ConvoScreen
    navigation.navigate('Convo', {
      customerId: conversation.customer_id,
      customerName: conversation.customer_name,
      shopId: conversation.shop_id,
      adminId: adminId,
    });
  };

  const renderItem: ListRenderItem<CustomerConversation> = ({ item }) => (
    <TouchableOpacity 
      style={[styles.chatItem, item.unread && styles.unreadItem]}
      onPress={() => handleChatPress(item)}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.customer_name.charAt(0).toUpperCase()}</Text>
      </View>

      <View style={styles.chatDetails}>
        <View style={styles.row}>
          <Text style={[styles.name, item.unread && styles.unreadName]}>{item.customer_name}</Text>
          <Text style={styles.time}>{formatTime(item.lastMessageTime)}</Text>
        </View>
        <Text
          style={[styles.message, item.unread && styles.unreadMessage]}
          numberOfLines={1}
        >
          {item.unread ? ' ' : ''}{item.lastMessage || 'No messages yet'}
        </Text>
      </View>

      {item.unread && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#4facfe', '#09d1db']}
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
            <Text style={styles.refreshText}>↻</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchWrapper}>
          <TextInput
            placeholder="🔍 Search..."
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
  unreadItem: { backgroundColor: '#eaf6ff' },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4facfe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  chatDetails: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  name: { fontSize: 16, fontWeight: '600', color: '#222' },
  unreadName: { fontWeight: '700', color: '#111' },

  message: { fontSize: 14, color: '#666', marginTop: 2 },
  unreadMessage: { fontWeight: '600', color: '#000' },

  time: { fontSize: 12, color: '#999' },

  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4facfe',
    marginLeft: 8,
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
