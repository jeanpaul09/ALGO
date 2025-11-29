import { BaseStrategy, StrategyContext, StrategySignal } from './base-strategy';

/**
 * VWAP Strategy
 * Volume Weighted Average Price - institutional benchmark
 */
export class VWAPStrategy extends BaseStrategy {
  constructor() {
    super(
      'VWAP Strategy',
      'Technical',
      'Uses Volume Weighted Average Price as dynamic support/resistance and trend filter'
    );
  }

  async analyze(currentPrice: number, context: StrategyContext): Promise<StrategySignal> {
    const { priceHistory, volumeHistory } = context;

    if (!volumeHistory || volumeHistory.length < 20) {
      return this.holdSignal('Insufficient data for VWAP calculation');
    }

    // Calculate VWAP
    const vwap = this.calculateVWAP(priceHistory, volumeHistory);

    // Calculate standard deviation bands
    const bands = this.calculateVWAPBands(priceHistory, volumeHistory, vwap);

    // Price position relative to VWAP
    const position = this.analyzeVWAPPosition(currentPrice, vwap, bands);

    // Volume analysis
    const volumeTrend = this.analyzeVolumeTrend(volumeHistory);

    // Determine signal
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 50;
    let strength = 0;
    let reasoning = '';

    // Price bouncing off VWAP from below with volume
    if (
      position.nearVWAP &&
      position.above === false &&
      currentPrice > vwap &&
      volumeTrend.increasing
    ) {
      action = 'BUY';
      strength = Math.min(85, 65 + volumeTrend.ratio * 15);
      confidence = Math.min(82, 58 + strength * 0.25);
      reasoning = `Price bounced off VWAP support at $${vwap.toFixed(2)}. Volume increasing ${(volumeTrend.ratio * 100).toFixed(0)}%. Bullish continuation`;
    }
    // Price rejected at VWAP from above with volume
    else if (
      position.nearVWAP &&
      position.above === true &&
      currentPrice < vwap &&
      volumeTrend.increasing
    ) {
      action = 'SELL';
      strength = Math.min(85, 65 + volumeTrend.ratio * 15);
      confidence = Math.min(82, 58 + strength * 0.25);
      reasoning = `Price rejected at VWAP resistance at $${vwap.toFixed(2)}. Volume increasing ${(volumeTrend.ratio * 100).toFixed(0)}%. Bearish continuation`;
    }
    // Price at lower band (oversold)
    else if (position.atLowerBand && volumeTrend.ratio > 1.2) {
      action = 'BUY';
      strength = Math.min(80, 60 + position.distanceFromVWAP * 10);
      confidence = Math.min(78, 56 + strength * 0.25);
      reasoning = `Price at VWAP lower band ($${bands.lower.toFixed(2)}). ${position.distanceFromVWAP.toFixed(1)}% below VWAP. Mean reversion likely`;
    }
    // Price at upper band (overbought)
    else if (position.atUpperBand && volumeTrend.ratio > 1.2) {
      action = 'SELL';
      strength = Math.min(80, 60 + position.distanceFromVWAP * 10);
      confidence = Math.min(78, 56 + strength * 0.25);
      reasoning = `Price at VWAP upper band ($${bands.upper.toFixed(2)}). ${position.distanceFromVWAP.toFixed(1)}% above VWAP. Mean reversion likely`;
    }
    // Strong trend above VWAP
    else if (
      position.above &&
      position.distanceFromVWAP > 2 &&
      position.distanceFromVWAP < 5 &&
      volumeTrend.ratio > 1.1
    ) {
      action = 'BUY';
      strength = Math.min(70, 55);
      confidence = Math.min(72, 58);
      reasoning = `Strong uptrend. Price ${position.distanceFromVWAP.toFixed(1)}% above VWAP. Riding the trend`;
    }
    // Strong trend below VWAP
    else if (
      !position.above &&
      position.distanceFromVWAP > 2 &&
      position.distanceFromVWAP < 5 &&
      volumeTrend.ratio > 1.1
    ) {
      action = 'SELL';
      strength = Math.min(70, 55);
      confidence = Math.min(72, 58);
      reasoning = `Strong downtrend. Price ${position.distanceFromVWAP.toFixed(1)}% below VWAP. Riding the trend`;
    }
    // Price crossing VWAP upward with volume
    else if (
      position.crossingUp &&
      volumeTrend.ratio > 1.3
    ) {
      action = 'BUY';
      strength = Math.min(75, 58);
      confidence = Math.min(75, 60);
      reasoning = `Price crossing above VWAP ($${vwap.toFixed(2)}) with ${(volumeTrend.ratio * 100).toFixed(0)}% volume spike. Momentum shift`;
    }
    // Price crossing VWAP downward with volume
    else if (
      position.crossingDown &&
      volumeTrend.ratio > 1.3
    ) {
      action = 'SELL';
      strength = Math.min(75, 58);
      confidence = Math.min(75, 60);
      reasoning = `Price crossing below VWAP ($${vwap.toFixed(2)}) with ${(volumeTrend.ratio * 100).toFixed(0)}% volume spike. Momentum shift`;
    }
    else {
      reasoning = `Price ${position.above ? 'above' : 'below'} VWAP by ${position.distanceFromVWAP.toFixed(1)}%. No clear signal`;
    }

    return {
      action,
      confidence,
      strength,
      reasoning,
      metadata: {
        vwap,
        upperBand: bands.upper,
        lowerBand: bands.lower,
        distanceFromVWAP: position.distanceFromVWAP,
        volumeRatio: volumeTrend.ratio,
      },
    };
  }

  private calculateVWAP(prices: number[], volumes: number[]): number {
    let cumulativePriceVolume = 0;
    let cumulativeVolume = 0;

    for (let i = 0; i < Math.min(prices.length, volumes.length); i++) {
      const typicalPrice = prices[i]; // Simplified (normally would use (high+low+close)/3)
      cumulativePriceVolume += typicalPrice * volumes[i];
      cumulativeVolume += volumes[i];
    }

    return cumulativePriceVolume / cumulativeVolume;
  }

  private calculateVWAPBands(prices: number[], volumes: number[], vwap: number) {
    // Calculate standard deviation from VWAP
    let sumSquaredDiff = 0;
    let cumulativeVolume = 0;

    for (let i = 0; i < Math.min(prices.length, volumes.length); i++) {
      const diff = prices[i] - vwap;
      sumSquaredDiff += diff * diff * volumes[i];
      cumulativeVolume += volumes[i];
    }

    const stdDev = Math.sqrt(sumSquaredDiff / cumulativeVolume);

    return {
      upper: vwap + stdDev * 2,
      lower: vwap - stdDev * 2,
    };
  }

  private analyzeVWAPPosition(currentPrice: number, vwap: number, bands: any) {
    const distanceFromVWAP = Math.abs((currentPrice - vwap) / vwap) * 100;
    const above = currentPrice > vwap;

    return {
      above,
      nearVWAP: distanceFromVWAP < 0.5,
      atUpperBand: Math.abs(currentPrice - bands.upper) / bands.upper < 0.01,
      atLowerBand: Math.abs(currentPrice - bands.lower) / bands.lower < 0.01,
      distanceFromVWAP,
      crossingUp: !above && distanceFromVWAP < 0.2, // Was below, now near/above
      crossingDown: above && distanceFromVWAP < 0.2, // Was above, now near/below
    };
  }

  private analyzeVolumeTrend(volumes: number[]) {
    if (volumes.length < 10) {
      return { increasing: false, ratio: 1 };
    }

    const avgVolume = volumes.slice(-10, -1).reduce((a, b) => a + b, 0) / 9;
    const currentVolume = volumes[volumes.length - 1];
    const ratio = currentVolume / avgVolume;

    return {
      increasing: ratio > 1.1,
      ratio,
    };
  }

  protected getMinHistoryLength(): number {
    return 20;
  }
}
