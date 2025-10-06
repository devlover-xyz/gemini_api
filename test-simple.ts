/**
 * Simple test - just detection, no solving
 */

import { GoogleRecaptchaDemoScraper } from './src/scrapers/RecaptchaTestScraper';

async function test() {
  console.log('🧪 Simple reCAPTCHA Detection Test\n');

  const scraper = new GoogleRecaptchaDemoScraper({
    headless: false,
    timeout: 30000,
    // No reCAPTCHA config - just test detection
  });

  try {
    const result = await scraper.execute();

    console.log('\n📊 Result:');
    console.log(JSON.stringify(result, null, 2));

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

test();
