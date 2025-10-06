import { registerScrapers } from './scrapers';
import { handleScraperRoutes } from './routes/scraper.routes';
import { handleMetricsRoute } from './routes/metrics.routes';
import { errorResponse } from './utils/response';
import { scraperManager } from './core/ScraperManager';
import { browserPool } from './core/BrowserPool';
import { requestQueue } from './core/RequestQueue';
import pkg from '../package.json';

const PORT = process.env.PORT || 3000;
const startTime = Date.now();

// Register all scrapers
registerScrapers();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await browserPool.destroy();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await browserPool.destroy();
  process.exit(0);
});

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    // Route handling
    try {
      let response: Response;

      // Health check
      if (url.pathname === '/' || url.pathname === '/health') {
        const uptime = Date.now() - startTime;
        const uptimeSeconds = Math.floor(uptime / 1000);
        const uptimeMinutes = Math.floor(uptimeSeconds / 60);
        const uptimeHours = Math.floor(uptimeMinutes / 60);

        response = new Response(
          JSON.stringify({
            status: 'ok',
            message: 'Scraping API is running',
            version: pkg.version,
            name: pkg.name,
            engine: {
              name: 'Bun',
              version: Bun.version,
            },
            runtime: {
              platform: process.platform,
              arch: process.arch,
              nodeVersion: process.version,
            },
            uptime: {
              milliseconds: uptime,
              seconds: uptimeSeconds,
              minutes: uptimeMinutes,
              hours: uptimeHours,
              human: uptimeHours > 0
                ? `${uptimeHours}h ${uptimeMinutes % 60}m ${uptimeSeconds % 60}s`
                : uptimeMinutes > 0
                ? `${uptimeMinutes}m ${uptimeSeconds % 60}s`
                : `${uptimeSeconds}s`,
            },
            memory: {
              usage: process.memoryUsage(),
              rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
              heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
              heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
              external: `${Math.round(process.memoryUsage().external / 1024 / 1024)}MB`,
            },
            scrapers: {
              registered: scraperManager.getRegisteredScrapers(),
              total: scraperManager.getRegisteredScrapers().length,
            },
            browserPool: browserPool.getStats(),
            requestQueue: requestQueue.getStats(),
            timestamp: new Date().toISOString(),
            endpoints: {
              health: 'GET /health',
              metrics: 'GET /api/metrics',
              scrapers: 'GET /api/scrapers',
              scrape: 'POST /api/scrape/:scraperName',
              scrapeGet: 'GET /api/scrape/:scraperName?param=value',
            },
          }, null, 2),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      // Metrics endpoint
      else if (url.pathname === '/api/metrics' && req.method === 'GET') {
        response = handleMetricsRoute(req);
      }
      // API routes
      else if (url.pathname.startsWith('/api/')) {
        response = await handleScraperRoutes(req);
      }
      // 404
      else {
        response = errorResponse('Not found', 404);
      }

      // Add CORS headers to response
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    } catch (error) {
      console.error('Server error:', error);
      const response = errorResponse('Internal server error', 500);
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }
  },
});

console.log(`🚀 Scraping API server running at http://localhost:${server.port}`);
console.log(`\n📊 Configuration:`);
console.log(`  Browser Pool Size: ${process.env.BROWSER_POOL_SIZE || 5}`);
console.log(`  Max Concurrent: ${process.env.MAX_CONCURRENT_REQUESTS || 3}`);
console.log(`  Rate Limit: ${process.env.REQUESTS_PER_MINUTE || 60} requests/minute`);
console.log(`\nAvailable endpoints:`);
console.log(`  GET  /health - Health check with system info`);
console.log(`  GET  /api/metrics - Detailed metrics and monitoring`);
console.log(`  GET  /api/scrapers - List all scrapers`);
console.log(`  POST /api/scrape/:scraperName - Execute scraper`);
console.log(`  GET  /api/scrape/:scraperName - Execute scraper with query params`);
