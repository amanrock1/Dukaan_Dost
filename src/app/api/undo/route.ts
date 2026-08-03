import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logAIAction } from '@/lib/aiLogger';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawShopId = body?.shopId;
    const shopId = rawShopId && String(rawShopId).trim() !== '' ? String(rawShopId) : null;

    const shopFilter = shopId ? { shopId } : { shopId: null };

    // Fetch latest sale and latest purchase
    const lastSale = await db.sale.findFirst({
      where: shopFilter,
      orderBy: { timestamp: 'desc' },
      include: { product: true, invoice: true },
    });

    const lastPurchase = await db.purchase.findFirst({
      where: shopFilter,
      orderBy: { timestamp: 'desc' },
      include: { product: true },
    });

    if (!lastSale && !lastPurchase) {
      return NextResponse.json({
        success: false,
        message: 'Koi recent sale ya purchase nahi mili undo karne ke liye.',
      });
    }

    // Determine which transaction happened most recently
    const saleTime = lastSale ? new Date(lastSale.timestamp).getTime() : 0;
    const purchaseTime = lastPurchase ? new Date(lastPurchase.timestamp).getTime() : 0;

    if (saleTime >= purchaseTime && lastSale) {
      // Revert Sale
      const product = lastSale.product;
      const restoredStock = product.currentStock + lastSale.quantity;

      // Delete associated invoice if any
      if (lastSale.invoice) {
        await db.invoice.delete({ where: { id: lastSale.invoice.id } });
      }

      // Delete sale entry
      await db.sale.delete({ where: { id: lastSale.id } });

      // Update product stock
      await db.product.update({
        where: { id: product.id },
        data: { currentStock: restoredStock },
      });

      const message = `↩️ Sale Reverted! ${lastSale.quantity} x ${product.name} stock restored (${product.currentStock} → ${restoredStock}). Invoice deleted.`;

      await logAIAction({
        rawInput: 'undo last action',
        detectedIntent: 'undo',
        extractedEntities: { revertedType: 'sale', productId: product.id, quantity: lastSale.quantity },
        actionTaken: message,
        status: 'success',
      });

      return NextResponse.json({
        success: true,
        message,
        undoneType: 'sale',
        restoredProduct: product.name,
        restoredStock,
      });
    } else if (lastPurchase) {
      // Revert Purchase
      const product = lastPurchase.product;
      const restoredStock = Math.max(0, product.currentStock - lastPurchase.quantity);

      // Delete purchase entry
      await db.purchase.delete({ where: { id: lastPurchase.id } });

      // Update product stock
      await db.product.update({
        where: { id: product.id },
        data: { currentStock: restoredStock },
      });

      const message = `↩️ Purchase Reverted! Removed ${lastPurchase.quantity} x ${product.name} from stock (${product.currentStock} → ${restoredStock}).`;

      await logAIAction({
        rawInput: 'undo last action',
        detectedIntent: 'undo',
        extractedEntities: { revertedType: 'purchase', productId: product.id, quantity: lastPurchase.quantity },
        actionTaken: message,
        status: 'success',
      });

      return NextResponse.json({
        success: true,
        message,
        undoneType: 'purchase',
        restoredProduct: product.name,
        restoredStock,
      });
    }

    return NextResponse.json({ success: false, message: 'Could not undo last action.' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: 'Failed to undo action: ' + msg }, { status: 500 });
  }
}
