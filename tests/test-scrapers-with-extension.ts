/**
 * Test that google-search and recaptcha-test scrapers load Chrome extension
 */

import { GoogleSearchScraper } from '../src/scrapers/GoogleSearchScraper';
import { RecaptchaTestScraper, GoogleRecaptchaDemoScraper } from '../src/scrapers/RecaptchaTestScraper';

async function testGoogleSearchScraperWithExtension() {
  console.log('\n=== Testing GoogleSearchScraper with Extension ===\n');

  const scraper = new GoogleSearchScraper({
    headless: false,
    timeout: 30000,
  });

  try {
    const result = await scraper.execute({
      query: 'bun javascript',
      limit: 3,
    });

    console.log('✅ GoogleSearchScraper test completed');
    console.log('Success:', result.success);
    console.log('Duration:', result.duration, 'ms');

    if (result.success && result.data) {
      console.log('Results found:', result.data.totalResults);
    }
  } catch (error) {
    console.error('❌ GoogleSearchScraper test failed:', error);
  }
}

async function testRecaptchaTestScraperWithExtension() {
  console.log('\n=== Testing RecaptchaTestScraper with Extension ===\n');

  const scraper = new RecaptchaTestScraper({
    headless: false,
    timeout: 30000,
  });

  try {
    const result = await scraper.execute({
      url: 'https://www.google.com/recaptcha/api2/demo',
    });

    console.log('✅ RecaptchaTestScraper test completed');
    console.log('Success:', result.success);
    console.log('Duration:', result.duration, 'ms');

    if (result.success && result.data) {
      console.log('Had reCAPTCHA:', result.data.hadRecaptcha);
      console.log('Solved:', result.data.solved);
    }
  } catch (error) {
    console.error('❌ RecaptchaTestScraper test failed:', error);
  }
}

async function testGoogleRecaptchaDemoScraperWithExtension() {
  console.log('\n=== Testing GoogleRecaptchaDemoScraper with Extension ===\n');

  const scraper = new GoogleRecaptchaDemoScraper({
    headless: false,
    timeout: 30000,
  });

  try {
    const result = await scraper.execute({});

    console.log('✅ GoogleRecaptchaDemoScraper test completed');
    console.log('Success:', result.success);
    console.log('Duration:', result.duration, 'ms');

    if (result.success && result.data) {
      console.log('Detected:', result.data.detected);
      console.log('Solved:', result.data.solved);
    }
  } catch (error) {
    console.error('❌ GoogleRecaptchaDemoScraper test failed:', error);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Testing scrapers with Chrome extension from extensions/solver\n');
  console.log('📝 Note: This test will open browser windows (headless: false)');
  console.log('📝 Watch the console for extension loading messages\n');

  await testGoogleRecaptchaDemoScraperWithExtension();

  // Uncomment to test other scrapers
  // await testGoogleSearchScraperWithExtension();
  // await testRecaptchaTestScraperWithExtension();

  console.log('\n✅ All tests completed!');
  process.exit(0);
}

runTests();
