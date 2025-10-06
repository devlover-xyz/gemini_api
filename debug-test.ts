/**
 * Debug test - Direct Puppeteer test
 */

import puppeteer from 'puppeteer';

async function debugTest() {
  console.log('🔍 Starting debug test...\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
    defaultViewport: { width: 1920, height: 1080 },
  });

  const page = await browser.newPage();

  // Set user agent
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  // Anti-detection
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
  });

  console.log('Navigating to reCAPTCHA demo...');
  await page.goto('https://www.google.com/recaptcha/api2/demo', {
    waitUntil: 'networkidle0',
    timeout: 30000
  });

  console.log('Page loaded!');

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n🔍 Checking for reCAPTCHA...\n');

  // Try Strategy 1: Wait for iframe
  console.log('Strategy 1: Waiting for iframe...');
  try {
    await page.waitForSelector('iframe[src*="recaptcha"]', {
      timeout: 10000,
      visible: true
    });
    console.log('✅ SUCCESS: iframe found!');
  } catch (error) {
    console.log('❌ FAILED: iframe not found');
  }

  // Try Strategy 2: Wait for grecaptcha
  console.log('\nStrategy 2: Waiting for grecaptcha object...');
  try {
    await page.waitForFunction(
      () => typeof (window as any).grecaptcha !== 'undefined',
      { timeout: 5000 }
    );
    console.log('✅ SUCCESS: grecaptcha found!');
  } catch (error) {
    console.log('❌ FAILED: grecaptcha not found');
  }

  // Strategy 3: DOM check
  console.log('\nStrategy 3: DOM element check...');
  const domCheck = await page.evaluate(() => {
    const recaptchaDiv = document.querySelector('.g-recaptcha');
    const recaptchaIframe = document.querySelector('iframe[src*="recaptcha/api2/anchor"]');
    const recaptchaFrame = document.querySelector('iframe[title*="reCAPTCHA"]');
    const hasGrecaptcha = typeof (window as any).grecaptcha !== 'undefined';

    return {
      recaptchaDiv: !!recaptchaDiv,
      recaptchaIframe: !!recaptchaIframe,
      recaptchaFrame: !!recaptchaFrame,
      hasGrecaptcha,
      iframes: Array.from(document.querySelectorAll('iframe')).map(f => ({
        src: f.src,
        title: f.title
      })),
    };
  });

  console.log('DOM Check Results:', JSON.stringify(domCheck, null, 2));

  // Take screenshot
  await page.screenshot({ path: './debug-screenshot.png' });
  console.log('\n📸 Screenshot saved to debug-screenshot.png');

  console.log('\n⏸️  Keeping browser open for 10 seconds...');
  await new Promise(resolve => setTimeout(resolve, 10000));

  await browser.close();
  console.log('\n✅ Test complete!');
}

debugTest().catch(console.error);
