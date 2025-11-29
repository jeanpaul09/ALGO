import { BaseStrategy, StrategyContext, StrategySignal } from './base-strategy';

/**
 * Volatility Breakout Strategy
 * Exploits volatility expansion after consolidation
 */
export class VolatilityBreakout extends BaseStrategy {
  constructor() {
    super(
      'Volatility Breakout',
      'Technical',
      'Captures explosive moves following periods of low volatility consolidation'
    );
  }

  async analyze(currentPrice: number, context: StrategyContext): Promise<StrategySignal> {
    const { priceHistory, volumeHistory } = context;

    // Calculate volatility metrics
    const currentVolatility = this.calculateVolatility(priceHistory, 10);
    const historicalVolatility = this.calculateVolatility(priceHistory, 50);
    const volatilityRatio = currentVolatility / historicalVolatility;

    // Calculate ATR (Average True Range)
    const atr = this.calculateATR(priceHistory, 14);
    const atrPercent = (atr / currentPrice) * 100;

    // Detect consolidation period (squeeze)
    const inSqueeze = this.detectSqueeze(priceHistory, 20);

    // Measure recent price expansion
    const expansion = this.detectExpansion(priceHistory, atr);

    // Volume confirmation
    const volumeSpike = volumeHistory && volumeHistory.length >= 10
      ? this.detectVolumeSpike(volumeHistory)
      : false;

    // Determine signal
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 50;
    let strength = 0;
    let reasoning = '';

    // Volatility breakout up (squeeze -> expansion up)
    if (
      inSqueeze.inSqueeze &&
      expansion.direction === 'up' &&
      expansion.strength > 1.5 &&
      volumeSpike
    ) {
      action = 'BUY';
      strength = Math.min(95, expansion.strength * 40 + inSqueeze.duration * 5);
      confidence = Math.min(88, 60 + strength * 0.28);
      reasoning = `Volatility breakout detected. ${inSqueeze.duration} period squeeze released. ${expansion.strength.toFixed(1)}x ATR move up with volume spike`;
    }
    // Volatility breakout down (squeeze -> expansion down)
    else if (
      inSqueeze.inSqueeze &&
      expansion.direction === 'down' &&
      expansion.strength > 1.5 &&
      volumeSpike
    ) {
      action = 'SELL';
      strength = Math.min(95, expansion.strength * 40 + inSqueeze.duration * 5);
      confidence = Math.min(88, 60 + strength * 0.28);
      reasoning = `Volatility breakdown detected. ${inSqueeze.duration} period squeeze released. ${expansion.strength.toFixed(1)}x ATR move down with volume spike`;
    }
    // Early squeeze detection (potential setup)
    else if (
      inSqueeze.inSqueeze &&
      inSqueeze.duration >= 10 &&
      volatilityRatio < 0.5
    ) {
      // Determine direction bias based on trend
      const trend = this.determineTrend(priceHistory);
      action = trend === 'up' ? 'BUY' : trend === 'down' ? 'SELL' : 'HOLD';
      strength = Math.min(70, inSqueeze.duration * 4);
      confidence = Math.min(72, 55 + strength * 0.2);
      reasoning = `Volatility squeeze forming (${inSqueeze.duration} periods). Volatility ${(volatilityRatio * 100).toFixed(0)}% of average. Breakout imminent, bias ${trend}`;
    }
    // Volatility expansion continuation
    else if (
      expansion.direction !== 'none' &&
      expansion.strength > 1.2 &&
      volatilityRatio > 1.5
    ) {
      action = expansion.direction === 'up' ? 'BUY' : 'SELL';
      strength = Math.min(75, expansion.strength * 35);
      confidence = Math.min(75, 58 + strength * 0.22);
      reasoning = `Volatility expansion continuing ${expansion.direction}. ${expansion.strength.toFixed(1)}x ATR move. Ride the momentum`;
    }
    // Volatility contraction (ranging)
    else if (volatilityRatio < 0.6 && atrPercent < 2) {
      action = 'HOLD';
      reasoning = `Low volatility environment. ATR: ${atrPercent.toFixed(2)}%, ${(volatilityRatio * 100).toFixed(0)}% of historical. Wait for breakout`;
    }
    else {
      reasoning = `Current volatility: ${currentVolatility.toFixed(2)}, ratio: ${volatilityRatio.toFixed(2)}x. ATR: ${atrPercent.toFixed(2)}%`;
    }

    return {
      action,
      confidence,
      strength,
      reasoning,
      metadata: {
        currentVolatility,
        volatilityRatio,
        atr,
        atrPercent,
        inSqueeze: inSqueeze.inSqueeze,
        squeezeDuration: inSqueeze.duration,
        expansionDirection: expansion.direction,
        expansionStrength: expansion.strength,
      },
    };
  }

  private calculateVolatility(prices: number[], period: number): number {
    if (prices.length < period) return 0;

    const returns = [];
    for (let i = prices.length - period; i < prices.length; i++) {
      if (i > 0) {
        returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
      }
    }

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;

    return Math.sqrt(variance) * 100;
  }

  private calculateATR(prices: number[], period: number): number {
    if (prices.length < period + 1) return 0;

    const trueRanges: number[] = [];

    for (let i = prices.length - period; i < prices.length; i++) {
      if (i > 0) {
        const high = prices[i];
        const low = prices[i];
        const prevClose = prices[i - 1];

        const tr = Math.max(
          high - low,
          Math.abs(high - prevClose),
          Math.abs(low - prevClose)
        );
        trueRanges.push(tr);
      }
    }

    return trueRanges.reduce((a, b) => a + b, 0) / trueRanges.length;
  }

  private detectSqueeze(prices: number[], period: number) {
    if (prices.length < period) {
      return { inSqueeze: false, duration: 0 };
    }

    const recentPrices = prices.slice(-period);
    const high = Math.max(...recentPrices);
    const low = Math.min(...recentPrices);
    const range = (high - low) / low;

    // Squeeze if range is less than 3%
    const inSqueeze = range < 0.03;

    // Calculate squeeze duration
    let duration = 0;
    if (inSqueeze) {
      for (let i = prices.length - 1; i >= Math.max(0, prices.length - 50); i--) {
        const slice = prices.slice(Math.max(0, i - period), i + 1);
        if (slice.length < period) break;

        const h = Math.max(...slice);
        const l = Math.min(...slice);
        const r = (h - l) / l;

        if (r < 0.03) {
          duration++;
        } else {
          break;
        }
      }
    }

    return { inSqueeze, duration };
  }

  private detectExpansion(prices: number[], atr: number) {
    if (prices.length < 5) {
      return { direction: 'none' as const, strength: 0 };
    }

    const recentMove = prices[prices.length - 1] - prices[prices.length - 5];
    const moveSize = Math.abs(recentMove);
    const strength = moveSize / atr;

    if (strength < 0.5) {
      return { direction: 'none' as const, strength: 0 };
    }

    return {
      direction: recentMove > 0 ? 'up' as const : 'down' as const,
      strength,
    };
  }

  private detectVolumeSpike(volumes: number[]): boolean {
    if (volumes.length < 10) return false;

    const avgVolume = volumes.slice(-10, -1).reduce((a, b) => a + b, 0) / 9;
    const currentVolume = volumes[volumes.length - 1];

    return currentVolume > avgVolume * 1.5;
  }

  private determineTrend(prices: number[]): 'up' | 'down' | 'none' {
    if (prices.length < 50) return 'none';

    const sma20 = prices.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const sma50 = prices.slice(-50).reduce((a, b) => a + b, 0) / 50;
    const currentPrice = prices[prices.length - 1];

    if (sma20 > sma50 && currentPrice > sma20) return 'up';
    if (sma20 < sma50 && currentPrice < sma20) return 'down';
    return 'none';
  }

  protected getMinHistoryLength(): number {
    return 50;
  }
}
