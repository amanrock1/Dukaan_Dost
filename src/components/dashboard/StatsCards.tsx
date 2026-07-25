'use client';

import { Package, ShoppingCart, AlertTriangle, TrendingUp, IndianRupee } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface StatsCardsProps {
  productCount: number;
  lowStockCount: number;
  todaySales: number;
  todaySalesAmount: number;
  totalInventoryValue: number;
}

export function StatsCards({ productCount, lowStockCount, todaySales, todaySalesAmount, totalInventoryValue }: StatsCardsProps) {
  const stats = [
    { label: 'Products', value: productCount, icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Low Stock Alerts', value: lowStockCount, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Today\'s Sales', value: todaySales, icon: ShoppingCart, color: 'text-sky-600', bg: 'bg-sky-50' },
    { label: 'Today\'s Revenue', value: `₹${todaySalesAmount.toLocaleString('en-IN')}`, icon: IndianRupee, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Inventory Value', value: `₹${totalInventoryValue.toLocaleString('en-IN')}`, icon: TrendingUp, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {stats.map((s) => (
        <Card key={s.label} className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`${s.bg} p-2.5 rounded-lg`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">{s.label}</p>
              <p className="text-lg font-bold truncate">{s.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
