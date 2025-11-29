import { BaseStrategy, StrategyContext, StrategySignal } from './base-strategy';

/**
 * Delta Volume Analysis
 * Analyzes buy vs sell pressure through volume delta
 */
export class DeltaVolume extends BaseStrategy {
  constructor() {
    super(
      'Delta Volume',
      'Institutional',
      'Measures buying vs selling pressure through cumulative volume delta analysis'
    );
  }

  async analyze(currentPrice: number, context: StrategyContext): Promise<StrategySignal} {
    const { priceHistory, volumeHistory, trades } = context;

    if (!volumeHistory || volumeHistory.length < 20) {
      return this.holdSignal('Insufficient volume data for delta analysis');
    }

    // Calculate volume delta (buy volume - sell volume)
    const delta = this.calculateVolumeDelta(priceHistory, volumeHistory, trades);

    // Calculate cumulative delta
    const cumulativeDelta = this.calculateCumulativeDelta(delta.deltas);

    // Detect delta divergence
    const divergence = this.detectDeltaDivergence(priceHistory, cumulativeDelta.values);

    // Analyze delta momentum
    const momentum = this.analyzeDeltaMomentum(delta.deltas);

    // Determine signal
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 50;
    let strength = 0;
    let reasoning = '';

    // Strong positive delta with price confirmation
    if (
      delta.current > 0 &&
      delta.ratio > 2 &&
      momentum.increasing &&
      cumulativeDelta.trend === 'up'
    ) {
      action = 'BUY';
      strength = Math.min(92, delta.ratio * 30 + momentum.strength * 20);
      confidence = Math.min(88, 60 + strength * 0.28);
      reasoning = `Strong buy pressure. Delta ${(delta.ratio * 100).toFixed(0)}% buy-weighted. Cumulative delta trending up. Institutional accumulation`;
    }
    // Strong negative delta with price confirmation
    else if (
      delta.current < 0 &&
      delta.ratio < -2 &&
      momentum.decreasing &&
      cumulativeDelta.trend === 'down'
    ) {
      action = 'SELL';
      strength = Math.min(92, Math.abs(delta.ratio) * 30 + momentum.strength * 20);
      confidence = Math.min(88, 60 + strength * 0.28);
      reasoning = `Strong sell pressure. Delta ${Math.abs(delta.ratio * 100).toFixed(0)}% sell-weighted. Cumulative delta trending down. Institutional distribution`;
    }
    // Bullish delta divergence (price down, delta up)
    else if (
      divergence.type === 'bullish' &&
      delta.current > 0
    ) {
      action = 'BUY';
      strength = Math.min(85, divergence.strength + 20);
      confidence = Math.min(82, 58 + strength * 0.24);
      reasoning = `Bullish delta divergence. Price declining but buying pressure increasing. Accumulation at lower prices. Smart money long`;
    }
    // Bearish delta divergence (price up, delta down)
    else if (
      divergence.type === 'bearish' &&
      delta.current < 0
    ) {
      action = 'SELL';
      strength = Math.min(85, divergence.strength + 20);
      confidence = Math.min(82, 58 + strength * 0.24);
      reasoning = `Bearish delta divergence. Price rising but selling pressure increasing. Distribution at higher prices. Smart money short`;
    }
    // Moderate positive delta
    else if (
      delta.ratio > 1.3 &&
      cumulativeDelta.trend !== 'down'
    ) {
      action = 'BUY';
      strength = Math.min(70, delta.ratio * 25);
      confidence = Math.min(72, 56 + strength * 0.22);
      reasoning = `Moderate buy pressure. Delta ${(delta.ratio * 100).toFixed(0)}% buy-weighted. Positive momentum`;
    }
    // Moderate negative delta
    else if (
      delta.ratio < -1.3 &&
      cumulativeDelta.trend !== 'up'
    ) {
      action = 'SELL';
      strength = Math.min(70, Math.abs(delta.ratio) * 25);
      confidence = Math.min(72, 56 + strength * 0.22);
      reasoning = `Moderate sell pressure. Delta ${Math.abs(delta.ratio * 100).toFixed(0)}% sell-weighted. Negative momentum`;
    }
    // Delta exhaustion (extreme delta but price not moving)
    else if (
      Math.abs(delta.ratio) > 3 &&
      momentum.strength < 30
    ) {
      action = delta.ratio > 0 ? 'SELL' : 'BUY';
      strength = Math.min(65, 50);
      confidence = Math.min(68, 55);
      reasoning = `Delta exhaustion. Extreme ${delta.ratio > 0 ? 'buy' : 'sell'} pressure but price stalling. Potential reversal`;
    }
    else {
      reasoning = `Current delta: ${delta.current.toFixed(0)}, Ratio: ${delta.ratio.toFixed(2)}, Cumulative delta: ${cumulativeDelta.trend}`;
    }

    return {
      action,
      confidence,
      strength,
      reasoning,
      metadata: {
        volumeDelta: delta.current,
        deltaRatio: delta.ratio,
        cumulativeDelta: cumulativeDelta.current,
        cumulativeTrend: cumulativeDelta.trend,
        deltaSmaMomentum: momentum.increasing ? 'increasing' : 'decreasing',
        divergenceType: divergence.type,
      },
    };
  }

  private calculateVolumeDelta(
    prices: number[],
    volumes: number[],
    trades?: any[]
  ): {
    current: number;
    ratio: number;
    deltas: number[];
  } {
    const deltas: number[] = [];

    // If we have trade data, use actual buy/sell classification
    if (trades && trades.length > 0) {
      // Use actual trade data (would come from exchange)
      const buyVolume = trades.filter(t => t.side === 'buy').reduce((sum, t) => sum + t.volume, 0);
      const sellVolume = trades.filter(t => t.side === 'sell').reduce((sum, t) => sum + t.volume, 0);

      return {
        current: buyVolume - sellVolume,
        ratio: buyVolume / sellVolume,
        deltas: [buyVolume - sellVolume],
      };
    }

    // Otherwise, estimate from price action and volume
    for (let i = 1; i < Math.min(prices.length, volumes.length); i++) {
      const priceChange = prices[i] - prices[i - 1];
      const volume = volumes[i];

      // Positive price change = buy pressure
      // Negative price change = sell pressure
      if (priceChange > 0) {
        deltas.push(volume); // Buy volume
      } else if (priceChange < 0) {
        deltas.push(-volume); // Sell volume
      } else {
        deltas.push(0); // Neutral
      }
    }

    const recentDeltas = deltas.slice(-20);
    const current = recentDeltas[recentDeltas.length - 1] || 0;

    const buyVolume = recentDeltas.filter(d => d > 0).reduce((sum, d) => sum + d, 0);
    const sellVolume = Math.abs(recentDeltas.filter(d => d < 0).reduce((sum, d) => sum + d, 0));

    const ratio = sellVolume > 0 ? buyVolume / sellVolume : buyVolume > 0 ? 10 : 1;

    return {
      current,
      ratio: buyVolume > sellVolume ? ratio : -ratio,
      deltas,
    };
  }

  private calculateCumulativeDelta(deltas: number[]): {
    current: number;
    trend: 'up' | 'down' | 'neutral';
    values: number[];
  } {
    const cumulativeValues: number[] = [];
    let cumulative = 0;

    deltas.forEach(delta => {
      cumulative += delta;
      cumulativeValues.push(cumulative);
    });

    const current = cumulative;

    // Determine trend
    const recent = cumulativeValues.slice(-20);
    const slope = recent.length > 1
      ? (recent[recent.length - 1] - recent[0]) / recent.length
      : 0;

    let trend: 'up' | 'down' | 'neutral' = 'neutral';
    if (slope > cumulative * 0.05) trend = 'up';
    else if (slope < -cumulative * 0.05) trend = 'down';

    return {
      current,
      trend,
      values: cumulativeValues,
    };
  }

  private detectDeltaDivergence(prices: number[], cumulativeDeltas: number[]): {
    type: 'bullish' | 'bearish' | 'none';
    strength: number;
  } {
    const minLength = Math.min(prices.length, cumulativeDeltas.length);
    if (minLength < 20) {
      return { type: 'none', strength: 0 };
    }

    const recentPrices = prices.slice(-20);
    const recentDeltas = cumulativeDeltas.slice(-20);

    const priceChange = recentPrices[recentPrices.length - 1] - recentPrices[0];
    const deltaChange = recentDeltas[recentDeltas.length - 1] - recentDeltas[0];

    // Bullish: Price down, delta up
    if (priceChange < 0 && deltaChange > 0) {
      return {
        type: 'bullish',
        strength: Math.min(100, (Math.abs(priceChange) + deltaChange) / 2),
      };
    }

    // Bearish: Price up, delta down
    if (priceChange > 0 && deltaChange < 0) {
      return {
        type: 'bearish',
        strength: Math.min(100, (priceChange + Math.abs(deltaChange)) / 2),
      };
    }

    return { type: 'none', strength: 0 };
  }

  private analyzeDeltaMomentum(deltas: number[]): {
    increasing: boolean;
    decreasing: boolean;
    strength: number;
  } {
    if (deltas.length < 20) {
      return { increasing: false, decreasing: false, strength: 0 };
    }

    const recent = deltas.slice(-10);
    const previous = deltas.slice(-20, -10);

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;

    const change = recentAvg - previousAvg;
    const strength = Math.abs(change);

    return {
      increasing: change > 0 && strength > 10,
      decreasing: change < 0 && strength > 10,
      strength: Math.min(100, strength / 2),
    };
  }

  protected getMinHistoryLength(): number {
    return 30;
  }
}
