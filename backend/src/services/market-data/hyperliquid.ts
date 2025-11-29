import axios from 'axios';
import { Wallet, ethers } from 'ethers';
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
  private wallet: Wallet | null = null;

  constructor(useTestnet: boolean = false) {
    this.useTestnet = useTestnet;
    this.apiUrl = useTestnet
      ? process.env.HYPERLIQUID_TESTNET_URL || 'https://api.hyperliquid-testnet.xyz'
      : process.env.HYPERLIQUID_API_URL || 'https://api.hyperliquid.xyz';

    // Initialize wallet if private key is available
    const privateKey = process.env.HYPERLIQUID_PRIVATE_KEY;
    if (privateKey) {
      try {
        this.wallet = new Wallet(privateKey);
        console.log('✓ Hyperliquid wallet initialized:', this.wallet.address);
      } catch (error) {
        console.error('⚠ Failed to initialize Hyperliquid wallet:', error);
      }
    } else {
      console.log('⚠ No Hyperliquid private key found. Trading disabled.');
    }
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

  /**
   * Sign action using EIP-712
   */
  private async signAction(action: any, nonce: number): Promise<{ r: string; s: string; v: number }> {
    if (!this.wallet) {
      throw new Error('Wallet not initialized. Cannot sign orders.');
    }

    const domain = {
      name: 'HyperliquidSignTransaction',
      version: '1',
      chainId: 1337,
      verifyingContract: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    };

    const types = {
      Agent: [
        { name: 'source', type: 'string' },
        { name: 'connectionId', type: 'bytes32' },
      ],
    };

    const phantomAgent = {
      source: 'a',
      connectionId: ethers.zeroPadBytes('0x', 32),
    };

    // Create structured data for signing
    const actionHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(action)));

    const message = {
      action: actionHash,
      nonce,
      phantomAgent,
    };

    const signature = await this.wallet.signTypedData(domain, types, message);
    const sig = ethers.Signature.from(signature);

    return {
      r: sig.r,
      s: sig.s,
      v: sig.v,
    };
  }

  /**
   * Get current nonce for the wallet
   */
  private async getNonce(): Promise<number> {
    return Date.now();
  }

  /**
   * Place an order on Hyperliquid
   */
  async placeOrder(params: {
    symbol: string;
    isBuy: boolean;
    size: number;
    price: number;
    orderType: 'limit' | 'market';
    reduceOnly?: boolean;
    timeInForce?: 'Gtc' | 'Ioc' | 'Alo';
  }) {
    if (!this.wallet) {
      throw new Error('Trading not enabled. Wallet not configured.');
    }

    if (process.env.ENABLE_LIVE_TRADING !== 'true') {
      throw new Error('Live trading is disabled. Set ENABLE_LIVE_TRADING=true in .env to enable.');
    }

    try {
      // Get asset index
      const meta = await this.getMetaAndAssetCtxs();
      const assetIndex = meta[0].universe.findIndex((u: any) => u.name === params.symbol);

      if (assetIndex === -1) {
        throw new Error(`Asset ${params.symbol} not found`);
      }

      // Determine limit price (for market orders, use current price with slippage)
      let limitPx = params.price;
      if (params.orderType === 'market') {
        const currentPrice = await this.getCurrentPrice(params.symbol);
        // Add 0.5% slippage for market orders
        limitPx = params.isBuy ? currentPrice * 1.005 : currentPrice * 0.995;
      }

      // Build order action
      const order = {
        a: assetIndex,
        b: params.isBuy,
        p: limitPx.toFixed(8),
        s: params.size.toFixed(8),
        r: params.reduceOnly || false,
        t: {
          limit: {
            tif: params.timeInForce || (params.orderType === 'market' ? 'Ioc' : 'Gtc'),
          },
        },
      };

      const action = {
        type: 'order',
        orders: [order],
        grouping: 'na',
      };

      const nonce = await this.getNonce();
      const signature = await this.signAction(action, nonce);

      // Submit order
      const response = await axios.post(`${this.apiUrl}/exchange`, {
        action,
        nonce,
        signature,
        vaultAddress: null,
      });

      console.log(`✓ Order placed: ${params.isBuy ? 'BUY' : 'SELL'} ${params.size} ${params.symbol} @ ${limitPx}`);
      return response.data;
    } catch (error: any) {
      console.error('Error placing order:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(params: { symbol: string; orderId: number }) {
    if (!this.wallet) {
      throw new Error('Trading not enabled. Wallet not configured.');
    }

    if (process.env.ENABLE_LIVE_TRADING !== 'true') {
      throw new Error('Live trading is disabled.');
    }

    try {
      // Get asset index
      const meta = await this.getMetaAndAssetCtxs();
      const assetIndex = meta[0].universe.findIndex((u: any) => u.name === params.symbol);

      const action = {
        type: 'cancel',
        cancels: [
          {
            a: assetIndex,
            o: params.orderId,
          },
        ],
      };

      const nonce = await this.getNonce();
      const signature = await this.signAction(action, nonce);

      const response = await axios.post(`${this.apiUrl}/exchange`, {
        action,
        nonce,
        signature,
        vaultAddress: null,
      });

      console.log(`✓ Order cancelled: ${params.orderId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error cancelling order:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Close a position (market order to close)
   */
  async closePosition(params: { symbol: string; size: number }) {
    const currentPosition = await this.getUserState(this.wallet!.address);
    const assetPosition = currentPosition.assetPositions?.find(
      (p: any) => p.position.coin === params.symbol
    );

    if (!assetPosition) {
      throw new Error(`No open position for ${params.symbol}`);
    }

    const positionSize = parseFloat(assetPosition.position.szi);
    const isBuy = positionSize < 0; // If short, buy to close

    return this.placeOrder({
      symbol: params.symbol,
      isBuy,
      size: Math.abs(positionSize),
      price: 0, // Will use market price with slippage
      orderType: 'market',
      reduceOnly: true,
    });
  }
}
