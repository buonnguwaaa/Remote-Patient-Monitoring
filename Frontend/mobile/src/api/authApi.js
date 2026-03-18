import Constants from 'expo-constants';

const extras = (Constants?.manifest?.extra) || (Constants?.expoConfig?.extra) || {};
const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL || extras.BASE_URL || 'http://10.0.2.2:8080';

async function request(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const controller = new AbortController();
  const timeoutMs = 15000;

  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const doFetch = (extra = {}) => fetch(`${BASE_URL}${path}`, {
      headers,
      signal: controller.signal,
      credentials: 'include',
      ...opts,
      ...extra,
    });

    let res = await doFetch();
    clearTimeout(id);
    const text = await res.text();
    try {
      if (res.status === 401 && !opts._retry) {
        try {
          const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          });
          if (refreshRes.ok) {
            res = await doFetch({ _retry: true });
            const retryText = await res.text();
            try {
              return { ok: res.ok, status: res.status, body: JSON.parse(retryText) };
            } catch (e) {
              return { ok: res.ok, status: res.status, body: retryText };
            }
          }
        } catch (e) {
        }
      }

      return { ok: res.ok, status: res.status, body: JSON.parse(text) };
    } catch (e) {
      return { ok: res.ok, status: res.status, body: text };
    }
  } catch (err) {
    clearTimeout(id);
    if (err.name === 'AbortError') {
      return { ok: false, status: 0, error: 'timeout' };
    }
    return { ok: false, status: 0, error: err.message || 'network error' };
  }
}

export async function register(payload) {
  return request('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
}

export async function login(payload) {
  return request('/auth/login', { method: 'POST', body: JSON.stringify(payload) });
}

export async function refresh() {
  return request('/auth/refresh', { method: 'POST' });
}
export async function me() {
  return request('/auth/me', { method: 'GET' });
}

export async function logout() {
  return request('/auth/logout', { method: 'POST' });
}

export default { register, login, refresh };
