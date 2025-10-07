/**
 * Simple Google Search test (may fail if blocked)
 * This is just to test the basic functionality
 */

import { GoogleSearchScraper } from '../src/scrapers/GoogleSearchScraper';

async function test() {
  console.log('🧪 Testing Google Search (basic test)\n');
  console.log('⚠️  This may fail if Google shows reCAPTCHA\n');

  const scraper = new GoogleSearchScraper({
    headless: true,
    timeout: 30000
  });

  try {
    const result = await scraper.execute({
      query: 'example test',
      limit: 3
    });

    if (result.success) {
      console.log('\n✅ Success! Results:');
      console.log(JSON.stringify(result.data, null, 2));
    } else {
      console.log('\n❌ Failed:', result.error);
    }

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    if (error instanceof Error && error.message.includes('reCAPTCHA')) {
      console.error('\n❌ Google blocked with reCAPTCHA');
      console.log('\nTo solve this, use one of these methods:');
      console.log('1. Manual solving: bun test-google-with-solver.ts');
      console.log('2. API with manual solver:');
      console.log(`   curl -X POST http://localhost:3000/api/scrape/google-search \\
     -H "Content-Type: application/json" \\
     -d '{
       "params": {"query": "test", "limit": 5},
       "config": {
         "headless": false,
         "recaptcha": {
           "enabled": true,
           "provider": "manual",
           "timeout": 120000
         }
       }
     }'`);
    } else {
      console.error('\n❌ Error:', error);
    }
    process.exit(1);
  }
}

test();
