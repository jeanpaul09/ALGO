import { BacktestResult, BacktestTrade, MarketDataPoint, StrategyParameters } from '../types';
import { MarketDataService } from './market-data';
import { StrategyExecutor } from './strategy-executor';

export interface BacktestConfig {
  strategyCode: string;
  symbol: string;
  venue: string;
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  parameters: StrategyParameters;
  feeRate: number; // e.g., 0.0005 for 0.05%
  slippageRate: number; // e.g., 0.0001 for 0.01%
}

export class BacktestingEngine {
  private marketDataService: MarketDataService;
  private strategyExecutor: StrategyExecutor;

  constructor() {
    this.marketDataService = new MarketDataService();
    this.strategyExecutor = new StrategyExecutor();
  }

  async runBacktest(config: BacktestConfig): Promise<BacktestResult> {
    // Fetch historical data
    const marketData = await this.marketDataService.getHistoricalData(
      config.venue,
      config.symbol,
      config.startDate,
      config.endDate
    );

    if (marketData.length === 0) {
      throw new Error('No market data available for the specified period');
    }

    // Initialize backtest state
    let capital = config.initialCapital;
    let position = 0; // Position size (positive = long, negative = short)
    let entryPrice = 0;
    const trades: BacktestTrade[] = [];
    const equityCurve: Array<{ timestamp: Date; equity: number }> = [];
    const drawdownCurve: Array<{ timestamp: Date; drawdown: number }> = [];
    let peakEquity = capital;

    // Run simulation bar by bar
    for (let i = 0; i < marketData.length; i++) {
      const currentBar = marketData[i];
      const historicalData = marketData.slice(0, i + 1);

      // Get strategy signal
      const signal = await this.strategyExecutor.generateSignal(
        config.strategyCode,
        config.parameters,
        historicalData,
        { size: position, entryPrice }
      );

      // Execute trades based on signal
      if (signal.action === 'BUY' && position <= 0) {
        // Close short if any, then go long
        if (position < 0) {
          const closePnl = this.calculatePnL(position, entryPrice, currentBar.close);
          capital += closePnl;
          trades.push({
            timestamp: currentBar.timestamp,
            symbol: config.symbol,
            side: 'BUY',
            size: Math.abs(position),
            price: this.applySlippage(currentBar.close, 'BUY', config.slippageRate),
            pnl: closePnl,
            reason: signal.reason,
          });
        }

        // Open long position
        const size = signal.size || this.calculatePositionSize(capital, currentBar.close);
        const price = this.applySlippage(currentBar.close, 'BUY', config.slippageRate);
        const fee = size * price * config.feeRate;
        capital -= fee;

        position = size;
        entryPrice = price;

        trades.push({
          timestamp: currentBar.timestamp,
          symbol: config.symbol,
          side: 'BUY',
          size,
          price,
          pnl: -fee,
          reason: signal.reason,
        });
      } else if (signal.action === 'SELL' && position >= 0) {
        // Close long if any, then go short
        if (position > 0) {
          const closePnl = this.calculatePnL(position, entryPrice, currentBar.close);
          capital += closePnl;
          trades.push({
            timestamp: currentBar.timestamp,
            symbol: config.symbol,
            side: 'SELL',
            size: position,
            price: this.applySlippage(currentBar.close, 'SELL', config.slippageRate),
            pnl: closePnl,
            reason: signal.reason,
          });
        }

        // Open short position
        const size = signal.size || this.calculatePositionSize(capital, currentBar.close);
        const price = this.applySlippage(currentBar.close, 'SELL', config.slippageRate);
        const fee = size * price * config.feeRate;
        capital -= fee;

        position = -size;
        entryPrice = price;

        trades.push({
          timestamp: currentBar.timestamp,
          symbol: config.symbol,
          side: 'SELL',
          size,
          price,
          pnl: -fee,
          reason: signal.reason,
        });
      } else if (signal.action === 'CLOSE' && position !== 0) {
        // Close current position
        const closePnl = this.calculatePnL(position, entryPrice, currentBar.close);
        capital += closePnl;
        const side = position > 0 ? 'SELL' : 'BUY';

        trades.push({
          timestamp: currentBar.timestamp,
          symbol: config.symbol,
          side,
          size: Math.abs(position),
          price: this.applySlippage(currentBar.close, side, config.slippageRate),
          pnl: closePnl,
          reason: signal.reason,
        });

        position = 0;
        entryPrice = 0;
      }

      // Calculate current equity (capital + unrealized PnL)
      const unrealizedPnL = position !== 0 ? this.calculatePnL(position, entryPrice, currentBar.close) : 0;
      const currentEquity = capital + unrealizedPnL;

      equityCurve.push({
        timestamp: currentBar.timestamp,
        equity: currentEquity,
      });

      // Update peak and calculate drawdown
      if (currentEquity > peakEquity) {
        peakEquity = currentEquity;
      }
      const drawdown = ((peakEquity - currentEquity) / peakEquity) * 100;
      drawdownCurve.push({
        timestamp: currentBar.timestamp,
        drawdown,
      });
    }

    // Close any remaining position at the end
    if (position !== 0) {
      const lastBar = marketData[marketData.length - 1];
      const closePnl = this.calculatePnL(position, entryPrice, lastBar.close);
      capital += closePnl;
      const side = position > 0 ? 'SELL' : 'BUY';

      trades.push({
        timestamp: lastBar.timestamp,
        symbol: config.symbol,
        side,
        size: Math.abs(position),
        price: lastBar.close,
        pnl: closePnl,
        reason: 'End of backtest',
      });
    }

    // Calculate performance metrics
    const totalReturn = ((capital - config.initialCapital) / config.initialCapital) * 100;
    const profitableTrades = trades.filter((t) => (t.pnl || 0) > 0).length;
    const winRate = trades.length > 0 ? (profitableTrades / trades.length) * 100 : 0;

    const wins = trades.filter((t) => (t.pnl || 0) > 0).map((t) => t.pnl || 0);
    const losses = trades.filter((t) => (t.pnl || 0) < 0).map((t) => t.pnl || 0);

    const averageWin = wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
    const averageLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;

    const maxDrawdown = Math.max(...drawdownCurve.map((d) => d.drawdown), 0);

    const sharpeRatio = this.calculateSharpeRatio(equityCurve);
    const sortinoRatio = this.calculateSortinoRatio(equityCurve);

    return {
      id: '', // Will be set when saved to database
      totalReturn,
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      winRate,
      totalTrades: trades.length,
      profitableTrades,
      averageWin,
      averageLoss,
      equityCurve,
      drawdownCurve,
      trades,
    };
  }

  private calculatePnL(position: number, entryPrice: number, exitPrice: number): number {
    if (position > 0) {
      // Long position
      return position * (exitPrice - entryPrice);
    } else {
      // Short position
      return Math.abs(position) * (entryPrice - exitPrice);
    }
  }

  private applySlippage(price: number, side: 'BUY' | 'SELL', slippageRate: number): number {
    if (side === 'BUY') {
      return price * (1 + slippageRate);
    } else {
      return price * (1 - slippageRate);
    }
  }

  private calculatePositionSize(capital: number, price: number): number {
    // Use 95% of capital for position sizing
    const maxValue = capital * 0.95;
    return maxValue / price;
  }

  private calculateSharpeRatio(equityCurve: Array<{ timestamp: Date; equity: number }>): number | null {
    if (equityCurve.length < 2) return null;

    const returns = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const ret = (equityCurve[i].equity - equityCurve[i - 1].equity) / equityCurve[i - 1].equity;
      returns.push(ret);
    }

    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return null;

    // Annualized Sharpe (assuming hourly data, 365*24 periods per year)
    return (avgReturn / stdDev) * Math.sqrt(365 * 24);
  }

  private calculateSortinoRatio(equityCurve: Array<{ timestamp: Date; equity: number }>): number | null {
    if (equityCurve.length < 2) return null;

    const returns = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const ret = (equityCurve[i].equity - equityCurve[i - 1].equity) / equityCurve[i - 1].equity;
      returns.push(ret);
    }

    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const downside = returns.filter((r) => r < 0);

    if (downside.length === 0) return null;

    const downsideVariance = downside.reduce((a, b) => a + Math.pow(b, 2), 0) / downside.length;
    const downsideStdDev = Math.sqrt(downsideVariance);

    if (downsideStdDev === 0) return null;

    return (avgReturn / downsideStdDev) * Math.sqrt(365 * 24);
  }
}
