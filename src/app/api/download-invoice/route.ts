import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const invoiceId = request.nextUrl.searchParams.get('id');
    if (!invoiceId) return NextResponse.json({ error: 'Invoice ID required' }, { status: 400 });

    const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    const pdfBuffer = Buffer.from(invoice.pdfData, 'base64');

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to download invoice' }, { status: 500 });
  }
}
