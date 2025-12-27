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
import ChatPage from "./pages/ChatPage.tsx";
import DocterProfile from "./pages/DocterProfile.tsx";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
import DoctorManagement from "./pages/admin/DoctorManagement.tsx";
import PatientManagementAdmin from "./pages/admin/PatientManagementAdmin.tsx";
import NurseManagement from "./pages/admin/NurseManagement.tsx";
import SystemSettings from "./pages/admin/SystemSettings.tsx";
import ActivityHistory from "./pages/admin/ActivityHistory.tsx";
import DepartmentManagement from "./pages/admin/DepartmentManagement.tsx";
import AssignmentManagement from "./pages/admin/AssignmentManagement.tsx";

import MainLayout from "./components/layout/MainLayout.tsx";
import { AuthProvider, useAuth, type UserRole } from "./context/AuthContext";

// Protected Route Component with role checking
const ProtectedRoute = ({
  children,
  requiredRole
}: {
  children: React.ReactNode;
  requiredRole?: UserRole;
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen w-full items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    // Redirect to appropriate dashboard based on role
    return <Navigate to={user?.role === "admin" ? "/admin" : "/"} replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* Routes chỉ được chứa Route con trực tiếp */}
        <Routes>
          {/* --- NHÓM 1: Trang KHÔNG có Sidebar (Login) --- */}
          <Route path="/login" element={<LoginPage />} />

          {/* --- NHÓM 2: Doctor Routes - Protected for Doctor role --- */}
          <Route
            element={
              <ProtectedRoute requiredRole="doctor">
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashBoard />} />
            <Route path="/patient" element={<PatientPage />} />
            <Route path="/patient/:id" element={<PatientDetailPage />} />
            <Route path="/patient/chat/:id" element={<ChatPage />} />
            <Route path="/threshold-alerts" element={<ThresholdAlert />} />
            <Route path="/doctor-profile" element={<DocterProfile />} />
            <Route
              path="/threshold-settings"
              element={<ThresholdSettingsPage />}
            />
          </Route>

          {/* --- NHÓM 3: Admin Routes - Protected for Admin role --- */}
          <Route
            element={
              <ProtectedRoute requiredRole="admin">
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/doctors" element={<DoctorManagement />} />
            <Route path="/admin/patients" element={<PatientManagementAdmin />} />
            <Route path="/admin/nurses" element={<NurseManagement />} />
            <Route path="/admin/system-settings" element={<SystemSettings />} />
            <Route path="/admin/activity-history" element={<ActivityHistory />} />
            <Route path="/admin/departments" element={<DepartmentManagement />} />
            <Route path="/admin/assignments" element={<AssignmentManagement />} />
          </Route>

          {/* Route cho trang không tìm thấy */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
