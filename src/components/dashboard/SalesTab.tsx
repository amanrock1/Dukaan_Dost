'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, ArrowUpDown, RefreshCcw, IndianRupee, ShoppingCart, Percent } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Sale {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
  gstAmount?: number;
  customerName?: string;
  timestamp: string;
  product?: {
    name: string;
    category: string;
  };
}

interface SalesTabProps {
  sales: Sale[];
  totalAmount?: number;
  totalCount?: number;
  onRefresh?: () => void;
}

export function SalesTab({ sales = [], totalAmount = 0, totalCount = 0, onRefresh }: SalesTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'quantity'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [refundingId, setRefundingId] = useState<string | null>(null);

  const categories = ['All', ...Array.from(new Set(sales.map((s) => s.product?.category).filter(Boolean))) as string[]];

  const todaySales = sales.filter((s) => {
    const d = new Date(s.timestamp);
    return d.toDateString() === new Date().toDateString();
  });
  
  const todayGst = todaySales.reduce((acc, curr) => acc + (curr.gstAmount || 0), 0);
  const avgOrderValue = todaySales.length > 0 ? Math.round(totalAmount / todaySales.length) : 0;

  const filteredSales = sales
    .filter((s) => {
      const prodName = s.product?.name || '';
      const cat = s.product?.category || '';
      const cust = s.customerName || '';
      const matchesSearch = 
        prodName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cust.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || cat === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      } else if (sortBy === 'amount') {
        comparison = (a.totalPrice || 0) - (b.totalPrice || 0);
      } else if (sortBy === 'quantity') {
        comparison = (a.quantity || 0) - (b.quantity || 0);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const toggleSort = (field: 'date' | 'amount' | 'quantity') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleRefund = async (saleId: string) => {
    if (!confirm('Are you sure you want to issue a refund and restock items into inventory?')) return;
    setRefundingId(saleId);
    try {
      const res = await fetch('/api/sales/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saleId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Sale refunded successfully.');
        if (onRefresh) onRefresh();
      } else {
        toast.error(data.error || 'Failed to refund sale.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error during refund.');
    } finally {
      setIsRefunding(null);
    }
  };

  function setIsRefunding(val: null) {
    setRefundingId(val);
  }

  return (
    <div className="space-y-4">
      {/* Sales KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="saas-card p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Today's Sales Volume</p>
            <p className="text-xl font-extrabold text-white font-mono mt-1">₹{(totalAmount || 0).toLocaleString('en-IN')}</p>
          </div>
          <div className="p-2 bg-emerald-950/60 border border-emerald-800/80 rounded-xl">
            <IndianRupee className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        <div className="saas-card p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Avg Order Value</p>
            <p className="text-xl font-extrabold text-white font-mono mt-1">₹{(avgOrderValue || 0).toLocaleString('en-IN')}</p>
          </div>
          <div className="p-2 bg-indigo-950/60 border border-indigo-800/80 rounded-xl">
            <ShoppingCart className="w-5 h-5 text-indigo-400" />
          </div>
        </div>

        <div className="saas-card p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">GST Collected</p>
            <p className="text-xl font-extrabold text-white font-mono mt-1">₹{(todayGst || 0).toLocaleString('en-IN')}</p>
          </div>
          <div className="p-2 bg-violet-950/60 border border-violet-800/80 rounded-xl">
            <Percent className="w-5 h-5 text-violet-400" />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="saas-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Sales History &amp; Transactions</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Recorded checkout orders and automated GST billing entries</p>
          </div>
          <Badge className="bg-zinc-950 text-zinc-300 border border-zinc-800 font-mono text-xs px-3 py-1 self-start sm:self-center">
            {totalCount || 0} Total Transactions
          </Badge>
        </div>

        {/* Filter controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search by product, customer, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-emerald-500/50 rounded-xl"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto h-9 text-xs bg-zinc-950 border border-zinc-800 text-zinc-300 rounded-xl px-3 outline-none font-medium focus:border-zinc-700 cursor-pointer"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'All' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="max-h-[380px] overflow-y-auto border border-zinc-800/80 rounded-xl">
          <Table>
            <TableHeader className="bg-zinc-950 sticky top-0 z-10 border-b border-zinc-800">
              <TableRow className="hover:bg-transparent border-zinc-800">
                <TableHead className="text-xs font-semibold text-zinc-300">Product Name</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-300">Customer</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-300 text-right cursor-pointer select-none" onClick={() => toggleSort('quantity')}>
                  <div className="flex items-center justify-end gap-1">
                    Qty <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                  </div>
                </TableHead>
                <TableHead className="text-xs font-semibold text-zinc-300 text-right cursor-pointer select-none" onClick={() => toggleSort('amount')}>
                  <div className="flex items-center justify-end gap-1">
                    Total Amount <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                  </div>
                </TableHead>
                <TableHead className="text-xs font-semibold text-zinc-300 text-right">GST</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-300 text-center cursor-pointer select-none" onClick={() => toggleSort('date')}>
                  <div className="flex items-center justify-center gap-1">
                    Date &amp; Time <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                  </div>
                </TableHead>
                <TableHead className="text-xs font-semibold text-zinc-300 text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-xs text-zinc-500 italic">
                    No sales records found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSales.map((s) => (
                  <TableRow key={s.id} className="hover:bg-zinc-800/40 border-b border-zinc-800/60 transition-colors">
                    <TableCell className="font-semibold text-xs text-zinc-100">{s.product?.name || 'Item'}</TableCell>
                    <TableCell className="text-xs text-zinc-400 font-medium">{s.customerName || 'Walk-in Customer'}</TableCell>
                    <TableCell className="text-xs text-right font-mono font-semibold text-zinc-200">{s.quantity || 0}</TableCell>
                    <TableCell className="text-xs text-right font-mono font-semibold text-emerald-400">₹{(s.totalPrice || 0).toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-xs text-right font-mono text-zinc-400">₹{(s.gstAmount || 0).toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-xs text-center font-mono text-zinc-400">
                      {s.timestamp ? new Date(s.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'Just now'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[10px] font-semibold bg-zinc-950 border-zinc-800 text-rose-400 hover:bg-rose-950 hover:text-rose-200 hover:border-rose-800 transition-all"
                        disabled={refundingId === s.id}
                        onClick={() => handleRefund(s.id)}
                      >
                        <RefreshCcw className="w-3 h-3 mr-1" />
                        {refundingId === s.id ? 'Refunding...' : 'Refund'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
