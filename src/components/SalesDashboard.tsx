import React from 'react';
import { 
  Target, 
  TrendingUp, 
  Users, 
  PhoneCall, 
  Mail, 
  Calendar,
  ChevronRight,
  Clock,
  Briefcase
} from 'lucide-react';
import { Lead } from '../types';
import { format } from 'date-fns';

interface SalesDashboardProps {
  leads: Lead[];
}

const SalesDashboard: React.FC<SalesDashboardProps> = ({ leads }) => {
  const activeLeads = leads.filter(l => l.status === 'new' || l.status === 'contacted');
  const hotLeads = leads.filter(l => l.priority === 'high');
  const followUpsToday = leads.filter(l => l.followUpDate && new Date(l.followUpDate).toDateString() === new Date().toDateString());

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Sales Hub</h1>
        <p className="text-slate-500">Track your pipeline and upcoming follow-ups.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Active Pipeline', value: activeLeads.length, icon: Target, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Hot Leads', value: hotLeads.length, icon: TrendingUp, color: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'Follow-ups Today', value: followUpsToday.length, icon: PhoneCall, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Total Prospects', value: leads.length, icon: Users, color: 'text-slate-600', bg: 'bg-slate-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Pipeline */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Hot Pipeline</h3>
              <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700">View All Leads</button>
            </div>
            <div className="divide-y divide-slate-100">
              {hotLeads.length > 0 ? (
                hotLeads.slice(0, 5).map(lead => (
                  <div key={lead.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                        <Briefcase size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{lead.title}</h4>
                        <p className="text-sm text-slate-500">{lead.contactName} • {lead.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <p className="text-sm font-bold text-slate-900">₹{lead.budget.toLocaleString()}</p>
                        <p className="text-xs text-slate-500 uppercase font-medium tracking-wider">{lead.status}</p>
                      </div>
                      <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-slate-500 italic">No hot leads at the moment. Time to hunt!</div>
              )}
            </div>
          </div>
        </div>

        {/* Reminders / Schedule */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Clock size={20} className="text-amber-500" /> Today's Calls
            </h3>
            <div className="space-y-4">
              {followUpsToday.length > 0 ? (
                followUpsToday.map(lead => (
                  <div key={lead.id} className="p-4 border border-slate-100 rounded-xl hover:border-amber-200 transition-all">
                    <p className="font-bold text-slate-900 text-sm mb-1">{lead.contactName}</p>
                    <p className="text-xs text-slate-500 mb-3">{lead.title}</p>
                    <div className="flex gap-2">
                      <a href={`tel:${lead.contactPhone}`} className="flex-1 py-2 bg-amber-50 text-amber-600 text-[10px] font-bold rounded-lg uppercase tracking-wider hover:bg-amber-100 transition-colors text-center">Call</a>
                      <a href={`mailto:${lead.contactEmail}`} className="flex-1 py-2 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-lg uppercase tracking-wider hover:bg-indigo-100 transition-colors text-center">Email</a>
                      <a 
                        href="https://calendar.app.google/EgR8zWarU7wkkVJP9" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 py-2 bg-purple-50 text-purple-600 text-[10px] font-bold rounded-lg uppercase tracking-wider hover:bg-purple-100 transition-colors text-center"
                      >
                        Meet
                      </a>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 text-sm italic">
                  No follow-ups for today.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesDashboard;
