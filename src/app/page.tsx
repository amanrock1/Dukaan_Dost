'use client';

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { InputArea } from '@/components/dashboard/InputArea';
import { InventoryTab } from '@/components/dashboard/InventoryTab';
import { SalesTab } from '@/components/dashboard/SalesTab';
import { PurchasesTab } from '@/components/dashboard/PurchasesTab';
import { InvoicesTab } from '@/components/dashboard/InvoicesTab';
import { AILogTab } from '@/components/dashboard/AILogTab';
import { ResponsePanel } from '@/components/dashboard/ResponsePanel';
import { InsightsCards } from '@/components/dashboard/InsightsCards';
import { CommandPalette } from '@/components/dashboard/CommandPalette';
import { BusinessInsightsTab } from '@/components/dashboard/BusinessInsightsTab';
import { CreateProductSheet } from '@/components/dashboard/CreateProductSheet';
import { toast } from 'sonner';
import {
  Package, ShoppingCart, ArrowDownToLine, FileText, Brain, Sparkles, LineChart,
  MessageSquare, Cpu, Store, ChevronDown, Plus
} from 'lucide-react';

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');
  const [lastResponse, setLastResponse] = useState<any>(null);
  const [pendingContext, setPendingContext] = useState<any>(null);
  const [isProductSheetOpen, setIsProductSheetOpen] = useState(false);
  const [suggestedProductData, setSuggestedProductData] = useState<any>(null);

  // Data fetching
  const { data: inventoryData } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => fetch('/api/inventory').then(r => r.json()),
  });
  const { data: salesData } = useQuery({
    queryKey: ['sales'],
    queryFn: () => fetch('/api/sales').then(r => r.json()),
  });
  const { data: purchasesData } = useQuery({
    queryKey: ['purchases'],
    queryFn: () => fetch('/api/purchases').then(r => r.json()),
  });
  const { data: invoicesData } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => fetch('/api/invoices').then(r => r.json()),
  });
  const { data: logsData } = useQuery({
    queryKey: ['ai-logs'],
    queryFn: () => fetch('/api/ai-logs').then(r => r.json()),
  });
  const { data: insightsData, isLoading: isInsightsLoading } = useQuery({
    queryKey: ['business-insights'],
    queryFn: () => fetch('/api/business-insights').then(r => r.json()),
  });

  const refreshAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    queryClient.invalidateQueries({ queryKey: ['sales'] });
    queryClient.invalidateQueries({ queryKey: ['purchases'] });
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    queryClient.invalidateQueries({ queryKey: ['ai-logs'] });
    queryClient.invalidateQueries({ queryKey: ['business-insights'] });
  }, [queryClient]);

  const handleSubmit = useCallback(async (inputText: string, source: 'text' | 'voice') => {
    setIsLoading(true);
    const tempSteps = [
      { name: 'Speech Recognition', status: source === 'voice' ? 'success' as const : 'pending' as const, timeMs: source === 'voice' ? 150 : 0 },
      { name: 'Intent Classification', status: 'running' as const, timeMs: 0 },
      { name: 'Entity Extraction', status: 'pending' as const, timeMs: 0 },
      { name: 'Inventory Validation', status: 'pending' as const, timeMs: 0 },
      { name: 'Business Rule Validation', status: 'pending' as const, timeMs: 0 },
      { name: 'Database Update', status: 'pending' as const, timeMs: 0 },
      { name: 'Recommendation Update', status: 'pending' as const, timeMs: 0 },
    ];
    setLastResponse({
      response: `Planner Agent analyzing: "${inputText}"...`,
      intent: 'unknown',
      steps: tempSteps,
      success: true,
    });

    try {
      const res = await fetch('/api/process-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: inputText, source, context: pendingContext }),
      });
      const data = await res.json();

      if (data.error) {
        toast.error(data.error);
        setLastResponse({
          response: data.error,
          intent: 'unknown',
          steps: tempSteps.map(s => s.status === 'running' ? { ...s, status: 'error' as const } : s),
          success: false,
        });
        return;
      }

      setLastResponse(data);

      if (data.promptProductCreation) {
        setSuggestedProductData(data.suggestedProduct);
        setIsProductSheetOpen(true);
        toast.info('New product detected. Complete onboarding to execute command.');
      } else if (data.clarificationNeeded) {
        setPendingContext(data.pendingContext);
        toast.warning('Clarification needed for AI execution');
      } else {
        setPendingContext(null);
        if (data.lowStockAlert) toast.warning('Low stock alert! Check inventory tab.');
        if (data.invoiceGenerated) toast.success('GST Invoice generated! Check Invoices tab.');
        if (data.saleId || data.purchaseId) toast.success('Transaction recorded successfully.');
      }

      refreshAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      toast.error('Failed to reach the server. Please try again.');
      setLastResponse({
        response: `Connection failed: ${msg}`,
        intent: 'unknown',
        steps: tempSteps.map(s => s.status === 'running' ? { ...s, status: 'error' as const } : s),
        success: false,
      });
    } finally {
      setIsLoading(false);
    }
  }, [pendingContext, refreshAll]);

  const handleApplyRecommendation = useCallback((actionText: string) => {
    setInput(actionText);
    handleSubmit(actionText, 'text');
  }, [handleSubmit]);

  const handleSelectCommand = useCallback((cmdVal: string) => {
    setInput(cmdVal);
  }, []);

  const products = inventoryData?.products || [];
  const lowStockCount = inventoryData?.lowStockCount || 0;
  const totalInventoryValue = inventoryData?.totalValue || 0;
  const sales = salesData?.sales || [];
  const totalSalesCount = salesData?.totalSales?._count || 0;
  const todaySalesCount = sales.filter((s: { timestamp: string }) => {
    const d = new Date(s.timestamp);
    return d.toDateString() === new Date().toDateString();
  }).length;
  const purchases = purchasesData?.purchases || [];
  const purchasesTotalAmount = purchasesData?.totalPurchases?._sum?.amount || 0;
  const purchasesTotalCount = purchasesData?.totalPurchases?._count || 0;
  const invoices = invoicesData?.invoices || [];
  const logs = logsData?.logs || [];
  const todayRevenue = insightsData?.todayRevenue || 0;
  const revenueGrowth = insightsData?.revenueGrowth || 0;
  const insights = insightsData?.insights || [];
  const recommendations = insightsData?.recommendations || [];

  const quickCommands = [
    { label: '⌘1 Sold 5 Laptops @ ₹50K', value: '5 laptops sold for 50000 each' },
    { label: '⌘2 Bought 20 Notebooks', value: 'bought 20 notebooks at 50 rupees from Raj supplier' },
    { label: '⌘3 Check Keyboard Stock', value: 'check stock of keyboards' },
    { label: '⌘4 Generate Invoice', value: 'generate invoice for last sale' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-zinc-100 font-[family-name:var(--font-plus-jakarta)] selection:bg-emerald-500/30 selection:text-emerald-300">
      
      {/* ── Linear-Style Store Workspace Header ── */}
      <header className="bg-[#121215] border-b border-zinc-800/80 sticky top-0 z-50 shadow-md">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between">
          
          {/* Store switcher */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 cursor-pointer hover:bg-zinc-800/60 p-1.5 rounded-lg transition-colors border border-zinc-800">
              <div className="w-6 h-6 rounded-md bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                D
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-white">Raj General Store</span>
                <span className="text-[10px] text-zinc-500 font-mono">Main Branch</span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2 border-l border-zinc-800 pl-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-zinc-400 font-medium">DukaanDost Engine</span>
            </div>
          </div>

          {/* Right actions & search */}
          <div className="flex items-center gap-2.5">
            <CommandPalette onSelectAction={handleSelectCommand} products={products} invoices={invoices} />

            <button
              onClick={() => {
                setInput('sold 1 Wireless Keyboard for 1500');
              }}
              className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Sale</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content Container ── */}
      <main className="flex-1 max-w-[1440px] mx-auto w-full px-4 sm:px-6 py-5 space-y-4">

        {/* ── Crisp Metric Cards ── */}
        <StatsCards
          productCount={products.length}
          lowStockCount={lowStockCount}
          todaySalesCount={todaySalesCount}
          todayRevenue={todayRevenue}
          totalInventoryValue={totalInventoryValue}
          revenueGrowth={revenueGrowth}
        />

        {/* ── Raycast Command Terminal & Execution Matrix ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:items-start">
          {/* Left: Raycast Terminal */}
          <div className="saas-card p-4 space-y-3">
            <InputArea onSubmit={handleSubmit} isLoading={isLoading} input={input} setInput={setInput} />

            {/* Shortcut triggers */}
            <div className="border-t border-zinc-800/80 pt-3 space-y-2">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3 text-emerald-400" />
                Quick Actions
              </p>
              <div className="flex flex-wrap gap-1.5">
                {quickCommands.map((cmd) => (
                  <button
                    key={cmd.value}
                    onClick={() => {
                      setInput(cmd.value);
                      handleSubmit(cmd.value, 'text');
                    }}
                    className="text-[11px] font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white px-2.5 py-1 rounded-md cursor-pointer transition-colors"
                  >
                    {cmd.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Execution Graph & Reasoning */}
          <ResponsePanel lastResponse={lastResponse} isLoading={isLoading} />
        </div>

        {/* ── Autonomous Insights & Actions ── */}
        <InsightsCards
          insights={insights}
          recommendations={recommendations}
          onApplyRecommendation={handleApplyRecommendation}
          isLoading={isLoading || isInsightsLoading}
        />

        {/* ── Data Workspace Tabs ── */}
        <Tabs defaultValue="inventory" className="w-full space-y-3">
          <TabsList className="bg-[#121215] border border-zinc-800/80 w-full justify-start rounded-xl h-auto p-1 gap-1 shadow-md">
            {[
              { value: 'inventory', icon: Package, label: 'Inventory Catalog', count: products.length },
              { value: 'sales', icon: ShoppingCart, label: 'Sales Transactions', count: sales.length },
              { value: 'purchases', icon: ArrowDownToLine, label: 'Procurement', count: purchases.length },
              { value: 'invoices', icon: FileText, label: 'GST Invoices', count: invoices.length },
              { value: 'insights', icon: LineChart, label: 'Business Intelligence' },
              { value: 'ai-log', icon: Cpu, label: 'Audit Logs', count: logs.length },
            ].map(({ value, icon: Icon, label, count }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="gap-2 text-xs font-semibold data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 hover:text-zinc-200 cursor-pointer rounded-lg px-3 py-1.5 transition-all"
              >
                <Icon className="w-3.5 h-3.5 text-zinc-400" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{label.split(' ')[0]}</span>
                {count !== undefined && (
                  <span className="text-[10px] bg-zinc-900 border border-zinc-700/60 text-zinc-400 font-mono px-1.5 py-0.2 rounded-full">
                    {count}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="inventory" className="mt-0">
            <InventoryTab products={products} lowStockCount={lowStockCount} onRefresh={refreshAll} />
          </TabsContent>
          <TabsContent value="sales" className="mt-0">
            <SalesTab sales={sales} totalAmount={todayRevenue} totalCount={totalSalesCount} onRefresh={refreshAll} />
          </TabsContent>
          <TabsContent value="purchases" className="mt-0">
            <PurchasesTab purchases={purchases} totalAmount={purchasesTotalAmount} totalCount={purchasesTotalCount} />
          </TabsContent>
          <TabsContent value="invoices" className="mt-0">
            <InvoicesTab invoices={invoices} />
          </TabsContent>
          <TabsContent value="insights" className="mt-0">
            <BusinessInsightsTab
              products={products}
              sales={sales}
              purchases={purchases}
              insightsData={insightsData}
              onApplyRecommendation={handleApplyRecommendation}
            />
          </TabsContent>
          <TabsContent value="ai-log" className="mt-0">
            <AILogTab logs={logs} />
          </TabsContent>
        </Tabs>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-zinc-800 bg-[#121215] mt-auto">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-zinc-500 font-medium">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-emerald-600 flex items-center justify-center text-white font-bold text-[10px]">
              D
            </div>
            <span className="font-semibold text-zinc-300">DukaanDost AI</span>
            <span>· Codex India 2026</span>
          </div>
          <p className="font-mono text-[10px] text-zinc-500">Autonomous Operations Core for Retail MSMEs</p>
        </div>
      </footer>

      {/* Product Onboarding Sheet Drawer */}
      <CreateProductSheet
        isOpen={isProductSheetOpen}
        onClose={() => setIsProductSheetOpen(false)}
        suggestedData={suggestedProductData}
        onSuccessExecute={(res) => {
          setLastResponse(res);
          refreshAll();
        }}
      />
    </div>
  );
}
