import { BaseStrategy, StrategyContext, StrategySignal } from './base-strategy';

/**
 * Correlation Arbitrage
 * Trades based on correlation breakdowns between related assets
 */
export class CorrelationArbitrage extends BaseStrategy {
  constructor() {
    super(
      'Correlation Arbitrage',
      'Statistical',
      'Exploits correlation breakdowns between highly correlated trading pairs'
    );
  }

  async analyze(currentPrice: number, context: StrategyContext): Promise<StrategySignal> {
    const { priceHistory, correlatedAsset } = context;

    if (!correlatedAsset || !correlatedAsset.priceHistory) {
      return this.holdSignal('No correlated asset data available');
    }

    // Calculate correlation
    const correlation = this.calculateCorrelation(
      priceHistory,
      correlatedAsset.priceHistory
    );

    // Calculate spread (z-score of price ratio)
    const spread = this.calculateSpread(
      currentPrice,
      correlatedAsset.currentPrice || correlatedAsset.priceHistory[correlatedAsset.priceHistory.length - 1],
      priceHistory,
      correlatedAsset.priceHistory
    );

    // Detect correlation breakdown
    const breakdown = this.detectCorrelationBreakdown(correlation, spread);

    // Determine signal
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 50;
    let strength = 0;
    let reasoning = '';

    // Mean reversion: Spread extremely wide, correlation still strong
    if (
      correlation.value > 0.7 &&
      spread.zScore > 2 &&
      breakdown.type === 'mean_reversion'
    ) {
      action = 'SELL'; // Sell overperformer
      strength = Math.min(85, spread.zScore * 25 + correlation.value * 30);
      confidence = Math.min(82, 58 + strength * 0.24);
      reasoning = `Strong correlation (${(correlation.value * 100).toFixed(0)}%) with ${spread.zScore.toFixed(1)}σ spread. Overextended vs ${correlatedAsset.symbol}. Mean reversion expected`;
    }
    else if (
      correlation.value > 0.7 &&
      spread.zScore < -2 &&
      breakdown.type === 'mean_reversion'
    ) {
      action = 'BUY'; // Buy underperformer
      strength = Math.min(85, Math.abs(spread.zScore) * 25 + correlation.value * 30);
      confidence = Math.min(82, 58 + strength * 0.24);
      reasoning = `Strong correlation (${(correlation.value * 100).toFixed(0)}%) with ${Math.abs(spread.zScore).toFixed(1)}σ negative spread. Undervalued vs ${correlatedAsset.symbol}. Mean reversion expected`;
    }
    // Correlation breakdown: Previously correlated, now diverging
    else if (
      breakdown.type === 'breakdown' &&
      correlation.recentWeakening &&
      Math.abs(spread.zScore) > 1.5
    ) {
      // Trade in direction of stronger asset
      action = spread.zScore > 0 ? 'BUY' : 'SELL';
      strength = Math.min(75, Math.abs(spread.zScore) * 20);
      confidence = Math.min(72, 55 + strength * 0.22);
      reasoning = `Correlation breakdown. Was ${(correlation.historical * 100).toFixed(0)}%, now ${(correlation.value * 100).toFixed(0)}%. Spread ${spread.zScore.toFixed(1)}σ. Momentum divergence`;
    }
    // Moderate spread with stable correlation
    else if (
      correlation.value > 0.6 &&
      Math.abs(spread.zScore) > 1 &&
      Math.abs(spread.zScore) < 2
    ) {
      action = spread.zScore > 0 ? 'SELL' : 'BUY';
      strength = Math.min(65, Math.abs(spread.zScore) * 18);
      confidence = Math.min(68, 54 + strength * 0.2);
      reasoning = `Moderate spread (${spread.zScore.toFixed(1)}σ) with stable correlation (${(correlation.value * 100).toFixed(0)}%). Partial mean reversion opportunity`;
    }
    // Correlation restored after breakdown
    else if (
      breakdown.type === 'restoration' &&
      Math.abs(spread.zScore) < 0.5
    ) {
      action = 'HOLD';
      reasoning = `Correlation restored to ${(correlation.value * 100).toFixed(0)}%. Spread normalized (${spread.zScore.toFixed(2)}σ). No arbitrage opportunity`;
    }
    else {
      reasoning = `Correlation: ${(correlation.value * 100).toFixed(0)}%, Spread: ${spread.zScore.toFixed(2)}σ. No significant arbitrage signal`;
    }

    return {
      action,
      confidence,
      strength,
      reasoning,
      metadata: {
        correlation: correlation.value,
        correlationTrend: correlation.recentWeakening ? 'weakening' : 'stable',
        spread: spread.currentRatio,
        zScore: spread.zScore,
        correlatedAsset: correlatedAsset.symbol,
      },
    };
  }

  private calculateCorrelation(prices1: number[], prices2: number[]): {
    value: number;
    historical: number;
    recentWeakening: boolean;
  } {
    const minLength = Math.min(prices1.length, prices2.length);
    if (minLength < 30) {
      return { value: 0, historical: 0, recentWeakening: false };
    }

    // Calculate recent correlation (last 30 periods)
    const recent1 = prices1.slice(-30);
    const recent2 = prices2.slice(-30);
    const recentCorr = this.pearsonCorrelation(recent1, recent2);

    // Calculate historical correlation (last 50+ periods)
    const historical1 = prices1.slice(-Math.min(prices1.length, 100));
    const historical2 = prices2.slice(-Math.min(prices2.length, 100));
    const historicalCorr = this.pearsonCorrelation(historical1, historical2);

    return {
      value: recentCorr,
      historical: historicalCorr,
      recentWeakening: historicalCorr - recentCorr > 0.2,
    };
  }

  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;

    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominatorX = 0;
    let denominatorY = 0;

    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      numerator += dx * dy;
      denominatorX += dx * dx;
      denominatorY += dy * dy;
    }

    if (denominatorX === 0 || denominatorY === 0) return 0;

    return numerator / Math.sqrt(denominatorX * denominatorY);
  }

  private calculateSpread(
    price1: number,
    price2: number,
    history1: number[],
    history2: number[]
  ): {
    currentRatio: number;
    zScore: number;
  } {
    const minLength = Math.min(history1.length, history2.length);
    if (minLength < 30) {
      return { currentRatio: price1 / price2, zScore: 0 };
    }

    // Calculate price ratio history
    const ratios: number[] = [];
    for (let i = 0; i < minLength; i++) {
      ratios.push(history1[history1.length - minLength + i] / history2[history2.length - minLength + i]);
    }

    const currentRatio = price1 / price2;

    // Calculate z-score
    const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    const variance = ratios.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / ratios.length;
    const stdDev = Math.sqrt(variance);

    const zScore = stdDev > 0 ? (currentRatio - mean) / stdDev : 0;

    return { currentRatio, zScore };
  }

  private detectCorrelationBreakdown(
    correlation: any,
    spread: any
  ): {
    type: 'mean_reversion' | 'breakdown' | 'restoration' | 'none';
  } {
    // Mean reversion: Strong correlation, extreme spread
    if (correlation.value > 0.7 && Math.abs(spread.zScore) > 2) {
      return { type: 'mean_reversion' };
    }

    // Breakdown: Correlation weakening, spread widening
    if (correlation.recentWeakening && Math.abs(spread.zScore) > 1.5) {
      return { type: 'breakdown' };
    }

    // Restoration: Correlation improving, spread normalizing
    if (
      !correlation.recentWeakening &&
      correlation.value > 0.6 &&
      Math.abs(spread.zScore) < 1
    ) {
      return { type: 'restoration' };
    }

    return { type: 'none' };
  }

  protected getMinHistoryLength(): number {
    return 50;
  }
}
