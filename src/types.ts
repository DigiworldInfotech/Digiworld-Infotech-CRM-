export type UserRole = 'super_admin' | 'admin' | 'sales' | 'accountant' | 'client';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
  photoURL?: string;
  clientId?: string;
  username?: string;
  lastLogin?: string;
}

export interface Lead {
  id: string;
  title: string;
  status: 'new' | 'contacted' | 'meeting_scheduled' | 'proposal_sent' | 'negotiation' | 'won' | 'lost';
  priority: 'low' | 'medium' | 'high';
  budget: number;
  source: string;
  assignedTo: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
  followUpDate?: string;
  lastNotifiedAt?: string;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  gstin: string;
  address: string;
  state: string;
  stateCode: string;
  contactPerson: string;
  email: string;
  phone: string;
  udyamAdhar?: string;
  accountManager: string;
  status: 'active' | 'inactive';
}

export interface Service {
  id: string;
  name: string;
  hsn: string;
  gstRate: number;
  price: number;
  isRecurring: boolean;
  description?: string;
  features?: string[];
}

export interface InvoiceItem {
  serviceId: string;
  serviceName: string;
  hsn: string;
  qty: number;
  rate: number;
  gstRate: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  items: InvoiceItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
  totalAmount: number;
  status: 'draft' | 'sent' | 'overdue' | 'paid' | 'cancelled';
  dueDate: string;
  createdAt: string;
  isRecurring: boolean;
  recurringInterval?: 'monthly' | 'quarterly' | 'yearly';
  recurringParentId?: string;
  recurringGeneratedForDate?: string;
  lastRecurringDate?: string;
  lastReminderSentAt?: string;
  reminderCount?: number;
  servicePeriodFrom?: string;
  servicePeriodTo?: string;
}

export interface Estimate {
  id?: string;
  estimateNumber: string;
  clientId: string;
  clientName: string;
  items: InvoiceItem[];
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  validUntil: string;
  servicePeriodFrom?: string;
  servicePeriodTo?: string;
  createdAt: string;
  notes?: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  invoiceNumber?: string;
  amount: number;
  date: string;
  mode: 'Cash' | 'UPI' | 'RTGS' | 'Cheque' | 'Card' | 'Other';
  bankId?: string;
  servicePeriodFrom?: string;
  servicePeriodTo?: string;
  notes: string;
}

export interface Bank {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
  balance: number;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  date: string;
  vendor: string;
  paymentMode: 'Cash' | 'UPI' | 'RTGS' | 'Cheque' | 'Card' | 'Other';
  bankId?: string;
  servicePeriodFrom?: string;
  servicePeriodTo?: string;
  notes: string;
  gstAmount?: number;
  isGstClaimable: boolean;
}

export interface CompanySettings {
  name: string;
  address: string;
  gstin: string;
  state: string;
  stateCode: string;
  email: string;
  phone: string;
  upiId?: string;
  bankDetails?: string;
  termsAndConditions?: string;
  paymentUrl?: string;
  overdueReminderSchedule?: string; // Comma separated days e.g. "1,3,7,14"
  emailSignature?: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface EmailTemplate {
  id: string;
  type: 'welcome' | 'invoice' | 'recurring' | 'followup' | 'overdue' | 'estimate';
  subject: string;
  body: string;
  lastUpdated: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  isRead: boolean;
  createdAt: string;
  link?: string;
}

export interface Project {
  id: string;
  clientId: string;
  name: string;
  description: string;
  status: 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  startDate: string;
  endDate?: string;
  progress: number;
  budget: number;
  createdAt: string;
}

export interface Communication {
  id: string;
  clientId: string;
  type: 'email' | 'call' | 'meeting' | 'note';
  subject: string;
  content: string;
  date: string;
  userId: string; // Staff who communicated
  userName: string;
}
