# Chrome Extension Auto-Load for Google Search & reCAPTCHA Scrapers

## 📋 Summary

Updated `GoogleSearchScraper`, `RecaptchaTestScraper`, and `GoogleRecaptchaDemoScraper` to automatically load the Chrome extension from `extensions/solver` for reCAPTCHA handling.

**Date**: 2025-10-07

---

## 🎯 Problem

The google-search and recaptcha-test scrapers were not loading the Chrome extension from `extensions/solver`, even though the extension infrastructure was in place.

**User Request**: "pada scrape google-search dan recapca test scrapper belum meload chrome extensi yang berada di extensions/solver"

---

## ✅ Solution

### Changes Made

#### 1. **GoogleSearchScraper.ts**

Added constructor to auto-enable Chrome extension:

```typescript
constructor(config: ScraperConfig = {}) {
  // Auto-enable extension if recaptcha config doesn't exist or provider not set
  const extensionPath = path.resolve(process.cwd(), 'extensions/solver');

  // Merge config with extension defaults
  const configWithExtension: ScraperConfig = {
    ...config,
    recaptcha: {
      enabled: true,
      provider: config.recaptcha?.provider || 'extension',
      ...config.recaptcha,
    },
  };

  super(configWithExtension);

  console.log('[GoogleSearchScraper] Chrome extension enabled from:', extensionPath);
}
```

#### 2. **RecaptchaTestScraper.ts**

Added constructors to both `RecaptchaTestScraper` and `GoogleRecaptchaDemoScraper`:

```typescript
constructor(config: ScraperConfig = {}) {
  // Auto-enable extension if recaptcha config doesn't exist or provider not set
  const extensionPath = path.resolve(process.cwd(), 'extensions/solver');

  // Merge config with extension defaults
  const configWithExtension: ScraperConfig = {
    ...config,
    recaptcha: {
      enabled: true,
      provider: config.recaptcha?.provider || 'extension',
      ...config.recaptcha,
    },
  };

  super(configWithExtension);

  console.log('[RecaptchaTestScraper] Chrome extension enabled from:', extensionPath);
}
```

#### 3. **extensions/solver/loader.ts**

Increased extension load timeout from 5 seconds to 15 seconds:

```typescript
// Before
export async function waitForExtension(page: Page, timeout = 5000): Promise<boolean> {

// After
export async function waitForExtension(page: Page, timeout = 15000): Promise<boolean> {
```

---

## 📁 Files Modified

1. ✅ `src/scrapers/GoogleSearchScraper.ts`
   - Added constructor with extension auto-load
   - Added `ScraperConfig` import
   - Added `path` import

2. ✅ `src/scrapers/RecaptchaTestScraper.ts`
   - Added constructor to `RecaptchaTestScraper` with extension auto-load
   - Added constructor to `GoogleRecaptchaDemoScraper` with extension auto-load
   - Added `ScraperConfig` import
   - Added `path` import

3. ✅ `extensions/solver/loader.ts`
   - Increased `waitForExtension` timeout: 5000ms → 15000ms

4. ✅ `tests/test-scrapers-with-extension.ts` (NEW)
   - Created test file to verify extension loading

---

## 🔧 How It Works

### Default Behavior

1. When `GoogleSearchScraper`, `RecaptchaTestScraper`, or `GoogleRecaptchaDemoScraper` is instantiated
2. Constructor automatically sets:
   - `recaptcha.enabled = true`
   - `recaptcha.provider = 'extension'` (if not specified)
3. Extension is loaded from `extensions/solver`
4. Browser launches in **headless: false** mode (required for extensions)

### Override Behavior

Users can still override the provider:

```typescript
// Use different provider (e.g., manual, 2captcha)
const scraper = new GoogleSearchScraper({
  recaptcha: {
    provider: 'manual', // Overrides default 'extension'
  },
});
```

---

## 🧪 Testing

### Test File

Run the test file to verify extension loading:

```bash
bun tests/test-scrapers-with-extension.ts
```

### API Test

```bash
# Test GoogleRecaptchaDemoScraper
curl -X POST http://localhost:3000/api/scrape/google-recaptcha-demo \
  -H "Content-Type: application/json" \
  -d '{"config":{"headless":false,"timeout":60000}}'

# Test GoogleSearchScraper
curl -X POST http://localhost:3000/api/scrape/google-search \
  -H "Content-Type: application/json" \
  -d '{
    "params": {"query": "bun javascript", "limit": 5},
    "config": {"headless": false, "timeout": 60000}
  }'
```

### Expected Console Output

When scrapers load, you should see:

```
[GoogleSearchScraper] Chrome extension enabled from: /Users/devlover/www/gemini_api/extensions/solver
[BaseScraper] Using random User-Agent: Mozilla/5.0...
```

---

## 📊 Benefits

| Aspect | Before | After |
|--------|--------|-------|
| **Extension Loading** | Manual config required | ✅ Automatic |
| **Default Provider** | None | ✅ Extension |
| **User Config** | Required | ✅ Optional (auto-configured) |
| **reCAPTCHA Handling** | Manual setup | ✅ Built-in |

---

## 🎯 Use Cases

### 1. Simple Google Search

```bash
# Extension loads automatically
curl -X POST http://localhost:3000/api/scrape/google-search \
  -H "Content-Type: application/json" \
  -d '{"params": {"query": "test"}}'
```

### 2. reCAPTCHA Testing

```bash
# Extension loads automatically
curl -X POST http://localhost:3000/api/scrape/google-recaptcha-demo
```

### 3. Custom Provider

```bash
# Override to use manual solver
curl -X POST http://localhost:3000/api/scrape/google-search \
  -H "Content-Type: application/json" \
  -d '{
    "params": {"query": "test"},
    "config": {
      "recaptcha": {
        "provider": "manual"
      }
    }
  }'
```

---

## ⚙️ Configuration

### Extension Path

The extension is loaded from:
```
extensions/solver/
```

This is resolved using:
```typescript
const extensionPath = path.resolve(process.cwd(), 'extensions/solver');
```

### Extension Timeout

Extension has **15 seconds** to load before timeout:
```typescript
waitForExtension(page, 15000)
```

---

## 🔍 Debugging

### Check Extension Loading

Look for console messages:

✅ **Success**:
```
[GoogleSearchScraper] Chrome extension enabled from: /path/to/extensions/solver
```

❌ **Timeout**:
```
Extension did not load in time
```

### Check Extension Detection

Extension should define:
```javascript
window.__recaptchaSolver
```

Test in browser console:
```javascript
typeof window.__recaptchaSolver !== 'undefined'
```

---

## 🚨 Important Notes

1. **Headless Mode**: Extensions require `headless: false`
   - Scrapers automatically force headless: false when extension is enabled

2. **Extension Path**: Must be valid Chrome extension with manifest.json
   - Located at: `extensions/solver/`

3. **Browser Compatibility**: Only works with Chrome/Chromium
   - Puppeteer uses Chromium by default

4. **Timeout**: Extension has 15 seconds to load
   - Increase in `loader.ts` if needed

---

## 📝 Related Documentation

- [CHROME_EXTENSIONS.md](CHROME_EXTENSIONS.md) - Chrome extensions guide
- [RECAPTCHA.md](RECAPTCHA.md) - reCAPTCHA solving guide
- [BEST-PRACTICES.md](BEST-PRACTICES.md) - Puppeteer best practices

---

## ✅ Status

**Status**: ✅ COMPLETED
**Date**: 2025-10-07
**Impact**: High - Automatic extension loading for Google Search & reCAPTCHA scrapers

---

## 📊 Statistics

| Metric | Count |
|--------|-------|
| **Scrapers Updated** | 3 (GoogleSearchScraper, RecaptchaTestScraper, GoogleRecaptchaDemoScraper) |
| **Files Modified** | 3 |
| **Files Created** | 2 (EXTENSION_AUTO_LOAD.md, test-scrapers-with-extension.ts) |
| **Lines Added** | ~80 |
| **Extension Timeout** | 15000ms (15 seconds) |

---

## 🎉 Result

✅ **GoogleSearchScraper** now auto-loads Chrome extension from `extensions/solver`
✅ **RecaptchaTestScraper** now auto-loads Chrome extension from `extensions/solver`
✅ **GoogleRecaptchaDemoScraper** now auto-loads Chrome extension from `extensions/solver`
✅ Extension timeout increased to 15 seconds for better reliability
✅ Test file created to verify extension loading
✅ **Scraper timeout increased to 120 seconds (2 minutes)** for manual solving
✅ **60-second wait time** after auto-solve fails for manual intervention
