import { api } from './client';
import type { AuthResponse, LoginRequest, RegisterRequest } from '../types';

export const authApi = {
  login: (data: LoginRequest) => api.post<AuthResponse>('/auth/login', data),
  verifyMfa: (challengeToken: string, code: string) => api.post<AuthResponse>('/auth/mfa/verify', { challengeToken, code }),
  register: (data: RegisterRequest) => api.post<AuthResponse>('/auth/register', data),
  refresh: (refreshToken: string) => api.post<AuthResponse>('/auth/refresh', { refreshToken }),
  acceptInvitation: (data: { email: string; password: string; firstName: string; lastName?: string; phone?: string }) =>
    api.post<AuthResponse>('/auth/accept-invitation', data),
  verifyEmail: (token: string) => api.post<void>('/auth/verify-email', { token }),
  forgotPassword: (email: string) => api.post<void>('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) => api.post<void>('/auth/reset-password', { token, newPassword }),
};

export const mfaApi = {
  setup: () => api.post<{ secret: string; otpAuthUri: string }>('/mfa/setup', {}),
  enable: (code: string) => api.post<void>('/mfa/enable', { code }),
  disable: () => api.post<void>('/mfa/disable', {}),
};
