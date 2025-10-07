# Chrome Extensions Support in Puppeteer

Dokumentasi lengkap untuk menggunakan Chrome extensions dengan Puppeteer scraper.

## 📚 Overview

Project ini mendukung loading dan interaksi dengan Chrome extensions, berdasarkan:
- [Puppeteer Chrome Extensions Guide](https://pptr.dev/guides/chrome-extensions)
- Chrome Developer Extensions documentation

## 🎯 Features

- ✅ **Load Chrome Extensions**: Automatically load extensions on browser launch
- ✅ **Manifest V2 & V3**: Support both manifest versions
- ✅ **Extension Manager**: High-level API for extension interaction
- ✅ **Content Scripts**: Detect and interact with injected content scripts
- ✅ **Service Workers**: Access extension service workers (Manifest V3)
- ✅ **Background Pages**: Access background pages (Manifest V2)
- ✅ **Extension Context**: Execute code in extension context

## 📁 Files

```
src/
├── utils/
│   └── extension-loader.ts      # Extension manager and loader
├── scrapers/
│   └── ExtensionScraper.ts      # Example scraper with extension support
tests/
├── test-extension-loader.ts     # Test extension loading
└── test-extension-scraper.ts    # Test ExtensionScraper
```

## 🚀 Quick Start

### 1. Basic Extension Loading

```typescript
import puppeteer from 'puppeteer';
import { ExtensionManager } from './src/utils/extension-loader';
import path from 'path';

const extensionPath = path.resolve(process.cwd(), 'path/to/extension');

// Get launch args
const launchArgs = ExtensionManager.getLaunchArgs(extensionPath);

// Launch browser with extension
const browser = await puppeteer.launch({
  headless: false, // Extensions require headless: false
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    ...launchArgs,
  ],
});

// Wait for extension to load
const extensionManager = new ExtensionManager();
const extensionInfo = await extensionManager.waitForExtension(browser, {
  path: extensionPath,
  timeout: 10000,
});

console.log(`Extension loaded: ${extensionInfo.id}`);
```

### 2. Using ExtensionScraper

```typescript
import { ExtensionScraper } from './src/scrapers/ExtensionScraper';
import path from 'path';

const scraper = new ExtensionScraper({
  headless: false,
  extensionPath: path.resolve(process.cwd(), 'extensions/solver'),
  waitForExtension: true,
});

const result = await scraper.execute({
  url: 'https://example.com',
});

console.log(result);
```

## 🔧 API Reference

### ExtensionManager

#### `static getLaunchArgs(extensionPath: string): string[]`

Get Puppeteer launch arguments for loading extension.

```typescript
const args = ExtensionManager.getLaunchArgs('./my-extension');
// Returns:
// [
//   '--disable-extensions-except=/path/to/my-extension',
//   '--load-extension=/path/to/my-extension'
// ]
```

#### `async waitForExtension(browser, config): Promise<ExtensionInfo>`

Wait for extension to load and get info.

```typescript
const extensionInfo = await manager.waitForExtension(browser, {
  path: './my-extension',
  waitForReady: true,
  timeout: 10000,
});

console.log(extensionInfo.id);           // Extension ID
console.log(extensionInfo.manifestVersion); // 2 or 3
```

#### `async evaluate<T>(pageFunction, ...args): Promise<T>`

Execute code in extension context (service worker or background page).

```typescript
const result = await manager.evaluate(() => {
  return {
    hasChrome: typeof chrome !== 'undefined',
    extensionId: chrome.runtime.id,
  };
});
```

#### `async openPopup(browser): Promise<Page | null>`

Open extension popup and return popup page.

```typescript
const popupPage = await manager.openPopup(browser);
if (popupPage) {
  const title = await popupPage.title();
  console.log('Popup title:', title);
}
```

#### `async isContentScriptInjected(page, checkFunction?): Promise<boolean>`

Check if content script is injected on page.

```typescript
const isInjected = await manager.isContentScriptInjected(page);
console.log('Content script injected:', isInjected);

// Custom check
const isCustomInjected = await manager.isContentScriptInjected(
  page,
  'typeof window.myExtension !== "undefined"'
);
```

### ExtensionScraper

#### Constructor

```typescript
new ExtensionScraper({
  // BaseScraper config
  headless: false,        // Required for extensions
  timeout: 30000,

  // Extension config
  extensionPath: string,  // Required: path to extension
  waitForExtension?: boolean,  // Wait for extension (default: true)
  extensionTimeout?: number,   // Extension timeout (default: 10000)
})
```

#### `getExtensionManager(): ExtensionManager | undefined`

Get extension manager for advanced usage.

```typescript
const manager = scraper.getExtensionManager();
if (manager) {
  const info = manager.getExtensionInfo();
}
```

#### `async evaluateExtension<T>(pageFunction, ...args): Promise<T>`

Execute code in extension context.

```typescript
const result = await scraper.evaluateExtension(() => {
  return chrome.runtime.getManifest();
});
```

## 📖 Examples

### Example 1: Load Extension and Navigate

```typescript
import puppeteer from 'puppeteer';
import { ExtensionManager } from './src/utils/extension-loader';

async function example() {
  const extensionPath = './extensions/solver';
  const args = ExtensionManager.getLaunchArgs(extensionPath);

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', ...args],
  });

  const manager = new ExtensionManager();
  await manager.waitForExtension(browser, { path: extensionPath });

  const page = await browser.newPage();
  await page.goto('https://example.com');

  // Extension content scripts are automatically injected
  await browser.close();
}
```

### Example 2: Interact with Extension

```typescript
import { ExtensionScraper } from './src/scrapers/ExtensionScraper';

async function example() {
  const scraper = new ExtensionScraper({
    headless: false,
    extensionPath: './my-extension',
  });

  const result = await scraper.execute({
    url: 'https://example.com',
  });

  if (result.success && result.data.extensionLoaded) {
    // Execute code in extension context
    const manifest = await scraper.evaluateExtension(() => {
      return chrome.runtime.getManifest();
    });

    console.log('Extension name:', manifest.name);
    console.log('Extension version:', manifest.version);
  }
}
```

### Example 3: Open Extension Popup

```typescript
import puppeteer from 'puppeteer';
import { loadExtension } from './src/utils/extension-loader';

async function example() {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--no-sandbox',
      ...ExtensionManager.getLaunchArgs('./my-extension'),
    ],
  });

  const manager = await loadExtension(browser, {
    path: './my-extension',
  });

  // Open popup
  const popupPage = await manager.openPopup(browser);

  if (popupPage) {
    // Interact with popup
    await popupPage.click('#some-button');

    const text = await popupPage.$eval('#result', el => el.textContent);
    console.log('Popup result:', text);
  }

  await browser.close();
}
```

## 🧪 Testing

### Test Extension Loader

```bash
bun tests/test-extension-loader.ts
```

Expected output:
```
✅ Extension loaded successfully!
   ID: abcdefghijk
   Manifest Version: 3
✅ Extension context evaluation result:
{
  "hasChrome": true,
  "hasRuntime": true,
  "extensionId": "abcdefghijk"
}
```

### Test Extension Scraper

```bash
bun tests/test-extension-scraper.ts
```

Expected output:
```
✅ Extension loaded successfully!
   Extension ID: abcdefghijk
✅ Content script injected on page
✅ Test PASSED!
```

## ⚙️ Configuration

### Manifest V2 vs V3

The extension manager automatically detects manifest version:

**Manifest V2** (background page):
```json
{
  "manifest_version": 2,
  "background": {
    "page": "background.html"
  }
}
```

**Manifest V3** (service worker):
```json
{
  "manifest_version": 3,
  "background": {
    "service_worker": "background.js"
  }
}
```

### Content Scripts

Content scripts are automatically injected when navigating to matching pages:

```json
{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ]
}
```

## 🚨 Important Notes

### 1. Headless Mode

**Extensions require `headless: false`**:

```typescript
// ❌ Won't work
const browser = await puppeteer.launch({
  headless: true, // Extensions don't work in headless mode
  args: [...extensionArgs],
});

// ✅ Correct
const browser = await puppeteer.launch({
  headless: false,
  args: [...extensionArgs],
});
```

### 2. Extension Paths

Extension path must point to directory containing `manifest.json`:

```
my-extension/
├── manifest.json    # Required
├── background.js
├── content.js
└── popup.html
```

```typescript
// ✅ Correct
const extensionPath = './my-extension'; // Points to directory

// ❌ Wrong
const extensionPath = './my-extension/manifest.json'; // Don't point to file
```

### 3. Extension ID

Extension ID is automatically generated by Chrome and changes between sessions in development mode. For production, use a fixed ID:

```json
{
  "key": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..."
}
```

## 🔍 Debugging

### Check if Extension Loaded

```typescript
const pages = await browser.pages();
console.log('Open pages:', pages.map(p => p.url()));

// Look for chrome-extension:// URLs
```

### Access Extension DevTools

When running with `headless: false`, you can access extension DevTools:

1. Open Chrome
2. Go to `chrome://extensions`
3. Enable "Developer mode"
4. Click "Inspect views: background page" or "service worker"

### Log Extension Activity

```typescript
const manager = new ExtensionManager();
await manager.waitForExtension(browser, { path: extensionPath });

// Enable console logging
const extensionInfo = manager.getExtensionInfo();
if (extensionInfo?.backgroundPage) {
  extensionInfo.backgroundPage.on('console', msg => {
    console.log('[Extension]', msg.text());
  });
}
```

## 📚 Resources

- [Puppeteer Chrome Extensions Guide](https://pptr.dev/guides/chrome-extensions)
- [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/)
- [Chrome Extensions End-to-End Testing](https://developer.chrome.com/docs/extensions/how-to/test/end-to-end-testing)

## ❓ FAQ

### Q: Can I use extensions in headless mode?

**A:** No, Chrome extensions require `headless: false`.

### Q: How do I debug extension issues?

**A:** Use Chrome DevTools by clicking "Inspect" on the extension in `chrome://extensions`.

### Q: Can I load multiple extensions?

**A:** Yes, separate paths with commas in launch args:
```typescript
args: [
  `--disable-extensions-except=${ext1},${ext2}`,
  `--load-extension=${ext1},${ext2}`,
]
```

### Q: How do I interact with extension popup programmatically?

**A:** Use `manager.openPopup()` to get popup page, then interact like normal page.

### Q: Can content scripts access page context?

**A:** Yes, but they run in isolated context. Use `window.postMessage()` to communicate.

---

**Last Updated:** 2025-10-07
**Version:** 1.0.0
