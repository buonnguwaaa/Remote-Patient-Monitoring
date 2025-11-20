import { Outlet } from "react-router-dom";
import SideBar from "./SideBar.tsx";

const MainLayout = () => {
  return (
    <div className="flex h-screen">
      <SideBar />
      <div className="w-full h-full">
        <Outlet />
      </div>
    </div>
  );
};

export default MainLayout;
