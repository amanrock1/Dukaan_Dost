import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logAIAction } from '@/lib/aiLogger';

export async function POST(request: NextRequest) {
  try {
    const { saleId } = await request.json();

    if (!saleId) {
      return NextResponse.json({ error: 'Sale ID is required' }, { status: 400 });
    }

    // Find the sale
    const sale = await db.sale.findUnique({
      where: { id: saleId },
      include: { invoice: true, product: true },
    });

    if (!sale) {
      return NextResponse.json({ error: 'Sale transaction not found' }, { status: 404 });
    }

    // Step 1: Delete associated invoice if it exists
    if (sale.invoice) {
      await db.invoice.delete({
        where: { id: sale.invoice.id },
      });
    }

    // Step 2: Revert product stock
    const newStock = sale.product.currentStock + sale.quantity;
    await db.product.update({
      where: { id: sale.productId },
      data: { currentStock: newStock },
    });

    // Step 3: Delete the sale record
    await db.sale.delete({
      where: { id: saleId },
    });

    // Log the action
    await logAIAction({
      rawInput: `Reverted transaction: refund Sale ID ${saleId}`,
      detectedIntent: 'refund_transaction',
      extractedEntities: { saleId, product: sale.product.name, quantity: sale.quantity },
      actionTaken: `Refunded transaction: Reverted stock of ${sale.product.name} +${sale.quantity} (${sale.product.currentStock} -> ${newStock}). Deleted invoice & sale records.`,
      status: 'success',
    });

    return NextResponse.json({ success: true, message: 'Transaction refunded successfully.' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Refund transaction error:', msg);
    return NextResponse.json({ error: `Refund failed: ${msg}` }, { status: 500 });
  }
}
