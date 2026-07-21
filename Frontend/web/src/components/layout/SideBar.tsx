import { useState, useEffect } from "react";
import { CiCircleChevLeft, CiCircleChevRight } from "react-icons/ci";
import { FiLogOut } from "react-icons/fi";
import { useTranslation } from "react-i18next";

import { IoMdSettings } from "react-icons/io";
import { type NavigationItem } from "../../types/index.ts";
import { getNavData } from "../../data/NavData.ts";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useRealtimeNotification } from "../../context/RealtimeNotificationContext";
import api from "../../services/api";

interface SideBarProps {
  navigationItems?: NavigationItem[];
}

const DEFAULT_AVATAR = "/default-avatar.svg";

const SideBar = ({ navigationItems }: SideBarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { unreadTotal } = useRealtimeNotification();
  const { t } = useTranslation();

  const itemsToDisplay = navigationItems || getNavData(t);
  const isSettingsActive = location.pathname === "/settings";

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openAlertsCount, setOpenAlertsCount] = useState(0);

  useEffect(() => {
    const fetchOpenAlerts = async () => {
      if (!user?.id) return;
      try {
        const endpoint = user.role === "doctor" ? "/alerts/doctors/me" : user.role === "nurse" ? "/alerts/nurses/me" : null;
        if (!endpoint) return;
        const res = await api.get(`${endpoint}?status=open&limit=1`);
        setOpenAlertsCount(res.data?.total || 0);
      } catch (err) {
        console.error("Failed to fetch open alerts:", err);
      }
    };
    fetchOpenAlerts();
  }, [user?.id, user?.role, unreadTotal]); // Also re-fetch when unreadTotal changes (as a proxy for new chat events)
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
      {}
      {!isCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      <div
        className={`
          h-screen bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700
          flex flex-col transition-all duration-300
          fixed left-0 top-0 z-50 rounded-r-2xl 
          md:relative md:z-auto 
          ${isCollapsed ? "w-14" : "w-80"}
        `}
      >
        <div
          className={`flex items-center p-4 ${
            isCollapsed ? "justify-center" : "justify-between"
          }`}
        >
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <img src="/doctor-logo.png" alt="Doctor App Logo" className="w-10 h-10 rounded-xl shadow-sm object-cover bg-white" />
              <h2 className="font-bold text-2xl text-primary-text dark:text-slate-100 tracking-tight">
                RPM
              </h2>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-primary-text dark:text-slate-300"
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
                      flex items-center py-2 rounded-lg transition-colors relative
                      ${isCollapsed ? "justify-center px-0" : "px-4 gap-3"}
                      ${
                        isActive
                          ? "bg-btn-clicked text-white"
                          : "text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
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
                    {item.path === "/patient/chats" && unreadTotal > 0 && (
                      <span
                        className={`
                          flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold
                          ${isCollapsed ? "absolute -top-1 -right-1 h-4 w-4 min-w-0" : "ml-auto h-5 min-w-[20px] px-1"}
                        `}
                      >
                        {unreadTotal > 99 ? "99+" : unreadTotal}
                      </span>
                    )}
                    {item.path === "/threshold-alerts" && openAlertsCount > 0 && (
                      <span
                        className={`
                          flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold
                          ${isCollapsed ? "absolute -top-1 -right-1 h-4 w-4 min-w-0" : "ml-auto h-5 min-w-[20px] px-1"}
                        `}
                      >
                        {openAlertsCount > 99 ? "99+" : openAlertsCount}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
            <li>
              <Link
                to="/settings"
                onClick={() => {
                  if (window.innerWidth < 768) setIsCollapsed(true);
                }}
                className={`
                  flex items-center py-2 rounded-lg transition-colors
                  ${isCollapsed ? "justify-center px-0" : "px-4 gap-3"}
                  ${
                    isSettingsActive
                      ? "bg-btn-clicked text-white"
                      : "text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                  }
                `}
                title={isCollapsed ? t("nav.settings") : ""}
              >
                <div className="text-2xl shrink-0">
                  <IoMdSettings />
                </div>
                {!isCollapsed && (
                  <span className="text-xl font-semibold whitespace-nowrap overflow-hidden">
                    {t("nav.settings")}
                  </span>
                )}
              </Link>
            </li>
          </ul>
        </nav>

        <div className="px-2 py-4">
          <div
            className={`flex items-center ${
              isCollapsed ? "justify-center px-0" : "px-4 gap-3"
            }`}
            onClick={() => navigate("/doctor-profile")}
            style={{ cursor: "pointer" }}
          >
            <div className="h-12 w-12 rounded-full shrink-0">
              <img
                src={user?.avatarUrl || DEFAULT_AVATAR}
                alt={user?.username || "Doctor avatar"}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = DEFAULT_AVATAR;
                }}
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="font-bold text-lg text-primary-text dark:text-slate-100 leading-tight line-clamp-2">
                  {user?.username || "Doctor Name"}
                </p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center py-2 rounded-md text-xl 
            text-gray-500 dark:text-slate-400 hover:bg-rose-400 hover:text-gray-800 transition duration-400 mt-3"
          >
            <FiLogOut className="mr-1" />
            {!isCollapsed && <span>{t("auth.logout")}</span>}
          </button>
          <div className="mt-16 md:mt-0 "> </div>
        </div>
      </div>
    </>
  );
};

export default SideBar;
