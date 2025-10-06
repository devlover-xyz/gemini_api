import type { BaseScraper } from './BaseScraper';
import type { ScraperParams, ScraperResult } from '../types/scraper';

export class ScraperManager {
  private scrapers: Map<string, new (...args: any[]) => BaseScraper>;

  constructor() {
    this.scrapers = new Map();
  }

  /**
   * Register a scraper with a unique name
   */
  register(name: string, scraperClass: new (...args: any[]) => BaseScraper): void {
    if (this.scrapers.has(name)) {
      throw new Error(`Scraper with name "${name}" already exists`);
    }
    this.scrapers.set(name, scraperClass);
  }

  /**
   * Get all registered scraper names
   */
  getRegisteredScrapers(): string[] {
    return Array.from(this.scrapers.keys());
  }

  /**
   * Check if a scraper exists
   */
  hasScraper(name: string): boolean {
    return this.scrapers.has(name);
  }

  /**
   * Execute a scraper by name
   */
  async execute<T = any>(
    name: string,
    params: ScraperParams = {},
    config?: any
  ): Promise<ScraperResult<T>> {
    const ScraperClass = this.scrapers.get(name);

    if (!ScraperClass) {
      return {
        success: false,
        error: `Scraper "${name}" not found`,
        timestamp: new Date().toISOString(),
        duration: 0,
      };
    }

    try {
      const scraper = new ScraperClass(config);
      return await scraper.execute(params);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        duration: 0,
      };
    }
  }

  /**
   * Unregister a scraper
   */
  unregister(name: string): boolean {
    return this.scrapers.delete(name);
  }
}

export const scraperManager = new ScraperManager();
