import React, { useEffect, useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Building2, 
  ShieldCheck, 
  Mail, 
  Phone, 
  MapPin, 
  Save,
  UserCog,
  Bell,
  Lock,
  Globe
} from 'lucide-react';
import { getDocument, updateDocument } from '../services/firestore';
import { CompanySettings } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const data = await getDocument<CompanySettings>('settings', 'company');
      setSettings(data);
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const formData = new FormData(e.currentTarget);
    const newSettings: CompanySettings = {
      name: formData.get('name') as string,
      address: formData.get('address') as string,
      gstin: formData.get('gstin') as string,
      state: formData.get('state') as string,
      stateCode: formData.get('stateCode') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      upiId: formData.get('upiId') as string,
      bankDetails: formData.get('bankDetails') as string,
      termsAndConditions: formData.get('termsAndConditions') as string,
      paymentUrl: formData.get('paymentUrl') as string,
    };

    try {
      await updateDocument('settings', 'company', newSettings);
      setSettings(newSettings);
      setMessage({ type: 'success', text: 'Settings updated successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update settings.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading settings...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500">Configure your agency profile and system preferences.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Sidebar Tabs */}
        <div className="md:col-span-1 space-y-1">
          <button className="w-full flex items-center gap-3 px-4 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl font-semibold transition-all">
            <Building2 size={20} />
            Agency Profile
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-500 hover:bg-slate-50 rounded-xl font-medium transition-all">
            <UserCog size={20} />
            User Roles
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-500 hover:bg-slate-50 rounded-xl font-medium transition-all">
            <Bell size={20} />
            Notifications
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-500 hover:bg-slate-50 rounded-xl font-medium transition-all">
            <Lock size={20} />
            Security
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-500 hover:bg-slate-50 rounded-xl font-medium transition-all">
            <Globe size={20} />
            Integrations
          </button>
        </div>

        {/* Content Area */}
        <div className="md:col-span-3 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Agency Profile</h3>
              <p className="text-sm text-slate-500">This information will appear on your GST invoices.</p>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-6">
              {message && (
                <div className={cn(
                  "p-4 rounded-xl text-sm font-medium",
                  message.type === 'success' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                )}>
                  {message.text}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Agency Name</label>
                  <input name="name" defaultValue={settings?.name} required type="text" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">GSTIN</label>
                  <input name="gstin" defaultValue={settings?.gstin} required type="text" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number</label>
                  <input name="phone" defaultValue={settings?.phone} required type="tel" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                  <input name="email" defaultValue={settings?.email} required type="email" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Registered Address</label>
                  <textarea name="address" defaultValue={settings?.address} required rows={3} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">State</label>
                  <input name="state" defaultValue={settings?.state} required type="text" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">State Code</label>
                  <input name="stateCode" defaultValue={settings?.stateCode} required type="text" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">UPI ID (for QR Code)</label>
                  <input name="upiId" defaultValue={settings?.upiId} type="text" placeholder="e.g. yourname@upi" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Custom Payment URL (e.g. PayNow link)</label>
                  <input name="paymentUrl" defaultValue={settings?.paymentUrl} type="url" placeholder="https://example.com/pay" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Bank Details (Account No, IFSC, etc.)</label>
                  <textarea name="bankDetails" defaultValue={settings?.bankDetails} rows={3} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" placeholder="Bank: HDFC Bank&#10;A/C: 1234567890&#10;IFSC: HDFC0001234"></textarea>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Terms & Conditions</label>
                  <textarea name="termsAndConditions" defaultValue={settings?.termsAndConditions} rows={4} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" placeholder="1. Payment is due within 7 days.&#10;2. Goods once sold will not be taken back."></textarea>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <button 
                  type="submit" 
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : (
                    <>
                      <Save size={20} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Role-Based Access Control</h4>
                <p className="text-sm text-slate-500">Manage permissions for your team members.</p>
              </div>
            </div>
            <button className="px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
              Manage Roles
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
