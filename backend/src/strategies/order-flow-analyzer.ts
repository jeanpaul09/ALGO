import { BaseStrategy, StrategyContext, StrategySignal } from './base-strategy';

/**
 * Order Flow Analyzer
 * Tracks large orders and institutional activity using volume and price action
 */
export class OrderFlowAnalyzer extends BaseStrategy {
  constructor() {
    super(
      'Order Flow Analyzer',
      'Institutional',
      'Detects large institutional orders and smart money flow through volume and price action analysis'
    );
  }

  async analyze(currentPrice: number, context: StrategyContext): Promise<StrategySignal> {
    const { priceHistory, volumeHistory, orderbook } = context;

    if (!volumeHistory || volumeHistory.length < 20) {
      return this.holdSignal('Insufficient volume data for order flow analysis');
    }

    // Analyze volume patterns
    const avgVolume = volumeHistory.slice(-20, -1).reduce((a, b) => a + b, 0) / 19;
    const currentVolume = volumeHistory[volumeHistory.length - 1];
    const volumeRatio = currentVolume / avgVolume;

    // Detect large orders (volume spikes)
    const volumeSpike = volumeRatio > 2.5;

    // Price action during volume spike
    const recentPriceChange = priceHistory.length >= 5
      ? (priceHistory[priceHistory.length - 1] - priceHistory[priceHistory.length - 5]) / priceHistory[priceHistory.length - 5]
      : 0;

    // Analyze orderbook imbalance (if available)
    let orderbookImbalance = 0;
    if (orderbook && orderbook.bids && orderbook.asks) {
      const bidVolume = orderbook.bids.reduce((sum, [price, vol]) => sum + vol, 0);
      const askVolume = orderbook.asks.reduce((sum, [price, vol]) => sum + vol, 0);
      orderbookImbalance = (bidVolume - askVolume) / (bidVolume + askVolume);
    }

    // Determine signal
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 50;
    let strength = 0;
    let reasoning = '';

    // Bullish institutional buying (volume spike + price up + bid pressure)
    if (volumeSpike && recentPriceChange > 0.005 && orderbookImbalance > 0.2) {
      action = 'BUY';
      strength = Math.min(100, volumeRatio * 25 + Math.abs(orderbookImbalance) * 100);
      confidence = Math.min(90, 60 + strength * 0.3);
      reasoning = `Large institutional buying detected. Volume ${(volumeRatio * 100).toFixed(0)}% above average, orderbook ${(orderbookImbalance * 100).toFixed(0)}% bid-weighted`;
    }
    // Bearish institutional selling (volume spike + price down + ask pressure)
    else if (volumeSpike && recentPriceChange < -0.005 && orderbookImbalance < -0.2) {
      action = 'SELL';
      strength = Math.min(100, volumeRatio * 25 + Math.abs(orderbookImbalance) * 100);
      confidence = Math.min(90, 60 + strength * 0.3);
      reasoning = `Large institutional selling detected. Volume ${(volumeRatio * 100).toFixed(0)}% above average, orderbook ${(Math.abs(orderbookImbalance) * 100).toFixed(0)}% ask-weighted`;
    }
    // Accumulation (high volume, stable price, bid pressure)
    else if (volumeRatio > 1.5 && Math.abs(recentPriceChange) < 0.003 && orderbookImbalance > 0.15) {
      action = 'BUY';
      strength = Math.min(80, volumeRatio * 20 + Math.abs(orderbookImbalance) * 80);
      confidence = Math.min(75, 55 + strength * 0.25);
      reasoning = `Accumulation pattern. High volume (${(volumeRatio * 100).toFixed(0)}%), stable price, strong bid support`;
    }
    // Distribution (high volume, stable price, ask pressure)
    else if (volumeRatio > 1.5 && Math.abs(recentPriceChange) < 0.003 && orderbookImbalance < -0.15) {
      action = 'SELL';
      strength = Math.min(80, volumeRatio * 20 + Math.abs(orderbookImbalance) * 80);
      confidence = Math.min(75, 55 + strength * 0.25);
      reasoning = `Distribution pattern. High volume (${(volumeRatio * 100).toFixed(0)}%), stable price, heavy ask pressure`;
    }
    else {
      reasoning = `No significant order flow. Volume ratio: ${volumeRatio.toFixed(2)}x, Orderbook: ${(orderbookImbalance * 100).toFixed(0)}% imbalance`;
    }

    return {
      action,
      confidence,
      strength,
      reasoning,
      metadata: {
        volumeRatio,
        orderbookImbalance,
        volumeSpike,
        recentPriceChange: recentPriceChange * 100,
      },
    };
  }

  protected getMinHistoryLength(): number {
    return 20;
  }
}
