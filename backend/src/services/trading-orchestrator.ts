import { WebSocketManager } from './websocket';
import { TradingEngine, TradingSession } from './trading-engine';
import { BacktestingEngine, BacktestConfig } from './backtesting-engine';
import { prisma } from '../lib/prisma';
import { BacktestResult, SessionInfo, TradingMode } from '../types';

export class TradingOrchestrator {
  private tradingEngine: TradingEngine;
  private backtestingEngine: BacktestingEngine;
  private wsManager: WebSocketManager;

  constructor(wsManager: WebSocketManager) {
    this.wsManager = wsManager;
    this.tradingEngine = new TradingEngine(wsManager);
    this.backtestingEngine = new BacktestingEngine();
  }

  async initialize(): Promise<void> {
    console.log('Initializing Trading Orchestrator...');

    // Initialize default strategies
    await this.initializeDefaultStrategies();

    // Resume any running sessions (if server restarted)
    await this.resumeActiveSessions();

    console.log('Trading Orchestrator initialized');
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down Trading Orchestrator...');

    // Stop all active sessions
    const activeSessions = await this.tradingEngine.getActiveSessions();
    for (const sessionId of activeSessions) {
      await this.tradingEngine.stopSession(sessionId);
    }

    console.log('Trading Orchestrator shut down');
  }

  // Strategy Management
  async listStrategies() {
    return await prisma.strategy.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStrategy(id: string) {
    return await prisma.strategy.findUnique({ where: { id } });
  }

  async createStrategy(data: {
    name: string;
    description: string;
    category: string;
    code: string;
    parameters: any;
    markets: string[];
  }) {
    return await prisma.strategy.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        code: data.code,
        parameters: JSON.stringify(data.parameters),
        markets: JSON.stringify(data.markets),
      },
    });
  }

  // Backtesting
  async runBacktest(config: {
    strategyId: string;
    symbol: string;
    venue: string;
    startDate: Date;
    endDate: Date;
    parameters?: any;
  }): Promise<string> {
    const strategy = await prisma.strategy.findUnique({
      where: { id: config.strategyId },
    });

    if (!strategy) {
      throw new Error('Strategy not found');
    }

    // Create backtest record
    const backtest = await prisma.backtest.create({
      data: {
        strategyId: config.strategyId,
        symbol: config.symbol,
        startDate: config.startDate,
        endDate: config.endDate,
        parameters: JSON.stringify(config.parameters || JSON.parse(strategy.parameters)),
        status: 'RUNNING',
        totalReturn: 0,
        maxDrawdown: 0,
        winRate: 0,
        totalTrades: 0,
        profitableTrades: 0,
        averageWin: 0,
        averageLoss: 0,
        equityCurve: '[]',
        drawdownCurve: '[]',
        tradeList: '[]',
      },
    });

    // Run backtest asynchronously
    this.executeBacktest(backtest.id, strategy.code, config).catch((error) => {
      console.error('Backtest error:', error);
      prisma.backtest.update({
        where: { id: backtest.id },
        data: { status: 'FAILED' },
      });
    });

    return backtest.id;
  }

  private async executeBacktest(
    backtestId: string,
    strategyCode: string,
    config: {
      symbol: string;
      venue: string;
      startDate: Date;
      endDate: Date;
      parameters?: any;
    }
  ): Promise<void> {
    const backtestConfig: BacktestConfig = {
      strategyCode,
      symbol: config.symbol,
      venue: config.venue,
      startDate: config.startDate,
      endDate: config.endDate,
      initialCapital: 10000,
      parameters: config.parameters || {},
      feeRate: 0.0005,
      slippageRate: 0.0001,
    };

    const result = await this.backtestingEngine.runBacktest(backtestConfig);

    // Save results
    await prisma.backtest.update({
      where: { id: backtestId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        totalReturn: result.totalReturn,
        sharpeRatio: result.sharpeRatio,
        sortinoRatio: result.sortinoRatio,
        maxDrawdown: result.maxDrawdown,
        winRate: result.winRate,
        totalTrades: result.totalTrades,
        profitableTrades: result.profitableTrades,
        averageWin: result.averageWin,
        averageLoss: result.averageLoss,
        equityCurve: JSON.stringify(result.equityCurve),
        drawdownCurve: JSON.stringify(result.drawdownCurve),
        tradeList: JSON.stringify(result.trades),
      },
    });
  }

  async getBacktestResult(backtestId: string): Promise<BacktestResult | null> {
    const backtest = await prisma.backtest.findUnique({
      where: { id: backtestId },
      include: { strategy: true },
    });

    if (!backtest) return null;

    return {
      id: backtest.id,
      totalReturn: backtest.totalReturn,
      sharpeRatio: backtest.sharpeRatio,
      sortinoRatio: backtest.sortinoRatio,
      maxDrawdown: backtest.maxDrawdown,
      winRate: backtest.winRate,
      totalTrades: backtest.totalTrades,
      profitableTrades: backtest.profitableTrades,
      averageWin: backtest.averageWin,
      averageLoss: backtest.averageLoss,
      equityCurve: JSON.parse(backtest.equityCurve),
      drawdownCurve: JSON.parse(backtest.drawdownCurve),
      trades: JSON.parse(backtest.tradeList),
    };
  }

  async listBacktests(strategyId?: string) {
    return await prisma.backtest.findMany({
      where: strategyId ? { strategyId } : undefined,
      include: { strategy: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Session Management
  async startSession(data: {
    strategyId: string;
    mode: TradingMode;
    venue: string;
    symbol: string;
    parameters?: any;
  }): Promise<string> {
    const strategy = await prisma.strategy.findUnique({
      where: { id: data.strategyId },
    });

    if (!strategy) {
      throw new Error('Strategy not found');
    }

    // Create session
    const session = await prisma.session.create({
      data: {
        strategyId: data.strategyId,
        mode: data.mode,
        status: 'RUNNING',
        venue: data.venue,
        symbol: data.symbol,
        parameters: JSON.stringify(data.parameters || JSON.parse(strategy.parameters)),
      },
    });

    // Start trading engine
    const tradingSession: TradingSession = {
      id: session.id,
      strategyCode: strategy.code,
      mode: data.mode,
      venue: data.venue,
      symbol: data.symbol,
      parameters: data.parameters || JSON.parse(strategy.parameters),
      status: 'RUNNING',
    };

    await this.tradingEngine.startSession(tradingSession);

    return session.id;
  }

  async stopSession(sessionId: string): Promise<void> {
    await this.tradingEngine.stopSession(sessionId);
  }

  async getSessionInfo(sessionId: string): Promise<SessionInfo | null> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        strategy: true,
        positions: {
          where: { status: 'OPEN' },
        },
        trades: true,
      },
    });

    if (!session) return null;

    const positions = session.positions.map((p: any) => ({
      id: p.id,
      symbol: p.symbol,
      side: p.side as any,
      size: p.size,
      entryPrice: p.entryPrice,
      currentPrice: p.currentPrice,
      unrealizedPnl: p.unrealizedPnl,
      realizedPnl: p.realizedPnl,
      openedAt: p.openedAt,
    }));

    const totalPnl = session.trades.reduce((sum: number, t: any) => sum + (t.pnl || 0) - t.fee, 0);

    return {
      id: session.id,
      strategyName: session.strategy.name,
      mode: session.mode as TradingMode,
      status: session.status as any,
      venue: session.venue,
      symbol: session.symbol,
      positions,
      totalPnl,
      startedAt: session.startedAt,
    };
  }

  async listSessions(includeHistory: boolean = false) {
    return await prisma.session.findMany({
      where: includeHistory ? undefined : { status: { in: ['RUNNING', 'PAUSED'] } },
      include: { strategy: true },
      orderBy: { startedAt: 'desc' },
    });
  }

  async getSessionLogs(sessionId: string, limit: number = 100) {
    return await prisma.sessionLog.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  private async initializeDefaultStrategies(): Promise<void> {
    const strategies = [
      {
        name: 'SMA Crossover',
        description: 'Simple Moving Average crossover strategy',
        category: 'trend_following',
        code: 'sma_crossover',
        parameters: { fastPeriod: 10, slowPeriod: 30 },
        markets: ['BTC', 'ETH'],
      },
      {
        name: 'RSI Mean Reversion',
        description: 'RSI-based mean reversion strategy',
        category: 'mean_reversion',
        code: 'rsi_mean_reversion',
        parameters: { rsiPeriod: 14, oversold: 30, overbought: 70 },
        markets: ['BTC', 'ETH'],
      },
      {
        name: 'Momentum',
        description: 'Price momentum strategy',
        category: 'momentum',
        code: 'momentum',
        parameters: { lookback: 20, threshold: 0.02 },
        markets: ['BTC', 'ETH'],
      },
    ];

    for (const strategy of strategies) {
      const exists = await prisma.strategy.findUnique({
        where: { name: strategy.name },
      });

      if (!exists) {
        await this.createStrategy(strategy);
        console.log(`Created default strategy: ${strategy.name}`);
      }
    }
  }

  private async resumeActiveSessions(): Promise<void> {
    const activeSessions = await prisma.session.findMany({
      where: { status: 'RUNNING' },
      include: { strategy: true },
    });

    for (const session of activeSessions) {
      const tradingSession: TradingSession = {
        id: session.id,
        strategyCode: session.strategy.code,
        mode: session.mode as TradingMode,
        venue: session.venue,
        symbol: session.symbol,
        parameters: JSON.parse(session.parameters),
        status: 'RUNNING',
      };

      await this.tradingEngine.startSession(tradingSession);
      console.log(`Resumed session: ${session.id}`);
    }
  }
}
