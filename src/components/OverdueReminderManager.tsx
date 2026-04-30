import React, { useEffect } from 'react';
import { subscribeToCollection, updateDocument, createDocument, getDocument } from '../services/firestore';
import { sendOverdueEmail } from '../services/email';
import { Invoice, Client, EmailTemplate, CompanySettings } from '../types';
import { format, differenceInDays, isSameDay } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

const DEFAULT_SCHEDULE = [1, 3, 7, 14, 30]; // Days overdue to send reminders

const OverdueReminderManager: React.FC = () => {
  const { user, isClient } = useAuth();

  useEffect(() => {
    if (isClient || !user) return;

    // We only want this to run once per day when an admin/staff logs in
    const checkAndSendReminders = async () => {
      // 1. Check if we already checked today to avoid redundant processing
      const lastCheckDoc = await getDocument<{ lastChecked: string }>('system_state', 'overdue_checks');
      const today = new Date();
      
      if (lastCheckDoc?.lastChecked && isSameDay(new Date(lastCheckDoc.lastChecked), today)) {
        console.log('Overdue reminders already checked today');
        return;
      }

      console.log('Checking for overdue invoices to send reminders...');

      // 2. Fetch required data
      // We don't use subscribe here because we want a one-time process
      // But since we are in a component, we can use the state if we want.
      // For one-time check, we'll just fetch directly.
      
      // Since we don't have a direct 'getAll' in firestore.ts using the simple pattern,
      // we'll rely on the subscription or add a helper.
      // I'll add a 'getCollection' helper if it doesn't exist, or use the subscribe technique.
    };

    // To implement properly, I need to fetch all overdue invoices.
    // I'll use the subscribe with a local variable for a one-time check.
    
    let unsubInvoices: () => void;
    let unsubTemplates: () => void;
    let unsubClients: () => void;
    let unsubSettings: () => void;

    let invoices: Invoice[] = [];
    let templates: EmailTemplate[] = [];
    let clients: Client[] = [];
    let settings: CompanySettings | null = null;
    let loadedCount = 0;

    const process = async () => {
      const overdueTemplate = templates.find(t => t.type === 'overdue');
      if (!overdueTemplate) return;

      const schedule = settings?.overdueReminderSchedule 
        ? settings.overdueReminderSchedule.split(',').map(s => parseInt(s.trim())).filter(s => !isNaN(s))
        : DEFAULT_SCHEDULE;

      const overdueInvoices = invoices.filter(inv => inv.status === 'overdue');
      const today = new Date();

      for (const invoice of overdueInvoices) {
        const dueDate = new Date(invoice.dueDate);
        const daysOverdue = differenceInDays(today, dueDate);

        // Check if this invoice is due for a reminder based on schedule
        const isOnSchedule = schedule.includes(daysOverdue);
        const alreadySentToday = invoice.lastReminderSentAt && isSameDay(new Date(invoice.lastReminderSentAt), today);

        if (isOnSchedule && !alreadySentToday) {
          const client = clients.find(c => c.id === invoice.clientId);
          if (client) {
            console.log(`Sending overdue reminder for ${invoice.invoiceNumber} to ${client.email}`);
            
            const paymentLink = `${window.location.origin}/pay/${invoice.invoiceNumber}`;
            
            await sendOverdueEmail({
              email: client.email,
              clientName: client.name,
              invoiceNumber: invoice.invoiceNumber,
              amount: invoice.totalAmount,
              dueDate: format(dueDate, 'dd MMM yyyy'),
              daysOverdue,
              customSubject: overdueTemplate.subject,
              customBody: overdueTemplate.body,
              paymentLink
            });

            // Update invoice record
            await updateDocument('invoices', invoice.id, {
              lastReminderSentAt: today.toISOString(),
              reminderCount: (invoice.reminderCount || 0) + 1
            });

            // Create activity log
            await createDocument('activityLogs', {
              userId: user.uid,
              userName: user.email || 'System',
              action: 'Automated Reminder Sent',
              details: `Overdue reminder sent for Invoice ${invoice.invoiceNumber} (${daysOverdue} days overdue)`,
              timestamp: today.toISOString()
            });
          }
        }
      }

      // Update last checked date
      await createDocument('system_state', {
        id: 'overdue_checks',
        lastChecked: today.toISOString()
      });
    };

    const checkReady = () => {
      loadedCount++;
      if (loadedCount >= 4) {
        process();
        // Clean up immediately after processing
        unsubInvoices?.();
        unsubTemplates?.();
        unsubClients?.();
        unsubSettings?.();
      }
    };

    unsubInvoices = subscribeToCollection<Invoice>('invoices', [], (data) => {
      invoices = data;
      checkReady();
    });
    unsubTemplates = subscribeToCollection<EmailTemplate>('email_templates', [], (data) => {
      templates = data;
      checkReady();
    });
    unsubClients = subscribeToCollection<Client>('clients', [], (data) => {
      clients = data;
      checkReady();
    });
    unsubSettings = subscribeToCollection<CompanySettings>('settings', [], (data) => {
        // settings is typically a single doc, but subscribe returns array
        settings = (data as any)[0] || null;
        checkReady();
    });

    return () => {
      unsubInvoices?.();
      unsubTemplates?.();
      unsubClients?.();
      unsubSettings?.();
    };
  }, [user, isClient]);

  return null; // This is a logic-only component
};

export default OverdueReminderManager;
