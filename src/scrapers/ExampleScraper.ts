import { BaseScraper } from '../core/BaseScraper';
import type { ScraperParams } from '../types/scraper';

interface ExampleData {
  title: string;
  description: string;
  url: string;
}

/**
 * Example scraper implementation
 * This scraper extracts title and description from a webpage
 */
export class ExampleScraper extends BaseScraper<ExampleData> {
  protected async scrape(params: ScraperParams): Promise<ExampleData> {
    const { url } = params;

    if (!url) {
      throw new Error('URL parameter is required');
    }

    // Navigate to the URL
    await this.navigateToUrl(url);

    // Extract data
    const title = await this.getTextContent('title') || 'No title found';
    const description = await this.getAttribute('meta[name="description"]', 'content') || 'No description found';

    return {
      title,
      description,
      url,
    };
  }
}
