// Header.tsx
import React from 'react'
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation/Navigator'

type HeaderProps = {
  shopName: string
  toggleMenu: () => void
}

export default function Header({ shopName, toggleMenu }: HeaderProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleChat = () => navigation.navigate('Chat')
  const handleNotifs = () => navigation.navigate('Notifs')

  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={toggleMenu}>
        <Image source={require('../assets/img/menu.png')} style={styles.icon} />
      </TouchableOpacity>
      <Text style={styles.shopName}>{shopName}</Text>
      <View style={styles.rightIcons}>
        <TouchableOpacity onPress={handleChat} style={styles.iconBtn}>
          <Image source={require('../assets/img/chat.png')} style={styles.icon} />
        </TouchableOpacity>

        {/* Notification Button with Red Dot */}
        <TouchableOpacity onPress={handleNotifs} style={styles.iconBtn}>
          <View>
            <Image source={require('../assets/img/notifications.png')} style={styles.icon} />
            {/* Red Dot Indicator */}
            <View style={styles.redDot} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, zIndex: 10,
  },
  shopName: { fontSize: 20, fontWeight: '700', color: '#fff' },
  rightIcons: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { marginLeft: 12 },
  icon: { width: 30, height: 30, resizeMode: 'contain', tintColor: '#fff' },

  // 🔴 #f23131 Dot
  redDot: {
    position: 'absolute',
    right: -2,
    top: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'red',
    
  },
})
