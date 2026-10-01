// hooks/useAdminData.ts
import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, API_ENDPOINTS, API_CONFIG } from '../config/api';

export function useAdminData() {
  const [adminName, setAdminName] = useState('');
  const [shopName, setShopName] = useState('');
  const [shopId, setShopId] = useState<string | null>(null);
  const [shopLogo, setShopLogo] = useState<string | null>(null);
  const [shopStatus, setShopStatus] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(0);

  const refreshData = useCallback(() => {
    const now = Date.now();
    // Throttle refreshes to once per second
    if (now - lastRefresh > 1000) {
      setRefreshTrigger(prev => prev + 1);
      setLastRefresh(now);
    }
  }, [lastRefresh]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get the complete userData object stored by LoginScreen
        const userDataStr = await AsyncStorage.getItem('userData');
        if (!userDataStr) return;

        const userData = JSON.parse(userDataStr);
        const adminId = userData.admin_id || userData.adminId;
        
        if (!adminId) return;

        // Use the shop data already stored in userData if available
        if (userData.shop_name) {
          setShopName(userData.shop_name);
        }
        if (userData.shop_id || userData.shopId) {
          setShopId(String(userData.shop_id || userData.shopId));
        }

    // Fetch admin info to get the admin name
    const adminRes = await api.get(API_ENDPOINTS.ADMIN.BY_ID(adminId));
        if (adminRes.data?.first_name) setAdminName(adminRes.data.first_name);

        // If shop data wasn't stored, fetch it
        if (!userData.shop_name || !userData.shop_id) {
          const shopRes = await api.get(API_ENDPOINTS.SHOP.BY_ADMIN(adminId));
          if (shopRes.data?.shop?.name && !userData.shop_name) {
            setShopName(shopRes.data.shop.name);
          }
          if (shopRes.data?.shop?.shop_id && !userData.shop_id) {
            setShopId(String(shopRes.data.shop.shop_id));
          }
          // Set shop logo if available
          if (shopRes.data?.shop?.logo) {
            setShopLogo(shopRes.data.shop.logo);
          }
          if (shopRes.data?.shop?.status) {
            setShopStatus(shopRes.data.shop.status);
          }
        } else {
          // Even if userData has shop info, fetch the logo separately
          const shopRes = await api.get(API_ENDPOINTS.SHOP.BY_ADMIN(adminId));
          if (shopRes.data?.shop?.logo) {
            setShopLogo(shopRes.data.shop.logo);
          }
          if (shopRes.data?.shop?.status) {
            setShopStatus(shopRes.data.shop.status);
          }
        }
      } catch (err) {
        console.log('Error fetching admin/shop:', err);
      }
    };

    fetchData();
  }, [refreshTrigger]);

  return { adminName, shopName, shopId, shopLogo, shopStatus, refreshData }; // <-- return refreshData function
}
