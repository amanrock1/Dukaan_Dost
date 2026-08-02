import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');

    const invoices = await db.invoice.findMany({
      where: {
        sale: shopId ? { shopId } : { shopId: null }
      },
      orderBy: { generatedAt: 'desc' },
      take: 50,
      include: {
        sale: {
          include: { product: { select: { name: true } } },
        },
      },
    });
    return NextResponse.json({ invoices });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}
