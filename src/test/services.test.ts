import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── api client ──────────────────────────────────────────────────────────────
describe('api client', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('attaches Authorization header when accessToken is stored', async () => {
    localStorage.setItem('accessToken', 'test-token');
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);

    const { api } = await import('../lib/api');
    await api.get('/test', true).catch(() => {});
    const [, opts] = fetchMock.mock.calls[0];
    expect((opts as RequestInit).headers).toMatchObject({ Authorization: 'Bearer test-token' });
  });

  it('refreshes and persists the complete session after a 401', async () => {
    localStorage.setItem('accessToken', 'expired-token');
    localStorage.setItem('refreshToken', 'old-refresh-token');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('{}', { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        data: { accessToken: 'new-access-token', refreshToken: 'new-refresh-token', user: { id: 'u1', phone: '+919999999999' } },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: [] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const { api } = await import('../lib/api');
    await api.get('/protected', true);

    expect(localStorage.getItem('accessToken')).toBe('new-access-token');
    expect(localStorage.getItem('refreshToken')).toBe('new-refresh-token');
    expect(JSON.parse(localStorage.getItem('user') ?? '{}')).toMatchObject({ id: 'u1' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

// ── busService ───────────────────────────────────────────────────────────────
describe('busService', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('propagates the error when the API fails (no mock fallback)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    const { busService } = await import('../lib/busService');
    await expect(busService.searchSchedules('Kolkata', 'Siliguri')).rejects.toThrow();
  });
});

// ── hotelService ─────────────────────────────────────────────────────────────
describe('hotelService', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('propagates the error when the API fails (no mock fallback)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const { hotelService } = await import('../lib/hotelService');
    await expect(hotelService.getTrending()).rejects.toThrow();
  });
});

// ── authService ─────────────────────────────────────────────────────────────
describe('authService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('sends the backend Passenger role when verifying OTP', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: {
        accessToken: 'access',
        refreshToken: 'refresh',
        user: { id: 'user-1', phone: '+919999999999' },
      },
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const { authService } = await import('../lib/authService');
    await authService.verifyOtp('+919999999999', '123456');

    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({
      phone: '+919999999999',
      otp: '123456',
      role: 'Passenger',
    });
  });
});

// ── paymentService ────────────────────────────────────────────────────────────
describe('paymentService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('propagates the error when the API fails (no mock fallback)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const { paymentService } = await import('../lib/paymentService');
    await expect(paymentService.getWalletInfo()).rejects.toThrow();
  });
});

// ── bookingService ────────────────────────────────────────────────────────────
describe('bookingService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('getUserBookings returns an empty list when nothing has been booked yet', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 })
    ));
    const { bookingService } = await import('../lib/bookingService');
    const bookings = await bookingService.getUserBookings();
    expect(bookings).toEqual([]);
  });

  it('propagates the error when the API fails (no mock fallback)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const { bookingService } = await import('../lib/bookingService');
    await expect(bookingService.getUserBookings()).rejects.toThrow();
  });
});
