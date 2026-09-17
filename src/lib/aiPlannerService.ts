import { api } from './api';

export interface PlanLocation {
  name: string;
  latitude: number;
  longitude: number;
}

export interface JourneyLeg {
  leg_index: number;
  mode: 'CAB' | 'BUS' | 'TRANSFER' | string;
  mode_label: string;
  origin?: string;
  destination?: string;
  location?: string;
  departure_time?: string;
  arrival_time?: string;
  duration: string;
  distance_km?: number;
  estimated_fare?: number;
  service_provider?: string;
  instruction?: string;
  schedule_id?: string;
  available_seats?: string[];
  booking_payload?: Record<string, unknown>;
}

export interface JourneyOption {
  journey_id: string;
  category: string;
  badge_label: string;
  title: string;
  total_fare: number;
  fare_per_passenger: number;
  currency: string;
  total_duration: string;
  total_transfers: number;
  start_time: string;
  end_time: string;
  transport_modes: string[];
  legs: JourneyLeg[];
}

type ApiEnvelope<T> = { success?: boolean; data?: T } | T;

const unwrap = <T>(response: ApiEnvelope<T>): T =>
  typeof response === 'object' && response !== null && 'data' in response && response.data !== undefined
    ? response.data
    : response as T;

export interface PlanJourneyResult {
  search_id: string;
  source: string;
  destination: string;
  travel_date: string;
  passengers: number;
  options: JourneyOption[];
}

export interface BookMultiModalResult {
  master_booking_id: string;
  journey_id: string;
  total_amount: number;
  currency: string;
  status: string;
  leg_bookings: Array<{ leg_index: number; mode: string; booking_id: string; status: string; amount: number }>;
  checkout_order: { razorpay_order_id: string; amount: number; currency: string; key_id: string };
}

export interface SavedJourney {
  id: string;
  journey_id: string;
  search_id: string;
  source_name: string;
  destination_name: string;
  title: string;
  category: string;
  total_fare: number;
  total_duration: string;
  total_transfers: number;
  saved_at: string;
}

export interface JourneyAlertPrefs {
  departure_reminder: boolean;
  price_drop_alert: boolean;
  delay_notification: boolean;
  boarding_gate_update: boolean;
  updated_at?: string;
}

export interface ScheduleOptimization {
  recommended_departure: string;
  recommended_buffer_minutes: number;
  traffic_condition: string;
  weather_condition: string;
  reasoning: string;
}

// ai-planner-service — @Controller('api/v1/ai-planner'). plan-journey,
// book-multimodal, and smart-schedule-optimizer currently return the backend's
// own mocked/canned data (same options regardless of route/date — see
// app.service.ts), not a real routing engine; saved-journeys and alerts are
// genuine per-user DB-backed CRUD.
export const aiPlannerService = {
  planJourney: (dto: {
    source_location: PlanLocation;
    destination_location: PlanLocation;
    travel_date: string;
    passengers_count: number;
    preferences?: { max_transfers?: number; preferred_modes?: string[]; sort_by?: string };
  }): Promise<PlanJourneyResult> =>
    api.post<ApiEnvelope<PlanJourneyResult>>('/ai-planner/plan-journey', dto).then(unwrap),

  bookMultiModal: (dto: {
    search_id: string;
    journey_id: string;
    passengers: Array<{ name: string; age?: number; gender?: string }>;
    selected_bus_seats?: string[];
    contact_email?: string;
    contact_phone?: string;
  }): Promise<BookMultiModalResult> =>
    api.post<ApiEnvelope<BookMultiModalResult>>('/ai-planner/book-multimodal', dto, true).then(unwrap),

  getSavedJourneys: (): Promise<SavedJourney[]> =>
    api.get<ApiEnvelope<SavedJourney[]>>('/ai-planner/saved-journeys', true).then(unwrap),

  saveJourney: (searchId: string, journeyId: string): Promise<{ id: string; journey_id: string }> =>
    api.post<ApiEnvelope<{ id: string; journey_id: string }>>(
      '/ai-planner/save-journey',
      { search_id: searchId, journey_id: journeyId },
      true,
    ).then(unwrap),

  deleteSavedJourney: (id: string): Promise<void> =>
    api.delete(`/ai-planner/saved-journeys/${id}`, true).then(() => undefined),

  getAlerts: (): Promise<JourneyAlertPrefs> =>
    api.get<ApiEnvelope<JourneyAlertPrefs>>('/ai-planner/alerts', true).then(unwrap),

  updateAlerts: (dto: Partial<JourneyAlertPrefs>): Promise<JourneyAlertPrefs> =>
    api.put<ApiEnvelope<JourneyAlertPrefs>>('/ai-planner/alerts', dto, true).then(unwrap),

  optimizeSchedule: (dto: { origin: string; destination: string; scheduled_departure: string }): Promise<ScheduleOptimization> =>
    api.post<ApiEnvelope<ScheduleOptimization>>('/ai-planner/smart-schedule-optimizer', dto).then(unwrap),
};
