import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";

import "./styles/App.css";

import MainLayout from "./components/layout/MainLayout.tsx";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

import SettingPage from "./pages/SettingPage.tsx";

const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center">
    <div className="text-center">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
      <p className="mt-2 text-sm text-gray-600">Loading...</p>
    </div>
  </div>
);

const LoginPage = lazy(() => import("./pages/LoginPage.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const DashBoard = lazy(() => import("./pages/DashBoard.tsx"));
const PatientPage = lazy(() => import("./pages/PatientPage.tsx"));
const ThresholdAlert = lazy(() => import("./pages/ThresholdAlert.tsx"));
const ThresholdSettingsPage = lazy(
  () => import("./pages/ThresholdSettingsPage.tsx"),
);
const ReminderPage = lazy(() => import("./pages/ReminderPage.tsx"));
const PatientDetailPage = lazy(() => import("./pages/PatientDetailPage.tsx"));
const ChatListPage = lazy(() => import("./pages/ChatListPage.tsx"));
const ChatPage = lazy(() => import("./pages/ChatPage.tsx"));
const DocterProfile = lazy(() => import("./pages/DocterProfile.tsx"));
const PrescriptionPage = lazy(() => import("./pages/PrescriptionPage.tsx"));
const PrescriptionDetailPage = lazy(() => import("./pages/PrescriptionDetailPage.tsx"));
const AppointmentPage = lazy(() => import("./pages/AppointmentPage.tsx"));
const AlertDetailPage = lazy(() => import("./pages/AlertDetailPage.tsx"));

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
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
              <Route path="/login" element={<LoginPage />} />
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
                <Route path="/patient/chats" element={<ChatListPage />} />
                <Route path="/patient/chats/:id" element={<ChatListPage />} />
                <Route path="/patient/chat/:id" element={<ChatPage />} />
                <Route path="/threshold-alerts" element={<ThresholdAlert />} />
                <Route path="/alert/:id" element={<AlertDetailPage />} />
                <Route path="/doctor-profile" element={<DocterProfile />} />
                <Route path="/reminders" element={<ReminderPage />} />
                <Route
                  path="/threshold-settings"
                  element={<ThresholdSettingsPage />}
                />
                <Route path="/settings" element={<SettingPage />} />
                <Route path="/prescriptions" element={<PrescriptionPage />} />
                <Route path="/prescriptions/:id" element={<PrescriptionDetailPage />} />
                <Route path="/appointments" element={<AppointmentPage />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
