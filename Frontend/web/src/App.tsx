import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";

import "./styles/App.css";

// Eager load only critical components
import MainLayout from "./components/layout/MainLayout.tsx";
import { AuthProvider, useAuth, type UserRole } from "./context/AuthContext";

// Loading component
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center">
    <div className="text-center">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
      <p className="mt-2 text-sm text-gray-600">Loading...</p>
    </div>
  </div>
);

// Lazy load all pages for better performance
// Login page - loaded immediately as it's the entry point
const LoginPage = lazy(() => import("./pages/LoginPage.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

// Doctor pages - only loaded when doctor accesses them
const DashBoard = lazy(() => import("./pages/DashBoard.tsx"));
const PatientPage = lazy(() => import("./pages/PatientPage.tsx"));
const ThresholdAlert = lazy(() => import("./pages/ThresholdAlert.tsx"));
const ThresholdSettingsPage = lazy(() => import("./pages/ThresholdSettingsPage.tsx"));
const PatientDetailPage = lazy(() => import("./pages/PatientDetailPage.tsx"));
const ChatPage = lazy(() => import("./pages/ChatPage.tsx"));
const DocterProfile = lazy(() => import("./pages/DocterProfile.tsx"));

// Admin pages - only loaded when admin accesses them
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard.tsx"));
const DoctorManagement = lazy(() => import("./pages/admin/DoctorManagement.tsx"));
const PatientManagementAdmin = lazy(() => import("./pages/admin/PatientManagementAdmin.tsx"));
const NurseManagement = lazy(() => import("./pages/admin/NurseManagement.tsx"));
const SystemSettings = lazy(() => import("./pages/admin/SystemSettings.tsx"));
const ActivityHistory = lazy(() => import("./pages/admin/ActivityHistory.tsx"));
const DepartmentManagement = lazy(() => import("./pages/admin/DepartmentManagement.tsx"));
const AssignmentManagement = lazy(() => import("./pages/admin/AssignmentManagement.tsx"));

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
        <Suspense fallback={<PageLoader />}>
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
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
