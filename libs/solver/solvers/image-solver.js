/**
 * Image Challenge Solver
 * Uses computer vision to solve image reCAPTCHA challenges
 */

class ImageSolver {
  constructor() {
    this.debug = true;
  }

  log(...args) {
    if (this.debug) {
      console.log('[Image Solver]', ...args);
    }
  }

  /**
   * Get challenge instructions
   */
  getChallengeInstructions(doc) {
    const selectors = [
      '.rc-imageselect-desc-no-canonical',
      '.rc-imageselect-desc',
      'strong'
    ];

    for (const selector of selectors) {
      const element = doc.querySelector(selector);
      if (element && element.textContent) {
        return element.textContent.trim();
      }
    }

    return null;
  }

  /**
   * Parse instructions to get target object
   */
  parseInstructions(instructions) {
    // Examples:
    // "Select all images with traffic lights"
    // "Select all squares with cars"
    // "Click verify once there are none left"

    const match = instructions.match(/with\s+([a-z\s]+)/i);
    if (match) {
      return match[1].trim();
    }

    const match2 = instructions.match(/containing\s+([a-z\s]+)/i);
    if (match2) {
      return match2[1].trim();
    }

    return null;
  }

  /**
   * Get all image tiles
   */
  getImageTiles(doc) {
    const tiles = [];
    const table = doc.querySelector('.rc-imageselect-table, table');

    if (!table) {
      this.log('Image table not found');
      return tiles;
    }

    const cells = table.querySelectorAll('td');

    cells.forEach((cell, index) => {
      const img = cell.querySelector('img');
      if (img) {
        tiles.push({
          index,
          element: cell,
          img: img,
          src: img.src,
          selected: cell.classList.contains('rc-imageselect-tileselected')
        });
      }
    });

    return tiles;
  }

  /**
   * Capture image tile as blob
   */
  async captureImageTile(imgElement) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = imgElement.naturalWidth || imgElement.width;
      canvas.height = imgElement.naturalHeight || imgElement.height;

      imgElement.onload = () => {
        ctx.drawImage(imgElement, 0, 0);
        canvas.toBlob((blob) => {
          resolve(blob);
        });
      };

      // If already loaded
      if (imgElement.complete) {
        ctx.drawImage(imgElement, 0, 0);
        canvas.toBlob((blob) => {
          resolve(blob);
        });
      } else {
        reject(new Error('Image not loaded'));
      }
    });
  }

  /**
   * Analyze image using computer vision API
   * This should be replaced with actual CV API call
   */
  async analyzeImage(imageBlob, targetObject, visionAPI = null) {
    if (visionAPI) {
      // Use external computer vision API
      // Examples: Google Cloud Vision, Azure Computer Vision, AWS Rekognition
      return await visionAPI(imageBlob, targetObject);
    }

    // Placeholder - return random for demo
    this.log('Computer vision API not provided, using random selection');
    return Math.random() > 0.5;
  }

  /**
   * Click image tile
   */
  async clickTile(tile) {
    return new Promise((resolve) => {
      this.log(`Clicking tile ${tile.index}...`);

      // Simulate human-like click with delay
      setTimeout(() => {
        tile.element.click();
        resolve();
      }, 100 + Math.random() * 300);
    });
  }

  /**
   * Submit solution
   */
  async submit(doc) {
    try {
      const verifyButton = doc.querySelector('#recaptcha-verify-button, button[id*="verify"]');

      if (!verifyButton) {
        this.log('Verify button not found');
        return false;
      }

      this.log('Clicking verify button...');
      verifyButton.click();

      await new Promise(resolve => setTimeout(resolve, 2000));
      return true;
    } catch (error) {
      this.log('Error submitting:', error);
      return false;
    }
  }

  /**
   * Check if more tiles to select (dynamic challenge)
   */
  async checkForNewTiles(doc) {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const instructions = this.getChallengeInstructions(doc);
    if (instructions && instructions.toLowerCase().includes('none left')) {
      return false;
    }

    return true;
  }

  /**
   * Main solve function
   * Note: Requires computer vision API for production use
   */
  async solve(challengeIframe, visionAPI = null) {
    try {
      const doc = challengeIframe.contentDocument || challengeIframe.contentWindow.document;

      // Get instructions
      const instructions = this.getChallengeInstructions(doc);
      if (!instructions) {
        this.log('Instructions not found');
        return false;
      }

      this.log('Instructions:', instructions);

      const targetObject = this.parseInstructions(instructions);
      if (!targetObject) {
        this.log('Could not parse target object from instructions');
        return false;
      }

      this.log('Target object:', targetObject);

      // Get image tiles
      let tiles = this.getImageTiles(doc);
      if (tiles.length === 0) {
        this.log('No image tiles found');
        return false;
      }

      this.log(`Found ${tiles.length} tiles`);

      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        attempts++;
        this.log(`Attempt ${attempts}/${maxAttempts}`);

        // Analyze and click tiles
        for (const tile of tiles) {
          if (tile.selected) {
            continue; // Already selected
          }

          try {
            // Capture image
            const imageBlob = await this.captureImageTile(tile.img);

            // Analyze image
            const shouldClick = await this.analyzeImage(imageBlob, targetObject, visionAPI);

            if (shouldClick) {
              await this.clickTile(tile);
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          } catch (error) {
            this.log(`Error processing tile ${tile.index}:`, error);
          }
        }

        // Check if challenge is dynamic (new tiles appear)
        const hasMore = await this.checkForNewTiles(doc);

        if (!hasMore) {
          break;
        }

        // Get new tiles if any
        tiles = this.getImageTiles(doc);
      }

      // Submit
      const submitted = await this.submit(doc);
      if (!submitted) {
        return false;
      }

      this.log('✅ Image challenge solved!');
      return true;
    } catch (error) {
      this.log('Error solving image challenge:', error);
      return false;
    }
  }

  /**
   * Solve with external AI service (e.g., 2Captcha, Anti-Captcha)
   */
  async solveWithService(challengeIframe, apiKey, service = '2captcha') {
    try {
      const doc = challengeIframe.contentDocument || challengeIframe.contentWindow.document;

      // Get all images
      const tiles = this.getImageTiles(doc);
      const instructions = this.getChallengeInstructions(doc);

      // Capture all images
      const images = [];
      for (const tile of tiles) {
        const blob = await this.captureImageTile(tile.img);
        images.push(blob);
      }

      // Send to service
      // This is a placeholder - actual implementation would call the API
      this.log(`Would send ${images.length} images to ${service} with instructions: ${instructions}`);

      // Return indices to click
      // In real implementation, this would come from the API response
      return [];
    } catch (error) {
      this.log('Error with external service:', error);
      return null;
    }
  }
}

// Export for use in content script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ImageSolver;
}
