import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import api from "../services/api";

export type UserRole = "doctor" | "nurse";

export type LoginResult = {
  success: boolean;
  message?: string;
  role?: UserRole;
};

interface AuthContextType {
  isAuthenticated: boolean;
  user: { id: string; username: string; role: UserRole; avatarUrl?: string } | null;
  login: (username: string, password: string) => Promise<LoginResult>;
  isLoading: boolean;
  logout: () => void;
  getUserRole: () => UserRole | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; username: string; role: UserRole; avatarUrl?: string } | null>(null);

  const mapRole = (backendRole: string): UserRole | null => {
    if (backendRole === "user.doctor") return "doctor";
    if (backendRole === "user.nurse") return "nurse";
    return null;
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.get("/auth/me");
        const userData = response.data.data;
        if (userData) {
          const role = mapRole(userData.role);
          if (role) {
            setIsAuthenticated(true);
            setUser({ id: userData.id, username: userData.name, role });
          } else {
            setIsAuthenticated(false);
            setUser(null);
          }
        }
      } catch (error) {
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    try {
      await api.post("/auth/login", { email, password });

      const response = await api.get("/auth/me");
      const userData = response.data.data;

      const role = mapRole(userData.role);

      if (!role) {
        await api.post("/auth/logout");
        return { success: false, message: "Bạn không có quyền truy cập hệ thống này." };
      }

      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("username");

      setIsAuthenticated(true);
      setUser({ id: userData.id, username: userData.name, role });
      return { success: true, role };
    } catch (error: any) {
      console.error("Login error:", error);
      
      // Determine error message
      if (!error.response) {
        return { success: false, message: "Lỗi kết nối máy chủ hoặc lỗi CORS. Vui lòng thử lại." };
      }
      
      const status = error.response.status;
      if (status === 401 || status === 400) {
        return { success: false, message: "Email hoặc mật khẩu không đúng." };
      } else if (status === 403) {
        return { success: false, message: "Bạn không có quyền truy cập." };
      }
      
      return { success: false, message: "Đã xảy ra lỗi không xác định." };
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
