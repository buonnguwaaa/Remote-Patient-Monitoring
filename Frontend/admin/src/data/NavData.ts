import { type NavigationItem } from "./../types/index.ts";

import { LuLayoutDashboard } from "react-icons/lu";
import { FaRegUser, FaUserMd, FaUserNurse, FaBuilding, FaExchangeAlt } from "react-icons/fa";
import { RiErrorWarningLine } from "react-icons/ri";
import { IoSettingsOutline } from "react-icons/io5";
import { MdAdminPanelSettings } from "react-icons/md";

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
    icon: React.createElement(IoSettingsOutline),
  },
];

export const adminNavData: NavigationItem[] = [
  {
    label: "Bảng điều khiển",
    path: "/",
    icon: React.createElement(LuLayoutDashboard),
  },
  {
    label: "Quản lý bác sĩ",
    path: "/doctors",
    icon: React.createElement(FaUserMd),
  },
  {
    label: "Quản lý bệnh nhân",
    path: "/patients",
    icon: React.createElement(FaRegUser),
  },
  {
    label: "Quản lý y tá",
    path: "/nurses",
    icon: React.createElement(FaUserNurse),
  },
  {
    label: "Quản lý khoa phòng",
    path: "/departments",
    icon: React.createElement(FaBuilding),
  },
  {
    label: "Phân công",
    path: "/assignments",
    icon: React.createElement(FaExchangeAlt),
  },
  {
    label: "Cài đặt hệ thống",
    path: "/system-settings",
    icon: React.createElement(MdAdminPanelSettings),
  },
];

