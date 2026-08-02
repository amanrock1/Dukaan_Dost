import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { name, ownerId } = await request.json();

    if (!name || !ownerId) {
      return NextResponse.json({ error: 'Shop name and owner ID are required.' }, { status: 400 });
    }

    const newShop = await prisma.shop.create({
      data: {
        name,
        ownerId,
      },
    });

    return NextResponse.json({
      success: true,
      shop: newShop,
    });
  } catch (error: any) {
    console.error('Create shop error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
