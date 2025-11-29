import { Signal, MarketDataPoint, StrategyParameters } from '../types';

export interface StrategyContext {
  size: number;
  entryPrice: number;
}

export class StrategyExecutor {
  async generateSignal(
    strategyCode: string,
    parameters: StrategyParameters,
    historicalData: MarketDataPoint[],
    context: StrategyContext
  ): Promise<Signal> {
    try {
      // Execute strategy code in isolated context
      const strategy = this.loadStrategy(strategyCode);
      return strategy.execute(parameters, historicalData, context);
    } catch (error) {
      console.error('Error executing strategy:', error);
      return { action: 'HOLD', reason: 'Strategy execution error' };
    }
  }

  private loadStrategy(strategyCode: string): any {
    // Load strategy by code reference
    // For MVP, we'll use predefined strategies
    switch (strategyCode) {
      case 'sma_crossover':
        return new SMACrossoverStrategy();
      case 'rsi_mean_reversion':
        return new RSIMeanReversionStrategy();
      case 'momentum':
        return new MomentumStrategy();
      default:
        throw new Error(`Unknown strategy: ${strategyCode}`);
    }
  }
}

// Example Strategy: SMA Crossover
class SMACrossoverStrategy {
  execute(params: StrategyParameters, data: MarketDataPoint[], context: StrategyContext): Signal {
    const fastPeriod = (params.fastPeriod as number) || 10;
    const slowPeriod = (params.slowPeriod as number) || 30;

    if (data.length < slowPeriod) {
      return { action: 'HOLD', reason: 'Insufficient data' };
    }

    const fastSMA = this.calculateSMA(data, fastPeriod);
    const slowSMA = this.calculateSMA(data, slowPeriod);
    const prevFastSMA = this.calculateSMA(data.slice(0, -1), fastPeriod);
    const prevSlowSMA = this.calculateSMA(data.slice(0, -1), slowPeriod);

    // Bullish crossover
    if (prevFastSMA <= prevSlowSMA && fastSMA > slowSMA) {
      if (context.size <= 0) {
        return { action: 'BUY', reason: 'Bullish SMA crossover' };
      }
    }

    // Bearish crossover
    if (prevFastSMA >= prevSlowSMA && fastSMA < slowSMA) {
      if (context.size >= 0) {
        return { action: 'SELL', reason: 'Bearish SMA crossover' };
      }
    }

    return { action: 'HOLD', reason: 'No crossover signal' };
  }

  private calculateSMA(data: MarketDataPoint[], period: number): number {
    const slice = data.slice(-period);
    const sum = slice.reduce((acc, candle) => acc + candle.close, 0);
    return sum / period;
  }
}

// Example Strategy: RSI Mean Reversion
class RSIMeanReversionStrategy {
  execute(params: StrategyParameters, data: MarketDataPoint[], context: StrategyContext): Signal {
    const period = (params.rsiPeriod as number) || 14;
    const oversold = (params.oversold as number) || 30;
    const overbought = (params.overbought as number) || 70;

    if (data.length < period + 1) {
      return { action: 'HOLD', reason: 'Insufficient data' };
    }

    const rsi = this.calculateRSI(data, period);

    if (rsi < oversold && context.size <= 0) {
      return { action: 'BUY', reason: `RSI oversold (${rsi.toFixed(2)})` };
    }

    if (rsi > overbought && context.size >= 0) {
      return { action: 'SELL', reason: `RSI overbought (${rsi.toFixed(2)})` };
    }

    // Exit conditions
    if (context.size > 0 && rsi > 50) {
      return { action: 'CLOSE', reason: 'RSI mean reversion exit' };
    }

    if (context.size < 0 && rsi < 50) {
      return { action: 'CLOSE', reason: 'RSI mean reversion exit' };
    }

    return { action: 'HOLD', reason: `RSI neutral (${rsi.toFixed(2)})` };
  }

  private calculateRSI(data: MarketDataPoint[], period: number): number {
    const changes = [];
    for (let i = 1; i < data.length; i++) {
      changes.push(data[i].close - data[i - 1].close);
    }

    const recentChanges = changes.slice(-period);
    const gains = recentChanges.filter((c) => c > 0);
    const losses = recentChanges.filter((c) => c < 0).map((c) => Math.abs(c));

    const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / period : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / period : 0;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }
}

// Example Strategy: Momentum
class MomentumStrategy {
  execute(params: StrategyParameters, data: MarketDataPoint[], context: StrategyContext): Signal {
    const lookback = (params.lookback as number) || 20;
    const threshold = (params.threshold as number) || 0.02; // 2%

    if (data.length < lookback) {
      return { action: 'HOLD', reason: 'Insufficient data' };
    }

    const currentPrice = data[data.length - 1].close;
    const pastPrice = data[data.length - lookback].close;
    const momentum = (currentPrice - pastPrice) / pastPrice;

    if (momentum > threshold && context.size <= 0) {
      return { action: 'BUY', reason: `Positive momentum (${(momentum * 100).toFixed(2)}%)` };
    }

    if (momentum < -threshold && context.size >= 0) {
      return { action: 'SELL', reason: `Negative momentum (${(momentum * 100).toFixed(2)}%)` };
    }

    // Exit if momentum reverses
    if (context.size > 0 && momentum < 0) {
      return { action: 'CLOSE', reason: 'Momentum reversal' };
    }

    if (context.size < 0 && momentum > 0) {
      return { action: 'CLOSE', reason: 'Momentum reversal' };
    }

    return { action: 'HOLD', reason: `Momentum neutral (${(momentum * 100).toFixed(2)}%)` };
  }
}
