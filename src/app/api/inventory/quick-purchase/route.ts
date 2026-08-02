import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recordPurchase } from '@/lib/inventoryEngine';
import { logAIAction } from '@/lib/aiLogger';

export async function POST(request: NextRequest) {
  try {
    const { productId, quantity } = await request.json();

    if (!productId || !quantity) {
      return NextResponse.json({ error: 'Product ID and quantity are required' }, { status: 400 });
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json({ error: 'Quantity must be a positive integer' }, { status: 400 });
    }

    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const result = await recordPurchase(productId, qty, product.unitPrice);
    if (result.success && result.purchaseId) {
      await db.purchase.update({
        where: { id: result.purchaseId },
        data: { rawInput: `Restocked ${qty} ${product.name} (Quick Action)`, source: 'Manual' },
      });
    }

    await logAIAction({
      rawInput: `Quick restock of ${qty} units of ${product.name}`,
      detectedIntent: 'quick_restock',
      extractedEntities: { productId, name: product.name, quantity: qty },
      actionTaken: `Quick restocked ${qty} units of ${product.name}. Stock updated: ${product.currentStock} -> ${result.stockAfter}.`,
      status: 'success',
    });

    return NextResponse.json({ success: true, message: result.message });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Quick restock failed: ${msg}` }, { status: 500 });
  }
}
