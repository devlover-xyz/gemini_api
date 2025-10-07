# reCAPTCHA Reload/Challenge Handling Fix

## 📋 Summary

Fixed issue where browser closes too fast when reCAPTCHA reloads with image challenge after initial checkbox click.

**Date**: 2025-10-07
**Issue**: "ada kalanya capctcha reload, dan masalahnya browser keburu close"
**Translation**: "sometimes captcha reloads, and the problem is the browser closes too fast"

---

## 🎯 Problem

When reCAPTCHA checkbox is clicked, Google may show an image challenge (selecting traffic lights, crosswalks, etc.). The browser was closing before user could solve the challenge.

### Before:
- ❌ reCAPTCHA reloads with challenge → browser closes immediately
- ❌ Fixed 60-second wait → too short for manual solving
- ❌ No detection of challenge reload
- ❌ User cannot complete image challenges

---

## ✅ Solution

### 1. **Detect reCAPTCHA Reload** 🔍

After initial solve, check if challenge iframe appeared:

```typescript
// Check for challenge iframe (bframe)
const reloaded = await this.page.evaluate(() => {
  const challengeIframe = document.querySelector('iframe[src*="bframe"]');
  return challengeIframe !== null;
});
```

**Key Detail**: The challenge iframe has `"bframe"` in its src URL, while the checkbox iframe has `"anchor"`.

### 2. **Polling Loop for Challenge** ⏱️

Replace fixed 60s wait with intelligent 90s polling loop:

```typescript
if (reloaded) {
  console.log('⚠️  reCAPTCHA reloaded with challenge! Waiting 90 seconds for manual solving...');
  console.log('💡 TIP: Please solve the image challenge that appeared');

  let challengeSolved = false;
  for (let i = 0; i < 18; i++) { // 18 * 5s = 90s
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Check if solved
    const checkSolved = await this.page.evaluate(() => {
      const response = (window as any).grecaptcha?.getResponse();
      return response && response.length > 0;
    });

    if (checkSolved) {
      console.log(`✅ Challenge solved! (after ${(i + 1) * 5} seconds)`);
      challengeSolved = true;
      solved = true;
      break; // Exit early
    }

    // Progress message every 30 seconds
    if ((i + 1) % 6 === 0) {
      console.log(`Still waiting... (${(i + 1) * 5}s elapsed)`);
    }
  }

  if (!challengeSolved) {
    console.log('❌ Challenge not solved within 90 seconds');
    solved = false;
  }
}
```

### 3. **Increased Timeout** ⏳

Extended overall timeout to 4 minutes:

```typescript
constructor(config: ScraperConfig = {}) {
  const configWithExtension: ScraperConfig = {
    timeout: 240000, // 4 minutes (was 180s/3 min)
    ...config,
    recaptcha: {
      enabled: true,
      provider: config.recaptcha?.provider || 'extension',
      extensionPath: config.recaptcha?.extensionPath || extensionPath,
      timeout: 240000, // 4 minutes for solving
      ...config.recaptcha,
    },
  };
  super(configWithExtension);
}
```

### 4. **Manual Solve Polling** 🖱️

Also updated manual solve logic to use polling:

```typescript
// Manual solve with polling (was fixed 60s wait)
let manualSolved = false;
for (let i = 0; i < 18; i++) { // 18 * 5s = 90s
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const checkSolved = await this.page.evaluate(() => {
    const response = (window as any).grecaptcha?.getResponse();
    return response && response.length > 0;
  });

  if (checkSolved) {
    console.log(`✅ reCAPTCHA solved manually! (after ${(i + 1) * 5} seconds)`);
    manualSolved = true;
    solved = true;
    break;
  }

  if ((i + 1) % 6 === 0) {
    console.log(`Still waiting for manual solve... (${(i + 1) * 5}s elapsed)`);
  }
}
```

---

## 📊 Timeline Comparison

### Before:
```
1. Navigate (5s)
2. Detect reCAPTCHA (5s)
3. Extension init (5s)
4. Solve checkbox (5-10s)
5. → Challenge appears
6. Wait 60s (fixed) ❌
7. Close browser (too fast!) ❌
Total: ~80-90 seconds
```

### After:
```
1. Navigate (5s)
2. Detect reCAPTCHA (5s)
3. Extension init (5s)
4. Solve checkbox (5-10s)
5. Wait 10s to process
6. → Detect challenge reload ✅
7. Polling loop 90s (breaks early if solved) ✅
8. Fill form (1s)
9. Submit (1s)
10. Wait for response (10s + 10s)
11. View result (20s)
12. Close browser ✅
Total: Up to 240 seconds (4 minutes)
```

---

## 🔧 Changes Made

### Files Modified:

#### 1. **src/scrapers/RecaptchaTestScraper.ts** ✅

**Lines 27-36**: Increased timeout to 240s (4 minutes)
```typescript
timeout: 240000, // 4 minutes for reload + challenge solving + submit + view result
```

**Lines 86-122**: Added reCAPTCHA reload detection and polling loop
```typescript
// After initial solve, check for reload
const reloaded = await this.page.evaluate(() => {
  const challengeIframe = document.querySelector('iframe[src*="bframe"]');
  return challengeIframe !== null;
});

if (reloaded) {
  // 90-second polling loop with progress messages
  for (let i = 0; i < 18; i++) {
    // Check every 5 seconds, break early if solved
    // Progress message every 30 seconds
  }
}
```

**Lines 124-156**: Updated manual solve to use polling loop
```typescript
// Replaced: await new Promise((resolve) => setTimeout(resolve, 60000));
// With: 90-second polling loop
```

#### 2. **src/scrapers/RecaptchaTestScraper.ts - GoogleRecaptchaDemoScraper** ✅

**Lines 311-320**: Increased timeout to 240s
**Lines 385-422**: Added same reload detection and polling logic
**Lines 424-456**: Updated manual solve polling loop

---

## 🧪 Testing

### Test Command:

```bash
curl -X POST http://localhost:3000/api/scrape/recaptcha-test \
  -H "Content-Type: application/json" \
  -d '{"params":{"url":"https://www.google.com/recaptcha/api2/demo"},"config":{"headless":false,"timeout":60000}}'
```

### Expected Console Output:

```
[RecaptchaTestScraper] Chrome extension path: /Users/devlover/www/gemini_api/extensions/solver
[RecaptchaTestScraper] Timeout set to: 240000 ms (4 minutes)
[RecaptchaExtension] Using extension from: /Users/devlover/www/gemini_api/extensions/solver
[RecaptchaExtension] Extension loaded from path, skipping API check
Navigating to: https://www.google.com/recaptcha/api2/demo
Waiting for reCAPTCHA to load...
Detecting reCAPTCHA...
reCAPTCHA detected: true
Attempting to solve reCAPTCHA...
Waiting 5 seconds for extension to initialize...
✅ reCAPTCHA solved successfully!
Waiting 10 seconds for reCAPTCHA to be fully processed...
⚠️  reCAPTCHA reloaded with challenge! Waiting 90 seconds for manual solving... ← NEW!
💡 TIP: Please solve the image challenge that appeared                            ← NEW!
Still waiting... (30s elapsed)                                                    ← NEW!
✅ Challenge solved! (after 35 seconds)                                           ← NEW!
Attempting to submit form...
✅ Form fields filled
✅ Submit button clicked!
Waiting 10 seconds for response...
✅ Form submitted successfully! "Verification Success... Hooray!" received.
📸 Screenshot saved: screenshots/recaptcha-test-result.png
💡 Keeping browser open for 20 seconds to view result...
```

---

## 📁 Files Modified

| File | Lines | Changes |
|------|-------|---------|
| `src/scrapers/RecaptchaTestScraper.ts` | 27-36 | Timeout: 180s → **240s (4 min)** |
| `src/scrapers/RecaptchaTestScraper.ts` | 86-122 | **reCAPTCHA reload detection + 90s polling** |
| `src/scrapers/RecaptchaTestScraper.ts` | 124-156 | **Manual solve polling (was fixed 60s wait)** |
| `src/scrapers/RecaptchaTestScraper.ts` | 311-320 | GoogleRecaptchaDemoScraper timeout: 180s → **240s** |
| `src/scrapers/RecaptchaTestScraper.ts` | 385-422 | GoogleRecaptchaDemoScraper **reload detection + polling** |
| `src/scrapers/RecaptchaTestScraper.ts` | 424-456 | GoogleRecaptchaDemoScraper **manual solve polling** |
| `docs/RECAPTCHA_RELOAD_FIX.md` | NEW | **This documentation** |

**Total Lines Modified**: ~100 lines

---

## ⏱️ Wait Times Summary

| Step | Time | Type |
|------|------|------|
| Extension initialization | 5 seconds | Fixed |
| reCAPTCHA processing after solve | 10 seconds | Fixed |
| **Challenge solving (if reload detected)** | **90 seconds** | **Polling (checks every 5s)** |
| **Manual solving (if auto-solve fails)** | **90 seconds** | **Polling (checks every 5s)** |
| Form submission response | 10 + 10 seconds | Fixed (retry after 10s) |
| View result | 20 seconds | Fixed |
| **Total Timeout** | **240 seconds (4 minutes)** | **Maximum** |

---

## 🎯 Benefits

| Aspect | Before | After |
|--------|--------|-------|
| **Challenge Detection** | ❌ None | ✅ Detects bframe iframe |
| **Wait Strategy** | ❌ Fixed 60s | ✅ Polling 90s (early break) |
| **User Feedback** | ❌ Silent wait | ✅ Progress messages (every 30s) |
| **Timeout** | 180s (3 min) | 240s (4 min) |
| **Early Completion** | ❌ No | ✅ Yes (breaks on solve) |
| **Challenge Solving** | ❌ Browser closes | ✅ 90s window to solve |

---

## 🔍 How It Works

### 1. **Checkbox Click** → Auto-solve (via extension)
```
User: [clicks checkbox] (or extension auto-clicks)
Page: [shows checkmark] or [shows challenge]
```

### 2. **Detect Challenge Reload**
```typescript
iframe[src*="bframe"]  // Challenge iframe appears
↓
Polling loop activates (90 seconds)
```

### 3. **Polling Loop**
```
Every 5 seconds:
  Check if grecaptcha.getResponse() has value
  If yes → Break early (solved!)
  If no → Continue waiting

Every 30 seconds:
  Log progress message
```

### 4. **Early Break**
```
If solved at 35 seconds:
  ✅ Challenge solved! (after 35 seconds)
  Exit loop immediately
  Continue to form submission

If not solved after 90 seconds:
  ❌ Challenge not solved within 90 seconds
  Set solved = false
```

---

## 🚀 Use Cases

### 1. **Auto-Solve with Challenge**
```
1. Extension auto-clicks checkbox → ✅ Success
2. Challenge appears → ⚠️ Detected
3. User solves manually → ✅ Detected at 25s
4. Form submitted → ✅ Success
```

### 2. **Manual Solve from Start**
```
1. Extension fails → ❌
2. Manual solve activated → ⏳ 90s polling
3. User solves at 45s → ✅ Detected
4. Form submitted → ✅ Success
```

### 3. **Challenge Timeout**
```
1. Extension auto-clicks → ✅
2. Challenge appears → ⚠️ Detected
3. No user action → ⏳ 90s elapsed
4. Browser closes → ❌ Timeout (but had enough time)
```

---

## 🎉 Result

✅ **reCAPTCHA reload/challenge detected** using bframe iframe check
✅ **90-second polling loop** replaces fixed 60s wait
✅ **Early break on solve** - no wasted time
✅ **Progress messages** every 30 seconds keep user informed
✅ **Timeout extended to 4 minutes** for complete workflow
✅ **Applied to both scrapers** (RecaptchaTestScraper, GoogleRecaptchaDemoScraper)

**User can now solve image challenges with enough time and clear feedback!** 🎊

---

## 📝 Technical Notes

### grecaptcha API:
```typescript
// Check if reCAPTCHA is solved
const response = (window as any).grecaptcha?.getResponse();
const isSolved = response && response.length > 0;
```

### iframe Detection:
```typescript
// Checkbox iframe
document.querySelector('iframe[src*="anchor"]')

// Challenge iframe
document.querySelector('iframe[src*="bframe"]')
```

### Polling Pattern:
```typescript
for (let i = 0; i < 18; i++) { // 18 iterations
  await new Promise((resolve) => setTimeout(resolve, 5000)); // 5 seconds each

  if (checkCondition()) {
    break; // Early exit
  }

  if ((i + 1) % 6 === 0) { // Every 6th iteration (30s)
    console.log(`Progress: ${(i + 1) * 5}s elapsed`);
  }
}
// Total: 18 * 5s = 90 seconds max
```

---

## 🚨 Important

1. **Challenge Detection**: Only checks for bframe iframe after initial checkbox solve
2. **Polling Frequency**: Checks every 5 seconds to avoid excessive CPU usage
3. **Progress Messages**: Every 30 seconds (6 iterations * 5s)
4. **Early Break**: Immediately exits loop when solve detected
5. **Timeout Hierarchy**:
   - Individual polling: 90s
   - Total scraper timeout: 240s (4 min)
   - Request timeout: Can be overridden via API

---

## 📚 Related Documentation

- [RECAPTCHA.md](RECAPTCHA.md) - reCAPTCHA solving guide
- [RECAPTCHA_FORM_SUBMIT.md](RECAPTCHA_FORM_SUBMIT.md) - Form submission after solve
- [EXTENSION_AUTO_LOAD.md](EXTENSION_AUTO_LOAD.md) - Extension auto-loading
- [BEST-PRACTICES.md](BEST-PRACTICES.md) - Puppeteer best practices

---

## ✅ Status

**Status**: ✅ COMPLETED
**Date**: 2025-10-07
**Impact**: High - Fixes browser closing when reCAPTCHA shows challenge
**User Feedback**: "ada kalanya capctcha reload, dan masalahnya browser keburu close" → FIXED

---

## 📊 Statistics

| Metric | Value |
|--------|-------|
| **Scrapers Updated** | 2 (RecaptchaTestScraper, GoogleRecaptchaDemoScraper) |
| **Files Modified** | 1 (src/scrapers/RecaptchaTestScraper.ts) |
| **Files Created** | 1 (docs/RECAPTCHA_RELOAD_FIX.md) |
| **Lines Modified** | ~100 |
| **Timeout Increase** | 180s → 240s (+60s / +33%) |
| **Wait Strategy** | Fixed → Polling (early break enabled) |
| **Challenge Window** | 60s → 90s (+30s / +50%) |
