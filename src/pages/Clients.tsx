import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  MoreVertical,
  XCircle,
  Building2,
  ShieldCheck
} from 'lucide-react';
import { subscribeToCollection, createDocument, updateDocument } from '../services/firestore';
import { sendWelcomeEmail } from '../services/email';
import { Client } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ClientDashboard from './ClientDashboard';
import { ArrowLeft, LayoutDashboard } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToCollection<Client>('clients', [], setClients);
    return () => unsub();
  }, []);

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    client.gstin.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newClient = {
      name: formData.get('name') as string,
      gstin: formData.get('gstin') as string,
      address: formData.get('address') as string,
      state: formData.get('state') as string,
      stateCode: formData.get('stateCode') as string,
      contactPerson: formData.get('contactPerson') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      udyamAdhar: formData.get('udyamAdhar') as string,
      status: 'active' as const,
      accountManager: '',
    };

    await createDocument('clients', newClient);
    await sendWelcomeEmail(newClient.email, newClient.name);
    setIsModalOpen(false);
  };

  if (selectedClientId) {
    return (
      <div className="space-y-6">
        <button 
          onClick={() => setSelectedClientId(null)}
          className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-semibold transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Clients List
        </button>
        <ClientDashboard clientId={selectedClientId} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Clients</h1>
          <p className="text-slate-500">Manage your customer master and billing information.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
        >
          <Plus size={20} />
          Add New Client
        </button>
      </header>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search clients by name or GSTIN..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map((client) => (
          <div key={client.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 hover:border-indigo-200 transition-all overflow-hidden group">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                  <Building2 size={24} />
                </div>
                <span className={cn(
                  "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                  client.status === 'active' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"
                )}>
                  {client.status}
                </span>
              </div>
              
              <h3 className="text-lg font-bold text-slate-900 mb-1 truncate">{client.name}</h3>
              <div className="flex flex-col gap-1.5 text-xs text-slate-500 mb-4">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-indigo-500" />
                  <span className="font-medium">GSTIN: {client.gstin || 'N/A'}</span>
                </div>
                {client.udyamAdhar && (
                  <div className="flex items-center gap-1.5">
                    <FileText size={14} className="text-amber-500" />
                    <span className="font-medium">Udyam Adhar: {client.udyamAdhar}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2.5 mb-6">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <User size={16} className="text-slate-400 shrink-0" />
                  <span className="truncate">{client.contactPerson}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Mail size={16} className="text-slate-400 shrink-0" />
                  <span className="truncate">{client.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Phone size={16} className="text-slate-400 shrink-0" />
                  <span>{client.phone}</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-slate-600">
                  <MapPin size={16} className="text-slate-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{client.address}, {client.state}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-slate-50">
                <button 
                  onClick={() => setSelectedClientId(client.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-semibold hover:bg-indigo-100 transition-all"
                >
                  <LayoutDashboard size={16} />
                  Dashboard
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-50 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-100 transition-all">
                  <FileText size={16} />
                  Invoices
                </button>
                <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredClients.length === 0 && (
          <div className="col-span-full text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <Users size={32} />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">No clients found</h3>
            <p className="text-slate-500">Add your first client to start billing.</p>
          </div>
        )}
      </div>

      {/* Add Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Add New Client</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <XCircle size={24} className="text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleAddClient} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Company Name</label>
                  <input name="name" required type="text" placeholder="e.g. TechCorp Solutions Pvt Ltd" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">GSTIN</label>
                  <input name="gstin" type="text" placeholder="27AAAAA0000A1Z5" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Udyam Adhar</label>
                  <input name="udyamAdhar" type="text" placeholder="UDYAM-XX-00-0000000" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Contact Person</label>
                  <input name="contactPerson" required type="text" placeholder="John Doe" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                  <input name="email" required type="email" placeholder="billing@techcorp.com" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number</label>
                  <input name="phone" required type="tel" placeholder="+91 98765 43210" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Billing Address</label>
                  <textarea name="address" required rows={2} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" placeholder="House No, Street, Area..."></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">State</label>
                  <input name="state" required type="text" placeholder="Maharashtra" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">State Code</label>
                  <input name="stateCode" required type="text" placeholder="27" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-all">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100">Save Client</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import { Users } from 'lucide-react';
export default Clients;
