'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Package, ShieldCheck, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CreateProductSheetProps {
  isOpen: boolean;
  onClose: () => void;
  suggestedData: {
    name: string;
    suggestedCategory: string;
    suggestedUnitPrice: number;
    suggestedGstRate: number;
    pendingExecution: {
      action: 'sale' | 'purchase';
      quantity: number;
      customerName?: string;
      supplier?: string;
      unitPrice?: number;
    };
  } | null;
  onSuccessExecute: (response: any) => void;
  shopId?: string | null;
}

export function CreateProductSheet({
  isOpen,
  onClose,
  suggestedData,
  onSuccessExecute,
  shopId = null,
}: CreateProductSheetProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [unit, setUnit] = useState('pcs');
  const [unitPrice, setUnitPrice] = useState(0);
  const [gstRate, setGstRate] = useState(18);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [initialStock, setInitialStock] = useState(0);
  const [modelNumber, setModelNumber] = useState('');
  const [aliases, setAliases] = useState('');
  const [attributes, setAttributes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (suggestedData) {
      setName(suggestedData.name || '');
      setCategory(suggestedData.suggestedCategory || 'Electronics');
      setUnitPrice(suggestedData.suggestedUnitPrice || 0);
      setGstRate(suggestedData.suggestedGstRate || 18);
    } else {
      setName('');
      setCategory('Electronics');
      setUnitPrice(0);
      setGstRate(18);
      setInitialStock(10);
      setLowStockThreshold(5);
      setModelNumber('');
      setAliases('');
      setAttributes('');
    }
  }, [suggestedData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter a valid product name');
      return;
    }

    setIsLoading(true);
    try {
      const pendingExecution = suggestedData?.pendingExecution || {
        action: 'purchase',
        quantity: 0,
      };

      const res = await fetch('/api/inventory/create-and-execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: {
            name,
            category,
            unit,
            unitPrice: Number(unitPrice),
            gstRate: Number(gstRate),
            lowStockThreshold: Number(lowStockThreshold),
            currentStock: Number(initialStock),
            modelNumber,
            aliases,
            attributes,
          },
          execution: pendingExecution,
          shopId,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(data.error || 'Failed to onboard product.');
      } else {
        toast.success(
          suggestedData
            ? `Product "${name}" onboarded & ${pendingExecution.action} command executed!`
            : `Product "${name}" successfully added to catalog!`
        );
        onSuccessExecute(data);
        onClose();
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error onboarding product.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-md transition-opacity">
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl h-full flex flex-col justify-between p-6 space-y-6 text-slate-100 overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-950 border border-emerald-800 rounded-xl">
              {suggestedData ? <Sparkles className="w-5 h-5 text-emerald-400" /> : <Package className="w-5 h-5 text-emerald-400" />}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">{suggestedData ? 'AI Product Onboarding' : 'Create Product SKU'}</h3>
              <p className="text-xs text-slate-400">
                {suggestedData ? 'Item not in catalog. Pre-filled guesses derived from intent.' : 'Manually enter product parameters to register item.'}
              </p>
            </div>
          </div>

          {suggestedData?.pendingExecution && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs space-y-1 text-emerald-300 font-mono">
              <p className="font-bold uppercase text-[10px] text-emerald-400">Auto-Execution Pending:</p>
              <p>
                Action: <span className="font-bold text-white uppercase">{suggestedData.pendingExecution.action}</span> {suggestedData.pendingExecution.quantity} units
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs font-sans">
            <div>
              <label className="text-slate-400 font-semibold mb-1 block text-[11px]">Product Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Philips 50W LED Flood Light Warm White"
                className="bg-slate-950 border-slate-800 text-white font-bold h-9 text-xs rounded-xl focus:border-emerald-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 font-semibold mb-1 block text-[11px]">Model Code / MPN (Optional)</label>
                <Input
                  value={modelNumber}
                  onChange={(e) => setModelNumber(e.target.value)}
                  placeholder="e.g. BVP173 or UK9"
                  className="bg-slate-950 border-slate-800 text-white font-mono h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold mb-1 block text-[11px]">Shortcodes &amp; Aliases</label>
                <Input
                  value={aliases}
                  onChange={(e) => setAliases(e.target.value)}
                  placeholder="e.g. bvp173, p50 flood"
                  className="bg-slate-950 border-slate-800 text-white h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 font-semibold mb-1 block text-[11px]">Variant Specifications / Attributes</label>
              <Input
                value={attributes}
                onChange={(e) => setAttributes(e.target.value)}
                placeholder="e.g. 50W Warm White, 3000K or Size 9, White"
                className="bg-slate-950 border-slate-800 text-white h-9 text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 font-semibold mb-1 block text-[11px]">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-9 bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-2.5 outline-none font-medium focus:border-emerald-500"
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
                <label className="text-slate-400 font-semibold mb-1 block text-[11px]">Measurement Unit</label>
                <Input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white font-medium h-9 text-xs rounded-xl"
                  placeholder="pcs, kg, box"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 font-semibold mb-1 block text-[11px]">Unit Price (₹)</label>
                <Input
                  type="number"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(Number(e.target.value))}
                  className="bg-slate-950 border-slate-800 text-white font-mono font-bold h-9 text-xs rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold mb-1 block text-[11px]">GST Rate (%)</label>
                <select
                  value={gstRate}
                  onChange={(e) => setGstRate(Number(e.target.value))}
                  className="w-full h-9 bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl px-2.5 outline-none font-mono font-medium"
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
                <label className="text-slate-400 font-semibold mb-1 block text-[11px]">Alert Threshold</label>
                <Input
                  type="number"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                  className="bg-slate-950 border-slate-800 text-white font-mono h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold mb-1 block text-[11px]">Starting Stock</label>
                <Input
                  type="number"
                  value={initialStock}
                  onChange={(e) => setInitialStock(Number(e.target.value))}
                  className="bg-slate-950 border-slate-800 text-white font-mono h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="pt-4 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 bg-slate-950 border-slate-800 text-slate-400 hover:text-white h-10 rounded-xl font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white h-10 rounded-xl font-bold shadow-lg shadow-emerald-950/80 gap-1.5"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Save &amp; Execute
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
