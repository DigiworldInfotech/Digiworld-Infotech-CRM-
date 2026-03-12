import React, { useEffect, useState } from 'react';
import { 
  Briefcase, 
  FileText, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Calendar,
  ArrowRight
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { subscribeToCollection } from '../services/firestore';
import { Project, Invoice, Communication, Client } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import InvoiceView from '../components/InvoiceView';

interface ClientDashboardProps {
  clientId?: string;
}

const ClientDashboard: React.FC<ClientDashboardProps> = ({ clientId: propClientId }) => {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);

  const effectiveClientId = propClientId || profile?.clientId;

  useEffect(() => {
    if (!effectiveClientId) return;

    // Fetch client details
    const unsubClient = subscribeToCollection<Client>('clients', [], (clients) => {
      const currentClient = clients.find(c => c.id === effectiveClientId);
      if (currentClient) setClient(currentClient);
    });

    // Fetch projects for this client
    const unsubProjects = subscribeToCollection<Project>('projects', [], (allProjects) => {
      setProjects(allProjects.filter(p => p.clientId === effectiveClientId));
    });

    // Fetch invoices for this client
    const unsubInvoices = subscribeToCollection<Invoice>('invoices', [], (allInvoices) => {
      setInvoices(allInvoices.filter(i => i.clientId === effectiveClientId));
    });

    // Fetch communications for this client
    const unsubComms = subscribeToCollection<Communication>('communications', [], (allComms) => {
      setCommunications(allComms.filter(c => c.clientId === effectiveClientId));
    });

    return () => {
      unsubClient();
      unsubProjects();
      unsubInvoices();
      unsubComms();
    };
  }, [effectiveClientId]);

  const activeProjects = projects.filter(p => p.status === 'in_progress' || p.status === 'planning');
  const pendingInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'overdue');
  const totalSpent = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.totalAmount, 0);

  const projectStatusData = [
    { name: 'Active', value: activeProjects.length },
    { name: 'Completed', value: projects.filter(p => p.status === 'completed').length },
    { name: 'Other', value: projects.filter(p => p.status === 'on_hold' || p.status === 'cancelled').length },
  ].filter(d => d.value > 0);

  const COLORS = ['#6366f1', '#10b981', '#94a3b8'];

  if (!effectiveClientId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <AlertCircle size={48} className="text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-900">No Client Profile Linked</h2>
        <p className="text-slate-500 max-w-md mx-auto mt-2">
          Your account is not currently linked to a client profile. Please contact your account manager to resolve this.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Welcome, {profile.name}</h1>
          <p className="text-slate-500">Overview of your partnership with DigiWorld Infotech.</p>
        </div>
        {client && (
          <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
              <Briefcase size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Client Account</p>
              <p className="text-sm font-bold text-slate-900">{client.name}</p>
            </div>
          </div>
        )}
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Briefcase size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Active Projects</p>
              <p className="text-2xl font-bold text-slate-900">{activeProjects.length}</p>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-indigo-600 h-full transition-all duration-500" 
              style={{ width: `${projects.length > 0 ? (activeProjects.length / projects.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <FileText size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Pending Invoices</p>
              <p className="text-2xl font-bold text-slate-900">{pendingInvoices.length}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Total Pending: <span className="font-bold text-slate-900">₹{pendingInvoices.reduce((sum, i) => sum + i.totalAmount, 0).toLocaleString()}</span>
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Total Investment</p>
              <p className="text-2xl font-bold text-slate-900">₹{totalSpent.toLocaleString()}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">Across all paid invoices</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Projects List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Your Projects</h3>
              <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">View All</button>
            </div>
            <div className="p-6 space-y-6">
              {activeProjects.length > 0 ? (
                activeProjects.map(project => (
                  <div key={project.id} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{project.name}</h4>
                        <p className="text-sm text-slate-500 line-clamp-1">{project.description}</p>
                      </div>
                      <span className="text-sm font-bold text-indigo-600">{project.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-4">
                      <div 
                        className="bg-indigo-600 h-full transition-all duration-700" 
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          Started: {format(new Date(project.startDate), 'dd MMM yyyy')}
                        </span>
                        <span className="flex items-center gap-1 capitalize">
                          <div className="w-2 h-2 rounded-full bg-indigo-500" />
                          {project.status.replace('_', ' ')}
                        </span>
                      </div>
                      <button className="flex items-center gap-1 text-indigo-600 font-semibold hover:underline">
                        Details <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-500 italic">No active projects at the moment.</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Invoices */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Recent Invoices</h3>
              <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">Billing History</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 font-semibold">Invoice #</th>
                    <th className="px-6 py-4 font-semibold">Amount</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.slice(0, 5).map((inv) => (
                    <tr 
                      key={inv.id} 
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => setViewingInvoice(inv)}
                    >
                      <td className="px-6 py-4 font-medium text-slate-900">{inv.invoiceNumber}</td>
                      <td className="px-6 py-4 font-semibold text-slate-900">₹{inv.totalAmount.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                          inv.status === 'paid' ? "bg-emerald-50 text-emerald-600" :
                          inv.status === 'overdue' ? "bg-rose-50 text-rose-600" :
                          "bg-amber-50 text-amber-600"
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm">{format(new Date(inv.dueDate), 'dd MMM yyyy')}</td>
                    </tr>
                  ))}
                  {invoices.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-500 italic">No invoices found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar: Communication & Distribution */}
        <div className="space-y-8">
          {/* Project Distribution Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Project Status</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={projectStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {projectStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {projectStatusData.map((item, i) => (
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

          {/* Communication History */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Communication History</h3>
            </div>
            <div className="p-6 space-y-6">
              {communications.length > 0 ? (
                communications.slice(0, 5).map((comm) => (
                  <div key={comm.id} className="flex gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      comm.type === 'email' ? 'bg-blue-50 text-blue-600' :
                      comm.type === 'call' ? 'bg-emerald-50 text-emerald-600' :
                      comm.type === 'meeting' ? 'bg-purple-50 text-purple-600' :
                      'bg-slate-50 text-slate-600'
                    }`}>
                      {comm.type === 'email' ? <FileText size={20} /> :
                       comm.type === 'call' ? <Clock size={20} /> :
                       comm.type === 'meeting' ? <Users size={20} /> :
                       <MessageSquare size={20} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{comm.subject}</p>
                      <p className="text-xs text-slate-500 mb-1">{format(new Date(comm.date), 'dd MMM, hh:mm a')}</p>
                      <p className="text-xs text-slate-600 line-clamp-2">{comm.content}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-slate-500 text-sm italic">No communication history yet.</p>
                </div>
              )}
            </div>
            <div className="p-4 bg-slate-50 text-center">
              <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700">View All Interactions</button>
            </div>
          </div>
        </div>
      </div>

      {viewingInvoice && client && (
        <InvoiceView 
          invoice={viewingInvoice}
          client={client}
          onClose={() => setViewingInvoice(null)}
        />
      )}
    </div>
  );
};

import { Users } from 'lucide-react';
export default ClientDashboard;
