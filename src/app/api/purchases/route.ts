import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');
    const filter = shopId ? { shopId } : { shopId: null };

    const purchases = await db.purchase.findMany({
      where: filter,
      orderBy: { timestamp: 'desc' },
      take: 50,
      include: { product: { select: { name: true, category: true } } },
    });
    const totalPurchases = await db.purchase.aggregate({
      where: filter,
      _sum: { amount: true },
      _count: true
    });
    return NextResponse.json({ purchases, totalPurchases });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 });
  }
}
