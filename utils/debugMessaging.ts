// Debug utility for messaging
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export const debugMessagingFlow = async () => {
  console.log('🔍 === MESSAGING DEBUG START ===');
  
  try {
    // Check AsyncStorage data
    const userData = await AsyncStorage.getItem('userData');
    console.log('📱 AsyncStorage userData:', userData);
    
    if (userData) {
      const parsed = JSON.parse(userData);
      console.log('📱 Parsed userData:', parsed);
      
      const adminId = parsed.admin_id || parsed.adminId;
      const shopId = parsed.shop_id || parsed.shopId;
      
      console.log('🆔 Extracted IDs:', { adminId, shopId });
      
      if (adminId && shopId) {
        // Test backend connectivity
        try {
          console.log('🌐 Testing backend connectivity...');
          const testResponse = await axios.get('http://10.0.2.2:5000/api/shops');
          console.log('✅ Backend reachable:', testResponse.status);
        } catch (error) {
          console.log('❌ Backend not reachable:', (error as any).message);
          return;
        }
        
        // Test conversations API
        try {
          console.log('🔄 Testing conversations API...');
          const convUrl = `http://10.0.2.2:5000/api/messages/conversations/admin/${adminId}`;
          console.log('📡 Calling:', convUrl);
          
          const convResponse = await axios.get(convUrl);
          console.log('📥 Conversations response:', convResponse.data);
          
          // Test shop messages API
          const shopUrl = `http://10.0.2.2:5000/api/messages/shop/${shopId}`;
          console.log('📡 Calling:', shopUrl);
          
          const shopResponse = await axios.get(shopUrl);
          console.log('📥 Shop messages response:', shopResponse.data);
          
        } catch (apiError) {
          console.log('❌ API Error:', (apiError as any).response?.data || (apiError as any).message);
        }
      } else {
        console.log('❌ Missing adminId or shopId');
      }
    } else {
      console.log('❌ No userData in AsyncStorage');
    }
  } catch (error) {
    console.log('❌ Debug error:', error);
  }
  
  console.log('🔍 === MESSAGING DEBUG END ===');
};

export const createTestMessage = async (adminId: string, shopId: string) => {
  try {
    console.log('🧪 Creating test message...');
    
    const testMessage = {
      sender_type: 'customer',
      sender_id: '999',
      receiver_type: 'admin',
      receiver_id: adminId,
      shop_id: shopId,
      message_text: `Test message from customer to admin ${adminId} for shop ${shopId} at ${new Date().toISOString()}`
    };
    
    const response = await axios.post('http://10.0.2.2:5000/api/messages', testMessage);
    console.log('✅ Test message created:', response.data);
    
    return response.data;
  } catch (error) {
    console.log('❌ Error creating test message:', (error as any).response?.data || (error as any).message);
    throw error;
  }
};
