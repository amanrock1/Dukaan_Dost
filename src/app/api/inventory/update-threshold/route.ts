import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logAIAction } from '@/lib/aiLogger';

export async function POST(request: NextRequest) {
  try {
    const { productId, threshold } = await request.json();

    if (!productId || threshold === undefined) {
      return NextResponse.json({ error: 'Product ID and threshold value are required' }, { status: 400 });
    }

    const val = parseInt(threshold);
    if (isNaN(val) || val < 0) {
      return NextResponse.json({ error: 'Threshold must be a non-negative number' }, { status: 400 });
    }

    const product = await db.product.update({
      where: { id: productId },
      data: { lowStockThreshold: val },
    });

    await logAIAction({
      rawInput: `Updated stock threshold of ${product.name} to ${val}`,
      detectedIntent: 'update_threshold',
      extractedEntities: { productId, name: product.name, threshold: val },
      actionTaken: `Updated low-stock alert threshold for ${product.name} to ${val} units.`,
      status: 'success',
    });

    return NextResponse.json({ success: true, product });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Threshold update failed: ${msg}` }, { status: 500 });
  }
}
