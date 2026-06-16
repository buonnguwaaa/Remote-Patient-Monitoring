import { type NavigationItem } from "./../types/index.ts";

import { LuLayoutDashboard } from "react-icons/lu";
import { FaRegUser, FaNotesMedical } from "react-icons/fa";
import { RiErrorWarningLine } from "react-icons/ri";
import { TiMessage } from "react-icons/ti";
import {
  MdOutlineDataThresholding,
  MdOutlineNotificationsActive,
} from "react-icons/md";

import React from "react";

export const getNavData = (t: (key: string) => string): NavigationItem[] => [
  {
    label: t("nav.dashboard"),
    path: "/",
    icon: React.createElement(LuLayoutDashboard),
  },
  {
    label: t("nav.patients"),
    path: "/patient",
    icon: React.createElement(FaRegUser),
  },
  {
    label: t("nav.messages"),
    path: "/patient/chats",
    icon: React.createElement(TiMessage),
  },
  {
    label: t("nav.alerts"),
    path: "/threshold-alerts",
    icon: React.createElement(RiErrorWarningLine),
  },
  {
    label: t("nav.thresholds"),
    path: "/threshold-settings",
    icon: React.createElement(MdOutlineDataThresholding),
  },
  {
    label: t("nav.reminders"),
    path: "/reminders",
    icon: React.createElement(MdOutlineNotificationsActive),
  },
  {
    label: t("nav.prescriptions"),
    path: "/prescriptions",
    icon: React.createElement(FaNotesMedical),
  },
];
