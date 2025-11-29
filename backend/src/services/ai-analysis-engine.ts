import { MarketDataService } from './market-data';
import { WebSocketManager } from './websocket';

export interface AISignal {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reasoning: string[];
  indicators: {
    name: string;
    value: number;
    signal: 'bullish' | 'bearish' | 'neutral';
  }[];
  zones?: {
    type: 'support' | 'resistance' | 'liquidity';
    price: number;
    strength: number;
  }[];
  sentiment?: {
    overall: 'bullish' | 'bearish' | 'neutral';
    score: number;
    sources: string[];
  };
}

export class AIAnalysisEngine {
  private marketData: MarketDataService;
  private wsManager: WebSocketManager;
  private analysisIntervals: Map<string, NodeJS.Timeout> = new Map();
  private priceHistory: Map<string, number[]> = new Map();

  constructor(wsManager: WebSocketManager) {
    this.wsManager = wsManager;
    this.marketData = new MarketDataService();
  }

  /**
   * Start AI analysis for a symbol
   */
  async startAnalysis(venue: string, symbol: string, intervalMs: number = 5000) {
    const key = `${venue}:${symbol}`;

    if (this.analysisIntervals.has(key)) {
      console.log(`Already analyzing ${key}`);
      return;
    }

    console.log(`Starting AI analysis for ${key}`);

    // Run analysis immediately
    await this.runAnalysis(venue, symbol);

    // Then set up interval
    const interval = setInterval(async () => {
      await this.runAnalysis(venue, symbol);
    }, intervalMs);

    this.analysisIntervals.set(key, interval);
  }

  /**
   * Stop AI analysis for a symbol
   */
  stopAnalysis(venue: string, symbol: string) {
    const key = `${venue}:${symbol}`;
    const interval = this.analysisIntervals.get(key);

    if (interval) {
      clearInterval(interval);
      this.analysisIntervals.delete(key);
      this.priceHistory.delete(key);
      console.log(`Stopped AI analysis for ${key}`);
    }
  }

  /**
   * Run comprehensive AI analysis
   */
  private async runAnalysis(venue: string, symbol: string) {
    try {
      const key = `${venue}:${symbol}`;

      // Fetch current price
      const currentPrice = await this.marketData.getCurrentPrice(venue, symbol);

      // Update price history
      if (!this.priceHistory.has(key)) {
        this.priceHistory.set(key, []);
      }
      const history = this.priceHistory.get(key)!;
      history.push(currentPrice);
      if (history.length > 200) {
        history.shift(); // Keep last 200 prices
      }

      // Calculate technical indicators
      const indicators = this.calculateIndicators(history, currentPrice);

      // Detect key zones
      const zones = this.detectZones(history, currentPrice);

      // Analyze sentiment (simulated for now - would integrate real sources)
      const sentiment = this.analyzeSentiment(symbol, currentPrice, history);

      // Generate AI decision
      const signal = this.generateSignal(indicators, zones, sentiment, currentPrice);

      // Broadcast AI signal
      this.wsManager.broadcast({
        type: 'ai_signal',
        data: {
          symbol,
          venue,
          signal,
          timestamp: Date.now(),
        },
      });

    } catch (error) {
      console.error(`Error running AI analysis for ${venue}:${symbol}:`, error);
    }
  }

  /**
   * Calculate technical indicators
   */
  private calculateIndicators(history: number[], currentPrice: number) {
    if (history.length < 14) {
      return [];
    }

    const indicators = [];

    // RSI
    const rsi = this.calculateRSI(history, 14);
    indicators.push({
      name: 'RSI (14)',
      value: rsi,
      signal: rsi < 30 ? 'bullish' : rsi > 70 ? 'bearish' : 'neutral' as const,
    });

    // Moving averages
    if (history.length >= 50) {
      const sma50 = this.calculateSMA(history, 50);
      const sma200 = history.length >= 200 ? this.calculateSMA(history, 200) : sma50;

      indicators.push({
        name: 'SMA 50/200',
        value: sma50 / sma200,
        signal: sma50 > sma200 ? 'bullish' : 'bearish' as const,
      });
    }

    // MACD
    if (history.length >= 26) {
      const macd = this.calculateMACD(history);
      indicators.push({
        name: 'MACD',
        value: macd.macd,
        signal: macd.macd > macd.signal ? 'bullish' : 'bearish' as const,
      });
    }

    // Volume (simulated based on price volatility)
    const volatility = this.calculateVolatility(history);
    indicators.push({
      name: 'Volume',
      value: volatility,
      signal: volatility > 1.5 ? 'bullish' : 'neutral' as const,
    });

    return indicators;
  }

  /**
   * Detect key price zones
   */
  private detectZones(history: number[], currentPrice: number) {
    if (history.length < 50) {
      return [];
    }

    const zones = [];
    const high = Math.max(...history);
    const low = Math.min(...history);
    const range = high - low;

    // Support levels
    const supportLevels = this.findSupportResistance(history, 'support');
    supportLevels.slice(0, 2).forEach(level => {
      zones.push({
        type: 'support' as const,
        price: level.price,
        strength: level.strength,
      });
    });

    // Resistance levels
    const resistanceLevels = this.findSupportResistance(history, 'resistance');
    resistanceLevels.slice(0, 2).forEach(level => {
      zones.push({
        type: 'resistance' as const,
        price: level.price,
        strength: level.strength,
      });
    });

    // Liquidity zones (price levels with high activity)
    const liquidityZone = currentPrice > (high + low) / 2 ? low + range * 0.382 : high - range * 0.382;
    zones.push({
      type: 'liquidity' as const,
      price: liquidityZone,
      strength: 80,
    });

    return zones;
  }

  /**
   * Analyze market sentiment
   */
  private analyzeSentiment(symbol: string, currentPrice: number, history: number[]) {
    // Simplified sentiment based on price action
    const recentTrend = history.length >= 20
      ? (currentPrice - history[history.length - 20]) / history[history.length - 20]
      : 0;

    const score = Math.max(-100, Math.min(100, recentTrend * 1000));

    return {
      overall: score > 10 ? 'bullish' : score < -10 ? 'bearish' : 'neutral' as const,
      score: Math.abs(score),
      sources: ['Price Action', 'Technical Momentum', 'Volume Profile'],
    };
  }

  /**
   * Generate trading signal based on all factors
   */
  private generateSignal(
    indicators: any[],
    zones: any[],
    sentiment: any,
    currentPrice: number
  ): AISignal {
    // Count bullish vs bearish signals
    let bullishCount = 0;
    let bearishCount = 0;

    indicators.forEach(ind => {
      if (ind.signal === 'bullish') bullishCount++;
      if (ind.signal === 'bearish') bearishCount++;
    });

    // Add sentiment to scoring
    if (sentiment.overall === 'bullish') bullishCount += 2;
    if (sentiment.overall === 'bearish') bearishCount += 2;

    const totalSignals = bullishCount + bearishCount;
    const bullishRatio = totalSignals > 0 ? bullishCount / totalSignals : 0.5;

    // Determine action
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 50;

    if (bullishRatio >= 0.65) {
      action = 'BUY';
      confidence = Math.min(95, 50 + (bullishRatio - 0.5) * 100);
    } else if (bullishRatio <= 0.35) {
      action = 'SELL';
      confidence = Math.min(95, 50 + (0.5 - bullishRatio) * 100);
    }

    // Generate reasoning
    const reasoning: string[] = [];
    if (action !== 'HOLD') {
      reasoning.push(`${bullishCount} bullish signals detected vs ${bearishCount} bearish`);

      indicators.forEach(ind => {
        if (ind.signal !== 'neutral') {
          reasoning.push(`${ind.name}: ${ind.value.toFixed(2)} - ${ind.signal}`);
        }
      });

      reasoning.push(`Market sentiment: ${sentiment.overall} (${sentiment.score.toFixed(0)}%)`);

      // Add zone analysis
      const nearSupport = zones.find(z => z.type === 'support' && Math.abs(z.price - currentPrice) / currentPrice < 0.02);
      const nearResistance = zones.find(z => z.type === 'resistance' && Math.abs(z.price - currentPrice) / currentPrice < 0.02);

      if (nearSupport) {
        reasoning.push(`Price near strong support at $${nearSupport.price.toFixed(2)}`);
      }
      if (nearResistance) {
        reasoning.push(`Price testing resistance at $${nearResistance.price.toFixed(2)}`);
      }
    }

    return {
      action,
      confidence,
      reasoning,
      indicators,
      zones,
      sentiment,
    };
  }

  // Technical indicator calculations
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
    return 100 - (100 / (1 + rs));
  }

  private calculateSMA(prices: number[], period: number): number {
    const slice = prices.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  }

  private calculateMACD(prices: number[]) {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macd = ema12 - ema26;
    const signal = ema26; // Simplified

    return { macd, signal };
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];

    const k = 2 / (period + 1);
    let ema = this.calculateSMA(prices.slice(0, period), period);

    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * k + ema;
    }

    return ema;
  }

  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 1;

    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;

    return Math.sqrt(variance) * 100;
  }

  private findSupportResistance(prices: number[], type: 'support' | 'resistance') {
    const levels: { price: number; strength: number }[] = [];
    const window = 10;

    for (let i = window; i < prices.length - window; i++) {
      const slice = prices.slice(i - window, i + window + 1);
      const price = prices[i];

      if (type === 'support' && price === Math.min(...slice)) {
        levels.push({ price, strength: 70 + Math.random() * 20 });
      } else if (type === 'resistance' && price === Math.max(...slice)) {
        levels.push({ price, strength: 70 + Math.random() * 20 });
      }
    }

    return levels.sort((a, b) => b.strength - a.strength);
  }
}
