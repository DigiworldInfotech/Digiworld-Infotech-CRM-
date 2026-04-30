import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  Download, 
  Calendar, 
  Filter,
  TrendingUp,
  PieChart as PieChartIcon,
  Table as TableIcon,
  FileSpreadsheet,
  FileDown
} from 'lucide-react';
import { subscribeToCollection } from '../services/firestore';
import { Invoice, Payment, Lead } from '../types';
import { format, startOfYear, endOfYear, eachMonthOfInterval, isWithinInterval, parseISO, startOfMonth } from 'date-fns';
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
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const Reports: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [dateRange, setDateRange] = useState({ 
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'), 
    end: format(new Date(), 'yyyy-MM-dd') 
  });

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

  // Filtered invoices for GST Report
  const gstFilteredInvoices = invoices.filter(inv => {
    const invDate = new Date(inv.createdAt);
    return isWithinInterval(invDate, {
      start: parseISO(dateRange.start),
      end: parseISO(dateRange.end)
    });
  });

  const gstReport = gstFilteredInvoices.reduce((acc, inv) => ({
    cgst: acc.cgst + (inv.cgst || 0),
    sgst: acc.sgst + (inv.sgst || 0),
    igst: acc.igst + (inv.igst || 0),
    taxable: acc.taxable + (inv.subtotal || 0),
    total: acc.total + (inv.totalAmount || 0)
  }), { cgst: 0, sgst: 0, igst: 0, taxable: 0, total: 0 });

  const exportGSTToCSV = () => {
    const headers = ['Date', 'Invoice #', 'Client', 'Taxable Amount', 'CGST', 'SGST', 'IGST', 'Total'];
    const rows = gstFilteredInvoices.map(inv => [
      format(new Date(inv.createdAt), 'dd/MM/yyyy'),
      inv.invoiceNumber,
      inv.clientName,
      inv.subtotal,
      inv.cgst || 0,
      inv.sgst || 0,
      inv.igst || 0,
      inv.totalAmount
    ]);

    // Add totals row
    rows.push([
      'TOTAL',
      '',
      '',
      gstReport.taxable,
      gstReport.cgst,
      gstReport.sgst,
      gstReport.igst,
      gstReport.total
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `GST_Report_${dateRange.start}_to_${dateRange.end}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
    const cgst = monthInvoices.reduce((sum, inv) => sum + (inv.cgst || 0), 0);
    const sgst = monthInvoices.reduce((sum, inv) => sum + (inv.sgst || 0), 0);
    const igst = monthInvoices.reduce((sum, inv) => sum + (inv.igst || 0), 0);
    return { name: monthStr, revenue: total, cgst, sgst, igst };
  });

  // GST Pie Data (CGST vs SGST vs IGST)
  const gstPieData = [
    { name: 'CGST', value: gstReport.cgst, color: '#6366f1' },
    { name: 'SGST', value: gstReport.sgst, color: '#10b981' },
    { name: 'IGST', value: gstReport.igst, color: '#f59e0b' }
  ].filter(item => item.value > 0);

  // Top 5 Invoices by GST Amount for Pie Chart
  const topInvoicesGstData = [...gstFilteredInvoices]
    .map(inv => ({
      name: inv.invoiceNumber,
      value: (inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0)
    }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Reports & Analytics</h1>
          <p className="text-slate-500">Financial insights and business performance metrics.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={exportGSTToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
          >
            <FileSpreadsheet size={18} />
            Export GST Report
          </button>
        </div>
      </header>

      {/* GST Summary with Filters */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <PieChartIcon size={20} className="text-indigo-600" />
              Tax Collected Summary
            </h2>
            <p className="text-sm text-slate-500">Summary of GST collection (CGST, SGST, IGST)</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <Calendar size={18} className="text-slate-400" />
              Period:
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
              <span className="text-slate-400 text-xs text-xs">to</span>
              <input 
                type="date" 
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Taxable Amount</p>
            <p className="text-xl font-bold text-slate-900">₹{gstReport.taxable.toLocaleString()}</p>
          </div>
          <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">CGST Collected</p>
            <p className="text-xl font-bold text-indigo-700">₹{gstReport.cgst.toLocaleString()}</p>
          </div>
          <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">SGST Collected</p>
            <p className="text-xl font-bold text-emerald-700">₹{gstReport.sgst.toLocaleString()}</p>
          </div>
          <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">IGST Collected</p>
            <p className="text-xl font-bold text-amber-700">₹{gstReport.igst.toLocaleString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* GST Type Breakdown Pie */}
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 mb-4">GST Type Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gstPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {gstPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Amount']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tax Contribution by Invoice Pie */}
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Top 5 Invoices by GST</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topInvoicesGstData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {topInvoicesGstData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [`₹${value.toLocaleString()}`, 'GST Amount']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly GST Trend Bar Chart */}
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 lg:col-span-1">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Monthly Collection Trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => `₹${v/1000}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [`₹${value.toLocaleString()}`, '']}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                  <Bar dataKey="cgst" name="CGST" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sgst" name="SGST" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="igst" name="IGST" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">GST Breakdown by Invoice</h3>
            <span className="text-xs text-slate-400">{gstFilteredInvoices.length} invoices found</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-widest font-bold">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3 text-right">Taxable</th>
                  <th className="px-4 py-3 text-right">CGST</th>
                  <th className="px-4 py-3 text-right">SGST</th>
                  <th className="px-4 py-3 text-right">IGST</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {gstFilteredInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-600">{format(new Date(inv.createdAt), 'dd MMM yy')}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 text-slate-600">{inv.clientName}</td>
                    <td className="px-4 py-3 text-right font-medium">₹{inv.subtotal.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-indigo-600 font-medium">₹{(inv.cgst || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-medium">₹{(inv.sgst || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-amber-600 font-medium">₹{(inv.igst || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">₹{inv.totalAmount.toLocaleString()}</td>
                  </tr>
                ))}
                {gstFilteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-400 italic">
                      No invoices found for the selected period.
                    </td>
                  </tr>
                )}
              </tbody>
              {gstFilteredInvoices.length > 0 && (
                <tfoot className="bg-slate-50/50 font-bold text-slate-900">
                  <tr>
                    <td colSpan={3} className="px-4 py-4 text-slate-500 uppercase text-xs tracking-wider">Grand Total</td>
                    <td className="px-4 py-4 text-right">₹{gstReport.taxable.toLocaleString()}</td>
                    <td className="px-4 py-4 text-right text-indigo-700">₹{gstReport.cgst.toLocaleString()}</td>
                    <td className="px-4 py-4 text-right text-emerald-700">₹{gstReport.sgst.toLocaleString()}</td>
                    <td className="px-4 py-4 text-right text-amber-700">₹{gstReport.igst.toLocaleString()}</td>
                    <td className="px-4 py-4 text-right text-indigo-600 font-extrabold bg-indigo-50/30">₹{gstReport.total.toLocaleString()}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Growth Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp size={20} className="text-indigo-600" />
              Revenue Growth {currentYear}
            </h3>
          </div>
          <div className="h-72">
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
                  formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Other metrics cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-sm font-medium text-slate-500 mb-1">Pending Receivables</p>
            <p className="text-2xl font-bold text-amber-600">
              ₹{invoices.filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled').reduce((sum, inv) => sum + inv.totalAmount, 0).toLocaleString()}
            </p>
            <p className="mt-2 text-xs text-slate-400">From {invoices.filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled').length} unpaid invoices</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-sm font-medium text-slate-500 mb-1">Avg. Deal Size</p>
            <p className="text-2xl font-bold text-indigo-600">
              ₹{invoices.length > 0 ? (invoices.reduce((sum, inv) => sum + inv.totalAmount, 0) / invoices.length).toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0}
            </p>
            <p className="mt-2 text-xs text-slate-400">Based on {invoices.length} total invoices</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 sm:col-span-2">
            <p className="text-sm font-medium text-slate-500 mb-1">Leads Performance</p>
            <div className="flex items-end gap-2">
              <p className="text-2xl font-bold text-slate-900">{leads.filter(l => l.status === 'closed').length}</p>
              <p className="text-sm text-slate-400 pb-1">deals closed out of {leads.length} leads</p>
            </div>
            <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500" 
                style={{ width: `${leads.length > 0 ? (leads.filter(l => l.status === 'closed').length / leads.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
