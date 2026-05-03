export interface Case {
  id: string;
  title?: string;
  clientName?: string;
  assignedLawyerId?: string;
  status: "pending" | "accepted" | "denied" | "in-progress" | "completed";
  priority?: "High" | "Medium" | "Low";
  progress?: number; // 0-100
  deadline?: string; // ISO string
  lawyerReply?: string;
  createdAt?: string | Date;
  caseType?: string; // link to CASE_TYPES
}