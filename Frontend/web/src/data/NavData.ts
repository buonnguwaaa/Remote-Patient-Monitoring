import { type NavigationItem } from "./../types/index.ts";

import { LuLayoutDashboard } from "react-icons/lu";
import { FaRegUser, FaUserMd, FaUserNurse, FaBuilding, FaExchangeAlt } from "react-icons/fa";
import { RiErrorWarningLine } from "react-icons/ri";
import { IoSettingsOutline } from "react-icons/io5";
import { MdAdminPanelSettings } from "react-icons/md";

import React from "react";

// Navigation for Doctor role
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
    icon: React.createElement(IoSettingsOutline),
  },
];

// Navigation for Admin role
export const adminNavData: NavigationItem[] = [
  {
    label: "Bảng điều khiển",
    path: "/admin",
    icon: React.createElement(LuLayoutDashboard),
  },
  {
    label: "Quản lý bác sĩ",
    path: "/admin/doctors",
    icon: React.createElement(FaUserMd),
  },
  {
    label: "Quản lý bệnh nhân",
    path: "/admin/patients",
    icon: React.createElement(FaRegUser),
  },
  {
    label: "Quản lý y tá",
    path: "/admin/nurses",
    icon: React.createElement(FaUserNurse),
  },
  {
    label: "Quản lý khoa phòng",
    path: "/admin/departments",
    icon: React.createElement(FaBuilding),
  },
  {
    label: "Phân công",
    path: "/admin/assignments",
    icon: React.createElement(FaExchangeAlt),
  },
  {
    label: "Cài đặt hệ thống",
    path: "/admin/system-settings",
    icon: React.createElement(MdAdminPanelSettings),
  },
];
