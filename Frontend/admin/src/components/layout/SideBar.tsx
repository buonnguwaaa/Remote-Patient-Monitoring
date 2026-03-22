import { useState, useEffect } from "react";
import {
  TbLayoutSidebarLeftCollapseFilled,
  TbLayoutSidebarRightCollapseFilled,
} from "react-icons/tb";
import { FiLogOut } from "react-icons/fi";
import { MdDarkMode, MdLightMode } from "react-icons/md";
import { type NavigationItem } from "../../types/index.ts";
import { navData, adminNavData } from "../../data/NavData.ts";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

interface SideBarProps {
  navigationItems?: NavigationItem[];
}

const SideBar = ({ navigationItems }: SideBarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, getUserRole } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const userRole = getUserRole();
  const defaultNavItems = userRole === "admin" ? adminNavData : navData;
  const itemsToDisplay = navigationItems || defaultNavItems;

  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsCollapsed(true);
      }
    };
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      { }
      {!isCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      <div
        className={`
          h-screen bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300
          
          /* --- LOGIC QUAN TRỌNG Ở ĐÂY --- */
          /* Mobile: Luôn Fixed đè lên content, Z-index cao hơn backdrop */
          fixed left-0 top-0 z-50 
          
          /* Desktop (md): Trở về Relative để đẩy content sang phải */
          md:relative md:z-auto

          ${isCollapsed ? "w-14" : "w-80"}
        `}
      >
        <div
          className={`flex items-center p-4 ${isCollapsed ? "justify-center" : "justify-between"
            }`}
        >
          {!isCollapsed && (
            <h2 className="font-bold text-2xl text-primary-text dark:text-white">RPM</h2>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-primary-text dark:text-gray-200"
          >
            {isCollapsed ? (
              <TbLayoutSidebarRightCollapseFilled size={32} />
            ) : (
              <TbLayoutSidebarLeftCollapseFilled size={32} />
            )}
          </button>
        </div>

        <nav className="flex-1 mt-4 px-2 overflow-y-auto">
          <ul className="space-y-1">
            {itemsToDisplay.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => {
                      if (window.innerWidth < 768) setIsCollapsed(true);
                    }}
                    className={`
                      flex items-center py-2.5 rounded-lg transition-all duration-200
                      ${isCollapsed ? "justify-center px-0" : "px-4 gap-3"}
                      ${isActive
                        ? "bg-btn-clicked text-white shadow-md shadow-blue-200 dark:shadow-blue-900 scale-[1.02]"
                        : "text-gray-500 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700 hover:text-btn-clicked dark:hover:text-white"
                      }
                    `}
                    title={isCollapsed ? item.label : ""}
                  >
                    {item.icon && (
                      <div className={`text-2xl shrink-0 transition-transform duration-200 ${isActive ? "scale-110" : ""}`}>
                        {item.icon}
                      </div>
                    )}
                    {!isCollapsed && (
                      <span className={`text-base font-semibold whitespace-nowrap overflow-hidden ${isActive ? "font-bold" : ""}`}>
                        {item.label}
                      </span>
                    )}
                    {isCollapsed && isActive && (
                      <span className="absolute left-1 w-1 h-8 bg-btn-clicked rounded-r-full" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="px-2 py-4">
          <div
            className={`flex items-center ${isCollapsed ? "justify-center px-0" : "px-4 gap-3"
              }`}
            onClick={() => navigate("/doctor-profile")}
            style={{ cursor: "pointer" }}
          >
            <div className="h-12 w-12 rounded-full shrink-0">
              <img
                src="https://avatar.iran.liara.run/public"
                alt="User Avatar"
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="font-bold text-xl text-primary-text dark:text-white truncate">
                  {user?.username || "Doctor Name"}
                </p>
              </div>
            )}
          </div>
          {/* Toggle Dark/Light Mode */}
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Chuyển sang Light Mode" : "Chuyển sang Dark Mode"}
            className={`
              flex w-full items-center py-2 rounded-lg mt-1
              text-gray-500 dark:text-gray-300
              hover:bg-blue-50 dark:hover:bg-gray-700
              hover:text-btn-clicked dark:hover:text-yellow-300
              transition-all duration-200
              ${isCollapsed ? "justify-center px-0" : "px-4 gap-3"}
            `}
          >
            <span className="text-2xl transition-transform duration-300">
              {theme === "dark" ? <MdDarkMode /> : <MdLightMode className="text-orange-400" />}
            </span>
            {!isCollapsed && (
              <span className="text-base font-semibold">
                {theme === "dark" ? "Dark Mode" : "Light Mode"}
              </span>
            )}
          </button>

          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center py-2 rounded-md text-xl 
            text-gray-500 hover:bg-rose-400 hover:text-gray-800 transition duration-400 mt-1"
          >
            <FiLogOut className="mr-1" />
            {!isCollapsed && <span>Đăng xuất</span>}
          </button>
          <div className="mt-16 md:mt-0 "> </div>
        </div>
      </div>
    </>
  );
};

export default SideBar;
