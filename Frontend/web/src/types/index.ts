export interface NavigationItem {
  label: string;
  path: string;
  icon?: React.ReactNode;
}

export interface WarnItem {
  name: string;
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  bloodSugar?: number;

  message?: string;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface StatItem {
  id: string;
  label: string;
  value: number;
  type: "primary" | "warning" | "neutral";
}
