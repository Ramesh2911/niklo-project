const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// ponytail: shared default for list/card image fields the backend sends back
// empty/missing — an empty string src still triggers a network request (for
// the current page URL) and a console warning, so every mapper needs a real
// fallback value instead of `?? ''`.
export const PLACEHOLDER_IMG = 'https://picsum.photos/seed/niklo-placeholder/640/480';

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
};

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = false } = opts;
  // FormData (multipart upload) must NOT be JSON-stringified or given an
  // explicit Content-Type — fetch sets its own header with the multipart
  // boundary only when the body is a FormData instance untouched.
  const isFormData = body instanceof FormData;
  const headers: Record<string, string> = isFormData ? {} : { 'Content-Type': 'application/json' };
  const encodedBody = isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined);

  if (auth) {
    const token = localStorage.getItem('accessToken');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: encodedBody,
  });

  if (res.status === 401 && auth) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${localStorage.getItem('accessToken')}`;
      const retry = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: encodedBody,
      });
      if (!retry.ok) throw new Error(`${retry.status}`);
      return retry.json();
    }
    localStorage.clear();
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }

  return res.json();
}

// Concurrent 401s must share one refresh call — otherwise each fires its own
// request and the response that lands last silently overwrites the others'
// (rotated) tokens in localStorage.
let refreshInFlight: Promise<boolean> | null = null;

function tryRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      if (data.data.user) localStorage.setItem('user', JSON.stringify(data.data.user));
      return true;
    } catch {
      return false;
    }
  })();

  return refreshInFlight.finally(() => { refreshInFlight = null; });
}

export const api = {
  get: <T>(path: string, auth = false) => request<T>(path, { auth }),
  post: <T>(path: string, body: unknown, auth = false) => request<T>(path, { method: 'POST', body, auth }),
  postForm: <T>(path: string, form: FormData, auth = false) => request<T>(path, { method: 'POST', body: form, auth }),
  put: <T>(path: string, body: unknown, auth = false) => request<T>(path, { method: 'PUT', body, auth }),
  patch: <T>(path: string, body: unknown, auth = false) => request<T>(path, { method: 'PATCH', body, auth }),
  delete: <T>(path: string, auth = false) => request<T>(path, { method: 'DELETE', auth }),
};
