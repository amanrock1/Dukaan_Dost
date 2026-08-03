'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, AlertTriangle, ArrowUpDown, Check, Edit2, Trash2, Plus, X, Save } from 'lucide-react';
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
  modelNumber?: string | null;
  aliases?: string | null;
  attributes?: string | null;
}

interface InventoryTabProps {
  products: Product[];
  lowStockCount: number;
  onRefresh?: () => void;
  onOpenAddProduct?: () => void;
}

export function InventoryTab({ products, lowStockCount, onRefresh, onOpenAddProduct }: InventoryTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [stockFilter, setStockFilter] = useState<'All' | 'Low' | 'OK'>('All');
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'price'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Quick edit state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('Electronics');
  const [editUnit, setEditUnit] = useState('pcs');
  const [editStock, setEditStock] = useState(0);
  const [editPrice, setEditPrice] = useState(0);
  const [editGst, setEditGst] = useState(18);
  const [editThreshold, setEditThreshold] = useState(5);
  const [isSaving, setIsSaving] = useState(false);

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

  const handleStartEdit = (p: Product) => {
    setEditingProduct(p);
    setEditName(p.name);
    setEditCategory(p.category);
    setEditUnit(p.unit);
    setEditStock(p.currentStock);
    setEditPrice(p.unitPrice);
    setEditGst(p.gstRate);
    setEditThreshold(p.lowStockThreshold);
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    if (!editName.trim()) {
      toast.error('Product name cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/inventory/product', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingProduct.id,
          name: editName,
          category: editCategory,
          unit: editUnit,
          currentStock: editStock,
          unitPrice: editPrice,
          gstRate: editGst,
          lowStockThreshold: editThreshold,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Updated "${editName}" successfully!`);
        setEditingProduct(null);
        if (onRefresh) onRefresh();
      } else {
        toast.error(data.error || 'Failed to update product');
      }
    } catch (err) {
      toast.error('Network error updating product');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (p: Product) => {
    if (!confirm(`Are you sure you want to delete "${p.name}"?`)) return;

    try {
      const res = await fetch(`/api/inventory/product?id=${p.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Deleted product "${p.name}"`);
        if (onRefresh) onRefresh();
      } else {
        toast.error(data.error || 'Failed to delete product');
      }
    } catch (err) {
      toast.error('Network error deleting product');
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
      toast.error('Network error during threshold update.');
    }
  };

  return (
    <div className="saas-card p-4 sm:p-5 space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">Operational Inventory Catalog</h3>
          <p className="text-xs text-zinc-400 mt-0.5">Real-time stock quantities, manual editing, thresholds &amp; predictions</p>
        </div>
        
        <div className="flex items-center gap-2">
          {onOpenAddProduct && (
            <Button
              onClick={onOpenAddProduct}
              size="sm"
              className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg gap-1.5 shadow-md"
            >
              <Plus className="w-3.5 h-3.5" /> + Add Product
            </Button>
          )}

          {lowStockCount > 0 && (
            <Badge className="bg-rose-950 text-rose-300 border border-rose-800 uppercase text-[10px] font-bold gap-1.5 shrink-0 px-2.5 py-1">
              <AlertTriangle className="w-3.5 h-3.5" /> {lowStockCount} items low stock
            </Badge>
          )}
        </div>
      </div>

      {/* Filter controls */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5">
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
      <div className="max-h-[420px] overflow-y-auto border border-zinc-800/80 rounded-xl overflow-x-auto">
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
              <TableHead className="text-xs font-semibold text-zinc-300 text-center">Threshold</TableHead>
              <TableHead className="text-xs font-semibold text-zinc-300 text-center">Runout</TableHead>
              <TableHead className="text-xs font-semibold text-zinc-300 text-center">Actions</TableHead>
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
                    <TableCell className="font-semibold text-xs text-zinc-100 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{p.name}</span>
                        {p.modelNumber && (
                          <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-1.5 py-0.5 rounded">
                            #{p.modelNumber}
                          </span>
                        )}
                        {p.attributes && (
                          <span className="text-[10px] text-zinc-400 font-sans italic">
                            ({p.attributes})
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-zinc-400 font-medium whitespace-nowrap">{p.category}</TableCell>
                    <TableCell className="text-xs text-right font-mono font-semibold text-zinc-200 whitespace-nowrap">₹{p.unitPrice.toLocaleString('en-IN')}</TableCell>
                    <TableCell className={`text-xs text-right font-mono font-semibold whitespace-nowrap ${isLow ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {p.currentStock} {p.unit}
                    </TableCell>
                    
                    <TableCell className="text-center whitespace-nowrap">
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
                          {p.lowStockThreshold} {p.unit}
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-center font-medium text-zinc-400 whitespace-nowrap">
                      {isLow ? (
                        <span className="text-rose-400 font-semibold bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/80">Low Stock</span>
                      ) : (
                        runout
                      )}
                    </TableCell>

                    <TableCell className="text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px] font-semibold bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800 hover:text-white px-2"
                          disabled={isRestocking === p.id}
                          onClick={() => handleQuickPurchase(p.id, p.name)}
                          title="Quick Restock"
                        >
                          {isRestocking === p.id ? '...' : 'Restock'}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800"
                          onClick={() => handleStartEdit(p)}
                          title="Manual Edit Product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800"
                          onClick={() => handleDeleteProduct(p)}
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Manual Product Edit Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl relative text-zinc-100">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-400" /> Manual Edit Product SKU
              </h4>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-400 font-semibold mb-1 block">Product Name</label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 text-white font-bold h-9 text-xs rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 font-semibold mb-1 block">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full h-9 bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-2.5 outline-none font-medium"
                  >
                    <option value="Electronics">Electronics</option>
                    <option value="Stationery">Stationery</option>
                    <option value="Footwear">Footwear</option>
                    <option value="Pharmacy">Pharmacy</option>
                    <option value="Groceries">Groceries</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="text-zinc-400 font-semibold mb-1 block">Unit</label>
                  <Input
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-white h-9 text-xs rounded-xl"
                    placeholder="pcs, kg, box"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 font-semibold mb-1 block">Base Price (₹)</label>
                  <Input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(Number(e.target.value))}
                    className="bg-zinc-950 border-zinc-800 text-white font-mono font-bold h-9 text-xs rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 font-semibold mb-1 block">GST Rate (%)</label>
                  <select
                    value={editGst}
                    onChange={(e) => setEditGst(Number(e.target.value))}
                    className="w-full h-9 bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-2.5 outline-none font-mono"
                  >
                    <option value={0}>0% (Exempt)</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18% (Standard)</option>
                    <option value={28}>28%</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 font-semibold mb-1 block">Current Stock</label>
                  <Input
                    type="number"
                    value={editStock}
                    onChange={(e) => setEditStock(Number(e.target.value))}
                    className="bg-zinc-950 border-zinc-800 text-white font-mono font-bold h-9 text-xs rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-zinc-400 font-semibold mb-1 block">Low Stock Alert Level</label>
                  <Input
                    type="number"
                    value={editThreshold}
                    onChange={(e) => setEditThreshold(Number(e.target.value))}
                    className="bg-zinc-950 border-zinc-800 text-white font-mono h-9 text-xs rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <Button
                variant="outline"
                onClick={() => setEditingProduct(null)}
                className="flex-1 bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white h-9 rounded-xl font-bold"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white h-9 rounded-xl font-bold gap-1.5 shadow-md"
              >
                <Save className="w-4 h-4" /> Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}