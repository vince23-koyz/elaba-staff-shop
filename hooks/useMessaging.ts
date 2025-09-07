import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import socketService from '../services/socketService';

export interface Message {
  id?: number;
  sender_type: 'customer' | 'admin';
  sender_id: string;
  receiver_type: 'customer' | 'admin';
  receiver_id: string;
  shop_id: string;
  message_text: string;
  created_at?: string;
}

export interface CustomerConversation {
  customer_id: string;
  customer_name: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unread?: boolean;
  shop_id: string;
}

const useMessaging = (userId: string, userType: 'customer' | 'admin', shopId?: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<CustomerConversation[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesRef = useRef<Message[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Connect to socket when hook is initialized
  useEffect(() => {
    if (userId) {
      socketService.connect(userId, userType);

      // Listen for incoming messages
      socketService.onReceiveMessage((newMessage: Message) => {
        console.log('📩 Received message:', newMessage);
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
      });

      return () => {
        socketService.offReceiveMessage();
      };
    }
  }, [userId, userType]);

  // Send message function
  const sendMessage = async (messageData: Omit<Message, 'id' | 'created_at'>) => {
    try {
      // Send via socket for real-time
      socketService.sendMessage(messageData);

      // Also save to database via API
      await axios.post('http://10.0.2.2:5000/api/messages', messageData);
      
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
      const response = await axios.get(
        `http://10.0.2.2:5000/api/messages/conversation/${customerId}/${adminId}/${shopId}`
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
      const response = await axios.get(`http://10.0.2.2:5000/api/messages/shop/${currentShopId}`);
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
          const messageTime = new Date(message.created_at || 0);
          
          if (!customerMap.has(customerId)) {
            // Create new conversation entry
            customerMap.set(customerId, {
              customer_id: customerId,
              customer_name: `Customer ${customerId}`, // Will be updated below
              shop_id: currentShopId,
              lastMessage: message.message_text,
              lastMessageTime: message.created_at,
              unread: isFromCustomer // Mark as unread if last message is from customer
            });
          } else {
            // Update existing conversation if this message is newer
            const existing = customerMap.get(customerId)!;
            const existingTime = new Date(existing.lastMessageTime || 0);
            
            if (messageTime > existingTime) {
              existing.lastMessage = message.message_text;
              existing.lastMessageTime = message.created_at;
              existing.unread = isFromCustomer; // Update unread status based on latest message
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
              const customerResponse = await axios.get(`http://10.0.2.2:5000/api/customers/${customerId}`);
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
  };

  // Leave conversation room
  const leaveConversation = (customerId: string, adminId: string, shopId: string) => {
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
