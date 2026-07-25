import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const purchases = await db.purchase.findMany({
      orderBy: { timestamp: 'desc' },
      take: 50,
      include: { product: { select: { name: true, category: true } } },
    });
    const totalPurchases = await db.purchase.aggregate({ _sum: { amount: true }, _count: true });
    return NextResponse.json({ purchases, totalPurchases });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 });
  }
}
