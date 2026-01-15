import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import api from "../services/api";

export type UserRole = "doctor";

interface AuthContextType {
  isAuthenticated: boolean;
  user: { username: string; role: UserRole } | null;
  login: (username: string, password: string) => Promise<UserRole | null>;
  isLoading: boolean;
  logout: () => void;
  getUserRole: () => UserRole | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ username: string; role: UserRole } | null>(null);

  // Helper to map backend role to frontend role - only doctor supported
  const mapRole = (backendRole: string): UserRole | null => {
    if (backendRole === "user.doctor") return "doctor";
    return null; // Only doctors can access this app
  };

  // Check if already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.get("/auth/me");
        const userData = response.data.data;
        if (userData) {
          const role = mapRole(userData.role);
          if (role) {
            setIsAuthenticated(true);
            setUser({ username: userData.name, role });
          } else {
            // Not a doctor, reject
            setIsAuthenticated(false);
            setUser(null);
          }
        }
      } catch (error) {
        // Not authenticated
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<UserRole | null> => {
    try {
      await api.post("/auth/login", { email, password });

      // After successful login (cookies set), fetch user info
      const response = await api.get("/auth/me");
      const userData = response.data.data;

      const role = mapRole(userData.role);

      // Only allow doctors
      if (!role) {
        await api.post("/auth/logout"); // Logout non-doctor users
        return null;
      }

      // Clean up old local storage if any, just in case
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("username");

      setIsAuthenticated(true);
      setUser({ username: userData.name, role });
      return role;
    } catch (error) {
      console.error("Login error:", error);
      return null;
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout error", error);
    }
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("username");
    setIsAuthenticated(false);
    setUser(null);
  };

  const getUserRole = (): UserRole | null => {
    return user?.role || null;
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, login, logout, getUserRole }}>
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
