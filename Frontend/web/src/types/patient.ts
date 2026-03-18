export interface AssignmentResponse {
  id: string;
  patientId: string;
  patientName?: string;
  doctorId?: string;
  doctorName?: string;
  nurseId?: string;
  nurseName?: string;
  assignedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlertResponse {
  id: string;
  patientId: string;
  measurementId: string;
  violations: ThresholdViolation[];
  status: "open" | "ack";
  severity: "info" | "high";
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ThresholdViolation {
  type: string;
  rule: string;
  observed: number;
  threshold: number;
  severity: "info" | "high";
}

export interface PatientItem {
  id: string;
  name: string;
  updatedAt?: string;
  status: "Bình thường" | "Cảnh báo";
}
