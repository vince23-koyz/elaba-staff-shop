// implemented to avoid hard-coding URLs (mirrors customer app pattern)
import axios from 'axios';

const DEFAULT_BASE_ORIGIN = 'https://api.elaba.tech';

let BASE_ORIGIN = DEFAULT_BASE_ORIGIN;

export const API_CONFIG = {
  get BASE_ORIGIN() {
    return BASE_ORIGIN;
  },
  get BASE_URL() {
    return `${BASE_ORIGIN}/api`;
  },
  TIMEOUT: 15000,
};

// Shared Axios instance used across the staff app
export const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
});

export function setBaseOrigin(origin) {
  if (typeof origin !== 'string' || !origin) return;
  BASE_ORIGIN = origin.replace(/\/$/, '');
  api.defaults.baseURL = `${BASE_ORIGIN}/api`;
}

export const API_ENDPOINTS = {
  ADMIN: {
    BASE: '/admin',
    BY_ID: (id) => `/admin/${id}`,
    REGISTER: '/admin/register',
    FORGOT_PASSWORD: '/admin/forgot-password',
    CHECK_PHONE: '/admin/check-phone',
    VERIFY_OTP: '/admin/verify-otp',
    RESET_PASSWORD: '/admin/reset-password',
  },
  SHOP: {
    BY_ADMIN: (adminId) => `/shop/admin/${adminId}`,
    DOCUMENTS: (shopId) => `/shop/${shopId}/documents`,
  },
  CUSTOMERS: {
    BASE: '/customers',
    BY_ID: (id) => `/customers/${id}`,
  },
  BOOKINGS: {
    BASE: '/bookings',
    BY_ID: (id) => `/bookings/${id}`,
    STATUS: (id) => `/bookings/${id}/status`,
    RESCHEDULES: '/bookings/reschedules',
    APPROVE_RESCHEDULE: (id) => `/bookings/reschedules/${id}/approve`,
    REJECT_RESCHEDULE: (id) => `/bookings/reschedules/${id}/reject`,
  },
  NOTIFICATIONS: {
    LIST: '/notifications',
    READ: (id) => `/notifications/${id}/read`,
    READ_ALL: '/notifications/read-all',
    SEND_CUSTOMER: '/notifications/send-customer',
    UPDATE_DEVICE_TOKEN: '/notifications/update-device-token',
    DEACTIVATE_DEVICE_TOKEN: '/notifications/deactivate-device-token',
    DELETE_DEVICE_TOKEN: '/notifications/delete-device-token',
  },
  DELIVERY: {
    BASE: '/delivery',
    BY_ID: (id) => `/delivery/${id}`,
    STATUS: (id) => `/delivery/${id}/status`,
  },
  PAYMENTS: {
    BASE: '/payments',
    BY_ID: (id) => `/payments/${id}`,
    STATUS: (id) => `/payments/${id}/status`,
    TRANSACTION: (id) => `/payments/${id}/transaction`,
    SHOP_TOTAL: (shopId) => `/payments/shop/${shopId}/total`,
  },
  MESSAGES: {
    BASE: '/messages',
    CONVERSATION: (customerId, adminId, shopId) => `/messages/conversation/${customerId}/${adminId}/${shopId}`,
    SHOP_ALL: (shopId) => `/messages/shop/${shopId}`,
    MARK_READ: '/messages/mark-read',
  },
  SERVICE: {
    BASE: '/service',
  },
  AUTH: {
    OTP_SEND: '/otp/send',
    OTP_VERIFY: '/otp/verify',
  },
};

export const SOCKET_URL = API_CONFIG.BASE_ORIGIN;

export function buildImageUrl(pathOrUrl) {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') return null;
  const val = pathOrUrl.trim();
  if (!val) return null;
  if (val.startsWith('http')) return val;
  return `${API_CONFIG.BASE_ORIGIN}${val.startsWith('/') ? '' : '/'}${val}`;
}

export default API_CONFIG;