import { createApi } from './api';

const api = createApi(import.meta.env.VITE_BUS_BASE_URL || '/api/v1');
import { authService } from './authService';

export interface BusSchedule {
  id: string;
  depTime: string;
  arrTime: string;
  depLoc: string;
  arrLoc: string;
  duration: string;
  price: number;
  name: string;
  type: string;
  category: string;
  isSleeper: boolean;
  rating: number;
  ratingsCount: number;
  discount: string;
  amenities: string[];
  operator: string;
}

interface RawSchedule {
  id: string;
  route: { source_city: string; destination_city: string; estimated_duration_minutes: number };
  bus: { bus_type: string; total_seats: number; amenities?: Record<string, boolean> };
  operator: { name: string };
  departure_time: string;
  arrival_time: string;
  base_fare: string | number;
}

type ScheduleResponse = RawSchedule[] | { data?: RawSchedule[] };

export interface RawSeat {
  seat_number: string;
  deck?: 'LOWER' | 'UPPER';
  is_upper_deck?: boolean;
  is_ladies_seat?: boolean;
  row: number;
  column: number;
  seat_type: 'SEATER' | 'SLEEPER' | 'SEMI_SLEEPER';
  is_available: boolean;
  price?: number;
}

// getScheduleSeats always stamps `deck` (from the source array / is_upper_deck),
// so consumers can filter on it without worrying about the raw API shape.
export type SeatWithDeck = RawSeat & { deck: 'LOWER' | 'UPPER' };

export interface ScheduleSeats {
  schedule_id: string;
  total_seats: number;
  available_seats: number;
  seats: SeatWithDeck[];
}

// Verified live (2026-08-25): GET /bus/schedules/:id/seat-map nests the decks
// one level deeper than this used to assume — {schedule_id, bus_type,
// total_seats, available_seats, seat_map: {lower_deck, upper_deck}} — but
// each entry is already in the flat RawSeat shape (deck: 'LOWER'|'UPPER',
// no is_upper_deck flag, no per-seat price), so no per-entry mapping is
// needed anymore, just pulling the two arrays out of seat_map.
interface RawSeatMapResponse {
  schedule_id: string;
  total_seats: number;
  available_seats: number;
  seat_map: {
    lower_deck: RawSeat[];
    upper_deck: RawSeat[] | null;
  };
  lower_deck?: RawSeat[];
  upper_deck?: RawSeat[];
  data?: RawSeatMapResponse;
}

// Verified live: the real response is just {message, scheduleId} — a mock
// endpoint, no lock_id/expires_in_seconds/locked_seats at all. Nothing reads
// this return value today (SeatSelectionModal only awaits success/failure),
// so the shape is kept loose rather than inventing fields that don't exist.
export interface LockSeatsResponse {
  message: string;
  scheduleId: string;
}

export interface RoutePoint {
  id: string;
  name: string;
  address?: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  contact_phone?: string;
  order_index: number;
}

export interface BoardingPoints {
  schedule_id: string;
  boarding_points: RoutePoint[];
  dropping_points: RoutePoint[];
}

const BUS_TYPE_LABELS: Record<string, string> = {
  AC_SLEEPER: 'AC Sleeper',
  NON_AC_SLEEPER: 'Non-AC Sleeper',
  AC_SEATER: 'AC Seater',
  NON_AC_SEATER: 'Non-AC Seater',
  SEMI_SLEEPER: 'AC Semi Sleeper',
};

const AMENITY_KEY_LABELS: Record<string, string> = {
  ac: 'AC',
  wifi: 'WiFi',
  water: 'Water Bottle',
  charging: 'Charging Point',
  sleeper: 'Sleeper',
  blanket: 'Blankets',
  reading_light: 'Reading Light',
};

const to12Hour = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
};

const mapSchedule = (s: RawSchedule): BusSchedule => {
  const busTypeLabel = BUS_TYPE_LABELS[s.bus.bus_type] || s.bus.bus_type.replace(/_/g, ' ');
  return {
    id: s.id,
    name: `${s.operator.name} ${busTypeLabel}`,
    type: `${busTypeLabel} (${s.bus.total_seats} seats)`,
    category: s.bus.bus_type.startsWith('NON_AC') ? 'Non-AC' : 'AC',
    isSleeper: s.bus.bus_type.includes('SLEEPER'),
    rating: 0,
    ratingsCount: 0,
    depTime: to12Hour(s.departure_time),
    arrTime: to12Hour(s.arrival_time),
    depLoc: s.route.source_city,
    arrLoc: s.route.destination_city,
    duration: `${Math.floor(s.route.estimated_duration_minutes / 60)}h ${s.route.estimated_duration_minutes % 60}m`,
    price: Number(s.base_fare),
    discount: '',
    amenities: Object.entries(s.bus.amenities || {})
      .filter(([, v]) => v)
      .map(([k]) => AMENITY_KEY_LABELS[k] || k),
    operator: s.operator.name,
  };
};

// Verified live (2026-08-25): none of these routes wrap their payload as
// {success, statusCode, data} — search/seat-map/schedule-by-id/boarding-points
// are all flat. Reading .data on every one of them made search/seat-map/
// boarding-points throw or silently return nothing. Search lives at the
// route root (GET /bus/schedules?source=...&destination=...&date=...), not
// under /search, and requires auth now like the rest of bus-service.
export const busService = {
  searchSchedules: async (source: string, destination: string, date?: string): Promise<BusSchedule[]> => {
    const params = new URLSearchParams({ source, destination });
    if (date) params.set('date', date);
    const res = await api.get<ScheduleResponse>(`/bus/schedules?${params}`, true);
    const list = Array.isArray(res) ? res : res.data ?? [];
    return list.map(mapSchedule);
  },

  getScheduleSeats: async (scheduleId: string): Promise<ScheduleSeats> => {
    const res = await api.get<RawSeatMapResponse | { data: RawSeatMapResponse }>(`/bus/schedules/${scheduleId}/seat-map`, true);
    const raw = 'data' in res ? res.data : res;
    if (!raw) throw new Error('Seat map response was empty');
    const lowerDeck = raw.seat_map?.lower_deck ?? raw.lower_deck ?? [];
    const upperDeck = raw.seat_map?.upper_deck ?? raw.upper_deck ?? [];
    const toSeatWithDeck = (
      seat: RawSeat,
      sourceDeck: 'LOWER' | 'UPPER',
    ): SeatWithDeck => ({
      ...seat,
      deck:
        seat.deck ??
        (typeof seat.is_upper_deck === 'boolean'
          ? seat.is_upper_deck
            ? 'UPPER'
            : 'LOWER'
          : sourceDeck),
      column: seat.column ?? (seat as RawSeat & { col?: number }).col ?? 1,
      is_available:
        seat.is_available ?? !(seat as RawSeat & { is_booked?: boolean }).is_booked,
    });
    return {
      schedule_id: raw.schedule_id,
      total_seats: raw.total_seats,
      available_seats: raw.available_seats,
      seats: [
        ...lowerDeck.map((seat) => toSeatWithDeck(seat, 'LOWER')),
        ...upperDeck.map((seat) => toSeatWithDeck(seat, 'UPPER')),
      ],
    };
  },

  // Live response is wrapped {success, statusCode, data: RawSchedule};
  // unwrap before mapping so s.bus/s.route access doesn't throw on the
  // envelope object (defensive: flat responses still pass through).
  getScheduleById: async (scheduleId: string): Promise<BusSchedule> => {
    const res = await api.get<RawSchedule | { data: RawSchedule }>(`/bus/schedules/${scheduleId}`, true);
    const raw = 'data' in res && res.data ? res.data : (res as RawSchedule);
    return mapSchedule(raw);
  },

  // bus-service's Redis-backed seat hold (5 min TTL) — this is bus-domain,
  // not booking-domain, so it lives here rather than in bookingService.ts
  // even though it's called right before checkout.
  // Verified live: this route requires auth and 401s without it — the
  // missing `true` here meant lock-seat failed on every real booking attempt,
  // which the caller (SeatSelectionModal) surfaces as a generic "seats taken"
  // error, permanently blocking checkout.
  lockSeats: (scheduleId: string, seatNumbers: string[]): Promise<LockSeatsResponse> => {
    // ponytail: no logged-in user should ever reach seat selection without a
    // stored id; the guest fallback just keeps this call from throwing if
    // that assumption is ever wrong.
    const userId = authService.getStoredUser()?.id || `guest_${Date.now()}`;
    return api.post<LockSeatsResponse>(`/bus/schedules/${scheduleId}/lock-seat`, {
      seat_numbers: seatNumbers,
      user_id: userId,
    }, true);
  },

  // Real per-route stops (schedules.service.ts#getBoardingPoints) — replaces
  // the plain departure/arrival city name with an actual pickup/drop stop list.
  // Live routes wrap the payload as {success, statusCode, data}; unwrap
  // defensively (like getScheduleSeats above) so callers can read
  // boarding_points directly.
  getBoardingPoints: async (scheduleId: string): Promise<BoardingPoints> => {
    const res = await api.get<BoardingPoints | { data: BoardingPoints }>(`/bus/schedules/${scheduleId}/boarding-points`, true);
    return 'data' in res && res.data ? res.data : (res as BoardingPoints);
  },

  // Live-verified: the route reads `query` (guide Step 1.1); an older `q`
  // param is silently ignored and returns an empty list.
  getLocationsAutocomplete: async (query: string): Promise<Array<{ id: string; name: string; state?: string }>> => {
    const res = await api.get<Array<{ id: string; name: string; state?: string }> | { data?: Array<{ id: string; name: string; state?: string }> }>(`/bus/locations/autocomplete?query=${encodeURIComponent(query)}`, true);
    return Array.isArray(res) ? res : (res?.data ?? []);
  },

  confirmSeats: async (scheduleId: string, seatNumbers: string[]): Promise<{ confirmed: boolean; message: string }> => {
    const res = await api.post<{ confirmed: boolean; message: string } | { data: { confirmed: boolean; message: string } }>(`/bus/schedules/${scheduleId}/confirm-seats`, { seat_numbers: seatNumbers }, true);
    return 'data' in res ? res.data : res;
  },

  getPopularRoutes: async (): Promise<Array<{ id: string; source: string; destination: string; route_name?: string; frequency?: string }>> => {
    const res = await api.get<Array<{ id: string; source: string; destination: string; route_name?: string; frequency?: string }> | { data?: Array<{ id: string; source: string; destination: string; route_name?: string; frequency?: string }> }>('/bus/popular-routes', true);
    return Array.isArray(res) ? res : (res?.data ?? []);
  },
};
