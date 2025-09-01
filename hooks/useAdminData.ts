// hooks/useAdminData.ts
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export function useAdminData() {
  const [adminName, setAdminName] = useState('');
  const [shopName, setShopName] = useState('');
  const [shopId, setShopId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const adminId = await AsyncStorage.getItem('admin_id');
        if (!adminId) return;

        // Fetch admin info
        const adminRes = await axios.get(`http://10.0.2.2:5000/api/admin/${adminId}`);
        if (adminRes.data?.first_name) setAdminName(adminRes.data.first_name);

        // Fetch shop info
        const shopRes = await axios.get(`http://10.0.2.2:5000/api/shop/admin/${adminId}`);
        if (shopRes.data?.shop?.name) setShopName(shopRes.data.shop.name);
        if (shopRes.data?.shop?.shop_id) setShopId(shopRes.data.shop.shop_id); 
      } catch (err) {
        console.log('Error fetching admin/shop:', err);
      }
    };

    fetchData();
  }, []);

  return { adminName, shopName, shopId }; // <-- return shopId
}
