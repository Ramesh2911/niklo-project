import { api, PLACEHOLDER_IMG } from './api';

export interface TravelPackage {
  id: string;
  title: string;
  duration: string;
  price: string;
  img: string;
  destination?: string;
  description?: string;
  category?: string;
  rating?: string;
  inclusions?: string[];
  galleryImages?: string[];
}

interface ApiPackage {
  id: string;
  name?: string;
  title?: string;
  duration?: string;
  nights?: number;
  days?: number;
  price?: number;
  pricePerPerson?: number;
  imagePath?: string;
  imageUrl?: string;
  destination?: string;
  description?: string;
  category?: string;
  rating?: number;
  inclusions?: string[];
  galleryImages?: string[];
  gallery_images?: string[];
}

export interface PackageAvailability {
  package_id: string;
  date: string;
  available: boolean;
  remaining_slots: number;
  price_per_person: number;
  total_price: number;
}

export interface PackageOffer {
  id: string;
  title: string;
  destination: string;
  originalPrice: number;
  discountedPrice: number;
  discountPercent: number;
  offerLabel: string;
  imageUrl: string;
}

const mapPackage = (p: ApiPackage): TravelPackage => ({
  id: p.id,
  title: p.name ?? p.title ?? 'Package',
  duration: p.duration ?? (p.nights && p.days ? `${p.nights} Nights • ${p.days} Days` : ''),
  price: `₹${(p.price ?? p.pricePerPerson ?? 0).toLocaleString('en-IN')}`,
  img: p.imagePath || p.imageUrl || PLACEHOLDER_IMG,
  destination: p.destination,
  description: p.description,
  category: p.category,
  rating: p.rating !== undefined ? String(p.rating) : undefined,
  inclusions: p.inclusions,
  galleryImages: p.galleryImages ?? p.gallery_images,
});

export const packageService = {
  // ponytail: package-service's controller registers `@Get(':id')` before any
  // dedicated route for these two paths (there isn't one at all, in fact —
  // `/packages/trending` and `/packages/categories` aren't separate handlers),
  // so both requests fall through to findOne('trending'/'categories') and 404.
  // Backend route-ordering bug, not fixable from the frontend; left as-is
  // since callers already swallow the failure via .catch().
  getTrending: async (limit = 3): Promise<TravelPackage[]> => {
    const res = await api.get<{ success?: boolean; data?: ApiPackage[] }>(`/packages/trending?limit=${limit}`);
    const items = Array.isArray(res) ? res : res?.data ?? [];
    if (!items.length) return [];
    return items.slice(0, limit).map(mapPackage);
  },

  // Verified live (2026-08-25): data is [{name, packageCount, imageUrl}], not
  // plain strings — rendering these objects directly as JSX children (as
  // PackagesHome.tsx's category chips did) throws "Objects are not valid as
  // a React child" and takes the whole categories section down.
  getCategories: async (): Promise<string[]> => {
    const res = await api.get<{ success?: boolean; data?: Array<string | { name: string }> }>('/packages/categories');
    const items = Array.isArray(res) ? res : res?.data ?? [];
    return items.map((c) => (typeof c === 'string' ? c : c.name));
  },

  listAll: async (filters?: { destination?: string; category?: string }): Promise<TravelPackage[]> => {
    const params = new URLSearchParams();
    if (filters?.destination) params.set('to', filters.destination);
    if (filters?.category) params.set('category', filters.category);
    const qs = params.toString();
    const res = await api.get<{ success?: boolean; data?: ApiPackage[] } | ApiPackage[]>(`/packages/search${qs ? `?${qs}` : ''}`);
    const list: ApiPackage[] = Array.isArray(res) ? res : (res as { data?: ApiPackage[] }).data ?? [];
    return list.map(mapPackage);
  },

  getPopularDestinations: async () => {
    const res = await api.get<{ data?: Array<{ name: string; packageCount: number; imageUrl: string }> } | Array<{ name: string; packageCount: number; imageUrl: string }>>('/packages/destinations/popular');
    return Array.isArray(res) ? res : res.data ?? [];
  },

  getOffers: async (): Promise<PackageOffer[]> => {
    const res = await api.get<{ data?: PackageOffer[] } | PackageOffer[]>('/packages/offers');
    return Array.isArray(res) ? res : res.data ?? [];
  },

  getMetaCities: async () => {
    const res = await api.get<{ data?: { startingCities: string[]; destinationCities: string[] } } | { startingCities: string[]; destinationCities: string[] }>('/packages/meta/cities');
    return 'data' in res ? res.data : res;
  },

  searchPackages: async (query: Record<string, string | number>): Promise<TravelPackage[]> => {
    const params = new URLSearchParams(Object.entries(query).map(([key, value]) => [key, String(value)]));
    const res = await api.get<{ data?: ApiPackage[] } | ApiPackage[]>(`/packages/search?${params}`);
    const list = Array.isArray(res) ? res : res.data ?? [];
    return list.map(mapPackage);
  },

  getById: async (id: string): Promise<TravelPackage> => {
    const res = await api.get<{ data?: ApiPackage } | ApiPackage>(`/packages/${id}`);
    return mapPackage(('data' in res ? res.data : res) as ApiPackage);
  },

  checkAvailability: async (id: string, date: string, travelers: number): Promise<PackageAvailability> => {
    const res = await api.post<{ data?: PackageAvailability } | PackageAvailability>(`/packages/${id}/availability`, { date, travelers });
    return ('data' in res ? res.data : res) as PackageAvailability;
  },

  getByDestination: async (destinationName: string): Promise<TravelPackage[]> => {
    const res = await api.get<{ data?: ApiPackage[] } | ApiPackage[]>(`/packages/destination/${encodeURIComponent(destinationName)}`);
    const list = Array.isArray(res) ? res : res.data ?? [];
    return list.map(mapPackage);
  },

  getByCategory: async (categoryName: string): Promise<TravelPackage[]> => {
    const res = await api.get<{ data?: ApiPackage[] } | ApiPackage[]>(`/packages/category/${encodeURIComponent(categoryName)}`);
    const list = Array.isArray(res) ? res : res.data ?? [];
    return list.map(mapPackage);
  },
};
