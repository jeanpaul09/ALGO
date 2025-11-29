import { BaseStrategy, StrategyContext, StrategySignal } from './base-strategy';

/**
 * Mean Reversion Strategy
 * Identifies oversold/overbought conditions and expected reversals
 */
export class MeanReversion extends BaseStrategy {
  constructor() {
    super(
      'Mean Reversion',
      'Technical',
      'Exploits price deviations from statistical mean using Bollinger Bands and RSI'
    );
  }

  async analyze(currentPrice: number, context: StrategyContext): Promise<StrategySignal> {
    const { priceHistory } = context;

    // Calculate Bollinger Bands
    const bb = this.calculateBollingerBands(priceHistory, 20, 2);
    const rsi = this.calculateRSI(priceHistory, 14);

    // Price position within bands (0 = lower band, 1 = upper band)
    const bandPosition = (currentPrice - bb.lower) / (bb.upper - bb.lower);

    // Determine signal
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 50;
    let strength = 0;
    let reasoning = '';

    // Oversold - potential bounce
    if (bandPosition < 0.2 && rsi < 35) {
      action = 'BUY';
      strength = Math.min(100, (35 - rsi) * 3 + (0.2 - bandPosition) * 200);
      confidence = Math.min(90, 55 + strength * 0.3);
      reasoning = `Oversold conditions. Price ${((bandPosition * 100).toFixed(0))}% through BB, RSI ${rsi.toFixed(1)}. Mean reversion likely`;
    }
    // Overbought - potential pullback
    else if (bandPosition > 0.8 && rsi > 65) {
      action = 'SELL';
      strength = Math.min(100, (rsi - 65) * 3 + (bandPosition - 0.8) * 200);
      confidence = Math.min(90, 55 + strength * 0.3);
      reasoning = `Overbought conditions. Price ${((bandPosition * 100).toFixed(0))}% through BB, RSI ${rsi.toFixed(1)}. Mean reversion likely`;
    }
    // Within normal range
    else {
      reasoning = `Price in normal range (${(bandPosition * 100).toFixed(0)}% through BB). No reversion signal`;
    }

    return {
      action,
      confidence,
      strength,
      reasoning,
      metadata: {
        bollingerPosition: bandPosition,
        rsi,
        upperBand: bb.upper,
        lowerBand: bb.lower,
        middle: bb.middle,
      },
    };
  }

  private calculateBollingerBands(prices: number[], period: number, stdDevMultiplier: number) {
    const slice = prices.slice(-period);
    const mean = slice.reduce((a, b) => a + b, 0) / period;

    const variance = slice.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    return {
      upper: mean + stdDev * stdDevMultiplier,
      middle: mean,
      lower: mean - stdDev * stdDevMultiplier,
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

  protected getMinHistoryLength(): number {
    return 30;
  }
}
