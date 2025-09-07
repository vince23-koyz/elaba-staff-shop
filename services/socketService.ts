import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private static instance: SocketService;

  private constructor() {}

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  connect(userId: string, userType: 'customer' | 'admin') {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io('http://10.0.2.2:5000', {
      transports: ['websocket'],
      forceNew: true,
    });

    this.socket.on('connect', () => {
      console.log('🟢 Connected to server:', this.socket?.id);
      // Join user to their room
      this.socket?.emit('join', { userId, userType });
    });

    this.socket.on('disconnect', () => {
      console.log('🔴 Disconnected from server');
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  sendMessage(messageData: {
    sender_type: 'customer' | 'admin';
    sender_id: string;
    receiver_type: 'customer' | 'admin';
    receiver_id: string;
    shop_id: string;
    message_text: string;
  }) {
    if (this.socket?.connected) {
      this.socket.emit('sendMessage', messageData);
    }
  }

  onReceiveMessage(callback: (message: any) => void) {
    if (this.socket) {
      this.socket.on('receiveMessage', callback);
    }
  }

  offReceiveMessage() {
    if (this.socket) {
      this.socket.off('receiveMessage');
    }
  }

  joinConversation(shopId: string, senderId: string, senderType: 'customer' | 'admin', receiverId: string, receiverType: 'customer' | 'admin') {
    if (this.socket?.connected) {
      const conversationId = `shop_${shopId}_${senderType}_${senderId}_${receiverType}_${receiverId}`;
      this.socket.emit('joinConversation', conversationId);
      console.log(`🔗 Joined conversation: ${conversationId}`);
    }
  }

  leaveConversation(shopId: string, senderId: string, senderType: 'customer' | 'admin', receiverId: string, receiverType: 'customer' | 'admin') {
    if (this.socket?.connected) {
      const conversationId = `shop_${shopId}_${senderType}_${senderId}_${receiverType}_${receiverId}`;
      this.socket.emit('leaveConversation', conversationId);
      console.log(`👋 Left conversation: ${conversationId}`);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export default SocketService.getInstance();
