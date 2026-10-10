import { createApi } from './api';

// Adventure-service partner surface (/api/v1/adventure/... — singular path).
// Every response observed live follows { success, statusCode, data } (setup/
// profile/earnings etc.) or { success, data } — unwrap defensively below so a
// raw payload would still work. Auth: Bearer token is attached when present;
// the backend currently answers anonymous calls too, but auth=true means the
// panel keeps working untouched once the API starts enforcing JWTs (401 →
// refresh → /login, handled by api.ts).
const api = createApi(import.meta.env.VITE_ADVENTURE_BASE_URL || '/api/v1');

async function unwrap<T>(promise: Promise<unknown>): Promise<T> {
  const res = (await promise) as { data?: T } | T;
  if (res && typeof res === 'object' && 'data' in (res as object) && (res as { data?: T }).data !== undefined) {
    return (res as { data: T }).data;
  }
  return res as T;
}

// ---------- shared types ----------

export interface Pagination {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

// ---------- setup / onboarding ----------

export interface SetupPartnerType {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
}

export interface SetupCategory {
  id: string;
  title: string;
  imageUrl: string;
}

export interface SetupMeta {
  partnerTypes: SetupPartnerType[];
  categories: SetupCategory[];
  documentRules: {
    maxFileSizeBytes: number;
    allowedMimeTypes: string[];
    requiredDocumentTypes: string[];
    optionalDocumentTypes: string[];
  };
}

export interface SetupDocument {
  id: string;
  docType: string;
  title: string;
  isRequired: boolean;
  status: 'NOT_UPLOADED' | 'UPLOADED' | 'VERIFIED' | 'REJECTED' | string;
  fileName: string | null;
  fileUrl: string | null;
}

export interface SetupProgress {
  partnerId: string;
  onboardingStep: number;
  verificationStatus: string;
  partnerType: string | null;
  businessDetails: {
    businessName: string | null;
    ownerName: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
  };
  selectedCategories: string[];
  location: { latitude?: number; longitude?: number; address?: string } | null;
  documents: SetupDocument[];
}

export interface SetupVerificationStatus {
  verificationStatus: string;
  statusTitle: string;
  statusSubtitle: string | null;
  rejectionReason: string | null;
  progressSteps: Array<{ step: number; title: string; subtitle: string; status: string }>;
}

// ---------- activities ----------

export interface PartnerActivity {
  id: string;
  title?: string;
  name?: string;
  status?: string;
  category?: string;
  location?: string;
  city?: string;
  price?: number;
  image_url?: string | null;
  [key: string]: unknown;
}

export interface PartnerActivityList {
  activities: PartnerActivity[];
  pagination: Pagination;
}

export interface PartnerPackage {
  id: string;
  title?: string;
  name?: string;
  status?: string;
  price?: number;
  [key: string]: unknown;
}

// ---------- availability ----------

export interface PartnerSlot {
  id: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  capacity?: number;
  booked?: number;
  status?: string;
  [key: string]: unknown;
}

export interface SlotListResponse {
  formattedDate: string;
  summary: { totalSlots: number; totalBooked: number; totalCapacity: number; occupancyRate: number };
  slots: PartnerSlot[];
}

// ---------- bookings ----------

export interface PartnerBooking {
  id: string;
  bookingId?: string;
  customerName?: string;
  status?: string;
  activityTitle?: string;
  date?: string;
  [key: string]: unknown;
}

export interface PartnerBookingList {
  bookings: PartnerBooking[];
  summaryCounts: { all: number; confirmed: number; pending: number; completed: number; cancelled: number };
  pagination: Pagination;
}

// ---------- earnings ----------

export interface EarningsAnalytics {
  period: string;
  label: string;
  summary: {
    netEarnings: number;
    grossRevenue: number;
    commission: number;
    tdsGst: number;
    refunds: number;
    ordersCount: number;
    payoutStatus: string;
  };
  chart: { points: number[]; labels: string[]; highestDayEarnings: number };
  wallet: { availableBalance: number; pendingClearance: number; lifetimeEarnings: number; nextPayoutDate: string };
}

export interface PayoutPolicy {
  settlementCycle: string;
  payoutDay: string;
  coolingPeriodHours: number;
  platformCommissionPercent: number;
  tdsRatePercent: number;
  minimumPayoutThreshold: number;
  supportEmail: string;
  policyNotes: string[];
}

export interface Settlement {
  id: string;
  status?: string;
  amount?: number;
  [key: string]: unknown;
}

export interface SettlementList {
  settlements: Settlement[];
  pagination: Pagination;
}

// ---------- home ----------

export interface HomeChart {
  period: string;
  labels: string[];
  datasets: Array<{ label: string; data: number[] }>;
}

// ---------- notifications ----------

export interface NotificationsResponse {
  unreadCount: number;
  sections: Array<{
    id?: string;
    title?: string;
    items?: Array<{ id: string; title?: string; body?: string; createdAt?: string; read?: boolean; [key: string]: unknown }>;
    [key: string]: unknown;
  }>;
}

export interface NotificationPreferences {
  pushNewBookings: boolean;
  pushPaymentAlerts: boolean;
  pushLowCapacity: boolean;
  pushSettlements: boolean;
  emailDailySummary: boolean;
  whatsappUrgent: boolean;
}

// ---------- profile ----------

export interface PartnerProfile {
  id: string;
  partnerType: string | null;
  businessName: string | null;
  ownerName: string | null;
  email: string | null;
  phone: string | null;
  rating: number;
  reviewsCount: number;
  logoUrl: string | null;
  verificationStatus: string;
  address: { fullAddress: string | null; city: string | null; state: string | null; pincode: string | null };
  operatingLocation: string | null;
  joinedAt: string;
}

export interface ProfileDocument {
  id: string;
  docType?: string;
  title?: string;
  status?: string;
  fileName?: string | null;
  fileUrl?: string | null;
  [key: string]: unknown;
}

export interface BankDetails {
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  bankName?: string;
  [key: string]: unknown;
}

export const adventurePartnerService = {
  // ----- setup / onboarding -----
  getSetupMeta: () => unwrap<SetupMeta>(api.get('/adventure/setup/meta')),
  getSetupProgress: () => unwrap<SetupProgress>(api.get('/adventure/setup/progress', true)),
  getVerificationStatus: () => unwrap<SetupVerificationStatus>(api.get('/adventure/setup/verification-status', true)),

  setPartnerType: (dto: { partnerType: string }) =>
    unwrap<SetupProgress>(api.post('/adventure/setup/partner-type', dto, true)),
  saveBusinessDetails: (dto: Record<string, unknown>) =>
    unwrap<SetupProgress>(api.post('/adventure/setup/business-details', dto, true)),
  saveCategories: (dto: { categories: string[] }) =>
    unwrap<SetupProgress>(api.post('/adventure/setup/categories', dto, true)),
  saveLocation: (dto: { latitude?: number; longitude?: number; address?: string; city?: string; state?: string; pincode?: string }) =>
    unwrap<SetupProgress>(api.post('/adventure/setup/location', dto, true)),
  uploadSetupDocument: (docType: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    form.append('docType', docType);
    return unwrap<SetupProgress>(api.postForm('/adventure/setup/documents/upload', form, true));
  },
  deleteSetupDocument: (docType: string) =>
    unwrap<{ success?: boolean }>(api.delete(`/adventure/setup/documents/${docType}`, true)),
  submitSetup: () => unwrap<{ verificationStatus?: string }>(api.post('/adventure/setup/submit', {}, true)),

  // ----- activities -----
  getActivities: (params: { page?: number; limit?: number; status?: string; q?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.page !== undefined) qs.set('page', String(params.page));
    if (params.limit !== undefined) qs.set('limit', String(params.limit));
    if (params.status) qs.set('status', params.status);
    if (params.q) qs.set('q', params.q);
    const query = qs.toString();
    return unwrap<PartnerActivityList>(api.get(`/adventure/activities${query ? `?${query}` : ''}`, true));
  },
  getActivity: (id: string) => unwrap<PartnerActivity>(api.get(`/adventure/activities/${id}`, true)),
  createActivity: (dto: Record<string, unknown>) =>
    unwrap<PartnerActivity>(api.post('/adventure/activities', dto, true)),
  updateActivity: (id: string, dto: Record<string, unknown>) =>
    unwrap<PartnerActivity>(api.patch(`/adventure/activities/${id}`, dto, true)),
  setActivityStatus: (id: string, dto: { status: string }) =>
    unwrap<{ success?: boolean; status?: string }>(api.patch(`/adventure/activities/${id}/status`, dto, true)),
  deleteActivity: (id: string) =>
    unwrap<{ success?: boolean }>(api.delete(`/adventure/activities/${id}`, true)),
  uploadActivityMedia: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return unwrap<{ url?: string; urls?: string[] }>(api.postForm('/adventure/activities/media/upload', form, true));
  },

  // ----- packages -----
  getPackages: (activityId: string) =>
    unwrap<{ packages: PartnerPackage[] } | PartnerPackage[]>(
      api.get(`/adventure/activities/${activityId}/packages`, true),
    ),
  createPackage: (activityId: string, dto: Record<string, unknown>) =>
    unwrap<PartnerPackage>(api.post(`/adventure/activities/${activityId}/packages`, dto, true)),
  updatePackage: (id: string, dto: Record<string, unknown>) =>
    unwrap<PartnerPackage>(api.patch(`/adventure/packages/${id}`, dto, true)),
  setPackageStatus: (id: string, dto: { status: string }) =>
    unwrap<{ success?: boolean }>(api.patch(`/adventure/packages/${id}/status`, dto, true)),
  deletePackage: (id: string) =>
    unwrap<{ success?: boolean }>(api.delete(`/adventure/packages/${id}`, true)),

  // ----- availability -----
  getSlots: (params: { date?: string; page?: number; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.date) qs.set('date', params.date);
    if (params.page !== undefined) qs.set('page', String(params.page));
    if (params.limit !== undefined) qs.set('limit', String(params.limit));
    const query = qs.toString();
    return unwrap<SlotListResponse>(api.get(`/adventure/availability/slots${query ? `?${query}` : ''}`, true));
  },
  getMonthSummary: (params: { month: number; year: number }) =>
    unwrap<unknown>(
      api.get(
        `/adventure/availability/calendar/month-summary?month=${params.month}&year=${params.year}`,
        true,
      ),
    ),
  createSlot: (dto: Record<string, unknown>) =>
    unwrap<PartnerSlot>(api.post('/adventure/availability/slots', dto, true)),
  updateSlot: (id: string, dto: Record<string, unknown>) =>
    unwrap<PartnerSlot>(api.patch(`/adventure/availability/slots/${id}`, dto, true)),
  setSlotStatus: (id: string, dto: { status: string }) =>
    unwrap<{ success?: boolean }>(api.patch(`/adventure/availability/slots/${id}/status`, dto, true)),
  deleteSlot: (id: string) =>
    unwrap<{ success?: boolean }>(api.delete(`/adventure/availability/slots/${id}`, true)),

  // ----- bookings -----
  getBookings: (params: { page?: number; limit?: number; status?: string; q?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.page !== undefined) qs.set('page', String(params.page));
    if (params.limit !== undefined) qs.set('limit', String(params.limit));
    if (params.status) qs.set('status', params.status);
    if (params.q) qs.set('q', params.q);
    const query = qs.toString();
    return unwrap<PartnerBookingList>(api.get(`/adventure/bookings${query ? `?${query}` : ''}`, true));
  },
  getBooking: (id: string) => unwrap<PartnerBooking>(api.get(`/adventure/bookings/${id}`, true)),
  checkInBooking: (id: string, dto: Record<string, unknown> = {}) =>
    unwrap<{ success?: boolean }>(api.post(`/adventure/bookings/${id}/check-in`, dto, true)),
  rescheduleBooking: (id: string, dto: Record<string, unknown>) =>
    unwrap<{ success?: boolean }>(api.post(`/adventure/bookings/${id}/reschedule`, dto, true)),
  confirmBooking: (id: string, dto: Record<string, unknown> = {}) =>
    unwrap<{ success?: boolean }>(api.post(`/adventure/bookings/${id}/confirm`, dto, true)),
  cancelBooking: (id: string, dto: { reason?: string } = {}) =>
    unwrap<{ success?: boolean }>(api.post(`/adventure/bookings/${id}/cancel`, dto, true)),

  // ----- earnings -----
  getEarningsAnalytics: () => unwrap<EarningsAnalytics>(api.get('/adventure/earnings/analytics', true)),
  getPayoutPolicy: () => unwrap<PayoutPolicy>(api.get('/adventure/earnings/payout-policy', true)),
  getSettlements: (params: { page?: number; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.page !== undefined) qs.set('page', String(params.page));
    if (params.limit !== undefined) qs.set('limit', String(params.limit));
    const query = qs.toString();
    return unwrap<SettlementList>(api.get(`/adventure/earnings/settlements${query ? `?${query}` : ''}`, true));
  },
  getSettlement: (id: string) => unwrap<Settlement>(api.get(`/adventure/earnings/settlements/${id}`, true)),

  // ----- home dashboard -----
  getDashboard: () => unwrap<Record<string, unknown>>(api.get('/adventure/home/dashboard', true)),
  getChart: (period: 'week' | 'month' | 'year' = 'week') =>
    unwrap<HomeChart>(api.get(`/adventure/home/chart?period=${period}`, true)),

  // ----- notifications -----
  getNotifications: () => unwrap<NotificationsResponse>(api.get('/adventure/notifications', true)),
  markNotificationRead: (id: string) =>
    unwrap<{ success?: boolean }>(api.patch(`/adventure/notifications/${id}/read`, {}, true)),
  markAllNotificationsRead: () =>
    unwrap<{ success?: boolean }>(api.post('/adventure/notifications/mark-all-read', {}, true)),
  deleteNotification: (id: string) =>
    unwrap<{ success?: boolean }>(api.delete(`/adventure/notifications/${id}`, true)),
  registerDeviceToken: (dto: { token: string; platform?: string }) =>
    unwrap<{ success?: boolean }>(api.post('/adventure/notifications/device-token', dto, true)),
  getNotificationPreferences: () =>
    unwrap<NotificationPreferences>(api.get('/adventure/notifications/preferences', true)),
  updateNotificationPreferences: (dto: Partial<NotificationPreferences>) =>
    unwrap<NotificationPreferences>(api.patch('/adventure/notifications/preferences', dto, true)),

  // ----- profile -----
  getProfile: () => unwrap<PartnerProfile>(api.get('/adventure/profile', true)),
  updateBusinessDetails: (dto: Record<string, unknown>) =>
    unwrap<PartnerProfile>(api.patch('/adventure/profile/business-details', dto, true)),
  getProfileDocuments: () =>
    unwrap<{ documents: ProfileDocument[] } | ProfileDocument[]>(api.get('/adventure/profile/documents', true)),
  uploadProfileDocument: (file: File, docType?: string) => {
    const form = new FormData();
    form.append('file', file);
    if (docType) form.append('docType', docType);
    return unwrap<ProfileDocument>(api.postForm('/adventure/profile/documents', form, true));
  },
  updateProfileDocument: (id: string, dto: Record<string, unknown>) =>
    unwrap<ProfileDocument>(api.put(`/adventure/profile/documents/${id}`, dto, true)),
  getBankDetails: () => unwrap<BankDetails | null>(api.get('/adventure/profile/bank-details', true)),
  saveBankDetails: (dto: BankDetails) =>
    unwrap<BankDetails>(api.post('/adventure/profile/bank-details', dto, true)),
  logout: () => unwrap<{ success?: boolean }>(api.post('/adventure/auth/logout', {}, true)),
};
