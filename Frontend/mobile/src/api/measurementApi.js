import Constants from 'expo-constants';

const extras = (Constants?.manifest?.extra) || (Constants?.expoConfig?.extra) || {};
const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL || extras.BASE_URL || 'http://10.0.2.2:8080';

async function request(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  try {
    const doFetch = () => fetch(`${BASE_URL}${path}`, {
      headers,
      credentials: 'include',
      ...opts,
    });

    let res = await doFetch();
    const text = await res.text();
    try {
      return { ok: res.ok, status: res.status, body: JSON.parse(text) };
    } catch (e) {
      return { ok: res.ok, status: res.status, body: text };
    }
  } catch (err) {
    return { ok: false, status: 0, error: err.message || 'network error' };
  }
}

export async function createMeasurement(payload) {
  return request('/measurements', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function getMeasurements(patientId, type, timing, latest) {
  let query = [];
  if (patientId) query.push(`patientId=${patientId}`);
  if (type) query.push(`type=${type}`);
  if (timing) query.push(`timing=${timing}`);
  if (latest) query.push(`latest=true`);
  
  const path = `/measurements${query.length > 0 ? '?' + query.join('&') : ''}`;
  return request(path, {
    method: 'GET'
  });
}

export default { createMeasurement, getMeasurements };
