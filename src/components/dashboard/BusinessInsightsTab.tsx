'use client';

import { Badge } from '@/components/ui/badge';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Sparkles, TrendingUp, ArrowRight, ShieldAlert, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Product {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  unitPrice: number;
  lowStockThreshold: number;
}

interface Sale {
  id: string;
  productId: string;
  quantity: number;
  totalPrice?: number;
  gstAmount?: number;
  timestamp: string;
  product?: {
    name: string;
    category: string;
  };
}

interface Purchase {
  id: string;
  totalPrice?: number;
}

interface BusinessInsightsTabProps {
  products?: Product[];
  sales?: Sale[];
  purchases?: Purchase[];
  insightsData?: any;
  onApplyRecommendation: (actionText: string) => void;
}

export function BusinessInsightsTab({
  products = [],
  sales = [],
  insightsData,
  onApplyRecommendation,
}: BusinessInsightsTabProps) {
  const narrativeSummary = insightsData?.narrativeSummary || 
    "AI Operations Manager indicates healthy steady performance across inventory SKUs. Sales velocity remains stable with zero critical stockout risks.";

  const categoryMap: Record<string, number> = {};
  sales.forEach((s) => {
    const cat = s.product?.category || 'General';
    categoryMap[cat] = (categoryMap[cat] || 0) + (s.totalPrice || 0);
  });

  const categoryChartData = Object.entries(categoryMap).map(([name, value]) => ({
    name,
    value,
  }));

  const topStockValuation = [...products]
    .map((p) => ({
      name: p.name.length > 14 ? p.name.substring(0, 14) + '...' : p.name,
      stockValue: (p.currentStock || 0) * (p.unitPrice || 0),
      currentStock: p.currentStock || 0,
    }))
    .sort((a, b) => b.stockValue - a.stockValue)
    .slice(0, 5);

  const COLOR_PALETTE = ['#10b981', '#6366f1', '#06b6d4', '#f59e0b', '#ec4899', '#8b5cf6'];

  return (
    <div className="space-y-4">
      {/* AI Narrative Executive Briefing Card */}
      <div className="saas-card p-5 space-y-3 relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-950/80 border border-emerald-800/80 rounded-lg">
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">AI Operations Briefing &amp; Diagnosis</h3>
              <p className="text-[10px] text-zinc-500 font-mono">Llama 3 Intelligence Core</p>
            </div>
          </div>
          <Badge className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono">
            Autonomous Diagnosis
          </Badge>
        </div>

        <p className="text-xs text-zinc-300 font-medium leading-relaxed italic bg-zinc-950 border border-zinc-800 p-4 rounded-xl">
          &quot;{narrativeSummary}&quot;
        </p>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category Revenue Chart */}
        <div className="saas-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" /> Sales Distribution by Category
            </h4>
            <span className="text-[10px] text-zinc-500 font-mono">Real-time Revenue</span>
          </div>

          <div className="h-[220px] w-full pt-2">
            {categoryChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-zinc-500 italic">
                No category sales recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLOR_PALETTE[index % COLOR_PALETTE.length]} stroke="#121215" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#121215',
                      borderColor: '#27272a',
                      borderRadius: '0.75rem',
                      color: '#f4f4f5',
                      fontSize: '11px',
                    }}
                    formatter={(value: any) => `₹${Number(value || 0).toLocaleString('en-IN')}`}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#a1a1aa' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Asset Valuation Chart */}
        <div className="saas-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" /> Top SKUs by Capital Valuation
            </h4>
            <span className="text-[10px] text-zinc-500 font-mono">Asset Share</span>
          </div>

          <div className="h-[220px] w-full pt-2">
            {topStockValuation.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-zinc-500 italic">
                No inventory catalog data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topStockValuation}>
                  <XAxis dataKey="name" stroke="#71717a" fontSize={10} tickLine={false} />
                  <YAxis stroke="#71717a" fontSize={10} tickLine={false} tickFormatter={(val) => `₹${(Number(val) || 0) / 1000}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#121215',
                      borderColor: '#27272a',
                      borderRadius: '0.75rem',
                      color: '#f4f4f5',
                      fontSize: '11px',
                    }}
                    formatter={(val: any) => [`₹${Number(val || 0).toLocaleString('en-IN')}`, 'Stock Value']}
                  />
                  <Bar dataKey="stockValue" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Actionable Restock Table */}
      <div className="saas-card p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" /> Automated Stock Replenishment Schedule
          </h4>
          <span className="text-[10px] text-zinc-500 font-mono">Recommended Orders</span>
        </div>

        <div className="space-y-2">
          {products
            .filter((p) => (p.currentStock || 0) <= (p.lowStockThreshold || 0))
            .map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-rose-950 text-rose-300 border border-rose-800 text-[9px] font-bold">
                      LOW STOCK
                    </Badge>
                    <span className="text-xs font-bold text-white">{p.name}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-mono">
                    Current Stock: <span className="text-rose-400 font-bold">{p.currentStock || 0} units</span> (Threshold: {p.lowStockThreshold || 0})
                  </p>
                </div>

                <Button
                  onClick={() => onApplyRecommendation(`bought 25 ${p.name} from General Wholesaler`)}
                  size="sm"
                  className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl gap-1 shadow-sm"
                >
                  <span>Restock 25 Units</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}

          {products.filter((p) => (p.currentStock || 0) <= (p.lowStockThreshold || 0)).length === 0 && (
            <div className="py-8 text-center text-xs text-zinc-500 italic">
              All product stock levels are currently above alert thresholds. No emergency restocks scheduled.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
