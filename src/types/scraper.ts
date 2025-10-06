export interface ScraperConfig {
  headless?: boolean;
  timeout?: number;
  userAgent?: string;
  viewport?: {
    width: number;
    height: number;
  };
  maxRetries?: number;
  retryDelay?: number;
  recaptcha?: {
    enabled?: boolean;
    provider?: '2captcha' | 'anti-captcha' | 'manual' | 'extension';
    apiKey?: string;
    timeout?: number;
  };
}

export interface ScraperResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  duration: number;
  retries?: number;
}

export interface ScraperParams {
  [key: string]: any;
}
