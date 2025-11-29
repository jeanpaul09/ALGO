import { Express } from 'express';
import { TradingOrchestrator } from '../services/trading-orchestrator';
import { strategyRoutes } from './strategies';
import { backtestRoutes } from './backtests';
import { sessionRoutes } from './sessions';
import { marketDataRoutes } from './market-data';

export function setupRoutes(app: Express, orchestrator: TradingOrchestrator) {
  // Mount route groups
  app.use('/api/strategies', strategyRoutes(orchestrator));
  app.use('/api/backtests', backtestRoutes(orchestrator));
  app.use('/api/sessions', sessionRoutes(orchestrator));
  app.use('/api/market-data', marketDataRoutes());

  // System info
  app.get('/api/system/info', (req, res) => {
    res.json({
      version: '1.0.0',
      liveTrading: process.env.ENABLE_LIVE_TRADING === 'true',
      venues: ['hyperliquid'],
      capabilities: ['backtesting', 'demo_trading', 'live_trading'],
    });
  });
}
