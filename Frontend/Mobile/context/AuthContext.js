import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import * as authApi from '../api/authApi';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_KEY = 'rpm_access_token';
const REFRESH_KEY = 'rpm_refresh_token';

const AuthContext = createContext(null);

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    let decoded;
    if (typeof atob !== 'undefined') {
      decoded = atob(base64);
    } else if (typeof Buffer !== 'undefined') {
      decoded = Buffer.from(base64, 'base64').toString('binary');
    } else {
      // can't decode
      return null;
    }
    const jsonPayload = decodeURIComponent(
      decoded
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join(''),
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const refreshTimeout = useRef(null);

  useEffect(() => {
    // load tokens from storage
    (async () => {
      try {
        const a = await AsyncStorage.getItem(ACCESS_KEY);
        const r = await AsyncStorage.getItem(REFRESH_KEY);
        if (a) setAccessToken(a);
        if (r) setRefreshToken(r);
        if (a) scheduleRefresh(a, r);
      } catch (e) {
        // ignore
      } finally {
        setInitializing(false);
      }
    })();

    return () => {
      if (refreshTimeout.current) clearTimeout(refreshTimeout.current);
    };
  }, []);

  const persistTokens = async (a, r) => {
    try {
      if (a) await AsyncStorage.setItem(ACCESS_KEY, a);
      else await AsyncStorage.removeItem(ACCESS_KEY);
      if (r) await AsyncStorage.setItem(REFRESH_KEY, r);
      else await AsyncStorage.removeItem(REFRESH_KEY);
    } catch (e) {
      // ignore
    }
  };

  const scheduleRefresh = (aToken, rToken) => {
    if (!aToken || !rToken) return;
    const payload = parseJwt(aToken);
    if (!payload || !payload.exp) return;
    const expiresAt = payload.exp * 1000;
    const now = Date.now();
    const msUntilExpiry = expiresAt - now;
    // refresh 60 seconds before expiry, or immediately if expired
    const refreshIn = Math.max(msUntilExpiry - 60 * 1000, 0);
    if (refreshTimeout.current) clearTimeout(refreshTimeout.current);
    refreshTimeout.current = setTimeout(() => {
      doRefresh();
    }, refreshIn);
  };

  const doRefresh = async () => {
    if (!refreshToken) return logout();
    try {
      const res = await authApi.refresh(refreshToken);
      if (res.ok && res.body && res.body.accessToken) {
        setAccessToken(res.body.accessToken);
        await persistTokens(res.body.accessToken, refreshToken);
        scheduleRefresh(res.body.accessToken, refreshToken);
        return true;
      }
    } catch (e) {
      // ignore
    }
    // failed to refresh -> logout
    logout();
    return false;
  };

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    if (res.ok && res.body && res.body.data) {
      const data = res.body.data;
      const a = data.accessToken || data.AccessToken || null;
      const r = data.refreshToken || data.RefreshToken || null;
      setAccessToken(a);
      setRefreshToken(r);
      await persistTokens(a, r);
      scheduleRefresh(a, r);
      return { ok: true, data };
    }
    return { ok: false, error: res.body };
  };

  const register = async (payload) => {
    const res = await authApi.register(payload);
    if (res.ok) return { ok: true, data: res.body };
    return { ok: false, error: res.body };
  };

  const logout = async () => {
    setAccessToken(null);
    setRefreshToken(null);
    if (refreshTimeout.current) clearTimeout(refreshTimeout.current);
    await persistTokens(null, null);
  };

  return (
    <AuthContext.Provider
      value={{ accessToken, refreshToken, initializing, login, register, logout, doRefresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
