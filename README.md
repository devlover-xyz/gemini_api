# Scraping API

A reusable web scraping API built with Bun and Puppeteer.

## Features

- 🔥 Built with Bun for fast performance
- 🎯 Reusable scraper architecture with base class
- 🔌 Easy to add new scrapers
- 🌐 RESTful API with native Bun HTTP server
- 📦 TypeScript support
- 🎨 Clean architecture with separation of concerns
- 🤖 reCAPTCHA solver support (manual, 2captcha, anti-captcha, extension)
- 🥷 Stealth mode using puppeteer-extra-plugin-stealth for anti-detection
- 🎭 Random User-Agent rotation for each request
- 🔌 Chrome Extensions support (load and interact with extensions)
- 🏊 Browser pooling for concurrent requests
- ⚡ Request queue and rate limiting
- 🔄 Auto-retry with exponential backoff
- 🐳 Docker-ready with production optimizations
- 📊 Built-in monitoring and metrics
- ✅ Implements Puppeteer best practices

## Project Structure

```
.
├── src/
│   ├── core/
│   │   ├── BaseScraper.ts       # Abstract base class for scrapers
│   │   └── ScraperManager.ts    # Manages and executes scrapers
│   ├── scrapers/
│   │   ├── ExampleScraper.ts    # Example scraper implementation
│   │   ├── GoogleSearchScraper.ts # Google search scraper
│   │   └── RecaptchaTestScraper.ts # reCAPTCHA test scraper
│   ├── routes/
│   │   └── scraper.routes.ts    # API route handlers
│   ├── types/
│   │   └── scraper.ts           # TypeScript interfaces
│   ├── utils/
│   │   ├── response.ts          # Response helpers
│   │   ├── recaptcha.ts         # reCAPTCHA solver
│   │   └── extension-loader.ts  # Chrome extension loader
│   ├── libs/                    # Extension source files
│   │   └── solver/              # reCAPTCHA solver source
│   └── index.ts                 # Main server file
├── tests/
│   ├── test-single-tab.ts       # Browser tab optimization test
│   ├── test-recaptcha.ts        # reCAPTCHA auto-click test
│   ├── test-stealth.ts          # Stealth mode test
│   ├── test-extension-*.ts      # Chrome extension tests
│   ├── test-google-*.ts         # Google search tests
│   ├── test-*-ua.ts             # User-Agent tests
│   ├── run-all.ts               # Test runner
│   └── README.md                # Tests documentation
├── extensions/
│   └── solver/                  # reCAPTCHA solver extension (built)
├── docs/                        # Documentation files
│   ├── README.md                # Documentation index
│   ├── RECAPTCHA.md             # reCAPTCHA guide
│   ├── STEALTH.md               # Stealth mode guide
│   ├── CHROME_EXTENSIONS.md     # Extensions guide
│   └── ... (other docs)
├── package.json
└── README.md
```

## Installation

```bash
bun install
```

## Environment Variables

Create a `.env` file:

```env
PORT=3000
NODE_ENV=development
HEADLESS=true
```

## Usage

### Start the server

Development mode with hot reload:
```bash
bun run dev
```

Production mode:
```bash
bun run start
```

### API Endpoints

#### Get all registered scrapers
```bash
GET /api/scrapers
```

Response:
```json
{
  "scrapers": ["example", "google-search"]
}
```

#### Execute scraper (POST)
```bash
POST /api/scrape/:scraperName
Content-Type: application/json

{
  "params": {
    "url": "https://example.com"
  },
  "config": {
    "headless": true,
    "timeout": 30000
  }
}
```

#### Execute scraper (GET with query params)
```bash
GET /api/scrape/example?url=https://example.com
```

Response:
```json
{
  "success": true,
  "data": {
    "title": "Example Domain",
    "description": "Example description",
    "url": "https://example.com"
  },
  "timestamp": "2025-10-06T10:30:00.000Z",
  "duration": 2341
}
```

## Creating a New Scraper

1. Create a new file in `src/scrapers/` directory:

```typescript
// src/scrapers/MyScraper.ts
import { BaseScraper } from '../core/BaseScraper';
import type { ScraperParams } from '../types/scraper';

interface MyData {
  // Define your data structure
  title: string;
  items: string[];
}

export class MyScraper extends BaseScraper<MyData> {
  protected async scrape(params: ScraperParams): Promise<MyData> {
    const { url } = params;

    // Navigate to URL
    await this.navigateToUrl(url);

    // Wait for elements
    await this.waitForSelector('.content');

    // Extract data
    const title = await this.getTextContent('h1');
    const items = await this.getAllTextContent('.item');

    return {
      title: title || '',
      items,
    };
  }
}
```

2. Register your scraper in `src/scrapers/index.ts`:

```typescript
import { MyScraper } from './MyScraper';

export function registerScrapers() {
  scraperManager.register('example', ExampleScraper);
  scraperManager.register('google-search', GoogleSearchScraper);
  scraperManager.register('my-scraper', MyScraper); // Add this
}
```

3. Use it via API:

```bash
POST /api/scrape/my-scraper
{
  "params": {
    "url": "https://example.com"
  }
}
```

## Available Helper Methods in BaseScraper

- `navigateToUrl(url, waitUntil)` - Navigate to a URL
- `waitForSelector(selector, timeout)` - Wait for element to appear
- `getTextContent(selector)` - Get text content of an element
- `getAllTextContent(selector)` - Get text content of all matching elements
- `getAttribute(selector, attribute)` - Get attribute value
- `takeScreenshot(path)` - Take screenshot
- `hasRecaptcha()` - Check if reCAPTCHA is present on page
- `solveRecaptcha()` - Solve reCAPTCHA automatically
- `page` - Access Puppeteer page instance directly

## Anti-Detection & reCAPTCHA Support

✅ **Stealth Mode Enabled** - Uses `puppeteer-extra-plugin-stealth` to bypass bot detection
✅ **reCAPTCHA Detection: 100%** - Proper Puppeteer best practices
✅ **Chrome Extensions Support** - Load and interact with Chrome extensions

This API includes:
- **Stealth Mode**: Automatically bypasses most bot detection systems. See [STEALTH.md](docs/STEALTH.md)
- **reCAPTCHA Solver**: Automatic reCAPTCHA solving with multiple providers. See [RECAPTCHA.md](docs/RECAPTCHA.md)
- **Chrome Extensions**: Load and control Chrome extensions in Puppeteer. See [CHROME_EXTENSIONS.md](docs/CHROME_EXTENSIONS.md)

### Quick Start

```bash
# Test detection only (no solver needed)
curl -X POST http://localhost:3000/api/scrape/google-recaptcha-demo

# Test with manual solving
curl -X POST http://localhost:3000/api/scrape/google-recaptcha-demo \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "headless": false,
      "recaptcha": {"enabled": true, "provider": "manual"}
    }
  }'

# Test with 2Captcha
curl -X POST http://localhost:3000/api/scrape/recaptcha-test \
  -H "Content-Type: application/json" \
  -d '{
    "params": {"url": "https://example.com"},
    "config": {
      "recaptcha": {
        "enabled": true,
        "provider": "2captcha",
        "apiKey": "your_api_key"
      }
    }
  }'
```

### Supported Methods

- **Extension** - Free (experimental), browser extension-based
- **Manual** - Free, requires human intervention
- **2Captcha** - Paid (~$2.99/1000), fully automated
- **Anti-Captcha** - Paid (~$2/1000), fully automated

### Detection Features

- ✅ Multiple wait strategies (`waitForSelector`, `waitForFunction`)
- ✅ Resource whitelisting (reCAPTCHA, gstatic.com)
- ✅ Anti-detection measures
- ✅ Fallback detection methods
- ✅ Support for v2, v3, hCaptcha

See [SOLUTION.md](docs/SOLUTION.md) for technical details.

### Chrome Extensions

Load and interact with Chrome extensions in your scrapers:

```typescript
import { ExtensionScraper } from './src/scrapers/ExtensionScraper';

const scraper = new ExtensionScraper({
  headless: false, // Required for extensions
  extensionPath: './path/to/extension',
});

const result = await scraper.execute({ url: 'https://example.com' });
```

Features:
- ✅ Auto-detect Manifest V2 & V3
- ✅ Access service workers / background pages
- ✅ Execute code in extension context
- ✅ Open and interact with extension popups
- ✅ Check content script injection

See [CHROME_EXTENSIONS.md](docs/CHROME_EXTENSIONS.md) for complete guide.

## Example Requests

### Example Scraper
```bash
curl -X POST http://localhost:3000/api/scrape/example \
  -H "Content-Type: application/json" \
  -d '{"params": {"url": "https://example.com"}}'
```

### Google Search Scraper
```bash
curl -X POST http://localhost:3000/api/scrape/google-search \
  -H "Content-Type: application/json" \
  -d '{"params": {"query": "bun javascript", "limit": 5}}'
```

Or with GET:
```bash
curl "http://localhost:3000/api/scrape/google-search?query=bun+javascript&limit=5"
```

```bash
curl -X POST http://localhost:3000/api/scrape/google-search \
  -H "Content-Type: application/json" \
  -d '{"params": {"query": "bun javascript", "limit": 5}, "config": {"headless": false, "recaptcha": {"enabled": true, "provider": "extension"}}}'
```
## Configuration

Each scraper can be configured with:

- `headless` - Run browser in headless mode (default: true)
- `timeout` - Navigation timeout in ms (default: 30000)
- `userAgent` - Custom user agent (default: random realistic UA)
- `viewport` - Browser viewport size (default: 1920x1080)

Example:
```json
{
  "params": {"url": "https://example.com"},
  "config": {
    "headless": false,
    "timeout": 60000,
    "userAgent": "Custom User Agent",
    "viewport": {"width": 1280, "height": 720}
  }
}
```

**Note**: If `userAgent` is not specified, each request will use a different random realistic user agent from the `user-agents` package. This helps avoid detection by preventing user agent-based tracking.

## Troubleshooting

Having issues? Check the [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) guide for common problems and solutions:

- Google blocking with reCAPTCHA
- Page errors (`solveSimpleChallenge is not defined`)
- Request timeouts
- Navigation errors
- And more...

## Testing

All tests are located in the `tests/` folder.

### Run Individual Tests

```bash
# Test browser tab optimization (should only open 1 tab)
bun tests/test-single-tab.ts

# Test reCAPTCHA auto-click
bun tests/test-recaptcha.ts

# Test stealth mode
bun tests/test-stealth.ts

# Test User-Agent generation
bun tests/test-ua-simple.ts
```

### Run All Tests

```bash
bun tests/run-all.ts
```

### Test Results

After recent optimizations:
- ✅ **Browser Tab**: Only 1 tab opens (50% reduction)
- ✅ **reCAPTCHA**: Auto-click checkbox works perfectly
- ✅ **Performance**: 53% faster execution (~16s vs ~34s)
- ✅ **Memory**: 33% less usage (~100MB vs ~150MB)

See [tests/README.md](tests/README.md) for detailed test documentation.

## Recent Improvements

### v2.0.0 - Browser & reCAPTCHA Optimization (2025-10-07)

**Fixed:**
- ✅ Browser no longer opens duplicate tabs (1 tab instead of 2)
- ✅ reCAPTCHA checkbox auto-click implemented
- ✅ 53% faster execution time
- ✅ 33% less memory usage

**Documentation:**
- 📄 [RECAPTCHA_FIX.md](docs/RECAPTCHA_FIX.md) - Technical details
- 📄 [CHANGELOG_TAB_FIX.md](docs/CHANGELOG_TAB_FIX.md) - Changelog
- 📄 [TAB_OPTIMIZATION_SUMMARY.md](docs/TAB_OPTIMIZATION_SUMMARY.md) - Summary

## Documentation

Complete documentation is available in the [`docs/`](docs/) folder:

- 📚 **[Documentation Index](docs/README.md)** - Complete list of all documentation
- 🔧 **[RECAPTCHA.md](docs/RECAPTCHA.md)** - reCAPTCHA solving guide
- 🥷 **[STEALTH.md](docs/STEALTH.md)** - Stealth mode and anti-detection
- 🔌 **[CHROME_EXTENSIONS.md](docs/CHROME_EXTENSIONS.md)** - Chrome extensions support
- 🚀 **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Deployment guide
- 🛠️ **[TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** - Common issues and solutions
- 📋 **[BEST-PRACTICES.md](docs/BEST-PRACTICES.md)** - Puppeteer best practices
- 📖 **[SOLUTION.md](docs/SOLUTION.md)** - Technical implementation details

See [docs/README.md](docs/README.md) for complete documentation index.

## License

MIT
