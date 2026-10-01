// eLaba_staff/hooks/useShopServices.ts
import { useState, useEffect, useCallback } from 'react';
import { api } from '../config/api';

export const useShopServices = (shopId: string | null) => {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    if (!shopId) {
      console.log("❌ No shopId provided");
      setError("No shop selected");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("📡 Fetching services for shop:", shopId);
    const res = await api.get(`/service/shop/${shopId}`);
      console.log("✅ Response:", res.data);

      if (Array.isArray(res.data)) {
        setServices(res.data);
      } else if (res.data.services) {
        setServices(res.data.services);
      } else if (res.data.message) {
        // backend returned "service not found"
        setError(res.data.message);
        setServices([]);
      } else {
        setError("Unexpected response format");
        setServices([]);
      }
    } catch (err: any) {
      console.log("❌ Error fetching services:", err.message || err);
      setError("Failed to fetch services");
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  return { services, loading, error, refetch: fetchServices };
};
