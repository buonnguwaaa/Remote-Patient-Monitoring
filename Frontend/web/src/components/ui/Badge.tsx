// Badge.tsx - Component phụ trợ với React Icons
import React from "react";
import { FaCheck, FaTimes, FaExclamation, FaInfoCircle } from "react-icons/fa";

type BadgeProps = {
  variant?: "success" | "danger" | "warning" | "info" | "primary" | "secondary";
  children: React.ReactNode;
  className?: string;
  icon?: boolean;
};

const Badge: React.FC<BadgeProps> = ({
  variant = "primary",
  children,
  className = "",
  icon = false,
}) => {
  const variantClasses = {
    success: "bg-green-100 text-green-800 border-green-200",
    danger: "bg-red-100 text-red-800 border-red-200",
    warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
    info: "bg-blue-100 text-blue-800 border-blue-200",
    primary: "bg-indigo-100 text-indigo-800 border-indigo-200",
    secondary: "bg-gray-100 text-gray-800 border-gray-200",
  };

  const icons = {
    success: <FaCheck className="w-3 h-3 mr-1" />,
    danger: <FaTimes className="w-3 h-3 mr-1" />,
    warning: <FaExclamation className="w-3 h-3 mr-1" />,
    info: <FaInfoCircle className="w-3 h-3 mr-1" />,
    primary: null,
    secondary: null,
  };

  return (
    <span
      className={`
      inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border
      ${variantClasses[variant]}
      ${className}
    `}
    >
      {icon && icons[variant]}
      {children}
    </span>
  );
};

export default Badge;
