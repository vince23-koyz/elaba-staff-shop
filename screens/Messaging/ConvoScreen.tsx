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
  Dimensions
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/Navigator';
import LinearGradient from 'react-native-linear-gradient';
import useMessaging, { Message as MessagingMessage } from '../../hooks/useMessaging';
import AsyncStorage from '@react-native-async-storage/async-storage';

const screenHeight = Dimensions.get("window").height;

type ConvoScreenRouteProp = RouteProp<RootStackParamList, 'Convo'>;
type ConvoScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Convo'>;

interface Props {
  route: ConvoScreenRouteProp;
  navigation: ConvoScreenNavigationProp;
}

const ConvoScreen: React.FC<Props> = ({ route, navigation }) => {
  const { customerId, customerName, shopId, adminId } = route.params;
  const [inputText, setInputText] = useState('');
  const [inputHeight, setInputHeight] = useState(40);
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  
  const { 
    messages,
    loading,
    loadConversation, 
    sendMessage,
    clearMessages,
    leaveConversation
  } = useMessaging(adminId.toString(), 'admin', shopId.toString());

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
    if (customerId && shopId && currentAdminId) {
      loadConversationRef.current(customerId.toString(), currentAdminId, shopId.toString());
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
      <View style={styles.header}>
        {/* Back Button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Image source={require('../../assets/img/back.png')} style={styles.backIcon} />
        </TouchableOpacity>

        {/* Customer Name */}
        <Text style={styles.customerName}>{customerName}</Text>

        {/* Status Indicator */}
        <View style={styles.avatarContainer}>
          <View style={[styles.statusDot, styles.connected]} />
        </View>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollViewContainer}
        showsVerticalScrollIndicator={false}
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

      {/* Footer (Messaging Input) */}
      <View style={styles.footer}>
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
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
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
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
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
    position: 'absolute',
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    paddingVertical: 14, 
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
    justifyContent: 'center',
    marginBottom: 3,
  },
  sendIcon: {
    width: 28,
    height: 28,
    tintColor: '#224ee0',
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  scrollViewContainer: {
    flex: 1,
    paddingHorizontal: 16,
    marginBottom: 70,
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