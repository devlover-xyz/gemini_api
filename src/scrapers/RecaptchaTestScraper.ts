import { BaseScraper } from '../core/BaseScraper';
import type { ScraperParams, ScraperConfig } from '../types/scraper';
import path from 'path';

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
      timeout: 180000, // 3 minutes for manual solving + submit + view result
      ...config,
      recaptcha: {
        enabled: true,
        provider: config.recaptcha?.provider || 'extension',
        extensionPath: config.recaptcha?.extensionPath || extensionPath,
        timeout: 180000, // 3 minutes for solving
        ...config.recaptcha,
      },
    };

    super(configWithExtension);

    console.log('[RecaptchaTestScraper] Chrome extension path:', extensionPath);
    console.log('[RecaptchaTestScraper] Timeout set to:', configWithExtension.timeout, 'ms (3 minutes)');
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
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Check if reCAPTCHA is present
    console.log('Detecting reCAPTCHA...');
    const hadRecaptcha = await this.hasRecaptcha();
    console.log(`reCAPTCHA detected: ${hadRecaptcha}`);

    let solved = false;

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
        console.log('Waiting 10 seconds for reCAPTCHA to be fully processed...');
        await new Promise((resolve) => setTimeout(resolve, 10000));
      } else {
        console.log('❌ Failed to solve reCAPTCHA automatically');
        console.log('💡 TIP: You have 60 seconds to solve manually...');

        // Wait 60 seconds for manual solving
        await new Promise((resolve) => setTimeout(resolve, 60000));

        // Check if solved manually
        const manualSolved = await this.page.evaluate(() => {
          const response = (window as any).grecaptcha?.getResponse();
          return response && response.length > 0;
        });

        if (manualSolved) {
          console.log('✅ reCAPTCHA solved manually!');
          solved = true;
          // Wait after manual solve too
          console.log('Waiting 5 seconds after manual solve...');
          await new Promise((resolve) => setTimeout(resolve, 5000));
        } else {
          console.log('❌ reCAPTCHA still not solved');
        }
      }
    }

    // Always try to submit the form, even if we're not sure it's solved
    // This ensures we don't skip submission
    console.log('Attempting to submit form...');

    // First, check if there's actually a form
    const hasForm = await this.page.evaluate(() => {
      return document.querySelector('form') !== null;
    });

    if (hasForm) {
      console.log('✅ Form found on page');

      // If solved, try to submit the form
      if (solved || hadRecaptcha) {
        // Fill any required form fields first
        const formFilled = await this.page.evaluate(() => {
          // Find any text inputs that might be required
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

        // Try to find and click submit button
        const submitted = await this.page.evaluate(() => {
          // Try multiple selectors for submit button
          const submitSelectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            'button:contains("Submit")',
            '#recaptcha-demo-submit',
            'button',
          ];

          for (const selector of submitSelectors) {
            const button = document.querySelector(selector) as HTMLElement;
            if (button) {
              button.click();
              return true;
            }
          }
          return false;
        });

        if (submitted) {
          console.log('✅ Submit button clicked!');

          // Wait longer for response/success message
          console.log('Waiting 10 seconds for response...');
          await new Promise((resolve) => setTimeout(resolve, 10000));

          // Check for success message or response
          const responseCheck = await this.page.evaluate(() => {
            const body = document.body.textContent || '';
            return {
              hasVerificationSuccess: body.includes('Verification Success') || body.includes('Hooray'),
              hasSuccess: body.includes('success') || body.includes('Success'),
              hasThankYou: body.includes('thank you') || body.includes('Thank you'),
              hasSuccessClass: document.querySelector('.success') !== null,
              hasAlertSuccess: document.querySelector('.alert-success') !== null,
              bodyText: body.substring(0, 200) // First 200 chars for debugging
            };
          });

          console.log('Response check:', JSON.stringify(responseCheck, null, 2));

          if (responseCheck.hasVerificationSuccess) {
            console.log('✅ Form submitted successfully! "Verification Success... Hooray!" received.');
          } else if (responseCheck.hasSuccess || responseCheck.hasThankYou || responseCheck.hasSuccessClass || responseCheck.hasAlertSuccess) {
            console.log('✅ Form submitted successfully! Success message received.');
          } else {
            console.log('⚠️  Form submitted but no clear success message found yet.');
            console.log('Waiting 10 more seconds for delayed response...');
            await new Promise((resolve) => setTimeout(resolve, 10000));

            // Check again
            const secondCheck = await this.page.evaluate(() => {
              const body = document.body.textContent || '';
              return body.includes('Verification Success') || body.includes('Hooray') || body.includes('Success');
            });

            if (secondCheck) {
              console.log('✅ Success message received after waiting!');
            }
          }

          // Take screenshot of result
          await this.takeScreenshot('./screenshots/recaptcha-test-result.png');
          console.log('📸 Screenshot saved: screenshots/recaptcha-test-result.png');

          // Wait 20 more seconds to view the result
          console.log('💡 Keeping browser open for 20 seconds to view result...');
          await new Promise((resolve) => setTimeout(resolve, 20000));
        } else {
          console.log('⚠️  Could not find submit button');
          console.log('Trying manual form submit as fallback...');

          // Try to submit form directly
          const formSubmitted = await this.page.evaluate(() => {
            const form = document.querySelector('form') as HTMLFormElement;
            if (form) {
              form.submit();
              return true;
            }
            return false;
          });

          if (formSubmitted) {
            console.log('✅ Form submitted via form.submit()');
            console.log('Waiting 15 seconds for response...');
            await new Promise((resolve) => setTimeout(resolve, 15000));
          }
        }
      } else {
        console.log('⚠️  Skipping form submission (reCAPTCHA not solved)');
      }
    } else {
      console.log('⚠️  No form found on page');
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
 * Automatically loads Chrome extension from extensions/solver
 */
export class GoogleRecaptchaDemoScraper extends BaseScraper<any> {
  constructor(config: ScraperConfig = {}) {
    // Auto-enable extension if recaptcha config doesn't exist or provider not set
    const extensionPath = path.resolve(process.cwd(), 'extensions/solver');

    // Merge config with extension defaults
    const configWithExtension: ScraperConfig = {
      timeout: 180000, // 3 minutes for manual solving + submit + view result
      ...config,
      recaptcha: {
        enabled: true,
        provider: config.recaptcha?.provider || 'extension',
        extensionPath: config.recaptcha?.extensionPath || extensionPath,
        timeout: 180000, // 3 minutes for solving
        ...config.recaptcha,
      },
    };

    super(configWithExtension);

    console.log('[GoogleRecaptchaDemoScraper] Chrome extension path:', extensionPath);
    console.log('[GoogleRecaptchaDemoScraper] Timeout set to:', configWithExtension.timeout, 'ms (3 minutes)');
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
    if (this.recaptchaSolver || this.recaptchaExtension) {
      console.log('[GoogleRecaptchaDemoScraper] Attempting to solve reCAPTCHA...');

      // Give more time for extension to load and solve
      console.log('[GoogleRecaptchaDemoScraper] Waiting 5 seconds for extension to initialize...');
      await new Promise((resolve) => setTimeout(resolve, 5000));

      solved = await this.solveRecaptcha();

      if (solved) {
        console.log('[GoogleRecaptchaDemoScraper] ✅ reCAPTCHA solved!');
        // Wait longer after solving to ensure it's fully processed
        console.log('[GoogleRecaptchaDemoScraper] Waiting 10 seconds for reCAPTCHA to be fully processed...');
        await new Promise((resolve) => setTimeout(resolve, 10000));
      } else {
        console.log('[GoogleRecaptchaDemoScraper] ⚠️  reCAPTCHA not solved (manual intervention required or solver failed)');
        console.log('[GoogleRecaptchaDemoScraper] 💡 TIP: You have 60 seconds to solve manually...');

        // Wait 60 seconds for manual solving
        await new Promise((resolve) => setTimeout(resolve, 60000));

        // Check if solved manually
        const manualSolved = await this.page.evaluate(() => {
          const response = (window as any).grecaptcha?.getResponse();
          return response && response.length > 0;
        });

        if (manualSolved) {
          console.log('[GoogleRecaptchaDemoScraper] ✅ reCAPTCHA solved manually!');
          solved = true;
          // Wait after manual solve too
          console.log('[GoogleRecaptchaDemoScraper] Waiting 5 seconds after manual solve...');
          await new Promise((resolve) => setTimeout(resolve, 5000));
        } else {
          console.log('[GoogleRecaptchaDemoScraper] ❌ reCAPTCHA still not solved');
        }
      }

      // If solved, try to submit the form
      if (solved) {
        console.log('[GoogleRecaptchaDemoScraper] Attempting to submit form...');

        // Fill any required form fields first
        const formFilled = await this.page.evaluate(() => {
          // Find any text inputs that might be required
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

        // Try to find and click submit button
        const submitted = await this.page.evaluate(() => {
          // Try multiple selectors for submit button
          const submitSelectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            'button:contains("Submit")',
            '#recaptcha-demo-submit',
            'button',
          ];

          for (const selector of submitSelectors) {
            const button = document.querySelector(selector) as HTMLElement;
            if (button) {
              button.click();
              return true;
            }
          }
          return false;
        });

        if (submitted) {
          console.log('[GoogleRecaptchaDemoScraper] ✅ Submit button clicked!');

          // Wait longer for response/success message
          console.log('[GoogleRecaptchaDemoScraper] Waiting 10 seconds for response...');
          await new Promise((resolve) => setTimeout(resolve, 10000));

          // Check for success message or response
          const responseCheck = await this.page.evaluate(() => {
            const body = document.body.textContent || '';
            return {
              hasVerificationSuccess: body.includes('Verification Success') || body.includes('Hooray'),
              hasSuccess: body.includes('success') || body.includes('Success'),
              hasThankYou: body.includes('thank you') || body.includes('Thank you'),
              hasSuccessClass: document.querySelector('.success') !== null,
              hasAlertSuccess: document.querySelector('.alert-success') !== null,
              bodyText: body.substring(0, 200) // First 200 chars for debugging
            };
          });

          console.log('[GoogleRecaptchaDemoScraper] Response check:', JSON.stringify(responseCheck, null, 2));

          if (responseCheck.hasVerificationSuccess) {
            console.log('[GoogleRecaptchaDemoScraper] ✅ Form submitted successfully! "Verification Success... Hooray!" received.');
          } else if (responseCheck.hasSuccess || responseCheck.hasThankYou || responseCheck.hasSuccessClass || responseCheck.hasAlertSuccess) {
            console.log('[GoogleRecaptchaDemoScraper] ✅ Form submitted successfully! Success message received.');
          } else {
            console.log('[GoogleRecaptchaDemoScraper] ⚠️  Form submitted but no clear success message found yet.');
            console.log('[GoogleRecaptchaDemoScraper] Waiting 10 more seconds for delayed response...');
            await new Promise((resolve) => setTimeout(resolve, 10000));

            // Check again
            const secondCheck = await this.page.evaluate(() => {
              const body = document.body.textContent || '';
              return body.includes('Verification Success') || body.includes('Hooray') || body.includes('Success');
            });

            if (secondCheck) {
              console.log('[GoogleRecaptchaDemoScraper] ✅ Success message received after waiting!');
            }
          }

          // Take screenshot of result
          await this.takeScreenshot('./screenshots/google-recaptcha-demo-result.png');
          console.log('[GoogleRecaptchaDemoScraper] 📸 Screenshot saved: screenshots/google-recaptcha-demo-result.png');

          // Wait 20 more seconds to view the result
          console.log('[GoogleRecaptchaDemoScraper] 💡 Keeping browser open for 20 seconds to view result...');
          await new Promise((resolve) => setTimeout(resolve, 20000));
        } else {
          console.log('[GoogleRecaptchaDemoScraper] ⚠️  Could not find submit button');
          console.log('[GoogleRecaptchaDemoScraper] Trying manual form submit as fallback...');

          // Try to submit form directly
          const formSubmitted = await this.page.evaluate(() => {
            const form = document.querySelector('form') as HTMLFormElement;
            if (form) {
              form.submit();
              return true;
            }
            return false;
          });

          if (formSubmitted) {
            console.log('[GoogleRecaptchaDemoScraper] ✅ Form submitted via form.submit()');
            console.log('[GoogleRecaptchaDemoScraper] Waiting 20 seconds for response...');
            await new Promise((resolve) => setTimeout(resolve, 20000));
          }
        }
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
