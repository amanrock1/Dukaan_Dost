import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logAIAction } from '@/lib/aiLogger';

// POST: Add a new product manually
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, category, unit, unitPrice, gstRate, currentStock, lowStockThreshold, modelNumber, aliases, attributes, shopId } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    const normShopId = shopId && String(shopId).trim() !== '' ? String(shopId) : null;

    const product = await db.product.create({
      data: {
        name: name.trim(),
        category: category || 'General',
        unit: unit || 'pcs',
        unitPrice: Number(unitPrice) || 0,
        gstRate: Number(gstRate) || 18,
        currentStock: Number(currentStock) || 0,
        lowStockThreshold: Number(lowStockThreshold) || 5,
        modelNumber: modelNumber || null,
        aliases: aliases || null,
        attributes: attributes || null,
        shopId: normShopId,
      },
    });

    await logAIAction({
      rawInput: `manual add product ${name}`,
      detectedIntent: 'manual_add_product',
      extractedEntities: { productId: product.id, name: product.name },
      actionTaken: `Manually added product "${product.name}"`,
      status: 'success',
    });

    return NextResponse.json({ success: true, product, message: `Product "${product.name}" created successfully!` });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Failed to create product: ${msg}` }, { status: 500 });
  }
}

// PUT: Edit existing product manually
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, category, unit, unitPrice, gstRate, currentStock, lowStockThreshold, modelNumber, aliases, attributes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const updated = await db.product.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(category && { category }),
        ...(unit && { unit }),
        ...(unitPrice !== undefined && { unitPrice: Number(unitPrice) }),
        ...(gstRate !== undefined && { gstRate: Number(gstRate) }),
        ...(currentStock !== undefined && { currentStock: Number(currentStock) }),
        ...(lowStockThreshold !== undefined && { lowStockThreshold: Number(lowStockThreshold) }),
        ...(modelNumber !== undefined && { modelNumber: modelNumber || null }),
        ...(aliases !== undefined && { aliases: aliases || null }),
        ...(attributes !== undefined && { attributes: attributes || null }),
      },
    });

    await logAIAction({
      rawInput: `manual edit product ${updated.name}`,
      detectedIntent: 'manual_edit_product',
      extractedEntities: { productId: updated.id, name: updated.name },
      actionTaken: `Manually updated product "${updated.name}"`,
      status: 'success',
    });

    return NextResponse.json({ success: true, product: updated, message: `Product "${updated.name}" updated successfully!` });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Failed to update product: ${msg}` }, { status: 500 });
  }
}

// DELETE: Delete a product
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Check if product exists
    const prod = await db.product.findUnique({ where: { id } });
    if (!prod) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Delete associated sales & purchases to avoid foreign key errors
    await db.invoice.deleteMany({ where: { sale: { productId: id } } });
    await db.sale.deleteMany({ where: { productId: id } });
    await db.purchase.deleteMany({ where: { productId: id } });
    await db.product.delete({ where: { id } });

    await logAIAction({
      rawInput: `manual delete product ${prod.name}`,
      detectedIntent: 'manual_delete_product',
      extractedEntities: { productId: id, name: prod.name },
      actionTaken: `Deleted product "${prod.name}"`,
      status: 'success',
    });

    return NextResponse.json({ success: true, message: `Deleted product "${prod.name}"` });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Failed to delete product: ${msg}` }, { status: 500 });
  }
}
