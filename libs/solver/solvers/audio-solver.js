/**
 * Audio Challenge Solver
 * Uses speech-to-text to solve audio reCAPTCHA challenges
 */

class AudioSolver {
  constructor() {
    this.debug = true;
  }

  log(...args) {
    if (this.debug) {
      console.log('[Audio Solver]', ...args);
    }
  }

  /**
   * Find audio button in challenge iframe
   */
  findAudioButton(doc) {
    const selectors = [
      '#recaptcha-audio-button',
      'button[aria-labelledby="audio-instructions"]',
      '.rc-button-audio'
    ];

    for (const selector of selectors) {
      const button = doc.querySelector(selector);
      if (button) {
        return button;
      }
    }

    return null;
  }

  /**
   * Click audio button
   */
  async clickAudioButton(challengeIframe) {
    try {
      const doc = challengeIframe.contentDocument || challengeIframe.contentWindow.document;
      const audioButton = this.findAudioButton(doc);

      if (!audioButton) {
        this.log('Audio button not found');
        return false;
      }

      this.log('Clicking audio button...');
      audioButton.click();

      // Wait for audio challenge to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      return true;
    } catch (error) {
      this.log('Error clicking audio button:', error);
      return false;
    }
  }

  /**
   * Get audio download URL
   */
  getAudioUrl(doc) {
    const audioElement = doc.querySelector('audio source, audio');

    if (audioElement) {
      return audioElement.src || audioElement.currentSrc;
    }

    // Try to find download link
    const downloadLink = doc.querySelector('.rc-audiochallenge-tdownload-link');
    if (downloadLink) {
      return downloadLink.href;
    }

    return null;
  }

  /**
   * Download audio file
   */
  async downloadAudio(url) {
    try {
      this.log('Downloading audio from:', url);

      const response = await fetch(url);
      const blob = await response.blob();

      return blob;
    } catch (error) {
      this.log('Error downloading audio:', error);
      return null;
    }
  }

  /**
   * Convert audio to text using Web Speech API (if available)
   * Note: This is limited and may not work in all browsers
   */
  async transcribeAudioWithWebAPI(audioBlob) {
    return new Promise((resolve, reject) => {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        this.log('Transcribed:', transcript);
        resolve(transcript);
      };

      recognition.onerror = (event) => {
        this.log('Speech recognition error:', event.error);
        reject(event.error);
      };

      // Create audio context and play
      const audioContext = new AudioContext();
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const audioBuffer = await audioContext.decodeAudioData(e.target.result);
          const source = audioContext.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioContext.destination);

          recognition.start();
          source.start(0);
        } catch (error) {
          reject(error);
        }
      };

      reader.readAsArrayBuffer(audioBlob);
    });
  }

  /**
   * Input answer into text field
   */
  async inputAnswer(doc, answer) {
    try {
      const input = doc.querySelector('#audio-response, input[id*="audio"]');

      if (!input) {
        this.log('Audio input not found');
        return false;
      }

      this.log('Inputting answer:', answer);

      // Clear existing value
      input.value = '';

      // Input character by character (human-like)
      for (const char of answer) {
        input.value += char;
        await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
      }

      // Trigger input event
      input.dispatchEvent(new Event('input', { bubbles: true }));

      return true;
    } catch (error) {
      this.log('Error inputting answer:', error);
      return false;
    }
  }

  /**
   * Submit answer
   */
  async submitAnswer(doc) {
    try {
      const verifyButton = doc.querySelector('#recaptcha-verify-button, button[id*="verify"]');

      if (!verifyButton) {
        this.log('Verify button not found');
        return false;
      }

      this.log('Clicking verify button...');
      verifyButton.click();

      // Wait for verification
      await new Promise(resolve => setTimeout(resolve, 2000));
      return true;
    } catch (error) {
      this.log('Error submitting answer:', error);
      return false;
    }
  }

  /**
   * Main solve function
   * Note: This requires external speech-to-text API for production use
   */
  async solve(challengeIframe, speechToTextAPI = null) {
    try {
      // Step 1: Click audio button
      const audioClicked = await this.clickAudioButton(challengeIframe);
      if (!audioClicked) {
        return false;
      }

      const doc = challengeIframe.contentDocument || challengeIframe.contentWindow.document;

      // Step 2: Get audio URL
      const audioUrl = this.getAudioUrl(doc);
      if (!audioUrl) {
        this.log('Audio URL not found');
        return false;
      }

      // Step 3: Download audio
      const audioBlob = await this.downloadAudio(audioUrl);
      if (!audioBlob) {
        return false;
      }

      // Step 4: Transcribe audio
      let transcript;

      if (speechToTextAPI) {
        // Use external API (Google Speech, Azure, etc.)
        transcript = await speechToTextAPI(audioBlob);
      } else {
        // Try Web Speech API (limited support)
        try {
          transcript = await this.transcribeAudioWithWebAPI(audioBlob);
        } catch (error) {
          this.log('Web Speech API failed, external API required:', error);
          return false;
        }
      }

      if (!transcript) {
        this.log('Failed to transcribe audio');
        return false;
      }

      // Step 5: Input answer
      const inputted = await this.inputAnswer(doc, transcript);
      if (!inputted) {
        return false;
      }

      // Step 6: Submit
      const submitted = await this.submitAnswer(doc);
      if (!submitted) {
        return false;
      }

      this.log('✅ Audio challenge solved!');
      return true;
    } catch (error) {
      this.log('Error solving audio challenge:', error);
      return false;
    }
  }
}

// Export for use in content script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AudioSolver;
}
