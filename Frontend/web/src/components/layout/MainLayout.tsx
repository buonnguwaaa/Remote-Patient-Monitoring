import { Outlet } from "react-router-dom";
import SideBar from "./SideBar.tsx";

const MainLayout = () => {
  return (
    <div className="flex h-screen overflow-hidden">
      <SideBar />

      {/* Content Area */}
      <div className="w-full h-full overflow-y-auto pl-14 md:pl-0 transition-all duration-300">
        <Outlet />
      </div>
    </div>
  );
};

export default MainLayout;
