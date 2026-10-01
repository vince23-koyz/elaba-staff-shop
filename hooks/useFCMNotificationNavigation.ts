import { useEffect } from 'react';
import { Linking } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { handleNotificationNavigation } from '../services/notificationNavigation';

function parseChatUrl(urlString: string | null) {
  if (!urlString) return null;
  try {
    const prefix = 'elabastaff://chat';
    if (!urlString.startsWith(prefix)) {
      return null;
    }

    const query = urlString.slice(prefix.length).replace(/^\?/, '');
    const params: Record<string, string> = {};
    query.split('&').forEach(pair => {
      if (!pair) return;
      const [rawKey, rawValue = ''] = pair.split('=');
      params[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue.replace(/\+/g, ' '));
    });

    return {
      sender_type: params.sender_type,
      sender_id: params.sender_id,
      sender_name: params.sender_name,
      receiver_type: params.receiver_type,
      receiver_id: params.receiver_id,
      shop_id: params.shop_id,
      conversationId: params.conversationId,
    };
  } catch (error) {
    console.warn('[FCM] Failed to parse chat deep link:', urlString, error);
    return null;
  }
}

export const useFCMNotificationNavigation = () => {
  useEffect(() => {
    const unsubscribeNotificationOpened = messaging().onNotificationOpenedApp(remoteMessage => {
      if (remoteMessage?.data) {
        handleNotificationNavigation(remoteMessage.data as any);
      }
    });

    const getInitialNotification = async () => {
      const remoteMessage = await messaging().getInitialNotification();
      if (remoteMessage?.data) {
        handleNotificationNavigation(remoteMessage.data as any);
      }
    };

    const handleUrl = (url: string | null) => {
      const data = parseChatUrl(url);
      if (data) {
        handleNotificationNavigation(data as any);
      }
    };

    const onUrlEvent = ({ url }: { url: string }) => handleUrl(url);

    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('[FCM] foreground message received:', remoteMessage);
    });

    const linkingSubscription = Linking.addEventListener('url', onUrlEvent);
    Linking.getInitialURL().then(handleUrl).catch(() => null);

    getInitialNotification();

    return () => {
      unsubscribe();
      unsubscribeNotificationOpened();
      linkingSubscription.remove();
    };
  }, []);
};
