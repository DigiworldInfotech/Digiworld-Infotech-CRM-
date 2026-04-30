import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Mail, 
  Trash2, 
  ShieldAlert,
  Search,
  Filter,
  Edit,
  MoreVertical,
  XCircle
} from 'lucide-react';
import { subscribeToCollection, createDocument, updateDocument, deleteDocument } from '../services/firestore';
import { UserProfile, UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const UsersPage: React.FC = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToCollection<UserProfile>('users', [], setUsers);
    return () => unsub();
  }, []);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const userData = {
      email: formData.get('email') as string,
      name: formData.get('name') as string,
      role: formData.get('role') as UserRole,
    };

    try {
      if (editingUser) {
        await updateDocument('users', editingUser.uid, userData);
      } else {
        const newUser = {
          ...userData,
          uid: Math.random().toString(36).substring(7), // In a real app, this comes from Firebase Auth creation
          createdAt: new Date().toISOString(),
        };
        await createDocument('users', newUser);
      }
      setIsModalOpen(false);
      setEditingUser(null);
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Failed to save user profile in Firestore.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (user: UserProfile) => {
    setEditingUser(user);
    setIsModalOpen(true);
    setActiveMenu(null);
  };

  const handleDelete = async (user: UserProfile) => {
    if (user.uid === profile?.uid) {
      alert("You cannot delete your own profile.");
      return;
    }
    if (confirm(`Are you sure you want to delete the user "${user.name}"?`)) {
      await deleteDocument('users', user.uid);
    }
    setActiveMenu(null);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'super_admin': return <span className="px-2.5 py-1 bg-purple-50 text-purple-600 rounded-full text-xs font-bold uppercase tracking-wider">Super Admin</span>;
      case 'admin': return <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold uppercase tracking-wider">Admin</span>;
      case 'sales': return <span className="px-2.5 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-bold uppercase tracking-wider">Sales Specialist</span>;
      case 'accountant': return <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold uppercase tracking-wider">Accountant</span>;
      case 'client': return <span className="px-2.5 py-1 bg-slate-50 text-slate-600 rounded-full text-xs font-bold uppercase tracking-wider">Client</span>;
      default: return null;
    }
  };

  if (profile?.role !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <ShieldAlert size={48} className="text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900">Access Denied</h2>
        <p className="text-slate-500 mt-2">Only Super Admins can manage the team.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Team Management</h1>
          <p className="text-slate-500">Manage your organization's members and their access levels.</p>
        </div>
        <button 
          onClick={() => {
            setEditingUser(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
        >
          <UserPlus size={20} /> Add Member
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Members', value: users.length, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Sales Team', value: users.filter(u => u.role === 'sales').length, icon: Shield, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Accountants', value: users.filter(u => u.role === 'accountant').length, icon: Shield, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Clients', value: users.filter(u => u.role === 'client').length, icon: Users, color: 'text-slate-600', bg: 'bg-slate-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className={cn("p-3 rounded-xl", stat.bg, stat.color)}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by name or email..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Member</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => (
                <tr key={user.uid} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold">
                        {user.name.charAt(0)}
                      </div>
                      <span className="font-bold text-slate-900">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-600 text-sm">
                      <Mail size={14} /> {user.email}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="relative">
                      <button 
                        onClick={() => setActiveMenu(activeMenu === user.uid ? null : user.uid)}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
                      >
                        <MoreVertical size={18} />
                      </button>
                      
                      {activeMenu === user.uid && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setActiveMenu(null)}
                          />
                          <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-xl border border-slate-100 z-20 py-1 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                            <button 
                              onClick={() => handleEdit(user)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                            >
                              <Edit size={14} /> Edit
                            </button>
                            <button 
                              onClick={() => handleDelete(user)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 lg:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">{editingUser ? 'Edit Member' : 'Add New Member'}</h2>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingUser(null);
                }} 
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <XCircle size={24} className="text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                <input 
                  name="name" 
                  required 
                  type="text" 
                  defaultValue={editingUser?.name}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                <input 
                  name="email" 
                  required 
                  type="email" 
                  defaultValue={editingUser?.email}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Assigned Role</label>
                <select 
                  name="role" 
                  required 
                  defaultValue={editingUser?.role || 'sales'}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none"
                >
                  <option value="sales">Sales Specialist</option>
                  <option value="accountant">Accountant</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="client">Client</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingUser(null);
                  }}
                  className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isLoading ? 'Processing...' : (editingUser ? 'Update Profile' : 'Create Profile')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
