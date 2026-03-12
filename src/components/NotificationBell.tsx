import React, { useEffect, useState } from 'react';
import { Bell, X, CheckCircle2 } from 'lucide-react';
import { subscribeToCollection, updateDocument } from '../services/firestore';
import { Notification } from '../types';
import { auth } from '../firebase';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { where, orderBy } from 'firebase/firestore';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }

    const unsub = subscribeToCollection<Notification>(
      'notifications',
      [
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      ],
      setNotifications
    );
    return () => unsub();
  }, [currentUser]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = async (id: string) => {
    await updateDocument('notifications', id, { isRead: true });
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    await Promise.all(unread.map(n => updateDocument('notifications', n.id, { isRead: true })));
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    Mark all as read
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                  <X size={16} className="text-slate-400" />
                </button>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-50">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={cn(
                      "p-4 hover:bg-slate-50 transition-colors relative group",
                      !notification.isRead && "bg-indigo-50/30"
                    )}
                  >
                    <div className="flex gap-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full mt-2 shrink-0",
                        notification.type === 'warning' ? "bg-amber-500" : 
                        notification.type === 'success' ? "bg-emerald-500" :
                        notification.type === 'error' ? "bg-rose-500" : "bg-blue-500"
                      )} />
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-slate-900">{notification.title}</h4>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{notification.message}</p>
                        <p className="text-[10px] text-slate-400 mt-2">
                          {format(new Date(notification.createdAt), 'dd MMM, hh:mm a')}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <button 
                          onClick={() => markAsRead(notification.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="Mark as read"
                        >
                          <CheckCircle2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                    <Bell size={24} />
                  </div>
                  <p className="text-sm text-slate-500">No notifications yet</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
