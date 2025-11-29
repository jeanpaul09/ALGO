import { BaseStrategy, StrategyContext, StrategySignal } from './base-strategy';

/**
 * Breakout Scanner
 * Detects support/resistance level breaks with volume confirmation
 */
export class BreakoutScanner extends BaseStrategy {
  constructor() {
    super(
      'Breakout Scanner',
      'Technical',
      'Identifies key support/resistance breaks with volume and momentum confirmation'
    );
  }

  async analyze(currentPrice: number, context: StrategyContext): Promise<StrategySignal> {
    const { priceHistory, volumeHistory } = context;

    // Find key levels
    const levels = this.identifyKeyLevels(priceHistory);

    // Check for recent break
    const breakout = this.detectBreakout(priceHistory, levels, currentPrice);

    // Volume confirmation
    const volumeConfirmation = volumeHistory && volumeHistory.length >= 10
      ? this.hasVolumeConfirmation(volumeHistory)
      : false;

    // Momentum after break
    const momentum = this.calculateMomentum(priceHistory, 5);

    // Determine signal
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 50;
    let strength = 0;
    let reasoning = '';

    // Resistance breakout with volume
    if (
      breakout.type === 'resistance' &&
      breakout.confirmed &&
      volumeConfirmation &&
      momentum > 0
    ) {
      action = 'BUY';
      strength = Math.min(95, breakout.strength + 30);
      confidence = Math.min(90, 60 + strength * 0.3);
      reasoning = `Resistance breakout at $${breakout.level?.toFixed(2)}. ${breakout.testCount}x tested, strong volume, momentum ${momentum.toFixed(1)}%`;
    }
    // Support breakdown with volume
    else if (
      breakout.type === 'support' &&
      breakout.confirmed &&
      volumeConfirmation &&
      momentum < 0
    ) {
      action = 'SELL';
      strength = Math.min(95, breakout.strength + 30);
      confidence = Math.min(90, 60 + strength * 0.3);
      reasoning = `Support breakdown at $${breakout.level?.toFixed(2)}. ${breakout.testCount}x tested, strong volume, momentum ${Math.abs(momentum).toFixed(1)}%`;
    }
    // False breakout reversal (breakout without volume)
    else if (
      breakout.type === 'resistance' &&
      !breakout.confirmed &&
      !volumeConfirmation &&
      breakout.distanceFromLevel < 1
    ) {
      action = 'SELL';
      strength = Math.min(70, 50);
      confidence = Math.min(70, 55);
      reasoning = `Likely false breakout at $${breakout.level?.toFixed(2)}. No volume confirmation. Expect rejection`;
    }
    else if (
      breakout.type === 'support' &&
      !breakout.confirmed &&
      !volumeConfirmation &&
      breakout.distanceFromLevel < 1
    ) {
      action = 'BUY';
      strength = Math.min(70, 50);
      confidence = Math.min(70, 55);
      reasoning = `Likely false breakdown at $${breakout.level?.toFixed(2)}. No volume confirmation. Expect bounce`;
    }
    // Approaching key resistance
    else if (levels.nearestResistance && levels.distanceToResistance < 1 && momentum > 0) {
      action = 'SELL';
      strength = Math.min(60, 45);
      confidence = Math.min(65, 52);
      reasoning = `Approaching resistance at $${levels.nearestResistance.toFixed(2)} (${levels.distanceToResistance.toFixed(1)}% away). Consider taking profits`;
    }
    // Approaching key support
    else if (levels.nearestSupport && levels.distanceToSupport < 1 && momentum < 0) {
      action = 'BUY';
      strength = Math.min(60, 45);
      confidence = Math.min(65, 52);
      reasoning = `Approaching support at $${levels.nearestSupport.toFixed(2)} (${levels.distanceToSupport.toFixed(1)}% away). Potential bounce`;
    }
    else {
      reasoning = `No breakout setup. Nearest support: $${levels.nearestSupport?.toFixed(2)}, resistance: $${levels.nearestResistance?.toFixed(2)}`;
    }

    return {
      action,
      confidence,
      strength,
      reasoning,
      metadata: {
        breakoutType: breakout.type,
        breakoutLevel: breakout.level,
        volumeConfirmation,
        momentum,
        supportLevels: levels.supports,
        resistanceLevels: levels.resistances,
      },
    };
  }

  private identifyKeyLevels(prices: number[]) {
    if (prices.length < 50) {
      return {
        supports: [],
        resistances: [],
        nearestSupport: null,
        nearestResistance: null,
        distanceToSupport: 100,
        distanceToResistance: 100,
      };
    }

    const currentPrice = prices[prices.length - 1];
    const window = 10;
    const supports: number[] = [];
    const resistances: number[] = [];

    // Find local minima (supports) and maxima (resistances)
    for (let i = window; i < prices.length - window; i++) {
      const slice = prices.slice(i - window, i + window + 1);
      const price = prices[i];

      if (price === Math.min(...slice)) {
        supports.push(price);
      } else if (price === Math.max(...slice)) {
        resistances.push(price);
      }
    }

    // Find nearest levels
    const nearestSupport = supports
      .filter(s => s < currentPrice)
      .sort((a, b) => b - a)[0] || null;

    const nearestResistance = resistances
      .filter(r => r > currentPrice)
      .sort((a, b) => a - b)[0] || null;

    return {
      supports,
      resistances,
      nearestSupport,
      nearestResistance,
      distanceToSupport: nearestSupport ? Math.abs((currentPrice - nearestSupport) / nearestSupport) * 100 : 100,
      distanceToResistance: nearestResistance ? Math.abs((currentPrice - nearestResistance) / nearestResistance) * 100 : 100,
    };
  }

  private detectBreakout(prices: number[], levels: any, currentPrice: number) {
    const recentPrices = prices.slice(-10);
    const previousPrice = prices[prices.length - 2];

    // Check resistance break
    if (levels.nearestResistance && previousPrice < levels.nearestResistance && currentPrice > levels.nearestResistance) {
      const testCount = prices.filter(p => Math.abs(p - levels.nearestResistance) / levels.nearestResistance < 0.01).length;
      return {
        type: 'resistance' as const,
        level: levels.nearestResistance,
        confirmed: currentPrice > levels.nearestResistance * 1.005, // 0.5% above
        testCount,
        strength: Math.min(80, testCount * 15),
        distanceFromLevel: ((currentPrice - levels.nearestResistance) / levels.nearestResistance) * 100,
      };
    }

    // Check support break
    if (levels.nearestSupport && previousPrice > levels.nearestSupport && currentPrice < levels.nearestSupport) {
      const testCount = prices.filter(p => Math.abs(p - levels.nearestSupport) / levels.nearestSupport < 0.01).length;
      return {
        type: 'support' as const,
        level: levels.nearestSupport,
        confirmed: currentPrice < levels.nearestSupport * 0.995, // 0.5% below
        testCount,
        strength: Math.min(80, testCount * 15),
        distanceFromLevel: ((levels.nearestSupport - currentPrice) / levels.nearestSupport) * 100,
      };
    }

    return {
      type: 'none' as const,
      level: null,
      confirmed: false,
      testCount: 0,
      strength: 0,
      distanceFromLevel: 0,
    };
  }

  private hasVolumeConfirmation(volumes: number[]): boolean {
    if (volumes.length < 10) return false;

    const avgVolume = volumes.slice(-10, -1).reduce((a, b) => a + b, 0) / 9;
    const currentVolume = volumes[volumes.length - 1];

    return currentVolume > avgVolume * 1.3; // 30% above average
  }

  private calculateMomentum(prices: number[], period: number): number {
    if (prices.length < period) return 0;
    const oldPrice = prices[prices.length - period];
    const newPrice = prices[prices.length - 1];
    return ((newPrice - oldPrice) / oldPrice) * 100;
  }

  protected getMinHistoryLength(): number {
    return 50;
  }
}
