// hooks/useShopData.ts
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

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
        const adminId = await AsyncStorage.getItem('admin_id');
        
        if (!adminId) {
          setError('No admin ID found');
          return;
        }

        console.log('Fetching shop data for admin:', adminId);
        const response = await axios.get(`http://10.0.2.2:5000/api/shop/admin/${adminId}`);
        
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
