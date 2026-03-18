import React, { createContext, useContext, useEffect, useState } from 'react';
import * as authApi from '../api/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await authApi.me();
        if (res.ok && res.body && res.body.data) {
          setUser(res.body.data);
        } else if (res.ok && res.body) {
          setUser(res.body.user || res.body);
        } else {
          setUser(null);
        }
      } catch (e) {
        setUser(null);
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    if (!res.ok) return { ok: false, error: res.error || res.body };

    const meRes = await authApi.me();
    if (meRes.ok && meRes.body && meRes.body.data) {
      setUser(meRes.body.data);
      return { ok: true, data: meRes.body.data };
    }

    if (meRes.ok && meRes.body) {
      setUser(meRes.body.user || meRes.body);
      return { ok: true, data: meRes.body };
    }

    return { ok: true, data: res.body };
  };

  const register = async (payload) => {
    const res = await authApi.register(payload);
    if (!res.ok) return { ok: false, error: res.error || res.body };
    const meRes = await authApi.me();
    if (meRes.ok && meRes.body && meRes.body.data) setUser(meRes.body.data);
    return { ok: true, data: res.body };
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
    }
    setUser(null);
  };

  const refreshSession = async () => {
    const res = await authApi.refresh();
    if (!res.ok) return false;
    const meRes = await authApi.me();
    if (meRes.ok && meRes.body && meRes.body.data) setUser(meRes.body.data);
    return true;
  };

  return (
    <AuthContext.Provider value={{ user, initializing, login, register, logout, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}



export default AuthContext;
