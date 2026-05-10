import { Outlet, useLocation } from "react-router-dom";
import SideBar from "./SideBar.tsx";
import QuickChatWidget from "../chat/QuickChatWidget.tsx";
import { RealtimeNotificationProvider } from "../../context/RealtimeNotificationContext.tsx";

const MainLayout = () => {
  const location = useLocation();
  const isChatRoute = location.pathname.startsWith("/patient/chat");

  return (
    <RealtimeNotificationProvider>
      <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-slate-950">
        <SideBar />

        <div className="w-full h-full overflow-y-auto pl-14 md:pl-0 transition-all duration-300">
          <Outlet />
        </div>

        {!isChatRoute ? <QuickChatWidget /> : null}
      </div>
    </RealtimeNotificationProvider>
  );
};

export default MainLayout;
