import { NextResponse } from 'next/server';
import { getBusinessInsightsAndRecommendations } from '@/lib/businessIntelligence';

export async function GET() {
  try {
    const data = await getBusinessInsightsAndRecommendations();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch business insights' }, { status: 500 });
  }
}
