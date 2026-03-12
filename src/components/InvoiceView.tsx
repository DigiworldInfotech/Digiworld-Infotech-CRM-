import React, { useEffect, useState } from 'react';
import { X, Download, Printer, Mail, IndianRupee } from 'lucide-react';
import { Invoice, Client, CompanySettings } from '../types';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import { getDocument } from '../services/firestore';

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
              <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">
                <Download size={16} /> Download
              </button>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Invoice Content */}
        <div className="flex-1 overflow-y-auto p-8 md:p-12 print:overflow-visible print:p-0">
          <div id="invoice-printable" className="max-w-3xl mx-auto space-y-8 bg-white">
            {/* Top Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-8">
              <div className="space-y-2">
                <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic">
                  {settings?.name || 'DIGIWORLD INFOTECH'}
                </h1>
                <div className="text-sm text-slate-600 space-y-1">
                  <p className="max-w-xs">{settings?.address}</p>
                  <p>GSTIN: <span className="font-bold text-slate-900">{settings?.gstin}</span></p>
                  <p>Email: {settings?.email} | Phone: {settings?.phone}</p>
                </div>
              </div>
              <div className="text-right space-y-1">
                <h2 className="text-5xl font-black text-slate-200 uppercase tracking-widest">INVOICE</h2>
                <p className="text-xl font-bold text-slate-900">{invoice.invoiceNumber}</p>
                <p className="text-sm text-slate-500">Date: {format(new Date(invoice.createdAt), 'dd MMM yyyy')}</p>
              </div>
            </div>

            {/* Bill To & Details */}
            <div className="grid grid-cols-2 gap-12">
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Bill To</h3>
                <div className="space-y-1">
                  <p className="text-xl font-bold text-slate-900">{client.name}</p>
                  <p className="text-sm text-slate-600 max-w-xs">{client.address}</p>
                  <p className="text-sm text-slate-600">GSTIN: <span className="font-bold text-slate-900">{client.gstin}</span></p>
                  <p className="text-sm text-slate-600">State: {client.state} ({client.stateCode})</p>
                </div>
              </div>
              <div className="space-y-3 text-right">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Payment Info</h3>
                <div className="space-y-1">
                  <p className="text-sm text-slate-600">Due Date</p>
                  <p className="text-lg font-bold text-rose-600">{format(new Date(invoice.dueDate), 'dd MMM yyyy')}</p>
                  <p className="text-sm text-slate-600 mt-4 uppercase tracking-widest text-xs font-bold">Total Amount</p>
                  <p className="text-3xl font-black text-slate-900">₹{invoice.totalAmount.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="px-4 py-3 font-bold uppercase tracking-wider">Description</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-center">HSN</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-center">Qty</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Rate</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">GST</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-4">
                        <p className="font-bold text-slate-900">{item.serviceName}</p>
                      </td>
                      <td className="px-4 py-4 text-center text-slate-600">{item.hsn}</td>
                      <td className="px-4 py-4 text-center text-slate-900 font-medium">{item.qty}</td>
                      <td className="px-4 py-4 text-right text-slate-900">₹{item.rate.toLocaleString()}</td>
                      <td className="px-4 py-4 text-right text-slate-600">{item.gstRate}%</td>
                      <td className="px-4 py-4 text-right font-bold text-slate-900">₹{item.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals & QR Code */}
            <div className="grid grid-cols-2 gap-12 pt-4">
              <div className="space-y-6">
                {/* QR Code Section */}
                <div className="flex items-start gap-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  {upiUrl ? (
                    <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                      <QRCodeSVG value={upiUrl} size={100} />
                    </div>
                  ) : (
                    <div className="w-[116px] h-[116px] bg-slate-100 rounded-xl flex items-center justify-center text-slate-300 text-xs text-center p-2">
                      Scan to Pay (UPI ID not set)
                    </div>
                  )}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Scan to Pay</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Scan the QR code using any UPI app (GPay, PhonePe, Paytm) to make the payment instantly.
                    </p>
                    {settings?.upiId && (
                      <p className="text-xs font-bold text-indigo-600">UPI ID: {settings.upiId}</p>
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
                        <p className="text-[8px] text-slate-400 mt-1 hidden print:block">Online Payment: {settings.paymentUrl}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bank Details */}
                {settings?.bankDetails && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Bank Transfer Details</h4>
                    <div className="text-xs text-slate-600 whitespace-pre-line font-mono bg-slate-50 p-4 rounded-xl border border-slate-100">
                      {settings.bankDetails}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-bold text-slate-900">₹{invoice.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-600">
                  <span>CGST</span>
                  <span className="font-bold text-slate-900">₹{invoice.cgst.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-600">
                  <span>SGST</span>
                  <span className="font-bold text-slate-900">₹{invoice.sgst.toLocaleString()}</span>
                </div>
                {invoice.igst > 0 && (
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>IGST</span>
                    <span className="font-bold text-slate-900">₹{invoice.igst.toLocaleString()}</span>
                  </div>
                )}
                <div className="pt-4 border-t-2 border-slate-900 flex justify-between items-center">
                  <span className="text-lg font-black text-slate-900 uppercase tracking-widest">Total</span>
                  <span className="text-3xl font-black text-slate-900">₹{invoice.totalAmount.toLocaleString()}</span>
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
