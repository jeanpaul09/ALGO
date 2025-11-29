import { BaseStrategy, StrategyContext, StrategySignal } from './base-strategy';

/**
 * Market Structure Strategy
 * Identifies trend changes through higher highs/lows and lower highs/lows
 */
export class MarketStructure extends BaseStrategy {
  constructor() {
    super(
      'Market Structure',
      'Technical',
      'Detects market structure breaks and trend shifts using price action swing analysis'
    );
  }

  async analyze(currentPrice: number, context: StrategyContext): Promise<StrategySignal> {
    const { priceHistory } = context;

    // Identify swing points
    const swings = this.identifySwings(priceHistory);

    // Determine market structure
    const structure = this.analyzeStructure(swings, currentPrice);

    // Detect structure breaks
    const structureBreak = this.detectStructureBreak(swings, structure, currentPrice);

    // Determine signal
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 50;
    let strength = 0;
    let reasoning = '';

    // Bullish structure break (downtrend to uptrend)
    if (structureBreak.type === 'bullish' && structureBreak.confirmed) {
      action = 'BUY';
      strength = Math.min(95, structureBreak.strength);
      confidence = Math.min(88, 60 + strength * 0.28);
      reasoning = `Bullish market structure break. Price broke above $${structureBreak.level?.toFixed(2)}. Trend reversal from down to up`;
    }
    // Bearish structure break (uptrend to downtrend)
    else if (structureBreak.type === 'bearish' && structureBreak.confirmed) {
      action = 'SELL';
      strength = Math.min(95, structureBreak.strength);
      confidence = Math.min(88, 60 + strength * 0.28);
      reasoning = `Bearish market structure break. Price broke below $${structureBreak.level?.toFixed(2)}. Trend reversal from up to down`;
    }
    // Continuation in uptrend (higher high + higher low)
    else if (structure.trend === 'uptrend' && structure.strength > 60) {
      action = 'BUY';
      strength = Math.min(75, structure.strength);
      confidence = Math.min(75, 55 + strength * 0.25);
      reasoning = `Strong uptrend structure. ${structure.higherHighCount} higher highs, ${structure.higherLowCount} higher lows. Continuation likely`;
    }
    // Continuation in downtrend (lower high + lower low)
    else if (structure.trend === 'downtrend' && structure.strength > 60) {
      action = 'SELL';
      strength = Math.min(75, structure.strength);
      confidence = Math.min(75, 55 + strength * 0.25);
      reasoning = `Strong downtrend structure. ${structure.lowerHighCount} lower highs, ${structure.lowerLowCount} lower lows. Continuation likely`;
    }
    // Weakening uptrend (lower high but higher low)
    else if (
      structure.trend === 'uptrend' &&
      structure.strength < 40 &&
      swings.highs.length >= 2
    ) {
      action = 'SELL';
      strength = Math.min(65, 50);
      confidence = Math.min(68, 55);
      reasoning = `Uptrend weakening. Lower high detected. Potential trend exhaustion`;
    }
    // Weakening downtrend (higher low but lower high)
    else if (
      structure.trend === 'downtrend' &&
      structure.strength < 40 &&
      swings.lows.length >= 2
    ) {
      action = 'BUY';
      strength = Math.min(65, 50);
      confidence = Math.min(68, 55);
      reasoning = `Downtrend weakening. Higher low detected. Potential trend exhaustion`;
    }
    else {
      reasoning = `${structure.trend} structure. Strength: ${structure.strength.toFixed(0)}%. No clear break signal`;
    }

    return {
      action,
      confidence,
      strength,
      reasoning,
      metadata: {
        trend: structure.trend,
        structureStrength: structure.strength,
        higherHighs: structure.higherHighCount,
        higherLows: structure.higherLowCount,
        lowerHighs: structure.lowerHighCount,
        lowerLows: structure.lowerLowCount,
        structureBreak: structureBreak.type,
      },
    };
  }

  private identifySwings(prices: number[]) {
    if (prices.length < 20) {
      return { highs: [], lows: [] };
    }

    const highs: { price: number; index: number }[] = [];
    const lows: { price: number; index: number }[] = [];
    const window = 5;

    for (let i = window; i < prices.length - window; i++) {
      const slice = prices.slice(i - window, i + window + 1);
      const price = prices[i];

      if (price === Math.max(...slice)) {
        highs.push({ price, index: i });
      } else if (price === Math.min(...slice)) {
        lows.push({ price, index: i });
      }
    }

    return {
      highs: highs.slice(-5), // Keep last 5 swing highs
      lows: lows.slice(-5),   // Keep last 5 swing lows
    };
  }

  private analyzeStructure(swings: any, currentPrice: number) {
    const { highs, lows } = swings;

    if (highs.length < 2 || lows.length < 2) {
      return {
        trend: 'ranging' as const,
        strength: 50,
        higherHighCount: 0,
        higherLowCount: 0,
        lowerHighCount: 0,
        lowerLowCount: 0,
      };
    }

    // Count higher highs and higher lows (uptrend)
    let higherHighCount = 0;
    for (let i = 1; i < highs.length; i++) {
      if (highs[i].price > highs[i - 1].price) higherHighCount++;
    }

    let higherLowCount = 0;
    for (let i = 1; i < lows.length; i++) {
      if (lows[i].price > lows[i - 1].price) higherLowCount++;
    }

    // Count lower highs and lower lows (downtrend)
    let lowerHighCount = 0;
    for (let i = 1; i < highs.length; i++) {
      if (highs[i].price < highs[i - 1].price) lowerHighCount++;
    }

    let lowerLowCount = 0;
    for (let i = 1; i < lows.length; i++) {
      if (lows[i].price < lows[i - 1].price) lowerLowCount++;
    }

    // Determine trend
    const uptrendScore = higherHighCount + higherLowCount;
    const downtrendScore = lowerHighCount + lowerLowCount;

    let trend: 'uptrend' | 'downtrend' | 'ranging' = 'ranging';
    let strength = 50;

    if (uptrendScore > downtrendScore && uptrendScore >= 3) {
      trend = 'uptrend';
      strength = Math.min(100, (uptrendScore / (highs.length + lows.length - 2)) * 100);
    } else if (downtrendScore > uptrendScore && downtrendScore >= 3) {
      trend = 'downtrend';
      strength = Math.min(100, (downtrendScore / (highs.length + lows.length - 2)) * 100);
    }

    return {
      trend,
      strength,
      higherHighCount,
      higherLowCount,
      lowerHighCount,
      lowerLowCount,
    };
  }

  private detectStructureBreak(swings: any, structure: any, currentPrice: number) {
    const { highs, lows } = swings;

    if (highs.length < 1 || lows.length < 1) {
      return { type: 'none' as const, confirmed: false, level: null, strength: 0 };
    }

    const lastHigh = highs[highs.length - 1];
    const lastLow = lows[lows.length - 1];

    // Bullish break: downtrend broken by price exceeding previous lower high
    if (structure.trend === 'downtrend' && currentPrice > lastHigh.price) {
      return {
        type: 'bullish' as const,
        confirmed: currentPrice > lastHigh.price * 1.005, // 0.5% above
        level: lastHigh.price,
        strength: 85,
      };
    }

    // Bearish break: uptrend broken by price breaking previous higher low
    if (structure.trend === 'uptrend' && currentPrice < lastLow.price) {
      return {
        type: 'bearish' as const,
        confirmed: currentPrice < lastLow.price * 0.995, // 0.5% below
        level: lastLow.price,
        strength: 85,
      };
    }

    return { type: 'none' as const, confirmed: false, level: null, strength: 0 };
  }

  protected getMinHistoryLength(): number {
    return 50;
  }
}
