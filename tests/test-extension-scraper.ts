/**
 * Test ExtensionScraper
 * Run: bun tests/test-extension-scraper.ts
 */

import { ExtensionScraper } from '../src/scrapers/ExtensionScraper';
import path from 'path';

async function testExtensionScraper() {
  console.log('🧪 Testing ExtensionScraper\n');

  // Path to reCAPTCHA solver extension
  const extensionPath = path.resolve(process.cwd(), 'extensions/solver');
  console.log(`Extension path: ${extensionPath}\n`);

  // Create scraper with extension
  const scraper = new ExtensionScraper({
    headless: false, // Required for extensions
    timeout: 30000,
    extensionPath: extensionPath,
    waitForExtension: true,
    extensionTimeout: 10000,
  });

  try {
    console.log('Starting scraper with extension...\n');

    // Execute scraping
    const result = await scraper.execute({
      url: 'https://www.google.com/recaptcha/api2/demo',
    });

    console.log('\n📊 Scraping Result:');
    console.log(JSON.stringify(result, null, 2));

    // Verify extension loaded
    if (result.data?.extensionLoaded) {
      console.log('\n✅ Extension loaded successfully!');
      console.log(`   Extension ID: ${result.data.extensionId}`);

      if (result.data.contentScriptInjected) {
        console.log('✅ Content script injected on page');
      } else {
        console.log('ℹ️  Content script not detected (may not be required for this page)');
      }
    } else {
      console.log('\n❌ Extension failed to load');
    }

    // Test extension evaluation (if available)
    if (result.data?.extensionLoaded) {
      console.log('\n🔧 Testing extension context evaluation...');

      try {
        const extensionManager = (scraper as any).extensionManager;
        if (extensionManager) {
          const extensionContext = await extensionManager.evaluate(() => {
            return {
              hasChrome: typeof chrome !== 'undefined',
              hasRuntime: typeof chrome?.runtime !== 'undefined',
              extensionURL: chrome?.runtime?.getURL?.('') || 'N/A',
            };
          });

          console.log('✅ Extension context:');
          console.log(JSON.stringify(extensionContext, null, 2));
        }
      } catch (error) {
        console.log('⚠️  Extension evaluation not available');
      }
    }

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

testExtensionScraper().catch(console.error);
