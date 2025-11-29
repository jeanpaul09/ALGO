import axios from 'axios';
import { MarketDataPoint } from '../../types';

export interface HyperliquidCandle {
  t: number; // timestamp in ms
  o: string; // open
  h: string; // high
  l: string; // low
  c: string; // close
  v: string; // volume
}

export interface HyperliquidMeta {
  universe: Array<{
    name: string;
    szDecimals: number;
  }>;
}

export class HyperliquidClient {
  private apiUrl: string;
  private useTestnet: boolean;

  constructor(useTestnet: boolean = false) {
    this.useTestnet = useTestnet;
    this.apiUrl = useTestnet
      ? process.env.HYPERLIQUID_TESTNET_URL || 'https://api.hyperliquid-testnet.xyz'
      : process.env.HYPERLIQUID_API_URL || 'https://api.hyperliquid.xyz';
  }

  async getHistoricalData(
    symbol: string,
    interval: string = '1h',
    startTime: Date,
    endTime: Date
  ): Promise<MarketDataPoint[]> {
    try {
      const response = await axios.post(`${this.apiUrl}/info`, {
        type: 'candleSnapshot',
        req: {
          coin: symbol,
          interval,
          startTime: startTime.getTime(),
          endTime: endTime.getTime(),
        },
      });

      const candles: HyperliquidCandle[] = response.data;
      return candles.map((candle) => ({
        timestamp: new Date(candle.t),
        open: parseFloat(candle.o),
        high: parseFloat(candle.h),
        low: parseFloat(candle.l),
        close: parseFloat(candle.c),
        volume: parseFloat(candle.v),
        venue: 'hyperliquid',
        symbol,
      }));
    } catch (error) {
      console.error('Error fetching Hyperliquid historical data:', error);
      throw error;
    }
  }

  async getCurrentPrice(symbol: string): Promise<number> {
    try {
      const response = await axios.post(`${this.apiUrl}/info`, {
        type: 'allMids',
      });

      const mids = response.data;
      const price = mids[symbol];

      if (!price) {
        throw new Error(`Price not found for symbol: ${symbol}`);
      }

      return parseFloat(price);
    } catch (error) {
      console.error('Error fetching current price:', error);
      throw error;
    }
  }

  async getMetaAndAssetCtxs() {
    try {
      const response = await axios.post(`${this.apiUrl}/info`, {
        type: 'metaAndAssetCtxs',
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching meta and asset contexts:', error);
      throw error;
    }
  }

  async getUserState(address: string) {
    try {
      const response = await axios.post(`${this.apiUrl}/info`, {
        type: 'clearinghouseState',
        user: address,
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching user state:', error);
      throw error;
    }
  }

  async getFundingRate(symbol: string): Promise<number> {
    try {
      const metaAndAssetCtxs = await this.getMetaAndAssetCtxs();
      const assetCtx = metaAndAssetCtxs[1].find((ctx: any) => ctx.coin === symbol);

      if (!assetCtx || !assetCtx.funding) {
        return 0;
      }

      return parseFloat(assetCtx.funding);
    } catch (error) {
      console.error('Error fetching funding rate:', error);
      return 0;
    }
  }

  async placeOrder(params: {
    symbol: string;
    isBuy: boolean;
    size: number;
    price: number;
    orderType: 'limit' | 'market';
    reduceOnly?: boolean;
  }) {
    // This would require wallet signing with ethers
    // Placeholder for now - actual implementation requires private key
    throw new Error('Live order placement requires wallet configuration');
  }

  async cancelOrder(orderId: string) {
    throw new Error('Live order cancellation requires wallet configuration');
  }
}
