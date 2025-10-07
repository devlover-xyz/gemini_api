/**
 * Test Chrome Extension Loader
 * Run: bun tests/test-extension-loader.ts
 */

import puppeteer from 'puppeteer';
import { ExtensionManager } from '../src/utils/extension-loader';
import path from 'path';

async function testExtensionLoader() {
  console.log('🧪 Testing Chrome Extension Loader\n');

  // Path to your extension (update this to your extension path)
  const extensionPath = path.resolve(process.cwd(), 'extensions/solver');
  console.log(`Extension path: ${extensionPath}\n`);

  // Launch browser with extension
  const launchArgs = ExtensionManager.getLaunchArgs(extensionPath);

  console.log('Launching browser with extension...');
  const browser = await puppeteer.launch({
    headless: false, // Extensions require headless: false
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      ...launchArgs,
    ],
  });

  console.log('✅ Browser launched\n');

  // Wait for extension to load
  const extensionManager = new ExtensionManager();

  try {
    console.log('Waiting for extension to load...');
    const extensionInfo = await extensionManager.waitForExtension(browser, {
      path: extensionPath,
      waitForReady: true,
      timeout: 10000,
    });

    console.log('\n✅ Extension loaded successfully!');
    console.log(`   ID: ${extensionInfo.id}`);
    console.log(`   Manifest Version: ${extensionInfo.manifestVersion}`);

    // Test extension evaluation
    console.log('\nTesting extension context evaluation...');
    try {
      const result = await extensionManager.evaluate(() => {
        return {
          hasChrome: typeof chrome !== 'undefined',
          hasRuntime: typeof chrome?.runtime !== 'undefined',
          extensionId: chrome?.runtime?.id || 'unknown',
        };
      });

      console.log('✅ Extension context evaluation result:');
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.log('⚠️  Extension evaluation failed (normal for some extensions)');
    }

    // Open a test page to check content script injection
    console.log('\nOpening test page...');
    const page = await browser.newPage();
    await page.goto('https://example.com', { waitUntil: 'networkidle2' });
    console.log('✅ Test page loaded');

    // Wait a bit for content script to inject
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Check if content script is injected
    const hasContentScript = await extensionManager.isContentScriptInjected(page);
    if (hasContentScript) {
      console.log('✅ Content script is injected');
    } else {
      console.log('ℹ️  No content script detected (normal if extension doesn\'t inject on this page)');
    }

    // Keep browser open for inspection
    console.log('\n🔍 Keeping browser open for 5 seconds for inspection...');
    await new Promise((resolve) => setTimeout(resolve, 5000));

    await browser.close();
    console.log('\n✅ Test completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error(error);
    await browser.close();
    process.exit(1);
  }
}

testExtensionLoader().catch(console.error);
