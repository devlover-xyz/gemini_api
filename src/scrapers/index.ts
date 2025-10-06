import { scraperManager } from '../core/ScraperManager';
import { ExampleScraper } from './ExampleScraper';
import { GoogleSearchScraper } from './GoogleSearchScraper';
import { RecaptchaTestScraper, GoogleRecaptchaDemoScraper } from './RecaptchaTestScraper';

/**
 * Register all scrapers here
 */
export function registerScrapers() {
  scraperManager.register('example', ExampleScraper);
  scraperManager.register('google-search', GoogleSearchScraper);
  scraperManager.register('recaptcha-test', RecaptchaTestScraper);
  scraperManager.register('google-recaptcha-demo', GoogleRecaptchaDemoScraper);
}
