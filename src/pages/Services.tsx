import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  Package, 
  Tag, 
  IndianRupee, 
  RefreshCw, 
  MoreVertical,
  Edit,
  Trash2,
  XCircle,
  Hash
} from 'lucide-react';
import { subscribeToCollection, createDocument, updateDocument, deleteDocument } from '../services/firestore';
import { Service } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Services: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToCollection<Service>('services', [], setServices);
    return () => unsub();
  }, []);

  const filteredServices = services.filter(service => 
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    service.hsn.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const seedAllServices = async () => {
    const defaultServices = [
      // One-time Services
      { name: "Google Business Profile Optimization & Local SEO Services", hsn: "998313", price: 20000, gstRate: 18, isRecurring: false, description: "GMB Power Optimization Plan - One-time setup per page optimization." },
      { name: "Website Design & Development Services", hsn: "998314", price: 25000, gstRate: 18, isRecurring: false, description: "Website Development Plan - Custom design and development." },
      { name: "Basic Digital Business Setup Services", hsn: "998313", price: 999, gstRate: 18, isRecurring: false, description: "Smart Business Digital Setup." },
      { name: "Business Email & IT Configuration Services", hsn: "998313", price: 2999, gstRate: 18, isRecurring: false, description: "Business Email Setup." },
      { name: "Billing Software / System Setup Services", hsn: "998314", price: 2999, gstRate: 18, isRecurring: false, description: "GST / Non-GST Invoice System Setup." },
      { name: "Cloud Email & Workspace Setup Services", hsn: "998313", price: 4999, gstRate: 18, isRecurring: false, description: "Google Workspace Setup." },
      { name: "Graphic Design & Branding Services", hsn: "998391", price: 5999, gstRate: 18, isRecurring: false, description: "Basic Branding Starter." },
      { name: "Promotional Video Production Services", hsn: "999612", price: 4999, gstRate: 18, isRecurring: false, description: "Promotional Video / Reel." },
      { name: "Photography & Visual Content Services", hsn: "998386", price: 4999, gstRate: 18, isRecurring: false, description: "360 Photos / Media Creation." },
      { name: "Social Media Optimization & Setup Services", hsn: "998313", price: 4999, gstRate: 18, isRecurring: false, description: "Social Media Page Optimization." },
      { name: "WhatsApp Business Setup & Automation Services", hsn: "998319", price: 4999, gstRate: 18, isRecurring: false, description: "WhatsApp Business Setup." },
      { name: "QR Code Design & Marketing Materials", hsn: "998391", price: 1999, gstRate: 18, isRecurring: false, description: "QR Code Design & Development." },
      
      // Yearly Services
      { name: "SEO Audit & Digital Performance Analysis", hsn: "998313", price: 4999, gstRate: 18, isRecurring: true, description: "Local SEO Audit (Yearly)." },
      { name: "Website Hosting & Maintenance Services", hsn: "998314", price: 4999, gstRate: 18, isRecurring: true, description: "Website Renewal (Domain + Hosting)." },
      { name: "Data Backup & Support Services", hsn: "998599", price: 999, gstRate: 18, isRecurring: true, description: "Branding File Backup / Maintenance." },
      { name: "Cloud Support & Maintenance Services", hsn: "998313", price: 2999, gstRate: 18, isRecurring: true, description: "Google Workspace Annual Support." },
      
      // Monthly Services
      { name: "Digital Advertising & GMB Management Services", hsn: "998361", price: 4999, gstRate: 18, isRecurring: true, description: "GMB Management + Google Ads." },
      { name: "Social Media Marketing & Advertising Services", hsn: "998361", price: 4999, gstRate: 18, isRecurring: true, description: "Social Media + Meta Ads." },
      { name: "Messaging & Communication Services", hsn: "998319", price: 4999, gstRate: 18, isRecurring: true, description: "WhatsApp Bulk SMS / API Services." },
      { name: "Video Marketing & Channel Management Services", hsn: "998361", price: 4999, gstRate: 18, isRecurring: true, description: "YouTube Management." },
      { name: "Content Design & Creative Services", hsn: "998391", price: 4999, gstRate: 18, isRecurring: true, description: "Content Creation (Posts + Reels)." },
      { name: "Digital Marketing & Advertising Services Package", hsn: "998361", price: 25000, gstRate: 18, isRecurring: true, description: "Full Monthly Marketing Plan." },
    ];

    if (confirm(`Seed ${defaultServices.length} standard agency services?`)) {
      for (const service of defaultServices) {
        await createDocument('services', service);
      }
      alert('Services seeded successfully!');
    }
  };

  const handleSaveService = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const serviceData = {
      name: formData.get('name') as string,
      hsn: formData.get('hsn') as string,
      gstRate: parseFloat(formData.get('gstRate') as string),
      price: parseFloat(formData.get('price') as string),
      description: formData.get('description') as string,
      features: (formData.get('features') as string).split('\n').filter(f => f.trim() !== ''),
      isRecurring: formData.get('isRecurring') === 'on',
    };

    if (editingService) {
      await updateDocument('services', editingService.id!, serviceData);
    } else {
      await createDocument('services', serviceData);
    }
    
    setIsModalOpen(false);
    setEditingService(null);
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setIsModalOpen(true);
    setActiveMenu(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the service "${name}"?`)) {
      await deleteDocument('services', id);
    }
    setActiveMenu(null);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Services</h1>
          <p className="text-slate-500">Define your agency services and pricing models.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button 
            onClick={seedAllServices}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-all"
          >
            <Package size={20} />
            Seed All Services
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
          >
            <Plus size={20} />
            Add Service
          </button>
        </div>
      </header>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search services by name or HSN..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.map((service) => (
          <div key={service.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 hover:border-indigo-200 transition-all overflow-hidden group">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                  <Package size={24} />
                </div>
                {service.isRecurring && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-100">
                    <RefreshCw size={10} /> Recurring
                  </span>
                )}
              </div>
              
              <h3 className="text-lg font-bold text-slate-900 mb-1 truncate">{service.name}</h3>
              {service.description && (
                <p className="text-xs text-slate-500 mb-3 line-clamp-2">{service.description}</p>
              )}
              {service.features && service.features.length > 0 && (
                <div className="mb-4 space-y-1">
                  {service.features.slice(0, 3).map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px] text-slate-400">
                      <div className="w-1 h-1 bg-slate-300 rounded-full" />
                      <span className="truncate">{feature}</span>
                    </div>
                  ))}
                  {service.features.length > 3 && (
                    <p className="text-[10px] text-indigo-500 font-medium">+{service.features.length - 3} more features</p>
                  )}
                </div>
              )}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Hash size={14} className="text-slate-400" />
                  <span>HSN: {service.hsn}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Tag size={14} className="text-slate-400" />
                  <span>GST: {service.gstRate}%</span>
                </div>
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-0.5">Base Price</p>
                  <p className="text-2xl font-black text-slate-900 flex items-center gap-0.5">
                    <IndianRupee size={20} className="text-slate-400" />
                    {service.price.toLocaleString()}
                  </p>
                </div>
                <div className="relative">
                  <button 
                    onClick={() => setActiveMenu(activeMenu === service.id ? null : (service.id || null))}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
                  >
                    <MoreVertical size={18} />
                  </button>
                  
                  {activeMenu === service.id && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setActiveMenu(null)}
                      />
                      <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-xl border border-slate-100 z-20 py-1 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                        <button 
                          onClick={() => handleEdit(service)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                        >
                          <Edit size={14} /> Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(service.id!, service.name)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredServices.length === 0 && (
          <div className="col-span-full text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <Package size={32} />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">No services found</h3>
            <p className="text-slate-500">Define your service catalog to start billing.</p>
          </div>
        )}
      </div>

      {/* Add/Edit Service Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {editingService ? 'Edit Service' : 'Add New Service'}
              </h2>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingService(null);
                }} 
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <XCircle size={24} className="text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSaveService} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Service Name</label>
                <input 
                  name="name" 
                  required 
                  type="text" 
                  defaultValue={editingService?.name}
                  placeholder="e.g. Monthly SEO Retainer" 
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                <textarea 
                  name="description" 
                  rows={2} 
                  defaultValue={editingService?.description}
                  placeholder="Brief description of the service..." 
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Features (One per line)</label>
                <textarea 
                  name="features" 
                  rows={3} 
                  defaultValue={editingService?.features?.join('\n')}
                  placeholder="Feature 1&#10;Feature 2&#10;Feature 3" 
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">HSN/SAC Code</label>
                  <input 
                    name="hsn" 
                    required 
                    type="text" 
                    defaultValue={editingService?.hsn}
                    placeholder="998311" 
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">GST Rate (%)</label>
                  <select 
                    name="gstRate" 
                    required 
                    defaultValue={editingService?.gstRate || 18}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  >
                    <option value="18">18% (Standard)</option>
                    <option value="12">12%</option>
                    <option value="5">5%</option>
                    <option value="28">28%</option>
                    <option value="0">0% (Exempt)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Base Price (₹)</label>
                <input 
                  name="price" 
                  required 
                  type="number" 
                  defaultValue={editingService?.price}
                  placeholder="25000" 
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
                />
              </div>
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <input 
                  name="isRecurring" 
                  type="checkbox" 
                  id="isRecurring" 
                  defaultChecked={editingService?.isRecurring}
                  className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500" 
                />
                <label htmlFor="isRecurring" className="text-sm font-medium text-slate-700">This is a recurring service (Retainer)</label>
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingService(null);
                  }} 
                  className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
                >
                  {editingService ? 'Update Service' : 'Save Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Services;
