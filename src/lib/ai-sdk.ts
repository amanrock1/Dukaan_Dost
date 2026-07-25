import ZAI from 'z-ai-web-dev-sdk';

const zai = new ZAI();

export async function llmChat(params: { model: string; messages: Array<{ role: string; content: string }>; temperature?: number }): Promise<string | { content: string }> {
  return zai.chat.completions.create(params);
}

export async function transcribe(params: { audio: string }): Promise<string | { text: string }> {
  return zai.audio.asr.create(params);
}
