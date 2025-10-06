import { BaseScraper } from '../core/BaseScraper';
import type { ScraperParams } from '../types/scraper';

interface RecaptchaTestData {
  url: string;
  hadRecaptcha: boolean;
  solved: boolean;
  pageTitle: string;
  timestamp: string;
}

/**
 * reCAPTCHA Test Scraper
 * Example scraper that demonstrates reCAPTCHA handling
 *
 * This scraper can be used to test reCAPTCHA solving on any URL
 */
export class RecaptchaTestScraper extends BaseScraper<RecaptchaTestData> {
  protected async scrape(params: ScraperParams): Promise<RecaptchaTestData> {
    const { url } = params;

    if (!url) {
      throw new Error('URL parameter is required');
    }

    if (!this.page) {
      throw new Error('Page not initialized');
    }

    // Navigate to the URL
    console.log(`Navigating to: ${url}`);
    await this.navigateToUrl(url, 'networkidle2');

    // Wait for reCAPTCHA to load (important!)
    console.log('Waiting for reCAPTCHA to load...');
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Check if reCAPTCHA is present
    console.log('Detecting reCAPTCHA...');
    const hadRecaptcha = await this.hasRecaptcha();
    console.log(`reCAPTCHA detected: ${hadRecaptcha}`);

    let solved = false;

    // If reCAPTCHA is present, attempt to solve it
    if (hadRecaptcha) {
      console.log('Attempting to solve reCAPTCHA...');
      solved = await this.solveRecaptcha();

      if (solved) {
        console.log('✅ reCAPTCHA solved successfully!');
        // Wait a bit after solving
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } else {
        console.log('❌ Failed to solve reCAPTCHA');
      }
    }

    // Get page title after solving (if applicable)
    const pageTitle = await this.page.title();

    return {
      url,
      hadRecaptcha,
      solved,
      pageTitle,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Google reCAPTCHA Demo Scraper
 * Specifically for testing with Google's reCAPTCHA demo page
 */
export class GoogleRecaptchaDemoScraper extends BaseScraper<any> {
  protected async scrape(params: ScraperParams): Promise<any> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    const demoUrl = 'https://www.google.com/recaptcha/api2/demo';

    console.log(`[GoogleRecaptchaDemoScraper] Navigating to: ${demoUrl}`);

    // Navigate and wait for page
    await this.page.goto(demoUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    console.log('[GoogleRecaptchaDemoScraper] Page loaded');

    // Wait for reCAPTCHA iframe specifically
    console.log('[GoogleRecaptchaDemoScraper] Waiting for reCAPTCHA iframe...');
    try {
      await this.page.waitForSelector('iframe[src*="recaptcha"]', {
        timeout: 15000,
        visible: true
      });
      console.log('[GoogleRecaptchaDemoScraper] ✅ reCAPTCHA iframe found!');
    } catch (error) {
      console.error('[GoogleRecaptchaDemoScraper] ❌ Failed to find reCAPTCHA iframe');
      await this.takeScreenshot('./screenshots/recaptcha-error.png');
      throw new Error('reCAPTCHA iframe not found');
    }

    // Verify grecaptcha object
    const hasGrecaptcha = await this.page.evaluate(() => {
      return typeof (window as any).grecaptcha !== 'undefined';
    });

    if (!hasGrecaptcha) {
      throw new Error('grecaptcha object not found');
    }

    console.log('[GoogleRecaptchaDemoScraper] ✅ reCAPTCHA detected successfully!');

    // Try to solve reCAPTCHA if solver is configured
    let solved = false;
    if (this.recaptchaSolver || this.recaptchaExtension) {
      console.log('[GoogleRecaptchaDemoScraper] Attempting to solve reCAPTCHA...');
      solved = await this.solveRecaptcha();

      if (!solved) {
        console.log('[GoogleRecaptchaDemoScraper] ⚠️  reCAPTCHA not solved (manual intervention required or solver failed)');
      } else {
        console.log('[GoogleRecaptchaDemoScraper] ✅ reCAPTCHA solved!');
      }
    } else {
      console.log('[GoogleRecaptchaDemoScraper] ℹ️  No reCAPTCHA solver configured - skipping solve');
    }

    return {
      success: true,
      detected: true,
      solved,
      hasGrecaptcha,
      timestamp: new Date().toISOString(),
    };
  }
}
