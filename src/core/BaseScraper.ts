import puppeteer, { Browser, Page } from 'puppeteer';
import type { ScraperConfig, ScraperResult, ScraperParams } from '../types/scraper';
import { RecaptchaSolver } from '../utils/recaptcha';
import { RecaptchaExtension, getExtensionLaunchArgs } from '../../libs/solver/loader';

export abstract class BaseScraper<T = any> {
  protected browser?: Browser;
  protected page?: Page;
  protected config: ScraperConfig;
  protected recaptchaSolver?: RecaptchaSolver;
  protected recaptchaExtension?: RecaptchaExtension;
  private cleanupTimeout?: Timer;
  private isClosing = false;

  constructor(config: ScraperConfig = {}) {
    this.config = {
      headless: config.headless ?? true,
      timeout: config.timeout ?? 30000,
      userAgent: config.userAgent,
      viewport: config.viewport ?? { width: 1920, height: 1080 },
      maxRetries: config.maxRetries ?? 2,
      retryDelay: config.retryDelay ?? 1000,
      recaptcha: config.recaptcha || {
        enabled: false,
        provider: 'manual',
      },
    };

    // Initialize reCAPTCHA solver if enabled
    if (this.config.recaptcha?.enabled) {
      // Use browser extension if provider is 'extension'
      if (this.config.recaptcha.provider === 'extension') {
        this.recaptchaExtension = new RecaptchaExtension({
          enabled: true,
          autoSolve: false, // Manual control
          debug: true,
        });
      } else {
        // Use API-based solver
        this.recaptchaSolver = new RecaptchaSolver({
          provider: this.config.recaptcha.provider,
          apiKey: this.config.recaptcha.apiKey,
          timeout: this.config.recaptcha.timeout,
        });
      }
    }
  }

  /**
   * Initialize browser and page with production-ready settings
   */
  protected async init(): Promise<void> {
    const launchTimeout = setTimeout(() => {
      throw new Error('Browser launch timeout exceeded');
    }, 30000);

    try {
      // Prepare launch args
      const baseArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Overcome limited resource problems in Docker
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--window-size=1920,1080',
      ];

      // Add extension args if using extension
      let launchArgs = baseArgs;
      if (this.recaptchaExtension) {
        launchArgs = [...baseArgs, ...this.recaptchaExtension.getLaunchArgs()];
      }

      this.browser = await puppeteer.launch({
        headless: this.recaptchaExtension ? false : (this.config.headless ? 'new' : false),
        args: launchArgs,
        // Prevent memory leaks
        protocolTimeout: this.config.timeout,
      });

      this.page = await this.browser.newPage();

      // Set resource limits
      await this.page.setRequestInterception(true);
      this.page.on('request', (request) => {
        // Block unnecessary resources to save memory
        const resourceType = request.resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          request.abort();
        } else {
          request.continue();
        }
      });

      // Handle page errors to prevent crashes
      this.page.on('error', (error) => {
        console.error('Page crashed:', error);
      });

      this.page.on('pageerror', (error) => {
        console.error('Page error:', error);
      });

      if (this.config.userAgent) {
        await this.page.setUserAgent(this.config.userAgent);
      }

      if (this.config.viewport) {
        await this.page.setViewport(this.config.viewport);
      }

      await this.page.setDefaultNavigationTimeout(this.config.timeout!);
      await this.page.setDefaultTimeout(this.config.timeout!);

      // Setup extension if enabled
      if (this.recaptchaExtension) {
        await this.recaptchaExtension.setupPage(this.page);
      }

      // Set a safety timeout to force cleanup
      this.cleanupTimeout = setTimeout(() => {
        if (!this.isClosing) {
          console.warn('Force closing browser due to timeout');
          this.forceClose();
        }
      }, this.config.timeout! * 3);

      clearTimeout(launchTimeout);
    } catch (error) {
      clearTimeout(launchTimeout);
      await this.forceClose();
      throw error;
    }
  }

  /**
   * Close browser gracefully
   */
  protected async close(): Promise<void> {
    if (this.isClosing) return;
    this.isClosing = true;

    if (this.cleanupTimeout) {
      clearTimeout(this.cleanupTimeout);
    }

    try {
      if (this.page && !this.page.isClosed()) {
        await Promise.race([
          this.page.close(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Page close timeout')), 5000)
          ),
        ]);
      }
    } catch (error) {
      console.error('Error closing page:', error);
    }

    try {
      if (this.browser && this.browser.process()) {
        await Promise.race([
          this.browser.close(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Browser close timeout')), 5000)
          ),
        ]);
      }
    } catch (error) {
      console.error('Error closing browser:', error);
      // Force kill if graceful close fails
      if (this.browser?.process()) {
        this.browser.process()?.kill('SIGKILL');
      }
    }

    this.page = undefined;
    this.browser = undefined;
  }

  /**
   * Force close browser (kill process)
   */
  private async forceClose(): Promise<void> {
    try {
      if (this.browser?.process()) {
        this.browser.process()?.kill('SIGKILL');
      }
    } catch (error) {
      console.error('Error force closing browser:', error);
    }
    this.page = undefined;
    this.browser = undefined;
  }

  /**
   * Abstract method that must be implemented by child classes
   */
  protected abstract scrape(params: ScraperParams): Promise<T>;

  /**
   * Execute scraping with error handling, retry mechanism, and timeout
   */
  async execute(params: ScraperParams = {}): Promise<ScraperResult<T>> {
    const startTime = Date.now();
    let lastError: Error | null = null;
    const maxRetries = this.config.maxRetries || 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Wrap entire execution in a timeout
        const result = await Promise.race([
          this.executeWithInit(params),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error('Scraping execution timeout')),
              this.config.timeout! * 2
            )
          ),
        ]);

        const duration = Date.now() - startTime;
        return {
          success: true,
          data: result,
          timestamp: new Date().toISOString(),
          duration,
          retries: attempt,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.error(`Scraping attempt ${attempt + 1} failed:`, lastError.message);

        // Always cleanup on error
        await this.close();

        // Don't retry on the last attempt
        if (attempt < maxRetries) {
          const delay = this.config.retryDelay! * (attempt + 1);
          console.log(`Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    const duration = Date.now() - startTime;
    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      timestamp: new Date().toISOString(),
      duration,
      retries: maxRetries,
    };
  }

  /**
   * Internal execution with initialization
   */
  private async executeWithInit(params: ScraperParams): Promise<T> {
    try {
      await this.init();
      const data = await this.scrape(params);
      return data;
    } finally {
      await this.close();
    }
  }

  /**
   * Navigate to URL with wait options
   */
  protected async navigateToUrl(url: string, waitUntil: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2' = 'networkidle2'): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }
    await this.page.goto(url, { waitUntil });
  }

  /**
   * Wait for selector
   */
  protected async waitForSelector(selector: string, timeout?: number): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }
    await this.page.waitForSelector(selector, { timeout: timeout ?? this.config.timeout });
  }

  /**
   * Get text content from selector
   */
  protected async getTextContent(selector: string): Promise<string | null> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }
    return this.page.$eval(selector, (el) => el.textContent?.trim() ?? null);
  }

  /**
   * Get multiple elements text content
   */
  protected async getAllTextContent(selector: string): Promise<string[]> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }
    return this.page.$$eval(selector, (elements) =>
      elements.map((el) => el.textContent?.trim() ?? '').filter(Boolean)
    );
  }

  /**
   * Get attribute value from selector
   */
  protected async getAttribute(selector: string, attribute: string): Promise<string | null> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }
    return this.page.$eval(selector, (el, attr) => el.getAttribute(attr), attribute);
  }

  /**
   * Take screenshot
   */
  protected async takeScreenshot(path: string): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }
    await this.page.screenshot({ path, fullPage: true });
  }

  /**
   * Solve reCAPTCHA if present on the page
   */
  protected async solveRecaptcha(): Promise<boolean> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    // Use extension if available
    if (this.recaptchaExtension) {
      try {
        return await this.recaptchaExtension.solve(this.page);
      } catch (error) {
        console.error('Failed to solve reCAPTCHA with extension:', error);
        return false;
      }
    }

    // Use API-based solver
    if (!this.recaptchaSolver) {
      console.warn('reCAPTCHA solver not enabled');
      return false;
    }

    try {
      return await this.recaptchaSolver.waitAndSolve(this.page);
    } catch (error) {
      console.error('Failed to solve reCAPTCHA:', error);
      return false;
    }
  }

  /**
   * Check if reCAPTCHA is present
   */
  protected async hasRecaptcha(): Promise<boolean> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    // Use extension if available
    if (this.recaptchaExtension) {
      return await this.recaptchaExtension.detect(this.page);
    }

    // Use API-based solver
    if (!this.recaptchaSolver) {
      return false;
    }

    return await this.recaptchaSolver.detectRecaptcha(this.page);
  }
}
