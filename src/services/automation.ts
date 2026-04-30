import { getCollection, getDocument, updateDocument, createDocument } from './firestore';
import { Invoice, CompanySettings, EmailTemplate, Notification } from '../types';
import { differenceInDays, format, isAfter, parseISO, addMonths, addYears, addDays } from 'date-fns';
import { sendOverdueEmail, sendInvoiceEmail, sendRecurringEmail } from './email';

export const runAutomatedChecks = async () => {
  try {
    const invoices = await getCollection<Invoice>('invoices');
    const clients = await getCollection<any>('clients');
    const settings = await getDocument<CompanySettings>('settings', 'company');
    const templates = await getCollection<EmailTemplate>('email_templates');
    
    const today = new Date();

    // 1. Handle Overdue Reminders
    if (settings && settings.overdueReminderSchedule) {
      const overdueSchedule = settings.overdueReminderSchedule
        .split(',')
        .map(s => parseInt(s.trim()))
        .filter(n => !isNaN(n))
        .sort((a, b) => a - b);
        
      if (overdueSchedule.length > 0) {
        const overdueTemplate = templates.find(t => t.type === 'overdue');
        
        for (const inv of invoices) {
          if (inv.status === 'paid' || inv.status === 'cancelled') continue;
          
          const dueDate = parseISO(inv.dueDate);
          const daysOverdue = differenceInDays(today, dueDate);
          
          if (daysOverdue <= 0) continue;
          
          if (inv.status !== 'overdue') {
            await updateDocument('invoices', inv.id, { status: 'overdue' });
          }

          const client = clients.find(c => c.id === inv.clientId);
          if (!client || !client.email) continue;
          
          const lastSent = inv.lastReminderSentAt ? parseISO(inv.lastReminderSentAt) : null;
          if (lastSent && format(lastSent, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) continue;

          const nextReminderIndex = inv.reminderCount || 0;
          if (nextReminderIndex >= overdueSchedule.length) continue;
          
          const nextReminderDay = overdueSchedule[nextReminderIndex];
          
          if (daysOverdue >= nextReminderDay) {
            await sendOverdueEmail({
              email: client.email,
              clientName: inv.clientName,
              invoiceNumber: inv.invoiceNumber,
              amount: inv.totalAmount,
              dueDate: format(dueDate, 'dd MMM yyyy'),
              daysOverdue,
              customSubject: overdueTemplate?.subject,
              customBody: overdueTemplate?.body,
              paymentLink: settings.paymentUrl
            });
            
            await updateDocument('invoices', inv.id, {
              lastReminderSentAt: today.toISOString(),
              reminderCount: nextReminderIndex + 1
            });
          }
        }
      }
    }

    // 2. Handle Recurring Invoices
    const recurringInvoices = invoices.filter(inv => inv.isRecurring && inv.status !== 'cancelled');
    for (const inv of recurringInvoices) {
      const createdAt = parseISO(inv.createdAt);
      let nextDate: Date;

      switch(inv.recurringInterval) {
        case 'quarterly': nextDate = addMonths(createdAt, 3); break;
        case 'yearly': nextDate = addYears(createdAt, 1); break;
        default: nextDate = addMonths(createdAt, 1); // monthly
      }

      // If today is on or after the next recurring date
      if (!isAfter(nextDate, today)) {
        // Check if we already generated a child for this interval
        // We'll use a field 'recurringParentId' and 'recurringGeneratedForDate' to track
        const alreadyGenerated = invoices.find(i => 
          i.recurringParentId === inv.id && 
          i.recurringGeneratedForDate === format(nextDate, 'yyyy-MM-dd')
        );

        if (!alreadyGenerated) {
          console.log(`Generating recurring invoice from ${inv.invoiceNumber}`);
          
          // Generate new invoice number
          const currentYear = today.getFullYear();
          const yearPrefix = `INV/${currentYear}/`;
          const yearInvoices = invoices.filter(i => i.invoiceNumber.startsWith(yearPrefix));
          const lastNum = yearInvoices.reduce((max, i) => {
            const num = parseInt(i.invoiceNumber.split('/').pop() || '0');
            return num > max ? num : max;
          }, 0);
          const newInvoiceNumber = `${yearPrefix}${(lastNum + 1).toString().padStart(3, '0')}`;

          const { id, ...invoiceData } = inv;
          const newInvoice: Omit<Invoice, 'id'> = {
            ...invoiceData,
            invoiceNumber: newInvoiceNumber,
            createdAt: today.toISOString(),
            dueDate: addDays(today, 7).toISOString(), // Default 7 days
            status: 'sent',
            reminderCount: 0,
            recurringParentId: inv.id,
            recurringGeneratedForDate: format(nextDate, 'yyyy-MM-dd'),
            isRecurring: true // The child is also recurring
          };

          // Remove any potentially undefined fields to avoid Firestore errors
          if ('lastReminderSentAt' in newInvoice) delete (newInvoice as any).lastReminderSentAt;
          if ('lastRecurringDate' in newInvoice) delete (newInvoice as any).lastRecurringDate;

          const created = await createDocument('invoices', newInvoice);
          
          // Stop recurring on parent if needed? 
          // Usually we want the NEW one to be the parent of the NEXT one.
          // But it's easier to keep the ORIGINAL as anchor or chain them.
          // Let's chain them by updating the old one to NOT be the active recurring anchor 
          // OR updated its createdAt so nextDate moves forward.
          
          // Better: Update parent's createdAt to today so it looks for the NEXT interval from now.
          // OR update its "lastRecurringGeneratedAt".
          await updateDocument('invoices', inv.id, {
            isRecurring: false // Move recurring duty to the new invoice
          });

          // Notify client
          const client = clients.find(c => c.id === inv.clientId);
          if (client && client.email) {
            const recurringTemplate = templates.find(t => t.type === 'recurring');
            
            // Calculate next billing date for the notification
            let nextBillingDateAfterThis: Date;
            switch(inv.recurringInterval) {
              case 'quarterly': nextBillingDateAfterThis = addMonths(nextDate, 3); break;
              case 'yearly': nextBillingDateAfterThis = addYears(nextDate, 1); break;
              default: nextBillingDateAfterThis = addMonths(nextDate, 1);
            }

            await sendRecurringEmail({
              email: client.email,
              clientName: client.name,
              serviceName: inv.items[0]?.serviceName || 'Service Subscription',
              amount: inv.totalAmount,
              nextBillingDate: format(nextBillingDateAfterThis, 'dd MMM yyyy'),
              customSubject: recurringTemplate?.subject,
              customBody: recurringTemplate?.body
            });

            // Also send the actual invoice
            const invoiceTemplate = templates.find(t => t.type === 'invoice');
            await sendInvoiceEmail({
              email: client.email,
              clientName: client.name,
              invoiceNumber: newInvoiceNumber,
              amount: inv.totalAmount,
              dueDate: format(addDays(today, 7), 'dd MMM yyyy'),
              items: inv.items,
              customSubject: invoiceTemplate?.subject,
              customBody: invoiceTemplate?.body,
              paymentLink: settings?.paymentUrl
            });
          }
        }
      }
    }

  } catch (error) {
    console.error('Automated checks failed:', error);
  }
};
