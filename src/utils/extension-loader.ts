/**
 * Chrome Extension Loader for Puppeteer
 * Based on: https://pptr.dev/guides/chrome-extensions
 */

import path from 'path';
import type { Browser, Target, Page } from 'puppeteer';

export interface ExtensionConfig {
  /** Path to extension directory (containing manifest.json) */
  path: string;
  /** Extension ID (optional, will be detected automatically) */
  id?: string;
  /** Wait for service worker/background page to be ready */
  waitForReady?: boolean;
  /** Timeout for waiting (ms) */
  timeout?: number;
}

export interface ExtensionInfo {
  /** Extension ID */
  id: string;
  /** Service worker (Manifest V3) or Background page (Manifest V2) */
  worker?: any;
  backgroundPage?: Page;
  /** Manifest version */
  manifestVersion: number;
}

/**
 * Chrome Extension Manager
 */
export class ExtensionManager {
  private extensionInfo?: ExtensionInfo;

  /**
   * Get launch arguments for loading extension
   */
  static getLaunchArgs(extensionPath: string): string[] {
    const absolutePath = path.isAbsolute(extensionPath)
      ? extensionPath
      : path.resolve(process.cwd(), extensionPath);

    return [
      `--disable-extensions-except=${absolutePath}`,
      `--load-extension=${absolutePath}`,
    ];
  }

  /**
   * Wait for extension to load and get info
   */
  async waitForExtension(
    browser: Browser,
    config: ExtensionConfig
  ): Promise<ExtensionInfo> {
    const timeout = config.timeout || 10000;

    // Try to detect manifest version
    const manifestVersion = await this.detectManifestVersion(config.path);
    console.log(`[Extension] Detected Manifest v${manifestVersion}`);

    if (manifestVersion === 3) {
      // Manifest V3: Wait for service worker
      return await this.waitForServiceWorker(browser, config, timeout);
    } else {
      // Manifest V2: Wait for background page
      return await this.waitForBackgroundPage(browser, config, timeout);
    }
  }

  /**
   * Detect manifest version from manifest.json
   */
  private async detectManifestVersion(extensionPath: string): Promise<number> {
    try {
      const manifestPath = path.join(extensionPath, 'manifest.json');
      const manifest = await Bun.file(manifestPath).json();
      return manifest.manifest_version || 2;
    } catch (error) {
      console.warn('[Extension] Could not read manifest.json, assuming v2');
      return 2;
    }
  }

  /**
   * Wait for service worker (Manifest V3)
   */
  private async waitForServiceWorker(
    browser: Browser,
    config: ExtensionConfig,
    timeout: number
  ): Promise<ExtensionInfo> {
    console.log('[Extension] Waiting for service worker...');

    const workerTarget = await browser.waitForTarget(
      (target: Target) => {
        const isServiceWorker = target.type() === 'service_worker';
        const url = target.url();

        // Match by extension path or background file
        if (isServiceWorker) {
          const matchesPath = url.includes('chrome-extension://');
          const matchesBackground =
            url.endsWith('background.js') ||
            url.endsWith('service-worker.js') ||
            url.endsWith('sw.js');

          console.log(`[Extension] Found service worker: ${url}`);
          return matchesPath && matchesBackground;
        }
        return false;
      },
      { timeout }
    );

    const worker = await workerTarget.worker();
    const extensionId = this.extractExtensionId(workerTarget.url());

    console.log(`[Extension] Service worker loaded, ID: ${extensionId}`);

    this.extensionInfo = {
      id: extensionId,
      worker: worker,
      manifestVersion: 3,
    };

    return this.extensionInfo;
  }

  /**
   * Wait for background page (Manifest V2)
   */
  private async waitForBackgroundPage(
    browser: Browser,
    config: ExtensionConfig,
    timeout: number
  ): Promise<ExtensionInfo> {
    console.log('[Extension] Waiting for background page...');

    const backgroundTarget = await browser.waitForTarget(
      (target: Target) => {
        const isBackgroundPage = target.type() === 'background_page';
        if (isBackgroundPage) {
          console.log(`[Extension] Found background page: ${target.url()}`);
        }
        return isBackgroundPage;
      },
      { timeout }
    );

    const backgroundPage = await backgroundTarget.page();
    const extensionId = this.extractExtensionId(backgroundTarget.url());

    console.log(`[Extension] Background page loaded, ID: ${extensionId}`);

    this.extensionInfo = {
      id: extensionId,
      backgroundPage: backgroundPage,
      manifestVersion: 2,
    };

    return this.extensionInfo;
  }

  /**
   * Extract extension ID from chrome-extension:// URL
   */
  private extractExtensionId(url: string): string {
    const match = url.match(/chrome-extension:\/\/([a-z]+)\//);
    return match ? match[1] : 'unknown';
  }

  /**
   * Open extension popup
   */
  async openPopup(browser: Browser): Promise<Page | null> {
    if (!this.extensionInfo) {
      throw new Error('Extension not loaded. Call waitForExtension() first.');
    }

    console.log('[Extension] Opening popup...');

    try {
      // For Manifest V3, use service worker
      if (this.extensionInfo.manifestVersion === 3 && this.extensionInfo.worker) {
        await this.extensionInfo.worker.evaluate('chrome.action.openPopup();');
      }
      // For Manifest V2, use background page
      else if (this.extensionInfo.backgroundPage) {
        await this.extensionInfo.backgroundPage.evaluate(
          'chrome.browserAction.openPopup();'
        );
      }

      // Wait for popup window
      const popupTarget = await browser.waitForTarget(
        (target: Target) =>
          target.type() === 'page' &&
          (target.url().endsWith('popup.html') ||
            target.url().includes(`${this.extensionInfo!.id}/popup`)),
        { timeout: 5000 }
      );

      const popupPage = await popupTarget.page();
      console.log('[Extension] Popup opened');

      return popupPage;
    } catch (error) {
      console.error('[Extension] Failed to open popup:', error);
      return null;
    }
  }

  /**
   * Get extension info
   */
  getExtensionInfo(): ExtensionInfo | undefined {
    return this.extensionInfo;
  }

  /**
   * Execute code in extension context
   */
  async evaluate<T = any>(
    pageFunction: string | ((...args: any[]) => T),
    ...args: any[]
  ): Promise<T> {
    if (!this.extensionInfo) {
      throw new Error('Extension not loaded. Call waitForExtension() first.');
    }

    if (this.extensionInfo.worker) {
      return await this.extensionInfo.worker.evaluate(pageFunction, ...args);
    } else if (this.extensionInfo.backgroundPage) {
      return await this.extensionInfo.backgroundPage.evaluate(
        pageFunction,
        ...args
      );
    }

    throw new Error('No extension context available');
  }

  /**
   * Check if content script is injected on page
   */
  async isContentScriptInjected(
    page: Page,
    checkFunction: string = 'typeof window.__extensionLoaded !== "undefined"'
  ): Promise<boolean> {
    try {
      return await page.evaluate(checkFunction);
    } catch (error) {
      return false;
    }
  }
}

/**
 * Helper function to load extension
 */
export async function loadExtension(
  browser: Browser,
  config: ExtensionConfig
): Promise<ExtensionManager> {
  const manager = new ExtensionManager();
  await manager.waitForExtension(browser, config);
  return manager;
}

export default ExtensionManager;
