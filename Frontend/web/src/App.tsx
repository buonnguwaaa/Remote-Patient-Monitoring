import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";

import "./styles/App.css";

// Eager load only critical components
import MainLayout from "./components/layout/MainLayout.tsx";
import { AuthProvider, useAuth } from "./context/AuthContext";

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


// Protected Route Component - only for doctors
const ProtectedRoute = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen w-full items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
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

            {/* --- NHÓM 2: Doctor Routes - Protected --- */}
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
              <Route path="/patient/chat/:id" element={<ChatPage />} />
              <Route path="/threshold-alerts" element={<ThresholdAlert />} />
              <Route path="/doctor-profile" element={<DocterProfile />} />
              <Route
                path="/threshold-settings"
                element={<ThresholdSettingsPage />}
              />
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

