import { splitMultiActionCommand } from '../src/lib/intentClassifier';

async function testMultiIntent() {
  console.log('--- Testing Multi-Intent / Compound Command Parser ---');

  const testInputs = [
    'i bought 15 lights for 1500 each AND sold 2 lights fro 2000 each',
    'bought 10 notebooks at 50 rupees and sold 3 notebooks at 80 rupees and generate invoice',
    'khareeda 20 pens 10 me, becha 5 pens 20 me',
    'check stock of keyboard',
  ];

  for (const input of testInputs) {
    const segments = await splitMultiActionCommand(input);
    console.log(`\nOriginal Input: "${input}"`);
    console.log(`Split Segments (${segments.length}):`, segments);
    console.log('----------------------------------------------------');
  }
}

testMultiIntent().catch(console.error);
