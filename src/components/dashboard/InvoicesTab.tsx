'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, FileText, Download, Printer, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  productName?: string;
  quantity?: number;
  unitPrice?: number;
  subtotal?: number;
  gstAmount?: number;
  totalAmount?: number;
  gstRate?: number;
  pdfData?: string;
  timestamp: string;
}

interface InvoicesTabProps {
  invoices?: Invoice[];
}

function openPdfFromBase64(base64: string, filename: string, download = false) {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    if (download) {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
    } else {
      window.open(url, '_blank');
    }
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch {
    alert('PDF not available. Please try again.');
  }
}

export function InvoicesTab({ invoices = [] }: InvoicesTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const filteredInvoices = invoices.filter(
    (inv) =>
      (inv.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.customerName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left: Invoice Registry List */}
      <div className="lg:col-span-2 saas-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">GST Invoice Registry</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Compliance tax documents with automated HSN mapping</p>
          </div>
          <Badge className="bg-zinc-950 text-zinc-300 border border-zinc-800 font-mono text-xs px-3 py-1 self-start sm:self-center">
            {invoices.length} Documents
          </Badge>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search by invoice number or customer name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-emerald-500/50 rounded-xl"
          />
        </div>

        <div className="max-h-[380px] overflow-y-auto border border-zinc-800/80 rounded-xl">
          <Table>
            <TableHeader className="bg-zinc-950 sticky top-0 z-10 border-b border-zinc-800">
              <TableRow className="hover:bg-transparent border-zinc-800">
                <TableHead className="text-xs font-semibold text-zinc-300">Invoice No</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-300">Customer</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-300 text-right">GST</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-300 text-right">Total Amount</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-300 text-center">Date</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-300 text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-xs text-zinc-500 italic">
                    No GST tax invoices yet. Record a sale to auto-generate one.
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((inv) => (
                  <TableRow key={inv.id} className="hover:bg-zinc-800/40 border-b border-zinc-800/60 transition-colors">
                    <TableCell className="font-mono font-semibold text-xs text-emerald-400">{inv.invoiceNumber}</TableCell>
                    <TableCell className="text-xs text-zinc-200 font-medium">{inv.customerName || 'Walk-in Customer'}</TableCell>
                    <TableCell className="text-xs text-right font-mono text-zinc-400">₹{(inv.gstAmount || 0).toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-xs text-right font-mono font-semibold text-zinc-100">₹{(inv.totalAmount || 0).toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-xs text-center font-mono text-zinc-400">
                      {inv.timestamp ? new Date(inv.timestamp).toLocaleDateString('en-IN') : 'Today'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[10px] font-semibold bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                        onClick={() => setSelectedInvoice(inv)}
                      >
                        Preview
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Right: Invoice Preview */}
      <div className="saas-card p-5 flex flex-col justify-between space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" /> GST Tax Invoice Preview
          </h4>
          <span className="text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded font-mono">
            Compliant Rule 46
          </span>
        </div>

        {selectedInvoice ? (
          <div className="flex-1 space-y-4 text-xs font-sans">
            <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-extrabold text-white text-sm">TAX INVOICE</p>
                  <p className="text-[10px] text-zinc-400 font-mono mt-0.5">{selectedInvoice.invoiceNumber}</p>
                </div>
                <Badge className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono">
                  ORIGINAL FOR RECIPIENT
                </Badge>
              </div>

              <div className="border-t border-zinc-800 pt-2 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <p className="text-zinc-500 text-[9px] uppercase font-bold">Billed To:</p>
                  <p className="font-bold text-zinc-200">{selectedInvoice.customerName || 'Walk-in Customer'}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-[9px] uppercase font-bold">Date of Issue:</p>
                  <p className="font-mono text-zinc-300">
                    {selectedInvoice.timestamp ? new Date(selectedInvoice.timestamp).toLocaleDateString('en-IN') : 'Today'}
                  </p>
                </div>
              </div>

              {selectedInvoice.productName && (
                <div className="border-t border-zinc-800 pt-2 text-[11px]">
                  <p className="text-zinc-500 text-[9px] uppercase font-bold mb-1">Item:</p>
                  <p className="text-zinc-200">
                    {selectedInvoice.productName} × {selectedInvoice.quantity} @ ₹{(selectedInvoice.unitPrice || 0).toLocaleString('en-IN')}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl space-y-2 font-mono">
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal (Excl Tax):</span>
                <span>₹{(selectedInvoice.subtotal || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>GST ({selectedInvoice.gstRate || 18}% CGST+SGST):</span>
                <span>₹{(selectedInvoice.gstAmount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-white font-bold border-t border-zinc-800 pt-2 text-sm">
                <span>Total Taxable Amount:</span>
                <span className="text-emerald-400">₹{(selectedInvoice.totalAmount || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              Automated digital seal &amp; HSN code mapping verified.
            </div>

            <div className="pt-2 flex gap-2">
              <Button
                onClick={() => {
                  if (selectedInvoice.pdfData) {
                    openPdfFromBase64(selectedInvoice.pdfData, `${selectedInvoice.invoiceNumber}.pdf`, false);
                  } else {
                    alert('PDF not yet available for this invoice.');
                  }
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl h-9 shadow-md"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5" /> Print PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (selectedInvoice.pdfData) {
                    openPdfFromBase64(selectedInvoice.pdfData, `${selectedInvoice.invoiceNumber}.pdf`, true);
                  } else {
                    alert('PDF not yet available for this invoice.');
                  }
                }}
                className="bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800 text-xs font-bold rounded-xl h-9"
              >
                <Download className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-zinc-500 text-center gap-2">
            <FileText className="w-8 h-8 text-zinc-700" />
            <p className="text-xs font-medium">Select an invoice from the table on the left to preview.</p>
          </div>
        )}
      </div>
    </div>
  );
}