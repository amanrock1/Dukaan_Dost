import { db } from './db';

export interface InventoryResult {
  success: boolean;
  message: string;
  saleId?: string;
  purchaseId?: string;
  stockAfter?: number;
  lowStockAlert?: boolean;
}

export async function recordSale(
  productId: string,
  quantity: number,
  unitPrice: number
): Promise<InventoryResult> {
  try {
    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) {
      return { success: false, message: `Product not found in catalog.` };
    }

    if (product.currentStock < quantity) {
      return {
        success: false,
        message: `Insufficient stock! ${product.name}: ${quantity} requested but only ${product.currentStock} available.`,
        stockAfter: product.currentStock,
        lowStockAlert: product.currentStock <= product.lowStockThreshold,
      };
    }

    const amount = quantity * unitPrice;
    const gstAmount = Math.round(amount * (product.gstRate / 100) * 100) / 100;
    const totalAmount = Math.round((amount + gstAmount) * 100) / 100;

    const sale = await db.sale.create({
      data: {
        productId,
        quantity,
        unitPrice,
        amount,
        gstAmount,
        totalAmount,
        source: 'text',
        rawInput: '',
      },
    });

    const newStock = product.currentStock - quantity;
    await db.product.update({
      where: { id: productId },
      data: { currentStock: newStock },
    });

    return {
      success: true,
      message: `Sale recorded: ${quantity} x ${product.name} at ₹${unitPrice.toLocaleString('en-IN')} each = ₹${totalAmount.toLocaleString('en-IN')} (incl. GST). Stock: ${product.currentStock} → ${newStock}.`,
      saleId: sale.id,
      stockAfter: newStock,
      lowStockAlert: newStock <= product.lowStockThreshold,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, message: `Error recording sale: ${msg}` };
  }
}

export async function recordPurchase(
  productId: string,
  quantity: number,
  unitPrice: number
): Promise<InventoryResult> {
  try {
    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) {
      return { success: false, message: `Product not found in catalog.` };
    }

    const amount = quantity * unitPrice;

    const purchase = await db.purchase.create({
      data: {
        productId,
        quantity,
        unitPrice,
        amount,
        source: 'text',
        rawInput: '',
      },
    });

    const newStock = product.currentStock + quantity;
    await db.product.update({
      where: { id: productId },
      data: { currentStock: newStock },
    });

    return {
      success: true,
      message: `Purchase recorded: ${quantity} x ${product.name} at ₹${unitPrice.toLocaleString('en-IN')} each = ₹${amount.toLocaleString('en-IN')}. Stock: ${product.currentStock} → ${newStock}.`,
      purchaseId: purchase.id,
      stockAfter: newStock,
      lowStockAlert: false,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, message: `Error recording purchase: ${msg}` };
  }
}

export async function checkStock(productName?: string): Promise<InventoryResult> {
  try {
    if (productName) {
      const products = await db.product.findMany();
      const match = products.find(p =>
        p.name.toLowerCase().includes(productName.toLowerCase()) ||
        productName.toLowerCase().includes(p.name.toLowerCase())
      );
      
      if (match) {
        const isLow = match.currentStock <= match.lowStockThreshold;
        return {
          success: true,
          message: `${match.name}: ${match.currentStock} ${match.unit} in stock${isLow ? ' (LOW STOCK!)' : ''}. Price: ₹${match.unitPrice.toLocaleString('en-IN')}/unit.`,
          stockAfter: match.currentStock,
          lowStockAlert: isLow,
        };
      }
      return { success: false, message: `No product found matching "${productName}".` };
    }

    // Return all products summary
    const products = await db.product.findMany({
      orderBy: { category: 'asc' },
    });
    const lines = products.map(p => {
      const flag = p.currentStock <= p.lowStockThreshold ? ' ⚠️ LOW' : '';
      return `${p.name}: ${p.currentStock} ${p.unit}${flag}`;
    });
    const lowStockCount = products.filter(p => p.currentStock <= p.lowStockThreshold).length;
    
    return {
      success: true,
      message: `Stock Summary (${products.length} products, ${lowStockCount} low-stock alerts):\n${lines.join('\n')}`,
      lowStockAlert: lowStockCount > 0,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, message: `Error checking stock: ${msg}` };
  }
}

export async function getLowStockProducts() {
  return db.product.findMany({
    where: { currentStock: { lte: db.product.fields.lowStockThreshold } },
  });
}