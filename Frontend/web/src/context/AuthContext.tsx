import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

export type UserRole = "doctor" | "admin";

interface AuthContextType {
  isAuthenticated: boolean;
  user: { username: string; role: UserRole } | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  getUserRole: () => UserRole | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to decode role from token (mock implementation)
const decodeRoleFromToken = (token: string): UserRole => {
  // In a real app, you would decode JWT token here
  // For now, we'll check a simple pattern
  if (token.includes("admin")) {
    return "admin";
  }
  return "doctor";
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ username: string; role: UserRole } | null>(null);

  // Check if already logged in on mount
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const username = localStorage.getItem("username");
    if (token && username) {
      const role = decodeRoleFromToken(token);
      setIsAuthenticated(true);
      setUser({ username, role });
    }
  }, []);

  const login = (username: string, password: string): boolean => {
    // Mock credentials - different roles for different accounts
    let token = "";
    
    if (username === "admin" && password === "123456") {
      token = "mock-token-admin-12345";
    } else if (username === "doctor" && password === "123456") {
      token = "mock-token-doctor-12345";
    } else {
      return false;
    }

    const role = decodeRoleFromToken(token);
    localStorage.setItem("authToken", token);
    localStorage.setItem("username", username);
    setIsAuthenticated(true);
    setUser({ username, role });
    return true;
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("username");
    setIsAuthenticated(false);
    setUser(null);
  };

  const getUserRole = (): UserRole | null => {
    return user?.role || null;
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, getUserRole }}>
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
