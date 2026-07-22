import React from "react";
import { NotificationBell } from "../ui/NotificationBell";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

const Header: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const DEFAULT_AVATAR = "/avartar.jpg";

  return (
    <header className="h-14 shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 flex items-center justify-between z-30">
      <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">
        Admin Dashboard
      </div>

      <div className="flex items-center gap-4">
        <NotificationBell />

        <div
          onClick={() => navigate("/doctor-profile")}
          className="flex items-center gap-2.5 pl-3 border-l border-gray-200 dark:border-gray-800 cursor-pointer hover:opacity-80 transition"
        >
          <img
            src={user?.avatarUrl || DEFAULT_AVATAR}
            alt="Avatar"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = DEFAULT_AVATAR;
            }}
            className="h-8 w-8 rounded-full object-cover"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden sm:inline truncate max-w-[150px]">
            {user?.name || "Admin"}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;
