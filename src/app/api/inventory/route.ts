import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');

    const products = await db.product.findMany({
      where: shopId ? { shopId } : { shopId: null },
      orderBy: { category: 'asc' }
    });
    const lowStock = products.filter(p => p.currentStock <= p.lowStockThreshold);
    const totalValue = products.reduce((sum, p) => sum + p.currentStock * p.unitPrice, 0);

    return NextResponse.json({ products, lowStockCount: lowStock.length, totalValue });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
  }
}
