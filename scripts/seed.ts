import { PrismaClient } from '@prisma/client';
import products from '../data/product_seed.json';

const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding products...');

  for (const p of products) {
    await prisma.product.upsert({
      where: { id: `seed-${p.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `seed-${p.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: p.name,
        category: p.category,
        unit: p.unit,
        currentStock: p.currentStock,
        lowStockThreshold: p.lowStockThreshold,
        unitPrice: p.unitPrice,
        gstRate: p.gstRate,
      },
    });
  }

  console.log(`Seeded ${products.length} products.`);
  await prisma.$disconnect();
}

seed().catch(console.error);
