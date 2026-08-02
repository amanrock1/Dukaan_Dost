import { db } from './db';
import { llmChat } from './ai-sdk';

export interface BusinessInsight {
  id: string;
  type: 'info' | 'warning' | 'success' | 'danger';
  title: string;
  description: string;
}

export interface Recommendation {
  id: string;
  title: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  suggestedAction: string;
  category: string;
}

export async function getBusinessInsightsAndRecommendations() {
  try {
    const products = await db.product.findMany({
      include: {
        sales: true,
        purchases: true,
      },
    });

    const sales = await db.sale.findMany({
      orderBy: { timestamp: 'desc' },
      include: { product: true },
    });

    const purchases = await db.purchase.findMany({
      orderBy: { timestamp: 'desc' },
      include: { product: true },
    });

    const invoices = await db.invoice.findMany();

    const insights: BusinessInsight[] = [];
    const recommendations: Recommendation[] = [];

    // Helper: Dates
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);

    // --- Compute Sales Metrics ---
    const todaySales = sales.filter(s => new Date(s.timestamp) >= startOfToday);
    const yesterdaySales = sales.filter(s => {
      const ts = new Date(s.timestamp);
      return ts >= startOfYesterday && ts < startOfToday;
    });

    const todayRevenue = todaySales.reduce((sum, s) => sum + s.totalAmount, 0);
    const yesterdayRevenue = yesterdaySales.reduce((sum, s) => sum + s.totalAmount, 0);

    // Trend comparisons
    let revenueGrowth = 0;
    if (yesterdayRevenue > 0) {
      revenueGrowth = Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100);
    } else if (todayRevenue > 0) {
      revenueGrowth = 100;
    }

    // 1. Dynamic Insights
    if (todayRevenue > 0) {
      insights.push({
        id: 'revenue-today',
        type: 'success',
        title: `Today's Revenue is ₹${todayRevenue.toLocaleString('en-IN')}`,
        description: revenueGrowth >= 0 
          ? `Up by ${revenueGrowth}% compared to yesterday.`
          : `Down by ${Math.abs(revenueGrowth)}% compared to yesterday.`,
      });
    }

    // Low stock count
    const lowStockProducts = products.filter(p => p.currentStock <= p.lowStockThreshold);
    if (lowStockProducts.length > 0) {
      insights.push({
        id: 'low-stock-alert',
        type: 'warning',
        title: `${lowStockProducts.length} products need restocking`,
        description: `Items like ${lowStockProducts.slice(0, 2).map(p => p.name).join(', ')} are below their thresholds.`,
      });
    }

    // Slow-moving or dead products
    const slowProducts = products.filter(p => {
      const hasRecentSales = p.sales.some(s => new Date(s.timestamp) >= twentyDaysAgo);
      return !hasRecentSales && p.currentStock > 0;
    });

    slowProducts.slice(0, 2).forEach(p => {
      insights.push({
        id: `slow-${p.id}`,
        type: 'info',
        title: `${p.name} has no recent sales`,
        description: `This product has been idle in stock for over 20 days. Consider running a discount or bundle offer.`,
      });
    });

    // High velocity products (trending up)
    const productSalesVelocities = products.map(p => {
      const recentSales = p.sales.filter(s => new Date(s.timestamp) >= tenDaysAgo);
      const quantitySold = recentSales.reduce((sum, s) => sum + s.quantity, 0);
      const velocity = quantitySold / 10; // average units per day
      return { product: p, velocity, totalSold: quantitySold };
    });

    const trending = productSalesVelocities.filter(v => v.velocity > 0.5);
    trending.slice(0, 2).forEach(t => {
      insights.push({
        id: `trending-${t.product.id}`,
        type: 'success',
        title: `${t.product.name} is trending upwards`,
        description: `Averages ${(t.velocity).toFixed(1)} units sold daily. Ensure supply is stable.`,
      });
    });

    // 2. Recommendations
    productSalesVelocities.forEach(({ product, velocity }) => {
      const isLow = product.currentStock <= product.lowStockThreshold;
      
      let daysUntilStockout = Infinity;
      if (velocity > 0) {
        daysUntilStockout = Math.round(product.currentStock / velocity);
      }

      if (isLow || daysUntilStockout <= 7) {
        const orderQty = Math.max(product.lowStockThreshold * 3, Math.round(velocity * 30));
        recommendations.push({
          id: `reorder-${product.id}`,
          title: `Order ${orderQty} more ${product.name} units`,
          reason: isLow 
            ? `Current stock (${product.currentStock}) is below threshold (${product.lowStockThreshold}).`
            : `Product is selling fast and will run out of stock in approx. ${daysUntilStockout} days.`,
          priority: isLow ? 'high' : 'medium',
          suggestedAction: `Record purchase of ${orderQty} ${product.name}`,
          category: 'Inventory',
        });
      }
    });

    // Reduce inventory recommendation for high stock but zero velocity
    products.forEach(p => {
      const hasRecentSales = p.sales.some(s => new Date(s.timestamp) >= tenDaysAgo);
      const isHighStock = p.currentStock > p.lowStockThreshold * 4;
      if (!hasRecentSales && isHighStock) {
        recommendations.push({
          id: `reduce-${p.id}`,
          title: `Reduce ${p.name} stock level`,
          reason: `High stock level (${p.currentStock}) with zero sales velocity over the last 10 days.`,
          priority: 'low',
          suggestedAction: `Promote ${p.name} with bundle offers or seasonal discounts`,
          category: 'Sales',
        });
      }
    });

    // Billing / Pending Invoice generation
    const uninvoicedSales = sales.filter(s => !invoices.some(inv => inv.saleId === s.id));
    if (uninvoicedSales.length > 0) {
      const oldestSale = uninvoicedSales[uninvoicedSales.length - 1];
      recommendations.push({
        id: 'uninvoiced-sale',
        title: `Generate invoice for sale of ${oldestSale.product.name}`,
        reason: `A sale of ${oldestSale.quantity}x ${oldestSale.product.name} recorded on ${new Date(oldestSale.timestamp).toLocaleDateString('en-IN')} is missing a GST tax invoice.`,
        priority: 'high',
        suggestedAction: `Generate invoice for last sale`,
        category: 'Finance',
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        id: 'rec-default-1',
        title: 'Review supplier purchase rates',
        reason: 'Regular audit of electronics purchase prices helps optimize margins.',
        priority: 'low',
        suggestedAction: 'Check supplier rates',
        category: 'Purchases',
      });
    }

    // --- Generate Real LLM Narrative operational summary ---
    let narrativeSummary = 'DukaanDost is compiling operational metrics... check back shortly.';
    try {
      const totalSalesVal = sales.reduce((sum, s) => sum + s.totalAmount, 0);
      const lowStockNames = lowStockProducts.map(p => p.name).join(', ') || 'None';
      const slowNames = slowProducts.map(p => p.name).join(', ') || 'None';
      
      const prompt = `Analyze this retail store's metrics and write a 3-4 sentence professional business briefing for the store owner.
      Metrics:
      - Total Registered Products: ${products.length}
      - Total Revenue: ₹${totalSalesVal.toLocaleString('en-IN')}
      - Today's Revenue: ₹${todayRevenue.toLocaleString('en-IN')}
      - Low Stock Products: ${lowStockNames}
      - Slow Moving Products (Idle for 20+ days): ${slowNames}
      
      Keep it actionable, practical, and highly focused on what the owner should do next. Avoid generic AI fluff.`;

      const response = await llmChat({
        model: 'groq-llama3.3-70b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      });

      const responseText = typeof response === 'string' ? response : response?.content || '';
      if (responseText.trim().length > 20) {
        narrativeSummary = responseText.trim();
      }
    } catch (llmErr) {
      console.warn('Llama briefing generation failed, using fallback:', llmErr);
      narrativeSummary = `Operations report: Total revenue reached ₹${sales.reduce((sum, s) => sum + s.totalAmount, 0).toLocaleString('en-IN')} across ${products.length} catalog products. Low stock alerts are active for ${lowStockProducts.length} items. Suggest reviewing replenishment recommendations immediately.`;
    }

    return {
      revenueGrowth,
      insights: insights.slice(0, 5),
      recommendations: recommendations.slice(0, 5),
      todayRevenue,
      yesterdayRevenue,
      narrativeSummary,
    };
  } catch (error) {
    console.error('Error in getBusinessInsightsAndRecommendations:', error);
    return {
      revenueGrowth: 0,
      insights: [],
      recommendations: [],
      todayRevenue: 0,
      yesterdayRevenue: 0,
      narrativeSummary: 'Failed to generate operational narrative due to system error.',
    };
  }
}
