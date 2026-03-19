import React, { createContext, useEffect, useState } from "react";
import * as authApi from "../api/authApi";

const AuthContext = createContext(null);

function extractUserPayload(response) {
  if (!response?.ok) {
    return null;
  }

  const body = response.body;
  if (!body) {
    return null;
  }

  return body.data || body.user || body;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const response = await authApi.me();
        setUser(extractUserPayload(response));
      } catch (error) {
        setUser(null);
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  const login = async (email, password) => {
    const loginResponse = await authApi.login({ email, password });
    if (!loginResponse.ok) {
      return { ok: false, error: loginResponse.error || loginResponse.body };
    }

    const meResponse = await authApi.me();
    const meUser = extractUserPayload(meResponse);
    if (meUser) {
      setUser(meUser);
      return { ok: true, data: meUser };
    }

    return { ok: true, data: loginResponse.body };
  };

  const register = async (payload) => {
    const response = await authApi.register(payload);
    if (!response.ok) {
      return { ok: false, error: response.error || response.body };
    }

    const meResponse = await authApi.me();
    const meUser = extractUserPayload(meResponse);
    if (meUser) {
      setUser(meUser);
    }

    return { ok: true, data: response.body };
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // noop
    }

    setUser(null);
  };

  const refreshSession = async () => {
    const refreshResponse = await authApi.refresh();
    if (!refreshResponse.ok) {
      return false;
    }

    const meResponse = await authApi.me();
    const meUser = extractUserPayload(meResponse);
    setUser(meUser);

    return Boolean(meUser);
  };

  const updateUser = (nextUser) => {
    setUser((currentUser) => {
      if (typeof nextUser === "function") {
        return nextUser(currentUser);
      }

      return { ...(currentUser || {}), ...(nextUser || {}) };
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        initializing,
        login,
        register,
        logout,
        refreshSession,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
