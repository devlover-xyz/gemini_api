import { BaseScraper } from '../core/BaseScraper';
import type { ScraperParams, ScraperConfig } from '../types/scraper';
import path from 'path';

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
 * Automatically loads Chrome extension from extensions/solver
 */
export class GoogleSearchScraper extends BaseScraper<GoogleSearchData> {
  constructor(config: ScraperConfig = {}) {
    // Auto-enable extension if recaptcha config doesn't exist or provider not set
    const extensionPath = path.resolve(process.cwd(), 'extensions/solver');

    // Merge config with extension defaults
    const configWithExtension: ScraperConfig = {
      timeout: 240000, // 4 minutes for captcha solving + navigation + scraping
      ...config,
      recaptcha: {
        enabled: true,
        provider: config.recaptcha?.provider || 'extension',
        extensionPath: config.recaptcha?.extensionPath || extensionPath,
        timeout: 120000, // 2 minutes for solving
        ...config.recaptcha,
      },
    };

    super(configWithExtension);

    console.log('[GoogleSearchScraper] Chrome extension path:', extensionPath);
    console.log('[GoogleSearchScraper] Timeout set to:', configWithExtension.timeout, 'ms');
  }
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

      // Strategy 1: Wait for page to be stable (max 8 seconds)
      console.log('[GoogleSearchScraper] Waiting for page to stabilize...');
      try {
        await Promise.race([
          // Wait for either search results or reCAPTCHA to appear
          this.page.waitForFunction(() => {
            return document.querySelector('#search') ||
                   document.querySelector('#rso') ||
                   document.querySelector('iframe[src*="recaptcha"]') ||
                   document.body.textContent?.includes('unusual traffic') ||
                   document.body.textContent?.includes('not a robot');
          }, { timeout: 8000 }),
          // Or wait minimum 3 seconds to let page render
          new Promise((resolve) => setTimeout(resolve, 3000))
        ]);
      } catch (error) {
        console.log('[GoogleSearchScraper] Page stabilize timeout, proceeding with check...');
      }

      // Check for reCAPTCHA presence
      const hasEarlyRecaptcha = await this.page.evaluate(() => {
        return !!document.querySelector('iframe[src*="recaptcha"]') ||
               document.body.textContent?.includes('unusual traffic') ||
               document.body.textContent?.includes('not a robot');
      });

      let isRecaptchaPage = hasEarlyRecaptcha;

      if (hasEarlyRecaptcha) {
        console.log('[GoogleSearchScraper] reCAPTCHA detected early, waiting 10s for full load...');
        await new Promise((resolve) => setTimeout(resolve, 10000));

        // Check again after wait to confirm
        const pageContent = await this.page.content();
        const stillHasRecaptcha = pageContent.includes('unusual traffic') ||
                                   pageContent.includes('not a robot') ||
                                   await this.page.evaluate(() => {
                                     return !!document.querySelector('iframe[src*="recaptcha"]');
                                   });

        // If early detection was true, treat as reCAPTCHA page even if it's no longer visible
        // (extension might have already started solving)
        isRecaptchaPage = true;
        console.log('[GoogleSearchScraper] reCAPTCHA still present after wait:', stillHasRecaptcha);
      }

      if (isRecaptchaPage) {
        console.log('[GoogleSearchScraper] ⚠️  Google reCAPTCHA challenge detected');
        await this.takeScreenshot('./screenshots/google-search-recaptcha-detected.png');

        // Check if iframe is still present
        const iframePresent = await this.page.evaluate(() => {
          return !!document.querySelector('iframe[src*="recaptcha"]');
        });

        if (iframePresent) {
          // Wait additional time for reCAPTCHA iframe to be fully interactive
          console.log('[GoogleSearchScraper] Waiting for reCAPTCHA iframe to be ready...');
          try {
            await this.page.waitForSelector('iframe[src*="recaptcha"]', {
              timeout: 10000,
              visible: true
            });
            console.log('[GoogleSearchScraper] ✅ reCAPTCHA iframe is ready');

            // Give extra time for iframe to become interactive (important for manual solving)
            console.log('[GoogleSearchScraper] Waiting for iframe to become fully interactive (3s)...');
            await new Promise((resolve) => setTimeout(resolve, 3000));
          } catch (error) {
            console.log('[GoogleSearchScraper] ⚠️  reCAPTCHA iframe wait timeout, continuing anyway...');
          }
        } else {
          console.log('[GoogleSearchScraper] reCAPTCHA iframe no longer present, extension may have already solved it');
        }

        // Wait for extension to solve reCAPTCHA
        if (this.recaptchaSolver || this.recaptchaExtension) {
          console.log('[GoogleSearchScraper] 🔄 Waiting for extension to solve reCAPTCHA...');
          console.log('[GoogleSearchScraper] 💡 Extension will automatically check the captcha box');

          // Check if already on search results (extension might have already solved)
          const currentUrl = this.page.url();
          const alreadySolved = currentUrl.includes('/search?q=');

          let solved = alreadySolved;

          if (alreadySolved) {
            console.log('[GoogleSearchScraper] ✅ Already on search results page, reCAPTCHA was solved automatically');
          } else {
            // Wait for captcha to be solved by extension
            solved = await this.waitForCaptchaSolved();
          }

          if (solved) {
            console.log('[GoogleSearchScraper] ✅ reCAPTCHA solved successfully!');
            await this.takeScreenshot('./screenshots/google-search-recaptcha-solved.png');

            // Wait for page to redirect to search results
            console.log('[GoogleSearchScraper] Waiting for redirect after captcha solve...');
            try {
              await this.page.waitForNavigation({
                timeout: 10000,
                waitUntil: 'networkidle2'
              });
              console.log('[GoogleSearchScraper] Navigation detected after captcha solve');
            } catch (navError) {
              console.log('[GoogleSearchScraper] No navigation detected, checking URL...');
            }

            // Additional wait for page to stabilize
            await new Promise((resolve) => setTimeout(resolve, 3000));

            // Check current URL
            const currentUrl = this.page.url();
            console.log('[GoogleSearchScraper] Current URL after solving:', currentUrl);

            // If still not on search results, re-navigate
            if (!currentUrl.includes('/search?q=')) {
              console.log('[GoogleSearchScraper] Re-navigating to search results...');
              await this.page.goto(searchUrl, {
                waitUntil: 'networkidle2',
                timeout: 20000
              });

              // Wait for results to load after navigation
              console.log('[GoogleSearchScraper] Waiting for search results to load...');
              await new Promise((resolve) => setTimeout(resolve, 5000));
            }
          } else {
            console.log('[GoogleSearchScraper] ❌ Failed to solve reCAPTCHA within timeout');
            await this.takeScreenshot('./screenshots/google-search-recaptcha-failed.png');
            throw new Error('Google blocked with reCAPTCHA. Extension could not solve it within the timeout.');
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

      console.log('[GoogleSearchScraper] Waiting for search results to appear...');
      for (const selector of selectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 15000 });
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

      // Take screenshot before extracting results (for debugging)
      await this.takeScreenshot('./screenshots/google-search-before-extract.png');

      // Extract search results with error handling
      console.log('[GoogleSearchScraper] Extracting search results...');

      // First, check what elements are available
      const elementCounts = await this.page.evaluate(() => {
        const counts: Record<string, number> = {};
        const selectors = ['.g', 'div[data-sokoban-container]', '.tF2Cxc', '#search', '#rso'];
        for (const selector of selectors) {
          counts[selector] = document.querySelectorAll(selector).length;
        }
        return counts;
      });
      console.log('[GoogleSearchScraper] Element counts:', elementCounts);

      const results = await this.page.evaluate((maxResults) => {
        const searchResults: Array<{
          title: string;
          link: string;
          snippet: string;
        }> = [];

        // Try multiple selectors for results
        const possibleSelectors = ['.g', 'div[data-sokoban-container]', '.tF2Cxc'];
        let resultElements: NodeListOf<Element> | null = null;
        let usedSelector = '';

        for (const selector of possibleSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            resultElements = elements;
            usedSelector = selector;
            console.log(`Using selector: ${selector}, found ${elements.length} elements`);
            break;
          }
        }

        if (!resultElements) {
          console.log('No result elements found with any selector');
          return searchResults;
        }

        console.log(`Processing ${Math.min(resultElements.length, maxResults)} results`);

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
              } else {
                console.log(`Filtered out result ${i}: href=${href}`);
              }
            } else {
              console.log(`Skipped result ${i}: titleEl=${!!titleEl}, linkEl=${!!linkEl}`);
            }
          } catch (error) {
            console.error('Error extracting result:', error);
          }
        }

        console.log(`Extracted ${searchResults.length} valid results`);
        return searchResults;
      }, limit);

      console.log(`[GoogleSearchScraper] Total results extracted: ${results.length}`);

      // Validate results
      if (!results || results.length === 0) {
        console.warn('[GoogleSearchScraper] ⚠️  No results found for query:', query);
        await this.takeScreenshot('./screenshots/google-search-zero-results.png');
        console.warn('[GoogleSearchScraper] Screenshot saved to: screenshots/google-search-zero-results.png');
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

  /**
   * Wait for captcha to be solved by extension
   * Polls the recaptcha anchor checkbox until it's checked
   */
  private async waitForCaptchaSolved(): Promise<boolean> {
    const timeout = 120000; // 2 minutes for Google Search
    const startTime = Date.now();

    console.log('[GoogleSearchScraper] ⏰ Waiting up to 2 minutes for extension to solve captcha...');

    let noIframeCount = 0;

    while (Date.now() - startTime < timeout) {
      try {
        // Check if page has already redirected to search results
        const currentUrl = this.page!.url();
        if (currentUrl.includes('/search?q=')) {
          console.log('[GoogleSearchScraper] ✅ Page redirected to search results');
          return true;
        }

        const isChecked = await this.page!.evaluate(() => {
          const anchor = document.querySelector('iframe[src*="recaptcha/api2/anchor"]');
          if (!anchor) return { checked: false, noIframe: true };

          const iframe = anchor as HTMLIFrameElement;
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!iframeDoc) return { checked: false, noIframe: false };

            const checkbox = iframeDoc.querySelector('#recaptcha-anchor');
            if (!checkbox) return { checked: false, noIframe: false };

            const ariaChecked = checkbox.getAttribute('aria-checked');
            return { checked: ariaChecked === 'true', noIframe: false };
          } catch (e) {
            return { checked: false, noIframe: false };
          }
        });

        if (isChecked.checked) {
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          console.log(`[GoogleSearchScraper] ✅ reCAPTCHA checkbox detected as checked (after ${elapsed}s)`);
          return true;
        }

        // Track consecutive no-iframe counts
        if (isChecked.noIframe) {
          noIframeCount++;
          if (noIframeCount > 5) {
            console.log('[GoogleSearchScraper] ⚠️  reCAPTCHA iframe not found after multiple checks, may have been solved already');
            // Check if we're on search results
            const urlCheck = this.page!.url();
            if (urlCheck.includes('/search?q=') || urlCheck.includes('google.com/search')) {
              return true;
            }
          }
        } else {
          noIframeCount = 0;
        }

        const elapsed = Math.round((Date.now() - startTime) / 1000);
        if (elapsed > 0 && elapsed % 10 === 0) {
          console.log(`[GoogleSearchScraper] 🔍 Still waiting for captcha... (${elapsed}s elapsed)`);
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log('[GoogleSearchScraper] ⏰ Timeout waiting for captcha to be solved');
    return false;
  }
}
