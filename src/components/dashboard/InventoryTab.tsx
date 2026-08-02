'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, AlertTriangle, ArrowUpDown, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  lowStockThreshold: number;
  unitPrice: number;
  gstRate: number;
}

interface InventoryTabProps {
  products: Product[];
  lowStockCount: number;
  onRefresh?: () => void;
}

export function InventoryTab({ products, lowStockCount, onRefresh }: InventoryTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [stockFilter, setStockFilter] = useState<'All' | 'Low' | 'OK'>('All');
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'price'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  const [isUpdatingThreshold, setIsUpdatingThreshold] = useState<string | null>(null);
  const [thresholdInput, setThresholdInput] = useState<string>('');
  const [isRestocking, setIsRestocking] = useState<string | null>(null);

  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];

  const getStockStatus = (p: Product) => {
    return p.currentStock <= p.lowStockThreshold ? 'Low' : 'OK';
  };

  const getDaysUntilStockout = (p: Product) => {
    if (p.currentStock === 0) return 0;
    const velocityMap: Record<string, number> = {
      Electronics: 0.8,
      Stationery: 4.5,
      Footwear: 0.5,
      Pharmacy: 2.2,
    };
    const velocity = velocityMap[p.category] || 1.0;
    const days = Math.round(p.currentStock / velocity);
    return days > 100 ? '99+ days' : `${days} days`;
  };

  const filteredProducts = products
    .filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const status = getStockStatus(p);
      const matchesStock = stockFilter === 'All' || (stockFilter === 'Low' && status === 'Low') || (stockFilter === 'OK' && status === 'OK');
      return matchesSearch && matchesCategory && matchesStock;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'stock') {
        comparison = a.currentStock - b.currentStock;
      } else if (sortBy === 'price') {
        comparison = a.unitPrice - b.unitPrice;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const toggleSort = (field: 'name' | 'stock' | 'price') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleQuickPurchase = async (productId: string, productName: string) => {
    const qtyStr = prompt(`How many units of ${productName} would you like to purchase for restock?`, '20');
    if (!qtyStr) return;
    const quantity = parseInt(qtyStr);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Invalid quantity entered.');
      return;
    }

    setIsRestocking(productId);
    try {
      const res = await fetch('/api/inventory/quick-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || `Restocked ${quantity} ${productName}.`);
        if (onRefresh) onRefresh();
      } else {
        toast.error(data.error || 'Failed to restock product.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error during restock.');
    } finally {
      setIsRestocking(null);
    }
  };

  const handleUpdateThreshold = async (productId: string, newThreshold: number) => {
    try {
      const res = await fetch('/api/inventory/update-threshold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, threshold: newThreshold }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Stock alert threshold updated successfully.');
        setIsUpdatingThreshold(null);
        if (onRefresh) onRefresh();
      } else {
        toast.error(data.error || 'Failed to update threshold.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error during threshold update.');
    }
  };

  return (
    <div className="saas-card p-5 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">Operational Inventory Catalog</h3>
          <p className="text-xs text-zinc-400 mt-0.5">Real-time stock quantities, thresholds, and replenishment predictions</p>
        </div>
        {lowStockCount > 0 && (
          <Badge className="bg-rose-950 text-rose-300 border border-rose-800 uppercase text-[10px] font-bold gap-1.5 shrink-0 px-2.5 py-1 self-start md:self-center">
            <AlertTriangle className="w-3.5 h-3.5" /> {lowStockCount} items low stock
          </Badge>
        )}
      </div>

      {/* Filter controls */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search catalog by product name or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-emerald-500/50 rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
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

          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
            className="w-full sm:w-auto h-9 text-xs bg-zinc-950 border border-zinc-800 text-zinc-300 rounded-xl px-3 outline-none font-medium focus:border-zinc-700 cursor-pointer"
          >
            <option value="All">All Levels</option>
            <option value="Low">Low Stock</option>
            <option value="OK">Healthy Stock</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="max-h-[420px] overflow-y-auto border border-zinc-800/80 rounded-xl">
        <Table>
          <TableHeader className="bg-zinc-950 sticky top-0 z-10 border-b border-zinc-800">
            <TableRow className="hover:bg-transparent border-zinc-800">
              <TableHead className="text-xs font-semibold text-zinc-300 cursor-pointer select-none" onClick={() => toggleSort('name')}>
                <div className="flex items-center gap-1">
                  Product Name <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                </div>
              </TableHead>
              <TableHead className="text-xs font-semibold text-zinc-300">Category</TableHead>
              <TableHead className="text-xs font-semibold text-zinc-300 text-right cursor-pointer select-none" onClick={() => toggleSort('price')}>
                <div className="flex items-center justify-end gap-1">
                  Base Price <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                </div>
              </TableHead>
              <TableHead className="text-xs font-semibold text-zinc-300 text-right cursor-pointer select-none" onClick={() => toggleSort('stock')}>
                <div className="flex items-center justify-end gap-1">
                  Current Stock <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                </div>
              </TableHead>
              <TableHead className="text-xs font-semibold text-zinc-300 text-center">Alert Threshold</TableHead>
              <TableHead className="text-xs font-semibold text-zinc-300 text-center">Runout Forecast</TableHead>
              <TableHead className="text-xs font-semibold text-zinc-300 text-center">Quick Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-xs text-zinc-500 italic">
                  No catalog items match your search filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((p) => {
                const isLow = p.currentStock <= p.lowStockThreshold;
                const runout = getDaysUntilStockout(p);
                return (
                  <TableRow key={p.id} className="hover:bg-zinc-800/40 border-b border-zinc-800/60 transition-colors">
                    <TableCell className="font-semibold text-xs text-zinc-100">{p.name}</TableCell>
                    <TableCell className="text-xs text-zinc-400 font-medium">{p.category}</TableCell>
                    <TableCell className="text-xs text-right font-mono font-semibold text-zinc-200">₹{p.unitPrice.toLocaleString('en-IN')}</TableCell>
                    <TableCell className={`text-xs text-right font-mono font-semibold ${isLow ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {p.currentStock} {p.unit}
                    </TableCell>
                    
                    <TableCell className="text-center">
                      {isUpdatingThreshold === p.id ? (
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            value={thresholdInput}
                            onChange={(e) => setThresholdInput(e.target.value)}
                            className="w-12 h-6 bg-zinc-950 border border-zinc-700 rounded text-center font-mono text-xs text-zinc-100 outline-none focus:border-emerald-500"
                            autoFocus
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6 text-[10px] bg-emerald-950 text-emerald-300 border-emerald-800"
                            onClick={() => {
                              const val = parseInt(thresholdInput);
                              if (!isNaN(val)) handleUpdateThreshold(p.id, val);
                            }}
                          >
                            <Check className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <span 
                          onClick={() => {
                            setIsUpdatingThreshold(p.id);
                            setThresholdInput(String(p.lowStockThreshold));
                          }}
                          className="font-mono text-xs cursor-pointer text-zinc-400 hover:text-zinc-100 border-b border-dashed border-zinc-700 font-medium hover:border-zinc-400 transition-colors"
                          title="Click to edit threshold"
                        >
                          {p.lowStockThreshold} units
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-center font-medium text-zinc-400">
                      {isLow ? (
                        <span className="text-rose-400 font-semibold bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/80">Replenish Immediately</span>
                      ) : (
                        runout
                      )}
                    </TableCell>

                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px] font-semibold bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800 hover:text-white transition-all"
                        disabled={isRestocking === p.id}
                        onClick={() => handleQuickPurchase(p.id, p.name)}
                      >
                        {isRestocking === p.id ? 'Restocking...' : 'Restock'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}