import { api, API_ENDPOINTS } from '../config/api';

export async function updateDeviceToken(params: {
  accountId: number | string;
  accountType: 'customer' | 'admin';
  token: string;
  shopId?: number | string | null;
}) {
  const { accountId, accountType, token, shopId } = params;
  await api.post(API_ENDPOINTS.NOTIFICATIONS.UPDATE_DEVICE_TOKEN, {
    accountId,
    accountType,
    token,
    shopId: shopId ?? null,
  });
}

export async function deactivateDeviceToken(token: string) {
  await api.post(API_ENDPOINTS.NOTIFICATIONS.DEACTIVATE_DEVICE_TOKEN, {
    token,
  });
}

export async function deleteDeviceToken(token: string) {
  await api.post(API_ENDPOINTS.NOTIFICATIONS.DELETE_DEVICE_TOKEN, {
    token,
  });
}
