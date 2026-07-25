'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowDownRight } from 'lucide-react';

interface Purchase {
  id: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  source: string;
  timestamp: string;
  product: { name: string; category: string };
}

interface PurchasesTabProps {
  purchases: Purchase[];
  totalAmount: number;
  totalCount: number;
}

export function PurchasesTab({ purchases, totalAmount, totalCount }: PurchasesTabProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowDownRight className="w-4 h-4 text-sky-600" /> Purchase History
          </CardTitle>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total ({totalCount} purchases)</p>
            <p className="text-lg font-bold text-sky-700">₹{totalAmount.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[420px] overflow-y-auto">
          {purchases.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No purchases recorded yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-xs">Product</TableHead>
                  <TableHead className="text-xs text-center">Qty</TableHead>
                  <TableHead className="text-xs text-right">Unit Price</TableHead>
                  <TableHead className="text-xs text-right">Total</TableHead>
                  <TableHead className="text-xs text-center">Source</TableHead>
                  <TableHead className="text-xs">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-sm">{p.product.name}</TableCell>
                    <TableCell className="text-sm text-center">{p.quantity}</TableCell>
                    <TableCell className="text-sm text-right">₹{p.unitPrice.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-sm text-right font-semibold">₹{p.amount.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={p.source === 'voice' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                        {p.source === 'voice' ? '🎤 Voice' : '📝 Text'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(p.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
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