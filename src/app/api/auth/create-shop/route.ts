import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { name, ownerId } = await request.json();

    if (!name || !ownerId) {
      return NextResponse.json({ error: 'Shop name and owner ID are required.' }, { status: 400 });
    }

    // Ensure the owner user exists in the database
    let user = await prisma.user.findUnique({
      where: { id: ownerId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: ownerId,
          username: ownerId === 'guest-user' ? 'guest' : `user_${ownerId}`,
          password: 'hashedpassword_not_needed_for_guest_mode',
          name: ownerId === 'guest-user' ? 'Guest Reviewer' : `User ${ownerId}`,
        },
      });
    }

    const newShop = await prisma.shop.create({
      data: {
        name,
        ownerId: user.id,
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

