import { scraperManager } from '../core/ScraperManager';
import { jsonResponse, errorResponse, successResponse } from '../utils/response';

export async function handleScraperRoutes(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // GET /api/scrapers - List all registered scrapers
  if (pathname === '/api/scrapers' && req.method === 'GET') {
    const scrapers = scraperManager.getRegisteredScrapers();
    return successResponse({ scrapers });
  }

  // POST /api/scrape/:scraperName - Execute a scraper
  const scrapeMatch = pathname.match(/^\/api\/scrape\/([^\/]+)$/);
  if (scrapeMatch && req.method === 'POST') {
    const scraperName = scrapeMatch[1];

    if (!scraperManager.hasScraper(scraperName)) {
      return errorResponse(`Scraper "${scraperName}" not found`, 404);
    }

    try {
      const body = await req.json().catch(() => ({}));
      const { params = {}, config = {} } = body;

      // Add timeout protection (60 seconds max)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout after 60 seconds')), 60000);
      });

      const result = await Promise.race([
        scraperManager.execute(scraperName, params, config),
        timeoutPromise
      ]);

      if (result.success) {
        return successResponse(result);
      } else {
        return errorResponse(result.error || 'Scraping failed', 500);
      }
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : 'Invalid request',
        error instanceof Error && error.message.includes('timeout') ? 504 : 400
      );
    }
  }

  // GET /api/scrape/:scraperName - Execute scraper with query params
  if (scrapeMatch && req.method === 'GET') {
    const scraperName = scrapeMatch[1];

    if (!scraperManager.hasScraper(scraperName)) {
      return errorResponse(`Scraper "${scraperName}" not found`, 404);
    }

    try {
      const params = Object.fromEntries(url.searchParams.entries());

      // Add timeout protection (60 seconds max)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout after 60 seconds')), 60000);
      });

      const result = await Promise.race([
        scraperManager.execute(scraperName, params),
        timeoutPromise
      ]);

      if (result.success) {
        return successResponse(result);
      } else {
        return errorResponse(result.error || 'Scraping failed', 500);
      }
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : 'Invalid request',
        error instanceof Error && error.message.includes('timeout') ? 504 : 400
      );
    }
  }

  return errorResponse('Route not found', 404);
}
