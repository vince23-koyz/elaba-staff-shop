import { api, API_ENDPOINTS } from '../config/api';

export type ApiResponse<T = any> = {
  success?: boolean;
  message?: string;
  data?: T;
  [key: string]: any;
};

export async function requestOtp(phone_number: string): Promise<ApiResponse> {
  const { data } = await api.post(API_ENDPOINTS.AUTH.OTP_SEND, { phone_number });
  return data;
}

export async function verifyOtp(phone_number: string, otp_code: string): Promise<ApiResponse> {
  const { data } = await api.post(API_ENDPOINTS.AUTH.OTP_VERIFY, { phone_number, otp_code });
  return data;
}

export interface RegisterAdminPayload {
  first_name: string;
  last_name: string;
  street?: string;
  zone?: string;
  barangay?: string;
  city?: string;
  phone_number: string;
  password: string;
}

export async function registerAdmin(payload: RegisterAdminPayload): Promise<ApiResponse> {
  const { data } = await api.post(API_ENDPOINTS.ADMIN.REGISTER, payload);
  return data;
}

export const AuthService = {
  requestOtp,
  verifyOtp,
  registerAdmin,
};
