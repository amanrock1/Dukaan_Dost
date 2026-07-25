'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  generatedAt: string;
  sale: {
    id: string;
    quantity: number;
    totalAmount: number;
    product: { name: string };
  };
}

interface InvoicesTabProps {
  invoices: Invoice[];
}

export function InvoicesTab({ invoices }: InvoicesTabProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-violet-600" /> Invoices
          </CardTitle>
          <p className="text-xs text-muted-foreground">{invoices.length} generated</p>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[420px] overflow-y-auto">
          {invoices.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No invoices yet. Record a sale, then say "generate invoice".
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-xs">Invoice #</TableHead>
                  <TableHead className="text-xs">Product</TableHead>
                  <TableHead className="text-xs text-center">Qty</TableHead>
                  <TableHead className="text-xs text-right">Amount</TableHead>
                  <TableHead className="text-xs">Generated</TableHead>
                  <TableHead className="text-xs text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-sm font-medium">{inv.invoiceNumber}</TableCell>
                    <TableCell className="text-sm">{inv.sale.product.name}</TableCell>
                    <TableCell className="text-sm text-center">{inv.sale.quantity}</TableCell>
                    <TableCell className="text-sm text-right font-semibold">₹{inv.sale.totalAmount.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(inv.generatedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-300"
                        onClick={() => window.open(`/api/download-invoice?id=${inv.id}`, '_blank')}
                      >
                        <Download className="w-3 h-3" /> PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}