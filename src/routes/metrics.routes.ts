import { browserPool } from '../core/BrowserPool';
import { requestQueue } from '../core/RequestQueue';
import { scraperManager } from '../core/ScraperManager';
import { successResponse } from '../utils/response';

export function handleMetricsRoute(req: Request): Response {
  const metrics = {
    timestamp: new Date().toISOString(),
    system: {
      memory: {
        rss: process.memoryUsage().rss,
        heapUsed: process.memoryUsage().heapUsed,
        heapTotal: process.memoryUsage().heapTotal,
        external: process.memoryUsage().external,
        formatted: {
          rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
          external: `${Math.round(process.memoryUsage().external / 1024 / 1024)}MB`,
        },
      },
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
    },
    browserPool: {
      ...browserPool.getStats(),
      utilizationPercent: Math.round(
        (browserPool.getStats().inUse / browserPool.getStats().maxInstances) * 100
      ),
    },
    requestQueue: {
      ...requestQueue.getStats(),
      utilizationPercent: Math.round(
        (requestQueue.getStats().processing / requestQueue.getStats().maxConcurrent) * 100
      ),
      rateUtilizationPercent: Math.round(
        (requestQueue.getStats().requestsLastMinute /
          requestQueue.getStats().requestsPerMinute) *
          100
      ),
    },
    scrapers: {
      registered: scraperManager.getRegisteredScrapers(),
      total: scraperManager.getRegisteredScrapers().length,
    },
  };

  return successResponse(metrics);
}
