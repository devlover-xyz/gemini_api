/**
 * Test script for reCAPTCHA detection and solving
 * Run: bun tests/test-recaptcha.ts
 */

import { GoogleRecaptchaDemoScraper } from '../src/scrapers/RecaptchaTestScraper';

async function testRecaptcha() {
  console.log('🧪 Testing reCAPTCHA Detection...\n');

  // Test with manual provider (headless false required)
  const scraper = new GoogleRecaptchaDemoScraper({
    headless: false,
    timeout: 60000,
    recaptcha: {
      enabled: true,
      provider: 'manual',
      timeout: 120000,
    },
  });

  try {
    console.log('Starting scraper...');
    const result = await scraper.execute();

    console.log('\n📊 Result:');
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ Test PASSED!');
    } else {
      console.log('\n❌ Test FAILED!');
      console.log('Error:', result.error);
    }
  } catch (error) {
    console.error('\n💥 Test CRASHED!');
    console.error(error);
    process.exit(1);
  }
}

testRecaptcha();
