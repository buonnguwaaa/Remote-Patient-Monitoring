export const mockWarnList = [
  {
    name: "Nguyễn Văn A",
    systolic: 150,
    diastolic: 95,
    heartRate: 85,
    bloodSugar: 180,
    message: "Huyết áp cao",
  },
  {
    name: "Trần Thị B",
    systolic: 85,
    diastolic: 55,
    heartRate: 60,
    bloodSugar: 90,
    message: "Huyết áp thấp",
  },
  {
    name: "Lê Văn C",
    systolic: 120,
    diastolic: 80,
    heartRate: 110,
    bloodSugar: 150,
    message: "Nhịp tim cao",
  },
  {
    name: "Phạm Thị D",
    systolic: 130,
    diastolic: 85,
    heartRate: 75,
    bloodSugar: 250,
    message: "Đường huyết cao",
  },
];

export const mockPatientList = [
  {
    id: "1",
    name: "Nguyễn Văn A",
    status: "warning",
  },
  {
    id: "2",
    name: "Trần Thị B",
    status: "normal",
  },
  {
    id: "3",
    name: "Lê Văn C",
    status: "warning",
  },
];

// Mock Alerts Data
import type { Alert } from "../types";

export const mockAlerts: Alert[] = [
  {
    id: "alert_1",
    patientId: "1",
    patientName: "Nguyễn Văn A",
    patientAvatar: "https://i.pravatar.cc/150?img=12",
    violations: [
      {
        type: "systolic",
        rule: "systolic_max",
        observed: 160,
        threshold: 140,
        severity: "high",
      },
      {
        type: "glucose",
        rule: "glucose_max",
        observed: 220,
        threshold: 180,
        severity: "high",
      },
    ],
    status: "open",
    severity: "high",
    createdAt: "2025-12-10T08:30:00Z",
  },
  {
    id: "alert_2",
    patientId: "2",
    patientName: "Trần Thị B",
    patientAvatar: "https://i.pravatar.cc/150?img=5",
    violations: [
      {
        type: "diastolic",
        rule: "diastolic_min",
        observed: 50,
        threshold: 60,
        severity: "info",
      },
    ],
    status: "open",
    severity: "info",
    createdAt: "2025-12-10T07:15:00Z",
  },
  {
    id: "alert_3",
    patientId: "3",
    patientName: "Lê Văn C",
    patientAvatar: "https://i.pravatar.cc/150?img=33",
    violations: [
      {
        type: "pulse",
        rule: "pulse_max",
        observed: 115,
        threshold: 100,
        severity: "high",
      },
    ],
    status: "ack",
    severity: "high",
    acknowledgedBy: "Dr. Minh",
    acknowledgedAt: "2025-12-10T09:00:00Z",
    createdAt: "2025-12-10T06:45:00Z",
  },
  {
    id: "alert_4",
    patientId: "1",
    patientName: "Nguyễn Văn A",
    patientAvatar: "https://i.pravatar.cc/150?img=12",
    violations: [
      {
        type: "glucose",
        rule: "glucose_max",
        observed: 250,
        threshold: 180,
        severity: "high",
      },
    ],
    status: "open",
    severity: "high",
    createdAt: "2025-12-09T20:30:00Z",
  },
  {
    id: "alert_5",
    patientId: "4",
    patientName: "Phạm Thị D",
    patientAvatar: "https://i.pravatar.cc/150?img=10",
    violations: [
      {
        type: "systolic",
        rule: "systolic_max",
        observed: 145,
        threshold: 140,
        severity: "info",
      },
    ],
    status: "ack",
    severity: "info",
    acknowledgedBy: "Dr. Hoa",
    acknowledgedAt: "2025-12-09T22:00:00Z",
    createdAt: "2025-12-09T19:00:00Z",
  },
];
