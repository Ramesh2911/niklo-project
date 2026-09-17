import { api } from './api';

export interface AuthUser {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  dob?: string;
  gender?: string;
  /** Client-only: the backend has no avatar field, so this is persisted to
   * localStorage rather than sent to the server. */
  avatar_url?: string;
}

interface TokenResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
  };
}

export type SocialProvider = 'google' | 'apple' | 'facebook';
export type AuthRole = 'Passenger' | 'Car Driver' | 'Bus Operator' | 'Hotel Partner' | 'Admin';
export const DEFAULT_AUTH_ROLE: AuthRole = 'Passenger';

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

const persistSession = (session: AuthSession) => {
  localStorage.setItem('accessToken', session.accessToken);
  localStorage.setItem('refreshToken', session.refreshToken);
  localStorage.setItem('user', JSON.stringify(session.user));
  return session.user;
};

export const authService = {
  sendOtp: (phone: string) =>
    api.post<{ success: boolean; message: string }>('/auth/otp/send', { phone }),

  verifyOtp: async (phone: string, otp: string, role: AuthRole = DEFAULT_AUTH_ROLE): Promise<AuthUser> => {
    const res = await api.post<TokenResponse>('/auth/otp/verify', { phone, otp, role });
    return persistSession(res.data);
  },

  socialLogin: async (provider: SocialProvider, idToken: string, role: AuthRole = DEFAULT_AUTH_ROLE): Promise<AuthUser> => {
    const res = await api.post<TokenResponse>('/auth/social', { provider, idToken, role });
    return persistSession(res.data);
  },

  logout: async () => {
    try {
      await api.post('/auth/logout', {}, true);
    } catch {
      // swallow — we clear local state regardless
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },

  getStoredUser: (): AuthUser | null => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  isLoggedIn: () => !!localStorage.getItem('accessToken'),
};

// user-service WishlistController is @Controller('api/v1/wishlist') — every
// response is wrapped as { success, statusCode, data }, and GET ignores any
// query string (no @Query on the handler), so filtering by type happens here.
export type WishlistItemType = 'hotel' | 'bus' | 'package' | 'experience';

export interface WishlistItem {
  id: string;
  item_type: WishlistItemType;
  item_id: string;
  raw_data: Record<string, unknown> | null;
  created_at: string;
}

type Envelope<T> = { data: T } | T;

const unwrap = <T>(response: Envelope<T>): T =>
  typeof response === 'object' && response !== null && 'data' in response
    ? response.data
    : response as T;

export interface WishlistToggleResult {
  action: 'added' | 'removed';
  item_id: string;
  item?: WishlistItem;
}

export const wishlistService = {
  list: async (itemType?: WishlistItemType): Promise<WishlistItem[]> => {
    const items = unwrap(await api.get<Envelope<WishlistItem[]>>(`/wishlist${itemType ? `?type=${itemType}` : ''}`, true));
    return itemType ? items.filter((i) => i.item_type === itemType) : items;
  },
  toggle: async (itemType: WishlistItemType, itemId: string, rawData?: Record<string, unknown>): Promise<WishlistToggleResult> =>
    unwrap(await api.post<Envelope<WishlistToggleResult>>(
      '/wishlist/toggle',
      { item_type: itemType, item_id: itemId, raw_data: rawData },
      true,
    )),
};
