import React from 'react';
import Navigator from './navigation/Navigator';
import { useNotifications } from './hooks/useNotifications';
import { useFCMNotificationNavigation } from './hooks/useFCMNotificationNavigation';
import { NotificationProvider } from './context/NotificationContext';

const App: React.FC = () => {
  useNotifications();
  useFCMNotificationNavigation();

  return (
    <NotificationProvider>
      <Navigator />
    </NotificationProvider>
  );
};
  
export default App;
