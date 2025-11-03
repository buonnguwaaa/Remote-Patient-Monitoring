import Constants from 'expo-constants';

// Resolution order for config values:
// 1. process.env (when using a babel plugin to inline .env at build time)
// 2. expo extras (app.json) when running via Expo
// 3. fallback to localhost
const extras = (Constants?.manifest?.extra) || (Constants?.expoConfig?.extra) || {};
const BASE_URL = process.env.BASE_URL || extras.BASE_URL || 'http://localhost:8080';

async function request(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  // add a timeout so the app doesn't hang indefinitely
  const controller = new AbortController();
  const timeoutMs = 15000; // 15s
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers,
      signal: controller.signal,
      ...opts,
    });
    clearTimeout(id);
    const text = await res.text();
    try {
      return { ok: res.ok, status: res.status, body: JSON.parse(text) };
    } catch (e) {
      return { ok: res.ok, status: res.status, body: text };
    }
  } catch (err) {
    clearTimeout(id);
    // network error or timeout
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

export async function refresh(refreshToken) {
  return request('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) });
}

export default { register, login, refresh };
