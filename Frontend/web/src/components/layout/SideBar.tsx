import { useState, useEffect } from "react";
import { CiCircleChevLeft, CiCircleChevRight } from "react-icons/ci";
import { FiLogOut } from "react-icons/fi";
import { type NavigationItem } from "../../types/index.ts";
import { navData } from "../../data/NavData.ts";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

interface SideBarProps {
  navigationItems?: NavigationItem[];
}

const SideBar = ({ navigationItems }: SideBarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const itemsToDisplay = navigationItems || navData;

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
          h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-300
          fixed left-0 top-0 z-50 rounded-r-2xl border-r-2
          md:relative md:z-auto 
          ${isCollapsed ? "w-14" : "w-80"}
        `}
      >
        <div
          className={`flex items-center p-4 ${isCollapsed ? "justify-center" : "justify-between"
            }`}
        >
          {!isCollapsed && (
            <h2 className="font-bold text-2xl text-primary-text">RPM</h2>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-primary-text"
          >
            {isCollapsed ? (
              <CiCircleChevRight size={32} />
            ) : (
              <CiCircleChevLeft size={32} />
            )}
          </button>
        </div>

        <nav className="flex-1 mt-4 px-2 overflow-y-auto">
          <ul className="space-y-2">
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
                      flex items-center py-2 rounded-lg transition-colors
                      ${isCollapsed ? "justify-center px-0" : "px-4 gap-3"}
                      ${isActive
                        ? "bg-btn-clicked text-white"
                        : "text-gray-600 hover:bg-gray-100"
                      }
                    `}
                    title={isCollapsed ? item.label : ""}
                  >
                    {item.icon && (
                      <div className="text-2xl shrink-0">{item.icon}</div>
                    )}
                    {!isCollapsed && (
                      <span className="text-xl font-semibold whitespace-nowrap overflow-hidden">
                        {item.label}
                      </span>
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
                <p className="font-bold text-xl text-primary-text truncate">
                  {user?.username || "Doctor Name"}
                </p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center py-2 rounded-md text-xl 
            text-gray-500 hover:bg-rose-400 hover:text-gray-800 transition duration-400 mt-3"
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
