import { Outlet, useLocation } from "react-router-dom";
import SideBar from "./SideBar.tsx";
import QuickChatWidget from "../chat/QuickChatWidget.tsx";

const MainLayout = () => {
  const location = useLocation();
  const isChatRoute = location.pathname.startsWith("/patient/chat");

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-slate-950">
      <SideBar />

      <div className="w-full h-full overflow-y-auto pl-14 md:pl-0 transition-all duration-300">
        <Outlet />
      </div>

      {!isChatRoute ? <QuickChatWidget /> : null}
    </div>
  );
};

export default MainLayout;
