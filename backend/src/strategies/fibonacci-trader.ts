import { BaseStrategy, StrategyContext, StrategySignal } from './base-strategy';

/**
 * Fibonacci Trader
 * Uses Fibonacci retracement and extension levels for entries/exits
 */
export class FibonacciTrader extends BaseStrategy {
  constructor() {
    super(
      'Fibonacci Trader',
      'Technical',
      'Identifies key Fibonacci retracement (38.2%, 50%, 61.8%) and extension levels for reversals'
    );
  }

  async analyze(currentPrice: number, context: StrategyContext): Promise<StrategySignal> {
    const { priceHistory } = context;

    // Find swing high and swing low for Fibonacci calculation
    const swing = this.findSwingPoints(priceHistory);

    if (!swing.high || !swing.low) {
      return this.holdSignal('Insufficient price swings for Fibonacci analysis');
    }

    // Calculate Fibonacci levels
    const fibLevels = this.calculateFibonacciLevels(swing.high, swing.low, swing.trend);

    // Determine current position relative to Fib levels
    const position = this.analyzeFibPosition(currentPrice, fibLevels);

    // Check for confluence with other indicators
    const rsi = this.calculateRSI(priceHistory, 14);

    // Determine signal
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 50;
    let strength = 0;
    let reasoning = '';

    // Bullish: Price at 61.8% retracement in uptrend + oversold RSI
    if (
      swing.trend === 'up' &&
      position.nearLevel === 0.618 &&
      position.distance < 0.5 &&
      rsi < 40
    ) {
      action = 'BUY';
      strength = Math.min(90, 70 + (40 - rsi));
      confidence = Math.min(88, 60 + strength * 0.28);
      reasoning = `Golden ratio (61.8%) support at $${fibLevels.fib618.toFixed(2)}. RSI ${rsi.toFixed(1)} oversold. Strong buy zone`;
    }
    // Bullish: Price at 50% retracement in uptrend
    else if (
      swing.trend === 'up' &&
      position.nearLevel === 0.5 &&
      position.distance < 0.5 &&
      rsi < 50
    ) {
      action = 'BUY';
      strength = Math.min(80, 60);
      confidence = Math.min(80, 58 + strength * 0.25);
      reasoning = `50% retracement support at $${fibLevels.fib50.toFixed(2)}. Healthy pullback in uptrend`;
    }
    // Bearish: Price at 61.8% retracement in downtrend + overbought RSI
    else if (
      swing.trend === 'down' &&
      position.nearLevel === 0.618 &&
      position.distance < 0.5 &&
      rsi > 60
    ) {
      action = 'SELL';
      strength = Math.min(90, 70 + (rsi - 60));
      confidence = Math.min(88, 60 + strength * 0.28);
      reasoning = `Golden ratio (61.8%) resistance at $${fibLevels.fib618.toFixed(2)}. RSI ${rsi.toFixed(1)} overbought. Strong sell zone`;
    }
    // Bearish: Price at 50% retracement in downtrend
    else if (
      swing.trend === 'down' &&
      position.nearLevel === 0.5 &&
      position.distance < 0.5 &&
      rsi > 50
    ) {
      action = 'SELL';
      strength = Math.min(80, 60);
      confidence = Math.min(80, 58 + strength * 0.25);
      reasoning = `50% retracement resistance at $${fibLevels.fib50.toFixed(2)}. Bounce in downtrend`;
    }
    // Extension level (1.618) - take profit signal
    else if (position.nearLevel === 1.618 && position.distance < 1) {
      action = swing.trend === 'up' ? 'SELL' : 'BUY';
      strength = Math.min(70, 55);
      confidence = Math.min(75, 60);
      reasoning = `Price at 1.618 extension level $${fibLevels.ext618.toFixed(2)}. Potential exhaustion zone`;
    }
    // 38.2% level - weaker signal
    else if (
      position.nearLevel === 0.382 &&
      position.distance < 0.5
    ) {
      action = swing.trend === 'up' ? 'BUY' : 'SELL';
      strength = Math.min(65, 45);
      confidence = Math.min(70, 55);
      reasoning = `Price at 38.2% Fib level $${fibLevels.fib382.toFixed(2)}. Shallow retracement zone`;
    }
    else {
      const nearestFib = position.nearestFibLevel;
      reasoning = `No Fib confluence. Current trend: ${swing.trend}, nearest Fib: $${nearestFib.toFixed(2)}`;
    }

    return {
      action,
      confidence,
      strength,
      reasoning,
      metadata: {
        swingHigh: swing.high,
        swingLow: swing.low,
        trend: swing.trend,
        fibonacciLevels: fibLevels,
        nearestFibLevel: position.nearLevel,
        distanceToFib: position.distance,
        rsi,
      },
    };
  }

  private findSwingPoints(prices: number[]) {
    if (prices.length < 30) {
      return { high: null, low: null, trend: 'none' as const };
    }

    // Find significant swing high and low in recent price action
    const recentPrices = prices.slice(-50);
    const high = Math.max(...recentPrices);
    const low = Math.min(...recentPrices);

    // Determine trend based on recent price action
    const currentPrice = prices[prices.length - 1];
    const midpoint = (high + low) / 2;

    let trend: 'up' | 'down' | 'none' = 'none';

    if (currentPrice > midpoint && currentPrice < high * 0.95) {
      trend = 'up'; // Retracement in uptrend
    } else if (currentPrice < midpoint && currentPrice > low * 1.05) {
      trend = 'down'; // Retracement in downtrend
    }

    return { high, low, trend };
  }

  private calculateFibonacciLevels(high: number, low: number, trend: 'up' | 'down' | 'none') {
    const diff = high - low;

    if (trend === 'up') {
      // Retracement levels from high
      return {
        fib0: high,
        fib236: high - diff * 0.236,
        fib382: high - diff * 0.382,
        fib50: high - diff * 0.5,
        fib618: high - diff * 0.618,
        fib786: high - diff * 0.786,
        fib100: low,
        ext618: high + diff * 0.618,
        ext1000: high + diff,
      };
    } else {
      // Retracement levels from low (in downtrend)
      return {
        fib0: low,
        fib236: low + diff * 0.236,
        fib382: low + diff * 0.382,
        fib50: low + diff * 0.5,
        fib618: low + diff * 0.618,
        fib786: low + diff * 0.786,
        fib100: high,
        ext618: low - diff * 0.618,
        ext1000: low - diff,
      };
    }
  }

  private analyzeFibPosition(currentPrice: number, fibLevels: any) {
    const levels = [
      { ratio: 0, price: fibLevels.fib0 },
      { ratio: 0.236, price: fibLevels.fib236 },
      { ratio: 0.382, price: fibLevels.fib382 },
      { ratio: 0.5, price: fibLevels.fib50 },
      { ratio: 0.618, price: fibLevels.fib618 },
      { ratio: 0.786, price: fibLevels.fib786 },
      { ratio: 1, price: fibLevels.fib100 },
      { ratio: 1.618, price: fibLevels.ext618 },
    ];

    // Find nearest Fibonacci level
    let nearestLevel = levels[0];
    let minDistance = Math.abs(currentPrice - levels[0].price) / levels[0].price * 100;

    levels.forEach(level => {
      const distance = Math.abs(currentPrice - level.price) / level.price * 100;
      if (distance < minDistance) {
        minDistance = distance;
        nearestLevel = level;
      }
    });

    return {
      nearLevel: nearestLevel.ratio,
      nearestFibLevel: nearestLevel.price,
      distance: minDistance,
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
    return 50;
  }
}
