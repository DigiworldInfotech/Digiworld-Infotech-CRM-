import React, { useEffect, useState } from 'react';
import { X, Download, Printer, Mail, IndianRupee } from 'lucide-react';
import { Invoice, Client, CompanySettings } from '../types';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import { getDocument } from '../services/firestore';
import { generateInvoicePDF } from '../services/pdfService';

interface InvoiceViewProps {
  invoice: Invoice;
  client: Client;
  onClose: () => void;
}

const InvoiceView: React.FC<InvoiceViewProps> = ({ invoice, client, onClose }) => {
  const [settings, setSettings] = useState<CompanySettings | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const data = await getDocument<CompanySettings>('settings', 'company');
      setSettings(data);
    };
    fetchSettings();
  }, []);

  const upiUrl = settings?.upiId 
    ? `upi://pay?pa=${settings.upiId}&pn=${encodeURIComponent(settings.name)}&am=${invoice.totalAmount}&cu=INR&tn=${encodeURIComponent('Invoice ' + invoice.invoiceNumber)}`
    : '';

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (settings) {
      generateInvoicePDF(invoice, settings, client);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm print:p-0 print:bg-white">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:rounded-none">
        {/* Header - Hidden in Print */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 print:hidden">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-slate-900">Invoice Preview</h2>
            <div className="flex items-center gap-2">
              <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">
                <Printer size={16} /> Print
              </button>
              <button onClick={handleDownload} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">
                <Download size={16} /> Download
              </button>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Invoice Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 md:p-12 print:overflow-visible print:p-0">
          <div id="invoice-printable" className="max-w-4xl mx-auto space-y-10 bg-white print:max-w-none print:w-full">
            {/* Top Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b-2 border-slate-900 pb-10">
              <div className="space-y-4 max-w-lg">
                <h1 className="text-3xl sm:text-4xl font-black text-slate-900 uppercase tracking-tighter">
                  {settings?.name || 'DIGIWORLD INFOTECH'}
                </h1>
                <div className="text-sm text-slate-600 space-y-1.5 leading-relaxed">
                  <p className="max-w-xs">{settings?.address}</p>
                  <div className="flex flex-wrap gap-x-4">
                    <p>GSTIN: <span className="font-bold text-slate-900">{settings?.gstin}</span></p>
                    <p>Email: {settings?.email}</p>
                  </div>
                  <p>Phone: {settings?.phone}</p>
                </div>
              </div>
              <div className="text-left sm:text-right space-y-1 w-full sm:w-auto">
                <h2 className="text-4xl sm:text-5xl font-black text-slate-100 uppercase tracking-widest leading-none">INVOICE</h2>
                <div className="pt-2">
                  <p className="text-xl font-bold text-slate-900">{invoice.invoiceNumber}</p>
                  <p className="text-sm text-slate-500">Date: {format(new Date(invoice.createdAt), 'dd MMM yyyy')}</p>
                  {(invoice.servicePeriodFrom || invoice.servicePeriodTo) && (
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-1">
                      Service Period: {invoice.servicePeriodFrom ? format(new Date(invoice.servicePeriodFrom), 'dd MMM yyyy') : 'N/A'} - {invoice.servicePeriodTo ? format(new Date(invoice.servicePeriodTo), 'dd MMM yyyy') : 'Present'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Bill To & Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 sm:gap-12">
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Bill To</h3>
                <div className="space-y-1.5">
                  <p className="text-xl font-bold text-slate-900">{client.name}</p>
                  <p className="text-sm text-slate-600 max-w-xs leading-relaxed">{client.address}</p>
                  <div className="pt-1 space-y-1">
                    <p className="text-sm text-slate-600">GSTIN: <span className="font-bold text-slate-900">{client.gstin}</span></p>
                    <p className="text-sm text-slate-600">State: <span className="text-slate-900">{client.state} ({client.stateCode})</span></p>
                  </div>
                </div>
              </div>
              <div className="space-y-4 text-left sm:text-right">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 sm:border-none sm:pb-0">Payment Info</h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Due Date</p>
                    <p className="text-lg font-bold text-rose-600">{format(new Date(invoice.dueDate), 'dd MMM yyyy')}</p>
                  </div>
                  <div className="pt-4">
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total Amount</p>
                    <p className="text-3xl font-black text-slate-900">₹{invoice.totalAmount.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm print:shadow-none">
              <div className="overflow-x-auto print:overflow-visible">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      <th className="px-5 py-4 font-bold uppercase tracking-wider text-xs">Description</th>
                      <th className="px-5 py-4 font-bold uppercase tracking-wider text-xs text-center">HSN</th>
                      <th className="px-5 py-4 font-bold uppercase tracking-wider text-xs text-center">Qty</th>
                      <th className="px-5 py-4 font-bold uppercase tracking-wider text-xs text-right">Rate</th>
                      <th className="px-5 py-4 font-bold uppercase tracking-wider text-xs text-right">GST</th>
                      <th className="px-5 py-4 font-bold uppercase tracking-wider text-xs text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {invoice.items.map((item, index) => (
                      <tr key={index} className="transition-colors hover:bg-slate-50/50">
                        <td className="px-5 py-5">
                          <p className="font-bold text-slate-900">{item.serviceName}</p>
                        </td>
                        <td className="px-5 py-5 text-center text-slate-600 font-mono text-xs">{item.hsn}</td>
                        <td className="px-5 py-5 text-center text-slate-900 font-semibold">{item.qty}</td>
                        <td className="px-5 py-5 text-right text-slate-900 font-medium">₹{item.rate.toLocaleString()}</td>
                        <td className="px-5 py-5 text-right text-slate-600">{item.gstRate}%</td>
                        <td className="px-5 py-5 text-right font-bold text-slate-900">₹{item.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals & QR Code */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-12 pt-4">
              <div className="space-y-6 w-full md:max-w-md">
                {/* QR Code Section */}
                <div className="flex items-start gap-6 p-5 bg-slate-50 rounded-2xl border border-slate-100 print:bg-white">
                  {upiUrl ? (
                    <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 shrink-0">
                      <QRCodeSVG value={upiUrl} size={100} />
                    </div>
                  ) : (
                    <div className="w-[116px] h-[116px] bg-slate-100 rounded-xl flex items-center justify-center text-slate-300 text-xs text-center p-2 shrink-0">
                      Scan to Pay (UPI ID not set)
                    </div>
                  )}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scan to Pay</h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Scan the QR code using any UPI app (GPay, PhonePe, Paytm) to make the payment instantly.
                    </p>
                    {settings?.upiId && (
                      <p className="text-xs font-bold text-indigo-600 font-mono">UPI: {settings.upiId}</p>
                    )}
                    {settings?.paymentUrl && (
                      <div className="pt-2">
                        <a 
                          href={settings.paymentUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-bold rounded-lg hover:bg-indigo-700 transition-all print:hidden"
                        >
                          Pay Now Online
                        </a>
                        <p className="text-[8px] text-slate-400 mt-1 hidden print:block">Online Payment URL: {settings.paymentUrl}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bank Details */}
                {settings?.bankDetails && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bank Transfer Details</h4>
                    <pre className="text-[11px] text-slate-700 whitespace-pre-line font-mono bg-slate-50 p-5 rounded-2xl border border-slate-100 leading-relaxed print:bg-white">
                      {settings.bankDetails}
                    </pre>
                  </div>
                )}
              </div>

              <div className="space-y-4 w-full md:w-80">
                <div className="space-y-2 border-b border-slate-100 pb-4">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-bold text-slate-900">₹{invoice.subtotal.toLocaleString()}</span>
                  </div>
                  {invoice.cgst > 0 && (
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>CGST</span>
                      <span className="font-bold text-slate-900">₹{invoice.cgst.toLocaleString()}</span>
                    </div>
                  )}
                  {invoice.sgst > 0 && (
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>SGST</span>
                      <span className="font-bold text-slate-900">₹{invoice.sgst.toLocaleString()}</span>
                    </div>
                  )}
                  {invoice.igst > 0 && (
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>IGST</span>
                      <span className="font-bold text-slate-900">₹{invoice.igst.toLocaleString()}</span>
                    </div>
                  )}
                </div>
                <div className="pt-2 flex justify-between items-center">
                  <div className="space-y-1">
                    <span className="block text-xs font-black text-slate-400 uppercase tracking-widest">Total Amount</span>
                    <span className="block text-3xl font-black text-slate-900 tabular-nums">₹{invoice.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms & Conditions */}
            {settings?.termsAndConditions && (
              <div className="pt-8 border-t border-slate-100 space-y-2">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Terms & Conditions</h4>
                <div className="text-[10px] text-slate-500 whitespace-pre-line leading-relaxed">
                  {settings.termsAndConditions}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="pt-12 text-center space-y-4">
              <div className="h-px bg-slate-100 w-full"></div>
              <p className="text-xs text-slate-400 italic">This is a computer generated invoice and does not require a physical signature.</p>
              <p className="text-sm font-bold text-slate-900">Thank you for your business!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceView;
