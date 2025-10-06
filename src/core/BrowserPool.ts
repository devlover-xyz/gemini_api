import puppeteer, { Browser, Page } from 'puppeteer';

interface BrowserInstance {
  browser: Browser;
  inUse: boolean;
  createdAt: number;
  lastUsed: number;
}

export class BrowserPool {
  private instances: BrowserInstance[] = [];
  private maxInstances: number;
  private maxIdleTime: number;
  private cleanupInterval?: Timer;

  constructor(maxInstances: number = 5, maxIdleTime: number = 300000) {
    this.maxInstances = maxInstances;
    this.maxIdleTime = maxIdleTime; // 5 minutes default

    // Cleanup idle browsers periodically
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleBrowsers();
    }, 60000); // Check every minute
  }

  /**
   * Get a browser instance from the pool
   */
  async acquire(): Promise<Browser> {
    // Try to find an available browser
    const available = this.instances.find((instance) => !instance.inUse);

    if (available) {
      available.inUse = true;
      available.lastUsed = Date.now();
      return available.browser;
    }

    // Create new browser if under limit
    if (this.instances.length < this.maxInstances) {
      const browser = await this.createBrowser();
      const instance: BrowserInstance = {
        browser,
        inUse: true,
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };
      this.instances.push(instance);
      return browser;
    }

    // Wait for an available browser
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Browser pool timeout - all instances busy'));
      }, 30000);

      const checkInterval = setInterval(() => {
        const available = this.instances.find((instance) => !instance.inUse);
        if (available) {
          clearInterval(checkInterval);
          clearTimeout(timeout);
          available.inUse = true;
          available.lastUsed = Date.now();
          resolve(available.browser);
        }
      }, 100);
    });
  }

  /**
   * Release a browser back to the pool
   */
  async release(browser: Browser): Promise<void> {
    const instance = this.instances.find((i) => i.browser === browser);
    if (instance) {
      instance.inUse = false;
      instance.lastUsed = Date.now();

      // Close all pages except one to free memory
      const pages = await browser.pages();
      for (let i = 1; i < pages.length; i++) {
        try {
          await pages[i].close();
        } catch (error) {
          console.error('Error closing page:', error);
        }
      }
    }
  }

  /**
   * Create a new browser instance
   */
  private async createBrowser(): Promise<Browser> {
    return await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--window-size=1920,1080',
      ],
    });
  }

  /**
   * Cleanup idle browsers
   */
  private async cleanupIdleBrowsers(): Promise<void> {
    const now = Date.now();
    const toRemove: BrowserInstance[] = [];

    for (const instance of this.instances) {
      if (!instance.inUse && now - instance.lastUsed > this.maxIdleTime) {
        toRemove.push(instance);
      }
    }

    for (const instance of toRemove) {
      try {
        await instance.browser.close();
        this.instances = this.instances.filter((i) => i !== instance);
        console.log('Closed idle browser');
      } catch (error) {
        console.error('Error closing idle browser:', error);
      }
    }
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      total: this.instances.length,
      inUse: this.instances.filter((i) => i.inUse).length,
      available: this.instances.filter((i) => !i.inUse).length,
      maxInstances: this.maxInstances,
    };
  }

  /**
   * Close all browsers and cleanup
   */
  async destroy(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    for (const instance of this.instances) {
      try {
        await instance.browser.close();
      } catch (error) {
        console.error('Error closing browser:', error);
      }
    }

    this.instances = [];
  }
}

// Global browser pool instance
export const browserPool = new BrowserPool(
  parseInt(process.env.BROWSER_POOL_SIZE || '5'),
  parseInt(process.env.BROWSER_MAX_IDLE_TIME || '300000')
);
