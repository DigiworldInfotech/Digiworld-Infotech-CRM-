import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  Users, 
  FileText, 
  CreditCard, 
  AlertCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { subscribeToCollection } from '../services/firestore';
import { Invoice, Lead, Client, Payment, Expense, Bank } from '../types';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

import { useAuth } from '../contexts/AuthContext';
import ClientDashboard from './ClientDashboard';

import SalesDashboard from '../components/SalesDashboard';
import AccountantDashboard from '../components/AccountantDashboard';

import { runAutomatedChecks } from '../services/automation';

const Dashboard: React.FC = () => {
  const { isClient, isSales, isAccountant, isAdmin } = useAuth();

  useEffect(() => {
    if (isAdmin) {
      runAutomatedChecks();
    }
  }, [isAdmin]);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);

  useEffect(() => {
    if (isClient) return;
    const unsubInvoices = subscribeToCollection<Invoice>('invoices', [], setInvoices);
    const unsubLeads = subscribeToCollection<Lead>('leads', [], setLeads);
    const unsubClients = subscribeToCollection<Client>('clients', [], setClients);
    const unsubPayments = subscribeToCollection<Payment>('payments', [], setPayments);
    const unsubExpenses = subscribeToCollection<Expense>('expenses', [], setExpenses);
    const unsubBanks = subscribeToCollection<Bank>('banks', [], setBanks);

    return () => {
      unsubInvoices();
      unsubLeads();
      unsubClients();
      unsubPayments();
      unsubExpenses();
      unsubBanks();
    };
  }, [isClient]);

  // Stats calculations
  const totalRevenue = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);
  
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  
  const bankBalance = banks.reduce((sum, bank) => sum + bank.balance, 0);

  const pendingPayments = invoices
    .filter(inv => inv.status === 'sent' || inv.status === 'overdue')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  const activeClients = clients.filter(c => c.status === 'active').length;

  // Chart data: Monthly Revenue
  const last6Months = Array.from({ length: 6 }).map((_, i) => {
    const date = subMonths(new Date(), i);
    return {
      month: format(date, 'MMM'),
      revenue: 0,
      date: date
    };
  }).reverse();

  last6Months.forEach(m => {
    const start = startOfMonth(m.date);
    const end = endOfMonth(m.date);
    m.revenue = invoices
      .filter(inv => inv.status === 'paid' && isWithinInterval(new Date(inv.createdAt), { start, end }))
      .reduce((sum, inv) => sum + inv.totalAmount, 0);
  });

  // Chart data: Lead Status
  const leadStatusData = [
    { name: 'New', value: leads.filter(l => l.status === 'new').length },
    { name: 'Contacted', value: leads.filter(l => l.status === 'contacted').length },
    { name: 'Proposal', value: leads.filter(l => l.status === 'proposal_sent').length },
    { name: 'Won', value: leads.filter(l => l.status === 'won').length },
    { name: 'Lost', value: leads.filter(l => l.status === 'lost').length },
  ].filter(d => d.value > 0);

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f43f5e'];
  
  if (isClient) return <ClientDashboard />;
  
  // Role-specific views
  if (isSales && !isAdmin) return <SalesDashboard leads={leads} />;
  if (isAccountant && !isAdmin) return <AccountantDashboard invoices={invoices} expenses={expenses} banks={banks} payments={payments} />;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500">Welcome back to DigiWorld Infotech.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Revenue" 
          value={`₹${totalRevenue.toLocaleString()}`} 
          icon={TrendingUp} 
          trend="+12.5%" 
          trendUp={true}
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard 
          title="Total Expenses" 
          value={`₹${totalExpenses.toLocaleString()}`} 
          icon={ArrowUpCircle} 
          trend="+8.2%" 
          trendUp={false}
          color="bg-rose-50 text-rose-600"
        />
        <StatCard 
          title="Bank Balance" 
          value={`₹${bankBalance.toLocaleString()}`} 
          icon={Building2} 
          trend="+5.4%" 
          trendUp={true}
          color="bg-indigo-50 text-indigo-600"
        />
        <StatCard 
          title="Pending Payments" 
          value={`₹${pendingPayments.toLocaleString()}`} 
          icon={Clock} 
          trend="+3.2%" 
          trendUp={false}
          color="bg-amber-50 text-amber-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Revenue Trend (Last 6 Months)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last6Months}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(v) => `₹${v/1000}k`} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Distribution */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Lead Pipeline</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={leadStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {leadStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {leadStatusData.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                  <span className="text-slate-600">{item.name}</span>
                </div>
                <span className="font-semibold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity / Invoices */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Recent Invoices</h3>
          <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700">View all</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Invoice #</th>
                <th className="px-6 py-4 font-semibold">Client</th>
                <th className="px-6 py-4 font-semibold">Amount</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.slice(0, 5).map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{inv.invoiceNumber}</td>
                  <td className="px-6 py-4 text-slate-600">{inv.clientName}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">₹{inv.totalAmount.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-bold capitalize",
                      inv.status === 'paid' ? "bg-emerald-50 text-emerald-600" :
                      inv.status === 'overdue' ? "bg-rose-50 text-rose-600" :
                      inv.status === 'sent' ? "bg-blue-50 text-blue-600" :
                      inv.status === 'cancelled' ? "bg-slate-100 text-slate-400 line-through" :
                      "bg-slate-50 text-slate-500"
                    )}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-sm">{format(new Date(inv.createdAt), 'dd MMM yyyy')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string;
  icon: any;
  trend: string;
  trendUp: boolean;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, trend, trendUp, color }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
    <div className="flex items-center justify-between mb-4">
      <div className={cn("p-3 rounded-xl", color)}>
        <Icon size={24} />
      </div>
      <div className={cn(
        "flex items-center gap-1 text-sm font-medium",
        trendUp ? "text-emerald-600" : "text-rose-600"
      )}>
        {trend}
        {trendUp ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
      </div>
    </div>
    <h4 className="text-slate-500 text-sm font-medium mb-1">{title}</h4>
    <p className="text-2xl font-bold text-slate-900">{value}</p>
  </div>
);

import { BarChart3, ArrowUpCircle, Building2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default Dashboard;
