import { createApi } from './api';

const api = createApi(import.meta.env.VITE_USER_BASE_URL || '/api/v1');

export interface UserProfile {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  dob?: string;
  gender?: string;
  avatar_url?: string;
  kyc_status?: string;
  wallet_balance?: number;
  preferred_language?: string;
}

export interface UpdateProfileInput {
  name?: string;
  email?: string;
  dob?: string;
  gender?: string;
  preferred_language?: string;
  avatar_url?: string;
}

export interface EmergencyContact {
  id: string;
  contact_name: string;
  phone_number: string;
  relationship: string;
  is_primary: boolean;
}

export interface ReferralStats {
  referral_code: string;
  total_referrals: number;
  total_earned: number;
  currency: string;
  share_url: string;
}

type Envelope<T> = { data: T } | T;

const unwrap = <T>(response: Envelope<T>): T =>
  typeof response === 'object' && response !== null && 'data' in response
    ? response.data
    : response as T;

export const userService = {
  getProfile: async (): Promise<UserProfile> =>
    unwrap(await api.get<Envelope<UserProfile>>('/user/profile', true)),

  updateProfile: async (input: UpdateProfileInput): Promise<UserProfile> =>
     unwrap(unwrap(await api.patch<Envelope<UserProfile | { data: UserProfile }>>('/user/profile', input, true))),

  uploadAvatar: async (file: File): Promise<string> => {
    const form = new FormData();
    form.append('file', file);
    const response = await api.postForm<Envelope<{ avatar_url: string }>>('/user/avatar', form, true);
    return unwrap(response).avatar_url;
  },

  getEmergencyContacts: async (): Promise<EmergencyContact[]> =>
    unwrap(await api.get<Envelope<EmergencyContact[]>>('/user/emergency-contacts', true)),

  addEmergencyContact: async (input: Omit<EmergencyContact, 'id'>): Promise<EmergencyContact> =>
    unwrap(await api.post<Envelope<EmergencyContact>>('/user/emergency-contacts', input, true)),

  deleteEmergencyContact: (id: string) => api.delete(`/user/emergency-contacts/${id}`, true),

  triggerSos: async (latitude: number, longitude: number) =>
    unwrap(await api.post<Envelope<{ message: string; alerts_sent?: number; notified_contacts?: number }>>(
      '/user/emergency-sos/trigger', { latitude, longitude }, true,
    )),

  getReferrals: async (): Promise<ReferralStats> =>
    unwrap(await api.get<Envelope<ReferralStats>>('/user/referrals', true)),

  applyReferral: (referralCode: string) =>
    api.post('/user/referrals/apply', { referral_code: referralCode }, true),

  getVersion: async (): Promise<{ version: string; build?: string; environment?: string }> =>
    unwrap(await api.get<Envelope<{ version: string; build?: string; environment?: string }>>('/user/version')),

  uploadKyc: async (file: File, documentType: string): Promise<{ status: string; message: string }> => {
    const form = new FormData();
    form.append('file', file);
    form.append('document_type', documentType);
    return unwrap(await api.postForm<Envelope<{ status: string; message: string }>>('/user/kyc', form, true));
  },

  updateLocation: async (id: string, input: { label?: string; full_address?: string; latitude?: number | null; longitude?: number | null }) =>
    unwrap(await api.put<Envelope<{ id: string; label: string; full_address?: string; latitude?: number | null; longitude?: number | null }>>(`/user/locations/${id}`, input, true)),

  syncWallet: async (id: string) =>
    unwrap(await api.post<Envelope<{ balance: number }>>(`/user/${id}/sync-wallet`, {}, true)),
};
