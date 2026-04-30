import React from 'react';
import { 
  Calculator, 
  Receipt, 
  CreditCard, 
  TrendingDown, 
  FileText,
  AlertCircle,
  PiggyBank,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';
import { Invoice, Expense, Bank, Payment } from '../types';
import { format } from 'date-fns';

interface AccountantDashboardProps {
  invoices: Invoice[];
  expenses: Expense[];
  banks: Bank[];
  payments: Payment[];
}

const AccountantDashboard: React.FC<AccountantDashboardProps> = ({ invoices, expenses, banks, payments }) => {
  const pendingInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'overdue');
  const overdueTotal = pendingInvoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + i.totalAmount, 0);
  const totalCash = banks.reduce((sum, b) => sum + b.balance, 0);
  
  const recentPayments = [...payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const recentExpenses = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Finance Overview</h1>
        <p className="text-slate-500">Monitor cash flow, pending payables, and receivables.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Cash Balance', value: totalCash, icon: PiggyBank, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Accounts Receivable', value: pendingInvoices.reduce((sum, i) => sum + i.totalAmount, 0), icon: ArrowUpRight, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Overdue Payments', value: overdueTotal, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'Tax Liabilities', value: invoices.reduce((sum, i) => sum + i.cgst + i.sgst + i.igst, 0), icon: Calculator, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900">₹{stat.value.toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Inward Payments */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ArrowUpRight size={20} className="text-emerald-500" /> Recent Incomes
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {recentPayments.slice(0, 5).map(payment => (
              <div key={payment.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <Receipt size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Payment for Inv #{payment.invoiceNumber}</h4>
                    <p className="text-xs text-slate-500">{format(new Date(payment.date), 'dd MMM yyyy')}</p>
                  </div>
                </div>
                <p className="text-sm font-black text-emerald-600">+₹{payment.amount.toLocaleString()}</p>
              </div>
            ))}
            {recentPayments.length === 0 && <div className="p-8 text-center text-slate-400 text-sm italic">No income records found.</div>}
          </div>
        </div>

        {/* Recent Expenses */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ArrowDownLeft size={20} className="text-rose-500" /> Recent Expenses
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {recentExpenses.slice(0, 5).map(expense => (
              <div key={expense.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                    <TrendingDown size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{expense.category}</h4>
                    <p className="text-xs text-slate-500">{format(new Date(expense.date), 'dd MMM yyyy')} • {expense.vendor}</p>
                  </div>
                </div>
                <p className="text-sm font-black text-rose-600">-₹{expense.amount.toLocaleString()}</p>
              </div>
            ))}
            {recentExpenses.length === 0 && <div className="p-8 text-center text-slate-400 text-sm italic">No expense records found.</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountantDashboard;
