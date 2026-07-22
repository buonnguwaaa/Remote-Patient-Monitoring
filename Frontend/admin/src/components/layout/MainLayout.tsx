import { Outlet } from "react-router-dom";
import SideBar from "./SideBar.tsx";
import Header from "./Header.tsx";

const MainLayout = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-slate-950">
      <SideBar />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden pl-14 md:pl-0 transition-all duration-300">
        <Header />
        <div className="flex-1 overflow-y-auto text-slate-900 dark:text-slate-100">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
