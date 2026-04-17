export type UserRole = 'admin' | 'manager' | 'team_lead' | 'sales';
export type EmployeeStatus = 'Active' | 'On Leave' | 'Left';
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
  notificationSettings?: {
    enabled: boolean;
    dueSoonHours: number;
  };
  taskStatuses?: string[];
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
  deduction?: number;
  totalAmount: number;
  status: 'Paid' | 'Pending';
  paidAt?: string;
  createdAt: string;
}
