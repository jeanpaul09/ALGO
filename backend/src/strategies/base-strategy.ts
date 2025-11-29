/**
 * Base Strategy Interface
 * All trading strategies must implement this interface
 */

export interface MarketData {
  price: number;
  timestamp: number;
  volume?: number;
  high?: number;
  low?: number;
  open?: number;
}

export interface StrategySignal {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0-100
  strength: number; // 0-100 (how strong the signal is)
  reasoning: string;
  metadata?: Record<string, any>;
}

export interface StrategyContext {
  priceHistory: number[];
  volumeHistory?: number[];
  sentiment?: number; // -100 to 100
  fearGreedIndex?: number; // 0-100
  fundingRate?: number;
  news?: Array<{ title: string; sentiment: number }>;
}

export abstract class BaseStrategy {
  public readonly name: string;
  public readonly category: string;
  public readonly description: string;
  public enabled: boolean = true;
  public weight: number = 1.0; // Strategy weight in ensemble (0-1)

  constructor(name: string, category: string, description: string) {
    this.name = name;
    this.category = category;
    this.description = description;
  }

  /**
   * Analyze market and generate trading signal
   */
  abstract analyze(
    currentPrice: number,
    context: StrategyContext
  ): Promise<StrategySignal>;

  /**
   * Validate if strategy can run with current context
   */
  canRun(context: StrategyContext): boolean {
    return context.priceHistory.length >= this.getMinHistoryLength();
  }

  /**
   * Minimum price history required
   */
  protected getMinHistoryLength(): number {
    return 20;
  }

  /**
   * Enable/disable strategy
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Set strategy weight (importance in ensemble)
   */
  setWeight(weight: number): void {
    this.weight = Math.max(0, Math.min(1, weight));
  }

  /**
   * Get strategy configuration
   */
  getConfig() {
    return {
      name: this.name,
      category: this.category,
      description: this.description,
      enabled: this.enabled,
      weight: this.weight,
      minHistoryLength: this.getMinHistoryLength(),
    };
  }
}
