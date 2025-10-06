interface QueueItem<T> {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  addedAt: number;
}

export class RequestQueue {
  private queue: QueueItem<any>[] = [];
  private processing = 0;
  private maxConcurrent: number;
  private requestsPerMinute: number;
  private requestTimestamps: number[] = [];

  constructor(maxConcurrent: number = 3, requestsPerMinute: number = 60) {
    this.maxConcurrent = maxConcurrent;
    this.requestsPerMinute = requestsPerMinute;
  }

  /**
   * Add a request to the queue
   */
  async enqueue<T>(execute: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        execute,
        resolve,
        reject,
        addedAt: Date.now(),
      });

      this.processQueue();
    });
  }

  /**
   * Process the queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    // Check rate limiting
    if (!this.canMakeRequest()) {
      // Wait a bit before checking again
      setTimeout(() => this.processQueue(), 1000);
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.processing++;
    this.requestTimestamps.push(Date.now());

    try {
      const result = await item.execute();
      item.resolve(result);
    } catch (error) {
      item.reject(error);
    } finally {
      this.processing--;
      this.processQueue(); // Process next item
    }
  }

  /**
   * Check if we can make a request based on rate limiting
   */
  private canMakeRequest(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Clean old timestamps
    this.requestTimestamps = this.requestTimestamps.filter(
      (timestamp) => timestamp > oneMinuteAgo
    );

    return this.requestTimestamps.length < this.requestsPerMinute;
  }

  /**
   * Get queue statistics
   */
  getStats() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentRequests = this.requestTimestamps.filter(
      (timestamp) => timestamp > oneMinuteAgo
    );

    return {
      queueLength: this.queue.length,
      processing: this.processing,
      maxConcurrent: this.maxConcurrent,
      requestsLastMinute: recentRequests.length,
      requestsPerMinute: this.requestsPerMinute,
    };
  }

  /**
   * Clear the queue
   */
  clear(): void {
    for (const item of this.queue) {
      item.reject(new Error('Queue cleared'));
    }
    this.queue = [];
  }
}

// Global request queue instance
export const requestQueue = new RequestQueue(
  parseInt(process.env.MAX_CONCURRENT_REQUESTS || '3'),
  parseInt(process.env.REQUESTS_PER_MINUTE || '60')
);
