import { type NavigationItem } from "./../types/index.ts";

import { LuLayoutDashboard } from "react-icons/lu";
import { FaRegUser } from "react-icons/fa";
import { RiErrorWarningLine } from "react-icons/ri";
import { MdOutlineDataThresholding } from "react-icons/md";

import React from "react";

export const navData: NavigationItem[] = [
  {
    label: "Bảng điều khiển",
    path: "/",
    icon: React.createElement(LuLayoutDashboard),
  },
  {
    label: "Hồ sơ bệnh nhân",
    path: "/patient",
    icon: React.createElement(FaRegUser),
  },
  {
    label: "Quản lý cảnh báo",
    path: "/threshold-alerts",
    icon: React.createElement(RiErrorWarningLine),
  },
  {
    label: "Cấu hình ngưỡng",
    path: "/threshold-settings",
    icon: React.createElement(MdOutlineDataThresholding),
  },
];

