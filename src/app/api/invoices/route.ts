import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const invoices = await db.invoice.findMany({
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
