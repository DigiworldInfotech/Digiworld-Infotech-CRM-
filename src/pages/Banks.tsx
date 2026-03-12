import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  Building2, 
  CreditCard, 
  IndianRupee, 
  MoreVertical,
  XCircle,
  Hash,
  MapPin,
  Receipt,
  ArrowUpCircle
} from 'lucide-react';
import { subscribeToCollection, createDocument, updateDocument } from '../services/firestore';
import { Bank, Expense } from '../types';
import { format } from 'date-fns';

const Banks: React.FC = () => {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsub = subscribeToCollection<Bank>('banks', [], setBanks);
    return () => unsub();
  }, []);

  const filteredBanks = banks.filter(bank => 
    bank.bankName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    bank.accountNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddBank = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newBank = {
      bankName: formData.get('bankName') as string,
      accountName: formData.get('accountName') as string,
      accountNumber: formData.get('accountNumber') as string,
      ifsc: formData.get('ifsc') as string,
      branch: formData.get('branch') as string,
      balance: parseFloat(formData.get('balance') as string || '0'),
    };

    await createDocument('banks', newBank);
    setIsModalOpen(false);
  };

  const handleAddExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedBank) return;

    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get('amount') as string);

    const newExpense: Omit<Expense, 'id'> = {
      category: formData.get('category') as string,
      amount,
      date: new Date(formData.get('date') as string).toISOString(),
      vendor: formData.get('vendor') as string,
      paymentMode: formData.get('paymentMode') as any,
      bankId: selectedBank.id,
      notes: formData.get('notes') as string,
      gstAmount: parseFloat(formData.get('gstAmount') as string || '0'),
      isGstClaimable: formData.get('isGstClaimable') === 'on',
    };

    await createDocument('expenses', newExpense);
    
    // Update bank balance
    await updateDocument('banks', selectedBank.id, { 
      balance: selectedBank.balance - amount 
    });

    setIsExpenseModalOpen(false);
    setSelectedBank(null);
  };

  const categories = [
    'Rent', 'Electricity', 'Internet', 'Salaries', 'Travel', 'Marketing', 'Software', 'Office Supplies', 'Taxes', 'Other'
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Bank Accounts</h1>
          <p className="text-slate-500">Manage your agency bank accounts and balances.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
        >
          <Plus size={20} />
          Add Bank Account
        </button>
      </header>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search by bank name or account number..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Banks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBanks.map((bank) => (
          <div key={bank.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 hover:border-indigo-200 transition-all overflow-hidden group">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                  <Building2 size={24} />
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-0.5">Current Balance</p>
                  <p className="text-xl font-black text-slate-900 flex items-center justify-end gap-0.5">
                    <IndianRupee size={18} className="text-slate-400" />
                    {bank.balance.toLocaleString()}
                  </p>
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-slate-900 mb-1 truncate">{bank.bankName}</h3>
              <p className="text-sm text-slate-500 mb-4 font-medium">{bank.accountName}</p>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <CreditCard size={14} className="text-slate-400" />
                  <span>A/C: {bank.accountNumber}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Hash size={14} className="text-slate-400" />
                  <span>IFSC: {bank.ifsc}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <MapPin size={14} className="text-slate-400" />
                  <span>Branch: {bank.branch}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                <button 
                  onClick={() => {
                    setSelectedBank(bank);
                    setIsExpenseModalOpen(true);
                  }}
                  className="text-xs font-bold text-rose-600 flex items-center gap-1 hover:bg-rose-50 px-2 py-1 rounded-lg transition-all"
                >
                  <Receipt size={14} /> Record Expense
                </button>
                <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredBanks.length === 0 && (
          <div className="col-span-full text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <Building2 size={32} />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">No bank accounts found</h3>
            <p className="text-slate-500">Add your bank accounts to start collecting payments.</p>
          </div>
        )}
      </div>

      {/* Add Bank Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Add Bank Account</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <XCircle size={24} className="text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleAddBank} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Bank Name</label>
                <input name="bankName" required type="text" placeholder="e.g. HDFC Bank" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Account Holder Name</label>
                <input name="accountName" required type="text" placeholder="e.g. DigiWorld Infotech" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Account Number</label>
                <input name="accountNumber" required type="text" placeholder="Account Number" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">IFSC Code</label>
                  <input name="ifsc" required type="text" placeholder="IFSC" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Opening Balance (₹)</label>
                  <input name="balance" type="number" placeholder="0.00" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Branch Name</label>
                <input name="branch" required type="text" placeholder="Branch Name" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-all">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100">Save Account</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Record Expense Modal */}
      {isExpenseModalOpen && selectedBank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Record Expense</h2>
                <p className="text-xs text-slate-500">Paying from: {selectedBank.bankName}</p>
              </div>
              <button onClick={() => setIsExpenseModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
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
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment Mode</label>
                  <select name="paymentMode" required className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all">
                    <option value="UPI">UPI</option>
                    <option value="RTGS">RTGS / Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Card">Card</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">GST Amount (Optional)</label>
                <input name="gstAmount" type="number" placeholder="0.00" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all" />
              </div>
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <input name="isGstClaimable" type="checkbox" id="isGstClaimable" className="w-5 h-5 text-rose-600 border-slate-300 rounded focus:ring-rose-500" />
                <label htmlFor="isGstClaimable" className="text-sm font-medium text-slate-700">This expense is GST claimable (ITC)</label>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-all">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-rose-600 text-white font-semibold rounded-xl hover:bg-rose-700 transition-all shadow-md shadow-rose-100">Record Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Banks;
