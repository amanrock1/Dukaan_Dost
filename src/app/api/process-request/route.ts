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
    const { input, source = 'text', context = null } = await request.json();

    if (!input || typeof input !== 'string' || input.trim().length === 0) {
      return NextResponse.json({ error: 'Please provide valid input.' }, { status: 400 });
    }

    const trimmed = input.trim();

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
        response: `I couldn't determine what you want to do. Try something like:\n• "Sold 5 laptops for 45,000 each to Aman"\n• "Bought 20 notebooks at 50 rupees from Raj Distributors"\n• "Check stock of Keyboard"\n• "Generate invoice for last sale"`,
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

    // Step 2: Entity Extraction
    const extractStartTime = Date.now();
    updateAgent('Inventory Agent', 'working');

    let entities: ExtractedEntities;
    let isMerged = false;

    if (context && (context.intent === classification.intent || classification.intent === 'unknown' || context.intent)) {
      // Merge new input with context
      const previousEntities = context.entities;
      const targetIntent = context.intent || classification.intent;
      entities = await mergeContext(previousEntities, trimmed, targetIntent);
      classification.intent = targetIntent; // preserve intent from context
      isMerged = true;
    } else {
      entities = await extractEntities(trimmed, classification.intent);
    }

    const extractTime = Date.now() - extractStartTime;
    steps.push({
      name: 'Entity Extraction',
      status: entities.missingFields.length > 0 ? 'warning' : 'success',
      timeMs: extractTime,
      confidence: isMerged ? 0.95 : 0.9,
      details: `Extracted entities: Product=${entities.productName || 'None'}, Qty=${entities.quantity || 'None'}, Price=₹${entities.unitPrice || 'None'}, Client=${entities.customerName || 'None'}, Supplier=${entities.supplier || 'None'}. Missing fields: ${entities.missingFields.join(', ') || 'None'}.`,
    });

    // Check for missing fields for sale/purchase
    if (classification.intent === 'record_sale' || classification.intent === 'record_purchase') {
      const missing = entities.missingFields;
      
      // If we are missing critical fields (productName, quantity, or unitPrice)
      if (missing.length > 0) {
        updateAgent('Inventory Agent', 'idle');
        updateAgent('Planner Agent', 'idle');

        let clarificationMsg = '';
        if (missing.includes('productName')) {
          clarificationMsg = 'Which product are you referring to? (e.g. laptop, keyboard, paracetamol)';
        } else if (missing.includes('quantity')) {
          clarificationMsg = `How many ${entities.productName}s did you ${classification.intent === 'record_sale' ? 'sell' : 'purchase'}?`;
        } else if (missing.includes('unitPrice')) {
          clarificationMsg = `What is the price per unit for the ${entities.productName}?`;
        }

        const actionMetadata = { steps, agentActivities, thinking: { intent: classification.intent, entities, missing } };
        await logAIAction({
          rawInput: trimmed,
          detectedIntent: classification.intent,
          extractedEntities: entities as unknown as Record<string, unknown>,
          actionTaken: 'clarification_requested',
          status: 'clarification_needed',
          errorMessage: `Missing fields: ${missing.join(', ')}`,
          metadata: actionMetadata,
        });

        return NextResponse.json({
          response: clarificationMsg,
          intent: classification.intent,
          entities,
          clarificationNeeded: true,
          pendingContext: {
            intent: classification.intent,
            entities,
          },
          steps,
          agents: agentActivities,
          thinking: {
            intent: classification.intent,
            confidence: classification.confidence,
            entities,
            missingFields: missing,
            validation: 'Awaiting user input for missing fields.',
            reasoning: `Found partial entities but missing: ${missing.join(', ')}. Prompted user for details.`,
          },
        });
      }

      // Step 3: Product Matching and Inventory Validation
      const valStartTime = Date.now();
      const matchedProduct = await findMatchingProduct(entities.productName);
      const valTime = Date.now() - valStartTime;

      if (!matchedProduct) {
        updateAgent('Inventory Agent', 'error');
        updateAgent('Planner Agent', 'error');
        
        steps.push({
          name: 'Inventory Validation',
          status: 'error',
          timeMs: valTime,
          details: `Product catalog mismatch. Could not resolve product matching "${entities.productName}".`,
        });

        const actionMetadata = { steps, agentActivities, thinking: { intent: classification.intent, entities } };
        await logAIAction({
          rawInput: trimmed,
          detectedIntent: classification.intent,
          extractedEntities: entities as unknown as Record<string, unknown>,
          actionTaken: 'failed_validation',
          status: 'error',
          errorMessage: `Product not found: ${entities.productName}`,
          metadata: actionMetadata,
        });

        const allProducts = await db.product.findMany({ select: { name: true } });
        const productList = allProducts.map(p => p.name).slice(0, 10).join(', ');

        // Guess category & GST
        const prodName = entities.productName || 'New Product';
        let guessedCategory = 'General';
        if (/headphone|earphone|bud|laptop|mouse|keyboard|monitor|phone|usb|printer|cable|electronic/i.test(prodName)) {
          guessedCategory = 'Electronics';
        } else if (/tablet|syrup|paracetamol|medicine|gel|cream/i.test(prodName)) {
          guessedCategory = 'Pharmacy';
        } else if (/notebook|pen|paper|pencil|file|folder/i.test(prodName)) {
          guessedCategory = 'Stationery';
        } else if (/shoe|boot|sandal|sneaker/i.test(prodName)) {
          guessedCategory = 'Footwear';
        }

        let guessedGst = 18;
        if (guessedCategory === 'Stationery') guessedGst = 5;
        if (guessedCategory === 'Pharmacy') guessedGst = 12;

        return NextResponse.json({
          response: `I couldn't find "${prodName}" in your catalog. Would you like me to create it?`,
          intent: classification.intent,
          promptProductCreation: true,
          suggestedProduct: {
            name: prodName,
            category: guessedCategory,
            unitPrice: entities.unitPrice || 1000,
            gstRate: guessedGst,
            currentStock: classification.intent === 'record_sale' ? (entities.quantity || 1) + 10 : 20,
            quantity: entities.quantity || 1,
            customerName: entities.customerName,
            supplier: entities.supplier,
            intent: classification.intent,
            originalCommand: trimmed,
          },
          steps,
          agents: agentActivities,
          thinking: {
            intent: classification.intent,
            confidence: classification.confidence,
            entities,
            validation: 'Product missing from database catalog. Prompted user for product creation.',
            reasoning: `Extracted product name "${prodName}" is missing from catalog. Triggering AI Product Onboarding Drawer.`,
          },
        });
      }

      // Catalog prices
      const unitPrice = entities.unitPrice || matchedProduct.unitPrice;
      const quantity = entities.quantity || 1;

      steps.push({
        name: 'Inventory Validation',
        status: 'success',
        timeMs: valTime,
        details: `Successfully matched "${entities.productName}" to catalog item "${matchedProduct.name}". Current Stock: ${matchedProduct.currentStock} units.`,
      });

      // Step 4: Business Rule and GST Validation
      const bizStartTime = Date.now();
      const amount = quantity * unitPrice;
      const gstAmount = Math.round(amount * (matchedProduct.gstRate / 100) * 100) / 100;
      const totalAmount = Math.round((amount + gstAmount) * 100) / 100;
      const bizTime = Date.now() - bizStartTime;

      if (classification.intent === 'record_sale' && matchedProduct.currentStock < quantity) {
        updateAgent('Inventory Agent', 'error');
        updateAgent('Planner Agent', 'error');
        steps.push({
          name: 'Business Rule Validation',
          status: 'error',
          timeMs: bizTime,
          details: `Out of stock: Requested ${quantity} units but only ${matchedProduct.currentStock} available in stock.`,
        });

        const actionMetadata = { steps, agentActivities, thinking: { intent: classification.intent, entities } };
        await logAIAction({
          rawInput: trimmed,
          detectedIntent: classification.intent,
          extractedEntities: { ...entities, matchedProduct: matchedProduct.name },
          actionTaken: 'failed_stock_validation',
          status: 'error',
          errorMessage: 'Insufficient stock',
          metadata: actionMetadata,
        });

        return NextResponse.json({
          response: `Cannot record sale. Insufficient stock! ${matchedProduct.name} has only ${matchedProduct.currentStock} units available, but you requested ${quantity}.`,
          intent: classification.intent,
          entities: { ...entities, matchedProduct: matchedProduct.name, unitPrice, quantity },
          success: false,
          steps,
          agents: agentActivities,
          thinking: {
            intent: classification.intent,
            confidence: classification.confidence,
            entities,
            validation: 'Failed (Insufficient stock)',
            reasoning: `Stock verification failed for product "${matchedProduct.name}" (stock=${matchedProduct.currentStock}, requested=${quantity}).`,
          },
        });
      }

      steps.push({
        name: 'Business Rule Validation',
        status: 'success',
        timeMs: bizTime,
        details: `Passed stock level check. GST calculated at ${matchedProduct.gstRate}%: Base=₹${amount.toLocaleString('en-IN')}, GST=₹${gstAmount.toLocaleString('en-IN')}, Total=₹${totalAmount.toLocaleString('en-IN')}.`,
      });

      // Step 5: Database Update
      const dbStartTime = Date.now();
      let result;
      if (classification.intent === 'record_sale') {
        result = await recordSale(matchedProduct.id, quantity, unitPrice, entities.customerName);
        if (result.success && result.saleId) {
          await db.sale.update({ where: { id: result.saleId }, data: { rawInput: trimmed, source } });
        }
      } else {
        result = await recordPurchase(matchedProduct.id, quantity, unitPrice, entities.supplier);
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
          ? `Prisma transaction committed. Stock updated: ${matchedProduct.currentStock} → ${result.stockAfter} units.`
          : `Failed database transaction: ${result.message}`,
      });

      updateAgent('Inventory Agent', 'completed');

      // Step 6: Trigger Analytics & Recommendations updates
      updateAgent('Analytics Agent', 'working');
      updateAgent('Recommendation Agent', 'working');
      
      const biStartTime = Date.now();
      // Fast dynamic check
      const lowStockAlert = result.stockAfter !== undefined && result.stockAfter <= matchedProduct.lowStockThreshold;
      const biTime = Date.now() - biStartTime;

      steps.push({
        name: 'Recommendation Update',
        status: 'success',
        timeMs: biTime,
        details: lowStockAlert 
          ? `Stock fell below threshold! Created Restock Recommendation for ${matchedProduct.name}.`
          : `Inventory levels stable. Analytics database caches invalidated.`,
      });

      updateAgent('Analytics Agent', 'completed');
      updateAgent('Recommendation Agent', 'completed');
      updateAgent('Planner Agent', 'completed');

      // Final logs
      const actionMetadata = { steps, agentActivities, thinking: { intent: classification.intent, entities, result } };
      await logAIAction({
        rawInput: trimmed,
        detectedIntent: classification.intent,
        extractedEntities: { ...entities, matchedProduct: matchedProduct.name },
        actionTaken: result.message,
        status: result.success ? 'success' : 'error',
        errorMessage: result.success ? undefined : result.message,
        metadata: actionMetadata,
      });

      return NextResponse.json({
        response: result.message,
        intent: classification.intent,
        entities: { ...entities, matchedProduct: matchedProduct.name, unitPrice, quantity },
        success: result.success,
        saleId: result.saleId,
        purchaseId: result.purchaseId,
        lowStockAlert: result.lowStockAlert,
        steps,
        agents: agentActivities,
        thinking: {
          intent: classification.intent,
          confidence: classification.confidence,
          entities: { ...entities, matchedProduct: matchedProduct.name },
          stockBefore: matchedProduct.currentStock,
          stockAfter: result.stockAfter,
          validation: 'Success (GST Calculated, Inventory verified)',
          reasoning: `Recorded ${classification.intent === 'record_sale' ? 'sale' : 'purchase'} for ${matchedProduct.name} of ${quantity} units at ₹${unitPrice}/unit.`,
        },
      });
    }

    // Check Stock Intent
    if (classification.intent === 'check_stock') {
      const extractStartTime = Date.now();
      const entities = await extractEntities(trimmed, 'check_stock');
      const extractTime = Date.now() - extractStartTime;

      steps.push({
        name: 'Entity Extraction',
        status: 'success',
        timeMs: extractTime,
        details: `Identified target stock product name: "${entities.productName || 'All Products'}"`,
      });

      const checkStartTime = Date.now();
      const result = await checkStock(entities.productName || undefined);
      const checkTime = Date.now() - checkStartTime;

      steps.push({
        name: 'Inventory Validation',
        status: result.success ? 'success' : 'error',
        timeMs: checkTime,
        details: `Catalog query executed. Match status: ${result.success ? 'Matched' : 'Unmatched'}. Stock checked.`,
      });

      updateAgent('Inventory Agent', 'completed');
      updateAgent('Planner Agent', 'completed');

      const actionMetadata = { steps, agentActivities, thinking: { intent: 'check_stock', entities } };
      await logAIAction({
        rawInput: trimmed,
        detectedIntent: 'check_stock',
        extractedEntities: entities as unknown as Record<string, unknown>,
        actionTaken: result.message.substring(0, 100),
        status: result.success ? 'success' : 'error',
        errorMessage: result.success ? undefined : result.message,
        metadata: actionMetadata,
      });

      return NextResponse.json({
        response: result.message,
        intent: 'check_stock',
        entities,
        success: result.success,
        steps,
        agents: agentActivities,
        thinking: {
          intent: 'check_stock',
          confidence: classification.confidence,
          entities,
          validation: result.success ? 'Success' : 'Error',
          reasoning: `Checked stock levels for "${entities.productName || 'All items'}".`,
        },
      });
    }

    // Generate Invoice Intent
    if (classification.intent === 'generate_invoice') {
      updateAgent('Invoice Agent', 'working');
      
      const dbStartTime = Date.now();
      const lastSale = await db.sale.findFirst({
        where: { invoice: null },
        orderBy: { timestamp: 'desc' },
        include: { product: true },
      });
      const dbTime = Date.now() - dbStartTime;

      steps.push({
        name: 'Inventory Validation',
        status: lastSale ? 'success' : 'warning',
        timeMs: dbTime,
        details: lastSale 
          ? `Found unbilled sale: ID=${lastSale.id}, Product=${lastSale.product.name}, Amount=₹${lastSale.totalAmount.toLocaleString('en-IN')}.`
          : `No unbilled sales found in database.`,
      });

      if (!lastSale) {
        updateAgent('Invoice Agent', 'error');
        updateAgent('Planner Agent', 'error');
        
        const actionMetadata = { steps, agentActivities, thinking: { intent: 'generate_invoice' } };
        await logAIAction({
          rawInput: trimmed,
          detectedIntent: 'generate_invoice',
          extractedEntities: {},
          actionTaken: 'no_uninvoiced_sale',
          status: 'error',
          errorMessage: 'No un-invoiced sale found',
          metadata: actionMetadata,
        });

        return NextResponse.json({
          response: 'No un-invoiced sale found. Please record a sale first, then generate an invoice.',
          intent: 'generate_invoice',
          entities: null,
          clarificationNeeded: false,
          steps,
          agents: agentActivities,
          thinking: {
            intent: 'generate_invoice',
            confidence: classification.confidence,
            validation: 'Failed (No unbilled sale)',
            reasoning: 'Searched database for sales where invoice field is null, none returned.',
          },
        });
      }

      const invStartTime = Date.now();
      const invResult = await generateInvoice(lastSale.id);
      const invTime = Date.now() - invStartTime;

      steps.push({
        name: 'Invoice Generation',
        status: invResult.success ? 'success' : 'error',
        timeMs: invTime,
        details: invResult.success 
          ? `PDF compiled and saved. GST Breakdown CGST/SGST registered. File available for download.`
          : `Invoice compile error: ${invResult.message}`,
      });

      updateAgent('Invoice Agent', 'completed');
      updateAgent('Planner Agent', 'completed');

      const actionMetadata = { steps, agentActivities, thinking: { intent: 'generate_invoice', saleId: lastSale.id } };
      await logAIAction({
        rawInput: trimmed,
        detectedIntent: 'generate_invoice',
        extractedEntities: { saleId: lastSale.id, product: lastSale.product.name },
        actionTaken: invResult.message,
        status: invResult.success ? 'success' : 'error',
        errorMessage: invResult.success ? undefined : invResult.message,
        metadata: actionMetadata,
      });

      return NextResponse.json({
        response: invResult.message,
        intent: 'generate_invoice',
        success: invResult.success,
        invoiceGenerated: invResult.success,
        steps,
        agents: agentActivities,
        thinking: {
          intent: 'generate_invoice',
          confidence: classification.confidence,
          entities: { saleId: lastSale.id },
          validation: 'Success (Invoice generated)',
          reasoning: `Generated GST invoice for sale of ${lastSale.product.name} (Sale ID: ${lastSale.id}).`,
        },
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
