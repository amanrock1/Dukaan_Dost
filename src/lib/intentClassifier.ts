import { llmChat } from './ai-sdk';

export type Intent = 'record_sale' | 'record_purchase' | 'check_stock' | 'generate_invoice' | 'unknown';

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

Respond in JSON format only:
{"intent": "<intent_name>", "confidence": <0.0-1.0>, "reasoning": "<brief explanation>"}

Examples:
Input: "5 laptops sold for 40000 each" -> {"intent":"record_sale","confidence":0.95,"reasoning":"User reports selling 5 laptops"}
Input: "bought 10 keyboards at 1500" -> {"intent":"record_purchase","confidence":0.95,"reasoning":"User reports buying keyboards"}
Input: "kitne monitors stock mein hain" -> {"intent":"check_stock","confidence":0.9,"reasoning":"User asking about monitor stock in Hindi"}
Input: "invoice banao" -> {"intent":"generate_invoice","confidence":0.9,"reasoning":"User wants to generate an invoice"}`;

export async function classifyIntent(userInput: string): Promise<ClassificationResult> {
  const lower = userInput.toLowerCase();
  
  // High-priority hybrid keyword pre-classification to prevent LLM typo issues
  const saleKeywords = ['\\bsold\\b', '\\bbecha\\b', '\\bbehca\\b', '\\bbeche\\b', '\\bbech\\b', '\\bsale\\b', '\\bsell\\b'];
  const purchaseKeywords = ['\\bbought\\b', '\\bpurchased\\b', '\\bpurchase\\b', '\\bkhareeda\\b', '\\bkharida\\b', '\\bkharid\\b', '\\bkhareede\\b', '\\bliya\\b', '\\blaaya\\b', '\\blaya\\b'];
  const invoiceKeywords = ['\\binvoice\\b', '\\bbill\\b', '\\breceipt\\b'];
  const stockKeywords = ['\\bstock\\b', '\\bkitne\\b', '\\bbaaki\\b', '\\bremaining\\b'];

  if (saleKeywords.some(pattern => new RegExp(pattern, 'i').test(lower))) {
    return { intent: 'record_sale', confidence: 0.95, reasoning: 'Hybrid: Sale keyword detected in user input' };
  }
  if (purchaseKeywords.some(pattern => new RegExp(pattern, 'i').test(lower))) {
    return { intent: 'record_purchase', confidence: 0.95, reasoning: 'Hybrid: Purchase keyword detected in user input' };
  }
  if (invoiceKeywords.some(pattern => new RegExp(pattern, 'i').test(lower))) {
    return { intent: 'generate_invoice', confidence: 0.95, reasoning: 'Hybrid: Invoice keyword detected in user input' };
  }
  if (stockKeywords.some(pattern => new RegExp(pattern, 'i').test(lower))) {
    return { intent: 'check_stock', confidence: 0.95, reasoning: 'Hybrid: Stock check keyword detected in user input' };
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
