import { BaseStrategy, StrategyContext, StrategySignal } from './base-strategy';

/**
 * Time & Sales Flow Strategy
 * Analyzes real-time trade tape for aggressive buying/selling
 */
export class TimeSalesFlow extends BaseStrategy {
  constructor() {
    super(
      'Time & Sales Flow',
      'Institutional',
      'Reads the tape: aggressive market orders, block trades, and trade velocity for institutional activity'
    );
  }

  async analyze(currentPrice: number, context: StrategyContext): Promise<StrategySignal> {
    const { trades, priceHistory, volumeHistory } = context;

    if (!trades || trades.length < 50) {
      return this.holdSignal('Insufficient trade data for tape reading');
    }

    // Detect aggressive orders (market orders vs limit orders)
    const aggressiveness = this.analyzeAggressiveness(trades);

    // Identify block trades (institutional size)
    const blockTrades = this.detectBlockTrades(trades, volumeHistory);

    // Measure trade velocity (trades per minute)
    const velocity = this.calculateTradeVelocity(trades);

    // Detect tape painting/spoofing patterns
    const authentic = this.validateAuthenticity(trades);

    // Determine signal
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 50;
    let strength = 0;
    let reasoning = '';

    // Aggressive buying with block trades
    if (
      aggressiveness.buyRatio > 0.65 &&
      blockTrades.buyBlocks > blockTrades.sellBlocks &&
      velocity.increasing &&
      authentic
    ) {
      action = 'BUY';
      strength = Math.min(92, aggressiveness.buyRatio * 80 + blockTrades.buyBlocks * 10);
      confidence = Math.min(88, 62 + strength * 0.26);
      reasoning = `Aggressive buying on tape. ${(aggressiveness.buyRatio * 100).toFixed(0)}% buy aggression, ${blockTrades.buyBlocks} block buys. Velocity up ${velocity.changePercent.toFixed(0)}%. Institutions accumulating`;
    }
    // Aggressive selling with block trades
    else if (
      aggressiveness.buyRatio < 0.35 &&
      blockTrades.sellBlocks > blockTrades.buyBlocks &&
      velocity.increasing &&
      authentic
    ) {
      action = 'SELL';
      strength = Math.min(92, (1 - aggressiveness.buyRatio) * 80 + blockTrades.sellBlocks * 10);
      confidence = Math.min(88, 62 + strength * 0.26);
      reasoning = `Aggressive selling on tape. ${((1 - aggressiveness.buyRatio) * 100).toFixed(0)}% sell aggression, ${blockTrades.sellBlocks} block sells. Velocity up ${velocity.changePercent.toFixed(0)}%. Institutions distributing`;
    }
    // Tape painting detected (fake volume)
    else if (!authentic) {
      action = 'HOLD';
      reasoning = `Tape painting detected. Wash trading or spoofing pattern. Ignore fake volume`;
    }
    // High velocity with neutral aggression (both sides fighting)
    else if (
      velocity.increasing &&
      velocity.changePercent > 100 &&
      Math.abs(aggressiveness.buyRatio - 0.5) < 0.1
    ) {
      action = 'HOLD';
      reasoning = `High trade velocity (${velocity.changePercent.toFixed(0)}% increase) but balanced aggression. Both sides active. Volatility expected`;
    }
    // Moderate buying pressure
    else if (
      aggressiveness.buyRatio > 0.55 &&
      blockTrades.buyBlocks >= 1
    ) {
      action = 'BUY';
      strength = Math.min(72, aggressiveness.buyRatio * 65);
      confidence = Math.min(72, 56 + strength * 0.22);
      reasoning = `Moderate buy pressure. ${(aggressiveness.buyRatio * 100).toFixed(0)}% buy aggression, ${blockTrades.buyBlocks} block trade(s)`;
    }
    // Moderate selling pressure
    else if (
      aggressiveness.buyRatio < 0.45 &&
      blockTrades.sellBlocks >= 1
    ) {
      action = 'SELL';
      strength = Math.min(72, (1 - aggressiveness.buyRatio) * 65);
      confidence = Math.min(72, 56 + strength * 0.22);
      reasoning = `Moderate sell pressure. ${((1 - aggressiveness.buyRatio) * 100).toFixed(0)}% sell aggression, ${blockTrades.sellBlocks} block trade(s)`;
    }
    // Velocity declining (market cooling off)
    else if (!velocity.increasing && velocity.changePercent < -30) {
      action = 'HOLD';
      reasoning = `Trade velocity declining ${Math.abs(velocity.changePercent).toFixed(0)}%. Market cooling. Wait for next setup`;
    }
    else {
      reasoning = `Tape neutral. Buy ratio: ${(aggressiveness.buyRatio * 100).toFixed(0)}%, Blocks: ${blockTrades.buyBlocks}B/${blockTrades.sellBlocks}S`;
    }

    return {
      action,
      confidence,
      strength,
      reasoning,
      metadata: {
        buyAggressionRatio: aggressiveness.buyRatio,
        blockBuys: blockTrades.buyBlocks,
        blockSells: blockTrades.sellBlocks,
        tradeVelocity: velocity.current,
        velocityChange: velocity.changePercent,
        authenticTape: authentic,
      },
    };
  }

  private analyzeAggressiveness(trades: any[]): {
    buyRatio: number;
    aggressiveBuys: number;
    aggressiveSells: number;
  } {
    // Aggressive = market orders (taking liquidity)
    // Passive = limit orders (providing liquidity)

    let aggressiveBuys = 0;
    let aggressiveSells = 0;

    trades.forEach(trade => {
      if (trade.side === 'buy' && trade.type === 'market') {
        aggressiveBuys += trade.size;
      } else if (trade.side === 'sell' && trade.type === 'market') {
        aggressiveSells += trade.size;
      } else if (trade.aggressor === 'buy') {
        aggressiveBuys += trade.size;
      } else if (trade.aggressor === 'sell') {
        aggressiveSells += trade.size;
      }
    });

    const total = aggressiveBuys + aggressiveSells;
    const buyRatio = total > 0 ? aggressiveBuys / total : 0.5;

    return {
      buyRatio,
      aggressiveBuys,
      aggressiveSells,
    };
  }

  private detectBlockTrades(trades: any[], volumeHistory?: number[]): {
    buyBlocks: number;
    sellBlocks: number;
    largestBlock: number;
  } {
    // Block trade = significantly larger than average trade size
    const avgSize = trades.reduce((sum, t) => sum + (t.size || 0), 0) / trades.length;
    const blockThreshold = avgSize * 10; // 10x average = block

    let buyBlocks = 0;
    let sellBlocks = 0;
    let largestBlock = 0;

    trades.forEach(trade => {
      if (trade.size > blockThreshold) {
        if (trade.side === 'buy' || trade.aggressor === 'buy') {
          buyBlocks++;
        } else {
          sellBlocks++;
        }
        if (trade.size > largestBlock) {
          largestBlock = trade.size;
        }
      }
    });

    return {
      buyBlocks,
      sellBlocks,
      largestBlock,
    };
  }

  private calculateTradeVelocity(trades: any[]): {
    current: number;
    previous: number;
    increasing: boolean;
    changePercent: number;
  } {
    if (trades.length < 20) {
      return { current: 0, previous: 0, increasing: false, changePercent: 0 };
    }

    // Trades in last 10 vs previous 10
    const recentTrades = trades.slice(-10).length;
    const previousTrades = trades.slice(-20, -10).length;

    const changePercent = previousTrades > 0
      ? ((recentTrades - previousTrades) / previousTrades) * 100
      : 0;

    return {
      current: recentTrades,
      previous: previousTrades,
      increasing: recentTrades > previousTrades,
      changePercent,
    };
  }

  private validateAuthenticity(trades: any[]): boolean {
    // Detect wash trading / tape painting patterns
    // 1. Same size trades repeating
    // 2. Trades at exact same price
    // 3. Alternating buy/sell pattern

    if (trades.length < 10) return true;

    const recent = trades.slice(-10);

    // Check for repetitive same-size trades (wash trading indicator)
    const sizes = recent.map(t => t.size);
    const uniqueSizes = new Set(sizes);

    if (uniqueSizes.size < 3) {
      return false; // Too many identical sizes = suspicious
    }

    // Check for alternating buy/sell (ping-pong)
    let alternations = 0;
    for (let i = 1; i < recent.length; i++) {
      const prevSide = recent[i - 1].side || recent[i - 1].aggressor;
      const currSide = recent[i].side || recent[i].aggressor;

      if (prevSide !== currSide) {
        alternations++;
      }
    }

    const alternationRatio = alternations / (recent.length - 1);

    if (alternationRatio > 0.9) {
      return false; // Too much alternation = suspicious
    }

    return true;
  }

  protected getMinHistoryLength(): number {
    return 20;
  }
}
