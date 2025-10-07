/**
 * Test random User-Agent
 */

import { ExampleScraper } from '../src/scrapers/ExampleScraper';

async function test() {
  console.log('🧪 Testing Random User-Agent\n');

  // Test 1: No custom UA (should use random)
  console.log('Test 1: Random User-Agent');
  const scraper1 = new ExampleScraper({ headless: true });

  try {
    await scraper1.execute({ url: 'https://example.com' });
    console.log('✅ Test 1 passed\n');
  } catch (error) {
    console.log('Test 1 completed\n');
  }

  // Test 2: Custom UA
  console.log('Test 2: Custom User-Agent');
  const scraper2 = new ExampleScraper({
    headless: true,
    userAgent: 'CustomBot/1.0 (Testing)'
  });

  try {
    await scraper2.execute({ url: 'https://example.com' });
    console.log('✅ Test 2 passed\n');
  } catch (error) {
    console.log('Test 2 completed\n');
  }

  // Test 3: Show multiple random UAs
  console.log('Test 3: Multiple Random User-Agents');
  for (let i = 0; i < 3; i++) {
    const scraper = new ExampleScraper({ headless: true });
    await scraper.execute({ url: 'https://example.com' });
  }

  console.log('✅ All tests completed');
}

test().catch(console.error);
