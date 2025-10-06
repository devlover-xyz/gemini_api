/**
 * reCAPTCHA Auto Solver - Content Script
 * Injects into all pages to detect and solve reCAPTCHA
 */

(function() {
  'use strict';

  let config = {
    enabled: true,
    autoSolve: true,
    debug: true
  };

  /**
   * Log helper
   */
  function log(...args) {
    if (config.debug) {
      console.log('[reCAPTCHA Solver]', ...args);
    }
  }

  /**
   * Detect reCAPTCHA presence
   */
  function detectRecaptcha() {
    // Check for reCAPTCHA v2
    const recaptchaV2 = document.querySelector('.g-recaptcha, iframe[src*="recaptcha"]');
    // Check for reCAPTCHA v3
    const recaptchaV3 = document.querySelector('script[src*="recaptcha"]');
    // Check for hCaptcha
    const hcaptcha = document.querySelector('.h-captcha, iframe[src*="hcaptcha"]');

    return {
      hasV2: !!recaptchaV2,
      hasV3: !!recaptchaV3,
      hasHCaptcha: !!hcaptcha,
      hasAny: !!(recaptchaV2 || recaptchaV3 || hcaptcha)
    };
  }

  /**
   * Get reCAPTCHA iframe
   */
  function getRecaptchaIframe() {
    const iframes = Array.from(document.querySelectorAll('iframe'));
    return iframes.find(iframe =>
      iframe.src.includes('recaptcha') ||
      iframe.src.includes('hcaptcha')
    );
  }

  /**
   * Get reCAPTCHA challenge iframe
   */
  function getChallengeIframe() {
    const iframes = Array.from(document.querySelectorAll('iframe'));
    return iframes.find(iframe =>
      iframe.src.includes('recaptcha/api2/bframe') ||
      iframe.src.includes('hcaptcha.com/captcha')
    );
  }

  /**
   * Click reCAPTCHA checkbox
   */
  function clickRecaptchaCheckbox() {
    return new Promise((resolve) => {
      const iframe = getRecaptchaIframe();

      if (!iframe) {
        log('Checkbox iframe not found');
        resolve(false);
        return;
      }

      try {
        const rect = iframe.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        // Simulate human-like click
        const clickEvent = new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y
        });

        iframe.dispatchEvent(clickEvent);
        log('Clicked reCAPTCHA checkbox');

        // Wait for challenge to appear
        setTimeout(() => resolve(true), 2000);
      } catch (error) {
        log('Error clicking checkbox:', error);
        resolve(false);
      }
    });
  }

  /**
   * Check if reCAPTCHA is solved
   */
  function isRecaptchaSolved() {
    // Check for response token
    const textarea = document.querySelector('textarea[name="g-recaptcha-response"]');

    if (textarea && textarea.value) {
      return true;
    }

    // Check for success checkmark
    const iframe = getRecaptchaIframe();
    if (iframe) {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        const checkmark = iframeDoc.querySelector('.recaptcha-checkbox-checked');
        return !!checkmark;
      } catch (error) {
        // Cross-origin restriction
        log('Cannot access iframe content (cross-origin)');
      }
    }

    return false;
  }

  /**
   * Solve audio challenge
   */
  async function solveAudioChallenge() {
    log('Attempting audio challenge...');

    const challengeIframe = getChallengeIframe();
    if (!challengeIframe) {
      log('Challenge iframe not found');
      return false;
    }

    try {
      // This is where you would implement audio solving
      // For production, you'd use:
      // 1. Speech-to-text API (Google Speech API, etc.)
      // 2. Download audio file
      // 3. Process and get text
      // 4. Input the text

      log('Audio solving not fully implemented');
      return false;
    } catch (error) {
      log('Error solving audio:', error);
      return false;
    }
  }

  /**
   * Solve image challenge
   */
  async function solveImageChallenge() {
    log('Attempting image challenge...');

    const challengeIframe = getChallengeIframe();
    if (!challengeIframe) {
      log('Challenge iframe not found');
      return false;
    }

    try {
      // This is where you would implement image solving
      // For production, you'd use:
      // 1. Computer vision API
      // 2. Capture images
      // 3. Identify correct images
      // 4. Click them

      log('Image solving not fully implemented');
      return false;
    } catch (error) {
      log('Error solving image:', error);
      return false;
    }
  }

  /**
   * Main solver function
   */
  async function solveRecaptcha() {
    if (!config.enabled) {
      log('Solver disabled');
      return false;
    }

    const detection = detectRecaptcha();

    if (!detection.hasAny) {
      log('No reCAPTCHA detected');
      return false;
    }

    log('reCAPTCHA detected:', detection);

    // Check if already solved
    if (isRecaptchaSolved()) {
      log('✅ reCAPTCHA already solved');
      return true;
    }

    // Try to click checkbox first
    if (detection.hasV2) {
      const clicked = await clickRecaptchaCheckbox();

      if (!clicked) {
        log('Failed to click checkbox');
        return false;
      }

      // Wait and check if solved (invisible reCAPTCHA might solve immediately)
      await new Promise(resolve => setTimeout(resolve, 3000));

      if (isRecaptchaSolved()) {
        log('✅ reCAPTCHA solved after checkbox click');
        return true;
      }

      // If challenge appeared, try to solve it
      log('Challenge appeared, attempting to solve...');

      // Try audio challenge (easier to automate)
      const audioSolved = await solveAudioChallenge();
      if (audioSolved) {
        log('✅ Audio challenge solved');
        return true;
      }

      // Try image challenge as fallback
      const imageSolved = await solveImageChallenge();
      if (imageSolved) {
        log('✅ Image challenge solved');
        return true;
      }

      log('❌ Failed to solve challenge');
      return false;
    }

    log('Unsupported reCAPTCHA type');
    return false;
  }

  /**
   * Auto-solve on page load
   */
  function autoSolveOnLoad() {
    // Wait for page to load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', checkAndSolve);
    } else {
      checkAndSolve();
    }

    function checkAndSolve() {
      // Wait a bit for reCAPTCHA to render
      setTimeout(async () => {
        const detection = detectRecaptcha();

        if (detection.hasAny && config.autoSolve) {
          log('Auto-solving reCAPTCHA...');
          await solveRecaptcha();
        }
      }, 2000);
    }
  }

  /**
   * Listen for messages from background script
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'solve') {
      solveRecaptcha().then(result => {
        sendResponse({ success: result });
      });
      return true; // Keep message channel open for async response
    }

    if (message.action === 'detect') {
      const detection = detectRecaptcha();
      sendResponse(detection);
    }

    if (message.action === 'isSolved') {
      const solved = isRecaptchaSolved();
      sendResponse({ solved });
    }

    if (message.action === 'config') {
      config = { ...config, ...message.config };
      sendResponse({ success: true });
    }
  });

  // Expose to window for external access
  window.__recaptchaSolver = {
    solve: solveRecaptcha,
    detect: detectRecaptcha,
    isSolved: isRecaptchaSolved,
    setConfig: (newConfig) => {
      config = { ...config, ...newConfig };
    }
  };

  // Auto-solve if enabled
  if (config.autoSolve) {
    autoSolveOnLoad();
  }

  log('Content script loaded');
})();
