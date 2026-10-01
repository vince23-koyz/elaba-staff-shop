// Header.tsx
import React from 'react'
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native'
import { useNavigation, useIsFocused } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/Navigator'
import { useNotificationContext } from '../context/NotificationContext'
import { API_CONFIG } from '../config/api'
import useUnreadMessages from '../hooks/useUnreadMessages'
import AsyncStorage from '@react-native-async-storage/async-storage'

type HeaderProps = {
  shopName: string
  toggleMenu: () => void
  shopLogo?: string | null
}

export default function Header({ shopName, toggleMenu, shopLogo }: HeaderProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const { unreadCount: notificationUnreadCount } = useNotificationContext();
  const [adminId, setAdminId] = React.useState<string>('');
  const { unreadCount: chatUnreadCount, clearUnreadMessages, refreshUnreadMessages } = useUnreadMessages(adminId || '', 'admin');

  React.useEffect(() => {
    if (isFocused && adminId) {
      refreshUnreadMessages();
    }
  }, [isFocused, adminId, refreshUnreadMessages]);

  React.useEffect(() => {
    const loadAdminId = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const parsed = JSON.parse(userData);
          const currentAdminId = parsed.adminId?.toString() || parsed.admin_id?.toString();
          setAdminId(currentAdminId || '');
        }
      } catch (error) {
        console.log('Error loading admin id for chat badge:', error);
      }
    };

    loadAdminId();
  }, []);

  const effectiveChatUnreadCount = chatUnreadCount;

  const handleChat = () => {
    clearUnreadMessages();
    navigation.navigate('Chat');
  }
  const handleNotifs = () => navigation.navigate('Notifs')

  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={toggleMenu}>
        <Image source={require('../assets/img/menu.png')} style={styles.icon} />
      </TouchableOpacity>
      <View style={styles.titleRow}>
        {shopLogo ? (
          <Image
            source={{ uri: shopLogo.startsWith('http') ? shopLogo : `${API_CONFIG.BASE_ORIGIN}${shopLogo}` }}
            style={styles.shopLogo}
            resizeMode="cover"
          />
        ) : null}
        <Text style={styles.shopName} numberOfLines={1}>{shopName}</Text>
      </View>
      <View style={styles.rightIcons}>
        <TouchableOpacity onPress={handleChat} style={styles.iconBtn}>
          <View>
            <Image source={require('../assets/img/chats.png')} style={styles.icon} />
            {effectiveChatUnreadCount > 0 && (
              <View style={styles.redDot}>
                <Text style={styles.badgeText}>{effectiveChatUnreadCount > 9 ? '9+' : effectiveChatUnreadCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Notification Button with Red Dot */}
        <TouchableOpacity onPress={handleNotifs} style={styles.iconBtn}>
          <View>
            <Image source={require('../assets/img/notifications.png')} style={styles.icon} />
            {notificationUnreadCount > 0 && (
              <View style={styles.redDot}>
                <Text style={styles.badgeText}>{notificationUnreadCount > 9 ? '9+' : notificationUnreadCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, zIndex: 10, borderBottomColor: '#ffffff3b', borderBottomWidth: 1,
  },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', marginHorizontal: 10 },
  shopLogo: { width: 28, height: 28, borderRadius: 6, marginRight: 8, backgroundColor: 'rgba(255,255,255,0.2)' },
  shopName: { fontSize: 20, fontWeight: '700', color: '#fff', flexShrink: 1 },
  rightIcons: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { marginLeft: 12 },
  icon: { width: 30, height: 30, resizeMode: 'contain', tintColor: '#fff' },

  // 🔴 #f23131 Dot with badge functionality
  redDot: {
    position: 'absolute',
    right: -2,
    top: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#f23131',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
})
