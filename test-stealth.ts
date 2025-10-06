/**
 * Test puppeteer-extra-plugin-stealth
 * This test verifies that stealth mode is working properly
 */

import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Add stealth plugin
puppeteerExtra.use(StealthPlugin());

async function testStealth() {
  console.log('🧪 Testing Puppeteer Stealth Plugin\n');

  const browser = await puppeteerExtra.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Navigate to a bot detection test site
  console.log('Navigating to bot detection test...');
  await page.goto('https://bot.sannysoft.com/', {
    waitUntil: 'networkidle0',
    timeout: 30000
  });

  // Wait for page to load
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Check for common bot detection indicators
  const detectionResults = await page.evaluate(() => {
    return {
      webdriver: navigator.webdriver,
      plugins: navigator.plugins.length,
      languages: navigator.languages,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency,
      hasChrome: !!(window as any).chrome,
      hasPermissions: !!(navigator as any).permissions,
    };
  });

  console.log('\n📊 Detection Results:');
  console.log(JSON.stringify(detectionResults, null, 2));

  // Take screenshot
  await page.screenshot({ path: './screenshots/stealth-test.png' });
  console.log('\n📸 Screenshot saved to: screenshots/stealth-test.png');

  // Check if webdriver is hidden
  if (detectionResults.webdriver === false || detectionResults.webdriver === undefined) {
    console.log('\n✅ Stealth mode is working! navigator.webdriver is hidden');
  } else {
    console.log('\n❌ Warning: navigator.webdriver is still exposed');
  }

  await browser.close();
}

testStealth().catch(console.error);
