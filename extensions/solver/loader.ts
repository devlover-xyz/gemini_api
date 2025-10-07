/**
 * Extension Loader for Puppeteer
 * Loads the reCAPTCHA solver extension into Puppeteer browser
 */

import path from 'path';
import { fileURLToPath } from 'url';
import type { Browser, Page } from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ExtensionConfig {
  enabled?: boolean;
  autoSolve?: boolean;
  debug?: boolean;
}

/**
 * Get extension path
 */
export function getExtensionPath(): string {
  return path.resolve(__dirname);
}

/**
 * Get Puppeteer launch args for extension
 */
export function getExtensionLaunchArgs(): string[] {
  const extensionPath = getExtensionPath();

  return [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
  ];
}

/**
 * Configure extension on page
 */
export async function configureExtension(
  page: Page,
  config: ExtensionConfig = {}
): Promise<void> {
  const defaultConfig = {
    enabled: true,
    autoSolve: true,
    debug: true,
    ...config,
  };

  // Inject configuration
  await page.evaluateOnNewDocument((cfg) => {
    if ((window as any).__recaptchaSolver) {
      (window as any).__recaptchaSolver.setConfig(cfg);
    }
  }, defaultConfig);
}

/**
 * Wait for extension to load
 */
export async function waitForExtension(page: Page, timeout = 5000): Promise<boolean> {
  try {
    await page.waitForFunction(
      () => typeof (window as any).__recaptchaSolver !== 'undefined',
      { timeout }
    );
    return true;
  } catch (error) {
    console.error('Extension did not load in time');
    return false;
  }
}

/**
 * Detect reCAPTCHA on page using extension
 */
export async function detectRecaptcha(page: Page): Promise<boolean> {
  try {
    const result = await page.evaluate(() => {
      if (typeof (window as any).__recaptchaSolver === 'undefined') {
        return false;
      }
      const detection = (window as any).__recaptchaSolver.detect();
      return detection.hasAny;
    });

    return result;
  } catch (error) {
    console.error('Error detecting reCAPTCHA:', error);
    return false;
  }
}

/**
 * Solve reCAPTCHA using extension
 */
export async function solveRecaptcha(page: Page, timeout = 60000): Promise<boolean> {
  try {
    // Call the solver
    const solved = await page.evaluate(() => {
      if (typeof (window as any).__recaptchaSolver === 'undefined') {
        return false;
      }
      return (window as any).__recaptchaSolver.solve();
    });

    if (!solved) {
      console.log('Extension solver returned false');
      return false;
    }

    // Wait for solution to be applied
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verify it's solved
    const isSolved = await page.evaluate(() => {
      if (typeof (window as any).__recaptchaSolver === 'undefined') {
        return false;
      }
      return (window as any).__recaptchaSolver.isSolved();
    });

    return isSolved;
  } catch (error) {
    console.error('Error solving reCAPTCHA:', error);
    return false;
  }
}

/**
 * Check if reCAPTCHA is solved
 */
export async function isRecaptchaSolved(page: Page): Promise<boolean> {
  try {
    const solved = await page.evaluate(() => {
      if (typeof (window as any).__recaptchaSolver === 'undefined') {
        return false;
      }
      return (window as any).__recaptchaSolver.isSolved();
    });

    return solved;
  } catch (error) {
    console.error('Error checking if reCAPTCHA is solved:', error);
    return false;
  }
}

/**
 * Extension helper class
 */
export class RecaptchaExtension {
  private config: ExtensionConfig;

  constructor(config: ExtensionConfig = {}) {
    this.config = {
      enabled: true,
      autoSolve: true,
      debug: true,
      ...config,
    };
  }

  /**
   * Get launch arguments for Puppeteer
   */
  getLaunchArgs(): string[] {
    if (!this.config.enabled) {
      return [];
    }
    return getExtensionLaunchArgs();
  }

  /**
   * Setup page with extension
   */
  async setupPage(page: Page): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    await configureExtension(page, this.config);
    await waitForExtension(page);
  }

  /**
   * Detect reCAPTCHA
   */
  async detect(page: Page): Promise<boolean> {
    return detectRecaptcha(page);
  }

  /**
   * Solve reCAPTCHA
   */
  async solve(page: Page, timeout = 60000): Promise<boolean> {
    return solveRecaptcha(page, timeout);
  }

  /**
   * Check if solved
   */
  async isSolved(page: Page): Promise<boolean> {
    return isRecaptchaSolved(page);
  }
}

export default RecaptchaExtension;
