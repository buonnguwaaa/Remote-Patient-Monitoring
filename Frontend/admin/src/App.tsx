import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";

import "./styles/App.css";

// Eager load only critical components
import MainLayout from "./components/layout/MainLayout.tsx";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

// Loading component
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center">
    <div className="text-center">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
      <p className="mt-2 text-sm text-gray-600">Loading...</p>
    </div>
  </div>
);

// Lazy load all admin pages
const AdminDashboard = lazy(() => import("./pages/AdminDashboard.tsx"));
const DoctorManagement = lazy(() => import("./pages/DoctorManagement.tsx"));
const PatientManagementAdmin = lazy(() => import("./pages/PatientManagementAdmin.tsx"));
const NurseManagement = lazy(() => import("./pages/NurseManagement.tsx"));
const SystemSettings = lazy(() => import("./pages/SystemSettings.tsx"));
const ActivityHistory = lazy(() => import("./pages/ActivityHistory.tsx"));
const DepartmentManagement = lazy(() => import("./pages/DepartmentManagement.tsx"));
const AssignmentManagement = lazy(() => import("./pages/AssignmentManagement.tsx"));

// Login page
const LoginPage = lazy(() => import("./pages/LoginPage.tsx"));

// Protected Route Component with admin role checking
const ProtectedRoute = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen w-full items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Only allow admin users
  if (user?.role !== "admin") {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Login Route */}
              <Route path="/login" element={<LoginPage />} />

              {/* Admin Routes - Protected for Admin role only */}
              <Route
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<AdminDashboard />} />
                <Route path="/doctors" element={<DoctorManagement />} />
                <Route path="/patients" element={<PatientManagementAdmin />} />
                <Route path="/nurses" element={<NurseManagement />} />
                <Route path="/system-settings" element={<SystemSettings />} />
                <Route path="/activity-history" element={<ActivityHistory />} />
                <Route path="/departments" element={<DepartmentManagement />} />
                <Route path="/assignments" element={<AssignmentManagement />} />
              </Route>

              {/* Redirect all other routes to dashboard */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
