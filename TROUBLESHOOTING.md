# Troubleshooting

Common issues and their solutions.

## Google Blocking with reCAPTCHA

### Error
```
Error: Google blocked with reCAPTCHA. Please configure a reCAPTCHA solver
```

### Cause
Google has detected automated traffic and is showing a reCAPTCHA challenge page.

### Solution

#### Option 1: Manual Solving (Free, Requires Human)

```bash
# Test with manual solving
bun test-google-with-solver.ts
```

Or via API:
```bash
curl -X POST http://localhost:3000/api/scrape/google-search \
  -H "Content-Type: application/json" \
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

Browser will open, solve the reCAPTCHA manually, then the scraper continues.

#### Option 2: 2Captcha (Paid, Automatic)

```bash
curl -X POST http://localhost:3000/api/scrape/google-search \
  -H "Content-Type: application/json" \
  -d '{
    "params": {"query": "test", "limit": 5},
    "config": {
      "recaptcha": {
        "enabled": true,
        "provider": "2captcha",
        "apiKey": "your_2captcha_api_key"
      }
    }
  }'
```

Cost: ~$2.99 per 1000 captchas

#### Option 3: Anti-Captcha (Paid, Automatic)

```bash
curl -X POST http://localhost:3000/api/scrape/google-search \
  -H "Content-Type: application/json" \
  -d '{
    "params": {"query": "test", "limit": 5},
    "config": {
      "recaptcha": {
        "enabled": true,
        "provider": "anti-captcha",
        "apiKey": "your_anticaptcha_api_key"
      }
    }
  }'
```

Cost: ~$2 per 1000 captchas

#### Option 4: Browser Extension (Experimental)

```bash
curl -X POST http://localhost:3000/api/scrape/google-search \
  -H "Content-Type: application/json" \
  -d '{
    "params": {"query": "test", "limit": 5},
    "config": {
      "headless": false,
      "recaptcha": {
        "enabled": true,
        "provider": "extension"
      }
    }
  }'
```

Uses browser extension for solving. Free but experimental.

### Prevention

To reduce chances of getting blocked:

1. **Use delays**: Add random delays between requests
2. **Rotate IPs**: Use residential proxies
3. **Limit rate**: Don't scrape too fast
4. **Random UA**: Already enabled by default
5. **Stealth mode**: Already enabled by default

### How Detection Works

The scraper uses a multi-stage detection strategy:

1. **Page Stabilization** (3-8 seconds)
   - Waits for either search results OR reCAPTCHA to appear
   - Uses `waitForFunction` for dynamic detection

2. **Early Detection Check**
   - If reCAPTCHA detected early, waits additional 5 seconds
   - Ensures iframe fully loads before attempting to solve

3. **Final Verification**
   - Checks page content and DOM for reCAPTCHA elements
   - Takes screenshot for debugging

This ensures reCAPTCHA is fully loaded before attempting to solve.

## Page Errors: `solveSimpleChallenge is not defined`

### Error
```
Page error: ReferenceError: solveSimpleChallenge is not defined
```

### Cause
This is a harmless error from Google's reCAPTCHA page trying to load internal scripts. It doesn't affect functionality.

### Solution
This error is automatically ignored by the scraper. No action needed.

The scraper will still detect and handle reCAPTCHA correctly despite this error.

## Request Timeout

### Error
```
Request timeout after 60 seconds
```

### Cause
The scraper took too long to complete (navigation, waiting for elements, solving reCAPTCHA, etc.)

### Solution

Increase timeout in config:
```json
{
  "config": {
    "timeout": 120000,
    "recaptcha": {
      "timeout": 180000
    }
  }
}
```

## ERR_EMPTY_RESPONSE

### Error
```
ERR_EMPTY_RESPONSE
```

### Cause
Server didn't respond within timeout period.

### Solution
This is now fixed with timeout protection. If you still see this:

1. Check server logs
2. Restart server: `bun run dev`
3. Increase timeout if needed

## Navigation Timeout

### Error
```
Navigation timeout
```

### Cause
Page took too long to load.

### Solution

1. Check internet connection
2. Increase timeout:
```json
{
  "config": {
    "timeout": 60000
  }
}
```
3. Check if site is accessible

## Search Results Not Found

### Error
```
Search results container not found
```

### Cause
1. Google changed their HTML structure
2. Page blocked by reCAPTCHA
3. Network error

### Solution

1. Check screenshot: `screenshots/google-search-error.png`
2. If reCAPTCHA: Configure solver (see above)
3. If HTML changed: Update selectors in `GoogleSearchScraper.ts`

## Browser Launch Failed

### Error
```
Failed to launch browser
```

### Cause
Missing Chromium or wrong permissions.

### Solution

```bash
# Reinstall puppeteer
bun install puppeteer

# On Linux, install dependencies:
sudo apt-get install -y \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libgdk-pixbuf2.0-0 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  xdg-utils
```

## Memory Issues

### Symptoms
- Slow performance
- Browser crashes
- High memory usage

### Solution

1. Enable browser pooling (already configured)
2. Reduce concurrent requests
3. Add resource limits:

```typescript
// In BaseScraper launch args
'--max-old-space-size=2048'
```

## Need More Help?

1. Check logs in console
2. Check screenshots in `screenshots/` folder
3. Review documentation:
   - [README.md](README.md) - Main documentation
   - [STEALTH.md](STEALTH.md) - Anti-detection
   - [RECAPTCHA.md](RECAPTCHA.md) - reCAPTCHA solving
   - [SOLUTION.md](SOLUTION.md) - Technical details
4. Open issue: https://github.com/your-repo/issues
