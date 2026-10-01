// hooks/useServiceActions.ts
import { useState } from "react";
import { api, API_ENDPOINTS } from "../config/api";
import { ToastAndroid } from "react-native";

export function useServiceActions() {
  const [loading, setLoading] = useState(false);

  const updateService = async (serviceId: number, payload: any) => {
    setLoading(true);
    try {
    await api.put(`${API_ENDPOINTS.SERVICE.BASE}/${serviceId}`, payload);
      ToastAndroid.show("Service updated", ToastAndroid.SHORT);
      return true;
    } catch (error) {
      console.error(error);
      ToastAndroid.show("Failed to update service", ToastAndroid.SHORT);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteService = async (serviceId: number) => {
    setLoading(true);
    try {
    await api.delete(`${API_ENDPOINTS.SERVICE.BASE}/${serviceId}`);
      ToastAndroid.show("Service deleted", ToastAndroid.SHORT);
      return true;
    } catch (error) {
      console.error(error);
      ToastAndroid.show("Failed to delete service", ToastAndroid.SHORT);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { updateService, deleteService, loading };
}
