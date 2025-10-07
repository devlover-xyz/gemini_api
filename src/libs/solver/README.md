# reCAPTCHA Solver Extension

Browser extension untuk solve reCAPTCHA secara otomatis di Puppeteer.

## Struktur

```
libs/solver/
├── manifest.json           # Extension manifest (Chrome Extension v3)
├── background.js          # Background service worker
├── content.js             # Content script (injected ke semua pages)
├── loader.ts              # Puppeteer loader utility
├── solvers/
│   ├── audio-solver.js    # Audio challenge solver
│   └── image-solver.js    # Image challenge solver
└── README.md
```

## Cara Kerja

### 1. Extension Components

**manifest.json**
- Chrome Extension Manifest v3
- Permissions: webRequest, webNavigation, storage
- Content script di-inject ke semua pages

**content.js**
- Detect reCAPTCHA presence (v2, v3, hCaptcha)
- Auto-click checkbox
- Coordinate dengan solvers
- Expose API ke `window.__recaptchaSolver`

**background.js**
- Extension lifecycle management
- Stats tracking
- Message coordination

### 2. Solvers

**Audio Solver** (solvers/audio-solver.js)
- Click audio button
- Download audio file
- Transcribe menggunakan Speech-to-Text API
- Input dan submit answer

**Image Solver** (solvers/image-solver.js)
- Parse instructions (e.g., "Select traffic lights")
- Capture image tiles
- Analyze dengan Computer Vision API
- Click correct tiles
- Handle dynamic challenges

### 3. Loader (loader.ts)

TypeScript utility untuk load extension ke Puppeteer:

```typescript
import { RecaptchaExtension } from './libs/solver/loader';

const extension = new RecaptchaExtension({
  enabled: true,
  autoSolve: true,
  debug: true
});

// Get launch args
const args = extension.getLaunchArgs();

// Launch browser with extension
const browser = await puppeteer.launch({
  headless: false, // Extension requires non-headless
  args: [
    ...args,
    '--no-sandbox',
    '--disable-setuid-sandbox'
  ]
});

const page = await browser.newPage();

// Setup page
await extension.setupPage(page);

// Navigate
await page.goto('https://example.com');

// Detect and solve
if (await extension.detect(page)) {
  await extension.solve(page);
}
```

## Integration dengan BaseScraper

Extension otomatis ter-load jika reCAPTCHA enabled di config:

```typescript
const scraper = new MyScraper({
  recaptcha: {
    enabled: true,
    provider: 'extension', // Use browser extension
    autoSolve: true
  }
});
```

## API Methods

### Window API (dalam browser context)

```javascript
// Detect reCAPTCHA
const detection = window.__recaptchaSolver.detect();
// Returns: { hasV2, hasV3, hasHCaptcha, hasAny }

// Solve reCAPTCHA
const solved = await window.__recaptchaSolver.solve();
// Returns: true/false

// Check if solved
const isSolved = window.__recaptchaSolver.isSolved();
// Returns: true/false

// Configure
window.__recaptchaSolver.setConfig({
  enabled: true,
  autoSolve: true,
  debug: true
});
```

### Loader API (dari Node.js/Puppeteer)

```typescript
import {
  getExtensionPath,
  getExtensionLaunchArgs,
  detectRecaptcha,
  solveRecaptcha,
  isRecaptchaSolved
} from './libs/solver/loader';

// Get extension path
const path = getExtensionPath();

// Get launch args
const args = getExtensionLaunchArgs();

// In page context
const hasRecaptcha = await detectRecaptcha(page);
const solved = await solveRecaptcha(page);
const isSolved = await isRecaptchaSolved(page);
```

## Limitations & Requirements

### Current Limitations

1. **Audio Solver**
   - Requires external Speech-to-Text API
   - Web Speech API has limited browser support
   - Recommended: Google Cloud Speech API, Azure Speech, etc.

2. **Image Solver**
   - Requires external Computer Vision API
   - Placeholder uses random selection
   - Recommended: Google Cloud Vision, Azure CV, AWS Rekognition

3. **Browser Mode**
   - Extension requires `headless: false`
   - Cannot run in true headless mode
   - Use `headless: 'new'` with limitations

### External APIs Needed

**For Production Use:**

1. **Speech-to-Text** (Audio Challenges)
   - Google Cloud Speech-to-Text
   - Azure Speech Service
   - AWS Transcribe
   - Wit.ai

2. **Computer Vision** (Image Challenges)
   - Google Cloud Vision API
   - Azure Computer Vision
   - AWS Rekognition
   - Custom ML model

3. **Or Use Paid Services**
   - 2Captcha (~$2.99/1000)
   - Anti-Captcha (~$2/1000)
   - CapSolver
   - NoCaptcha

## Development

### Testing Extension

```bash
# Load in Chrome manually
1. Open chrome://extensions
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select libs/solver/ directory
```

### Testing with Puppeteer

```typescript
import puppeteer from 'puppeteer';
import { RecaptchaExtension } from './libs/solver/loader';

const extension = new RecaptchaExtension();

const browser = await puppeteer.launch({
  headless: false,
  args: extension.getLaunchArgs()
});

const page = await browser.newPage();
await extension.setupPage(page);

// Test on Google's demo
await page.goto('https://www.google.com/recaptcha/api2/demo');

// Auto-solve should trigger
await new Promise(resolve => setTimeout(resolve, 10000));

// Check if solved
const solved = await extension.isSolved(page);
console.log('Solved:', solved);
```

## Upgrading to Production

### Step 1: Add Speech-to-Text API

Edit `solvers/audio-solver.js`:

```javascript
async function transcribeAudio(audioBlob) {
  // Google Cloud Speech API example
  const formData = new FormData();
  formData.append('audio', audioBlob);

  const response = await fetch('https://speech.googleapis.com/v1/speech:recognize', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`
    },
    body: formData
  });

  const result = await response.json();
  return result.results[0].alternatives[0].transcript;
}
```

### Step 2: Add Computer Vision API

Edit `solvers/image-solver.js`:

```javascript
async function analyzeImage(imageBlob, targetObject) {
  // Google Cloud Vision API example
  const base64 = await blobToBase64(imageBlob);

  const response = await fetch('https://vision.googleapis.com/v1/images:annotate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [{
        image: { content: base64 },
        features: [{ type: 'LABEL_DETECTION' }]
      }]
    })
  });

  const result = await response.json();
  const labels = result.responses[0].labelAnnotations;

  // Check if target object is in labels
  return labels.some(label =>
    label.description.toLowerCase().includes(targetObject.toLowerCase())
  );
}
```

## Notes

- Extension is experimental and may not work on all sites
- Google actively updates reCAPTCHA to prevent automation
- Consider using paid services for production reliability
- Always respect website terms of service
- Use responsibly and ethically

## Troubleshooting

**Extension not loading:**
- Ensure `headless: false`
- Check extension path is correct
- Verify manifest.json is valid

**Solver not working:**
- Check console for errors
- Verify external APIs are configured
- Ensure reCAPTCHA is actually present

**Cross-origin errors:**
- Some iframes may block access
- This is a browser security feature
- May need to use alternative approaches
