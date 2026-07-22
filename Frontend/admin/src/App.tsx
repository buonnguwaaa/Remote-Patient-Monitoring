import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";

import "./styles/App.css";

import MainLayout from "./components/layout/MainLayout.tsx";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { RealtimeNotificationProvider } from "./context/RealtimeNotificationContext";

const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center">
    <div className="text-center">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
      <p className="mt-2 text-sm text-gray-600">Loading...</p>
    </div>
  </div>
);

const AdminDashboard = lazy(() => import("./pages/AdminDashboard.tsx"));
const DoctorManagement = lazy(() => import("./pages/DoctorManagement.tsx"));
const PatientManagementAdmin = lazy(() => import("./pages/PatientManagementAdmin.tsx"));
const NurseManagement = lazy(() => import("./pages/NurseManagement.tsx"));
const SystemSettings = lazy(() => import("./pages/SystemSettings.tsx"));
const ActivityHistory = lazy(() => import("./pages/ActivityHistory.tsx"));
const DepartmentManagement = lazy(() => import("./pages/DepartmentManagement.tsx"));
const AssignmentManagement = lazy(() => import("./pages/AssignmentManagement.tsx"));

const LoginPage = lazy(() => import("./pages/LoginPage.tsx"));

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

  if (user?.role !== "admin") {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RealtimeNotificationProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />

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

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </RealtimeNotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
