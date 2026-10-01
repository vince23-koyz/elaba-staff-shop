import { useState, useEffect, useRef } from 'react';
import { api, API_ENDPOINTS } from '../config/api';
import socketService from '../services/socketService';

export interface Message {
  id?: number;
  sender_type: 'customer' | 'admin';
  sender_id: string;
  receiver_type: 'customer' | 'admin';
  receiver_id: string;
  shop_id: string;
  message_text: string;
  // 0 = unread, 1 = read (from backend). Optional to be backward-compatible
  is_read?: number;
  created_at?: string;
}

export interface CustomerConversation {
  customer_id: string;
  customer_name: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unread?: boolean;
  unreadCount?: number;
  shop_id: string;
  profile_picture?: string;
}

const useMessaging = (userId: string, userType: 'customer' | 'admin', shopId?: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<CustomerConversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentConversation, setCurrentConversation] = useState<{
    shopId: string;
    receiverId: string;
    senderId: string;
  } | null>(null);
  const messagesRef = useRef<Message[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Connect to socket when hook is initialized
  useEffect(() => {
    if (userId) {
      socketService.connect(userId, userType);

      const handleIncomingMessage = (newMessage: Message) => {
        console.log('📩 Received message:', newMessage);
        
        // Filter messages to only show those that belong to the current conversation
        if (currentConversation) {
          const isMessageForCurrentConversation = (
            newMessage.shop_id === currentConversation.shopId &&
            (
              // Message sent by current user
              (newMessage.sender_id === currentConversation.senderId) ||
              // Message received by current user from the current conversation partner
              (newMessage.sender_id === currentConversation.receiverId && 
               (newMessage.receiver_id === currentConversation.senderId || newMessage.receiver_id === userId))
            )
          );

          if (!isMessageForCurrentConversation) {
            console.log('🚫 Message not for current conversation, ignoring:', {
              messageShopId: newMessage.shop_id,
              messageSenderId: newMessage.sender_id,
              messageReceiverId: newMessage.receiver_id,
              currentShopId: currentConversation.shopId,
              currentSenderId: currentConversation.senderId,
              currentReceiverId: currentConversation.receiverId
            });
            return;
          }
        }
        
        setMessages(prev => {
          // Check if message already exists to prevent duplicates
          const exists = prev.some(msg => 
            msg.message_text === newMessage.message_text && 
            msg.sender_id === newMessage.sender_id &&
            msg.created_at === newMessage.created_at
          );
          
          if (exists) {
            console.log('🚫 Duplicate message detected, ignoring');
            return prev;
          }
          
          return [...prev, newMessage];
        });
      };

      // Listen for incoming messages
      socketService.onReceiveMessage(handleIncomingMessage);

      return () => {
        socketService.offReceiveMessage(handleIncomingMessage);
        setCurrentConversation(null);
      };
    }
  }, [userId, userType, currentConversation?.shopId, currentConversation?.receiverId, currentConversation?.senderId]);

  // Send message function
  const sendMessage = async (messageData: Omit<Message, 'id' | 'created_at'>) => {
    try {
      // Send via socket for real-time
      socketService.sendMessage(messageData);

      // Also save to database via API
      await api.post(API_ENDPOINTS.MESSAGES.BASE, messageData);
      
      // Don't add to local state here - Socket.IO will handle it
      
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  // Load conversation history between admin and customer
  const loadConversation = async (customerId: string, adminId: string, shopId: string) => {
    try {
      setLoading(true);
      
      // Set current conversation context for message filtering
      setCurrentConversation({
        shopId: shopId,
        receiverId: userType === 'admin' ? customerId : adminId,
        senderId: userId
      });
      
      const response = await api.get(
        API_ENDPOINTS.MESSAGES.CONVERSATION(customerId, adminId, shopId)
      );
      setMessages(response.data || []);
      
      // Join the conversation room
      if (userType === 'admin') {
        socketService.joinConversation(shopId, adminId, 'admin', customerId, 'customer');
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load all conversations for a shop (admin view) - simplified
  const loadCustomerConversations = async (adminId: string, currentShopId: string) => {
    try {
      setLoading(true);
      
      // Get all messages for this shop
  const response = await api.get(API_ENDPOINTS.MESSAGES.SHOP_ALL(currentShopId));
      const messages = response.data || [];
      
      if (messages.length === 0) {
        setConversations([]);
        return;
      }
      
      // Group messages by customer to create conversations
      const customerMap = new Map<string, CustomerConversation>();
      
      for (const message of messages) {
        // Only process messages involving customers
        if (message.sender_type === 'customer' || message.receiver_type === 'customer') {
          const customerId = message.sender_type === 'customer' ? message.sender_id : message.receiver_id;
          const isFromCustomer = message.sender_type === 'customer';
          // Unread for ADMIN means a message addressed to this admin that hasn't been read yet
          const isUnreadForAdmin = (
            message.receiver_type === 'admin' &&
            message.receiver_id?.toString() === adminId?.toString() &&
            (message.is_read === 0)
          );
          const messageTime = new Date(message.created_at || 0);
          const isLatestMessageFromAdmin =
            message.sender_type === 'admin' &&
            message.sender_id?.toString() === adminId?.toString();
          const previewText = isLatestMessageFromAdmin
            ? `You: ${message.message_text}`
            : message.message_text;
          
          if (!customerMap.has(customerId)) {
            // Create new conversation entry
            customerMap.set(customerId, {
              customer_id: customerId,
              customer_name: `Customer ${customerId}`, // Will be updated below
              shop_id: currentShopId,
              lastMessage: previewText,
              lastMessageTime: message.created_at,
              // Mark as unread if there exists any unread message for this admin in this conversation
              unread: !!isUnreadForAdmin,
              unreadCount: isUnreadForAdmin ? 1 : 0,
            });
          } else {
            // Update existing conversation if this message is newer
            const existing = customerMap.get(customerId)!;
            const existingTime = new Date(existing.lastMessageTime || 0);
            
            if (messageTime > existingTime) {
              existing.lastMessage = previewText;
              existing.lastMessageTime = message.created_at;
              // Keep unread true if any unread exists; otherwise set based on this message
              existing.unread = Boolean(existing.unread || isUnreadForAdmin);
            }
            // Even if not the latest, preserve unread if this message indicates unread for admin
            if (isUnreadForAdmin) {
              existing.unread = true;
              existing.unreadCount = (existing.unreadCount || 0) + 1;
            }
          }
        }
      }
      
      // Fetch customer names for all customers
      const customerIds = Array.from(customerMap.keys());
      if (customerIds.length > 0) {
        try {
          // Fetch customer details for all customer IDs
          const customerPromises = customerIds.map(async (customerId) => {
            try {
              const customerResponse = await api.get(API_ENDPOINTS.CUSTOMERS.BY_ID(customerId));
              return {
                id: customerId,
                data: customerResponse.data
              };
            } catch (error) {
              console.log(`Could not fetch customer ${customerId}:`, error);
              return {
                id: customerId,
                data: null
              };
            }
          });
          
          const customerResults = await Promise.all(customerPromises);
          
          // Update customer names in the map
          customerResults.forEach(({ id, data }) => {
            const conversation = customerMap.get(id);
            if (conversation && data) {
              const fullName = `${data.first_name || ''} ${data.last_name || ''}`.trim();
              conversation.customer_name = fullName || `Customer ${id}`;
              if (data.profile_picture) {
                conversation.profile_picture = data.profile_picture;
              }
            }
          });
        } catch (error) {
          console.log('Error fetching customer names:', error);
          // Continue with Customer ID format if name fetching fails
        }
      }
      
      // Convert map to array and sort by most recent message
      const conversationsArray = Array.from(customerMap.values()).sort((a, b) => {
        const timeA = new Date(a.lastMessageTime || 0);
        const timeB = new Date(b.lastMessageTime || 0);
        return timeB.getTime() - timeA.getTime();
      });
      
      setConversations(conversationsArray);
      
    } catch (error) {
      console.error('Error loading customer conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  // Clear messages (when leaving conversation)
  const clearMessages = () => {
    setMessages([]);
    setCurrentConversation(null);
  };

  // Leave conversation room
  const leaveConversation = (customerId: string, adminId: string, shopId: string) => {
    // Clear conversation context when leaving
    setCurrentConversation(null);
    
    if (userType === 'admin') {
      socketService.leaveConversation(shopId, adminId, 'admin', customerId, 'customer');
    }
  };

  return {
    messages,
    conversations,
    loading,
    sendMessage,
    loadConversation,
    loadCustomerConversations,
    clearMessages,
    leaveConversation,
  };
};

export default useMessaging;
