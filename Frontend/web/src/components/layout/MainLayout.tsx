import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import SideBar from "./SideBar.tsx";
import QuickChatWidget from "../chat/QuickChatWidget.tsx";
import NotificationWidget from "./NotificationWidget.tsx";
import { RealtimeNotificationProvider } from "../../context/RealtimeNotificationContext.tsx";

const MainLayout = () => {
  const location = useLocation();
  const isChatRoute = location.pathname.startsWith("/patient/chat");
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <RealtimeNotificationProvider>
      <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-slate-950">
        <SideBar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />

        <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
          {/* Mobile Top Header */}
          <header className="md:hidden flex items-center justify-between bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-4 py-3 shrink-0 z-30 shadow-sm">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileOpen(true)}
                className="p-1.5 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                aria-label="Open sidebar"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="flex items-center gap-2">
                <img src="/doctor-logo.png" alt="Doctor App Logo" className="w-8 h-8 rounded-lg object-cover bg-white shadow-sm" />
                <span className="font-bold text-xl text-primary-text dark:text-slate-100 tracking-tight">
                  RPM
                </span>
              </div>
            </div>
          </header>

          <div className="w-full flex-1 overflow-y-auto pl-0 transition-all duration-300">
            <Outlet />
          </div>
        </div>

        {!isChatRoute ? <QuickChatWidget /> : null}
        <NotificationWidget />
      </div>
    </RealtimeNotificationProvider>
  );
};

export default MainLayout;
