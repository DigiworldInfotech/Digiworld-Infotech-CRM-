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
  Eye
} from 'lucide-react';
import { subscribeToCollection, createDocument, updateDocument, getCollection } from '../services/firestore';
import { sendInvoiceEmail } from '../services/email';
import { Invoice, Client, Service, InvoiceItem, EmailTemplate } from '../types';
import { format, addDays } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import InvoiceView from '../components/InvoiceView';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState('');

  // New Invoice State
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [dueDate, setDueDate] = useState<string>(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');

  useEffect(() => {
    const unsubInvoices = subscribeToCollection<Invoice>('invoices', [], setInvoices);
    const unsubClients = subscribeToCollection<Client>('clients', [], setClients);
    const unsubServices = subscribeToCollection<Service>('services', [], setServices);
    const unsubTemplates = subscribeToCollection<EmailTemplate>('email_templates', [], setTemplates);
    
    return () => {
      unsubInvoices();
      unsubClients();
      unsubServices();
      unsubTemplates();
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

  const filteredInvoices = invoices.filter(inv => 
    inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
    inv.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addItem = () => {
    setInvoiceItems([...invoiceItems, { serviceId: '', serviceName: '', hsn: '', qty: 1, rate: 0, gstRate: 18, amount: 0 }]);
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
    
    // Simple GST logic: Assume intra-state for now (CGST/SGST)
    // In real app, compare client state with company state
    const cgst = totalGst / 2;
    const sgst = totalGst / 2;
    const igst = 0;
    
    return { subtotal, cgst, sgst, igst, totalGst, totalAmount: subtotal + totalGst };
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients.find(c => c.id === selectedClient);
    if (!client || invoiceItems.length === 0) return;

    const totals = calculateTotals();
    const invoiceNumber = nextInvoiceNumber;
    const template = templates.find(t => t.type === 'invoice');
    const paymentLink = `${window.location.origin}/pay/${invoiceNumber}`;

    const newInvoice: Omit<Invoice, 'id'> = {
      invoiceNumber,
      clientId: client.id,
      clientName: client.name,
      items: invoiceItems,
      ...totals,
      status: 'sent',
      dueDate: new Date(dueDate).toISOString(),
      createdAt: new Date().toISOString(),
      isRecurring,
      recurringInterval: isRecurring ? recurringInterval : undefined,
    };

    await createDocument('invoices', newInvoice);
    
    // Send Email
    await sendInvoiceEmail({
      email: client.email,
      clientName: client.name,
      invoiceNumber: invoiceNumber,
      amount: totals.totalAmount,
      dueDate: format(new Date(dueDate), 'dd MMM yyyy'),
      items: invoiceItems,
      customSubject: template?.subject,
      customBody: template?.body,
      paymentLink
    });

    setIsModalOpen(false);
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
      paymentLink
    });
    alert(`Notification sent to ${client.email}`);
  };

  const resetForm = () => {
    setSelectedClient('');
    setInvoiceItems([]);
    setDueDate(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
    setIsRecurring(false);
    setRecurringInterval('monthly');
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

  const getStatusBadge = (status: Invoice['status']) => {
    switch (status) {
      case 'paid': return <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100"><CheckCircle2 size={12} /> PAID</span>;
      case 'overdue': return <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-100"><AlertCircle size={12} /> OVERDUE</span>;
      case 'sent': return <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100"><Clock size={12} /> SENT</span>;
      case 'draft': return <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-50 text-slate-500 border border-slate-100">DRAFT</span>;
      default: return null;
    }
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

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search by invoice number or client..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
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
                  <td className="px-6 py-4 font-medium text-slate-900">{inv.invoiceNumber}</td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{inv.clientName}</td>
                  <td className="px-6 py-4 text-slate-500 text-sm">{format(new Date(inv.createdAt), 'dd MMM yyyy')}</td>
                  <td className="px-6 py-4 text-slate-500 text-sm">{format(new Date(inv.dueDate), 'dd MMM yyyy')}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">₹{inv.totalAmount.toLocaleString()}</td>
                  <td className="px-6 py-4">{getStatusBadge(inv.status)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setViewingInvoice(inv)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" 
                        title="View Invoice"
                      >
                        <Eye size={18} />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Download PDF">
                        <Download size={18} />
                      </button>
                      <button 
                        onClick={() => handleManualNotify(inv)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" 
                        title="Email Client"
                      >
                        <Mail size={18} />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
                        <MoreVertical size={18} />
                      </button>
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
                <h2 className="text-xl font-bold text-slate-900">Create New Invoice</h2>
                <p className="text-xs text-indigo-600 font-bold">Drafting: {nextInvoiceNumber}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
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

              {/* Totals Section */}
              <div className="flex justify-end">
                <div className="w-full max-w-xs space-y-3 bg-slate-50 p-6 rounded-2xl">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-medium">₹{calculateTotals().subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>GST (18%)</span>
                    <span className="font-medium">₹{calculateTotals().totalGst.toLocaleString()}</span>
                  </div>
                  <div className="pt-3 border-t border-slate-200 flex justify-between text-lg font-bold text-slate-900">
                    <span>Total</span>
                    <span>₹{calculateTotals().totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </form>

            <div className="p-6 border-t border-slate-100 flex gap-3 shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-all">Cancel</button>
              <button 
                onClick={handleCreateInvoice}
                disabled={!selectedClient || invoiceItems.length === 0}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate Invoice
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
                  {['welcome', 'invoice', 'recurring'].map((type) => {
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
                      rows={10}
                      value={editingTemplate.body}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono text-sm"
                      placeholder="Email body content..."
                    />
                    <p className="mt-2 text-xs text-slate-400">
                      Use placeholders like {'{clientName}'}, {'{invoiceNumber}'}, {'{amount}'}, {'{dueDate}'}, {'{paymentLink}'}
                    </p>
                  </div>
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
