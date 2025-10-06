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
│   │   └── index.ts             # Register scrapers here
│   ├── routes/
│   │   └── scraper.routes.ts    # API route handlers
│   ├── types/
│   │   └── scraper.ts           # TypeScript interfaces
│   ├── utils/
│   │   └── response.ts          # Response helpers
│   └── index.ts                 # Main server file
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

## reCAPTCHA Support

This API supports automatic reCAPTCHA solving. See [RECAPTCHA.md](RECAPTCHA.md) for detailed documentation.

### Quick Start

```bash
# Test with manual solving (free)
curl -X POST http://localhost:3000/api/scrape/google-recaptcha-demo \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "headless": false,
      "recaptcha": {"enabled": true, "provider": "manual"}
    }
  }'

# Test with 2Captcha (paid)
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

- **Manual** - Free, requires human intervention
- **2Captcha** - Paid (~$2.99/1000), fully automated
- **Anti-Captcha** - Paid (~$2/1000), fully automated

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

## Configuration

Each scraper can be configured with:

- `headless` - Run browser in headless mode (default: true)
- `timeout` - Navigation timeout in ms (default: 30000)
- `userAgent` - Custom user agent
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

## License

MIT
