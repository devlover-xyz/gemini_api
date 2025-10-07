/**
 * Test Google Search with manual reCAPTCHA solver
 */

import { GoogleSearchScraper } from '../src/scrapers/GoogleSearchScraper';

async function test() {
  console.log('🧪 Testing Google Search with manual reCAPTCHA solver\n');

  const scraper = new GoogleSearchScraper({
    headless: false, // Must be false for manual solving
    timeout: 60000,
    recaptcha: {
      enabled: true,
      provider: 'manual',
      timeout: 120000 // 2 minutes to solve manually
    }
  });

  try {
    console.log('Starting Google Search scraper...');
    console.log('If reCAPTCHA appears, solve it manually in the browser\n');

    const result = await scraper.execute({
      query: 'bun javascript',
      limit: 5
    });

    console.log('\n📊 Result:');
    console.log(JSON.stringify(result, null, 2));

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

test();
