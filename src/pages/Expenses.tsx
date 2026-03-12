import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  Receipt, 
  Calendar, 
  IndianRupee, 
  Tag, 
  MoreVertical,
  XCircle,
  ArrowUpCircle,
  Building2,
  FileText
} from 'lucide-react';
import { subscribeToCollection, createDocument, updateDocument, getDocument } from '../services/firestore';
import { Expense, Bank } from '../types';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Expenses: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubExpenses = subscribeToCollection<Expense>('expenses', [], setExpenses);
    const unsubBanks = subscribeToCollection<Bank>('banks', [], setBanks);
    
    return () => {
      unsubExpenses();
      unsubBanks();
    };
  }, []);

  const filteredExpenses = expenses.filter(expense => 
    expense.vendor.toLowerCase().includes(searchTerm.toLowerCase()) || 
    expense.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get('amount') as string);
    const bankId = formData.get('bankId') as string;

    const newExpense = {
      category: formData.get('category') as string,
      amount,
      date: new Date(formData.get('date') as string).toISOString(),
      vendor: formData.get('vendor') as string,
      paymentMode: formData.get('paymentMode') as any,
      bankId,
      notes: formData.get('notes') as string,
      gstAmount: parseFloat(formData.get('gstAmount') as string || '0'),
      isGstClaimable: formData.get('isGstClaimable') === 'on',
    };

    await createDocument('expenses', newExpense);
    
    // Update bank balance
    if (bankId) {
      const bank = banks.find(b => b.id === bankId);
      if (bank) {
        await updateDocument('banks', bankId, { balance: bank.balance - amount });
      }
    }

    setIsModalOpen(false);
  };

  const categories = [
    'Rent', 'Electricity', 'Internet', 'Salaries', 'Travel', 'Marketing', 'Software', 'Office Supplies', 'Taxes', 'Other'
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Expenses</h1>
          <p className="text-slate-500">Track your agency overheads and operational costs.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl font-semibold hover:bg-rose-700 transition-all shadow-md shadow-rose-100"
        >
          <Plus size={20} />
          Record Expense
        </button>
      </header>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search by vendor or category..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold">Vendor</th>
                <th className="px-6 py-4 font-semibold">Amount</th>
                <th className="px-6 py-4 font-semibold">Paid From</th>
                <th className="px-6 py-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.map((expense) => {
                const bank = banks.find(b => b.id === expense.bankId);
                return (
                  <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-500 text-sm font-medium">
                      {format(new Date(expense.date), 'dd MMM yyyy')}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-900 font-medium">
                      {expense.vendor}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-bold text-rose-600">
                        <ArrowUpCircle size={16} />
                        ₹{expense.amount.toLocaleString()}
                      </div>
                      {expense.isGstClaimable && (
                        <p className="text-[10px] text-emerald-600 font-bold uppercase mt-0.5">GST Claimable: ₹{expense.gstAmount}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-900">{expense.paymentMode}</span>
                        {bank && <span className="text-xs text-slate-400">{bank.bankName}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
                        <MoreVertical size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredExpenses.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <Receipt size={32} />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">No expenses recorded</h3>
            <p className="text-slate-500">Record your business expenses to track profitability.</p>
          </div>
        )}
      </div>

      {/* Record Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Record Expense</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <XCircle size={24} className="text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleAddExpense} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
                  <select name="category" required className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all">
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
                  <input name="date" required type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Vendor / Payee</label>
                <input name="vendor" required type="text" placeholder="e.g. Amazon, Landlord, Employee Name" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Total Amount (₹)</label>
                  <input name="amount" required type="number" placeholder="0.00" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">GST Amount (Optional)</label>
                  <input name="gstAmount" type="number" placeholder="0.00" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment Mode</label>
                  <select name="paymentMode" required className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all">
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="RTGS">RTGS / Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Card">Card</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Paid From (Bank)</label>
                  <select name="bankId" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all">
                    <option value="">Select Bank (if applicable)</option>
                    {banks.map(bank => <option key={bank.id} value={bank.id}>{bank.bankName} ({bank.accountNumber.slice(-4)})</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <input name="isGstClaimable" type="checkbox" id="isGstClaimable" className="w-5 h-5 text-rose-600 border-slate-300 rounded focus:ring-rose-500" />
                <label htmlFor="isGstClaimable" className="text-sm font-medium text-slate-700">This expense is GST claimable (Input Tax Credit)</label>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-all">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-rose-600 text-white font-semibold rounded-xl hover:bg-rose-700 transition-all shadow-md shadow-rose-100">Record Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
