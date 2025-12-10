import { Outlet } from "react-router-dom";
import SideBar from "./SideBar.tsx";

const MainLayout = () => {
  return (
    <div className="flex h-screen overflow-hidden">
      <SideBar />
      <div className="w-full h-full overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default MainLayout;
