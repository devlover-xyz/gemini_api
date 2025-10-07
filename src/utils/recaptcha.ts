import type { Page } from 'puppeteer';

export interface RecaptchaConfig {
  provider?: '2captcha' | 'anti-captcha' | 'manual';
  apiKey?: string;
  timeout?: number;
}

/**
 * reCAPTCHA Solver Utility
 * Supports multiple solving methods
 */
export class RecaptchaSolver {
  private config: RecaptchaConfig;

  constructor(config: RecaptchaConfig = {}) {
    this.config = {
      provider: config.provider || 'manual',
      apiKey: config.apiKey || process.env.RECAPTCHA_API_KEY,
      timeout: config.timeout || 180000, // 3 minutes default (for manual solving)
    };
  }

  /**
   * Detect if reCAPTCHA is present on the page
   * Uses proper wait strategies and multiple detection methods
   */
  async detectRecaptcha(page: Page): Promise<boolean> {
    try {
      // Strategy 1: Wait for iframe to appear (most reliable)
      try {
        await page.waitForSelector('iframe[src*="recaptcha"], iframe[title*="reCAPTCHA"]', {
          timeout: 10000,
          visible: true
        });
        console.log('✅ reCAPTCHA iframe detected via waitForSelector');
        return true;
      } catch (error) {
        console.log('⏭️  No iframe found, trying other methods...');
      }

      // Strategy 2: Wait for grecaptcha object
      try {
        await page.waitForFunction(
          () => typeof (window as any).grecaptcha !== 'undefined',
          { timeout: 5000 }
        );
        console.log('✅ grecaptcha object detected');
        return true;
      } catch (error) {
        console.log('⏭️  No grecaptcha object, trying DOM check...');
      }

      // Strategy 3: DOM element check
      const hasRecaptcha = await page.evaluate(() => {
        // Check for reCAPTCHA v2 elements
        const recaptchaDiv = document.querySelector('.g-recaptcha');
        const recaptchaIframe = document.querySelector('iframe[src*="recaptcha/api2/anchor"]');
        const recaptchaFrame = document.querySelector('iframe[title*="reCAPTCHA"]');

        // Check for reCAPTCHA v3
        const recaptchaV3Script = document.querySelector('script[src*="recaptcha/api.js"], script[src*="recaptcha/enterprise.js"]');

        // Check for hCaptcha
        const hcaptchaDiv = document.querySelector('.h-captcha');
        const hcaptchaIframe = document.querySelector('iframe[src*="hcaptcha"]');

        // Also check for grecaptcha object
        const hasGrecaptcha = typeof (window as any).grecaptcha !== 'undefined';

        console.log('DOM Check:', {
          recaptchaDiv: !!recaptchaDiv,
          recaptchaIframe: !!recaptchaIframe,
          recaptchaFrame: !!recaptchaFrame,
          recaptchaV3Script: !!recaptchaV3Script,
          hcaptchaDiv: !!hcaptchaDiv,
          hcaptchaIframe: !!hcaptchaIframe,
          hasGrecaptcha
        });

        return !!(
          recaptchaDiv ||
          recaptchaIframe ||
          recaptchaFrame ||
          recaptchaV3Script ||
          hcaptchaDiv ||
          hcaptchaIframe ||
          hasGrecaptcha
        );
      });

      console.log('reCAPTCHA detection result (DOM):', hasRecaptcha);
      return hasRecaptcha;
    } catch (error) {
      console.error('Error detecting reCAPTCHA:', error);
      return false;
    }
  }

  /**
   * Solve reCAPTCHA using configured provider
   */
  async solve(page: Page): Promise<boolean> {
    const hasRecaptcha = await this.detectRecaptcha(page);

    if (!hasRecaptcha) {
      return true; // No captcha to solve
    }

    console.log('reCAPTCHA detected, attempting to solve...');

    switch (this.config.provider) {
      case '2captcha':
        return await this.solveWith2Captcha(page);
      case 'anti-captcha':
        return await this.solveWithAntiCaptcha(page);
      case 'manual':
      default:
        return await this.solveManually(page);
    }
  }

  /**
   * Solve with 2Captcha service
   */
  private async solveWith2Captcha(page: Page): Promise<boolean> {
    if (!this.config.apiKey) {
      throw new Error('2Captcha API key is required');
    }

    try {
      const siteKey = await this.getSiteKey(page);
      const pageUrl = page.url();

      console.log('Sending to 2Captcha...');

      // Submit captcha to 2Captcha
      const submitUrl = `https://2captcha.com/in.php?key=${this.config.apiKey}&method=userrecaptcha&googlekey=${siteKey}&pageurl=${pageUrl}&json=1`;

      const submitResponse = await fetch(submitUrl);
      const submitData = await submitResponse.json();

      if (submitData.status !== 1) {
        throw new Error(`2Captcha submit failed: ${submitData.request}`);
      }

      const captchaId = submitData.request;
      console.log(`Captcha submitted with ID: ${captchaId}`);

      // Poll for result
      const startTime = Date.now();
      while (Date.now() - startTime < this.config.timeout!) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

        const resultUrl = `https://2captcha.com/res.php?key=${this.config.apiKey}&action=get&id=${captchaId}&json=1`;
        const resultResponse = await fetch(resultUrl);
        const resultData = await resultResponse.json();

        if (resultData.status === 1) {
          const token = resultData.request;
          console.log('Captcha solved, applying token...');

          // Apply token to page
          await this.applyToken(page, token);
          return true;
        }

        if (resultData.request !== 'CAPCHA_NOT_READY') {
          throw new Error(`2Captcha error: ${resultData.request}`);
        }
      }

      throw new Error('2Captcha timeout');
    } catch (error) {
      console.error('2Captcha error:', error);
      return false;
    }
  }

  /**
   * Solve with Anti-Captcha service
   */
  private async solveWithAntiCaptcha(page: Page): Promise<boolean> {
    if (!this.config.apiKey) {
      throw new Error('Anti-Captcha API key is required');
    }

    try {
      const siteKey = await this.getSiteKey(page);
      const pageUrl = page.url();

      console.log('Sending to Anti-Captcha...');

      // Create task
      const createTaskUrl = 'https://api.anti-captcha.com/createTask';
      const createTaskData = {
        clientKey: this.config.apiKey,
        task: {
          type: 'RecaptchaV2TaskProxyless',
          websiteURL: pageUrl,
          websiteKey: siteKey,
        },
      };

      const createResponse = await fetch(createTaskUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createTaskData),
      });

      const createResult = await createResponse.json();

      if (createResult.errorId) {
        throw new Error(`Anti-Captcha error: ${createResult.errorDescription}`);
      }

      const taskId = createResult.taskId;
      console.log(`Task created with ID: ${taskId}`);

      // Poll for result
      const startTime = Date.now();
      while (Date.now() - startTime < this.config.timeout!) {
        await new Promise(resolve => setTimeout(resolve, 5000));

        const resultUrl = 'https://api.anti-captcha.com/getTaskResult';
        const resultData = {
          clientKey: this.config.apiKey,
          taskId: taskId,
        };

        const resultResponse = await fetch(resultUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(resultData),
        });

        const result = await resultResponse.json();

        if (result.status === 'ready') {
          const token = result.solution.gRecaptchaResponse;
          console.log('Captcha solved, applying token...');

          await this.applyToken(page, token);
          return true;
        }

        if (result.errorId) {
          throw new Error(`Anti-Captcha error: ${result.errorDescription}`);
        }
      }

      throw new Error('Anti-Captcha timeout');
    } catch (error) {
      console.error('Anti-Captcha error:', error);
      return false;
    }
  }

  /**
   * Manual solving - wait for user input
   */
  private async solveManually(page: Page): Promise<boolean> {
    console.log('\n🤖 ═══════════════════════════════════════════════════');
    console.log('⚠️  MANUAL reCAPTCHA SOLVING REQUIRED');
    console.log('═══════════════════════════════════════════════════');
    console.log('📌 The browser window is now open');
    console.log('📌 Attempting to auto-click the reCAPTCHA checkbox...');
    console.log('📌 Complete any image challenges if they appear');
    console.log(`📌 You have ${this.config.timeout! / 1000} seconds to complete`);
    console.log('═══════════════════════════════════════════════════\n');

    // Try to auto-click the checkbox first
    try {
      await this.clickRecaptchaCheckbox(page);
      console.log('✅ Checkbox clicked automatically\n');
    } catch (error) {
      console.log('⚠️  Could not auto-click checkbox, please click manually\n');
    }

    const startTime = Date.now();
    let lastCheck = 0;

    while (Date.now() - startTime < this.config.timeout!) {
      // Check if captcha is still present
      const hasCaptcha = await this.detectRecaptcha(page);

      if (!hasCaptcha) {
        console.log('✅ Captcha solved manually!\n');
        return true;
      }

      // Check if reCAPTCHA is solved
      const isSolved = await page.evaluate(() => {
        const textarea = document.querySelector('textarea[name="g-recaptcha-response"]') as HTMLTextAreaElement;
        return textarea && textarea.value && textarea.value.length > 0;
      });

      if (isSolved) {
        console.log('✅ reCAPTCHA solved!\n');
        return true;
      }

      // Show progress every 10 seconds
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      if (elapsed - lastCheck >= 10) {
        const remaining = Math.floor((this.config.timeout! - (Date.now() - startTime)) / 1000);
        console.log(`⏳ Still waiting... (${remaining}s remaining)`);
        lastCheck = elapsed;
      }

      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\n❌ Manual captcha solving timeout - time limit exceeded\n');
    throw new Error('Manual captcha solving timeout');
  }

  /**
   * Auto-click reCAPTCHA checkbox
   */
  private async clickRecaptchaCheckbox(page: Page): Promise<void> {
    console.log('Searching for reCAPTCHA checkbox iframe...');

    // Wait for iframe to be visible
    await page.waitForSelector('iframe[src*="recaptcha/api2/anchor"], iframe[src*="recaptcha/enterprise/anchor"], iframe[title*="reCAPTCHA"]', {
      timeout: 10000,
      visible: true
    });

    // Get all frames
    const frames = page.frames();
    console.log(`Found ${frames.length} frames`);

    // Find the anchor/checkbox frame
    const recaptchaFrame = frames.find(frame => {
      const url = frame.url();
      return url.includes('recaptcha/api2/anchor') || url.includes('recaptcha/enterprise/anchor');
    });

    if (!recaptchaFrame) {
      throw new Error('reCAPTCHA checkbox frame not found');
    }

    console.log('Found reCAPTCHA checkbox frame, clicking...');

    // Wait for checkbox to be available and click it
    await recaptchaFrame.waitForSelector('#recaptcha-anchor', { timeout: 5000 });
    await recaptchaFrame.click('#recaptcha-anchor');

    console.log('✅ Checkbox clicked!');

    // Wait a bit for the challenge to appear (if needed)
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  /**
   * Get reCAPTCHA site key from page
   */
  private async getSiteKey(page: Page): Promise<string> {
    const siteKey = await page.evaluate(() => {
      // Try to find site key from reCAPTCHA v2
      const recaptchaElement = document.querySelector('.g-recaptcha');
      if (recaptchaElement) {
        return recaptchaElement.getAttribute('data-sitekey');
      }

      // Try to find from iframe
      const iframe = document.querySelector('iframe[src*="recaptcha"]') as HTMLIFrameElement;
      if (iframe && iframe.src) {
        const match = iframe.src.match(/k=([^&]+)/);
        if (match) return match[1];
      }

      // Try to find from script
      const scripts = Array.from(document.querySelectorAll('script'));
      for (const script of scripts) {
        const match = script.textContent?.match(/['"]sitekey['"]\s*:\s*['"]([^'"]+)['"]/);
        if (match) return match[1];
      }

      return null;
    });

    if (!siteKey) {
      throw new Error('Could not find reCAPTCHA site key');
    }

    return siteKey;
  }

  /**
   * Apply solved token to page
   */
  private async applyToken(page: Page, token: string): Promise<void> {
    await page.evaluate((token) => {
      // Set token in textarea
      const textarea = document.querySelector('textarea[name="g-recaptcha-response"]') as HTMLTextAreaElement;
      if (textarea) {
        textarea.value = token;
        textarea.style.display = 'block'; // Make it visible
      }

      // Trigger callback if exists
      if (typeof (window as any).___grecaptcha_cfg !== 'undefined') {
        const clients = (window as any).___grecaptcha_cfg.clients;
        for (const client in clients) {
          const callbacks = clients[client];
          if (callbacks && callbacks.callback) {
            callbacks.callback(token);
          }
        }
      }
    }, token);

    // Small delay to let the page process
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /**
   * Wait for and solve reCAPTCHA if present
   */
  async waitAndSolve(page: Page, maxAttempts: number = 3): Promise<boolean> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`reCAPTCHA solve attempt ${attempt}/${maxAttempts}`);

        const solved = await this.solve(page);

        if (solved) {
          console.log('✅ reCAPTCHA solved successfully');
          return true;
        }

        if (attempt < maxAttempts) {
          console.log('Retrying reCAPTCHA solve...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`reCAPTCHA solve attempt ${attempt} failed:`, error);

        if (attempt === maxAttempts) {
          throw error;
        }
      }
    }

    return false;
  }
}
