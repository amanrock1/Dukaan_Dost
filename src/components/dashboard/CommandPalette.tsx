'use client';

import { useEffect, useState, useRef } from 'react';
import { Search, Package, ShoppingCart, FileText, CornerDownLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface CommandPaletteProps {
  onSelectAction: (commandText: string) => void;
  products: Array<{ name: string; category: string; currentStock: number }>;
  invoices: Array<{ invoiceNumber: string; sale: { product: { name: string } } }>;
}

export function CommandPalette({ onSelectAction, products, invoices }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const defaultCommands = [
    { label: 'Record Sale...', value: 'sold ', icon: ShoppingCart, type: 'action' },
    { label: 'Record Purchase...', value: 'bought ', icon: Package, type: 'action' },
    { label: 'Check Stock Level...', value: 'check stock of ', icon: Package, type: 'action' },
    { label: 'Generate GST Invoice', value: 'generate invoice', icon: FileText, type: 'action' },
  ];

  const filteredProducts = search.trim()
    ? products
        .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
        .map((p) => ({
          label: `Check Stock: ${p.name}`,
          value: `check stock of ${p.name.toLowerCase()}`,
          icon: Package,
          type: 'product',
          badge: `${p.currentStock} in stock`,
        }))
    : [];

  const filteredInvoices = search.trim()
    ? invoices
        .filter((inv) => inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()))
        .map((inv) => ({
          label: `Invoice ${inv.invoiceNumber} (${inv.sale.product.name})`,
          value: `invoice ${inv.invoiceNumber}`,
          icon: FileText,
          type: 'invoice',
          badge: 'GST Invoice',
        }))
    : [];

  const items = [...defaultCommands, ...filteredProducts, ...filteredInvoices].filter((cmd) =>
    cmd.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % items.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (items[selectedIndex]) {
          handleSelect(items[selectedIndex].value);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, selectedIndex, items]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const handleSelect = (val: string) => {
    onSelectAction(val);
    setOpen(false);
    setSearch('');
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-300 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-xl cursor-pointer transition-all duration-200 hover:border-emerald-500/50 shadow-inner"
        title="Open command palette (Ctrl+K)"
      >
        <Search className="w-3.5 h-3.5 text-emerald-400" />
        <span className="font-medium">Search dashboard</span>
        <kbd className="hidden sm:inline-flex h-4 select-none items-center gap-0.5 rounded border border-slate-700 bg-slate-950 px-1 font-mono text-[9px] font-bold text-slate-400">
          <span>Ctrl</span>K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl gap-0 text-slate-100">
          <DialogTitle className="sr-only">Command Palette</DialogTitle>
          <div className="flex items-center border-b border-slate-800 px-4 py-3.5 bg-slate-950/80">
            <Search className="w-5 h-5 text-emerald-400 mr-3" />
            <input
              type="text"
              placeholder="Search SKUs, invoices, or type a command..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-sm font-medium bg-transparent border-0 outline-none text-white placeholder-slate-500 focus:ring-0"
              autoFocus
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-xs text-slate-400 hover:text-white font-semibold"
              >
                Clear
              </button>
            )}
          </div>

          <div ref={listRef} className="max-h-[300px] overflow-y-auto py-2">
            {items.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6 italic">No results found for &quot;{search}&quot;</p>
            ) : (
              items.map((item, idx) => {
                const Icon = item.icon;
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={item.value + idx}
                    onClick={() => handleSelect(item.value)}
                    className={`flex items-center justify-between px-4 py-2.5 cursor-pointer text-sm transition-colors ${
                      isSelected ? 'bg-slate-800/90 text-white' : 'text-slate-300 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                      <span className="font-semibold">{item.label}</span>
                      {/* @ts-ignore */}
                      {item.badge && (
                        <span className="text-[10px] bg-slate-950 text-emerald-300 border border-slate-800 px-2 py-0.5 rounded font-mono">
                          {/* @ts-ignore */}
                          {item.badge}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                        <span>Select</span>
                        <CornerDownLeft className="w-3 h-3 text-emerald-400" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-t border-slate-800 text-[10px] text-slate-500">
            <div className="flex items-center gap-3 font-mono">
              <span>↑↓ navigate</span>
              <span>↵ select</span>
              <span>esc close</span>
            </div>
            <div className="font-mono font-bold text-emerald-400">KiranaCopilot AI Core</div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
