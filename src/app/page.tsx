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
import { toast } from 'sonner';
import {
  Package, ShoppingCart, ArrowDownToLine, FileText, Brain, Sparkles,
} from 'lucide-react';

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const responsePanel = ResponsePanel();
  const { addMessage } = responsePanel;

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

  const refreshAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    queryClient.invalidateQueries({ queryKey: ['sales'] });
    queryClient.invalidateQueries({ queryKey: ['purchases'] });
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    queryClient.invalidateQueries({ queryKey: ['ai-logs'] });
  }, [queryClient]);

  const handleSubmit = useCallback(async (input: string, source: 'text' | 'voice') => {
    setIsLoading(true);
    const sourceLabel = source === 'voice' ? '🎙️ Voice' : '📝 Text';
    addMessage(`${sourceLabel}: "${input}"`, 'info');

    try {
      const res = await fetch('/api/process-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, source }),
      });
      const data = await res.json();

      if (data.error) {
        addMessage(data.error, 'error');
        toast.error(data.error);
        return;
      }

      const responseType = data.clarificationNeeded ? 'warning' : data.success === false ? 'error' : 'success';
      addMessage(data.response, responseType);

      if (data.lowStockAlert) {
        toast.warning('Low stock alert! Check inventory tab.');
      }
      if (data.invoiceGenerated) {
        toast.success('Invoice generated! Check the Invoices tab to download.');
      }
      if (data.saleId) {
        toast.success('Sale recorded successfully.');
      }

      refreshAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      addMessage(`Connection failed: ${msg}`, 'error');
      toast.error('Failed to reach the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [addMessage, refreshAll]);

  const products = inventoryData?.products || [];
  const lowStockCount = inventoryData?.lowStockCount || 0;
  const totalInventoryValue = inventoryData?.totalValue || 0;
  const sales = salesData?.sales || [];
  const totalSalesAmount = salesData?.totalSales?._sum?.totalAmount || 0;
  const todaySales = sales.filter((s: { timestamp: string }) => {
    const d = new Date(s.timestamp);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;
  const salesTotal = salesData?.totalSales?._count || 0;
  const purchases = purchasesData?.purchases || [];
  const purchasesTotalAmount = purchasesData?.totalPurchases?._sum?.amount || 0;
  const purchasesTotalCount = purchasesData?.totalPurchases?._count || 0;
  const invoices = invoicesData?.invoices || [];
  const logs = logsData?.logs || [];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">Inventory Copilot AI</h1>
              <p className="text-xs text-slate-500 hidden sm:block">AI-powered inventory management for Bharat&apos;s businesses</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              AI Agent Online
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-4 space-y-4">
        <StatsCards
          productCount={products.length}
          lowStockCount={lowStockCount}
          todaySales={todaySales}
          todaySalesAmount={totalSalesAmount}
          totalInventoryValue={totalInventoryValue}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <InputArea onSubmit={handleSubmit} isLoading={isLoading} />
          {responsePanel.panel}
        </div>

        <Tabs defaultValue="inventory" className="w-full">
          <TabsList className="bg-white border border-slate-200 w-full justify-start rounded-lg h-auto p-1 gap-1">
            <TabsTrigger value="inventory" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Package className="w-3.5 h-3.5" /> Inventory
            </TabsTrigger>
            <TabsTrigger value="sales" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <ShoppingCart className="w-3.5 h-3.5" /> Sales
            </TabsTrigger>
            <TabsTrigger value="purchases" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <ArrowDownToLine className="w-3.5 h-3.5" /> Purchases
            </TabsTrigger>
            <TabsTrigger value="invoices" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <FileText className="w-3.5 h-3.5" /> Invoices
            </TabsTrigger>
            <TabsTrigger value="ai-log" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Brain className="w-3.5 h-3.5" /> AI Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="mt-3">
            <InventoryTab products={products} lowStockCount={lowStockCount} />
          </TabsContent>
          <TabsContent value="sales" className="mt-3">
            <SalesTab sales={sales} totalAmount={totalSalesAmount} totalCount={salesTotal} />
          </TabsContent>
          <TabsContent value="purchases" className="mt-3">
            <PurchasesTab purchases={purchases} totalAmount={purchasesTotalAmount} totalCount={purchasesTotalCount} />
          </TabsContent>
          <TabsContent value="invoices" className="mt-3">
            <InvoicesTab invoices={invoices} />
          </TabsContent>
          <TabsContent value="ai-log" className="mt-3">
            <AILogTab logs={logs} />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <p>Inventory Copilot AI &middot; Codex India Hackathon 2026</p>
          <p>Built for India&apos;s kirana stores and MSMEs</p>
        </div>
      </footer>
    </div>
  );
}
