import { createApi } from './api';
import adventureIllustration from '../assets/adventure.svg';

const api = createApi(import.meta.env.VITE_ADVENTURE_BASE_URL || '/api/v1');

export interface Experience {
  id: string;
  name: string;
  location: string;
  price: number;
  img: string;
  description: string;
  durationHours: number;
  category?: string;
  rating?: number;
  reviewsCount?: number;
  galleryImages?: string[];
  highlights?: string[];
  difficulty?: string;
  groupSize?: string;
  whatsIncluded?: string[];
  whatToBring?: string[];
}

// Verified live: field is `imageUrl`, not `icon` — no page calls getCategories()
// today so this was never exercised, but fixed for whenever one does.
export interface AdventureCategory {
  id: string;
  title: string;
  imageUrl: string;
  count: number;
}

export interface AdventureAvailability {
  adventure_id: string;
  date: string;
  available: boolean;
  remaining_slots: number;
  price_per_person: number;
  total_price: number;
  time_slots: string[];
}

export interface AdventureReview {
  id: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  date: string;
  helpful_count?: number;
}

// Real response shape of adventures.service.ts#mapAdventureToDto.
interface ApiAdventure {
  id: string;
  title: string;
  description: string;
  location: string;
  price: string | number;
  duration_hours: number;
  category?: string;
  rating?: string | number;
  reviews_count?: number;
  image_url?: string | null;
  gallery_images?: string[] | null;
  highlights?: string[] | null;
  difficulty?: string;
  group_size?: string;
  whats_included?: string[] | null;
  what_to_bring?: string[] | null;
}

const mapAdventure = (a: ApiAdventure): Experience => ({
  id: a.id,
  name: a.title,
  location: a.location,
  price: Number(a.price),
  img: a.image_url || adventureIllustration,
  description: a.description,
  durationHours: a.duration_hours,
  category: a.category,
  rating: a.rating !== undefined ? Number(a.rating) : undefined,
  reviewsCount: a.reviews_count,
  galleryImages: a.gallery_images ?? undefined,
  highlights: a.highlights ?? undefined,
  difficulty: a.difficulty,
  groupSize: a.group_size,
  whatsIncluded: a.whats_included ?? undefined,
  whatToBring: a.what_to_bring ?? undefined,
});

export const experienceService = {
  getTrending: async (limit = 4): Promise<Experience[]> => {
    const res = await api.get<{ success?: boolean; data?: ApiAdventure[] } | ApiAdventure[]>('/adventures?is_trending=true');
    const list = Array.isArray(res) ? res : res?.data ?? [];
    return list.slice(0, limit).map(mapAdventure);
  },

  getById: async (id: string): Promise<Experience> => {
    const res = await api.get<{ success?: boolean; data?: ApiAdventure } | ApiAdventure>(`/adventures/${id}`);
    const item = Array.isArray(res)
      ? res[0]
      : (typeof res === 'object' && res !== null && 'data' in res && res.data)
        ? res.data
        : res as ApiAdventure;
    return mapAdventure(item);
  },

  getCategories: async (): Promise<AdventureCategory[]> => {
    const res = await api.get<{ success?: boolean; data?: AdventureCategory[] } | AdventureCategory[]>('/adventures/categories');
    const items = Array.isArray(res) ? res : res?.data ?? [];
    return items;
  },

  // Real server-side filters (adventures.service.ts#findAll) instead of
  // fetching everything and matching location text client-side.
  searchExperiences: async (query: { location?: string; category?: string; min_price?: number; max_price?: number; difficulty?: string; sort_by?: string }): Promise<Experience[]> => {
    const params = new URLSearchParams();
    // adventures.service.ts#findAll's `location` filter is ILIKE against the
    // full `location` column ("Bir Billing, Himachal Pradesh"); `city` is
    // ILIKE against the shorter `city` column ("Bir Billing") alone. Every
    // caller here (search bar text, popular-destination clicks) hands us the
    // full location string, which never matches as a substring of the
    // shorter city value — so `city` silently returned zero results.
    if (query.location) params.set('location', query.location);
    if (query.category) params.set('category', query.category);
    if (query.min_price !== undefined) params.set('min_price', String(query.min_price));
    if (query.max_price !== undefined) params.set('max_price', String(query.max_price));
    if (query.difficulty) params.set('difficulty', query.difficulty);
    if (query.sort_by) params.set('sort_by', query.sort_by);
    const qs = params.toString();
    const res = await api.get<{ success?: boolean; data?: ApiAdventure[] } | ApiAdventure[]>(`/adventures${qs ? `?${qs}` : ''}`);
    const list = Array.isArray(res) ? res : res?.data ?? [];
    return list.map(mapAdventure);
  },

  // Real price/availability for a date + participant count (replaces any
  // client-side estimate) — adventures.service.ts#checkAvailability.
  checkAvailability: (id: string, params: { date: string; participants: number }): Promise<AdventureAvailability> =>
    api.post<{ success?: boolean; data?: AdventureAvailability } | AdventureAvailability>(`/adventures/${id}/availability`, params)
      .then((res) => ('data' in res ? res.data : res) as AdventureAvailability),

  getReviews: async (id: string): Promise<AdventureReview[]> => {
    const res = await api.get<AdventureReview[] | { data?: AdventureReview[] }>(`/adventures/${id}/reviews`);
    return Array.isArray(res) ? res : (res?.data ?? []);
  },

  confirmSlots: async (id: string, dto: { date: string; time_slot: string; participants: number }): Promise<{ success: boolean; booking_id: string; message: string }> => {
    const res = await api.post<{ success: boolean; booking_id: string; message: string } | { data: { success: boolean; booking_id: string; message: string } }>(`/adventures/${id}/confirm-slots`, dto, true);
    return 'data' in res ? res.data : res;
  },
};
