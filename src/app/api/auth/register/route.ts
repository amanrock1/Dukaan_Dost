import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(request: Request) {
  try {
    const { username, password, name, shopName } = await request.json();

    if (!username || !password || !shopName) {
      return NextResponse.json({ error: 'Username, password, and shop name are required.' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Username is already taken.' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user and default shop in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username,
          password: hashedPassword,
          name,
        },
      });

      const newShop = await tx.shop.create({
        data: {
          name: shopName,
          ownerId: newUser.id,
        },
      });

      return { user: newUser, shop: newShop };
    });

    return NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        username: result.user.username,
        name: result.user.name,
      },
      shops: [result.shop],
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
