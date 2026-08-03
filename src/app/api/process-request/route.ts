import { NextRequest, NextResponse } from 'next/server';
import { classifyIntent } from '@/lib/intentClassifier';
import { extractEntities, findMatchingProduct, mergeContext, ExtractedEntities } from '@/lib/entityExtractor';
import { recordSale, recordPurchase, checkStock } from '@/lib/inventoryEngine';
import { generateInvoice } from '@/lib/invoiceGenerator';
import { logAIAction } from '@/lib/aiLogger';
import { db } from '@/lib/db';

interface ExecutionStep {
  name: string;
  status: 'success' | 'warning' | 'error' | 'pending' | 'running';
  timeMs: number;
  confidence?: number;
  details?: string;
}

interface AgentState {
  name: string;
  status: 'idle' | 'working' | 'completed' | 'error';
  timestamp: string;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const steps: ExecutionStep[] = [];
  const agentActivities: AgentState[] = [
    { name: 'Planner Agent', status: 'idle', timestamp: new Date().toLocaleTimeString() },
    { name: 'Intent Agent', status: 'idle', timestamp: new Date().toLocaleTimeString() },
    { name: 'Inventory Agent', status: 'idle', timestamp: new Date().toLocaleTimeString() },
    { name: 'Invoice Agent', status: 'idle', timestamp: new Date().toLocaleTimeString() },
    { name: 'Analytics Agent', status: 'idle', timestamp: new Date().toLocaleTimeString() },
    { name: 'Recommendation Agent', status: 'idle', timestamp: new Date().toLocaleTimeString() },
  ];

  const updateAgent = (name: string, status: AgentState['status']) => {
    const agent = agentActivities.find(a => a.name === name);
    if (agent) {
      agent.status = status;
      agent.timestamp = new Date().toLocaleTimeString();
    }
  };

  try {
    const { input, source = 'text', context = null, shopId: rawShopId = null } = await request.json();
    // Normalize: empty string "" is treated the same as null (guest/global shop)
    const shopId: string | null = rawShopId && rawShopId.trim() !== '' ? rawShopId : null;

    if (!input || typeof input !== 'string' || input.trim().length === 0) {
      return NextResponse.json({ error: 'Please provide valid input.' }, { status: 400 });
    }

    const trimmed = input.trim();
    const lowerInput = trimmed.toLowerCase();

    // Step 0: Speech Recognition Step (if voice source)
    if (source === 'voice') {
      steps.push({
        name: 'Speech Recognition',
        status: 'success',
        timeMs: 150,
        confidence: 0.98,
        details: `Converted spoken audio into text input: "${trimmed}"`,
      });
    }

    // ── SPECIAL HANDLER: "aaj ki sale / today's sales" ──────────────────────
    const isTodaySalesQuery =
      /aaj|today|is din|kal|yesterday/.test(lowerInput) &&
      /sale|becha|beche|bikri|revenue|kamai/.test(lowerInput);

    if (isTodaySalesQuery) {
      updateAgent('Planner Agent', 'working');
      updateAgent('Inventory Agent', 'working');

      const isYesterday = /kal|yesterday/.test(lowerInput);
      const targetDate = new Date();
      if (isYesterday) targetDate.setDate(targetDate.getDate() - 1);

      const dayStart = new Date(targetDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(targetDate);
      dayEnd.setHours(23, 59, 59, 999);

      const sales = await db.sale.findMany({
        where: {
          shopId: shopId || null,
          timestamp: { gte: dayStart, lte: dayEnd },
        },
        include: { product: { select: { name: true } } },
        orderBy: { timestamp: 'desc' },
      });

      updateAgent('Inventory Agent', 'completed');
      updateAgent('Planner Agent', 'completed');

      steps.push({
        name: 'Intent Classification',
        status: 'success',
        timeMs: 10,
        confidence: 0.98,
        details: `Detected "${isYesterday ? 'yesterday' : 'today'}'s sales" query via keyword match.`,
      });
      steps.push({
        name: 'Database Query',
        status: 'success',
        timeMs: 50,
        details: `Fetched ${sales.length} sales from ${dayStart.toLocaleDateString('en-IN')} for this shop.`,
      });

      if (sales.length === 0) {
        const label = isYesterday ? 'kal' : 'aaj';
        return NextResponse.json({
          response: `${label} koi sale nahi hui is shop mein.`,
          intent: 'check_stock',
          success: true,
          steps,
          agents: agentActivities,
          thinking: { intent: 'today_sales', date: dayStart },
        });
      }

      const totalRevenue = sales.reduce((s, x) => s + x.totalAmount, 0);
      const totalUnits = sales.reduce((s, x) => s + x.quantity, 0);
      const label = isYesterday ? 'Kal' : 'Aaj';

      const lines = sales.map(
        (s, i) =>
          `${i + 1}. ${s.product.name} × ${s.quantity} @ ₹${s.unitPrice} = ₹${s.totalAmount.toFixed(2)}`
      );

      const msg =
        `📊 ${label} ki Sales (${dayStart.toLocaleDateString('en-IN')}):\n\n` +
        lines.join('\n') +
        `\n\n💰 Total Revenue: ₹${totalRevenue.toFixed(2)} | Units Sold: ${totalUnits}`;

      await logAIAction({
        rawInput: trimmed,
        detectedIntent: 'check_stock',
        extractedEntities: { date: dayStart.toISOString() },
        actionTaken: `Today sales query: ${sales.length} transactions`,
        status: 'success',
        metadata: { steps, agentActivities },
      });

      return NextResponse.json({
        response: msg,
        intent: 'check_stock',
        success: true,
        steps,
        agents: agentActivities,
        thinking: { intent: 'today_sales', count: sales.length, total: totalRevenue },
      });
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Step 1: Intent Classification
    const intentStartTime = Date.now();
    updateAgent('Planner Agent', 'working');
    updateAgent('Intent Agent', 'working');

    const classification = await classifyIntent(trimmed);
    const intentTime = Date.now() - intentStartTime;

    steps.push({
      name: 'Intent Classification',
      status: classification.intent === 'unknown' ? 'warning' : 'success',
      timeMs: intentTime,
      confidence: classification.confidence,
      details: `Classified intent as "${classification.intent}". Reasoning: ${classification.reasoning}`,
    });
    updateAgent('Intent Agent', 'completed');

    if (classification.intent === 'unknown') {
      updateAgent('Planner Agent', 'error');
      const actionMetadata = { steps, agentActivities, thinking: { intent: 'unknown', confidence: classification.confidence } };
      await logAIAction({
        rawInput: trimmed,
        detectedIntent: 'unknown',
        extractedEntities: {},
        actionTaken: 'none',
        status: 'error',
        errorMessage: 'Could not determine intent',
        metadata: actionMetadata,
      });

      return NextResponse.json({
        response: `Samajh nahi aaya. Try karo:\n• "10 kurkure behce 20 rupaye each"\n• "50 dairy milk kharidi 15 ruppya each"\n• "kitna stock hai keyboard ka"\n• "invoice banao"`,
        intent: 'unknown',
        entities: null,
        clarificationNeeded: true,
        steps,
        agents: agentActivities,
        thinking: {
          intent: 'unknown',
          confidence: classification.confidence,
          reasoning: classification.reasoning,
        },
      });
    }

    // ── RECORD SALE / PURCHASE ────────────────────────────────────────────────
    if (classification.intent === 'record_sale' || classification.intent === 'record_purchase') {

      // Step 2: Entity Extraction
      const extractStartTime = Date.now();
      updateAgent('Inventory Agent', 'working');

      let entities: ExtractedEntities;
      let isMerged = false;

      if (context && (context.intent === classification.intent || context.intent)) {
        entities = await mergeContext(context.entities, trimmed, context.intent || classification.intent);
        classification.intent = context.intent || classification.intent;
        isMerged = true;
      } else {
        entities = await extractEntities(trimmed, classification.intent);
      }

      const extractTime = Date.now() - extractStartTime;
      steps.push({
        name: 'Entity Extraction',
        status: 'success',
        timeMs: extractTime,
        confidence: isMerged ? 0.95 : 0.9,
        details: `Product=${entities.productName || 'None'}, Qty=${entities.quantity || 'None'}, Price=₹${entities.unitPrice || 'None'}, Client=${entities.customerName || 'None'}, Supplier=${entities.supplier || 'None'}.`,
      });

      // Only ask if product name is completely absent
      if (!entities.productName) {
        return NextResponse.json({
          response: 'Konsa product? (e.g. "20 kurkure behce 10 ruppya each")',
          intent: classification.intent,
          entities,
          clarificationNeeded: true,
          pendingContext: { intent: classification.intent, entities },
          steps,
          agents: agentActivities,
          thinking: { intent: classification.intent, confidence: classification.confidence, entities },
        });
      }

      // Smart defaults — never block execution
      if (!entities.quantity) entities.quantity = 1;

      // Step 3: Product Matching — auto-create if not found
      const valStartTime = Date.now();
      let matchedProduct = await findMatchingProduct(entities.productName, shopId);
      const valTime = Date.now() - valStartTime;

      if (!matchedProduct) {
        const prodName = entities.productName;
        const capitalizedName = prodName.charAt(0).toUpperCase() + prodName.slice(1);

        let guessedCategory = 'Groceries';
        if (/headphone|earphone|bud|laptop|mouse|keyboard|monitor|phone|usb|printer|cable|electronic/i.test(prodName)) {
          guessedCategory = 'Electronics';
        } else if (/tablet|syrup|paracetamol|medicine|gel|cream/i.test(prodName)) {
          guessedCategory = 'Pharmacy';
        } else if (/notebook|pen|paper|pencil|file|folder/i.test(prodName)) {
          guessedCategory = 'Stationery';
        } else if (/shoe|boot|sandal|sneaker/i.test(prodName)) {
          guessedCategory = 'Footwear';
        }
        const guessedGst = guessedCategory === 'Stationery' ? 5 : guessedCategory === 'Pharmacy' ? 12 : 18;
        const qty = entities.quantity || 1;
        const price = entities.unitPrice || 20;

        matchedProduct = await db.product.create({
          data: {
            name: capitalizedName,
            category: guessedCategory,
            unit: 'pcs',
            unitPrice: Number(price),
            gstRate: Number(guessedGst),
            lowStockThreshold: 5,
            currentStock: classification.intent === 'record_sale' ? qty + 50 : qty,
            shopId: shopId || null,
          }
        });

        steps.push({
          name: 'Inventory Validation',
          status: 'success',
          timeMs: valTime,
          details: `"${capitalizedName}" auto-registered in catalog (Category: ${guessedCategory}, GST: ${guessedGst}%).`,
        });
      } else {
        steps.push({
          name: 'Inventory Validation',
          status: 'success',
          timeMs: valTime,
          details: `Matched "${entities.productName}" → "${matchedProduct.name}". Stock: ${matchedProduct.currentStock} units.`,
        });
      }

      // Use catalog price if user didn't provide one
      const unitPrice = entities.unitPrice && entities.unitPrice > 0 ? entities.unitPrice : matchedProduct.unitPrice;
      const quantity = entities.quantity || 1;

      // Step 4: Business Rule and GST
      const bizStartTime = Date.now();
      const amount = quantity * unitPrice;
      const gstAmount = Math.round(amount * (matchedProduct.gstRate / 100) * 100) / 100;
      const totalAmount = Math.round((amount + gstAmount) * 100) / 100;
      const bizTime = Date.now() - bizStartTime;

      if (classification.intent === 'record_sale' && matchedProduct.currentStock < quantity) {
        updateAgent('Inventory Agent', 'error');
        updateAgent('Planner Agent', 'error');
        steps.push({ name: 'Business Rule Validation', status: 'error', timeMs: bizTime, details: `Insufficient stock: ${matchedProduct.currentStock} available, ${quantity} requested.` });
        await logAIAction({ rawInput: trimmed, detectedIntent: classification.intent, extractedEntities: { ...entities, matchedProduct: matchedProduct.name }, actionTaken: 'failed_stock_validation', status: 'error', errorMessage: 'Insufficient stock', metadata: { steps, agentActivities } });
        return NextResponse.json({
          response: `Stock kam hai! ${matchedProduct.name} mein sirf ${matchedProduct.currentStock} units hain, aapne ${quantity} maange.`,
          intent: classification.intent,
          success: false,
          steps,
          agents: agentActivities,
          thinking: { intent: classification.intent, confidence: classification.confidence, entities },
        });
      }

      steps.push({
        name: 'Business Rule Validation',
        status: 'success',
        timeMs: bizTime,
        details: `GST ${matchedProduct.gstRate}%: Base=₹${amount.toLocaleString('en-IN')}, GST=₹${gstAmount.toLocaleString('en-IN')}, Total=₹${totalAmount.toLocaleString('en-IN')}.`,
      });

      // Step 5: Database Update
      const dbStartTime = Date.now();
      let result;
      if (classification.intent === 'record_sale') {
        result = await recordSale(matchedProduct.id, quantity, unitPrice, entities.customerName, shopId);
        if (result.success && result.saleId) {
          await db.sale.update({ where: { id: result.saleId }, data: { rawInput: trimmed, source } });
        }
      } else {
        result = await recordPurchase(matchedProduct.id, quantity, unitPrice, entities.supplier, shopId);
        if (result.success && result.purchaseId) {
          await db.purchase.update({ where: { id: result.purchaseId }, data: { rawInput: trimmed, source } });
        }
      }
      const dbTime = Date.now() - dbStartTime;

      steps.push({
        name: 'Database Update',
        status: result.success ? 'success' : 'error',
        timeMs: dbTime,
        details: result.success
          ? `Prisma committed. Stock: ${matchedProduct.currentStock} → ${result.stockAfter} units.`
          : `DB error: ${result.message}`,
      });

      updateAgent('Inventory Agent', 'completed');
      updateAgent('Analytics Agent', 'working');
      updateAgent('Recommendation Agent', 'working');

      const lowStockAlert = result.stockAfter !== undefined && result.stockAfter <= matchedProduct.lowStockThreshold;
      steps.push({
        name: 'Recommendation Update',
        status: 'success',
        timeMs: 5,
        details: lowStockAlert ? `Low stock alert for ${matchedProduct.name}!` : `Inventory stable.`,
      });

      updateAgent('Analytics Agent', 'completed');
      updateAgent('Recommendation Agent', 'completed');
      updateAgent('Planner Agent', 'completed');

      await logAIAction({
        rawInput: trimmed,
        detectedIntent: classification.intent,
        extractedEntities: { ...entities, matchedProduct: matchedProduct.name },
        actionTaken: result.message,
        status: result.success ? 'success' : 'error',
        errorMessage: result.success ? undefined : result.message,
        metadata: { steps, agentActivities },
      });

      // Auto-generate invoice for every successful sale
      let autoInvoiceMsg = '';
      let invoiceGenerated = false;
      if (classification.intent === 'record_sale' && result.success && result.saleId) {
        try {
          const invResult = await generateInvoice(result.saleId);
          if (invResult.success) {
            invoiceGenerated = true;
            autoInvoiceMsg = `\n🧾 GST Invoice auto-generated! Check Invoices tab.`;
            steps.push({
              name: 'Invoice Generation',
              status: 'success',
              timeMs: 0,
              details: `GST Invoice auto-generated for ${matchedProduct.name} sale.`,
            });
            updateAgent('Invoice Agent', 'completed');
          }
        } catch { /* non-blocking */ }
      }

      return NextResponse.json({
        response: result.message + autoInvoiceMsg,
        intent: classification.intent,
        entities: { ...entities, matchedProduct: matchedProduct.name, unitPrice, quantity },
        success: result.success,
        saleId: result.saleId,
        purchaseId: result.purchaseId,
        lowStockAlert: result.lowStockAlert,
        invoiceGenerated,
        steps,
        agents: agentActivities,
        thinking: {
          intent: classification.intent,
          confidence: classification.confidence,
          entities: { ...entities, matchedProduct: matchedProduct.name },
          stockBefore: matchedProduct.currentStock,
          stockAfter: result.stockAfter,
          reasoning: `Recorded ${classification.intent === 'record_sale' ? 'sale' : 'purchase'} for ${matchedProduct.name}.`,
        },
      });
    }


    // ── CHECK STOCK ───────────────────────────────────────────────────────────
    if (classification.intent === 'check_stock') {
      const extractStartTime = Date.now();
      const entities = await extractEntities(trimmed, 'check_stock');
      const extractTime = Date.now() - extractStartTime;

      steps.push({
        name: 'Entity Extraction',
        status: 'success',
        timeMs: extractTime,
        details: `Target product: "${entities.productName || 'All Products'}"`,
      });

      const checkStartTime = Date.now();
      const result = await checkStock(entities.productName || undefined, shopId);
      const checkTime = Date.now() - checkStartTime;

      steps.push({
        name: 'Inventory Validation',
        status: result.success ? 'success' : 'error',
        timeMs: checkTime,
        details: `Catalog queried. Status: ${result.success ? 'Found' : 'Not found'}.`,
      });

      updateAgent('Inventory Agent', 'completed');
      updateAgent('Planner Agent', 'completed');

      await logAIAction({
        rawInput: trimmed,
        detectedIntent: 'check_stock',
        extractedEntities: entities as unknown as Record<string, unknown>,
        actionTaken: result.message.substring(0, 100),
        status: result.success ? 'success' : 'error',
        metadata: { steps, agentActivities },
      });

      return NextResponse.json({
        response: result.message,
        intent: 'check_stock',
        entities,
        success: result.success,
        steps,
        agents: agentActivities,
        thinking: { intent: 'check_stock', confidence: classification.confidence, entities },
      });
    }

    // ── GENERATE INVOICE ──────────────────────────────────────────────────────
    if (classification.intent === 'generate_invoice') {
      updateAgent('Invoice Agent', 'working');

      const dbStartTime = Date.now();

      // Try un-invoiced sale first; fallback to most recent sale (re-use existing invoice)
      let lastSale = await db.sale.findFirst({
        where: { invoice: null, shopId: shopId || null },
        orderBy: { timestamp: 'desc' },
        include: { product: true, invoice: true },
      });

      let alreadyHasInvoice = false;
      if (!lastSale) {
        // No un-invoiced sale — fetch most recent sale regardless
        lastSale = await db.sale.findFirst({
          where: { shopId: shopId || null },
          orderBy: { timestamp: 'desc' },
          include: { product: true, invoice: true },
        });
        alreadyHasInvoice = !!(lastSale?.invoice);
      }

      const dbTime = Date.now() - dbStartTime;

      steps.push({
        name: 'Inventory Validation',
        status: lastSale ? 'success' : 'warning',
        timeMs: dbTime,
        details: lastSale
          ? `Sale found: ${lastSale.product.name}, ₹${lastSale.totalAmount.toLocaleString('en-IN')}.${alreadyHasInvoice ? ' (existing invoice)' : ''}`
          : `No sales found.`,
      });

      if (!lastSale) {
        updateAgent('Invoice Agent', 'error');
        updateAgent('Planner Agent', 'error');
        await logAIAction({ rawInput: trimmed, detectedIntent: 'generate_invoice', extractedEntities: {}, actionTaken: 'no_sale_found', status: 'error', errorMessage: 'No sale found', metadata: { steps, agentActivities } });
        return NextResponse.json({
          response: 'Koi sale nahi mili. Pehle kuch becho, phir invoice banega! 🛒',
          intent: 'generate_invoice',
          success: false,
          steps,
          agents: agentActivities,
          thinking: { intent: 'generate_invoice', confidence: classification.confidence },
        });
      }

      // If invoice already exists for this sale, return it directly
      if (alreadyHasInvoice && lastSale.invoice) {
        updateAgent('Invoice Agent', 'completed');
        updateAgent('Planner Agent', 'completed');
        return NextResponse.json({
          response: `✅ Invoice already exists for last sale: ${lastSale.product.name} — ${lastSale.invoice.invoiceNumber}. Check GST Invoices tab!`,
          intent: 'generate_invoice',
          success: true,
          invoiceGenerated: true,
          steps,
          agents: agentActivities,
          thinking: { intent: 'generate_invoice', confidence: classification.confidence, saleId: lastSale.id },
        });
      }


      const invStartTime = Date.now();
      const invResult = await generateInvoice(lastSale.id);
      const invTime = Date.now() - invStartTime;

      steps.push({
        name: 'Invoice Generation',
        status: invResult.success ? 'success' : 'error',
        timeMs: invTime,
        details: invResult.success ? `PDF ready. GST CGST/SGST registered.` : `Error: ${invResult.message}`,
      });

      updateAgent('Invoice Agent', 'completed');
      updateAgent('Planner Agent', 'completed');

      await logAIAction({
        rawInput: trimmed,
        detectedIntent: 'generate_invoice',
        extractedEntities: { saleId: lastSale.id, product: lastSale.product.name },
        actionTaken: invResult.message,
        status: invResult.success ? 'success' : 'error',
        metadata: { steps, agentActivities },
      });

      return NextResponse.json({
        response: invResult.message,
        intent: 'generate_invoice',
        success: invResult.success,
        invoiceGenerated: invResult.success,
        steps,
        agents: agentActivities,
        thinking: { intent: 'generate_invoice', confidence: classification.confidence, saleId: lastSale.id },
      });
    }

    // ── UNDO / REVERT ACTION ──────────────────────────────────────────────────
    if (classification.intent === 'undo') {
      updateAgent('Inventory Agent', 'working');
      const undoRes = await fetch(new URL('/api/undo', request.url).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId }),
      });
      const undoData = await undoRes.json();
      updateAgent('Inventory Agent', 'completed');
      updateAgent('Planner Agent', 'completed');

      steps.push({
        name: 'Database Update',
        status: undoData.success ? 'success' : 'error',
        timeMs: 20,
        details: undoData.message || 'Undo executed',
      });

      return NextResponse.json({
        response: undoData.message || 'Undo executed',
        intent: 'undo',
        success: undoData.success,
        steps,
        agents: agentActivities,
        thinking: { intent: 'undo', confidence: classification.confidence },
      });
    }

    return NextResponse.json({ response: 'Unhandled intent.', intent: classification.intent });


  } catch (error: unknown) {
    updateAgent('Planner Agent', 'error');
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Process request error:', msg);
    return NextResponse.json({ error: `Server error: ${msg}` }, { status: 500 });
  }
}
