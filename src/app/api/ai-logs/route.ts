import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const logs = await db.aILog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 30,
    });
    return NextResponse.json({ logs });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch AI logs' }, { status: 500 });
  }
}
