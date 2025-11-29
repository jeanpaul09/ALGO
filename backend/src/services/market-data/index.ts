import { MarketDataPoint } from '../../types';
import { HyperliquidClient } from './hyperliquid';
import { prisma } from '../../lib/prisma';

export class MarketDataService {
  private hyperliquid: HyperliquidClient;

  constructor() {
    this.hyperliquid = new HyperliquidClient(false);
  }

  async getHistoricalData(
    venue: string,
    symbol: string,
    startDate: Date,
    endDate: Date,
    interval: string = '1h'
  ): Promise<MarketDataPoint[]> {
    // Check cache first
    const cached = await this.getCachedData(venue, symbol, startDate, endDate);
    if (cached.length > 0) {
      return cached;
    }

    // Fetch from appropriate venue
    let data: MarketDataPoint[] = [];

    switch (venue.toLowerCase()) {
      case 'hyperliquid':
        data = await this.hyperliquid.getHistoricalData(symbol, interval, startDate, endDate);
        break;
      default:
        throw new Error(`Unsupported venue: ${venue}`);
    }

    // Cache the data
    await this.cacheData(data);

    return data;
  }

  async getCurrentPrice(venue: string, symbol: string): Promise<number> {
    switch (venue.toLowerCase()) {
      case 'hyperliquid':
        return await this.hyperliquid.getCurrentPrice(symbol);
      default:
        throw new Error(`Unsupported venue: ${venue}`);
    }
  }

  async getFundingRate(venue: string, symbol: string): Promise<number> {
    switch (venue.toLowerCase()) {
      case 'hyperliquid':
        return await this.hyperliquid.getFundingRate(symbol);
      default:
        return 0;
    }
  }

  private async getCachedData(
    venue: string,
    symbol: string,
    startDate: Date,
    endDate: Date
  ): Promise<MarketDataPoint[]> {
    const cached = await prisma.marketData.findMany({
      where: {
        venue,
        symbol,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    return cached.map((d: any) => ({
      timestamp: d.timestamp,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume,
      venue: d.venue,
      symbol: d.symbol,
      metadata: d.metadata ? JSON.parse(d.metadata) : undefined,
    }));
  }

  private async cacheData(data: MarketDataPoint[]) {
    // Batch insert market data
    const records = data.map((d) => ({
      venue: d.venue,
      symbol: d.symbol,
      timestamp: d.timestamp,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume,
      metadata: d.metadata ? JSON.stringify(d.metadata) : null,
    }));

    // Use createMany with skipDuplicates to avoid conflicts
    await prisma.marketData.createMany({
      data: records,
      skipDuplicates: true,
    });
  }

  async streamPriceUpdates(
    venue: string,
    symbol: string,
    callback: (price: number) => void
  ): Promise<() => void> {
    // Poll for price updates (could be replaced with actual WebSocket streaming)
    const intervalId = setInterval(async () => {
      try {
        const price = await this.getCurrentPrice(venue, symbol);
        callback(price);
      } catch (error) {
        console.error('Error streaming price:', error);
      }
    }, 1000); // Update every second

    return () => clearInterval(intervalId);
  }
}
