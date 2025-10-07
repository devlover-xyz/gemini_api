/**
 * Example Scraper with Chrome Extension Support
 * Demonstrates how to use Chrome extensions with Puppeteer scraping
 */

import { BaseScraper } from '../core/BaseScraper';
import type { ScraperParams } from '../types/scraper';
import { ExtensionManager } from '../utils/extension-loader';
import type { Browser } from 'puppeteer';

interface ExtensionScraperData {
  url: string;
  pageTitle: string;
  extensionLoaded: boolean;
  extensionId?: string;
  contentScriptInjected: boolean;
  timestamp: string;
}

export interface ExtensionScraperConfig {
  /** Path to Chrome extension directory */
  extensionPath: string;
  /** Wait for extension to be ready before scraping */
  waitForExtension?: boolean;
  /** Extension load timeout (ms) */
  extensionTimeout?: number;
}

/**
 * Scraper with Chrome Extension Support
 *
 * Usage:
 * ```typescript
 * const scraper = new ExtensionScraper({
 *   headless: false, // Required for extensions
 *   extensionPath: './path/to/extension',
 * });
 *
 * const result = await scraper.execute({
 *   url: 'https://example.com'
 * });
 * ```
 */
export class ExtensionScraper extends BaseScraper<ExtensionScraperData> {
  private extensionConfig?: ExtensionScraperConfig;
  private extensionManager?: ExtensionManager;

  constructor(config: any) {
    // Force headless: false for extensions
    super({
      ...config,
      headless: false, // Extensions require non-headless mode
    });

    // Store extension config
    if (config.extensionPath) {
      this.extensionConfig = {
        extensionPath: config.extensionPath,
        waitForExtension: config.waitForExtension ?? true,
        extensionTimeout: config.extensionTimeout ?? 10000,
      };
    }
  }

  /**
   * Override init to add extension support
   */
  protected async init(): Promise<void> {
    // Call parent init first (but we'll override the browser launch)
    if (!this.extensionConfig) {
      return await super.init();
    }

    // Custom browser launch with extension
    await this.initWithExtension();
  }

  /**
   * Initialize browser with extension
   */
  private async initWithExtension(): Promise<void> {
    const puppeteer = (await import('puppeteer')).default;

    // Get extension launch args
    const extensionArgs = ExtensionManager.getLaunchArgs(
      this.extensionConfig!.extensionPath
    );

    // Launch browser with extension
    const baseArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--window-size=1920,1080',
    ];

    this.browser = await puppeteer.launch({
      headless: false, // Required for extensions
      args: [...baseArgs, ...extensionArgs],
      defaultViewport: this.config.viewport || { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
    }) as Browser;

    // Get existing page
    const pages = await this.browser.pages();
    this.page = pages.length > 0 ? pages[0] : await this.browser.newPage();

    // Set up page
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
    });

    await this.page.setDefaultNavigationTimeout(this.config.timeout!);
    await this.page.setDefaultTimeout(this.config.timeout!);

    // Wait for extension if configured
    if (this.extensionConfig?.waitForExtension) {
      console.log('[ExtensionScraper] Waiting for extension to load...');

      this.extensionManager = new ExtensionManager();
      const extensionInfo = await this.extensionManager.waitForExtension(
        this.browser,
        {
          path: this.extensionConfig.extensionPath,
          timeout: this.extensionConfig.extensionTimeout,
        }
      );

      console.log(
        `[ExtensionScraper] Extension loaded: ${extensionInfo.id} (Manifest v${extensionInfo.manifestVersion})`
      );
    }
  }

  /**
   * Main scraping logic
   */
  protected async scrape(params: ScraperParams): Promise<ExtensionScraperData> {
    const { url } = params;

    if (!url) {
      throw new Error('URL parameter is required');
    }

    if (!this.page) {
      throw new Error('Page not initialized');
    }

    console.log(`[ExtensionScraper] Navigating to: ${url}`);
    await this.page.goto(url, { waitUntil: 'networkidle2' });

    // Wait for content scripts to inject
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Get page info
    const pageTitle = await this.page.title();

    // Check if extension is loaded
    const extensionInfo = this.extensionManager?.getExtensionInfo();

    // Check if content script is injected
    let contentScriptInjected = false;
    if (this.extensionManager) {
      contentScriptInjected =
        await this.extensionManager.isContentScriptInjected(this.page);
    }

    return {
      url,
      pageTitle,
      extensionLoaded: !!extensionInfo,
      extensionId: extensionInfo?.id,
      contentScriptInjected,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get extension manager (for advanced usage)
   */
  getExtensionManager(): ExtensionManager | undefined {
    return this.extensionManager;
  }

  /**
   * Execute code in extension context
   */
  async evaluateExtension<T = any>(
    pageFunction: string | ((...args: any[]) => T),
    ...args: any[]
  ): Promise<T> {
    if (!this.extensionManager) {
      throw new Error('Extension manager not initialized');
    }
    return await this.extensionManager.evaluate(pageFunction, ...args);
  }
}
