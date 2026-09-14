import { apiClient, rawApiClient } from './client';
import { tokenStore, AuthUser } from '../auth/tokenStore';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface UserProfile {
  id: number;
  email: string;
  discordRoom: string | null;
  discordAlarm: boolean;
  timezone: string;
}

export interface UpdateProfileInput {
  discordRoom?: string | null;
  discordAlarm?: boolean;
  timezone?: string;
}

export const authApi = {
  register: (email: string, password: string) =>
    rawApiClient.post('/auth/register', { email, password }).then((res) => res.data),

  login: async (email: string, password: string) => {
    const { data } = await rawApiClient.post<AuthResponse>('/auth/login', {
      email,
      password,
      clientType: 'app',
    });
    await tokenStore.setTokens(data.accessToken, data.refreshToken, data.user);
    return data.user;
  },

  logout: async () => {
    const refreshToken = tokenStore.getRefreshToken();
    await tokenStore.clear();
    if (refreshToken) {
      await rawApiClient.post('/auth/logout', { refreshToken }).catch(() => {});
    }
  },

  getMe: () => apiClient.get<UserProfile>('/auth/me').then((res) => res.data),

  updateMe: (input: UpdateProfileInput) =>
    apiClient.patch<UserProfile>('/auth/me', input).then((res) => res.data),
};
