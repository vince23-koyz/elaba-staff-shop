import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../config/api';

// handles all socket connections and events for real-time notifications and messaging
class SocketService {
  private socket: Socket | null = null;
  private static instance: SocketService;
  private currentUserId: string = '';
  private currentUserType: 'customer' | 'admin' = 'admin';
  private lifecycleHandlersAttached = false;
  private receiveMessageHandlers = new Set<(message: any) => void>();
  private shopStatusUpdatedHandlers = new Set<(event: { shopId: string | number; adminId?: string | number; status?: string }) => void>();

  private constructor() {}

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  connect(userId: string, userType: 'customer' | 'admin') {
    if (this.socket?.connected && this.currentUserId === userId && this.currentUserType === userType) {
      console.log('🔌 Socket already connected, skipping');
      return;
    }

    if (this.socket && this.socket.disconnected) {
      this.currentUserId = userId;
      this.currentUserType = userType;
      this.attachLifecycleHandlers();
      this.socket.connect();
      return;
    }

    if (this.socket && !this.socket.connected) {
      this.currentUserId = userId;
      this.currentUserType = userType;
      return;
    }

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.currentUserId = userId;
    this.currentUserType = userType;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      forceNew: false,
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
    });

    this.attachLifecycleHandlers();
    this.shopStatusUpdatedHandlers.forEach(handler => {
      this.socket?.on('shopStatusUpdated', handler);
    });
  }

  private attachLifecycleHandlers() {
    if (!this.socket || this.lifecycleHandlersAttached) {
      return;
    }

    this.socket.on('connect', () => {
      console.log('🟢 Socket connected for notifications', this.socket?.id);
      this.socket?.emit('join', { userId: this.currentUserId, userType: this.currentUserType });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔴 Socket disconnected:', reason);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconnected to server after', attemptNumber, 'attempts');
      this.socket?.emit('join', { userId: this.currentUserId, userType: this.currentUserType });
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
    });

    this.lifecycleHandlersAttached = true;
  }

  disconnect() {
    if (this.socket) {
      console.log('🔌 [STAFF] Disconnecting socket and cleaning up');
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      console.log('✅ [STAFF] Socket disconnected and cleaned up');
    }
    this.currentUserId = '';
    this.currentUserType = 'admin';
    this.lifecycleHandlersAttached = false;
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
      this.receiveMessageHandlers.add(callback);
      this.socket.on('receiveMessage', callback);
    }
  }

  offReceiveMessage(callback?: (message: any) => void) {
    if (!this.socket) {
      return;
    }

    if (callback) {
      this.receiveMessageHandlers.delete(callback);
      this.socket.off('receiveMessage', callback);
      return;
    }

    this.receiveMessageHandlers.clear();
    this.socket.off('receiveMessage');
  }

  // Notification listeners
  onNewNotification(callback: (notification: any) => void) {
    if (this.socket) {
      this.socket.on('newNotification', callback);
    }
  }

  offNewNotification(callback?: (notification: any) => void) {
    if (this.socket) {
      this.socket.off('newNotification', callback);
    }
  }

  onNotificationUpdate(callback: (notification: any) => void) {
    if (this.socket) {
      this.socket.on('notificationUpdate', callback);
    }
  }

  offNotificationUpdate(callback?: (notification: any) => void) {
    if (this.socket) {
      this.socket.off('notificationUpdate', callback);
    }
  }

  // Booking event listeners for realtime dashboard stats
  onBookingCreated(callback: (event: { shopId: string | number; bookingId: number; status?: string }) => void) {
    if (this.socket) {
      this.socket.on('bookingCreated', callback);
    }
  }

  offBookingCreated(callback?: (event: { shopId: string | number; bookingId: number; status?: string }) => void) {
    if (this.socket) {
      this.socket.off('bookingCreated', callback);
    }
  }

  onBookingUpdated(callback: (event: { shopId: string | number; bookingId: number; status?: string; booking_date?: string }) => void) {
    if (this.socket) {
      this.socket.on('bookingUpdated', callback);
    }
  }

  offBookingUpdated(callback?: (event: { shopId: string | number; bookingId: number; status?: string; booking_date?: string }) => void) {
    if (this.socket) {
      this.socket.off('bookingUpdated', callback);
    }
  }

  onBookingDeleted(callback: (event: { shopId: string | number; bookingId: number }) => void) {
    if (this.socket) {
      this.socket.on('bookingDeleted', callback);
    }
  }

  offBookingDeleted(callback?: (event: { shopId: string | number; bookingId: number }) => void) {
    if (this.socket) {
      this.socket.off('bookingDeleted', callback);
    }
  }

  onShopStatusUpdated(callback: (event: { shopId: string | number; adminId?: string | number; status?: string }) => void) {
    this.shopStatusUpdatedHandlers.add(callback);
    if (this.socket) {
      this.socket.on('shopStatusUpdated', callback);
    }
  }

  offShopStatusUpdated(callback?: (event: { shopId: string | number; adminId?: string | number; status?: string }) => void) {
    if (callback) {
      this.shopStatusUpdatedHandlers.delete(callback);
    } else {
      this.shopStatusUpdatedHandlers.clear();
    }
    if (this.socket) {
      this.socket.off('shopStatusUpdated', callback);
    }
  }

  joinConversation(shopId: string, senderId: string, senderType: 'customer' | 'admin', receiverId: string, receiverType: 'customer' | 'admin') {
    if (this.socket?.connected) {
      const customerId = senderType === 'customer' ? senderId : receiverId;
      const adminId = senderType === 'admin' ? senderId : receiverId;
      const conversationId = `shop_${shopId}_customer_${customerId}_admin_${adminId}`;

      this.socket.emit('joinConversation', conversationId);
      console.log(`🔗 Joined conversation: ${conversationId}`);
    }
  }

  leaveConversation(shopId: string, senderId: string, senderType: 'customer' | 'admin', receiverId: string, receiverType: 'customer' | 'admin') {
    if (this.socket?.connected) {
      const customerId = senderType === 'customer' ? senderId : receiverId;
      const adminId = senderType === 'admin' ? senderId : receiverId;
      const conversationId = `shop_${shopId}_customer_${customerId}_admin_${adminId}`;

      this.socket.emit('leaveConversation', conversationId);
      console.log(`👋 Left conversation: ${conversationId}`);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export default SocketService.getInstance();
