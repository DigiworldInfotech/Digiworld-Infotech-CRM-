import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  FileText, 
  CreditCard, 
  Settings, 
  LogOut, 
  BarChart3,
  Package,
  Building2,
  Receipt,
  UserCheck,
  ClipboardCheck,
  Menu,
  X
} from 'lucide-react';
import { auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Sidebar: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/', roles: ['super_admin', 'admin', 'sales', 'accountant'] },
    { name: 'Team Members', icon: UserCheck, path: '/users', roles: ['super_admin'] },
    { name: 'CRM Leads', icon: Briefcase, path: '/leads', roles: ['super_admin', 'admin', 'sales'] },
    { name: 'Clients', icon: Users, path: '/clients', roles: ['super_admin', 'admin', 'sales', 'accountant'] },
    { name: 'Services', icon: Package, path: '/services', roles: ['super_admin', 'admin'] },
    { name: 'Estimates', icon: ClipboardCheck, path: '/estimates', roles: ['super_admin', 'admin', 'sales'] },
    { name: 'Invoices', icon: FileText, path: '/invoices', roles: ['super_admin', 'admin', 'accountant', 'sales'] },
    { name: 'Payments', icon: CreditCard, path: '/payments', roles: ['super_admin', 'admin', 'accountant'] },
    { name: 'Expenses', icon: Receipt, path: '/expenses', roles: ['super_admin', 'admin', 'accountant'] },
    { name: 'Banks', icon: Building2, path: '/banks', roles: ['super_admin', 'admin', 'accountant'] },
    { name: 'Reports', icon: BarChart3, path: '/reports', roles: ['super_admin', 'admin', 'accountant'] },
    { name: 'Settings', icon: Settings, path: '/settings', roles: ['super_admin', 'admin'] },
  ];

  const filteredItems = navItems.filter(item => profile && item.roles.includes(profile.role));

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-black">D</span>
              </div>
              DigiWorld Infotech
            </h1>
          </div>

          <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
            {filteredItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                  isActive 
                    ? "bg-indigo-600 text-white" 
                    : "hover:bg-slate-800 hover:text-white"
                )}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.name}</span>
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3 px-4 py-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">
                {profile?.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{profile?.name}</p>
                <p className="text-xs text-slate-400 truncate capitalize">{profile?.role.replace('_', ' ')}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg hover:bg-slate-800 hover:text-white transition-colors text-slate-400"
            >
              <LogOut size={20} />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
