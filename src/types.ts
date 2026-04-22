export type UserRole = 'admin' | 'manager' | 'team_lead' | 'sales';
export type EmployeeStatus = 'Active' | 'On Leave' | 'Left' | 'Pending Approval';
export type Department = 'Sales' | 'Dev' | 'Support';

export interface AccessRequest {
  id: string;
  companyId: string;
  userId: string;
  userName: string;
  requestedRole: UserRole;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  createdAt: string;
  website?: string;
  phone?: string;
  address?: string;
  industry?: string;
  description?: string;
  logoUrl?: string;
  inviteCode?: string;
  currency?: string;
  policies?: string[];
  rolePermissions?: Record<UserRole, Permission[]>;
  notificationSettings?: {
    enabled: boolean;
    dueSoonHours: number;
  };
  taskStatuses?: string[];
}

export type Permission = 
  | 'leads:view' | 'leads:edit' | 'leads:delete' | 'leads:assign'
  | 'tasks:view' | 'tasks:edit' | 'tasks:delete' | 'tasks:assign'
  | 'team:view' | 'team:manage' | 'team:invite'
  | 'finance:view' | 'finance:manage'
  | 'settings:company' | 'settings:security';

export interface BankDetails {
  accountName: string;
  accountNumber: string;
  bankName: string;
  ifscCode: string;
  branchName: string;
}

export interface GovernmentId {
  type: 'Aadhar' | 'PAN' | 'Passport' | 'Voter ID';
  number: string;
}

export interface SalaryHike {
  id: string;
  amount: number;
  date: string;
  reason: string;
  previousSalary: number;
  newSalary: number;
  status: 'pending' | 'approved' | 'rejected';
  proposedBy?: string; // UID
  proposedByName?: string;
  approvedBy?: string; // UID
  approvedByName?: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  memberId: string; // Unique human-readable ID
  name: string;
  email: string;
  companyId: string;
  role: UserRole;
  photoURL?: string;
  createdAt: string;
  // Employee fields
  phone?: string;
  department?: Department;
  joiningDate?: string;
  salary?: number;
  status?: EmployeeStatus;
  leadCount?: number;
  conversionRate?: number;
  shiftId?: string;
  isResigned?: boolean;
  // Detailed Profile Info (Restricted)
  bankDetails?: BankDetails;
  governmentId?: GovernmentId;
  salaryHistory?: SalaryHike[];
  address?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relation: string;
  };
  // RBAC
  permissions?: Permission[]; // Overrides based on role
  reportsTo?: string; // UID of manager
}

export interface PermissionRequest {
  id: string;
  userId: string;
  userName: string;
  companyId: string;
  requestedPermission: Permission;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  resolvedBy?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface Shift {
  id: string;
  companyId: string;
  name: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  type: 'Full-time' | 'Night' | 'Remote' | 'Hybrid';
  workDays: number[]; // 0-6 (Sun-Sat)
  createdAt: string;
}

export interface Holiday {
  id: string;
  companyId: string;
  date: string; // YYYY-MM-DD
  name: string;
  type: 'Public' | 'Company' | 'Optional';
  createdAt: string;
}

export interface EmployeeDocument {
  id: string;
  companyId: string;
  employeeId: string;
  name: string;
  type: 'Offer Letter' | 'ID Proof' | 'Contract' | 'Other';
  fileUrl: string;
  uploadedAt: string;
}

export interface ExitRecord {
  id: string;
  companyId: string;
  employeeId: string;
  resignationDate: string;
  lastWorkingDay: string;
  reason: string;
  status: 'Pending' | 'Checklist Done' | 'Settled';
  checklist: {
    task: string;
    completed: boolean;
  }[];
  finalSettlementAmount?: number;
  createdAt: string;
}

export interface Attendance {
  id: string;
  companyId: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  checkIn: string; // ISO string
  checkOut?: string; // ISO string
  status: 'On-time' | 'Late' | 'Absent';
  location?: { lat: number; lng: number };
}

export interface LeaveRequest {
  id: string;
  companyId: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  type: 'Annual' | 'Sick' | 'Work From Home' | 'Other';
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
}

export interface PerformanceReview {
  id: string;
  companyId: string;
  employeeId: string;
  reviewerId: string;
  period: string;
  rating: number; // 1-5
  feedback: string;
  kpis: { name: string; target: string; achieved: string }[];
  createdAt: string;
}

export interface Lead {
  id: string;
  companyId: string;
  name: string;
  email: string;
  phone: string;
  service: 'WordPress' | 'Shopify' | 'Custom Development';
  message: string;
  status: 'New' | 'Contacted' | 'Converted';
  assignedTo?: string;
  createdAt: string;
}

export interface Invite {
  id: string;
  companyId: string;
  email: string;
  role: UserRole;
  token: string;
  expiresAt: string;
  status: 'pending' | 'accepted';
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: 'file' | 'link';
  createdAt: string;
}

export interface Task {
  id: string;
  companyId: string;
  title: string;
  description: string;
  dueDate: string;
  status: string;
  priority: 'Low' | 'Medium' | 'High';
  assignedTo?: string;
  leadId?: string;
  notificationSent?: boolean;
  subtasks?: SubTask[];
  attachments?: Attachment[];
  startedAt?: string;
  completedAt?: string;
  reminderEnabled?: boolean;
  createdAt: string;
}

export interface TaskTemplate {
  id: string;
  companyId: string;
  name: string;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  subtasks: { title: string }[];
  createdAt: string;
}

export interface PayrollRecord {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  month: string; // YYYY-MM
  baseSalary: number;
  bonus?: number;
  bonusReason?: string;
  deduction?: number; // legacy
  deductions?: number;
  deductionReason?: string;
  taxAmount?: number;
  netSalary: number;
  totalAmount: number; // total Gross or Net? Usually totalAmount in existing code was gross? No, totalAmount was base + bonus - deduction.
  status: 'Paid' | 'Pending';
  paidAt?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  companyId: string;
  actorId: string;
  actorName: string;
  action: 'LOGIN' | 'SALARY_CHANGE' | 'EMPLOYEE_EDIT' | 'DATA_EXPORT' | 'SETTINGS_CHANGE' | 'TASK_EDIT' | 'LEAD_DELETE';
  targetId?: string;
  targetName?: string;
  details: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  companyId: string;
  userId: string;
  title: string;
  message: string;
  type: 'salary' | 'task' | 'profile' | 'admin' | 'system';
  read: boolean;
  link?: string;
  createdAt: string;
}
