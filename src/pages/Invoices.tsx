import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  FileText, 
  Download, 
  Mail, 
  MoreVertical,
  XCircle,
  Calendar,
  IndianRupee,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Repeat,
  Trash,
  Edit
} from 'lucide-react';
import { subscribeToCollection, createDocument, updateDocument, getCollection, deleteDocument } from '../services/firestore';
import { sendInvoiceEmail, sendOverdueEmail } from '../services/email';
import { generateInvoicePDF } from '../services/pdfService';
import { Invoice, Client, Service, InvoiceItem, EmailTemplate, CompanySettings } from '../types';
import { format, addDays, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { runAutomatedChecks } from '../services/automation';
import { useAuth } from '../contexts/AuthContext';
import InvoiceView from '../components/InvoiceView';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Invoices: React.FC = () => {
  const { isAdmin } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  
  useEffect(() => {
    if (isAdmin) {
      runAutomatedChecks();
    }
  }, [isAdmin]);
  
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'recurring' | 'one-time'>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [settings, setSettings] = useState<CompanySettings[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // New Invoice State
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [dueDate, setDueDate] = useState<string>(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [servicePeriodFrom, setServicePeriodFrom] = useState<string>('');
  const [servicePeriodTo, setServicePeriodTo] = useState<string>('');

  useEffect(() => {
    const unsubInvoices = subscribeToCollection<Invoice>('invoices', [], setInvoices);
    const unsubClients = subscribeToCollection<Client>('clients', [], setClients);
    const unsubServices = subscribeToCollection<Service>('services', [], setServices);
    const unsubTemplates = subscribeToCollection<EmailTemplate>('email_templates', [], setTemplates);
    const unsubSettings = subscribeToCollection<CompanySettings>('settings', [], setSettings);
    
    return () => {
      unsubInvoices();
      unsubClients();
      unsubServices();
      unsubTemplates();
      unsubSettings();
    };
  }, []);

  useEffect(() => {
    if (invoices.length > 0) {
      const currentYear = new Date().getFullYear();
      const yearPrefix = `INV/${currentYear}/`;
      
      const yearInvoices = invoices
        .filter(inv => inv.invoiceNumber.startsWith(yearPrefix))
        .map(inv => {
          const parts = inv.invoiceNumber.split('/');
          return parseInt(parts[parts.length - 1]) || 0;
        });
      
      const lastNum = yearInvoices.length > 0 ? Math.max(...yearInvoices) : 0;
      setNextInvoiceNumber(`${yearPrefix}${(lastNum + 1).toString().padStart(3, '0')}`);
    } else {
      const currentYear = new Date().getFullYear();
      setNextInvoiceNumber(`INV/${currentYear}/001`);
    }
  }, [invoices]);

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         inv.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    
    const matchesType = typeFilter === 'all' || 
                       (typeFilter === 'recurring' && inv.isRecurring) || 
                       (typeFilter === 'one-time' && !inv.isRecurring);
    
    const invoiceDate = new Date(inv.createdAt);
    const start = dateRange.start ? new Date(dateRange.start) : null;
    const end = dateRange.end ? new Date(dateRange.end) : null;
    
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);

    const matchesDateRange = (!start || invoiceDate >= start) &&
                           (!end || invoiceDate <= end);

    return matchesSearch && matchesStatus && matchesType && matchesDateRange;
  });

  const addItem = () => {
    setInvoiceItems([...invoiceItems, { serviceId: '', serviceName: '', hsn: '', qty: 1, rate: 0, gstRate: 18, amount: 0 }]);
  };

  const handleDeleteInvoice = async (invoice: Invoice) => {
    if (confirm(`Are you sure you want to delete invoice ${invoice.invoiceNumber}? This action cannot be undone.`)) {
      try {
        await deleteDocument('invoices', invoice.id!);
      } catch (error) {
        console.error('Error deleting invoice:', error);
      }
    }
    setActiveMenu(null);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setSelectedClient(invoice.clientId);
    setInvoiceItems(invoice.items);
    setDueDate(format(new Date(invoice.dueDate), 'yyyy-MM-dd'));
    setIsRecurring(invoice.isRecurring || false);
    setRecurringInterval(invoice.recurringInterval || 'monthly');
    setServicePeriodFrom(invoice.servicePeriodFrom ? format(new Date(invoice.servicePeriodFrom), 'yyyy-MM-dd') : '');
    setServicePeriodTo(invoice.servicePeriodTo ? format(new Date(invoice.servicePeriodTo), 'yyyy-MM-dd') : '');
    setIsModalOpen(true);
    setActiveMenu(null);
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...invoiceItems];
    const item = { ...newItems[index], [field]: value };
    
    if (field === 'serviceId') {
      const service = services.find(s => s.id === value);
      if (service) {
        item.serviceName = service.name;
        item.hsn = service.hsn;
        item.rate = service.price;
        item.gstRate = service.gstRate;
      }
    }
    
    item.amount = item.qty * item.rate;
    newItems[index] = item;
    setInvoiceItems(newItems);
  };

  const removeItem = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const subtotal = invoiceItems.reduce((sum, item) => sum + item.amount, 0);
    const totalGst = invoiceItems.reduce((sum, item) => sum + (item.amount * item.gstRate / 100), 0);
    
    const client = clients.find(c => c.id === selectedClient);
    const company = settings[0];
    
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (client && company) {
      if (client.stateCode === company.stateCode) {
        cgst = totalGst / 2;
        sgst = totalGst / 2;
        igst = 0;
      } else {
        cgst = 0;
        sgst = 0;
        igst = totalGst;
      }
    } else {
      // Default to CGST/SGST if either is missing
      cgst = totalGst / 2;
      sgst = totalGst / 2;
      igst = 0;
    }
    
    return { subtotal, cgst, sgst, igst, totalGst, totalAmount: subtotal + totalGst };
  };

  const generateDefaultTemplates = async () => {
    const companyName = settings[0]?.name || 'Our Company';
    const defaults: Omit<EmailTemplate, 'id'>[] = [
      {
        type: 'welcome',
        subject: `Welcome to ${companyName}!`,
        body: `Hello {clientName},\n\nWelcome to ${companyName}! We are excited to have you on board.\nYour account has been successfully set up with us.\n\nBest regards,\nThe ${companyName} Team`,
        lastUpdated: new Date().toISOString()
      },
      {
        type: 'invoice',
        subject: `Invoice {invoiceNumber} from ${companyName}`,
        body: `Hello {clientName},\n\nPlease find the details for invoice {invoiceNumber} below:\n\nAmount Due: ₹{amount}\nDue Date: {dueDate}\n\nYou can pay online using this link: {paymentLink}\n\nThank you for your business!\n\nBest regards,\n${companyName}`,
        lastUpdated: new Date().toISOString()
      },
      {
        type: 'recurring',
        subject: `Upcoming Subscription Renewal: {serviceName}`,
        body: `Hello {clientName},\n\nThis is a friendly reminder that your subscription for {serviceName} is due for renewal.\n\nAmount: ₹{amount}\nNext Billing Date: {nextBillingDate}\n\nBest regards,\n${companyName}`,
        lastUpdated: new Date().toISOString()
      },
      {
        type: 'overdue',
        subject: `URGENT: Payment Overdue for Invoice {invoiceNumber}`,
        body: `Hello {clientName},\n\nThis is a reminder that payment for invoice {invoiceNumber} is now overdue by {daysOverdue} days.\n\nPlease settle the outstanding amount of ₹{amount} at your earliest convenience.\n\nPayment Link: {paymentLink}\n\nIf you have already made the payment, please ignore this email.\n\nBest regards,\n${companyName}`,
        lastUpdated: new Date().toISOString()
      },
      {
        type: 'followup',
        subject: `Following up: {leadTitle}`,
        body: `Hello {clientName},\n\nI hope you are doing well. I am following up on our recent discussion regarding {leadTitle}.\n\nI would love to hear your thoughts and see how we can move forward.\n\nBest regards,\n${companyName}`,
        lastUpdated: new Date().toISOString()
      },
      {
        type: 'estimate',
        subject: `Estimate {estimateNumber} from ${companyName}`,
        body: `Hello {clientName},\n\nAs requested, please find the estimate {estimateNumber} for the discussed services below.\n\nTotal Estimated Amount: ₹{amount}\nValid Until: {validUntil}\n\nPlease let us know if you have any questions.\n\nBest regards,\n${companyName}`,
        lastUpdated: new Date().toISOString()
      }
    ];

    for (const template of defaults) {
      const exists = templates.find(t => t.type === template.type);
      if (!exists) {
        await createDocument('email_templates', template);
      }
    }
    alert('Missing templates generated successfully!');
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients.find(c => c.id === selectedClient);
    if (!client || invoiceItems.length === 0) return;

    const totals = calculateTotals();
    const invoiceNumber = editingInvoice ? editingInvoice.invoiceNumber : nextInvoiceNumber;
    const template = templates.find(t => t.type === 'invoice');
    const paymentLink = `${window.location.origin}/pay/${invoiceNumber}`;

    const invoiceData: Omit<Invoice, 'id'> = {
      invoiceNumber,
      clientId: client.id,
      clientName: client.name,
      items: invoiceItems,
      ...totals,
      status: editingInvoice ? editingInvoice.status : 'sent',
      dueDate: new Date(dueDate).toISOString(),
      createdAt: editingInvoice ? editingInvoice.createdAt : new Date().toISOString(),
      isRecurring,
      recurringInterval: isRecurring ? recurringInterval : undefined,
      servicePeriodFrom: servicePeriodFrom ? new Date(servicePeriodFrom).toISOString() : undefined,
      servicePeriodTo: servicePeriodTo ? new Date(servicePeriodTo).toISOString() : undefined,
    };

    if (editingInvoice) {
      await updateDocument('invoices', editingInvoice.id!, invoiceData);
    } else {
      await createDocument('invoices', invoiceData);
      
      // Only send Email for NEW invoices by default, or you can prompt
      await sendInvoiceEmail({
        email: client.email,
        clientName: client.name,
        invoiceNumber: invoiceNumber,
        amount: totals.totalAmount,
        dueDate: format(new Date(dueDate), 'dd MMM yyyy'),
        items: invoiceItems,
        customSubject: template?.subject,
        customBody: template?.body,
        paymentLink,
        servicePeriodFrom: servicePeriodFrom ? format(new Date(servicePeriodFrom), 'dd MMM yyyy') : undefined,
        servicePeriodTo: servicePeriodTo ? format(new Date(servicePeriodTo), 'dd MMM yyyy') : undefined,
      });
    }

    setIsModalOpen(false);
    setEditingInvoice(null);
    resetForm();
  };

  const handleManualNotify = async (invoice: Invoice) => {
    const client = clients.find(c => c.id === invoice.clientId);
    if (!client) return;

    const template = templates.find(t => t.type === 'invoice');
    const paymentLink = `${window.location.origin}/pay/${invoice.invoiceNumber}`;

    await sendInvoiceEmail({
      email: client.email,
      clientName: client.name,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.totalAmount,
      dueDate: format(new Date(invoice.dueDate), 'dd MMM yyyy'),
      items: invoice.items,
      customSubject: template?.subject,
      customBody: template?.body,
      paymentLink,
      servicePeriodFrom: invoice.servicePeriodFrom ? format(new Date(invoice.servicePeriodFrom), 'dd MMM yyyy') : undefined,
      servicePeriodTo: invoice.servicePeriodTo ? format(new Date(invoice.servicePeriodTo), 'dd MMM yyyy') : undefined,
    });
    alert(`Notification sent to ${client.email}`);
  };

  const resetForm = () => {
    setSelectedClient('');
    setInvoiceItems([]);
    setDueDate(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
    setIsRecurring(false);
    setRecurringInterval('monthly');
    setServicePeriodFrom('');
    setServicePeriodTo('');
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    if (editingTemplate.id) {
      await updateDocument('email_templates', editingTemplate.id, {
        ...editingTemplate,
        lastUpdated: new Date().toISOString()
      });
    } else {
      await createDocument('email_templates', {
        ...editingTemplate,
        lastUpdated: new Date().toISOString()
      });
    }
    setEditingTemplate(null);
  };

  const handleUpdateStatus = async (id: string, status: Invoice['status']) => {
    try {
      await updateDocument('invoices', id, { status });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getStatusBadge = (invoice: Invoice) => {
    const status = invoice.status;
    const badgeMap = {
      paid: { icon: CheckCircle2, bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', label: 'PAID' },
      overdue: { icon: AlertCircle, bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', label: 'OVERDUE' },
      sent: { icon: Clock, bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', label: 'SENT' },
      draft: { icon: FileText, bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-100', label: 'DRAFT' },
      cancelled: { icon: XCircle, bg: 'bg-slate-100', text: 'text-slate-400', border: 'border-slate-200', label: 'CANCELLED' }
    };

    const config = badgeMap[status];
    const Icon = config.icon;

    return (
      <div className="relative group/status">
        <div className={cn(
          "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer hover:shadow-sm",
          config.bg, config.text, config.border
        )}>
          <Icon size={12} /> {config.label}
        </div>
        
        <select 
          className="absolute inset-0 opacity-0 cursor-pointer"
          value={status}
          onChange={(e) => handleUpdateStatus(invoice.id, e.target.value as Invoice['status'])}
        >
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Invoices</h1>
          <p className="text-slate-500">Generate and track GST compliant invoices.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsTemplateModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 transition-all shadow-sm"
          >
            <Mail size={20} />
            Manage Templates
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
          >
            <Plus size={20} />
            Create Invoice
          </button>
        </div>
      </header>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search by invoice number or client..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select 
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium text-slate-600"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select 
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium text-slate-600"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
            >
              <option value="all">Type: All</option>
              <option value="recurring">Type: Recurring</option>
              <option value="one-time">Type: One-time</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 pt-2 border-t border-slate-50">
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
            <Calendar size={18} className="text-slate-400" />
            <span>Date Range:</span>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            />
            <span className="text-slate-400 text-xs">to</span>
            <input 
              type="date" 
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            />
            <div className="flex items-center gap-1.5 ml-auto">
              {[
                { label: 'Today', getValue: () => ({ start: format(new Date(), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') }) },
                { label: 'This Month', getValue: () => ({ start: format(startOfMonth(new Date()), 'yyyy-MM-dd'), end: format(endOfMonth(new Date()), 'yyyy-MM-dd') }) },
                { label: 'Last 30 Days', getValue: () => ({ start: format(subDays(new Date(), 30), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') }) },
              ].map(preset => (
                <button
                  key={preset.label}
                  onClick={() => setDateRange(preset.getValue())}
                  className="px-2 py-1 text-[10px] font-bold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-100 rounded-md transition-all uppercase tracking-wider"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {(dateRange.start || dateRange.end || statusFilter !== 'all' || typeFilter !== 'all' || searchTerm !== '') && (
              <button 
                onClick={() => {
                  setDateRange({ start: '', end: '' });
                  setStatusFilter('all');
                  setTypeFilter('all');
                  setSearchTerm('');
                }}
                className="ml-2 text-xs font-semibold text-rose-500 hover:text-rose-600"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Invoice #</th>
                <th className="px-6 py-4 font-semibold">Client</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Due Date</th>
                <th className="px-6 py-4 font-semibold">Amount</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      {inv.invoiceNumber}
                      {inv.isRecurring && (
                        <div className="group relative">
                          <Repeat size={14} className="text-indigo-500" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                            Recurring {inv.recurringInterval}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{inv.clientName}</td>
                  <td className="px-6 py-4 text-slate-500 text-sm">{format(new Date(inv.createdAt), 'dd MMM yyyy')}</td>
                  <td className="px-6 py-4 text-slate-500 text-sm">{format(new Date(inv.dueDate), 'dd MMM yyyy')}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">₹{inv.totalAmount.toLocaleString()}</td>
                  <td className="px-6 py-4">{getStatusBadge(inv)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setViewingInvoice(inv)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" 
                        title="View Invoice"
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        onClick={() => {
                          const client = clients.find(c => c.id === inv.clientId);
                          if (client && settings[0]) {
                            generateInvoicePDF(inv, settings[0], client);
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" 
                        title="Download PDF"
                      >
                        <Download size={18} />
                      </button>
                      <button 
                        onClick={() => handleManualNotify(inv)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" 
                        title="Email Client"
                      >
                        <Mail size={18} />
                      </button>
                      <div className="relative">
                        <button 
                          onClick={() => setActiveMenu(activeMenu === inv.id ? null : (inv.id || null))}
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
                        >
                          <MoreVertical size={18} />
                        </button>
                        
                        {activeMenu === inv.id && (
                          <>
                            <div 
                              className="fixed inset-0 z-10" 
                              onClick={() => setActiveMenu(null)}
                            />
                            <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-xl border border-slate-100 z-20 py-1 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                              <button 
                                onClick={() => handleEditInvoice(inv)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                              >
                                <Edit size={14} /> Edit Invoice
                              </button>
                              <button 
                                onClick={async () => {
                                  const newStatus = !inv.isRecurring;
                                  let interval = inv.recurringInterval || 'monthly';
                                  if (newStatus && !inv.recurringInterval) {
                                    const selected = window.confirm("Mark as recurring? (OK for Monthly, Cancel to abort)");
                                    if (!selected) return;
                                  }
                                  await updateDocument('invoices', inv.id, { 
                                    isRecurring: newStatus,
                                    recurringInterval: newStatus ? interval : null
                                  });
                                  setActiveMenu(null);
                                }}
                                className={cn(
                                  "w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-colors",
                                  inv.isRecurring ? "text-indigo-600 hover:bg-indigo-50" : "text-slate-600 hover:bg-slate-50"
                                )}
                              >
                                <Repeat size={14} /> {inv.isRecurring ? "Stop Recurring" : "Mark as Recurring"}
                              </button>
                              <button 
                                onClick={() => handleDeleteInvoice(inv)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 size={14} /> Delete Invoice
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredInvoices.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <FileText size={32} />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">No invoices found</h3>
            <p className="text-slate-500">Create your first invoice to get started.</p>
          </div>
        )}
      </div>

      {/* Create Invoice Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}</h2>
                <p className="text-xs text-indigo-600 font-bold">{editingInvoice ? `Editing: ${editingInvoice.invoiceNumber}` : `Drafting: ${nextInvoiceNumber}`}</p>
              </div>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingInvoice(null);
                  resetForm();
                }} 
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <XCircle size={24} className="text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleCreateInvoice} className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Select Client</label>
                  <select 
                    required
                    value={selectedClient}
                    onChange={(e) => setSelectedClient(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  >
                    <option value="">Choose a client...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Due Date</label>
                  <input 
                    type="date" 
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Service Period (From)</label>
                  <input 
                    type="date" 
                    value={servicePeriodFrom}
                    onChange={(e) => setServicePeriodFrom(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Service Period (To)</label>
                  <input 
                    type="date" 
                    value={servicePeriodTo}
                    onChange={(e) => setServicePeriodTo(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <input 
                      type="checkbox" 
                      id="isRecurring"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    />
                    <div>
                      <label htmlFor="isRecurring" className="block text-sm font-bold text-slate-900">Recurring Invoice</label>
                      <p className="text-xs text-slate-500 text-balance">Automatically notify client periodically for this service.</p>
                    </div>
                  </div>

                  {isRecurring && (
                    <div className="animate-in slide-in-from-top-2 duration-200">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Recurring Interval</label>
                      <select 
                        value={recurringInterval}
                        onChange={(e) => setRecurringInterval(e.target.value as any)}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                      >
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Invoice Items</h3>
                  <button 
                    type="button"
                    onClick={addItem}
                    className="text-sm font-semibold text-indigo-600 flex items-center gap-1 hover:text-indigo-700"
                  >
                    <Plus size={16} /> Add Item
                  </button>
                </div>
                
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold w-1/3">Service</th>
                        <th className="px-4 py-3 font-semibold">HSN</th>
                        <th className="px-4 py-3 font-semibold w-20">Qty</th>
                        <th className="px-4 py-3 font-semibold">Rate</th>
                        <th className="px-4 py-3 font-semibold">GST %</th>
                        <th className="px-4 py-3 font-semibold">Amount</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoiceItems.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3">
                            <select 
                              required
                              value={item.serviceId}
                              onChange={(e) => updateItem(index, 'serviceId', e.target.value)}
                              className="w-full bg-transparent border-none focus:ring-0 p-0 text-slate-900 font-medium"
                            >
                              <option value="">Select Service</option>
                              {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{item.hsn}</td>
                          <td className="px-4 py-3">
                            <input 
                              type="number" 
                              value={item.qty}
                              onChange={(e) => updateItem(index, 'qty', parseFloat(e.target.value))}
                              className="w-full bg-transparent border-none focus:ring-0 p-0 text-slate-900"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input 
                              type="number" 
                              value={item.rate}
                              onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value))}
                              className="w-full bg-transparent border-none focus:ring-0 p-0 text-slate-900"
                            />
                          </td>
                          <td className="px-4 py-3 text-slate-500">{item.gstRate}%</td>
                          <td className="px-4 py-3 font-bold text-slate-900">₹{item.amount.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <button type="button" onClick={() => removeItem(index)} className="text-slate-300 hover:text-rose-500 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {invoiceItems.length === 0 && (
                    <div className="p-8 text-center text-slate-400 italic">No items added yet.</div>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <div className="w-full max-w-xs space-y-3 bg-slate-50 p-6 rounded-2xl">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-medium">₹{calculateTotals().subtotal.toLocaleString()}</span>
                  </div>
                  {calculateTotals().igst > 0 ? (
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>IGST</span>
                      <span className="font-medium">₹{calculateTotals().igst.toLocaleString()}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-sm text-slate-600">
                        <span>CGST</span>
                        <span className="font-medium">₹{calculateTotals().cgst.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm text-slate-600">
                        <span>SGST</span>
                        <span className="font-medium">₹{calculateTotals().sgst.toLocaleString()}</span>
                      </div>
                    </>
                  )}
                  <div className="pt-3 border-t border-slate-200 flex justify-between text-lg font-bold text-slate-900">
                    <span>Total</span>
                    <span>₹{calculateTotals().totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </form>

            <div className="p-6 border-t border-slate-100 flex gap-3 shrink-0">
              <button 
                type="button" 
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingInvoice(null);
                  resetForm();
                }} 
                className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateInvoice}
                disabled={!selectedClient || invoiceItems.length === 0}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingInvoice ? 'Update Invoice' : 'Generate Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Manage Templates Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-bold text-slate-900">Email Templates</h2>
              <button onClick={() => setIsTemplateModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <XCircle size={24} className="text-slate-400" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {!editingTemplate ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-slate-500 font-medium">Standard Managed Templates</p>
                    <button 
                      onClick={generateDefaultTemplates}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 transition-all flex items-center gap-1"
                    >
                      <Plus size={12} /> Auto-Generate Missing
                    </button>
                  </div>
                  {['welcome', 'invoice', 'recurring', 'overdue', 'followup'].map((type) => {
                    const template = templates.find(t => t.type === type);
                    return (
                      <div key={type} className="p-4 border border-slate-100 rounded-xl hover:border-indigo-200 transition-all flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-slate-900 capitalize">{type} Email</h3>
                          <p className="text-sm text-slate-500">
                            {template ? `Last updated: ${format(new Date(template.lastUpdated), 'dd MMM yyyy')}` : 'No template configured'}
                          </p>
                        </div>
                        <button 
                          onClick={() => setEditingTemplate(template || { id: '', type: type as any, subject: '', body: '', lastUpdated: '' })}
                          className="px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        >
                          {template ? 'Edit Template' : 'Create Template'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <form onSubmit={handleSaveTemplate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Subject</label>
                    <input 
                      type="text" 
                      required
                      value={editingTemplate.subject}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                      placeholder="Email Subject"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Body (Markdown supported)</label>
                    <textarea 
                      required
                      rows={8}
                      value={editingTemplate.body}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono text-sm mb-3"
                      placeholder="Email body content..."
                    />
                    
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Available Placeholders</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { key: '{clientName}', desc: 'Full name of client' },
                          { key: '{invoiceNumber}', desc: 'e.g. INV/2026/001' },
                          { key: '{amount}', desc: 'Total invoice amount' },
                          { key: '{dueDate}', desc: 'Invoice due date' },
                          { key: '{paymentLink}', desc: 'Direct payment URL' },
                          ...(editingTemplate.type === 'overdue' ? [{ key: '{daysOverdue}', desc: 'Number of late days' }] : []),
                          ...(editingTemplate.type === 'recurring' ? [{ key: '{serviceName}', desc: 'Name of subscription' }, { key: '{nextBillingDate}', desc: 'Next cycle date' }] : []),
                          ...(editingTemplate.type === 'followup' ? [{ key: '{leadTitle}', desc: 'Project/Lead name' }] : [])
                        ].map(p => (
                          <button 
                            key={p.key}
                            type="button"
                            onClick={() => setEditingTemplate({ ...editingTemplate, body: editingTemplate.body + p.key })}
                            className="flex flex-col text-left p-2 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200 group"
                          >
                            <code className="text-indigo-600 font-bold text-xs group-hover:scale-105 transition-transform">{p.key}</code>
                            <span className="text-[10px] text-slate-400">{p.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {editingTemplate.type === 'overdue' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Reminder Schedule (Days after due date)</label>
                      <input 
                        type="text"
                        placeholder="e.g. 1, 3, 7, 14"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        value={settings?.[0]?.overdueReminderSchedule || ''}
                        onChange={async (e) => {
                          if (settings?.[0]?.id) {
                            await updateDocument('settings', settings[0].id, {
                              overdueReminderSchedule: e.target.value
                            });
                          }
                        }}
                      />
                      <p className="mt-1 text-xs text-slate-400 font-medium">Enter comma-separated numbers representing days after the due date to send reminders.</p>
                    </div>
                  )}
                  
                  <div className="flex gap-3 pt-4">
                    <button 
                      type="button" 
                      onClick={() => setEditingTemplate(null)}
                      className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-all"
                    >
                      Back
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
                    >
                      Save Template
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {viewingInvoice && (
        <InvoiceView 
          invoice={viewingInvoice}
          client={clients.find(c => c.id === viewingInvoice.clientId)!}
          onClose={() => setViewingInvoice(null)}
        />
      )}
    </div>
  );
};

export default Invoices;
