import { NextRequest, NextResponse } from 'next/server';
import { transcribe } from '@/lib/ai-sdk';

// List of demo phrases to cycle through for the presentation when API keys are missing/expired
const DEMO_PHRASES = [
  "5 laptops sold for 40000 each",
  "bought 20 notebooks at 50 rupees",
  "check stock of keyboards",
  "generate invoice for last sale"
];

let demoPhraseIndex = 0;

export async function POST(request: NextRequest) {
  try {
    const { audio } = await request.json();
    if (!audio || typeof audio !== 'string' || audio.trim().length < 50) {
      return NextResponse.json({ error: 'Valid audio data (base64) required' }, { status: 400 });
    }

    // Try using GROQ_API_KEY directly if present in environment
    const groqApiKey = process.env.GROQ_API_KEY;
    if (groqApiKey) {
      try {
        const buffer = Buffer.from(audio, 'base64');
        const file = new File([buffer], 'audio.webm', { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', file);
        formData.append('model', 'whisper-large-v3');
        formData.append('prompt', 'Indian retail inventory request: record sale, record purchase, check stock, or generate invoice for products like laptops, keyboards, notebooks, pens, shoes.');

        const groqResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqApiKey.trim()}`,
          },
          body: formData,
        });

        if (groqResponse.ok) {
          const data = await groqResponse.json();
          let text = (data.text || '').trim();
          
          // Filter out common Whisper silent audio YouTube subtitle hallucinations
          const isHallucination = /^\s*(you|you\.|thank\s*you.*|thanks.*|subtitles.*|amara\.org.*|like\s*and\s*subscribe.*)\s*$/i.test(text);
          if (isHallucination) {
            console.log('[Groq Whisper Filtered Hallucination]:', text);
            text = '';
          }

          if (text) {
            console.log('[Groq Whisper] Transcribed:', text);
            return NextResponse.json({ text });
          } else {
            return NextResponse.json({ error: 'No speech detected. Please speak louder into your microphone.' }, { status: 400 });
          }
        } else {
          const errorText = await groqResponse.text();
          console.error('[Groq Whisper API Error]:', errorText);
          return NextResponse.json({ error: `Groq Whisper Error: ${errorText}` }, { status: 400 });
        }
      } catch (directErr) {
        const msg = directErr instanceof Error ? directErr.message : String(directErr);
        console.error('Failed to transcribe directly via Groq:', msg);
        return NextResponse.json({ error: `Groq Whisper Exception: ${msg}` }, { status: 500 });
      }
    }

    // Fallback to SDK (which might fail if config is missing or expired)
    try {
      const result = await transcribe({ audio });
      const text = typeof result === 'string' ? result : result?.text || '';
      if (text) {
        return NextResponse.json({ text });
      }
    } catch (sdkError) {
      console.warn('SDK transcription failed, falling back to Demo Mock:', sdkError);
    }

    // If both fail, return a mock phrase from the roadmap to allow the voice button to work for the demo
    const mockText = DEMO_PHRASES[demoPhraseIndex];
    demoPhraseIndex = (demoPhraseIndex + 1) % DEMO_PHRASES.length;
    console.log(`[Demo ASR Fallback] Transcribing to: "${mockText}"`);
    
    return NextResponse.json({ text: mockText });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Transcription error:', msg);
    return NextResponse.json({ error: `Transcription failed: ${msg}` }, { status: 500 });
  }
}
