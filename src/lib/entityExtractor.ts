import { llmChat } from './ai-sdk';
import { db } from './db';

export interface ExtractedEntities {
  productName: string | null;
  quantity: number | null;
  unitPrice: number | null;
  amount: number | null;
  customerName: string | null;
  supplier: string | null;
  missingFields: string[];
}

const EXTRACTION_PROMPT = `You are an entity extractor for an Indian retail inventory management system. The user types in Hindi or English.

Extract these entities from the input:
- productName: The product name (e.g., "laptop", "keyboard", "medicine")
- quantity: Number of items (integer)
- unitPrice: Price per single unit (in INR, number)
- amount: Total amount (quantity × unitPrice). If both quantity and unitPrice are given, compute it. If only total is given, try to figure out unitPrice.
- customerName: The customer buying the product (if recording a sale, e.g., "sold 5 laptops to Aman" -> "Aman", "Rohan ko becha" -> "Rohan")
- supplier: The supplier selling the product (if recording a purchase, e.g., "bought from Sharma Distributors" -> "Sharma Distributors", "Raj supplier se liya" -> "Raj")

Rules:
- INR amounts may be written as 40000, 40,000, ₹40000, Rs 40000, or in Hindi (chaalis hazar)
- If quantity is missing, set to null (so we can ask for clarification if needed)
- If unitPrice is missing but amount is given and quantity is known, compute unitPrice = amount / quantity
- If the user says "sold for X each" or "sold at X each", X is the unitPrice
- If the user says "sold for X total" or "sold for X", X might be the total amount
- Set missingFields to list any fields you could NOT determine (from: productName, quantity, unitPrice)

Respond in JSON format only:
{"productName": "<name or null>", "quantity": <number or null>, "unitPrice": <number or null>, "amount": <number or null>, "customerName": "<name or null>", "supplier": "<name or null>", "missingFields": ["<field names>"]}`;

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
      let { productName, quantity, unitPrice, amount, customerName, supplier, missingFields } = parsed;

      // Compute derived values
      if (quantity && unitPrice && !amount) {
        amount = quantity * unitPrice;
      }
      if (quantity && amount && !unitPrice) {
        unitPrice = Math.round(amount / quantity);
      }

      const missing: string[] = [];
      if (!productName) missing.push('productName');
      if (quantity === null || quantity === undefined) missing.push('quantity');
      if (unitPrice === null || unitPrice === undefined) missing.push('unitPrice');

      return { 
        productName: productName || null, 
        quantity: quantity || null, 
        unitPrice: unitPrice || null, 
        amount: amount || null, 
        customerName: customerName || null,
        supplier: supplier || null,
        missingFields: missing 
      };
    }
    return { productName: null, quantity: null, unitPrice: null, amount: null, customerName: null, supplier: null, missingFields: ['productName', 'quantity', 'unitPrice'] };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Entity extraction error:', msg);
    return fallbackExtract(userInput);
  }
}

export async function mergeContext(previousEntities: ExtractedEntities, newInput: string, intent: string): Promise<ExtractedEntities> {
  try {
    const mergePrompt = `You are an AI assistant helping to complete an inventory command.
The user previously tried to record a transaction with intent: ${intent}.
We had extracted the following entities so far:
${JSON.stringify(previousEntities, null, 2)}

The user has now provided additional information in response to a clarification: "${newInput}"

Extract the missing fields (productName, quantity, unitPrice, customerName, supplier) from this new input and merge them with the previously extracted entities.
Return the complete, fully merged entities object in JSON format.

Respond in JSON format only matching this schema:
{"productName": "<name or null>", "quantity": <number or null>, "unitPrice": <number or null>, "amount": <number or null>, "customerName": "<name or null>", "supplier": "<name or null>", "missingFields": ["<field names>"]}`;

    const response = await llmChat({
      model: 'groq-llama3.3-70b',
      messages: [
        { role: 'system', content: mergePrompt },
        { role: 'user', content: `New Input: ${newInput}` }
      ],
      temperature: 0.1,
    });

    const content = typeof response === 'string' ? response : response?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      let { productName, quantity, unitPrice, amount, customerName, supplier } = parsed;

      // Compute derived values
      if (quantity && unitPrice && !amount) {
        amount = quantity * unitPrice;
      }
      if (quantity && amount && !unitPrice) {
        unitPrice = Math.round(amount / quantity);
      }

      const missing: string[] = [];
      if (!productName) missing.push('productName');
      if (quantity === null || quantity === undefined) missing.push('quantity');
      if (unitPrice === null || unitPrice === undefined) missing.push('unitPrice');

      return { 
        productName: productName || null, 
        quantity: quantity || null, 
        unitPrice: unitPrice || null, 
        amount: amount || null, 
        customerName: customerName || null,
        supplier: supplier || null,
        missingFields: missing 
      };
    }
    return previousEntities;
  } catch (error) {
    console.error('Error merging context:', error);
    return previousEntities;
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
  if (!quantity) missingFields.push('quantity');
  if (!unitPrice) missingFields.push('unitPrice');

  return { productName, quantity, unitPrice, amount: null, customerName: null, supplier: null, missingFields };
}

export async function findMatchingProduct(productName: string | null, shopId?: string | null): Promise<{ id: string; name: string; unitPrice: number; gstRate: number; currentStock: number; lowStockThreshold: number } | null> {
  if (!productName || !productName.trim()) return null;
  const resolvedShopId = shopId && shopId.trim() !== '' ? shopId : null;

  const products = await db.product.findMany({
    where: resolvedShopId ? { shopId: resolvedShopId } : { shopId: null }
  });

  if (products.length === 0) return null;

  const cleanInput = productName.trim().toLowerCase();

  // 1. Exact match (case-insensitive)
  const exact = products.find(p => p.name.trim().toLowerCase() === cleanInput);
  if (exact) return { id: exact.id, name: exact.name, unitPrice: exact.unitPrice, gstRate: exact.gstRate, currentStock: exact.currentStock, lowStockThreshold: exact.lowStockThreshold };

  // Generic category words that shouldn't be the sole reason for matching different products
  const genericWords = new Set([
    'laptop', 'laptops', 'phone', 'phones', 'mobile', 'mobiles', 'keyboard', 'keyboards', 
    'mouse', 'mice', 'monitor', 'monitors', 'headphone', 'headphones', 'earphone', 'earphones',
    'notebook', 'notebooks', 'pen', 'pens', 'pencil', 'pencils', 'shoe', 'shoes', 'boot', 'boots',
    'tablet', 'tablets', 'medicine', 'medicines', 'light', 'lights', 'bulb', 'bulbs', 'packet', 'packets',
    'piece', 'pieces', 'pcs', 'item', 'items', 'product', 'products', 'unit', 'units'
  ]);

  // Extract significant (non-generic) words from input
  const inputWords = cleanInput.split(/\s+/).filter(w => w.length > 1);
  const significantInputWords = inputWords.filter(w => !genericWords.has(w));

  // 2. Substring & Brand Matching
  for (const p of products) {
    const candidateLower = p.name.trim().toLowerCase();
    const candidateWords = candidateLower.split(/\s+/).filter(w => w.length > 1);
    const significantCandidateWords = candidateWords.filter(w => !genericWords.has(w));

    // Check if input is substring of candidate or candidate is substring of input
    if (candidateLower.includes(cleanInput) || cleanInput.includes(candidateLower)) {
      // Ensure all significant input words exist in candidate
      const hasConflict = significantInputWords.some(w => !candidateLower.includes(w));
      if (!hasConflict) {
        return { id: p.id, name: p.name, unitPrice: p.unitPrice, gstRate: p.gstRate, currentStock: p.currentStock, lowStockThreshold: p.lowStockThreshold };
      }
    }

    // Check if ALL significant words in input match candidate
    if (significantInputWords.length > 0) {
      const allSignificantMatch = significantInputWords.every(w => candidateLower.includes(w));
      const noCandidateConflict = significantCandidateWords.every(w => cleanInput.includes(w));
      if (allSignificantMatch && noCandidateConflict) {
        return { id: p.id, name: p.name, unitPrice: p.unitPrice, gstRate: p.gstRate, currentStock: p.currentStock, lowStockThreshold: p.lowStockThreshold };
      }
    }
  }

  // 3. Fallback for queries containing ONLY generic category words (e.g. "check stock of laptop")
  if (significantInputWords.length === 0) {
    const match = products.find(p => {
      const pLower = p.name.toLowerCase();
      return inputWords.some(w => pLower.includes(w));
    });
    if (match) {
      return { id: match.id, name: match.name, unitPrice: match.unitPrice, gstRate: match.gstRate, currentStock: match.currentStock, lowStockThreshold: match.lowStockThreshold };
    }
  }

  return null;
}

