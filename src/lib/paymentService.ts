import { api } from './api';

export interface WalletTransaction {
  id: string;
  title: string;
  desc: string;
  date: string;
  amount: string;
  balance: string;
  type: 'add' | 'bus' | 'cashback' | 'cab' | string;
  color: 'green' | 'blue' | 'orange' | 'red' | string;
}

export interface WalletInfo {
  balance: number;
  currency: string;
  transactions: WalletTransaction[];
}

interface RawWalletBalance {
  userId: string;
  balance: number;
  currency: string;
}

interface RawWalletTransaction {
  id: string;
  amount: string | number;
  transaction_type: 'CREDIT' | 'DEBIT';
  description: string;
  created_at: string;
}

export interface RazorpayOrderResponse {
  payment_id?: string;
  razorpay_order_id: string;
  amount: number;
  currency: string;
}

export interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface WalletBalanceResponse {
  userId: string;
  balance: number;
  currency: string;
}

export const paymentService = {
  // user-service's /user/wallet gives the balance; payment-service's /wallet/transactions gives
  // real transaction history — two separate services, combined here into one view model.
  // Verified live (2026-08-25): neither route wraps its payload as
  // {success, statusCode, data} — both are flat, same as /payment/orders below.
  // Reading .data on these made getWalletInfo throw on every call.
  getWalletInfo: async (): Promise<WalletInfo> => {
    const [balance, transactions] = await Promise.all([
      api.get<RawWalletBalance>('/user/wallet', true),
      api.get<RawWalletTransaction[]>('/payment/wallet/transactions', true),
    ]);
    return {
      balance: balance.balance,
      currency: balance.currency,
      transactions: transactions.map((t) => ({
        id: t.id,
        title: t.description,
        desc: t.transaction_type === 'CREDIT' ? 'Money Added' : 'Payment',
        date: new Date(t.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        amount: `${t.transaction_type === 'CREDIT' ? '+' : '-'}₹${Number(t.amount).toFixed(2)}`,
        balance: '',
        type: t.transaction_type === 'CREDIT' ? 'add' : 'bus',
        color: t.transaction_type === 'CREDIT' ? 'green' : 'blue',
      })),
    };
  },

  topUpWallet: (amount: number): Promise<RazorpayOrderResponse> =>
    api.post<RazorpayOrderResponse>('/payment/orders', { amount, currency: 'INR' }, true),

  getTransactions: (): Promise<RawWalletTransaction[]> =>
    api.get<RawWalletTransaction[]>('/payment/wallet/transactions', true),

  // NOTE: send the plain rupee amount — the backend does Math.round(amount * 100) itself.
  // POST /payment/orders is NOT wrapped in the {success,statusCode,data} envelope (unlike the
  // /payment/wallet/* routes), so the response is used as-is.
  createRazorpayOrder: async (amount: number, bookingId?: string): Promise<RazorpayOrderResponse> => {
    return api.post<RazorpayOrderResponse>(
      '/payment/orders', { amount, currency: 'INR', booking_id: bookingId }, true
    );
  },

  // backend: POST /payment/wallet/confirm verifies the Razorpay HMAC signature
  // (order_id|payment_id) and credits the wallet — see ConfirmTopUpDto /
  // WalletService#confirmTopUp. Without this call the Razorpay checkout
  // succeeding client-side never actually credits anything server-side.
  // Response is wrapped {success,statusCode,data} per WalletController;
  // unwrap defensively like every other call here.
  confirmTopUp: async (razorpay_order_id: string, razorpay_payment_id: string, razorpay_signature?: string): Promise<WalletBalanceResponse> => {
    const res = await api.post<WalletBalanceResponse | { data: WalletBalanceResponse }>(
      '/payment/wallet/confirm',
      { razorpay_order_id, razorpay_payment_id, razorpay_signature },
      true,
    );
    return 'data' in res ? res.data : res;
  },

  loadRazorpayScript: (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (document.getElementById('razorpay-sdk')) { resolve(true); return; }
      const script = document.createElement('script');
      script.id = 'razorpay-sdk';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  },

  getOrderDetails: async (orderId: string): Promise<RazorpayOrderResponse> => {
    const res = await api.get<RazorpayOrderResponse | { data: RazorpayOrderResponse }>(`/payment/orders/${orderId}`, true);
    return 'data' in res ? res.data : res;
  },

  getWalletBalance: async (): Promise<WalletBalanceResponse> => {
    const res = await api.get<WalletBalanceResponse | { data: WalletBalanceResponse }>('/payment/wallet/balance', true);
    return 'data' in res ? res.data : res;
  },

  payWithWallet: async (dto: { booking_id: string; amount: number; currency?: string }): Promise<{ success: boolean; transaction_id: string; balance: number }> => {
    const res = await api.post<{ success: boolean; transaction_id: string; balance: number } | { data: { success: boolean; transaction_id: string; balance: number } }>('/payment/wallet/pay', { ...dto, currency: dto.currency ?? 'INR' }, true);
    return 'data' in res ? res.data : res;
  },
};
