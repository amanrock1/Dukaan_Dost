import { llmChat } from './ai-sdk';
import { db } from './db';

export interface ExtractedEntities {
  productName: string | null;
  quantity: number | null;
  unitPrice: number | null;
  amount: number | null;
  missingFields: string[];
}

const EXTRACTION_PROMPT = `You are an entity extractor for an Indian retail inventory management system. The user types in Hindi or English.

Extract these entities from the input:
- productName: The product name (e.g., "laptop", "keyboard", "medicine")
- quantity: Number of items (integer)
- unitPrice: Price per single unit (in INR, number)
- amount: Total amount (quantity × unitPrice). If both quantity and unitPrice are given, compute it. If only total is given, try to figure out unitPrice.

Rules:
- INR amounts may be written as 40000, 40,000, ₹40000, Rs 40000, or in Hindi (chaalis hazar)
- If quantity is missing, set to 1
- If unitPrice is missing but amount is given and quantity is known, compute unitPrice = amount / quantity
- If the user says "sold for X each" or "sold at X each", X is the unitPrice
- If the user says "sold for X total" or "sold for X", X might be the total amount
- Set missingFields to list any fields you could NOT determine

Respond in JSON format only:
{"productName": "<name or null>", "quantity": <number or null>, "unitPrice": <number or null>, "amount": <number or null>, "missingFields": ["<field names>"]}`;

export async function extractEntities(userInput: string, intent: string): Promise<ExtractedEntities> {
  try {
    const intentContext = `The user's intent is: ${intent}. ${intent === 'record_sale' ? 'They are recording a SALE (items going out).' : intent === 'record_purchase' ? 'They are recording a PURCHASE (items coming in).' : 'They are checking stock or generating an invoice.'}`;

    const response = await llmChat({
      model: 'groq-llama3.3-70b',
      messages: [
        { role: 'system', content: EXTRACTION_PROMPT },
        { role: 'user', content: `${intentContext}\n\nUser input: ${userInput}` }
      ],
      temperature: 0.1,
    });

    const content = typeof response === 'string' ? response : response?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      let { productName, quantity, unitPrice, amount, missingFields } = parsed;

      // Compute derived values
      if (quantity && unitPrice && !amount) {
        amount = quantity * unitPrice;
      }
      if (quantity && amount && !unitPrice) {
        unitPrice = Math.round(amount / quantity);
      }
      if (!quantity) {
        quantity = 1;
        missingFields = (missingFields || []).filter((f: string) => f !== 'quantity');
      }

      return { productName: productName || null, quantity, unitPrice, amount, missingFields: missingFields || [] };
    }
    return { productName: null, quantity: null, unitPrice: null, amount: null, missingFields: ['all'] };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Entity extraction error:', msg);
    return fallbackExtract(userInput);
  }
}

function fallbackExtract(input: string): ExtractedEntities {
  const lower = input.toLowerCase();
  const quantityMatch = input.match(/(\d+)\s*(laptops?|keyboards?|monitors?|headphones?|printers?|mice|mouse|notebooks?|pens?|shoes?|pairs?|medicines?|sanitizers?|bottles?|cables?|usb|routers?|bags?|drives?|flash|strips?)/i);
  const priceMatch = input.match(/(\d[\d,]*)/g);
  
  let quantity: number | null = null;
  let unitPrice: number | null = null;
  let productName: string | null = null;

  if (quantityMatch) {
    quantity = parseInt(quantityMatch[1]);
    productName = quantityMatch[2].replace(/s$/, '');
  }

  if (priceMatch) {
    const prices = priceMatch.map(p => parseInt(p.replace(/,/g, ''))).filter(p => p > 0 && p !== quantity);
    if (prices.length > 0) {
      const maxPrice = Math.max(...prices);
      if (quantity && maxPrice > quantity * 100) {
        unitPrice = maxPrice;
      } else if (prices.length >= 1) {
        unitPrice = prices[0];
      }
    }
  }

  const missingFields: string[] = [];
  if (!productName) missingFields.push('productName');
  if (!unitPrice && !quantity) missingFields.push('quantity');

  return { productName, quantity, unitPrice, amount: null, missingFields };
}

export async function findMatchingProduct(productName: string | null): Promise<{ id: string; name: string; unitPrice: number; gstRate: number; currentStock: number } | null> {
  if (!productName) return null;

  const products = await db.product.findMany();
  
  // Exact match first
  const exact = products.find(p => p.name.toLowerCase() === productName.toLowerCase());
  if (exact) return { id: exact.id, name: exact.name, unitPrice: exact.unitPrice, gstRate: exact.gstRate, currentStock: exact.currentStock };

  // Partial match
  const partial = products.find(p => 
    p.name.toLowerCase().includes(productName.toLowerCase()) || 
    productName.toLowerCase().includes(p.name.toLowerCase())
  );
  if (partial) return { id: partial.id, name: partial.name, unitPrice: partial.unitPrice, gstRate: partial.gstRate, currentStock: partial.currentStock };

  // Word overlap match
  const inputWords = productName.toLowerCase().split(/\s+/);
  let bestMatch: typeof products[0] | null = null;
  let bestScore = 0;
  for (const p of products) {
    const nameWords = p.name.toLowerCase().split(/\s+/);
    const score = inputWords.filter(w => nameWords.some(nw => nw.includes(w) || w.includes(nw))).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = p;
    }
  }
  if (bestMatch && bestScore > 0) {
    return { id: bestMatch.id, name: bestMatch.name, unitPrice: bestMatch.unitPrice, gstRate: bestMatch.gstRate, currentStock: bestMatch.currentStock };
  }

  return null;
}
