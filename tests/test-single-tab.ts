/**
 * Test script to verify single tab behavior
 * Run: bun tests/test-single-tab.ts
 */

import { GoogleRecaptchaDemoScraper } from '../src/scrapers/RecaptchaTestScraper';

async function testSingleTab() {
  console.log('🧪 Testing Single Tab Behavior...\n');

  const scraper = new GoogleRecaptchaDemoScraper({
    headless: false,
    timeout: 15000,
    recaptcha: {
      enabled: false, // Don't solve, just check tabs
    },
  });

  try {
    console.log('Opening browser...');

    // Access private browser property through any type
    const scraperAny = scraper as any;

    // Initialize browser manually
    await scraperAny.init();

    // Check number of pages
    const pages = await scraperAny.browser.pages();
    console.log(`\n📊 Number of tabs/pages: ${pages.length}`);

    if (pages.length === 1) {
      console.log('✅ SUCCESS: Only 1 tab opened (efficient!)');
    } else {
      console.log(`❌ FAIL: ${pages.length} tabs opened (expected 1)`);
      pages.forEach((page, index) => {
        console.log(`  Tab ${index + 1}: ${page.url()}`);
      });
    }

    // Keep browser open for 3 seconds so you can visually verify
    console.log('\nKeeping browser open for 3 seconds for visual verification...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Cleanup
    await scraperAny.close();

  } catch (error) {
    console.error('\n💥 Test CRASHED!');
    console.error(error);
    process.exit(1);
  }
}

testSingleTab();
