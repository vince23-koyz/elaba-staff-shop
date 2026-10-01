import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  Keyboard,
  Alert,
  Image,
  Dimensions,
  BackHandler,
  Platform,
  AppState
} from 'react-native';
import { RouteProp, useFocusEffect, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/Navigator';
import LinearGradient from 'react-native-linear-gradient';
import useMessaging, { Message as MessagingMessage } from '../../hooks/useMessaging';
import useUnreadMessages from '../../hooks/useUnreadMessages';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { api, API_ENDPOINTS, API_CONFIG } from '../../config/api';
import { setReadOverride } from '../../utils/messageReadState';
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

const screenHeight = Dimensions.get("window").height;

type ConvoScreenRouteProp = RouteProp<RootStackParamList, 'Convo'>;
type ConvoScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Convo'>;

interface Props {
  route: ConvoScreenRouteProp;
  navigation: ConvoScreenNavigationProp;
}

const ConvoScreen: React.FC<Props> = ({ route, navigation }) => {
  const { customerId, customerName, shopId, adminId } = route.params;
  const [customerProfilePic, setCustomerProfilePic] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [inputHeight, setInputHeight] = useState(40);
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 0);
  const isFocused = useIsFocused();
  const lastReadSignatureRef = useRef<string>('');
  const readSyncInFlightRef = useRef(false);
  const readSyncPendingRef = useRef(false);
  const readSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const { 
    messages,
    loading,
    loadConversation, 
    sendMessage,
    clearMessages,
    leaveConversation
  } = useMessaging(adminId.toString(), 'admin', shopId.toString());
  const { clearConversationUnreadState } = useUnreadMessages(adminId.toString(), 'admin');

  const clearConversationNotification = useCallback(async () => {
    if (!customerId || !shopId || !currentAdminId) return;

    const conversationId = `shop_${shopId}_customer_${customerId}_admin_${currentAdminId}`;
    try {
      const { ChatNotificationModule } = require('react-native').NativeModules;
      if (ChatNotificationModule?.clearConversationNotification) {
        ChatNotificationModule.clearConversationNotification(conversationId);
      }
    } catch (error) {
      console.log('Failed to clear staff conversation notification:', error);
    }
  }, [customerId, currentAdminId, shopId]);

  // Stable references to avoid infinite loops
  const loadConversationRef = useRef(loadConversation);
  const leaveConversationRef = useRef(leaveConversation);
  const clearMessagesRef = useRef(clearMessages);

  // Update refs when functions change
  useEffect(() => {
    loadConversationRef.current = loadConversation;
    leaveConversationRef.current = leaveConversation;
    clearMessagesRef.current = clearMessages;
  }, [loadConversation, leaveConversation, clearMessages]);

  const getUnreadIncomingSignature = useCallback(() => {
    if (!customerId || !shopId || !currentAdminId) {
      return '';
    }

    const unreadMessages = messages.filter((message) => {
      return (
        message.sender_type === 'customer' &&
        message.sender_id?.toString() === customerId.toString() &&
        message.receiver_type === 'admin' &&
        message.receiver_id?.toString() === currentAdminId.toString() &&
        Number(message.is_read ?? 0) === 0
      );
    });

    if (unreadMessages.length === 0) {
      return '';
    }

    return unreadMessages
      .map((message) => [
        message.id ?? 'no-id',
        message.created_at ?? 'no-created-at',
        message.sender_id,
        message.receiver_id,
        message.message_text,
      ].join('|'))
      .join('||');
  }, [messages, customerId, currentAdminId, shopId]);

  async function flushReadSync(signature: string) {
    if (!signature || !customerId || !shopId || !currentAdminId || !isFocused) {
      return;
    }

    if (signature === lastReadSignatureRef.current) {
      return;
    }

    if (readSyncInFlightRef.current) {
      readSyncPendingRef.current = true;
      return;
    }

    readSyncInFlightRef.current = true;

    try {
      await api.put(API_ENDPOINTS.MESSAGES.MARK_READ, {
        senderId: customerId.toString(),
        receiverId: currentAdminId,
        shopId: shopId.toString(),
        senderType: 'customer',
        receiverType: 'admin',
      });

      await setReadOverride(currentAdminId, customerId.toString(), { hasUnreadMessages: false, unreadCount: 0 });

      await clearConversationUnreadState({
        sender_id: customerId.toString(),
        sender_type: 'customer',
        receiver_id: currentAdminId,
        receiver_type: 'admin',
        shop_id: shopId.toString(),
      });

      try {
        const conversationId = `shop_${shopId}_customer_${customerId}_admin_${currentAdminId}`;
        const { ChatNotificationModule } = require('react-native').NativeModules;

        if (ChatNotificationModule?.markConversationRead) {
          ChatNotificationModule.markConversationRead(conversationId);
        }
        if (ChatNotificationModule?.clearConversationNotification) {
          ChatNotificationModule.clearConversationNotification(conversationId);
        }
      } catch (error) {
        console.log('Failed to clear staff native conversation notification history:', error);
      }

      const markerKey = `lastReadConversation_${currentAdminId}`;
      await AsyncStorage.setItem(markerKey, JSON.stringify({
        shopId: shopId.toString(),
        receiverId: customerId.toString(),
        receiverType: 'customer',
      }));

      lastReadSignatureRef.current = signature;
    } catch (e: any) {
      console.log('Failed to mark messages as read (staff convo):', e?.response?.data || e?.message || e);
    } finally {
      readSyncInFlightRef.current = false;

      if (readSyncPendingRef.current) {
        readSyncPendingRef.current = false;
        const latestSignature = getUnreadIncomingSignature();
        if (latestSignature && latestSignature !== lastReadSignatureRef.current) {
          void flushReadSync(latestSignature);
        }
      }
    }
  }

  useEffect(() => {
    if (!isFocused || !customerId || !shopId || !currentAdminId) {
      return;
    }

    const signature = getUnreadIncomingSignature();
    if (!signature || signature === lastReadSignatureRef.current) {
      return;
    }

    if (readSyncTimerRef.current) {
      clearTimeout(readSyncTimerRef.current);
    }

    readSyncTimerRef.current = setTimeout(() => {
      void flushReadSync(signature);
    }, 120);

    return () => {
      if (readSyncTimerRef.current) {
        clearTimeout(readSyncTimerRef.current);
        readSyncTimerRef.current = null;
      }
    };
  }, [isFocused, customerId, shopId, currentAdminId, getUnreadIncomingSignature]);

  useEffect(() => {
    const loadAdminData = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const parsedData = JSON.parse(userData);
          setCurrentAdminId(parsedData.adminId?.toString() || parsedData.admin_id?.toString());
        }
      } catch (error) {
        console.error('Error loading admin data:', error);
      }
    };

    loadAdminData();
  }, []);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active' && customerId && shopId && currentAdminId) {
        void clearConversationNotification();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [customerId, shopId, currentAdminId, clearConversationNotification]);

  // Fetch customer profile picture
  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        if (!customerId) return;
  const res = await api.get(API_ENDPOINTS.CUSTOMERS.BY_ID(customerId));
  const data = res.data;
        // Some backends might nest or return path variants; normalize safely
        const pp = data?.profile_picture || data?.data?.profile_picture || null;
        const url = toCustomerAvatarUrl(pp);
        if (url) {
          setCustomerProfilePic(url);
        } else {
          setCustomerProfilePic(null);
        }
      } catch (e) {
        setCustomerProfilePic(null);
      }
    };
    fetchCustomer();
  }, [customerId]);

  useEffect(() => {
    if (customerId && shopId && currentAdminId) {
      loadConversationRef.current(customerId.toString(), currentAdminId, shopId.toString());

      const initialSignature = getUnreadIncomingSignature();
      if (initialSignature) {
        void flushReadSync(initialSignature);
      }

      if (customerId && shopId && currentAdminId) {
        void clearConversationNotification();
      }
    }

    // Clear messages when leaving
    return () => {
      if (currentAdminId) {
        leaveConversationRef.current(currentAdminId, customerId.toString(), shopId.toString());
      }
      clearMessagesRef.current();
    };
  }, [customerId, shopId, currentAdminId]); // Removed function dependencies

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Handle Android hardware back button
  useFocusEffect(
    useCallback(() => {
      if (readSyncTimerRef.current) {
        clearTimeout(readSyncTimerRef.current);
        readSyncTimerRef.current = null;
      }

      const onBackPress = () => {
        console.log('🔙 [STAFF] Android back button pressed');
        navigation.goBack();
        return true; // Prevent default back action
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => subscription.remove();
    }, [navigation])
  );

  const handleSendMessage = async () => {
    if (!inputText.trim() || !currentAdminId) return;

    const messageData = {
      sender_type: 'admin' as const,
      sender_id: currentAdminId,
      receiver_type: 'customer' as const,
      receiver_id: customerId.toString(),
      shop_id: shopId.toString(),
      message_text: inputText.trim()
    };

    console.log('📤 Sending message:', messageData);

    try {
      await sendMessage(messageData);
      setInputText('');
      setInputHeight(40);
      Keyboard.dismiss();
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = (message: MessagingMessage, index: number) => {
    // Convert both to strings for comparison to avoid type issues
    const isMyMessage = message.sender_type === 'admin' && message.sender_id.toString() === currentAdminId?.toString();
    
    return (
      <View
        key={message.id || index}
        style={[
          styles.messageContainer,
          isMyMessage ? styles.myMessage : styles.otherMessage,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
          ]}
        >
          <Text style={[
            styles.messageText,
            isMyMessage ? styles.myMessageText : styles.otherMessageText,
          ]}>
            {message.message_text}
          </Text>
          <Text style={[
            styles.messageTime,
            isMyMessage ? styles.myMessageTime : styles.otherMessageTime,
          ]}>
            {formatTime(message.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={['#a6fdf3', '#96bcff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      {/* Header */}
      <View style={[styles.header, { marginTop: insets.top || 40 }] }>
        {/* Back Button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Image source={require('../../assets/img/back.png')} style={styles.backIcon} />
        </TouchableOpacity>

        {/* Customer Name */}
        <Text style={styles.customerName}>{customerName}</Text>

        {/* Avatar with status */}
        <View style={styles.avatarContainerHeader}>
          {customerProfilePic ? (
            <Image
              source={{ uri: customerProfilePic }}
              style={styles.headerAvatar}
              onError={() => setCustomerProfilePic(null)}
            />
          ) : (
            <View style={styles.headerAvatarFallback}>
              <Text style={styles.headerAvatarInitial}>{customerName?.charAt(0).toUpperCase() || 'C'}</Text>
            </View>
          )}
          <View style={[styles.statusDotSmall, styles.connected]} />
        </View>
      </View>
      <View style={styles.content}>
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollViewContainer}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text>Loading messages...</Text>
            </View>
          ) : (
            <View style={styles.messagesContainer}>
              {messages.length === 0 ? (
                <View style={styles.noMessagesContainer}>
                  <Text style={styles.noMessagesText}>No messages yet. Start the conversation!</Text>
                </View>
              ) : (
                messages.map((message, index) => renderMessage(message, index))
              )}
            </View>
          )}
        </ScrollView>

        {/* Footer (Messaging Input) with safe area */}
        <SafeAreaView edges={['bottom']} style={[styles.footerSafe, { paddingBottom: bottomInset }]}>
          <View style={styles.footerInner}>
            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.inputPlaceholder, 
                  { height: Math.min(Math.max(40, inputHeight), screenHeight * 0.20) } 
                ]}
                placeholder="Type a message..."
                placeholderTextColor="#999"
                keyboardType="default"
                multiline={true}
                value={inputText}
                onChangeText={setInputText}
                onContentSizeChange={(e) =>
                  setInputHeight(e.nativeEvent.contentSize.height)
                }
              />
            </View>
            <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
              <Image source={require('../../assets/img/sent2.png')} style={styles.sendIcon} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    width: '100%',
    height: 60,
    backgroundColor: '#ffffff',
    marginTop: 40,
    flexDirection: 'row',
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 15,
    borderBottomColor: '#4f4f4f45',
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    alignItems: 'flex-start',
  },
  backIcon: {
    width: 25,
    height: 25,
    tintColor: '#224ee0',
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  avatarContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eee',
  },
  headerAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#224ee0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarInitial: {
    color: '#fff',
    fontWeight: '700',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusDotSmall: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 6,
  },
  connected: {
    backgroundColor: '#4CAF50',
  },
  disconnected: {
    backgroundColor: '#F44336',
  },
  messageContainer: {
    marginVertical: 4,
    paddingHorizontal: 8,
  },
  myMessage: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    marginBottom: 2,
  },
  myMessageBubble: {
    backgroundColor: '#224ee0',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#ffffff',
  },
  otherMessageText: {
    color: '#000000',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherMessageTime: {
    color: '#999999',
  },
  footer: {
    width: '100%',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderTopColor: '#4f4f4f45',
    borderBottomColor: '#4f4f4f45',
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  footerSafe: {
    backgroundColor: '#ffffff',
    borderTopColor: '#4f4f4f45',
    borderTopWidth: 1,
  },
  footerInner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    paddingTop: 8,
  },
  inputContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  inputPlaceholder: {
    color: '#000',
    fontSize: 16,
    paddingVertical: 8,
    textAlignVertical: 'top',
  },
  sendButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 3,
  },
  sendIcon: {
    width: 28,
    height: 28,
    tintColor: '#224ee0',
    marginBottom: 3,
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  scrollViewContainer: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  messagesContainer: {
    paddingVertical: 10,
  },
  noMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  noMessagesText: {
    color: '#666',
    fontSize: 16,
  },
});

export default ConvoScreen;