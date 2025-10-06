import { BaseScraper } from '../core/BaseScraper';
import type { ScraperParams } from '../types/scraper';

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

interface GoogleSearchData {
  query: string;
  results: SearchResult[];
  totalResults: number;
}

/**
 * Google Search Scraper - Production Ready
 * Optimized for reliability, efficiency, and resource management
 */
export class GoogleSearchScraper extends BaseScraper<GoogleSearchData> {
  protected async scrape(params: ScraperParams): Promise<GoogleSearchData> {
    const { query, limit = 10 } = params;

    if (!query) {
      throw new Error('Query parameter is required');
    }

    if (!this.page) {
      throw new Error('Page not initialized');
    }

    try {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en`;

      // Navigate with timeout and multiple wait strategies
      await Promise.race([
        this.navigateToUrl(searchUrl, 'domcontentloaded'),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Navigation timeout')), 15000)
        ),
      ]);

      // Wait for search results with multiple selectors as fallback
      const selectors = ['#search', '#rso', '.g'];
      let selectorFound = false;

      for (const selector of selectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 5000 });
          selectorFound = true;
          break;
        } catch (error) {
          console.log(`Selector ${selector} not found, trying next...`);
        }
      }

      if (!selectorFound) {
        throw new Error('Search results container not found');
      }

      // Small delay to ensure all content is loaded
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Extract search results with error handling
      const results = await this.page.evaluate((maxResults) => {
        const searchResults: Array<{
          title: string;
          link: string;
          snippet: string;
        }> = [];

        // Try multiple selectors for results
        const possibleSelectors = ['.g', 'div[data-sokoban-container]', '.tF2Cxc'];
        let resultElements: NodeListOf<Element> | null = null;

        for (const selector of possibleSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            resultElements = elements;
            break;
          }
        }

        if (!resultElements) {
          return searchResults;
        }

        for (let i = 0; i < Math.min(resultElements.length, maxResults); i++) {
          try {
            const element = resultElements[i];

            // Try multiple selectors for title
            const titleEl =
              element.querySelector('h3') ||
              element.querySelector('[role="heading"]');

            // Try multiple selectors for link
            const linkEl = element.querySelector('a[href]');

            // Try multiple selectors for snippet
            const snippetEl =
              element.querySelector('.VwiC3b') ||
              element.querySelector('.yXK7lf') ||
              element.querySelector('[data-sncf]') ||
              element.querySelector('.s');

            if (titleEl && linkEl) {
              const href = linkEl.getAttribute('href');
              // Filter out invalid links
              if (href && !href.startsWith('/search') && href.startsWith('http')) {
                searchResults.push({
                  title: titleEl.textContent?.trim() || '',
                  link: href,
                  snippet: snippetEl?.textContent?.trim() || '',
                });
              }
            }
          } catch (error) {
            console.error('Error extracting result:', error);
          }
        }

        return searchResults;
      }, limit);

      // Validate results
      if (!results || results.length === 0) {
        console.warn('No results found for query:', query);
      }

      return {
        query,
        results,
        totalResults: results.length,
      };
    } catch (error) {
      console.error('Google search scraping error:', error);
      throw new Error(
        `Failed to scrape Google search: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
