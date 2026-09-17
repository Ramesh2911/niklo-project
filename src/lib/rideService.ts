import { api } from './api';

// No standalone driver-app client exists in this project, so the currently
// signed-in account goes online near the pickup point and "accepts" via the
// same real backend endpoint a driver app would call. Verified live
// (2026-08-25): /accept and /complete still ignore the caller entirely and
// fall back to a hardcoded demo driver id (rides.controller.ts), so there's
// nothing for the frontend to pass here either way.
export interface LatLng {
  lat: number;
  lng: number;
}

export interface FareQuote {
  fareEstimate: number;
  surgeMultiplier: number;
  distanceKm: number;
  estimatedTimeMins: number;
}

export interface DriverDetails {
  id: string;
  // Always null today — driver-service has no name/phone/photo columns yet
  // and user-service is still a stub. Kept in the shape so nothing breaks
  // once they land.
  name: string | null;
  phone: string | null;
  photoUrl: string | null;
  rating: number | null;
  vehicleType: string | null;
  vehicleNumber: string | null;
  currentLocation: LatLng | null;
}

export interface RideStatusResponse {
  rideId: string;
  status: 'REQUESTED' | 'ACCEPTED' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  fareEstimate: number | null;
  fareFinal: number | null;
  distanceKm: number | null;
  driverDetails: DriverDetails | null;
}

// Verified live against production (2026-08-25): unlike every other service in
// this app, ride-service does NOT wrap its payload as {success, statusCode,
// data} — /estimate, /request and /:id/status all return the fields directly
// at the top level (fire-and-forget routes like /accept return a bare
// {success, message} with no data key at all). Reading .data here silently
// resolved to undefined on every call — requestRide's destructured rideId
// was always undefined, so the ride got created server-side but the UI threw
// and bounced straight back to "selecting" as if nothing happened.
export const rideService = {
  /** Server-side quote — GET/POST both require a signed-in caller now. */
  getEstimate: (params: { pickup: LatLng; drop: LatLng; rideType: string }) =>
    api.post<FareQuote>(
      '/ride/estimate',
      { pickup: params.pickup, drop: params.drop, rideType: params.rideType },
      true,
    ),

  requestRide: async (params: {
    pickup: LatLng;
    pickupAddress: string;
    dropoff: LatLng;
    dropAddress: string;
    vehicleType: string;
  }): Promise<{ rideId: string; status: string; message: string }> => {
    await api.post('/ride/driver/go-online', {
      lat: params.pickup.lat,
      lng: params.pickup.lng,
    }, true);
    return api.post<{ rideId: string; status: string; message: string }>('/ride/request', {
      // Backend (rides.service.ts mapDtoToRide) reads flat pickupLatitude/
      // pickupLongitude/dropoffLatitude/dropoffLongitude, not nested
      // pickup/dropoff objects — sending the nested shape left these fields
      // undefined and silently fell back to hardcoded dummy coordinates.
      pickupLatitude: params.pickup.lat,
      pickupLongitude: params.pickup.lng,
      dropoffLatitude: params.dropoff.lat,
      dropoffLongitude: params.dropoff.lng,
      pickupAddress: params.pickupAddress,
      dropAddress: params.dropAddress,
      vehicleType: params.vehicleType,
    }, true);
  },

  getStatus: (rideId: string) =>
    api.get<RideStatusResponse>(`/ride/${rideId}/status`, true),

  acceptAsDemoDriver: (rideId: string) => api.post(`/ride/${rideId}/accept`, {}, true),

  // Same "no standalone driver app" situation as acceptAsDemoDriver above —
  // without this, a ride would sit at ACCEPTED forever since nothing else
  // ever calls the real complete-trip endpoint.
  completeAsDemoDriver: (rideId: string) => api.post(`/ride/${rideId}/complete`, {}, true),

  cancelRide: (rideId: string) => api.post(`/ride/${rideId}/cancel`, {}, true),

  rateRide: (rideId: string, dto: { rating: number; feedback?: string }) =>
    api.post(`/ride/${rideId}/rate`, dto, true),

  scheduleRide: async (params: {
    pickup: LatLng;
    pickupAddress: string;
    dropoff: LatLng;
    dropAddress: string;
    vehicleType: string;
    scheduledTime: string;
  }): Promise<{ rideId: string; status: string; message: string }> => {
    return api.post<{ rideId: string; status: string; message: string }>('/ride/schedule', {
      pickupLatitude: params.pickup.lat,
      pickupLongitude: params.pickup.lng,
      dropoffLatitude: params.dropoff.lat,
      dropoffLongitude: params.dropoff.lng,
      pickupAddress: params.pickupAddress,
      dropAddress: params.dropAddress,
      vehicleType: params.vehicleType,
      scheduledTime: params.scheduledTime,
    }, true);
  },

  markArrived: (rideId: string) =>
    api.post(`/ride/${rideId}/arrived`, {}, true),

  verifyRideOtp: async (rideId: string, otp: string): Promise<{ verified: boolean; message: string }> => {
    const res = await api.post<{ verified: boolean; message: string } | { data: { verified: boolean; message: string } }>(`/ride/${rideId}/verify-otp`, { otp }, true);
    return 'data' in res ? res.data : res;
  },

  goOffline: () =>
    api.post('/ride/driver/go-offline', {}, true),

  getMyRides: async (): Promise<RideStatusResponse[]> => {
    const res = await api.get<RideStatusResponse[] | { data?: RideStatusResponse[] }>('/ride/my-rides', true);
    return Array.isArray(res) ? res : (res?.data ?? []);
  },

  getRideDetails: async (rideId: string): Promise<RideStatusResponse> => {
    const res = await api.get<RideStatusResponse | { data: RideStatusResponse }>(`/ride/${rideId}`, true);
    return 'data' in res ? res.data : res;
  },
};
