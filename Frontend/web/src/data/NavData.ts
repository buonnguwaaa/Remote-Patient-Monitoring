import { type NavigationItem } from "./../types/index.ts";

import { LuLayoutDashboard } from "react-icons/lu";
import { FaRegUser } from "react-icons/fa";
import { RiErrorWarningLine } from "react-icons/ri";
import { CiViewList } from "react-icons/ci";

import React from "react";

export const navData: NavigationItem[] = [
  {
    label: "Dashboard",
    path: "/",
    icon: React.createElement(LuLayoutDashboard),
  },
  {
    label: "Hồ sơ bệnh nhân",
    path: "/patient-profile",
    icon: React.createElement(FaRegUser),
  },
  {
    label: "Cảnh báo ngưỡng",
    path: "/threshold-alerts",
    icon: React.createElement(RiErrorWarningLine),
  },
  {
    label: "Danh sách cảnh báo",
    path: "/warn-list",
    icon: React.createElement(CiViewList),
  },

  // Thêm các mục điều hướng khác tại đây
];
