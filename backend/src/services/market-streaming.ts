import { WebSocketManager } from './websocket';
import { MarketDataService } from './market-data';

export class MarketStreamingService {
  private marketData: MarketDataService;
  private wsManager: WebSocketManager;
  private streamingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private activeSymbols: Set<string> = new Set();

  constructor(wsManager: WebSocketManager) {
    this.wsManager = wsManager;
    this.marketData = new MarketDataService();
  }

  /**
   * Start streaming market data for a symbol
   */
  async startStreaming(venue: string, symbol: string, intervalMs: number = 1000) {
    const key = `${venue}:${symbol}`;

    // Don't start if already streaming
    if (this.streamingIntervals.has(key)) {
      console.log(`Already streaming ${key}`);
      return;
    }

    this.activeSymbols.add(symbol);
    console.log(`Starting market stream for ${key} (${intervalMs}ms interval)`);

    // Fetch and broadcast immediately
    await this.fetchAndBroadcast(venue, symbol);

    // Then set up interval
    const interval = setInterval(async () => {
      await this.fetchAndBroadcast(venue, symbol);
    }, intervalMs);

    this.streamingIntervals.set(key, interval);
  }

  /**
   * Stop streaming for a symbol
   */
  stopStreaming(venue: string, symbol: string) {
    const key = `${venue}:${symbol}`;
    const interval = this.streamingIntervals.get(key);

    if (interval) {
      clearInterval(interval);
      this.streamingIntervals.delete(key);
      this.activeSymbols.delete(symbol);
      console.log(`Stopped market stream for ${key}`);
    }
  }

  /**
   * Stop all streaming
   */
  stopAll() {
    this.streamingIntervals.forEach((interval, key) => {
      clearInterval(interval);
      console.log(`Stopped market stream for ${key}`);
    });
    this.streamingIntervals.clear();
    this.activeSymbols.clear();
  }

  /**
   * Fetch current price and broadcast to clients
   */
  private async fetchAndBroadcast(venue: string, symbol: string) {
    try {
      const price = await this.marketData.getCurrentPrice(venue, symbol);

      // Broadcast market update
      this.wsManager.broadcast({
        type: 'market_update',
        data: {
          symbol,
          venue,
          price,
          timestamp: Date.now(),
          bid: price * 0.9999, // Simulated bid/ask spread
          ask: price * 1.0001,
        },
      });

      // Also fetch and broadcast funding rate (less frequently)
      if (Math.random() < 0.1) { // 10% chance each update
        const fundingRate = await this.marketData.getFundingRate(venue, symbol);
        this.wsManager.broadcast({
          type: 'funding_update',
          data: {
            symbol,
            venue,
            fundingRate,
            timestamp: Date.now(),
          },
        });
      }
    } catch (error) {
      console.error(`Error fetching price for ${venue}:${symbol}:`, error);
    }
  }

  /**
   * Get list of actively streamed symbols
   */
  getActiveSymbols(): string[] {
    return Array.from(this.activeSymbols);
  }

  /**
   * Check if a symbol is being streamed
   */
  isStreaming(venue: string, symbol: string): boolean {
    return this.streamingIntervals.has(`${venue}:${symbol}`);
  }
}
