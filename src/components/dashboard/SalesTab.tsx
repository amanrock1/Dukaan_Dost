'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Sale {
  id: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  gstAmount: number;
  totalAmount: number;
  source: string;
  timestamp: string;
  product: { name: string; category: string };
}

interface SalesTabProps {
  sales: Sale[];
  totalAmount: number;
  totalCount: number;
}

export function SalesTab({ sales, totalAmount, totalCount }: SalesTabProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-emerald-600" /> Sales History
          </CardTitle>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total ({totalCount} sales)</p>
            <p className="text-lg font-bold text-emerald-700">₹{totalAmount.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[420px] overflow-y-auto">
          {sales.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No sales recorded yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-xs">Product</TableHead>
                  <TableHead className="text-xs text-center">Qty</TableHead>
                  <TableHead className="text-xs text-right">Amount</TableHead>
                  <TableHead className="text-xs text-right">GST</TableHead>
                  <TableHead className="text-xs text-right">Total</TableHead>
                  <TableHead className="text-xs text-center">Source</TableHead>
                  <TableHead className="text-xs">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-sm">{s.product.name}</TableCell>
                    <TableCell className="text-sm text-center">{s.quantity}</TableCell>
                    <TableCell className="text-sm text-right">₹{s.amount.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-sm text-right text-muted-foreground">₹{s.gstAmount.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-sm text-right font-semibold">₹{s.totalAmount.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={s.source === 'voice' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                        {s.source === 'voice' ? '🎤 Voice' : '📝 Text'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(s.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
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
