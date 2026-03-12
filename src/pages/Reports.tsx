import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  Download, 
  Calendar, 
  Filter,
  TrendingUp,
  PieChart as PieChartIcon,
  Table as TableIcon,
  FileSpreadsheet
} from 'lucide-react';
import { subscribeToCollection } from '../services/firestore';
import { Invoice, Payment, Lead } from '../types';
import { format, startOfYear, endOfYear, eachMonthOfInterval } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area
} from 'recharts';

const Reports: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    const unsubInvoices = subscribeToCollection<Invoice>('invoices', [], setInvoices);
    const unsubPayments = subscribeToCollection<Payment>('payments', [], setPayments);
    const unsubLeads = subscribeToCollection<Lead>('leads', [], setLeads);
    
    return () => {
      unsubInvoices();
      unsubPayments();
      unsubLeads();
    };
  }, []);

  // Revenue by Month (Current Year)
  const currentYear = new Date().getFullYear();
  const months = eachMonthOfInterval({
    start: startOfYear(new Date(currentYear, 0, 1)),
    end: endOfYear(new Date(currentYear, 11, 31))
  });

  const revenueData = months.map(month => {
    const monthStr = format(month, 'MMM');
    const monthInvoices = invoices.filter(inv => 
      inv.status === 'paid' && 
      new Date(inv.createdAt).getMonth() === month.getMonth() &&
      new Date(inv.createdAt).getFullYear() === currentYear
    );
    const total = monthInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    return { name: monthStr, revenue: total };
  });

  // GST Summary
  const totalCgst = invoices.reduce((sum, inv) => sum + (inv.cgst || 0), 0);
  const totalSgst = invoices.reduce((sum, inv) => sum + (inv.sgst || 0), 0);
  const totalIgst = invoices.reduce((sum, inv) => sum + (inv.igst || 0), 0);

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Reports & Analytics</h1>
          <p className="text-slate-500">Financial insights and business performance metrics.</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition-all shadow-sm">
            <Download size={18} />
            Export GSTR-1
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100">
            <FileSpreadsheet size={18} />
            Download CSV
          </button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-sm font-medium text-slate-500 mb-1">Total GST Collected</p>
          <p className="text-2xl font-bold text-slate-900">₹{(totalCgst + totalSgst + totalIgst).toLocaleString()}</p>
          <div className="mt-4 flex gap-4 text-xs">
            <div className="flex flex-col">
              <span className="text-slate-400 uppercase">CGST</span>
              <span className="font-semibold text-slate-700">₹{totalCgst.toLocaleString()}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-400 uppercase">SGST</span>
              <span className="font-semibold text-slate-700">₹{totalSgst.toLocaleString()}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-400 uppercase">IGST</span>
              <span className="font-semibold text-slate-700">₹{totalIgst.toLocaleString()}</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-sm font-medium text-slate-500 mb-1">Pending Receivables</p>
          <p className="text-2xl font-bold text-amber-600">
            ₹{invoices.filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled').reduce((sum, inv) => sum + inv.totalAmount, 0).toLocaleString()}
          </p>
          <p className="mt-2 text-xs text-slate-400">From {invoices.filter(inv => inv.status !== 'paid').length} unpaid invoices</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-sm font-medium text-slate-500 mb-1">Avg. Deal Size</p>
          <p className="text-2xl font-bold text-indigo-600">
            ₹{invoices.length > 0 ? (invoices.reduce((sum, inv) => sum + inv.totalAmount, 0) / invoices.length).toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0}
          </p>
          <p className="mt-2 text-xs text-slate-400">Based on {invoices.length} total invoices</p>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp size={20} className="text-indigo-600" />
            Revenue Growth {currentYear}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400">Filter:</span>
            <select className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none">
              <option>Current Year</option>
              <option>Last Year</option>
            </select>
          </div>
        </div>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(v) => `₹${v/1000}k`} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Top Clients by Revenue</h3>
            <TableIcon size={18} className="text-slate-400" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-semibold">Client Name</th>
                  <th className="px-6 py-3 font-semibold">Invoices</th>
                  <th className="px-6 py-3 font-semibold text-right">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Logic to group by client would go here */}
                <tr className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">Sample Client A</td>
                  <td className="px-6 py-4 text-slate-600">12</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900">₹4,50,000</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">Sample Client B</td>
                  <td className="px-6 py-4 text-slate-600">8</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900">₹2,80,000</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Sales Performance</h3>
            <BarChart3 size={18} className="text-slate-400" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-semibold">Executive</th>
                  <th className="px-6 py-3 font-semibold">Leads Won</th>
                  <th className="px-6 py-3 font-semibold text-right">Conversion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">John Sales</td>
                  <td className="px-6 py-4 text-slate-600">15</td>
                  <td className="px-6 py-4 text-right">
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold">24%</span>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">Sarah Account</td>
                  <td className="px-6 py-4 text-slate-600">9</td>
                  <td className="px-6 py-4 text-right">
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full text-xs font-bold">18%</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
