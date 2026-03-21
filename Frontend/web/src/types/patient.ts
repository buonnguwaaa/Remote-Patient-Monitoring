export interface AssignmentResponse {
  id: string;
  patientId: string;
  patientName?: string;
  patientCode?: string;
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
  patientName?: string;
  patientAvatarUrl?: string;
  measurementId: string;
  violations: ThresholdViolation[];
  status: "open" | "ack";
  severity: "info" | "high";
  acknowledgedBy?: string;
  acknowledgedByName?: string;
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
  patientCode?: string;
  updatedAt?: string;
  status: "Binh thuong" | "Canh bao";
}
