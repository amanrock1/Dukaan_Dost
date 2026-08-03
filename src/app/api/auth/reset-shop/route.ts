import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logAIAction } from '@/lib/aiLogger';

// POST /api/auth/reset-shop
export async function POST(request: Request) {
  try {
    const { shopId: rawShopId } = await request.json();
    const shopId = rawShopId && String(rawShopId).trim() !== '' ? String(rawShopId) : null;

    const shopFilter = shopId ? { shopId } : { shopId: null };

    // Delete invoices for sales in this shop
    await db.invoice.deleteMany({
      where: {
        sale: shopFilter,
      },
    });

    // Delete sales in this shop
    await db.sale.deleteMany({
      where: shopFilter,
    });

    // Delete purchases in this shop
    await db.purchase.deleteMany({
      where: shopFilter,
    });

    // Reset stock on all products in this shop to 10 units
    await db.product.updateMany({
      where: shopFilter,
      data: {
        currentStock: 10,
      },
    });

    await logAIAction({
      rawInput: 'reset shop data',
      detectedIntent: 'reset_shop',
      extractedEntities: { shopId },
      actionTaken: 'Cleared all sales, purchases, invoices, and reset stock levels to 10.',
      status: 'success',
    });

    return NextResponse.json({
      success: true,
      message: 'Workspace reset! All sales, purchases, and invoices cleared.',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Reset shop error:', msg);
    return NextResponse.json({ error: 'Failed to reset shop: ' + msg }, { status: 500 });
  }
}
