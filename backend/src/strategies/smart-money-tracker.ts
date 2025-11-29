import { BaseStrategy, StrategyContext, StrategySignal } from './base-strategy';

/**
 * Smart Money Tracker
 * Follows whale wallets and large transaction patterns
 */
export class SmartMoneyTracker extends BaseStrategy {
  constructor() {
    super(
      'Smart Money Tracker',
      'On-Chain',
      'Tracks whale wallet movements and large transaction patterns to follow institutional money'
    );
  }

  async analyze(currentPrice: number, context: StrategyContext): Promise<StrategySignal> {
    const { priceHistory, volumeHistory, onChainData } = context;

    // Analyze large transactions (simulated - would use real blockchain data)
    const largeTransactions = this.analyzeLargeTransactions(onChainData);

    // Detect accumulation/distribution patterns
    const pattern = this.detectSmartMoneyPattern(priceHistory, volumeHistory || []);

    // Exchange flows (inflow = bearish, outflow = bullish)
    const exchangeFlow = this.analyzeExchangeFlows(onChainData);

    // Determine signal
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 50;
    let strength = 0;
    let reasoning = '';

    // Whale accumulation + exchange outflow
    if (
      largeTransactions.netBuying > 0.6 &&
      exchangeFlow.netOutflow > 0.5 &&
      pattern.type === 'accumulation'
    ) {
      action = 'BUY';
      strength = Math.min(100, largeTransactions.netBuying * 80 + exchangeFlow.netOutflow * 40);
      confidence = Math.min(92, 60 + strength * 0.32);
      reasoning = `Smart money accumulation detected. ${largeTransactions.count} large buys, ${(exchangeFlow.netOutflow * 100).toFixed(0)}% net outflow from exchanges. Whales accumulating`;
    }
    // Whale distribution + exchange inflow
    else if (
      largeTransactions.netBuying < -0.6 &&
      exchangeFlow.netOutflow < -0.5 &&
      pattern.type === 'distribution'
    ) {
      action = 'SELL';
      strength = Math.min(100, Math.abs(largeTransactions.netBuying) * 80 + Math.abs(exchangeFlow.netOutflow) * 40);
      confidence = Math.min(92, 60 + strength * 0.32);
      reasoning = `Smart money distribution detected. ${largeTransactions.count} large sells, ${(Math.abs(exchangeFlow.netOutflow) * 100).toFixed(0)}% net inflow to exchanges. Whales dumping`;
    }
    // Moderate whale buying
    else if (largeTransactions.netBuying > 0.3 && exchangeFlow.netOutflow > 0.2) {
      action = 'BUY';
      strength = Math.min(75, largeTransactions.netBuying * 60 + exchangeFlow.netOutflow * 30);
      confidence = Math.min(78, 55 + strength * 0.25);
      reasoning = `Moderate whale accumulation. ${largeTransactions.count} large transactions, positive exchange outflow`;
    }
    // Moderate whale selling
    else if (largeTransactions.netBuying < -0.3 && exchangeFlow.netOutflow < -0.2) {
      action = 'SELL';
      strength = Math.min(75, Math.abs(largeTransactions.netBuying) * 60 + Math.abs(exchangeFlow.netOutflow) * 30);
      confidence = Math.min(78, 55 + strength * 0.25);
      reasoning = `Moderate whale distribution. ${largeTransactions.count} large transactions, negative exchange outflow`;
    }
    else {
      reasoning = `No clear smart money signal. Large txs: ${largeTransactions.count}, net buying: ${(largeTransactions.netBuying * 100).toFixed(0)}%`;
    }

    return {
      action,
      confidence,
      strength,
      reasoning,
      metadata: {
        largeTransactionCount: largeTransactions.count,
        netBuyingPressure: largeTransactions.netBuying,
        exchangeNetOutflow: exchangeFlow.netOutflow,
        patternType: pattern.type,
      },
    };
  }

  private analyzeLargeTransactions(onChainData?: any) {
    // Simulated - would integrate with actual blockchain APIs
    // (Etherscan, Whale Alert, Glassnode, etc.)
    const count = Math.floor(Math.random() * 20);
    const netBuying = (Math.random() - 0.5) * 2; // -1 to 1

    return {
      count,
      netBuying,
    };
  }

  private detectSmartMoneyPattern(prices: number[], volumes: number[]) {
    if (prices.length < 20 || volumes.length < 20) {
      return { type: 'none' as const, strength: 0 };
    }

    // Wyckoff-style accumulation: price stable/down, volume high
    const priceChange = (prices[prices.length - 1] - prices[prices.length - 20]) / prices[prices.length - 20];
    const avgVolume = volumes.slice(-20, -10).reduce((a, b) => a + b, 0) / 10;
    const recentVolume = volumes.slice(-10).reduce((a, b) => a + b, 0) / 10;
    const volumeRatio = recentVolume / avgVolume;

    if (Math.abs(priceChange) < 0.03 && volumeRatio > 1.3) {
      return priceChange < 0 ? { type: 'accumulation' as const, strength: 75 } : { type: 'distribution' as const, strength: 75 };
    }

    return { type: 'none' as const, strength: 0 };
  }

  private analyzeExchangeFlows(onChainData?: any) {
    // Simulated - would use real exchange flow data
    // Negative = inflow (bearish), Positive = outflow (bullish)
    const netOutflow = (Math.random() - 0.5) * 2;

    return {
      netOutflow,
    };
  }

  protected getMinHistoryLength(): number {
    return 20;
  }
}
