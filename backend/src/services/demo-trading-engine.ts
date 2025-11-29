import { WebSocketManager } from './websocket';

export interface Position {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  size: number;
  takeProfitPrice: number;
  stopLossPrice: number;
  targetPrice?: number;
  openTime: number;
  unrealizedPnL: number;
  status: 'OPEN' | 'CLOSED';
}

export interface Trade {
  id: string;
  positionId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  price: number;
  size: number;
  timestamp: number;
  pnl?: number;
  reason: string;
}

export class DemoTradingEngine {
  private wsManager: WebSocketManager;
  private positions: Map<string, Position> = new Map();
  private trades: Trade[] = [];
  private balance: number = 10000; // Start with $10k
  private initialBalance: number = 10000;

  constructor(wsManager: WebSocketManager) {
    this.wsManager = wsManager;
    console.log('✓ Demo Trading Engine initialized with $10,000 balance');
  }

  /**
   * Execute a trade based on AI signal
   */
  async executeTrade(
    symbol: string,
    action: 'BUY' | 'SELL',
    currentPrice: number,
    confidence: number,
    reasoning: string,
    signals: {
      takeProfit: number;
      stopLoss: number;
      target?: number;
    }
  ): Promise<{ success: boolean; position?: Position; error?: string }> {
    try {
      // Risk management: Use confidence to determine position size
      const riskPerTrade = 0.02; // Risk 2% of balance per trade
      const riskAmount = this.balance * riskPerTrade * (confidence / 100);

      // Calculate position size based on stop loss distance
      const stopDistance = Math.abs(currentPrice - signals.stopLoss);
      const size = riskAmount / stopDistance;

      // Don't take position if balance is too low
      if (this.balance < 1000) {
        return { success: false, error: 'Insufficient balance' };
      }

      // Close any existing opposite positions
      await this.closeOppositePositions(symbol, action);

      // Create new position
      const position: Position = {
        id: `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        symbol,
        side: action === 'BUY' ? 'LONG' : 'SHORT',
        entryPrice: currentPrice,
        size,
        takeProfitPrice: signals.takeProfit,
        stopLossPrice: signals.stopLoss,
        targetPrice: signals.target,
        openTime: Date.now(),
        unrealizedPnL: 0,
        status: 'OPEN',
      };

      this.positions.set(position.id, position);

      // Record trade
      const trade: Trade = {
        id: `trade_${Date.now()}`,
        positionId: position.id,
        symbol,
        side: action,
        price: currentPrice,
        size,
        timestamp: Date.now(),
        reason: reasoning,
      };

      this.trades.push(trade);

      // Broadcast to frontend
      this.wsManager.broadcast({
        type: 'trade_executed',
        data: {
          trade,
          position,
          balance: this.balance,
        },
      });

      // Send chart signals
      this.wsManager.broadcast({
        type: 'chart_signals',
        data: {
          signals: [
            {
              id: `entry_${position.id}`,
              type: 'entry',
              price: currentPrice,
              label: `Entry ${action}`,
              color: action === 'BUY' ? '#26a69a' : '#ef5350',
            },
            {
              id: `tp_${position.id}`,
              type: 'tp',
              price: signals.takeProfit,
              label: `TP $${signals.takeProfit.toFixed(2)}`,
              color: '#4caf50',
            },
            {
              id: `sl_${position.id}`,
              type: 'sl',
              price: signals.stopLoss,
              label: `SL $${signals.stopLoss.toFixed(2)}`,
              color: '#f44336',
            },
            ...(signals.target ? [{
              id: `target_${position.id}`,
              type: 'target' as const,
              price: signals.target,
              label: `Target $${signals.target.toFixed(2)}`,
              color: '#2196f3',
            }] : []),
          ],
        },
      });

      console.log(`✓ Demo trade executed: ${action} ${size.toFixed(4)} ${symbol} @ $${currentPrice.toFixed(2)}`);
      console.log(`  TP: $${signals.takeProfit.toFixed(2)} | SL: $${signals.stopLoss.toFixed(2)}`);

      return { success: true, position };
    } catch (error) {
      console.error('Failed to execute demo trade:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Update positions based on current market price
   */
  async updatePositions(symbol: string, currentPrice: number) {
    const closedPositions: Position[] = [];

    for (const [id, position] of this.positions) {
      if (position.symbol !== symbol || position.status !== 'OPEN') continue;

      // Calculate unrealized P&L
      if (position.side === 'LONG') {
        position.unrealizedPnL = (currentPrice - position.entryPrice) * position.size;

        // Check if TP or SL hit
        if (currentPrice >= position.takeProfitPrice) {
          await this.closePosition(id, currentPrice, 'Take Profit Hit');
          closedPositions.push(position);
        } else if (currentPrice <= position.stopLossPrice) {
          await this.closePosition(id, currentPrice, 'Stop Loss Hit');
          closedPositions.push(position);
        }
      } else { // SHORT
        position.unrealizedPnL = (position.entryPrice - currentPrice) * position.size;

        // Check if TP or SL hit
        if (currentPrice <= position.takeProfitPrice) {
          await this.closePosition(id, currentPrice, 'Take Profit Hit');
          closedPositions.push(position);
        } else if (currentPrice >= position.stopLossPrice) {
          await this.closePosition(id, currentPrice, 'Stop Loss Hit');
          closedPositions.push(position);
        }
      }

      // Broadcast position update
      this.wsManager.broadcast({
        type: 'position_update',
        data: {
          position,
          totalPnL: this.getTotalPnL(),
          balance: this.balance,
        },
      });
    }

    return closedPositions;
  }

  /**
   * Close a position
   */
  private async closePosition(positionId: string, exitPrice: number, reason: string) {
    const position = this.positions.get(positionId);
    if (!position) return;

    // Calculate realized P&L
    let pnl = 0;
    if (position.side === 'LONG') {
      pnl = (exitPrice - position.entryPrice) * position.size;
    } else {
      pnl = (position.entryPrice - exitPrice) * position.size;
    }

    // Update balance
    this.balance += pnl;

    // Mark position as closed
    position.status = 'CLOSED';

    // Record closing trade
    const trade: Trade = {
      id: `trade_${Date.now()}`,
      positionId: position.id,
      symbol: position.symbol,
      side: position.side === 'LONG' ? 'SELL' : 'BUY',
      price: exitPrice,
      size: position.size,
      timestamp: Date.now(),
      pnl,
      reason,
    };

    this.trades.push(trade);

    // Broadcast
    this.wsManager.broadcast({
      type: 'position_closed',
      data: {
        position,
        trade,
        pnl,
        balance: this.balance,
        totalReturn: ((this.balance - this.initialBalance) / this.initialBalance) * 100,
      },
    });

    console.log(`✓ Position closed: ${position.side} ${position.symbol} | P&L: $${pnl.toFixed(2)} | Reason: ${reason}`);
    console.log(`  New balance: $${this.balance.toFixed(2)} (${this.getTotalReturn().toFixed(2)}% return)`);
  }

  /**
   * Close opposite positions before opening new one
   */
  private async closeOppositePositions(symbol: string, newAction: 'BUY' | 'SELL') {
    const oppositeSide = newAction === 'BUY' ? 'SHORT' : 'LONG';

    for (const [id, position] of this.positions) {
      if (position.symbol === symbol && position.side === oppositeSide && position.status === 'OPEN') {
        const currentPrice = position.entryPrice; // Use entry as approximate close
        await this.closePosition(id, currentPrice, 'Closed by opposing signal');
      }
    }
  }

  /**
   * Get total P&L across all positions
   */
  getTotalPnL(): number {
    let total = 0;
    for (const position of this.positions.values()) {
      if (position.status === 'OPEN') {
        total += position.unrealizedPnL;
      }
    }
    return total;
  }

  /**
   * Get total return percentage
   */
  getTotalReturn(): number {
    return ((this.balance - this.initialBalance) / this.initialBalance) * 100;
  }

  /**
   * Get account stats
   */
  getStats() {
    const openPositions = Array.from(this.positions.values()).filter(p => p.status === 'OPEN');
    const closedTrades = this.trades.filter(t => t.pnl !== undefined);
    const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0);

    return {
      balance: this.balance,
      totalReturn: this.getTotalReturn(),
      openPositions: openPositions.length,
      totalTrades: closedTrades.length,
      winRate: closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0,
      totalPnL: this.balance - this.initialBalance,
      unrealizedPnL: this.getTotalPnL(),
    };
  }

  /**
   * Get all open positions
   */
  getOpenPositions(): Position[] {
    return Array.from(this.positions.values()).filter(p => p.status === 'OPEN');
  }

  /**
   * Get trade history
   */
  getTradeHistory(limit: number = 50): Trade[] {
    return this.trades.slice(-limit);
  }
}
