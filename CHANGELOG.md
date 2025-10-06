# Changelog

## [Latest] - 2025-10-06

### Added

#### 🥷 Stealth Mode (Anti-Detection)
- Integrated `puppeteer-extra-plugin-stealth` to bypass bot detection
- Automatically hides `navigator.webdriver` and 30+ other detection vectors
- Works seamlessly with all scrapers via `BaseScraper`
- Added `test-stealth.ts` for verification
- Created `STEALTH.md` documentation

#### 🛡️ Google Search reCAPTCHA Handling
- Added reCAPTCHA detection for Google Search scraper
- Detects Google's "unusual traffic" challenge page
- Automatic screenshot capture when reCAPTCHA is detected
- Clear error messages with solver configuration instructions
- Re-navigation after successful reCAPTCHA solve

#### ⏱️ Timeout Protection
- Added 60-second timeout to all API routes
- Prevents hanging requests from blocking the server
- Returns 504 Gateway Timeout error with clear message
- Navigation timeout protection (20 seconds) in scrapers

#### 📸 Screenshot Organization
- All screenshots now saved to `screenshots/` folder
- Descriptive filenames for different scenarios:
  - `google-search-recaptcha-detected.png`
  - `google-search-recaptcha-solved.png`
  - `google-search-recaptcha-failed.png`
  - `google-search-error.png`
  - `google-search-nav-error.png`

### Changed

#### 🔧 BaseScraper Improvements
- Switched from `puppeteer` to `puppeteer-extra` with stealth plugin
- Removed manual anti-detection code (now handled by stealth plugin)
- Improved resource whitelisting - allows Google domains and stylesheets
- Better error handling for request interception
- Only blocks heavy resources (images, fonts, media)

#### 🎯 GoogleSearchScraper Enhancements
- Improved reCAPTCHA detection (checks page content + iframe)
- Better navigation with timeout protection
- Multi-selector fallback for search results
- Comprehensive error messages
- Debug screenshots at every critical point

### Fixed

- ❌ Fixed ERR_EMPTY_RESPONSE by adding timeout protection
- ❌ Fixed resource blocking that prevented Google from loading properly
- ❌ Fixed reCAPTCHA not being detected on Google's challenge page
- ❌ Fixed missing error context in failures

## Implementation Details

### Files Modified

1. **src/core/BaseScraper.ts**
   - Added stealth plugin import and initialization
   - Switched to `puppeteerExtra.launch()`
   - Removed manual anti-detection code
   - Improved resource whitelisting (lines 104-123)

2. **src/scrapers/GoogleSearchScraper.ts**
   - Added comprehensive reCAPTCHA detection (lines 55-106)
   - Navigation timeout protection (lines 38-53)
   - Screenshot capture at all critical points
   - Better error messages with troubleshooting info

3. **src/routes/scraper.routes.ts**
   - Added 60-second timeout protection (lines 27-35, 61-69)
   - Proper timeout error status code (504)

4. **README.md**
   - Added stealth mode feature
   - Updated reCAPTCHA section with stealth info

### Files Created

1. **STEALTH.md** - Complete stealth mode documentation
2. **test-stealth.ts** - Stealth plugin verification script
3. **screenshots/.gitkeep** - Screenshots folder marker
4. **CHANGELOG.md** - This file

## Testing

### Test Stealth Mode
```bash
bun test-stealth.ts
```

Expected: `webdriver: false`, `plugins: 5`, `hasChrome: true`

### Test Google Search (Without Solver)
```bash
curl -X POST http://localhost:3000/api/scrape/google-search \\
  -H "Content-Type: application/json" \\
  -d '{"params": {"query": "test", "limit": 3}}'
```

Expected: Error with clear message about reCAPTCHA and solver configuration

### Test Google Search (With Manual Solver)
```bash
curl -X POST http://localhost:3000/api/scrape/google-search \\
  -H "Content-Type: application/json" \\
  -d '{
    "params": {"query": "test", "limit": 5},
    "config": {
      "headless": false,
      "recaptcha": {
        "enabled": true,
        "provider": "manual",
        "timeout": 120000
      }
    }
  }'
```

Expected: Browser opens, you solve reCAPTCHA manually, returns search results

## Migration Notes

### Breaking Changes
None - all changes are backward compatible.

### Recommended Actions
1. Restart the server to apply stealth plugin
2. Test with `bun test-stealth.ts` to verify stealth mode
3. Configure reCAPTCHA solver for Google Search if needed
4. Review screenshots folder after errors for debugging

## Performance Impact

- **Stealth Plugin**: Minimal overhead (~50ms per page load)
- **Timeout Protection**: No impact, prevents infinite hangs
- **Screenshot Capture**: ~100-200ms per screenshot
- **Overall**: Improved reliability and success rate

## Next Steps

1. ✅ Stealth mode integrated
2. ✅ reCAPTCHA detection working
3. ✅ Timeout protection added
4. ⏳ Test with production traffic
5. ⏳ Monitor success rates
6. ⏳ Add more anti-detection techniques if needed
