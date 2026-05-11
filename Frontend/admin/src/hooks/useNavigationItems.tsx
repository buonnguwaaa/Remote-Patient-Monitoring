import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { type NavigationItem } from "../types/index.ts";
import { LuLayoutDashboard } from "react-icons/lu";
import { FaRegUser, FaUserMd, FaUserNurse, FaBuilding, FaExchangeAlt } from "react-icons/fa";
import { RiErrorWarningLine } from "react-icons/ri";
import { IoSettingsOutline } from "react-icons/io5";
import { MdAdminPanelSettings } from "react-icons/md";
import React from "react";

export const useNavigationItems = (role: "admin" | "doctor" | "nurse" = "doctor"): NavigationItem[] => {
  const { t } = useTranslation();

  const navData: NavigationItem[] = useMemo(() => [
    {
      label: t("sidebar.dashboard"),
      path: "/",
      icon: React.createElement(LuLayoutDashboard),
    },
    {
      label: t("sidebar.patientProfile"),
      path: "/patient",
      icon: React.createElement(FaRegUser),
    },
    {
      label: t("sidebar.alertManagement"),
      path: "/threshold-alerts",
      icon: React.createElement(RiErrorWarningLine),
    },
    {
      label: t("sidebar.thresholdSettings"),
      path: "/threshold-settings",
      icon: React.createElement(IoSettingsOutline),
    },
  ], [t]);

  const adminNavData: NavigationItem[] = useMemo(() => [
    {
      label: t("sidebar.dashboard"),
      path: "/",
      icon: React.createElement(LuLayoutDashboard),
    },
    {
      label: t("sidebar.doctorManagement"),
      path: "/doctors",
      icon: React.createElement(FaUserMd),
    },
    {
      label: t("sidebar.patientManagement"),
      path: "/patients",
      icon: React.createElement(FaRegUser),
    },
    {
      label: t("sidebar.nurseManagement"),
      path: "/nurses",
      icon: React.createElement(FaUserNurse),
    },
    {
      label: t("sidebar.departmentManagement"),
      path: "/departments",
      icon: React.createElement(FaBuilding),
    },
    {
      label: t("sidebar.assignments"),
      path: "/assignments",
      icon: React.createElement(FaExchangeAlt),
    },
    {
      label: t("sidebar.systemSettings"),
      path: "/system-settings",
      icon: React.createElement(MdAdminPanelSettings),
    },
  ], [t]);

  return role === "admin" ? adminNavData : navData;
};
