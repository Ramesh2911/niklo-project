export const PLACEHOLDER_IMG = 'https://picsum.photos/seed/niklo-placeholder/640/480';

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
};

function normalizeBaseUrl(url: string): string {
  const base = url.trim().replace(/\/+$/, '');
  if (base.endsWith('/api/v1') || base.endsWith('api/v1')) return base;
  if (base.endsWith('/api')) return `${base}/v1`;
  return `${base}/api/v1`;
}

const AUTH_BASE = normalizeBaseUrl(import.meta.env.VITE_AUTH_BASE_URL || '/api/v1');

let refreshInFlight: Promise<boolean> | null = null;

function tryRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;
    try {
      const res = await fetch(`${AUTH_BASE}/auth/token/refresh`, {
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

export function createApi(baseUrl: string) {
  const root = normalizeBaseUrl(baseUrl);

  async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, auth = false } = opts;
    const isFormData = body instanceof FormData;
    const headers: Record<string, string> = isFormData ? {} : { 'Content-Type': 'application/json' };
    const encodedBody = isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined);

    if (auth) {
      const token = localStorage.getItem('accessToken');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${root}${path}`, {
      method,
      headers,
      body: encodedBody,
    });

    if (res.status === 401 && auth) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${localStorage.getItem('accessToken')}`;
        const retry = await fetch(`${root}${path}`, {
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

  return {
    get: <T>(path: string, auth = false) => request<T>(path, { auth }),
    post: <T>(path: string, body: unknown, auth = false) => request<T>(path, { method: 'POST', body, auth }),
    postForm: <T>(path: string, form: FormData, auth = false) => request<T>(path, { method: 'POST', body: form, auth }),
    put: <T>(path: string, body: unknown, auth = false) => request<T>(path, { method: 'PUT', body, auth }),
    patch: <T>(path: string, body: unknown, auth = false) => request<T>(path, { method: 'PATCH', body, auth }),
    delete: <T>(path: string, auth = false) => request<T>(path, { method: 'DELETE', auth }),
  };
}

export const api = createApi(import.meta.env.VITE_AUTH_BASE_URL || '/api/v1');
