import { BaseStrategy, StrategyContext, StrategySignal } from './base-strategy';

/**
 * Liquidation Hunter
 * Detects potential liquidation cascades and stop-loss clusters
 */
export class LiquidationHunter extends BaseStrategy {
  constructor() {
    super(
      'Liquidation Hunter',
      'Institutional',
      'Identifies liquidation zones and exploits cascade opportunities for counter-trend entries'
    );
  }

  async analyze(currentPrice: number, context: StrategyContext): Promise<StrategySignal> {
    const { priceHistory, volumeHistory } = context;

    // Calculate volatility and recent price action
    const volatility = this.calculateVolatility(priceHistory, 20);
    const rapidMove = this.detectRapidMove(priceHistory, 10);

    // Identify potential liquidation levels (round numbers, recent highs/lows)
    const liquidationZones = this.findLiquidationZones(priceHistory, currentPrice);

    // Volume analysis - liquidations cause volume spikes
    const volumeSpike = volumeHistory && volumeHistory.length >= 10
      ? this.detectVolumeSpike(volumeHistory)
      : { isSpike: false, ratio: 1 };

    // Determine signal
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 50;
    let strength = 0;
    let reasoning = '';

    // Bearish liquidation cascade (long squeeze) - counter-trend buy
    if (
      rapidMove.direction === 'down' &&
      rapidMove.magnitude > 2 &&
      volumeSpike.isSpike &&
      liquidationZones.nearSupport
    ) {
      action = 'BUY';
      strength = Math.min(100, rapidMove.magnitude * 15 + volumeSpike.ratio * 20 + liquidationZones.supportStrength);
      confidence = Math.min(85, 55 + strength * 0.28);
      reasoning = `Long liquidation cascade detected. ${rapidMove.magnitude.toFixed(1)}% drop, volume ${(volumeSpike.ratio * 100).toFixed(0)}% spike. Counter-trend buy at support $${liquidationZones.supportLevel?.toFixed(2)}`;
    }
    // Bullish liquidation cascade (short squeeze) - counter-trend sell
    else if (
      rapidMove.direction === 'up' &&
      rapidMove.magnitude > 2 &&
      volumeSpike.isSpike &&
      liquidationZones.nearResistance
    ) {
      action = 'SELL';
      strength = Math.min(100, rapidMove.magnitude * 15 + volumeSpike.ratio * 20 + liquidationZones.resistanceStrength);
      confidence = Math.min(85, 55 + strength * 0.28);
      reasoning = `Short liquidation cascade detected. ${rapidMove.magnitude.toFixed(1)}% pump, volume ${(volumeSpike.ratio * 100).toFixed(0)}% spike. Counter-trend sell at resistance $${liquidationZones.resistanceLevel?.toFixed(2)}`;
    }
    // Approaching liquidation zone - preemptive positioning
    else if (liquidationZones.approachingSupport && volatility > 1.5) {
      action = 'BUY';
      strength = Math.min(70, liquidationZones.supportStrength + volatility * 15);
      confidence = Math.min(70, 50 + strength * 0.25);
      reasoning = `Approaching major liquidation zone at $${liquidationZones.supportLevel?.toFixed(2)}. High volatility (${volatility.toFixed(1)}%) increases cascade risk`;
    }
    else if (liquidationZones.approachingResistance && volatility > 1.5) {
      action = 'SELL';
      strength = Math.min(70, liquidationZones.resistanceStrength + volatility * 15);
      confidence = Math.min(70, 50 + strength * 0.25);
      reasoning = `Approaching major liquidation zone at $${liquidationZones.resistanceLevel?.toFixed(2)}. High volatility (${volatility.toFixed(1)}%) increases cascade risk`;
    }
    else {
      reasoning = `No liquidation setup. Recent move: ${rapidMove.direction} ${rapidMove.magnitude.toFixed(2)}%, volatility: ${volatility.toFixed(1)}%`;
    }

    return {
      action,
      confidence,
      strength,
      reasoning,
      metadata: {
        volatility,
        rapidMoveDirection: rapidMove.direction,
        rapidMoveMagnitude: rapidMove.magnitude,
        volumeSpikeRatio: volumeSpike.ratio,
        liquidationZones,
      },
    };
  }

  private detectRapidMove(prices: number[], period: number) {
    if (prices.length < period) {
      return { direction: 'none' as const, magnitude: 0 };
    }

    const oldPrice = prices[prices.length - period];
    const newPrice = prices[prices.length - 1];
    const change = ((newPrice - oldPrice) / oldPrice) * 100;

    return {
      direction: change > 0 ? 'up' as const : change < 0 ? 'down' as const : 'none' as const,
      magnitude: Math.abs(change),
    };
  }

  private detectVolumeSpike(volumes: number[]) {
    if (volumes.length < 10) {
      return { isSpike: false, ratio: 1 };
    }

    const avgVolume = volumes.slice(-10, -1).reduce((a, b) => a + b, 0) / 9;
    const currentVolume = volumes[volumes.length - 1];
    const ratio = currentVolume / avgVolume;

    return {
      isSpike: ratio > 2,
      ratio,
    };
  }

  private findLiquidationZones(prices: number[], currentPrice: number) {
    if (prices.length < 50) {
      return {
        nearSupport: false,
        nearResistance: false,
        approachingSupport: false,
        approachingResistance: false,
        supportLevel: null,
        resistanceLevel: null,
        supportStrength: 0,
        resistanceStrength: 0,
      };
    }

    // Find recent high and low (potential liquidation zones)
    const recentHigh = Math.max(...prices.slice(-50));
    const recentLow = Math.min(...prices.slice(-50));

    // Round numbers are common liquidation zones
    const roundedPrice = Math.round(currentPrice / 100) * 100;

    // Calculate proximity to zones
    const distanceToLow = Math.abs(currentPrice - recentLow) / recentLow;
    const distanceToHigh = Math.abs(currentPrice - recentHigh) / recentHigh;

    return {
      nearSupport: distanceToLow < 0.005, // Within 0.5% of support
      nearResistance: distanceToHigh < 0.005, // Within 0.5% of resistance
      approachingSupport: distanceToLow < 0.02 && currentPrice < recentLow * 1.01,
      approachingResistance: distanceToHigh < 0.02 && currentPrice > recentHigh * 0.99,
      supportLevel: recentLow,
      resistanceLevel: recentHigh,
      supportStrength: 75,
      resistanceStrength: 75,
    };
  }

  private calculateVolatility(prices: number[], period: number): number {
    if (prices.length < period) return 1;

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

  protected getMinHistoryLength(): number {
    return 50;
  }
}
