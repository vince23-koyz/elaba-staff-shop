//// navigation/navigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import WelcomeScreen from '../screens/WelcomeScreen';
import RegisterScreen from '../screens/RegisterScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterShop from '../screens/RegisterShop';
import ServicesRegister from '../screens/ServicesRegister'; 
import HomeScreen from '../screens/HomeScreen';
import BookingManagement from '../screens/BookingManagement';
import ServiceManagement from '../screens/ServiceManages/ServiceManagement';
import SettingsScreen from '../screens/SettingScreen';
import ChatScreen from '../screens/ChatScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import AddServiceScreen from '../screens/ServiceManages/AddServiceScreen';
import ServiceDetails from '../screens/ServiceManages/ServiceDetails';

export type RootStackParamList = {
    Welcome: undefined;
    Register: undefined;
    RegisterShop: { admin_id: number };
    ServicesRegister: { shop_id: number; shopName: string };
    Login: undefined;
    Home: undefined;
    BookingManagement: undefined;
    ServiceManagement: undefined;
    AddService: { shopId: string | null };
    ServiceDetails: { serviceId: number; shopId: string | null };
    Settings: undefined;
    Chat: undefined;
    Notifs: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const Navigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Welcome">
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
          name="ServicesRegister"
          component={ServicesRegister}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
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
          name="Chat" 
          component={ChatScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Notifs" 
          component={NotificationsScreen}
          options={{ headerShown: false }}
         />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Navigator;
