/**
 * Simple event emitter for auth session expiry.
 * When httpClient detects that refresh token has also expired,
 * it fires "session_expired" so AuthContext can force logout.
 */

const listeners = new Set();

export function onSessionExpired(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function emitSessionExpired() {
  listeners.forEach((cb) => {
    try { cb(); } catch (e) { /* noop */ }
  });
}
