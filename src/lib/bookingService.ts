import { createApi } from './api';

const api = createApi(import.meta.env.VITE_BOOKING_BASE_URL || '/api/v1');
const userApi = createApi(import.meta.env.VITE_USER_BASE_URL || '/api/v1');

export interface PassengerInfo {
  name: string;
  age: string;
  gender: 'Male' | 'Female' | 'Other';
}

export interface CreateBusBookingPayload {
  scheduleId: string;
  seatIds: string[];
  passengers: PassengerInfo[];
  contactEmail: string;
  contactPhone: string;
  travelDate?: string;
  title?: string;
  departureTime?: string;
  travelInsurance: boolean;
  boardingPoint?: string;
  droppingPoint?: string;
  fareBreakdown: { baseFare: number; discount: number; insurance: number; taxes: number; total: number };
  governmentId?: { type: string; number: string };
}

export interface CreateCatalogBookingPayload {
  bookingType: 'PACKAGE' | 'ADVENTURE';
  referenceId: string;
  title: string;
  subtitle: string;
  location: string;
  destination: string;
  travelDate?: string;
  slotDate?: string;
  departureTime?: string;
  timeSlot?: string;
  totalAmount: number;
  travelers: number;
}

export interface RawBooking {
  id: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  booking_type: 'BUS' | 'CAR' | 'JOURNEY_LEG' | 'PACKAGE' | 'ADVENTURE' | 'HOTEL';
  schedule_id: string | null;
  boarding_point: string | null;
  dropping_point: string | null;
  total_amount: string | number;
  travel_date: string | null;
  qr_code: string;
  created_at: string;
  seat_numbers?: string[] | null;
  passenger_details?: PassengerInfo[] | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  fare_breakdown?: { baseFare: number; discount: number; insurance: number; taxes: number; total: number } | null;
}

export interface MyBookingItem {
  id: string;
  type: 'Bus' | 'Cab' | 'Hotel' | 'Package' | 'Adventure';
  title: string;
  date: string;
  badge: 'UPCOMING' | 'COMPLETED' | 'CANCELLED';
  boarding: string;
  dropping: string;
  pnr: string;
  status: string;
  amount: string;
  qrCode?: string;
}

export interface OfferItem {
  id: string;
  code: string;
  title: string;
  description: string;
  discount_percent?: number;
  discount_amount?: number;
  min_booking_amount?: number;
  max_discount?: number;
  valid_until?: string;
  category?: string;
  image_url?: string;
}

// The list/detail endpoints (GET /bookings/my-bookings, GET /bookings/:id)
// return raw snake_case entity rows (RawBooking) — confirmed live via curl.
// There's no booking_reference or title field on the real record, so both
// get derived from what's actually there (boarding/dropping point, id).
const mapBooking = (b: RawBooking): MyBookingItem => {
  const type = b.booking_type === 'CAR' ? 'Cab' : b.booking_type === 'HOTEL' ? 'Hotel' : b.booking_type === 'PACKAGE' ? 'Package' : b.booking_type === 'ADVENTURE' ? 'Adventure' : 'Bus';
  return {
    id: b.id,
    type,
    title: b.dropping_point ? `${b.boarding_point ?? 'TBD'} ➔ ${b.dropping_point}` : (b.boarding_point || `${type} Booking`),
    date: b.travel_date ? new Date(b.travel_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'TBD',
    badge: b.status === 'CONFIRMED' || b.status === 'PENDING' ? 'UPCOMING' : b.status === 'COMPLETED' ? 'COMPLETED' : 'CANCELLED',
    boarding: b.boarding_point || '—',
    dropping: b.dropping_point || '—',
    pnr: b.id,
    status: b.status,
    amount: Number(b.total_amount).toLocaleString('en-IN'),
    qrCode: b.qr_code || undefined,
  };
};

export const bookingService = {
  // backend: booking-service's CreateBookingDto requires schedule_id as a
  // UUID regardless of booking_type — it's the generic "id of the thing
  // being booked" column, reused for package/adventure ids too. Sending
  // reference_id (not a field on the DTO) leaves schedule_id undefined and
  // fails validation with "schedule_id must be a UUID".
  createCatalogBooking: (payload: CreateCatalogBookingPayload): Promise<RawBooking> =>
    api.post<RawBooking>('/bookings', {
      booking_type: payload.bookingType,
      schedule_id: payload.referenceId,
      title: payload.title,
      subtitle: payload.subtitle,
      location: payload.location,
      destination: payload.destination,
      travel_date: payload.travelDate,
      slot_date: payload.slotDate,
      departure_time: payload.departureTime,
      time_slot: payload.timeSlot,
      total_amount: payload.totalAmount,
      travelers: payload.travelers,
    }, true),

  // POST /bookings is live; the earlier "not built yet, 404s" note was
  // stale — the actual failure was schedule_id validation (see above).
  // Seat locking happens via busService.lockSeats (bus-service's real
  // Redis-backed hold), not here.
  createBusBooking: async (payload: CreateBusBookingPayload): Promise<RawBooking> => {
    const response = await api.post<RawBooking | { data: RawBooking }>('/bookings', {
      booking_type: 'BUS',
      schedule_id: payload.scheduleId,
      title: payload.title ?? payload.scheduleId,
      subtitle: `${payload.boardingPoint ?? ''} to ${payload.droppingPoint ?? ''}`,
      seat_numbers: payload.seatIds,
      boarding_point: payload.boardingPoint,
      dropping_point: payload.droppingPoint,
      travel_date: payload.travelDate,
      departure_time: payload.departureTime,
      // seat_number lets bus-service pair each passenger's gender with their
      // seat, for the ladies-seat rules in the seat map.
      passenger_details: payload.passengers.map((p, i) => ({ ...p, seat_number: payload.seatIds[i] })),
      contact_email: payload.contactEmail,
      contact_phone: payload.contactPhone,
      fare_breakdown: payload.fareBreakdown,
      total_amount: payload.fareBreakdown.total,
      has_insurance: payload.travelInsurance,
      has_gov_id_verification: Boolean(payload.governmentId),
      primary_gov_id_type: payload.governmentId?.type,
      primary_gov_id_number: payload.governmentId?.number,
    }, true);
    return 'data' in response ? response.data : response;
  },

  // backend: GET /bookings/:id is live and returns a RawBooking (verified
  // live with a real token — the "404s until built" note this comment used
  // to carry was stale, the route already exists).
  getBooking: (id: string) => api.get<RawBooking>(`/bookings/${id}`, true),

  // backend: not independently re-verified (would mutate a real booking to
  // CONFIRMED to test) — going by getBooking/cancelBooking below, which
  // carried the same "not built yet" note and both turned out live, treat
  // this one as live too rather than trusting the stale comment.
  confirmPayment: (id: string, dto: { payment_id?: string; payment_gateway_order_id?: string } = {}) =>
    api.post<RawBooking>(`/bookings/${id}/confirm-payment`, dto, true),

  // backend: POST /bookings/:id/cancel is live (verified — returns the
  // updated RawBooking with status: 'CANCELLED'). The "404s until built"
  // note this comment used to carry was stale.
  cancelBooking: (id: string) => api.post<RawBooking>(`/bookings/${id}/cancel`, {}, true),

  // backend: GET /bookings/history 500s unconditionally on the live
  // deployment — confirmed via curl with a valid Bearer token, every query
  // param combination reproduces {"statusCode":500,"message":"Internal
  // server error"}. GET /bookings/my-bookings queries the same table
  // filtered to the authenticated user and returns 200 with real data.
  // Since this page has no server-side filters/pagination to begin with
  // (tabs below filter client-side), my-bookings is a correct drop-in
  // replacement that sidesteps the broken endpoint entirely.
  getUserBookings: async (): Promise<MyBookingItem[]> => {
    const res = await api.get<RawBooking[] | { data?: RawBooking[] }>('/bookings/my-bookings', true);
    const items = Array.isArray(res) ? res : res?.data ?? [];
    return items.map(mapBooking);
  },

  getCancellationQuote: async (id: string): Promise<{ cancellation_fee: number; refund_amount: number; refund_breakdown?: string }> => {
    const res = await api.post<{ cancellation_fee: number; refund_amount: number; refund_breakdown?: string } | { data: { cancellation_fee: number; refund_amount: number; refund_breakdown?: string } }>(`/bookings/${id}/cancellation-quote`, {}, true);
    return 'data' in res ? res.data : res;
  },

  applyCoupon: async (id: string, couponCode: string): Promise<{ discount: number; final_amount: number; message?: string }> => {
    const res = await api.post<{ discount: number; final_amount: number; message?: string } | { data: { discount: number; final_amount: number; message?: string } }>(`/bookings/${id}/apply-coupon`, { coupon_code: couponCode }, true);
    return 'data' in res ? res.data : res;
  },

  verifyTicket: async (qrData: string): Promise<{ valid: boolean; booking?: RawBooking; message: string }> => {
    const res = await api.post<{ valid: boolean; booking?: RawBooking; message: string } | { data: { valid: boolean; booking?: RawBooking; message: string } }>('/bookings/verify-ticket', { qr_data: qrData }, true);
    return 'data' in res ? res.data : res;
  },

  verifyId: async (id: string, dto: { id_type: string; id_number: string; id_image_url?: string }): Promise<{ status: string; message: string }> => {
    const res = await api.post<{ status: string; message: string } | { data: { status: string; message: string } }>(`/bookings/${id}/verify-id`, dto, true);
    return 'data' in res ? res.data : res;
  },

  getIdVerificationStatus: async (id: string): Promise<{ status: string; verified: boolean }> => {
    const res = await api.get<{ status: string; verified: boolean } | { data: { status: string; verified: boolean } }>(`/bookings/${id}/id-verification`, true);
    return 'data' in res ? res.data : res;
  },

  getOffers: async (category?: string): Promise<OfferItem[]> => {
    const qs = category ? `?category=${encodeURIComponent(category)}` : '';
    const res = await api.get<OfferItem[] | { data?: OfferItem[] } | { offers?: OfferItem[] }>(`/offers${qs}`, true);
    if (Array.isArray(res)) return res;
    return (res as { data?: OfferItem[] })?.data ?? (res as { offers?: OfferItem[] })?.offers ?? [];
  },

  validateOffer: async (code: string, bookingType?: string): Promise<{ valid: boolean; discount: number; message: string }> => {
    const res = await api.post<{ valid: boolean; discount: number; message: string } | { data: { valid: boolean; discount: number; message: string } }>('/offers/validate', { code, booking_type: bookingType }, true);
    return 'data' in res ? res.data : res;
  },

  getActiveTrip: async (): Promise<{ has_active_trip: boolean; trip?: MyBookingItem }> => {
    const res = await userApi.get<{ has_active_trip: boolean; trip?: RawBooking } | { data: { has_active_trip: boolean; trip?: RawBooking } }>('/user/active-trip', true);
    const data = 'data' in res ? res.data : res;
    return {
      has_active_trip: data.has_active_trip,
      trip: data.trip ? mapBooking(data.trip) : undefined,
    };
  },

  getSmartSuggestions: async (): Promise<{ suggestions: Array<{ id: string; title: string; subtitle: string; image?: string; deeplink?: string }> }> => {
    const res = await api.get<{ suggestions: Array<{ id: string; title: string; subtitle: string; image?: string; deeplink?: string }> } | { data: { suggestions: Array<{ id: string; title: string; subtitle: string; image?: string; deeplink?: string }> } }>('/recommendations/smart-suggestions', true);
    return 'data' in res ? res.data : res;
  },

  getPromoBanners: async (): Promise<{ banners: Array<{ id: string; title: string; description?: string; image?: string; cta?: string; deeplink?: string }> }> => {
    const res = await api.get<{ banners: Array<{ id: string; title: string; description?: string; image?: string; cta?: string; deeplink?: string }> } | { data: { banners: Array<{ id: string; title: string; description?: string; image?: string; cta?: string; deeplink?: string }> } }>('/promotions/banners', true);
    return 'data' in res ? res.data : res;
  },
};
