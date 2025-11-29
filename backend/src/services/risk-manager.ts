import { Signal, RiskLimits } from '../types';
import { prisma } from '../lib/prisma';

export interface RiskCheckResult {
  allowed: boolean;
  reason?: string;
  killSwitch?: boolean;
}

export class RiskManager {
  private defaultLimits: RiskLimits = {
    maxPositionSizeUsd: parseFloat(process.env.MAX_POSITION_SIZE_USD || '10000'),
    maxDailyLossUsd: parseFloat(process.env.MAX_DAILY_LOSS_USD || '1000'),
    maxOpenPositions: 5,
  };

  async checkLimits(sessionId: string, signal: Signal, currentPrice: number): Promise<RiskCheckResult> {
    // Check daily loss limit
    const dailyPnl = await this.calculateDailyPnL(sessionId);
    if (dailyPnl < -this.defaultLimits.maxDailyLossUsd) {
      return {
        allowed: false,
        reason: `Daily loss limit exceeded: ${dailyPnl.toFixed(2)} USD`,
        killSwitch: true,
      };
    }

    // Check position size limit
    if (signal.size && signal.size * currentPrice > this.defaultLimits.maxPositionSizeUsd) {
      return {
        allowed: false,
        reason: `Position size too large: ${(signal.size * currentPrice).toFixed(2)} USD`,
        killSwitch: false,
      };
    }

    // Check max open positions
    const openPositions = await this.getOpenPositionsCount(sessionId);
    if (openPositions >= this.defaultLimits.maxOpenPositions && (signal.action === 'BUY' || signal.action === 'SELL')) {
      return {
        allowed: false,
        reason: `Maximum open positions reached: ${openPositions}`,
        killSwitch: false,
      };
    }

    // Check if live trading is enabled
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (session?.mode === 'LIVE' && process.env.ENABLE_LIVE_TRADING !== 'true') {
      return {
        allowed: false,
        reason: 'Live trading is disabled in configuration',
        killSwitch: true,
      };
    }

    return { allowed: true };
  }

  private async calculateDailyPnL(sessionId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const trades = await prisma.trade.findMany({
      where: {
        sessionId,
        executedAt: {
          gte: today,
        },
      },
    });

    return trades.reduce((sum, trade) => sum + (trade.pnl || 0) - trade.fee, 0);
  }

  private async getOpenPositionsCount(sessionId: string): Promise<number> {
    return await prisma.position.count({
      where: {
        sessionId,
        status: 'OPEN',
      },
    });
  }

  async updateLimits(limits: Partial<RiskLimits>): Promise<void> {
    this.defaultLimits = { ...this.defaultLimits, ...limits };
  }

  getLimits(): RiskLimits {
    return { ...this.defaultLimits };
  }
}
