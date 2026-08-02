'use client';

import { Package, AlertTriangle, TrendingUp, IndianRupee, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface StatsCardsProps {
  productCount: number;
  lowStockCount: number;
  todaySalesCount: number;
  todayRevenue: number;
  totalInventoryValue: number;
  revenueGrowth?: number;
}

export function StatsCards({
  productCount,
  lowStockCount,
  todaySalesCount,
  todayRevenue,
  totalInventoryValue,
  revenueGrowth = 0,
}: StatsCardsProps) {
  const stats = [
    {
      label: 'Products Catalog',
      value: productCount.toLocaleString('en-IN'),
      icon: Package,
      trend: null,
      subtext: 'Active catalog items',
      badgeColor: 'text-zinc-400 bg-zinc-800/50',
    },
    {
      label: 'Total Asset Valuation',
      value: `₹${totalInventoryValue.toLocaleString('en-IN')}`,
      icon: TrendingUp,
      trend: null,
      subtext: 'Current asset value',
      badgeColor: 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/50',
    },
    {
      label: "Today's Revenue",
      value: `₹${todayRevenue.toLocaleString('en-IN')}`,
      icon: IndianRupee,
      trend: revenueGrowth,
      subtext: 'vs previous day',
      badgeColor: 'text-indigo-400 bg-indigo-950/40 border border-indigo-800/50',
    },
    {
      label: "Today's Checkouts",
      value: `${todaySalesCount} orders`,
      icon: ArrowUpRight,
      trend: null,
      subtext: 'Completed sales today',
      badgeColor: 'text-zinc-300 bg-zinc-800/60',
    },
    {
      label: 'Low Stock Alerts',
      value: lowStockCount.toLocaleString('en-IN'),
      icon: AlertTriangle,
      trend: null,
      subtext: lowStockCount > 0 ? 'Requires attention' : 'Inventory levels optimal',
      badgeColor: lowStockCount > 0 
        ? 'text-rose-400 bg-rose-950/60 border border-rose-800/60 font-semibold' 
        : 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/50',
    },
  ];

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <ArrowUpRight className="w-3 h-3" />;
    if (trend < 0) return <ArrowDownRight className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.label}
            className="saas-card-interactive p-4 space-y-2 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400 tracking-tight">{s.label}</span>
              <div className="p-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-300">
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-white tracking-tight font-sans">{s.value}</span>
                {s.trend !== null && s.trend !== undefined && s.trend !== 0 && (
                  <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                    s.trend >= 0 
                      ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60' 
                      : 'bg-rose-950/80 text-rose-400 border-rose-800/60'
                  }`}>
                    {getTrendIcon(s.trend)}
                    {Math.abs(s.trend)}%
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-500 font-medium">{s.subtext}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
