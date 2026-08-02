import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');
    const filter = shopId ? { shopId } : { shopId: null };

    const sales = await db.sale.findMany({
      where: filter,
      orderBy: { timestamp: 'desc' },
      take: 50,
      include: { product: { select: { name: true, category: true } } },
    });
    const totalSales = await db.sale.aggregate({
      where: filter,
      _sum: { amount: true, totalAmount: true },
      _count: true
    });
    return NextResponse.json({ sales, totalSales });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
  }
}
