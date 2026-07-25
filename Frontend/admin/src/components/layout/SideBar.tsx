import { useState, useEffect } from "react";
import { CiCircleChevLeft, CiCircleChevRight } from "react-icons/ci";
import { FiLogOut } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { type NavigationItem } from "../../types/index.ts";
import { useNavigationItems } from "../../hooks/useNavigationItems";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

interface SideBarProps {
  navigationItems?: NavigationItem[];
}

const SideBar = ({ navigationItems }: SideBarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, getUserRole } = useAuth();
  const { t } = useTranslation();

  const userRole = getUserRole();
  const defaultNavItems = useNavigationItems(userRole as "admin" | "doctor" | "nurse");
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
          h-screen bg-[#F8FAFC] dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-sm
          flex flex-col transition-all duration-300
          fixed left-0 top-0 z-50 
          md:relative md:z-auto 
          ${isCollapsed ? "w-16" : "w-64"}
        `}
      >
        <div
          className={`flex items-center h-20 ${isCollapsed ? "justify-center" : "justify-between px-6"
            }`}
        >
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <img src="/doctor-logo.png" alt="Admin App Logo" className="w-10 h-10 rounded-xl shadow-sm object-cover bg-white border border-slate-200" />
              <h2 className="font-bold text-2xl text-slate-900 dark:text-white tracking-tight">RPM</h2>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            {isCollapsed ? (
              <CiCircleChevRight size={32} />
            ) : (
              <CiCircleChevLeft size={32} />
            )}
          </button>
        </div>

        <nav className="flex-1 mt-6 px-3 overflow-y-auto custom-scrollbar">
          {userRole === "admin" ? (
            <>
              {/* Group: Tổng quan */}
              <div className="mb-6">
                {!isCollapsed && <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-3">Tổng quan</div>}
                <ul className="space-y-1">
                  {itemsToDisplay.filter(i => ["/"].includes(i.path)).map((item) => (
                    <NavItem key={item.path} item={item} isActive={location.pathname === item.path} isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
                  ))}
                </ul>
              </div>
              
              {/* Group: Quản lý */}
              <div className="mb-6">
                {!isCollapsed && <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-3">Quản lý</div>}
                <ul className="space-y-1">
                  {itemsToDisplay.filter(i => ["/doctors", "/patients", "/nurses", "/departments", "/assignments"].includes(i.path)).map((item) => (
                    <NavItem key={item.path} item={item} isActive={location.pathname === item.path} isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
                  ))}
                </ul>
              </div>

              {/* Group: Hệ thống */}
              <div className="mb-6">
                {!isCollapsed && <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-3">Hệ thống</div>}
                <ul className="space-y-1">
                  {itemsToDisplay.filter(i => ["/system-settings"].includes(i.path)).map((item) => (
                    <NavItem key={item.path} item={item} isActive={location.pathname === item.path} isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <ul className="space-y-1">
              {itemsToDisplay.map((item) => (
                <NavItem key={item.path} item={item} isActive={location.pathname === item.path} isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
              ))}
            </ul>
          )}
        </nav>
        
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50">
          <button
            onClick={handleLogout}
            className={`flex w-full items-center py-2.5 rounded-lg text-sm
            text-slate-500 dark:text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 transition-colors
            ${isCollapsed ? "justify-center" : "px-3 gap-3"}`}
          >
            <FiLogOut className="text-xl shrink-0" />
            {!isCollapsed && <span className="font-medium">{t("sidebar.logout")}</span>}
          </button>
        </div>
      </div>
    </>
  );
};

const NavItem = ({ item, isActive, isCollapsed, setIsCollapsed }: { item: any, isActive: boolean, isCollapsed: boolean, setIsCollapsed: (v: boolean) => void }) => {
  return (
    <li>
      <Link
        to={item.path}
        onClick={() => {
          if (window.innerWidth < 768) setIsCollapsed(true);
        }}
        className={`
          flex items-center py-2.5 rounded-lg transition-all relative group
          ${isCollapsed ? "justify-center px-0" : "px-3 gap-3"}
          ${isActive
            ? "bg-blue-50 text-blue-700 font-semibold dark:bg-blue-900/30 dark:text-blue-400"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200 font-medium"
          }
        `}
        title={isCollapsed ? item.label : ""}
      >
        {isActive && !isCollapsed && (
          <div className="absolute left-0 top-2 bottom-2 w-1 bg-blue-600 dark:bg-blue-400 rounded-r-md"></div>
        )}
        {item.icon && (
          <div className={`text-[1.1rem] shrink-0 transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'}`}>
            {item.icon}
          </div>
        )}
        {!isCollapsed && (
          <span className="text-sm whitespace-nowrap overflow-hidden">
            {item.label}
          </span>
        )}
      </Link>
    </li>
  );
};

export default SideBar;
