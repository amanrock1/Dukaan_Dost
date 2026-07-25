import { llmChat } from 'z-ai-web-dev-sdk';

export type Intent = 'record_sale' | 'record_purchase' | 'check_stock' | 'generate_invoice' | 'unknown';

interface ClassificationResult {
  intent: Intent;
  confidence: number;
  reasoning: string;
}

const INTENT_PROMPT = `You are an intent classifier for an Indian retail inventory management system. The user types in Hindi or English.

Classify the input into EXACTLY ONE of these intents:
- record_sale: User wants to record that items were SOLD (e.g., "5 laptops sold", "becha 3 keyboards", "sale of 2 monitors")
- record_purchase: User wants to record that items were PURCHASED/BOUGHT (e.g., "bought 10 notebooks", "purchase 5 headphones", "khareeda 20 pens")
- check_stock: User wants to CHECK current stock levels (e.g., "how many laptops", "stock of keyboard", "kitne monitors hai")
- generate_invoice: User wants to GENERATE an invoice for a sale (e.g., "generate invoice", "bill banao", "invoice for last sale")

Respond in JSON format only:
{"intent": "<intent_name>", "confidence": <0.0-1.0>, "reasoning": "<brief explanation>"}

Examples:
Input: "5 laptops sold for 40000 each" -> {"intent":"record_sale","confidence":0.95,"reasoning":"User reports selling 5 laptops"}
Input: "bought 10 keyboards at 1500" -> {"intent":"record_purchase","confidence":0.95,"reasoning":"User reports buying keyboards"}
Input: "kitne monitors stock mein hain" -> {"intent":"check_stock","confidence":0.9,"reasoning":"User asking about monitor stock in Hindi"}
Input: "invoice banao" -> {"intent":"generate_invoice","confidence":0.9,"reasoning":"User wants to generate an invoice"}`;

export async function classifyIntent(userInput: string): Promise<ClassificationResult> {
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
    // Fallback rule-based classification
    return fallbackClassify(userInput);
  }
}

function fallbackClassify(input: string): ClassificationResult {
  const lower = input.toLowerCase();
  const saleWords = ['sold', 'becha', 'sale', 'bech', 'sold out', 'gaya'];
  const purchaseWords = ['bought', 'purchased', 'purchase', 'khareeda', 'liya', 'order', 'aaya', 'stock add', 'add stock'];
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
