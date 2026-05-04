export type UserRole = 'admin' | 'manager' | 'team_lead' | 'sales' | 'super_admin';
export type EmployeeStatus = 'Active' | 'On Leave' | 'Left' | 'Pending Approval';
export type Department = 'Sales' | 'Dev' | 'Support';

export interface SaasPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'monthly' | 'yearly';
  features: string[];
  limits: {
    maxUsers: number;
    maxLeads: number;
    maxStorage: number; // in MB
    hasIntelligence: boolean;
    hasBlogs: boolean;
  };
  isActive: boolean;
  isPopular?: boolean;
  isScalable?: boolean;
  scalingMetric?: 'users' | 'storage' | 'leads';
  scalingPrice?: number;
  upsellPlanId?: string;
  downsellPlanId?: string;
}

export interface Subscription {
  id: string;
  companyId: string;
  planId: string;
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'trial_expired';
  startDate?: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  updatedAt: string;
}

export interface SystemSettings {
  id: string;
  paymentGateway: {
    provider: 'stripe' | 'razorpay' | 'paypal' | 'cashfree' | 'phonepe' | 'none';
    stripePublicKey?: string;
    stripeSecretKey?: string;
    razorpayKeyId?: string;
    razorpayKeySecret?: string;
    cashfreeAppId?: string;
    cashfreeSecretKey?: string;
    phonepeMerchantId?: string;
    phonepeSaltKey?: string;
    phonepeSaltIndex?: string;
    mode: 'test' | 'live';
    enabled: boolean;
  };
  taxRate?: number; // Percentage, e.g., 18
  taxInclusive?: boolean; // Whether tax is included in the base price
  updatedAt: string;
}

export interface SaasPayment {
  id: string;
  companyId: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'pending';
  planId: string;
  billingReason: 'subscription_create' | 'subscription_cycle' | 'subscription_update';
  billingPeriod?: 'monthly' | 'yearly';
  discountApplied?: {
    code: string;
    amount: number;
  };
  taxAmount?: number;
  invoiceUrl?: string;
  createdAt: string;
}

export interface DiscountCode {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  value: number;
  maxRedemptions?: number;
  redemptionCount: number;
  expiresAt?: string;
  isActive: boolean;
}

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
    dueSoonUnit?: 'hours' | 'minutes';
  };
  taskStatuses?: string[];
  subscriptionId?: string;
  isSuperAdminCompany?: boolean; // For the platform owner company
  subdomain?: string;
  trialEndsAt?: string;
}

export type Permission = 
  | 'leads:view' | 'leads:edit' | 'leads:delete' | 'leads:assign'
  | 'tasks:view' | 'tasks:edit' | 'tasks:delete' | 'tasks:assign'
  | 'team:view' | 'team:manage' | 'team:invite'
  | 'finance:view' | 'finance:manage'
  | 'blog:view' | 'blog:manage'
  | 'media:manage'
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
  interests?: string[];
  isSuperAdmin?: boolean; // Global flag for SaaS management
}

export interface IntelligencePost {
  id: string;
  companyId?: string;
  type: 'Internal' | 'Global';
  title: string;
  content: string;
  topic: string;
  source: string;
  imageUrl?: string;
  link?: string;
  relevance?: number;
  createdAt: string;
  authorId?: string;
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
  bufferMinutes: number; // Grace period
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
  employeeName: string;
  date: string; // YYYY-MM-DD
  checkIn: string; // ISO string
  checkOut?: string; // ISO string
  status: 'On-time' | 'Late' | 'Absent' | 'Present' | 'Half-day';
  shiftId?: string;
  workHours?: number;
  location?: { lat: number; lng: number; address?: string };
  notes?: string;
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
  formId?: string;
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

export type TaskStatus = 'Todo' | 'In Progress' | 'Done' | 'Review';

export interface Task {
  id: string;
  companyId: string;
  title: string;
  description: string;
  dueDate: string;
  status: TaskStatus;
  priority: 'Low' | 'Medium' | 'High';
  assignedTo?: string;
  leadId?: string;
  notificationSent?: boolean;
  subtasks?: SubTask[];
  attachments?: Attachment[];
  startedAt?: string;
  completedAt?: string;
  reminderEnabled?: boolean;
  reminderMinutes?: number; // Minutes before due date to send email
  reminderEmailSent?: boolean;
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
  approvedBy?: string;
  approvedAt?: string;
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

export type NotificationType = 'salary_update' | 'task_assigned' | 'profile_update' | 'admin_alert' | 'role_request' | 'new_message';

export interface Conversation {
  id: string;
  companyId: string;
  type: 'direct' | 'group';
  name?: string;
  photoURL?: string;
  memberIds: string[];
  lastMessage?: {
    content: string;
    senderId: string;
    senderName: string;
    createdAt: string;
  };
  createdBy: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  readBy: string[];
  mentions?: string[];
  threadId?: string;
}

export interface UserPresence {
  uid: string;
  status: 'online' | 'offline' | 'away' | 'busy' | 'dnd' | 'break' | 'lunch';
  lastSeen: string;
  typingIn: string | null;
  story?: {
    content: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
    expiresAt: string;
    createdAt: string;
  };
}

export interface SupportTicket {
  id: string;
  token: string;
  userEmail: string;
  userName: string;
  subject: string;
  status: 'open' | 'active' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  lastMessageAt: string;
  companyId?: string;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderRole: 'user' | 'admin';
  content: string;
  createdAt: string;
}

export interface ContactGroup {
  id: string;
  name: string;
  memberIds: string[];
  companyId: string;
  createdBy: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  companyId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}
