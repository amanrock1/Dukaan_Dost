import { NextResponse } from 'next/server';
import { getBusinessInsightsAndRecommendations } from '@/lib/businessIntelligence';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');

    const data = await getBusinessInsightsAndRecommendations(shopId);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch business insights' }, { status: 500 });
  }
}
