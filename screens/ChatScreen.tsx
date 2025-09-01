import React, { useState, useMemo } from 'react';
import { 
  View, Text, StyleSheet, FlatList, ListRenderItem, 
  TouchableOpacity, TextInput, Image 
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/navigator';

interface Chat {
  id: string;
  name: string;
  message: string;
  unread?: boolean;
  spam?: boolean;
  time: string;
}

const sampleChats: Chat[] = [
  { id: '1', name: 'Alice', message: 'Hi, I want to schedule a laundry pickup.', unread: true, time: '2m ago' },
  { id: '2', name: 'Bob', message: 'Thanks for the quick service!', unread: false, time: '1h ago' },
  { id: '3', name: 'Charlie', message: 'Can I change my booking time?', unread: true, time: '3h ago' },
  { id: '4', name: 'Diana', message: 'Your app is really helpful!', unread: false, time: '1d ago', spam: true },
  { id: '5', name: 'Eve', message: 'I have a question about my order.', unread: false, time: '2d ago' },
  { id: '6', name: 'Frank', message: 'Great job on the last delivery!', unread: false, time: '3d ago' },
  { id: '7', name: 'Grace', message: 'Is there a discount for first-time users?', unread: true, time: '4d ago' },
  { id: '8', name: 'Hank', message: 'I need help with my account.', unread: false, time: '5d ago' },
  { id: '9', name: 'Ivy', message: 'Can you pick up from a different address?', unread: false, time: '6d ago' },
  { id: '10', name: 'Jack', message: 'Thank you for the excellent service!', unread: false, time: '1w ago' },
];

type ChatScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Chat'>;

export default function ChatScreen({ navigation }: { navigation: ChatScreenNavigationProp }) {
  const [filter, setFilter] = useState<'All' | 'Unread' | 'Spam'>('All');
  const [search, setSearch] = useState('');

  const filteredChats = useMemo(() => {
    let data = sampleChats;

    if (filter === 'Unread') {
      data = data.filter(c => c.unread);
    } else if (filter === 'Spam') {
      data = data.filter(c => c.spam);
    }

    if (search.trim()) {
      data = data.filter(
        c =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.message.toLowerCase().includes(search.toLowerCase())
      );
    }

    return data;
  }, [filter, search]);

  const renderItem: ListRenderItem<Chat> = ({ item }) => (
    <TouchableOpacity style={[styles.chatItem, item.unread && styles.unreadItem]}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
      </View>

      <View style={styles.chatDetails}>
        <View style={styles.row}>
          <Text style={[styles.name, item.unread && styles.unreadName]}>{item.name}</Text>
          <Text style={styles.time}>{item.time}</Text>
        </View>
        <Text
          style={[styles.message, item.unread && styles.unreadMessage]}
          numberOfLines={1}
        >
          {item.message}
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
            <Image source={require('../assets/img/back.png')} style={styles.backButton} />
          </TouchableOpacity>
          <Text style={styles.headerText}>Messages</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Search */}
        <View style={styles.searchWrapper}>
          <TextInput
            placeholder="🔍 Search chats..."
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
      <FlatList
        data={filteredChats}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No chats found.</Text>}
      />
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
});
