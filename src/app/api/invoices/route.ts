import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawShopId = searchParams.get('shopId');
    const shopId = rawShopId && rawShopId.trim() !== '' ? rawShopId : null;

    const invoices = await db.invoice.findMany({
      where: {
        sale: shopId ? { shopId } : { shopId: null }
      },
      orderBy: { generatedAt: 'desc' },
      take: 50,
      include: {
        sale: {
          include: { product: { select: { name: true, gstRate: true } } },
        },
      },
    });

    // Map to flat structure the frontend expects
    const mapped = invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      pdfData: inv.pdfData,           // base64 PDF
      timestamp: inv.generatedAt,
      customerName: inv.sale.customerName || 'Walk-in Customer',
      productName: inv.sale.product.name,
      quantity: inv.sale.quantity,
      unitPrice: inv.sale.unitPrice,
      subtotal: inv.sale.amount,       // pre-GST
      gstAmount: inv.sale.gstAmount,
      totalAmount: inv.sale.totalAmount,
      gstRate: inv.sale.product.gstRate,
    }));

    return NextResponse.json({ invoices: mapped });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

