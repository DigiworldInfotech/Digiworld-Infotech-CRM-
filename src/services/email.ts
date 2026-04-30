import { getDocument } from './firestore';
import { CompanySettings } from '../types';

const appendSignature = async (body?: string) => {
  try {
    const settings = await getDocument<CompanySettings>('settings', 'company');
    if (settings?.emailSignature) {
      return `${body || ''}\n\n${settings.emailSignature}`;
    }
  } catch (error) {
    console.error('Error fetching signature:', error);
  }
  return body;
};

export const sendWelcomeEmail = async (email: string, clientName: string, customSubject?: string, customBody?: string) => {
  try {
    const bodyWithSignature = await appendSignature(customBody);
    console.log('Sending welcome email to:', email);
    const response = await fetch('/api/emails/welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, clientName, customSubject, customBody: bodyWithSignature }),
    });
    
    if (!response.ok) {
      const text = await response.text();
      console.error('Welcome email failed:', text);
      throw new Error(`Email server returned ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Expected JSON but got:', text.substring(0, 100));
      throw new Error('Email server returned non-JSON response');
    }
    
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
  servicePeriodFrom?: string;
  servicePeriodTo?: string;
}) => {
  try {
    const bodyWithSignature = await appendSignature(invoiceData.customBody);
    console.log('Sending invoice email to:', invoiceData.email);
    const response = await fetch('/api/emails/invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...invoiceData, customBody: bodyWithSignature }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Invoice email failed:', text);
      throw new Error(`Email server returned ${response.status}: ${text.substring(0, 50)}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Expected JSON but got:', text.substring(0, 100));
      throw new Error('Email server returned non-JSON response');
    }

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
    const bodyWithSignature = await appendSignature(data.customBody);
    console.log('Sending recurring email to:', data.email);
    const response = await fetch('/api/emails/recurring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, customBody: bodyWithSignature }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Recurring email failed:', text);
      throw new Error(`Email server returned ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Expected JSON but got:', text.substring(0, 100));
      throw new Error('Email server returned non-JSON response');
    }

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
    const bodyWithSignature = await appendSignature(data.customBody);
    console.log('Sending follow-up email to:', data.email);
    const response = await fetch('/api/emails/followup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, customBody: bodyWithSignature }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Follow-up email failed:', text);
      throw new Error(`Email server returned ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Expected JSON but got:', text.substring(0, 100));
      throw new Error('Email server returned non-JSON response');
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to send follow-up email:', error);
  }
};

export const sendOverdueEmail = async (data: {
  email: string;
  clientName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
  customSubject?: string;
  customBody?: string;
  paymentLink?: string;
}) => {
  try {
    const bodyWithSignature = await appendSignature(data.customBody);
    console.log('Sending overdue email to:', data.email);
    const response = await fetch('/api/emails/overdue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, customBody: bodyWithSignature }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Overdue email failed:', text);
      throw new Error(`Email server returned ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Expected JSON but got:', text.substring(0, 100));
      throw new Error('Email server returned non-JSON response (likely SPA fallback)');
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to send overdue email:', error);
  }
};

export const sendEstimateEmail = async (data: {
  email: string;
  clientName: string;
  estimateNumber: string;
  amount: number;
  validUntil: string;
  items: any[];
  servicePeriodFrom?: string;
  servicePeriodTo?: string;
  customSubject?: string;
  customBody?: string;
}) => {
  try {
    const bodyWithSignature = await appendSignature(data.customBody);
    console.log('Sending estimate email to:', data.email);
    const response = await fetch('/api/emails/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, customBody: bodyWithSignature }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Estimate email failed:', text);
      throw new Error(`Email server returned ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Expected JSON but got:', text.substring(0, 100));
      throw new Error('Email server returned non-JSON response');
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to send estimate email:', error);
  }
};
