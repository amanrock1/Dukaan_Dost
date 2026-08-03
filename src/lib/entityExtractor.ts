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

export function fallbackExtract(input: string): ExtractedEntities {
  const cleanInput = input
    .replace(/^(?:then|and|so|now|please)\s+/i, '')
    .replace(/\s*(?:update|update karo|update stock|please|karo|now)\s*$/i, '')
    .trim();

  let quantity: number | null = null;
  let unitPrice: number | null = null;
  let productName: string | null = null;

  // 1. Extract quantity and product name dynamically (e.g. "3 jbl speaker", "50 dairy milk", "10 keyboards")
  const qProdMatch = cleanInput.match(/(\d+)\s+([a-zA-Z0-9\s\-_]+?)(?:\s+(?:for|at|@|price|rs|rupees|inr|each|per|becha|sold|bought|khareeda|behca|beche|\d+|$))/i);
  if (qProdMatch) {
    quantity = parseInt(qProdMatch[1], 10);
    let pName = qProdMatch[2].trim();
    pName = pName.replace(/^(?:bought|purchased|khareeda|kharida|sold|becha|behca|beche|check|stock of)\s+/i, '');
    pName = pName.replace(/\s+(?:for|at|each|per)$/i, '').trim();
    if (pName.length > 1) {
      productName = pName;
    }
  }

  if (!productName) {
    const listMatch = cleanInput.match(/(\d+)\s*(laptops?|keyboards?|monitors?|headphones?|speakers?|printers?|mice|mouse|notebooks?|pens?|shoes?|pairs?|medicines?|sanitizers?|bottles?|cables?|usb|routers?|bags?|drives?|flash|strips?)/i);
    if (listMatch) {
      quantity = parseInt(listMatch[1], 10);
      productName = listMatch[2].replace(/s$/, '');
    }
  }

  // 2. Extract unit price from input
  const numbers = cleanInput.match(/\d[\d,]*/g)?.map(n => parseInt(n.replace(/,/g, ''), 10)) || [];
  const validPrices = numbers.filter(n => n !== quantity && n > 0);
  if (validPrices.length > 0) {
    unitPrice = validPrices[0];
  }

  const missingFields: string[] = [];
  if (!productName) missingFields.push('productName');
  if (quantity === null) missingFields.push('quantity');
  if (unitPrice === null) missingFields.push('unitPrice');

  return {
    productName,
    quantity,
    unitPrice,
    amount: (quantity && unitPrice) ? quantity * unitPrice : null,
    customerName: null,
    supplier: null,
    missingFields
  };
}

export async function findMatchingProduct(productName: string | null, shopId?: string | null): Promise<{ id: string; name: string; unitPrice: number; gstRate: number; currentStock: number; lowStockThreshold: number } | null> {
  if (!productName || !productName.trim()) return null;
  const resolvedShopId = shopId && shopId.trim() !== '' ? shopId : null;

  const cleanInput = productName
    .trim()
    .toLowerCase()
    .replace(/\s*(?:update|update karo|karo|please|now|each|for)$/i, '')
    .trim();

  const products = await db.product.findMany({
    where: resolvedShopId ? { shopId: resolvedShopId } : { shopId: null }
  });

  if (products.length === 0) return null;

  // 1. Exact match (case-insensitive) or singular/plural match
  const cleanSingular = cleanInput.replace(/s$/, '');
  const exact = products.find(p => {
    const pName = p.name.trim().toLowerCase();
    return pName === cleanInput || pName.replace(/s$/, '') === cleanSingular;
  });
  if (exact) return { id: exact.id, name: exact.name, unitPrice: exact.unitPrice, gstRate: exact.gstRate, currentStock: exact.currentStock, lowStockThreshold: exact.lowStockThreshold };

  // Generic category words that shouldn't be the sole reason for matching different products
  const genericWords = new Set([
    'laptop', 'laptops', 'phone', 'phones', 'mobile', 'mobiles', 'keyboard', 'keyboards', 
    'mouse', 'mice', 'monitor', 'monitors', 'headphone', 'headphones', 'earphone', 'earphones',
    'speaker', 'speakers', 'notebook', 'notebooks', 'pen', 'pens', 'pencil', 'pencils', 'shoe', 'shoes', 'boot', 'boots',
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

