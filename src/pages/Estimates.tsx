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
  Trash,
  Edit,
  ClipboardCheck,
  Send
} from 'lucide-react';
import { subscribeToCollection, createDocument, updateDocument, deleteDocument } from '../services/firestore';
import { sendEstimateEmail } from '../services/email';
import { generateEstimatePDF } from '../services/pdfService';
import { Estimate, Client, Service, InvoiceItem, EmailTemplate, CompanySettings, Invoice } from '../types';
import { format, addDays, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../contexts/AuthContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Estimates: React.FC = () => {
  const { isAdmin } = useAuth();
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<CompanySettings[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEstimate, setEditingEstimate] = useState<Estimate | null>(null);
  const [viewingEstimate, setViewingEstimate] = useState<Estimate | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // Form State
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [estimateItems, setEstimateItems] = useState<InvoiceItem[]>([]);
  const [validUntil, setValidUntil] = useState<string>(format(addDays(new Date(), 15), 'yyyy-MM-dd'));
  const [servicePeriodFrom, setServicePeriodFrom] = useState<string>('');
  const [servicePeriodTo, setServicePeriodTo] = useState<string>('');
  const [nextEstimateNumber, setNextEstimateNumber] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const unsubEstimates = subscribeToCollection<Estimate>('estimates', [], setEstimates);
    const unsubClients = subscribeToCollection<Client>('clients', [], setClients);
    const unsubServices = subscribeToCollection<Service>('services', [], setServices);
    const unsubSettings = subscribeToCollection<CompanySettings>('settings', [], setSettings);
    const unsubTemplates = subscribeToCollection<EmailTemplate>('email_templates', [], setTemplates);
    
    return () => {
      unsubEstimates();
      unsubClients();
      unsubServices();
      unsubSettings();
      unsubTemplates();
    };
  }, []);

  useEffect(() => {
    if (estimates.length > 0) {
      const currentYear = new Date().getFullYear();
      const yearPrefix = `EST/${currentYear}/`;
      const yearEsts = estimates
        .filter(est => est.estimateNumber.startsWith(yearPrefix))
        .map(est => {
          const parts = est.estimateNumber.split('/');
          return parseInt(parts[parts.length - 1]) || 0;
        });
      const lastNum = yearEsts.length > 0 ? Math.max(...yearEsts) : 0;
      setNextEstimateNumber(`${yearPrefix}${(lastNum + 1).toString().padStart(3, '0')}`);
    } else {
      const currentYear = new Date().getFullYear();
      setNextEstimateNumber(`EST/${currentYear}/001`);
    }
  }, [estimates]);

  const filteredEstimates = estimates.filter(est => {
    const matchesSearch = est.estimateNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         est.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || est.status === statusFilter;
    const estDate = new Date(est.createdAt);
    const start = dateRange.start ? new Date(dateRange.start) : null;
    const end = dateRange.end ? new Date(dateRange.end) : null;
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);
    const matchesDateRange = (!start || estDate >= start) && (!end || estDate <= end);
    return matchesSearch && matchesStatus && matchesDateRange;
  });

  const addItem = () => {
    setEstimateItems([...estimateItems, { serviceId: '', serviceName: '', hsn: '', qty: 1, rate: 0, gstRate: 18, amount: 0 }]);
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...estimateItems];
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
    setEstimateItems(newItems);
  };

  const calculateTotals = () => {
    const subtotal = estimateItems.reduce((sum, item) => sum + item.amount, 0);
    const totalGst = estimateItems.reduce((sum, item) => sum + (item.amount * item.gstRate / 100), 0);
    return { subtotal, totalGst, totalAmount: subtotal + totalGst };
  };

  const handleCreateEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients.find(c => c.id === selectedClient);
    if (!client || estimateItems.length === 0) return;

    const totals = calculateTotals();
    const estNumber = editingEstimate ? editingEstimate.estimateNumber : nextEstimateNumber;

    const estimateData: Omit<Estimate, 'id'> = {
      estimateNumber: estNumber,
      clientId: client.id,
      clientName: client.name,
      items: estimateItems,
      ...totals,
      gstAmount: totals.totalGst,
      status: editingEstimate ? editingEstimate.status : 'draft',
      validUntil: new Date(validUntil).toISOString(),
      servicePeriodFrom: servicePeriodFrom || undefined,
      servicePeriodTo: servicePeriodTo || undefined,
      createdAt: editingEstimate ? editingEstimate.createdAt : new Date().toISOString(),
      notes,
    };

    if (editingEstimate) {
      await updateDocument('estimates', editingEstimate.id!, estimateData);
    } else {
      await createDocument('estimates', estimateData);
    }

    setIsModalOpen(false);
    setEditingEstimate(null);
    resetForm();
  };

  const handleEmailEstimate = async (est: Estimate) => {
    const client = clients.find(c => c.id === est.clientId);
    if (!client) return;
    
    // Attempt to find a template or use default
    const template = templates.find(t => t.type === 'estimate'); // We should add this type to defaults if possible

    await sendEstimateEmail({
      email: client.email,
      clientName: client.name,
      estimateNumber: est.estimateNumber,
      amount: est.totalAmount,
      validUntil: format(new Date(est.validUntil), 'dd MMM yyyy'),
      items: est.items,
      servicePeriodFrom: est.servicePeriodFrom ? format(new Date(est.servicePeriodFrom), 'dd MMM yyyy') : undefined,
      servicePeriodTo: est.servicePeriodTo ? format(new Date(est.servicePeriodTo), 'dd MMM yyyy') : undefined,
      customSubject: template?.subject,
      customBody: template?.body,
    });
    
    // Update status to 'sent' if it was draft
    if (est.status === 'draft') {
      await updateDocument('estimates', est.id!, { status: 'sent' });
    }
    
    alert(`Estimate sent to ${client.email}`);
  };

  const resetForm = () => {
    setSelectedClient('');
    setEstimateItems([]);
    setValidUntil(format(addDays(new Date(), 15), 'yyyy-MM-dd'));
    setServicePeriodFrom('');
    setServicePeriodTo('');
    setNotes('');
  };

  const handleEditEstimate = (est: Estimate) => {
    setEditingEstimate(est);
    setSelectedClient(est.clientId);
    setEstimateItems(est.items);
    setValidUntil(format(new Date(est.validUntil), 'yyyy-MM-dd'));
    setServicePeriodFrom(est.servicePeriodFrom || '');
    setServicePeriodTo(est.servicePeriodTo || '');
    setNotes(est.notes || '');
    setIsModalOpen(true);
    setActiveMenu(null);
  };

  const handleDeleteEstimate = async (est: Estimate) => {
    if (confirm(`Are you sure you want to delete estimate ${est.estimateNumber}?`)) {
      await deleteDocument('estimates', est.id!);
    }
    setActiveMenu(null);
  };

  const handleConvertToInvoice = async (est: Estimate) => {
    if (!confirm('Convert this estimate to a final invoice?')) return;
    
    // Logic to create invoice from estimate
    const currentYear = new Date().getFullYear();
    const invoiceNumber = `INV/${currentYear}/AUTO`; // Invoices page logic handles actual numbering on fetch but we can improve it
    
    const invoiceData: Omit<Invoice, 'id'> = {
      invoiceNumber: `TBD-${Date.now()}`, // Temporary, ideally fetch next number
      clientId: est.clientId,
      clientName: est.clientName,
      items: est.items,
      subtotal: est.subtotal,
      cgst: est.gstAmount / 2,
      sgst: est.gstAmount / 2,
      igst: 0,
      totalGst: est.gstAmount,
      totalAmount: est.totalAmount,
      status: 'draft',
      isRecurring: false,
      dueDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
      createdAt: new Date().toISOString(),
    };

    await createDocument('invoices', invoiceData);
    await updateDocument('estimates', est.id!, { status: 'accepted' });
    alert('Invoice draft created successfully!');
    setActiveMenu(null);
  };

  const getStatusBadge = (est: Estimate) => {
    const badgeMap = {
      draft: { icon: Clock, bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-100', label: 'DRAFT' },
      sent: { icon: Send, bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', label: 'SENT' },
      accepted: { icon: CheckCircle2, bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', label: 'ACCEPTED' },
      rejected: { icon: XCircle, bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', label: 'REJECTED' },
      expired: { icon: AlertCircle, bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', label: 'EXPIRED' },
    };
    const config = badgeMap[est.status];
    const Icon = config.icon;
    return (
      <div className={cn("flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border", config.bg, config.text, config.border)}>
        <Icon size={12} /> {config.label}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Estimates</h1>
          <p className="text-slate-500">Create and manage quotations for potential projects.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100">
          <Plus size={20} /> Create Estimate
        </button>
      </header>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input type="text" placeholder="Search estimates..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <select className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium text-slate-600" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Estimates Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Estimate #</th>
                <th className="px-6 py-4 font-semibold">Client</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Valid Until</th>
                <th className="px-6 py-4 font-semibold">Amount</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEstimates.map((est) => (
                <tr key={est.id} className="hover:bg-slate-50 transition-colors text-sm">
                  <td className="px-6 py-4 font-medium text-slate-900">{est.estimateNumber}</td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{est.clientName}</td>
                  <td className="px-6 py-4 text-slate-500">{format(new Date(est.createdAt), 'dd MMM yyyy')}</td>
                  <td className="px-6 py-4 text-slate-500">{format(new Date(est.validUntil), 'dd MMM yyyy')}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">₹{est.totalAmount.toLocaleString()}</td>
                  <td className="px-6 py-4">{getStatusBadge(est)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setViewingEstimate(est)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" 
                        title="View"
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        onClick={() => {
                          const client = clients.find(c => c.id === est.clientId);
                          if (client && settings[0]) {
                            generateEstimatePDF(est, settings[0], client);
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" 
                        title="Download PDF"
                      >
                        <Download size={18} />
                      </button>
                      <button 
                        onClick={() => handleEmailEstimate(est)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" 
                        title="Email Client"
                      >
                        <Mail size={18} />
                      </button>
                      <div className="relative">
                        <button onClick={() => setActiveMenu(activeMenu === est.id ? null : est.id!)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"><MoreVertical size={18} /></button>
                        {activeMenu === est.id && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-20 py-1 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                             <button onClick={() => handleEditEstimate(est)} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors"><Edit size={14} /> Edit Estimate</button>
                             <button onClick={() => handleConvertToInvoice(est)} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 transition-colors"><ClipboardCheck size={14} /> Convert to Invoice</button>
                             <button onClick={() => handleDeleteEstimate(est)} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"><Trash2 size={14} /> Delete</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{editingEstimate ? 'Edit Estimate' : 'New Estimate'}</h2>
                <p className="text-xs text-indigo-600 font-bold">{editingEstimate ? `Editing: ${editingEstimate.estimateNumber}` : `Drafting: ${nextEstimateNumber}`}</p>
              </div>
              <button onClick={() => { setIsModalOpen(false); setEditingEstimate(null); resetForm(); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><XCircle size={24} className="text-slate-400" /></button>
            </div>
            
            <form onSubmit={handleCreateEstimate} className="flex-1 overflow-y-auto p-6 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Select Client</label>
                  <select required value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none">
                    <option value="">Choose a client...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Valid Until</label>
                  <input type="date" required value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Service Period From</label>
                  <input type="date" value={servicePeriodFrom} onChange={(e) => setServicePeriodFrom(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Service Period To</label>
                  <input type="date" value={servicePeriodTo} onChange={(e) => setServicePeriodTo(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" />
                </div>
              </div>

              {/* Items */}
              <div className="space-y-4">
                 <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Service Items</h3>
                  <button type="button" onClick={addItem} className="text-sm font-semibold text-indigo-600 flex items-center gap-1 hover:text-indigo-700">
                    <Plus size={16} /> Add Item
                  </button>
                </div>
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                   <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold w-1/2">Service</th>
                        <th className="px-4 py-3 font-semibold w-20">Qty</th>
                        <th className="px-4 py-3 font-semibold">Rate</th>
                        <th className="px-4 py-3 font-semibold">Amount</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {estimateItems.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3">
                            <select required value={item.serviceId} onChange={(e) => updateItem(index, 'serviceId', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 p-0 text-slate-900 font-medium">
                              <option value="">Select Service</option>
                              {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-3"><input type="number" value={item.qty} onChange={(e) => updateItem(index, 'qty', parseFloat(e.target.value))} className="w-full bg-transparent border-none focus:ring-0 p-0 text-slate-900" /></td>
                          <td className="px-4 py-3"><input type="number" value={item.rate} onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value))} className="w-full bg-transparent border-none focus:ring-0 p-0 text-slate-900" /></td>
                          <td className="px-4 py-3 font-bold text-slate-900">₹{item.amount.toLocaleString()}</td>
                          <td className="px-4 py-3"><button type="button" onClick={() => setEstimateItems(estimateItems.filter((_, i) => i !== index))} className="p-1 text-slate-400 hover:text-rose-600"><Trash size={16} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

               <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Additional Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Project scope, validity terms, etc." className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" />
              </div>
            </form>

            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button type="button" onClick={() => { setIsModalOpen(false); setEditingEstimate(null); resetForm(); }} className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-all">Cancel</button>
              <button onClick={handleCreateEstimate} disabled={!selectedClient || estimateItems.length === 0} className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 disabled:opacity-50">
                {editingEstimate ? 'Update Estimate' : 'Save Estimate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Estimates;
