import { useState } from "react"; // 1. Import useState
import {
  TbLayoutSidebarLeftCollapseFilled,
  TbLayoutSidebarRightCollapseFilled,
} from "react-icons/tb";
import { FiLogOut } from "react-icons/fi"; // Icon Logout
import { type NavigationItem } from "../../types/index.ts";
import { navData } from "../../data/NavData.ts";
import { Link, useLocation } from "react-router-dom";

interface SideBarProps {
  navigationItems?: NavigationItem[];
}

const SideBar = ({ navigationItems = navData }: SideBarProps) => {
  const location = useLocation();
  const itemsToDisplay = navigationItems || navData;

  // 2. State quản lý đóng/mở
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      // 3. Width động: w-20 khi đóng, w-64 (hoặc w-48) khi mở
      className={`h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
        isCollapsed ? "w-14" : "w-48"
      }`}
    >
      {/* --- HEADER --- */}
      <div
        className={`flex items-center p-4 ${
          isCollapsed ? "justify-center" : "justify-between"
        }`}
      >
        {/* Ẩn chữ RPM khi thu nhỏ */}
        {!isCollapsed && (
          <h2 className="font-bold text-xl text-primary-text">RPM</h2>
        )}

        {/* Nút toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-primary-text"
        >
          {isCollapsed ? (
            <TbLayoutSidebarRightCollapseFilled size={24} />
          ) : (
            <TbLayoutSidebarLeftCollapseFilled size={24} />
          )}
        </button>
      </div>

      {/* --- NAVIGATION --- */}
      <nav className="flex-1 mt-4 px-2 overflow-y-auto">
        <ul className="space-y-2">
          {itemsToDisplay.map((item) => {
            const isActive = location.pathname === item.path;

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`
                    flex items-center py-2 rounded-lg transition-colors
                    ${isCollapsed ? "justify-center px-0" : "px-4 gap-3"}
                    ${
                      isActive
                        ? "bg-btn-clicked text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }
                  `}
                  title={isCollapsed ? item.label : ""} // Tooltip khi thu nhỏ
                >
                  {/* Icon */}
                  {item.icon && (
                    <div className="text-base shrink-0">{item.icon}</div>
                  )}

                  {/* Label: Ẩn hoàn toàn khi collapsed để tránh vỡ layout */}
                  {!isCollapsed && (
                    <span className="text-sm whitespace-nowrap overflow-hidden">
                      {item.label}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* --- FOOTER (USER & LOGOUT) --- */}
      <div className="p-4 ">
        <div
          className={`flex items-center ${
            isCollapsed ? "justify-center" : "gap-3"
          }`}
        >
          {/* Avatar giả lập */}
          <div className="h-8 w-8 rounded-full  shrink-0">
            <img
              src="https://avatar.iran.liara.run/public"
              alt="User Avatar"
              className="w-full h-full rounded-full object-cover"
            />
          </div>

          {/* Thông tin User: Ẩn khi thu nhỏ */}
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-gray-800 truncate">
                Doctor Name
              </p>
            </div>
          )}
        </div>
        {/* Nút Logout */}
        <button className="flex w-full items-center justify-center py-2 rounded-md text-sm text-gray-500 hover:bg-hover mt-3">
          <FiLogOut className="mr-1" />
          {!isCollapsed && <span>Đăng xuất</span>}
        </button>
      </div>
    </div>
  );
};

export default SideBar;
