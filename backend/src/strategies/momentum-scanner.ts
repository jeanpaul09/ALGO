import { BaseStrategy, StrategyContext, StrategySignal } from './base-strategy';

/**
 * Momentum Scanner Strategy
 * Identifies strong directional moves using multi-timeframe momentum
 */
export class MomentumScanner extends BaseStrategy {
  constructor() {
    super(
      'Momentum Scanner',
      'Technical',
      'Detects strong momentum across multiple timeframes with volume confirmation'
    );
  }

  async analyze(currentPrice: number, context: StrategyContext): Promise<StrategySignal> {
    const { priceHistory, volumeHistory } = context;

    // Calculate momentum indicators
    const rsi = this.calculateRSI(priceHistory, 14);
    const macd = this.calculateMACD(priceHistory);
    const volumeRatio = this.calculateVolumeRatio(volumeHistory || []);

    // Short-term vs long-term momentum
    const shortMomentum = this.getMomentum(priceHistory, 10);
    const longMomentum = this.getMomentum(priceHistory, 50);

    // Determine signal
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 50;
    let strength = 0;
    let reasoning = '';

    // Strong bullish momentum
    if (
      shortMomentum > 0 &&
      longMomentum > 0 &&
      macd.histogram > 0 &&
      rsi > 50 &&
      rsi < 70 &&
      volumeRatio > 1.2
    ) {
      action = 'BUY';
      strength = Math.min(
        100,
        (shortMomentum * 20 + (rsi - 50) * 2 + volumeRatio * 30)
      );
      confidence = Math.min(95, 60 + strength * 0.35);
      reasoning = `Strong upward momentum detected. RSI: ${rsi.toFixed(1)}, MACD histogram positive, volume ${(volumeRatio * 100 - 100).toFixed(0)}% above average`;
    }
    // Strong bearish momentum
    else if (
      shortMomentum < 0 &&
      longMomentum < 0 &&
      macd.histogram < 0 &&
      rsi < 50 &&
      rsi > 30 &&
      volumeRatio > 1.2
    ) {
      action = 'SELL';
      strength = Math.min(
        100,
        Math.abs(shortMomentum * 20 + (50 - rsi) * 2 + volumeRatio * 30)
      );
      confidence = Math.min(95, 60 + strength * 0.35);
      reasoning = `Strong downward momentum detected. RSI: ${rsi.toFixed(1)}, MACD histogram negative, volume ${(volumeRatio * 100 - 100).toFixed(0)}% above average`;
    }
    // Weak or no momentum
    else {
      strength = 0;
      confidence = 40;
      reasoning = `No clear momentum. Short-term: ${shortMomentum > 0 ? 'bullish' : 'bearish'}, Long-term: ${longMomentum > 0 ? 'bullish' : 'bearish'}`;
    }

    return {
      action,
      confidence,
      strength,
      reasoning,
      metadata: {
        rsi,
        macd: macd.histogram,
        shortMomentum,
        longMomentum,
        volumeRatio,
      },
    };
  }

  private calculateRSI(prices: number[], period: number): number {
    if (prices.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  private calculateMACD(prices: number[]) {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macd = ema12 - ema26;
    const signal = ema26; // Simplified

    return {
      macd,
      signal,
      histogram: macd - signal,
    };
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];

    const k = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;

    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * k + ema;
    }

    return ema;
  }

  private getMomentum(prices: number[], period: number): number {
    if (prices.length < period) return 0;
    const oldPrice = prices[prices.length - period];
    const newPrice = prices[prices.length - 1];
    return ((newPrice - oldPrice) / oldPrice) * 100;
  }

  private calculateVolumeRatio(volumes: number[]): number {
    if (volumes.length < 20) return 1;
    const avgVolume = volumes.slice(-20, -1).reduce((a, b) => a + b, 0) / 19;
    const currentVolume = volumes[volumes.length - 1];
    return currentVolume / avgVolume;
  }

  protected getMinHistoryLength(): number {
    return 50;
  }
}
