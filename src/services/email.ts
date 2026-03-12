export const sendWelcomeEmail = async (email: string, clientName: string, customSubject?: string, customBody?: string) => {
  try {
    const response = await fetch('/api/emails/welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, clientName, customSubject, customBody }),
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to send welcome email:', error);
  }
};

export const sendInvoiceEmail = async (invoiceData: {
  email: string;
  clientName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  items: any[];
  customSubject?: string;
  customBody?: string;
  paymentLink?: string;
}) => {
  try {
    const response = await fetch('/api/emails/invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoiceData),
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to send invoice email:', error);
  }
};

export const sendRecurringEmail = async (data: {
  email: string;
  clientName: string;
  serviceName: string;
  amount: number;
  nextBillingDate: string;
  customSubject?: string;
  customBody?: string;
}) => {
  try {
    const response = await fetch('/api/emails/recurring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to send recurring email:', error);
  }
};

export const sendFollowUpEmail = async (data: {
  email: string;
  clientName: string;
  leadTitle: string;
  followUpDate: string;
  customSubject?: string;
  customBody?: string;
}) => {
  try {
    const response = await fetch('/api/emails/followup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to send follow-up email:', error);
  }
};
