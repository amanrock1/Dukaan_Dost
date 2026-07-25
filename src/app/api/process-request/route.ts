import { NextRequest, NextResponse } from 'next/server';
import { classifyIntent } from '@/lib/intentClassifier';
import { extractEntities, findMatchingProduct } from '@/lib/entityExtractor';
import { recordSale, recordPurchase, checkStock } from '@/lib/inventoryEngine';
import { generateInvoice } from '@/lib/invoiceGenerator';
import { logAIAction } from '@/lib/aiLogger';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { input, source = 'text' } = await request.json();

    if (!input || typeof input !== 'string' || input.trim().length === 0) {
      return NextResponse.json({ error: 'Please provide valid input.' }, { status: 400 });
    }

    const trimmed = input.trim();

    // Step 1: Classify Intent
    const classification = await classifyIntent(trimmed);

    if (classification.intent === 'unknown') {
      await logAIAction({
        rawInput: trimmed,
        detectedIntent: 'unknown',
        extractedEntities: {},
        actionTaken: 'none',
        status: 'error',
        errorMessage: 'Could not determine intent',
      });
      return NextResponse.json({
        response: `I couldn't understand that. Try something like:\n• "5 laptops sold for 40000 each"\n• "Bought 20 notebooks at 50 rupees"\n• "Check stock of keyboards"\n• "Generate invoice for last sale"`,
        intent: 'unknown',
        entities: null,
        clarificationNeeded: true,
      });
    }

    // Step 2: Extract Entities (for sale/purchase intents)
    if (classification.intent === 'record_sale' || classification.intent === 'record_purchase') {
      const entities = await extractEntities(trimmed, classification.intent);

      if (entities.missingFields.includes('productName') || !entities.productName) {
        await logAIAction({
          rawInput: trimmed,
          detectedIntent: classification.intent,
          extractedEntities: entities as unknown as Record<string, unknown>,
          actionTaken: 'clarification_requested',
          status: 'clarification_needed',
          errorMessage: 'Product name missing',
        });
        return NextResponse.json({
          response: 'Which product are you referring to? Please mention the product name (e.g., laptop, keyboard, notebook).',
          intent: classification.intent,
          entities,
          clarificationNeeded: true,
        });
      }

      const matchedProduct = await findMatchingProduct(entities.productName);
      if (!matchedProduct) {
        await logAIAction({
          rawInput: trimmed,
          detectedIntent: classification.intent,
          extractedEntities: entities as unknown as Record<string, unknown>,
          actionTaken: 'clarification_requested',
          status: 'error',
          errorMessage: `Product not found: ${entities.productName}`,
        });
        return NextResponse.json({
          response: `Product "${entities.productName}" not found in catalog. Available products: Laptop, Keyboard, Monitor, Headphones, Printer, Mouse, Notebook, Pen, Shoes, Medicine Paracetamol, USB Cable, School Bag, Router, Sanitizer, Flash Drive 32GB.`,
          intent: classification.intent,
          entities,
          clarificationNeeded: true,
        });
      }

      // Use extracted or catalog price
      const unitPrice = entities.unitPrice || matchedProduct.unitPrice;
      const quantity = entities.quantity || 1;

      if (classification.intent === 'record_sale') {
        const result = await recordSale(matchedProduct.id, quantity, unitPrice);
        // Update raw input on sale
        await db.sale.update({ where: { id: result.saleId! }, data: { rawInput: trimmed, source } });

        await logAIAction({
          rawInput: trimmed,
          detectedIntent: classification.intent,
          extractedEntities: { ...entities, matchedProduct: matchedProduct.name },
          actionTaken: `recorded_sale: ${quantity}x ${matchedProduct.name} @ ₹${unitPrice}`,
          status: result.success ? 'success' : 'error',
          errorMessage: result.success ? undefined : result.message,
        });

        return NextResponse.json({
          response: result.message,
          intent: classification.intent,
          entities: { ...entities, matchedProduct: matchedProduct.name, unitPrice, quantity },
          success: result.success,
          saleId: result.saleId,
          lowStockAlert: result.lowStockAlert,
        });
      } else {
        const result = await recordPurchase(matchedProduct.id, quantity, unitPrice);
        await db.purchase.update({ where: { id: result.purchaseId! }, data: { rawInput: trimmed, source } });

        await logAIAction({
          rawInput: trimmed,
          detectedIntent: classification.intent,
          extractedEntities: { ...entities, matchedProduct: matchedProduct.name },
          actionTaken: `recorded_purchase: ${quantity}x ${matchedProduct.name} @ ₹${unitPrice}`,
          status: result.success ? 'success' : 'error',
          errorMessage: result.success ? undefined : result.message,
        });

        return NextResponse.json({
          response: result.message,
          intent: classification.intent,
          entities: { ...entities, matchedProduct: matchedProduct.name, unitPrice, quantity },
          success: result.success,
        });
      }
    }

    // Check Stock
    if (classification.intent === 'check_stock') {
      const entities = await extractEntities(trimmed, classification.intent);
      const result = await checkStock(entities.productName);

      await logAIAction({
        rawInput: trimmed,
        detectedIntent: 'check_stock',
        extractedEntities: entities as unknown as Record<string, unknown>,
        actionTaken: 'checked_stock',
        status: result.success ? 'success' : 'error',
        errorMessage: result.success ? undefined : result.message,
      });

      return NextResponse.json({
        response: result.message,
        intent: 'check_stock',
        entities,
        success: result.success,
      });
    }

    // Generate Invoice
    if (classification.intent === 'generate_invoice') {
      const lastSale = await db.sale.findFirst({
        where: { invoice: null },
        orderBy: { timestamp: 'desc' },
        include: { product: true },
      });

      if (!lastSale) {
        await logAIAction({
          rawInput: trimmed,
          detectedIntent: 'generate_invoice',
          extractedEntities: {},
          actionTaken: 'no_uninvoiced_sale',
          status: 'error',
          errorMessage: 'No un-invoiced sale found',
        });
        return NextResponse.json({
          response: 'No un-invoiced sale found. Record a sale first, then generate an invoice.',
          intent: 'generate_invoice',
          entities: null,
          clarificationNeeded: true,
        });
      }

      const invResult = await generateInvoice(lastSale.id);

      await logAIAction({
        rawInput: trimmed,
        detectedIntent: 'generate_invoice',
        extractedEntities: { saleId: lastSale.id, product: lastSale.product.name },
        actionTaken: `generated_invoice: ${lastSale.product.name}`,
        status: invResult.success ? 'success' : 'error',
        errorMessage: invResult.success ? undefined : invResult.message,
      });

      return NextResponse.json({
        response: invResult.message,
        intent: 'generate_invoice',
        success: invResult.success,
        invoiceGenerated: invResult.success,
      });
    }

    return NextResponse.json({ response: 'Unhandled intent.', intent: classification.intent });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Process request error:', msg);
    return NextResponse.json({ error: `Server error: ${msg}` }, { status: 500 });
  }
}
