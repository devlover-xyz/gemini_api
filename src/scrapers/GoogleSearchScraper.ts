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

      console.log(`[GoogleSearchScraper] Navigating to: ${searchUrl}`);

      // Navigate with timeout protection
      try {
        await Promise.race([
          this.page.goto(searchUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 20000
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Navigation timeout')), 20000)
          ),
        ]);
        console.log('[GoogleSearchScraper] Page loaded');
      } catch (navError) {
        console.error('[GoogleSearchScraper] Navigation error:', navError);
        await this.takeScreenshot('./screenshots/google-search-nav-error.png');
        throw new Error(`Failed to navigate to Google: ${navError instanceof Error ? navError.message : 'Unknown error'}`);
      }

      // Check for Google's reCAPTCHA challenge page
      console.log('[GoogleSearchScraper] Checking for reCAPTCHA...');
      const pageContent = await this.page.content();
      const isRecaptchaPage = pageContent.includes('unusual traffic') ||
                               pageContent.includes('not a robot') ||
                               await this.page.evaluate(() => {
                                 return !!document.querySelector('iframe[src*="recaptcha"]');
                               });

      if (isRecaptchaPage) {
        console.log('[GoogleSearchScraper] ⚠️  Google reCAPTCHA challenge detected');
        await this.takeScreenshot('./screenshots/google-search-recaptcha-detected.png');

        // Wait for reCAPTCHA iframe to be visible
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Attempt to solve if solver is configured
        if (this.recaptchaSolver || this.recaptchaExtension) {
          console.log('[GoogleSearchScraper] Attempting to solve reCAPTCHA...');
          const solved = await this.solveRecaptcha();

          if (solved) {
            console.log('[GoogleSearchScraper] ✅ reCAPTCHA solved successfully!');
            await this.takeScreenshot('./screenshots/google-search-recaptcha-solved.png');

            // Wait for page to redirect to search results
            await new Promise((resolve) => setTimeout(resolve, 5000));

            // Check current URL
            const currentUrl = this.page.url();
            console.log('[GoogleSearchScraper] Current URL after solving:', currentUrl);

            // If still not on search results, re-navigate
            if (!currentUrl.includes('/search?q=')) {
              console.log('[GoogleSearchScraper] Re-navigating to search results...');
              await this.page.goto(searchUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 20000
              });
            }
          } else {
            console.log('[GoogleSearchScraper] ❌ Failed to solve reCAPTCHA');
            await this.takeScreenshot('./screenshots/google-search-recaptcha-failed.png');
            throw new Error('Google blocked with reCAPTCHA. Please configure a reCAPTCHA solver or try again later.');
          }
        } else {
          console.log('[GoogleSearchScraper] ❌ No reCAPTCHA solver configured');
          throw new Error('Google blocked with reCAPTCHA. Please configure a reCAPTCHA solver (manual, 2captcha, anti-captcha, or extension).');
        }
      } else {
        console.log('[GoogleSearchScraper] ✅ No reCAPTCHA detected, proceeding with scraping');
      }

      // Wait for search results with multiple selectors as fallback
      const selectors = ['#search', '#rso', '.g'];
      let selectorFound = false;

      for (const selector of selectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 5000 });
          selectorFound = true;
          console.log(`[GoogleSearchScraper] Found search results with selector: ${selector}`);
          break;
        } catch (error) {
          console.log(`[GoogleSearchScraper] Selector ${selector} not found, trying next...`);
        }
      }

      if (!selectorFound) {
        // Take screenshot for debugging
        await this.takeScreenshot('./screenshots/google-search-error.png');

        // Check again if it's a reCAPTCHA page (might have changed after initial check)
        const stillRecaptcha = await this.page.evaluate(() => {
          return document.body.textContent?.includes('unusual traffic') ||
                 document.body.textContent?.includes('not a robot') ||
                 !!document.querySelector('iframe[src*="recaptcha"]');
        });

        if (stillRecaptcha) {
          throw new Error('Google blocked with reCAPTCHA. Please configure a reCAPTCHA solver using config.recaptcha parameter. Supported providers: manual, 2captcha, anti-captcha, extension. Screenshot saved to: screenshots/google-search-error.png');
        }

        throw new Error('Search results container not found. This may be due to Google blocking, rate limiting, or changed selectors. Screenshot saved to: screenshots/google-search-error.png');
      }

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
