import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  CreditCard, 
  Calendar, 
  IndianRupee, 
  FileText, 
  MoreVertical,
  XCircle,
  CheckCircle2,
  ArrowDownCircle,
  ArrowUpCircle,
  Edit,
  Trash2
} from 'lucide-react';
import { subscribeToCollection, createDocument, updateDocument, getCollection, deleteDocument } from '../services/firestore';
import { Payment, Invoice, Bank } from '../types';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Payments: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  useEffect(() => {
    const unsubPayments = subscribeToCollection<Payment>('payments', [], setPayments);
    const unsubInvoices = subscribeToCollection<Invoice>('invoices', [], setInvoices);
    const unsubBanks = subscribeToCollection<Bank>('banks', [], setBanks);
    
    return () => {
      unsubPayments();
      unsubInvoices();
      unsubBanks();
    };
  }, []);

  const filteredPayments = payments.filter(payment => {
    const invoice = invoices.find(inv => inv.id === payment.invoiceId);
    return invoice?.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
           invoice?.clientName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleSavePayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const invoiceId = formData.get('invoiceId') as string;
    const amount = parseFloat(formData.get('amount') as string);
    const bankId = formData.get('bankId') as string;

    const paymentData = {
      invoiceId,
      amount,
      date: new Date(formData.get('date') as string).toISOString(),
      mode: formData.get('mode') as any,
      bankId,
      servicePeriodFrom: formData.get('servicePeriodFrom') as string || undefined,
      servicePeriodTo: formData.get('servicePeriodTo') as string || undefined,
      notes: formData.get('notes') as string,
    };

    if (editingPayment) {
      // Revert old bank balance if bank changed or amount changed
      if (editingPayment.bankId) {
        const oldBank = banks.find(b => b.id === editingPayment.bankId);
        if (oldBank) {
          await updateDocument('banks', oldBank.id, { balance: oldBank.balance - editingPayment.amount });
        }
      }
      await updateDocument('payments', editingPayment.id!, paymentData);
    } else {
      await createDocument('payments', paymentData);
    }
    
    // Update new bank balance
    if (bankId) {
      const bank = banks.find(b => b.id === bankId);
      if (bank) {
        // If we just subtracted from the balance (revert), we need to fetch the latest or calculate
        await updateDocument('banks', bankId, { balance: bank.balance + amount - (editingPayment?.bankId === bankId ? editingPayment.amount : 0) });
      }
    }

    // Update invoice status if fully paid
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
      await updateDocument('invoices', invoiceId, { status: 'paid' });
    }

    setIsModalOpen(false);
    setEditingPayment(null);
  };

  const handleEdit = (payment: Payment) => {
    setEditingPayment(payment);
    setIsModalOpen(true);
    setActiveMenu(null);
  };

  const handleDelete = async (payment: Payment) => {
    if (confirm(`Are you sure you want to delete this payment of ₹${payment.amount}?`)) {
      // Revert bank balance
      if (payment.bankId) {
        const bank = banks.find(b => b.id === payment.bankId);
        if (bank) {
          await updateDocument('banks', bank.id, { balance: bank.balance - payment.amount });
        }
      }
      
      // Revert invoice status to unpaid if it was the only payment
      // For simplicity, we just mark as unpaid if we delete a payment
      await updateDocument('invoices', payment.invoiceId, { status: 'unpaid' });
      
      await deleteDocument('payments', payment.id!);
    }
    setActiveMenu(null);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Payments</h1>
          <p className="text-slate-500">Record and track all client payments and transactions.</p>
        </div>
        <button 
          onClick={() => {
            setEditingPayment(null);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
        >
          <Plus size={20} />
          Record Payment
        </button>
      </header>

      {/* Search */}
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

      {/* Payments Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Invoice #</th>
                <th className="px-6 py-4 font-semibold">Client</th>
                <th className="px-6 py-4 font-semibold">Amount</th>
                <th className="px-6 py-4 font-semibold">Mode</th>
                <th className="px-6 py-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.map((payment) => {
                const invoice = invoices.find(inv => inv.id === payment.invoiceId);
                return (
                  <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-500 text-sm font-medium">
                      {format(new Date(payment.date), 'dd MMM yyyy')}
                    </td>
                    <td className="px-6 py-4 font-bold text-indigo-600">
                      {invoice?.invoiceNumber || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-slate-900 font-medium">
                      {invoice?.clientName || 'Unknown Client'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-600">
                        <ArrowDownCircle size={16} />
                        ₹{payment.amount.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 w-fit">
                          {payment.mode}
                        </span>
                        {payment.bankId && (
                          <span className="text-[10px] text-slate-400 mt-1">
                            {banks.find(b => b.id === payment.bankId)?.bankName}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="relative">
                        <button 
                          onClick={() => setActiveMenu(activeMenu === payment.id ? null : (payment.id || null))}
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
                        >
                          <MoreVertical size={18} />
                        </button>
                        
                        {activeMenu === payment.id && (
                          <>
                            <div 
                              className="fixed inset-0 z-10" 
                              onClick={() => setActiveMenu(null)}
                            />
                            <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-xl border border-slate-100 z-20 py-1 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                              <button 
                                onClick={() => handleEdit(payment)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                              >
                                <Edit size={14} /> Edit
                              </button>
                              <button 
                                onClick={() => handleDelete(payment)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredPayments.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <CreditCard size={32} />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">No payments recorded</h3>
            <p className="text-slate-500">Record client payments to track your revenue.</p>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">{editingPayment ? 'Edit Payment' : 'Record Payment'}</h2>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingPayment(null);
                }} 
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <XCircle size={24} className="text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSavePayment} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Select Invoice</label>
                <select 
                  name="invoiceId" 
                  required 
                  defaultValue={editingPayment?.invoiceId}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                >
                  <option value="">Choose an invoice...</option>
                  {invoices.filter(inv => inv.status !== 'paid' || inv.id === editingPayment?.invoiceId).map(inv => (
                    <option key={inv.id} value={inv.id}>{inv.invoiceNumber} - {inv.clientName} (₹{inv.totalAmount})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount Paid (₹)</label>
                  <input 
                    name="amount" 
                    required 
                    type="number" 
                    defaultValue={editingPayment?.amount}
                    placeholder="0.00" 
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment Date</label>
                  <input 
                    name="date" 
                    required 
                    type="date" 
                    defaultValue={editingPayment?.date ? format(new Date(editingPayment.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')} 
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment Mode</label>
                  <select 
                    name="mode" 
                    required 
                    defaultValue={editingPayment?.mode || 'Cash'}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="RTGS">RTGS / Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Card">Card</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Deposit To (Bank)</label>
                  <select 
                    name="bankId" 
                    defaultValue={editingPayment?.bankId}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  >
                    <option value="">Select Bank (if applicable)</option>
                    {banks.map(bank => <option key={bank.id} value={bank.id}>{bank.bankName} ({bank.accountNumber.slice(-4)})</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Service Period From</label>
                  <input 
                    name="servicePeriodFrom" 
                    type="date" 
                    defaultValue={editingPayment?.servicePeriodFrom ? format(new Date(editingPayment.servicePeriodFrom), 'yyyy-MM-dd') : ''} 
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Service Period To</label>
                  <input 
                    name="servicePeriodTo" 
                    type="date" 
                    defaultValue={editingPayment?.servicePeriodTo ? format(new Date(editingPayment.servicePeriodTo), 'yyyy-MM-dd') : ''} 
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes (Optional)</label>
                <textarea 
                  name="notes" 
                  rows={2} 
                  defaultValue={editingPayment?.notes}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
                  placeholder="Transaction ID, etc."
                ></textarea>
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingPayment(null);
                  }} 
                  className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100">
                  {editingPayment ? 'Update Payment' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
