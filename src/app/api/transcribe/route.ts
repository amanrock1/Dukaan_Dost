import { NextRequest, NextResponse } from 'next/server';
import { transcribe } from '@/lib/ai-sdk';

export async function POST(request: NextRequest) {
  try {
    const { audio } = await request.json();
    if (!audio || typeof audio !== 'string') {
      return NextResponse.json({ error: 'Audio data (base64) required' }, { status: 400 });
    }

    const result = await transcribe({ audio });
    const text = typeof result === 'string' ? result : result?.text || '';

    return NextResponse.json({ text });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Transcription error:', msg);
    return NextResponse.json({ error: `Transcription failed: ${msg}` }, { status: 500 });
  }
}
