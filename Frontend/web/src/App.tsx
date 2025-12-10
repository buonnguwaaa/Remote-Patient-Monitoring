import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import "./styles/App.css";

// import các trang (pages)
import LoginPage from "./pages/LoginPage.tsx";
import DashBoard from "./pages/DashBoard.tsx";
import PatientPage from "./pages/PatientPage.tsx";
import ThresholdAlert from "./pages/ThresholdAlert.tsx";
import ThresholdSettingsPage from "./pages/ThresholdSettingsPage.tsx";
import NotFound from "./pages/NotFound.tsx";
import PatientDetailPage from "./pages/PatientDetailPage.tsx";

import MainLayout from "./components/layout/MainLayout.tsx";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* Routes chỉ được chứa Route con trực tiếp */}
        <Routes>
          {/* --- NHÓM 1: Trang KHÔNG có Sidebar (Login) --- */}
          <Route path="/login" element={<LoginPage />} />

          {/* --- NHÓM 2: Trang CÓ Sidebar (Dùng Layout) - Protected --- */}
          {/* Route này đóng vai trò là Wrapper, không có path riêng */}
          <Route
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashBoard />} />
            <Route path="/patient" element={<PatientPage />} />
            <Route path="/patient/:id" element={<PatientDetailPage />} />
            <Route path="/threshold-alerts" element={<ThresholdAlert />} />
            <Route path="/threshold-settings" element={<ThresholdSettingsPage />} />
            {/* Route cho trang không tìm thấy */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
