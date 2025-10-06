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

    console.log(`Navigating to Google reCAPTCHA demo: ${demoUrl}`);

    // Best practice: Use networkidle0 for pages with dynamic content
    await this.navigateToUrl(demoUrl, 'networkidle0');
    console.log('Page loaded with networkidle0');

    // Check for reCAPTCHA (this now includes proper wait strategies)
    console.log('Detecting reCAPTCHA...');
    const hasRecaptcha = await this.hasRecaptcha();

    // Debug: Log what's on the page
    const pageInfo = await this.page.evaluate(() => {
      return {
        hasGrecaptcha: typeof (window as any).grecaptcha !== 'undefined',
        iframes: Array.from(document.querySelectorAll('iframe')).map(f => f.src),
        divs: Array.from(document.querySelectorAll('div[class*="recaptcha"]')).length,
        scripts: Array.from(document.querySelectorAll('script[src*="recaptcha"]')).length,
      };
    });
    console.log('Page info:', JSON.stringify(pageInfo, null, 2));

    if (!hasRecaptcha) {
      // Take screenshot for debugging
      await this.takeScreenshot('./debug-recaptcha.png');
      console.log('Screenshot saved to debug-recaptcha.png');
      throw new Error('reCAPTCHA not found on demo page');
    }

    console.log('✅ reCAPTCHA detected successfully!');

    // Solve reCAPTCHA
    console.log('Solving reCAPTCHA on demo page...');
    const solved = await this.solveRecaptcha();

    if (!solved) {
      throw new Error('Failed to solve reCAPTCHA');
    }

    console.log('✅ reCAPTCHA solved! Submitting form...');

    // Try to submit the form
    try {
      await this.page.click('#recaptcha-demo-submit');
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check if submission was successful
      const successText = await this.page.evaluate(() => {
        const body = document.body.textContent || '';
        return body.includes('Verification Success');
      });

      return {
        success: true,
        solved: true,
        submitted: true,
        verificationSuccess: successText,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: true,
        solved: true,
        submitted: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
