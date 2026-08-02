'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, ArrowUpDown, ArrowDownToLine, Truck, CreditCard } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Purchase {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
  supplier?: string;
  timestamp: string;
  product?: {
    name: string;
    category: string;
  };
}

interface PurchasesTabProps {
  purchases?: Purchase[];
  totalAmount?: number;
  totalCount?: number;
}

export function PurchasesTab({ purchases = [], totalAmount = 0, totalCount = 0 }: PurchasesTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'quantity'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const categories = ['All', ...Array.from(new Set(purchases.map((p) => p.product?.category).filter(Boolean))) as string[]];
  const avgPurchaseSpend = totalCount > 0 ? Math.round(totalAmount / totalCount) : 0;

  const filteredPurchases = purchases
    .filter((p) => {
      const prodName = p.product?.name || '';
      const cat = p.product?.category || '';
      const supp = p.supplier || '';
      const matchesSearch = 
        prodName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supp.toLowerCase().includes(searchTerm.toLowerCase());
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

  return (
    <div className="space-y-4">
      {/* Procurement KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="saas-card p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Restock Outlay</p>
            <p className="text-xl font-extrabold text-white font-mono mt-1">₹{(totalAmount || 0).toLocaleString('en-IN')}</p>
          </div>
          <div className="p-2 bg-emerald-950/60 border border-emerald-800/80 rounded-xl">
            <CreditCard className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        <div className="saas-card p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Purchase Orders</p>
            <p className="text-xl font-extrabold text-white font-mono mt-1">{totalCount || 0}</p>
          </div>
          <div className="p-2 bg-indigo-950/60 border border-indigo-800/80 rounded-xl">
            <ArrowDownToLine className="w-5 h-5 text-indigo-400" />
          </div>
        </div>

        <div className="saas-card p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Average Order Spend</p>
            <p className="text-xl font-extrabold text-white font-mono mt-1">₹{(avgPurchaseSpend || 0).toLocaleString('en-IN')}</p>
          </div>
          <div className="p-2 bg-cyan-950/60 border border-cyan-800/80 rounded-xl">
            <Truck className="w-5 h-5 text-cyan-400" />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="saas-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Procurement &amp; Supplier Restock History</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Supplier transactions and restocking logs</p>
          </div>
          <Badge className="bg-zinc-950 text-zinc-300 border border-zinc-800 font-mono text-xs px-3 py-1 self-start sm:self-center">
            {purchases.length} Purchase Logs
          </Badge>
        </div>

        {/* Filter controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search by item, supplier, or category..."
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
                <TableHead className="text-xs font-semibold text-zinc-300">Supplier Vendor</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-300 text-right cursor-pointer select-none" onClick={() => toggleSort('quantity')}>
                  <div className="flex items-center justify-end gap-1">
                    Qty Restocked <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                  </div>
                </TableHead>
                <TableHead className="text-xs font-semibold text-zinc-300 text-right cursor-pointer select-none" onClick={() => toggleSort('amount')}>
                  <div className="flex items-center justify-end gap-1">
                    Total Outlay <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                  </div>
                </TableHead>
                <TableHead className="text-xs font-semibold text-zinc-300 text-center cursor-pointer select-none" onClick={() => toggleSort('date')}>
                  <div className="flex items-center justify-center gap-1">
                    Date &amp; Time <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPurchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-xs text-zinc-500 italic">
                    No procurement records match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPurchases.map((p) => (
                  <TableRow key={p.id} className="hover:bg-zinc-800/40 border-b border-zinc-800/60 transition-colors">
                    <TableCell className="font-semibold text-xs text-zinc-100">{p.product?.name || 'Item'}</TableCell>
                    <TableCell className="text-xs text-zinc-400 font-medium">{p.supplier || 'General Wholesaler'}</TableCell>
                    <TableCell className="text-xs text-right font-mono font-semibold text-zinc-200">+{p.quantity || 0}</TableCell>
                    <TableCell className="text-xs text-right font-mono font-semibold text-indigo-400">₹{(p.totalPrice || 0).toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-xs text-center font-mono text-zinc-400">
                      {p.timestamp ? new Date(p.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'Recently'}
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