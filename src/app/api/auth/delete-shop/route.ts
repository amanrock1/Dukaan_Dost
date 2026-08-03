import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logAIAction } from '@/lib/aiLogger';

// POST /api/auth/delete-shop
export async function POST(request: Request) {
  try {
    const { shopId: rawShopId } = await request.json();
    const shopId = rawShopId && String(rawShopId).trim() !== '' ? String(rawShopId) : null;

    if (!shopId) {
      // Guest default shop — reset data instead of deleting default workspace
      await db.invoice.deleteMany({ where: { sale: { shopId: null } } });
      await db.sale.deleteMany({ where: { shopId: null } });
      await db.purchase.deleteMany({ where: { shopId: null } });
      await db.product.deleteMany({ where: { shopId: null } });

      return NextResponse.json({
        success: true,
        isGuestReset: true,
        message: 'Default guest workspace data cleared.',
      });
    }

    const shop = await db.shop.findUnique({ where: { id: shopId } });
    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    // Delete invoices for sales in this shop
    await db.invoice.deleteMany({
      where: { sale: { shopId } },
    });

    // Delete sales, purchases, and products
    await db.sale.deleteMany({ where: { shopId } });
    await db.purchase.deleteMany({ where: { shopId } });
    await db.product.deleteMany({ where: { shopId } });

    // Delete shop itself
    await db.shop.delete({ where: { id: shopId } });

    await logAIAction({
      rawInput: `delete shop ${shop.name}`,
      detectedIntent: 'delete_shop',
      extractedEntities: { shopId, shopName: shop.name },
      actionTaken: `Permanently deleted shop "${shop.name}" and all associated data.`,
      status: 'success',
    });

    return NextResponse.json({
      success: true,
      shopName: shop.name,
      message: `Shop "${shop.name}" deleted permanently.`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Delete shop error:', msg);
    return NextResponse.json({ error: 'Failed to delete shop: ' + msg }, { status: 500 });
  }
}
