export async function llmChat(params: { model: string; messages: Array<{ role: string; content: string }>; temperature?: number }): Promise<string | { content: string }> {
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) {
    throw new Error('GROQ_API_KEY is missing from environment variables.');
  }

  const groqModel = params.model.includes('llama') ? 'llama-3.3-70b-versatile' : params.model;
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${groqApiKey.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: groqModel,
      messages: params.messages,
      temperature: params.temperature ?? 0.1,
    }),
  });

  if (res.ok) {
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    return { content };
  } else {
    const errText = await res.text();
    console.error('Groq llmChat error:', errText);
    throw new Error(`Groq LLM Error: ${errText}`);
  }
}

export async function transcribe(params: { audio: string }): Promise<string | { text: string }> {
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) {
    throw new Error('GROQ_API_KEY is missing from environment variables.');
  }

  const buffer = Buffer.from(params.audio, 'base64');
  const file = new File([buffer], 'audio.webm', { type: 'audio/webm' });
  const formData = new FormData();
  formData.append('file', file);
  formData.append('model', 'whisper-large-v3');
  formData.append('prompt', 'Indian retail inventory request: record sale, record purchase, check stock, or generate invoice for products like laptops, keyboards, notebooks, pens, shoes.');

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${groqApiKey.trim()}`,
    },
    body: formData,
  });

  if (res.ok) {
    const data = await res.json();
    let text = (data.text || '').trim();
    if (/^\s*(you|you\.|thank\s*you.*|thanks.*|subtitles.*|amara\.org.*|like\s*and\s*subscribe.*)\s*$/i.test(text)) {
      text = '';
    }
    return { text };
  } else {
    const errText = await res.text();
    console.error('Groq transcribe error:', errText);
    throw new Error(`Groq Whisper Error: ${errText}`);
  }
}
