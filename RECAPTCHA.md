# reCAPTCHA Solving Guide

This API supports automatic reCAPTCHA solving using multiple methods.

## Supported Methods

1. **Browser Extension** - Free (experimental, requires external APIs for production)
2. **Manual Solving** - Free
3. **2Captcha Service** - Paid (~$2.99 per 1000 captchas)
4. **Anti-Captcha Service** - Paid (~$1-2 per 1000 captchas)

## Configuration

### Environment Variables

```env
# reCAPTCHA Provider: extension, manual, 2captcha, anti-captcha
RECAPTCHA_PROVIDER=extension

# API Key (required for 2captcha/anti-captcha)
RECAPTCHA_API_KEY=your_api_key_here
```

### In Scraper Config

```javascript
{
  "params": {
    "url": "https://example.com"
  },
  "config": {
    "recaptcha": {
      "enabled": true,
      "provider": "2captcha",  // or "anti-captcha" or "manual"
      "apiKey": "your_api_key",
      "timeout": 120000  // 2 minutes
    }
  }
}
```

## Method 1: Browser Extension (Free - Experimental)

Built-in browser extension untuk solve reCAPTCHA otomatis.

**Pros:**
- ✅ Free
- ✅ Terintegrasi langsung
- ✅ Auto-detect dan solve
- ✅ Supports v2, v3, hCaptcha

**Cons:**
- ❌ Requires external APIs untuk production (Speech-to-Text, Computer Vision)
- ❌ Experimental, mungkin tidak work di semua sites
- ❌ Headless mode must be disabled

**Extension Location:**
```
libs/solver/
├── manifest.json           # Chrome Extension
├── content.js             # Auto-detect & solve
├── background.js          # Coordination
├── solvers/
│   ├── audio-solver.js    # Audio challenges
│   └── image-solver.js    # Image challenges
└── loader.ts              # Puppeteer integration
```

**Configuration:**
```json
{
  "config": {
    "headless": false,  // Required for extension
    "recaptcha": {
      "enabled": true,
      "provider": "extension"
    }
  }
}
```

**Usage:**
```bash
curl -X POST http://localhost:3000/api/scrape/recaptcha-test \
  -H "Content-Type: application/json" \
  -d '{
    "params": {"url": "https://www.google.com/recaptcha/api2/demo"},
    "config": {
      "headless": false,
      "recaptcha": {"enabled": true, "provider": "extension"}
    }
  }'
```

**See:** [libs/solver/README.md](libs/solver/README.md) for detailed extension documentation.

---

## Method 2: Manual Solving (Free)

The scraper will detect reCAPTCHA and wait for manual input.

**Pros:**
- ✅ Free
- ✅ No external dependencies
- ✅ Works for all captcha types

**Cons:**
- ❌ Requires human intervention
- ❌ Not suitable for automation
- ❌ Headless mode must be disabled

**Configuration:**
```json
{
  "config": {
    "headless": false,  // IMPORTANT: Must be false for manual solving
    "recaptcha": {
      "enabled": true,
      "provider": "manual",
      "timeout": 300000  // 5 minutes to solve manually
    }
  }
}
```

**Usage:**
```bash
curl -X POST http://localhost:3000/api/scrape/recaptcha-test \
  -H "Content-Type: application/json" \
  -d '{
    "params": {"url": "https://www.google.com/recaptcha/api2/demo"},
    "config": {
      "headless": false,
      "recaptcha": {"enabled": true, "provider": "manual"}
    }
  }'
```

## Method 3: 2Captcha Service (Paid)

Automatic solving using 2Captcha API.

**Pros:**
- ✅ Fully automated
- ✅ Works in headless mode
- ✅ High success rate (95%+)
- ✅ Fast solving (~30-60 seconds)

**Cons:**
- ❌ Costs ~$2.99 per 1000 captchas
- ❌ Requires API key

**Setup:**

1. Sign up at [2captcha.com](https://2captcha.com/)
2. Get your API key from dashboard
3. Add balance to account
4. Configure environment:

```env
RECAPTCHA_PROVIDER=2captcha
RECAPTCHA_API_KEY=your_2captcha_api_key
```

**Usage:**
```bash
curl -X POST http://localhost:3000/api/scrape/recaptcha-test \
  -H "Content-Type: application/json" \
  -d '{
    "params": {"url": "https://www.google.com/recaptcha/api2/demo"},
    "config": {
      "recaptcha": {
        "enabled": true,
        "provider": "2captcha",
        "apiKey": "your_api_key"
      }
    }
  }'
```

**Pricing:**
- reCAPTCHA v2: $2.99 per 1000 captchas
- reCAPTCHA v3: $2.99 per 1000 captchas
- hCaptcha: $2.00 per 1000 captchas

## Method 4: Anti-Captcha Service (Paid)

Automatic solving using Anti-Captcha API.

**Pros:**
- ✅ Fully automated
- ✅ Works in headless mode
- ✅ High success rate (95%+)
- ✅ Competitive pricing

**Cons:**
- ❌ Costs ~$1-2 per 1000 captchas
- ❌ Requires API key

**Setup:**

1. Sign up at [anti-captcha.com](https://anti-captcha.com/)
2. Get your API key
3. Add balance to account
4. Configure environment:

```env
RECAPTCHA_PROVIDER=anti-captcha
RECAPTCHA_API_KEY=your_anticaptcha_api_key
```

**Usage:**
```bash
curl -X POST http://localhost:3000/api/scrape/recaptcha-test \
  -H "Content-Type: application/json" \
  -d '{
    "params": {"url": "https://www.google.com/recaptcha/api2/demo"},
    "config": {
      "recaptcha": {
        "enabled": true,
        "provider": "anti-captcha",
        "apiKey": "your_api_key"
      }
    }
  }'
```

## Testing reCAPTCHA Solving

### Test with Google's Demo Page

```bash
# Manual solving
curl -X POST http://localhost:3000/api/scrape/google-recaptcha-demo \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "headless": false,
      "recaptcha": {"enabled": true, "provider": "manual"}
    }
  }'

# With 2Captcha
curl -X POST http://localhost:3000/api/scrape/google-recaptcha-demo \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "recaptcha": {
        "enabled": true,
        "provider": "2captcha",
        "apiKey": "your_api_key"
      }
    }
  }'
```

### Test with Custom URL

```bash
curl -X POST http://localhost:3000/api/scrape/recaptcha-test \
  -H "Content-Type: application/json" \
  -d '{
    "params": {"url": "https://your-site-with-recaptcha.com"},
    "config": {
      "recaptcha": {"enabled": true, "provider": "2captcha", "apiKey": "key"}
    }
  }'
```

## Creating a Scraper with reCAPTCHA Support

```typescript
import { BaseScraper } from '../core/BaseScraper';
import type { ScraperParams } from '../types/scraper';

export class MyScraperWithRecaptcha extends BaseScraper<any> {
  protected async scrape(params: ScraperParams): Promise<any> {
    const { url } = params;

    // Navigate to page
    await this.navigateToUrl(url);

    // Check if reCAPTCHA is present
    const hasRecaptcha = await this.hasRecaptcha();

    if (hasRecaptcha) {
      console.log('reCAPTCHA detected, solving...');

      // Solve reCAPTCHA
      const solved = await this.solveRecaptcha();

      if (!solved) {
        throw new Error('Failed to solve reCAPTCHA');
      }

      console.log('reCAPTCHA solved!');
    }

    // Continue with scraping...
    const data = await this.page!.evaluate(() => {
      return {
        title: document.title,
        content: document.body.textContent
      };
    });

    return data;
  }
}
```

## Available Helper Methods

In your scraper, you have access to:

```typescript
// Check if reCAPTCHA is present
const hasCaptcha = await this.hasRecaptcha();

// Solve reCAPTCHA (returns true if solved, false if failed)
const solved = await this.solveRecaptcha();
```

## Supported CAPTCHA Types

- ✅ reCAPTCHA v2 (checkbox)
- ✅ reCAPTCHA v2 (invisible)
- ✅ reCAPTCHA v3
- ✅ hCaptcha

## Best Practices

### 1. Error Handling

```javascript
try {
  const solved = await this.solveRecaptcha();
  if (!solved) {
    throw new Error('CAPTCHA solving failed');
  }
} catch (error) {
  console.error('Error solving CAPTCHA:', error);
  // Handle error appropriately
}
```

### 2. Timeout Configuration

Set appropriate timeouts based on your provider:

```javascript
{
  "recaptcha": {
    "enabled": true,
    "provider": "2captcha",
    "timeout": 120000  // 2 minutes for API services
  }
}

// For manual solving
{
  "recaptcha": {
    "enabled": true,
    "provider": "manual",
    "timeout": 300000  // 5 minutes for human solving
  }
}
```

### 3. Cost Optimization

- Use caching to avoid solving the same CAPTCHA multiple times
- Implement retry logic with exponential backoff
- Monitor your API usage and balance
- Consider using manual solving for development/testing

### 4. Production Deployment

For Docker deployment with reCAPTCHA:

```yaml
services:
  scraping-api:
    environment:
      - RECAPTCHA_PROVIDER=2captcha
      - RECAPTCHA_API_KEY=${RECAPTCHA_API_KEY}
```

## Troubleshooting

### CAPTCHA Not Detected

- Verify the page actually has reCAPTCHA
- Check network requests for reCAPTCHA resources
- Ensure page is fully loaded before checking

### Solving Timeout

- Increase timeout value
- Check API service status
- Verify API key and balance
- Check network connectivity

### Invalid API Key

- Verify API key is correct
- Check account balance
- Ensure API key has proper permissions

### Manual Solving Not Working

- Ensure `headless: false` is set
- Check browser window is visible
- Increase timeout value
- Verify you can manually click the CAPTCHA

## Cost Estimates

### Monthly Costs (based on volume)

| Volume | 2Captcha | Anti-Captcha |
|--------|----------|--------------|
| 1,000 | $2.99 | $2.00 |
| 10,000 | $29.90 | $20.00 |
| 100,000 | $299.00 | $200.00 |
| 1,000,000 | $2,990.00 | $2,000.00 |

### Cost Optimization Tips

1. **Cache results** when possible
2. **Use manual solving** for development
3. **Implement smart detection** - only solve when necessary
4. **Monitor usage** with logging
5. **Set budget alerts** on your API account

## Additional Resources

- [2Captcha Documentation](https://2captcha.com/2captcha-api)
- [Anti-Captcha Documentation](https://anti-captcha.com/apidoc)
- [reCAPTCHA Documentation](https://developers.google.com/recaptcha)
