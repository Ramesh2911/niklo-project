import { createApi } from './api';

const api = createApi(import.meta.env.VITE_USER_BASE_URL || '/api/v1');

export type AddressType = 'home' | 'work' | 'other';

export interface Address {
  id: string;
  type?: AddressType;
  label: string;
  full_address?: string;
  address_line?: string;
  city?: string;
  latitude?: number | null;
  longitude?: number | null;
  is_default?: boolean;
}

export interface CreateAddressInput {
  type: AddressType;
  label: string;
  full_address: string;
  latitude?: number | null;
  longitude?: number | null;
  is_default?: boolean;
}

type AddressResponse<T> = { data: T } | T;

const unwrap = <T>(response: AddressResponse<T>): T =>
  typeof response === 'object' && response !== null && 'data' in response
    ? response.data
    : response as T;

export const addressService = {
  list: async (): Promise<Address[]> => unwrap(await api.get<AddressResponse<Address[]>>('/user/locations', true)),
  create: async (input: CreateAddressInput): Promise<Address> =>
    unwrap(await api.post<AddressResponse<Address>>('/user/locations', input, true)),
  setDefault: (id: string) => api.post(`/user/locations/${id}/default`, {}, true),
  remove: (id: string) => api.delete(`/user/locations/${id}`, true),
};
