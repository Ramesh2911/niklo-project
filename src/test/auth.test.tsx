import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { I18nProvider } from '../contexts/I18nContext';
import Login from '../pages/Login';

// Mock the auth service
vi.mock('../lib/authService', () => ({
  authService: {
    sendOtp: vi.fn().mockResolvedValue({ success: true }),
    verifyOtp: vi.fn().mockResolvedValue({ user: { name: 'Test User', phone: '+919999999999' }, accessToken: 'tok', refreshToken: 'ref' }),
    logout: vi.fn().mockResolvedValue(undefined),
    getStoredUser: vi.fn().mockReturnValue(null),
    isLoggedIn: vi.fn().mockReturnValue(false),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

function renderLogin() {
  return render(
    <MemoryRouter>
      <I18nProvider>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </I18nProvider>
    </MemoryRouter>
  );
}

describe('Login page', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the phone input and Send OTP button', () => {
    renderLogin();
    expect(screen.getByLabelText(/mobile number/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send otp/i })).toBeInTheDocument();
  });

  it('does not submit with empty phone number', async () => {
    const { authService } = await import('../lib/authService');
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: /send otp/i }));
    expect(authService.sendOtp).not.toHaveBeenCalled();
  });

  it('calls sendOtp with +91 prefix when 10-digit number entered', async () => {
    const { authService } = await import('../lib/authService');
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText(/mobile number/i), '9999999999');
    await user.click(screen.getByRole('button', { name: /send otp/i }));
    await waitFor(() => expect(authService.sendOtp).toHaveBeenCalledWith('+919999999999'));
  });

  it('shows OTP modal after successful sendOtp', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText(/mobile number/i), '9999999999');
    await user.click(screen.getByRole('button', { name: /send otp/i }));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(screen.getByText(/enter otp/i)).toBeInTheDocument();
  });

  it('OTP inputs have correct aria-labels', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText(/mobile number/i), '9999999999');
    await user.click(screen.getByRole('button', { name: /send otp/i }));
    await waitFor(() => screen.getByRole('dialog'));
    expect(screen.getByLabelText(/otp digit 1 of 6/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/otp digit 6 of 6/i)).toBeInTheDocument();
  });
});
