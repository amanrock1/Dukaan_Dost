import { llmChat } from './ai-sdk';

export type Intent = 'record_sale' | 'record_purchase' | 'check_stock' | 'generate_invoice' | 'undo' | 'unknown';

interface ClassificationResult {
  intent: Intent;
  confidence: number;
  reasoning: string;
}

const INTENT_PROMPT = `You are an intent classifier for an Indian retail inventory management system. The user types in Hindi, English, or Hinglish (Hindi written in Latin script).

Classify the input into EXACTLY ONE of these intents:
- record_sale: User wants to record that items were SOLD (e.g., "5 laptops sold", "becha 3 keyboards", "behca 10 packet", "sale of 2 monitors", "10 packet kurkure beche")
- record_purchase: User wants to record that items were PURCHASED/BOUGHT (e.g., "bought 10 notebooks", "purchase 5 headphones", "khareeda 20 pens", "khareed liya 15 item")
- check_stock: User wants to CHECK current stock levels (e.g., "how many laptops", "stock of keyboard", "kitne monitors hai", "stock check karo")
- generate_invoice: User wants to GENERATE an invoice for a sale (e.g., "generate invoice", "bill banao", "invoice for last sale", "invoice banao")
- undo: User wants to UNDO, REVERT, or CANCEL the last command/transaction (e.g., "undo", "reverse", "wapas karo", "revert last sale", "galat ho gaya")

Respond in JSON format only:
{"intent": "<intent_name>", "confidence": <0.0-1.0>, "reasoning": "<brief explanation>"}`;

export async function classifyIntent(userInput: string): Promise<ClassificationResult> {
  const cleanText = userInput
    .replace(/^\s*(?:then|and|so|now|please)\s+/i, '')
    .replace(/\s*(?:update|update karo|update stock|please|karo|now)\s*$/i, '')
    .trim();
  const lower = cleanText.toLowerCase();

  // ── UNDO CHECK FIRST ──────────────────────────────────────────────────────
  const undoKeywords = ['\\bundo\\b', '\\breverse\\b', '\\bwapas\\b', '\\brevert\\b', '\\bcancel last\\b', '\\bgalat\\b'];
  if (undoKeywords.some(pattern => new RegExp(pattern, 'i').test(lower))) {
    return { intent: 'undo', confidence: 0.99, reasoning: 'Hybrid: Undo / Revert keyword detected — highest priority' };
  }

  // ── PURCHASE CHECK ────────────────────────────────────────────────────────
  const purchaseKeywords = ['\\bbought\\b', '\\bpurchased\\b', '\\bpurchase\\b', '\\bkhareeda\\b', '\\bkharida\\b', '\\bkharid\\b', '\\bkhareede\\b', '\\bliya\\b', '\\blaaya\\b', '\\blaya\\b'];
  const hasPurchase = purchaseKeywords.some(pattern => new RegExp(pattern, 'i').test(lower));

  // ── SALE CHECK ────────────────────────────────────────────────────────────
  const saleKeywords = ['\\bsold\\b', '\\bbecha\\b', '\\bbehca\\b', '\\bbeche\\b', '\\bbech\\b', '\\bsell\\b', '\\bbika\\b', '\\bbike\\b'];
  const hasSale = saleKeywords.some(pattern => new RegExp(pattern, 'i').test(lower));

  // ── INVOICE CHECK ─────────────────────────────────────────────────────────
  const invoiceKeywords = ['\\binvoice\\b', '\\bbill\\b', '\\breceipt\\b', '\\binvoice banao\\b', '\\bbill banao\\b'];
  const hasInvoice = invoiceKeywords.some(pattern => new RegExp(pattern, 'i').test(lower));

  // If input contains both a sale/purchase AND an invoice request (un-split compound), prioritize sale/purchase
  if (hasPurchase) {
    return { intent: 'record_purchase', confidence: 0.95, reasoning: 'Hybrid: Purchase keyword detected' };
  }
  if (hasSale) {
    return { intent: 'record_sale', confidence: 0.95, reasoning: 'Hybrid: Sale keyword detected' };
  }
  if (hasInvoice) {
    return { intent: 'generate_invoice', confidence: 0.98, reasoning: 'Hybrid: Invoice keyword detected' };
  }

  // ── STOCK CHECK ───────────────────────────────────────────────────────────
  const stockKeywords = ['\\bstock\\b', '\\bkitne\\b', '\\bbaaki\\b', '\\bremaining\\b'];
  if (stockKeywords.some(pattern => new RegExp(pattern, 'i').test(lower))) {
    return { intent: 'check_stock', confidence: 0.95, reasoning: 'Hybrid: Stock check keyword detected' };
  }

  try {
    const response = await llmChat({
      model: 'groq-llama3.3-70b',
      messages: [
        { role: 'system', content: INTENT_PROMPT },
        { role: 'user', content: userInput }
      ],
      temperature: 0.1,
    });

    const content = typeof response === 'string' ? response : response?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const validIntents: Intent[] = ['record_sale', 'record_purchase', 'check_stock', 'generate_invoice'];
      const intent: Intent = validIntents.includes(parsed.intent) ? parsed.intent : 'unknown';
      return {
        intent,
        confidence: parsed.confidence || 0.5,
        reasoning: parsed.reasoning || 'No reasoning provided',
      };
    }
    return { intent: 'unknown', confidence: 0, reasoning: 'Could not parse AI response' };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Intent classification error:', msg);
    return fallbackClassify(userInput);
  }
}

function cleanSegment(seg: string): string {
  return seg
    .trim()
    .replace(/^[\s,;.\-+!]+|[\s,;.\-+!]+$/g, '')
    .replace(/^(?:and then|then|and|after that|aur|phir|so|now|please|also|plus)\s+/i, '')
    .replace(/\s*(?:,?\s*update\s*karo|,?\s*update\s*stock|,?\s*update|,?\s*please|,?\s*karo|,?\s*now)$/i, '')
    .trim();
}

const FILLER_WORDS = new Set(['and', 'then', 'update', 'karo', 'also', 'plus', 'aur', 'phir', 'so', 'now', 'please', 'and then']);

function isActionSegment(s: string): boolean {
  const cleaned = cleanSegment(s);
  if (cleaned.length <= 2) return false;
  if (FILLER_WORDS.has(cleaned.toLowerCase())) return false;
  return true;
}

export async function splitMultiActionCommand(userInput: string): Promise<string[]> {
  const trimmed = userInput.trim();
  if (!trimmed) return [];

  // Split on explicit conjunctions, clauses, commas, and transition phrases like ", update ,"
  const splitRegex = /(?:\s*(?:,|;|\n|\+|\&)\s*|\s+(?:and then|and|then|after that|aur|phir|also|plus|update|update karo)\s+)/i;
  
  let rawSegments = trimmed
    .split(splitRegex)
    .map(cleanSegment)
    .filter(isActionSegment);

  // Re-verify if any segment contains multiple actions combined (e.g. "sold 2 jbl speaker for 25000 each give me invoice")
  const subSegments: string[] = [];
  for (const seg of rawSegments) {
    // If a segment contains both a sale/purchase and an invoice request, split by action boundary
    const lower = seg.toLowerCase();
    const isCompoundInvoice = (lower.includes('sold') || lower.includes('bought') || lower.includes('becha') || lower.includes('khareeda')) &&
                              (lower.includes('invoice') || lower.includes('bill') || lower.includes('receipt'));
    
    if (isCompoundInvoice) {
      const matchPos = seg.search(/(?:invoice|bill|receipt|generate|banao|give me invoice)/i);
      if (matchPos > 5) {
        const part1 = cleanSegment(seg.slice(0, matchPos));
        const part2 = cleanSegment(seg.slice(matchPos));
        if (isActionSegment(part1)) subSegments.push(part1);
        if (isActionSegment(part2)) subSegments.push(part2);
        continue;
      }
    }
    subSegments.push(seg);
  }

  rawSegments = subSegments.filter(isActionSegment);

  if (rawSegments.length <= 1) {
    return [trimmed];
  }

  // Verify that there are at least two distinct action segments
  const actionCount = rawSegments.filter(s => hasActionKeyword(s)).length;
  if (actionCount >= 2) {
    return rawSegments;
  }

  return [trimmed];
}

function hasActionKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  const keywords = [
    'bought', 'buy', 'purchased', 'purchase', 'khareeda', 'kharida', 'khareede', 'liya', 'laya', 'add stock',
    'sold', 'sell', 'becha', 'behca', 'beche', 'bech', 'bika', 'bike',
    'stock', 'kitne', 'baaki', 'remaining',
    'invoice', 'bill', 'receipt', 'generate', 'banao', 'create', 'give', 'show', 'print'
  ];
  return keywords.some(k => lower.includes(k));
}

function fallbackClassify(input: string): ClassificationResult {
  const lower = input.toLowerCase();
  const saleWords = ['sold', 'becha', 'behca', 'beche', 'bech', 'sale', 'sold out', 'gaya', 'sell'];
  const purchaseWords = ['bought', 'purchased', 'purchase', 'khareeda', 'kharida', 'kharid', 'khareede', 'liya', 'order', 'aaya', 'stock add', 'add stock'];
  const stockWords = ['stock', 'how many', 'kitne', 'quantity', 'available', 'baaki', 'remaining', 'check'];
  const invoiceWords = ['invoice', 'bill', 'receipt', 'generate invoice', 'bill banao', 'invoice banao'];

  if (saleWords.some(w => lower.includes(w))) {
    return { intent: 'record_sale', confidence: 0.7, reasoning: 'Rule-based: sale keyword detected' };
  }
  if (purchaseWords.some(w => lower.includes(w))) {
    return { intent: 'record_purchase', confidence: 0.7, reasoning: 'Rule-based: purchase keyword detected' };
  }
  if (stockWords.some(w => lower.includes(w))) {
    return { intent: 'check_stock', confidence: 0.7, reasoning: 'Rule-based: stock keyword detected' };
  }
  if (invoiceWords.some(w => lower.includes(w))) {
    return { intent: 'generate_invoice', confidence: 0.7, reasoning: 'Rule-based: invoice keyword detected' };
  }

  return { intent: 'unknown', confidence: 0.3, reasoning: 'No matching intent found' };
}

