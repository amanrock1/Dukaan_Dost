'use client';

import { useState, useCallback, useEffect } from 'react';
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
import LoginScreen from '@/components/dashboard/LoginScreen';
import { toast } from 'sonner';
import {
  Package, ShoppingCart, ArrowDownToLine, FileText, Brain, Sparkles, LineChart,
  MessageSquare, Cpu, Store, ChevronDown, Plus, LogOut, RotateCcw, Trash2, RefreshCw
} from 'lucide-react';


export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');
  const [lastResponse, setLastResponse] = useState<any>(null);
  const [pendingContext, setPendingContext] = useState<any>(null);
  const [isProductSheetOpen, setIsProductSheetOpen] = useState(false);
  const [suggestedProductData, setSuggestedProductData] = useState<any>(null);

  // Toggle this to false to re-enable credentials login
  const BYPASS_LOGIN = true;

  // Auth States
  const [session, setSession] = useState<{ user: { id: string; username: string; name: string | null }; shops: any[] } | null>(
    BYPASS_LOGIN 
      ? {
          user: { id: "guest-user", username: "guest", name: "Guest Reviewer" },
          shops: [
            { id: null, name: "Raj General Store (Guest)" },
            { id: "demo-shop-1", name: "Sharma Electronics (Demo)" }
          ]
        }
      : null
  );
  const [activeShop, setActiveShop] = useState<any | null>(
    BYPASS_LOGIN 
      ? { id: null, name: "Raj General Store (Guest)" }
      : null
  );
  const [shopDropdownOpen, setShopDropdownOpen] = useState(false);

  useEffect(() => {
    if (BYPASS_LOGIN) {
      // Always fetch shops from DB so they appear on any device
      fetch('/api/auth/shops?userId=guest-user')
        .then(r => r.json())
        .then(({ shops: dbShops = [] }) => {
          const defaultShops = [
            { id: null, name: 'Raj General Store (Guest)' },
          ];
          // Merge: DB shops + default guest shop (deduplicate by id)
          const allShops = [
            ...defaultShops,
            ...dbShops.filter((s: any) => s.id !== null),
          ];
          const mergedSession = {
            user: { id: 'guest-user', username: 'guest', name: 'Guest Reviewer' },
            shops: allShops,
          };
          setSession(mergedSession);

          // Restore active shop from localStorage if still valid, else use first
          const savedActive = localStorage.getItem('dukaandost_active_shop');
          if (savedActive) {
            try {
              const parsed = JSON.parse(savedActive);
              // Check if this shop still exists in our list
              const stillValid = allShops.find((s: any) => s.id === parsed.id);
              if (stillValid) {
                setActiveShop(parsed);
                return;
              }
            } catch { /* fallthrough */ }
          }
          setActiveShop(allShops[0]);
        })
        .catch(() => { /* use defaults already set in useState */ });
      return;
    }

    const savedSession = localStorage.getItem('dukaandost_session');
    const savedShop = localStorage.getItem('dukaandost_active_shop');
    if (savedSession) {
      const parsedSession = JSON.parse(savedSession);
      setSession(parsedSession);
      if (savedShop) {
        setActiveShop(JSON.parse(savedShop));
      } else if (parsedSession.shops && parsedSession.shops.length > 0) {
        setActiveShop(parsedSession.shops[0]);
        localStorage.setItem('dukaandost_active_shop', JSON.stringify(parsedSession.shops[0]));
      }
    }
  }, []);


  const handleLoginSuccess = (data: any) => {
    localStorage.setItem('dukaandost_session', JSON.stringify(data));
    setSession(data);
    if (data.shops && data.shops.length > 0) {
      setActiveShop(data.shops[0]);
      localStorage.setItem('dukaandost_active_shop', JSON.stringify(data.shops[0]));
    }
    toast.success('Logged in successfully!');
  };

  const handleLogout = () => {
    if (BYPASS_LOGIN) {
      localStorage.removeItem('dukaandost_active_shop');
      localStorage.removeItem('dukaandost_session');
      toast.success('Resetting guest workspace...');
      setTimeout(() => {
        window.location.reload();
      }, 800);
      return;
    }
    localStorage.removeItem('dukaandost_session');
    localStorage.removeItem('dukaandost_active_shop');
    setSession(null);
    setActiveShop(null);
    toast.success('Logged out successfully.');
  };

  // Helper to build shopId query param — never send empty string
  const shopQS = activeShop?.id ? `shopId=${activeShop.id}` : '';

  // Data fetching
  const { data: inventoryData } = useQuery({
    queryKey: ['inventory', activeShop?.id ?? 'null'],
    queryFn: () => fetch(`/api/inventory${shopQS ? '?' + shopQS : ''}`).then(r => r.json()),
    enabled: !!activeShop,
  });
  const { data: salesData } = useQuery({
    queryKey: ['sales', activeShop?.id ?? 'null'],
    queryFn: () => fetch(`/api/sales${shopQS ? '?' + shopQS : ''}`).then(r => r.json()),
    enabled: !!activeShop,
  });
  const { data: purchasesData } = useQuery({
    queryKey: ['purchases', activeShop?.id ?? 'null'],
    queryFn: () => fetch(`/api/purchases${shopQS ? '?' + shopQS : ''}`).then(r => r.json()),
    enabled: !!activeShop,
  });
  const { data: invoicesData } = useQuery({
    queryKey: ['invoices', activeShop?.id ?? 'null'],
    queryFn: () => fetch(`/api/invoices${shopQS ? '?' + shopQS : ''}`).then(r => r.json()),
    enabled: !!activeShop,
  });
  const { data: logsData } = useQuery({
    queryKey: ['ai-logs'],
    queryFn: () => fetch('/api/ai-logs').then(r => r.json()),
  });
  const { data: insightsData, isLoading: isInsightsLoading } = useQuery({
    queryKey: ['business-insights', activeShop?.id ?? 'null'],
    queryFn: () => fetch(`/api/business-insights${shopQS ? '?' + shopQS : ''}`).then(r => r.json()),
    enabled: !!activeShop,
  });

  const refreshAll = useCallback(() => {
    const shopKey = activeShop?.id ?? 'null';
    queryClient.invalidateQueries({ queryKey: ['inventory', shopKey] });
    queryClient.invalidateQueries({ queryKey: ['sales', shopKey] });
    queryClient.invalidateQueries({ queryKey: ['purchases', shopKey] });
    queryClient.invalidateQueries({ queryKey: ['invoices', shopKey] });
    queryClient.invalidateQueries({ queryKey: ['ai-logs'] });
    queryClient.invalidateQueries({ queryKey: ['business-insights', shopKey] });
  }, [queryClient, activeShop]);

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
      // Clear stale context for invoice/stock queries — they never need prior sale context
      const lower = inputText.toLowerCase();
      const isNewIntent = /invoice|bill|receipt|stock|kitne|check/.test(lower);
      const contextToSend = isNewIntent ? null : pendingContext;

      const res = await fetch('/api/process-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: inputText, source, context: contextToSend, shopId: activeShop?.id }),
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

      if (data.clarificationNeeded && data.pendingContext) {
        // Only set pending context if it's a product-name question
        setPendingContext(data.pendingContext);
        toast.warning('Konsa product? Batao phir try karo.');
      } else {
        setPendingContext(null); // always clear
        if (data.lowStockAlert) toast.warning('⚠️ Low stock! Check Inventory tab.');
        if (data.invoiceGenerated) toast.success('🧾 GST Invoice generated! Check Invoices tab.');
        if (data.saleId || data.purchaseId) toast.success('✅ Transaction recorded successfully.');
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
  }, [pendingContext, refreshAll, activeShop]);

  const handleApplyRecommendation = useCallback((actionText: string) => {
    setInput(actionText);
    handleSubmit(actionText, 'text');
  }, [handleSubmit]);

  const handleUndo = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId: activeShop?.id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setLastResponse({
          response: data.message,
          intent: 'undo',
          success: true,
          steps: [
            { name: 'Undo Command Execution', status: 'success', timeMs: 15, details: data.message },
          ],
        });
        refreshAll();
      } else {
        toast.error(data.message || data.error || 'Nothing to undo.');
      }
    } catch (err) {
      toast.error('Network error during undo.');
    } finally {
      setIsLoading(false);
    }
  }, [activeShop, refreshAll]);

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
    { label: '⌘5 Undo Action ↩️', value: 'undo' },
  ];

  if (!session) {
    return <LoginScreen onSuccess={handleLoginSuccess} />;
  }


  const handleResetShop = async (targetShop?: any) => {
    const shopToReset = targetShop || activeShop;
    const name = shopToReset?.name || 'Current Shop';
    if (!confirm(`Are you sure you want to reset all transaction data (sales, purchases, invoices) for "${name}"? Stock levels will be restored to 10.`)) {
      return;
    }

    try {
      const res = await fetch('/api/auth/reset-shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId: shopToReset?.id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        refreshAll();
      } else {
        toast.error(data.error || 'Failed to reset shop.');
      }
    } catch (err) {
      toast.error('Network error resetting shop.');
    }
  };

  const handleDeleteShop = async (targetShop: any) => {
    if (!targetShop) return;
    const isGuestDefault = !targetShop.id;
    const name = targetShop.name || 'Workspace';

    const confirmMsg = isGuestDefault
      ? `Clear all transaction & product data for default guest workspace "${name}"?`
      : `Are you sure you want to PERMANENTLY DELETE shop "${name}" and all its inventory, sales, & invoices?`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch('/api/auth/delete-shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId: targetShop.id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        
        if (session && targetShop.id) {
          const updatedShops = session.shops.filter((s: any) => s.id !== targetShop.id);
          const updatedSession = { ...session, shops: updatedShops };
          setSession(updatedSession);
          localStorage.setItem('dukaandost_session', JSON.stringify(updatedSession));
          
          if (activeShop?.id === targetShop.id) {
            const nextActive = updatedShops[0] || { id: null, name: 'Raj General Store (Guest)' };
            setActiveShop(nextActive);
            localStorage.setItem('dukaandost_active_shop', JSON.stringify(nextActive));
          }
        }
        refreshAll();
      } else {
        toast.error(data.error || 'Failed to delete shop.');
      }
    } catch (err) {
      toast.error('Network error deleting shop.');
    }
  };

  const handleCreateShop = async () => {

    const sName = prompt('Enter the name of your new shop:');
    if (!sName || !sName.trim()) return;

    try {
      const res = await fetch('/api/auth/create-shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: sName, ownerId: session.user.id }),
      });
      const data = await res.json();
      if (data.success && data.shop) {
        const updatedShops = [...session.shops, data.shop];
        const updatedSession = { ...session, shops: updatedShops };
        localStorage.setItem('dukaandost_session', JSON.stringify(updatedSession));
        setSession(updatedSession);
        setActiveShop(data.shop);
        localStorage.setItem('dukaandost_active_shop', JSON.stringify(data.shop));
        toast.success(`Created shop "${sName}"!`);
      } else {
        toast.error(data.error || 'Failed to create shop.');
      }
    } catch (err) {
      toast.error('Network error creating shop.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-zinc-100 font-[family-name:var(--font-plus-jakarta)] selection:bg-emerald-500/30 selection:text-emerald-300">
      
      {/* ── Linear-Style Store Workspace Header ── */}
      <header className="bg-[#121215] border-b border-zinc-800/80 sticky top-0 z-50 shadow-md">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between">
          
          {/* Store switcher */}
          <div className="flex items-center gap-3 relative">
            <div 
              onClick={() => setShopDropdownOpen(!shopDropdownOpen)}
              className="flex items-center gap-2 cursor-pointer hover:bg-zinc-800/60 p-1.5 rounded-lg transition-colors border border-zinc-800"
            >
              <div className="w-6 h-6 rounded-md bg-emerald-600 flex items-center justify-center text-white font-bold text-xs uppercase">
                {(activeShop?.name || 'D')[0]}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-white">{activeShop?.name || 'My Shop'}</span>
                <span className="text-[10px] text-zinc-500 font-mono">Workspace</span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
              </div>
            </div>

            {shopDropdownOpen && (
              <div className="absolute top-11 left-0 w-64 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-1.5 z-50 space-y-1 font-sans">
                <div className="px-2 py-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex justify-between items-center">
                  <span>Switch Workspace</span>
                  <span className="text-[9px] text-zinc-600">Reset / Delete</span>
                </div>
                {session.shops.map((s: any) => (
                  <div
                    key={s.id ?? 'guest'}
                    className={`w-full px-2.5 py-1.5 text-xs rounded-lg transition-colors flex items-center justify-between group ${
                      activeShop?.id === s.id 
                        ? 'bg-emerald-950/40 text-emerald-400 font-semibold' 
                        : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                    }`}
                  >
                    <button
                      onClick={() => {
                        setActiveShop(s);
                        localStorage.setItem('dukaandost_active_shop', JSON.stringify(s));
                        setShopDropdownOpen(false);
                        toast.success(`Switched to ${s.name}`);
                      }}
                      className="flex-1 text-left flex items-center gap-1.5 truncate cursor-pointer"
                    >
                      <span className="truncate">{s.name}</span>
                      {activeShop?.id === s.id && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
                    </button>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResetShop(s);
                        }}
                        className="p-1 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded transition-colors"
                        title={`Reset transaction data for ${s.name}`}
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteShop(s);
                        }}
                        className="p-1 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded transition-colors"
                        title={`Delete shop ${s.name}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="border-t border-zinc-900 my-1" />
                <button
                  onClick={() => {
                    setShopDropdownOpen(false);
                    handleCreateShop();
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-emerald-400 hover:bg-zinc-900 rounded-lg transition-colors font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create new shop</span>
                </button>
              </div>
            )}


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
                setSuggestedProductData(null);
                setIsProductSheetOpen(true);
              }}
              className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold transition-colors shadow-sm border border-zinc-800 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-zinc-400" />
              <span>Add Product</span>
            </button>

            <button
              onClick={() => {
                setInput('sold 1 Wireless Keyboard for 1500');
              }}
              className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Sale</span>
            </button>

            <button
              onClick={handleLogout}
              className={`p-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-900 transition-colors cursor-pointer ${
                BYPASS_LOGIN ? 'text-zinc-400 hover:text-emerald-400' : 'text-zinc-400 hover:text-red-400'
              }`}
              title={BYPASS_LOGIN ? "Reset Guest Workspace" : "Sign Out"}
            >
              {BYPASS_LOGIN ? <RotateCcw className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
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
          <ResponsePanel lastResponse={lastResponse} isLoading={isLoading} onUndo={handleUndo} />
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
          <div className="w-full overflow-x-auto pb-1 no-scrollbar">
            <TabsList className="bg-[#121215] border border-zinc-800/80 min-w-max w-full justify-start rounded-xl h-auto p-1 gap-1 shadow-md flex-nowrap sm:flex-wrap">
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
                  className="gap-2 text-xs font-semibold data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 hover:text-zinc-200 cursor-pointer rounded-lg px-3 py-1.5 transition-all whitespace-nowrap"
                >
                  <Icon className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{label}</span>
                  {count !== undefined && (
                    <span className="text-[10px] bg-zinc-900 border border-zinc-700/60 text-zinc-400 font-mono px-1.5 py-0.2 rounded-full">
                      {count}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="inventory" className="mt-0">
            <InventoryTab
              products={products}
              lowStockCount={lowStockCount}
              onRefresh={refreshAll}
              onOpenAddProduct={() => {
                setSuggestedProductData(null);
                setIsProductSheetOpen(true);
              }}
            />
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
        shopId={activeShop?.id}
      />
    </div>
  );
}
