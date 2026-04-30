import React, { useEffect, useState } from 'react';
import { Plus, Search, Filter, MoreVertical, Edit, Trash2, Mail, Phone, Calendar, User, CheckCircle2, XCircle, Clock, ChevronRight, Video, AlertCircle, Briefcase, Bell } from 'lucide-react';
import { subscribeToCollection, createDocument, updateDocument, getDocument, deleteDocument } from '../services/firestore';
import { Lead, UserProfile, Notification } from '../types';
import { format, isAfter, isBefore, addDays, startOfDay, subHours, isSameDay, isTomorrow } from 'date-fns';
import { sendFollowUpEmail } from '../services/email';
import { auth } from '../firebase';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Leads: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [followUpModalLead, setFollowUpModalLead] = useState<Lead | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [isNotifying, setIsNotifying] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToCollection<Lead>('leads', [], setLeads);
    return () => unsub();
  }, []);

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         lead.contactName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || lead.status === filterStatus;
    const matchesSource = filterSource === 'all' || lead.source === filterSource;
    return matchesSearch && matchesStatus && matchesSource;
  });

  useEffect(() => {
    const checkUpcomingFollowUps = async () => {
      const now = new Date();
      const tomorrow = addDays(now, 1);
      
      const dueSoon = leads.filter(lead => {
        if (!lead.followUpDate || !lead.assignedTo) return false;
        const followUp = new Date(lead.followUpDate);
        
        // Check if follow-up is within next 24 hours AND we haven't notified in the last 24 hours
        const isSoon = isAfter(followUp, now) && isBefore(followUp, tomorrow);
        const hasNotifiedRecently = lead.lastNotifiedAt && isAfter(new Date(lead.lastNotifiedAt), subHours(now, 24));
        
        return isSoon && !hasNotifiedRecently;
      });

      for (const lead of dueSoon) {
        try {
          const assignedUser = await getDocument<UserProfile>('users', lead.assignedTo);
          if (!assignedUser) continue;

          // 1. Send Email
          await sendFollowUpEmail({
            email: assignedUser.email,
            clientName: lead.contactName,
            leadTitle: lead.title,
            followUpDate: format(new Date(lead.followUpDate!), 'dd MMM yyyy, hh:mm a'),
          });

          // 2. Create In-app Notification
          await createDocument<Omit<Notification, 'id'>>('notifications', {
            userId: lead.assignedTo,
            title: 'Upcoming Lead Follow-up',
            message: `Reminder: You have a follow-up for "${lead.title}" scheduled for ${format(new Date(lead.followUpDate!), 'hh:mm a')} tomorrow.`,
            type: 'warning',
            isRead: false,
            createdAt: new Date().toISOString(),
            link: `/leads?search=${lead.title}`
          });

          // 3. Update Lead to prevent duplicate notifications
          await updateDocument('leads', lead.id, { lastNotifiedAt: new Date().toISOString() });
          
          console.log(`Auto-notified ${assignedUser.name} about lead ${lead.title}`);
        } catch (error) {
          console.error(`Failed to auto-notify for lead ${lead.id}:`, error);
        }
      }
    };

    if (leads.length > 0) {
      checkUpcomingFollowUps();
    }
  }, [leads]);

  const handleSaveLead = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const followUpDate = formData.get('followUpDate') as string;
    
    const leadData = {
      title: formData.get('title') as string,
      contactName: formData.get('contactName') as string,
      contactEmail: formData.get('contactEmail') as string,
      contactPhone: formData.get('contactPhone') as string,
      status: (editingLead?.status || 'new') as Lead['status'],
      source: formData.get('source') as string,
      notes: formData.get('notes') as string,
      followUpDate: followUpDate ? new Date(followUpDate).toISOString() : undefined,
      createdAt: editingLead?.createdAt || new Date().toISOString(),
      assignedTo: editingLead?.assignedTo || '',
    };

    if (editingLead) {
      await updateDocument('leads', editingLead.id!, leadData);
    } else {
      await createDocument('leads', leadData);
    }
    
    setIsModalOpen(false);
    setEditingLead(null);
  };

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead);
    setIsModalOpen(true);
    setActiveMenu(null);
  };

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete the lead "${title}"?`)) {
      await deleteDocument('leads', id);
    }
    setActiveMenu(null);
  };

  const updateLeadStatus = async (id: string, status: Lead['status']) => {
    await updateDocument('leads', id, { status });
  };

  const handleSetFollowUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!followUpModalLead) return;
    
    const formData = new FormData(e.currentTarget);
    const followUpDate = formData.get('followUpDate') as string;
    
    await updateDocument('leads', followUpModalLead.id, {
      followUpDate: followUpDate ? new Date(followUpDate).toISOString() : undefined
    });
    
    setFollowUpModalLead(null);
  };

  const notifyAssignedUser = async (lead: Lead) => {
    if (!lead.assignedTo) {
      alert('No user assigned to this lead.');
      return;
    }

    setIsNotifying(lead.id);
    try {
      const assignedUser = await getDocument<UserProfile>('users', lead.assignedTo);
      if (!assignedUser) {
        alert('Assigned user not found.');
        return;
      }

      // 1. Send Email Notification
      await sendFollowUpEmail({
        email: assignedUser.email,
        clientName: lead.contactName,
        leadTitle: lead.title,
        followUpDate: lead.followUpDate ? format(new Date(lead.followUpDate), 'dd MMM yyyy, hh:mm a') : 'N/A',
      });

      // 2. Create In-app Notification
      await createDocument<Omit<Notification, 'id'>>('notifications', {
        userId: lead.assignedTo,
        title: 'Lead Follow-up Reminder',
        message: `Reminder: Follow-up for lead "${lead.title}" is scheduled for ${lead.followUpDate ? format(new Date(lead.followUpDate), 'dd MMM, hh:mm a') : 'N/A'}.`,
        type: 'warning',
        isRead: false,
        createdAt: new Date().toISOString(),
        link: `/leads?search=${lead.title}`
      });

      alert(`Notification sent to ${assignedUser.name} (${assignedUser.email})`);
    } catch (error) {
      console.error('Failed to notify user:', error);
      alert('Failed to send notification.');
    } finally {
      setIsNotifying(null);
    }
  };

  const getStatusColor = (status: Lead['status']) => {
    switch (status) {
      case 'new': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'contacted': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case 'meeting_scheduled': return 'bg-purple-50 text-purple-600 border-purple-100';
      case 'proposal_sent': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'negotiation': return 'bg-orange-50 text-orange-600 border-orange-100';
      case 'won': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'lost': return 'bg-rose-50 text-rose-600 border-rose-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const isFollowUpSoon = (dateStr?: string) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = startOfDay(new Date());
    const threeDaysFromNow = addDays(today, 3);
    return isAfter(date, today) && isBefore(date, threeDaysFromNow);
  };

  const upcomingFollowUps = leads
    .filter(lead => lead.followUpDate && isFollowUpSoon(lead.followUpDate))
    .sort((a, b) => new Date(a.followUpDate!).getTime() - new Date(b.followUpDate!).getTime());

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">CRM Leads</h1>
          <p className="text-slate-500">Manage your sales pipeline and track prospects.</p>
        </div>
        <button 
          onClick={() => {
            setEditingLead(null);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
        >
          <Plus size={20} />
          Add New Lead
        </button>
      </header>

      {/* Upcoming Follow-ups Section */}
      {upcomingFollowUps.length > 0 && (
        <section className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4 text-amber-800">
            <AlertCircle size={20} />
            <h2 className="text-lg font-bold">Upcoming Follow-ups (Next 3 Days)</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingFollowUps.map(lead => (
              <div key={`followup-${lead.id}`} className="bg-white p-4 rounded-xl shadow-sm border border-amber-200 flex items-center justify-between group">
                <div>
                  <h4 className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors truncate max-w-[150px]">{lead.title}</h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    <Clock size={12} /> 
                    {isSameDay(new Date(lead.followUpDate!), new Date()) ? (
                      <span className="text-amber-600 font-bold">Today</span>
                    ) : isTomorrow(new Date(lead.followUpDate!)) ? (
                      <span className="text-amber-600 font-semibold">Tomorrow</span>
                    ) : (
                      format(new Date(lead.followUpDate!), 'dd MMM')
                    )}, {format(new Date(lead.followUpDate!), 'hh:mm a')}
                  </p>
                </div>
                <button 
                  onClick={() => updateLeadStatus(lead.id, 'contacted')}
                  className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-all"
                  title="Mark as Contacted"
                >
                  <Phone size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search leads by name or title..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select 
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-600"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="meeting_scheduled">Meeting Scheduled</option>
            <option value="proposal_sent">Proposal Sent</option>
            <option value="negotiation">Negotiation</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>
          <select 
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-600"
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
          >
            <option value="all">All Sources</option>
            <option value="website">Website</option>
            <option value="referral">Referral</option>
            <option value="linkedin">LinkedIn</option>
            <option value="cold_call">Cold Call</option>
            <option value="google_my_business">Google My Business</option>
            <option value="youtube">YouTube</option>
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="other">Other</option>
          </select>
          <button className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 transition-all">
            <Filter size={20} />
          </button>
        </div>
      </div>

      {/* Leads List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredLeads.map((lead) => {
          const isSoon = isFollowUpSoon(lead.followUpDate);
          return (
            <div key={lead.id} className={cn(
              "bg-white p-5 rounded-2xl shadow-sm border transition-all group",
              isSoon ? "border-amber-200 bg-amber-50/30" : "border-slate-100 hover:border-indigo-200"
            )}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                  lead.status === 'won' ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"
                )}>
                  <User size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-2">
                    {lead.title}
                    {isSoon && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
                        <Clock size={10} /> {isSameDay(new Date(lead.followUpDate!), new Date()) ? 'Due Today' : 'Follow-up Due'}
                      </span>
                    )}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                    <span className="text-sm font-medium text-slate-600 flex items-center gap-1">
                      <User size={14} /> {lead.contactName}
                    </span>
                    <span className="text-sm text-slate-400 flex items-center gap-1">
                      <Mail size={14} /> {lead.contactEmail}
                    </span>
                    <span className="text-sm text-slate-400 flex items-center gap-1">
                      <Phone size={14} /> {lead.contactPhone}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                <div className="flex items-center gap-2 mr-2">
                  <a 
                    href={`tel:${lead.contactPhone}`}
                    className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-all border border-emerald-100"
                    title="Call Lead"
                  >
                    <Phone size={18} />
                  </a>
                  <a 
                    href={`mailto:${lead.contactEmail}`}
                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all border border-blue-100"
                    title="Email Lead"
                  >
                    <Mail size={18} />
                  </a>
                  <a 
                    href="https://calendar.app.google/EgR8zWarU7wkkVJP9"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => updateLeadStatus(lead.id, 'meeting_scheduled')}
                    className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-all border border-purple-100"
                    title="Schedule Meeting via Google Calendar"
                  >
                    <Video size={18} />
                  </a>
                  <button 
                    onClick={() => setFollowUpModalLead(lead)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all border text-sm font-semibold",
                      lead.followUpDate 
                        ? "bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100" 
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    )}
                    title="Set Follow-up"
                  >
                    <Clock size={16} />
                    {lead.followUpDate ? "Update Follow-up" : "Set Follow-up"}
                  </button>
                  <button 
                    onClick={() => notifyAssignedUser(lead)}
                    disabled={isNotifying === lead.id || !lead.assignedTo}
                    className={cn(
                      "p-2 rounded-lg transition-all border",
                      lead.followUpDate && isFollowUpSoon(lead.followUpDate)
                        ? "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100"
                        : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100"
                    )}
                    title="Send Notification to Assigned User"
                  >
                    <Bell size={18} className={isNotifying === lead.id ? "animate-bounce" : ""} />
                  </button>
                </div>

                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider",
                  getStatusColor(lead.status)
                )}>
                  {lead.status.replace('_', ' ')}
                </span>
                
                <div className="h-8 w-px bg-slate-100 hidden lg:block mx-2"></div>
                
                <div className="flex items-center gap-2">
                  <select 
                    className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    value={lead.status}
                    onChange={(e) => updateLeadStatus(lead.id, e.target.value as Lead['status'])}
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="meeting_scheduled">Meeting</option>
                    <option value="proposal_sent">Proposal</option>
                    <option value="negotiation">Negotiation</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                  </select>
                  <div className="relative">
                    <button 
                      onClick={() => setActiveMenu(activeMenu === lead.id ? null : (lead.id || null))}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
                    >
                      <MoreVertical size={18} />
                    </button>
                    
                    {activeMenu === lead.id && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setActiveMenu(null)}
                        />
                        <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-xl border border-slate-100 z-20 py-1 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                          <button 
                            onClick={() => handleEdit(lead)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                          >
                            <Edit size={14} /> Edit
                          </button>
                          <button 
                            onClick={() => handleDelete(lead.id!, lead.title)}
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
            
            <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar size={14} /> Created {format(new Date(lead.createdAt), 'dd MMM yyyy')}
                </span>
                {lead.followUpDate && (
                  <span className="flex items-center gap-1 text-amber-600 font-medium">
                    <Clock size={14} /> Follow up: {format(new Date(lead.followUpDate), 'dd MMM')}
                  </span>
                )}
              </div>
              <button className="text-xs font-semibold text-indigo-600 flex items-center gap-1 hover:gap-2 transition-all">
                View Details <ChevronRight size={14} />
              </button>
            </div>
          </div>
        );
      })}

        {filteredLeads.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <Briefcase size={32} />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">No leads found</h3>
            <p className="text-slate-500">Start by adding a new prospect to your pipeline.</p>
          </div>
        )}
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">{editingLead ? 'Edit Lead' : 'Add New Lead'}</h2>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingLead(null);
                }} 
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <XCircle size={24} className="text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSaveLead} className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Lead Title / Requirement</label>
                  <input 
                    name="title" 
                    required 
                    type="text" 
                    defaultValue={editingLead?.title}
                    placeholder="e.g. SEO Project for TechCorp" 
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name</label>
                    <input 
                      name="contactName" 
                      required 
                      type="text" 
                      defaultValue={editingLead?.contactName}
                      placeholder="John Doe" 
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                    <input 
                      name="contactPhone" 
                      required 
                      type="tel" 
                      defaultValue={editingLead?.contactPhone}
                      placeholder="+91 98765 43210" 
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                  <input 
                    name="contactEmail" 
                    required 
                    type="email" 
                    defaultValue={editingLead?.contactEmail}
                    placeholder="john@example.com" 
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Lead Source</label>
                    <select 
                      name="source" 
                      defaultValue={editingLead?.source || 'website'}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    >
                      <option value="website">Website</option>
                      <option value="referral">Referral</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="cold_call">Cold Call</option>
                      <option value="google_my_business">Google My Business</option>
                      <option value="youtube">YouTube</option>
                      <option value="facebook">Facebook</option>
                      <option value="instagram">Instagram</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Follow-up Date</label>
                    <input 
                      name="followUpDate" 
                      type="datetime-local" 
                      defaultValue={editingLead?.followUpDate ? format(new Date(editingLead.followUpDate), "yyyy-MM-dd'T'HH:mm") : ''}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                  <textarea 
                    name="notes" 
                    rows={3} 
                    defaultValue={editingLead?.notes}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
                    placeholder="Initial requirements..."
                  ></textarea>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingLead(null);
                  }} 
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100">
                  {editingLead ? 'Update Lead' : 'Create Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Set Follow-up Modal */}
      {followUpModalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Set Follow-up</h2>
                <p className="text-sm text-slate-500">{followUpModalLead.title}</p>
              </div>
              <button onClick={() => setFollowUpModalLead(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <XCircle size={24} className="text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSetFollowUp} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Follow-up Date & Time</label>
                <input 
                  name="followUpDate" 
                  required 
                  type="datetime-local" 
                  defaultValue={followUpModalLead.followUpDate ? format(new Date(followUpModalLead.followUpDate), "yyyy-MM-dd'T'HH:mm") : ''}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setFollowUpModalLead(null)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-all">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100">Save Follow-up</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leads;
