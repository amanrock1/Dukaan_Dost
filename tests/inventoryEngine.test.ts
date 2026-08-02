import { checkStock } from '../src/lib/inventoryEngine';

async function testInventoryEngine() {
  console.log('--- Testing Inventory Engine ---');

  const stockSummary = await checkStock();
  console.log('Stock Summary Success:', stockSummary.success);
  console.log('Stock Message:\n', stockSummary.message);

  const singleStock = await checkStock('laptop');
  console.log('\nLaptop Stock Check:', singleStock);
}

testInventoryEngine().catch(console.error);
