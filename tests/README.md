# Tests

Folder ini berisi semua file test untuk project scraping API.

## 📁 Test Files

### Core Tests

#### `test-single-tab.ts`
Test untuk memverifikasi bahwa browser hanya membuka 1 tab (bukan 2).

**Run:**
```bash
bun tests/test-single-tab.ts
```

**Expected Output:**
```
📊 Number of tabs/pages: 1
✅ SUCCESS: Only 1 tab opened (efficient!)
```

---

#### `test-recaptcha.ts`
Test untuk reCAPTCHA detection dan auto-click checkbox.

**Run:**
```bash
bun tests/test-recaptcha.ts
```

**Expected Output:**
```
✅ Checkbox clicked!
✅ Checkbox clicked automatically
✅ reCAPTCHA solved!
✅ Test PASSED!
```

---

#### `test-simple.ts`
Simple test untuk reCAPTCHA detection saja (tanpa solving).

**Run:**
```bash
bun tests/test-simple.ts
```

---

### Google Search Tests

#### `test-google-simple.ts`
Test basic Google search (mungkin gagal jika ada reCAPTCHA).

**Run:**
```bash
bun tests/test-google-simple.ts
```

**Note:** ⚠️  Test ini mungkin fail jika Google menampilkan reCAPTCHA.

---

#### `test-google-with-solver.ts`
Test Google search dengan manual reCAPTCHA solver.

**Run:**
```bash
bun tests/test-google-with-solver.ts
```

**Note:** Requires `headless: false` untuk manual solving.

---

### User-Agent Tests

#### `test-random-ua.ts`
Test random User-Agent generation dengan ExampleScraper.

**Run:**
```bash
bun tests/test-random-ua.ts
```

---

#### `test-ua-simple.ts`
Simple test untuk user-agents package (tanpa Puppeteer).

**Run:**
```bash
bun tests/test-ua-simple.ts
```

**Expected Output:**
```
Generating 5 random User-Agents:
1. Mozilla/5.0 (...)
2. Mozilla/5.0 (...)
...
✅ user-agents package working correctly!
```

---

### Stealth Tests

#### `test-stealth.ts`
Test puppeteer-extra-plugin-stealth untuk anti-detection.

**Run:**
```bash
bun tests/test-stealth.ts
```

**Expected Output:**
```
✅ Stealth mode is working! navigator.webdriver is hidden
📸 Screenshot saved to: screenshots/stealth-test.png
```

---

### Chrome Extension Tests

#### `test-extension-loader.ts`
Test Chrome extension loading dengan ExtensionManager.

**Run:**
```bash
bun tests/test-extension-loader.ts
```

**Expected Output:**
```
✅ Extension loaded successfully!
   ID: adjlkdagijcoijlfbngnkdofngkajmid
   Manifest Version: 3
✅ Extension context evaluation result:
{
  "hasChrome": true,
  "hasRuntime": true,
  "extensionId": "adjlkdagijcoijlfbngnkdofngkajmid"
}
```

---

#### `test-extension-scraper.ts`
Test ExtensionScraper dengan Chrome extension support.

**Run:**
```bash
bun tests/test-extension-scraper.ts
```

**Expected Output:**
```
✅ Extension loaded successfully!
   Extension ID: adjlkdagijcoijlfbngnkdofngkajmid
✅ Test PASSED!
```

**Note:** Extension tests require `headless: false` dan akan membuka browser window.

---

## 🚀 Running All Tests

Untuk menjalankan semua test sekaligus:

```bash
# Run specific test
bun tests/test-single-tab.ts

# Or from project root
cd /path/to/project
bun tests/test-recaptcha.ts
```

---

## 📊 Test Categories

| Category | Files | Purpose |
|----------|-------|---------|
| **Core** | `test-single-tab.ts`, `test-simple.ts` | Basic functionality |
| **reCAPTCHA** | `test-recaptcha.ts` | reCAPTCHA detection & solving |
| **Google** | `test-google-*.ts` | Google Search scraping |
| **User-Agent** | `test-*-ua.ts` | User-Agent testing |
| **Stealth** | `test-stealth.ts` | Anti-detection testing |
| **Extensions** | `test-extension-*.ts` | Chrome extension support |

---

## ✅ Test Results Summary

After recent optimizations:

| Test | Status | Duration | Notes |
|------|--------|----------|-------|
| Single Tab | ✅ PASS | ~3s | Only 1 tab opens |
| reCAPTCHA | ✅ PASS | ~16s | Auto-click works |
| Stealth | ✅ PASS | ~5s | Navigator.webdriver hidden |
| User-Agent | ✅ PASS | ~1s | Random UA generated |

---

## 🔧 Troubleshooting

### Import Errors
All test files use relative imports from `../src/`:
```typescript
import { GoogleRecaptchaDemoScraper } from '../src/scrapers/RecaptchaTestScraper';
```

### Running from Wrong Directory
Always run from project root:
```bash
# ✅ Correct
cd /Users/devlover/www/gemini_api
bun tests/test-single-tab.ts

# ❌ Wrong
cd tests
bun test-single-tab.ts
```

---

## 📝 Adding New Tests

1. Create new test file in `tests/` folder
2. Use relative imports: `from '../src/...'`
3. Add documentation in this README
4. Update test command in file header comment

Example template:
```typescript
/**
 * Test description
 * Run: bun tests/test-name.ts
 */

import { YourScraper } from '../src/scrapers/YourScraper';

async function testName() {
  console.log('🧪 Testing...\n');

  const scraper = new YourScraper({ ... });
  const result = await scraper.execute();

  console.log(result);
}

testName().catch(console.error);
```

---

**Last Updated:** 2025-10-07
