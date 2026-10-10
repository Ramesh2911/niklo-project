import { createApi, PLACEHOLDER_IMG } from './api';

const api = createApi(import.meta.env.VITE_HOTEL_BASE_URL || '/api/v1');

export interface Hotel {
  id: string;
  name: string;
  subtext: string;
  location?: string;
  price: number;
  img: string;
  rating: number;
}

export interface HotelListing {
  id: string;
  name: string;
  rating: number;
  reviews: number;
  ratingText: string;
  distance: string;
  price: number;
  taxes: number;
  img: string;
  amenities: string[];
  freeCancel: boolean;
  stars: number;
}

export interface PopularDestination {
  id: string;
  name: string;
  label: string;
  img: string;
}

export interface StayType {
  id: string;
  label: string;
  img: string;
}

export interface HotelPromotion {
  id: string;
  title: string;
  description: string;
  cta: string;
  imagePath: string;
  // Verified live (2026-09-29): the backend's promo payload omits
  // discountPercent/hotelId/hotelName entirely — callers must guard these.
  discountPercent?: number;
  expiresAt: string | null;
  hotelId?: string;
  hotelName?: string;
}

export interface LocationSuggestion {
  name: string;
  region?: string;
}

// Real backend response shape (location.service.ts) - not {name, region}.
interface RawLocationSuggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
}

interface LocationAutocompleteResponse {
  data?: RawLocationSuggestion[];
  suggestions?: RawLocationSuggestion[];
}

// `userId` and `totalAmount` are deliberately absent: the backend takes the guest
// from the JWT and recomputes the price server-side from the room's own rate
// (see hotel-service CreateHotelBookingDto) - anything sent here is ignored.
export interface HotelBookingGuest {
  name: string;
  age: number;
  gender?: string;
  idType?: string;
}

export interface HotelBookingRequest {
  hotelId: string;
  roomTypeId: string;
  pricePerNight: number;
  checkInDate: string;
  checkOutDate: string;
  rooms: number;
  adults: number;
  children?: number;
  childAges?: number[];
  isHourly?: boolean;
  hourlyCheckInTime?: string;
  hourlyDurationHours?: number;
  guests?: HotelBookingGuest[];
  contactEmail?: string;
  /** Required by the backend (`@Length(8, 15)`); not derived from the JWT. */
  contactPhone: string;
  paymentMethod?: 'online' | 'cash';
}

export interface HotelPriceBreakdown {
  perUnitPrice: number;
  nights: number;
  rooms: number;
  guests: number;
  roomStayCost: number;
  extraGuestCharges: number;
  taxes: number;
  discount: number;
  total: number;
  currency: string;
}

export interface HotelBookingResponse {
  bookingId: string;
  status: string;
  amount: number;
  currency: string;
  priceBreakdown: HotelPriceBreakdown;
  paymentMethod: string;
  paymentGatewayOrderId: string | null;
}

export interface HotelBookingQuoteRequest {
  hotelId: string;
  roomTypeId: string;
  pricePerNight: number;
  checkInDate: string;
  checkOutDate: string;
  rooms: number;
  adults: number;
  children?: number;
  isHourly?: boolean;
  hourlyDurationHours?: number;
}

export interface HotelAvailabilityCheckRequest {
  room_type_id?: string;
  check_in?: string;
  check_out?: string;
  rooms_count?: number;
  guests_count?: number;
}

// Normalized by checkAvailability() below — the real endpoint returns
// {hotelId, availableRooms: RoomType[]} (no `available`/`price_per_night`/
// `nights_count` fields at all), reshaped here so HotelAvailability.tsx's
// contract doesn't have to change.
export interface HotelAvailabilityCheck {
  hotel_id: string;
  room_type_id: string;
  room_title: string;
  available: boolean;
  remaining_rooms: number;
  nights_count: number;
  price_per_night: number;
  total_room_price: number;
  taxes_and_fees: number;
  grand_total: number;
}

export interface HotelBookingQuote {
  hotelId: string;
  roomTypeId: string;
  roomTitle: string;
  available: boolean;
  roomsLeft: number;
  priceBreakdown: HotelPriceBreakdown;
  amount: number;
  currency: string;
}

// Verified live (2026-08-25): hotels.service.ts#getHotelDetails now returns
// display-ready camelCase room cards, not the old snake_case shape this
// interface used to describe — `price_per_night`/`max_guests`/`room_size_sqft`/
// `bed_type`/`available_rooms_count` don't exist on the real response at all,
// so every read of them silently fell back to `?? 0`/undefined.
export interface RoomType {
  id: string;
  title: string;
  guestCount: string;
  size: string;
  imageCount: number;
  images: string[];
  mealPlan: string | null;
  mealPlanDesc: string | null;
  price: number;
  oldPrice: number | null;
  taxes: string | null;
  amenities: string[];
  cancellationPolicy: string | null;
  inclusions: string[];
}

export interface HotelReview {
  id: string;
  title: string;
  reviewerName: string;
  date: string;
  rating: number;
  comment: string;
  hasPropertyReply: boolean;
  propertyReply?: string | null;
}

export interface HotelRatingBreakdown {
  overall: number;
  label: string;
  totalRatings: number;
  breakdown: {
    excellent: number;
    veryGood: number;
    average: number;
    poor: number;
    bad: number;
  };
}

export interface HotelDetail {
  id: string;
  hotelName: string;
  badgeText?: string;
  imagePath?: string;
  galleryImages: string[];
  distanceText?: string;
  ratingValue: number;
  ratingText: string;
  reviewsCount: number;
  freeBreakfast: boolean;
  freeWifi: boolean;
  freeCancellation: boolean;
  priceText?: string;
  priceInt: number;
  description: string;
  address: string;
  // Verified live: plain strings ("Spa", "Pool", ...), not {name, icon} objects.
  popularAmenities: string[];
  roomTypes: RoomType[];
  topReviews: HotelReview[];
  ratingBreakdown: HotelRatingBreakdown;
  guestPhotoCount: number;
  latitude?: number | null;
  longitude?: number | null;
}

export interface HotelSearchFilters {
  priceFilter?: string;
  ratingFilter?: string;
  amenityFilter?: string;
  selectedCategory?: string;
}

export interface HotelBookingItem {
  bookingId: string;
  hotelName: string;
  roomType: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  totalAmount: number;
  currency: string;
  guests: number;
  rooms: number;
}

export interface HotelBookingDetail {
  bookingId: string;
  hotelId: string;
  hotelName: string;
  roomTypeId: string;
  roomType: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  totalAmount: number;
  currency: string;
  guests: number;
  rooms: number;
  contactEmail?: string;
  contactPhone?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  cancellationPolicy?: string;
}

export interface HotelSearchParams {
  location?: string;
  /** Alias for `location` - the destination search field sends this key. */
  destination?: string;
  checkInDate?: string;
  checkOutDate?: string;
  rooms?: number;
  adults?: number;
  children?: number;
  isHourly?: boolean;
  filters?: HotelSearchFilters;
  page?: number;
  limit?: number;
}

// hotel-service uses non-standard field names: hotelName, imagePath, ratingValue, priceInt
interface RawHotel {
  id: string;
  hotelName: string;
  badgeText?: string;
  imagePath?: string;
  ratingValue?: number;
  priceInt?: number;
  distanceText?: string;
  reviewsCount?: number;
  ratingText?: string;
  freeCancellation?: boolean;
  freeBreakfast?: boolean;
  freeWifi?: boolean;
  // Normalized server-side to `{ name, icon }[]` (hotel-response.util.ts); legacy
  // rows can still surface as plain strings, so both shapes are accepted here.
  popularAmenities?: Array<string | { name?: string }>;
}

interface HotelSearchResponse {
  hotels?: RawHotel[];
  totalResults?: number;
  page?: number;
  limit?: number;
}

interface RawDestination {
  id: string;
  name: string;
  label: string;
  imagePath?: string;
}

interface PopularDestinationsResponse {
  data?: RawDestination[];
  destinations?: RawDestination[];
}

interface RawStayType {
  id: string;
  label?: string;
  imagePath?: string;
  name?: string;
  icon?: string;
}

interface StayTypesResponse {
  data?: Array<RawStayType & { name?: string; icon?: string }>;
  stayTypes?: RawStayType[];
}

// hotel-service spreads the raw partner-authored offer object and adds hotelId/hotelName;
// isActive/createdAt exist server-side but aren't needed for the banner.
interface RawPromotion {
  id: string;
  title: string;
  description?: string;
  cta?: string;
  imagePath?: string;
  discountPercent?: number;
  expiresAt?: string | null;
  hotelId: string;
  hotelName: string;
}

interface ActivePromotionsResponse {
  offer: RawPromotion | null;
  offers?: RawPromotion[];
}

// hotel-service's badgeText is a free-text string like "5 Star Luxury" - it's the only
// place a star classification lives on the entity. Fall back to the rounded review
// score when badgeText doesn't parse (e.g. missing or non-standard text).
const parseStars = (badgeText: string | undefined, ratingValue: number | undefined): number => {
  const match = badgeText?.match(/(\d)\s*Star/i);
  return match ? parseInt(match[1], 10) : Math.round(ratingValue || 0);
};

const mapRawHotel = (h: RawHotel): Hotel => ({
  id: h.id,
  name: h.hotelName,
  subtext: h.badgeText || 'Premium Stay',
  location: h.distanceText,
  price: h.priceInt || 0,
  img: h.imagePath || '',
  rating: h.ratingValue || 0,
});

export const hotelService = {
  getTrending: async (limit = 4): Promise<Hotel[]> => {
    const res = await api.get<RawHotel[]>(`/hotels/trending?limit=${limit}`);
    if (!Array.isArray(res) || res.length === 0) return [];
    return res.slice(0, limit).map(mapRawHotel);
  },

  searchHotels: async (query: HotelSearchParams): Promise<HotelListing[]> => {
    // hotels.service.ts#searchHotels only reads {city, limit, page}. The
    // destination field used to be forwarded as `city`, but verified live
    // (2026-09-29) the backend does an exact match and every seeded hotel has
    // city "City", so any real destination ("Kolkata, West Bengal") returned
    // total: 0. HotelsList's own filtering is client-side and never filters by
    // city, so the key is dropped here and the backend returns the full list.
    const body = { ...query };
    delete body.destination;
    delete body.location;
    // Verified live (2026-09-29): POST /hotels/search wraps its payload as
    // {success, statusCode, data: {total, page, limit, hotels}}; older builds
    // returned {totalResults, page, limit, hotels} unwrapped. Treating res.data
    // as the array itself threw `list.map is not a function` and every search
    // silently came back empty via the caller's catch.
    const res = await api.post<HotelSearchResponse | { data?: HotelSearchResponse | RawHotel[] }>(
      '/hotels/search',
      body,
    );
    const wrapped = 'data' in res ? res.data : undefined;
    const payload = (wrapped ?? res) as HotelSearchResponse | RawHotel[];
    const list = (Array.isArray(payload) ? payload : payload.hotels) ?? [];
    if (list.length === 0) return [];
    return list.map((h) => {
      const amenities = (h.popularAmenities ?? []).map((a) =>
        typeof a === 'string' ? a : (a?.name ?? ''),
      ).filter(Boolean);
      if (h.freeBreakfast && !amenities.includes('Free Breakfast')) amenities.push('Free Breakfast');
      if (h.freeWifi && !amenities.includes('Free WiFi')) amenities.push('Free WiFi');
      return {
        id: h.id,
        name: h.hotelName,
        rating: h.ratingValue ?? 0,
        reviews: h.reviewsCount ?? 0,
        ratingText: h.ratingText ?? '',
        distance: h.distanceText ?? '',
        price: h.priceInt ?? 0,
        taxes: 0,
        img: h.imagePath || PLACEHOLDER_IMG,
        amenities,
        freeCancel: h.freeCancellation ?? false,
        stars: parseStars(h.badgeText, h.ratingValue),
      };
    });
  },

  // type=hotel is the only mode the backend supports right now - real hotel properties
  // matched first, then well-known Indian city names as fallback (max 8 results).
  // ponytail: location.service.ts#autocomplete is a stub - it ignores `q` and always
  // returns the same 2 hardcoded results regardless of query text. Not fixable from
  // the frontend; this just makes sure what it does return actually renders.
  getLocationSuggestions: async (query: string): Promise<LocationSuggestion[]> => {
    const res = await api.get<LocationAutocompleteResponse>(
      `/location/autocomplete?q=${encodeURIComponent(query)}&type=hotel`,
    );
    const suggestions = res.data ?? res.suggestions ?? [];
    return suggestions.map((s) => ({ name: s.mainText, region: s.secondaryText }));
  },

  getPopularDestinations: async (): Promise<PopularDestination[]> => {
    const res = await api.get<PopularDestinationsResponse>('/hotels/popular-destinations');
    const list = res.data ?? res.destinations ?? [];
    return list.map((d) => ({
      id: d.id,
      name: d.name,
      label: d.label,
      img: d.imagePath || PLACEHOLDER_IMG,
    }));
  },

  getStayTypes: async (): Promise<StayType[]> => {
    const res = await api.get<StayTypesResponse>('/hotels/stay-types');
    const list = res.data ?? res.stayTypes ?? [];
    return list.map((s) => ({ id: s.id, label: s.label || s.name || '', img: s.imagePath || s.icon || PLACEHOLDER_IMG }));
  },

  // Only the single top offer is used today (banner, not a carousel); `offers` is
  // available on the raw response if a future carousel needs the rest.
  getActivePromotion: async (): Promise<HotelPromotion | null> => {
    const res = await api.get<ActivePromotionsResponse>('/hotels/promotions/active');
    const offer = res.offer;
    if (!offer) return null;
    return {
      id: offer.id,
      title: offer.title,
      description: offer.description ?? '',
      cta: offer.cta ?? 'Grab Deal',
      imagePath: offer.imagePath || PLACEHOLDER_IMG,
      discountPercent: offer.discountPercent ?? 0,
      expiresAt: offer.expiresAt ?? null,
      hotelId: offer.hotelId,
      hotelName: offer.hotelName,
    };
  },

  // Verified live: GET /hotels/:hotelId returns the hotel object directly, no
  // {success, statusCode, data} wrapper.
  getHotelDetails: async (hotelId: string): Promise<HotelDetail> => {
    const res = await api.get<HotelDetail | { data: HotelDetail }>(`/hotels/${hotelId}`);
    return 'data' in res ? res.data : res;
  },

  // Prices a stay without reserving anything, so checkout can show the real
  // taxes/discount/total breakdown before the guest commits.
  // backend: hotel-service's BookingsService#quoteBooking reads dto.pricePerNight/
  // rooms/checkInDate/checkOutDate/isHourly/hourlyDurationHours (camelCase) and
  // returns {nights_count, rooms, price_per_night, base_price, taxes_and_fees,
  // grand_total, currency} — no hotelId/roomTypeId/guests fields exist on either
  // side of this route, it's a pure price calculator.
  quoteBooking: async (payload: HotelBookingQuoteRequest): Promise<HotelBookingQuote> => {
    const raw = await api.post<{
      nights_count: number; rooms: number; price_per_night: number;
      base_price: number; taxes_and_fees: number; grand_total: number; currency: string;
    }>('/bookings/hotel/quote', {
      pricePerNight: payload.pricePerNight,
      rooms: payload.rooms,
      checkInDate: payload.checkInDate,
      checkOutDate: payload.checkOutDate,
      isHourly: payload.isHourly ?? false,
      hourlyDurationHours: payload.hourlyDurationHours,
    }, true);
    return {
      hotelId: payload.hotelId,
      roomTypeId: payload.roomTypeId,
      roomTitle: '',
      available: true,
      roomsLeft: 0,
      amount: raw.grand_total,
      currency: raw.currency,
      priceBreakdown: {
        perUnitPrice: raw.price_per_night,
        nights: raw.nights_count,
        rooms: raw.rooms,
        guests: payload.adults + (payload.children ?? 0),
        roomStayCost: raw.base_price,
        extraGuestCharges: 0,
        taxes: raw.taxes_and_fees,
        discount: 0,
        total: raw.grand_total,
        currency: raw.currency,
      },
    };
  },

  // backend: hotel-service's BookingsService#createBooking reads the same
  // camelCase dto shape as quoteBooking above, plus hotelId/roomTypeId/adults/
  // children/childAges/guests/contactEmail/contactPhone/paymentMethod — those
  // are inserted straight into NOT NULL columns, so snake_case keys here
  // silently become undefined and the insert 500s.
  createBooking: async (payload: HotelBookingRequest): Promise<HotelBookingResponse> => {
    const raw = await api.post<{ bookingId: string; status: string; amount: number; currency: string; paymentGatewayOrderId: string }>('/bookings/hotel', {
      hotelId: payload.hotelId,
      roomTypeId: payload.roomTypeId,
      pricePerNight: payload.pricePerNight,
      checkInDate: payload.checkInDate,
      checkOutDate: payload.checkOutDate,
      rooms: payload.rooms,
      adults: payload.adults,
      children: payload.children,
      childAges: payload.childAges,
      isHourly: payload.isHourly ?? false,
      hourlyCheckInTime: payload.hourlyCheckInTime,
      hourlyDurationHours: payload.hourlyDurationHours,
      guests: payload.guests ?? [],
      contactEmail: payload.contactEmail,
      contactPhone: payload.contactPhone,
      paymentMethod: payload.paymentMethod ?? 'online',
    }, true);
    return {
      bookingId: raw.bookingId,
      status: raw.status,
      amount: raw.amount,
      currency: raw.currency,
      priceBreakdown: {} as HotelPriceBreakdown,
      paymentMethod: payload.paymentMethod ?? 'online',
      paymentGatewayOrderId: raw.paymentGatewayOrderId ?? null,
    };
  },

  // backend: POST /bookings/hotel/:bookingId/confirm-payment marks the
  // booking CONFIRMED and records the Razorpay ids (BookingsService#confirmPayment
  // reads dto.paymentId / dto.paymentGatewayOrderId — camelCase, unlike the
  // generic booking-service's snake_case confirm-payment route). Best-effort:
  // the booking itself is already created before Razorpay opens, so a failure
  // here shouldn't block the success screen.
  confirmPayment: (bookingId: string, dto: { paymentId?: string; paymentGatewayOrderId?: string }) =>
    api.post<unknown>(`/bookings/hotel/${bookingId}/confirm-payment`, dto, true),

  // Verified live (2026-09-29): POST /hotels/:hotelId/check-availability returns
  // {success, statusCode, data: {hotel_id, room_type_id, room_title, available,
  // remaining_rooms, nights_count, price_per_night, total_room_price,
  // taxes_and_fees, grand_total}} — snake_case under `data`. Older builds used
  // room_id/nights/base_amount/total_amount; both are mapped here so
  // HotelAvailability.tsx's contract doesn't have to change.
  checkAvailability: async (
    hotelId: string,
    params: HotelAvailabilityCheckRequest,
  ): Promise<HotelAvailabilityCheck> => {
    const res = await api.post<{ data?: { available?: boolean; hotel_id?: string; room_type_id?: string; room_id?: string; room_title?: string; nights_count?: number; nights?: number; price_per_night?: number; total_room_price?: number; base_amount?: number; taxes_and_fees?: number; grand_total?: number; total_amount?: number; remaining_rooms?: number }; hotelId?: string; availableRooms?: RoomType[] }>(
      `/hotels/${hotelId}/check-availability`,
      {
        check_in: params.check_in,
        check_out: params.check_out,
        room_id: params.room_type_id,
        rooms_count: params.rooms_count ?? 1,
        guests_count: params.guests_count ?? 2,
      },
    );
    if (res.data) {
      const data = res.data;
      const pricePerNight = data.price_per_night ?? 0;
      const nights = data.nights_count ?? data.nights ?? 1;
      const roomsCount = params.rooms_count ?? 1;
      const totalRoomPrice =
        data.total_room_price ?? data.base_amount ?? pricePerNight * nights * roomsCount;
      const taxes = data.taxes_and_fees ?? 0;
      return {
        hotel_id: data.hotel_id ?? hotelId,
        room_type_id: data.room_type_id ?? data.room_id ?? params.room_type_id ?? '',
        room_title: data.room_title ?? '',
        available: data.available ?? false,
        remaining_rooms: data.remaining_rooms ?? (data.available ? 1 : 0),
        nights_count: nights,
        price_per_night: pricePerNight,
        total_room_price: totalRoomPrice,
        taxes_and_fees: taxes,
        grand_total: data.grand_total ?? data.total_amount ?? totalRoomPrice + taxes,
      };
    }
    const rooms = res.availableRooms ?? [];
    const picked = (params.room_type_id ? rooms.find((r) => r.id === params.room_type_id) : null) ?? rooms[0];
    const nights = params.check_in && params.check_out
      ? Math.max(1, Math.round((new Date(params.check_out).getTime() - new Date(params.check_in).getTime()) / 86400000))
      : 1;
    const roomsCount = params.rooms_count ?? 1;
    const pricePerNight = picked?.price ?? 0;
    const taxes = Number((picked?.taxes ?? '').replace(/[^\d]/g, '')) || 0;
    const roomTotal = pricePerNight * nights * roomsCount;
    return {
      hotel_id: hotelId,
      room_type_id: picked?.id ?? params.room_type_id ?? '',
      room_title: picked?.title ?? '',
      available: rooms.length > 0,
      remaining_rooms: rooms.length,
      nights_count: nights,
      price_per_night: pricePerNight,
      total_room_price: roomTotal,
      taxes_and_fees: taxes,
      grand_total: roomTotal + taxes,
    };
  },

  getPopularCities: async (): Promise<Array<{ id: string; name: string; image?: string; hotel_count?: number }>> => {
    const res = await api.get<Array<{ id: string; name: string; image?: string; hotel_count?: number }> | { data?: Array<{ id: string; name: string; image?: string; hotel_count?: number }> }>('/hotels/popular-cities');
    return Array.isArray(res) ? res : (res?.data ?? []);
  },

  confirmRooms: async (hotelId: string, dto: { room_type_id: string; check_in: string; check_out: string; rooms_count?: number }): Promise<{ confirmed: boolean; room_type_id: string }> => {
    const res = await api.post<{ confirmed: boolean; room_type_id: string } | { data: { confirmed: boolean; room_type_id: string } }>(`/hotels/${hotelId}/confirm-rooms`, dto, true);
    return 'data' in res ? res.data : res;
  },

  getHotelReviews: async (hotelId: string): Promise<HotelReview[]> => {
    const res = await api.get<HotelReview[] | { data?: HotelReview[] }>(`/hotels/${hotelId}/reviews`);
    return Array.isArray(res) ? res : (res?.data ?? []);
  },

  submitReview: async (hotelId: string, dto: { rating: number; title: string; comment: string }): Promise<{ success: boolean; review_id: string }> => {
    const res = await api.post<{ success: boolean; review_id: string } | { data: { success: boolean; review_id: string } }>(`/hotels/${hotelId}/reviews`, dto, true);
    return 'data' in res ? res.data : res;
  },

  getHotelPhotos: async (hotelId: string): Promise<{ photos: string[] }> => {
    const res = await api.get<{ photos: string[] } | { data?: { photos: string[] } }>(`/hotels/${hotelId}/photos`);
    return 'data' in res ? res.data! : (res as { photos: string[] });
  },

  getMyHotelBookings: async (): Promise<HotelBookingItem[]> => {
    const res = await api.get<HotelBookingItem[] | { data?: HotelBookingItem[] }>('/bookings/hotel/my-bookings', true);
    return Array.isArray(res) ? res : (res?.data ?? []);
  },

  getHotelBookingDetails: async (bookingId: string): Promise<HotelBookingDetail> => {
    const res = await api.get<HotelBookingDetail | { data: HotelBookingDetail }>(`/bookings/hotel/${bookingId}`, true);
    return 'data' in res ? res.data : res;
  },

  cancelHotelBooking: async (bookingId: string, reason?: string): Promise<{ success: boolean; refund_amount?: number }> => {
    const res = await api.post<{ success: boolean; refund_amount?: number } | { data: { success: boolean; refund_amount?: number } }>(`/bookings/hotel/${bookingId}/cancel`, { reason }, true);
    return 'data' in res ? res.data : res;
  },

  payAtProperty: async (bookingId: string): Promise<{ success: boolean; message: string }> => {
    const res = await api.post<{ success: boolean; message: string } | { data: { success: boolean; message: string } }>(`/bookings/hotel/${bookingId}/pay-at-property`, {}, true);
    return 'data' in res ? res.data : res;
  },
};
