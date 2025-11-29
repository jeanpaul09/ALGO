import { BaseStrategy, StrategyContext, StrategySignal } from './base-strategy';

/**
 * Divergence Scanner
 * Detects bullish/bearish divergences between price and indicators (RSI, MACD)
 */
export class DivergenceScanner extends BaseStrategy {
  constructor() {
    super(
      'Divergence Scanner',
      'Technical',
      'Identifies bullish and bearish divergences between price action and momentum indicators'
    );
  }

  async analyze(currentPrice: number, context: StrategyContext): Promise<StrategySignal> {
    const { priceHistory } = context;

    // Calculate indicators
    const rsi = this.calculateRSIHistory(priceHistory, 14);
    const macd = this.calculateMACDHistory(priceHistory);

    // Find price swings
    const priceSwings = this.findSwings(priceHistory);

    // Detect divergences
    const rsiDivergence = this.detectDivergence(priceSwings, rsi, 'RSI');
    const macdDivergence = this.detectDivergence(priceSwings, macd, 'MACD');

    // Determine signal
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 50;
    let strength = 0;
    let reasoning = '';

    // Strong bullish divergence (both RSI and MACD)
    if (rsiDivergence.type === 'bullish' && macdDivergence.type === 'bullish') {
      action = 'BUY';
      strength = Math.min(95, rsiDivergence.strength + macdDivergence.strength);
      confidence = Math.min(90, 62 + strength * 0.28);
      reasoning = `Strong bullish divergence detected on both RSI and MACD. Price making lower lows while indicators making higher lows. Reversal imminent`;
    }
    // Strong bearish divergence (both RSI and MACD)
    else if (rsiDivergence.type === 'bearish' && macdDivergence.type === 'bearish') {
      action = 'SELL';
      strength = Math.min(95, rsiDivergence.strength + macdDivergence.strength);
      confidence = Math.min(90, 62 + strength * 0.28);
      reasoning = `Strong bearish divergence detected on both RSI and MACD. Price making higher highs while indicators making lower highs. Reversal imminent`;
    }
    // RSI bullish divergence only
    else if (rsiDivergence.type === 'bullish' && rsiDivergence.strength > 60) {
      action = 'BUY';
      strength = Math.min(80, rsiDivergence.strength);
      confidence = Math.min(78, 58 + strength * 0.25);
      reasoning = `Bullish RSI divergence. Price: ${rsiDivergence.pricePattern}, RSI: ${rsiDivergence.indicatorPattern}. Momentum shifting up`;
    }
    // RSI bearish divergence only
    else if (rsiDivergence.type === 'bearish' && rsiDivergence.strength > 60) {
      action = 'SELL';
      strength = Math.min(80, rsiDivergence.strength);
      confidence = Math.min(78, 58 + strength * 0.25);
      reasoning = `Bearish RSI divergence. Price: ${rsiDivergence.pricePattern}, RSI: ${rsiDivergence.indicatorPattern}. Momentum shifting down`;
    }
    // MACD bullish divergence only
    else if (macdDivergence.type === 'bullish' && macdDivergence.strength > 60) {
      action = 'BUY';
      strength = Math.min(80, macdDivergence.strength);
      confidence = Math.min(78, 58 + strength * 0.25);
      reasoning = `Bullish MACD divergence. Price: ${macdDivergence.pricePattern}, MACD: ${macdDivergence.indicatorPattern}. Trend exhaustion`;
    }
    // MACD bearish divergence only
    else if (macdDivergence.type === 'bearish' && macdDivergence.strength > 60) {
      action = 'SELL';
      strength = Math.min(80, macdDivergence.strength);
      confidence = Math.min(78, 58 + strength * 0.25);
      reasoning = `Bearish MACD divergence. Price: ${macdDivergence.pricePattern}, MACD: ${macdDivergence.indicatorPattern}. Trend exhaustion`;
    }
    // Hidden bullish divergence (trend continuation)
    else if (rsiDivergence.type === 'hidden_bullish') {
      action = 'BUY';
      strength = Math.min(70, 55);
      confidence = Math.min(72, 58);
      reasoning = `Hidden bullish divergence. Uptrend continuation signal. Price higher lows, RSI lower lows`;
    }
    // Hidden bearish divergence (trend continuation)
    else if (rsiDivergence.type === 'hidden_bearish') {
      action = 'SELL';
      strength = Math.min(70, 55);
      confidence = Math.min(72, 58);
      reasoning = `Hidden bearish divergence. Downtrend continuation signal. Price lower highs, RSI higher highs`;
    }
    else {
      reasoning = `No significant divergence detected. RSI: ${rsiDivergence.type}, MACD: ${macdDivergence.type}`;
    }

    return {
      action,
      confidence,
      strength,
      reasoning,
      metadata: {
        rsiDivergence: rsiDivergence.type,
        macdDivergence: macdDivergence.type,
        rsiStrength: rsiDivergence.strength,
        macdStrength: macdDivergence.strength,
      },
    };
  }

  private findSwings(data: number[]) {
    if (data.length < 10) return { highs: [], lows: [] };

    const highs: { value: number; index: number }[] = [];
    const lows: { value: number; index: number }[] = [];
    const window = 5;

    for (let i = window; i < data.length - window; i++) {
      const slice = data.slice(i - window, i + window + 1);
      const value = data[i];

      if (value === Math.max(...slice)) {
        highs.push({ value, index: i });
      } else if (value === Math.min(...slice)) {
        lows.push({ value, index: i });
      }
    }

    return { highs: highs.slice(-3), lows: lows.slice(-3) };
  }

  private detectDivergence(priceSwings: any, indicatorHistory: number[], name: string) {
    const indicatorSwings = this.findSwings(indicatorHistory);

    if (priceSwings.lows.length < 2 || indicatorSwings.lows.length < 2) {
      return {
        type: 'none' as const,
        strength: 0,
        pricePattern: 'insufficient data',
        indicatorPattern: 'insufficient data',
      };
    }

    // Regular bullish divergence: price lower low, indicator higher low
    const lastPriceLow = priceSwings.lows[priceSwings.lows.length - 1];
    const prevPriceLow = priceSwings.lows[priceSwings.lows.length - 2];

    const lastIndicatorLow = indicatorSwings.lows[indicatorSwings.lows.length - 1];
    const prevIndicatorLow = indicatorSwings.lows[indicatorSwings.lows.length - 2];

    if (
      lastPriceLow.value < prevPriceLow.value &&
      lastIndicatorLow.value > prevIndicatorLow.value
    ) {
      const priceDiff = ((prevPriceLow.value - lastPriceLow.value) / prevPriceLow.value) * 100;
      const indicatorDiff = ((lastIndicatorLow.value - prevIndicatorLow.value) / prevIndicatorLow.value) * 100;

      return {
        type: 'bullish' as const,
        strength: Math.min(100, (priceDiff + indicatorDiff) * 10),
        pricePattern: 'lower low',
        indicatorPattern: 'higher low',
      };
    }

    // Regular bearish divergence: price higher high, indicator lower high
    if (priceSwings.highs.length < 2 || indicatorSwings.highs.length < 2) {
      return {
        type: 'none' as const,
        strength: 0,
        pricePattern: 'insufficient data',
        indicatorPattern: 'insufficient data',
      };
    }

    const lastPriceHigh = priceSwings.highs[priceSwings.highs.length - 1];
    const prevPriceHigh = priceSwings.highs[priceSwings.highs.length - 2];

    const lastIndicatorHigh = indicatorSwings.highs[indicatorSwings.highs.length - 1];
    const prevIndicatorHigh = indicatorSwings.highs[indicatorSwings.highs.length - 2];

    if (
      lastPriceHigh.value > prevPriceHigh.value &&
      lastIndicatorHigh.value < prevIndicatorHigh.value
    ) {
      const priceDiff = ((lastPriceHigh.value - prevPriceHigh.value) / prevPriceHigh.value) * 100;
      const indicatorDiff = ((prevIndicatorHigh.value - lastIndicatorHigh.value) / prevIndicatorHigh.value) * 100;

      return {
        type: 'bearish' as const,
        strength: Math.min(100, (priceDiff + indicatorDiff) * 10),
        pricePattern: 'higher high',
        indicatorPattern: 'lower high',
      };
    }

    // Hidden bullish divergence: price higher low, indicator lower low (continuation)
    if (
      lastPriceLow.value > prevPriceLow.value &&
      lastIndicatorLow.value < prevIndicatorLow.value
    ) {
      return {
        type: 'hidden_bullish' as const,
        strength: 60,
        pricePattern: 'higher low',
        indicatorPattern: 'lower low',
      };
    }

    // Hidden bearish divergence: price lower high, indicator higher high (continuation)
    if (
      lastPriceHigh.value < prevPriceHigh.value &&
      lastIndicatorHigh.value > prevIndicatorHigh.value
    ) {
      return {
        type: 'hidden_bearish' as const,
        strength: 60,
        pricePattern: 'lower high',
        indicatorPattern: 'higher high',
      };
    }

    return {
      type: 'none' as const,
      strength: 0,
      pricePattern: 'no pattern',
      indicatorPattern: 'no pattern',
    };
  }

  private calculateRSIHistory(prices: number[], period: number): number[] {
    const rsiValues: number[] = [];

    for (let i = period; i < prices.length; i++) {
      const slice = prices.slice(i - period, i + 1);
      const rsi = this.calculateRSI(slice, period);
      rsiValues.push(rsi);
    }

    return rsiValues;
  }

  private calculateRSI(prices: number[], period: number): number {
    if (prices.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i < prices.length; i++) {
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

  private calculateMACDHistory(prices: number[]): number[] {
    const macdValues: number[] = [];

    for (let i = 26; i < prices.length; i++) {
      const slice = prices.slice(0, i + 1);
      const ema12 = this.calculateEMA(slice, 12);
      const ema26 = this.calculateEMA(slice, 26);
      const macd = ema12 - ema26;
      macdValues.push(macd);
    }

    return macdValues;
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];

    const k = 2 / (period + 1);
    const sma = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let ema = sma;

    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * k + ema;
    }

    return ema;
  }

  protected getMinHistoryLength(): number {
    return 50;
  }
}
