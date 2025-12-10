import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  user: { username: string } | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ username: string } | null>(null);

  // Check if already logged in on mount
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const username = localStorage.getItem("username");
    if (token && username) {
      setIsAuthenticated(true);
      setUser({ username });
    }
  }, []);

  const login = (username: string, password: string): boolean => {
    // Mock credentials
    if (username === "admin" && password === "123456") {
      localStorage.setItem("authToken", "mock-token-12345");
      localStorage.setItem("username", username);
      setIsAuthenticated(true);
      setUser({ username });
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("username");
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
