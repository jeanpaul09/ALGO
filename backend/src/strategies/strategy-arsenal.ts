import { BaseStrategy, StrategyContext, StrategySignal } from './base-strategy';
import { MomentumScanner } from './momentum-scanner';
import { MeanReversion } from './mean-reversion';
import { SentimentFusion } from './sentiment-fusion';

/**
 * Strategy Arsenal
 * Manages and coordinates all trading strategies
 */
export class StrategyArsenal {
  private strategies: Map<string, BaseStrategy> = new Map();

  constructor() {
    this.initializeStrategies();
  }

  private initializeStrategies() {
    // Technical Strategies
    this.registerStrategy(new MomentumScanner());
    this.registerStrategy(new MeanReversion());

    // Sentiment Strategies
    this.registerStrategy(new SentimentFusion());

    // TODO: Add more strategies:
    // - Order Flow Analyzer
    // - Liquidation Hunter
    // - Smart Money Tracker
    // - Funding Rate Arbitrage
    // - Volume Profile
    // - Support/Resistance Breakout
    // - etc.
  }

  private registerStrategy(strategy: BaseStrategy) {
    this.strategies.set(strategy.name, strategy);
    console.log(`✓ Registered strategy: ${strategy.name} (${strategy.category})`);
  }

  /**
   * Run all enabled strategies and get signals
   */
  async analyzeAll(
    currentPrice: number,
    context: StrategyContext
  ): Promise<Map<string, StrategySignal>> {
    const signals = new Map<string, StrategySignal>();

    for (const [name, strategy] of this.strategies) {
      if (!strategy.enabled || !strategy.canRun(context)) {
        continue;
      }

      try {
        const signal = await strategy.analyze(currentPrice, context);
        signals.set(name, signal);
      } catch (error) {
        console.error(`Strategy ${name} failed:`, error);
      }
    }

    return signals;
  }

  /**
   * Get ensemble decision from all strategies
   */
  getEnsembleDecision(signals: Map<string, StrategySignal>): {
    action: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    reasoning: string[];
    strategyBreakdown: Array<{
      name: string;
      action: string;
      confidence: number;
      strength: number;
      weight: number;
    }>;
  } {
    if (signals.size === 0) {
      return {
        action: 'HOLD',
        confidence: 0,
        reasoning: ['No active strategies'],
        strategyBreakdown: [],
      };
    }

    // Weighted voting system
    let buyScore = 0;
    let sellScore = 0;
    let totalWeight = 0;

    const reasoning: string[] = [];
    const breakdown: Array<any> = [];

    for (const [name, signal] of signals) {
      const strategy = this.strategies.get(name)!;
      const weight = strategy.weight;

      // Calculate weighted vote
      const vote = (signal.confidence / 100) * (signal.strength / 100) * weight;

      if (signal.action === 'BUY') {
        buyScore += vote;
        reasoning.push(`${name}: ${signal.reasoning}`);
      } else if (signal.action === 'SELL') {
        sellScore += vote;
        reasoning.push(`${name}: ${signal.reasoning}`);
      }

      totalWeight += weight;

      breakdown.push({
        name,
        action: signal.action,
        confidence: signal.confidence,
        strength: signal.strength,
        weight,
      });
    }

    // Determine final action
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 50;

    const buyRatio = buyScore / totalWeight;
    const sellRatio = sellScore / totalWeight;

    if (buyRatio > 0.35 && buyRatio > sellRatio * 1.5) {
      action = 'BUY';
      confidence = Math.min(95, 50 + buyRatio * 80);
    } else if (sellRatio > 0.35 && sellRatio > buyRatio * 1.5) {
      action = 'SELL';
      confidence = Math.min(95, 50 + sellRatio * 80);
    }

    return {
      action,
      confidence,
      reasoning,
      strategyBreakdown: breakdown,
    };
  }

  /**
   * Get all strategies configuration
   */
  getAllStrategies() {
    return Array.from(this.strategies.values()).map((s) => s.getConfig());
  }

  /**
   * Enable/disable strategy
   */
  toggleStrategy(name: string, enabled: boolean) {
    const strategy = this.strategies.get(name);
    if (strategy) {
      strategy.setEnabled(enabled);
    }
  }

  /**
   * Update strategy weight
   */
  updateWeight(name: string, weight: number) {
    const strategy = this.strategies.get(name);
    if (strategy) {
      strategy.setWeight(weight);
    }
  }
}
