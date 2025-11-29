import { TradingMode, SessionStatus, PositionInfo } from '../types';
import { MarketDataService } from './market-data';
import { StrategyExecutor } from './strategy-executor';
import { RiskManager } from './risk-manager';
import { WebSocketManager } from './websocket';
import { prisma } from '../lib/prisma';

export interface TradingSession {
  id: string;
  strategyCode: string;
  mode: TradingMode;
  venue: string;
  symbol: string;
  parameters: any;
  status: SessionStatus;
}

export class TradingEngine {
  private marketDataService: MarketDataService;
  private strategyExecutor: StrategyExecutor;
  private riskManager: RiskManager;
  private wsManager: WebSocketManager;
  private activeSessions: Map<string, NodeJS.Timeout> = new Map();

  constructor(wsManager: WebSocketManager) {
    this.marketDataService = new MarketDataService();
    this.strategyExecutor = new StrategyExecutor();
    this.riskManager = new RiskManager();
    this.wsManager = wsManager;
  }

  async startSession(session: TradingSession): Promise<void> {
    if (this.activeSessions.has(session.id)) {
      throw new Error(`Session ${session.id} is already running`);
    }

    console.log(`Starting ${session.mode} trading session ${session.id}`);

    // Update session status
    await prisma.session.update({
      where: { id: session.id },
      data: { status: 'RUNNING' },
    });

    // Start trading loop
    const intervalId = setInterval(async () => {
      await this.runTradingLoop(session);
    }, 5000); // Run every 5 seconds

    this.activeSessions.set(session.id, intervalId);

    this.wsManager.broadcastSessionStatus(session.id, 'RUNNING');
  }

  async stopSession(sessionId: string): Promise<void> {
    const intervalId = this.activeSessions.get(sessionId);
    if (intervalId) {
      clearInterval(intervalId);
      this.activeSessions.delete(sessionId);
    }

    // Close all open positions
    await this.closeAllPositions(sessionId);

    // Update session status
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        status: 'STOPPED',
        stoppedAt: new Date(),
      },
    });

    this.wsManager.broadcastSessionStatus(sessionId, 'STOPPED');
    console.log(`Stopped trading session ${sessionId}`);
  }

  private async runTradingLoop(session: TradingSession): Promise<void> {
    try {
      // Get current market price
      const currentPrice = await this.marketDataService.getCurrentPrice(session.venue, session.symbol);

      // Get historical data for strategy
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours
      const historicalData = await this.marketDataService.getHistoricalData(
        session.venue,
        session.symbol,
        startDate,
        endDate
      );

      // Get current position
      const position = await this.getCurrentPosition(session.id);
      const context = {
        size: position?.size || 0,
        entryPrice: position?.entryPrice || 0,
      };

      // Generate signal from strategy
      const signal = await this.strategyExecutor.generateSignal(
        session.strategyCode,
        session.parameters,
        historicalData,
        context
      );

      // Check risk limits
      const riskCheck = await this.riskManager.checkLimits(session.id, signal, currentPrice);
      if (!riskCheck.allowed) {
        await this.logSession(session.id, 'WARN', `Risk limit exceeded: ${riskCheck.reason}`);

        // Trigger kill switch if necessary
        if (riskCheck.killSwitch) {
          await this.emergencyStop(session.id);
        }
        return;
      }

      // Execute signal
      if (signal.action !== 'HOLD') {
        await this.executeSignal(session, signal, currentPrice, position);
      }

      // Update position prices and PnL
      if (position) {
        await this.updatePosition(position.id, currentPrice);
      }
    } catch (error) {
      console.error(`Error in trading loop for session ${session.id}:`, error);
      await this.logSession(session.id, 'ERROR', `Trading loop error: ${error}`);
    }
  }

  private async executeSignal(
    session: TradingSession,
    signal: any,
    currentPrice: number,
    currentPosition: PositionInfo | null
  ): Promise<void> {
    // Close existing position if needed
    if (currentPosition && (signal.action === 'SELL' && currentPosition.side === 'LONG') ||
        (signal.action === 'BUY' && currentPosition.side === 'SHORT') ||
        signal.action === 'CLOSE') {
      await this.closePosition(currentPosition, currentPrice, signal.reason);
    }

    // Open new position
    if (signal.action === 'BUY' || signal.action === 'SELL') {
      await this.openPosition(session, signal.action, currentPrice, signal.size, signal.reason);
    }
  }

  private async openPosition(
    session: TradingSession,
    side: 'BUY' | 'SELL',
    price: number,
    size: number | undefined,
    reason: string
  ): Promise<void> {
    const positionSize = size || 1.0; // Default size

    // For LIVE mode, execute real order
    if (session.mode === 'LIVE') {
      // TODO: Implement real order execution via Hyperliquid
      await this.logSession(session.id, 'INFO', 'LIVE trading not yet implemented - would execute real order');
      return;
    }

    // DEMO mode - simulate position
    const position = await prisma.position.create({
      data: {
        sessionId: session.id,
        symbol: session.symbol,
        side: side === 'BUY' ? 'LONG' : 'SHORT',
        size: positionSize,
        entryPrice: price,
        currentPrice: price,
        unrealizedPnl: 0,
        realizedPnl: 0,
        status: 'OPEN',
      },
    });

    // Log trade
    await prisma.trade.create({
      data: {
        sessionId: session.id,
        symbol: session.symbol,
        side,
        size: positionSize,
        price,
        fee: positionSize * price * 0.0005, // 0.05% fee
        reason,
        mode: session.mode,
      },
    });

    await this.logSession(session.id, 'INFO', `Opened ${side} position: ${positionSize} @ ${price}`);

    this.wsManager.broadcastPositionUpdate(session.id, position);
  }

  private async closePosition(
    position: PositionInfo,
    price: number,
    reason: string
  ): Promise<void> {
    // Calculate PnL
    const pnl =
      position.side === 'LONG'
        ? position.size * (price - position.entryPrice)
        : position.size * (position.entryPrice - price);

    // Update position
    await prisma.position.update({
      where: { id: position.id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        currentPrice: price,
        realizedPnl: pnl,
      },
    });

    // Log trade
    const session = await prisma.position.findUnique({
      where: { id: position.id },
      select: { sessionId: true, session: { select: { mode: true } } },
    });

    if (session) {
      await prisma.trade.create({
        data: {
          sessionId: session.sessionId,
          symbol: position.symbol,
          side: position.side === 'LONG' ? 'SELL' : 'BUY',
          size: position.size,
          price,
          fee: position.size * price * 0.0005,
          pnl,
          reason,
          mode: session.session.mode as TradingMode,
        },
      });

      await this.logSession(session.sessionId, 'INFO', `Closed position: PnL ${pnl.toFixed(2)}`);

      this.wsManager.broadcastTradeExecuted(session.sessionId, { pnl, price, reason });
    }
  }

  private async updatePosition(positionId: string, currentPrice: number): Promise<void> {
    const position = await prisma.position.findUnique({ where: { id: positionId } });
    if (!position || position.status !== 'OPEN') return;

    const unrealizedPnl =
      position.side === 'LONG'
        ? position.size * (currentPrice - position.entryPrice)
        : position.size * (position.entryPrice - currentPrice);

    await prisma.position.update({
      where: { id: positionId },
      data: {
        currentPrice,
        unrealizedPnl,
      },
    });

    this.wsManager.broadcastPnLUpdate(position.sessionId, unrealizedPnl);
  }

  private async getCurrentPosition(sessionId: string): Promise<PositionInfo | null> {
    const position = await prisma.position.findFirst({
      where: {
        sessionId,
        status: 'OPEN',
      },
      orderBy: {
        openedAt: 'desc',
      },
    });

    if (!position) return null;

    return {
      id: position.id,
      symbol: position.symbol,
      side: position.side as any,
      size: position.size,
      entryPrice: position.entryPrice,
      currentPrice: position.currentPrice,
      unrealizedPnl: position.unrealizedPnl,
      realizedPnl: position.realizedPnl,
      openedAt: position.openedAt,
    };
  }

  private async closeAllPositions(sessionId: string): Promise<void> {
    const openPositions = await prisma.position.findMany({
      where: {
        sessionId,
        status: 'OPEN',
      },
    });

    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) return;

    for (const pos of openPositions) {
      const currentPrice = await this.marketDataService.getCurrentPrice(session.venue, pos.symbol);
      await this.closePosition(
        {
          id: pos.id,
          symbol: pos.symbol,
          side: pos.side as any,
          size: pos.size,
          entryPrice: pos.entryPrice,
          currentPrice: pos.currentPrice,
          unrealizedPnl: pos.unrealizedPnl,
          realizedPnl: pos.realizedPnl,
          openedAt: pos.openedAt,
        },
        currentPrice,
        'Session stopped'
      );
    }
  }

  private async emergencyStop(sessionId: string): Promise<void> {
    await this.logSession(sessionId, 'ERROR', 'EMERGENCY STOP TRIGGERED');
    await this.stopSession(sessionId);
  }

  private async logSession(sessionId: string, level: string, message: string, data?: any): Promise<void> {
    await prisma.sessionLog.create({
      data: {
        sessionId,
        level,
        message,
        data: data ? JSON.stringify(data) : null,
      },
    });
  }

  async getActiveSessions(): Promise<string[]> {
    return Array.from(this.activeSessions.keys());
  }
}
