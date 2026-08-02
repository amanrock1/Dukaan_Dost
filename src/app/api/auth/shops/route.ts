import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/auth/shops?userId=guest-user
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ shops: [] });
    }

    const shops = await db.shop.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true },
    });

    return NextResponse.json({ shops });
  } catch (error) {
    console.error('Fetch shops error:', error);
    return NextResponse.json({ shops: [] });
  }
}
