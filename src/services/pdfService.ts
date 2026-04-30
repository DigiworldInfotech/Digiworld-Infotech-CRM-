import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Invoice, CompanySettings, Client, Estimate } from '../types';
import { format } from 'date-fns';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export const generateEstimatePDF = (estimate: Estimate, company: CompanySettings, client: Client) => {
  const doc = new jsPDF();
  const margin = 20;
  let currentY = margin;

  // Header - Logo and Company Info
  try {
    // Attempt to add logo image
    doc.addImage('/Digi info & tech logo.png', 'PNG', margin, currentY - 5, 25, 25);
    currentY += 5;
    doc.setFontSize(22);
    doc.setTextColor(67, 56, 202); 
    doc.text(company.name, margin + 28, currentY);
    currentY += 8;
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); 
    doc.text(company.address, margin + 28, currentY);
    currentY += 5;
    doc.text(`GSTIN: ${company.gstin} | ${company.email} | ${company.phone}`, margin + 28, currentY);
    currentY += 10;
  } catch (e) {
    // Fallback to text if image fails
    doc.setFontSize(22);
    doc.setTextColor(67, 56, 202); 
    doc.text(company.name, margin, currentY);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); 
    currentY += 8;
    doc.text(company.address, margin, currentY);
    currentY += 5;
    doc.text(`GSTIN: ${company.gstin} | ${company.email} | ${company.phone}`, margin, currentY);
  }

  // Line
  currentY += 10;
  doc.setDrawColor(226, 232, 240); 
  doc.line(margin, currentY, 210 - margin, currentY);

  // Title
  currentY += 15;
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); 
  doc.text('ESTIMATE / QUOTATION', margin, currentY);

  // Details
  doc.setFontSize(10);
  doc.text(`Estimate #: ${estimate.estimateNumber}`, 210 - margin, currentY - 5, { align: 'right' });
  doc.text(`Date: ${format(new Date(estimate.createdAt), 'dd MMM yyyy')}`, 210 - margin, currentY, { align: 'right' });
  let nextInfoY = currentY + 5;
  doc.text(`Valid Until: ${format(new Date(estimate.validUntil), 'dd MMM yyyy')}`, 210 - margin, nextInfoY, { align: 'right' });

  if (estimate.servicePeriodFrom || estimate.servicePeriodTo) {
    nextInfoY += 5;
    const from = estimate.servicePeriodFrom ? format(new Date(estimate.servicePeriodFrom), 'dd MMM yyyy') : 'N/A';
    const to = estimate.servicePeriodTo ? format(new Date(estimate.servicePeriodTo), 'dd MMM yyyy') : 'Present';
    doc.setFontSize(8);
    doc.setTextColor(67, 56, 202);
    doc.text(`Service Period: ${from} - ${to}`, 210 - margin, nextInfoY, { align: 'right' });
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
  }

  // Billing Info
  currentY += 20;
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Estimate For:', margin, currentY);
  
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105); 
  currentY += 6;
  doc.text(client.name, margin, currentY);
  currentY += 5;
  doc.text(client.address, margin, currentY);
  currentY += 5;
  doc.text(`${client.email} | ${client.phone}`, margin, currentY);

  // Table
  currentY += 15;
  const tableData = estimate.items.map((item, index) => [
    index + 1,
    item.serviceName,
    item.qty,
    `₹${item.rate.toLocaleString()}`,
    `₹${item.amount.toLocaleString()}`
  ]);

  doc.autoTable({
    startY: currentY,
    head: [['#', 'Item / Service', 'Qty', 'Unit Price', 'Amount']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [67, 56, 202], textColor: [255, 255, 255] },
    margin: { left: margin, right: margin }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  // Totals
  const totalsX = 140;
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Subtotal:', totalsX, finalY);
  doc.text(`₹${estimate.subtotal.toLocaleString()}`, 210 - margin, finalY, { align: 'right' });

  doc.text('GST Amount:', totalsX, finalY + 6);
  doc.text(`₹${estimate.gstAmount.toLocaleString()}`, 210 - margin, finalY + 6, { align: 'right' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Total Estimate:', totalsX, finalY + 14);
  doc.text(`₹${estimate.totalAmount.toLocaleString()}`, 210 - margin, finalY + 14, { align: 'right' });

  if (estimate.notes) {
    let notesY = finalY + 30;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes / Terms:', margin, notesY);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const splitNotes = doc.splitTextToSize(estimate.notes, 170);
    doc.text(splitNotes, margin, notesY + 6);
  }

  // Authorized Signatory
  const signatoryY = 265;
  try {
    doc.addImage('/Authorized signatiroy.png', 'PNG', 210 - margin - 40, signatoryY - 20, 40, 15);
  } catch (e) {
    // No image
  }
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Authorized Signatory', 210 - margin, signatoryY, { align: 'right' });
  doc.text(`For ${company.name}`, 210 - margin, signatoryY + 5, { align: 'right' });

  doc.save(`${estimate.estimateNumber}.pdf`);
};

export const generateInvoicePDF = (invoice: Invoice, company: CompanySettings, client: Client) => {
  const doc = new jsPDF();
  const margin = 20;
  let currentY = margin;

  // Header - Logo and Company Info
  try {
    doc.addImage('/Digi info & tech logo.png', 'PNG', margin, currentY - 5, 25, 25);
    currentY += 5;
    doc.setFontSize(22);
    doc.setTextColor(67, 56, 202); 
    doc.text(company.name, margin + 28, currentY);
    currentY += 8;
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); 
    doc.text(company.address, margin + 28, currentY);
    currentY += 5;
    doc.text(`GSTIN: ${company.gstin} | ${company.email} | ${company.phone}`, margin + 28, currentY);
    currentY += 10;
  } catch (e) {
    doc.setFontSize(22);
    doc.setTextColor(67, 56, 202); 
    doc.text(company.name, margin, currentY);
    currentY += 8;
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); 
    doc.text(company.address, margin, currentY);
    currentY += 5;
    doc.text(`GSTIN: ${company.gstin} | ${company.email} | ${company.phone}`, margin, currentY);
  }

  // Line
  currentY += 10;
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.line(margin, currentY, 210 - margin, currentY);

  // Invoice Title
  currentY += 15;
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('TAX INVOICE', margin, currentY);

  // Invoice Details (Right Aligned)
  doc.setFontSize(10);
  doc.text(`Invoice #: ${invoice.invoiceNumber}`, 210 - margin, currentY - 5, { align: 'right' });
  doc.text(`Date: ${format(new Date(invoice.createdAt), 'dd MMM yyyy')}`, 210 - margin, currentY, { align: 'right' });
  let nextInfoY = currentY + 5;
  doc.text(`Due Date: ${format(new Date(invoice.dueDate), 'dd MMM yyyy')}`, 210 - margin, nextInfoY, { align: 'right' });
  
  if (invoice.servicePeriodFrom || invoice.servicePeriodTo) {
    nextInfoY += 5;
    const from = invoice.servicePeriodFrom ? format(new Date(invoice.servicePeriodFrom), 'dd MMM yyyy') : 'N/A';
    const to = invoice.servicePeriodTo ? format(new Date(invoice.servicePeriodTo), 'dd MMM yyyy') : 'Present';
    doc.setFontSize(8);
    doc.setTextColor(67, 56, 202);
    doc.text(`Service Period: ${from} - ${to}`, 210 - margin, nextInfoY, { align: 'right' });
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
  }

  // Billing Info
  currentY += 20;
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Bill To:', margin, currentY);
  
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105); // slate-600
  currentY += 6;
  doc.text(client.name, margin, currentY);
  currentY += 5;
  doc.text(client.address, margin, currentY);
  currentY += 5;
  doc.text(`GSTIN: ${client.gstin}`, margin, currentY);
  currentY += 5;
  doc.text(`${client.email} | ${client.phone}`, margin, currentY);

  // Table
  currentY += 15;
  const tableData = invoice.items.map((item, index) => [
    index + 1,
    item.serviceName,
    item.hsn,
    item.qty,
    `₹${item.rate.toLocaleString()}`,
    `${item.gstRate}%`,
    `₹${item.amount.toLocaleString()}`
  ]);

  doc.autoTable({
    startY: currentY,
    head: [['#', 'Description', 'HSN/SAC', 'Qty', 'Rate', 'GST', 'Amount']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [67, 56, 202], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margin, right: margin }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  // Totals
  const totalsX = 140;
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  
  let totalsY = finalY;
  doc.text('Subtotal:', totalsX, totalsY);
  doc.text(`₹${invoice.subtotal.toLocaleString()}`, 210 - margin, totalsY, { align: 'right' });

  if (invoice.cgst > 0) {
    totalsY += 6;
    doc.text('CGST:', totalsX, totalsY);
    doc.text(`₹${invoice.cgst.toLocaleString()}`, 210 - margin, totalsY, { align: 'right' });
    
    totalsY += 6;
    doc.text('SGST:', totalsX, totalsY);
    doc.text(`₹${invoice.sgst.toLocaleString()}`, 210 - margin, totalsY, { align: 'right' });
  }

  if (invoice.igst > 0) {
    totalsY += 6;
    doc.text('IGST:', totalsX, totalsY);
    doc.text(`₹${invoice.igst.toLocaleString()}`, 210 - margin, totalsY, { align: 'right' });
  }

  totalsY += 10;
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text('Total Amount:', totalsX, totalsY);
  doc.text(`₹${invoice.totalAmount.toLocaleString()}`, 210 - margin, totalsY, { align: 'right' });

  // Bank Details & T&C
  let footerY = totalsY + 20;
  if (footerY > 260) {
    doc.addPage();
    footerY = margin;
  }

  if (company.bankDetails) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Details:', margin, footerY);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const details = company.bankDetails.split('\n');
    details.forEach((line, i) => {
      doc.text(line, margin, footerY + 6 + (i * 4));
    });
    footerY += 6 + (details.length * 4) + 10;
  }

  if (company.termsAndConditions) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Terms & Conditions:', margin, footerY);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    const terms = company.termsAndConditions.split('\n');
    terms.forEach((line, i) => {
      doc.text(line, margin, footerY + 6 + (i * 4));
    });
  }

  // Authorized Signatory
  const signatoryY = 265;
  try {
    doc.addImage('/Authorized signatiroy.png', 'PNG', 210 - margin - 40, signatoryY - 20, 40, 15);
  } catch (e) {
    // No image
  }
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Authorized Signatory', 210 - margin, signatoryY, { align: 'right' });
  doc.text(`For ${company.name}`, 210 - margin, signatoryY + 5, { align: 'right' });

  // Footer for all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${pageCount}`, 210 - margin, 290, { align: 'right' });
  }

  doc.save(`${invoice.invoiceNumber}.pdf`);
};
