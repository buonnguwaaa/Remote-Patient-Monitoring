import { Outlet } from "react-router-dom";
import SideBar from "./SideBar.tsx";

const MainLayout = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-slate-950">
      <SideBar />
      
      <div className="w-full h-full overflow-y-auto pl-14 md:pl-0 transition-all duration-300 text-slate-900 dark:text-slate-100">
        <Outlet />
      </div>
    </div>
  );
};

export default MainLayout;
