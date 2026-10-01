//// navigation/navigator.tsx
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, Text, NativeModules } from 'react-native';
import { navigationRef } from './RootNavigation';

import WelcomeScreen from '../screens/Auth/WelcomeScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import LoginScreen from '../screens/Auth/LoginScreen';
import PasswordRecovery from '../screens/Auth/PasswordRecovery';
import RegisterShop from '../screens/Auth/RegisterShop';
import HomeScreen from '../screens/HomeScreen';
import BookingManagement from '../screens/BookingManage/BookingManagement';
import ServiceManagement from '../screens/ServiceManages/ServiceManagement';
import SettingsScreen from '../screens/Settings/SettingScreen';
import EditProfile from '../screens/Settings/EditProfile';
import ChangePassword from '../screens/Settings/ChangePassword';
import ShopInfo from '../screens/Settings/ShopInfo';
import PickupDeliverySettings from '../screens/Settings/PickupDeliverySettings.tsx';
import VerificationDocuments from '../screens/Settings/VerificationDocuments';
import ChatScreen from '../screens/Messaging/MessagingScreen';
import ConvoScreen from '../screens/Messaging/ConvoScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import AddServiceScreen from '../screens/ServiceManages/AddServiceScreen';
import ServiceDetails from '../screens/ServiceManages/ServiceDetails';
import BookingDetails from '../screens/BookingDetails';
import PendingServicesScreen from '../screens/PendingServicesScreen';
// @ts-ignore - sometimes TS resolution lags for newly added files
import AccountSettings from '../screens/Settings/AccountSettings';
import ScheduledSummary from '../screens/BookingManage/ScheduledSummary';
import EarningsScreen from '../screens/EarningsScreen';
import PickupDeliveryManagement from '../screens/BookingManage/PickupDeliveryManagement.tsx';
import RescheduleRequestsScreen from '../screens/RescheduleRequestsScreen';

export type RootStackParamList = {
    Welcome: undefined;
    Register: undefined;
    RegisterShop: { admin_id: number };
    Login: undefined;
    PasswordRecovery: undefined;
    Home: undefined;
    BookingManagement: { initialFilter?: 'all' | 'pending' | 'confirmed' | 'processing' | 'completed' | 'cancelled' } | undefined;
    ServiceManagement: undefined;
    AddService: { shopId: string | null };
    ServiceDetails: { serviceId: number; shopId: string | null };
    Settings: undefined;
    EditProfile: undefined;
    ChangePassword: undefined;
    AccountSettings: undefined;
    ShopInfo: undefined;
    PickupDeliverySettings: undefined;
    VerificationDocuments: undefined;
    Chat: undefined;
    Convo: {
        customerId: string;
        customerName: string;
        shopId: string;
        adminId: string;
    };
    Notifs: undefined;
    BookingDetails: { bookingId: number };
    PendingServices: undefined;
  ScheduledSummary: undefined;
  Earnings: undefined;
  PickupDelivery: undefined;
  RescheduleRequests: { bookingId?: number } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const Navigator = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasShop, setHasShop] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const adminId = await AsyncStorage.getItem('adminId');
      const adminName = await AsyncStorage.getItem('adminName');
      const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
      const storedUserData = await AsyncStorage.getItem('userData');
      let userData: { shop_id?: string | number; shopId?: string | number } = {};

      try {
        userData = storedUserData ? JSON.parse(storedUserData) : {};
      } catch {
        userData = {};
      }

      const storedShopId = userData.shop_id ?? userData.shopId;
      const hasStoredShop = storedShopId !== undefined && storedShopId !== null && String(storedShopId).trim() !== '';
      
      // Check if admin data exists and isLoggedIn flag is true
      if (adminId && adminName && isLoggedIn === 'true' && hasStoredShop) {
        setIsLoggedIn(true);
        setHasShop(true);
      } else if (adminId && adminName && isLoggedIn === 'true') {
        setIsLoggedIn(false);
        setHasShop(false);
      } else {
        setIsLoggedIn(false);
        setHasShop(false);
      }
    } catch (error) {
      console.log('Error checking admin auth status:', error);
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading screen while checking auth status
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#4CAF50' }}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={{ color: '#ffffff', marginTop: 10, fontSize: 16 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => NativeModules.StartupModule?.markReactReady?.()}
    >
      <Stack.Navigator initialRouteName={isLoggedIn && hasShop ? "Home" : isLoggedIn ? "Login" : "Welcome"}>
        <Stack.Screen
          name="Welcome"
          component={WelcomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="RegisterShop"
          component={RegisterShop}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PasswordRecovery"
          component={PasswordRecovery}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Home" component={HomeScreen} 
          options={{ headerShown: false }} />
        <Stack.Screen 
          name="BookingManagement" 
          component={BookingManagement} 
          options={{ headerShown: false }}
          />
        <Stack.Screen 
          name="ServiceManagement" 
          component={ServiceManagement} 
          options={{ headerShown: false }}
          />
        <Stack.Screen 
          name="AddService" 
          component={AddServiceScreen} 
          options={{ headerShown: false }}
          />
        <Stack.Screen 
          name="ServiceDetails" 
          component={ServiceDetails} 
          options={{ headerShown: false }}
          />
        <Stack.Screen 
          name="Settings" 
          component={SettingsScreen} 
          options={{ headerShown: false }}
          />
        <Stack.Screen 
          name="EditProfile" 
          component={EditProfile} 
          options={{ headerShown: false }}
          />
        <Stack.Screen 
          name="ChangePassword" 
          component={ChangePassword} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="AccountSettings" 
          component={AccountSettings} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="ShopInfo" 
          component={ShopInfo} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="PickupDeliverySettings" 
          component={PickupDeliverySettings} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="VerificationDocuments" 
          component={VerificationDocuments} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Chat" 
          component={ChatScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Convo" 
          component={ConvoScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Notifs" 
          component={NotificationsScreen}
          options={{ headerShown: false }}
         />
        <Stack.Screen 
          name="BookingDetails" 
          component={BookingDetails}
          options={{ headerShown: false }}
         />
        <Stack.Screen 
          name="PendingServices" 
          component={PendingServicesScreen}
          options={{ headerShown: false }}
         />
        <Stack.Screen 
          name="ScheduledSummary" 
          component={ScheduledSummary}
          options={{ headerShown: false }}
         />
        <Stack.Screen 
          name="PickupDelivery" 
          component={PickupDeliveryManagement}
          options={{ headerShown: false }}
         />
        <Stack.Screen 
          name="Earnings" 
          component={EarningsScreen}
          options={{ headerShown: false }}
         />
        <Stack.Screen
          name="RescheduleRequests"
          component={RescheduleRequestsScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Navigator;
