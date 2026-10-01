import { api, API_ENDPOINTS } from '../config/api';

export async function getShopTotalSales(shopId?: number | string): Promise<number> {
  if (!shopId && shopId !== 0) return 0;
  const { data } = await api.get(API_ENDPOINTS.PAYMENTS.SHOP_TOTAL(shopId));
  if (data && typeof data.total !== 'undefined') {
    const n = Number(data.total);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}
