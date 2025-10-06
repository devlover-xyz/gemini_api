# Stealth Mode - Anti-Detection

This API uses `puppeteer-extra-plugin-stealth` to bypass bot detection systems.

## Features

The stealth plugin automatically handles:

✅ **navigator.webdriver** - Hidden (returns `false` or `undefined`)
✅ **Chrome runtime** - Properly emulated
✅ **Plugins array** - Realistic plugin list
✅ **Languages** - Proper language headers
✅ **Permissions** - Permission API properly emulated
✅ **WebGL** - WebGL vendor/renderer properly spoofed
✅ **Canvas fingerprinting** - Canvas noise added
✅ **Audio context** - Audio fingerprinting protection
✅ **Fonts** - Font fingerprinting protection
✅ **Media codecs** - Proper codec support

## Testing

Run the stealth test to verify it's working:

```bash
bun test-stealth.ts
```

Expected output:
```json
{
  "webdriver": false,
  "plugins": 5,
  "languages": ["en-US", "en"],
  "hasChrome": true,
  "hasPermissions": true
}
```

## How It Works

The stealth plugin is automatically applied to all scrapers through `BaseScraper`:

```typescript
// src/core/BaseScraper.ts
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Add stealth plugin
puppeteerExtra.use(StealthPlugin());

// Launch browser with stealth mode
this.browser = await puppeteerExtra.launch({
  headless: true,
  args: [/* ... */]
});
```

## Benefits

1. **Bypass bot detection** - Most sites won't detect you as a bot
2. **Automatic** - No manual configuration needed
3. **Comprehensive** - Covers 30+ detection vectors
4. **Updated regularly** - Plugin is actively maintained

## Detection Tests

You can test against these bot detection sites:

- https://bot.sannysoft.com/ - Comprehensive bot detection test
- https://arh.antoinevastel.com/bots/areyouheadless - Headless detection
- https://pixelscan.net/ - Advanced fingerprinting test
- https://browserleaks.com/webgl - WebGL fingerprinting

## Limitations

Even with stealth mode, some advanced detection systems may still detect automation:

- **Behavioral analysis** - Human-like behavior is still needed
- **IP reputation** - Use residential proxies for better results
- **Rate limiting** - Don't scrape too fast
- **CAPTCHA** - Some sites will still show CAPTCHA (use reCAPTCHA solvers)

## Best Practices

1. **Add delays** - Use random delays between actions
2. **Randomize behavior** - Vary mouse movements, typing speed
3. **Use proxies** - Rotate IP addresses
4. **Respect robots.txt** - Don't scrape disallowed pages
5. **Monitor errors** - Watch for detection and adjust

## Combining with reCAPTCHA Solver

Stealth mode works great with reCAPTCHA solvers:

```bash
curl -X POST http://localhost:3000/api/scrape/google-search \\
  -H "Content-Type: application/json" \\
  -d '{
    "params": {"query": "test"},
    "config": {
      "recaptcha": {
        "enabled": true,
        "provider": "manual"
      }
    }
  }'
```

With stealth mode + reCAPTCHA solver, you can:
- Bypass most bot detection
- Solve CAPTCHAs when they appear
- Successfully scrape protected sites

## References

- [puppeteer-extra-plugin-stealth](https://github.com/berstend/puppeteer-extra/tree/master/packages/puppeteer-extra-plugin-stealth)
- [Bot detection tests](https://bot.sannysoft.com/)
- [Puppeteer best practices](https://medium.com/nerd-for-tech/puppeteer-best-practices-3a1a72c912b0)
