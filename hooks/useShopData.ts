// hooks/useShopData.ts
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, API_ENDPOINTS } from '../config/api';

interface ShopData {
  shop_id: number;
  name: string;
  address: string;
  website: string;
  owner_name: string;
  operation_hours: string;
  admin_id: number;
}

export function useShopData() {
  const [shopData, setShopData] = useState<ShopData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchShopData = async () => {
      try {
        setIsLoading(true);
        
        // Get the complete userData object stored by LoginScreen
        const userDataStr = await AsyncStorage.getItem('userData');
        if (!userDataStr) {
          setError('No user data found');
          return;
        }

        const userData = JSON.parse(userDataStr);
        const adminId = userData.admin_id || userData.adminId;
        
        if (!adminId) {
          setError('No admin ID found');
          return;
        }

    console.log('Fetching shop data for admin:', adminId);
    const response = await api.get(API_ENDPOINTS.SHOP.BY_ADMIN(adminId));
        
        if (response.data?.shop) {
          setShopData(response.data.shop);
          console.log('Shop data fetched:', response.data.shop);
        } else {
          setError('No shop found for this admin');
        }
      } catch (err: any) {
        console.error('Error fetching shop data:', err);
        setError(err.message || 'Failed to fetch shop data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchShopData();
  }, []);

  return { 
    shopData, 
    isLoading, 
    error,
    shopName: shopData?.name || '',
    ownerName: shopData?.owner_name || ''
  };
}
