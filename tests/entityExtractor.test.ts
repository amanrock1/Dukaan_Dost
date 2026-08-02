import { extractEntities } from '../src/lib/entityExtractor';

async function testEntityExtraction() {
  console.log('--- Testing Entity Extractor ---');
  
  const testInputs = [
    { input: '5 laptops sold for 40000 each', intent: 'record_sale' },
    { input: 'bought 20 notebooks at 50 rupees', intent: 'record_purchase' },
    { input: 'sold 3 wireless mouse for 750 each', intent: 'record_sale' }
  ];

  for (const item of testInputs) {
    const res = await extractEntities(item.input, item.intent);
    console.log(`Input: "${item.input}"`);
    console.log(`Extracted:`, res);
    console.log('-----------------------------------');
  }
}

testEntityExtraction().catch(console.error);
