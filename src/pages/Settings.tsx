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
  Globe,
  Plus,
  Trash2
} from 'lucide-react';
import { getDocument, updateDocument, subscribeToCollection, createDocument, deleteDocument } from '../services/firestore';
import { CompanySettings, UserProfile, UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';
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

  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'email' | 'roles' | 'notifications'>('profile');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const data = await getDocument<CompanySettings>('settings', 'company');
      setSettings(data);
      setLoading(false);
    };
    fetchSettings();

    const unsubUsers = subscribeToCollection<UserProfile>('users', [], setUsers);
    return () => unsubUsers();
  }, []);

  const handleRoleUpdate = async (userId: string, newRole: UserRole) => {
    setUpdatingRole(userId);
    try {
      await updateDocument('users', userId, { role: newRole });
      setMessage({ type: 'success', text: 'User role updated successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update user role.' });
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleAddUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const name = formData.get('name') as string;
    const role = formData.get('role') as UserRole;

    // Use email as UID for pre-registered users (AuthContext will link them)
    // Actually, it's better to just use a random ID or the email.
    // When they login via Google, we find them by email.
    const newUser: UserProfile = {
      uid: `temp_${Date.now()}`,
      email,
      name,
      role,
    };

    try {
      // Check if user already exists
      const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        setMessage({ type: 'error', text: 'User with this email already exists.' });
        return;
      }

      await createDocument('users', newUser);
      setMessage({ type: 'success', text: 'User profile created. They can now login with their Gmail.' });
      setIsAddingUser(false);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to create user profile.' });
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!confirm('Are you sure you want to delete this team member?')) return;
    try {
      await deleteDocument('users', uid);
      setMessage({ type: 'success', text: 'User removed successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to remove user.' });
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const formData = new FormData(e.currentTarget);
    const newSettings: CompanySettings = {
      ...settings, // Keep existing values that aren't in this form partial if needed
      name: (formData.get('name') as string) || settings?.name || '',
      address: (formData.get('address') as string) || settings?.address || '',
      gstin: (formData.get('gstin') as string) || settings?.gstin || '',
      state: (formData.get('state') as string) || settings?.state || '',
      stateCode: (formData.get('stateCode') as string) || settings?.stateCode || '',
      email: (formData.get('email') as string) || settings?.email || '',
      phone: (formData.get('phone') as string) || settings?.phone || '',
      upiId: (formData.get('upiId') as string) || settings?.upiId || '',
      bankDetails: (formData.get('bankDetails') as string) || settings?.bankDetails || '',
      termsAndConditions: (formData.get('termsAndConditions') as string) || settings?.termsAndConditions || '',
      paymentUrl: (formData.get('paymentUrl') as string) || settings?.paymentUrl || '',
      overdueReminderSchedule: (formData.get('overdueReminderSchedule') as string) || settings?.overdueReminderSchedule || '',
      emailSignature: (formData.get('emailSignature') as string) || settings?.emailSignature || '',
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
          <button 
            onClick={() => setActiveTab('profile')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold transition-all",
              activeTab === 'profile' ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <Building2 size={20} />
            Agency Profile
          </button>
          <button 
            onClick={() => setActiveTab('email')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold transition-all",
              activeTab === 'email' ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <Mail size={20} />
            Email Settings
          </button>
          <button 
            onClick={() => setActiveTab('roles')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold transition-all",
              activeTab === 'roles' ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <UserCog size={20} />
            User Roles
          </button>
          <button 
            onClick={() => setActiveTab('notifications')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold transition-all",
              activeTab === 'notifications' ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <Bell size={20} />
            Notifications
          </button>
        </div>

        {/* Content Area */}
        <div className="md:col-span-3 space-y-6">
          {activeTab === 'profile' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
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
          )}

          {activeTab === 'email' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-900">Email Configuration</h3>
                <p className="text-sm text-slate-500">Customise how your outgoing emails look and when reminders are sent.</p>
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

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Signature</label>
                    <textarea name="emailSignature" defaultValue={settings?.emailSignature} rows={6} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" placeholder="Thanks & Regards,&#10;Team Agency"></textarea>
                    <p className="mt-1 text-xs text-slate-500">This signature will be appended to all outgoing welcome, invoice, and reminder emails.</p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Live Preview</h4>
                    <div className="bg-white p-4 rounded-lg border border-slate-100 text-sm text-slate-600 whitespace-pre-wrap">
                      {settings?.emailSignature || "No signature set."}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Overdue Reminder Schedule (Days after due date)</label>
                    <input name="overdueReminderSchedule" defaultValue={settings?.overdueReminderSchedule} type="text" placeholder="e.g. 1, 3, 7, 14" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                    <p className="mt-1 text-xs text-slate-500">Comma-separated numbers indicating how many days after the due date a reminder should be sent. Leave empty to disable automatic reminders.</p>
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
          )}

          {activeTab === 'roles' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">User Management</h3>
                  <p className="text-sm text-slate-500">Manage team members and their access levels.</p>
                </div>
                <button 
                  onClick={() => setIsAddingUser(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-all text-sm"
                >
                  <Plus size={18} />
                  Add Member
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                      <th className="px-6 py-4 font-semibold">User</th>
                      <th className="px-6 py-4 font-semibold">Role</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                      <th className="px-6 py-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => (
                      <tr key={u.uid} className="hover:bg-slate-50 transition-colors text-sm">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {u.photoURL ? (
                              <img src={u.photoURL} alt="" className="w-8 h-8 rounded-full" />
                            ) : (
                              <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                                {u.name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-slate-900">{u.name}</p>
                              <p className="text-xs text-slate-500">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {profile?.role === 'super_admin' && u.uid !== profile?.uid ? (
                            <select 
                              className="text-sm bg-transparent border border-slate-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500/20 outline-none font-medium text-slate-700"
                              value={u.role}
                              disabled={updatingRole === u.uid}
                              onChange={(e) => handleRoleUpdate(u.uid, e.target.value as UserRole)}
                            >
                              <option value="super_admin">Super Admin</option>
                              <option value="admin">Admin</option>
                              <option value="accountant">Accountant</option>
                              <option value="sales">Sales Specialist</option>
                              <option value="client">Client</option>
                            </select>
                          ) : (
                            <span className={cn(
                              "px-2.5 py-1 rounded-full text-xs font-bold uppercase",
                              u.role === 'super_admin' ? "bg-purple-50 text-purple-600 border border-purple-100" :
                              u.role === 'admin' ? "bg-indigo-50 text-indigo-600 border border-indigo-100" :
                              u.role === 'sales' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                              u.role === 'accountant' ? "bg-blue-50 text-blue-600 border border-blue-100" :
                              "bg-amber-50 text-amber-600 border border-amber-100"
                            )}>
                              {u.role.replace('_', ' ')}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                            Active
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            disabled={u.email === 'admin@digiworldinfotech.in'}
                            onClick={() => handleDeleteUser(u.uid)}
                            className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all disabled:opacity-30"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {isAddingUser && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6">
                    <h3 className="text-xl font-bold text-slate-900 mb-4">Add Team Member</h3>
                    <form onSubmit={handleAddUser} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                        <input name="name" required type="text" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address (Gmail)</label>
                        <input name="email" required type="email" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Job Role</label>
                        <select name="role" required className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all">
                          <option value="sales">Sales Specialist</option>
                          <option value="accountant">Accountant</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div className="pt-4 flex gap-3">
                        <button type="button" onClick={() => setIsAddingUser(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-all">Cancel</button>
                        <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all">Create Profile</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300 px-6 py-8 text-center text-slate-500">
              <p>Notification preferences coming soon.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
