import { BaseScraper } from '../core/BaseScraper';
import type { ScraperParams, ScraperConfig } from '../types/scraper';
import path from 'path';

interface RecaptchaTestData {
  url: string;
  hadRecaptcha: boolean;
  solved: boolean;
  pageTitle: string;
  timestamp: string;
  response?: {
    bodyText: string;
    hasVerificationSuccess: boolean;
    hasHooray: boolean;
    title: string;
    url: string;
    responseElements?: Array<{
      className?: string;
      id?: string;
      text?: string;
    }>;
  };
}

/**
 * reCAPTCHA Test Scraper
 * Example scraper that demonstrates reCAPTCHA handling
 * Automatically loads Chrome extension from extensions/solver
 *
 * This scraper can be used to test reCAPTCHA solving on any URL
 */
export class RecaptchaTestScraper extends BaseScraper<RecaptchaTestData> {
  constructor(config: ScraperConfig = {}) {
    // Auto-enable extension if recaptcha config doesn't exist or provider not set
    const extensionPath = path.resolve(process.cwd(), 'extensions/solver');

    // Merge config with extension defaults
    const configWithExtension: ScraperConfig = {
      timeout: 360000, // 6 minutes for reload + challenge solving + submit + view result
      ...config,
      recaptcha: {
        enabled: true,
        provider: config.recaptcha?.provider || 'extension',
        extensionPath: config.recaptcha?.extensionPath || extensionPath,
        timeout: 360000, // 6 minutes for solving
        ...config.recaptcha,
      },
    };

    super(configWithExtension);

    console.log('[RecaptchaTestScraper] Chrome extension path:', extensionPath);
    console.log('[RecaptchaTestScraper] Timeout set to:', configWithExtension.timeout, 'ms (6 minutes)');
  }
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
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Wait for reCAPTCHA iframe specifically
    console.log('Waiting for reCAPTCHA iframe...');
    try {
      await this.page.waitForSelector('iframe[src*="recaptcha"]', {
        timeout: 15000,
        visible: true
      });
      console.log('✅ reCAPTCHA iframe found!');
    } catch (error) {
      console.log('⚠️  reCAPTCHA iframe not found, continuing anyway...');
    }

    // Check if reCAPTCHA is present
    console.log('Detecting reCAPTCHA...');
    const hadRecaptcha = await this.page.evaluate(() => {
      // Check for iframe
      const iframe = document.querySelector('iframe[src*="recaptcha"]');
      // Check for grecaptcha object
      const hasGrecaptcha = typeof (window as any).grecaptcha !== 'undefined';
      return iframe !== null || hasGrecaptcha;
    });
    console.log(`reCAPTCHA detected: ${hadRecaptcha}`);

    let solved = false;
    let scrapedResponse: any = undefined;

    // If reCAPTCHA is present, attempt to solve it
    if (hadRecaptcha) {
      console.log('Attempting to solve reCAPTCHA...');

      // Give more time for extension to load and solve
      console.log('Waiting 5 seconds for extension to initialize...');
      await new Promise((resolve) => setTimeout(resolve, 5000));

      solved = await this.solveRecaptcha();

      if (solved) {
        console.log('✅ reCAPTCHA solved successfully!');
        // Wait longer after solving to ensure it's fully processed
        console.log('Waiting 15 seconds for reCAPTCHA to be fully processed...');
        await new Promise((resolve) => setTimeout(resolve, 15000));

        // Check if reCAPTCHA reloaded (challenge appeared)
        const reloaded = await this.page.evaluate(() => {
          // Check for challenge iframe (image captcha)
          const challengeIframe = document.querySelector('iframe[src*="bframe"]');
          return challengeIframe !== null;
        });

        if (reloaded) {
          console.log('⚠️  reCAPTCHA reloaded with challenge! Waiting 90 seconds for manual solving...');
          console.log('💡 TIP: Please solve the image challenge that appeared');

          // Wait up to 90 seconds for challenge solving
          let challengeSolved = false;
          for (let i = 0; i < 18; i++) { // 18 * 5s = 90s
            await new Promise((resolve) => setTimeout(resolve, 5000));

            const checkSolved = await this.page.evaluate(() => {
              const response = (window as any).grecaptcha?.getResponse();
              return response && response.length > 0;
            });

            if (checkSolved) {
              console.log(`✅ Challenge solved! (after ${(i + 1) * 5} seconds)`);
              challengeSolved = true;
              solved = true;
              break;
            }

            if ((i + 1) % 6 === 0) { // Every 30 seconds
              console.log(`Still waiting... (${(i + 1) * 5}s elapsed)`);
            }
          }

          if (!challengeSolved) {
            console.log('❌ Challenge not solved within 90 seconds');
            solved = false;
          }
        }
      } else {
        console.log('❌ Failed to solve reCAPTCHA automatically');
        console.log('💡 TIP: You have 90 seconds to solve manually...');

        // Wait up to 90 seconds for manual solving
        let manualSolved = false;
        for (let i = 0; i < 18; i++) { // 18 * 5s = 90s
          await new Promise((resolve) => setTimeout(resolve, 5000));

          const checkSolved = await this.page.evaluate(() => {
            const response = (window as any).grecaptcha?.getResponse();
            return response && response.length > 0;
          });

          if (checkSolved) {
            console.log(`✅ reCAPTCHA solved manually! (after ${(i + 1) * 5} seconds)`);
            manualSolved = true;
            solved = true;
            break;
          }

          if ((i + 1) % 6 === 0) { // Every 30 seconds
            console.log(`Still waiting for manual solve... (${(i + 1) * 5}s elapsed)`);
          }
        }

        if (manualSolved) {
          // Wait after manual solve
          console.log('Waiting 5 seconds after manual solve...');
          await new Promise((resolve) => setTimeout(resolve, 5000));
        } else {
          console.log('❌ reCAPTCHA still not solved after 90 seconds');
        }
      }
    }

    // Auto-submit form if reCAPTCHA solved
    if (solved || hadRecaptcha) {
      console.log('🔄 Auto-submitting form after reCAPTCHA solved...');

      // Fill any required form fields first
      const formFilled = await this.page.evaluate(() => {
        const inputs = document.querySelectorAll('input[type="text"], input[type="email"], textarea');
        inputs.forEach((input: any) => {
          if (input.value === '' || input.value.trim() === '') {
            input.value = 'Test User';
          }
        });
        return inputs.length > 0;
      });

      if (formFilled) {
        console.log('✅ Form fields filled');
      }

      // Click submit button (prioritize #recaptcha-demo-submit)
      const submitResult = await this.page.evaluate(() => {
        // Try submit button with priority order
        const submitSelectors = [
          '#recaptcha-demo-submit',
          'input[type="submit"]',
          'button[type="submit"]',
          'button',
        ];

        for (const selector of submitSelectors) {
          const button = document.querySelector(selector) as HTMLElement;
          if (button) {
            button.click();
            return { success: true, selector };
          }
        }
        return { success: false, selector: null };
      });

      if (submitResult.success) {
        console.log(`✅ Submit button clicked (${submitResult.selector})`);

        // Wait for navigation or response (whichever happens first)
        console.log('⏳ Waiting for response...');
        try {
          // Try to wait for navigation if page reloads
          await Promise.race([
            this.page.waitForNavigation({ timeout: 5000, waitUntil: 'networkidle2' }),
            new Promise((resolve) => setTimeout(resolve, 5000))
          ]);
        } catch (error) {
          console.log('No navigation detected, continuing...');
        }

        // Additional wait for response to render
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Scrape response (with error handling for navigation)
        try {
          const response = await this.page.evaluate(() => {
            const body = document.body.textContent || '';

            // Extract full response
            const fullResponse: any = {
              bodyText: body,
              hasVerificationSuccess: body.includes('Verification Success'),
              hasHooray: body.includes('Hooray'),
              title: document.title,
              url: window.location.href,
            };

            // Try to find specific response elements
            const responseElements = [
              document.querySelector('.verification-success'),
              document.querySelector('.success'),
              document.querySelector('.alert-success'),
              document.querySelector('[class*="success"]'),
              document.querySelector('[id*="success"]'),
            ].filter(el => el !== null);

            if (responseElements.length > 0) {
              fullResponse.responseElements = responseElements.map(el => ({
                className: el?.className,
                id: el?.id,
                text: el?.textContent?.trim(),
              }));
            }

            return fullResponse;
          });

          console.log('📋 Response scraped:');
          console.log(JSON.stringify(response, null, 2));

          if (response.hasVerificationSuccess || response.hasHooray) {
            console.log('✅ SUCCESS: Verification Success... Hooray!');
          }

          // Store response for return
          scrapedResponse = response;
        } catch (error) {
          console.log('⚠️  Error scraping response:', error);
        }

        // Take screenshot of result
        await this.takeScreenshot('./screenshots/recaptcha-test-result.png');
        console.log('📸 Screenshot saved: screenshots/recaptcha-test-result.png');

        // Keep browser open briefly to view result
        console.log('💡 Keeping browser open for 10 seconds to view result...');
        await new Promise((resolve) => setTimeout(resolve, 10000));
      } else {
        console.log('❌ Could not find submit button');
      }
    } else {
      console.log('⚠️  Skipping form submission (reCAPTCHA not solved)');
    }

    // Get page title after solving (if applicable)
    const pageTitle = await this.page.title();

    const result: RecaptchaTestData = {
      url,
      hadRecaptcha,
      solved,
      pageTitle,
      timestamp: new Date().toISOString(),
    };

    if (scrapedResponse) {
      result.response = scrapedResponse;
    }

    return result;
  }
}

/**
 * Google reCAPTCHA Demo Scraper
 * Specifically for testing with Google's reCAPTCHA demo page
 * Automatically loads Chrome extension from extensions/solver
 */
export class GoogleRecaptchaDemoScraper extends BaseScraper<any> {
  constructor(config: ScraperConfig = {}) {
    // Auto-enable extension if recaptcha config doesn't exist or provider not set
    const extensionPath = path.resolve(process.cwd(), 'extensions/solver');

    // Merge config with extension defaults
    const configWithExtension: ScraperConfig = {
      timeout: 360000, // 6 minutes for reload + challenge solving + submit + view result
      ...config,
      recaptcha: {
        enabled: true,
        provider: config.recaptcha?.provider || 'extension',
        extensionPath: config.recaptcha?.extensionPath || extensionPath,
        timeout: 360000, // 6 minutes for solving
        ...config.recaptcha,
      },
    };

    super(configWithExtension);

    console.log('[GoogleRecaptchaDemoScraper] Chrome extension path:', extensionPath);
    console.log('[GoogleRecaptchaDemoScraper] Timeout set to:', configWithExtension.timeout, 'ms (6 minutes)');
  }
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
    let scrapedResponse: any = undefined;

    if (this.recaptchaSolver || this.recaptchaExtension) {
      console.log('[GoogleRecaptchaDemoScraper] Attempting to solve reCAPTCHA...');

      // Give more time for extension to load and solve
      console.log('[GoogleRecaptchaDemoScraper] Waiting 5 seconds for extension to initialize...');
      await new Promise((resolve) => setTimeout(resolve, 5000));

      solved = await this.solveRecaptcha();

      if (solved) {
        console.log('[GoogleRecaptchaDemoScraper] ✅ reCAPTCHA solved!');
        // Wait longer after solving to ensure it's fully processed
        console.log('[GoogleRecaptchaDemoScraper] Waiting 15 seconds for reCAPTCHA to be fully processed...');
        await new Promise((resolve) => setTimeout(resolve, 15000));

        // Check if reCAPTCHA reloaded (challenge appeared)
        const reloaded = await this.page.evaluate(() => {
          // Check for challenge iframe (image captcha)
          const challengeIframe = document.querySelector('iframe[src*="bframe"]');
          return challengeIframe !== null;
        });

        if (reloaded) {
          console.log('[GoogleRecaptchaDemoScraper] ⚠️  reCAPTCHA reloaded with challenge! Waiting 90 seconds for manual solving...');
          console.log('[GoogleRecaptchaDemoScraper] 💡 TIP: Please solve the image challenge that appeared');

          // Wait up to 90 seconds for challenge solving
          let challengeSolved = false;
          for (let i = 0; i < 18; i++) { // 18 * 5s = 90s
            await new Promise((resolve) => setTimeout(resolve, 5000));

            const checkSolved = await this.page.evaluate(() => {
              const response = (window as any).grecaptcha?.getResponse();
              return response && response.length > 0;
            });

            if (checkSolved) {
              console.log(`[GoogleRecaptchaDemoScraper] ✅ Challenge solved! (after ${(i + 1) * 5} seconds)`);
              challengeSolved = true;
              solved = true;
              break;
            }

            if ((i + 1) % 6 === 0) { // Every 30 seconds
              console.log(`[GoogleRecaptchaDemoScraper] Still waiting... (${(i + 1) * 5}s elapsed)`);
            }
          }

          if (!challengeSolved) {
            console.log('[GoogleRecaptchaDemoScraper] ❌ Challenge not solved within 90 seconds');
            solved = false;
          }
        }
      } else {
        console.log('[GoogleRecaptchaDemoScraper] ⚠️  reCAPTCHA not solved (manual intervention required or solver failed)');
        console.log('[GoogleRecaptchaDemoScraper] 💡 TIP: You have 90 seconds to solve manually...');

        // Wait up to 90 seconds for manual solving
        let manualSolved = false;
        for (let i = 0; i < 18; i++) { // 18 * 5s = 90s
          await new Promise((resolve) => setTimeout(resolve, 5000));

          const checkSolved = await this.page.evaluate(() => {
            const response = (window as any).grecaptcha?.getResponse();
            return response && response.length > 0;
          });

          if (checkSolved) {
            console.log(`[GoogleRecaptchaDemoScraper] ✅ reCAPTCHA solved manually! (after ${(i + 1) * 5} seconds)`);
            manualSolved = true;
            solved = true;
            break;
          }

          if ((i + 1) % 6 === 0) { // Every 30 seconds
            console.log(`[GoogleRecaptchaDemoScraper] Still waiting for manual solve... (${(i + 1) * 5}s elapsed)`);
          }
        }

        if (manualSolved) {
          // Wait after manual solve
          console.log('[GoogleRecaptchaDemoScraper] Waiting 5 seconds after manual solve...');
          await new Promise((resolve) => setTimeout(resolve, 5000));
        } else {
          console.log('[GoogleRecaptchaDemoScraper] ❌ reCAPTCHA still not solved after 90 seconds');
        }
      }

      // Auto-submit form if reCAPTCHA solved
      if (solved) {
        console.log('[GoogleRecaptchaDemoScraper] 🔄 Auto-submitting form after reCAPTCHA solved...');

        // Fill any required form fields first
        const formFilled = await this.page.evaluate(() => {
          const inputs = document.querySelectorAll('input[type="text"], input[type="email"], textarea');
          inputs.forEach((input: any) => {
            if (input.value === '' || input.value.trim() === '') {
              input.value = 'Test User';
            }
          });
          return inputs.length > 0;
        });

        if (formFilled) {
          console.log('[GoogleRecaptchaDemoScraper] ✅ Form fields filled');
        }

        // Click submit button (prioritize #recaptcha-demo-submit)
        const submitResult = await this.page.evaluate(() => {
          // Try submit button with priority order
          const submitSelectors = [
            '#recaptcha-demo-submit',
            'input[type="submit"]',
            'button[type="submit"]',
            'button',
          ];

          for (const selector of submitSelectors) {
            const button = document.querySelector(selector) as HTMLElement;
            if (button) {
              button.click();
              return { success: true, selector };
            }
          }
          return { success: false, selector: null };
        });

        if (submitResult.success) {
          console.log(`[GoogleRecaptchaDemoScraper] ✅ Submit button clicked (${submitResult.selector})`);

          // Wait for navigation or response (whichever happens first)
          console.log('[GoogleRecaptchaDemoScraper] ⏳ Waiting for response...');
          try {
            // Try to wait for navigation if page reloads
            await Promise.race([
              this.page.waitForNavigation({ timeout: 5000, waitUntil: 'networkidle2' }),
              new Promise((resolve) => setTimeout(resolve, 5000))
            ]);
          } catch (error) {
            console.log('[GoogleRecaptchaDemoScraper] No navigation detected, continuing...');
          }

          // Additional wait for response to render
          await new Promise((resolve) => setTimeout(resolve, 3000));

          // Scrape response (with error handling for navigation)
          try {
            const response = await this.page.evaluate(() => {
              const body = document.body.textContent || '';

              // Extract full response
              const fullResponse: any = {
                bodyText: body,
                hasVerificationSuccess: body.includes('Verification Success'),
                hasHooray: body.includes('Hooray'),
                title: document.title,
                url: window.location.href,
              };

              // Try to find specific response elements
              const responseElements = [
                document.querySelector('.verification-success'),
                document.querySelector('.success'),
                document.querySelector('.alert-success'),
                document.querySelector('[class*="success"]'),
                document.querySelector('[id*="success"]'),
              ].filter(el => el !== null);

              if (responseElements.length > 0) {
                fullResponse.responseElements = responseElements.map(el => ({
                  className: el?.className,
                  id: el?.id,
                  text: el?.textContent?.trim(),
                }));
              }

              return fullResponse;
            });

            console.log('[GoogleRecaptchaDemoScraper] 📋 Response scraped:');
            console.log(JSON.stringify(response, null, 2));

            if (response.hasVerificationSuccess || response.hasHooray) {
              console.log('[GoogleRecaptchaDemoScraper] ✅ SUCCESS: Verification Success... Hooray!');
            }

            // Store response for return
            scrapedResponse = response;
          } catch (error) {
            console.log('[GoogleRecaptchaDemoScraper] ⚠️  Error scraping response:', error);
          }

          // Take screenshot of result
          await this.takeScreenshot('./screenshots/google-recaptcha-demo-result.png');
          console.log('[GoogleRecaptchaDemoScraper] 📸 Screenshot saved: screenshots/google-recaptcha-demo-result.png');

          // Keep browser open briefly to view result
          console.log('[GoogleRecaptchaDemoScraper] 💡 Keeping browser open for 10 seconds to view result...');
          await new Promise((resolve) => setTimeout(resolve, 10000));
        } else {
          console.log('[GoogleRecaptchaDemoScraper] ❌ Could not find submit button');
        }
      }
    } else {
      console.log('[GoogleRecaptchaDemoScraper] ℹ️  No reCAPTCHA solver configured - skipping solve');
    }

    const result: any = {
      success: true,
      detected: true,
      solved,
      hasGrecaptcha,
      timestamp: new Date().toISOString(),
    };

    if (scrapedResponse) {
      result.response = scrapedResponse;
    }

    return result;
  }
}
